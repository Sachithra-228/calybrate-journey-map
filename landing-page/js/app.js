/* Calybrate landing page redesign: behaviour (theme, mobile menu, scroll animations, radar, explorer,
   how-it-works flow, FAQ, demo video, scroll story, request form). No libraries. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  /* ---------- icons ---------- */
  var IC = {
    bar: '<path d="M5 20V10M12 20V4M19 20v-7"/>', user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4M4 5v4h4M4 13a8 8 0 0 0 14.5 4M20 19v-4h-4"/>', bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>', layers: '<path d="M12 3 3 8l9 5 9-5zM3 13l9 5 9-5"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', rocket: '<path d="M5 15c-1 1-1.5 4-1.5 4s3-.5 4-1.5M14 4c3-1 6 0 6 0s1 3 0 6l-6 6-6-6zM9 11l-3-1 2-3 3 1M13 15l1 3 3-2-1-3"/><circle cx="15.5" cy="8.5" r="1.3"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19a6 6 0 0 1 12 0M16 5a3.2 3.2 0 0 1 0 6M18 14a6 6 0 0 1 3 5"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    chev: '<path d="M6 9l6 6 6-6"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', play: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>', playo: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>', grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z"/>', doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    file: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', msg: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.3A8 8 0 1 1 21 12z"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>'
  };
  function icons(root) { $$('i[data-ic]', root).forEach(function (el) { if (!el.firstChild && IC[el.dataset.ic]) el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + IC[el.dataset.ic] + '</svg>'; }); }
  icons();

  /* ---------- theme ---------- */
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t); store('cal-theme', t);
    $$('[data-t]').forEach(function (b) { b.classList.toggle('on', b.dataset.t === t); });
  }
  setTheme(store('cal-theme') || 'light');
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-t]'); if (b) setTheme(b.dataset.t); });

  /* ---------- header + full-screen mobile menu ---------- */
  var nav = $('#nav'), menu = $('#mmenu');
  function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle('open', open); menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-menu]')) setMenu(true);
    else if (e.target.closest('[data-menu-close]') || (menu && menu.classList.contains('open') && e.target.closest('.mm-links a, .mm-bottom a'))) setMenu(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  /* ---------- reveal on scroll ---------- */
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); en.target.dispatchEvent(new Event('reveal')); } });
  }, { threshold: .18, rootMargin: '0px 0px -6% 0px' }) : null;
  $$('.rv, .scale-in, .orbit, .bars, .mini').forEach(function (el, i) {
    if (!io) { el.classList.add('in'); return; }
    io.observe(el);
  });

  /* ---------- radar chart ---------- */
  var AXES = ['Agility', 'Daring', 'Outward focus', 'Market', 'Governance', 'Authority', 'Inward focus', 'Community'];
  function radar(el, sets, opts) {
    opts = opts || {};
    var W = 360, H = 300, cx = W / 2, cy = H / 2 + 4, R = 100, n = AXES.length, lab = opts.labels !== false;
    function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; }
    function poly(vals) { return vals.map(function (v, i) { return pt(i, v).map(function (x) { return x.toFixed(1); }).join(','); }).join(' '); }
    var s = '<svg class="radar" viewBox="-40 0 ' + (W + 80) + ' ' + H + '" role="img" aria-label="Radar chart preview">';
    [.25, .5, .75, 1].forEach(function (k) { s += '<polygon class="grid" points="' + poly(AXES.map(function () { return k; })) + '"/>'; });
    AXES.forEach(function (a, i) {
      var p = pt(i, 1), q = pt(i, 1.2);
      s += '<line class="spoke" x1="' + cx + '" y1="' + cy + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '"/>';
      if (lab) s += '<text x="' + q[0].toFixed(1) + '" y="' + (q[1] + 3).toFixed(1) + '" text-anchor="' + (Math.abs(q[0] - cx) < 8 ? 'middle' : q[0] > cx ? 'start' : 'end') + '">' + a + '</text>';
    });
    s += '<polygon class="poly bench" points="' + poly(sets.bench) + '"/><polygon class="poly pref" points="' + poly(sets.pref) + '"/><polygon class="poly now" points="' + poly(sets.now) + '"/>';
    sets.now.forEach(function (v, i) { var p = pt(i, v); s += '<circle class="pt" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.2"/>'; });
    el.innerHTML = s + '</svg>';
    var svg = el.firstChild, go = function () { requestAnimationFrame(function () { requestAnimationFrame(function () { svg.classList.add('draw'); }); }); };
    if (reduce || opts.now || !io) go(); else { var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { go(); o.disconnect(); } }, { threshold: .3 }); o.observe(el); }
    return svg;
  }
  var DATA = {
    culture: { now: [.74, .72, .8, .58, .5, .56, .62, .66], pref: [.88, .8, .76, .9, .82, .68, .5, .72], bench: [.68, .64, .7, .66, .6, .6, .6, .64] },
    me: { now: [.82, .6, .55, .7, .64, .78, .5, .72], pref: [.7, .7, .66, .76, .72, .66, .62, .7], bench: [.66, .64, .66, .66, .64, .64, .62, .66] },
    c180: { now: [.6, .72, .66, .78, .7, .5, .74, .6], pref: [.76, .74, .7, .8, .78, .66, .72, .7], bench: [.64, .66, .66, .7, .66, .6, .66, .64] },
    c360: { now: [.7, .66, .72, .62, .78, .7, .6, .8], pref: [.8, .74, .76, .72, .8, .72, .68, .8], bench: [.66, .64, .68, .66, .7, .66, .62, .7] }
  };

  /* ---------- Home: module explorer ---------- */
  var ex = $('#explorer');
  if (ex) {
    var MODS = [
      { k: 'culture', eyebrow: 'Ecosystem Health', name: 'CalybrateCulture©', ic: 'bar', title: 'Culture Profile: Now vs Preferred', txt: 'Measure what truly matters. Identify hidden friction and sentiment trends across your entire company to build a resilient, high-performance culture.' },
      { k: 'me', eyebrow: 'Personal Mapping', name: 'CalybrateMe©', ic: 'user', title: 'Personality Profile: Now vs Preferred', txt: 'A comprehensive personality assessment designed to decode internal drivers and work styles.' },
      { k: 'c180', eyebrow: 'Direct Calibration', name: 'Calybrate180©', ic: 'target', title: 'Calibration Profile: Now vs Preferred', txt: 'A structured, two-way calibration between leadership and execution.' },
      { k: 'c360', eyebrow: 'Full Circle', name: 'Calybrate360©', ic: 'refresh', title: '360° Profile: Now vs Preferred', txt: 'A holistic evaluation that aggregates feedback from peers, supervisors, and subordinates.' }
    ];
    var cur = 0, timer = null, acc = $('.acc', ex);
    acc.innerHTML = MODS.map(function (m, i) {
      return '<button class="it" data-i="' + i + '" aria-expanded="false"><span class="row"><span class="ic ' + (i === 0 ? 'dark' : '') + '"><i data-ic="' + m.ic + '"></i></span><span><small>' + m.eyebrow + '</small><b>' + m.name + '</b></span><span class="more"><i data-ic="chev"></i></span></span><span class="more-txt"><span><p>' + m.txt + '</p><span class="sel">Selected ●</span></span></span></button>';
    }).join('');
    icons(acc);
    var rd = $('#rd'), pvt = $('#pv-title'), cnt = $('#ex-count'), dots = $$('.dots span', ex);
    function pick(i) {
      cur = i;
      $$('.it', acc).forEach(function (b, j) { b.classList.toggle('open', j === i); b.setAttribute('aria-expanded', j === i); $('.ic', b).classList.toggle('dark', j === i); });
      cnt.textContent = '0' + (i + 1) + ' / 04'; dots.forEach(function (d, j) { d.classList.toggle('on', j === i); });
      pvt.textContent = MODS[i].title; $('#pv-mod').textContent = MODS[i].name.replace('©', '');
      radar(rd, DATA[MODS[i].k], { now: true });
    }
    function auto() { clearInterval(timer); if (!reduce) timer = setInterval(function () { pick((cur + 1) % 4); }, 6500); }
    acc.addEventListener('click', function (e) { var b = e.target.closest('.it'); if (b) { pick(+b.dataset.i); auto(); } });
    ex.addEventListener('mouseenter', function () { clearInterval(timer); }); ex.addEventListener('mouseleave', auto);
    pick(0); auto();
  }

  /* ---------- Solutions: radar thumbs ---------- */
  $$('[data-radar]').forEach(function (el) { radar(el, DATA[el.dataset.radar] || DATA.culture, { labels: el.dataset.labels !== 'off' }); });

  /* ---------- Solutions: sticky how-it-works flow ---------- */
  var flow = $('#flow');
  if (flow) {
    var steps = $$('.step', flow), cards = $$('.vcard', flow), fill = $('.fill', flow);
    var upd = function () {
      var r = flow.getBoundingClientRect(), total = r.height - window.innerHeight, p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      var s = p < .34 ? 0 : p < .7 ? 1 : 2;
      steps.forEach(function (el, i) { el.classList.toggle('on', i === s); el.classList.toggle('done', i < s); });
      cards.forEach(function (el, i) { el.classList.toggle('on', i === s); });
      if (fill) fill.style.height = (p * 100) + '%';
    };
    window.addEventListener('scroll', upd, { passive: true }); window.addEventListener('resize', upd); upd();
  }

  /* ---------- FAQ accordion ---------- */
  $$('.q').forEach(function (q, i, all) {
    var b = $('button', q);
    b.addEventListener('click', function () {
      var open = !q.classList.contains('open');
      all.forEach(function (o) { o.classList.remove('open'); $('button', o).setAttribute('aria-expanded', 'false'); $('.pm i', o).dataset.ic = 'plus'; $('.pm i', o).innerHTML = ''; icons(o); });
      if (open) { q.classList.add('open'); b.setAttribute('aria-expanded', 'true'); $('.pm i', q).dataset.ic = 'minus'; $('.pm i', q).innerHTML = ''; icons(q); }
    });
  });
  var firstQ = $('.q');
  if (firstQ) setTimeout(function () { $('button', firstQ).click(); }, reduce ? 0 : 900);

  /* ---------- Request a Demo: video modal ---------- */
  var modal = $('#vmodal');
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-video]') && modal) { modal.classList.add('open'); var v = $('video', modal); if (v) v.play().catch(function () {}); }
    else if (modal && modal.classList.contains('open') && (e.target === modal || e.target.closest('[data-video-close]'))) { modal.classList.remove('open'); var v2 = $('video', modal); if (v2) v2.pause(); }
  });
  var vid = modal && $('video', modal);
  if (vid) vid.addEventListener('error', function () { $('#vmsg').textContent = 'Add your 2-minute story video as media/story.mp4 and it will play here.'; }, true);

  /* ---------- Request a Demo: scroll story ---------- */
  var story = $('#story');
  if (story) {
    var heads = $$('.sh', story), rail = $$('.rail span', story);
    var supd = function () {
      var r = story.getBoundingClientRect(), total = r.height - window.innerHeight, p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      var s = p < .22 ? 1 : p < .56 ? 2 : p < .88 ? 3 : 4;
      if (story.dataset.s != s) story.dataset.s = s;
      heads.forEach(function (h, i) { h.classList.toggle('on', i === s - 1); });
      rail.forEach(function (h, i) { h.classList.toggle('on', i === s - 1); });
    };
    window.addEventListener('scroll', supd, { passive: true }); window.addEventListener('resize', supd); supd();
  }

  /* ---------- Request a Demo: form ---------- */
  var form = $('#demo-form');
  if (form) {
    var COUNTRIES = ['Australia', 'Canada', 'Germany', 'India', 'Ireland', 'Netherlands', 'Singapore', 'Sri Lanka', 'United Arab Emirates', 'United Kingdom', 'United States', 'Other'];
    $('#f-country').insertAdjacentHTML('beforeend', COUNTRIES.map(function (c) { return '<option>' + c + '</option>'; }).join(''));
    var stepEls = $$('.fstep span', form.parentNode);
    var fields = $$('input[name], select[name]', form);
    function validField(el) {
      var box = el.closest('.fld'), v = (el.value || '').trim(), msg = '';
      if (el.required && !v) msg = 'This field is required';
      else if (el.type === 'email' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) msg = 'Enter a valid work email';
      else if (el.name === 'phone' && v && !/^[0-9 ()+-]{6,}$/.test(v)) msg = 'Enter a valid number';
      if (box) { box.classList.toggle('bad', !!msg); var er = $('.err', box); if (er) er.textContent = msg; }
      return !msg;
    }
    function progress() {
      var a = ['name', 'email', 'phone'].every(function (n) { return form.elements[n].value.trim(); });
      stepEls[0].classList.toggle('on', !a); stepEls[1].classList.toggle('on', a);
    }
    fields.forEach(function (el) { el.addEventListener('blur', function () { validField(el); }); el.addEventListener('input', function () { if (el.closest('.fld.bad')) validField(el); progress(); }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = fields.map(validField).every(Boolean), size = form.querySelector('input[name="size"]:checked');
      if (!size) { ok = false; $('#size-err').textContent = 'Choose a team size'; } else $('#size-err').textContent = '';
      if (!ok) { var bad = $('.fld.bad input, .fld.bad select', form); if (bad) bad.focus(); return; }
      form.innerHTML = '<div class="ok"><i data-ic="check"></i><h3>Thank you, ' + form.elements.name.value.trim().split(' ')[0].replace(/[<>&"]/g, '') + '.</h3><p>We have your request. Our team will reach out within 24 hours.</p></div>';
      icons(form);
    });
  }
})();
