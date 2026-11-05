/* Calybrate dashboard redesign: interactive prototype (Super Admin + Admin).
   Screens: Dashboard + tour, Campaigns (bento, type, detail, Culture), Create Campaign (3 steps + confirmations),
   Reports (landing, 180/360, Culture, share panel), Users (Employees, profile, Admins, Organization Levels).
   All data is sample data. Nothing is sent anywhere. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var LOGO = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop offset=%220%22 stop-color=%22%237A2FD0%22/%3E%3Cstop offset=%221%22 stop-color=%22%234B0082%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx=%2224%22 cy=%2224%22 r=%2221%22 fill=%22%23fff%22 stroke=%22url%28%23g%29%22 stroke-width=%224%22/%3E%3Cpath d=%22M33 17.5A11 11 0 1 0 33 30.5M24 24h10%22 fill=%22none%22 stroke=%22url%28%23g%29%22 stroke-width=%224.2%22 stroke-linecap=%22round%22/%3E%3C/svg%3E';

  /* ---------- icons ---------- */
  var IC = {
    dash: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    camp: '<path d="M4 10v4l3 1 9 4V5L7 9z"/><path d="M19 9v6"/>', rep: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19a6 6 0 0 1 12 0M16 5a3.2 3.2 0 0 1 0 6M18 14a6 6 0 0 1 3 5"/>', user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>', filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', play: '<path d="M8 5l11 7-11 7z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>', up: '<path d="M12 16V5M7 10l5-5 5 5M4 20h16"/>', share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>', left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', warn: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    crown: '<path d="M4 8l4 4 4-6 4 6 4-4-1.5 10h-13z"/>', bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10.3 21a1.9 1.9 0 0 0 3.4 0"/>', bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
    bar: '<path d="M5 20V10M12 20V4M19 20v-7"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>', refresh: '<path d="M20 11a8 8 0 0 0-14.5-4M4 5v4h4M4 13a8 8 0 0 0 14.5 4M20 19v-4h-4"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', trend: '<path d="M4 17l5-5 4 4 7-8M15 8h5v5"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', org: '<path d="M12 4v5M5 20v-5h14v5M12 9H5v6M12 9h7v6"/>',
    layers: '<path d="M12 3 3 8l9 5 9-5zM3 13l9 5 9-5"/>', doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>', save: '<path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6"/>', msg: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.3A8 8 0 1 1 21 12z"/>',
    star: '<path d="M12 4l2.4 5 5.6.8-4 4 1 5.6-5-2.7-5 2.7 1-5.6-4-4 5.6-.8z"/>', send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>', grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>', pin: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'
  };
  var ic = function (k, c) { return '<svg class="' + (c || 'si') + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[k] || '') + '</svg>'; };

  /* ---------- sample data ---------- */
  var TYPES = {
    c360: { key: 'c360', label: '360', full: 'Calybrate360', ic: 'refresh' },
    culture: { key: 'culture', label: 'Culture', full: 'CalybrateCulture', ic: 'bar' },
    me: { key: 'me', label: 'Personality', full: 'CalybrateMe', ic: 'user' },
    c180: { key: 'c180', label: '180', full: 'Calybrate180', ic: 'target' }
  };
  var TORDER = ['c360', 'culture', 'me', 'c180'];
  var CAMPS = [
    { id: 1, name: 'Test@today', type: 'c360', status: 'closed', s: '20th Oct', e: '27th Oct', n: 25 },
    { id: 2, name: 'Validation_Test_05th_OCT', type: 'c360', status: 'closed', s: '5th Oct', e: '23rd Oct', n: 25 },
    { id: 3, name: 'Test_Sep_30', type: 'c360', status: 'draft', s: '30th Sep', e: '9th Oct', n: 12 },
    { id: 4, name: 'kkk', type: 'culture', status: 'rejected', s: '6th Oct', e: '7th Oct', n: 0 },
    { id: 5, name: 'Test_Culture_Validation_5th_Oct', type: 'culture', status: 'pending', s: '5th Oct', e: '30th Oct', n: 0 },
    { id: 6, name: 'Thilakshana_Culture', type: 'culture', status: 'closed', s: '10th Oct', e: '12th Nov', n: 0 },
    { id: 7, name: 'Calybrate Me - Sachithra_16th Oct', type: 'me', status: 'closed', s: '16th Oct', e: '23rd Oct', n: 25 },
    { id: 8, name: 'Testing_Personality', type: 'me', status: 'closed', s: '8th Oct', e: '15th Oct', n: 15 },
    { id: 9, name: 'Personality_Test', type: 'me', status: 'closed', s: '1st Oct', e: '7th Oct', n: 10 }
  ];
  var FN = ['Anjalee', 'Ayesha', 'Chamara', 'Dilini', 'Eshan', 'Farah', 'Gihan', 'Harini', 'Isuru', 'Janani', 'Kavindu', 'Lakshi', 'Malith', 'Nadee', 'Oshan', 'Piumi', 'Ravindu', 'Sanjaya', 'Tharindu', 'Udari', 'Vimukthi', 'Wasana', 'Yasiru', 'Zara', 'Amaya'];
  var LN = ['Gunasekara', 'Jayawardena', 'Dissanayake', 'Senanayake', 'Perera', 'Silva', 'Fernando', 'Wickrama', 'Bandara', 'Rajapaksa', 'Herath', 'Samarasinghe', 'Karunaratne', 'Liyanage', 'Mendis', 'Peiris', 'Ranasinghe', 'Weerasinghe', 'Amarasinghe', 'Gamage', 'Hettiarachchi', 'Ekanayake', 'Jayasuriya', 'Kumara', 'Navaratne'];
  var PARTS = FN.map(function (f, i) { return { name: f + ' ' + LN[i], email: f.toLowerCase() + '.' + LN[i].toLowerCase() + '@example.com' }; });
  var EMP0 = [['Sanduni Abeysekera', 'HR Manager', 'Human Resources'], ['Kasun Amarasiri', 'Engineer', 'Technology'], ['Sithumini Arsakularatne', 'Analyst', 'Finance'], ['Meli D', 'Designer', 'Product'], ['Sachini De Silva', 'Coordinator', 'Operations'], ['Chamara Dissanayake', 'Team Lead', 'Technology']];
  var EMPS = [];
  for (var i = 0; i < 46; i++) {
    var b = EMP0[i] || null, nm = b ? b[0] : FN[i % 25] + ' ' + LN[(i * 7 + 3) % 25];
    EMPS.push({ id: i, name: nm, email: nm.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.') + '@example.com', pos: b ? b[1] : ['Engineer', 'Analyst', 'Manager', 'Designer'][i % 4], dept: b ? b[2] : ['Technology', 'Finance', 'Operations', 'Product'][i % 4], active: i % 9 !== 8 });
  }
  var LEVELS = [{ n: 1, name: 'Executive Leadership', sub: 'Top of the organization', c: 3, on: true }, { n: 2, name: 'Senior Management', sub: 'Reports to Level 1', c: 8, on: true }, { n: 3, name: 'Middle Management', sub: 'Reports to Level 2', c: 12, on: true }, { n: 4, name: 'Team Leads', sub: 'Reports to Level 3', c: 9, on: true }, { n: 5, name: 'Staff', sub: 'Reports to Level 4', c: 14, on: true }];
  var ADMINS = [{ email: 'owner@testing-company.com', role: 'Super Admin', st: 'Active', auth: 'Google', joined: 'Sep 12, 2026' }, { email: 'hr.lead@testing-company.com', role: 'Admin', st: 'Active', auth: 'Email', joined: 'Oct 02, 2026' }, { email: 'ops@testing-company.com', role: 'Admin', st: 'Pending', auth: 'Email', joined: 'Pending' }];
  var TOUR = [
    { sel: null, t: 'Welcome to Calybrate!', x: "Let's take a quick tour to help you get started with your dashboard." },
    { sel: 'dashboard', t: 'Dashboard', x: 'This is your Analytics Dashboard. Here you can see key metrics and campaign performance at a glance.' },
    { sel: 'campaigns', t: 'Campaigns', x: 'View all your campaigns here. In tour mode, we show sample campaigns with different participant counts.' },
    { sel: 'reports', t: 'Reports', x: 'Generate and download comprehensive reports about your campaigns, employee performance, and organizational insights.' },
    { sel: 'users', t: 'Users', x: 'Manage employee profiles here. Super Admins can also manage administrator invitations in the Admins tab.', xa: 'Manage employee profiles here. Employees and Organization Levels are in this area.' },
    { sel: 'chip', t: 'Your Profile', x: 'Your organization and profile information is displayed here.' },
    { sel: 'metrics', t: 'Key Metrics Overview', x: "Here you can see your organization's key metrics." },
    { sel: 'c180', t: '180 Review Campaign', x: 'This campaign uses 180-degree feedback methodology. It provides a balanced view from multiple perspectives with 120 participants.' },
    { sel: 'cme', t: 'Personality Assessment', x: 'Explore personality insights with our sample assessment.' },
    { sel: 'create', t: 'Create Campaign', x: "Ready to start? Click here to create your first campaign. We'll guide you through the process with sample data." }
  ];

  /* ---------- state ---------- */
  var S = { role: 'super', page: 'dashboard', type: null, cid: null, cul: false, rep: null, rtab: 'lead', ptab: 'all', pq: '', utab: 'emp', uid: null, q: '', chip: 'all', pg: 1, fil: { status: [], type: [] }, tour: -1, toured: false, lvlTree: false, cm: 0 };
  var W = null;
  var isSuper = function () { return S.role === 'super'; };
  var cnt = function (t) { return CAMPS.filter(function (c) { return c.type === t; }); };
  var stat = function (list) { var m = {}; list.forEach(function (c) { m[c.status] = (m[c.status] || 0) + 1; }); return m; };
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var avatar = function (n, d) { var p = String(n).split(' '); return '<span class="av' + (d ? ' d' : '') + '">' + esc((p[0][0] || '') + (p[1] ? p[1][0] : '')) + '</span>'; };

  /* ---------- small pieces ---------- */
  function ring(p, size, sw) {
    var r = (size - sw) / 2, c = 2 * Math.PI * r;
    return '<span class="ring" style="width:' + size + 'px;height:' + size + 'px"><svg width="' + size + '" height="' + size + '"><circle class="t" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + sw + '"/><circle class="v" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" stroke-width="' + sw + '" style="stroke-dasharray:' + c + ';stroke-dashoffset:' + c + '" data-off="' + (c * (1 - p / 100)) + '"/></svg><b>' + p + '%</b></span>';
  }
  var AX = ['Agility', 'Daring', 'Outward', 'Market', 'Governance', 'Authority'];
  function radar(w, vals, labels) {
    var n = vals.length, cx = 100, cy = 100, R = 70;
    function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; }
    function poly(v) { return v.map(function (x, i) { return pt(i, x).map(function (q) { return q.toFixed(1); }).join(','); }).join(' '); }
    var s = '<svg viewBox="0 0 200 200" width="' + w + '" style="max-width:100%;height:auto">';
    [.33, .66, 1].forEach(function (k) { s += '<polygon points="' + poly(vals.map(function () { return k; })) + '" fill="none" stroke="#E4D7F4"/>'; });
    vals.forEach(function (v, i) { var p = pt(i, 1); s += '<line x1="100" y1="100" x2="' + p[0] + '" y2="' + p[1] + '" stroke="#E4D7F4"/>'; if (labels) { var q = pt(i, 1.3); s += '<text x="' + q[0] + '" y="' + (q[1] + 3) + '" font-size="8" fill="#6B6280" text-anchor="middle">' + AX[i] + '</text>'; } });
    s += '<polygon points="' + poly(vals.map(function (v) { return Math.min(1, v + .15); })) + '" fill="rgba(240,165,58,.22)" stroke="#F0A53A" stroke-width="1.6"/><polygon points="' + poly(vals) + '" fill="rgba(75,0,130,.2)" stroke="#4B0082" stroke-width="2"/>';
    return s + '</svg>';
  }
  var RV = [.7, .62, .78, .55, .66, .5];
  var barsPic = '<svg class="pic" viewBox="0 0 120 56"><g fill="#E7DAF6"><rect y="4" width="120" height="8" rx="4"/><rect y="18" width="120" height="8" rx="4"/><rect y="32" width="120" height="8" rx="4"/><rect y="46" width="120" height="8" rx="4"/></g><g fill="#7A2FD0"><rect y="4" width="96" height="8" rx="4"/><rect y="18" width="64" height="8" rx="4"/><rect y="32" width="80" height="8" rx="4"/><rect y="46" width="40" height="8" rx="4"/></g></svg>';
  var ringPic = '<svg class="pic" viewBox="0 0 120 100"><g stroke="#B792E8"><line x1="60" y1="50" x2="60" y2="8"/><line x1="60" y1="50" x2="108" y2="38"/><line x1="60" y1="50" x2="90" y2="92"/><line x1="60" y1="50" x2="30" y2="92"/><line x1="60" y1="50" x2="12" y2="38"/></g><circle cx="60" cy="50" r="12" fill="#4B0082"/><g fill="#F3ECFB" stroke="#4B0082" stroke-width="1.6"><circle cx="60" cy="8" r="6"/><circle cx="108" cy="38" r="6"/><circle cx="90" cy="92" r="6"/><circle cx="30" cy="92" r="6"/><circle cx="12" cy="38" r="6"/></g></svg>';
  var loopPic = '<svg class="pic" viewBox="0 0 140 60"><circle cx="16" cy="30" r="13" fill="#F3ECFB" stroke="#4B0082" stroke-dasharray="3 3"/><circle cx="124" cy="30" r="13" fill="#F3ECFB" stroke="#4B0082" stroke-dasharray="3 3"/><path d="M29 24C55 6 85 6 111 24" fill="none" stroke="#4B0082"/><path d="M111 36C85 54 55 54 29 36" fill="none" stroke="#F0A53A"/></svg>';
  var PIC = { c360: ringPic, culture: '<span class="pic" style="width:110px">' + radar(110, RV, false) + '</span>', me: barsPic, c180: loopPic };

  /* ---------- shell ---------- */
  var NAV = [['dashboard', 'Dashboard', 'dash'], ['campaigns', 'Campaigns', 'camp'], ['reports', 'Reports', 'rep'], ['users', 'Users', 'users']];
  function chip() {
    return '<div class="chipwrap"><button class="me" data-a="menu" data-tour="chip" aria-haspopup="true">' + avatar('Testing Company', true).replace('av d', 'av') + '<span><b>Testing Company</b><small>' + (isSuper() ? ic('crown', 'si') + ' Super Admin' : ic('user', 'si') + ' Admin') + '</small></span>' + ic('down') + '</button>' +
      '<div class="menu" id="menu"><h6>Preview as</h6><button data-a="role" data-r="super" class="' + (isSuper() ? 'on' : '') + '">' + ic('crown') + ' Super Admin' + ic('check') + '</button><button data-a="role" data-r="admin" class="' + (!isSuper() ? 'on' : '') + '">' + ic('user') + ' Admin' + ic('check') + '</button></div></div>';
  }
  function layout(title, sub, body, extra) {
    var navB = NAV.map(function (n) { return '<button class="' + (S.page === n[0] ? 'on' : '') + '" data-a="nav" data-p="' + n[0] + '" data-tour="' + n[0] + '">' + ic(n[2]) + n[1] + '</button>'; }).join('');
    var bn = NAV.map(function (n) { return '<button class="' + (S.page === n[0] ? 'on' : '') + '" data-a="nav" data-p="' + n[0] + '" data-tour="' + n[0] + '">' + ic(n[2]) + n[1] + '</button>'; }).join('');
    var tb = S.tour >= 0 ? '<div class="tourbar on">Tour Mode: Viewing sample data. Follow the guide to create your first campaign.</div>' : '';
    return '<div class="app' + (S.tour >= 0 ? ' tourmode' : '') + '"><aside class="side"><div class="logo"><img src="' + LOGO + '" alt="">CALYBRATE</div><nav class="nav">' + navB + '</nav><div class="grow"></div>' +
      '<button class="btn" data-a="create" data-tour="create">' + ic('plus') + ' Create Campaign</button><button class="btn red" data-a="logout">' + ic('logout') + ' Logout</button></aside>' +
      '<main class="main">' + tb + '<div class="mtop"><div class="logo" style="padding:0"><img src="' + LOGO + '" alt="">CALYBRATE</div><button class="btn sm" data-a="create">' + ic('plus') + ' Create</button></div>' +
      '<div class="top"><div>' + (extra && extra.back ? extra.back : '') + (title ? '<h1>' + title + '</h1>' : '') + (sub ? '<p>' + sub + '</p>' : '') + (extra && extra.after ? extra.after : '') + '</div>' + (extra && extra.nochip ? '' : chip()) + '</div>' + body + '</main><nav class="bnav">' + bn + '</nav></div>';
  }
  var backBtn = function (a, l, extra) { return '<button class="back" data-a="' + a + '"' + (extra || '') + '>' + ic('left') + ' ' + l + '</button>'; };

  /* ---------- Dashboard ---------- */
  function vDash() {
    var tm = S.tour >= 0;
    var body = '<div class="grid4 metrics rise" data-tour="metrics">' +
      '<div class="card dark"><div class="cap"><span class="ico">' + ic('users') + '</span>Total participants</div><div class="num" data-count="37">0</div><div class="sub">Across 0 campaigns</div><svg class="spark" viewBox="0 0 200 50" preserveAspectRatio="none"><path d="M0 40 L30 36 L60 41 L90 30 L120 33 L150 20 L180 24 L200 8"/></svg></div>' +
      '<div class="card"><div class="cap"><span class="ico">' + ic('bolt') + '</span>Active campaigns</div><div class="num" data-count="0">0</div><div class="sub">No active campaigns</div></div>' +
      '<div class="card"><div class="cap"><span class="ico">' + ic('check') + '</span>Completed campaigns</div><div class="num" data-count="18">0</div><div class="sub">Finished</div>' + ring(72, 44, 5) + '</div>' +
      '<div class="card"><div class="cap"><span class="ico">' + ic('clock') + '</span>Draft campaigns</div><div class="num" data-count="4">0</div><div class="sub">Not yet launched</div>' + ring(30, 44, 5) + '</div></div>' +
      '<div class="dash2 rise"><div class="card samp" data-a="open-c" data-t="c180" data-tour="c180" style="cursor:pointer"><div class="cap"><span class="ico">' + ic('bolt') + '</span>DUMMY - Calybrate 180 <span class="tag sample">Sample</span></div><h3>Demo data</h3><div class="sub">Explore features</div><div style="display:flex;align-items:center;gap:10px"><div style="flex:1"><div class="row"><span>Review type</span><span class="tag">180</span></div><div class="row"><span>No. of employees</span><b>120</b></div></div><div style="width:96px">' + radar(96, RV, false) + '</div></div></div>' +
      '<div class="card samp cream" data-tour="cme"><div class="cap"><span class="ico" style="background:#FFF1DA;color:#B97500">' + ic('user') + '</span>DUMMY - Calybrate Me <span class="tag sample">Sample</span></div><h3>Demo data</h3><div class="sub">Explore personality assessment features</div><div style="display:flex;align-items:center;gap:12px;margin-top:6px"><div style="flex:1"><div class="row"><span>Assessment type</span><span class="tag" style="background:#F3ECFB">Personality</span></div><div class="row"><span>No. of employees</span><b>15</b></div></div><div class="bars3" style="width:70px"><i style="width:90%"></i><i style="width:60%"></i><i style="width:75%"></i><i style="width:40%"></i></div></div></div>' +
      '<div class="stack"><div class="card dark"><div class="cap"><span class="ico">' + ic('bolt') + '</span>Active participants</div><div style="display:flex;justify-content:space-between;align-items:flex-end"><div><div class="num" data-count="0">0</div><div class="sub">Currently in progress</div></div>' + ring(70, 46, 5) + '</div></div>' +
      '<div class="card"><div class="cap"><span class="ico">' + ic('clock') + '</span>Not started assessments</div><div style="display:flex;justify-content:space-between;align-items:flex-end"><div><div class="num" data-count="0">0</div><div class="sub">Waiting to begin</div></div>' + ring(20, 46, 5) + '</div></div></div>' +
      '<div class="banner"><div class="faces"><i style="background:linear-gradient(135deg,#F0A53A,#9C54E8)"></i><i style="background:linear-gradient(135deg,#7A8CFF,#9C54E8)"></i><i style="background:linear-gradient(135deg,#34C38F,#4DA3D8)"></i></div><div><b>View All Campaigns</b><small>0 more campaigns</small></div><button class="btn" data-a="nav" data-p="campaigns">View all</button></div></div>';
    return layout('Analytics Dashboard' + (tm ? ' (Tour Mode)' : ''), 'Get started by exploring sample campaigns or create your own', body);
  }

  /* ---------- Campaigns ---------- */
  function vCamps() {
    if (S.cul) return vCulture();
    if (S.cid) return vDetail();
    if (S.type) return vType();
    var total = CAMPS.length;
    var cards = TORDER.map(function (k) {
      var t = TYPES[k], l = cnt(k), m = stat(l), latest = l[l.length ? 0 : 0], none = !l.length;
      var chips = none ? '<span class="c4">None yet</span>' : [['closed', 'c1', 'Closed'], ['draft', 'c2', 'Draft'], ['pending', 'c2', 'Pending'], ['rejected', 'c3', 'Rejected']].filter(function (x) { return m[x[0]]; }).map(function (x) { return '<span class="' + x[1] + '">' + m[x[0]] + ' ' + x[2] + '</span>'; }).join('');
      return '<button class="bc' + (none ? ' empty' : '') + '" data-a="type" data-t="' + k + '"><div class="hd"><span class="ib">' + ic(t.ic) + '</span><div><h3>' + t.label + '</h3><small>' + t.full + '</small></div><span class="go">' + ic('right') + '</span></div>' +
        '<div class="big"><span data-count="' + l.length + '">0</span><small>campaigns</small></div><div class="st">' + chips + '</div>' +
        (none ? '<div class="lt">Create a 180 campaign to see it here.</div>' : '<div class="lt">Latest: <b>' + esc(latest.name) + '</b> · ' + latest.s + ' - ' + latest.e + '</div>') + PIC[k] + '</button>';
    }).join('');
    return layout('Campaigns', 'Manage and monitor all organizational review cycles.',
      '<div class="tools" style="justify-content:space-between"><div class="sub">' + total + ' campaigns across 4 review types. Tap a card to open it.</div><button class="btn ghost sm" data-a="filter">' + ic('filter') + ' Filter</button></div><div class="bento rise">' + cards + '</div>');
  }
  function filtered(list) {
    var f = S.fil; return list.filter(function (c) { return (!f.status.length || f.status.indexOf(c.status) > -1) && (!f.type.length || f.type.indexOf(c.type) > -1); });
  }
  function vType() {
    var t = TYPES[S.type], all = cnt(S.type), l = filtered(all), m = stat(all);
    var sm = all.length + ' campaigns' + (m.closed ? ' · ' + m.closed + ' Closed' : '') + (m.draft ? ' · ' + m.draft + ' Draft' : '');
    var chips = '<div class="chips">' + TORDER.map(function (k) { return '<button class="chip' + (k === S.type ? ' on' : '') + '" data-a="type" data-t="' + k + '">' + TYPES[k].label + ' <small>' + cnt(k).length + '</small></button>'; }).join('') + '</div>';
    var body = '<div class="tools" style="justify-content:space-between">' + chips + '<button class="btn ghost sm" data-a="filter">' + ic('filter') + ' Filter' + (S.fil.status.length + S.fil.type.length ? ' (' + (S.fil.status.length + S.fil.type.length) + ')' : '') + '</button></div>';
    if (!l.length) body += '<div class="emptyc"><div class="ic">' + ic('camp') + '</div><h3>No campaigns here yet</h3><p>' + (all.length ? 'Nothing matches the filter.' : 'Create a ' + t.label + ' campaign to see it here.') + '</p><button class="btn" data-a="create">' + ic('plus') + ' Create campaign</button></div>';
    else {
      var h = l[0], rest = l.slice(1);
      body += '<div class="leta rise"><div class="bigc"><div class="cap">Latest campaign</div><h2>' + esc(h.name) + '</h2><div><span class="tag">' + t.label + '</span> <span class="tag dot">' + cap(h.status) + '</span></div><div class="mid">' + ring(0, 74, 8) + '<div class="pct">0%<small>participation</small></div><button class="btn" data-a="open-c" data-id="' + h.id + '">View campaign ' + ic('right') + '</button></div><div class="ft"><div><small>Review type</small>' + t.label + '</div><div><small>Starts</small>' + h.s + '</div><div><small>Ends</small>' + h.e + '</div></div></div>' +
        '<div class="clist">' + rest.map(function (c) { return '<div class="cc"><div class="r1">' + ring(0, 44, 5) + '<div><h4>' + esc(c.name) + '</h4><span class="tag">' + t.label + '</span> <span class="tag ' + c.status + ' dot">' + cap(c.status) + '</span></div></div><div class="r2">' + ic('cal') + ' ' + c.s + ' - ' + c.e + '<span class="grow"></span>' + (c.status === 'draft' ? '<button class="ib2 o" data-a="toast" data-m="Draft opened (sample)">' + ic('play') + '</button><button class="ib2 r" data-a="del" data-id="' + c.id + '">' + ic('trash') + '</button>' : '<button class="ib2" data-a="open-c" data-id="' + c.id + '" aria-label="Open">' + ic('eye') + '</button>') + '</div></div>'; }).join('') + '</div></div>';
    }
    return layout('Campaigns', 'Manage and monitor all organizational review cycles.', body, { after: '<div style="margin-top:14px">' + backBtn('camps-home', 'All campaigns') + '</div><div style="display:flex;align-items:center;gap:12px;margin:2px 0 14px"><span class="ico2">' + ic(t.ic) + '</span><div><div style="font-size:26px;font-weight:800;letter-spacing:-.03em;line-height:1">' + t.label + '</div><div class="sub">' + t.full + ' · ' + sm + '</div></div></div>' });
  }
  function partList() {
    var q = S.pq.toLowerCase(), l = PARTS.filter(function (p) { return !q || p.name.toLowerCase().indexOf(q) > -1 || p.email.indexOf(q) > -1; });
    if (S.ptab === 'prog' || S.ptab === 'done') l = [];
    return l;
  }
  function vDetail() {
    var c = CAMPS.filter(function (x) { return x.id === S.cid; })[0], t = TYPES[c.type], list = partList(), closed = c.status === 'closed';
    var rows = list.slice(0, 12).map(function (p, i) { return '<div class="prow" style="animation-delay:' + i * 40 + 'ms">' + avatar(p.name, true) + '<div class="who"><b>' + esc(p.name) + '</b><small>' + esc(p.email) + '</small><span class="nd">Could not deliver</span></div><span class="tag ongoing dot">Ongoing</span><span class="pg">PROGRESS ' + ic('down') + '</span><button class="mailb" data-a="remind1" data-n="' + esc(p.name) + '" aria-label="Email ' + esc(p.name) + '">' + ic('mail') + '</button></div>'; }).join('') || '<div class="emptyc" style="margin-top:6px;padding:30px"><p style="margin:0">No participants in this view.</p></div>';
    var tabs = [['all', 'All (25)'], ['ns', 'Not started (25)'], ['prog', 'In progress (0)'], ['done', 'Completed (0)']].map(function (x) { return '<button class="' + (S.ptab === x[0] ? 'on' : '') + '" data-a="ptab" data-t="' + x[0] + '">' + x[1] + '</button>'; }).join('');
    var body = '<div class="det rise"><div class="card"><div class="cap"><span class="ico">' + ic('doc') + '</span><b style="font-size:14px;color:var(--ink);letter-spacing:0;text-transform:none">Campaign Details</b></div><div class="kv"><div><small>Name</small><b>' + esc(c.name) + '</b></div><div><small>Status</small><span class="tag ' + c.status + ' dot">' + cap(c.status) + '</span></div><div><small>Start date</small><b>' + c.s + ', 2026</b></div><div><small>End date</small><b>' + c.e + ', 2026</b></div></div><div class="cap" style="margin-top:16px">Extend campaign end date</div>' + (closed ? '<div class="lock">' + ic('cal') + ' CAMPAIGN CLOSED</div><div class="sub" style="text-align:center;margin-top:6px">This campaign is closed. Extension is not available.</div>' : '<input class="inp" type="date" style="margin-top:8px">') + '</div>' +
      '<div class="card dark"><div class="cap"><span class="ico">' + ic('trend') + '</span>Progress</div><div style="display:flex;align-items:center;gap:16px;margin:14px 0">' + ring(0, 84, 9) + '<div><div class="sub">Overall completion</div><div class="num" style="margin:2px 0;font-size:34px">0%</div><div class="sub">0 of 25 completed</div></div></div><div class="cap" style="margin-bottom:4px">By role</div>' + ['Self', 'Manager', 'Peer', 'Team'].map(function (r, i) { return '<div class="bar"><span>' + r + '</span><i style="--w:0%"></i><b>0/' + [25, 24, 42, 24][i] + '</b></div>'; }).join('') + '</div></div>' +
      '<div class="card rise" style="margin-top:16px"><div class="ptabs">' + tabs + '</div><h3 style="font-size:18px">Assessment Participants</h3><div class="sub">Total of 25 employees</div><div class="tools"><button class="btn green sm" data-a="addemp">' + ic('user') + ' Add new employee</button><button class="btn sm" data-a="remind">' + ic('mail') + ' Send reminder (25)</button><button class="btn ghost sm" data-a="toast" data-m="CSV exported (sample)">' + ic('dl') + ' Export CSV</button><label class="search">' + ic('search') + '<input id="pq" placeholder="Search participant..." value="' + esc(S.pq) + '"></label></div>' + rows + '</div>';
    return layout('', '', body, { back: backBtn('type', 'Back to campaigns', ' data-t="' + c.type + '"') + '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:2px 0 12px"><h1 style="margin:0">' + esc(c.name) + '</h1><span class="tag ' + (closed ? 'completed' : c.status) + ' dot">' + (closed ? 'Completed' : cap(c.status)) + '</span><span class="tag">' + t.label + '</span></div><div class="chips"><span class="chip">' + ic('cal') + ' Campaign: ' + esc(c.name) + '</span><span class="chip">' + ic('cal') + ' Due date: ' + c.e + ', 2026</span></div>' });
  }
  function vCulture() {
    var c = CAMPS.filter(function (x) { return x.id === S.cid; })[0] || CAMPS[5];
    var tiles = [['Overall progress', S.cm ? '33%' : '0%', 'bar', true], ['Consultant progress', '0%', 'crown'], ['Leadership progress', '0%', 'users'], ['Employee progress', '0%', 'doc']].map(function (t) { return '<div class="card' + (t[3] ? ' dark' : '') + '"><div class="cap"><span class="ico">' + ic(t[2]) + '</span>' + t[0] + '</div><div class="num" style="font-size:36px">' + t[1] + '</div>' + (t[3] ? '<div class="pbar" style="background:rgba(255,255,255,.2)"><i style="width:' + (S.cm ? 33 : 0) + '%;background:#fff"></i></div>' : '') + '</div>'; }).join('');
    var cards = [['Consultant Benchmark', 'Default Benchmark score', 'crown', 1], ['Leadership Assessment', 'multiple surveys', 'users', 0], ['Employee Assessment', 'Random sampling for Employees', 'doc', 0]].map(function (c2, i) {
      var made = i === 0 ? 1 : (S.cm > i ? 1 : 0);
      return '<div class="card"><div style="display:flex;justify-content:space-between"><span class="ico2">' + ic(c2[2]) + '</span><span class="tag">' + (made ? 1 : 0) + ' Created</span></div><h3>' + c2[0] + '</h3><div class="sub">' + c2[1] + '</div><div class="acts"><button class="btn sm" data-a="newass" data-n="' + c2[0] + '" data-i="' + i + '">' + ic('plus') + ' Create new</button><button class="btn ghost sm' + (made ? '' : ' off') + '" data-a="toast" data-m="Details (sample)">' + ic('eye') + ' View details</button></div>' + (made ? '' : '<small class="n">No assessments created yet</small>') + '</div>';
    }).join('');
    return layout('Culture Assessment Dashboard', '', '<div class="culdash"><div class="chips" style="margin-bottom:16px"><span class="chip">' + ic('cal') + ' Campaign: <b>' + esc(c.name) + '</b></span><span class="chip">' + ic('cal') + ' Due date: <b>' + c.e + ', 2026</b></span><button class="btn sm" data-a="toast" data-m="Full details (sample)" style="margin-left:auto">' + ic('eye') + ' View full details</button></div><div class="grid4 rise">' + tiles + '</div><div class="cul3 rise">' + cards + '</div></div>', { back: backBtn('type', 'Back to campaigns', ' data-t="culture"') });
  }

  /* ---------- Reports ---------- */
  function vReports() {
    if (S.rep === 'fb') return vFb();
    if (S.rep === 'cul') return vRCul();
    var mk = function (title, tag, pic, tiles, key) {
      return '<div class="card rcard"><span class="ico2">' + ic(key === 'fb' ? 'users' : 'doc') + '</span><span class="tag ab">' + tag + '</span><h2>' + title + '</h2><p>' + (key === 'fb' ? 'Evaluate employee performance using comprehensive feedback from peers, managers, and direct reports.' : 'Measure organizational health, culture maturity, employee engagement, and compare departments with detailed analytics.') + '</p>' + pic +
        '<div class="tiles">' + tiles.map(function (t) { return '<button class="tilec" data-a="rep" data-k="' + key + '" data-tab="' + t[1] + '">' + ic(t[2]) + t[0] + '</button>'; }).join('') + '</div><button class="btn sm" data-a="rep" data-k="' + key + '">View reports ' + ic('right') + '</button></div>';
    };
    var body = '<div class="rl rise">' + mk('180° / 360° Feedback', 'Leadership', barsPic, [['Leadership Insights', 'lead', 'target'], ['Impact View', 'imp', 'trend'], ['Facet Deep Dive', 'facet', 'layers']], 'fb') + mk('Culture Assessment', 'Organization', '<span class="pic" style="width:30%">' + radar(150, RV, false) + '</span>', [['Overall View', 'ov', 'dash'], ['Six Dimensions', 'six', 'layers'], ['Multi-View Analysis', 'mv', 'users'], ['Employee Feedback', 'ef', 'msg']], 'cul') + '</div>';
    return layout('Reports', 'Access insightful reports to evaluate employee performance, leadership effectiveness, and organizational culture through interactive analytics.', body);
  }
  function vFb() {
    var tabs = [['lead', 'Leadership Facets'], ['imp', 'Impact View'], ['facet', 'Facet Deep Dive']].map(function (x) { return '<button class="' + (S.rtab === x[0] ? 'on' : '') + '" data-a="rtab" data-t="' + x[0] + '">' + x[1] + '</button>'; }).join('');
    var opts = function (a) { return a.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join(''); };
    var body = '<div class="card filt rise"><label>Campaign<select>' + opts(['Test@today', 'Validation_Test_05th_OCT']) + '</select></label><label>Employee<select>' + opts(PARTS.slice(0, 6).map(function (p) { return p.name; })) + '</select></label><button class="btn ghost" data-a="toast" data-m="Filters reset">Reset</button><button class="btn" data-a="toast" data-m="Filters applied">Apply</button></div>' +
      '<div class="tools" style="justify-content:space-between;margin-top:16px"><div class="rtabs">' + tabs + '</div><div style="display:flex;gap:10px"><button class="btn ghost sm" data-a="toast" data-m="PDF download started (sample)">' + ic('dl') + ' Download PDF</button><button class="btn sm" data-a="share">' + ic('share') + ' Share reports</button></div></div>' +
      '<div class="emptyc"><div class="ic">' + ic('warn') + '</div><h3>Unable to load report</h3><p>The selected employee has not completed this assessment yet.</p><button class="btn ghost" data-a="toast" data-m="Pick another employee above">' + ic('user') + ' Change employee</button></div>';
    return layout('', '', body, { back: backBtn('reps-home', 'Back to reports') + '<h1 style="margin:0 0 14px">180° / 360° Feedback Reports</h1>' });
  }
  function vRCul() {
    var tabs = [['ov', 'Overall View'], ['six', 'Six Dimensions'], ['mv', 'Multi-View Analysis'], ['ef', 'Employee Feedback']];
    var tab = S.rtab in { ov: 1, six: 1, mv: 1, ef: 1 } ? S.rtab : 'ov', main = '';
    if (tab === 'ov') main = '<div class="card"><h3>Culture Profile: Now vs Preferred</h3><div class="sub">Now · Preferred · Benchmark</div><div style="display:flex;justify-content:center;padding:10px">' + radar(380, RV, true) + '</div></div>';
    else if (tab === 'six') main = '<div class="g3 rise">' + AX.map(function (a, i) { return '<div class="card"><div class="cap">' + a + '</div><div class="num" style="font-size:32px">' + Math.round(RV[i] * 100) + '</div><div class="pbar"><i style="width:' + RV[i] * 100 + '%"></i></div><div class="sub">vs preferred ' + Math.round(Math.min(1, RV[i] + .15) * 100) + '</div></div>'; }).join('') + '</div>';
    else if (tab === 'mv') main = '<div class="g3 rise">' + ['Consultant', 'Leadership', 'Employee'].map(function (a, i) { return '<div class="card"><div class="cap">' + a + ' view</div><div style="display:flex;justify-content:center">' + radar(170, RV.map(function (v) { return Math.max(.3, v - i * .06); }), false) + '</div></div>'; }).join('') + '</div>';
    else main = '<div class="g3 rise">' + [['Strengths', 'Clear direction and trust in leadership.'], ['Friction points', 'Handover between departments feels slow.'], ['Suggestions', 'More frequent, shorter pulse surveys.']].map(function (a) { return '<div class="card"><div class="cap">' + a[0] + '</div><p style="margin-top:10px;font-size:13px;color:#4A4358">' + a[1] + '</p></div>'; }).join('') + '</div>';
    var side = '<div class="repside"><div class="card"><div class="cap">Filters</div><label class="fld" style="margin-top:12px">Campaign<select><option>Thilakshana_Culture</option></select></label><label class="fld" style="margin-top:12px">Department<select><option>All departments</option><option>Technology</option><option>Finance</option></select></label><label class="fld" style="margin-top:12px">Period<select><option>Last 6 months</option></select></label></div></div>';
    return layout('', '', '<div class="rtabs" style="margin-bottom:16px">' + tabs.map(function (x) { return '<button class="' + (tab === x[0] ? 'on' : '') + '" data-a="rtab" data-t="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><div class="rep rise">' + side + '<div>' + main + '</div></div>', { back: backBtn('reps-home', 'Back to reports') + '<h1 style="margin:0 0 14px">Calybrate Culture Reports</h1>' });
  }

  /* ---------- Users ---------- */
  function utabs() {
    var t = [['emp', 'Employees', 'users']].concat(isSuper() ? [['adm', 'Admins', 'crown']] : []).concat([['lvl', 'Organization Levels', 'org']]);
    return '<div class="seg">' + t.map(function (x) { return '<button class="' + (S.utab === x[0] ? 'on' : '') + '" data-a="utab" data-t="' + x[0] + '">' + ic(x[2]) + x[1] + '</button>'; }).join('') + '</div>';
  }
  function vUsers() {
    if (!isSuper() && S.utab === 'adm') S.utab = 'emp';
    if (S.uid != null) return vProfile();
    var body = utabs();
    if (S.utab === 'emp') {
      var q = S.q.toLowerCase(), all = EMPS.filter(function (e) { return (S.chip === 'all' || (S.chip === 'act') === e.active) && (!q || e.name.toLowerCase().indexOf(q) > -1 || e.email.indexOf(q) > -1); });
      var pages = Math.max(1, Math.ceil(all.length / 10)); if (S.pg > pages) S.pg = pages;
      var page = all.slice((S.pg - 1) * 10, S.pg * 10);
      body += '<div class="top" style="margin:0 0 12px"><div><h1 style="font-size:28px">Employee Management</h1><p>Manage employees for your organization</p></div><button class="btn" data-a="newemp">' + ic('plus') + ' Add employee</button></div>' +
        '<div class="tools"><label class="search">' + ic('search') + '<input id="eq" placeholder="Search employees..." value="' + esc(S.q) + '"></label><div class="chips">' + [['all', 'All · 46'], ['act', 'Active'], ['ina', 'Inactive']].map(function (x) { return '<button class="chip' + (S.chip === x[0] ? ' on' : '') + '" data-a="chip" data-c="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
        '<div class="card" style="padding:0;overflow:hidden">' + (page.map(function (e, i) { return '<div class="urow" style="animation-delay:' + i * 35 + 'ms">' + avatar(e.name, true) + '<div class="who"><b>' + esc(e.name) + ' <span class="tag ' + (e.active ? 'active' : 'closed') + ' dot">' + (e.active ? 'Active' : 'Inactive') + '</span></b><small>' + esc(e.email) + '</small></div><button class="btn ghost sm" data-a="profile" data-id="' + e.id + '">See details ' + ic('right') + '</button></div>'; }).join('') || '<div class="emptyc" style="border:0"><p>No employees match.</p></div>') + '<div class="pager"><span>Page ' + S.pg + ' of ' + pages + '</span><span class="pb"><button data-a="pg" data-d="-1"' + (S.pg <= 1 ? ' disabled' : '') + ' aria-label="Previous">' + ic('left') + '</button><button data-a="pg" data-d="1"' + (S.pg >= pages ? ' disabled' : '') + ' aria-label="Next">' + ic('right') + '</button></span></div></div>';
    } else if (S.utab === 'adm') {
      body += '<div class="top" style="margin:0 0 12px"><div><h1 style="font-size:28px">Admin Management</h1><p>Invite and manage administrators for your organization</p></div><button class="btn" data-a="invite">' + ic('plus') + ' Invite administrator</button></div>' +
        '<div class="g3" style="margin-bottom:16px"><div class="card"><div class="cap">Total admins</div><div class="num" style="font-size:34px">' + ADMINS.length + '</div></div><div class="card"><div class="cap">Active</div><div class="num" style="font-size:34px">' + ADMINS.filter(function (a) { return a.st === 'Active'; }).length + '</div></div><div class="card"><div class="cap">Pending invitations</div><div class="num" style="font-size:34px">' + ADMINS.filter(function (a) { return a.st === 'Pending'; }).length + '</div></div></div>' +
        '<div class="card tbw" style="padding:6px 10px"><table class="tb"><thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Auth provider</th><th>Joined</th><th>Actions</th></tr></thead><tbody>' + ADMINS.map(function (a, i) { return '<tr><td><b>' + esc(a.email) + '</b></td><td><span class="tag">' + (a.role === 'Super Admin' ? ic('crown') : ic('user')) + ' ' + a.role + '</span></td><td><span class="tag ' + (a.st === 'Active' ? 'active' : 'pending') + ' dot">' + a.st + '</span></td><td>' + a.auth + '</td><td>' + a.joined + '</td><td>' + (a.role === 'Admin' ? '<button class="btn red sm" data-a="rmadm" data-i="' + i + '">' + ic('trash') + ' Remove</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    } else body += vLevels();
    return layout('', '', body, { nochip: false });
  }
  function vLevels() {
    var tot = LEVELS.reduce(function (a, l) { return a + (l.on ? l.c : 0); }, 0);
    var head = '<div class="top" style="margin:0 0 12px"><div><h1 style="font-size:28px">Organization Levels</h1><p>Manage level numbers and names for your organization.</p></div><div style="display:flex;gap:10px"><button class="btn ghost" data-a="sync">' + ic('refresh') + ' Sync employees</button><button class="btn" data-a="addlvl">' + ic('plus') + ' Add level</button></div></div>';
    var lad = LEVELS.map(function (l, i) { return (i ? '<div class="lvc"></div>' : '') + '<div class="lv' + (i === 0 ? ' top' : '') + (l.on ? '' : ' off') + '" style="--in:' + i * 14 + 'px"><span class="lb">LEVEL<b>' + l.n + '</b></span><div class="nm"><b>' + esc(l.name) + '</b><small>' + esc(l.sub) + '</small></div><span class="stk"><i class="fa" style="background:#9C54E8"></i><i class="fa" style="background:#7A8CFF"></i><i class="fa" style="background:#F0A53A"></i></span><span class="ppl">' + l.c + '<small>people</small></span><button class="tg' + (l.on ? ' on' : '') + '" data-a="lvtg" data-i="' + i + '" aria-label="Toggle level ' + l.n + '"></button></div>'; }).join('');
    var tree = '<div class="tree">' + LEVELS.map(function (l, i) { return (i ? '<div class="ln"></div>' : '') + '<div class="n' + (i === 0 ? ' me' : '') + '">Level ' + l.n + ': ' + esc(l.name) + '<small>' + l.c + ' people</small></div>'; }).join('') + '</div>';
    return head + '<div class="tab2 rise"><div class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><b style="font-size:16px">All Levels (' + LEVELS.length + ') <span class="tag sample">Sample data</span></b><div class="chips"><button class="chip' + (S.lvlTree ? '' : ' on') + '" data-a="lvview" data-v="0">' + ic('list') + ' Levels</button><button class="chip' + (S.lvlTree ? ' on' : '') + '" data-a="lvview" data-v="1">' + ic('org') + ' Reporting tree</button></div></div>' + (S.lvlTree ? tree : '<div class="ladder">' + lad + '</div>') + '</div>' +
      '<div style="display:grid;gap:16px;align-content:start"><div class="card"><div class="cap"><span class="ico">' + ic('refresh') + '</span>Employees mapped</div><div class="big46">' + tot + '<small> /46</small></div><div class="pbar"><i style="width:' + tot / 46 * 100 + '%"></i></div><div class="sub">Every employee has a level after SYNC EMPLOYEES.</div></div>' +
      '<div class="card"><div class="cap"><span class="ico">' + ic('users') + '</span>How levels are used</div><p class="sub" style="margin-top:10px">Peers are assigned automatically by matching Level and a shared supervisor (from the upload instructions).</p></div><div class="card"><div class="cap"><span class="ico">' + ic('info') + '</span>Tip</div><p class="sub" style="margin-top:10px">Top to bottom: Level 1 is the highest. You can add, rename or switch a level off; people keep their number.</p></div></div></div>';
  }
  function vProfile() {
    var e = EMPS[S.uid], kid = function (n) { return '<div class="n">' + n + '<small>' + n.toLowerCase().replace(/ /g, '.') + '@example.com</small></div>'; };
    var count = function (l, n) { return '<div class="card"><div class="cap"><span class="ico">' + ic('user') + '</span>' + l + '</div><div class="num" style="font-size:34px">' + n + '</div></div>'; };
    var body = '<div class="hero rise">' + avatar(e.name) + '<div class="grow"><h2>' + esc(e.name) + '</h2><small>' + esc(e.email) + '</small><div style="margin-top:6px;display:flex;gap:6px"><span class="tag" style="background:rgba(255,255,255,.16);color:#fff">Level 3</span><span class="tag" style="background:rgba(255,255,255,.16);color:#fff">' + (e.active ? 'Active' : 'Inactive') + '</span></div></div><button class="btn" data-a="editemp" data-id="' + e.id + '">' + ic('edit') + ' Edit</button>' + (isSuper() ? '<button class="btn g" data-a="toast" data-m="Invitation to become admin sent (sample)">Invite as admin</button>' : '') + '</div>' +
      '<div class="grid4 rise">' + count('Assigned as rater', 4) + count('Submitted as rater', 0) + count('Assigned as ratee', 4) + count('Completed assessments', 1) + '</div>' +
      '<div class="card rise" style="margin-top:16px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">Profile information</b><button class="btn red sm" data-a="toast" data-m="Deactivate (sample)">Deactivate</button></div><div class="pf" style="margin-top:16px"><div><small>Full name</small><b>' + esc(e.name) + '</b></div><div><small>Email</small><b>' + esc(e.email) + '</b></div><div><small>Gender</small><b>FEMALE</b></div><div><small>Birthday</small><b>Oct 09, 1991</b></div><div><small>Join date</small><b>Jan 18, 2021</b></div><div><small>Tenure</small><b>1 years</b></div><div><small>Position</small><b>' + esc(e.pos) + '</b></div><div><small>Department</small><b>' + esc(e.dept) + '</b></div><div><small>Qualifications</small><b>N/A</b></div></div></div>' +
      '<div class="card rise" style="margin-top:16px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">Relationships</b><button class="btn ghost sm" data-a="toast" data-m="Edit relationships (sample)">Edit relationships</button></div><div class="tree"><div class="lab">MANAGERS (1)</div>' + kid('Malini Rodrigo') + '<div class="ln"></div><div class="n me">' + esc(e.name) + '<small>' + esc(e.pos) + '</small></div><div class="ln"></div><div class="lab" style="margin-top:0">DIRECT REPORTS (2)</div><div class="kids">' + kid('Thilini Wijesinghe') + kid('Duleeka Karunathilaka') + '</div></div></div>' +
      '<div class="card rise" style="margin-top:16px"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:16px">Campaign history</b><span class="tag">1 campaigns</span></div><div class="prow" style="margin-top:10px"><div class="who"><b>Test@today</b><span class="tag">Assessment 360</span> <span class="tag closed">Closed</span> <span class="tag">Participant</span><br><small>Oct 20, 2026 - Oct 27, 2026</small></div><small>Assigned: 4 · Submitted: 0</small></div></div>';
    return layout('', '', body, { back: backBtn('ubk', 'Back to users') });
  }

  /* ---------- modals, drawers, toast ---------- */
  var modalEl, scrim, drawerEl, toastEl;
  function openModal(html) { modalEl.innerHTML = html; modalEl.classList.add('open'); scrim.classList.add('open'); var f = $('input,select', modalEl); if (f) setTimeout(function () { f.focus(); }, 50); }
  function closeModal() { modalEl.classList.remove('open'); drawerEl.classList.remove('open'); if (!(W && W.open)) scrim.classList.remove('open'); if (W && W.open) scrim.classList.remove('open'); }
  function openDrawer(html) { drawerEl.innerHTML = html; drawerEl.classList.add('open'); scrim.classList.add('open'); }
  var tt;
  function toast(m) { toastEl.textContent = m; toastEl.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove('show'); }, 2200); }
  var xBtn = '<button class="x" data-a="closem" aria-label="Close">' + ic('x') + '</button>';
  function ask(o) {
    openModal(xBtn + '<h2>' + o.t + '</h2><p class="lead" style="margin-top:6px">' + o.b + '</p><div class="acts"><button class="btn ghost" data-a="closem">' + (o.no || 'Cancel') + '</button><button class="btn' + (o.red ? ' red' : '') + '" data-a="yes">' + (o.yes || 'Continue') + '</button></div>');
    modalEl._yes = o.on;
  }
  function filterDrawer() {
    var st = ['draft', 'pending', 'ongoing', 'closed', 'rejected'], ty = ['c180', 'c360', 'me', 'culture'];
    openDrawer('<div style="display:flex;justify-content:space-between;align-items:center"><h2>Filter</h2><button class="x" style="position:static;width:32px;height:32px;border-radius:50%;background:var(--lav);color:var(--p);display:grid;place-items:center" data-a="closem" aria-label="Close">' + ic('x') + '</button></div><h5>Status</h5><div class="chips" id="fs">' + st.map(function (s) { return '<button class="chip' + (S.fil.status.indexOf(s) > -1 ? ' on' : '') + '" data-a="ftog" data-g="status" data-v="' + s + '">' + cap(s) + '</button>'; }).join('') + '</div><h5>Created date</h5><input class="inp" type="date"><h5>Review type</h5><div class="chips">' + ty.map(function (s) { return '<button class="chip' + (S.fil.type.indexOf(s) > -1 ? ' on' : '') + '" data-a="ftog" data-g="type" data-v="' + s + '">' + TYPES[s].label + '</button>'; }).join('') + '</div><div class="ft"><button class="lnk" data-a="freset">Reset</button><button class="btn" data-a="fapply">Apply</button></div>');
  }
  function empForm(e, title, btn) {
    e = e || {};
    return xBtn + '<h2>' + title + '</h2><p class="lead">Fields marked * are required.</p><div class="sec"><i>1</i>Personal details</div><div class="fgrid"><label class="fld"><span>First name <span class="rq">*</span></span><input class="inp" id="e1" value="' + esc((e.name || '').split(' ')[0] || '') + '"></label><label class="fld"><span>Last name <span class="rq">*</span></span><input class="inp" id="e2" value="' + esc((e.name || '').split(' ').slice(1).join(' ')) + '"></label><label class="fld full"><span>Email <span class="rq">*</span></span><input class="inp" id="e3" type="email" value="' + esc(e.email || '') + '"></label><label class="fld">Gender<select><option>Female</option><option>Male</option><option>Other</option></select></label><label class="fld">Birthday<input class="inp" type="date"></label></div><div class="sec"><i>2</i>Work details</div><div class="fgrid"><label class="fld">Position<input class="inp" value="' + esc(e.pos || '') + '"></label><label class="fld">Department<input class="inp" value="' + esc(e.dept || '') + '"></label><label class="fld">Level<select><option>Level 1</option><option>Level 2</option><option selected>Level 3</option><option>Level 4</option><option>Level 5</option></select></label><label class="fld">Join date<input class="inp" type="date"></label></div><div class="acts"><button class="btn ghost" data-a="closem">Cancel</button><button class="btn off" id="esave" data-a="saveemp">' + btn + '</button></div>';
  }
  function addEmpCamp() {
    var tab = addEmpCamp.tab || 'new';
    openModal(xBtn + '<h2>Add employee</h2><p class="lead">Add a new person or pick from existing employees.</p><div class="seg" style="margin-bottom:10px;box-shadow:none"><button class="' + (tab === 'new' ? 'on' : '') + '" data-a="aetab" data-t="new">New</button><button class="' + (tab === 'ex' ? 'on' : '') + '" data-a="aetab" data-t="ex">Existing</button></div>' +
      (tab === 'new' ? '<div class="fgrid"><label class="fld"><span>First name <span class="rq">*</span></span><input class="inp" id="e1"></label><label class="fld"><span>Last name <span class="rq">*</span></span><input class="inp" id="e2"></label><label class="fld full"><span>Email <span class="rq">*</span></span><input class="inp" id="e3" type="email"></label></div><div class="acts"><button class="btn ghost" data-a="closem">Cancel</button><button class="btn off" id="esave" data-a="saveemp">Add employee</button></div>' :
        '<label class="search">' + ic('search') + '<input id="exq" placeholder="Search employees..."></label><div class="pick" id="pick">' + EMPS.slice(0, 12).map(function (e) { return '<label><input type="checkbox" value="' + e.id + '">' + avatar(e.name, true) + '<span><b>' + esc(e.name) + '</b><br><small>' + esc(e.email) + '</small></span></label>'; }).join('') + '</div><div class="acts"><button class="btn ghost" data-a="closem">Cancel</button><button class="btn off" id="exadd" data-a="exadd">Add (0)</button></div>'));
  }
  function remindDialog(one) {
    openModal(xBtn + '<h2>Send reminders</h2><p class="lead">' + (one ? 'Send a reminder to ' + esc(one) + '.' : 'Send a reminder to all 25 participants who have not started.') + '</p><label class="fld">Topic<select><option>Assessment reminder</option><option>Deadline approaching</option><option>Final call</option></select></label><label class="fld" style="margin-top:12px">Message<textarea class="inp" rows="3">Please complete your assessment before the campaign closes.</textarea></label><div class="acts"><button class="btn ghost" data-a="closem">Cancel</button><button class="btn" data-a="sendrem">' + ic('bell') + ' Send reminders</button></div>');
  }
  function shareDrawer() {
    var tab = shareDrawer.tab || 'all', pick = shareDrawer.pick || (shareDrawer.pick = {}), n = Object.keys(pick).length;
    var l = PARTS.slice(0, 10).filter(function (p, i) { return tab === 'all' || (tab === 'lead' && i < 4) || (tab === 'peer' && i >= 4); });
    openDrawer('<div style="display:flex;justify-content:space-between;align-items:center"><h2>Leadership share panel</h2><button class="x" style="position:static;width:32px;height:32px;border-radius:50%;background:var(--lav);color:var(--p);display:grid;place-items:center" data-a="closem" aria-label="Close">' + ic('x') + '</button></div><div class="chips" style="margin:14px 0">' + [['all', 'All'], ['lead', 'Leadership'], ['peer', 'Peers']].map(function (x) { return '<button class="chip' + (tab === x[0] ? ' on' : '') + '" data-a="stab" data-t="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div><div class="pick" style="max-height:none;flex:1">' + l.map(function (p) { return '<label class="' + (pick[p.email] ? 'sel' : '') + '"><input type="checkbox" data-a="spick" data-e="' + esc(p.email) + '"' + (pick[p.email] ? ' checked' : '') + '>' + avatar(p.name, true) + '<span><b>' + esc(p.name) + '</b><br><small>' + esc(p.email) + '</small></span></label>'; }).join('') + '</div><div class="ft"><button class="btn' + (n ? '' : ' off') + '" data-a="doshare">' + ic('share') + ' Share' + (n ? ' (' + n + ')' : '') + '</button></div>');
  }

  /* ---------- Create Campaign wizard ---------- */
  var TYPE_INFO = {
    c360: ['Calybrate 360°', 'Comprehensive feedback from supervisors, peers, and direct reports', ['Self Assessment', 'Supervisor Assessment', 'Subordinate Assessment', 'Peer Assessment'], 'users'],
    c180: ['Calybrate 180°', 'Focused feedback from supervisors and direct reports', ['Self Assessment', 'Supervisor Assessment', 'Subordinate Assessment'], 'target'],
    me: ['Calybrate Me', 'Assess personality traits and behavioral tendencies', ['Self-reflection', 'Trait-based assessment', 'Behavioral insights'], 'user'],
    culture: ['Calybrate Culture', 'Create a comprehensive culture assessment to understand your organization\'s culture, values, and employee engagement levels.', ['Values alignment', 'Cultural contribution', 'Team dynamics', 'Engagement metrics'], 'doc']
  };
  function startWizard() {
    W = { open: true, step: 1, name: '', date: '', type: 'c360', src: null, emps: [], conf: 0, org: '', size: '' };
    $('#wiz').classList.add('open'); renderWiz();
  }
  function wizOk() {
    if (W.step === 1) return W.name.trim() && W.date;
    if (W.step === 2) return W.type === 'culture' ? W.org.trim() : W.emps.length > 0;
    return true;
  }
  function renderWiz() {
    var t = TYPE_INFO[W.type], cul = W.type === 'culture';
    var st = ['Review Info', cul ? 'Organization form' : 'Upload employee data', 'Review & Confirm'];
    var steps = '<div class="steps">' + st.map(function (s, i) { var n = i + 1; return (i ? '<hr>' : '') + '<div class="s' + (W.step === n ? ' on' : W.step > n ? ' done' : '') + '"><i>' + (W.step > n ? '&#10003;' : n) + '</i><span>' + s + '</span></div>'; }).join('') + '</div>';
    var main = '';
    if (W.step === 1) {
      main = '<div class="wlay"><div><div class="card"><div class="fgrid"><label class="fld">ADD CAMPAIGN NAME<input class="inp" id="wn" value="' + esc(W.name) + '" placeholder="e.g. Q4 Leadership Review"></label><label class="fld">SELECT CAMPAIGN END DATE<input class="inp" id="wd" type="date" value="' + esc(W.date) + '"></label></div></div>' +
        '<div class="card" style="margin-top:14px"><div class="cap">Select review type</div><div class="types">' + ['c360', 'c180', 'me', 'culture'].map(function (k) { var d = TYPE_INFO[k]; return '<button class="tcard' + (W.type === k ? ' on' : '') + '" data-a="wtype" data-t="' + k + '"><span class="rd"></span><span class="ib">' + ic(d[3]) + '</span><b>' + d[0] + '</b><p>' + d[1] + '</p><ul>' + d[2].map(function (x) { return '<li>' + ic('check') + x + '</li>'; }).join('') + '</ul></button>'; }).join('') + '</div></div></div>' +
        '<div class="sumc"><div class="cap" style="color:rgba(255,255,255,.7)">Your campaign</div><h3>' + esc(W.name || 'Untitled campaign') + '</h3><div class="l"><div><small>End date</small><b>' + (W.date || 'Not set yet') + '</b></div></div><div class="l"><div><small>Review type</small><b>' + t[0] + '</b></div></div><div class="l"><div><small>Employees</small><b>' + (W.emps.length ? W.emps.length + ' selected' : 'Not set yet') + '</b></div></div><div class="ck"><span class="' + (W.name && W.date ? 'd' : '') + '"><i>' + (W.name && W.date ? '&#10003;' : '') + '</i>Review info</span><span class="' + (wizOk() && W.step > 1 ? 'd' : '') + '"><i></i>Employee data</span><span><i></i>Confirmed</span></div></div></div>';
    } else if (W.step === 2 && cul) {
      main = '<div class="card"><h3 style="font-size:19px;margin-bottom:12px">Organization form</h3><div class="fgrid"><label class="fld"><span>Organization name <span class="rq">*</span></span><input class="inp" id="wo" value="' + esc(W.org) + '"></label><label class="fld">Industry<input class="inp" placeholder="e.g. Manufacturing"></label><label class="fld">Number of employees<select><option>11-50</option><option>51-200</option><option>201-500</option></select></label><label class="fld">Contact person<input class="inp"></label></div></div>';
    } else if (W.step === 2) {
      main = '<div class="choice"><label class="big2' + (W.src === 'csv' ? ' on' : '') + '" data-a="wcsv"><div class="ic">' + ic('up') + '</div><b>Drag &amp; Drop your CSV file</b><small>or click to load the sample file</small></label><button class="big2' + (W.src === 'ex' ? ' on' : '') + '" data-a="wex"><div class="ic">' + ic('users') + '</div><b>Use Existing Employees</b><small>Pick from your employee list</small></button></div>' +
        '<div class="card" style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><div><b>Need the template?</b><div class="sub">Download the CSV template with the required columns.</div></div><button class="btn ghost sm" data-a="toast" data-m="Template downloaded (sample)">' + ic('dl') + ' Download template</button></div>' +
        (W.emps.length ? '<div class="card" style="margin-top:14px"><div style="display:flex;justify-content:space-between;align-items:center"><b>Employees preview (' + W.emps.length + ')</b><button class="btn red sm" data-a="wclear">Clear all</button></div><div style="margin-top:8px">' + W.emps.slice(0, 6).map(function (e) { return '<div class="prow">' + avatar(e.name, true) + '<div class="who"><b>' + esc(e.name) + '</b><small>' + esc(e.email) + '</small></div></div>'; }).join('') + (W.emps.length > 6 ? '<div class="sub" style="padding-top:8px">+ ' + (W.emps.length - 6) + ' more</div>' : '') + '</div></div>' : '');
    } else {
      var n = cul ? 1 : W.emps.length;
      main = '<div class="sumtiles"><div class="card"><div class="cap">Campaign</div><div style="font-size:17px;font-weight:800;margin-top:10px">' + esc(W.name) + '</div><div class="sub">Ends ' + W.date + '</div></div><div class="card"><div class="cap">Review type</div><div style="font-size:17px;font-weight:800;margin-top:10px">' + t[0] + '</div></div><div class="card dark"><div class="cap">' + (cul ? 'Organization' : 'Participants') + '</div><div style="font-size:17px;font-weight:800;margin-top:10px">' + (cul ? esc(W.org) : n + ' employees') + '</div></div></div>' +
        '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><div><b style="font-size:16px">Hierarchy confirmation</b><div class="sub">' + W.conf + ' out of ' + n + ' confirmed</div></div><button class="btn sm" data-a="wconf">' + ic('check') + ' Confirm all</button></div><div class="pbar" style="margin-top:12px"><i style="width:' + (n ? W.conf / n * 100 : 0) + '%"></i></div>' + (cul ? '' : '<div style="margin-top:6px"><div class="sub" style="padding:8px 0">CSV Uploaded - Participants</div>' + W.emps.slice(0, 4).map(function (e) { return '<div class="prow">' + avatar(e.name, true) + '<div class="who"><b>' + esc(e.name) + '</b><small>Reviewees (1)</small></div><span class="tag ' + (W.conf >= n ? 'active' : 'pending') + ' dot">' + (W.conf >= n ? 'Confirmed' : 'Pending') + '</span></div>'; }).join('') + '</div>') + '</div>';
    }
    var foot = '<div class="wfoot"><span class="grow">Step ' + W.step + ' of 3</span>' + (W.step > 1 ? '<button class="btn ghost" data-a="wback">' + ic('left') + ' Back</button>' : '<button class="btn ghost" data-a="wback">' + ic('left') + ' Back</button>') + (W.step === 3 ? '<button class="btn' + (W.conf >= (cul ? 1 : W.emps.length) ? '' : ' off') + '" data-a="wcreate">' + (cul ? 'Send Culture request' : 'Create assignment') + ' ' + ic('check') + '</button>' : '<button class="btn' + (wizOk() ? '' : ' off') + '" id="wnext" data-a="wnext">Save &amp; continue ' + ic('right') + '</button>') + '</div>';
    $('#wiz').innerHTML = '<div class="wtop"><button class="xb" data-a="wclose" aria-label="Close">' + ic('x') + '</button><img src="' + LOGO + '" width="26" height="26" alt=""><div><h2>Create Campaign</h2><small>ORGANIZATION: SB.TEST</small></div><span class="grow"></span><button class="btn ghost sm" data-a="wdraft">' + ic('save') + ' Save as draft</button></div><div class="wbody"><div class="wcol">' + steps + main + '</div></div>' + foot;
  }
  function closeWiz() { W.open = false; $('#wiz').classList.remove('open'); W = null; }

  /* ---------- tour ---------- */
  function visible(sel) { var e = $$('[data-tour="' + sel + '"]').filter(function (x) { var r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; }); return e[0]; }
  function showTour() {
    var spot = $('#spot'), tip = $('#tip'), i = S.tour;
    if (i < 0) { spot.classList.remove('open'); tip.classList.remove('open'); return; }
    var s = TOUR[i], el = s.sel ? visible(s.sel) : null, vw = innerWidth, vh = innerHeight;
    var txt = !isSuper() && s.xa ? s.xa : s.x;
    tip.innerHTML = '<small>Step ' + (i + 1) + ' of ' + TOUR.length + '</small><h4>' + esc(s.t) + '</h4><p>' + esc(txt) + '</p><div class="pb"><i style="width:' + (i + 1) / TOUR.length * 100 + '%"></i></div><div class="rw"><button class="lnk" data-a="tskip">Skip tour</button><span class="grow"></span>' + (i ? '<button class="lnk" data-a="tprev">Previous</button>' : '') + '<button class="btn" data-a="tnext">' + (i === TOUR.length - 1 ? 'Finish' : i === 0 ? 'Start tour' : 'Next') + '</button></div>';
    tip.classList.add('open');
    if (!el) { spot.classList.remove('open'); tip.style.left = Math.max(12, (vw - 300) / 2) + 'px'; tip.style.top = Math.max(12, vh / 2 - 110) + 'px'; scrim.classList.remove('open'); $('#tourdim').classList.add('open'); return; }
    $('#tourdim').classList.remove('open');
    var r = el.getBoundingClientRect(), pad = 6;
    spot.style.left = r.left - pad + 'px'; spot.style.top = r.top - pad + 'px'; spot.style.width = r.width + pad * 2 + 'px'; spot.style.height = r.height + pad * 2 + 'px'; spot.classList.add('open');
    var tw = Math.min(300, vw - 24), left = r.right + 16 + tw < vw ? r.right + 16 : Math.max(12, Math.min(vw - tw - 12, r.left)), top = r.right + 16 + tw < vw ? Math.max(12, r.top) : (r.bottom + 14 + 200 < vh ? r.bottom + 14 : Math.max(12, r.top - 210));
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function setTour(i) { S.tour = i; if (i >= 0) { S.page = 'dashboard'; S.type = S.cid = null; } render(); }

  /* ---------- render + effects ---------- */
  function view() {
    switch (S.page) { case 'campaigns': return vCamps(); case 'reports': return vReports(); case 'users': return vUsers(); default: return vDash(); }
  }
  function render(keep) {
    var sc = keep ? (window.scrollY || 0) : 0;
    $('#root').innerHTML = view();
    var v = $('.main'); if (v && !keep) v.classList.add('view');
    fx(); if (sc) window.scrollTo(0, sc); else if (!keep) window.scrollTo(0, 0);
    if (S.tour >= 0) setTimeout(showTour, 30); else showTour();
  }
  function fx() {
    $$('[data-count]').forEach(function (el) { var to = +el.dataset.count, t0 = performance.now(); (function step(t) { var p = Math.min(1, (t - t0) / 900); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(t0); });
    requestAnimationFrame(function () { requestAnimationFrame(function () { $$('.ring .v').forEach(function (c) { c.style.strokeDashoffset = c.dataset.off; }); }); });
  }
  function go(p) { S.page = p; S.type = S.cid = null; S.cul = false; S.rep = null; S.uid = null; if (S.tour >= 0 && p !== 'dashboard') { /* tour stays on dashboard */ } render(); }

  /* ---------- events ---------- */
  document.addEventListener('click', function (e) {
    var m = $('#menu'); if (m && !e.target.closest('.chipwrap')) m.classList.remove('open');
    var el = e.target.closest('[data-a]'); if (!el) { if (e.target === scrim) { if (!(S.tour >= 0)) closeModal(); } return; }
    if (el.tagName === 'INPUT') return;
    var a = el.dataset.a, d = el.dataset;
    switch (a) {
      case 'menu': $('#menu').classList.toggle('open'); break;
      case 'role': S.role = d.r; if (S.utab === 'adm' && d.r === 'admin') S.utab = 'emp'; render(true); toast('Previewing as ' + (d.r === 'super' ? 'Super Admin' : 'Admin')); break;
      case 'nav': if (S.tour >= 0) return; go(d.p); break;
      case 'logout': toast('Logged out (prototype)'); break;
      case 'create': if (S.tour >= 0 && S.tour < TOUR.length - 1) return; if (S.tour >= 0) { S.tour = -1; render(); } startWizard(); break;
      case 'toast': toast(d.m); break;
      case 'type': S.type = d.t; S.cid = null; S.cul = false; render(); break;
      case 'camps-home': S.type = S.cid = null; S.cul = false; render(); break;
      case 'open-c': if (d.t === 'c180') { S.page = 'campaigns'; S.type = 'c180'; render(); break; } S.cid = +d.id; S.ptab = 'all'; S.pq = ''; S.cul = CAMPS.filter(function (c) { return c.id === S.cid; })[0].type === 'culture'; render(); break;
      case 'filter': filterDrawer(); break;
      case 'ftog': var g = S.fil[d.g], k = g.indexOf(d.v); if (k > -1) g.splice(k, 1); else g.push(d.v); el.classList.toggle('on'); break;
      case 'freset': S.fil = { status: [], type: [] }; filterDrawer(); break;
      case 'fapply': closeModal(); render(true); break;
      case 'del': ask({ t: 'Delete this draft?', b: 'This draft campaign will be removed. This cannot be undone.', yes: 'Delete', red: true, on: function () { CAMPS.splice(CAMPS.findIndex(function (c) { return c.id === +d.id; }), 1); closeModal(); render(true); toast('Draft deleted'); } }); break;
      case 'ptab': S.ptab = d.t; render(true); break;
      case 'addemp': addEmpCamp.tab = 'new'; addEmpCamp(); break;
      case 'aetab': addEmpCamp.tab = d.t; addEmpCamp(); break;
      case 'remind': remindDialog(); break;
      case 'remind1': remindDialog(d.n); break;
      case 'sendrem': closeModal(); toast('Reminders sent'); break;
      case 'newass': openModal(xBtn + '<h2>Create ' + esc(d.n) + '</h2><p class="lead">Fill in the title and due date to continue.</p><div class="rules"><div>' + ic('info') + '<span>The first assessment uses the default benchmark score.</span></div><div>' + ic('users') + '<span>Leadership assessments use multiple surveys.</span></div><div>' + ic('doc') + '<span>Employee assessments use random sampling of employees (limit 50).</span></div></div><div class="fgrid"><label class="fld"><span>Title <span class="rq">*</span></span><input class="inp" id="na1"></label><label class="fld"><span>Due date <span class="rq">*</span></span><input class="inp" id="na2" type="date"></label></div><div class="acts"><button class="btn ghost" data-a="closem">Cancel</button><button class="btn off" id="nacre" data-a="nacre" data-i="' + d.i + '">Create assessment</button></div>'); break;
      case 'nacre': S.cm = Math.max(S.cm, +d.i + 1); closeModal(); render(true); toast('Assessment created'); break;
      case 'rep': S.rep = d.k; S.rtab = d.tab || (d.k === 'cul' ? 'ov' : 'lead'); render(); break;
      case 'reps-home': S.rep = null; render(); break;
      case 'rtab': S.rtab = d.t; render(true); break;
      case 'share': shareDrawer.pick = {}; shareDrawer.tab = 'all'; shareDrawer(); break;
      case 'stab': shareDrawer.tab = d.t; shareDrawer(); break;
      case 'doshare': if (!el.classList.contains('off')) { var n = Object.keys(shareDrawer.pick).length; closeModal(); toast('Shared with ' + n + (n > 1 ? ' people' : ' person')); } break;
      case 'utab': S.utab = d.t; S.uid = null; render(true); break;
      case 'chip': S.chip = d.c; S.pg = 1; render(true); break;
      case 'pg': S.pg += +d.d; render(true); break;
      case 'profile': S.uid = +d.id; render(); break;
      case 'ubk': S.uid = null; render(); break;
      case 'newemp': openModal(empForm(null, 'Add employee', 'Add employee')); break;
      case 'editemp': openModal(empForm(EMPS[+d.id], 'Edit employee', 'Save changes')); check(); break;
      case 'saveemp': if (!el.classList.contains('off')) { closeModal(); toast('Saved (sample data)'); } break;
      case 'exadd': if (!el.classList.contains('off')) { var c = $$('#pick input:checked').length; closeModal(); toast(c + ' employee' + (c > 1 ? 's' : '') + ' added'); } break;
      case 'invite': openModal(xBtn + '<h2>Invite administrator</h2><p class="lead">The person will get an email with a link to join as an Admin of Testing Company.</p><label class="fld"><span>Email <span class="rq">*</span></span><input class="inp" id="ie" type="email" placeholder="name@company.com"></label><div class="acts"><button class="btn ghost" data-a="closem">Cancel</button><button class="btn off" id="isend" data-a="isend">' + ic('send') + ' Send invitation</button></div>'); break;
      case 'isend': if (!el.classList.contains('off')) { ADMINS.push({ email: $('#ie').value.trim(), role: 'Admin', st: 'Pending', auth: 'Email', joined: 'Pending' }); closeModal(); render(true); toast('Invitation sent'); } break;
      case 'rmadm': ask({ t: 'Remove this administrator?', b: ADMINS[+d.i].email + ' will lose access to the dashboard.', yes: 'Remove', red: true, on: function () { ADMINS.splice(+d.i, 1); closeModal(); render(true); toast('Administrator removed'); } }); break;
      case 'sync': toast('Employees synced: 46 of 46 mapped'); break;
      case 'addlvl': openModal(xBtn + '<h2>Add level</h2><p class="lead">Levels run top to bottom. Level 1 is the highest.</p><div class="fgrid"><label class="fld">Level number<input class="inp" id="ln" type="number" min="1" placeholder="e.g. 3"></label><label class="fld">Level name<input class="inp" id="lm" placeholder="e.g. Middle Management"></label></div><div style="display:flex;align-items:center;gap:10px;margin-top:14px"><button class="tg on" id="lact" data-a="lacttg" aria-label="Active"></button><b>Active</b></div><div class="acts"><button class="btn ghost" data-a="closem">Cancel</button><button class="btn" data-a="lsave">Add level</button></div>'); break;
      case 'lacttg': el.classList.toggle('on'); break;
      case 'lsave': var nm = $('#lm').value.trim(); if (!nm) { toast('Enter a level name'); break; } LEVELS.push({ n: LEVELS.length + 1, name: nm, sub: 'Reports to Level ' + LEVELS.length, c: 0, on: $('#lact').classList.contains('on') }); closeModal(); render(true); toast('Level added'); break;
      case 'lvtg': LEVELS[+d.i].on = !LEVELS[+d.i].on; render(true); break;
      case 'lvview': S.lvlTree = d.v === '1'; render(true); break;
      case 'closem': closeModal(); break;
      case 'yes': var f = modalEl._yes; if (f) f(); break;
      /* wizard */
      case 'wtype': W.type = d.t; W.emps = []; W.src = null; renderWiz(); break;
      case 'wnext': if (el.classList.contains('off')) break; ask({ t: 'Save and continue?', b: W.step === 1 ? '“' + esc(W.name) + '” (' + TYPE_INFO[W.type][0] + ') will be saved as a draft, ending ' + W.date + '.' : 'Your ' + (W.type === 'culture' ? 'organization details' : W.emps.length + ' employees') + ' will be saved.', yes: 'Save and continue', on: function () { closeModal(); W.step++; renderWiz(); } }); break;
      case 'wback': if (W.step === 1) wizLeave(); else { W.step--; renderWiz(); } break;
      case 'wclose': wizLeave(); break;
      case 'wdraft': ask({ t: 'Save as draft?', b: 'You can finish this campaign later from Campaigns.', yes: 'Save as draft', on: function () { saveCamp('draft'); } }); break;
      case 'wcsv': W.src = 'csv'; W.emps = EMPS.slice(0, 12); renderWiz(); break;
      case 'wex': W.src = 'ex'; W.emps = EMPS.slice(6, 14); renderWiz(); break;
      case 'wclear': ask({ t: 'Clear all employees?', b: 'The ' + W.emps.length + ' employees in this preview will be removed.', yes: 'Clear all', red: true, on: function () { W.emps = []; W.src = null; closeModal(); renderWiz(); } }); break;
      case 'wconf': W.conf = W.type === 'culture' ? 1 : W.emps.length; renderWiz(); break;
      case 'wcreate': if (el.classList.contains('off')) break; ask({ t: W.type === 'culture' ? 'Send this Culture request?' : 'Create this campaign?', b: '“' + esc(W.name) + '” · ' + TYPE_INFO[W.type][0] + ' · ' + (W.type === 'culture' ? esc(W.org) : W.emps.length + ' participants') + ' · ends ' + W.date + '.', yes: W.type === 'culture' ? 'Send request' : 'Create campaign', on: function () { saveCamp(W.type === 'culture' ? 'pending' : 'ongoing'); } }); break;
      /* tour */
      case 'tnext': if (S.tour >= TOUR.length - 1) { S.tour = -1; $('#tourdim').classList.remove('open'); render(true); toast('Tour complete. Create your first campaign when you are ready.'); } else setTour(S.tour + 1); break;
      case 'tprev': setTour(S.tour - 1); break;
      case 'tskip': S.tour = -1; $('#tourdim').classList.remove('open'); render(true); break;
    }
  });
  function wizLeave() {
    if (!W.name && !W.emps.length) { closeWiz(); return; }
    ask({ t: 'Leave without saving?', b: 'Your progress on “' + esc(W.name || 'this campaign') + '” will be lost unless you save it as a draft.', yes: 'Leave', no: 'Keep editing', red: true, on: function () { closeModal(); closeWiz(); } });
  }
  function saveCamp(status) {
    var id = Date.now() % 100000, nm = W.name || 'Untitled', ty = W.type, em = W.emps.length || 0;
    CAMPS.unshift({ id: id, name: nm, type: ty, status: status, s: 'Today', e: W.date || '-', n: em });
    closeModal(); closeWiz(); S.page = 'campaigns'; S.type = ty; S.cid = null; S.cul = false; render(); toast(status === 'draft' ? 'Saved as draft' : status === 'pending' ? 'Culture request sent' : 'Campaign created');
  }
  function check() { var b = $('#esave'); if (!b) return; var ok = $('#e1') && $('#e1').value.trim() && $('#e2').value.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($('#e3').value.trim()); b.classList.toggle('off', !ok); }
  document.addEventListener('input', function (e) {
    var id = e.target.id;
    if (id === 'pq') { S.pq = e.target.value; var p = e.target.selectionStart; render(true); var n = $('#pq'); if (n) { n.focus(); n.setSelectionRange(p, p); } }
    else if (id === 'eq') { S.q = e.target.value; S.pg = 1; var p2 = e.target.selectionStart; render(true); var n2 = $('#eq'); if (n2) { n2.focus(); n2.setSelectionRange(p2, p2); } }
    else if (id === 'e1' || id === 'e2' || id === 'e3') check();
    else if (id === 'wn') { W.name = e.target.value; updWiz(); } else if (id === 'wd') { W.date = e.target.value; updWiz(); } else if (id === 'wo') { W.org = e.target.value; updWiz(); }
    else if (id === 'na1' || id === 'na2') { $('#nacre').classList.toggle('off', !($('#na1').value.trim() && $('#na2').value)); }
    else if (id === 'ie') { $('#isend').classList.toggle('off', !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.target.value.trim())); }
    else if (id === 'exq') { var q = e.target.value.toLowerCase(); $$('#pick label').forEach(function (l) { l.style.display = l.textContent.toLowerCase().indexOf(q) > -1 ? '' : 'none'; }); }
  });
  function updWiz() { var b = $('#wnext'); if (b) b.classList.toggle('off', !wizOk()); var h = $('.sumc h3'); if (h && W.step === 1) { h.textContent = W.name || 'Untitled campaign'; var l = $$('.sumc .l b'); if (l[0]) l[0].textContent = W.date || 'Not set yet'; } }
  document.addEventListener('change', function (e) {
    if (e.target.dataset && e.target.dataset.a === 'spick') { var pk = shareDrawer.pick; if (e.target.checked) pk[e.target.dataset.e] = 1; else delete pk[e.target.dataset.e]; shareDrawer(); }
    else if (e.target.closest && e.target.closest('#pick')) { var c = $$('#pick input:checked').length; $$('#pick label').forEach(function (l) { l.classList.toggle('sel', l.querySelector('input').checked); }); var b = $('#exadd'); b.textContent = 'Add (' + c + ')'; b.classList.toggle('off', !c); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { if (modalEl.classList.contains('open') || drawerEl.classList.contains('open')) closeModal(); else if (W && W.open) wizLeave(); else if (S.tour >= 0) { S.tour = -1; render(true); } }
  });
  window.addEventListener('resize', function () { if (S.tour >= 0) showTour(); });

  /* ---------- boot ---------- */
  function boot() {
    document.body.insertAdjacentHTML('beforeend', '<div id="root"></div><div class="scrim" id="scrim"></div><div class="modal" id="modal" role="dialog" aria-modal="true"></div><aside class="drawer" id="drawer"></aside><div class="wiz" id="wiz"></div><div class="scrim" id="tourdim" style="z-index:99"></div><div class="spot" id="spot"></div><div class="tip" id="tip"></div><div class="toast" id="toast" role="status"></div>');
    modalEl = $('#modal'); scrim = $('#scrim'); drawerEl = $('#drawer'); toastEl = $('#toast');
    render();
    setTimeout(function () { if (!S.toured) { S.toured = true; setTour(0); } }, 500);
  }
  boot();
})();
