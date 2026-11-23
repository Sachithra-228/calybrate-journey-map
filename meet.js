/* Meetings tab.
   MEETINGS: a calendar plus the notes of each meeting between the two teams (what was discussed and decided).
     Sandbox records a meeting and uploads files to it (PDF, Word, Excel, CSV, images, anything). Liveroom can only read, preview and
     discuss them: it cannot add, change or upload anything.
   TASKS: Sandbox adds tasks, Liveroom ticks one when it is done, Sandbox is notified and confirms it to close it.
   docs.js calls CalMeet.init(api) after sign-in and CalMeet.show() when the tab opens.
   Every change also posts a short comment on the meeting or task (node_id "mt:<id>" or "tk:<id>"), so the other team gets the normal
   bell + alert without any extra plumbing, and each item keeps a readable history. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const PRI = { high: 'High', medium: 'Medium', low: 'Low' };
  const STATUS = { open: 'Open', done: 'Awaiting confirmation', confirmed: 'Confirmed' };
  const MAX_FILE = 50 * 1024 * 1024;
  const IC = {
    plus: '<path d="M12 5v14M5 12h14"/>', up: '<path d="M12 16V5M7 10l5-5 5 5M4 20h16"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.3A8 8 0 1 1 21 12z"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>',
    sheet: '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M9.5 4v16M15 4v16M3.5 14.5h17"/>',
    clip: '<path d="M16 8l-6.5 6.5a2 2 0 0 0 2.8 2.8L19 10.5a4 4 0 0 0-5.7-5.7L6.5 11.6a6 6 0 0 0 8.5 8.5L20 15"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>', cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'
  };
  const sv = (k, c) => `<svg class="${c || 'si'}" viewBox="0 0 24 24">${IC[k]}</svg>`;
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = () => ymd(new Date());
  const parseYmd = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const fmt = (s, o) => { const d = parseYmd(s); return d ? d.toLocaleDateString(undefined, o || { day: 'numeric', month: 'short', year: 'numeric' }) : ''; };
  const dateOf = (ts) => (ts ? new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '');
  const mb = (n) => (n >= 1048576 ? (n / 1048576).toFixed(n >= 10485760 ? 0 : 1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const extOf = (n) => ((n || '').includes('.') ? n.split('.').pop() : '').toLowerCase();
  const kindOf = (f) => {
    const e = extOf(f.fileName), m = (f.mime || '').toLowerCase();
    if (e === 'pdf' || m === 'application/pdf') return 'pdf';
    if (/^image\//.test(m) || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp'].includes(e)) return 'image';
    if (['csv', 'tsv'].includes(e)) return 'csv';
    if (['xlsx', 'xlsm', 'xls', 'ods'].includes(e)) return 'sheet';
    if (e === 'docx') return 'docx';
    if (['txt', 'md', 'json', 'log', 'xml', 'yml', 'yaml'].includes(e) || /^text\//.test(m)) return 'text';
    return 'other';
  };
  const extClass = (f) => ({ pdf: 'pdf', image: 'img', csv: 'xls', sheet: 'xls', docx: 'doc', text: 'txt', other: 'oth' }[kindOf(f)]);
  const extLabel = (f) => (extOf(f.fileName) || 'file').slice(0, 4);

  let api = null, meetings = [], mfiles = [], tasks = [], visible = false;
  let tab = 'meetings', cal = { y: new Date().getFullYear(), m: new Date().getMonth() }, selDate = null, disc = null;
  let filter = 'all', query = '', editTask = null, sortDesc = false, busy = false, prevUrls = [];
  const nowCal = () => { const d = new Date(); cal = { y: d.getFullYear(), m: d.getMonth() }; };
  const me = () => api.profile();
  const isSandbox = () => !!me() && me().team === 'sandbox';
  const isLive = () => !!me() && me().team === 'liveroom';
  const esc = (s) => api.esc(s);
  const meetingOf = (id) => meetings.find((x) => x.id === id);
  const taskOf = (id) => tasks.find((x) => x.id === id);
  const commentsOf = (node) => api.S().comments.filter((c) => c.nodeId === node);
  const note = (node, body) => api.store.addComment(me(), { nodeId: node, body, kind: 'comment' });
  const parseNode = (n) => { const m = /^(mt|tk):(.+)$/.exec(n || ''); return m ? { k: m[1], id: m[2] } : null; };

  /* ---------------- rows pasted from Excel / Google Sheets or read from a CSV ---------------- */
  function splitCsv(line) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur); return out;
  }
  const normDue = (v) => { v = (v || '').trim(); if (!v) return ''; if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; const t = Date.parse(v); return Number.isNaN(t) ? '' : ymd(new Date(t)); };
  function parseRows(text) {
    const lines = String(text || '').replace(/\r/g, '').split('\n').filter((l) => l.trim());
    const tabbed = lines.some((l) => l.includes('\t'));
    let rows = lines.map((l) => (tabbed ? l.split('\t') : splitCsv(l)).map((c) => c.trim()));
    if (rows.length && /^(task|item|title|issue|description|requirement)$/i.test(rows[0][0] || '')) rows = rows.slice(1);
    return rows.map((c) => {
      const pr = (c[1] || '').trim();
      return { title: (c[0] || '').slice(0, 300), priority: /^h/i.test(pr) ? 'high' : /^l/i.test(pr) ? 'low' : 'medium', due: normDue(c[2]), notes: (c[3] || '').slice(0, 2000) };
    }).filter((r) => r.title);
  }

  /* ---------------- data ---------------- */
  async function refresh() {
    if (!api) return;
    try { [meetings, mfiles, tasks] = await Promise.all([api.store.listMeetings(), api.store.listMeetingFiles(), api.store.listTasks()]); } catch (e) { meetings = meetings || []; mfiles = mfiles || []; tasks = tasks || []; }
    badge();
    if (visible) render();
  }
  function badge() {
    const b = $('#switch [data-v="mt"] .swb'); if (!b) return;
    const n = isSandbox() ? tasks.filter((i) => i.status === 'done').length : 0;
    b.hidden = !n; b.textContent = n; b.title = n ? `${n} task${n > 1 ? 's' : ''} waiting for your confirmation` : '';
  }

  /* ---------------- shared header ---------------- */
  const taskCounts = () => { const c = { open: 0, done: 0, confirmed: 0 }; tasks.forEach((i) => { c[i.status]++; }); return c; };
  function head() {
    const c = taskCounts();
    const sub = tab === 'meetings'
      ? (isSandbox() ? 'Record what was discussed after each meeting and attach the files. Liveroom can read everything and reply, but cannot change it.' : 'What Sandbox and Liveroom discussed in each meeting, with the files shared. You can read, preview and reply.')
      : (isSandbox() ? 'Add tasks for Liveroom. They tick a task when it is done, and you confirm it to close it.' : 'Tasks from Sandbox. Tick a task when you have finished it, and Sandbox will confirm it.');
    let acts = '';
    if (tab === 'meetings') acts = isSandbox() ? `<button class="btn primary" data-mt="newm">${sv('plus')} New meeting</button>` : '';
    else acts = `${isSandbox() ? `<button class="btn ghost" data-mt="paste">${sv('sheet')} Paste from Excel</button>` : ''}<button class="btn ghost" data-mt="export">${sv('dl')} Export CSV</button>`;
    const call = isSandbox() && c.done ? `<button class="tk-call" data-mt="review">${sv('check')}<span><b>${c.done} task${c.done > 1 ? 's' : ''} waiting for your confirmation</b><small>Liveroom has ticked ${c.done > 1 ? 'them' : 'it'} as done. Review and confirm.</small></span><em>Review</em></button>` : '';
    const open = c.open + c.done;
    return `<div class="vhead"><div><h1>Meetings</h1><p>${sub}</p></div><div class="vact">${acts}</div></div>
      <div class="mt-wrap">${call}<div class="mt-seg" role="tablist"><button role="tab" data-mt="tab" data-t="meetings" class="${tab === 'meetings' ? 'on' : ''}">${sv('cal')} Meetings<b>${meetings.length}</b></button><button role="tab" data-mt="tab" data-t="tasks" class="${tab === 'tasks' ? 'on' : ''}">${sv('check')} Tasks<b>${open}</b></button></div>`;
  }

  /* ---------------- meetings: calendar + list ---------------- */
  function calendar() {
    const { y, m } = cal, lead = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), today = todayStr();
    const counts = {}; meetings.forEach((x) => { counts[x.date] = (counts[x.date] || 0) + 1; });
    let cells = ''; for (let i = 0; i < lead; i++) cells += '<span class="mt-day off"></span>';
    for (let d = 1; d <= days; d++) {
      const s = `${y}-${pad(m + 1)}-${pad(d)}`, n = counts[s] || 0;
      cells += `<button class="mt-day ${n ? 'has' : ''} ${s === today ? 'today' : ''} ${s === selDate ? 'sel' : ''}" data-mt="day" data-d="${s}" title="${n ? n + ' meeting' + (n > 1 ? 's' : '') : 'No meetings'}"><span>${d}</span>${n ? '<i></i>' : ''}</button>`;
    }
    const inMonth = meetings.filter((x) => x.date && x.date.startsWith(`${y}-${pad(m + 1)}`)).length;
    return `<aside class="mt-cal"><div class="mt-calh"><button class="tk-ic" data-mt="prev" aria-label="Previous month">${sv('left')}</button><b>${new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b><button class="tk-ic" data-mt="next" aria-label="Next month">${sv('right')}</button></div>
      <div class="mt-wk"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div><div class="mt-days">${cells}</div>
      <div class="mt-calf"><span>${inMonth} meeting${inMonth === 1 ? '' : 's'} this month</span><span><button class="btn ghost sm" data-mt="today">Today</button>${selDate ? '<button class="btn ghost sm" data-mt="all">Show all</button>' : ''}</span></div></aside>`;
  }
  function fileChip(f) {
    return `<span class="mt-chip"><button class="mt-fbtn" data-mt="fopen" data-id="${esc(f.id)}" title="Preview ${esc(f.fileName)}"><span class="mt-ext ${extClass(f)}">${esc(extLabel(f))}</span><span class="mt-fn">${esc(f.fileName)}</span><small>${mb(f.size)}</small></button>
      <button class="mt-fx" data-mt="fdl" data-id="${esc(f.id)}" title="Download" aria-label="Download">${sv('dl')}</button>${isSandbox() ? `<button class="mt-fx danger" data-mt="fdel" data-id="${esc(f.id)}" title="Remove" aria-label="Remove">${sv('x')}</button>` : ''}</span>`;
  }
  function meetingCard(m) {
    const node = `mt:${m.id}`, cc = commentsOf(node), oi = cc.filter((c) => c.kind === 'issue' && !c.resolved).length, fl = mfiles.filter((f) => f.meetingId === m.id);
    const d = parseYmd(m.date);
    return `<article class="mt-card ${selDate === m.date ? '' : ''}" data-id="${esc(m.id)}"><div class="mt-date"><b>${d ? d.getDate() : ''}</b><span>${d ? d.toLocaleDateString(undefined, { month: 'short' }) : ''}</span></div>
      <div class="mt-body"><div class="mt-top"><div><h3>${esc(m.title)}</h3><small>${fmt(m.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${api.teamBadge(m.team)}</small></div>
        <div class="mt-act">${isSandbox() ? `<button class="tk-ic" data-mt="medit" data-id="${esc(m.id)}" title="Edit">${sv('edit')}</button><button class="tk-ic danger" data-mt="mdel" data-id="${esc(m.id)}" title="Delete">${sv('trash')}</button>` : ''}</div></div>
        ${m.notes ? `<div class="mt-notes">${esc(m.notes)}</div>` : `<div class="mt-notes none">${isSandbox() ? 'No notes yet. Use Edit to add what was discussed.' : 'No notes were added.'}</div>`}
        <div class="mt-files">${fl.map(fileChip).join('')}${isSandbox() ? `<button class="btn ghost sm" data-mt="fadd" data-id="${esc(m.id)}">${sv('clip')} Add files</button>` : ''}${!fl.length && !isSandbox() ? '<span class="mt-nofile">No files attached</span>' : ''}</div>
        <div class="mt-foot"><button class="btn ghost sm ${disc === node ? 'on' : ''}" data-mt="disc" data-node="${esc(node)}">${sv('chat')} Discussion${cc.length ? ` <b class="mt-n">${cc.length}</b>` : ''}${oi ? '<i class="udot"></i>' : ''}</button></div>
        ${disc === node ? discussion(node) : ''}</div></article>`;
  }
  function discussion(node) {
    const cc = commentsOf(node);
    return `<div class="mt-disc"><div class="tk-thread">${cc.map((m) => api.msgHtml(m)).join('') || '<div class="empty">No messages yet. Start the conversation below.</div>'}</div>
      <div class="tk-compose"><textarea id="mt-msg" data-node="${esc(node)}" placeholder="Write a message to ${isSandbox() ? 'Liveroom' : 'Sandbox'}…"></textarea><button class="btn primary sm" data-mt="send" data-node="${esc(node)}">Send</button></div></div>`;
  }
  function meetingsPanel() {
    const list = selDate ? meetings.filter((x) => x.date === selDate) : meetings;
    const title = selDate ? `${fmt(selDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : 'All meetings';
    let body;
    if (list.length) body = list.map(meetingCard).join('');
    else if (selDate) body = `<div class="mt-empty"><b>No meetings on this day</b>${isSandbox() ? `<button class="btn primary sm" data-mt="newm">${sv('plus')} Add a meeting for this day</button>` : '<span>Pick another day on the calendar.</span>'}</div>`;
    else body = `<div class="mt-empty"><b>${isSandbox() ? 'No meetings recorded yet' : 'Nothing here yet'}</b><span>${isSandbox() ? 'After a meeting, add the date, what was discussed and any files.' : 'Sandbox has not recorded a meeting yet.'}</span>${isSandbox() ? `<button class="btn primary sm" data-mt="newm">${sv('plus')} New meeting</button>` : ''}</div>`;
    return `<div class="mt-grid">${calendar()}<section class="mt-list"><h2>${esc(title)}<small>${list.length} meeting${list.length === 1 ? '' : 's'}</small></h2>${body}</section></div>`;
  }

  /* ---------------- tasks: spreadsheet-like list ---------------- */
  function visibleTasks() {
    const q = query.trim().toLowerCase();
    let list = tasks.filter((i) => (filter === 'all' || i.status === filter) && (!q || (i.title + ' ' + i.notes).toLowerCase().includes(q)));
    if (sortDesc) list = list.slice().reverse();
    return list;
  }
  function taskStats() {
    const c = taskCounts(), total = tasks.length, pct = total ? Math.round(c.confirmed / total * 100) : 0;
    return `<div class="tk-stats"><div class="tk-st"><b>${c.open}</b><span>Open</span></div><div class="tk-st amber"><b>${c.done}</b><span>Awaiting confirmation</span></div><div class="tk-st green"><b>${c.confirmed}</b><span>Confirmed</span></div>
      <div class="tk-prog"><div class="tk-bar"><i style="width:${pct}%"></i></div><span>${pct}% complete · ${c.confirmed} of ${total}</span></div></div>`;
  }
  function taskFilters() {
    const c = taskCounts(), tabs = [['all', 'All', tasks.length], ['open', 'Open', c.open], ['done', 'Awaiting confirmation', c.done], ['confirmed', 'Confirmed', c.confirmed]];
    return `<div class="tk-filters"><div class="tk-tabs">${tabs.map(([k, l, n]) => `<button data-mt="filter" data-f="${k}" class="${filter === k ? 'on' : ''}">${l}<b>${n}</b></button>`).join('')}</div>
      <div class="tk-tools"><input id="tk-q" type="search" placeholder="Search tasks" value="${esc(query)}" aria-label="Search tasks"></div></div>`;
  }
  const priOptions = (cur) => Object.keys(PRI).map((k) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${PRI[k]}</option>`).join('');
  function tickCell(it) {
    const checked = it.status !== 'open', locked = it.status === 'confirmed';
    if (isLive()) return `<label class="tk-tick ${checked ? 'on' : ''} ${locked ? 'lock' : ''}" title="${locked ? 'Confirmed by Sandbox' : checked ? 'Untick to move it back to open' : 'Tick when this is done'}"><input type="checkbox" data-mt="tick" data-id="${esc(it.id)}" ${checked ? 'checked' : ''} ${locked ? 'disabled' : ''}><span>${sv('check')}</span></label>`;
    return `<span class="tk-tick ro ${checked ? 'on' : ''}" title="Liveroom ticks tasks when they are done">${checked ? `<span>${sv('check')}</span>` : '<span></span>'}</span>`;
  }
  function statusCell(it) {
    let sub = '';
    if (it.status === 'done') sub = `<small>${esc(it.doneBy)} · ${dateOf(it.doneTs)}</small>`;
    if (it.status === 'confirmed') sub = `<small>${esc(it.confirmBy)} · ${dateOf(it.confirmTs)}</small>`;
    return `<span class="tk-badge ${it.status}">${STATUS[it.status]}</span>${sub}`;
  }
  function taskActions(it) {
    const node = `tk:${it.id}`, cc = commentsOf(node), oi = cc.filter((c) => c.kind === 'issue' && !c.resolved).length;
    let h = `<button class="tk-ic ${disc === node ? 'on' : ''}" data-mt="disc" data-node="${esc(node)}" title="Discussion">${sv('chat')}${cc.length ? `<b>${cc.length}</b>` : ''}${oi ? '<i class="udot"></i>' : ''}</button>`;
    if (isSandbox()) {
      if (it.status === 'done') h = `<button class="btn sm tk-confirm" data-mt="confirm" data-id="${esc(it.id)}">${sv('check')} Confirm</button><button class="btn ghost sm" data-mt="reopen" data-id="${esc(it.id)}" title="Needs more work">${sv('undo')} Reopen</button>` + h;
      else if (it.status === 'confirmed') h = `<button class="btn ghost sm" data-mt="reopen" data-id="${esc(it.id)}" title="Open it again">${sv('undo')} Reopen</button>` + h;
      h += `<button class="tk-ic" data-mt="tedit" data-id="${esc(it.id)}" title="Edit">${sv('edit')}</button><button class="tk-ic danger" data-mt="tdel" data-id="${esc(it.id)}" title="Delete">${sv('trash')}</button>`;
    }
    return h;
  }
  const dueCell = (it) => { if (!it.due) return '<span class="tk-nodue">None</span>'; const late = it.status === 'open' && it.due < todayStr(); return `<span class="tk-due ${late ? 'late' : ''}">${fmt(it.due, { day: 'numeric', month: 'short' })}${late ? ' · overdue' : ''}</span>`; };
  function taskRow(it) {
    const node = `tk:${it.id}`, cls = `tk-row s-${it.status} ${disc === node ? 'open' : ''}`;
    if (editTask === it.id && isSandbox()) {
      return `<tr class="${cls} editing"><td class="tk-c-tick"></td><td class="tk-c-n">${it.seq}</td>
        <td data-l="Task"><input class="tk-in" id="ed-title" value="${esc(it.title)}" maxlength="300"><textarea class="tk-in" id="ed-notes" maxlength="2000" placeholder="Notes (optional)">${esc(it.notes)}</textarea></td>
        <td data-l="Priority"><select class="tk-in" id="ed-pri">${priOptions(it.priority)}</select></td><td data-l="Due"><input class="tk-in" id="ed-due" type="date" value="${esc(it.due || '')}"></td>
        <td></td><td></td><td class="tk-c-act"><button class="btn sm" data-mt="tsave" data-id="${esc(it.id)}">${sv('check')} Save</button><button class="btn ghost sm" data-mt="tcancel">Cancel</button></td></tr>`;
    }
    const thread = disc === node ? `<tr class="tk-disc"><td></td><td></td><td colspan="6">${discussion(node)}</td></tr>` : '';
    return `<tr class="${cls}" data-id="${esc(it.id)}"><td class="tk-c-tick">${tickCell(it)}</td><td class="tk-c-n">${it.seq}</td>
      <td data-l="Task" class="tk-c-item"><b>${esc(it.title)}</b>${it.notes ? `<p>${esc(it.notes)}</p>` : ''}</td>
      <td data-l="Priority"><span class="tk-pri ${it.priority}">${PRI[it.priority]}</span></td><td data-l="Due">${dueCell(it)}</td>
      <td data-l="Added" class="tk-c-by">${api.teamBadge(it.team)}<small>${dateOf(it.ts)}</small></td><td data-l="Status" class="tk-c-st">${statusCell(it)}</td><td class="tk-c-act">${taskActions(it)}</td></tr>${thread}`;
  }
  function addRow() {
    if (!isSandbox()) return '';
    return `<tr class="tk-add"><td></td><td class="tk-c-n">${sv('plus')}</td><td data-l="Task"><input id="tk-new" class="tk-in" maxlength="300" placeholder="Type a task and press Enter to add it" autocomplete="off"></td>
      <td data-l="Priority"><select id="tk-new-pri" class="tk-in">${priOptions('medium')}</select></td><td data-l="Due"><input id="tk-new-due" class="tk-in" type="date"></td><td></td><td></td><td class="tk-c-act"><button class="btn sm" data-mt="tadd">${sv('plus')} Add</button></td></tr>`;
  }
  function tasksPanel() {
    const list = visibleTasks();
    const empty = !tasks.length ? `<tr><td colspan="8" class="tk-empty"><b>${isSandbox() ? 'No tasks yet' : 'Nothing here yet'}</b><span>${isSandbox() ? 'Type the first task below, paste rows from Excel, or import a CSV file.' : 'Sandbox has not added any tasks yet.'}</span></td></tr>` : (!list.length ? '<tr><td colspan="8" class="tk-empty"><b>No tasks match</b><span>Try a different filter.</span></td></tr>' : '');
    return `${taskStats()}${taskFilters()}<div class="tk-sheet"><table class="tk-table"><thead><tr><th class="tk-c-tick"></th><th class="tk-c-n"><button data-mt="sort" title="Reverse the order">#</button></th><th>Task</th><th>Priority</th><th>Due</th><th>Added</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map(taskRow).join('')}${empty}${addRow()}</tbody></table></div>`;
  }

  function render() {
    if (!api || !visible) return;
    const v = $('#mt-view'), ae = document.activeElement, keep = {
      sc: v.scrollTop, nw: ($('#tk-new') || {}).value || '', due: ($('#tk-new-due') || {}).value || '', pri: ($('#tk-new-pri') || {}).value, msg: ($('#mt-msg') || {}).value || '', msgNode: $('#mt-msg') ? $('#mt-msg').dataset.node : '',
      focus: ae && ae.id, ed: { t: ($('#ed-title') || {}).value, n: ($('#ed-notes') || {}).value }
    };
    v.innerHTML = head() + (tab === 'meetings' ? meetingsPanel() : tasksPanel()) + '</div>';
    const set = (id, val) => { const e = $('#' + id); if (e && val != null && val !== '') e.value = val; };
    set('tk-new', keep.nw); set('tk-new-due', keep.due); set('tk-new-pri', keep.pri);
    const mg = $('#mt-msg'); if (mg && keep.msgNode === mg.dataset.node) mg.value = keep.msg;
    if (keep.ed.t != null && $('#ed-title')) { $('#ed-title').value = keep.ed.t; $('#ed-notes').value = keep.ed.n || ''; }
    if (keep.focus && ['tk-new', 'mt-msg', 'tk-q', 'ed-title'].includes(keep.focus) && $('#' + keep.focus)) { const f = $('#' + keep.focus); f.focus(); try { f.setSelectionRange(f.value.length, f.value.length); } catch (e) { /* ignore */ } }
    v.scrollTop = keep.sc;
    if (disc) api.markNodeSeen(disc);
  }

  /* ---------------- actions ---------------- */
  const run = (fn) => api.guard(async () => { await fn(); await api.reload(); await refresh(); });
  const setupHint = (m) => (/meeting|relation|schema cache|bucket|row-level/i.test(m) ? 'This needs a one-time setup: run supabase/meetings.sql (see SETUP.md)' : m);

  async function uploadTo(meetingId, fileList) {
    const files = [...(fileList || [])]; if (!files.length || busy) return [];
    busy = true; api.toast(files.length > 1 ? `Uploading ${files.length} files…` : 'Uploading…');
    const done = [];
    for (const f of files) {
      if (f.size > MAX_FILE) { api.toast(`${f.name} is over 50 MB and was skipped`); continue; }
      try { await api.store.addMeetingFile(me(), { file: f, meetingId }); done.push(f.name); } catch (e) { api.toast(setupHint(e.message || String(e))); break; }
    }
    busy = false; return done;
  }
  const fileNote = (names) => (names.length === 1 ? `Uploaded a file: ${names[0]}` : `Uploaded ${names.length} files: ${names.join(', ')}`);

  function openMeetingForm(id) {
    if (!isSandbox()) return;
    let d = $('#mt-form'); if (d) d.remove();
    const m = id ? meetingOf(id) : null, date = m ? m.date : (selDate || todayStr());
    d = document.createElement('section'); d.id = 'mt-form'; d.className = 'docup';
    d.innerHTML = `<div class="docup-card mt-formcard" role="dialog" aria-modal="true" aria-labelledby="mtf-h"><div class="up-head"><h2 id="mtf-h">${m ? 'Edit meeting' : 'New meeting'}</h2><button class="btn ghost icon-only" data-mtf="close" aria-label="Close">${sv('x')}</button></div>
      <div class="mtf-row"><label class="up-f">Date<input id="mtf-date" type="date" value="${esc(date)}"></label><label class="up-f mtf-t">Title<input id="mtf-title" type="text" maxlength="200" placeholder="e.g. Weekly sync, landing page review" value="${esc(m ? m.title : '')}"></label></div>
      <label class="up-f">What was discussed <span>(decisions, next steps)</span><textarea id="mtf-notes" maxlength="10000" rows="8" placeholder="Write the main points from this meeting…">${esc(m ? m.notes : '')}</textarea></label>
      ${m ? '' : `<div class="up-f">Files <span>(optional, any type: PDF, Word, Excel, CSV, images…)</span><label class="btn ghost sm mtf-pick" for="mtf-files">${sv('clip')} Choose files</label><input id="mtf-files" type="file" multiple hidden><div id="mtf-list" class="mtf-list"></div></div>`}
      <p class="login-err" id="mtf-err" role="alert"></p>
      <div class="up-row"><button class="btn ghost" data-mtf="close">Cancel</button><button class="btn primary" id="mtf-go">${m ? 'Save changes' : 'Save meeting'}</button></div></div>`;
    document.body.appendChild(d);
    let chosen = [];
    const fi = $('#mtf-files'); if (fi) fi.addEventListener('change', (e) => { chosen = [...chosen, ...e.target.files]; e.target.value = ''; $('#mtf-list').innerHTML = chosen.map((f, i) => `<span class="mtf-f">${esc(f.name)} <small>${mb(f.size)}</small><button data-mtf="rm" data-i="${i}" aria-label="Remove">${sv('x')}</button></span>`).join(''); });
    d.addEventListener('click', (e) => {
      if (e.target === d || e.target.closest('[data-mtf="close"]')) { d.remove(); return; }
      const rm = e.target.closest('[data-mtf="rm"]'); if (rm) { chosen.splice(+rm.dataset.i, 1); $('#mtf-list').innerHTML = chosen.map((f, i) => `<span class="mtf-f">${esc(f.name)} <small>${mb(f.size)}</small><button data-mtf="rm" data-i="${i}" aria-label="Remove">${sv('x')}</button></span>`).join(''); }
    });
    $('#mtf-title').focus();
    $('#mtf-go').addEventListener('click', async () => {
      const date2 = $('#mtf-date').value, title = $('#mtf-title').value.trim(), notes = $('#mtf-notes').value.trim(), err = $('#mtf-err');
      if (!date2) { err.textContent = 'Please pick the date of the meeting.'; return; }
      if (!title) { err.textContent = 'Please give the meeting a title.'; $('#mtf-title').focus(); return; }
      d.remove();
      await run(async () => {
        if (m) { await api.store.updateMeeting(me(), m.id, { date: date2, title, notes }); await note(`mt:${m.id}`, 'Updated the meeting notes.'); api.toast('Meeting updated'); }
        else {
          const made = await api.store.addMeeting(me(), { date: date2, title, notes });
          const names = await uploadTo(made.id, chosen);
          await note(`mt:${made.id}`, `Recorded this meeting${names.length ? ` and shared ${names.length} file${names.length > 1 ? 's' : ''}` : ''}.`);
          selDate = date2; const dd = parseYmd(date2); if (dd) cal = { y: dd.getFullYear(), m: dd.getMonth() };
          api.toast('Meeting saved');
        }
      });
    });
  }

  async function deleteMeeting(id) {
    const m = meetingOf(id); if (!m || !confirm('Delete this meeting, its files and its messages?')) return;
    await run(async () => {
      for (const f of mfiles.filter((x) => x.meetingId === id)) await api.store.deleteMeetingFile(f);
      await api.store.deleteMeeting(id);
      await Promise.all(api.S().comments.filter((c) => c.nodeId === `mt:${id}` && c.authorId === me().id).map((c) => api.store.deleteComment(c.id)));
    });
  }
  async function addFilesTo(id, list) {
    if (!isSandbox() || !meetingOf(id)) return;
    await run(async () => { const names = await uploadTo(id, list); if (names.length) { await note(`mt:${id}`, fileNote(names)); api.toast(names.length > 1 ? 'Files uploaded' : 'File uploaded'); } });
  }

  /* tasks */
  async function addTasks(rows, after) {
    const list = rows.filter((r) => r.title); if (!list.length) return;
    await run(async () => {
      const made = await api.store.addTasks(me(), list);
      if (made && made[0]) await note(`tk:${made[0].id}`, list.length === 1 ? 'New task added.' : `Added ${list.length} new tasks.`);
      api.toast(list.length === 1 ? 'Task added' : `${list.length} tasks added`);
    });
    if (after) after();
  }
  function addFromRow() {
    const t = ($('#tk-new') || {}).value || ''; if (!t.trim()) { const e = $('#tk-new'); if (e) e.focus(); return; }
    addTasks([{ title: t.trim(), priority: $('#tk-new-pri').value, due: $('#tk-new-due').value }], () => { const e = $('#tk-new'); if (e) { e.value = ''; e.focus(); } const dd = $('#tk-new-due'); if (dd) dd.value = ''; });
  }
  const tick = (id, on) => run(async () => { await api.store.setTaskStatus(me(), id, on ? 'done' : 'open'); await note(`tk:${id}`, on ? 'Marked as done. Waiting for Sandbox to confirm.' : 'Moved back to open.'); api.toast(on ? 'Marked as done. Sandbox will be notified.' : 'Moved back to open'); });
  const confirmTask = (id) => run(async () => { await api.store.setTaskStatus(me(), id, 'confirmed'); await note(`tk:${id}`, 'Confirmed. This task is complete.'); api.toast('Confirmed'); });
  const reopenTask = (id) => { disc = `tk:${id}`; return run(async () => { await api.store.setTaskStatus(me(), id, 'open'); await note(`tk:${id}`, 'Reopened. More work is needed.'); api.toast('Reopened'); }); };
  async function sendMsg(node) {
    const ta = $('#mt-msg'), v = ta ? ta.value.trim() : ''; if (!v) { if (ta) ta.focus(); return; }
    await run(async () => { await api.store.addComment(me(), { nodeId: node, body: v, kind: 'comment' }); ta.value = ''; });
  }
  function exportCsv() {
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"', d = (t) => (t ? new Date(t).toISOString().slice(0, 10) : '');
    const rows = [['#', 'Task', 'Notes', 'Priority', 'Due', 'Status', 'Added by', 'Added on', 'Done by', 'Done on', 'Confirmed by', 'Confirmed on']]
      .concat(tasks.map((i) => [i.seq, i.title, i.notes, PRI[i.priority], i.due, STATUS[i.status], i.team, d(i.ts), i.doneBy, d(i.doneTs), i.confirmBy, d(i.confirmTs)]));
    const blob = new Blob(['﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    saveBlob(blob, `tasks-${todayStr()}.csv`);
  }
  function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  function openPaste() {
    let d = $('#tk-paste'); if (d) d.remove();
    d = document.createElement('section'); d.id = 'tk-paste'; d.className = 'docup';
    d.innerHTML = `<div class="docup-card" role="dialog" aria-modal="true" aria-labelledby="tkp-h"><div class="up-head"><h2 id="tkp-h">Paste from Excel</h2><button class="btn ghost icon-only" data-tkp="close" aria-label="Close">${sv('x')}</button></div>
      <p class="tk-help">Copy rows in Excel or Google Sheets and paste them here, one task per row. Columns, in this order: <b>Task</b>, <b>Priority</b>, <b>Due date</b>, <b>Notes</b>. Only the first column is required.</p>
      <textarea id="tkp-text" class="tk-paste" placeholder="Fix the hero headline on mobile&#9;High&#9;2026-12-05&#10;Check FAQ answers&#9;Medium"></textarea>
      <div class="tkp-row"><label class="btn ghost sm" for="tkp-file">${sv('clip')} Import a CSV file</label><input id="tkp-file" type="file" accept=".csv,.tsv,.txt,text/csv" hidden><span id="tkp-count" class="tk-help">0 tasks found</span></div>
      <div class="up-row"><button class="btn ghost" data-tkp="close">Cancel</button><button class="btn primary" id="tkp-go" disabled>Add tasks</button></div></div>`;
    document.body.appendChild(d);
    const ta = $('#tkp-text'), upd = () => { const n = parseRows(ta.value).length; $('#tkp-count').textContent = `${n} task${n === 1 ? '' : 's'} found`; $('#tkp-go').disabled = !n; };
    ta.addEventListener('input', upd); ta.focus();
    $('#tkp-file').addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) { ta.value = await f.text(); upd(); } });
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-tkp="close"]')) d.remove(); });
    $('#tkp-go').addEventListener('click', async () => { const rows = parseRows(ta.value); d.remove(); await addTasks(rows); });
  }

  /* ---------------- file preview ---------------- */
  const libs = {};
  function loadLib(src, test) {
    if (test()) return Promise.resolve();
    if (!libs[src]) libs[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete libs[src]; rej(new Error('Could not load the preview tool. Check your connection.')); }; document.head.appendChild(s); });
    return libs[src].then(() => { if (!test()) throw new Error('Could not load the preview tool.'); });
  }
  const loadXlsx = () => loadLib('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js', () => !!window.XLSX);
  const loadMammoth = () => loadLib('https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js', () => !!window.mammoth);
  function tableHtml(rows) {
    const MAXR = 1000, MAXC = 40, cut = rows.length > MAXR, r = rows.slice(0, MAXR);
    const w = Math.min(MAXC, r.reduce((m, x) => Math.max(m, x.length), 0));
    const cell = (v, th) => `<${th ? 'th' : 'td'}>${esc(v == null ? '' : String(v))}</${th ? 'th' : 'td'}>`;
    const body = r.map((x, i) => `<tr><td class="rn">${i + 1}</td>${Array.from({ length: w }, (_, j) => cell(x[j], i === 0)).join('')}</tr>`).join('');
    return `<div class="mt-sheetwrap"><table class="mt-pt"><tbody>${body}</tbody></table></div>${cut ? `<p class="mt-pnote">Showing the first ${MAXR} rows. Download the file to see the rest.</p>` : ''}`;
  }
  const blankUrl = (blob) => { const u = URL.createObjectURL(blob); prevUrls.push(u); return u; };
  function closePreview() { const p = $('#mt-prev'); if (p) p.hidden = true; prevUrls.forEach((u) => URL.revokeObjectURL(u)); prevUrls = []; const b = $('#mt-prev .mtp-body'); if (b) b.innerHTML = ''; document.body.classList.remove('mt-prevopen'); }
  async function previewFile(id) {
    const f = mfiles.find((x) => x.id === id); if (!f) return;
    const p = $('#mt-prev'), body = $('.mtp-body', p); let cur = id;
    prevUrls.forEach((u) => URL.revokeObjectURL(u)); prevUrls = [];
    $('.mtp-title', p).innerHTML = `<span class="mt-ext ${extClass(f)}">${esc(extLabel(f))}</span><b>${esc(f.fileName)}</b><small>${mb(f.size)}</small>`;
    $('[data-mt="pdl"]', p).dataset.id = id;
    body.innerHTML = '<div class="mtp-msg"><span class="mtp-spin"></span>Loading preview…</div>'; p.hidden = false; document.body.classList.add('mt-prevopen');
    const fail = (msg) => { if (cur === id) body.innerHTML = `<div class="mtp-msg"><b>${esc(msg)}</b><span>You can still download the file.</span><button class="btn primary sm" data-mt="pdl" data-id="${esc(id)}">${sv('dl')} Download</button></div>`; };
    try {
      const raw = await api.store.meetingFileBlob(f), kind = kindOf(f);
      if (kind === 'pdf') body.innerHTML = `<iframe class="mtp-frame" title="${esc(f.fileName)}" src="${blankUrl(new Blob([raw], { type: 'application/pdf' }))}"></iframe>`;
      else if (kind === 'image') body.innerHTML = `<div class="mtp-img"><img alt="${esc(f.fileName)}" src="${blankUrl(new Blob([raw], { type: raw.type || 'image/' + (extOf(f.fileName) === 'svg' ? 'svg+xml' : extOf(f.fileName)) }))}"></div>`;
      else if (kind === 'csv') { const text = (await raw.slice(0, 3000000).text()).replace(/^﻿/, ''), tabbed = extOf(f.fileName) === 'tsv'; body.innerHTML = tableHtml(text.replace(/\r/g, '').split('\n').filter((l) => l.length).map((l) => (tabbed ? l.split('\t') : splitCsv(l)))); }
      else if (kind === 'text') { const text = await raw.slice(0, 300000).text(); body.innerHTML = `<pre class="mtp-text">${esc(text)}</pre>${raw.size > 300000 ? '<p class="mt-pnote">Showing the start of the file. Download it to see everything.</p>' : ''}`; }
      else if (kind === 'sheet') {
        await loadXlsx();
        const wb = window.XLSX.read(await raw.arrayBuffer(), { type: 'array' }), sheets = wb.SheetNames.map((n) => ({ name: n, rows: window.XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' }) }));
        if (cur !== id) return;
        const draw = (i) => { body.innerHTML = `${sheets.length > 1 ? `<div class="mt-sheettabs">${sheets.map((s, j) => `<button data-sh="${j}" class="${j === i ? 'on' : ''}">${esc(s.name)}</button>`).join('')}</div>` : ''}${tableHtml(sheets[i].rows)}`; $$('[data-sh]', body).forEach((b) => b.addEventListener('click', () => draw(+b.dataset.sh))); };
        draw(0);
      } else if (kind === 'docx') {
        await loadMammoth();
        const r = await window.mammoth.convertToHtml({ arrayBuffer: await raw.arrayBuffer() });
        if (cur !== id) return;
        const css = 'body{font:15px/1.65 Georgia,serif;color:#1a1a1a;background:#fff;margin:0;padding:34px 40px;max-width:820px}h1,h2,h3{font-family:Arial,sans-serif}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 9px}img{max-width:100%}';
        const frame = document.createElement('iframe'); frame.className = 'mtp-frame paper'; frame.setAttribute('sandbox', ''); frame.title = f.fileName; frame.srcdoc = `<!doctype html><meta charset="utf-8"><style>${css}</style>${r.value || '<p>This document has no text.</p>'}`;
        body.innerHTML = ''; body.appendChild(frame);
      } else fail(extOf(f.fileName) === 'doc' ? 'Old .doc files cannot be previewed. Save it as .docx or PDF to see it here.' : 'This file type has no live preview.');
    } catch (e) { fail(e.message || 'Could not open the file'); }
  }
  async function downloadFile(id) {
    const f = mfiles.find((x) => x.id === id); if (!f) return;
    try { saveBlob(await api.store.meetingFileBlob(f), f.fileName); } catch (e) { api.toast(e.message || 'Could not download the file'); }
  }

  /* ---------------- events ---------------- */
  function onClick(e) {
    const el = e.target.closest('[data-mt]'); if (!el || !api) return;
    const a = el.dataset.mt, id = el.dataset.id, node = el.dataset.node;
    switch (a) {
      case 'tab': tab = el.dataset.t; disc = null; editTask = null; render(); break;
      case 'review': tab = 'tasks'; filter = 'done'; render(); break;
      case 'day': selDate = selDate === el.dataset.d ? null : el.dataset.d; render(); break;
      case 'all': selDate = null; render(); break;
      case 'today': nowCal(); selDate = todayStr(); render(); break;
      case 'prev': cal = cal.m === 0 ? { y: cal.y - 1, m: 11 } : { y: cal.y, m: cal.m - 1 }; render(); break;
      case 'next': cal = cal.m === 11 ? { y: cal.y + 1, m: 0 } : { y: cal.y, m: cal.m + 1 }; render(); break;
      case 'newm': openMeetingForm(); break;
      case 'medit': openMeetingForm(id); break;
      case 'mdel': deleteMeeting(id); break;
      case 'fopen': previewFile(id); break;
      case 'fdl': case 'pdl': downloadFile(id); break;
      case 'fdel': { const f = mfiles.find((x) => x.id === id); if (f && confirm(`Remove ${f.fileName}?`)) run(() => api.store.deleteMeetingFile(f)); break; }
      case 'fadd': { const i = $('#mt-add'); if (i) { i.dataset.id = id; i.click(); } break; }
      case 'disc': disc = disc === node ? null : node; render(); if (disc) { const t = $('#mt-msg'); if (t) t.focus(); } break;
      case 'send': sendMsg(node); break;
      case 'filter': filter = el.dataset.f; render(); break;
      case 'sort': sortDesc = !sortDesc; render(); break;
      case 'tadd': addFromRow(); break;
      case 'tedit': editTask = id; render(); { const t = $('#ed-title'); if (t) t.focus(); } break;
      case 'tcancel': editTask = null; render(); break;
      case 'tsave': { const t = $('#ed-title').value.trim(); if (!t) { $('#ed-title').focus(); return; } const patch = { title: t, notes: $('#ed-notes').value.trim(), priority: $('#ed-pri').value, due: $('#ed-due').value }; editTask = null; run(() => api.store.updateTask(me(), id, patch)); break; }
      case 'tdel': if (confirm('Delete this task and its messages?')) run(async () => { await api.store.deleteTask(id); await Promise.all(api.S().comments.filter((c) => c.nodeId === `tk:${id}` && c.authorId === me().id).map((c) => api.store.deleteComment(c.id))); }); break;
      case 'confirm': confirmTask(id); break;
      case 'reopen': reopenTask(id); break;
      case 'paste': openPaste(); break;
      case 'export': exportCsv(); break;
      default: break;
    }
  }
  function bind() {
    const v = $('#mt-view'); if (!v || v._mt) return; v._mt = true;
    v.addEventListener('click', onClick);
    v.addEventListener('change', (e) => { if (e.target.matches('[data-mt="tick"]')) tick(e.target.dataset.id, e.target.checked); });
    v.addEventListener('input', (e) => { if (e.target.id === 'tk-q') { query = e.target.value; const pos = e.target.selectionStart; render(); const q = $('#tk-q'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } } });
    v.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'tk-new') { e.preventDefault(); addFromRow(); }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.id === 'mt-msg') { e.preventDefault(); sendMsg(e.target.dataset.node); }
      else if (e.key === 'Escape' && editTask) { editTask = null; render(); }
    });
    ['dragover', 'drop'].forEach((t) => v.addEventListener(t, (e) => {
      if (!isSandbox() || !e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
      const card = e.target.closest('.mt-card'); if (!card) return; e.preventDefault();
      if (t === 'drop') addFilesTo(card.dataset.id, e.dataTransfer.files);
    }));
    if (!$('#mt-add')) { const i = document.createElement('input'); i.type = 'file'; i.id = 'mt-add'; i.multiple = true; i.hidden = true; i.addEventListener('change', (e) => { const id = e.target.dataset.id, files = [...e.target.files]; e.target.value = ''; if (id && files.length) addFilesTo(id, files); }); document.body.appendChild(i); }
    if (!$('#mt-prev')) {
      const p = document.createElement('section'); p.id = 'mt-prev'; p.className = 'mt-prev'; p.hidden = true;
      p.innerHTML = `<div class="mtp-bar"><div class="mtp-title"></div><div class="mtp-acts"><button class="btn ghost sm" data-mt="pdl">${sv('dl')} Download</button><button class="btn ghost sm" data-mtp="close">${sv('x')} Close</button></div></div><div class="mtp-body"></div>`;
      p.addEventListener('click', (e) => { if (e.target.closest('[data-mtp="close"]')) closePreview(); else onClick(e); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !p.hidden) closePreview(); });
      document.body.appendChild(p);
    }
  }

  /* ---------------- public ---------------- */
  window.CalMeet = {
    init(a) { api = a; bind(); return refresh(); },
    show() { visible = true; refresh(); },
    hide() { visible = false; ['#tk-paste', '#mt-form'].forEach((s) => { const p = $(s); if (p) p.remove(); }); closePreview(); },
    onData() { if (api) refresh(); },
    isNode: (id) => /^(mt|tk):/.test(id || ''),
    nodeName(id) {
      const n = parseNode(id); if (!n) return 'Meetings';
      if (n.k === 'mt') { const m = meetingOf(n.id); return m ? `Meeting · ${m.title.length > 44 ? m.title.slice(0, 43) + '…' : m.title} (${fmt(m.date, { day: 'numeric', month: 'short' })})` : 'Meeting'; }
      const t = taskOf(n.id); return t ? `Task · #${t.seq} ${t.title.length > 44 ? t.title.slice(0, 43) + '…' : t.title}` : 'Task';
    },
    openNode(id) {
      const n = parseNode(id); if (!n) return;
      disc = id;
      if (n.k === 'mt') { tab = 'meetings'; const m = meetingOf(n.id); if (m) { selDate = m.date; const d = parseYmd(m.date); if (d) cal = { y: d.getFullYear(), m: d.getMonth() }; } }
      else { tab = 'tasks'; filter = 'all'; query = ''; }
      if (visible) { render(); const r = $(n.k === 'mt' ? `#mt-view .mt-card[data-id="${n.id}"]` : `#mt-view tr[data-id="${n.id}"]`); if (r) r.scrollIntoView({ block: 'center' }); }
    }
  };
})();
