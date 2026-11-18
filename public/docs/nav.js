// The docs menu: marks the section on screen, and opens and closes on a phone.
(() => {
  const nav = document.getElementById('dnav');
  const toggle = document.querySelector('.dnav-toggle');
  const scrim = document.querySelector('.dnav-scrim');
  const now = document.querySelector('.dnav-now');
  if (!nav || !toggle) return;
  const root = document.documentElement;
  const narrow = matchMedia('(max-width: 959px)');

  // The sticky header's height: the phone bar sits under it, anchors stop below it.
  const top = document.querySelector('.top');
  const measure = () => root.style.setProperty('--top-h', top.offsetHeight + 'px');
  measure();
  addEventListener('resize', measure);

  // ---- open and close, on a narrow screen ----
  const isOpen = () => document.body.classList.contains('dnav-open');
  function open(yes, focusBack = true) {
    document.body.classList.toggle('dnav-open', yes);
    toggle.setAttribute('aria-expanded', String(yes));
    scrim.hidden = !yes;
    if (yes) {
      const here = nav.querySelector('a.on') || nav.querySelector('[aria-current="page"]');
      if (here) here.scrollIntoView({ block: 'center' });
      nav.querySelector('.dnav-close').focus({ preventScroll: true });
    } else if (focusBack) {
      toggle.focus({ preventScroll: true });
    }
  }
  toggle.addEventListener('click', () => open(!isOpen()));
  nav.querySelector('.dnav-close').addEventListener('click', () => open(false));
  scrim.addEventListener('click', () => open(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) open(false); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a') && isOpen()) open(false, false); });
  narrow.addEventListener('change', () => { if (!narrow.matches && isOpen()) open(false, false); });

  // ---- the section on screen ----
  const items = [...nav.querySelectorAll('.here a[href^="#"]')]
    .map((a) => [a, document.getElementById(decodeURIComponent(a.hash.slice(1)))])
    .filter(([, el]) => el);
  let current = null;
  // "POST /v1/events": the badge and the path are separate elements, so join them with a space.
  const label = (a) => [...a.childNodes].map((n) => n.textContent.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ');

  function mark(item) {
    if (item === current) return;
    if (current) { current[0].classList.remove('on'); current[0].removeAttribute('aria-current'); }
    current = item;
    if (now) now.textContent = item ? label(item[0]) : '';
    if (!item) return;
    const [a] = item;
    a.classList.add('on');
    a.setAttribute('aria-current', 'location');
    // Keep it in sight inside the menu, which scrolls on its own on a wide screen.
    if (!narrow.matches) {
      const box = nav.getBoundingClientRect(), r = a.getBoundingClientRect();
      if (r.top < box.top + 24 || r.bottom > box.bottom - 24) nav.scrollTop += r.top - box.top - box.height / 3;
    }
  }

  function spy() {
    const line = top.offsetHeight + (narrow.matches ? 72 : 32);
    let pick = null;
    for (const item of items) {
      if (item[1].getBoundingClientRect().top <= line) pick = item; else break;
    }
    // At the very end the last short sections never reach the line: take the last one in sight.
    if (scrollY > 0 && innerHeight + scrollY >= root.scrollHeight - 4) {
      for (const item of items) if (item[1].getBoundingClientRect().top < innerHeight * 0.8) pick = item;
    }
    mark(pick);
  }

  let queued = false;
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; spy(); });
  }, { passive: true });
  addEventListener('resize', spy);
  addEventListener('load', spy);
  spy();
})();
