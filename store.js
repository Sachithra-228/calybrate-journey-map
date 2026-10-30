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
