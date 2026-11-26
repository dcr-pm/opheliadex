/* Party effects for the birthday invite: confetti, balloons, countdown, envelope intro. */
(function () {
  'use strict';
  window.__party = true;
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var COLORS = ['#ff6fa5', '#ffc94d', '#3cc7b4', '#8b6cf6', '#5bbcff', '#ff8a5b'];
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  /* ---------- Confetti ---------- */
  var cvs, ctx, parts = [], raf = 0, last = 0, dpr = 1;
  function size() { dpr = Math.min(window.devicePixelRatio || 1, 2); cvs.width = innerWidth * dpr; cvs.height = innerHeight * dpr; }
  function ensure() {
    if (cvs) return;
    cvs = document.createElement('canvas');
    cvs.className = 'confetti-canvas';
    cvs.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cvs);
    ctx = cvs.getContext('2d');
    size();
    addEventListener('resize', size);
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function piece(x, y, vx, vy, g, ttl, colors) {
    parts.push({ x: x, y: y, vx: vx, vy: vy, g: g, w: rnd(6, 12), h: rnd(8, 16), r: rnd(0, 6.28), vr: rnd(-.25, .25),
      t: rnd(0, 6.28), vt: rnd(.1, .3), c: pick(colors || COLORS), round: Math.random() < .25, life: 0, ttl: ttl });
  }
  function burst(x, y, o) {
    if (reduce) return;
    o = o || {}; ensure();
    var n = o.count || 70, ang = o.angle == null ? -Math.PI / 2 : o.angle, spread = o.spread == null ? Math.PI * 2 : o.spread, sp = o.speed || 9;
    for (var i = 0; i < n; i++) {
      var a = ang + (Math.random() - .5) * spread, v = sp * rnd(.35, 1);
      piece(x, y, Math.cos(a) * v, Math.sin(a) * v, .28, rnd(90, 160), o.colors);
    }
    start();
  }
  function rain(ms) {
    if (reduce) return;
    ensure();
    var end = performance.now() + ms;
    (function drop() {
      for (var i = 0; i < 7; i++) piece(rnd(0, innerWidth), -20, rnd(-1.5, 1.5), rnd(2, 5), .06, rnd(200, 320));
      start();
      if (performance.now() < end) setTimeout(drop, 90);
    })();
  }
  function cannons() {
    burst(0, innerHeight, { angle: -Math.PI / 3, spread: .8, speed: 19, count: 80 });
    burst(innerWidth, innerHeight, { angle: -2 * Math.PI / 3, spread: .8, speed: 19, count: 80 });
  }
  function tick(now) {
    var k = Math.min((now - last) / 16.67, 3); last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    var drag = Math.pow(.985, k);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life += k; p.vy += p.g * k; p.vx *= drag; p.vy *= drag;
      p.x += p.vx * k; p.y += p.vy * k; p.r += p.vr * k; p.t += p.vt * k;
      if (p.life > p.ttl || p.y > innerHeight + 40) { parts.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, (p.ttl - p.life) / 25));
      ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.scale(1, Math.cos(p.t));
      ctx.fillStyle = p.c;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, 6.29); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (parts.length) raf = requestAnimationFrame(tick);
    else { raf = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }

  /* ---------- Pop sound (made in the browser, no audio file) ---------- */
  var actx;
  function popSound(pitch) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = actx || new AC();
      if (actx.state === 'suspended') actx.resume();
      var t = actx.currentTime, i;
      // Sharp burst of noise: the "snap" of the balloon skin.
      var len = Math.floor(actx.sampleRate * .09), buf = actx.createBuffer(1, len, actx.sampleRate), d = buf.getChannelData(0);
      for (i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      var n = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
      n.buffer = buf; f.type = 'bandpass'; f.frequency.value = 1400 * pitch; f.Q.value = .7; g.gain.value = .5;
      n.connect(f); f.connect(g); g.connect(actx.destination); n.start(t);
      // Quick falling tone: the round "pop" underneath.
      var o = actx.createOscillator(), og = actx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(520 * pitch, t);
      o.frequency.exponentialRampToValueAtTime(90, t + .08);
      og.gain.setValueAtTime(.35, t);
      og.gain.exponentialRampToValueAtTime(.001, t + .1);
      o.connect(og); og.connect(actx.destination); o.start(t); o.stop(t + .11);
    } catch (e) {}
  }

  /* ---------- Balloons ---------- */
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 4300);
  }
  function balloonSVG(c) {
    return '<svg viewBox="0 0 60 150"><path d="M30 76 q-7 18 0 36 t0 36" fill="none" stroke="#2b2140" stroke-opacity=".35" stroke-width="1.5" stroke-linecap="round"/>' +
      '<polygon points="25,68 35,68 30,77" fill="' + c + '"/><ellipse cx="30" cy="36" rx="26" ry="33" fill="' + c + '"/>' +
      '<ellipse cx="20" cy="23" rx="6" ry="11" fill="#fff" fill-opacity=".5" transform="rotate(-24 20 23)"/></svg>';
  }
  function initBalloons(field) {
    if (reduce) return;
    var host = field.parentNode, popped = 0;
    var n = innerWidth < 600 ? 8 : 14;
    function travel() { field.style.setProperty('--travel', (host.offsetHeight + 420) + 'px'); }
    travel(); addEventListener('resize', travel);
    function make(initial) {
      var b = document.createElement('div'), c = pick(COLORS), d = rnd(11, 20);
      // Favour the edges so the balloons frame the text rather than cover it.
      var x = Math.random() < .7 ? (Math.random() < .5 ? rnd(-2, 20) : rnd(72, 92)) : rnd(20, 72);
      b.className = 'balloon';
      b.style.setProperty('--x', x + '%');
      var sz = rnd(48, 86);
      b.style.setProperty('--s', sz + 'px');
      b.style.setProperty('--d', d + 's');
      b.style.setProperty('--delay', (initial ? -rnd(0, d) : rnd(0, 1.5)) + 's');
      b.style.setProperty('--sw', rnd(2.2, 4) + 's');
      b.innerHTML = balloonSVG(c);
      b.addEventListener('pointerdown', function () {
        var r = b.getBoundingClientRect();
        popSound(1.45 - (sz - 48) / 38 * .6 + rnd(-.05, .05)); // small balloons pop higher, big ones lower
        burst(r.left + r.width / 2, r.top + r.width * .6, { count: 30, speed: 6.5, colors: [c, c, '#ffffff'] });
        b.remove();
        popped++;
        if (popped === 5) { toast('🎈 5 pops, one for every year! 🎉'); rain(1800); }
        setTimeout(function () { make(false); }, 1300);
      });
      field.appendChild(b);
    }
    for (var i = 0; i < n; i++) make(true);
  }

  /* ---------- Countdown ---------- */
  function initCountdown(el) {
    var startAt = Date.UTC(2026, 11, 18, 21, 0, 0); // Fri 18 Dec 2026, 4:00 pm in Peterborough, ON
    var endAt = startAt + 2 * 3600e3;
    var label = el.querySelector('.cd-label'), out = {};
    ['d', 'h', 'm', 's'].forEach(function (u) { out[u] = el.querySelector('[data-u="' + u + '"]'); });
    function set(u, v) {
      var s = u === 'd' ? String(v) : (v < 10 ? '0' + v : String(v));
      if (out[u].textContent === s) return;
      out[u].textContent = s;
      out[u].classList.remove('tick'); void out[u].offsetWidth; out[u].classList.add('tick');
    }
    var timer;
    function upd() {
      var now = Date.now(), diff = startAt - now;
      if (diff <= 0) {
        el.classList.add('done');
        label.textContent = now < endAt ? "It's party time! 🎉" : 'What a party! Thank you for celebrating 💛';
        clearInterval(timer);
        return;
      }
      set('d', Math.floor(diff / 864e5)); set('h', Math.floor(diff / 36e5) % 24);
      set('m', Math.floor(diff / 6e4) % 60); set('s', Math.floor(diff / 1e3) % 60);
    }
    upd(); timer = setInterval(upd, 1000);
  }

  /* ---------- Envelope intro ---------- */
  function initIntro() {
    var intro = document.querySelector('.intro');
    if (!intro) return;
    if (!root.classList.contains('intro-on')) { intro.remove(); setTimeout(cannons, 500); return; }
    // Timings, in milliseconds after the tap.
    var CARD_OUT = reduce ? 0 : 1100; // when the card has finished sliding out (with reduced motion it appears at once)
    var READ_TIME = 3000;             // how long the card then stays up, so there is time to read it
    var opened = false, done = false, openedAt = 0, timer;
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      intro.classList.add('gone'); root.classList.remove('intro-on');
      cannons();
      setTimeout(function () { intro.remove(); }, 700);
    }
    intro.addEventListener('click', function () {
      if (opened) {
        // A second tap moves on early, but only once the card has been out for a moment,
        // so an accidental double-tap doesn't skip the words.
        if (Date.now() - openedAt > CARD_OUT + 600) finish();
        return;
      }
      opened = true; openedAt = Date.now();
      intro.classList.add('open');
      setTimeout(function () { burst(innerWidth / 2, innerHeight * .42, { count: 130, speed: 14 }); }, 800);
      timer = setTimeout(finish, CARD_OUT + READ_TIME);
    });
  }

  window.partyBurst = burst; // lets other pages (e.g. the homepage joke box) fire confetti

  /* ---------- Wire up ---------- */
  function init() {
    document.querySelectorAll('[data-balloons]').forEach(initBalloons);
    var cd = document.getElementById('countdown');
    if (cd) initCountdown(cd);
    initIntro();

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: .15 });
      document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
    } else {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    }

    var form = document.querySelector('form.rsvp');
    if (form) {
      var extra = form.querySelector('.attending-only');
      form.addEventListener('change', function (e) {
        if (e.target.name !== 'attending') return;
        if (extra) extra.hidden = e.target.value === 'No';
        if (e.target.value === 'Yes') {
          var r = e.target.parentNode.getBoundingClientRect();
          burst(r.left + r.width / 2, r.top + r.height / 2, { count: 90, speed: 12 });
        }
      });
    }

    if (document.body.hasAttribute('data-celebrate')) { rain(3500); setTimeout(cannons, 300); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
