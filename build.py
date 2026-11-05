#!/usr/bin/env python3
"""
build.py — builds the translated pages of lovearound.me into public/.

The pages are written once, in src/, with {{section.key}} where text goes; the
text of each language is in i18n/<lang>.json. Every language must have the
same keys, and every key must be used: the build stops otherwise.

  src/index.html      → public/<lang>/index.html for every language,
                        public/index.html (the default language) and
                        public/localized/<lang>/index.html for the others.
                        Firebase Hosting's i18n (firebase.json) serves "/"
                        from localized/ by the browser's Accept-Language, or
                        by the firebase-language-override cookie the language
                        menu sets; anyone else gets the default.
  src/i/index.html,   → public/i/index.html, public/signin/index.html: one
  src/signin/...        page for all languages. {{@strings}} embeds the
                        page's section of every dictionary and /lang.js picks
                        one in the browser, because /i/<code> is a rewrite
                        and links to it carry no language. Text in the static
                        HTML (title, link previews) is the default language.

Docs (public/docs) are English only and not built. No dependencies; the
publish script runs this before every deploy.
"""
import json
import re
import shutil
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent
SRC, I18N, OUT = SITE / "src", SITE / "i18n", SITE / "public"
ORIGIN = "https://lovearound.me"

LANGS = ["es", "en", "pt", "de", "fr", "it", "pl", "tr", "uk", "ru", "id", "ko", "zh"]  # the first one is the default
NAMES = {"es": "Español", "en": "English", "pt": "Português", "de": "Deutsch", "fr": "Français",
         "it": "Italiano", "pl": "Polski", "tr": "Türkçe", "uk": "Українська", "ru": "Русский",
         "id": "Bahasa Indonesia", "ko": "한국어", "zh": "中文"}
LOCALES = {"es": "es_ES", "en": "en_US", "pt": "pt_BR", "de": "de_DE", "fr": "fr_FR", "it": "it_IT",
           "pl": "pl_PL", "tr": "tr_TR", "uk": "uk_UA", "ru": "ru_RU", "id": "id_ID", "ko": "ko_KR",
           "zh": "zh_CN"}

# Sections that belong to the client-side pages, and the page each one is for.
CLIENT_PAGES = {"invite": "i/index.html", "signin": "signin/index.html"}

# Everything build.py writes, removed first so a dropped language leaves nothing.
GENERATED = ["index.html", "localized", "i", "signin", *LANGS]

PLACEHOLDER = re.compile(r"\{\{\s*([@\w.]+)\s*\}\}")


def flatten(d, prefix=""):
    out = {}
    for k, v in d.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict):
            out.update(flatten(v, key + "."))
        else:
            out[key] = v
    return out


def load():
    dicts = {}
    for lang in LANGS:
        with open(I18N / f"{lang}.json", encoding="utf-8") as f:
            dicts[lang] = json.load(f)
    keys = {lang: set(flatten(d)) for lang, d in dicts.items()}
    base = keys[LANGS[0]]
    errors = []
    for lang in LANGS[1:]:
        for k in sorted(base - keys[lang]):
            errors.append(f"{lang}.json: missing {k}")
        for k in sorted(keys[lang] - base):
            errors.append(f"{lang}.json: {k} is not in {LANGS[0]}.json")
    if errors:
        sys.exit("\n".join(errors))
    return dicts


def render(template, strings, specials, used, where):
    def sub(m):
        key = m.group(1)
        if key.startswith("@"):
            if key[1:] not in specials:
                sys.exit(f"{where}: unknown {{{{{key}}}}}")
            return specials[key[1:]]
        if key not in strings:
            sys.exit(f"{where}: no text for {{{{{key}}}}}")
        used.add(key)
        return strings[key]
    return PLACEHOLDER.sub(sub, template)


def lang_url(lang):
    return f"{ORIGIN}/{lang}"


def head(lang):
    """Canonical address, the other languages, and og:locale for one version."""
    lines = [f'<link rel="canonical" href="{lang_url(lang)}">']
    for other in LANGS:
        lines.append(f'<link rel="alternate" hreflang="{other}" href="{lang_url(other)}">')
    lines.append(f'<link rel="alternate" hreflang="x-default" href="{ORIGIN}/">')
    lines.append(f'<meta property="og:url" content="{lang_url(lang)}">')
    lines.append(f'<meta property="og:locale" content="{LOCALES[lang]}">')
    for other in LANGS:
        if other != lang:
            lines.append(f'<meta property="og:locale:alternate" content="{LOCALES[other]}">')
    return "\n".join(lines)


def lang_links(lang):
    def link(other):
        cur = ' aria-current="true"' if other == lang else ""
        return f'<a href="/{other}" hreflang="{other}" lang="{other}"{cur}>{NAMES[other]}</a>'
    return [link(other) for other in LANGS]


def lang_menu(lang, label):
    return (f'<details class="lang"><summary aria-label="{label}">{lang.upper()}'
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
            f'</summary><div class="lang-menu">{"".join(lang_links(lang))}</div></details>')


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def main():
    dicts = load()
    flat = {lang: flatten(d) for lang, d in dicts.items()}
    default = LANGS[0]
    used = set()

    for name in GENERATED:
        p = OUT / name
        if p.is_dir():
            shutil.rmtree(p)
        elif p.exists():
            p.unlink()

    # The landing page, once per language.
    template = (SRC / "index.html").read_text(encoding="utf-8")
    for lang in LANGS:
        strings = {k: v for k, v in flat[lang].items() if k.split(".")[0] not in CLIENT_PAGES}
        used.add("lang.label")
        page = render(template, strings, {
            "lang": lang,
            "home": f"/{lang}",
            "head": head(lang),
            "langmenu": lang_menu(lang, strings["lang.label"]),
        }, used, f"src/index.html ({lang})")
        write(OUT / lang / "index.html", page)
        if lang == default:
            write(OUT / "index.html", page)
        else:
            write(OUT / "localized" / lang / "index.html", page)

    # The invite and sign-in pages: every language in one page.
    for section, rel in CLIENT_PAGES.items():
        template = (SRC / rel).read_text(encoding="utf-8")
        table = {lang: dicts[lang][section] for lang in LANGS}
        strings = {k: v for k, v in flat[default].items() if k.startswith(section + ".")}
        page = render(template, strings, {
            "lang": default,
            "strings": json.dumps(table, ensure_ascii=False, separators=(",", ":")),
        }, set(), f"src/{rel}")
        write(OUT / rel, page)
        used.update(k for k in flat[default] if k.startswith(section + "."))

    unused = sorted(set(flat[default]) - used)
    if unused:
        sys.exit("never used in src/: " + ", ".join(unused))
    print(f"built {', '.join(LANGS)} → {OUT.relative_to(SITE.parent)}")


if __name__ == "__main__":
    main()
