  // The platform block: Mia taps a heart, the signal flies to Sam's room and
  // lights whatever is switched on there. Loops while the block is on screen.
  (function () {
    var scenes = document.getElementById('pf-scenes');
    if (!scenes) return;
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var sender = document.getElementById('pf-sender');
    var room = document.getElementById('pf-room');
    var svg = room.querySelector('svg');
    var bubble = document.getElementById('pf-bubble');
    var status = document.getElementById('pf-status');
    var hb = document.getElementById('pf-hb');
    var row = document.getElementById('pf-row');
    var cursor = document.getElementById('pf-cursor');
    var toggles = [].slice.call(document.querySelectorAll('.pf-tg'));
    var groups = {};
    [].forEach.call(svg.querySelectorAll('.pf-dev'), function (g) { groups[g.dataset.dev] = g; });
    var targets = {lap: [220, 250], heart: [578, 288], lamp: [672, 225], pend: [440, 250]};
    var HEART = 'M0 9s-11-6.6-13.4-12.6c-2-5 1.1-10 6.2-10 3.1 0 5.1 1.6 7.2 4.2 2.1-2.6 4.1-4.2 7.2-4.2 5.1 0 8.2 5 6.2 10C11 2.4 0 9 0 9z';
    var visible = false;
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function isOn(d) { return document.getElementById('pf-tg-' + d).getAttribute('aria-pressed') === 'true'; }
    function onList() { return toggles.map(function (t) { return t.dataset.dev; }).filter(isOn); }
    function say(key) { status.textContent = status.dataset[key]; }
    function light(list) {
      Object.keys(groups).forEach(function (d) { groups[d].classList.toggle('pf-lit', list.indexOf(d) >= 0); });
    }
    function syncOff() {
      Object.keys(groups).forEach(function (d) {
        groups[d].classList.toggle('off', !isOn(d));
        if (!isOn(d)) groups[d].classList.remove('pf-lit');
      });
    }
    toggles.forEach(function (t) {
      t.addEventListener('click', function () {
        t.setAttribute('aria-pressed', isOn(t.dataset.dev) ? 'false' : 'true');
        syncOff();
        if (reduce) { light(onList()); say(onList().length ? 'done' : 'none'); }
      });
    });
    syncOff();

    if (reduce) { hb.classList.add('pressed'); row.classList.add('on'); light(onList()); return; }

    function rel(el, box) {
      var r = el.getBoundingClientRect();
      return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
    }

    async function cycle() {
      light([]);
      hb.classList.remove('pressed'); row.classList.remove('on');
      say('press');
      // the cursor walks to Sam's heart and taps it
      var s = sender.getBoundingClientRect(), to = rel(hb, s);
      var from = [s.width * .78, s.height * .86];
      cursor.classList.add('show');
      await cursor.animate(
        [{transform: 'translate(' + from[0] + 'px,' + from[1] + 'px)'}, {transform: 'translate(' + (to[0] - 2) + 'px,' + (to[1] - 2) + 'px)'}],
        {duration: 1000, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards'}).finished;
      hb.classList.add('down'); await wait(150);
      hb.classList.remove('down'); hb.classList.add('pressed'); row.classList.add('on');
      await wait(300);
      // the heart leaves Mia's screen for Sam's room
      say('fly');
      var c = scenes.getBoundingClientRect(), a = rel(hb, c), r = room.getBoundingClientRect();
      var e = [r.left + r.width / 2 - c.left, r.top + r.height * (40 / 460) - c.top];
      var m = [(a[0] + e[0]) / 2, Math.min(a[1], e[1]) - 50];
      var fly = document.createElement('div');
      fly.className = 'pf-fly';
      fly.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path fill="#F59AAE" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3 1.6-1.8 3-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>';
      scenes.appendChild(fly);
      await fly.animate([
        {transform: 'translate(' + a[0] + 'px,' + a[1] + 'px) scale(.4)', opacity: 0},
        {transform: 'translate(' + a[0] + 'px,' + (a[1] - 20) + 'px) scale(1)', opacity: 1, offset: .15},
        {transform: 'translate(' + m[0] + 'px,' + m[1] + 'px) scale(1.3)', opacity: 1, offset: .55},
        {transform: 'translate(' + e[0] + 'px,' + e[1] + 'px) scale(.9)', opacity: 1}],
        {duration: 1500, easing: 'ease-in-out'}).finished;
      fly.remove();
      cursor.classList.remove('show');
      // it arrives without a name and splits to whatever is switched on
      bubble.classList.add('show');
      var on = onList();
      await Promise.all(on.map(function (d) {
        var h = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        h.setAttribute('d', HEART); h.setAttribute('fill', '#F59AAE');
        svg.appendChild(h);
        var t = targets[d];
        return h.animate([
          {transform: 'translate(400px,40px) scale(.6)', opacity: 0},
          {transform: 'translate(400px,90px) scale(1)', opacity: 1, offset: .25},
          {transform: 'translate(' + t[0] + 'px,' + t[1] + 'px) scale(.5)', opacity: .2}],
          {duration: 1300, easing: 'cubic-bezier(.5,0,.4,1)'}).finished.then(function () { h.remove(); });
      }));
      light(onList());
      say(onList().length ? 'done' : 'none');
      await wait(2400);
      bubble.classList.remove('show');
      await wait(1800);
    }

    async function loop() {
      for (;;) {
        if (!visible || document.hidden) { await wait(400); continue; }
        await cycle();
        await wait(600);
      }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, {threshold: .25}).observe(scenes);
    } else visible = true;
    loop();
  })();
