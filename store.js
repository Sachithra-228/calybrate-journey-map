/* Data layer. Two interchangeable stores with the same methods:
   - local   : demo mode, everything lives in this browser (no server needed)
   - supabase: real shared mode (login, comments, uploads shared between Sandbox and Liveroom)
   All methods are async. Shapes returned by loadAll():
     steps:       { nodeId: { status, ts, by } }
     comments:    [{ id, nodeId, attachmentId, body, kind('comment'|'issue'), resolved, team, name, authorId, ts }]
     attachments: [{ id, nodeId, caption, team, name, uploaderId, ts, path | url }]
     events:      [{ id, nodeId, type('status'|'bulk'|'upload'), from, to, n, team, name, ts }]  (oldest first) */
(function () {
  'use strict';
  const CFG = window.CALYBRATE_CONFIG || {};
  const TEAMS = { sandbox: 'Sandbox', liveroom: 'Liveroom' };
  const uid = () => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now() + Math.random().toString(16).slice(2));
  const toTs = (v) => new Date(v).getTime();

  function idbTx(mode, fn, store) {
    store = store || 'docs';
    return new Promise((res, rej) => {
      const open = indexedDB.open('calybrate-docs', 2);
      open.onupgradeneeded = () => { ['docs', 'tpls'].forEach((n) => { if (!open.result.objectStoreNames.contains(n)) open.result.createObjectStore(n, { keyPath: 'id' }); }); };
      open.onerror = () => rej(open.error);
      open.onsuccess = () => {
        const t = open.result.transaction(store, mode); let rq;
        try { rq = fn(t.objectStore(store)); } catch (e) { rej(e); return; }
        t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
      };
    });
  }

  const MIME = { html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', mp4: 'video/mp4', webm: 'video/webm', txt: 'text/plain', xml: 'application/xml' };
  const mimeOf = (path, file) => (file && file.type) || MIME[(path.split('.').pop() || '').toLowerCase()] || 'application/octet-stream';

  /* ---------------- local demo store ---------------- */
  function localStore() {
    const KEY = 'calybrate-journey-v2';
    const empty = () => ({ session: null, steps: {}, comments: [], attachments: [], events: [] });
    const read = () => { try { return Object.assign(empty(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return empty(); } };
    const write = (d) => { localStorage.setItem(KEY, JSON.stringify(d)); };
    const dataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
    return {
      mode: 'demo',
      async init() { return read().session; },
      async login({ team }) {
        const d = read(); d.session = { id: 'demo-' + team, team, name: TEAMS[team] + ' team' }; write(d); return d.session;
      },
      async logout() { const d = read(); d.session = null; write(d); },
      async loadAll() { const d = read(); return { steps: d.steps, comments: d.comments, attachments: d.attachments, events: d.events }; },
      async setStatus(p, id, status) { const d = read(); d.steps[id] = { status, ts: Date.now(), by: p.name }; write(d); },
      async addEvent(p, ev) { const d = read(); d.events.push({ id: uid(), ts: Date.now(), team: p.team, name: p.name, ...ev }); write(d); },
      async addComment(p, c) {
        const d = read();
        d.comments.push({ id: uid(), nodeId: c.nodeId, attachmentId: c.attachmentId || null, body: c.body, kind: c.kind || 'comment', resolved: false, team: p.team, name: p.name, authorId: p.id, ts: Date.now() });
        write(d);
      },
      async setResolved(id, v) { const d = read(); const c = d.comments.find((x) => x.id === id); if (c) c.resolved = v; write(d); },
      async deleteComment(id) { const d = read(); d.comments = d.comments.filter((x) => x.id !== id); write(d); },
      async addAttachment(p, { nodeId, blob, caption }) {
        const d = read(); const url = await dataUrl(blob);
        d.attachments.push({ id: uid(), nodeId, caption: caption || '', team: p.team, name: p.name, uploaderId: p.id, ts: Date.now(), url });
        try { write(d); } catch (e) { throw new Error('Demo storage is full. Connect the shared backend (SETUP.md) for real uploads.'); }
      },
      async deleteAttachment(a) {
        const d = read(); d.attachments = d.attachments.filter((x) => x.id !== a.id); d.comments = d.comments.filter((c) => c.attachmentId !== a.id); write(d);
      },
      async attachmentUrl(a) { return a.url; },
      /* uploaded documents (PDF) live in IndexedDB in demo mode: localStorage is far too small for them */
      async listDocs() { const all = (await idbTx('readonly', (s) => s.getAll())) || []; return all.map((d) => ({ id: d.id, title: d.title, desc: d.desc, size: d.size, team: d.team, name: d.name, uploaderId: d.uploaderId, ts: d.ts })); },
      async addDoc(p, { file, title, desc }) { const id = uid(); await idbTx('readwrite', (s) => s.put({ id, title, desc: desc || '', size: file.size, team: p.team, name: p.name, uploaderId: p.id, ts: Date.now(), blob: file })); return id; },
      async deleteDoc(d) { await idbTx('readwrite', (s) => s.delete(d.id)); },
      async docUrl(d) { const r = await idbTx('readonly', (s) => s.get(d.id)); if (!r) throw new Error('Document not found'); return URL.createObjectURL(r.blob); },
      /* page templates (a folder of html / css / js / images) */
      async listTpls() { const all = (await idbTx('readonly', (s) => s.getAll(), 'tpls')) || []; return all.map((t) => ({ id: t.id, title: t.title, desc: t.desc, entry: t.entry, files: (t.files || []).map((f) => ({ path: f.path, size: f.size })), team: t.team, name: t.name, uploaderId: t.uploaderId, ts: t.ts })).sort((a, b) => b.ts - a.ts); },
      async createTpl(p, { title, desc }) { const id = uid(); await idbTx('readwrite', (s) => s.put({ id, title, desc: desc || '', entry: '', files: [], team: p.team, name: p.name, uploaderId: p.id, ts: Date.now() }), 'tpls'); return id; },
      async setTplFiles(p, t, { files, entry }) {
        const r = await idbTx('readonly', (s) => s.get(t.id), 'tpls'); if (!r) throw new Error('Template not found');
        r.files = files.map((f) => ({ path: f.path, size: f.file.size, blob: f.file })); r.entry = entry;
        await idbTx('readwrite', (s) => s.put(r), 'tpls');
      },
      async deleteTpl(t) { await idbTx('readwrite', (s) => s.delete(t.id), 'tpls'); },
      async tplFiles(t) { const r = await idbTx('readonly', (s) => s.get(t.id), 'tpls'); const m = new Map(); ((r && r.files) || []).forEach((f) => m.set(f.path, f.blob)); return m; },
      subscribe(cb) { const h = (e) => { if (e.key === KEY) cb(); }; window.addEventListener('storage', h); return () => window.removeEventListener('storage', h); }
    };
  }

  /* ---------------- Supabase store ---------------- */
  function supaStore() {
    const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    const urlCache = {};
    const ok = (r) => { if (r.error) throw r.error; return r.data; };
    async function loadProfile() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return null;
      const data = ok(await sb.from('profiles').select('team, display_name').eq('id', user.id).maybeSingle());
      if (!data) { await sb.auth.signOut(); throw new Error('This account is not linked to a team yet. Ask the admin to add it to the profiles table (see SETUP.md).'); }
      return { id: user.id, team: data.team, name: data.display_name };
    }
    return {
      mode: 'supabase',
      async init() {
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return null;
        try { return await loadProfile(); } catch (e) { return null; }
      },
      async login({ email, password }) {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return loadProfile();
      },
      async logout() { await sb.auth.signOut(); },
      async loadAll() {
        const [st, cm, at, ev] = await Promise.all([
          sb.from('step_status').select('*'),
          sb.from('comments').select('*').order('created_at', { ascending: true }),
          sb.from('attachments').select('*').order('created_at', { ascending: true }),
          sb.from('events').select('*').order('created_at', { ascending: false }).limit(400)
        ]);
        const steps = {};
        ok(st).forEach((r) => { steps[r.node_id] = { status: r.status, ts: toTs(r.updated_at) }; });
        return {
          steps,
          comments: ok(cm).map((r) => ({ id: r.id, nodeId: r.node_id, attachmentId: r.attachment_id, body: r.body, kind: r.kind, resolved: r.resolved, team: r.team, name: r.display_name, authorId: r.author, ts: toTs(r.created_at) })),
          attachments: ok(at).map((r) => ({ id: r.id, nodeId: r.node_id, caption: r.caption || '', team: r.team, name: r.display_name, uploaderId: r.uploader, ts: toTs(r.created_at), path: r.path })),
          events: ok(ev).map((r) => ({ id: r.id, nodeId: r.node_id, type: r.type, from: r.from_status, to: r.to_status, n: r.n, team: r.team, name: r.display_name, ts: toTs(r.created_at) })).reverse()
        };
      },
      async setStatus(p, id, status) { ok(await sb.from('step_status').upsert({ node_id: id, status, updated_by: p.id, updated_at: new Date().toISOString() })); },
      async addEvent(p, ev) { ok(await sb.from('events').insert({ node_id: ev.nodeId, type: ev.type, from_status: ev.from || null, to_status: ev.to || null, n: ev.n || null, team: p.team, display_name: p.name })); },
      async addComment(p, c) { ok(await sb.from('comments').insert({ node_id: c.nodeId, attachment_id: c.attachmentId || null, author: p.id, team: p.team, display_name: p.name, kind: c.kind || 'comment', body: c.body })); },
      async setResolved(id, v) { ok(await sb.from('comments').update({ resolved: v }).eq('id', id)); },
      async deleteComment(id) { ok(await sb.from('comments').delete().eq('id', id)); },
      async addAttachment(p, { nodeId, blob, caption }) {
        const path = `${nodeId.replace(/[^\w.-]/g, '_')}/${uid()}.jpg`;
        ok(await sb.storage.from('references').upload(path, blob, { contentType: 'image/jpeg' }));
        const r = await sb.from('attachments').insert({ node_id: nodeId, path, caption: caption || null, uploader: p.id, team: p.team, display_name: p.name });
        if (r.error) { await sb.storage.from('references').remove([path]); throw r.error; }
      },
      async deleteAttachment(a) { ok(await sb.from('attachments').delete().eq('id', a.id)); await sb.storage.from('references').remove([a.path]); },
      async attachmentUrl(a) {
        const hit = urlCache[a.path];
        if (hit && hit.exp > Date.now()) return hit.url;
        const { data, error } = await sb.storage.from('references').createSignedUrl(a.path, 3600);
        if (error) throw error;
        urlCache[a.path] = { url: data.signedUrl, exp: Date.now() + 3300 * 1000 };
        return data.signedUrl;
      },
      async listDocs() {
        const r = await sb.from('documents').select('*').order('created_at', { ascending: false });
        if (r.error) { if (/does not exist|schema cache|relation/i.test(r.error.message || '')) return []; throw r.error; }
        return r.data.map((d) => ({ id: d.id, title: d.title, desc: d.description || '', size: d.size, team: d.team, name: d.display_name, uploaderId: d.uploader, ts: toTs(d.created_at), path: d.path }));
      },
      async addDoc(p, { file, title, desc }) {
        const path = `${uid()}.pdf`;
        ok(await sb.storage.from('documents').upload(path, file, { contentType: 'application/pdf' }));
        const r = await sb.from('documents').insert({ title, description: desc || null, path, size: file.size, uploader: p.id, team: p.team, display_name: p.name });
        if (r.error) { await sb.storage.from('documents').remove([path]); throw r.error; }
      },
      async deleteDoc(d) { ok(await sb.from('documents').delete().eq('id', d.id)); await sb.storage.from('documents').remove([d.path]); },
      async docUrl(d, download) {
        const { data, error } = await sb.storage.from('documents').createSignedUrl(d.path, 3600, download ? { download: (d.title || 'document').replace(/[^\w .-]/g, '') + '.pdf' } : undefined);
        if (error) throw error;
        return data.signedUrl;
      },
      async listTpls() {
        const r = await sb.from('templates').select('*').order('created_at', { ascending: false });
        if (r.error) { if (/does not exist|schema cache|relation/i.test(r.error.message || '')) return []; throw r.error; }
        return r.data.map((d) => ({ id: d.id, title: d.title, desc: d.description || '', entry: d.entry || '', files: d.files || [], team: d.team, name: d.display_name, uploaderId: d.uploader, ts: toTs(d.created_at) }));
      },
      async createTpl(p, { title, desc }) { return ok(await sb.from('templates').insert({ title, description: desc || null, uploader: p.id, team: p.team, display_name: p.name }).select('id').single()).id; },
      async setTplFiles(p, t, { files, entry }) {
        const v = Date.now().toString(36), bucket = sb.storage.from('templates');
        const items = files.map((f, i) => ({ path: f.path, size: f.file.size, key: `${t.id}/${v}/${i}_${f.path.split('/').pop().replace(/[^\w.-]/g, '_')}`, file: f.file }));
        let n = 0; const done = [];
        try {
          await Promise.all(Array.from({ length: 4 }, async () => { while (n < items.length) { const it = items[n++]; ok(await bucket.upload(it.key, it.file, { contentType: mimeOf(it.path, it.file) })); done.push(it.key); } }));
          ok(await sb.from('templates').update({ entry, files: items.map((i) => ({ path: i.path, size: i.size, key: i.key })) }).eq('id', t.id));
        } catch (e) { if (done.length) await bucket.remove(done); throw e; }
        const old = (t.files || []).map((f) => f.key).filter(Boolean); if (old.length) await bucket.remove(old);
      },
      async deleteTpl(t) { const keys = (t.files || []).map((f) => f.key).filter(Boolean); if (keys.length) await sb.storage.from('templates').remove(keys); ok(await sb.from('templates').delete().eq('id', t.id)); },
      async tplFiles(t) {
        const bucket = sb.storage.from('templates'), list = (t.files || []).filter((f) => f.key), m = new Map();
        if (!list.length) return m;
        const signed = ok(await bucket.createSignedUrls(list.map((f) => f.key), 3600));
        const url = {}; signed.forEach((x) => { if (x.signedUrl) url[x.path] = x.signedUrl; });
        let n = 0;
        await Promise.all(Array.from({ length: 6 }, async () => { while (n < list.length) { const f = list[n++]; if (!url[f.key]) continue; const r = await fetch(url[f.key]); if (r.ok) m.set(f.path, await r.blob()); } }));
        return m;
      },
      subscribe(cb) {
        let t;
        const ch = sb.channel('calybrate-live').on('postgres_changes', { event: '*', schema: 'public' }, () => { clearTimeout(t); t = setTimeout(cb, 250); }).subscribe();
        return () => sb.removeChannel(ch);
      }
    };
  }

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  async function create() {
    if (CFG.supabaseUrl && CFG.supabaseAnonKey) {
      try {
        if (!window.supabase) await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
        return supaStore();
      } catch (e) { console.warn('Could not load the shared backend, falling back to demo mode.', e); }
    }
    return localStore();
  }
  window.CalybrateStore = { create, TEAMS };
})();
