// Scroll choreography for the home page. Everything degrades to a plain, readable page
// when GSAP fails to load or the visitor prefers reduced motion.
(function () {
  var root = document.documentElement;
  var loader = document.querySelector('.loader');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!window.gsap || !window.ScrollTrigger || reduce) {
    root.classList.add('rm');
    if (loader) loader.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  // the mobile address bar showing/hiding must not re-layout every trigger mid-swipe
  ScrollTrigger.config({ ignoreMobileResize: true });
  var isEn = function () { return root.lang === 'en'; };

  // ---------- smooth scroll ----------
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, anchors: { offset: 0 } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-yt],[data-ytlist]')) lenis.stop();
    });
    document.addEventListener('close', function () { lenis.start(); }, true);
  }

  // ---------- split helpers ----------
  function splitChars(el) {
    var t = el.textContent;
    el.textContent = '';
    Array.from(t).forEach(function (c) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      el.appendChild(s);
    });
    return el.querySelectorAll('.ch');
  }
  function splitWords(el) {
    Array.from(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
          var s = document.createElement('span');
          s.className = 'w';
          s.textContent = w;
          frag.appendChild(s);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) splitWords(n);
    });
    return el.querySelectorAll('.w');
  }

  // ---------- hero ----------
  var l1 = splitChars(document.querySelector('.big .l1'));
  var l2 = splitChars(document.querySelector('.big .l2'));
  gsap.set([l1, l2], { yPercent: 115 });
  gsap.set('.face', { clipPath: 'inset(100% 0 0 0)' });
  gsap.set('.face img', { scale: 1.4 });
  gsap.set(['.cap', '.scroll-cue', '.nav'], { autoAlpha: 0, y: 20 });

  var intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
    .to(l1, { yPercent: 0, duration: 1.5, stagger: 0.07 })
    .to(l2, { yPercent: 0, duration: 1.5, stagger: 0.06 }, '<0.15')
    .to('.face', { clipPath: 'inset(0% 0 0 0)', duration: 1.6, ease: 'expo.inOut' }, '<0.2')
    .to('.face img', { scale: 1, duration: 2 }, '<')
    .to(['.nav', '.cap', '.scroll-cue'], { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1 }, '-=1.2')
    .add(function () { if (lenis) lenis.start(); });

  // loader: count to 30,000,000, then wipe away
  var num = document.getElementById('ldNum');
  var c = { v: 0 };
  gsap.timeline()
    .to(c, {
      v: 30000000, duration: 2, ease: 'power3.inOut',
      onUpdate: function () { num.textContent = Math.round(c.v).toLocaleString(isEn() ? 'en-US' : 'vi-VN'); }
    })
    .to('.ld-bar i', { width: '100%', duration: 2, ease: 'power3.inOut' }, 0)
    .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '+=0.25')
    .add(function () { intro.play(); }, '-=0.6')
    .add(function () { loader.remove(); });

  // hero parallax on the way out
  gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
    .to('.big .l1', { xPercent: -28, opacity: 0.15 }, 0)
    .to('.big .l2', { xPercent: 22, opacity: 0.15 }, 0)
    .to('.face', { yPercent: 18, opacity: 0.15 }, 0)
    .to('.dune.d1', { yPercent: -18 }, 0)
    .to('.dune.d2', { yPercent: -40 }, 0)
    // fromTo: the intro hides .cap first, so a plain .to would record "hidden" as its start
    .fromTo('.cap', { y: 0, autoAlpha: 1 }, { y: -80, autoAlpha: 0, immediateRender: false }, 0);

  // drifting sand
  (function () {
    var cv = document.getElementById('sand'), ctx = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2);
    var W, H, on = true, P = [];
    for (var i = 0; i < 160; i++) P.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.5 + 0.3, s: Math.random() * 0.0009 + 0.0002, a: Math.random() * 0.55 + 0.15, o: Math.random() * 6.28 });
    function size() { W = cv.width = cv.offsetWidth * dpr; H = cv.height = cv.offsetHeight * dpr; }
    // phones fire resize when the address bar slides; only re-measure on a real width change
    var lastW = innerWidth;
    size(); addEventListener('resize', function () { if (innerWidth !== lastW) { lastW = innerWidth; size(); } });
    ScrollTrigger.create({ trigger: '.hero', start: 'top bottom', end: 'bottom top', onToggle: function (s) { on = s.isActive; } });
    gsap.ticker.add(function (t) {
      if (!on) return;
      ctx.clearRect(0, 0, W, H);
      P.forEach(function (p) {
        p.x += p.s; p.y += Math.sin(t + p.o) * 0.0004;
        if (p.x > 1.02) p.x = -0.02;
        ctx.fillStyle = 'rgba(217,160,102,' + p.a + ')';
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r * dpr, 0, 6.283); ctx.fill();
      });
    });
  })();

  // ---------- nav hides on scroll down ----------
  var nav = document.querySelector('.nav');
  ScrollTrigger.create({ start: 120, end: 'max', onUpdate: function (s) { nav.classList.toggle('hide', s.direction === 1); } });

  // ---------- marquee reacts to scroll velocity ----------
  var mq = gsap.to('.mq-track', { xPercent: -50, duration: 28, ease: 'none', repeat: -1 });
  var skew = gsap.quickTo('.mq', 'skewX', { duration: 0.4, ease: 'power3' });
  ScrollTrigger.create({
    trigger: '.marquee', start: 'top bottom', end: 'bottom top',
    onUpdate: function (s) {
      var v = s.getVelocity();
      gsap.to(mq, { timeScale: (v < 0 ? -1 : 1) * (1 + Math.min(Math.abs(v) / 250, 6)), duration: 0.2, overwrite: true })
        .then(function () { gsap.to(mq, { timeScale: v < 0 ? -1 : 1, duration: 1 }); });
      skew(gsap.utils.clamp(-12, 12, -v / 120));
    }
  });

  // ---------- manifesto: words light up ----------
  document.querySelectorAll('.mf').forEach(function (p) {
    var words = splitWords(p);
    gsap.fromTo(words, { opacity: 0.12 }, {
      opacity: 1, stagger: 0.1, ease: 'none',
      scrollTrigger: { trigger: '.manifesto', start: 'top 70%', end: 'center 45%', scrub: true }
    });
  });
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var o = { v: 0 }, end = +el.dataset.count, suf = el.dataset.suffix || '';
    el.textContent = '0' + suf;
    gsap.to(o, {
      v: end, duration: 2.2, ease: 'power3.out',
      scrollTrigger: { trigger: '.stats', start: 'top 85%' },
      onUpdate: function () { el.textContent = Math.round(o.v) + suf; }
    });
  });
  gsap.from('.stats div', { y: 60, opacity: 0, duration: 1.2, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.stats', start: 'top 85%' } });

  // ---------- script carousel on a timeline ----------
  var tl = document.querySelector('.tl');
  var stage = tl.querySelector('.stage');
  var slides = Array.from(stage.querySelectorAll('.slide'));
  var ruler = tl.querySelector('.ruler');
  var fill = ruler.querySelector('.fill');
  var bgYear = document.getElementById('bgYear');
  var idxEl = document.getElementById('tlIdx');
  var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
  document.getElementById('tlTotal').textContent = pad2(slides.length);
  tl.classList.add('car');

  var ticks = slides.map(function (s, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tick'; b.setAttribute('role', 'tab');
    b.addEventListener('click', function () { go(i); });
    ruler.appendChild(b);
    return b;
  });
  function labelTicks() {
    ticks.forEach(function (b, i) { b.textContent = (isEn() && slides[i].dataset.tickEn) || slides[i].dataset.tick; });
  }
  labelTicks();

  var yr = { v: +slides[0].dataset.y };
  function renderYear() {
    if (!isFinite(yr.v)) { bgYear.textContent = '∞'; return; }
    var n = Math.round(Math.abs(yr.v));
    bgYear.textContent = n >= 100000 ? n.toLocaleString(isEn() ? 'en-US' : 'vi-VN') : String(n);
  }

  var at = -1;
  function go(i, dir) {
    i = (i + slides.length) % slides.length;
    if (i === at) return;
    if (dir === undefined) dir = i > at ? 1 : -1;
    var prev = slides[at], next = slides[i];
    var first = at === -1;
    at = i;

    slides.forEach(function (s) {
      if (s !== prev && s !== next) { gsap.killTweensOf(s.querySelectorAll('*')); s.classList.remove('on'); }
    });
    if (prev && !first) {
      var pm = prev.querySelector('.media');
      gsap.to(pm, { clipPath: dir > 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)', duration: 0.9, ease: 'expo.inOut', overwrite: true });
      gsap.to(prev.querySelectorAll('.txt > *'), { y: -30, opacity: 0, duration: 0.5, stagger: 0.03, ease: 'power2.in', overwrite: true,
        onComplete: function () { if (slides[at] !== prev) prev.classList.remove('on'); } });
    }
    next.classList.add('on');
    var m = next.querySelector('.media');
    gsap.fromTo(m, { clipPath: dir > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0%)', duration: 1.1, ease: 'expo.inOut', delay: first ? 0 : 0.15, overwrite: true });
    gsap.fromTo(m.querySelector('img'), { scale: 1.35, xPercent: dir * 6 }, { scale: 1, xPercent: 0, duration: 1.6, ease: 'expo.out', delay: first ? 0 : 0.15, overwrite: true });
    gsap.fromTo(next.querySelectorAll('.txt > *'), { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.07, ease: 'expo.out', delay: first ? 0 : 0.35, overwrite: true });

    gsap.to(tl, { backgroundColor: next.dataset.bg, duration: 1.2, ease: 'power2.out', overwrite: 'auto' });
    var target = +next.dataset.y;
    if (!isFinite(target) || !isFinite(yr.v)) { gsap.killTweensOf(yr); yr.v = target; renderYear(); }
    else gsap.to(yr, { v: target, duration: 1.4, ease: 'expo.out', overwrite: true, onUpdate: renderYear });
    gsap.fromTo(bgYear, { xPercent: dir * 4 }, { xPercent: 0, duration: 1.4, ease: 'expo.out' });

    idxEl.textContent = pad2(i + 1);
    ticks.forEach(function (b, k) {
      b.classList.toggle('on', k === i); b.classList.toggle('done', k < i);
      b.setAttribute('aria-selected', String(k === i));
    });
    var t = ticks[i];
    gsap.to(fill, { width: t.offsetLeft + t.offsetWidth / 2, duration: 0.9, ease: 'expo.inOut' });
    if (ruler.scrollWidth > ruler.clientWidth) ruler.scrollTo({ left: t.offsetLeft - ruler.clientWidth / 2 + t.offsetWidth / 2, behavior: 'smooth' });
  }

  tl.querySelector('.prev').addEventListener('click', function () { go(at - 1, -1); });
  tl.querySelector('.next').addEventListener('click', function () { go(at + 1, 1); });

  // drag / swipe; a real drag must not also open the video underneath
  var sx = null, sy = 0, dragged = false;
  stage.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; dragged = false; });
  addEventListener('pointerup', function (e) {
    if (sx === null) return;
    var dx = e.clientX - sx, dy = e.clientY - sy;
    sx = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { dragged = true; go(at + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }
  });
  stage.addEventListener('click', function (e) { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);

  // arrow keys while the carousel is on screen
  var inView = false;
  ScrollTrigger.create({ trigger: tl, start: 'top 60%', end: 'bottom 40%', onToggle: function (s) { inView = s.isActive; } });
  addEventListener('keydown', function (e) {
    if (!inView || document.querySelector('dialog[open]')) return;
    if (e.key === 'ArrowRight') go(at + 1, 1);
    if (e.key === 'ArrowLeft') go(at - 1, -1);
  });

  gsap.from(['.tl-nav', '.stage', '.ruler'], { y: 70, opacity: 0, duration: 1.3, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.stage', start: 'top 85%' } });
  go(0, 1);

  // ---------- section headings + books ----------
  document.querySelectorAll('.sec-h, .books .lbl, .talks .lbl').forEach(function (h) {
    gsap.from(h, { y: 80, opacity: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 88%' } });
  });
  gsap.from('.bk .cv', { y: 80, opacity: 0, duration: 1.4, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.shelf', start: 'top 80%' } });
  gsap.from('.bk h3, .bk p, .bk .badge', { y: 30, opacity: 0, duration: 1, stagger: 0.05, ease: 'expo.out', scrollTrigger: { trigger: '.shelf', start: 'top 60%' } });
  gsap.from('.pods a', { y: 80, opacity: 0, duration: 1.3, stagger: 0.12, ease: 'expo.out', scrollTrigger: { trigger: '.pods', start: 'top 85%' } });

  // ---------- contact: the sun sets as you arrive ----------
  gsap.fromTo('.sun', { yPercent: -40, scale: 0.7 }, { yPercent: 55, scale: 1.1, ease: 'none', scrollTrigger: { trigger: '.contact', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.from('.mail-wrap', { y: 50, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.mail-wrap', start: 'top 95%' } });

  // language switch: relabel the ruler and re-measure
  function relang() { labelTicks(); renderYear(); var t = ticks[at]; gsap.set(fill, { width: t.offsetLeft + t.offsetWidth / 2 }); ScrollTrigger.refresh(); }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-lang-btn]')) setTimeout(relang, 30); });
  // site.js applies the saved language on DOMContentLoaded, after this script ran
  document.addEventListener('DOMContentLoaded', relang);
  addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
