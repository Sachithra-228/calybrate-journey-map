(function () {
  'use strict';
  const D = window.CALYBRATE;
  const chapters = D.chapters, acts = D.acts;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const ST = { todo: 'Not started', doing: 'In progress', blocked: 'Blocked', done: 'Done' };
  const STCOL = { todo: 'var(--todo)', doing: 'var(--doing)', blocked: 'var(--blocked)', done: 'var(--done)' };
  const KIND = { screen: 'Screen', action: 'Action', choice: 'Decision', mail: 'Email', role: 'Role', data: 'Data', chart: 'Report', flag: 'Launch', key: 'Sign-in', download: 'Export', people: 'People', feature: 'Feature' };
  const ICON = {
    screen: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    action: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    choice: '<path d="M12 3l9 9-9 9-9-9z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    role: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    data: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
    key: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    people: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2.4.6 4 2.2 4 5.2"/>',
    feature: '<path d="m12 3 2.6 5.6 6 .8-4.4 4.2 1.1 6L12 16.7 6.7 19.6l1.1-6L3.4 9.4l6-.8z"/>'
  };
  const ico = (k) => `<svg viewBox="0 0 24 24">${ICON[k] || ICON.screen}</svg>`;
  const CHECK = '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- progress state (saved in this browser) ---------- */
  const KEY = 'calybrate-journey-v1';
  let S = { steps: {}, comments: {}, log: [] };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* private mode */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
  const status = (id) => (S.steps[id] && S.steps[id].status) || 'todo';
  function ago(ts) {
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.round(h / 24);
    return d < 8 ? d + 'd ago' : new Date(ts).toLocaleDateString();
  }
  function setStatus(id, to, opts = {}) {
    const from = status(id);
    if (from === to) return;
    S.steps[id] = { status: to, ts: Date.now() };
    if (!opts.silent) S.log.push({ ts: Date.now(), id, type: 'status', from, to });
    save();
  }
  function addComment(id, text) {
    (S.comments[id] = S.comments[id] || []).push({ ts: Date.now(), text });
    S.log.push({ ts: Date.now(), id, type: 'comment', text });
    save();
  }

  /* ============================================================
     The tree:  Calybrate → Acts → Chapters → Steps
     ============================================================ */
  const N = {}, all = [], order = [], chNodes = [], actNodes = [];
  const root = { id: 'root', type: 'root', children: [], collapsed: false };
  N.root = root; all.push(root);
  acts.forEach((a, ai) => {
    const an = { id: 'act-' + ai, type: 'act', ai, children: [], parent: root, collapsed: false };
    root.children.push(an); N[an.id] = an; actNodes.push(an); all.push(an);
    chapters.forEach((ch, ci) => {
      if (ch.act !== ai) return;
      const cn = { id: 'ch-' + ch.n, type: 'chapter', ci, ai, ch, children: [], parent: an, collapsed: true };
      an.children.push(cn); N[cn.id] = cn; chNodes[ci] = cn; all.push(cn);
      const by = {};
      ch.steps.forEach((s) => { if (!s.ref && !s.hub) by[s.id] = { id: s.id, type: 'step', s, ci, ai, children: [], collapsed: false }; });
      ch.steps.forEach((s) => {
        const n = by[s.id]; if (!n) return;
        const p = s.p && by[s.p];
        if (p) { n.parent = p; p.children.push(n); } else { n.parent = cn; cn.children.push(n); }
        N[s.id] = n; n.oi = order.length; order.push(n); all.push(n);
      });
    });
  });
  (function depth(n, d) { n.depth = d; n.children.forEach((c) => depth(c, d + 1)); })(root, 0);
  const descendants = (n) => n.children.flatMap((c) => [c, ...descendants(c)]);
  const stepsOf = (n) => (n.type === 'step' ? [n] : descendants(n).filter((x) => x.type === 'step'));

  function prog(n) {
    const steps = stepsOf(n.type === 'root' ? { type: 'x', children: root.children } : n);
    const p = { done: 0, doing: 0, blocked: 0, total: steps.length };
    steps.forEach((s) => { const st = status(s.id); if (st !== 'todo') p[st]++; });
    p.pct = p.total ? p.done / p.total : 0;
    return p;
  }
  function nState(n) {
    const p = prog(n);
    if (p.blocked) return 'blocked';
    if (p.total && p.done === p.total) return 'done';
    if (p.done || p.doing) return 'doing';
    return 'todo';
  }
  const stateOf = (n) => (n.type === 'step' ? status(n.id) : n.type === 'root' ? null : nState(n));
  function firstOpen() { return order.find((n) => status(n.id) !== 'done') || null; }

  /* ============================================================
     Layout (left → right, mind-map style)
     ============================================================ */
  const DIMS = { d: { root: [270, 150], act: [200, 62], chapter: [292, 58], step: [212, 66] }, m: { root: [200, 128], act: [158, 58], chapter: [226, 54], step: [196, 64] } };
  const COLS = { d: [0, 380, 670, 1060, 262], m: [0, 250, 440, 700, 224] };
  let mobile = innerWidth <= 800, DIM = mobile ? DIMS.m : DIMS.d, COL = mobile ? COLS.m : COLS.d;
  document.body.classList.toggle('mobile', mobile);
  const COLX = (d) => (d < 3 ? COL[d] : COL[3] + (d - 3) * COL[4]);
  const ROW = 78, GAP_CH = 0.12, GAP_ACT = 0.5;
  const CAN_SPEAK = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const story = { on: false, i: 0, playing: false, done: false, voice: CAN_SPEAK, speed: 1, timer: 0, fb: 0, token: 0 };
  try { if (localStorage.getItem('calybrate-voice') === 'off') story.voice = false; } catch (e) { /* ignore */ }
  all.forEach((n, i) => { n.si = i; });
  const storyHidden = (c) => story.on && c.si > story.i;

  function layout() {
    let cur = 0;
    all.forEach((n) => { n.vis = false; });
    (function place(n) {
      n.vis = true;
      const kids = n.collapsed ? [] : n.children.filter((c) => !storyHidden(c));
      if (!kids.length) { n.row = cur + (n.type === 'chapter' ? 0.38 : 0); cur += n.type === 'chapter' ? 0.76 : 1; return; }
      kids.forEach((k, i) => { if (i > 0) cur += k.type === 'chapter' ? GAP_CH : k.type === 'act' ? GAP_ACT : 0; place(k); });
      n.row = (kids[0].row + kids[kids.length - 1].row) / 2;
    })(root);
    all.forEach((n) => {
      const [w, h] = DIM[n.type]; n.w = w; n.h = h;
      if (n.vis) { n.left = COLX(n.depth); n.top = n.row * ROW - h / 2; }
    });
    all.forEach((n) => { // hidden nodes wait inside their nearest visible ancestor
      if (n.vis) return;
      let p = n.parent; while (p && !p.vis) p = p.parent;
      p = p || root; n.left = p.left + (p.w - n.w) / 2; n.top = p.top + (p.h - n.h) / 2;
    });
  }

  /* ============================================================
     DOM: nodes + edges (built once, then moved around)
     ============================================================ */
  const stage = $('#stage');
  stage.innerHTML = '<div class="world" id="world"><svg class="edges" width="1" height="1"></svg></div>';
  const world = $('#world'), edgeSvg = $('.edges', world);
  const actColor = (n) => (n.ai != null ? acts[n.ai].color : '#ceb7dd');

  all.forEach((n, i) => {
    const el = document.createElement('div');
    el.className = `node ${n.type}`; el.dataset.id = n.id;
    el.title = n.type === 'step' ? `${n.s.id} · ${n.s.t}` : n.type === 'chapter' ? n.ch.name : ''; el.setAttribute('role', 'button'); el.tabIndex = 0;
    el.style.width = DIM[n.type][0] + 'px'; el.style.height = DIM[n.type][1] + 'px';
    el.style.setProperty('--d', (n.depth * 0.18 + Math.min(i, 40) * 0.006).toFixed(2) + 's');
    if (n.ai != null) el.style.setProperty('--c', acts[n.ai].color);
    if (n.type === 'root') {
      el.innerHTML = `<div class="plate"><img src="assets/logo.png" alt="Calybrate"></div><div class="rbar"><i></i></div><div class="rtxt"></div>`;
    } else if (n.type === 'act') {
      el.innerHTML = `<div class="txt"><span class="nid">ACT ${acts[n.ai].n}</span><span class="ttl">${esc(acts[n.ai].name)}</span><span class="sub"></span></div>`;
    } else if (n.type === 'chapter') {
      el.innerHTML = `<span class="num">${n.ch.n}</span><div class="txt"><span class="ttl"><span class="t-full">${esc(n.ch.name)}</span><span class="t-short">${esc(n.ch.short)}</span></span><div class="meter"><div class="bar"><i></i><i class="doing"></i><i class="blocked"></i></div><span class="cnt"></span></div></div>`;
    } else {
      const s = n.s;
      el.innerHTML = `<span class="ico">${ico(s.k)}</span><span class="txt"><span class="nid">${esc(s.id)}</span><span class="ttl">${esc(s.t)}</span></span><i class="dot">${CHECK}</i><span class="slot"></span>`;
    }
    if (n.children.length) el.insertAdjacentHTML('beforeend', '<button class="hdl" tabindex="-1" aria-label="Expand or collapse"></button>');
    world.appendChild(el); n.el = el;
    if (n.parent) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('class', 'edge draw'); p.setAttribute('pathLength', '1');
      p.style.strokeWidth = n.depth === 1 ? 5 : n.depth === 2 ? 4 : n.depth === 3 ? 3 : 2.4;
      p.style.animationDelay = (n.depth * 0.18).toFixed(2) + 's';
      edgeSvg.appendChild(p); n.edge = p;
    }
  });
  setTimeout(() => $$('.edge', world).forEach((e) => e.classList.remove('draw')), 1900);

  function edgePath(n) {
    const p = n.parent, x1 = p.left + p.w, y1 = p.top + p.h / 2, x2 = n.left, y2 = n.top + n.h / 2, mx = (x1 + x2) / 2;
    return `M${x1.toFixed(1)},${y1.toFixed(1)} C${mx.toFixed(1)},${y1.toFixed(1)} ${mx.toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }

  function apply() {
    layout();
    all.forEach((n) => {
      n.el.style.left = n.left + 'px'; n.el.style.top = n.top + 'px';
      n.el.classList.toggle('hid', !n.vis);
      if (n.edge) {
        const d = edgePath(n);
        n.edge.setAttribute('d', d); n.edge.style.d = `path("${d}")`;
        n.edge.style.opacity = n.vis ? '' : '0';
      }
    });
    refresh(); drawMinimap();
  }

  /* ---------- dynamic content (status, counts, handles) ---------- */
  function refresh() {
    const t = prog(root);
    all.forEach((n) => {
      const el = n.el, st = stateOf(n);
      el.classList.remove('st-todo', 'st-doing', 'st-blocked', 'st-done');
      if (st) el.classList.add('st-' + st);
      el.classList.toggle('sel', sel === n);
      if (n.type === 'step') {
        const c = (S.comments[n.id] || []).length;
        $('.slot', el).innerHTML = (n.s.g && n.s.g.length ? '<span class="jump">↪</span>' : '') + (c ? `<span class="cmt">💬 ${c}</span>` : '');
        if (n.edge) n.edge.style.stroke = status(n.id) === 'done' ? 'var(--done)' : actColor(n);
      } else if (n.type === 'chapter' || n.type === 'act') {
        const p = prog(n);
        if (n.type === 'chapter') {
          const bars = $$('.bar i', el);
          bars[0].style.width = (p.total ? p.done / p.total * 100 : 0) + '%';
          bars[1].style.width = (p.total ? p.doing / p.total * 100 : 0) + '%';
          bars[2].style.width = (p.total ? p.blocked / p.total * 100 : 0) + '%';
          $('.cnt', el).textContent = `${p.done}/${p.total}`;
        } else $('.sub', el).textContent = `${p.done} of ${p.total} done`;
        if (n.edge) n.edge.style.stroke = st === 'done' ? 'var(--done)' : actColor(n);
      } else {
        $('.rbar i', el).style.width = (t.pct * 100) + '%';
        $('.rtxt', el).innerHTML = `<b>${Math.round(t.pct * 100)}%</b> complete · ${t.done} of ${t.total} steps`;
      }
      const h = $('.hdl', el);
      if (h) {
        h.style.display = story.on ? 'none' : '';
        h.innerHTML = n.collapsed ? '+' + descendants(n).length : '−';
        h.title = n.collapsed ? 'Expand' : 'Collapse';
      }
    });
  }

  /* ============================================================
     Camera
     ============================================================ */
  const cam = { x: 0, y: 0, k: 1 };
  function area() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!document.body.classList.contains('panel-open')) return { w, h };
    return innerWidth <= 800 ? { w, h: h - Math.min(h * 0.62, 460) } : { w: w - 404, h };
  }
  function applyCam() {
    world.style.transform = `translate(${cam.x}px,${cam.y}px) scale(${cam.k})`;
    world.classList.toggle('far', cam.k < 0.42);
    updateViewport();
  }
  function centerOn(n, minK, up) {
    const a = area();
    cam.k = Math.min(1.15, Math.max(cam.k, minK || 0));
    cam.x = a.w / 2 - (n.left + n.w / 2) * cam.k;
    cam.y = a.h / 2 - (n.top + n.h / 2) * cam.k - (up || 0);
    applyCam();
  }
  function fitRect(x1, y1, x2, y2, maxK = 1, pad = 70, res = 160) {
    const a = area(), w = x2 - x1, h = y2 - y1;
    if (mobile) pad = Math.round(pad * 0.3);
    cam.k = Math.max(0.12, Math.min((a.w - pad * 2) / w, (a.h - res) / h, maxK));
    cam.x = (a.w - w * cam.k) / 2 - x1 * cam.k;
    cam.y = (a.h - h * cam.k) / 2 - y1 * cam.k + 6 - (res - 160) / 2;
    applyCam();
  }
  const boundsOf = (nodes) => {
    const v = nodes.filter((n) => n.vis);
    return [Math.min(...v.map((n) => n.left)), Math.min(...v.map((n) => n.top)), Math.max(...v.map((n) => n.left + n.w)), Math.max(...v.map((n) => n.top + n.h))];
  };
  const fitAll = (maxK = 1) => fitRect(...boundsOf(all), maxK);
  const fitNode = (n, maxK = 1) => fitRect(...boundsOf([n, ...descendants(n)]), maxK, 90);
  function zoomAt(f, px, py) {
    const a = area(), x = px == null ? a.w / 2 : px, y = py == null ? a.h / 2 : py;
    const nk = Math.min(1.6, Math.max(0.12, cam.k * f)), s = nk / cam.k;
    cam.x = x - (x - cam.x) * s; cam.y = y - (y - cam.y) * s; cam.k = nk; applyCam();
  }

  (function interactions() {
    const ptrs = new Map();
    let drag = null, pinch = null, wt;
    stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.hdl')) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) drag = { id: e.pointerId, x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false, onNode: !!e.target.closest('.node') };
      else if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, k: cam.k }; drag = null;
        world.classList.add('nogo');
      }
    });
    stage.addEventListener('pointermove', (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()], r = stage.getBoundingClientRect();
        const mx = (a.x + b.x) / 2 - r.left, my = (a.y + b.y) / 2 - r.top;
        const nk = Math.min(1.6, Math.max(0.12, pinch.k * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)), s = nk / cam.k;
        cam.x = mx - (mx - cam.x) * s; cam.y = my - (my - cam.y) * s; cam.k = nk; applyCam();
        return;
      }
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 7) {
        drag.moved = true; stage.classList.add('drag'); world.classList.add('nogo');
        try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      if (drag.moved) { cam.x = drag.cx + dx; cam.y = drag.cy + dy; applyCam(); }
    });
    const end = (e) => {
      ptrs.delete(e.pointerId);
      if (pinch && ptrs.size < 2) { pinch = null; drag = null; world.classList.remove('nogo'); }
      if (drag && e.pointerId === drag.id) {
        const was = drag; drag = null; stage.classList.remove('drag'); world.classList.remove('nogo');
        if (!was.moved && !was.onNode && sel && !story.on) deselect();
      }
    };
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      world.classList.add('nogo'); clearTimeout(wt); wt = setTimeout(() => world.classList.remove('nogo'), 160);
      if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) { cam.x -= e.deltaX; cam.y -= e.deltaY; applyCam(); return; }
      const r = stage.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016)), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
  })();

  /* ---------- minimap ---------- */
  const mmEl = $('#minimap'), mm = $('#mm');
  let mmT = null;
  function drawMinimap() {
    const W = mmEl.clientWidth || 210, H = mmEl.clientHeight || 150;
    const [x1, y1, x2, y2] = boundsOf(all), bw = x2 - x1, bh = y2 - y1, s = Math.min((W - 12) / bw, (H - 12) / bh);
    mmT = { x1, y1, s, ox: (W - bw * s) / 2, oy: (H - bh * s) / 2, W, H };
    let out = '';
    all.forEach((n) => {
      if (!n.vis) return;
      const st = stateOf(n);
      const col = st === 'done' ? '#34d399' : st === 'doing' ? '#fbbf24' : st === 'blocked' ? '#fb7185' : n.type === 'step' ? '#6f6390' : actColor(n);
      out += `<rect x="${((n.left - x1) * s + mmT.ox).toFixed(1)}" y="${((n.top - y1) * s + mmT.oy).toFixed(1)}" width="${Math.max(3, n.w * s).toFixed(1)}" height="${Math.max(2.5, n.h * s).toFixed(1)}" rx="1.5" fill="${col}" opacity="${n.type === 'step' ? .85 : 1}"/>`;
    });
    mm.setAttribute('viewBox', `0 0 ${W} ${H}`);
    mm.innerHTML = out + '<rect id="vp" fill="rgba(192,132,252,.14)" stroke="#c084fc" stroke-width="1.5" rx="3"/>';
    updateViewport();
  }
  function updateViewport() {
    const vp = $('#vp'); if (!vp || !mmT) return;
    const x = (-cam.x / cam.k - mmT.x1) * mmT.s + mmT.ox, y = (-cam.y / cam.k - mmT.y1) * mmT.s + mmT.oy;
    vp.setAttribute('x', x.toFixed(1)); vp.setAttribute('y', y.toFixed(1));
    vp.setAttribute('width', (stage.clientWidth / cam.k * mmT.s).toFixed(1)); vp.setAttribute('height', (stage.clientHeight / cam.k * mmT.s).toFixed(1));
  }
  (function minimapDrag() {
    let on = false;
    const go = (e) => {
      const r = mmEl.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const wx = (px - mmT.ox) / mmT.s + mmT.x1, wy = (py - mmT.oy) / mmT.s + mmT.y1;
      world.classList.add('nogo');
      cam.x = stage.clientWidth / 2 - wx * cam.k; cam.y = stage.clientHeight / 2 - wy * cam.k; applyCam();
    };
    mmEl.addEventListener('pointerdown', (e) => { on = true; mmEl.setPointerCapture(e.pointerId); go(e); });
    mmEl.addEventListener('pointermove', (e) => { if (on) go(e); });
    mmEl.addEventListener('pointerup', () => { on = false; world.classList.remove('nogo'); });
  })();

  /* ============================================================
     Selection + panel
     ============================================================ */
  let sel = null, panelFor = null;
  function expandTo(n) {
    let changed = false;
    for (let p = n.parent; p; p = p.parent) if (p.collapsed) { p.collapsed = false; changed = true; }
    return changed;
  }
  function select(n, o = {}) {
    if (story.on) {
      if (!story.done && n.si <= story.i) { story.playing = false; gotoBeat(n.si); return; }
      exitStory(true);
    }
    const changed = expandTo(n);
    let fitCh = false;
    if (n.type === 'chapter' && n.collapsed && o.open !== false) { n.collapsed = false; fitCh = true; }
    sel = n;
    document.body.classList.add('panel-open');
    if (changed || fitCh) apply(); else refresh();
    renderPanel();
    if (mobile && n.type === 'chapter') {
      const a = area(); cam.k = 0.68;
      cam.x = a.w * 0.05 - n.left * cam.k; cam.y = a.h / 2 - (n.top + n.h / 2) * cam.k; applyCam();
    } else if (n.type === 'chapter' || n.type === 'act') fitNode(n, 1);
    else if (n.type === 'root') fitAll(1);
    else if (o.center !== false) centerOn(n, 0.8);
    drawMinimap();
  }
  function deselect() {
    sel = null; document.body.classList.remove('panel-open'); refresh(); renderToolbar();
  }

  function renderPanel() {
    const p = $('#panel'), n = sel;
    if (!n) { p.innerHTML = ''; return; }
    const keep = panelFor === n.id ? (($('#c-text') || {}).value || '') : '';
    const scroll = panelFor === n.id ? p.scrollTop : 0;
    panelFor = n.id;
    const X = '<button class="btn ghost icon-only p-close" data-a="close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
    let h = X;

    if (n.type === 'root') {
      const t = prog(root), fo = firstOpen();
      h += `<div class="p-top"><span class="chip id">Overview</span></div><h3>Calybrate journey</h3>
        <p class="desc">From the landing page to leadership insight — ${chapters.length} chapters and ${t.total} steps, taken from the hand-drawn sketches.</p>
        <div class="bar"><i style="width:${t.pct * 100}%"></i></div>
        <div class="stat-row"><div class="stat done"><b>${t.done}</b><span>done</span></div><div class="stat doing"><b>${t.doing}</b><span>in progress</span></div><div class="stat blocked"><b>${t.blocked}</b><span>blocked</span></div><div class="stat"><b>${t.total - t.done - t.doing - t.blocked}</b><span>to do</span></div></div>
        <div class="p-actions"><button class="btn primary" data-a="story">▶ Play the story</button>
        <div class="row"><button class="btn ghost" data-a="expand-all">Expand all</button><button class="btn ghost" data-a="collapse-all">Collapse all</button></div></div>
        <div class="lbl">Chapters</div><div class="list">${chNodes.map((c) => chLi(c)).join('')}</div>
        <div class="lbl">More</div>
        <div class="p-actions" style="margin-top:0"><div class="row"><button class="btn ghost" id="btn-activity">Activity</button><button class="btn ghost" id="btn-sketches">All sketches</button></div>
        <div class="row"><button class="btn ghost" id="m-export">Export</button><button class="btn ghost" id="m-import">Import</button><button class="btn ghost danger-t" id="m-reset">Reset</button></div></div>`;
    } else if (n.type === 'act') {
      const a = acts[n.ai], pr = prog(n);
      h += `<div class="p-top"><span class="chip id" style="background:${a.color};color:#0b0612">Act ${a.n}</span></div><h3>${esc(a.name)}</h3>
        <p class="desc">${n.children.length} chapters · ${pr.total} steps · ${pr.done} done.</p><div class="bar"><i style="width:${pr.pct * 100}%"></i></div>
        <div class="lbl" style="margin-top:14px">Chapters</div><div class="list">${n.children.map((c) => chLi(c)).join('')}</div>`;
    } else if (n.type === 'chapter') {
      const a = acts[n.ai], pr = prog(n), ch = n.ch, ref = ch.steps[0] && (ch.steps[0].ref || ch.steps[0].hub) ? ch.steps[0] : null;
      const from = ref && ref.g ? ref.g.map((g) => N[g] ? `<button class="chip btnlike" data-sel="${esc(g)}">↩ ${esc(g)} · ${esc(N[g].s.t)}</button>` : '').join('') : '';
      h += `<div class="p-top"><span class="chip id">Chapter ${ch.n}</span><span class="chip">Act ${a.n} · ${esc(a.name)}</span></div><h3>${esc(ch.name)}</h3><p class="desc">${esc(ch.blurb)}</p>
        ${from ? `<div class="lbl">Picks up from</div><div class="chips">${from}</div>` : ''}
        <div class="bar"><i style="width:${pr.done / pr.total * 100}%"></i><i class="doing" style="width:${pr.doing / pr.total * 100}%"></i><i class="blocked" style="width:${pr.blocked / pr.total * 100}%"></i></div>
        <div class="post-row" style="margin:6px 0 12px"><span>${pr.done} of ${pr.total} steps done</span></div>
        <div class="p-actions"><button class="btn primary" data-a="story-here">▶ Walk through this chapter</button>
        <div class="row"><button class="btn ghost" data-a="toggle-sel">${n.collapsed ? 'Expand steps' : 'Collapse steps'}</button><button class="btn ghost" data-a="sketch">View sketch</button></div></div>
        <div class="lbl">Steps</div><div class="list">${stepsOf(n).map((s) => `<button class="li" data-sel="${esc(s.id)}"><i class="d st-${status(s.id)}"></i><span class="ln">${esc(s.id)}</span>${esc(s.s.t)}</button>`).join('')}</div>`;
    } else {
      const s = n.s, ch = chapters[n.ci], st = status(s.id);
      const jumps = (s.g || []).map((g) => N[g] ? `<button class="chip btnlike" data-sel="${esc(g)}">↪ ${esc(g)} · ${esc(N[g].s.t)}</button>` : '').join('');
      const grants = (s.gr || []).map((g) => N[g] ? `<button class="chip btnlike" data-sel="${esc(g)}">${esc(g)} · ${esc(N[g].s.t)}</button>` : '').join('');
      const nx = order[n.oi + 1];
      h += `<div class="p-top"><span class="chip id">${esc(s.id)}</span><span class="chip">${KIND[s.k] || ''}</span><button class="chip btnlike" data-sel="ch-${ch.n}">Chapter ${ch.n} · ${esc(ch.short)}</button></div>
        <h3>${esc(s.t)}</h3><p class="desc">${esc(s.d || '')}</p>
        ${s.n ? `<div class="note"><b>Check the sketch:</b> ${esc(s.n)}</div>` : ''}
        ${jumps ? `<div class="lbl">Continues at</div><div class="chips">${jumps}</div>` : ''}
        ${grants ? `<div class="lbl">Unlocks</div><div class="chips">${grants}</div>` : ''}
        <div class="lbl">Status</div>
        <div class="seg" id="seg">${Object.keys(ST).map((k) => `<button data-s="${k}" class="${k === st ? 'on' : ''}">${ST[k]}</button>`).join('')}</div>
        <div class="p-actions">
          <button class="btn good" data-a="done">${nx ? (st === 'done' ? '✓ Done — go to next step' : '✓ Mark complete & next step') : '✓ Mark complete'}</button>
          <div class="row"><button class="btn ghost" data-a="upto">Done up to here</button><button class="btn ghost" data-a="sketch">View sketch</button></div>
        </div>
        <div class="lbl">Comments & updates</div>
        <div class="thread">${threadFor(s.id) || '<div class="empty">Nothing yet — add the latest on this step below.</div>'}</div>
        <textarea id="c-text" placeholder="What's happened so far? Questions, blockers, decisions…">${esc(keep)}</textarea>
        <div class="post-row"><span>Ctrl + Enter to post</span><button class="btn primary" data-a="post">Post update</button></div>`;
    }
    p.innerHTML = h; p.scrollTop = scroll;
    renderToolbar();
  }
  function chLi(c) {
    const pr = prog(c), st = nState(c);
    return `<button class="li" data-sel="${c.id}"><i class="d st-${st}"></i><span class="ln">Ch ${c.ch.n}</span>${esc(c.ch.name)}<small>${pr.done}/${pr.total}</small></button>`;
  }
  function threadFor(id) {
    const items = [];
    (S.comments[id] || []).forEach((c) => items.push({ t: 'c', ...c }));
    S.log.filter((l) => l.id === id && l.type === 'status').forEach((l) => items.push({ t: 's', ...l }));
    items.sort((a, b) => a.ts - b.ts);
    return items.map((m) => m.t === 'c'
      ? `<div class="msg"><header>${ago(m.ts)}</header><p>${esc(m.text)}</p></div>`
      : `<div class="sys" style="--c:${STCOL[m.to]}"><span>Status set to <b>${ST[m.to]}</b> · ${ago(m.ts)}</span></div>`).join('');
  }

  /* ============================================================
     Toolbar + story mode (cinematic walk-through)
     ============================================================ */
  const IC = {
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>', zout: '<path d="M5 12h14"/>', zin: '<path d="M12 5v14M5 12h14"/>',
    prev: '<path d="M6 5v14M19 5 9 12l10 7z"/>', next: '<path d="M18 5v14M5 5l10 7-10 7z"/>',
    play: '<path d="m7 4 13 8-13 8z"/>', pause: '<path d="M8 5v14M16 5v14"/>',
    vol: '<path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
    mute: '<path d="M11 5 6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6"/>', replay: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>'
  };
  const svg = (k) => `<svg viewBox="0 0 24 24">${IC[k]}</svg>`;
  const SPEEDS = [1, 1.25, 1.5, 2];

  function renderToolbar() {
    const tb = $('#toolbar');
    const view = `<button class="btn ghost icon-only" data-a="fit" title="Fit everything (F)">${svg('fit')}</button>
      <button class="btn ghost icon-only" data-a="zout" aria-label="Zoom out">${svg('zout')}</button>
      <button class="btn ghost icon-only" data-a="zin" aria-label="Zoom in">${svg('zin')}</button>`;
    if (story.on && story.done) {
      tb.innerHTML = `<button class="btn primary" data-a="replay">${svg('replay')}<span>Replay</span></button><span class="sep"></span>${view}<span class="sep"></span><button class="btn ghost" data-a="exit-story">Close</button>`;
    } else if (story.on) {
      tb.innerHTML = `<button class="btn ghost icon-only" data-a="prev" ${story.i === 0 ? 'disabled' : ''} aria-label="Previous">${svg('prev')}</button>
        <button class="btn primary" data-a="toggle-play">${svg(story.playing ? 'pause' : 'play')}<span class="t-txt">${story.playing ? 'Pause' : 'Play'}</span></button>
        <button class="btn ghost icon-only" data-a="next" aria-label="Next">${svg('next')}</button><span class="sep"></span>
        ${CAN_SPEAK ? `<button class="btn ghost icon-only ${story.voice ? 'lit' : ''}" data-a="voice" title="Voice narration ${story.voice ? 'on' : 'off'}">${svg(story.voice ? 'vol' : 'mute')}</button>` : ''}
        <button class="btn ghost" data-a="speed" title="Speed">${story.speed}×</button><span class="sep"></span>
        <span class="hide-m">${view}<span class="sep"></span></span><button class="btn ghost" data-a="exit-story">Exit</button>`;
    } else {
      tb.innerHTML = `${view}<span class="sep"></span>
        <button class="btn ghost hide-m" data-a="expand-all">Expand all</button><button class="btn ghost hide-m" data-a="collapse-all">Collapse all</button><span class="sep"></span>
        <button class="btn primary" data-a="story">${svg('play')}<span>Play the story</span></button>`;
    }
  }

  /* ---------- what gets said at each beat ---------- */
  const WORDS = ['one', 'two', 'three', 'four'];
  function beat(n) {
    if (n.type === 'root') return { crumb: 'Welcome', title: 'Calybrate', text: `This is Calybrate. Let's walk through the whole product journey, from the landing page all the way to leadership insight. There are ${chapters.length} chapters and ${order.length} steps, grouped into four acts.` };
    if (n.type === 'act') { const a = acts[n.ai]; return { crumb: `Act ${a.n}`, title: a.name, text: `Act ${WORDS[n.ai]}: ${a.name}. It covers ${n.children.length === 1 ? 'one chapter' : n.children.length + ' chapters'}.` }; }
    if (n.type === 'chapter') { const ch = n.ch; return { crumb: `Act ${acts[ch.act].n} · Chapter ${ch.n}`, title: ch.name, text: `Chapter ${ch.n}: ${ch.name.replace('·', ':')}. ${ch.blurb}` }; }
    const s = n.s, ch = chapters[n.ci];
    const pre = s.e === 'Y' ? 'If yes: ' : s.e === 'N' ? 'If no: ' : '';
    const next = s.g && N[s.g[0]] ? ` From here it continues at ${N[s.g[0]].s.t}.` : '';
    return { crumb: `Chapter ${ch.n} · ${ch.short}`, title: s.t, text: `${pre}${s.t}. ${s.d || ''}${next}`, id: s.id };
  }

  /* ---------- voice ---------- */
  function pickVoice() {
    const vs = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
    if (!vs.length) return null;
    for (const p of [/natural|online/i, /google uk english female/i, /google us english/i, /aria|jenny|sonia|libby|samantha|karen|daniel/i]) { const v = vs.find((x) => p.test(x.name)); if (v) return v; }
    return vs.find((v) => /en-(US|GB)/i.test(v.lang)) || vs[0];
  }
  function speak(text, done) {
    const u = new SpeechSynthesisUtterance(text), v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'en-US';
    u.rate = Math.min(1.8, 0.96 * story.speed); u.onend = done; u.onerror = done;
    speechSynthesis.speak(u);
  }
  if (CAN_SPEAK) { speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices(); }

  /* ---------- playback ---------- */
  function clearTimers() {
    clearTimeout(story.timer); clearTimeout(story.fb); story.token++;
    if (CAN_SPEAK) speechSynthesis.cancel();
  }
  function schedule(n) {
    clearTimers();
    if (!story.playing) return;
    const tok = story.token, b = beat(n), sp = story.speed;
    const go = () => { if (tok === story.token && story.playing) advance(); };
    story.timer = setTimeout(() => {
      if (tok !== story.token) return;
      if (story.voice && CAN_SPEAK) {
        speak(b.text, () => { if (tok !== story.token) return; clearTimeout(story.fb); story.timer = setTimeout(go, 700 / sp); });
        story.fb = setTimeout(go, b.text.length * 110 / sp + 6000);
      } else story.timer = setTimeout(go, Math.max(2800, b.text.length * 58) / sp);
    }, 750);
  }
  function advance() { if (story.i >= all.length - 1) finishStory(); else gotoBeat(story.i + 1); }

  function caption(n) {
    const c = $('#caption'), b = beat(n);
    c.classList.remove('on'); clearTimeout(caption.t);
    caption.t = setTimeout(() => {
      c.innerHTML = `<div class="cap-top"><small>${esc(b.crumb)}</small>${b.id ? `<span class="chip id">${esc(b.id)}</span>` : ''}</div><h4>${esc(b.title)}</h4><p>${esc(b.text)}</p><div class="cap-bar"><i style="width:${story.i / (all.length - 1) * 100}%"></i></div>`;
      c.classList.add('on');
    }, 280);
  }
  function storyCam(n) {
    const a = area(), res = mobile ? 230 : 300, minFit = mobile ? 0.8 : 0.55;
    const group = n.type === 'step' ? (() => { const cn = chNodes[n.ci]; return [cn, ...descendants(cn)]; })() : all;
    const [x1, y1, x2, y2] = boundsOf(group);
    const k = Math.min((a.w - 120) / (x2 - x1), (a.h - res) / (y2 - y1), 1);
    if (n.type === 'root' || k >= minFit) fitRect(x1, y1, x2, y2, n.type === 'root' ? 1 : 0.95, 60, res);
    else { cam.k = 0.85; centerOn(n, 0.85, res / 2 - 40); }
  }

  function gotoBeat(i) {
    i = Math.max(0, Math.min(all.length - 1, i));
    const n = all[i];
    story.on = true; story.done = false; story.i = i;
    const cur = n.type === 'step' ? chNodes[n.ci] : n.type === 'chapter' ? n : null;
    chNodes.forEach((c) => { c.collapsed = c !== cur; }); actNodes.forEach((a) => { a.collapsed = false; });
    const panel = !story.playing;
    sel = panel ? n : null;
    document.body.classList.add('story'); document.body.classList.toggle('panel-open', panel);
    apply(); if (panel) renderPanel();
    storyCam(n); caption(n); renderToolbar(); schedule(n); drawMinimap();
  }
  function startStory(i0) {
    closeDrawer(); story.playing = true; story.done = false; gotoBeat(i0 || 0);
  }
  function togglePlay() {
    if (story.done) { startStory(0); return; }
    story.playing = !story.playing; gotoBeat(story.i);
  }
  function finishStory() {
    clearTimers(); story.playing = false; story.done = true; story.i = all.length;
    chNodes.forEach((c) => { c.collapsed = true; }); sel = null; document.body.classList.remove('panel-open');
    apply(); fitRect(...boundsOf(all), 0.95, 60, innerWidth <= 800 ? 230 : 300); renderToolbar();
    const c = $('#caption'), text = `That's the full Calybrate journey — ${chapters.length} chapters and ${order.length} steps. Now it's your turn: open any chapter, mark what's done, and leave a comment.`;
    c.classList.remove('on');
    setTimeout(() => { c.innerHTML = `<div class="cap-top"><small>The end</small></div><h4>That's the journey</h4><p>${esc(text)}</p><div class="cap-bar"><i style="width:100%"></i></div>`; c.classList.add('on'); }, 280);
    const tok = story.token;
    if (story.voice && CAN_SPEAK) setTimeout(() => { if (tok === story.token && story.done) speak(text, () => {}); }, 900);
    confetti(innerWidth / 2, innerHeight / 3);
  }
  function exitStory(quiet) {
    clearTimers(); story.on = false; story.playing = false; story.done = false;
    document.body.classList.remove('story'); $('#caption').classList.remove('on');
    chNodes.forEach((c) => { c.collapsed = true; });
    if (!quiet) { sel = null; document.body.classList.remove('panel-open'); apply(); fitAll(); renderToolbar(); } else apply();
  }
  function nextStep() {
    if (story.on) { if (story.i >= all.length - 1) finishStory(); else gotoBeat(story.i + 1); return; }
    const n = sel && sel.type === 'step' ? sel : null, nx = n ? order[n.oi + 1] : null;
    if (!nx) { toast('That was the last step 🎉'); return; }
    select(nx);
  }

  /* ============================================================
     Search
     ============================================================ */
  const q = $('#q'), results = $('#results');
  let hits = [], hi = 0;
  function runSearch() {
    const v = q.value.trim().toLowerCase();
    if (!v) { results.hidden = true; return; }
    hits = [...chNodes.filter(Boolean), ...order].filter((n) => {
      const t = n.type === 'chapter' ? n.ch.name : n.s.t + ' ' + n.s.id + ' ' + (n.s.d || '');
      return (t + ' ' + (n.type === 'step' ? chapters[n.ci].name : '')).toLowerCase().includes(v);
    }).slice(0, 9);
    hi = 0; drawResults();
  }
  function drawResults() {
    results.hidden = false;
    results.innerHTML = hits.length ? hits.map((n, i) => n.type === 'chapter'
      ? `<button data-sel="${n.id}" class="${i === hi ? 'on' : ''}"><span class="rid">Ch ${n.ch.n}</span><span>${esc(n.ch.name)}<small>Chapter · ${prog(n).total} steps</small></span></button>`
      : `<button data-sel="${esc(n.id)}" class="${i === hi ? 'on' : ''}"><span class="rid">${esc(n.s.id)}</span><span>${esc(n.s.t)}<small>Chapter ${chapters[n.ci].n} · ${esc(chapters[n.ci].name)}</small></span></button>`).join('')
      : '<div class="none">No steps match that.</div>';
  }
  function pick(n) {
    results.hidden = true; q.blur();
    select(n);
    n.el.classList.add('match'); setTimeout(() => n.el.classList.remove('match'), 2200);
  }
  q.addEventListener('input', runSearch);
  q.addEventListener('focus', runSearch);
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hits.length - 1, hi + 1); drawResults(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); hi = Math.max(0, hi - 1); drawResults(); }
    else if (e.key === 'Enter' && hits[hi]) { e.preventDefault(); pick(hits[hi]); }
    else if (e.key === 'Escape') { results.hidden = true; q.blur(); }
  });
  results.addEventListener('click', (e) => { const b = e.target.closest('[data-sel]'); if (b) { e.stopPropagation(); pick(N[b.dataset.sel]); } });
  document.addEventListener('click', (e) => { if (!e.target.closest('.search')) results.hidden = true; });

  /* ============================================================
     Activity drawer, lightbox, toast, confetti
     ============================================================ */
  let dFilter = 'all';
  function evHtml(e) {
    const n = N[e.id], name = n ? n.s.t : e.id;
    let line;
    if (e.type === 'comment') line = `Comment on <b>${esc(e.id)} · ${esc(name)}</b><q>“${esc(e.text.slice(0, 120))}”</q>`;
    else if (e.type === 'bulk') line = `<b>${e.n} steps</b> marked done up to <b>${esc(e.id)} · ${esc(name)}</b>`;
    else line = `<b>${esc(e.id)} · ${esc(name)}</b> set to <b>${ST[e.to]}</b>`;
    return `<button class="ev" data-sel="${esc(e.id)}"><div class="av">${e.type === 'comment' ? '💬' : e.to === 'done' || e.type === 'bulk' ? '✓' : '•'}</div><div>${line}<small>${ago(e.ts)}</small></div></button>`;
  }
  function renderDrawer() {
    const t = prog(root), f = firstOpen();
    let html = `<div class="d-sum"><b>${t.done}</b> of <b>${t.total}</b> steps done · <b>${t.doing}</b> in progress · <b>${t.blocked}</b> blocked.<br>${f ? `Next up: <b>${esc(f.id)} · ${esc(f.s.t)}</b> in chapter ${chapters[f.ci].n}.` : 'Everything is complete.'}</div>`;
    const items = S.log.slice().reverse().filter((e) => dFilter === 'all' || (dFilter === 'comment' ? e.type === 'comment' : e.type !== 'comment'));
    $('#d-body').innerHTML = html + (items.length ? items.map(evHtml).join('') : '<div class="empty">Nothing here yet — updates you make show up here.</div>');
  }
  const openDrawer = () => { renderDrawer(); $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false'); $('#scrim').hidden = false; };
  const closeDrawer = () => { $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); $('#scrim').hidden = true; };

  const LB = { list: [], i: 0, rot: {}, title: '' };
  function openLightbox(list, title) { LB.list = list; LB.i = 0; LB.title = title; $('#lightbox').hidden = false; showLb(); }
  function showLb() {
    const n = LB.list[LB.i], r = LB.rot[n] != null ? LB.rot[n] : (D.rot[n] || 0), img = $('#lb-img'), rotated = Math.abs(r % 180) === 90;
    img.src = n + '.jpeg'; img.style.transform = `rotate(${r}deg)`;
    img.style.maxWidth = rotated ? '88vh' : '100%'; img.style.maxHeight = rotated ? '92vw' : '100%';
    $('#lb-title').textContent = `${LB.title} · sketch ${n}.jpeg (${LB.i + 1}/${LB.list.length})`;
  }

  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }
  function confetti(x, y) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cols = ['#c084fc', '#a855f7', '#ceb7dd', '#e879f9', '#818cf8', '#34d399'];
    for (let i = 0; i < 46; i++) {
      const c = document.createElement('i'); c.className = 'confetti';
      c.style.left = x + 'px'; c.style.top = y + 'px'; c.style.background = cols[i % cols.length];
      c.style.setProperty('--dx', (Math.random() * 520 - 260) + 'px'); c.style.setProperty('--dy', (Math.random() * 420 - 120) + 'px'); c.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      document.body.appendChild(c); setTimeout(() => c.remove(), 1700);
    }
  }

  /* ============================================================
     Events
     ============================================================ */
  function toggleNode(n) {
    if (story.on) return;
    n.collapsed = !n.collapsed; apply();
    if (!n.collapsed && n.type !== 'step') { if (mobile && n.type === 'chapter') { const a = area(); cam.k = 0.68; cam.x = a.w * 0.05 - n.left * cam.k; cam.y = a.h / 2 - (n.top + n.h / 2) * cam.k; applyCam(); } else fitNode(n, 1); }
  }
  function postComment() {
    const ta = $('#c-text'), v = ta.value.trim();
    if (!v) { ta.focus(); return; }
    addComment(sel.id, v); ta.value = ''; renderPanel(); refresh(); toast('Update posted');
  }
  function afterStatusChange() { refresh(); drawMinimap(); renderPanel(); }

  world.addEventListener('click', (e) => {
    const el = e.target.closest('.node'); if (!el) return;
    const n = N[el.dataset.id];
    if (e.target.closest('.hdl')) { e.stopPropagation(); toggleNode(n); return; }
    select(n);
  });
  world.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('node')) { e.preventDefault(); select(N[e.target.dataset.id]); } });

  document.addEventListener('click', (e) => {
    const t = e.target; let el;
    if ((el = t.closest('[data-sel]')) && !t.closest('#results')) { closeDrawer(); select(N[el.dataset.sel]); return; }
    const a = (el = t.closest('[data-a]')) ? el.dataset.a : (t.closest('button[id], a[id]') || {}).id;
    switch (a) {
      case 'close': deselect(); break;
      case 'fit': fitAll(); break;
      case 'zin': zoomAt(1.25); break;
      case 'zout': zoomAt(0.8); break;
      case 'expand-all': if (story.on) exitStory(true); chNodes.forEach((c) => { c.collapsed = false; }); apply(); fitAll(); break;
      case 'collapse-all': if (story.on) exitStory(true); chNodes.forEach((c) => { c.collapsed = true; }); apply(); fitAll(); break;
      case 'story': startStory(0); break;
      case 'story-here': startStory(sel.si); break;
      case 'replay': startStory(0); break;
      case 'exit-story': exitStory(); break;
      case 'toggle-play': togglePlay(); break;
      case 'prev': if (story.i > 0) gotoBeat(story.i - 1); break;
      case 'next': nextStep(); break;
      case 'voice':
        story.voice = !story.voice; try { localStorage.setItem('calybrate-voice', story.voice ? 'on' : 'off'); } catch (err) { /* ignore */ }
        if (!story.voice && CAN_SPEAK) speechSynthesis.cancel();
        renderToolbar(); if (story.playing) schedule(all[story.i]); break;
      case 'speed': story.speed = SPEEDS[(SPEEDS.indexOf(story.speed) + 1) % SPEEDS.length]; renderToolbar(); if (story.playing) schedule(all[story.i]); break;
      case 'toggle-sel': toggleNode(sel); renderPanel(); break;
      case 'sketch': openLightbox(chapters[sel.ci].sketch, chapters[sel.ci].name); break;
      case 'done': {
        setStatus(sel.id, 'done'); const r = el.getBoundingClientRect(); confetti(r.left + r.width / 2, r.top);
        const chDone = prog(chNodes[sel.ci]).done === prog(chNodes[sel.ci]).total;
        if (chDone) toast(`Chapter ${chapters[sel.ci].n} complete — ${chapters[sel.ci].name} ✓`);
        refresh(); nextStep(); break;
      }
      case 'upto': {
        let k = 0;
        order.filter((x) => x.ci === sel.ci && x.oi <= sel.oi).forEach((x) => { if (status(x.id) !== 'done') { setStatus(x.id, 'done', { silent: true }); k++; } });
        if (k) { S.log.push({ ts: Date.now(), id: sel.id, type: 'bulk', n: k, to: 'done' }); save(); toast(`${k} step${k > 1 ? 's' : ''} marked done`); }
        afterStatusChange(); break;
      }
      case 'post': postComment(); break;
      case 'btn-activity': openDrawer(); break;
      case 'd-close': closeDrawer(); break;
      case 'btn-sketches': openLightbox(Array.from({ length: D.imageCount }, (_, i) => i + 1), 'All sketches'); break;
      case 'brand': e.preventDefault(); if (story.on) exitStory(true); chNodes.forEach((c) => { c.collapsed = true; }); apply(); select(root); break;
      case 'lb-close': $('#lightbox').hidden = true; break;
      case 'lb-prev': LB.i = (LB.i + LB.list.length - 1) % LB.list.length; showLb(); break;
      case 'lb-next': LB.i = (LB.i + 1) % LB.list.length; showLb(); break;
      case 'lb-rot': { const n = LB.list[LB.i]; LB.rot[n] = ((LB.rot[n] != null ? LB.rot[n] : (D.rot[n] || 0)) + 90) % 360; showLb(); break; }
      case 'm-export': exportJson(); closeMenu(); break;
      case 'm-import': $('#file-import').click(); closeMenu(); break;
      case 'm-reset': closeMenu(); if (confirm('Reset ALL progress, comments and activity in this browser? This cannot be undone.')) { S = { steps: {}, comments: {}, log: [] }; save(); refresh(); drawMinimap(); renderPanel(); toast('Progress reset'); } break;
      default: break;
    }
    if ((el = t.closest('#seg button'))) { setStatus(sel.id, el.dataset.s); afterStatusChange(); }
    if ((el = t.closest('#d-tabs button'))) { dFilter = el.dataset.f; $$('#d-tabs button').forEach((b) => b.classList.toggle('on', b === el)); renderDrawer(); }
    if (t.id === 'scrim') closeDrawer();
    if (!t.closest('.menu')) closeMenu();
  });
  const closeMenu = () => { const m = $('.menu'); if (m) m.removeAttribute('open'); };

  document.addEventListener('keydown', (e) => {
    const typing = /^(TEXTAREA|INPUT)$/.test(e.target.tagName);
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.id === 'c-text') { postComment(); return; }
    if (e.key === 'Escape') {
      if (!$('#lightbox').hidden) $('#lightbox').hidden = true;
      else if ($('#drawer').classList.contains('open')) closeDrawer();
      else if (story.on) exitStory();
      else if (sel) deselect();
      return;
    }
    if (typing || !$('#lightbox').hidden) return;
    if (e.key === '/') { e.preventDefault(); q.focus(); }
    else if (e.key.toLowerCase() === 'f') fitAll();
    else if (story.on && e.key === ' ') { e.preventDefault(); togglePlay(); }
    else if (story.on && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) { e.preventDefault(); nextStep(); }
    else if (story.on && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) { e.preventDefault(); if (story.i > 0 && !story.done) gotoBeat(story.i - 1); }
  });

  $('#file-import').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        if (!d || typeof d.steps !== 'object') throw new Error('bad file');
        S = Object.assign({ steps: {}, comments: {}, log: [] }, d); save(); refresh(); drawMinimap(); renderPanel(); toast('Progress imported');
      } catch (err) { toast('That file is not a Calybrate progress export'); }
    };
    r.readAsText(f); e.target.value = '';
  });
  function exportJson() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `calybrate-journey-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  window.addEventListener('resize', () => {
    const m = innerWidth <= 800;
    if (m !== mobile) {
      mobile = m; DIM = m ? DIMS.m : DIMS.d; COL = m ? COLS.m : COLS.d; document.body.classList.toggle('mobile', m);
      all.forEach((n) => { n.el.style.width = DIM[n.type][0] + 'px'; n.el.style.height = DIM[n.type][1] + 'px'; });
      apply(); if (story.on && !story.done) storyCam(all[story.i]); else fitAll();
    }
    drawMinimap(); updateViewport();
  });

  /* ---------- boot: the full map, straight away ---------- */
  apply(); renderToolbar();
  world.classList.add('nogo'); fitAll(1); requestAnimationFrame(() => requestAnimationFrame(() => world.classList.remove('nogo')));
  setTimeout(() => $('#hint').classList.add('gone'), 9000);
  $('#stage').addEventListener('pointerdown', () => $('#hint').classList.add('gone'), { once: true });
})();
