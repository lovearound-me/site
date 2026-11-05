// Language for the pages that serve every language at one address (/i/…,
// /signin). Chooses the way Firebase Hosting does for "/": the
// firebase-language-override cookie set by the site's language menu first,
// then the browser's languages; the first of the page's languages otherwise.
// apply() fills every [data-t] element and the title, and returns the
// chosen strings for the page's own script.
var lovearoundLang = (function () {
  function pick(langs) {
    var m = document.cookie.match(/(?:^|;\s*)firebase-language-override=([^;]*)/);
    var prefs = (m ? decodeURIComponent(m[1]).split(',') : [])
      .concat(navigator.languages || [navigator.language || '']);
    for (var i = 0; i < prefs.length; i++) {
      var l = String(prefs[i]).trim().toLowerCase().split('-')[0];
      if (langs.indexOf(l) >= 0) return l;
    }
    return langs[0];
  }

  function apply(table) {
    var lang = pick(Object.keys(table));
    var t = table[lang];
    document.documentElement.lang = lang;
    if (t.title) document.title = t.title;
    var els = document.querySelectorAll('[data-t]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].getAttribute('data-t');
      if (key in t) els[i].innerHTML = t[key];
    }
    return t;
  }

  return { pick: pick, apply: apply };
})();
