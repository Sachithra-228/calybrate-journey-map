/* Landing page tab: a checklist that works like a small spreadsheet.
   Sandbox writes the list (type a row, paste rows from Excel, or import a CSV). Liveroom ticks an item when it is done.
   Sandbox is notified and confirms it, which closes the item. PDFs for the page can be uploaded here too.
   docs.js calls CalLp.init(api) after sign-in and CalLp.show() when the tab opens.
   Every state change also posts a short comment on the item (node_id = "lp:<item id>"), so the other team gets the normal
   bell + alert without any extra plumbing, and the item keeps a readable history. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const SECTIONS = ['General', 'Home', 'Solutions', 'FAQ', 'Request a Demo', 'Mobile menu', 'Header & footer'];
  const PRI = { high: 'High', medium: 'Medium', low: 'Low' };
  const STATUS = { open: 'Open', done: 'Awaiting confirmation', confirmed: 'Confirmed' };
  const IC = {
    plus: '<path d="M12 5v14M5 12h14"/>', up: '<path d="M12 16V5M7 10l5-5 5 5M4 20h16"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.3A8 8 0 1 1 21 12z"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>', doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    sheet: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M9.5 4v16M15 4v16M3.5 14.5h17"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    clip: '<path d="M16 8l-6.5 6.5a2 2 0 0 0 2.8 2.8L19 10.5a4 4 0 0 0-5.7-5.7L6.5 11.6a6 6 0 0 0 8.5 8.5L20 15"/>', warn: '<path d="M12 3 2 20h20L12 3zM12 10v4M12 17h.01"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>'
  };
  const sv = (k, c) => `<svg class="${c || 'si'}" viewBox="0 0 24 24">${IC[k]}</svg>`;
  const nid = (id) => `lp:${id}`;
  const parseNode = (n) => { const m = /^lp:(.+)$/.exec(n || ''); return m ? m[1] : null; };

  let api = null, items = [], files = [], visible = false, filter = 'all', query = '', section = 'all', openId = null, editId = null, sortDesc = false, busyUp = false;
  const me = () => api.profile();
  const isSandbox = () => !!me() && me().team === 'sandbox';
  const isLive = () => !!me() && me().team === 'liveroom';
  const esc = (s) => api.esc(s);
  const byId = (id) => items.find((x) => x.id === id);
  const comments = (id) => api.S().comments.filter((c) => c.nodeId === nid(id));
  const mb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const dateOf = (ts) => (ts ? new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');
  const note = (id, body) => api.store.addComment(me(), { nodeId: nid(id), body, kind: 'comment' });

  /* ---------------- parsing rows pasted from Excel / Google Sheets or read from a CSV ---------------- */
  function splitCsv(line) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur); return out;
  }
  function parseRows(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n').filter((l) => l.trim());
    const tab = lines.some((l) => l.includes('\t'));
    let rows = lines.map((l) => (tab ? l.split('\t') : splitCsv(l)).map((c) => c.trim()));
    if (rows.length && /^(item|title|task|issue|description|requirement)$/i.test(rows[0][0] || '')) rows = rows.slice(1);
    return rows.map((c) => {
      const sec = (c[1] || '').trim(), pr = (c[2] || '').trim();
      return {
        title: (c[0] || '').slice(0, 300), notes: (c[3] || '').slice(0, 2000),
        section: SECTIONS.find((s) => s.toLowerCase() === sec.toLowerCase()) || sec || 'General',
        priority: /^h/i.test(pr) ? 'high' : /^l/i.test(pr) ? 'low' : 'medium'
      };
    }).filter((r) => r.title);
  }

  /* ---------------- data ---------------- */
  async function refresh() {
    if (!api) return;
    try { [items, files] = await Promise.all([api.store.listLp(), api.store.listLpFiles()]); } catch (e) { items = items || []; files = files || []; }
    badge();
    if (visible) render();
  }
  function badge() {
    const b = $('#switch [data-v="lp"] .swb'); if (!b) return;
    const n = isSandbox() ? items.filter((i) => i.status === 'done').length : 0;
    b.hidden = !n; b.textContent = n; b.title = n ? `${n} item${n > 1 ? 's' : ''} waiting for your confirmation` : '';
  }

  /* ---------------- render ---------------- */
  const counts = () => { const c = { open: 0, done: 0, confirmed: 0 }; items.forEach((i) => { c[i.status]++; }); return c; };
  function visibleItems() {
    const q = query.trim().toLowerCase();
    let list = items.filter((i) => (filter === 'all' || i.status === filter) && (section === 'all' || i.section === section) && (!q || (i.title + ' ' + i.notes + ' ' + i.section).toLowerCase().includes(q)));
    if (sortDesc) list = list.slice().reverse();
    return list;
  }
  function head() {
    return `<div class="vhead"><div><h1>Landing page</h1><p>${isSandbox() ? 'Add what needs to change on the public site. Liveroom ticks each item when it is done, and you confirm it to close it.' : 'Sandbox lists what needs to change on the public site. Tick an item when you have finished it, and Sandbox will confirm it.'}</p></div>
      <div class="vact">${isSandbox() ? `<button class="btn ghost" data-lp="paste">${sv('sheet')} Paste from Excel</button>` : ''}<button class="btn ghost" data-lp="export">${sv('dl')} Export CSV</button><button class="btn primary" data-lp="upload">${sv('up')} Upload PDF</button></div></div>`;
  }
  function stats() {
    const c = counts(), total = items.length, pct = total ? Math.round(c.confirmed / total * 100) : 0;
    const call = isSandbox() && c.done ? `<button class="lp-call" data-lp="filter" data-f="done">${sv('check')}<span><b>${c.done} item${c.done > 1 ? 's' : ''} waiting for your confirmation</b><small>Liveroom has ticked ${c.done > 1 ? 'them' : 'it'} as done. Review and confirm.</small></span><em>Review</em></button>` : '';
    return `${call}<div class="lp-stats"><div class="lp-st"><b>${c.open}</b><span>Open</span></div><div class="lp-st amber"><b>${c.done}</b><span>Awaiting confirmation</span></div><div class="lp-st green"><b>${c.confirmed}</b><span>Confirmed</span></div>
      <div class="lp-prog"><div class="lp-bar"><i style="width:${pct}%"></i></div><span>${pct}% complete · ${c.confirmed} of ${total}</span></div></div>`;
  }
  function filters() {
    const c = counts(), tabs = [['all', 'All', items.length], ['open', 'Open', c.open], ['done', 'Awaiting confirmation', c.done], ['confirmed', 'Confirmed', c.confirmed]];
    const secs = [...new Set([...SECTIONS, ...items.map((i) => i.section)])];
    return `<div class="lp-filters"><div class="lp-tabs">${tabs.map(([k, l, n]) => `<button data-lp="filter" data-f="${k}" class="${filter === k ? 'on' : ''}">${l}<b>${n}</b></button>`).join('')}</div>
      <div class="lp-tools"><select id="lp-sec" aria-label="Section"><option value="all">All sections</option>${secs.map((s) => `<option ${section === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      <input id="lp-q" type="search" placeholder="Search the list" value="${esc(query)}" aria-label="Search the list"></div></div>`;
  }
  const secOptions = (cur) => [...new Set([...SECTIONS, cur].filter(Boolean))].map((s) => `<option ${s === cur ? 'selected' : ''}>${esc(s)}</option>`).join('');
  const priOptions = (cur) => Object.keys(PRI).map((k) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${PRI[k]}</option>`).join('');

  function tickCell(it) {
    const checked = it.status !== 'open', locked = it.status === 'confirmed';
    if (isLive()) return `<label class="lp-tick ${checked ? 'on' : ''} ${locked ? 'lock' : ''}" title="${locked ? 'Confirmed by Sandbox' : checked ? 'Untick to move it back to open' : 'Tick when this is done'}"><input type="checkbox" data-lp="tick" data-id="${esc(it.id)}" ${checked ? 'checked' : ''} ${locked ? 'disabled' : ''}><span>${sv('check')}</span></label>`;
    return `<span class="lp-tick ro ${checked ? 'on' : ''}" title="Liveroom ticks items when they are done">${checked ? `<span>${sv('check')}</span>` : '<span></span>'}</span>`;
  }
  function statusCell(it) {
    let sub = '';
    if (it.status === 'done') sub = `<small>${esc(it.doneBy)} · ${dateOf(it.doneTs)}</small>`;
    if (it.status === 'confirmed') sub = `<small>${esc(it.confirmBy)} · ${dateOf(it.confirmTs)}</small>`;
    return `<span class="lp-badge ${it.status}">${STATUS[it.status]}</span>${sub}`;
  }
  function actions(it) {
    const cc = comments(it.id), oi = cc.filter((c) => c.kind === 'issue' && !c.resolved).length;
    let h = `<button class="lp-ic ${openId === it.id ? 'on' : ''}" data-lp="disc" data-id="${esc(it.id)}" title="Discussion">${sv('chat')}${cc.length ? `<b>${cc.length}</b>` : ''}${oi ? '<i class="udot"></i>' : ''}</button>`;
    if (isSandbox()) {
      if (it.status === 'done') h = `<button class="btn sm lp-confirm" data-lp="confirm" data-id="${esc(it.id)}">${sv('check')} Confirm</button><button class="btn ghost sm" data-lp="reopen" data-id="${esc(it.id)}" title="Needs more work">${sv('undo')} Reopen</button>` + h;
      else if (it.status === 'confirmed') h = `<button class="btn ghost sm" data-lp="reopen" data-id="${esc(it.id)}" title="Open it again">${sv('undo')} Reopen</button>` + h;
      h += `<button class="lp-ic" data-lp="edit" data-id="${esc(it.id)}" title="Edit">${sv('edit')}</button><button class="lp-ic danger" data-lp="del" data-id="${esc(it.id)}" title="Delete">${sv('trash')}</button>`;
    }
    return h;
  }
  function row(it) {
    const edit = editId === it.id && isSandbox();
    const cls = `lp-row s-${it.status} ${openId === it.id ? 'open' : ''}`;
    if (edit) {
      return `<tr class="${cls} editing"><td class="lp-c-tick"></td><td class="lp-c-n">${it.seq}</td>
        <td data-l="Item"><input class="lp-in" id="ed-title" value="${esc(it.title)}" maxlength="300"><textarea class="lp-in" id="ed-notes" maxlength="2000" placeholder="Notes (optional)">${esc(it.notes)}</textarea></td>
        <td data-l="Section"><select class="lp-in" id="ed-sec">${secOptions(it.section)}</select></td><td data-l="Priority"><select class="lp-in" id="ed-pri">${priOptions(it.priority)}</select></td>
        <td></td><td></td><td class="lp-c-act"><button class="btn sm" data-lp="save" data-id="${esc(it.id)}">${sv('check')} Save</button><button class="btn ghost sm" data-lp="cancel">Cancel</button></td></tr>`;
    }
    return `<tr class="${cls}" data-id="${esc(it.id)}"><td class="lp-c-tick">${tickCell(it)}</td><td class="lp-c-n">${it.seq}</td>
      <td data-l="Item" class="lp-c-item"><b>${esc(it.title)}</b>${it.notes ? `<p>${esc(it.notes)}</p>` : ''}</td>
      <td data-l="Section"><span class="lp-sec">${esc(it.section)}</span></td><td data-l="Priority"><span class="lp-pri ${it.priority}">${PRI[it.priority]}</span></td>
      <td data-l="Added" class="lp-c-by">${api.teamBadge(it.team)}<small>${dateOf(it.ts)}</small></td><td data-l="Status" class="lp-c-st">${statusCell(it)}</td><td class="lp-c-act">${actions(it)}</td></tr>${openId === it.id ? disc(it) : ''}`;
  }
  function disc(it) {
    const cc = comments(it.id);
    return `<tr class="lp-disc"><td></td><td></td><td colspan="6"><div class="lp-thread">${cc.map((m) => api.msgHtml(m)).join('') || '<div class="empty">No messages yet. Start the conversation below.</div>'}</div>
      <div class="lp-compose"><textarea id="lp-msg" data-id="${esc(it.id)}" placeholder="Write a message to ${isSandbox() ? 'Liveroom' : 'Sandbox'}…"></textarea><button class="btn primary sm" data-lp="send" data-id="${esc(it.id)}">Send</button></div></td></tr>`;
  }
  function addRow() {
    if (!isSandbox()) return '';
    return `<tr class="lp-add"><td></td><td class="lp-c-n">${sv('plus')}</td><td data-l="Item"><input id="lp-new" class="lp-in" maxlength="300" placeholder="Type an item and press Enter to add it" autocomplete="off"></td>
      <td data-l="Section"><select id="lp-new-sec" class="lp-in">${secOptions('General')}</select></td><td data-l="Priority"><select id="lp-new-pri" class="lp-in">${priOptions('medium')}</select></td><td></td><td></td><td class="lp-c-act"><button class="btn sm" data-lp="add">${sv('plus')} Add</button></td></tr>`;
  }
  function sheet() {
    const list = visibleItems();
    const empty = !items.length ? `<tr><td colspan="8" class="lp-empty"><b>${isSandbox() ? 'Your list is empty' : 'Nothing here yet'}</b><span>${isSandbox() ? 'Type the first item below, paste rows from Excel, or import a CSV file.' : 'Sandbox has not added any items yet.'}</span></td></tr>` : (!list.length ? '<tr><td colspan="8" class="lp-empty"><b>No items match</b><span>Try a different filter.</span></td></tr>' : '');
    return `<div class="lp-sheet"><table class="lp-table"><thead><tr><th class="lp-c-tick"></th><th class="lp-c-n"><button data-lp="sort" title="Reverse the order">#</button></th><th>Item</th><th>Section</th><th>Priority</th><th>Added</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map(row).join('')}${empty}${addRow()}</tbody></table></div>`;
  }
  function filesPanel() {
    const card = (f) => `<div class="lp-file">${sv('doc', 'lp-pdf')}<div><b>${esc(f.title)}</b><small>${mb(f.size)} · ${api.teamBadge(f.team)} ${esc(f.name)} · ${api.ago(f.ts)}</small></div>
      <div class="lp-fact"><button class="btn ghost sm" data-lp="fopen" data-id="${esc(f.id)}">${sv('eye')} Open</button><button class="btn ghost sm" data-lp="fdl" data-id="${esc(f.id)}">${sv('dl')} Download</button>${me() && f.uploaderId === me().id ? `<button class="lp-ic danger" data-lp="fdel" data-id="${esc(f.id)}" title="Delete">${sv('trash')}</button>` : ''}</div></div>`;
    return `<section class="lp-files"><div class="lp-fh"><h2>PDFs</h2><button class="btn ghost sm" data-lp="upload">${sv('up')} Upload PDF</button></div>
      ${files.length ? files.map(card).join('') : '<label class="lp-drop" data-lp="upload">' + sv('up') + '<b>Upload a PDF</b><small>Designs, copy decks or notes for the landing page. Drop a file here too.</small></label>'}</section>`;
  }
  function render() {
    if (!api || !visible) return;
    const v = $('#lp-view'), keep = { sc: v.scrollTop, nw: ($('#lp-new') || {}).value || '', msg: ($('#lp-msg') || {}).value || '', msgId: ($('#lp-msg') || {}).dataset ? $('#lp-msg').dataset.id : '', focus: document.activeElement && document.activeElement.id, ed: { t: ($('#ed-title') || {}).value, n: ($('#ed-notes') || {}).value } };
    v.innerHTML = head() + `<div class="lp-wrap">${stats()}${filters()}${sheet()}${filesPanel()}</div>`;
    const nw = $('#lp-new'); if (nw) nw.value = keep.nw;
    const mg = $('#lp-msg'); if (mg && keep.msgId === mg.dataset.id) mg.value = keep.msg;
    if (keep.ed.t != null && $('#ed-title')) { $('#ed-title').value = keep.ed.t; $('#ed-notes').value = keep.ed.n || ''; }
    if (keep.focus && $('#' + keep.focus) && ['lp-new', 'lp-msg', 'lp-q', 'ed-title'].includes(keep.focus)) { const f = $('#' + keep.focus); f.focus(); try { f.setSelectionRange(f.value.length, f.value.length); } catch (e) { /* ignore */ } }
    v.scrollTop = keep.sc;
    if (openId) api.markNodeSeen(nid(openId));
  }

  /* ---------------- actions ---------------- */
  const run = (fn) => api.guard(async () => { await fn(); await api.reload(); await refresh(); });
  async function addItems(rows, label) {
    const list = rows.filter((r) => r.title);
    if (!list.length) return;
    await run(async () => {
      const made = await api.store.addLp(me(), list);
      if (made && made[0]) await note(made[0].id, list.length === 1 ? 'New item added.' : `Added ${list.length} new items to the Landing page list.`);
      api.toast(list.length === 1 ? 'Item added' : `${list.length} items added`);
    });
    if (label) label();
  }
  function addFromRow() {
    const t = ($('#lp-new') || {}).value || ''; if (!t.trim()) { const e = $('#lp-new'); if (e) e.focus(); return; }
    const row = { title: t.trim(), section: $('#lp-new-sec').value, priority: $('#lp-new-pri').value };
    addItems([row], () => { const e = $('#lp-new'); if (e) { e.value = ''; e.focus(); } });
  }
  const tick = (id, on) => run(async () => {
    await api.store.setLpStatus(me(), id, on ? 'done' : 'open');
    await note(id, on ? 'Marked as done. Waiting for Sandbox to confirm.' : 'Moved back to open.');
    api.toast(on ? 'Marked as done. Sandbox will be notified.' : 'Moved back to open');
  });
  const confirmItem = (id) => run(async () => { await api.store.setLpStatus(me(), id, 'confirmed'); await note(id, 'Confirmed. This item is complete.'); api.toast('Confirmed'); });
  const reopen = (id) => { openId = id; return run(async () => { await api.store.setLpStatus(me(), id, 'open'); await note(id, 'Reopened. More work is needed.'); api.toast('Reopened'); }); };
  async function sendMsg(id) {
    const ta = $('#lp-msg'), v = ta ? ta.value.trim() : ''; if (!v) { if (ta) ta.focus(); return; }
    await run(async () => { await api.store.addComment(me(), { nodeId: nid(id), body: v, kind: 'comment' }); ta.value = ''; });
  }
  function exportCsv() {
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"', d = (t) => (t ? new Date(t).toISOString().slice(0, 10) : '');
    const rows = [['#', 'Item', 'Notes', 'Section', 'Priority', 'Status', 'Added by', 'Added on', 'Done by', 'Done on', 'Confirmed by', 'Confirmed on']]
      .concat(items.map((i) => [i.seq, i.title, i.notes, i.section, PRI[i.priority], STATUS[i.status], i.team, d(i.ts), i.doneBy, d(i.doneTs), i.confirmBy, d(i.confirmTs)]));
    const blob = new Blob(['﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `landing-page-list-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  function openPaste() {
    let d = $('#lp-paste'); if (d) d.remove();
    d = document.createElement('section'); d.id = 'lp-paste'; d.className = 'docup';
    d.innerHTML = `<div class="docup-card" role="dialog" aria-modal="true" aria-labelledby="lpp-h"><div class="up-head"><h2 id="lpp-h">Paste from Excel</h2><button class="btn ghost icon-only" data-lpp="close" aria-label="Close">${sv('x')}</button></div>
      <p class="lp-help">Copy rows in Excel or Google Sheets and paste them here, one item per row. Columns, in this order: <b>Item</b>, <b>Section</b>, <b>Priority</b>, <b>Notes</b>. Only the first column is required.</p>
      <textarea id="lpp-text" class="lp-paste" placeholder="Hero headline is hard to read on mobile&#9;Home&#9;High&#10;FAQ answers are cut off&#9;FAQ&#9;Medium"></textarea>
      <div class="lpp-row"><label class="btn ghost sm" for="lpp-file">${sv('clip')} Import a CSV file</label><input id="lpp-file" type="file" accept=".csv,.tsv,.txt,text/csv" hidden><span id="lpp-count" class="lp-help">0 items found</span></div>
      <div class="up-row"><button class="btn ghost" data-lpp="close">Cancel</button><button class="btn primary" id="lpp-go" disabled>Add items</button></div></div>`;
    document.body.appendChild(d);
    const ta = $('#lpp-text'), upd = () => { const n = parseRows(ta.value).length; $('#lpp-count').textContent = `${n} item${n === 1 ? '' : 's'} found`; $('#lpp-go').disabled = !n; };
    ta.addEventListener('input', upd); ta.focus();
    $('#lpp-file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) { ta.value = await f.text(); upd(); } });
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-lpp="close"]')) d.remove(); });
    $('#lpp-go').addEventListener('click', async () => { const rows = parseRows(ta.value); d.remove(); await addItems(rows); });
  }
  async function uploadPdf(file) {
    if (!file || busyUp) return;
    if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) { api.toast('Please choose a PDF file'); return; }
    if (file.size > 50 * 1024 * 1024) { api.toast('That file is over 50 MB'); return; }
    busyUp = true; api.toast('Uploading…');
    const title = file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim() || 'Landing page PDF';
    try {
      await api.store.addLpFile(me(), { file, title });
      await api.store.addComment(me(), { nodeId: 'lp:files', body: `Uploaded a PDF: ${title}`, kind: 'comment' });
      await api.reload(); await refresh(); api.toast('PDF uploaded');
    } catch (e) {
      const m = e.message || String(e);
      api.toast(/landing|relation|schema cache|bucket/i.test(m) ? 'Uploads need a one-time setup: run supabase/landing.sql (see SETUP.md)' : m);
    }
    busyUp = false;
  }
  async function openFile(id, download) {
    const f = files.find((x) => x.id === id); if (!f) return;
    try { const url = await api.store.lpFileUrl(f, download); if (download) { const a = document.createElement('a'); a.href = url; a.download = (f.title || 'document') + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); } else window.open(url, '_blank', 'noopener'); }
    catch (e) { api.toast(e.message || 'Could not open the file'); }
  }

  /* ---------------- events ---------------- */
  function onClick(e) {
    const el = e.target.closest('[data-lp]'); if (!el || !api) return;
    const a = el.dataset.lp, id = el.dataset.id;
    switch (a) {
      case 'filter': filter = el.dataset.f; render(); break;
      case 'sort': sortDesc = !sortDesc; render(); break;
      case 'disc': openId = openId === id ? null : id; render(); if (openId) { const t = $('#lp-msg'); if (t) t.focus(); } break;
      case 'add': addFromRow(); break;
      case 'edit': editId = id; render(); { const t = $('#ed-title'); if (t) t.focus(); } break;
      case 'cancel': editId = null; render(); break;
      case 'save': { const t = $('#ed-title').value.trim(); if (!t) { $('#ed-title').focus(); return; } const patch = { title: t, notes: $('#ed-notes').value.trim(), section: $('#ed-sec').value, priority: $('#ed-pri').value }; editId = null; run(() => api.store.updateLp(me(), id, patch)); break; }
      case 'del': if (confirm('Delete this item and its messages?')) run(async () => { await api.store.deleteLp(id); await Promise.all(api.S().comments.filter((c) => c.nodeId === nid(id) && c.authorId === me().id).map((c) => api.store.deleteComment(c.id))); }); break;
      case 'confirm': confirmItem(id); break;
      case 'reopen': reopen(id); break;
      case 'send': sendMsg(id); break;
      case 'paste': openPaste(); break;
      case 'export': exportCsv(); break;
      case 'upload': { const i = $('#lp-pdf'); if (i) i.click(); break; }
      case 'fopen': openFile(id, false); break;
      case 'fdl': openFile(id, true); break;
      case 'fdel': if (confirm('Delete this PDF?')) { const f = files.find((x) => x.id === id); run(() => api.store.deleteLpFile(f)); } break;
      default: break;
    }
  }
  function bind() {
    const v = $('#lp-view'); if (!v || v._lp) return; v._lp = true;
    v.addEventListener('click', onClick);
    v.addEventListener('change', (e) => {
      if (e.target.matches('[data-lp="tick"]')) tick(e.target.dataset.id, e.target.checked);
      else if (e.target.id === 'lp-sec') { section = e.target.value; render(); }
    });
    v.addEventListener('input', (e) => { if (e.target.id === 'lp-q') { query = e.target.value; const pos = e.target.selectionStart; render(); const q = $('#lp-q'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } } });
    v.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'lp-new') { e.preventDefault(); addFromRow(); }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.id === 'lp-msg') { e.preventDefault(); sendMsg(e.target.dataset.id); }
      else if (e.key === 'Escape' && editId) { editId = null; render(); }
    });
    ['dragover', 'drop'].forEach((t) => v.addEventListener(t, (e) => {
      if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return; e.preventDefault();
      if (t === 'drop') { const f = e.dataTransfer.files[0]; if (f) uploadPdf(f); }
    }));
    if (!$('#lp-pdf')) { const i = document.createElement('input'); i.type = 'file'; i.id = 'lp-pdf'; i.hidden = true; i.accept = 'application/pdf,.pdf'; i.addEventListener('change', (e) => { uploadPdf(e.target.files[0]); e.target.value = ''; }); document.body.appendChild(i); }
  }

  /* ---------------- public ---------------- */
  window.CalLp = {
    init(a) { api = a; bind(); return refresh(); },
    show() { visible = true; refresh(); },
    hide() { visible = false; const p = $('#lp-paste'); if (p) p.remove(); },
    onData() { if (api) refresh(); },
    isNode: (id) => /^lp:/.test(id || ''),
    nodeName(id) { const k = parseNode(id); if (k === 'files') return 'Landing page · PDFs'; const it = k && byId(k); return it ? `Landing page · #${it.seq} ${it.title.length > 48 ? it.title.slice(0, 47) + '…' : it.title}` : 'Landing page'; },
    openNode(id) { const k = parseNode(id); if (k && k !== 'files' && byId(k)) { openId = k; filter = 'all'; section = 'all'; query = ''; if (visible) { render(); const r = $(`#lp-view tr[data-id="${k}"]`); if (r) r.scrollIntoView({ block: 'center' }); } } }
  };
})();
