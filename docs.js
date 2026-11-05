/* Documents + Templates + the top-right view switcher.
   app.js calls CalDocs.init(api) once the person is signed in. Comments on documents reuse the normal comments table:
   node_id = "doc:<document id>:<page>"  (page 0 = the whole document), so both teams see them in the same activity feed. */
(function () {
  'use strict';
  const BUILTIN = [
    { id: 'dashboard', title: 'Dashboard Redesign', desc: 'Super Admin and Admin: dashboard, campaigns, reports and users, laptop and mobile, with confirmations and findings.', url: 'documents/Calybrate-Dashboard-Redesign.pdf', pages: 87, size: 29206078, tag: 'Super Admin + Admin' },
    { id: 'landing', title: 'Landing Page Redesign', desc: 'Home, Solutions, FAQ, Request a Demo and the mobile menu: current and suggested, with scroll flows.', url: 'documents/Calybrate-Landing-Page-Redesign.pdf', pages: 31, size: 10454368, tag: 'Public site' },
    { id: 'sysadmin', title: 'System Admin Redesign', desc: 'Dashboard, organizations, requests, consultants and reports, plus the 8-item sidebar plan with tabs.', url: 'documents/Calybrate-System-Admin-Redesign.pdf', pages: 17, size: 8442380, tag: 'System Admin' }
  ];
  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let api = null, view = 'roadmap', uploaded = [], pdfjs = null, cur = null, pendingFile = null, kind = 'comment', tab = 'page';
  const nodeId = (id, p) => `doc:${id}:${p}`;
  const parseNode = (nid) => { const m = /^doc:(.+):(\d+)$/.exec(nid || ''); return m ? { id: m[1], page: +m[2] } : null; };
  const allDocs = () => [...BUILTIN.map((d) => ({ ...d, builtin: true })), ...uploaded];
  const find = (id) => allDocs().find((d) => d.id === id);
  const mb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const IC = {
    map: '<circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M8 7.2l3 8.4M16 7.2l-3 8.4"/>',
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    tpl: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="M13.5 17h7M17 13.5v7"/>',
    dl: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>', up: '<path d="M12 16V5M7 10l5-5 5 5M4 20h16"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.3A8 8 0 1 1 21 12z"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>', left: '<path d="M15 6l-6 6 6 6"/>', plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>', fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'
  };
  const sv = (k, c) => `<svg class="${c || 'si'}" viewBox="0 0 24 24">${IC[k]}</svg>`;

  /* ---------------- switcher + views ---------------- */
  function setView(v, push) {
    if (view === v && !push) return;
    if (v !== 'roadmap' && document.body.classList.contains('story')) { const x = $('[data-a="exit-story"]'); if (x) x.click(); }
    view = v;
    document.body.classList.toggle('view-docs', v === 'docs'); document.body.classList.toggle('view-tpl', v === 'tpl');
    $('#docs-view').hidden = v !== 'docs'; $('#tpl-view').hidden = v !== 'tpl';
    $$('#switch button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
    if (v !== 'docs') closeViewer(true);
    if (window.CalTpl) { if (v === 'tpl') CalTpl.show(); else CalTpl.hide(); }
    if (v === 'docs') renderList();
    if (v === 'roadmap') { window.dispatchEvent(new Event('resize')); }
    const h = v === 'docs' ? '#documents' : v === 'tpl' ? '#templates' : '';
    if (location.hash !== h && !(h === '' && !location.hash)) history.replaceState(null, '', location.pathname + location.search + h);
  }
  function route() {
    const m = /^#documents(?:\/([^/]+)(?:\/(\d+))?)?$/.exec(location.hash || '');
    if (m) { setView('docs'); if (m[1] && find(m[1])) openDoc(m[1], +m[2] || 1); return; }
    const tm = /^#templates(?:\/([^/]+))?$/.exec(location.hash || '');
    if (tm) { setView('tpl'); if (tm[1] && window.CalTpl) CalTpl.open(tm[1]); }
  }

  /* ---------------- list ---------------- */
  const commentCount = (id) => api.S().comments.filter((c) => c.nodeId.startsWith(`doc:${id}:`)).length;
  const openIssues = (id) => api.S().comments.filter((c) => c.nodeId.startsWith(`doc:${id}:`) && c.kind === 'issue' && !c.resolved).length;
  function card(d) {
    const cc = commentCount(d.id), oi = openIssues(d.id), mine = !d.builtin && api.profile() && d.uploaderId === api.profile().id;
    return `<article class="dcard" data-doc="${api.esc(d.id)}">
      <div class="dthumb"><span class="dpdf">${sv('doc', 'dsvg')}<b>PDF</b></span>${d.tag ? `<span class="dtag">${api.esc(d.tag)}</span>` : ''}</div>
      <div class="dbody"><h3>${api.esc(d.title)}</h3><p>${api.esc(d.desc || 'No description.')}</p>
        <div class="dmeta">${d.pages ? `<span>${d.pages} pages</span>` : ''}<span>${mb(d.size)}</span>${d.builtin ? '<span>Built in</span>' : `<span>${api.teamBadge(d.team)} ${api.esc(d.name || '')} · ${api.ago(d.ts)}</span>`}</div>
        <div class="dact"><button class="btn primary" data-da="open" data-id="${api.esc(d.id)}">${sv('eye')} Preview</button><button class="btn ghost" data-da="download" data-id="${api.esc(d.id)}">${sv('dl')} Download</button>
          <span class="dcm" title="Comments on this document">${sv('chat')} ${cc}${oi ? ` <b class="iss">${oi} open</b>` : ''}</span>${mine ? `<button class="btn ghost icon-only danger-t" data-da="delete" data-id="${api.esc(d.id)}" title="Delete this document" aria-label="Delete">${sv('trash')}</button>` : ''}</div></div></article>`;
  }
  function renderList() {
    if (!api) return;
    const v = $('#docs-view');
    v.innerHTML = `<div class="vhead"><div><h1>Documents</h1><p>Design documents for both teams. Preview them here, download a copy, and comment on any page.</p></div>
      <div class="vact"><button class="btn primary" data-da="upload">${sv('up')} Upload PDF</button></div></div>
      <div class="dgrid">${allDocs().map(card).join('')}
        <button class="dcard dadd" data-da="upload"><span class="dplus">${sv('plus', 'dsvg')}</span><b>Upload a PDF</b><small>or drop a file here</small></button></div>`;
  }
  async function loadUploaded() { try { uploaded = await api.store.listDocs(); } catch (e) { uploaded = []; } }

  /* ---------------- upload ---------------- */
  function openUpload(file) {
    pendingFile = null; $('#docup').hidden = false; $('#up-err').textContent = ''; $('#up-title').value = ''; $('#up-desc').value = ''; $('#up-name').textContent = 'No file chosen'; $('#up-go').disabled = true; $('#up-drop').classList.remove('has');
    if (file) pickFile(file);
  }
  function pickFile(f) {
    const err = $('#up-err'); err.textContent = '';
    if (!f) return;
    if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) { err.textContent = 'Please choose a PDF file.'; return; }
    if (f.size > 50 * 1024 * 1024) { err.textContent = 'That file is over 50 MB. Compress it or split it first.'; return; }
    pendingFile = f; $('#up-name').textContent = `${f.name} · ${mb(f.size)}`; $('#up-drop').classList.add('has'); $('#up-go').disabled = false;
    if (!$('#up-title').value) $('#up-title').value = f.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();
  }
  async function doUpload() {
    if (!pendingFile) return;
    const title = $('#up-title').value.trim() || pendingFile.name, btn = $('#up-go'); btn.disabled = true; btn.textContent = 'Uploading…';
    try {
      await api.store.addDoc(api.profile(), { file: pendingFile, title, desc: $('#up-desc').value.trim() });
      $('#docup').hidden = true; await loadUploaded(); renderList(); api.toast('Document uploaded');
    } catch (e) {
      const m = e.message || String(e);
      $('#up-err').textContent = /documents|relation|schema cache|bucket/i.test(m) ? 'Uploads need a one-time setup: run supabase/documents.sql in Supabase (see SETUP.md).' : m;
    }
    btn.textContent = 'Upload'; btn.disabled = !pendingFile;
  }

  /* ---------------- viewer ---------------- */
  function loadPdfJs() {
    if (pdfjs) return Promise.resolve(pdfjs);
    return new Promise((res, rej) => {
      if (window.pdfjsLib) { pdfjs = window.pdfjsLib; return res(pdfjs); }
      const s = document.createElement('script'); s.src = PDFJS + 'pdf.min.js';
      s.onload = () => { pdfjs = window.pdfjsLib; pdfjs.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; res(pdfjs); };
      s.onerror = () => rej(new Error('Could not load the PDF viewer. Check your connection and try again.')); document.head.appendChild(s);
    });
  }
  async function urlFor(d, download) {
    if (d.builtin) return d.url;
    return api.store.docUrl(d, download);
  }
  async function openDoc(id, page) {
    const d = find(id); if (!d) return;
    closeViewer(true);
    const dv = $('#docview'); dv.hidden = false; document.body.classList.add('doc-open');
    cur = { d, page: page || 1, total: d.pages || 0, zoom: 1, pdf: null, titles: {}, pages: [], obs: null, tok: Date.now() };
    kind = 'comment'; tab = 'page';
    renderShell('Loading…');
    try {
      const lib = await loadPdfJs(); const url = await urlFor(d);
      const task = lib.getDocument({ url, rangeChunkSize: 262144, disableAutoFetch: true });
      const pdf = await task.promise; if (!cur || cur.d !== d) return;
      cur.pdf = pdf; cur.total = pdf.numPages; d.pages = pdf.numPages;
      const p1 = await pdf.getPage(1); cur.ratio = p1.getViewport({ scale: 1 }).height / p1.getViewport({ scale: 1 }).width;
      buildPages(); renderShell(); goTo(cur.page, true); loadTitles(cur.tok);
    } catch (e) { if (cur && cur.d === d) renderShell(null, e.message || 'Could not open this document.'); }
  }
  function closeViewer(quiet) {
    if (cur && cur.obs) cur.obs.disconnect();
    if (cur && cur.pdf) { try { cur.pdf.destroy(); } catch (e) { /* ignore */ } }
    cur = null; $('#docview').hidden = true; $('#docview').innerHTML = ''; document.body.classList.remove('doc-open');
    if (!quiet && view === 'docs') { history.replaceState(null, '', location.pathname + location.search + '#documents'); renderList(); }
  }
  function renderShell(msg, err) {
    const d = cur.d, dv = $('#docview');
    const keepScroll = $('#dv-scroll') ? $('#dv-scroll').scrollTop : 0;
    if (!cur.pdf) {
      dv.innerHTML = `<div class="dv-top"><button class="btn ghost" data-dv="close">${sv('left')} Documents</button><strong class="dv-title">${api.esc(d.title)}</strong></div><div class="dv-msg">${err ? `<p class="bad">${api.esc(err)}</p><button class="btn ghost" data-dv="close">Back</button>` : `<div class="spin"></div><p>${api.esc(msg || 'Loading…')}</p>`}</div>`;
      return;
    }
    if (!$('#dv-scroll')) {
      dv.innerHTML = `<div class="dv-top"><button class="btn ghost" data-dv="close">${sv('left')} <span class="hide-m">Documents</span></button><strong class="dv-title">${api.esc(d.title)}</strong>
        <div class="dv-ctl"><button class="btn ghost dv-pbtn" data-dv="pages" aria-label="Pages">${sv('list')} <b id="dv-pb"></b></button><span class="dv-page" id="dv-pg"></span><button class="btn ghost icon-only" data-dv="zout" aria-label="Zoom out">${sv('minus')}</button><span class="dv-z" id="dv-z"></span><button class="btn ghost icon-only" data-dv="zin" aria-label="Zoom in">${sv('plus')}</button><button class="btn ghost icon-only hide-m" data-dv="fit" aria-label="Fit width">${sv('fit')}</button>
          <button class="btn ghost hide-m" data-dv="link" title="Copy a link to this page">${sv('link')} Link</button><button class="btn primary" data-dv="download">${sv('dl')} <span class="hide-m">Download</span></button>
          <button class="btn ghost dv-cbtn" data-dv="comments" aria-label="Comments">${sv('chat')} <b id="dv-cc"></b></button></div></div>
        <div class="dv-main"><nav class="dv-nav" id="dv-nav"><div class="lbl">Pages</div><div id="dv-list"></div></nav><div class="dv-scroll" id="dv-scroll"><div class="dv-pages" id="dv-pages"></div></div><aside class="dv-side" id="dv-side"></aside></div>`;
      mountPages();
    }
    renderNav(); renderSide(); updateTop();
    if (keepScroll && $('#dv-scroll')) $('#dv-scroll').scrollTop = keepScroll;
  }

  /* pages: lazy canvases, dropped again when far away so a 90-page PDF stays light */
  function buildPages() { cur.pages = Array.from({ length: cur.total }, (_, i) => ({ n: i + 1, el: null, canvas: null, busy: false })); }
  function pageWidth() { const box = $('#dv-scroll'); const w = box ? box.clientWidth - (innerWidth <= 800 ? 20 : 48) : 800; return Math.max(280, Math.min(w, 1500) * cur.zoom); }
  function mountPages() {
    const host = $('#dv-pages'); host.innerHTML = '';
    cur.pages.forEach((p) => {
      const el = document.createElement('div'); el.className = 'pg'; el.dataset.p = p.n; el.innerHTML = `<span class="pgn">${p.n}</span>`; host.appendChild(el); p.el = el;
    });
    sizePages();
    if (cur.obs) cur.obs.disconnect();
    cur.obs = new IntersectionObserver((es) => es.forEach((en) => { const p = cur && cur.pages[+en.target.dataset.p - 1]; if (!p) return; if (en.isIntersecting) draw(p); else drop(p); }), { root: $('#dv-scroll'), rootMargin: '900px 0px' });
    cur.pages.forEach((p) => cur.obs.observe(p.el));
    let t; $('#dv-scroll').addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(syncCurrent, 90); }, { passive: true });
  }
  function sizePages() { const w = pageWidth(); cur.w = w; cur.pages.forEach((p) => { p.el.style.width = w + 'px'; p.el.style.height = Math.round(w * (p.ratio || cur.ratio)) + 'px'; }); }
  async function draw(p) {
    if (p.canvas || p.busy || !cur) return; p.busy = true; const tok = cur.tok, w = cur.w;
    try {
      const page = await cur.pdf.getPage(p.n); const v1 = page.getViewport({ scale: 1 }); const scale = w / v1.width, dpr = Math.min(2, window.devicePixelRatio || 1);
      const vp = page.getViewport({ scale: scale * dpr }); const c = document.createElement('canvas'); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height); c.style.width = '100%'; c.style.height = '100%';
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      if (!cur || cur.tok !== tok || cur.w !== w) return;
      const r = v1.height / v1.width; if (Math.abs(r - (p.ratio || cur.ratio)) > 0.01) { p.ratio = r; p.el.style.height = Math.round(w * r) + 'px'; }
      p.el.appendChild(c); p.canvas = c; p.el.classList.add('ready');
    } catch (e) { /* page may have been dropped while rendering */ } finally { p.busy = false; }
  }
  function drop(p) { if (p.canvas) { p.canvas.remove(); p.canvas = null; p.el.classList.remove('ready'); } }
  function syncCurrent() {
    if (!cur) return; const box = $('#dv-scroll'), top = box.getBoundingClientRect().top + box.clientHeight * 0.3; let best = cur.page, bd = 1e9;
    for (const p of cur.pages) { const r = p.el.getBoundingClientRect(); if (r.bottom < top - 20) continue; const d = Math.abs(r.top - top); if (r.top <= top && r.bottom >= top) { best = p.n; break; } if (d < bd) { bd = d; best = p.n; } if (r.top > top + 400) break; }
    if (best !== cur.page) { cur.page = best; onPage(); }
  }
  function goTo(n, instant) {
    n = Math.max(1, Math.min(cur.total, n)); cur.page = n; const p = cur.pages[n - 1];
    if (p) $('#dv-scroll').scrollTo({ top: p.el.offsetTop - 12, behavior: instant ? 'auto' : 'smooth' });
    onPage();
  }
  function onPage() {
    updateTop(); highlightNav(); renderSide();
    history.replaceState(null, '', location.pathname + location.search + `#documents/${cur.d.id}/${cur.page}`);
    api.markNodeSeen(nodeId(cur.d.id, cur.page));
  }
  function updateTop() {
    const pg = $('#dv-pg'); if (!pg) return; pg.textContent = `Page ${cur.page} of ${cur.total}`; $('#dv-pb').textContent = `${cur.page}/${cur.total}`; $('#dv-z').textContent = Math.round(cur.zoom * 100) + '%';
    const n = api.S().comments.filter((c) => c.nodeId.startsWith(`doc:${cur.d.id}:`)).length; $('#dv-cc').textContent = n || '';
  }
  async function loadTitles(tok) {
    for (let i = 1; i <= cur.total; i++) {
      if (!cur || cur.tok !== tok) return;
      try {
        const page = await cur.pdf.getPage(i); const tc = await page.getTextContent(); const it = tc.items.find((x) => x.str && x.str.trim().length > 2);
        cur.titles[i] = it ? it.str.replace(/\s+/g, ' ').trim() : (i === 1 ? 'Cover' : '');
      } catch (e) { cur.titles[i] = ''; }
      if (i % 6 === 0 || i === cur.total) renderNav();
    }
  }
  function renderNav() {
    const list = $('#dv-list'); if (!list || !cur) return;
    const counts = {}; api.S().comments.forEach((c) => { const n = parseNode(c.nodeId); if (n && n.id === cur.d.id) counts[n.page] = (counts[n.page] || 0) + 1; });
    list.innerHTML = cur.pages.map((p) => `<button class="dn ${p.n === cur.page ? 'on' : ''}" data-dv="go" data-p="${p.n}"><span class="dnn">${p.n}</span><span class="dnt">${api.esc(cur.titles[p.n] || (p.n === 1 ? 'Cover' : 'Page ' + p.n))}</span>${counts[p.n] ? `<span class="dnc">${api.si('chat')}${counts[p.n]}</span>` : ''}</button>`).join('');
    const on = $('.dn.on', list); if (on) { const r = on.getBoundingClientRect(), b = list.parentElement.getBoundingClientRect(); if (r.top < b.top || r.bottom > b.bottom) on.scrollIntoView({ block: 'nearest' }); }
  }
  function highlightNav() { $$('#dv-list .dn').forEach((b) => b.classList.toggle('on', +b.dataset.p === cur.page)); const on = $('#dv-list .dn.on'); if (on) on.scrollIntoView({ block: 'nearest' }); }

  /* comments for the page in view (or the whole document) */
  function renderSide() {
    const side = $('#dv-side'); if (!side || !cur) return;
    const p = tab === 'doc' ? 0 : cur.page, nid = nodeId(cur.d.id, p), items = api.S().comments.filter((c) => c.nodeId === nid), keep = ($('#dv-text') || {}).value || '';
    const pageN = api.S().comments.filter((c) => c.nodeId === nodeId(cur.d.id, cur.page)).length, docN = api.S().comments.filter((c) => c.nodeId === nodeId(cur.d.id, 0)).length;
    const title = cur.titles[cur.page] || '';
    side.innerHTML = `<div class="dv-sh"><div class="ptabs"><button data-dv="tab" data-t="page" class="${tab === 'page' ? 'on' : ''}">Page ${cur.page}${pageN ? ` <b>${pageN}</b>` : ''}</button><button data-dv="tab" data-t="doc" class="${tab === 'doc' ? 'on' : ''}">Whole document${docN ? ` <b>${docN}</b>` : ''}</button></div><button class="btn ghost icon-only dv-x" data-dv="comments" aria-label="Close comments">${sv('x')}</button></div>
      <div class="pctx">${sv('doc')}<span>${tab === 'doc' ? 'Comments on the whole document' : api.esc(title ? `${cur.page} · ${title}` : 'Page ' + cur.page)}</span></div>
      <div class="thread">${items.map(api.msgHtml).join('') || `<div class="empty">${tab === 'doc' ? 'No comments on the whole document yet.' : 'No comments on this page yet. Say what you think, or ask the other team a question.'}</div>`}</div>
      <div class="kindseg"><button data-dv="kind" data-k="comment" class="${kind === 'comment' ? 'on' : ''}">${api.si('chat')} Comment</button><button data-dv="kind" data-k="issue" class="${kind === 'issue' ? 'on bad' : ''}">${api.si('warn')} Raise an issue</button></div>
      <textarea id="dv-text" placeholder="${kind === 'issue' ? 'Describe the issue so the other team can act on it…' : 'Write a comment on ' + (tab === 'doc' ? 'this document' : 'page ' + cur.page) + '…'}">${api.esc(keep)}</textarea>
      <div class="post-row"><span>Ctrl + Enter to send</span><button class="btn primary" data-dv="post">${kind === 'issue' ? 'Raise issue' : 'Send'}</button></div>`;
  }
  async function postDocComment() {
    const ta = $('#dv-text'); if (!ta || !cur) return; const v = ta.value.trim(); if (!v) { ta.focus(); return; }
    const nid = nodeId(cur.d.id, tab === 'doc' ? 0 : cur.page), k = kind, btn = $('[data-dv="post"]'); if (btn) btn.disabled = true;
    await api.guard(async () => { await api.store.addComment(api.profile(), { nodeId: nid, body: v, kind: k }); ta.value = ''; kind = 'comment'; await api.reload(); api.toast(k === 'issue' ? 'Issue raised' : 'Comment sent'); });
    if (cur) renderSide();
  }
  async function download(d) {
    try {
      const url = await urlFor(d, true), a = document.createElement('a'); a.href = url; a.download = d.builtin ? d.url.split('/').pop() : (d.title || 'document') + '.pdf'; document.body.appendChild(a); a.click(); a.remove();
    } catch (e) { api.toast('Could not download: ' + (e.message || e)); }
  }
  function zoom(f) { if (!cur) return; cur.zoom = Math.max(0.5, Math.min(2.5, f ? cur.zoom * f : 1)); const at = cur.page; cur.pages.forEach(drop); sizePages(); goTo(at, true); updateTop(); }

  /* ---------------- events ---------------- */
  document.addEventListener('click', (e) => {
    if (!api) return; const t = e.target; let el;
    if ((el = t.closest('#switch button'))) { setView(el.dataset.v); return; }
    if ((el = t.closest('[data-da]'))) {
      const d = find(el.dataset.id);
      if (el.dataset.da === 'open' && d) openDoc(d.id, 1);
      else if (el.dataset.da === 'download' && d) download(d);
      else if (el.dataset.da === 'upload') openUpload();
      else if (el.dataset.da === 'delete' && d && confirm(`Delete “${d.title}” for both teams? Its comments stay in the activity feed.`)) api.guard(async () => { await api.store.deleteDoc(d); await loadUploaded(); renderList(); api.toast('Document deleted'); });
      return;
    }
    if ((el = t.closest('.dcard[data-doc]')) && !t.closest('button')) { openDoc(el.dataset.doc, 1); return; }
    if ((el = t.closest('[data-dv]'))) {
      const a = el.dataset.dv;
      if (a === 'close') closeViewer(); else if (a === 'go') { goTo(+el.dataset.p); if (innerWidth <= 800) $('#docview').classList.remove('nav-open'); }
      else if (a === 'zin') zoom(1.2); else if (a === 'zout') zoom(1 / 1.2); else if (a === 'fit') zoom(0);
      else if (a === 'download') download(cur.d);
      else if (a === 'link') { const link = location.origin + location.pathname + `#documents/${cur.d.id}/${cur.page}`; (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => api.toast('Link to this page copied'), () => window.prompt('Copy this link', link)); }
      else if (a === 'comments') { $('#docview').classList.remove('nav-open'); $('#docview').classList.toggle('side-open'); }
      else if (a === 'pages') { $('#docview').classList.remove('side-open'); $('#docview').classList.toggle('nav-open'); }
      else if (a === 'tab') { tab = el.dataset.t; renderSide(); }
      else if (a === 'kind') { kind = el.dataset.k; renderSide(); const ta = $('#dv-text'); if (ta) ta.focus(); }
      else if (a === 'post') postDocComment();
      return;
    }
    if (t.closest('[data-up="close"]') || t.id === 'docup') { $('#docup').hidden = true; return; }
    if (t.closest('#up-go')) { doUpload(); return; }
  });
  document.addEventListener('change', (e) => { if (e.target.id === 'up-file') { pickFile(e.target.files[0]); e.target.value = ''; } });
  document.addEventListener('keydown', (e) => {
    if (!api) return;
    if (e.key === 'Escape' && !$('#docup').hidden) { e.stopImmediatePropagation(); $('#docup').hidden = true; return; }
    if (e.key === 'Escape' && cur) { e.stopImmediatePropagation(); if ($('#docview').classList.contains('side-open')) $('#docview').classList.remove('side-open'); else closeViewer(); return; }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.id === 'dv-text') { e.stopImmediatePropagation(); postDocComment(); return; }
    if (cur && !/^(TEXTAREA|INPUT)$/.test(e.target.tagName) && !e.ctrlKey && !e.metaKey) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goTo(cur.page + 1); } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(cur.page - 1); }
    }
  }, true);
  ['dragenter', 'dragover'].forEach((ev) => document.addEventListener(ev, (e) => { if (view === 'docs' && !cur && e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); document.body.classList.add('drop-on'); } }));
  ['dragleave', 'drop'].forEach((ev) => document.addEventListener(ev, (e) => { if (ev === 'dragleave' && e.relatedTarget) return; document.body.classList.remove('drop-on'); }));
  document.addEventListener('drop', (e) => { if (view !== 'docs' || cur || !e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); openUpload(e.dataTransfer.files[0]); });
  window.addEventListener('hashchange', () => { if (api && !cur) route(); });
  window.addEventListener('resize', () => { if (cur && cur.pdf && $('#dv-scroll')) { const w = pageWidth(); if (Math.abs(w - cur.w) > 40) { const at = cur.page; cur.pages.forEach(drop); sizePages(); goTo(at, true); } } });

  /* ---------------- public ---------------- */
  window.CalDocs = {
    async init(a) {
      api = a; $('#switch').hidden = false;
      if (window.CalTpl) CalTpl.init(api);
      await loadUploaded(); renderList(); route();
      try { api.store.subscribe(async () => { await loadUploaded(); if (view === 'docs' && !cur) renderList(); if (window.CalTpl) CalTpl.onData(); }); } catch (e) { /* ignore */ }
    },
    onData() { if (!api) return; if (view === 'docs' && !cur) renderList(); if (cur && cur.pdf) { updateTop(); renderNav(); const ta = $('#dv-text'); renderSide(); if (ta && document.activeElement !== ta) { /* keep draft */ } } },
    nodeName(id) { if (window.CalTpl && CalTpl.isNode(id)) return CalTpl.nodeName(id); const n = parseNode(id); if (!n) return id; const d = find(n.id); return d ? `${d.title} · ${n.page ? 'page ' + n.page : 'whole document'}` : id; },
    isDoc: (id) => !!parseNode(id) || !!(window.CalTpl && CalTpl.isNode(id)),
    openNode(id) { if (window.CalTpl && CalTpl.isNode(id)) { setView('tpl'); CalTpl.openNode(id); return; } const n = parseNode(id); if (!n || !find(n.id)) return; setView('docs'); openDoc(n.id, n.page || 1); if (!n.page) tab = 'doc'; }
  };
})();
