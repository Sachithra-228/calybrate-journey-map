/* Meetings tab.
   MEETINGS: a calendar plus the notes of each meeting between the two teams (the meetings themselves happen in MS Teams).
     Sandbox picks a date, writes what was discussed, attaches files (PDF, Word, Excel, CSV, images, anything) and chooses to share the notes
     with both teams or keep them for Sandbox only. Liveroom sees the shared notes, can preview the files and reply, but cannot add or change anything.
   TASKS: Sandbox adds tasks (a title, a priority and optional screenshots). Liveroom ticks one when it is done, Sandbox is notified and confirms it.
   Discussions open in a side panel. Both lists export to CSV, and a slide-style report with a cover page can be saved as PDF.
   docs.js calls CalMeet.init(api) after sign-in and CalMeet.show() when the tab opens.
   Every change posts a short comment on the meeting or task (node_id "mt:<id>" or "tk:<id>"), so the other team gets the normal bell + alert
   without extra plumbing. Private notes never post anything. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const PRI = { high: 'High', medium: 'Medium', low: 'Low' };
  const STATUS = { open: 'Open', done: 'Awaiting confirmation', confirmed: 'Confirmed' };
  const MAX_FILE = 50 * 1024 * 1024;
  const IC = {
    plus: '<path d="M12 5v14M5 12h14"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.3A8 8 0 1 1 21 12z"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>',
    clip: '<path d="M16 8l-6.5 6.5a2 2 0 0 0 2.8 2.8L19 10.5a4 4 0 0 0-5.7-5.7L6.5 11.6a6 6 0 0 0 8.5 8.5L20 15"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    left: '<path d="M15 5l-7 7 7 7"/>', right: '<path d="M9 5l7 7-7 7"/>', cal: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', img: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5"/>',
    down: '<path d="M6 9l6 6 6-6"/>'
  };
  const sv = (k, c) => `<svg class="${c || 'si'}" viewBox="0 0 24 24">${IC[k]}</svg>`;
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = () => ymd(new Date());
  const parseYmd = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const fmt = (s, o) => { const d = parseYmd(s); return d ? d.toLocaleDateString(undefined, o || { day: 'numeric', month: 'short', year: 'numeric' }) : ''; };
  const LONG = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
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

  const freshDraft = () => ({ title: '', notes: '', vis: 'both', date: '', files: [] });
  let api = null, meetings = [], mfiles = [], tasks = [], visible = false, started = false;
  let tab = 'meetings', cal = { y: new Date().getFullYear(), m: new Date().getMonth() }, selDate = null, disc = null;
  let filter = 'all', query = '', editTask = null, sortDesc = false, busy = false, prevUrls = [], editMeet = null, exportOpen = false, draft = freshDraft(), taskImgs = [];
  const thumbP = new Map(), thumbUrl = new Map();
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
  const shared = (m) => m.visibility !== 'sandbox';
  const filesOfMeeting = (id) => mfiles.filter((f) => f.meetingId === id);
  const filesOfTask = (id) => mfiles.filter((f) => f.taskId === id);

  /* ---------------- data ---------------- */
  async function refresh() {
    if (!api) return;
    try {
      const [m, f, t] = await Promise.all([api.store.listMeetings(), api.store.listMeetingFiles(), api.store.listTasks()]);
      meetings = isSandbox() ? m : m.filter(shared);
      const ids = new Set(meetings.map((x) => x.id));
      mfiles = f.filter((x) => x.taskId || ids.has(x.meetingId)); tasks = t;
    } catch (e) { meetings = meetings || []; mfiles = mfiles || []; tasks = tasks || []; }
    if (!started) { started = true; selDate = isSandbox() ? todayStr() : null; }
    badge();
    if (visible) render();
  }
  function badge() {
    const b = $('#switch [data-v="mt"] .swb'); if (!b) return;
    const n = isSandbox() ? tasks.filter((i) => i.status === 'done').length : 0;
    b.hidden = !n; b.textContent = n; b.title = n ? `${n} task${n > 1 ? 's' : ''} waiting for your confirmation` : '';
  }
  const taskCounts = () => { const c = { open: 0, done: 0, confirmed: 0 }; tasks.forEach((i) => { c[i.status]++; }); return c; };

  /* ---------------- header ---------------- */
  function head() {
    const c = taskCounts();
    const sub = tab === 'meetings'
      ? (isSandbox() ? 'Pick a date, then write what was discussed. Share the notes with Liveroom or keep them to yourself.' : 'Notes from the meetings between Sandbox and Liveroom. You can read them, open the files and reply.')
      : (isSandbox() ? 'Add tasks for Liveroom, with a screenshot if it helps. They tick a task when it is done and you confirm it.' : 'Tasks from Sandbox. Tick a task when you have finished it, and Sandbox will confirm it.');
    const menu = exportOpen ? `<div class="mt-menu" role="menu"><button role="menuitem" data-mt="exp" data-k="report"><b>Report with cover page</b><small>Slide-style pages. Save as PDF.</small></button><button role="menuitem" data-mt="exp" data-k="tasks"><b>Tasks</b><small>CSV spreadsheet</small></button><button role="menuitem" data-mt="exp" data-k="meetings"><b>Meeting notes</b><small>CSV spreadsheet</small></button></div>` : '';
    const call = isSandbox() && c.done ? `<button class="tk-call" data-mt="review">${sv('check')}<span><b>${c.done} task${c.done > 1 ? 's' : ''} waiting for your confirmation</b><small>Liveroom has ticked ${c.done > 1 ? 'them' : 'it'} as done. Review and confirm.</small></span><em>Review</em></button>` : '';
    return `<div class="vhead"><div><h1>Meetings</h1><p>${sub}</p></div><div class="vact"><div class="mt-menuwrap"><button class="btn ghost" data-mt="export" aria-haspopup="menu" aria-expanded="${exportOpen}">${sv('dl')} Export ${sv('down', 'si sm')}</button>${menu}</div></div></div>
      <div class="mt-wrap">${call}<div class="mt-seg" role="tablist"><button role="tab" data-mt="tab" data-t="meetings" class="${tab === 'meetings' ? 'on' : ''}">${sv('cal')} Meetings<b>${meetings.length}</b></button><button role="tab" data-mt="tab" data-t="tasks" class="${tab === 'tasks' ? 'on' : ''}">${sv('check')} Tasks<b>${c.open + c.done}</b></button></div>`;
  }

  /* ---------------- meetings: calendar, notes composer, list ---------------- */
  function calendar() {
    const { y, m } = cal, lead = (new Date(y, m, 1).getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), today = todayStr();
    const counts = {}; meetings.forEach((x) => { counts[x.date] = (counts[x.date] || 0) + 1; });
    let cells = ''; for (let i = 0; i < lead; i++) cells += '<span class="mt-day off"></span>';
    for (let d = 1; d <= days; d++) {
      const s = `${y}-${pad(m + 1)}-${pad(d)}`, n = counts[s] || 0;
      cells += `<button class="mt-day ${n ? 'has' : ''} ${s === today ? 'today' : ''} ${s === selDate ? 'sel' : ''}" data-mt="day" data-d="${s}" title="${n ? n + ' meeting' + (n > 1 ? 's' : '') : 'No notes'}"><span>${d}</span>${n ? '<i></i>' : ''}</button>`;
    }
    const inMonth = meetings.filter((x) => x.date && x.date.startsWith(`${y}-${pad(m + 1)}`)).length;
    return `<aside class="mt-cal"><div class="mt-calh"><button class="tk-ic" data-mt="prev" aria-label="Previous month">${sv('left')}</button><b>${new Date(y, m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b><button class="tk-ic" data-mt="next" aria-label="Next month">${sv('right')}</button></div>
      <div class="mt-wk"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div><div class="mt-days">${cells}</div>
      <div class="mt-calf"><span>${inMonth} meeting${inMonth === 1 ? '' : 's'} this month</span><span><button class="btn ghost sm" data-mt="today">Today</button>${selDate ? '<button class="btn ghost sm" data-mt="all">Show all</button>' : ''}</span></div></aside>`;
  }
  function fileChip(f, canDelete) {
    return `<span class="mt-chip"><button class="mt-fbtn" data-mt="fopen" data-id="${esc(f.id)}" title="Preview ${esc(f.fileName)}"><span class="mt-ext ${extClass(f)}">${esc(extLabel(f))}</span><span class="mt-fn">${esc(f.fileName)}</span><small>${mb(f.size)}</small></button>
      <button class="mt-fx" data-mt="fdl" data-id="${esc(f.id)}" title="Download" aria-label="Download">${sv('dl')}</button>${canDelete ? `<button class="mt-fx danger" data-mt="fdel" data-id="${esc(f.id)}" title="Remove" aria-label="Remove">${sv('x')}</button>` : ''}</span>`;
  }
  const draftChips = () => draft.files.map((f, i) => `<span class="mtf-f">${esc(f.name)} <small>${mb(f.size)}</small><button data-mt="dfrm" data-i="${i}" aria-label="Remove ${esc(f.name)}">${sv('x')}</button></span>`).join('');
  function composer(m) {
    const d = draft, existing = m ? filesOfMeeting(m.id) : [];
    return `<section class="mt-comp ${m ? 'editing' : ''}" data-id="${m ? esc(m.id) : ''}"><div class="mt-comph"><b>${m ? 'Edit notes' : `Notes for ${esc(fmt(selDate, LONG))}`}</b>${m ? `<input id="mtc-date" class="mt-in sm" type="date" value="${esc(d.date)}" aria-label="Date">` : '<small>after your meeting on MS Teams</small>'}</div>
      <input id="mtc-title" class="mt-in" maxlength="200" placeholder="Meeting title (optional), e.g. Weekly sync" value="${esc(d.title)}">
      <textarea id="mtc-notes" class="mt-in" rows="6" maxlength="10000" placeholder="What did we discuss? Decisions, next steps…">${esc(d.notes)}</textarea>
      ${existing.length ? `<div class="mt-files">${existing.map((f) => fileChip(f, true)).join('')}</div>` : ''}
      <div class="mt-compf"><div class="mt-vis" role="radiogroup" aria-label="Who can see these notes"><span>Share with</span><button type="button" role="radio" aria-checked="${d.vis === 'both'}" data-mt="vis" data-v="both" class="${d.vis === 'both' ? 'on' : ''}">Both teams</button><button type="button" role="radio" aria-checked="${d.vis === 'sandbox'}" data-mt="vis" data-v="sandbox" class="${d.vis === 'sandbox' ? 'on' : ''}">${sv('lock')} Only me</button></div>
        <div class="mt-compfiles"><label class="btn ghost sm" for="mtc-files">${sv('clip')} Attach files</label><input id="mtc-files" type="file" multiple hidden>${draftChips()}</div></div>
      <div class="mt-compact"><small>${d.vis === 'both' ? 'Liveroom will see these notes and can reply.' : 'Only Sandbox can see these notes.'}</small><span>${m ? '<button class="btn ghost" data-mt="mcancel">Cancel</button>' : ''}<button class="btn primary" data-mt="msave">${sv('check')} ${m ? 'Save changes' : 'Save notes'}</button></span></div></section>`;
  }
  function meetingCard(m) {
    if (editMeet === m.id && isSandbox()) return composer(m);
    const node = `mt:${m.id}`, cc = commentsOf(node), oi = cc.filter((c) => c.kind === 'issue' && !c.resolved).length, fl = filesOfMeeting(m.id), d = parseYmd(m.date);
    return `<article class="mt-card" data-id="${esc(m.id)}"><div class="mt-date"><b>${d ? d.getDate() : ''}</b><span>${d ? d.toLocaleDateString(undefined, { month: 'short' }) : ''}</span></div>
      <div class="mt-body"><div class="mt-top"><div><h3>${esc(m.title)}</h3><small>${fmt(m.date, LONG)} · ${api.teamBadge(m.team)}${shared(m) ? '' : ` <span class="mt-priv" title="Only Sandbox can see this">${sv('lock')} Only Sandbox</span>`}</small></div>
        <div class="mt-act">${isSandbox() ? `<button class="tk-ic" data-mt="medit" data-id="${esc(m.id)}" title="Edit">${sv('edit')}</button><button class="tk-ic danger" data-mt="mdel" data-id="${esc(m.id)}" title="Delete">${sv('trash')}</button>` : ''}</div></div>
        ${m.notes ? `<div class="mt-notes">${esc(m.notes)}</div>` : `<div class="mt-notes none">No notes were added.</div>`}
        ${fl.length || isSandbox() ? `<div class="mt-files">${fl.map((f) => fileChip(f, isSandbox())).join('')}${isSandbox() ? `<button class="btn ghost sm" data-mt="fadd" data-id="${esc(m.id)}">${sv('clip')} Add files</button>` : ''}</div>` : ''}
        ${shared(m) ? `<div class="mt-foot"><button class="btn ghost sm ${disc === node ? 'on' : ''}" data-mt="disc" data-node="${esc(node)}">${sv('chat')} Discussion${cc.length ? ` <b class="mt-n">${cc.length}</b>` : ''}${oi ? '<i class="udot"></i>' : ''}</button></div>` : ''}</div></article>`;
  }
  function meetingsPanel() {
    const list = selDate ? meetings.filter((x) => x.date === selDate) : meetings;
    const title = selDate ? fmt(selDate, LONG) : 'All meetings';
    let top = '';
    if (isSandbox()) top = selDate ? (editMeet ? '' : composer(null)) : `<div class="mt-empty slim"><b>Pick a date on the calendar</b><span>Then write what was discussed in that meeting.</span><button class="btn primary sm" data-mt="today">${sv('cal')} Today</button></div>`;
    let body = list.map(meetingCard).join('');
    if (!list.length && !(isSandbox() && selDate)) body = `<div class="mt-empty"><b>${selDate ? 'No meeting notes for this day' : (isSandbox() ? 'No notes yet' : 'Nothing here yet')}</b><span>${selDate ? 'Pick another day on the calendar.' : (isSandbox() ? 'Pick a date and write your first notes.' : 'Sandbox has not shared any meeting notes yet.')}</span></div>`;
    return `<div class="mt-grid">${calendar()}<section class="mt-list"><h2>${esc(title)}<small>${list.length} meeting${list.length === 1 ? '' : 's'}</small></h2>${top}${body}</section></div>`;
  }

  /* ---------------- tasks ---------------- */
  function visibleTasks() {
    const q = query.trim().toLowerCase();
    let list = tasks.filter((i) => (filter === 'all' || i.status === filter) && (!q || i.title.toLowerCase().includes(q)));
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
      h += `<button class="tk-ic" data-mt="timgadd" data-id="${esc(it.id)}" title="Add a screenshot">${sv('img')}</button><button class="tk-ic" data-mt="tedit" data-id="${esc(it.id)}" title="Edit">${sv('edit')}</button><button class="tk-ic danger" data-mt="tdel" data-id="${esc(it.id)}" title="Delete">${sv('trash')}</button>`;
    }
    return h;
  }
  function thumbs(it) {
    const imgs = filesOfTask(it.id).filter((f) => kindOf(f) === 'image'); if (!imgs.length) return '';
    return `<div class="tk-thumbs">${imgs.map((f) => `<span class="tk-th"><button data-mt="fopen" data-id="${esc(f.id)}" title="${esc(f.fileName)}"><img data-fid="${esc(f.id)}" alt="${esc(f.fileName)}"${thumbUrl.has(f.id) ? ` src="${thumbUrl.get(f.id)}"` : ''}></button>${isSandbox() ? `<button class="tk-thx" data-mt="fdel" data-id="${esc(f.id)}" title="Remove" aria-label="Remove screenshot">${sv('x')}</button>` : ''}</span>`).join('')}</div>`;
  }
  function taskRow(it) {
    const node = `tk:${it.id}`, cls = `tk-row s-${it.status} ${disc === node ? 'open' : ''}`;
    if (editTask === it.id && isSandbox()) {
      return `<tr class="${cls} editing"><td class="tk-c-tick"></td><td class="tk-c-n">${it.seq}</td>
        <td data-l="Task"><input class="tk-in" id="ed-title" value="${esc(it.title)}" maxlength="300">${thumbs(it)}</td>
        <td data-l="Priority"><select class="tk-in" id="ed-pri">${priOptions(it.priority)}</select></td><td></td><td></td>
        <td class="tk-c-act"><button class="btn sm" data-mt="tsave" data-id="${esc(it.id)}">${sv('check')} Save</button><button class="btn ghost sm" data-mt="tcancel">Cancel</button></td></tr>`;
    }
    return `<tr class="${cls}" data-id="${esc(it.id)}"><td class="tk-c-tick">${tickCell(it)}</td><td class="tk-c-n">${it.seq}</td>
      <td data-l="Task" class="tk-c-item"><b>${esc(it.title)}</b>${thumbs(it)}</td>
      <td data-l="Priority"><span class="tk-pri ${it.priority}">${PRI[it.priority]}</span></td>
      <td data-l="Added" class="tk-c-by">${api.teamBadge(it.team)}<small>${dateOf(it.ts)}</small></td><td data-l="Status" class="tk-c-st">${statusCell(it)}</td><td class="tk-c-act">${taskActions(it)}</td></tr>`;
  }
  function addRow() {
    if (!isSandbox()) return '';
    const pend = taskImgs.map((f, i) => `<span class="mtf-f">${esc(f.name)} <button data-mt="tirm" data-i="${i}" aria-label="Remove ${esc(f.name)}">${sv('x')}</button></span>`).join('');
    return `<tr class="tk-add"><td></td><td class="tk-c-n">${sv('plus')}</td><td data-l="Task"><input id="tk-new" class="tk-in" maxlength="300" placeholder="Type a task and press Enter. You can paste a screenshot here." autocomplete="off">${pend ? `<div class="tk-pend">${pend}</div>` : ''}</td>
      <td data-l="Priority"><select id="tk-new-pri" class="tk-in">${priOptions('medium')}</select></td><td></td><td></td><td class="tk-c-act"><button class="btn ghost sm" data-mt="tnewimg" title="Attach a screenshot">${sv('img')} ${taskImgs.length ? taskImgs.length : 'Image'}</button><button class="btn sm" data-mt="tadd">${sv('plus')} Add</button></td></tr>`;
  }
  function tasksPanel() {
    const list = visibleTasks();
    const empty = !tasks.length ? `<tr><td colspan="7" class="tk-empty"><b>${isSandbox() ? 'No tasks yet' : 'Nothing here yet'}</b><span>${isSandbox() ? 'Type the first task below.' : 'Sandbox has not added any tasks yet.'}</span></td></tr>` : (!list.length ? '<tr><td colspan="7" class="tk-empty"><b>No tasks match</b><span>Try a different filter.</span></td></tr>' : '');
    return `${taskStats()}${taskFilters()}<div class="tk-sheet"><table class="tk-table"><thead><tr><th class="tk-c-tick"></th><th class="tk-c-n"><button data-mt="sort" title="Reverse the order">#</button></th><th>Task</th><th>Priority</th><th>Added</th><th>Status</th><th></th></tr></thead>
      <tbody>${list.map(taskRow).join('')}${empty}${addRow()}</tbody></table></div>`;
  }

  /* ---------------- render ---------------- */
  function render() {
    if (!api || !visible) return;
    const v = $('#mt-view'), ae = document.activeElement, keep = { sc: v.scrollTop, nw: ($('#tk-new') || {}).value || '', pri: ($('#tk-new-pri') || {}).value, focus: ae && ae.id, ed: ($('#ed-title') || {}).value };
    v.innerHTML = head() + (tab === 'meetings' ? meetingsPanel() : tasksPanel()) + '</div>';
    const set = (id, val) => { const e = $('#' + id); if (e && val != null && val !== '') e.value = val; };
    set('tk-new', keep.nw); set('tk-new-pri', keep.pri); set('ed-title', keep.ed);
    if (keep.focus && ['tk-new', 'tk-q', 'ed-title', 'mtc-title', 'mtc-notes'].includes(keep.focus) && $('#' + keep.focus)) { const f = $('#' + keep.focus); f.focus(); try { f.setSelectionRange(f.value.length, f.value.length); } catch (e) { /* ignore */ } }
    v.scrollTop = keep.sc;
    hydrate(); renderDrawer();
  }
  function hydrate() {
    $$('#mt-view img[data-fid]').forEach((img) => {
      const id = img.dataset.fid; if (thumbUrl.has(id)) { if (!img.src) img.src = thumbUrl.get(id); return; }
      if (!thumbP.has(id)) {
        const f = mfiles.find((x) => x.id === id); if (!f) return;
        thumbP.set(id, api.store.meetingFileBlob(f).then((b) => { const u = URL.createObjectURL(b.type ? b : new Blob([b], { type: 'image/png' })); thumbUrl.set(id, u); return u; }).catch(() => { thumbP.delete(id); return ''; }));
      }
      thumbP.get(id).then((u) => { if (!u) return; const t = $(`#mt-view img[data-fid="${id}"]`); if (t && !t.src) t.src = u; });
    });
  }

  /* ---------------- side drawer: discussion ---------------- */
  function drawerEl() { return $('#mt-drawer'); }
  function renderDrawer() {
    const el = drawerEl(); if (!el) return;
    if (!disc || !visible) { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); document.body.classList.remove('mt-drawer-open'); return; }
    const old = $('#mt-msg', el), keepMsg = old && old.dataset.node === disc ? old.value : '', hadFocus = old && document.activeElement === old;
    const cc = commentsOf(disc), thread = $('.mtd-thread', el), atEnd = !thread || thread.scrollHeight - thread.scrollTop - thread.clientHeight < 60 || !el.classList.contains('open');
    el.innerHTML = `<div class="mtd-head"><div><small>Discussion</small><b>${esc(CalMeet.nodeName(disc))}</b></div><button class="tk-ic" data-mtd="close" aria-label="Close">${sv('x')}</button></div>
      <div class="mtd-thread tk-thread">${cc.map((m) => api.msgHtml(m)).join('') || '<div class="empty">No messages yet. Start the conversation below.</div>'}</div>
      <div class="mtd-compose"><textarea id="mt-msg" data-node="${esc(disc)}" placeholder="Write a message to ${isSandbox() ? 'Liveroom' : 'Sandbox'}…"></textarea><button class="btn primary sm" data-mt="send" data-node="${esc(disc)}">Send</button></div>`;
    const ta = $('#mt-msg', el); ta.value = keepMsg; if (hadFocus) { ta.focus(); try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) { /* ignore */ } }
    const t2 = $('.mtd-thread', el); if (t2 && atEnd) t2.scrollTop = t2.scrollHeight;
    el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); document.body.classList.add('mt-drawer-open');
    api.markNodeSeen(disc);
  }

  /* ---------------- actions ---------------- */
  const run = (fn) => api.guard(async () => { await fn(); await api.reload(); await refresh(); });
  const setupHint = (m) => (/meeting|relation|schema cache|bucket|row-level|column/i.test(m) ? 'This needs a one-time setup: run supabase/meetings.sql (see SETUP.md)' : m);
  const fileNote = (names) => (names.length === 1 ? `Uploaded a file: ${names[0]}` : `Uploaded ${names.length} files: ${names.join(', ')}`);

  async function uploadTo(owner, fileList) {
    const files = [...(fileList || [])]; if (!files.length) return [];
    api.toast(files.length > 1 ? `Uploading ${files.length} files…` : 'Uploading…');
    const done = [];
    for (const f of files) {
      if (f.size > MAX_FILE) { api.toast(`${f.name} is over 50 MB and was skipped`); continue; }
      try { await api.store.addMeetingFile(me(), { file: f, ...owner }); done.push(f.name); } catch (e) { api.toast(setupHint(e.message || String(e))); break; }
    }
    return done;
  }

  function startEdit(id) { const m = meetingOf(id); if (!m) return; editMeet = id; draft = { title: m.title === 'Meeting notes' ? '' : m.title, notes: m.notes, vis: m.visibility === 'sandbox' ? 'sandbox' : 'both', date: m.date, files: [] }; render(); const t = $('#mtc-notes'); if (t) t.focus(); }
  function cancelEdit() { editMeet = null; draft = freshDraft(); render(); }
  async function saveMeeting() {
    if (!isSandbox() || busy) return;
    const notes = (draft.notes || '').trim(), title = (draft.title || '').trim() || 'Meeting notes', editing = editMeet && meetingOf(editMeet), date = editing ? draft.date : selDate;
    if (!date) { api.toast('Pick a date on the calendar first'); return; }
    if (!notes && !draft.files.length && !editing) { api.toast('Write some notes or attach a file first'); const t = $('#mtc-notes'); if (t) t.focus(); return; }
    const files = draft.files, vis = draft.vis, open = vis === 'both';
    busy = true;
    try {
      await run(async () => {
        if (editing) {
          const was = editing.visibility;
          await api.store.updateMeeting(me(), editing.id, { date, title, notes, visibility: vis });
          const names = await uploadTo({ meetingId: editing.id }, files);
          if (open) await note(`mt:${editing.id}`, was === 'sandbox' ? 'Shared the meeting notes.' : names.length ? fileNote(names) : 'Updated the meeting notes.');
          api.toast('Notes updated');
        } else {
          const made = await api.store.addMeeting(me(), { date, title, notes, visibility: vis });
          const names = await uploadTo({ meetingId: made.id }, files);
          if (open) await note(`mt:${made.id}`, `Added meeting notes${names.length ? ` and ${names.length} file${names.length > 1 ? 's' : ''}` : ''}.`);
          api.toast(open ? 'Notes saved and shared' : 'Notes saved (only you can see them)');
        }
        editMeet = null; draft = freshDraft();
        const dd = parseYmd(date); if (dd) cal = { y: dd.getFullYear(), m: dd.getMonth() };
        selDate = date;
      });
    } finally { busy = false; }
  }
  async function deleteMeeting(id) {
    const m = meetingOf(id); if (!m || !confirm('Delete these notes, their files and their messages?')) return;
    if (disc === `mt:${id}`) disc = null;
    await run(async () => {
      for (const f of filesOfMeeting(id)) await api.store.deleteMeetingFile(f);
      await api.store.deleteMeeting(id);
      await Promise.all(api.S().comments.filter((c) => c.nodeId === `mt:${id}` && c.authorId === me().id).map((c) => api.store.deleteComment(c.id)));
    });
  }
  async function addFilesTo(id, list) {
    if (!isSandbox() || !meetingOf(id)) return;
    const m = meetingOf(id);
    await run(async () => { const names = await uploadTo({ meetingId: id }, list); if (names.length) { if (shared(m)) await note(`mt:${id}`, fileNote(names)); api.toast(names.length > 1 ? 'Files uploaded' : 'File uploaded'); } });
  }

  /* tasks */
  const onlyImages = (list) => [...(list || [])].filter((f) => /^image\//.test(f.type) || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(f.name));
  async function addTask() {
    const t = (($('#tk-new') || {}).value || '').trim(); if (!t) { const e = $('#tk-new'); if (e) e.focus(); return; }
    const pri = $('#tk-new-pri').value, imgs = taskImgs; taskImgs = [];
    await run(async () => {
      const made = await api.store.addTasks(me(), [{ title: t, priority: pri }]);
      const id = made[0].id, names = await uploadTo({ taskId: id }, imgs);
      await note(`tk:${id}`, names.length ? `New task added with ${names.length} screenshot${names.length > 1 ? 's' : ''}.` : 'New task added.');
      api.toast('Task added');
    });
    const e = $('#tk-new'); if (e) { e.value = ''; e.focus(); }
  }
  async function addTaskImages(id, list) {
    const imgs = onlyImages(list); if (!imgs.length) { api.toast('Please choose an image'); return; }
    await run(async () => { const names = await uploadTo({ taskId: id }, imgs); if (names.length) { await note(`tk:${id}`, `Added ${names.length > 1 ? names.length + ' screenshots' : 'a screenshot'}.`); api.toast('Screenshot added'); } });
  }
  const tick = (id, on) => run(async () => { await api.store.setTaskStatus(me(), id, on ? 'done' : 'open'); await note(`tk:${id}`, on ? 'Marked as done. Waiting for Sandbox to confirm.' : 'Moved back to open.'); api.toast(on ? 'Marked as done. Sandbox will be notified.' : 'Moved back to open'); });
  const confirmTask = (id) => run(async () => { await api.store.setTaskStatus(me(), id, 'confirmed'); await note(`tk:${id}`, 'Confirmed. This task is complete.'); api.toast('Confirmed'); });
  const reopenTask = (id) => run(async () => { await api.store.setTaskStatus(me(), id, 'open'); await note(`tk:${id}`, 'Reopened. More work is needed.'); api.toast('Reopened'); });
  async function sendMsg(node) {
    const ta = $('#mt-msg'), v = ta ? ta.value.trim() : ''; if (!v) { if (ta) ta.focus(); return; }
    ta.value = '';
    await run(async () => { await api.store.addComment(me(), { nodeId: node, body: v, kind: 'comment' }); });
  }

  /* ---------------- export ---------------- */
  function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  const csvOut = (rows, name) => { const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; saveBlob(new Blob(['﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${name}-${todayStr()}.csv`); };
  const isoDay = (t) => (t ? new Date(t).toISOString().slice(0, 10) : '');
  const sharedMeetings = () => meetings.filter(shared).slice().sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.ts - b.ts);
  function exportTasks() {
    csvOut([['#', 'Task', 'Priority', 'Status', 'Screenshots', 'Added by', 'Added on', 'Done by', 'Done on', 'Confirmed by', 'Confirmed on']]
      .concat(tasks.map((i) => [i.seq, i.title, PRI[i.priority], STATUS[i.status], filesOfTask(i.id).length, i.team, isoDay(i.ts), i.doneBy, isoDay(i.doneTs), i.confirmBy, isoDay(i.confirmTs)])), 'tasks');
  }
  function exportMeetings() {
    csvOut([['Date', 'Title', 'Notes', 'Files', 'Recorded by', 'Recorded on']]
      .concat(sharedMeetings().map((m) => [m.date, m.title, m.notes, filesOfMeeting(m.id).map((f) => f.fileName).join('; '), m.team, isoDay(m.ts)])), 'meetings');
  }
  const chunk = (text, max) => {
    const out = []; let cur = '';
    String(text || '').split(/\n/).forEach((line) => {
      while (line.length > max) { if (cur) { out.push(cur); cur = ''; } out.push(line.slice(0, max)); line = line.slice(max); }
      if ((cur + '\n' + line).length > max && cur) { out.push(cur); cur = line; } else cur = cur ? cur + '\n' + line : line;
    });
    if (cur || !out.length) out.push(cur); return out;
  };
  function reportHtml() {
    const E = esc, ms = sharedMeetings(), c = taskCounts(), total = tasks.length, pct = total ? Math.round(c.confirmed / total * 100) : 0;
    const L = window.TEAM_LOGOS || {}, calLogo = new URL('assets/logo.png', location.href).href;
    const dates = ms.map((m) => m.date).filter(Boolean), range = dates.length ? (dates[0] === dates[dates.length - 1] ? fmt(dates[0]) : `${fmt(dates[0])} to ${fmt(dates[dates.length - 1])}`) : fmt(todayStr());
    const by = me() ? me().name : '';
    const slides = [];
    slides.push(`<section class="slide cover"><div class="cv-bar"></div><div class="cv-top"><img src="${calLogo}" alt="Calybrate" class="cv-cal"></div>
      <div class="cv-mid"><small>Calybrate roadmap</small><h1>Meetings &amp; tasks report</h1><p>Sandbox and Liveroom: what we discussed and what we agreed to do</p><div class="cv-meta"><span>${E(range)}</span><span>${ms.length} meeting${ms.length === 1 ? '' : 's'}</span><span>${total} task${total === 1 ? '' : 's'}</span></div></div>
      <div class="cv-foot"><div class="cv-logos">${L.sandbox ? `<img src="${L.sandbox}" alt="Sandbox">` : ''}<i>×</i>${L.liveroom ? `<img src="${L.liveroom}" alt="Liveroom">` : ''}</div><span>Prepared ${E(fmt(todayStr(), LONG))}${by ? ' by ' + E(by) : ''}</span></div></section>`);
    slides.push(`<section class="slide light"><header><small>Overview</small><h2>At a glance</h2></header><div class="ov"><div class="ovc"><b>${ms.length}</b><span>Meetings recorded</span></div><div class="ovc"><b>${total}</b><span>Tasks in total</span></div><div class="ovc amber"><b>${c.open + c.done}</b><span>Still in progress</span></div><div class="ovc green"><b>${c.confirmed}</b><span>Confirmed complete</span></div></div>
      <div class="ovp"><div class="ovbar"><i style="width:${pct}%"></i></div><span>${pct}% of tasks complete · ${c.done} waiting for Sandbox to confirm</span></div></section>`);
    ms.forEach((m) => {
      const parts = chunk(m.notes || 'No notes were added.', 1000), fl = filesOfMeeting(m.id), d = parseYmd(m.date);
      parts.forEach((p, i) => slides.push(`<section class="slide light"><header><small>Meeting${parts.length > 1 ? ` · part ${i + 1} of ${parts.length}` : ''}</small><h2>${E(m.title)}</h2></header>
        <div class="mrow"><div class="mdate"><b>${d ? d.getDate() : ''}</b><span>${d ? d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''}</span></div><div class="mnotes">${E(p)}</div></div>
        <footer>${i === parts.length - 1 && fl.length ? `<div class="mfiles"><small>Files shared</small>${fl.map((f) => `<span>${E(f.fileName)}</span>`).join('')}</div>` : '<div></div>'}<em>${E(fmt(m.date, LONG))} · recorded by ${E(m.team === 'sandbox' ? 'Sandbox' : 'Liveroom')}</em></footer></section>`));
    });
    const per = 7, pages = Math.max(1, Math.ceil(tasks.length / per));
    for (let i = 0; i < pages; i++) {
      const rows = tasks.slice(i * per, (i + 1) * per).map((t) => `<tr><td class="n">${t.seq}</td><td class="t">${E(t.title)}${filesOfTask(t.id).length ? `<small>${filesOfTask(t.id).length} screenshot${filesOfTask(t.id).length > 1 ? 's' : ''}</small>` : ''}</td><td><span class="pr ${t.priority}">${PRI[t.priority]}</span></td><td><span class="st ${t.status}">${STATUS[t.status]}</span></td><td class="w">${E(t.status === 'confirmed' ? `${t.confirmBy} · ${dateOf(t.confirmTs)}` : t.status === 'done' ? `${t.doneBy} · ${dateOf(t.doneTs)}` : '')}</td></tr>`).join('');
      slides.push(`<section class="slide light"><header><small>Tasks${pages > 1 ? ` · page ${i + 1} of ${pages}` : ''}</small><h2>What we agreed to do</h2></header>${tasks.length ? `<table class="tt"><thead><tr><th>#</th><th>Task</th><th>Priority</th><th>Status</th><th>By</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="none">No tasks were added.</p>'}</section>`);
    }
    slides.push(`<section class="slide cover end"><div class="cv-bar"></div><div class="cv-mid"><h1>Thank you</h1><p>Calybrate roadmap · Sandbox × Liveroom</p></div><div class="cv-foot"><div class="cv-logos">${L.sandbox ? `<img src="${L.sandbox}" alt="Sandbox">` : ''}<i>×</i>${L.liveroom ? `<img src="${L.liveroom}" alt="Liveroom">` : ''}</div><span></span></div></section>`);
    const css = `*{box-sizing:border-box}html{background:#1b1b22}body{margin:0;font:16px/1.5 Inter,'Segoe UI',Arial,sans-serif;color:#17171f;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .bar{position:fixed;top:0;left:0;right:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 18px;background:#111118;color:#e8e8ee;font-size:13px;border-bottom:1px solid #2c2c38}.bar button{font:600 13px Inter,Arial;padding:8px 16px;border-radius:9px;border:0;background:#fbbf24;color:#241a00;cursor:pointer}
      .pages{padding:64px 0 30px}.slide{position:relative;width:1280px;height:720px;margin:0 auto 26px;overflow:hidden;background:#fff;box-shadow:0 10px 40px rgba(0,0,0,.45);zoom:var(--z,1);page-break-after:always;break-after:page}
      .cover{background:radial-gradient(900px 500px at 85% 10%,rgba(251,191,36,.22),transparent 60%),linear-gradient(135deg,#0b0b10,#171722);color:#fff;display:grid;grid-template-rows:auto 1fr auto;padding:64px 80px}
      .cv-bar{position:absolute;left:0;top:0;bottom:0;width:14px;background:linear-gradient(#fbbf24,#f59e0b)}.cv-cal{height:46px}.cv-mid{align-self:center}.cv-mid small{display:block;color:#fbbf24;letter-spacing:.2em;text-transform:uppercase;font-weight:700;font-size:15px;margin-bottom:18px}
      .cv-mid h1{margin:0;font:700 76px/1.05 Sora,Inter,Arial,sans-serif;letter-spacing:-.02em;max-width:900px}.cv-mid p{margin:22px 0 0;font-size:24px;color:#c9c9d6;max-width:760px}.cv-meta{display:flex;gap:14px;margin-top:34px}.cv-meta span{padding:9px 18px;border-radius:99px;border:1px solid rgba(255,255,255,.25);font-size:16px;color:#e8e8ee}
      .cv-foot{display:flex;justify-content:space-between;align-items:center;color:#a8a8b8;font-size:15px}.cv-logos{display:flex;align-items:center;gap:18px}.cv-logos img{height:38px;border-radius:7px;background:#fff;padding:5px 9px}.cv-logos i{font-style:normal;color:#fbbf24;font-size:24px}.end{grid-template-rows:1fr auto}.end .cv-mid h1{font-size:88px}
      .light{padding:56px 72px;display:flex;flex-direction:column}.light::before{content:'';position:absolute;left:0;top:0;right:0;height:10px;background:linear-gradient(90deg,#fbbf24,#f59e0b)}
      .light header small{color:#b7791f;text-transform:uppercase;letter-spacing:.16em;font-weight:700;font-size:13px}.light h2{margin:6px 0 26px;font:700 40px/1.15 Sora,Inter,Arial,sans-serif;color:#111118}
      .ov{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}.ovc{padding:28px 24px;border-radius:18px;background:#f6f6f9;border:1px solid #e6e6ee}.ovc b{display:block;font:700 64px/1 Sora,Inter,Arial,sans-serif;color:#111118}.ovc span{color:#5b5b6b;font-size:17px}.ovc.amber b{color:#b7791f}.ovc.green b{color:#15803d}
      .ovp{margin-top:36px}.ovbar{height:16px;border-radius:99px;background:#ececf3;overflow:hidden}.ovbar i{display:block;height:100%;background:linear-gradient(90deg,#16a34a,#4ade80)}.ovp span{display:block;margin-top:12px;color:#5b5b6b;font-size:17px}
      .mrow{display:grid;grid-template-columns:130px 1fr;gap:32px;flex:1;min-height:0}.mdate{height:128px;border-radius:20px;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#241a00;display:grid;place-content:center;text-align:center}.mdate b{font:700 54px/1 Sora,Inter,Arial,sans-serif}.mdate span{font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:.06em}
      .mnotes{white-space:pre-wrap;overflow-wrap:anywhere;font-size:21px;line-height:1.6;color:#23232d;overflow:hidden}.light footer{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;padding-top:16px;border-top:1px solid #e6e6ee;color:#6b6b7b;font-size:14px}.light footer em{font-style:normal;white-space:nowrap}
      .mfiles{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.mfiles small{font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:11px}.mfiles span{padding:4px 12px;border-radius:99px;background:#f1f1f6;border:1px solid #e0e0ea;color:#33333f;font-size:13px}
      .tt{width:100%;border-collapse:collapse;font-size:18px}.tt th{text-align:left;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#6b6b7b;padding:10px 12px;border-bottom:2px solid #e6e6ee}.tt td{padding:13px 12px;border-bottom:1px solid #eeeef4;vertical-align:middle}.tt td.n{color:#8a8a9a;width:48px}.tt td.t{font-weight:600}.tt td.t small{display:block;font-weight:400;color:#8a8a9a;font-size:13px}.tt td.w{color:#6b6b7b;font-size:14px;white-space:nowrap}
      .pr,.st{display:inline-block;padding:3px 12px;border-radius:99px;font-size:13px;font-weight:700;white-space:nowrap}.pr.high{background:#fee2e2;color:#b91c1c}.pr.medium{background:#fef3c7;color:#92400e}.pr.low{background:#e8e8f0;color:#4b4b5b}.st.open{background:#ececf3;color:#4b4b5b}.st.done{background:#fef3c7;color:#92400e}.st.confirmed{background:#dcfce7;color:#166534}.none{color:#8a8a9a}
      @media print{@page{size:1280px 720px;margin:0}html{background:#fff}.bar{display:none}.pages{padding:0}.slide{margin:0;box-shadow:none;zoom:1}}`;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Calybrate meetings and tasks report</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@600;700&display=swap"><style>${css}</style></head>
      <body><div class="bar"><span>Report preview. Click Save as PDF, then choose "Save as PDF" as the printer and turn off headers and footers.</span><button onclick="window.print()">Save as PDF</button></div><div class="pages">${slides.join('')}</div>
      <script>function fit(){document.documentElement.style.setProperty('--z',Math.min(1,(innerWidth-32)/1280))}fit();addEventListener('resize',fit);<\/script></body></html>`;
  }
  function exportReport() {
    const w = window.open('', '_blank'); if (!w) { api.toast('Please allow pop-ups to open the report'); return; }
    w.document.open(); w.document.write(reportHtml()); w.document.close();
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
  function splitCsv(line) {
    const out = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur); return out;
  }
  function tableHtml(rows) {
    const MAXR = 1000, MAXC = 40, cut = rows.length > MAXR, r = rows.slice(0, MAXR);
    const w = Math.min(MAXC, r.reduce((m, x) => Math.max(m, x.length), 0));
    const cell = (v) => `<td>${esc(v == null ? '' : String(v))}</td>`;
    const body = r.map((x, i) => `<tr><td class="rn">${i + 1}</td>${Array.from({ length: w }, (_, j) => cell(x[j])).join('')}</tr>`).join('');
    return `<div class="mt-sheetwrap"><table class="mt-pt"><tbody>${body}</tbody></table></div>${cut ? `<p class="mt-pnote">Showing the first ${MAXR} rows. Download the file to see the rest.</p>` : ''}`;
  }
  const blobUrl = (blob) => { const u = URL.createObjectURL(blob); prevUrls.push(u); return u; };
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
      if (kind === 'pdf') body.innerHTML = `<iframe class="mtp-frame" title="${esc(f.fileName)}" src="${blobUrl(new Blob([raw], { type: 'application/pdf' }))}"></iframe>`;
      else if (kind === 'image') body.innerHTML = `<div class="mtp-img"><img alt="${esc(f.fileName)}" src="${blobUrl(new Blob([raw], { type: raw.type || 'image/' + (extOf(f.fileName) === 'svg' ? 'svg+xml' : extOf(f.fileName) || 'png') }))}"></div>`;
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
    const el = e.target.closest('[data-mt]');
    if (exportOpen && !(el && el.dataset.mt === 'export')) { exportOpen = false; if (!el || el.dataset.mt !== 'exp') render(); }
    if (!el || !api) return;
    const a = el.dataset.mt, id = el.dataset.id, node = el.dataset.node;
    switch (a) {
      case 'tab': tab = el.dataset.t; disc = null; editTask = null; editMeet = null; render(); break;
      case 'review': tab = 'tasks'; filter = 'done'; render(); break;
      case 'day': selDate = selDate === el.dataset.d ? null : el.dataset.d; if (editMeet) { editMeet = null; draft = freshDraft(); } render(); break;
      case 'all': selDate = null; editMeet = null; render(); break;
      case 'today': nowCal(); selDate = todayStr(); render(); break;
      case 'prev': cal = cal.m === 0 ? { y: cal.y - 1, m: 11 } : { y: cal.y, m: cal.m - 1 }; render(); break;
      case 'next': cal = cal.m === 11 ? { y: cal.y + 1, m: 0 } : { y: cal.y, m: cal.m + 1 }; render(); break;
      case 'vis': draft.vis = el.dataset.v; render(); break;
      case 'dfrm': draft.files.splice(+el.dataset.i, 1); render(); break;
      case 'msave': saveMeeting(); break;
      case 'medit': startEdit(id); break;
      case 'mcancel': cancelEdit(); break;
      case 'mdel': deleteMeeting(id); break;
      case 'fopen': previewFile(id); break;
      case 'fdl': case 'pdl': downloadFile(id); break;
      case 'fdel': { const f = mfiles.find((x) => x.id === id); if (f && confirm(`Remove ${f.fileName}?`)) run(() => api.store.deleteMeetingFile(f)); break; }
      case 'fadd': { const i = $('#mt-add'); if (i) { i.dataset.id = id; i.click(); } break; }
      case 'disc': disc = disc === node ? null : node; render(); if (disc) { const t = $('#mt-msg'); if (t) t.focus(); } break;
      case 'send': sendMsg(node); break;
      case 'filter': filter = el.dataset.f; render(); break;
      case 'sort': sortDesc = !sortDesc; render(); break;
      case 'tadd': addTask(); break;
      case 'tnewimg': { const i = $('#mt-timg'); if (i) { i.dataset.id = ''; i.click(); } break; }
      case 'tirm': taskImgs.splice(+el.dataset.i, 1); render(); break;
      case 'timgadd': { const i = $('#mt-timg'); if (i) { i.dataset.id = id; i.click(); } break; }
      case 'tedit': editTask = id; render(); { const t = $('#ed-title'); if (t) t.focus(); } break;
      case 'tcancel': editTask = null; render(); break;
      case 'tsave': { const t = $('#ed-title').value.trim(); if (!t) { $('#ed-title').focus(); return; } const patch = { title: t, priority: $('#ed-pri').value }; editTask = null; run(() => api.store.updateTask(me(), id, patch)); break; }
      case 'tdel': if (confirm('Delete this task and its messages?')) { if (disc === `tk:${id}`) disc = null; run(async () => { for (const f of filesOfTask(id)) await api.store.deleteMeetingFile(f); await api.store.deleteTask(id); await Promise.all(api.S().comments.filter((c) => c.nodeId === `tk:${id}` && c.authorId === me().id).map((c) => api.store.deleteComment(c.id))); }); } break;
      case 'confirm': confirmTask(id); break;
      case 'reopen': reopenTask(id); break;
      case 'export': exportOpen = !exportOpen; render(); break;
      case 'exp': exportOpen = false; render(); if (el.dataset.k === 'report') exportReport(); else if (el.dataset.k === 'tasks') exportTasks(); else exportMeetings(); break;
      default: break;
    }
  }
  function bind() {
    const v = $('#mt-view'); if (!v || v._mt) return; v._mt = true;
    v.addEventListener('click', onClick);
    v.addEventListener('change', (e) => {
      if (e.target.matches('[data-mt="tick"]')) tick(e.target.dataset.id, e.target.checked);
      else if (e.target.id === 'mtc-files') { draft.files.push(...[...e.target.files]); e.target.value = ''; render(); }
    });
    v.addEventListener('input', (e) => {
      const id = e.target.id;
      if (id === 'tk-q') { query = e.target.value; const pos = e.target.selectionStart; render(); const q = $('#tk-q'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } }
      else if (id === 'mtc-title') draft.title = e.target.value;
      else if (id === 'mtc-notes') draft.notes = e.target.value;
      else if (id === 'mtc-date') draft.date = e.target.value;
    });
    v.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.id === 'tk-new') { e.preventDefault(); addTask(); }
      else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.id === 'mtc-notes') { e.preventDefault(); saveMeeting(); }
      else if (e.key === 'Escape' && editTask) { editTask = null; render(); }
    });
    v.addEventListener('paste', (e) => {
      if (e.target.id !== 'tk-new' || !isSandbox()) return;
      const imgs = onlyImages(e.clipboardData && e.clipboardData.files); if (!imgs.length) return;
      e.preventDefault(); taskImgs.push(...imgs); render(); const t = $('#tk-new'); if (t) t.focus();
    });
    ['dragover', 'drop'].forEach((t) => v.addEventListener(t, (e) => {
      if (!isSandbox() || !e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
      const card = e.target.closest('.mt-card'), row = e.target.closest('tr.tk-row'); if (!card && !row) return; e.preventDefault();
      if (t === 'drop') { if (card) addFilesTo(card.dataset.id, e.dataTransfer.files); else addTaskImages(row.dataset.id, e.dataTransfer.files); }
    }));
    if (!$('#mt-add')) { const i = document.createElement('input'); i.type = 'file'; i.id = 'mt-add'; i.multiple = true; i.hidden = true; i.addEventListener('change', (e) => { const id = e.target.dataset.id, files = [...e.target.files]; e.target.value = ''; if (id && files.length) addFilesTo(id, files); }); document.body.appendChild(i); }
    if (!$('#mt-timg')) {
      const i = document.createElement('input'); i.type = 'file'; i.id = 'mt-timg'; i.accept = 'image/*'; i.multiple = true; i.hidden = true;
      i.addEventListener('change', (e) => { const id = e.target.dataset.id, files = onlyImages(e.target.files); e.target.value = ''; if (!files.length) return; if (id) addTaskImages(id, files); else { taskImgs.push(...files); render(); } });
      document.body.appendChild(i);
    }
    if (!$('#mt-prev')) {
      const p = document.createElement('section'); p.id = 'mt-prev'; p.className = 'mt-prev'; p.hidden = true;
      p.innerHTML = `<div class="mtp-bar"><div class="mtp-title"></div><div class="mtp-acts"><button class="btn ghost sm" data-mt="pdl">${sv('dl')} Download</button><button class="btn ghost sm" data-mtp="close">${sv('x')} Close</button></div></div><div class="mtp-body"></div>`;
      p.addEventListener('click', (e) => { if (e.target.closest('[data-mtp="close"]')) closePreview(); else onClick(e); });
      document.body.appendChild(p);
    }
    if (!$('#mt-drawer')) {
      const d = document.createElement('aside'); d.id = 'mt-drawer'; d.className = 'mt-drawer'; d.setAttribute('aria-hidden', 'true');
      d.addEventListener('click', (e) => { if (e.target.closest('[data-mtd="close"]')) { disc = null; render(); } else onClick(e); });
      d.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && e.target.id === 'mt-msg') { e.preventDefault(); sendMsg(e.target.dataset.node); } });
      document.body.appendChild(d);
    }
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !visible) return;
      const p = $('#mt-prev'); if (p && !p.hidden) { closePreview(); return; }
      if (disc) { disc = null; render(); }
    });
  }

  /* ---------------- public ---------------- */
  window.CalMeet = {
    init(a) { api = a; bind(); return refresh(); },
    show() { visible = true; refresh(); },
    hide() { visible = false; disc = null; exportOpen = false; renderDrawer(); closePreview(); },
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
