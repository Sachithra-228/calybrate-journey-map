(async function () {
  'use strict';
  const D = window.CALYBRATE;
  const chapters = D.chapters, acts = D.acts;
  const TEAMS = window.CalybrateStore.TEAMS;
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
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TLOGO = Object.assign({ sandbox: 'assets/sandbox.png', liveroom: 'assets/liveroom.png' }, window.TEAM_LOGOS || {});
  const teamBadge = (t) => (TLOGO[t] ? `<span class="tlogo t-${esc(t)}" title="${esc(TEAMS[t])}"><img src="${TLOGO[t]}" alt="${esc(TEAMS[t])}"></span>` : esc(TEAMS[t] || t));
  const SI = {
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.3A8 8 0 1 1 21 12z"/>',
    warn: '<path d="M12 3 2 20h20L12 3zM12 10v4M12 17h.01"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    play: '<path d="m7 4 13 8-13 8z"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };
  const si = (k) => `<svg class="si" viewBox="0 0 24 24">${SI[k]}</svg>`;
  const cv = (n) => getComputedStyle(document.body).getPropertyValue(n).trim();

  /* ============================================================
     Data: shared store (demo or Supabase) + in-memory copy
     ============================================================ */
  const THEMES = {
    calybrate: { label: 'Calybrate', sw: '#a855f7', acts: acts.map((a) => a.color) },
    sandbox: { label: 'Sandbox', sw: '#f5c518', acts: ['#ffe27a', '#f5c518', '#ffb020', '#d9a406'] },
    liveroom: { label: 'Liveroom', sw: '#3b82f6', acts: ['#9ec5ff', '#4f8ff7', '#6aa8ff', '#7c9cff'] }
  };
  let theme = 'calybrate';
  function applyTheme(t) {
    if (!THEMES[t]) t = 'calybrate';
    theme = t;
    document.body.classList.remove('theme-calybrate', 'theme-sandbox', 'theme-liveroom');
    document.body.classList.add('theme-' + t);
    THEMES[t].acts.forEach((c, i) => { acts[i].color = c; });
    if (built) {
      all.forEach((n) => { if (n.ai != null) n.el.style.setProperty('--c', acts[n.ai].color); });
      refresh(); drawMinimap(); if (sel) renderPanel();
    }
  }
  function chooseTheme() {
    let pref = null; try { pref = localStorage.getItem('calybrate-theme-pref'); } catch (e) { /* ignore */ }
    if (pref && THEMES[pref]) return pref;
    if (profile) return profile.team;
    if (typeof want !== 'undefined' && want) return want;
    return 'calybrate';
  }
  const store = await window.CalybrateStore.create();
  let profile = null;
  let S = { steps: {}, comments: [], attachments: [], events: [] };
  let IDX = {};
  const NONE = { comments: [], atts: [] };
  function rebuildIndex() {
    IDX = {};
    const slot = (id) => (IDX[id] = IDX[id] || { comments: [], atts: [] });
    S.comments.forEach((c) => slot(c.nodeId).comments.push(c));
    S.attachments.forEach((a) => slot(a.nodeId).atts.push(a));
  }
  const status = (id) => (S.steps[id] && S.steps[id].status) || 'todo';
  const nodeComments = (id) => (IDX[id] || NONE).comments.filter((c) => !c.attachmentId);
  const nodeAtts = (id) => (IDX[id] || NONE).atts;

  function ago(ts) {
    const m = Math.round((Date.now() - ts) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.round(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.round(h / 24);
    return d < 8 ? d + 'd ago' : new Date(ts).toLocaleDateString();
  }

  /* ----- notifications: what the other team did since you last looked ----- */
  let seen = { all: 0, nodes: {} }, prevKeys = null;
  const seenKey = () => 'calybrate-seen-' + (profile ? profile.team : 'x');
  function loadSeen() { try { seen = Object.assign({ all: 0, nodes: {} }, JSON.parse(localStorage.getItem(seenKey()) || '{}')); } catch (e) { seen = { all: 0, nodes: {} }; } }
  function saveSeen() { try { localStorage.setItem(seenKey(), JSON.stringify(seen)); } catch (e) { /* ignore */ } }
  function collectForeign() {
    const out = [];
    if (!profile) return out;
    S.comments.forEach((c) => { if (c.team !== profile.team) out.push({ k: 'c:' + c.id, ts: c.ts, nodeId: c.nodeId, c }); });
    S.events.forEach((e) => { if (e.team !== profile.team) out.push({ k: 'e:' + e.id, ts: e.ts, nodeId: e.nodeId, e }); });
    return out;
  }
  const countable = (f) => !!f.c || (f.e && f.e.type === 'upload');
  const isUnread = (f) => f.ts > Math.max(seen.all, seen.nodes[f.nodeId] || 0);
  function unreadMap() {
    const m = {};
    collectForeign().forEach((f) => { if (countable(f) && isUnread(f)) m[f.nodeId] = (m[f.nodeId] || 0) + 1; });
    return m;
  }
  function updateBell() {
    const total = Object.values(unreadMap()).reduce((a, b) => a + b, 0), bn = $('#bn');
    if (bn) { bn.hidden = !total; bn.textContent = total > 99 ? '99+' : total; }
    const bell = $('#bell'); if (bell) bell.title = total ? `${total} new from the other team` : 'Notifications';
    document.title = (total ? `(${total}) ` : '') + 'Calybrate Roadmap';
  }
  function markNodeSeen(id) {
    const latest = Math.max(Date.now(), ...collectForeign().filter((f) => f.nodeId === id).map((f) => f.ts));
    if ((seen.nodes[id] || 0) >= latest) return;
    seen.nodes[id] = latest; saveSeen(); refresh(); updateBell();
  }
  function markAllSeen() {
    seen.all = Math.max(Date.now(), ...collectForeign().map((f) => f.ts)); seen.nodes = {}; saveSeen(); refresh(); updateBell();
    if (sel) renderPanel();
  }
  function showAlert(f) {
    const box = $('#alerts'); if (!box) return;
    const team = f.c ? f.c.team : f.e.team;
    let title, text = '', tab = 'details';
    if (f.c) { title = f.c.kind === 'issue' ? 'raised an issue' : 'sent a message'; text = f.c.body.slice(0, 110); tab = 'chat'; }
    else if (f.e.type === 'upload') { title = 'uploaded a reference image'; tab = 'images'; }
    else if (f.e.type === 'bulk') title = `marked ${f.e.n} steps as done`;
    else title = `set a step to ${ST[f.e.to] || f.e.to}`;
    const el = document.createElement('div');
    el.className = 'alert' + (f.c && f.c.kind === 'issue' ? ' bad' : ''); el.setAttribute('role', 'button'); el.tabIndex = 0;
    el.dataset.sel = f.nodeId; el.dataset.tab = tab;
    el.innerHTML = `${teamBadge(team)}<span class="at"><b>${esc(TEAMS[team] || team)} ${esc(title)}</b><small>${esc(nodeName(f.nodeId))}</small>${text ? `<q>${esc(text)}</q>` : ''}</span><span class="ax" data-a="alert-x" role="button" aria-label="Dismiss">&times;</span>`;
    box.prepend(el);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 9000);
  }
  async function reload() {
    try { S = await store.loadAll(); } catch (e) { toast('Could not load shared data: ' + (e.message || e)); return; }
    rebuildIndex();
    const foreign = collectForeign();
    if (prevKeys) foreign.filter((f) => !prevKeys.has(f.k)).forEach(showAlert);
    prevKeys = new Set(foreign.map((f) => f.k));
    updateBell();
    if (built) { refresh(); drawMinimap(); }
    if (sel) renderPanel();
    if ($('#drawer').classList.contains('open')) renderDrawer();
    if (vw) renderViewer();
  }
  async function guard(fn) {
    try { await fn(); } catch (e) { toast(e.message || 'Something went wrong'); try { await reload(); } catch (e2) { /* ignore */ } }
  }
  function pushEvent(ev) {
    S.events.push({ id: 'tmp' + Date.now() + Math.random(), ts: Date.now(), team: profile.team, name: profile.name, ...ev });
    return store.addEvent(profile, ev);
  }
  function setStatus(id, to, opts = {}) {
    const from = status(id);
    if (from === to) return Promise.resolve();
    S.steps[id] = { status: to, ts: Date.now() };
    const jobs = [store.setStatus(profile, id, to)];
    if (!opts.silent) jobs.push(pushEvent({ nodeId: id, type: 'status', from, to }));
    return Promise.all(jobs);
  }

  /* ============================================================
     The tree:  Calybrate → Acts → Chapters → Steps
     ============================================================ */
  const N = {}, all = [], order = [], chNodes = [], actNodes = [];
  const root = { id: 'root', type: 'root', children: [], collapsed: false };
  N.root = root; all.push(root);
  acts.forEach((a, ai) => {
    const an = { id: 'act-' + ai, type: 'act', ai, children: [], parent: root, collapsed: true };
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
  all.forEach((n, i) => {
    n.si = i; n.desc = descendants(n);
    n.steps = n.type === 'step' ? [n] : n.desc.filter((x) => x.type === 'step');
  });

  function prog(n) {
    const p = { done: 0, doing: 0, blocked: 0, total: n.steps.length };
    n.steps.forEach((s) => { const st = status(s.id); if (st !== 'todo') p[st]++; });
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
  const firstOpen = () => order.find((n) => status(n.id) !== 'done') || null;
  function stats(n) {
    let c = 0, open = 0;
    [n, ...n.desc].forEach((x) => {
      const ix = IDX[x.id]; if (!ix) return;
      ix.comments.forEach((m) => { c++; if (m.kind === 'issue' && !m.resolved) open++; });
    });
    return { c, open };
  }
  function nodeName(id) {
    const n = N[id]; if (!n) return id;
    if (n.type === 'step') return `${n.s.id} · ${n.s.t}`;
    if (n.type === 'chapter') return `Chapter ${n.ch.n} · ${n.ch.name}`;
    if (n.type === 'act') return `Act ${acts[n.ai].n} · ${acts[n.ai].name}`;
    return 'Calybrate (general)';
  }

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
     DOM: nodes + edges (built once after sign-in, then moved around)
     ============================================================ */
  const stage = $('#stage');
  let world = null, edgeSvg = null, built = false;
  const actColor = (n) => (n.ai != null ? acts[n.ai].color : '#ceb7dd');

  function buildMap() {
    stage.innerHTML = '<div class="world" id="world"><svg class="edges" width="1" height="1"></svg></div>';
    world = $('#world'); edgeSvg = $('.edges', world);
    all.forEach((n, i) => {
      const el = document.createElement('div');
      el.className = `node intro ${n.type}`; el.dataset.id = n.id; el.setAttribute('role', 'button'); el.tabIndex = 0;
      el.title = n.type === 'step' ? `${n.s.id} · ${n.s.t}` : n.type === 'chapter' ? n.ch.name : n.type === 'act' ? acts[n.ai].name : 'Calybrate';
      el.style.width = DIM[n.type][0] + 'px'; el.style.height = DIM[n.type][1] + 'px';
      el.style.setProperty('--d', (n.depth * 0.18 + Math.min(i, 40) * 0.006).toFixed(2) + 's');
      if (n.ai != null) el.style.setProperty('--c', acts[n.ai].color);
      if (n.type === 'root') {
        el.innerHTML = `<div class="plate"><img src="assets/logo.png" alt="Calybrate"></div><div class="rbar"><i></i></div><div class="rtxt"></div><span class="slot"></span>`;
      } else if (n.type === 'act') {
        el.innerHTML = `<div class="txt"><span class="nid">ACT ${acts[n.ai].n}</span><span class="ttl">${esc(acts[n.ai].name)}</span><span class="sub"></span></div><span class="slot"></span>`;
      } else if (n.type === 'chapter') {
        el.innerHTML = `<span class="num">${n.ch.n}</span><div class="txt"><span class="ttl"><span class="t-full">${esc(n.ch.name)}</span><span class="t-short">${esc(n.ch.short)}</span></span><div class="meter"><div class="bar"><i></i><i class="doing"></i><i class="blocked"></i></div><span class="cnt"></span></div></div><span class="slot"></span>`;
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
    setTimeout(() => { $$('.edge', world).forEach((e) => e.classList.remove('draw')); $$('.node', world).forEach((e) => e.classList.remove('intro')); }, 2600);
    built = true;
    world.addEventListener('click', (e) => {
      const el = e.target.closest('.node'); if (!el) return;
      const n = N[el.dataset.id];
      if (e.target.closest('.hdl')) { e.stopPropagation(); toggleNode(n); return; }
      select(n);
    });
    world.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('node')) { e.preventDefault(); select(N[e.target.dataset.id]); } });
  }

  function edgePath(n) {
    const p = n.parent, x1 = p.left + p.w, y1 = p.top + p.h / 2, x2 = n.left, y2 = n.top + n.h / 2, mx = (x1 + x2) / 2;
    return `M${x1.toFixed(1)},${y1.toFixed(1)} C${mx.toFixed(1)},${y1.toFixed(1)} ${mx.toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }
  function apply() {
    if (!built) return;
    layout();
    // nodes that are about to appear grow out of their parent one after another
    const fresh = all.filter((n) => n.vis && n.el.classList.contains('hid'));
    const baseDepth = fresh.length ? Math.min(...fresh.map((n) => n.depth)) : 0;
    all.forEach((n) => {
      let delay = 0;
      if (fresh.includes(n)) {
        const sibs = n.parent ? n.parent.children.filter((c) => c.vis) : [];
        delay = 80 + (n.depth - baseDepth) * 130 + Math.max(0, sibs.indexOf(n)) * 55;
      }
      n.el.style.transitionDelay = delay + 'ms';
      n.el.style.left = n.left + 'px'; n.el.style.top = n.top + 'px';
      n.el.classList.toggle('hid', !n.vis);
      if (n.edge) {
        const d = edgePath(n);
        n.edge.style.transitionDelay = delay + 'ms';
        n.edge.setAttribute('d', d); n.edge.style.d = `path("${d}")`;
        n.edge.style.opacity = n.vis ? '' : '0';
      }
    });
    refresh(); drawMinimap();
  }
  const hdlCount = (n) => (n.type === 'act' ? n.children.length : n.type === 'chapter' ? n.steps.length : n.desc.length);

  function refresh() {
    if (!built) return;
    const t = prog(root), um = unreadMap();
    all.forEach((n) => {
      const el = n.el, st = stateOf(n);
      el.classList.remove('st-todo', 'st-doing', 'st-blocked', 'st-done');
      if (st) el.classList.add('st-' + st);
      el.classList.toggle('sel', sel === n);
      const sc = stats(n);
      const badge = (sc.c || sc.open ? `<span class="cmt">${si('chat')} ${sc.c}${sc.open ? ` <b class="iss">${si('warn')} ${sc.open}</b>` : ''}</span>` : '');
      const fresh = [n, ...n.desc].some((x) => um[x.id]);
      $('.slot', el).innerHTML = (n.type === 'step' && n.s.g && n.s.g.length ? '<span class="jump">↪</span>' : '') + badge + (fresh ? '<span class="newdot" title="New from the other team"></span>' : '');
      if (n.type === 'step') {
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
        h.style.display = story.on || n.type === 'root' ? 'none' : '';
        h.innerHTML = n.collapsed ? '+' + hdlCount(n) : '−';
        h.title = n.collapsed ? 'Open' : 'Close';
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
    if (!world) return;
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
  function focusChapterView(n) {
    if (mobile) {
      const a = area(); cam.k = 0.68;
      cam.x = a.w * 0.05 - n.left * cam.k; cam.y = a.h / 2 - (n.top + n.h / 2) * cam.k; applyCam();
    } else fitRect(...boundsOf([n.parent, n, ...n.desc]), 1, 90);
  }
  function zoomAt(f, px, py) {
    const a = area(), x = px == null ? a.w / 2 : px, y = py == null ? a.h / 2 : py;
    const nk = Math.min(1.6, Math.max(0.12, cam.k * f)), s = nk / cam.k;
    cam.x = x - (x - cam.x) * s; cam.y = y - (y - cam.y) * s; cam.k = nk; applyCam();
  }

  (function interactions() {
    const ptrs = new Map();
    let drag = null, pinch = null, wt;
    stage.addEventListener('pointerdown', (e) => {
      if (!world || e.target.closest('.hdl')) return;
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
      if (pinch && ptrs.size < 2) { pinch = null; drag = null; if (world) world.classList.remove('nogo'); }
      if (drag && e.pointerId === drag.id) {
        const was = drag; drag = null; stage.classList.remove('drag'); if (world) world.classList.remove('nogo');
        if (!was.moved && !was.onNode && sel && !story.on) deselect();
      }
    };
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
    stage.addEventListener('wheel', (e) => {
      if (!world) return;
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
    if (!built) return;
    const W = mmEl.clientWidth || 210, H = mmEl.clientHeight || 150;
    const [x1, y1, x2, y2] = boundsOf(all), bw = x2 - x1, bh = y2 - y1, s = Math.min((W - 12) / bw, (H - 12) / bh);
    mmT = { x1, y1, s, ox: (W - bw * s) / 2, oy: (H - bh * s) / 2, W, H };
    let out = '';
    all.forEach((n) => {
      if (!n.vis) return;
      const st = stateOf(n);
      const col = st === 'done' ? '#34d399' : st === 'doing' ? '#fbbf24' : st === 'blocked' ? '#fb7185' : n.type === 'step' ? '#77738a' : actColor(n);
      out += `<rect x="${((n.left - x1) * s + mmT.ox).toFixed(1)}" y="${((n.top - y1) * s + mmT.oy).toFixed(1)}" width="${Math.max(3, n.w * s).toFixed(1)}" height="${Math.max(2.5, n.h * s).toFixed(1)}" rx="1.5" fill="${col}" opacity="${n.type === 'step' ? .85 : 1}"/>`;
    });
    mm.setAttribute('viewBox', `0 0 ${W} ${H}`);
    mm.innerHTML = out + '<rect id="vp" rx="3"/>';
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
      if (!mmT) return;
      const r = mmEl.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const wx = (px - mmT.ox) / mmT.s + mmT.x1, wy = (py - mmT.oy) / mmT.s + mmT.y1;
      world.classList.add('nogo');
      cam.x = stage.clientWidth / 2 - wx * cam.k; cam.y = stage.clientHeight / 2 - wy * cam.k; applyCam();
    };
    mmEl.addEventListener('pointerdown', (e) => { on = true; mmEl.setPointerCapture(e.pointerId); go(e); });
    mmEl.addEventListener('pointermove', (e) => { if (on) go(e); });
    mmEl.addEventListener('pointerup', () => { on = false; if (world) world.classList.remove('nogo'); });
  })();

  /* ============================================================
     Selection (accordion: only the chosen path stays open)
     ============================================================ */
  let sel = null, panelFor = null, composeKind = 'comment', pendingFile = null, panelTab = 'details', pendingTab = null, draft = { text: '', cap: '' };
  function focusPath(n) {
    const anc = new Set();
    for (let p = n.parent; p; p = p.parent) anc.add(p);
    [...actNodes, ...chNodes].forEach((x) => { if (!anc.has(x) && x !== n) x.collapsed = true; });
    for (let p = n.parent; p; p = p.parent) p.collapsed = false;
    if (n.type === 'act' || n.type === 'chapter') n.collapsed = false;
  }
  function cameraFor(n) {
    if (n.type === 'act' && mobile) fitRect(...boundsOf([n, ...n.children]), 0.9, 40);
    else if (n.type === 'root' || n.type === 'act') fitAll(1);
    else if (n.type === 'chapter') focusChapterView(n);
    else centerOn(n, 0.8);
  }
  function select(n, o = {}) {
    pendingTab = o.tab || null;
    if (story.on) {
      if (!story.done && n.si <= story.i) { story.playing = false; gotoBeat(n.si); return; }
      exitStory(true);
    }
    focusPath(n);
    sel = n;
    document.body.classList.add('panel-open');
    apply(); renderPanel(); cameraFor(n); drawMinimap();
  }
  function deselect() { sel = null; document.body.classList.remove('panel-open'); refresh(); renderToolbar(); }
  function toggleNode(n) {
    if (story.on) return;
    if (n.collapsed) { if (n.type === 'act' || n.type === 'chapter') focusPath(n); else n.collapsed = false; } else n.collapsed = true;
    apply();
    if (!n.collapsed) cameraFor(n);
  }

  /* ============================================================
     Side panel
     ============================================================ */
  function msgHtml(m) {
    const mine = profile && m.authorId === profile.id;
    return `<div class="msg ${m.kind === 'issue' ? 'issue' : ''} ${m.resolved ? 'resolved' : ''}">
      <header>${teamBadge(m.team)}<b>${esc(m.name)}</b><span>${ago(m.ts)}</span></header>
      ${m.kind === 'issue' ? `<span class="pill ${m.resolved ? 'ok' : 'bad'}">${m.resolved ? si('check') + ' Issue resolved' : si('warn') + ' Open issue'}</span>` : ''}
      <p>${esc(m.body)}</p>
      <footer>${m.kind === 'issue' ? `<button class="lnk" data-a="resolve" data-cid="${esc(m.id)}" data-to="${m.resolved ? '0' : '1'}">${m.resolved ? 'Reopen' : 'Mark resolved'}</button>` : ''}${mine ? `<button class="lnk danger-t" data-a="del-comment" data-cid="${esc(m.id)}">Delete</button>` : ''}</footer>
    </div>`;
  }
  function threadHtml(id) {
    const items = [];
    nodeComments(id).forEach((c) => items.push({ t: 'c', ts: c.ts, c }));
    S.events.filter((e) => e.nodeId === id && e.type === 'status').forEach((e) => items.push({ t: 's', ts: e.ts, e }));
    items.sort((a, b) => a.ts - b.ts);
    return items.map((m) => m.t === 'c' ? msgHtml(m.c)
      : `<div class="sys" style="--c:${STCOL[m.e.to]}"><span>${teamBadge(m.e.team)} set status to <b>${ST[m.e.to]}</b> · ${ago(m.ts)}</span></div>`).join('');
  }
  function discussionHtml(n, keepTxt) {
    const cnt = nodeComments(n.id).length;
    return `<div class="lbl">Discussion${cnt ? ` · ${cnt}` : ''}</div>
      <div class="thread">${threadHtml(n.id) || '<div class="empty">No messages yet. Start the conversation below.</div>'}</div>
      <div class="kindseg" id="kindseg"><button data-k="comment" class="${composeKind === 'comment' ? 'on' : ''}">${si('chat')} Comment</button><button data-k="issue" class="${composeKind === 'issue' ? 'on bad' : ''}">${si('warn')} Raise an issue</button></div>
      <textarea id="c-text" placeholder="${composeKind === 'issue' ? 'Describe the issue so the other team can act on it…' : 'Write a message to the other team…'}">${esc(keepTxt)}</textarea>
      <div class="post-row"><span>Ctrl + Enter to send</span><button class="btn primary" data-a="post">${composeKind === 'issue' ? 'Raise issue' : 'Send'}</button></div>`;
  }
  function refsHtml(n, keepCap) {
    const atts = nodeAtts(n.id);
    return `<div class="lbl">Reference images${atts.length ? ` · ${atts.length}` : ''}</div>
      ${atts.length ? `<div class="refgrid">${atts.map((a) => {
        const nc = (IDX[n.id] || NONE).comments.filter((c) => c.attachmentId === a.id).length;
        return `<button class="ref" data-a="open-ref" data-aid="${esc(a.id)}" title="${esc(a.caption || 'Reference image')}"><img data-aid="${esc(a.id)}" alt=""><span class="rc">${teamBadge(a.team)}${nc ? ` ${si('chat')} ${nc}` : ''}</span></button>`;
      }).join('')}</div>` : '<div class="empty">No images yet. Upload page structures or references so the other team can comment on them.</div>'}
      <div class="uploader">
        <label class="btn ghost sm" for="ref-file">${si('plus')} Choose image</label><input type="file" id="ref-file" accept="image/*" hidden>
        <span class="fname" id="ref-name">${pendingFile ? esc(pendingFile.name) : 'No file chosen'}</span>
        <input id="ref-cap" type="text" maxlength="200" placeholder="Caption (optional)" value="${esc(keepCap)}">
        <button class="btn primary sm" data-a="upload" id="ref-up" ${pendingFile ? '' : 'disabled'}>Upload</button>
      </div>`;
  }
  function openIssuesHtml(n) {
    const list = [];
    [n, ...n.desc].forEach((x) => (IDX[x.id] || NONE).comments.forEach((c) => { if (c.kind === 'issue' && !c.resolved) list.push({ x, c }); }));
    if (!list.length) return '';
    return `<div class="lbl bad">Open issues in this section · ${list.length}</div><div class="list">${list.map(({ x, c }) => `<button class="li" data-sel="${esc(x.id)}"><i class="d st-blocked"></i><span class="ln">${esc(x.type === 'step' ? x.s.id : x.type === 'chapter' ? 'Ch ' + x.ch.n : x.type === 'act' ? 'Act' : '·')}</span><span class="ellip">${esc(c.body)}</span><small>${esc(TEAMS[c.team] || c.team)}</small></button>`).join('')}</div>`;
  }
  function chLi(c) {
    const pr = prog(c), st = nState(c), sc = stats(c);
    return `<button class="li" data-sel="${c.id}"><i class="d st-${st}"></i><span class="ln">Ch ${c.ch.n}</span><span class="ellip">${esc(c.ch.name)}</span><small>${sc.open ? `<b class="iss">${si('warn')} ${sc.open}</b> ` : ''}${pr.done}/${pr.total}</small></button>`;
  }

  function renderPanel() {
    const p = $('#panel'), n = sel;
    if (!n) { p.innerHTML = ''; return; }
    const same = panelFor === n.id;
    if (same) { const t = $('#c-text'); if (t) draft.text = t.value; const c = $('#ref-cap'); if (c) draft.cap = c.value; }
    else { draft = { text: '', cap: '' }; pendingFile = null; composeKind = 'comment'; }
    const keep = draft.text, keepCap = draft.cap;
    if (pendingTab) panelTab = pendingTab;
    pendingTab = null;
    if (panelTab === 'more' && n.type !== 'root') panelTab = 'details';
    const scroll = same ? p.scrollTop : 0;
    panelFor = n.id;
    let h = '', more = '';

    if (n.type === 'root') {
      const t = prog(root);
      h += `<div class="p-top"><span class="chip id">Overview</span>${profile ? teamBadge(profile.team) : ''}</div><h3>Calybrate roadmap</h3>
        <p class="desc">Four acts, ${chapters.length} chapters and ${t.total} steps — from the landing page to leadership insight. Shared between the Sandbox and Liveroom teams.</p>
        <div class="bar"><i style="width:${t.pct * 100}%"></i></div>
        <div class="stat-row"><div class="stat done"><b>${t.done}</b><span>done</span></div><div class="stat doing"><b>${t.doing}</b><span>in progress</span></div><div class="stat blocked"><b>${t.blocked}</b><span>blocked</span></div><div class="stat"><b>${t.total - t.done - t.doing - t.blocked}</b><span>to do</span></div></div>
        <div class="p-actions"><button class="btn primary" data-a="story">${si('play')} Play the story</button>
        <div class="row"><button class="btn ghost" data-a="expand-all">Open everything</button><button class="btn ghost" data-a="collapse-all">Close all</button></div></div>
        ${openIssuesHtml(n)}
        <div class="lbl">Acts</div><div class="list">${actNodes.map((a) => actLi(a)).join('')}</div>
`;
      more += `<div class="lbl">Invite links</div>
        <div class="links">${['sandbox', 'liveroom'].map((t) => `<div class="lk"><div>${teamBadge(t)}<code>${esc(teamLink(t))}</code></div><button class="btn ghost sm" data-a="copy-link" data-team="${t}">Copy</button></div>`).join('')}
        ${store.mode === 'demo' ? '<p class="warn">Demo mode: these links open the right login, but data is not shared between devices until the shared backend is connected (see SETUP.md).</p>' : '<p class="hint2">Send each team its own link. They sign in once and the browser remembers them.</p>'}</div>
        <div class="lbl">Theme</div>
        <div class="themeseg">${Object.keys(THEMES).map((k) => `<button data-a="theme" data-t="${k}" class="${theme === k ? 'on' : ''}"><i style="--sw:${THEMES[k].sw}"></i>${THEMES[k].label}</button>`).join('')}</div>
        <div class="lbl">More</div>
        <div class="p-actions" style="margin-top:0"><div class="row"><button class="btn ghost" id="btn-activity">Activity</button><button class="btn ghost" id="btn-sketches">All sketches</button></div>
        <div class="row"><button class="btn ghost" data-a="tour">Replay intro</button><button class="btn ghost" id="m-export">Export</button>${store.mode === 'demo' ? '<button class="btn ghost" id="m-import">Import</button>' : ''}</div>
        <div class="row">${store.mode === 'demo' ? '<button class="btn ghost danger-t" id="m-reset">Reset demo</button>' : ''}<button class="btn ghost" data-a="signout">Sign out</button></div></div>`;
    } else if (n.type === 'act') {
      const a = acts[n.ai], pr = prog(n);
      h += `<div class="p-top"><span class="chip id" style="background:${a.color};color:#0b0612">Act ${a.n}</span></div><h3>${esc(a.name)}</h3>
        <p class="desc">${n.children.length} chapters · ${pr.total} steps · ${pr.done} done.</p><div class="bar"><i style="width:${pr.pct * 100}%"></i></div>
        <div class="lbl" style="margin-top:14px">Chapters</div><div class="list">${n.children.map((c) => chLi(c)).join('')}</div>
        ${openIssuesHtml(n)}`;
    } else if (n.type === 'chapter') {
      const a = acts[n.ai], pr = prog(n), ch = n.ch, ref = ch.steps[0] && (ch.steps[0].ref || ch.steps[0].hub) ? ch.steps[0] : null;
      const from = ref && ref.g ? ref.g.map((g) => N[g] ? `<button class="chip btnlike" data-sel="${esc(g)}">↩ ${esc(g)} · ${esc(N[g].s.t)}</button>` : '').join('') : '';
      h += `<div class="p-top"><span class="chip id">Chapter ${ch.n}</span><span class="chip">Act ${a.n} · ${esc(a.name)}</span></div><h3>${esc(ch.name)}</h3><p class="desc">${esc(ch.blurb)}</p>
        ${from ? `<div class="lbl">Picks up from</div><div class="chips">${from}</div>` : ''}
        <div class="bar"><i style="width:${pr.done / pr.total * 100}%"></i><i class="doing" style="width:${pr.doing / pr.total * 100}%"></i><i class="blocked" style="width:${pr.blocked / pr.total * 100}%"></i></div>
        <div class="post-row" style="margin:6px 0 12px"><span>${pr.done} of ${pr.total} steps done</span></div>
        <div class="p-actions"><button class="btn primary" data-a="story-here">${si('play')} Walk through this chapter</button>
        <div class="row"><button class="btn ghost" data-a="toggle-sel">${n.collapsed ? 'Open steps' : 'Close steps'}</button><button class="btn ghost" data-a="sketch">View sketch</button></div></div>
        ${openIssuesHtml(n)}
        <div class="lbl">Steps</div><div class="list">${n.steps.map((s) => stepLi(s)).join('')}</div>`;
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
          <button class="btn good" data-a="done">${si('check')} ${nx ? (st === 'done' ? 'Done — go to next step' : 'Mark complete & next step') : 'Mark complete'}</button>
          <div class="row"><button class="btn ghost" data-a="upto">Done up to here</button><button class="btn ghost" data-a="sketch">View sketch</button></div>
        </div>`;
    }
    const um = unreadMap(), un = [n, ...n.desc].reduce((a, x) => a + (um[x.id] || 0), 0);
    const tabs = [['details', n.type === 'root' ? 'Overview' : 'Details', 0, 0], ['chat', 'Discussion', nodeComments(n.id).length, un], ['images', 'Images', nodeAtts(n.id).length, 0]];
    if (n.type === 'root') tabs.push(['more', 'More', 0, 0]);
    const tabBar = `<div class="ptop"><div class="ptabs" role="tablist">${tabs.map(([k, label, c, u]) => `<button role="tab" data-a="ptab" data-t="${k}" class="${panelTab === k ? 'on' : ''}">${label}${c ? `<b>${c}</b>` : ''}${u ? '<i class="udot"></i>' : ''}</button>`).join('')}</div>
      <button class="btn ghost icon-only p-close" data-a="close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`;
    const ctx = `<div class="pctx">${n.type === 'step' ? `<span class="chip id">${esc(n.s.id)}</span>` : ''}<span>${esc(nodeName(n.id))}</span></div>`;
    const body = panelTab === 'chat' ? ctx + discussionHtml(n, keep) : panelTab === 'images' ? ctx + refsHtml(n, keepCap) : panelTab === 'more' ? more : h;
    p.innerHTML = tabBar + `<div class="pbody">${body}</div>`; p.scrollTop = scroll;
    hydrateThumbs(); renderToolbar();
    if (panelTab === 'chat') markNodeSeen(n.id);
  }
  const teamLink = (t) => `${location.origin}${location.pathname}?team=${t}`;
  function actLi(a) {
    const pr = prog(a), sc = stats(a);
    return `<button class="li" data-sel="${a.id}"><i class="d st-${nState(a)}" style="outline:2px solid ${acts[a.ai].color}33"></i><span class="ln" style="color:${acts[a.ai].color}">Act ${acts[a.ai].n}</span><span class="ellip">${esc(acts[a.ai].name)}</span><small>${sc.open ? `<b class="iss">${si('warn')} ${sc.open}</b> ` : ''}${pr.done}/${pr.total}</small></button>`;
  }
  function stepLi(s) {
    const sc = stats(s);
    return `<button class="li" data-sel="${esc(s.id)}"><i class="d st-${status(s.id)}"></i><span class="ln">${esc(s.id)}</span><span class="ellip">${esc(s.s.t)}</span>${sc.c ? `<small>${si('chat')} ${sc.c}${sc.open ? ` <b class="iss">${si('warn')}</b>` : ''}</small>` : ''}</button>`;
  }

  /* ---------- reference images ---------- */
  const urlCache = {};
  async function urlFor(a) {
    if (urlCache[a.id] && urlCache[a.id].exp > Date.now()) return urlCache[a.id].url;
    const url = await store.attachmentUrl(a);
    urlCache[a.id] = { url, exp: Date.now() + 50 * 60 * 1000 };
    return url;
  }
  function hydrateThumbs() {
    $$('.refgrid img[data-aid]').forEach(async (img) => {
      const a = S.attachments.find((x) => x.id === img.dataset.aid); if (!a) return;
      try { img.src = await urlFor(a); } catch (e) { img.alt = 'Image unavailable'; }
    });
  }
  function downscale(file, max, q) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => { URL.revokeObjectURL(url); b ? res(b) : rej(new Error('Could not process that image')); }, 'image/jpeg', q);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('That file is not a readable image')); };
      img.src = url;
    });
  }
  async function doUpload() {
    if (!pendingFile || !sel) return;
    const btn = $('#ref-up'); if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }
    const cap = (($('#ref-cap') || {}).value || '').trim(), nodeId = sel.id, file = pendingFile;
    await guard(async () => {
      const blob = await downscale(file, store.mode === 'demo' ? 1100 : 1800, store.mode === 'demo' ? 0.78 : 0.88);
      await store.addAttachment(profile, { nodeId, blob, caption: cap });
      await pushEvent({ nodeId, type: 'upload' });
      pendingFile = null; const capEl = $('#ref-cap'); if (capEl) capEl.value = ''; draft.cap = ''; await reload(); toast('Image uploaded');
    });
    if (sel && $('#ref-up')) renderPanel();
  }

  /* viewer: image + its own comment thread */
  let vw = null;
  function openViewer(attId) {
    const a = S.attachments.find((x) => x.id === attId); if (!a) return;
    vw = { nodeId: a.nodeId, id: a.id };
    $('#viewer').hidden = false; renderViewer();
  }
  function closeViewer() { vw = null; $('#viewer').hidden = true; }
  async function renderViewer() {
    if (!vw) return;
    const list = nodeAtts(vw.nodeId), a = list.find((x) => x.id === vw.id);
    if (!a) { closeViewer(); return; }
    const i = list.indexOf(a), side = $('#vw-side');
    const keep = ($('#vw-text') || {}).value || '';
    const comments = S.comments.filter((c) => c.attachmentId === a.id);
    const mine = profile && a.uploaderId === profile.id;
    $('#viewer .vw-nav.prev').style.display = $('#viewer .vw-nav.next').style.display = list.length > 1 ? '' : 'none';
    side.innerHTML = `<header><div><small>${esc(nodeName(a.nodeId))}</small><h3>${esc(a.caption || 'Reference image')}</h3><div class="vm">${teamBadge(a.team)} <b>${esc(a.name)}</b> · ${ago(a.ts)}${list.length > 1 ? ` · ${i + 1} of ${list.length}` : ''}</div></div>
      <button class="btn ghost icon-only" data-a="vw-close" aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></header>
      <div class="lbl">Comments on this image${comments.length ? ` · ${comments.length}` : ''}</div>
      <div class="thread">${comments.map(msgHtml).join('') || '<div class="empty">No comments yet. Tell the other team what you think of this image.</div>'}</div>
      <textarea id="vw-text" placeholder="Comment on this image…">${esc(keep)}</textarea>
      <div class="post-row"><span>Ctrl + Enter to send</span><button class="btn primary" data-a="vw-post">Send</button></div>
      <div class="p-actions"><button class="btn ghost" data-a="vw-goto">Go to this section</button>${mine ? '<button class="btn ghost danger-t" data-a="vw-del">Delete image</button>' : ''}</div>`;
    const img = $('#vw-img');
    try { const u = await urlFor(a); if (img.dataset.aid !== a.id) { img.dataset.aid = a.id; img.src = u; } } catch (e) { img.alt = 'Image unavailable'; }
  }
  async function vwStep(d) {
    const list = nodeAtts(vw.nodeId), i = list.findIndex((x) => x.id === vw.id);
    vw.id = list[(i + d + list.length) % list.length].id; renderViewer();
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
        <button class="btn ghost hide-m" data-a="expand-all">Open all</button><button class="btn ghost hide-m" data-a="collapse-all">Close all</button><span class="sep"></span>
        <button class="btn primary" data-a="story">${svg('play')}<span>Play the story</span></button>`;
    }
  }

  const WORDS = ['one', 'two', 'three', 'four'];
  function beat(n) {
    if (n.type === 'root') return { crumb: 'Welcome', title: 'Calybrate', text: `This is the Calybrate roadmap. Let's walk through the whole product journey, from the landing page all the way to leadership insight. There are ${chapters.length} chapters and ${order.length} steps, grouped into four acts.` };
    if (n.type === 'act') { const a = acts[n.ai]; return { crumb: `Act ${a.n}`, title: a.name, text: `Act ${WORDS[n.ai]}: ${a.name}. It covers ${n.children.length === 1 ? 'one chapter' : n.children.length + ' chapters'}.` }; }
    if (n.type === 'chapter') { const ch = n.ch; return { crumb: `Act ${acts[ch.act].n} · Chapter ${ch.n}`, title: ch.name, text: `Chapter ${ch.n}: ${ch.name.replace('·', ':')}. ${ch.blurb}` }; }
    const s = n.s, ch = chapters[n.ci];
    const pre = s.e === 'Y' ? 'If yes: ' : s.e === 'N' ? 'If no: ' : '';
    const next = s.g && N[s.g[0]] ? ` From here it continues at ${N[s.g[0]].s.t}.` : '';
    return { crumb: `Chapter ${ch.n} · ${ch.short}`, title: s.t, text: `${pre}${s.t}. ${s.d || ''}${next}`, id: s.id };
  }

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
    const group = n.type === 'step' ? (() => { const cn = chNodes[n.ci]; return [cn, ...cn.desc]; })() : all;
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
  function startStory(i0) { closeDrawer(); story.playing = true; story.done = false; gotoBeat(i0 || 0); }
  function togglePlay() {
    if (story.done) { startStory(0); return; }
    story.playing = !story.playing; gotoBeat(story.i);
  }
  function finishStory() {
    clearTimers(); story.playing = false; story.done = true; story.i = all.length;
    chNodes.forEach((c) => { c.collapsed = true; }); actNodes.forEach((a) => { a.collapsed = false; }); sel = null; document.body.classList.remove('panel-open');
    apply(); fitRect(...boundsOf(all), 0.95, 60, mobile ? 230 : 300); renderToolbar();
    const c = $('#caption'), text = `That's the full Calybrate roadmap — ${chapters.length} chapters and ${order.length} steps. Now it's your turn: open any part, update its status, and talk it through with the other team.`;
    c.classList.remove('on');
    setTimeout(() => { c.innerHTML = `<div class="cap-top"><small>The end</small></div><h4>That's the roadmap</h4><p>${esc(text)}</p><div class="cap-bar"><i style="width:100%"></i></div>`; c.classList.add('on'); }, 280);
    const tok = story.token;
    if (story.voice && CAN_SPEAK) setTimeout(() => { if (tok === story.token && story.done) speak(text, () => {}); }, 900);
  }
  function resetAccordion() { [...actNodes, ...chNodes].forEach((x) => { x.collapsed = true; }); }
  function exitStory(quiet) {
    clearTimers(); story.on = false; story.playing = false; story.done = false;
    document.body.classList.remove('story'); $('#caption').classList.remove('on');
    resetAccordion();
    if (!quiet) { sel = null; document.body.classList.remove('panel-open'); apply(); fitAll(); renderToolbar(); } else apply();
  }
  function nextStep() {
    if (story.on) { if (story.i >= all.length - 1) finishStory(); else gotoBeat(story.i + 1); return; }
    const n = sel && sel.type === 'step' ? sel : null, nx = n ? order[n.oi + 1] : null;
    if (!nx) { toast('That was the last step.'); return; }
    select(nx);
  }

  /* ============================================================
     Activity drawer, sketches lightbox, toast
     ============================================================ */
  let dFilter = 'all';
  function feedItem(it) {
    if (it.t === 'comment') {
      const c = it.c;
      return `<button class="ev" data-sel="${esc(c.nodeId)}"><div class="av ${c.kind === 'issue' ? 'bad' : ''}">${c.kind === 'issue' ? si('warn') : si('chat')}</div><div>${teamBadge(c.team)} <b>${esc(c.name)}</b> ${c.kind === 'issue' ? (c.resolved ? 'resolved an issue on' : 'raised an issue on') : 'commented on'} <b>${esc(nodeName(c.nodeId))}</b><q>“${esc(c.body.slice(0, 120))}”</q><small>${ago(c.ts)}</small></div></button>`;
    }
    const e = it.e; let line;
    if (e.type === 'upload') line = `uploaded a reference image to <b>${esc(nodeName(e.nodeId))}</b>`;
    else if (e.type === 'bulk') line = `marked <b>${e.n} steps</b> done up to <b>${esc(nodeName(e.nodeId))}</b>`;
    else line = `set <b>${esc(nodeName(e.nodeId))}</b> to <b>${ST[e.to] || e.to}</b>`;
    return `<button class="ev" data-sel="${esc(e.nodeId)}"><div class="av">${e.type === 'upload' ? si('image') : e.to === 'done' || e.type === 'bulk' ? si('check') : '•'}</div><div>${teamBadge(e.team)} <b>${esc(e.name)}</b> ${line}<small>${ago(e.ts)}</small></div></button>`;
  }
  function renderDrawer() {
    const t = prog(root), f = firstOpen();
    const open = S.comments.filter((c) => c.kind === 'issue' && !c.resolved).length;
    const html = `<div class="d-sum"><b>${t.done}</b> of <b>${t.total}</b> steps done · <b>${t.doing}</b> in progress · <b>${t.blocked}</b> blocked${open ? ` · <b class="iss">${si('warn')} ${open} open issue${open > 1 ? 's' : ''}</b>` : ''}.<br>${f ? `Next up: <b>${esc(f.id)} · ${esc(f.s.t)}</b> in chapter ${chapters[f.ci].n}.` : 'Everything is complete.'}</div>`;
    let items = [...S.events.map((e) => ({ t: 'e', ts: e.ts, e })), ...S.comments.filter((c) => !c.attachmentId || true).map((c) => ({ t: 'comment', ts: c.ts, c }))];
    items = items.filter((it) => dFilter === 'all' || (dFilter === 'comment' && it.t === 'comment' && it.c.kind === 'comment') || (dFilter === 'issue' && it.t === 'comment' && it.c.kind === 'issue') || (dFilter === 'status' && it.t === 'e'));
    items.sort((a, b) => b.ts - a.ts);
    $('#d-body').innerHTML = html + (items.length ? items.slice(0, 200).map(feedItem).join('') : '<div class="empty">Nothing here yet — updates from both teams show up here.</div>');
  }
  const openDrawer = () => { markAllSeen(); renderDrawer(); $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false'); $('#scrim').hidden = false; };
  function closeDrawer() { $('#drawer').classList.remove('open'); $('#drawer').setAttribute('aria-hidden', 'true'); $('#scrim').hidden = true; }

  const LB = { list: [], i: 0, rot: {}, title: '' };
  function openLightbox(list, title) { LB.list = list; LB.i = 0; LB.title = title; $('#lightbox').hidden = false; showLb(); }
  function showLb() {
    const n = LB.list[LB.i], r = LB.rot[n] != null ? LB.rot[n] : (D.rot[n] || 0), img = $('#lb-img'), rotated = Math.abs(r % 180) === 90;
    img.src = n + '.jpeg'; img.style.transform = `rotate(${r}deg)`;
    img.style.maxWidth = rotated ? '88vh' : '100%'; img.style.maxHeight = rotated ? '92vw' : '100%';
    $('#lb-title').textContent = `${LB.title} · sketch ${n}.jpeg (${LB.i + 1}/${LB.list.length})`;
  }

  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3200); }

  /* ============================================================
     Intro tour (first visit)
     ============================================================ */
  const tourKey = () => 'calybrate-tour-v3-' + (profile ? profile.team : 'x');
  const TOUR = [
    { art: `<svg viewBox="0 0 220 120"><g fill="none" stroke-width="2.4" stroke-linecap="round"><path d="M42 60C70 60 70 22 100 22M42 60C70 60 70 46 100 46M42 60C70 60 70 74 100 74M42 60C70 60 70 98 100 98" stroke="#c084fc"/><path d="M122 22h40M122 46h40M122 74h40M122 98h40" stroke="#6f6390"/></g><rect x="6" y="46" width="44" height="28" rx="8" fill="#ceb7dd"/><g fill="#a855f7"><rect x="100" y="12" width="26" height="20" rx="10"/><rect x="100" y="36" width="26" height="20" rx="10"/><rect x="100" y="64" width="26" height="20" rx="10"/><rect x="100" y="88" width="26" height="20" rx="10"/></g><g fill="#2a1d44" stroke="#8b5cf6"><rect x="160" y="14" width="46" height="16" rx="5"/><rect x="160" y="38" width="46" height="16" rx="5"/><rect x="160" y="66" width="46" height="16" rx="5"/><rect x="160" y="90" width="46" height="16" rx="5"/></g></svg>`,
      logos: true, title: 'This is the Calybrate roadmap', text: () => `Every screen, role and report of the product on one map — ${chapters.length} chapters and ${order.length} steps, drawn from the original sketches. It's the shared plan between the Sandbox and Liveroom teams.` },
    { art: `<svg viewBox="0 0 220 120"><g stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M40 60C64 60 64 24 88 24M40 60C64 60 64 48 88 48M40 60C64 60 64 72 88 72M40 60C64 60 64 96 88 96" stroke="#c084fc"/></g><rect x="6" y="46" width="38" height="28" rx="8" fill="#ceb7dd"/><g><rect x="88" y="14" width="50" height="20" rx="10" fill="#d8b4fe"/><rect x="88" y="38" width="50" height="20" rx="10" fill="#a855f7"/><rect x="88" y="62" width="50" height="20" rx="10" fill="#e879f9"/><rect x="88" y="86" width="50" height="20" rx="10" fill="#818cf8"/></g><g stroke="#a855f7" stroke-width="2" fill="none"><path d="M138 48c14 0 14-12 28-12M138 48c14 0 14 0 28 0M138 48c14 0 14 12 28 12"/></g><g fill="#2a1d44" stroke="#8b5cf6"><rect x="166" y="28" width="44" height="14" rx="5"/><rect x="166" y="41" width="44" height="14" rx="5"/><rect x="166" y="54" width="44" height="14" rx="5"/></g></svg>`,
      title: 'Open one part at a time', text: () => 'Start with the four Acts. Click an Act to open its chapters, then a chapter to open its steps. Only the part you pick stays open, so the map stays calm. Prefer a guided tour? Hit "Play the story".' },
    { art: `<svg viewBox="0 0 220 120"><rect x="16" y="14" width="120" height="38" rx="12" fill="#2a1d44" stroke="#f472b6"/><rect x="28" y="26" width="70" height="6" rx="3" fill="#f472b6"/><rect x="28" y="38" width="46" height="6" rx="3" fill="#6f6390"/><rect x="84" y="62" width="120" height="38" rx="12" fill="#2a1d44" stroke="#38bdf8"/><rect x="96" y="74" width="76" height="6" rx="3" fill="#38bdf8"/><rect x="96" y="86" width="40" height="6" rx="3" fill="#6f6390"/><circle cx="196" cy="22" r="11" fill="#fb7185"/><path d="M196 17v6M196 27h.01" stroke="#1d0309" stroke-width="2.4" stroke-linecap="round"/></svg>`,
      title: 'Talk about any section', text: () => 'Every act, chapter and step has its own discussion. Send a comment, or raise an Issue — issues stay flagged until someone marks them resolved. Both teams see everything live.' },
    { art: `<svg viewBox="0 0 220 120"><rect x="40" y="12" width="140" height="96" rx="12" fill="#2a1d44" stroke="#8b5cf6"/><rect x="52" y="24" width="116" height="14" rx="4" fill="#3a2a5c"/><rect x="52" y="44" width="52" height="52" rx="6" fill="#3a2a5c"/><rect x="110" y="44" width="58" height="22" rx="6" fill="#4a3675"/><rect x="110" y="72" width="58" height="24" rx="6" fill="#3a2a5c"/><circle cx="186" cy="94" r="16" fill="#a855f7"/><path d="M186 87v14M179 94h14" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>`,
      title: 'Share reference images', text: () => 'Sandbox can upload page-structure or reference images on any section. Liveroom can open them and comment right on the image — everything stays attached to the part of the roadmap it belongs to.' }
  ];
  let tourI = 0;
  const themeArt = (svg) => svg.replace(/#a855f7/gi, cv('--purple')).replace(/#c084fc/gi, cv('--glow')).replace(/#8b5cf6/gi, cv('--glow'))
    .replace(/#2a1d44/gi, cv('--surface2')).replace(/#3a2a5c/gi, cv('--raise')).replace(/#4a3675/gi, cv('--raise')).replace(/#6f6390/gi, cv('--todo'))
    .replace(/#f472b6/gi, cv('--t-sandbox')).replace(/#38bdf8/gi, cv('--t-liveroom'));
  function showTour() { tourI = 0; $('#tour').hidden = false; renderTour(); }
  function renderTour() {
    const t = TOUR[tourI], last = tourI === TOUR.length - 1;
    $('#tour').innerHTML = `<div class="tour-card" key="${tourI}">
      <div class="tour-art">${themeArt(t.art)}</div>
      <small>${tourI + 1} of ${TOUR.length}${profile ? ` · signed in as ${esc(TEAMS[profile.team])}` : ''}</small>
      <h2>${esc(t.title)}</h2>${t.logos ? `<div class="logos-row">${teamBadge('sandbox')}<span>and</span>${teamBadge('liveroom')}</div>` : ''}<p>${esc(t.text())}</p>
      <div class="tour-dots">${TOUR.map((_, i) => `<i class="${i === tourI ? 'on' : ''}"></i>`).join('')}</div>
      <div class="tour-actions"><button class="btn ghost" data-a="tour-skip">${last ? 'Close' : 'Skip'}</button>${last ? `<button class="btn ghost" data-a="tour-play">${si('play')} Play the story</button>` : ''}<button class="btn primary" data-a="tour-next">${last ? 'Start exploring' : 'Next'}</button></div></div>`;
  }
  function endTour() {
    $('#tour').hidden = true;
    try { localStorage.setItem(tourKey(), '1'); } catch (e) { /* ignore */ }
  }

  /* ============================================================
     Events
     ============================================================ */
  async function postComment() {
    const ta = $('#c-text'), v = ta.value.trim();
    if (!v || !sel) { ta.focus(); return; }
    const nodeId = sel.id, kind = composeKind;
    const btn = $('[data-a="post"]'); if (btn) btn.disabled = true;
    await guard(async () => { await store.addComment(profile, { nodeId, body: v, kind }); ta.value = ''; draft.text = ''; composeKind = 'comment'; await reload(); toast(kind === 'issue' ? 'Issue raised' : 'Message sent'); });
    if (sel && $('[data-a="post"]')) renderPanel();
  }
  async function postViewerComment() {
    const ta = $('#vw-text'), v = ta.value.trim();
    if (!v || !vw) { ta.focus(); return; }
    await guard(async () => { await store.addComment(profile, { nodeId: vw.nodeId, attachmentId: vw.id, body: v, kind: 'comment' }); ta.value = ''; await reload(); });
  }
  function afterStatusChange() { refresh(); drawMinimap(); renderPanel(); }

  document.addEventListener('click', (e) => {
    const t = e.target; let el;
    if ((el = t.closest('[data-a="alert-x"]'))) { const al = el.closest('.alert'); if (al) al.remove(); return; }
    if ((el = t.closest('[data-sel]'))) { closeDrawer(); if (vw) closeViewer(); const n = N[el.dataset.sel]; if (el.classList.contains('alert')) el.remove(); if (n) select(n, { tab: el.dataset.tab }); return; }
    const a = (el = t.closest('[data-a]')) ? el.dataset.a : (t.closest('button[id], a[id]') || {}).id;
    switch (a) {
      case 'close': deselect(); break;
      case 'fit': fitAll(); break;
      case 'zin': zoomAt(1.25); break;
      case 'zout': zoomAt(0.8); break;
      case 'expand-all': if (story.on) exitStory(true); [...actNodes, ...chNodes].forEach((c) => { c.collapsed = false; }); apply(); fitAll(); break;
      case 'collapse-all': if (story.on) exitStory(true); resetAccordion(); apply(); fitAll(); break;
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
        guard(() => setStatus(sel.id, 'done'));
        const chn = chNodes[sel.ci], pc = prog(chn);
        if (pc.done === pc.total) toast(`Chapter ${chapters[sel.ci].n} complete — ${chapters[sel.ci].name}`);
        refresh(); nextStep(); break;
      }
      case 'upto': {
        const todo = order.filter((x) => x.ci === sel.ci && x.oi <= sel.oi && status(x.id) !== 'done');
        if (todo.length) guard(async () => { await Promise.all(todo.map((x) => setStatus(x.id, 'done', { silent: true }))); await pushEvent({ nodeId: sel.id, type: 'bulk', n: todo.length, to: 'done' }); toast(`${todo.length} step${todo.length > 1 ? 's' : ''} marked done`); });
        afterStatusChange(); break;
      }
      case 'post': postComment(); break;
      case 'resolve': guard(async () => { await store.setResolved(el.dataset.cid, el.dataset.to === '1'); await reload(); }); break;
      case 'del-comment': if (confirm('Delete this message?')) guard(async () => { await store.deleteComment(el.dataset.cid); await reload(); }); break;
      case 'upload': doUpload(); break;
      case 'open-ref': openViewer(el.dataset.aid); break;
      case 'vw-close': closeViewer(); break;
      case 'vw-prev': vwStep(-1); break;
      case 'vw-next': vwStep(1); break;
      case 'vw-post': postViewerComment(); break;
      case 'vw-goto': { const n = N[vw.nodeId]; closeViewer(); if (n) select(n); break; }
      case 'vw-del': if (confirm('Delete this image and its comments?')) { const a2 = S.attachments.find((x) => x.id === vw.id); guard(async () => { await store.deleteAttachment(a2); closeViewer(); await reload(); }); } break;
      case 'theme': try { localStorage.setItem('calybrate-theme-pref', el.dataset.t); } catch (err) { /* ignore */ } applyTheme(el.dataset.t); break;
      case 'tour': showTour(); break;
      case 'copy-link': { const link = teamLink(el.dataset.team); (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => toast(`${TEAMS[el.dataset.team]} link copied`), () => { window.prompt('Copy this link', link); }); break; }
      case 'tour-next': if (tourI < TOUR.length - 1) { tourI++; renderTour(); } else { endTour(); } break;
      case 'tour-skip': endTour(); break;
      case 'tour-play': endTour(); startStory(0); break;
      case 'signout': guard(async () => { await store.logout(); location.reload(); }); break;
      case 'who': select(root); break;
      case 'bell': openDrawer(); break;
      case 'ptab': panelTab = el.dataset.t; pendingTab = null; renderPanel(); break;
      case 'btn-activity': openDrawer(); break;
      case 'd-close': closeDrawer(); break;
      case 'btn-sketches': openLightbox(Array.from({ length: D.imageCount }, (_, i) => i + 1), 'All sketches'); break;
      case 'lb-close': $('#lightbox').hidden = true; break;
      case 'lb-prev': LB.i = (LB.i + LB.list.length - 1) % LB.list.length; showLb(); break;
      case 'lb-next': LB.i = (LB.i + 1) % LB.list.length; showLb(); break;
      case 'lb-rot': { const n = LB.list[LB.i]; LB.rot[n] = ((LB.rot[n] != null ? LB.rot[n] : (D.rot[n] || 0)) + 90) % 360; showLb(); break; }
      case 'm-export': exportJson(); break;
      case 'm-import': $('#file-import').click(); break;
      case 'm-reset': if (confirm('Reset the demo data (progress, comments, images) in this browser?')) { try { localStorage.removeItem('calybrate-journey-v2'); } catch (err) { /* ignore */ } location.reload(); } break;
      default: break;
    }
    if ((el = t.closest('#seg button'))) { guard(() => setStatus(sel.id, el.dataset.s)); afterStatusChange(); }
    if ((el = t.closest('#kindseg button'))) { composeKind = el.dataset.k; const v = ($('#c-text') || {}).value || ''; renderPanel(); const ta = $('#c-text'); if (ta) { ta.value = v; ta.focus(); } }
    if ((el = t.closest('#d-tabs button'))) { dFilter = el.dataset.f; $$('#d-tabs button').forEach((b) => b.classList.toggle('on', b === el)); renderDrawer(); }
    if (t.id === 'scrim') closeDrawer();
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'ref-file') {
      pendingFile = e.target.files[0] || null;
      $('#ref-name').textContent = pendingFile ? pendingFile.name : 'No file chosen';
      $('#ref-up').disabled = !pendingFile;
    }
  });

  document.addEventListener('keydown', (e) => {
    const typing = /^(TEXTAREA|INPUT)$/.test(e.target.tagName);
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      if (e.target.id === 'c-text') { postComment(); return; }
      if (e.target.id === 'vw-text') { postViewerComment(); return; }
    }
    if (e.key === 'Escape') {
      if (!$('#tour').hidden) endTour();
      else if (vw) closeViewer();
      else if (!$('#lightbox').hidden) $('#lightbox').hidden = true;
      else if ($('#drawer').classList.contains('open')) closeDrawer();
      else if (story.on) exitStory();
      else if (sel) deselect();
      return;
    }
    if (typing || !profile || !$('#lightbox').hidden || vw || !$('#tour').hidden) return;
    if (e.key.toLowerCase() === 'f') fitAll();
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
        const KEY = 'calybrate-journey-v2', cur = JSON.parse(localStorage.getItem(KEY) || '{}');
        localStorage.setItem(KEY, JSON.stringify({ ...cur, steps: d.steps, comments: d.comments || [], attachments: d.attachments || [], events: d.events || [] }));
        reload(); toast('Imported');
      } catch (err) { toast('That file is not a Calybrate export'); }
    };
    r.readAsText(f); e.target.value = '';
  });
  function exportJson() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), steps: S.steps, comments: S.comments, events: S.events, attachments: S.attachments.map((a) => ({ ...a, url: undefined })) }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `calybrate-roadmap-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  window.addEventListener('resize', () => {
    const m = innerWidth <= 800;
    if (m !== mobile && built) {
      mobile = m; DIM = m ? DIMS.m : DIMS.d; COL = m ? COLS.m : COLS.d; document.body.classList.toggle('mobile', m);
      all.forEach((n) => { n.el.style.width = DIM[n.type][0] + 'px'; n.el.style.height = DIM[n.type][1] + 'px'; });
      apply(); if (story.on && !story.done) storyCam(all[story.i]); else fitAll();
    }
    drawMinimap(); updateViewport();
  });

  /* ============================================================
     Sign-in + boot
     ============================================================ */
  const wantParam = new URLSearchParams(location.search).get('team');
  const want = TEAMS[wantParam] ? wantParam : null;
  function showLoginScreen(msg) {
    const demo = store.mode === 'demo';
    $('#login').hidden = false;
    $('#login-demo').hidden = !demo; $('#login-form').hidden = demo;
    applyTheme(chooseTheme());
    $$('img[data-logo]').forEach((i) => { i.src = TLOGO[i.dataset.logo]; });
    const card = $('.login-card'); card.classList.remove('t-sandbox', 't-liveroom');
    if (want) {
      card.classList.add('t-' + want);
      $('.login-sub').innerHTML = `${teamBadge(want)} Sign in to the <b>${TEAMS[want]}</b> workspace.`;
      $$('#login-demo [data-team]').forEach((b) => { b.hidden = b.dataset.team !== want; });
    }
    if (!demo) { try { $('#login-email').value = localStorage.getItem('calybrate-last-email') || ''; } catch (e) { /* ignore */ } }
    if (msg) $('#login-err').textContent = msg;
    document.body.classList.add('locked');
  }
  const wrongTeamMsg = (p) => `This account belongs to the ${TEAMS[p.team]} team. Use the ${TEAMS[p.team]} link, or sign in with the ${TEAMS[want]} login.`;
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('#login-err'), btn = $('#login-go'); err.textContent = ''; btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      const email = $('#login-email').value.trim();
      const p = await store.login({ email, password: $('#login-pass').value });
      if (want && p.team !== want) { await store.logout(); throw new Error(wrongTeamMsg(p)); }
      try { localStorage.setItem('calybrate-last-email', email); } catch (e2) { /* ignore */ }
      profile = p; await enter();
    }
    catch (ex) { err.textContent = /invalid login/i.test(ex.message || '') ? 'Wrong email or password.' : (ex.message || 'Could not sign in.'); }
    btn.disabled = false; btn.textContent = 'Sign in';
  });
  $('#login-demo').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-team]'); if (!b) return;
    profile = await store.login({ team: b.dataset.team }); await enter();
  });

  let entered = false;
  async function enter() {
    if (entered) return; entered = true;
    $('#login').hidden = true; document.body.classList.remove('locked');
    loadSeen(); $('#corner').hidden = false; const who = $('#who'); who.hidden = false; who.className = `who t-${profile.team}`; who.innerHTML = `${teamBadge(profile.team)}<span>${esc(new RegExp(TEAMS[profile.team], 'i').test(profile.name) ? profile.name : `${TEAMS[profile.team]} · ${profile.name}`)}</span>`; applyTheme(chooseTheme());
    who.dataset.a = 'who';
    await reload();
    buildMap(); apply(); renderToolbar();
    world.classList.add('nogo'); fitAll(1); requestAnimationFrame(() => requestAnimationFrame(() => world.classList.remove('nogo')));
    if (mobile) $('#hint').textContent = 'Tap an Act to open it · Drag to move · Pinch to zoom';
    store.subscribe(() => reload());
    setTimeout(() => $('#hint').classList.add('gone'), 12000);
    stage.addEventListener('pointerdown', () => $('#hint').classList.add('gone'), { once: true });
    let seen = false; try { seen = !!localStorage.getItem(tourKey()); } catch (e) { /* ignore */ }
    if (!seen) setTimeout(showTour, 600);
  }

  try { profile = await store.init(); } catch (e) { profile = null; }
  if (profile && want && profile.team !== want) { try { await store.logout(); } catch (e) { /* ignore */ } profile = null; }
  if (profile) await enter(); else showLoginScreen();
})();
