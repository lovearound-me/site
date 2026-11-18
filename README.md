# lovearound.me

The site of Love Around: the landing page in 13 languages, invite links
(`/i/<code>`), the sign-in bridge for the apps (`/login`; `/signin` for the
builds already out), `/login/devices` (a device's code, redirected to the web
app) and the public API docs (`/docs`).

| Path | What |
|---|---|
| `src/` | page templates; `build.py` fills them from `i18n/<lang>.json` into `public/` |
| `public/` | static files served as is (styles, images, docs) |
| `redirect/` | the old needed-app.web.app site, which only redirects here |
| `firebase.json` | hosting config; `/download/…` redirects to the apps' latest GitHub releases, `/apt/…` (the Linux APT repository) to the linux releases |

```sh
python3 build.py          # build the translated pages into public/
scripts/publish.sh        # build and publish to Firebase Hosting
```

The apps live in their own repos and publish their own releases:
[mac](https://github.com/lovearound-me/mac),
[windows](https://github.com/lovearound-me/windows),
[linux](https://github.com/lovearound-me/linux).
