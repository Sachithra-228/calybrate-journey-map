/* Templates: one entry per redesigned page. Create it, upload the page's folder (html, css, js, images, fonts) and
   see it live, on a laptop, tablet or phone width. docs.js calls CalTpl.init(api) after sign-in and CalTpl.show() when
   the Templates tab opens.

   The page runs inside a sandboxed iframe with no access to this app: its own css and scripts are inlined and its
   images and fonts are turned into blob URLs, so relative links inside the folder keep working. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const MAX_INLINE = 12 * 1024 * 1024, MAX_FILE = 50 * 1024 * 1024, MAX_TOTAL = 150 * 1024 * 1024, MAX_FILES = 600;
  const SKIP_DIR = /^(\.git|node_modules|__MACOSX|\.vscode|\.idea)$/i, SKIP_FILE = /^(\.DS_Store|Thumbs\.db|desktop\.ini)$/i;
  const MIME = { html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', mp4: 'video/mp4', webm: 'video/webm' };
  const IC = {
    tpl: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="M13.5 17h7M17 13.5v7"/>',
    code: '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>', plus: '<path d="M12 5v14M5 12h14"/>', up: '<path d="M12 16V5M7 10l5-5 5 5M4 20h16"/>',
    left: '<path d="M15 6l-6 6 6 6"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>', full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    laptop: '<rect x="4.5" y="5" width="15" height="10" rx="1.6"/><path d="M2.5 19h19"/>', tablet: '<rect x="6" y="3.5" width="12" height="17" rx="2"/><path d="M11 17.5h2"/>', phone: '<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M11 18h2"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.3A8 8 0 1 1 21 12z"/>', warn: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>',
    dl: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'
  };
  const sv = (k, c) => `<svg class="${c || 'si'}" viewBox="0 0 24 24">${IC[k]}</svg>`;
  const DEVICES = [['laptop', 'Laptop', 0], ['tablet', 'Tablet', 820], ['phone', 'Phone', 390]];
  const SUGGEST = ['Landing page', 'Dashboard', 'System admin'];

  let api = null, list = [], loaded = null, cur = null, device = 'laptop', busy = false, ckind = 'comment', cscope = 'page';
  const mb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const extOf = (p) => (p.split('.').pop() || '').toLowerCase();
  const mimeOf = (p, b) => MIME[extOf(p)] || (b && b.type) || 'application/octet-stream';
  const totalSize = (t) => (t.files || []).reduce((a, f) => a + (f.size || 0), 0);
  const isHtml = (p) => /\.html?$/i.test(p);
  const nodeId = (id, page) => `tpl:${id}:${page || '*'}`;
  const parseNode = (nid) => { const m = /^tpl:([^:]+):(.+)$/.exec(nid || ''); return m ? { id: m[1], page: m[2] === '*' ? '' : m[2] } : null; };
  const comments = (nid) => api.S().comments.filter((c) => c.nodeId === nid);
  const countFor = (id) => api.S().comments.filter((c) => c.nodeId.startsWith(`tpl:${id}:`)).length;

  /* ---------------- paths ---------------- */
  const norm = (p) => { const out = []; p.split('/').forEach((s) => { if (!s || s === '.') return; if (s === '..') out.pop(); else out.push(s); }); return out.join('/'); };
  const dirOf = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '');
  const external = (r) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test((r || '').trim());
  function resolvePath(base, ref) {
    let r = String(ref).trim().split('#')[0].split('?')[0]; if (!r) return null;
    try { r = decodeURIComponent(r); } catch (e) { /* keep as is */ }
    const d = dirOf(base);
    return norm(r.startsWith('/') ? r : (d ? d + '/' + r : r));
  }
  function pickEntry(paths) {
    const h = paths.filter(isHtml).sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
    return h.find((p) => /^index\.html?$/i.test(p)) || h.find((p) => /(^|\/)index\.html?$/i.test(p)) || h[0] || '';
  }

  /* ---------------- build a self-contained page from the folder ---------------- */
  async function makeCtx(files) {
    const lower = new Map(), text = new Map(), urls = new Map();
    files.forEach((b, p) => lower.set(p.toLowerCase(), p));
    const isText = (p) => /\.(css|js|mjs|html?)$/i.test(p);
    await Promise.all([...files].map(async ([p, b]) => {
      if (isText(p)) text.set(p, await b.text());
      else if (b.size <= MAX_INLINE) urls.set(p, await toDataUrl(new Blob([b], { type: mimeOf(p, b) })));
    }));
    return { files, text, urls, get: (p) => (p ? (files.has(p) ? p : lower.get(p.toLowerCase())) : undefined) };
  }
  /* the page runs in a sandboxed frame that cannot load blob: URLs from this app, so images and fonts go in as data: URLs */
  const toDataUrl = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(''); r.readAsDataURL(blob); });
  function blobUrl(ctx, p) { return ctx.urls.get(p) || ''; }
  function revoke(ctx) { if (ctx) ctx.urls.clear(); }
  function rewriteCss(ctx, t, base, depth) {
    t = t.replace(/@import\s+(?:url\(\s*)?['"]?([^'")\s;]+)['"]?\s*\)?[^;]*;/gi, (m, u) => {
      if (external(u)) return m;
      const rp = ctx.get(resolvePath(base, u));
      return rp && depth < 5 && ctx.text.has(rp) ? rewriteCss(ctx, ctx.text.get(rp), rp, depth + 1) : m;
    });
    return t.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, u) => {
      if (external(u)) return m;
      const rp = ctx.get(resolvePath(base, u));
      return rp && blobUrl(ctx, rp) ? `url("${blobUrl(ctx, rp)}")` : m;
    });
  }
  function buildPage(ctx, entry) {
    const doc = new DOMParser().parseFromString(ctx.text.get(entry) || '', 'text/html');
    const local = (el, attr) => { const v = el.getAttribute(attr); return v && !external(v) ? ctx.get(resolvePath(entry, v)) : undefined; };
    $$('link[rel~="stylesheet" i][href]', doc).forEach((l) => {
      const rp = local(l, 'href');
      if (rp && ctx.text.has(rp)) { const s = doc.createElement('style'); s.textContent = rewriteCss(ctx, ctx.text.get(rp), rp, 0); l.replaceWith(s); }
    });
    $$('link[href]', doc).forEach((l) => { const rp = local(l, 'href'); if (rp && blobUrl(ctx, rp)) l.setAttribute('href', blobUrl(ctx, rp)); });
    $$('script[src]', doc).forEach((s) => {
      const rp = local(s, 'src'); if (!rp || !ctx.text.has(rp)) return;
      const n = doc.createElement('script'); [...s.attributes].forEach((a) => { if (a.name !== 'src') n.setAttribute(a.name, a.value); });
      n.textContent = ctx.text.get(rp).replace(/<\/script/gi, '<\\/script'); s.replaceWith(n);
    });
    $$('style', doc).forEach((s) => { s.textContent = rewriteCss(ctx, s.textContent, entry, 0); });
    $$('[style]', doc).forEach((e) => e.setAttribute('style', rewriteCss(ctx, e.getAttribute('style'), entry, 0)));
    $$('[src],[poster]', doc).forEach((e) => {
      if (e.tagName === 'SCRIPT') return;
      ['src', 'poster'].forEach((a) => { if (e.hasAttribute(a)) { const rp = local(e, a); if (rp && blobUrl(ctx, rp)) e.setAttribute(a, blobUrl(ctx, rp)); } });
    });
    $$('[srcset]', doc).forEach((e) => {
      e.setAttribute('srcset', e.getAttribute('srcset').split(',').map((part) => {
        const [u, ...r] = part.trim().split(/\s+/); const rp = u && !external(u) ? ctx.get(resolvePath(entry, u)) : null;
        return ((rp && blobUrl(ctx, rp)) || u) + (r.length ? ' ' + r.join(' ') : '');
      }).join(', '));
    });
    $$('a[href]', doc).forEach((a) => {
      const v = a.getAttribute('href');
      if (external(v)) { if (/^(https?:)?\/\//i.test(v)) a.setAttribute('target', '_blank'); return; }
      const rp = ctx.get(resolvePath(entry, v));
      if (rp && isHtml(rp)) { a.setAttribute('data-tpl-go', rp); a.setAttribute('href', '#'); }
    });
    const hook = doc.createElement('script');
    hook.textContent = "document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-tpl-go]');if(a){e.preventDefault();parent.postMessage({tplGo:a.getAttribute('data-tpl-go')},'*');}},true);";
    (doc.body || doc.documentElement).appendChild(hook);
    return '<!doctype html>\n' + doc.documentElement.outerHTML;
  }

  /* ---------------- reading what the person picked or dropped ---------------- */
  async function readDropped(items) {
    const entries = [...items].map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null)).filter(Boolean), out = [];
    async function walk(en, pre) {
      if (en.isFile) { const f = await new Promise((res, rej) => en.file(res, rej)); out.push({ path: pre + en.name, file: f }); return; }
      if (!en.isDirectory || SKIP_DIR.test(en.name)) return;
      const rd = en.createReader(); let batch;
      do { batch = await new Promise((res, rej) => rd.readEntries(res, rej)); for (const c of batch) await walk(c, pre + en.name + '/'); } while (batch.length);
    }
    for (const en of entries) await walk(en, '');
    return out;
  }
  const fromInput = (fl) => [...fl].map((f) => ({ path: f.webkitRelativePath || f.name, file: f }));
  function clean(items) {
    let rows = items.filter((i) => !SKIP_FILE.test(i.path.split('/').pop()) && !i.path.split('/').some((s, k, a) => k < a.length - 1 && SKIP_DIR.test(s)));
    if (rows.length && rows.every((r) => r.path.includes('/'))) {
      const top = rows[0].path.split('/')[0];
      if (rows.every((r) => r.path.split('/')[0] === top)) rows = rows.map((r) => ({ ...r, path: r.path.slice(top.length + 1) }));
    }
    return rows.map((r) => ({ ...r, path: norm(r.path) })).filter((r) => r.path);
  }
  function check(rows) {
    if (!rows.length) return 'No files found. Choose the folder that holds your page.';
    if (!rows.some((r) => isHtml(r.path))) return 'There is no .html file in that selection. Choose the folder with your index.html in it.';
    if (rows.length > MAX_FILES) return `That folder has ${rows.length} files; the limit is ${MAX_FILES}. Leave out build output or unused assets.`;
    const big = rows.find((r) => r.file.size > MAX_FILE); if (big) return `${big.path} is over 50 MB. Compress it first.`;
    if (rows.reduce((a, r) => a + r.file.size, 0) > MAX_TOTAL) return 'The folder is over 150 MB in total. Compress the images first.';
    return '';
  }

  /* ---------------- download as a zip (no library: files are stored, not compressed) ---------------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  async function makeZip(files, root) {
    const enc = new TextEncoder(), parts = [], central = []; let offset = 0, count = 0;
    for (const [path, blob] of files) {
      const data = new Uint8Array(await blob.arrayBuffer()), name = enc.encode((root ? root + '/' : '') + path), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 33, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(lh, name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, 33, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
      central.push(ch, name); offset += 30 + name.length + data.length; count++;
    }
    const csize = central.reduce((a, p) => a + (p.byteLength !== undefined ? p.byteLength : p.length), 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, count, true); end.setUint16(10, count, true); end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }
  const slug = (s) => String(s || 'template').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'template';
  async function downloadTpl(id) {
    const t = list.find((x) => x.id === id); if (!t || !(t.files || []).length) { api.toast('Nothing to download yet. Upload the folder first.'); return; }
    api.toast('Preparing the zip…');
    try {
      const files = cur && cur.t.id === id && cur.ctx ? cur.ctx.files : await api.store.tplFiles(t);
      const blob = await makeZip(files, slug(t.title)), url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = slug(t.title) + '.zip'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
      api.toast(`Downloaded ${slug(t.title)}.zip (${files.size} files)`);
    } catch (e) { api.toast('Could not download: ' + (e.message || e)); }
  }

  /* ---------------- card thumbnails: a tiny live render of the first page ---------------- */
  const thumbCache = {};
  let thumbIO = null;
  const thumbKey = (t) => `${t.id}:${t.entry}:${(t.files || []).length}:${totalSize(t)}`;
  function showThumb(el, html) {
    const f = document.createElement('iframe'); f.className = 'tt-frame'; f.setAttribute('sandbox', 'allow-scripts'); f.name = 'cal-thumb'; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true'); f.setAttribute('loading', 'lazy');
    f.srcdoc = html; el.appendChild(f); el.classList.add('has-img'); fitThumb(el);
  }
  function fitThumb(el) { const f = $('.tt-frame', el); if (f) f.style.transform = `scale(${(el.clientWidth || 360) / 1280})`; }
  async function drawThumb(el) {
    const t = list.find((x) => x.id === el.dataset.tid); if (!t || !(t.files || []).length) return;
    const key = thumbKey(t);
    try {
      if (!thumbCache[key]) {
        const files = await api.store.tplFiles(t), ctx = await makeCtx(files), entry = ctx.get(t.entry) || pickEntry([...files.keys()]);
        thumbCache[key] = buildPage(ctx, entry);
      }
      showThumb(el, thumbCache[key]);
    } catch (e) { /* keep the icon */ }
  }
  function thumbs() {
    if (thumbIO) thumbIO.disconnect();
    thumbIO = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { thumbIO.unobserve(en.target); drawThumb(en.target); } }), { rootMargin: '150px' });
    $$('#tpl-view .tthumb[data-tid]').forEach((el) => { const t = list.find((x) => x.id === el.dataset.tid); if (t && thumbCache[thumbKey(t)]) showThumb(el, thumbCache[thumbKey(t)]); else thumbIO.observe(el); });
  }
  window.addEventListener('resize', () => $$('#tpl-view .tthumb.has-img').forEach(fitThumb));

  /* ---------------- list ---------------- */
  const canDelete = (t) => api.profile() && t.uploaderId === api.profile().id;
  function card(t) {
    const n = (t.files || []).length;
    return `<article class="dcard tcard" data-tpl="${api.esc(t.id)}">
      <div class="dthumb tthumb" data-tid="${api.esc(t.id)}"><span class="dpdf">${sv(n ? 'code' : 'folder', 'dsvg')}<b>${n ? 'HTML' : 'EMPTY'}</b></span></div>
      <div class="dbody"><h3>${api.esc(t.title)}</h3><p>${api.esc(t.desc || (n ? 'Open the live preview.' : 'No files yet. Upload the page folder to see it live.'))}</p>
        <div class="dmeta">${n ? `<span>${n} file${n > 1 ? 's' : ''}</span><span>${mb(totalSize(t))}</span>` : '<span>Waiting for upload</span>'}${countFor(t.id) ? `<span>${countFor(t.id)} comment${countFor(t.id) > 1 ? 's' : ''}</span>` : ''}<span>${api.teamBadge(t.team)} ${api.esc(t.name || '')} · ${api.ago(t.ts)}</span></div>
        <div class="dact"><button class="btn primary" data-tp="open" data-id="${api.esc(t.id)}">${sv(n ? 'eye' : 'up')} ${n ? 'Live preview' : 'Upload files'}</button>${n ? `<button class="btn ghost" data-tp="dl" data-id="${api.esc(t.id)}">${sv('dl')} Download</button>` : ''}${canDelete(t) ? `<button class="btn ghost icon-only danger-t" data-tp="delete" data-id="${api.esc(t.id)}" title="Delete this template" aria-label="Delete">${sv('trash')}</button>` : ''}</div></div></article>`;
  }
  function renderList() {
    const v = $('#tpl-view'); v.classList.remove('tdetail'); v.scrollTop = 0;
    v.innerHTML = `<div class="vhead"><div><h1>Templates</h1><p>One template per redesigned page. Create it, upload its HTML and CSS folder, and see it live on laptop, tablet and phone.</p></div>
      <div class="vact"><button class="btn primary" data-tp="new">${sv('plus')} New template</button></div></div>
      <div class="dgrid">${list.map(card).join('')}
        <button class="dcard dadd" data-tp="new"><span class="dplus">${sv('plus', 'dsvg')}</span><b>New template</b><small>${list.length ? 'for another page' : 'start with the landing page'}</small></button></div>`;
    thumbs();
  }
  async function refresh() {
    try { list = await api.store.listTpls(); } catch (e) { list = []; }
    if (!cur && $('#tpl-view') && !$('#tpl-view').hidden) renderList();
  }

  /* ---------------- create dialog ---------------- */
  function dialog() {
    let d = $('#tpldlg'); if (d) return d;
    d = document.createElement('section'); d.className = 'docup'; d.id = 'tpldlg'; d.hidden = true;
    d.innerHTML = `<div class="docup-card" role="dialog" aria-modal="true" aria-labelledby="tn-h">
      <div class="up-head"><h2 id="tn-h">New template</h2><button class="btn ghost icon-only" data-tp="dclose" aria-label="Close">${sv('x')}</button></div>
      <label class="up-f">Page name<input id="tn-title" type="text" maxlength="200" placeholder="e.g. Landing page"></label>
      <div class="tchips" id="tn-chips">${SUGGEST.map((s) => `<button type="button" class="chip" data-tp="chip">${s}</button>`).join('')}</div>
      <label class="up-f">Description <span>(optional)</span><textarea id="tn-desc" maxlength="400" placeholder="What does this page template cover?"></textarea></label>
      <p class="login-err" id="tn-err" role="alert"></p>
      <div class="up-row"><button class="btn ghost" data-tp="dclose">Cancel</button><button class="btn primary" data-tp="create" id="tn-go">Create and upload files</button></div></div>`;
    document.body.appendChild(d); return d;
  }
  function openNew() { const d = dialog(); $('#tn-title').value = list.length ? '' : 'Landing page'; $('#tn-desc').value = ''; $('#tn-err').textContent = ''; d.hidden = false; setTimeout(() => $('#tn-title').focus(), 30); }
  async function create() {
    const title = $('#tn-title').value.trim(), err = $('#tn-err'), btn = $('#tn-go');
    if (!title) { err.textContent = 'Give the template a name, for example “Landing page”.'; return; }
    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      const id = await api.store.createTpl(api.profile(), { title, desc: $('#tn-desc').value.trim() });
      $('#tpldlg').hidden = true; await refresh(); await open(id); api.toast('Template created. Now upload the page folder.');
    } catch (e) {
      const m = e.message || String(e);
      err.textContent = /templates|relation|schema cache|bucket/i.test(m) ? 'Templates need a one-time setup: run supabase/templates.sql in Supabase (see SETUP.md).' : m;
    }
    btn.disabled = false; btn.textContent = 'Create and upload files';
  }

  /* ---------------- detail: upload + live preview ---------------- */
  function setHash(id) { const h = id ? '#templates/' + id : '#templates'; if (location.hash !== h) history.replaceState(null, '', location.pathname + location.search + h); }
  async function open(id) {
    if (loaded) await loaded;
    const t = list.find((x) => x.id === id); if (!t) { show(); return; }
    close(true); cur = { t, ctx: null, entry: t.entry || '', tok: Date.now() };
    setHash(id); shell('Loading preview…');
    if (!(t.files || []).length) { shell(); return; }
    try {
      const files = await api.store.tplFiles(t); if (!cur || cur.t !== t) return;
      cur.ctx = await makeCtx(files);
      if (!cur.ctx.get(cur.entry)) cur.entry = pickEntry([...files.keys()]);
      shell(); paint();
    } catch (e) { if (cur && cur.t === t) shell(null, e.message || 'Could not load the files.'); }
  }
  function close(quiet) {
    if (cur) revoke(cur.ctx);
    cur = null;
    if (!quiet) { setHash(''); renderList(); }
  }
  function htmlPages() { return cur && cur.ctx ? [...cur.ctx.files.keys()].filter(isHtml).sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b)) : []; }
  function uploadZone(has) {
    return `<label class="tp-drop" id="tp-drop" for="tp-folder">${sv('folder', 'dsvg')}<b>${has ? 'Replace the page folder' : 'Drop your page folder here'}</b>
      <small>or <u>choose a folder</u> with your index.html, css, js and images. ${has ? '' : 'You can also drop several files at once.'}</small></label>`;
  }
  function shell(msg, err) {
    const v = $('#tpl-view'), t = cur.t, has = (t.files || []).length;
    v.classList.add('tdetail');
    const top = `<div class="tp-bar"><button class="btn ghost" data-tp="back">${sv('left')} Templates</button><div class="tp-title"><strong>${api.esc(t.title)}</strong>
      <small>${has ? `${t.files.length} file${t.files.length > 1 ? 's' : ''} · ${mb(totalSize(t))} · ${api.teamBadge(t.team)} ${api.esc(t.name || '')} · ${api.ago(t.ts)}` : 'No files yet'}</small></div></div>`;
    if (msg || err || !has) {
      v.innerHTML = top + '<div class="tp-body">' + (err ? `<p class="bad">${api.esc(err)}</p>` : msg ? `<div class="spin"></div><p>${api.esc(msg)}</p>` :
        `<div class="tp-empty">${uploadZone(false)}<div class="tp-or"><label class="btn ghost" for="tp-folder">${sv('folder')} Choose folder</label><label class="btn ghost" for="tp-files">${sv('up')} Choose files</label></div><p class="login-err" id="tp-err" role="alert"></p>
        <p class="tp-note">The page runs in an isolated frame, so its own scripts work but it cannot reach this app. Links between the pages in the folder work too.</p></div>`) + '</div>';
      return;
    }
    const pages = htmlPages();
    v.innerHTML = top + `<div class="tp-tools">
        <div class="kindseg tp-dev" role="group" aria-label="Preview size">${DEVICES.map(([k, n]) => `<button class="${device === k ? 'on' : ''}" data-tp="dev" data-d="${k}" title="${n}">${sv(k)}<span>${n}</span></button>`).join('')}</div>
        ${pages.length > 1 ? `<select id="tp-page" aria-label="Page">${pages.map((p) => `<option value="${api.esc(p)}"${p === cur.entry ? ' selected' : ''}>${api.esc(p)}</option>`).join('')}</select>` : `<span class="tp-file">${api.esc(cur.entry)}</span>`}
        <button class="btn ghost" data-tp="reload">${sv('refresh')}<span class="hide-m">Reload</span></button>
        <button class="btn ghost" data-tp="full">${sv('full')}<span class="hide-m">Full screen</span></button>
        <button class="btn ghost" data-tp="dl" data-id="${api.esc(t.id)}">${sv('dl')}<span class="hide-m">Download</span></button>
        <button class="btn ghost" data-tp="cside" id="tp-cbtn">${sv('chat')}<span>Comments</span><b class="tp-cn" id="tp-cn" hidden></b></button>
        <label class="btn ghost" for="tp-folder" title="Upload a new version of the folder">${sv('up')}<span>Replace folder</span></label></div>
      <p class="login-err tp-err" id="tp-err" role="alert"></p>
      <div class="tp-main"><div class="tp-stage" id="tp-stage"><iframe id="tp-frame" class="tp-frame" title="Live preview of ${api.esc(t.title)}" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"></iframe></div><aside class="tp-side${cur.side ? ' open' : ''}" id="tp-side"></aside></div>`;
    sizeFrame(); renderSide();
  }
  function sizeFrame() {
    const f = $('#tp-frame'); if (!f) return;
    const w = (DEVICES.find((d) => d[0] === device) || [])[2];
    f.style.width = w ? w + 'px' : '100%'; f.classList.toggle('framed', !!w);
  }
  function paint() {
    const f = $('#tp-frame'); if (!f || !cur || !cur.ctx) return;
    try { f.srcdoc = buildPage(cur.ctx, cur.entry); } catch (e) { shell(null, 'Could not build the preview: ' + (e.message || e)); }
  }
  /* comments on the page being previewed, or on the whole template */
  function renderSide() {
    const side = $('#tp-side'); if (!side || !cur) return;
    const page = cscope === 'all' ? '' : cur.entry, nid = nodeId(cur.t.id, page), items = comments(nid), keep = ($('#tp-text') || {}).value || '';
    const nPage = comments(nodeId(cur.t.id, cur.entry)).length, nAll = comments(nodeId(cur.t.id, '')).length;
    const cn = $('#tp-cn'); if (cn) { const n = countFor(cur.t.id); cn.textContent = n || ''; cn.hidden = !n; }
    side.innerHTML = `<div class="tp-sh"><div class="tp-tabs"><button data-tp="cscope" data-s="page" class="${cscope === 'page' ? 'on' : ''}">This page${nPage ? ` <b>${nPage}</b>` : ''}</button><button data-tp="cscope" data-s="all" class="${cscope === 'all' ? 'on' : ''}">Whole template${nAll ? ` <b>${nAll}</b>` : ''}</button></div><button class="btn ghost icon-only tp-x" data-tp="cside" aria-label="Close comments">${sv('x')}</button></div>
      <div class="tp-ctx">${sv('chat')}<span>${cscope === 'all' ? 'Comments on the whole template' : api.esc(cur.entry)}</span></div>
      <div class="thread">${items.map(api.msgHtml).join('') || `<div class="empty">${cscope === 'all' ? 'No comments on the whole template yet.' : 'No comments on this page yet. Say what you think, or ask the other team a question.'}</div>`}</div>
      <div class="kindseg"><button data-tp="ckind" data-k="comment" class="${ckind === 'comment' ? 'on' : ''}">${api.si('chat')} Comment</button><button data-tp="ckind" data-k="issue" class="${ckind === 'issue' ? 'on bad' : ''}">${api.si('warn')} Raise an issue</button></div>
      <textarea id="tp-text" placeholder="${ckind === 'issue' ? 'Describe the issue so the other team can act on it...' : 'Write a comment on ' + (cscope === 'all' ? 'this template' : api.esc(cur.entry)) + '...'}">${api.esc(keep)}</textarea>
      <div class="post-row"><span>Ctrl + Enter to send</span><button class="btn primary" data-tp="cpost">${ckind === 'issue' ? 'Raise issue' : 'Send'}</button></div>`;
    api.markNodeSeen(nid);
  }
  async function postComment() {
    const ta = $('#tp-text'); if (!ta || !cur) return; const v = ta.value.trim(); if (!v) { ta.focus(); return; }
    const nid = nodeId(cur.t.id, cscope === 'all' ? '' : cur.entry), k = ckind, btn = $('[data-tp="cpost"]'); if (btn) btn.disabled = true;
    await api.guard(async () => { await api.store.addComment(api.profile(), { nodeId: nid, body: v, kind: k }); ta.value = ''; ckind = 'comment'; await api.reload(); api.toast(k === 'issue' ? 'Issue raised' : 'Comment sent'); });
    if (cur) renderSide();
  }

  async function upload(items) {
    if (!cur || busy) return;
    const rows = clean(items), msg = check(rows), err = $('#tp-err');
    if (msg) { if (err) err.textContent = msg; else api.toast(msg); return; }
    busy = true; const t = cur.t;
    shell(`Uploading ${rows.length} file${rows.length > 1 ? 's' : ''} (${mb(rows.reduce((a, r) => a + r.file.size, 0))})…`);
    try {
      const entry = pickEntry(rows.map((r) => r.path));
      await api.store.setTplFiles(api.profile(), t, { files: rows, entry });
      await refresh(); busy = false; await open(t.id); api.toast('Uploaded. Live preview ready.');
    } catch (e) {
      busy = false; const m = e.message || String(e);
      await open(t.id); const er = $('#tp-err');
      if (er) er.textContent = /templates|relation|schema cache|bucket/i.test(m) ? 'Templates need a one-time setup: run supabase/templates.sql in Supabase (see SETUP.md).' : m;
    }
  }
  async function remove(id) {
    const t = list.find((x) => x.id === id); if (!t) return;
    if (!window.confirm(`Delete “${t.title}” and its ${(t.files || []).length} uploaded file(s)? This cannot be undone.`)) return;
    try { await api.store.deleteTpl(t); await refresh(); if (cur) close(); else renderList(); api.toast('Template deleted'); } catch (e) { api.toast(e.message || 'Could not delete'); }
  }

  /* ---------------- events ---------------- */
  document.addEventListener('click', (e) => {
    if (!api) return;
    const t = e.target, b = t.closest('[data-tp]');
    if (t.id === 'tpldlg') { $('#tpldlg').hidden = true; return; }
    if (!b) { const c = t.closest('.tcard'); if (c && !t.closest('button')) open(c.dataset.tpl); return; }
    const a = b.dataset.tp;
    if (a === 'new') openNew(); else if (a === 'dclose') $('#tpldlg').hidden = true; else if (a === 'create') create();
    else if (a === 'chip') { $('#tn-title').value = b.textContent; $('#tn-title').focus(); }
    else if (a === 'open') open(b.dataset.id); else if (a === 'delete') remove(b.dataset.id);
    else if (a === 'back') close();
    else if (a === 'dev') { device = b.dataset.d; $$('.tp-dev button').forEach((x) => x.classList.toggle('on', x.dataset.d === device)); sizeFrame(); }
    else if (a === 'reload') paint();
    else if (a === 'dl') downloadTpl(b.dataset.id);
    else if (a === 'cside') { cur.side = !cur.side; const sd = $('#tp-side'); if (sd) sd.classList.toggle('open', cur.side); }
    else if (a === 'cscope') { cscope = b.dataset.s; renderSide(); }
    else if (a === 'ckind') { ckind = b.dataset.k; renderSide(); const ta = $('#tp-text'); if (ta) ta.focus(); }
    else if (a === 'cpost') postComment();
    else if (a === 'full') { const f = $('#tp-frame'); if (f && f.requestFullscreen) f.requestFullscreen().catch(() => {}); }
  });
  document.addEventListener('change', (e) => {
    if (!api) return;
    if (e.target.id === 'tp-folder' || e.target.id === 'tp-files') { const items = fromInput(e.target.files); e.target.value = ''; upload(items); }
    else if (e.target.id === 'tp-page' && cur) { cur.entry = e.target.value; paint(); renderSide(); }
  });
  window.addEventListener('message', (e) => {
    const f = $('#tp-frame');
    if (!f || e.source !== f.contentWindow || !e.data || typeof e.data.tplGo !== 'string' || !cur || !cur.ctx) return;
    const rp = cur.ctx.get(e.data.tplGo); if (!rp) return;
    cur.entry = rp; const s = $('#tp-page'); if (s) s.value = rp; paint(); renderSide();
  });
  document.addEventListener('keydown', (e) => {
    if (!api || e.key !== 'Escape' || $('#tpl-view').hidden) return;
    if (!$('#tpldlg').hidden) { e.stopImmediatePropagation(); $('#tpldlg').hidden = true; return; }
    if (cur) { e.stopImmediatePropagation(); close(); }
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'tn-title') { e.preventDefault(); create(); }
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.id === 'tp-text') { e.preventDefault(); postComment(); }
  });
  ['dragenter', 'dragover'].forEach((ev) => document.addEventListener(ev, (e) => {
    const z = $('#tp-drop'); if (!api || !z || !cur || $('#tpl-view').hidden || !e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault(); z.classList.add('over');
  }));
  document.addEventListener('dragleave', (e) => { const z = $('#tp-drop'); if (z && !e.relatedTarget) z.classList.remove('over'); });
  document.addEventListener('drop', async (e) => {
    const z = $('#tp-drop'); if (z) z.classList.remove('over');
    if (!api || !cur || $('#tpl-view').hidden || !e.dataTransfer || !e.dataTransfer.items || !e.dataTransfer.items.length) return;
    e.preventDefault(); upload(await readDropped(e.dataTransfer.items));
  });

  /* ---------------- public ---------------- */
  function show() { if (!api) return; cur && revoke(cur.ctx); cur = null; $('#tpl-view').classList.remove('tdetail'); renderList(); refresh(); }
  window.CalTpl = {
    init(a) {
      api = a; dialog();
      if (!$('#tp-folder')) {
        const i = document.createElement('input'); i.type = 'file'; i.id = 'tp-folder'; i.hidden = true; i.multiple = true; i.setAttribute('webkitdirectory', ''); document.body.appendChild(i);
        const j = document.createElement('input'); j.type = 'file'; j.id = 'tp-files'; j.hidden = true; j.multiple = true; j.accept = '.html,.htm,.css,.js,.json,.svg,.png,.jpg,.jpeg,.gif,.webp,.avif,.ico,.woff,.woff2,.ttf,.otf'; document.body.appendChild(j);
      }
      loaded = refresh();
    },
    show, open, hide() { if (cur) { revoke(cur.ctx); cur = null; } const d = $('#tpldlg'); if (d) d.hidden = true; },
    onData() { if (!api) return; if (cur) renderSide(); refresh(); },
    isNode: (id) => !!parseNode(id),
    nodeName(id) { const n = parseNode(id), t = n && list.find((x) => x.id === n.id); return t ? `${t.title} · ${n.page || 'whole template'}` : id; },
    async openNode(id) {
      const n = parseNode(id); if (!n) return; await open(n.id); if (!cur) return;
      if (n.page && cur.ctx && cur.ctx.get(n.page)) { cur.entry = n.page; cscope = 'page'; paint(); const s = $('#tp-page'); if (s) s.value = n.page; } else cscope = 'all';
      cur.side = true; const sd = $('#tp-side'); if (sd) sd.classList.add('open'); renderSide();
    }
  };
})();
