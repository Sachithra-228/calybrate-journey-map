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
      const open = indexedDB.open('calybrate-docs', 4);
      open.onupgradeneeded = () => { ['docs', 'tpls', 'mtfiles'].forEach((n) => { if (!open.result.objectStoreNames.contains(n)) open.result.createObjectStore(n, { keyPath: 'id' }); }); };
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
    const empty = () => ({ session: null, steps: {}, comments: [], attachments: [], events: [], meetings: [], tasks: [] });
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
      /* Meetings (notes + files) and tasks: Sandbox writes them, Liveroom reads, comments and ticks tasks */
      async listMeetings() { return (read().meetings || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.ts - a.ts); },
      async addMeeting(p, m) {
        const d = read(); d.meetings = d.meetings || [];
        const x = { id: uid(), date: m.date, title: m.title, notes: m.notes || '', visibility: m.visibility === 'sandbox' ? 'sandbox' : 'both', team: p.team, name: p.name, authorId: p.id, ts: Date.now() };
        d.meetings.push(x); write(d); return x;
      },
      async updateMeeting(p, id, m) { const d = read(), x = (d.meetings || []).find((i) => i.id === id); if (x) Object.assign(x, { date: m.date, title: m.title, notes: m.notes || '', visibility: m.visibility === 'sandbox' ? 'sandbox' : 'both' }); write(d); },
      async deleteMeeting(id) { const d = read(); d.meetings = (d.meetings || []).filter((x) => x.id !== id); write(d); },
      async listMeetingFiles() { const all = (await idbTx('readonly', (s) => s.getAll(), 'mtfiles')) || []; return all.map((f) => ({ id: f.id, meetingId: f.meetingId || '', taskId: f.taskId || '', fileName: f.fileName, mime: f.mime, size: f.size, team: f.team, name: f.name, uploaderId: f.uploaderId, ts: f.ts })).sort((a, b) => a.ts - b.ts); },
      async addMeetingFile(p, { file, meetingId, taskId }) { const id = uid(); await idbTx('readwrite', (s) => s.put({ id, meetingId: meetingId || '', taskId: taskId || '', fileName: file.name, mime: file.type || '', size: file.size, team: p.team, name: p.name, uploaderId: p.id, ts: Date.now(), blob: file }), 'mtfiles'); return id; },
      async deleteMeetingFile(f) { await idbTx('readwrite', (s) => s.delete(f.id), 'mtfiles'); },
      async meetingFileBlob(f) { const r = await idbTx('readonly', (s) => s.get(f.id), 'mtfiles'); if (!r) throw new Error('File not found'); return r.blob; },
      async listTasks() { return (read().tasks || []).slice().sort((a, b) => a.seq - b.seq); },
      async addTasks(p, rows) {
        const d = read(); d.tasks = d.tasks || []; let seq = d.tasks.reduce((m, x) => Math.max(m, x.seq), 0);
        const out = rows.map((r) => ({ id: uid(), seq: ++seq, title: r.title, notes: r.notes || '', priority: r.priority || 'medium', due: r.due || '', status: 'open', team: p.team, name: p.name, authorId: p.id, ts: Date.now(), doneBy: '', doneTs: 0, confirmBy: '', confirmTs: 0 }));
        d.tasks.push(...out); write(d); return out;
      },
      async updateTask(p, id, patch) { const d = read(), it = (d.tasks || []).find((x) => x.id === id); if (it) Object.assign(it, { title: patch.title, notes: patch.notes || '', priority: patch.priority, due: patch.due || '' }); write(d); },
      async setTaskStatus(p, id, status) {
        const d = read(), it = (d.tasks || []).find((x) => x.id === id); if (!it) return;
        it.status = status; const now = Date.now();
        if (status === 'done') Object.assign(it, { doneBy: p.name, doneTs: now, confirmBy: '', confirmTs: 0 });
        else if (status === 'confirmed') Object.assign(it, { confirmBy: p.name, confirmTs: now });
        else Object.assign(it, { doneBy: '', doneTs: 0, confirmBy: '', confirmTs: 0 });
        write(d);
      },
      async deleteTask(id) { const d = read(); d.tasks = (d.tasks || []).filter((x) => x.id !== id); write(d); },
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
      /* Meetings and tasks (see supabase/meetings.sql) */
      async listMeetings() {
        const r = await sb.from('meetings').select('*').order('meeting_date', { ascending: false }).order('created_at', { ascending: false });
        if (r.error) { if (/does not exist|schema cache|relation/i.test(r.error.message || '')) return []; throw r.error; }
        return r.data.map((x) => ({ id: x.id, date: x.meeting_date, title: x.title, notes: x.notes || '', visibility: x.visibility || 'both', team: x.team, name: x.display_name, authorId: x.created_by, ts: toTs(x.created_at) }));
      },
      async addMeeting(p, m) {
        const x = ok(await sb.from('meetings').insert({ meeting_date: m.date, title: m.title, notes: m.notes || null, visibility: m.visibility === 'sandbox' ? 'sandbox' : 'both', created_by: p.id, team: p.team, display_name: p.name }).select('*').single());
        return { id: x.id, date: x.meeting_date, title: x.title, notes: x.notes || '', visibility: x.visibility || 'both' };
      },
      async updateMeeting(p, id, m) { ok(await sb.from('meetings').update({ meeting_date: m.date, title: m.title, notes: m.notes || null, visibility: m.visibility === 'sandbox' ? 'sandbox' : 'both' }).eq('id', id)); },
      async deleteMeeting(id) { ok(await sb.from('meetings').delete().eq('id', id)); },
      async listMeetingFiles() {
        const r = await sb.from('meeting_files').select('*').order('created_at', { ascending: true });
        if (r.error) { if (/does not exist|schema cache|relation/i.test(r.error.message || '')) return []; throw r.error; }
        return r.data.map((f) => ({ id: f.id, meetingId: f.meeting_id || '', taskId: f.task_id || '', fileName: f.file_name, mime: f.mime || '', size: f.size, team: f.team, name: f.display_name, uploaderId: f.uploader, ts: toTs(f.created_at), path: f.path }));
      },
      async addMeetingFile(p, { file, meetingId, taskId }) {
        const ext = ((file.name.split('.').pop() || 'bin').replace(/[^\w]/g, '').slice(0, 8)) || 'bin', path = taskId ? `tasks/${taskId}/${uid()}.${ext}` : `${meetingId}/${uid()}.${ext}`;
        ok(await sb.storage.from('meetings').upload(path, file, { contentType: file.type || 'application/octet-stream' }));
        const r = await sb.from('meeting_files').insert({ meeting_id: meetingId || null, task_id: taskId || null, file_name: file.name, mime: file.type || null, path, size: file.size, uploader: p.id, team: p.team, display_name: p.name });
        if (r.error) { await sb.storage.from('meetings').remove([path]); throw r.error; }
      },
      async deleteMeetingFile(f) { ok(await sb.from('meeting_files').delete().eq('id', f.id)); await sb.storage.from('meetings').remove([f.path]); },
      async meetingFileBlob(f) {
        const r = await sb.storage.from('meetings').download(f.path);
        if (r.error) throw r.error;
        return r.data;
      },
      async listTasks() {
        const r = await sb.from('meeting_tasks').select('*').order('seq', { ascending: true });
        if (r.error) { if (/does not exist|schema cache|relation/i.test(r.error.message || '')) return []; throw r.error; }
        return r.data.map((x) => ({ id: x.id, seq: x.seq, title: x.title, notes: x.notes || '', priority: x.priority, due: x.due_date || '', status: x.status, team: x.team, name: x.display_name, authorId: x.created_by, ts: toTs(x.created_at), doneBy: x.done_by_name || '', doneTs: x.done_at ? toTs(x.done_at) : 0, confirmBy: x.confirmed_by_name || '', confirmTs: x.confirmed_at ? toTs(x.confirmed_at) : 0 }));
      },
      async addTasks(p, rows) {
        const data = ok(await sb.from('meeting_tasks').insert(rows.map((r) => ({ title: r.title, notes: r.notes || null, priority: r.priority || 'medium', due_date: r.due || null, status: 'open', created_by: p.id, team: p.team, display_name: p.name }))).select('id, seq, title'));
        return data.map((x) => ({ id: x.id, seq: x.seq, title: x.title }));
      },
      async updateTask(p, id, patch) { ok(await sb.from('meeting_tasks').update({ title: patch.title, notes: patch.notes || null, priority: patch.priority, due_date: patch.due || null }).eq('id', id)); },
      async setTaskStatus(p, id, status) {
        const now = new Date().toISOString(), patch = { status };
        if (status === 'done') Object.assign(patch, { done_by_name: p.name, done_at: now, confirmed_by_name: null, confirmed_at: null });
        else if (status === 'confirmed') Object.assign(patch, { confirmed_by_name: p.name, confirmed_at: now });
        else Object.assign(patch, { done_by_name: null, done_at: null, confirmed_by_name: null, confirmed_at: null });
        ok(await sb.from('meeting_tasks').update(patch).eq('id', id));
      },
      async deleteTask(id) { ok(await sb.from('meeting_tasks').delete().eq('id', id)); },
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
