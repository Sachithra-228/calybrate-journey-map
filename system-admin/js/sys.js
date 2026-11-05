/* Calybrate System Admin redesign: interactive prototype. Sample data only; nothing is sent or posted.
   Sidebar of 8 items with tabs: Dashboard, Organizations, Requests, Consultants, Reports, Team & Security, Settings, Marketing. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var LOGO = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Cdefs%3E%3ClinearGradient id=%22g%22 x1=%220%22 y1=%220%22 x2=%221%22 y2=%221%22%3E%3Cstop offset=%220%22 stop-color=%22%237A2FD0%22/%3E%3Cstop offset=%221%22 stop-color=%22%234B0082%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx=%2224%22 cy=%2224%22 r=%2221%22 fill=%22%23fff%22 stroke=%22url(%23g)%22 stroke-width=%224%22/%3E%3Cpath d=%22M33 17.5A11 11 0 1 0 33 30.5M24 24h10%22 fill=%22none%22 stroke=%22url(%23g)%22 stroke-width=%224.2%22 stroke-linecap=%22round%22/%3E%3C/svg%3E';

  var IC = {
    dash: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    org: '<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 20.5v-4h4v4"/>', req: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 13l2 2 3-4"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19a6 6 0 0 1 12 0M16 5a3.2 3.2 0 0 1 0 6M18 14a6 6 0 0 1 3 5"/>', rep: '<path d="M5 20V10M12 20V4M19 20v-7"/>', shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>', mega: '<path d="M4 10v4l3 1 9 4V5L7 9z"/><path d="M19 9v6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', logout: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>', search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>', left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>', down: '<path d="M6 9l6 6 6-6"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    more: '<circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/>', sort: '<path d="M8 5v14M5 16l3 3 3-3M16 19V5M13 8l3-3 3 3"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
    bolt: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>', globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>', layers: '<path d="M12 3 3 8l9 5 9-5zM3 13l9 5 9-5"/>', doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>', send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>', play: '<path d="M8 5l11 7-11 7z"/>', up: '<path d="M12 16V5M7 10l5-5 5 5M4 20h16"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 16.5v.5"/>',
    heart: '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>', hist: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4M12 8v4l3 2"/>', cmp: '<path d="M3 5h18v11H3zM8 20h8M12 16v4"/>'
  };
  var ic = function (k, c) { return '<svg class="' + (c || 'si') + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[k] || '') + '</svg>'; };

  /* ---------- sample data ---------- */
  var ORGS = [['amk', 0, 0, 'Aug 7, 2026'], ['auth-test', 0, 0, 'Feb 26, 2026'], ['Bhanu', 6, 2, 'Jul 23, 2026'], ['Cyber seeds', 6, 1, 'Mar 30, 2026'], ['Dasun ORG', 1, 1, 'Jul 6, 2026'], ['Dasun Test', 8, 4, 'Jul 6, 2026'], ['Development', 5, 1, 'Apr 23, 2026'], ['Guide', 6, 6, 'Jun 16, 2026'], ['ima-2', 31, 21, 'Jul 6, 2026']];
  var CAMPS = [['180', 'sb.test', 'Finance', 'Nov 12, 2026'], ['Thilakshana_Culture', 'sb.test', 'Healthcare', 'Nov 12, 2026'], ['Test-Sys', 'Dasun Test', '', 'Oct 24, 2026'], ['Calybrate Culture - Finish', 'Testing Company', 'Non-Profit', 'Oct 12, 2026'], ['Campaign-Test', 'Team Syncode', 'Healthcare', 'Oct 10, 2026'], ['Test_Culture_Validation_5th_OCT', 'sb.test', 'Healthcare', 'Oct 23, 2026']];
  var REQS = [
    { id: 1, org: '53265', by: 'Nimal Perera', em: 'nimal.p@example.com', des: 'dsad', date: '5th Nov 2026', st: 'pending' },
    { id: 2, org: 'Thilakshana', by: 'Thilini Rajapaksa', em: 'thilini.r@example.com', des: 'HR', date: '5th Nov 2026', st: 'approved' },
    { id: 3, org: 'Culture Org...', by: 'cucu', em: 'cucu@example.com', des: 'HR', date: '9th Oct 2026', st: 'pending' },
    { id: 4, org: 'SYNCODE jkkkk', by: 'Nuwan Liyanage', em: 'nuwan.l@example.com', des: 'RH', date: '6th Oct 2026', st: 'rejected' },
    { id: 5, org: 'Campaign-...', by: 'Culture-Tester', em: 'tester@example.com', des: 'HR', date: '6th Oct 2026', st: 'pending' },
    { id: 6, org: 'SYNCODE', by: 'Nuwan Liyanage', em: 'nuwan.l@example.com', des: 'RH', date: '5th Oct 2026', st: 'pending' },
    { id: 7, org: 'Saro', by: 'Sara Pieris', em: 'sara.p@example.com', des: 'HR', date: '14th Sep 2026', st: 'approved' }
  ];
  var BASE = { pending: 7, approved: 10, rejected: 3 };
  var CONS = [['Dasun Weerasinghe', 'dasun.w@example.com'], ['Dilini Karunathilaka', 'dilini.k@example.com'], ['Dulmini Madushani', 'dulmini.m@example.com'], ['Imalsha Senanayake', 'imalsha.s@example.com'], ['Isini Ranasinghe', 'isini.r@example.com'], ['Jane Smith', 'jane.s@example.com']];
  var EMPS = [['Amal Wickramasinghe', 'amal.w@example.com', 'Engineering', 'Chief Executive Officer / Software Engineer', 'Jan 4, 2016'], ['Anika Jayasuriya', 'anika.j@example.com', 'Engineering', 'CE', 'Aug 4, 2016'], ['Bhanuka Ranasinghe', 'bhanuka.r@example.com', 'Engineering', 'Associate Quality Assurance Engineer', 'Jun 8, 2016'], ['Chamudi Mendis', 'chamudi.m@example.com', 'Engineering', 'Associate Software Engineer', 'Jun 30, 2016'], ['Chathura Perera', 'chathura.p@example.com', 'Engineering', 'Associate Software Engineer', 'Jun 30, 2016']];
  var CTRY = [['LK', 'Sri Lanka', 640, 27.4, 12, '+7%'], ['IN', 'India', 360, 15.4, 8, '+4%'], ['US', 'United States', 220, 9.4, 6, '+2%'], ['GB', 'United Kingdom', 180, 7.7, 5, '+3%'], ['AU', 'Australia', 150, 6.4, 4, '+1%'], ['AE', 'United Arab Emirates', 120, 5.1, 3, '+5%'], ['SG', 'Singapore', 90, 3.8, 3, '+2%'], ['CA', 'Canada', 80, 3.4, 2, '+1%'], ['DE', 'Germany', 60, 2.6, 2, '+0%'], ['MY', 'Malaysia', 50, 2.1, 2, '+3%'], ['PK', 'Pakistan', 40, 1.7, 1, '+1%'], ['BD', 'Bangladesh', 30, 1.3, 1, '+2%'], ['NL', 'Netherlands', 22, .9, 1, '+0%'], ['FR', 'France', 18, .8, 1, '+0%'], ['ZA', 'South Africa', 12, .5, 1, '+1%'], ['NZ', 'New Zealand', 8, .3, 1, '+0%']];
  var MINGRP = 5;
  var PLANS = [['Demo Org 01', 'Standard', 148, 200, '01 Mar 2027', 'Active'], ['Demo Org 02', 'Standard', 62, 100, '01 Apr 2027', 'Active'], ['Demo Org 04', 'Enterprise', 410, 500, '01 Jan 2027', 'Active'], ['Demo Org 05', 'Trial', 21, 25, '04 Nov 2026', 'Ends in 5 days'], ['Demo Org 06', 'Trial', 96, 50, '10 Nov 2026', 'Over seat limit']];
  var ADM = [['admin.one@example.com', 'Platform Admin', true, '2 hours ago', 'Active'], ['admin.two@example.com', 'Platform Admin', true, 'Yesterday', 'Active'], ['support.one@example.com', 'Support', true, '3 days ago', 'Active'], ['analyst.one@example.com', 'Analyst (aggregated only)', false, '5 days ago', 'Active'], ['viewer.one@example.com', 'Read-only', true, '1 week ago', 'Active'], ['admin.three@example.com', 'Platform Admin', null, 'Never', 'Invited']];
  var AUD = [['30 Oct, 10:42', 'admin.one', 'Viewed individual report', 'Demo Org 02, Employee 0147', 'Reason logged'], ['30 Oct, 09:15', 'admin.two', 'Changed role', 'analyst.one to Support', 'Success'], ['29 Oct, 17:03', 'support.one', 'Downloaded report PDF', 'Demo Org 01', 'Success'], ['29 Oct, 11:30', 'Unknown', 'Failed sign-in (5 attempts)', 'Admin portal', 'Blocked'], ['28 Oct, 15:20', 'admin.one', 'Opened share link', 'Demo Org 04 report', 'Success']];
  var SVC = [['Email delivery', 'Connected', 'Sends invitations and reminders and records when they are delivered.', 'Key ending 3f2a. Last rotated 41 days ago.'], ['AI summaries', 'Needs review', 'Writes the short summaries inside reports. Confirm what employee data is sent to it.', 'Key ending 9c1d. Last rotated 12 days ago.'], ['Single sign-on', 'Not connected', 'Lets admins and HR users sign in with their company identity provider.', 'No provider added yet.'], ['HR system import', 'Not connected', 'Brings employee lists in automatically instead of uploading a CSV.', 'No connector added yet.']];
  var TPL = [['Assessment invitation', 'Active', 'Hello [First name], you are invited to take part in [Campaign]. Open your link: [Link]', 'Sent to employees and raters'], ['Reminder', 'Active', 'Hello [First name], [Campaign] closes on [End date]. Please finish before then.', 'Sent to people who have not finished'], ['Report ready', 'Draft', 'Hello [First name], your report for [Campaign] is ready to view.', 'Sent to HR admins'], ['Admin invitation', 'Active', 'Hello, you have been invited to manage [Organization] on Calybrate. Accept: [Link]', 'Sent when a Super Admin invites an admin']];
  var CHAN = [['LinkedIn', 'Connected', 'Company page. Share posts and videos with professionals and clients.', '5,420 followers'], ['TikTok', 'Connected', 'Short vertical videos to reach a younger audience.', '3,910 followers'], ['YouTube', 'Connected', 'Longer videos, tutorials and webinars.', '2,980 followers'], ['Instagram', 'Not connected', 'Photos and short videos. Not connected yet.', 'Connect to start posting']];
  var NAV = [['PLATFORM'], ['dashboard', 'Dashboard', 'dash'], ['organizations', 'Organizations', 'org'], ['requests', 'Requests', 'req'], ['consultants', 'Consultants', 'users'], ['reports', 'Reports', 'rep'], ['ADMINISTRATION'], ['team', 'Team & Security', 'shield'], ['settings', 'Settings', 'gear'], ['MARKETING'], ['marketing', 'Marketing', 'mega']];
  var TABS = {
    dashboard: [['ov', 'Overview'], ['ctry', 'Users by Country']], organizations: [['orgs', 'Organizations'], ['plans', 'Plans & Licensing']], reports: [['cul', 'Culture Assessment'], ['rules', 'Report Access Rules']],
    team: [['adm', 'Admins & Roles'], ['sso', 'Sign-in & Access'], ['aud', 'Audit Logs'], ['priv', 'Privacy & Consent']], settings: [['asm', 'Assessment Setup'], ['eml', 'Email Templates'], ['int', 'Integrations & Keys'], ['hl', 'System Health']], marketing: [['acc', 'Accounts'], ['post', 'Create Post'], ['sch', 'Posts & Schedule'], ['ins', 'Insights']]
  };
  var S = { page: 'dashboard', tab: {}, org: null, otab: 'req', oq: '', sort: 'az', rq: '', rst: 'all', sel: {}, cq: '', cty: 'LK', pq: '', mk: { ch: { LinkedIn: 1, TikTok: 1 }, vid: false, cap: '', when: 'now' }, tpl: 0, rep: 'ov', sw: { mfa: true, sso: false, dom: true, retain: true, cons: true } };
  var tabOf = function (p) { return S.tab[p] || (TABS[p] || [[]])[0][0]; };
  var counts = function () { var c = { pending: BASE.pending, approved: BASE.approved, rejected: BASE.rejected }; REQS.forEach(function (r) { if (r._from && r._from !== r.st) { c[r._from]--; c[r.st]++; } }); return c; };
  var avatar = function (n, d) { var p = String(n).split(' '); return '<span class="av' + (d ? ' d' : '') + '">' + esc((p[0][0] || '').toUpperCase() + (p[1] ? p[1][0].toUpperCase() : '')) + '</span>'; };
  var tabsBar = function (p) { return '<div class="tabs" role="tablist">' + TABS[p].map(function (t) { return '<button class="' + (tabOf(p) === t[0] ? 'on' : '') + '" data-a="tab" data-p="' + p + '" data-t="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>'; };
  var noteP = function (t, amber) { return '<div class="notep' + (amber ? ' amber' : '') + '">' + ic(amber ? 'info' : 'lock') + '<span>' + t + '</span></div>'; };
  var tile = function (cap2, num, sub, ico, dark, extra) { return '<div class="card' + (dark ? ' dark' : '') + '"' + (extra || '') + '><div class="cap"><span class="ico">' + ic(ico) + '</span>' + cap2 + '</div><div class="num"' + (typeof num === 'number' ? ' data-count="' + num + '"' : '') + '>' + (typeof num === 'number' ? 0 : num) + '</div><div class="sub">' + sub + '</div></div>'; };

  /* ---------- shell ---------- */
  function layout(title, sub, body, o) {
    o = o || {};
    var nav = NAV.map(function (n) { return n.length === 1 ? '<div class="grp">' + n[0] + '</div>' : '<button class="' + (S.page === n[0] && !o.none ? 'on' : '') + '" data-a="nav" data-p="' + n[0] + '">' + ic(n[2]) + n[1] + '</button>'; }).join('');
    var bn = NAV.filter(function (n) { return n.length > 1; }).map(function (n) { return '<button class="' + (S.page === n[0] ? 'on' : '') + '" data-a="nav" data-p="' + n[0] + '">' + ic(n[2]) + n[1].split(' ')[0] + '</button>'; }).join('');
    var chip = '<div class="chipwrap"><button class="me" data-a="menu" aria-haspopup="true">' + '<span class="av">SA</span><span><b>System Admin</b><small style="background:none;color:var(--mut);font-weight:500">admin@example.com</small></span>' + ic('down') + '</button><div class="menu" id="menu"><h6>Account</h6><button data-a="toast" data-m="Update password (prototype)">' + ic('key') + ' Update Password</button><button data-a="toast" data-m="Support &amp; Feedback (prototype)">' + ic('help') + ' Support &amp; Feedback</button><div class="sep"></div><button data-a="toast" data-m="Logged out (prototype)">' + ic('logout') + ' Log Out</button></div></div>';
    return '<div class="app"><aside class="side"><div class="logo"><img src="' + LOGO + '" alt="">CALYBRATE</div><nav class="nav">' + nav + '</nav><div class="grow"></div><button class="btn" data-a="toast" data-m="Create Campaign (see the dashboard prototype)">' + ic('plus') + ' Create Campaign</button><button class="btn red" data-a="toast" data-m="Logged out (prototype)">' + ic('logout') + ' Logout</button></aside>' +
      '<main class="main"><div class="mtop"><div class="logo" style="padding:0"><img src="' + LOGO + '" alt="">CALYBRATE</div></div><div class="top"><div>' + (o.back || '') + (title ? '<h1>' + title + '</h1>' : '') + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + chip + '</div>' + (o.hdr || '') + body + '</main><nav class="bnav">' + bn + '</nav></div>';
  }

  /* ---------- Dashboard ---------- */
  function vDash() {
    if (tabOf('dashboard') === 'ctry') return vCountry();
    var q = S.cq.toLowerCase(), list = CAMPS.filter(function (c) { return !q || (c[0] + c[1] + c[2]).toLowerCase().indexOf(q) > -1; });
    var c = counts();
    var body = '<div class="grid4 rise">' + tile('Total organizations', 27, 'On the platform', 'org', true) + tile('Total consultants', 14, 'In the network', 'users') + '<div class="card" style="background:#FFFBF3;border-color:#F6E7C8"><div class="cap"><span class="ico" style="background:#FFF1DA;color:#B97500">' + ic('req') + '</span>Pending requests</div><div class="num" data-count="' + c.pending + '">0</div><div class="sub">Waiting for your approval</div><button class="lnk" style="font-weight:800;font-size:11px;color:#B97500;margin-top:8px" data-a="nav" data-p="requests" data-st="pending">Review requests ' + ic('arrow') + '</button></div>' + tile('Active assessments', 6055, 'Across all organizations', 'rep') + '</div>' +
      '<div class="top" style="margin:26px 0 12px"><div><h3 style="font-size:20px;letter-spacing:-.02em">Recent Campaigns</h3><p>Manage and monitor active campaigns</p></div><label class="search" style="flex:0 1 260px">' + ic('search') + '<input id="cq" placeholder="Search campaigns..." value="' + esc(S.cq) + '"></label></div>' +
      '<div class="cgrid rise">' + (list.map(function (x) { return '<div class="camp"><h4>' + esc(x[0]) + ' <span class="tag draft">Draft</span></h4><div class="pills"><span class="pill">' + ic('org') + esc(x[1]) + '</span>' + (x[2] ? '<span class="pill">' + ic('cmp') + esc(x[2]) + '</span>' : '') + '</div><div class="r">No. of employees<b>0</b></div><div class="r">End date<b>' + ic('cal') + ' ' + x[3] + '</b></div></div>'; }).join('') || '<div class="emptyc" style="grid-column:1/-1"><p style="margin:0">No campaigns match.</p></div>') + '</div>';
    return layout('Admin Dashboard', 'Welcome back!', tabsBar('dashboard') + body);
  }
  function vCountry() {
    var tot = CTRY.reduce(function (a, x) { return a + x[2]; }, 0), vis = CTRY.filter(function (x) { return x[4] >= MINGRP; }), hid = CTRY.length - vis.length, sel = CTRY.filter(function (x) { return x[0] === S.cty; })[0] || CTRY[0];
    var mx = CTRY[0][2], shade = function (n) { var t = n / mx; return t > .6 ? '#3A0068' : t > .3 ? '#5E10A8' : t > .12 ? '#8E4FE0' : t > .05 ? '#B792E8' : '#D9C4F3'; };
    var body = tabsBar('dashboard') + '<div class="grid4 rise">' + tile('Enrolled users', 2340, 'Across all organizations', 'users', true) + tile('Countries', 30, 'With at least one user', 'globe') + tile('Top country', 'Sri Lanka', '27% of all users', 'rep') + tile('Hidden by privacy rule', hid, 'Countries under the minimum group size', 'lock') + '</div>' +
      '<div style="margin-top:14px">' + noteP('Countries with fewer than the minimum group size (set in Report Access Rules, now ' + MINGRP + ') are hidden, so no individual can be picked out.', false) + '</div>' +
      '<div class="g2 rise" style="grid-template-columns:1.6fr 1fr"><div class="card"><b style="font-size:16px">Enrolled users by country</b><div class="sub">Each tile is one country. Darker means more users. Click a tile to see details.</div><div class="map">' + CTRY.map(function (x) { var h = x[4] < MINGRP; return '<button class="' + (h ? 'hid' : '') + (x[0] === S.cty ? ' sel' : '') + '" data-a="cty" data-c="' + x[0] + '" style="background:' + shade(x[2]) + '" title="' + (h ? 'Hidden: under ' + MINGRP + ' organizations' : x[1] + ': ' + x[2]) + '">' + x[0] + '</button>'; }).join('') + '</div><div class="legend"><span><i style="background:#D9C4F3"></i>1-19</span><span><i style="background:#8E4FE0"></i>50-99</span><span><i style="background:#5E10A8"></i>100-299</span><span><i style="background:#3A0068"></i>300+</span><span><i style="background:#fff;border:1px dashed #C9BDE0"></i>Hidden (under ' + MINGRP + ')</span></div></div>' +
      '<div class="card dark"><div class="cap">Selected country</div><h3 style="font-size:26px;margin:8px 0 14px">' + esc(sel[1]) + '</h3>' + (sel[4] < MINGRP ? '<p class="sub">Hidden: this country has fewer than ' + MINGRP + ' organizations, so no figures are shown.</p>' : '<div class="bar"><span>Enrolled users</span><span></span><b>' + sel[2] + '</b></div><div class="bar"><span>Share of all users</span><span></span><b>' + sel[3] + '%</b></div><div class="bar"><span>Organizations</span><span></span><b>' + sel[4] + '</b></div><div class="bar"><span>Growth, last 30 days</span><span></span><b>' + sel[5] + '</b></div><button class="btn light" style="margin-top:14px;background:#fff;color:var(--p)" data-a="toast" data-m="District map (prototype)">Open ' + esc(sel[1]) + ' district map</button>') + '</div></div>' +
      '<div class="card rise" style="margin-top:16px"><b style="font-size:16px">Top countries</b><div style="margin-top:10px">' + vis.slice(0, 8).map(function (x, i) { return '<div class="hbar"><span style="color:var(--mut)">' + (i + 1) + '</span><span>' + esc(x[1]) + '</span><span class="t"><i style="--w:' + x[2] / mx * 100 + '%"></i></span><b>' + x[2] + '</b></div>'; }).join('') + '</div></div>';
    return layout('Dashboard', 'A quick view of every client organization, consultant and campaign on the platform.', body);
  }

  /* ---------- Organizations ---------- */
  function vOrgs() {
    if (S.org) return vOrg();
    if (tabOf('organizations') === 'plans') {
      var body = tabsBar('organizations') + '<p class="sub" style="margin:-4px 0 14px">Which plan each organization is on, how many seats they use, and when they renew.</p><div class="grid4 rise" style="grid-template-columns:1.2fr 1fr 1fr">' + tile('Active subscriptions', 19, 'Paying organizations', 'org', true) + tile('Trials', 5, 'In progress', 'clock') + tile('Seats used', 2340, 'Across all plans', 'users') + '</div>' +
        '<div class="card tbw rise" style="margin-top:16px;padding:6px 10px"><table class="tb"><thead><tr><th>Organization</th><th>Plan</th><th>Seats</th><th>Renews</th><th>Status</th></tr></thead><tbody>' + PLANS.map(function (p) { var cls = p[5] === 'Active' ? 'active' : p[5].indexOf('Over') > -1 ? 'over' : 'soon'; return '<tr><td><span class="oi">' + ic('org') + '</span><b>' + p[0] + '</b></td><td><span class="tag">' + p[1] + '</span></td><td class="seat"><b>' + p[2] + '</b> of ' + p[3] + '<span class="mini"><i style="width:' + Math.min(100, p[2] / p[3] * 100) + '%"></i></span></td><td>' + ic('cal', 'si') + ' ' + p[4] + '</td><td><span class="tag ' + cls + ' dot">' + p[5] + '</span></td></tr>'; }).join('') + '</tbody></table></div>';
      return layout('Organizations', 'Manage all organizations on the platform', body);
    }
    var q = S.oq.toLowerCase(), l = ORGS.filter(function (o) { return !q || o[0].toLowerCase().indexOf(q) > -1; }).sort(function (a, b) { return S.sort === 'az' ? a[0].localeCompare(b[0]) : S.sort === 'za' ? b[0].localeCompare(a[0]) : b[1] - a[1]; });
    var mxE = 31, mxC = 21;
    var body = tabsBar('organizations') + '<div class="tools"><label class="search">' + ic('search') + '<input id="oq" placeholder="Search organizations by name..." value="' + esc(S.oq) + '"></label><button class="btn ghost sm" data-a="sort">' + ic('sort') + ' ' + ({ az: 'Organization A-Z', za: 'Organization Z-A', emp: 'Most employees' })[S.sort] + '</button></div>' +
      '<div class="card tbw rise" style="padding:6px 10px"><table class="tb"><thead><tr><th>Organization</th><th>Employees</th><th>Campaigns</th><th>Joined</th><th>Actions</th></tr></thead><tbody>' + l.map(function (o) { return '<tr><td><span class="oi">' + ic('org') + '</span><b>' + esc(o[0]) + '</b></td><td><b>' + o[1] + '</b><span class="mini"><i style="width:' + o[1] / mxE * 100 + '%"></i></span></td><td><b>' + o[2] + '</b><span class="mini"><i style="width:' + o[2] / mxC * 100 + '%"></i></span></td><td>' + ic('cal') + ' ' + o[3] + '</td><td><button class="btn ghost sm" data-a="open-org" data-n="' + esc(o[0]) + '">' + ic('users') + ' Open ' + ic('arrow') + '</button></td></tr>'; }).join('') + '</tbody></table><div class="pager"><span>Showing ' + l.length + ' of 27 organizations</span></div></div>';
    return layout('Organizations', 'Manage all organizations on the platform', body);
  }
  function vOrg() {
    var o = ORGS.filter(function (x) { return x[0] === S.org; })[0], t = S.otab;
    var hdr = '<div class="orghead"><span class="ico2" style="background:rgba(255,255,255,.16)">' + ic('org') + '</span><div class="grow"><h2>' + esc(o[0]) + '</h2><small>Organization details</small></div><div class="ct"><small>Employees</small><b>' + o[1] + '</b></div><div class="ct"><small>Campaigns</small><b>' + o[2] + '</b></div></div>';
    var tabs = '<div class="tabs">' + [['req', 'Culture Requests', 'doc'], ['camp', 'Culture Campaigns', 'rep'], ['emp', 'Employees', 'users']].map(function (x) { return '<button class="' + (t === x[0] ? 'on' : '') + '" data-a="otab" data-t="' + x[0] + '">' + ic(x[2]) + x[1] + '</button>'; }).join('') + '</div>';
    var b;
    if (t === 'req') b = '<label class="search" style="margin-bottom:14px">' + ic('search') + '<input placeholder="Search by submitter, email, designation, or assessment type..."></label><div class="emptyc" style="margin-top:0"><div class="ic">' + ic('doc') + '</div><h3>No culture requests found</h3><p>No culture requests have been submitted for this organization.</p></div>';
    else if (t === 'camp') b = o[2] ? '<div class="card tbw" style="padding:6px 10px"><table class="tb"><thead><tr><th>Campaign name</th><th>Type</th><th>Participants</th><th>Reports</th><th>Created</th><th>End date</th><th>Status</th><th></th></tr></thead><tbody>' + [['test', 'Sep 4, 2026', 'Sep 17, 2026'], ['test-july-culture', 'Jul 30, 2026', 'Aug 1, 2026']].map(function (c) { return '<tr><td><b>' + c[0] + '</b></td><td><span class="tag">culture</span></td><td>0</td><td>0</td><td>' + c[1] + '</td><td>' + c[2] + '</td><td><span class="tag draft dot">Draft</span></td><td><button class="ib3" data-a="toast" data-m="Opens the campaign (prototype)" aria-label="Open campaign">' + ic('eye') + '</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<div class="emptyc" style="margin-top:0"><p style="margin:0">This organization has no campaigns yet.</p></div>';
    else b = o[1] ? '<div class="card" style="padding:0;overflow:hidden">' + EMPS.slice(0, Math.min(5, o[1])).map(function (e, i) { return '<div class="urow" style="animation-delay:' + i * 35 + 'ms">' + avatar(e[0], true) + '<div class="who"><b>' + esc(e[0]) + ' <span class="tag" style="background:#E8F0FF;color:#2F5DC0">' + e[2] + '</span></b><small>' + esc(e[1]) + ' · ' + esc(e[3]) + '</small></div><small style="color:var(--mut)">' + e[4] + '</small><span class="tag active dot">Active</span></div>'; }).join('') + '</div>' : '<div class="emptyc" style="margin-top:0"><p style="margin:0">This organization has no employees yet.</p></div>';
    return layout('', '', tabs + b, { hdr: '', back: '<button class="back" data-a="org-back">' + ic('left') + ' Back to organizations</button>' + hdr, none: false });
  }

  /* ---------- Requests ---------- */
  function vReqs() {
    var c = counts(), tot = c.pending + c.approved + c.rejected, q = S.rq.toLowerCase();
    var l = REQS.filter(function (r) { return (S.rst === 'all' || r.st === S.rst) && (!q || (r.org + r.by + r.em + r.des).toLowerCase().indexOf(q) > -1); });
    var nsel = Object.keys(S.sel).length;
    var pend = l.filter(function (r) { return r.st === 'pending'; });
    var body = '<div class="grid4 rise">' + tile('Total requests', tot, 'All time', 'req', true) + '<div class="card" style="background:#FFFBF3;border-color:#F6E7C8"><div class="cap"><span class="ico" style="background:#FFF1DA;color:#B97500">' + ic('clock') + '</span>Pending</div><div class="num" data-count="' + c.pending + '">0</div><div class="sub">Need a decision</div></div>' + tile('Approved', c.approved, 'Set up with the team', 'check') + tile('Rejected', c.rejected, 'Closed', 'x') + '</div>' +
      '<div class="tools" style="margin-top:16px"><div class="chips">' + [['all', 'All', tot], ['pending', 'Pending', c.pending], ['approved', 'Approved', c.approved], ['rejected', 'Rejected', c.rejected]].map(function (x) { return '<button class="chip' + (S.rst === x[0] ? ' on' : '') + '" data-a="rst" data-s="' + x[0] + '">' + x[1] + ' <small>' + x[2] + '</small></button>'; }).join('') + '</div></div>' +
      '<label class="search" style="margin-bottom:14px">' + ic('search') + '<input id="rq" placeholder="Search by organization, submitter, email, designation..." value="' + esc(S.rq) + '"></label>' +
      (nsel ? '<div class="bulk"><b>' + nsel + ' selected</b><button class="btn ok sm" data-a="bulk" data-d="approved">' + ic('check') + ' Approve</button><button class="btn ghost sm" data-a="bulk" data-d="rejected">' + ic('x') + ' Reject</button><button class="btn ghost sm" data-a="clrsel">Clear</button></div>' : '') +
      '<div class="card tbw rise" style="padding:6px 10px"><table class="tb"><thead><tr><th style="width:34px"><input type="checkbox" class="ck" data-a="selall" aria-label="Select all pending"' + (pend.length && pend.every(function (r) { return S.sel[r.id]; }) ? ' checked' : '') + '></th><th>Organization</th><th>Submitted by</th><th>Designation</th><th>Assessment type</th><th>Submitted date</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
      (l.map(function (r) { var pd = r.st === 'pending'; return '<tr><td><input type="checkbox" class="ck" data-a="selrow" data-id="' + r.id + '"' + (S.sel[r.id] ? ' checked' : '') + (pd ? '' : ' disabled') + ' aria-label="Select ' + esc(r.org) + '"></td><td><span class="oi">' + ic('org') + '</span><b>' + esc(r.org) + '</b></td><td><b>' + esc(r.by) + '</b><small style="display:block;color:var(--mut)">' + esc(r.em) + '</small></td><td>' + esc(r.des) + '</td><td><span class="tag" style="background:#E8F0FF;color:#2F5DC0">Culture Assessment</span></td><td>' + r.date + '</td><td><span class="tag ' + (pd ? 'pending' : r.st === 'approved' ? 'active' : 'rejected') + ' dot">' + cap(r.st) + '</span></td><td style="white-space:nowrap">' + (pd ? '<button class="btn ok sm" data-a="decide" data-id="' + r.id + '" data-d="approved">' + ic('check') + ' Approve</button> ' : '') + '<span style="position:relative;display:inline-block"><button class="kebab" data-a="kebab" data-id="' + r.id + '" aria-label="More actions">' + ic('more') + '</button><div class="pop" id="pop' + r.id + '"><button data-a="view" data-id="' + r.id + '">' + ic('eye') + ' View Details</button>' + (pd ? '<button data-a="decide" data-id="' + r.id + '" data-d="approved">' + ic('check') + ' Approve</button><button class="rj" data-a="decide" data-id="' + r.id + '" data-d="rejected">' + ic('x') + ' Reject</button>' : '') + '</div></span></td></tr>'; }).join('') || '<tr><td colspan="8"><div class="emptyc" style="margin:6px"><p style="margin:0">No requests match.</p></div></td></tr>') + '</tbody></table></div>';
    return layout('Culture Requests', 'View and manage all culture assessment requests from organizations', body);
  }

  /* ---------- Consultants ---------- */
  function vCons() {
    var q = S.pq.toLowerCase(), l = CONS.filter(function (c) { return !q || (c[0] + c[1]).toLowerCase().indexOf(q) > -1; });
    var body = '<div class="tools"><label class="search">' + ic('search') + '<input id="pq" placeholder="Search by name or email..." value="' + esc(S.pq) + '"></label><button class="btn" data-a="addcon">' + ic('plus') + ' Add consultant</button></div><div class="cgrid rise" style="grid-template-columns:repeat(3,1fr)">' +
      (l.map(function (c, i) { return '<div class="ccard">' + avatar(c[0], true) + '<div class="who"><b>' + esc(c[0]) + '</b><small>' + esc(c[1]) + '</small><div class="tt"><span>' + ic('doc') + ' 0 total</span><span class="g">' + ic('check') + ' 0 completed</span></div></div><button class="ib3" data-a="editcon" data-i="' + CONS.indexOf(c) + '" aria-label="Edit ' + esc(c[0]) + '">' + ic('edit') + '</button></div>'; }).join('') || '<div class="emptyc" style="grid-column:1/-1"><p style="margin:0">No consultants match.</p></div>') + '</div>';
    return layout('Consultants', 'View and manage all consultants in the Calybrate network', body);
  }
  function conForm(i) {
    var c = i == null ? ['', ''] : CONS[i];
    return '<button class="x" data-a="closem" aria-label="Close">' + ic('x') + '</button><h2>' + (i == null ? 'Add Consultant' : 'Edit Consultant') + '</h2><p class="lead">' + (i == null ? 'Add a consultant to the Calybrate network.' : 'Update consultant information') + '</p><div class="fgrid"><label class="fld full">FULL NAME <span class="rq">*</span><input class="inp" id="cn" value="' + esc(c[0]) + '"></label><label class="fld full">EMAIL ADDRESS <span class="rq">*</span><input class="inp" id="ce" type="email" value="' + esc(c[1]) + '"></label></div><div class="acts"><button class="btn ghost" data-a="closem">CANCEL</button><button class="btn' + (i == null ? ' off' : '') + '" id="csave" data-a="savecon" data-i="' + (i == null ? '' : i) + '">' + (i == null ? 'ADD CONSULTANT' : 'SAVE CHANGES') + '</button></div>';
  }

  /* ---------- Reports ---------- */
  var AX = ['Agility', 'Daring', 'Outward', 'Market', 'Governance', 'Authority', 'Inward', 'Community'], RV = [.74, .7, .8, .56, .52, .58, .62, .66];
  function radar(w) {
    var n = 8, cx = 100, cy = 100, R = 72;
    function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; }
    function poly(v) { return v.map(function (x, i) { return pt(i, x).map(function (q) { return q.toFixed(1); }).join(','); }).join(' '); }
    var s = '<svg viewBox="0 0 200 200" width="' + w + '" style="max-width:100%;height:auto">';
    [.25, .5, .75, 1].forEach(function (k) { s += '<polygon points="' + poly(RV.map(function () { return k; })) + '" fill="none" stroke="#E4D7F4"/>'; });
    RV.forEach(function (v, i) { var p = pt(i, 1); s += '<line x1="100" y1="100" x2="' + p[0] + '" y2="' + p[1] + '" stroke="#E4D7F4"/>'; });
    return s + '<polygon points="' + poly(RV.map(function (v) { return Math.min(1, v + .13); })) + '" fill="rgba(240,165,58,.2)" stroke="#F0A53A" stroke-width="1.6"/><polygon points="' + poly(RV) + '" fill="rgba(75,0,130,.2)" stroke="#4B0082" stroke-width="2"/></svg>';
  }
  function vRep() {
    if (tabOf('reports') === 'rules') {
      var body = tabsBar('reports') + noteP('These rules decide who can see individual results and how small a group can be before it is hidden. Changes are recorded in the Audit Logs.', false) +
        '<div class="card rise"><div class="sw"><div class="who"><b>Minimum group size</b><small>Groups smaller than this are hidden from every report.</small></div><select style="width:90px" id="mingrp"><option>3</option><option selected>5</option><option>10</option></select></div>' +
        swRow('cons', 'Consultants can see their own clients', 'Consultants only ever see organizations they are assigned to.') + swRow('retain', 'Keep reports for 24 months', 'After this, reports are archived and no longer open.') + '</div>';
      return layout('Reports', 'Access organizational reports and analytics to gain insights into employee engagement, culture, and performance.', body);
    }
    var body2 = tabsBar('reports') + '<div class="card rise" style="padding:26px;position:relative;overflow:hidden"><span class="tag">Organization</span><h2 style="font-size:30px;letter-spacing:-.03em;margin:12px 0 8px;max-width:60%">Culture Assessment</h2><p class="sub" style="max-width:58%;font-size:13px">Measure organizational health, culture maturity, employee engagement, and compare departments with detailed analytics.</p><div class="tiles" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0;max-width:520px">' +
      [['Overall View', 'dash'], ['Six Dimensions', 'layers'], ['Multi-View Analysis', 'users'], ['Employee Feedback', 'doc']].map(function (t) { return '<button class="tilec" data-a="toast" data-m="' + t[0] + ' (prototype)">' + ic(t[1]) + t[0] + '</button>'; }).join('') + '</div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn" data-a="toast" data-m="Opens the report (prototype)">View report ' + ic('arrow') + '</button><span class="chip">' + ic('org') + ' test_today</span></div><div style="position:absolute;right:26px;top:30px;width:30%">' + radar(250) + '</div></div>';
    return layout('Reports', 'Access organizational reports and analytics to gain insights into employee engagement, culture, and performance.', body2);
  }
  function swRow(k, t, s) { return '<div class="sw"><div class="who"><b>' + t + '</b><small>' + s + '</small></div><button class="tg' + (S.sw[k] ? ' on' : '') + '" data-a="sw" data-k="' + k + '" aria-label="' + t + '"></button></div>'; }

  /* ---------- Team & Security ---------- */
  function vTeam() {
    var t = tabOf('team'), body = tabsBar('team');
    if (t === 'adm') {
      var noMfa = ADM.filter(function (a) { return a[2] === false; }).length;
      body += '<div class="top" style="margin:0 0 12px"><div></div><button class="btn" data-a="inviteadm">' + ic('send') + ' Invite admin</button></div>' + noteP('Platform admins manage organizations and settings without opening individual personality or leadership results. Seeing individual data needs a separate permission and a written reason, and every view is logged.', false) +
        '<div class="grid4 rise" style="grid-template-columns:1.2fr 1fr 1fr">' + tile('Platform admins', ADM.length, 'With portal access', 'users', true) + '<div class="card" style="background:#FFFBF3;border-color:#F6E7C8"><div class="cap"><span class="ico" style="background:#FFF1DA;color:#B97500">' + ic('lock') + '</span>MFA turned on</div><div class="num" style="font-size:34px">' + (ADM.filter(function (a) { return a[2] === true; }).length) + ' of ' + ADM.length + '</div><div class="sub">' + noMfa + ' admin still needs it</div></div>' + tile('Pending invitations', 1, 'Not yet accepted', 'mail') + '</div>' +
        '<h3 style="font-size:18px;margin:22px 0 10px">Platform admin accounts</h3><div class="card tbw" style="padding:6px 10px"><table class="tb"><thead><tr><th>Admin</th><th>Role</th><th>MFA</th><th>Last active</th><th>Status</th></tr></thead><tbody>' + ADM.map(function (a) { return '<tr><td>' + avatar(a[0].toUpperCase(), true).replace('class="av d"', 'class="av d" style="width:26px;height:26px;font-size:10px;margin-right:8px;display:inline-grid;vertical-align:middle"') + '<b>' + a[0] + '</b></td><td>' + a[1] + '</td><td><span class="tag ' + (a[2] === true ? 'active' : a[2] === false ? 'mfaoff' : 'nc') + '">' + (a[2] === true ? 'On' : a[2] === false ? 'Off' : 'Not set') + '</span></td><td>' + ic('clock') + ' ' + a[3] + '</td><td><span class="tag ' + (a[4] === 'Active' ? 'active' : 'pending') + ' dot">' + a[4] + '</span></td></tr>'; }).join('') + '</tbody></table></div>';
    } else if (t === 'aud') {
      var q = S.aq || '', l = AUD.filter(function (r) { return !q || r.join(' ').toLowerCase().indexOf(q.toLowerCase()) > -1; });
      body += noteP('Every view of individual personality or leadership data is recorded with who, when and why. Log entries cannot be edited or deleted.', false) + '<div class="tools"><label class="search">' + ic('search') + '<input id="aq" placeholder="Search actor or action" value="' + esc(q) + '"></label><button class="btn ghost sm" data-a="toast" data-m="Last 30 days">' + ic('cal') + ' Last 30 days</button></div>' +
        '<div class="card tbw rise" style="padding:6px 10px"><table class="tb"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Result</th></tr></thead><tbody>' + (l.map(function (r) { var cl = r[4] === 'Success' ? 'active' : r[4] === 'Blocked' ? 'blocked' : 'soon'; return '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td>' + r[2] + '</td><td>' + r[3] + '</td><td><span class="tag ' + cl + '">' + r[4] + '</span></td></tr>'; }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--mut)">No entries match.</td></tr>') + '</tbody></table></div>';
    } else if (t === 'sso') {
      body += '<div class="card rise">' + swRow('mfa', 'Require two-step sign-in for all platform admins', 'Admins without it are asked to set it up at their next sign-in.') + swRow('sso', 'Single sign-on', 'Let admins sign in with your company identity provider. Set it up under Settings, Integrations &amp; Keys.') + swRow('dom', 'Only allow sign-in from approved email domains', 'calybrate.app, example.com') + '<div class="sw"><div class="who"><b>Session length</b><small>Admins are signed out after this long without activity.</small></div><select style="width:130px"><option>30 minutes</option><option selected>2 hours</option><option>8 hours</option></select></div></div>';
    } else {
      body += '<div class="card rise"><div class="sw"><div class="who"><b>Consent text shown to employees</b><small>Shown before any assessment starts. Last updated 02 Oct 2026.</small></div><button class="btn ghost sm" data-a="toast" data-m="Edit consent text (prototype)">' + ic('edit') + ' Edit</button></div><div class="sw"><div class="who"><b>Privacy policy link</b><small>https://calybrate.app/privacy</small></div><button class="btn ghost sm" data-a="toast" data-m="Edit link (prototype)">' + ic('edit') + ' Edit</button></div><div class="sw"><div class="who"><b>Data export and deletion requests</b><small>0 open requests</small></div><span class="tag active dot">Up to date</span></div></div>';
    }
    return layout('Team & Security', t === 'aud' ? 'A record of who did what, when, and to which organization or person.' : 'Who can sign in to the Platform Admin portal, and what each person is allowed to do.', body);
  }

  /* ---------- Settings ---------- */
  function vSet() {
    var t = tabOf('settings'), body = tabsBar('settings'), sub = 'Connected services and the keys they use. Keys are shown masked and can be rotated.';
    if (t === 'int') {
      body += '<div class="top" style="margin:0 0 12px"><div></div><button class="btn" data-a="toast" data-m="Add integration (prototype)">' + ic('plus') + ' Add integration</button></div><div class="cgrid rise" style="grid-template-columns:repeat(2,1fr)">' + SVC.map(function (s) { var cl = s[1] === 'Connected' ? 'active' : s[1] === 'Needs review' ? 'review' : 'nc'; return '<div class="card svc"><h4>' + s[0] + '<span class="tag ' + cl + '">' + s[1] + '</span></h4><p>' + s[2] + '</p><div class="key">' + s[3] + '</div><br><button class="lnk" data-a="svc" data-n="' + s[0] + '">OPEN ' + ic('arrow') + '</button></div>'; }).join('') + '</div>';
    } else if (t === 'eml') {
      sub = 'The messages Calybrate sends to employees, raters and admins.';
      body += '<div class="top" style="margin:0 0 12px"><div></div><button class="btn" data-a="toast" data-m="New template (prototype)">' + ic('plus') + ' New template</button></div><div class="cgrid rise" style="grid-template-columns:repeat(2,1fr)">' + TPL.map(function (s, i) { return '<div class="card svc"><h4>' + s[0] + '<span class="tag ' + (s[1] === 'Active' ? 'active' : 'draft') + '">' + s[1] + '</span></h4><p style="color:#4A4358;font-size:12.5px">' + s[2] + '</p><p>' + s[3] + '</p><button class="lnk" data-a="tpl" data-i="' + i + '">OPEN ' + ic('arrow') + '</button></div>'; }).join('') + '</div>';
    } else if (t === 'hl') {
      sub = 'Is everything running? Last checked a minute ago.';
      body += '<div class="card rise">' + [['Web app', 'Operational', 0], ['Assessment engine', 'Operational', 0], ['Email delivery', 'Operational', 0], ['Report generation', 'Slower than usual', 1], ['Database', 'Operational', 0]].map(function (h) { return '<div class="hl"><span class="d' + (h[2] ? ' w' : '') + '"></span><span class="who">' + h[0] + '</span><small>' + h[1] + '</small></div>'; }).join('') + '</div>';
    } else {
      sub = 'Defaults for new assessments across the platform.';
      body += '<div class="card rise"><div class="sw"><div class="who"><b>Default campaign length</b><small>New campaigns end this many days after they start.</small></div><select style="width:120px"><option>14 days</option><option selected>21 days</option><option>30 days</option></select></div><div class="sw"><div class="who"><b>Reminder schedule</b><small>When to nudge people who have not finished.</small></div><select style="width:190px"><option>3 days before the end</option><option selected>7 and 2 days before</option></select></div>' + swRow('cons', 'Allow anonymous responses', 'Raters are never shown who gave which answer.') + '</div>';
    }
    return layout('Settings', sub, body);
  }

  /* ---------- Marketing ---------- */
  function spark() {
    var p = [10, 14, 12, 18, 16, 22, 20, 27, 25, 31, 29, 36], w = 400, h = 150, mx = 40, pts = p.map(function (v, i) { return [i / (p.length - 1) * w, h - v / mx * (h - 14) - 6]; });
    var d = pts.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' ');
    return '<svg class="spl" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><path class="a" d="' + d + ' L' + w + ' ' + h + ' L0 ' + h + 'Z"/><path class="l" d="' + d + '"/></svg>';
  }
  function vMkt() {
    var t = tabOf('marketing'), body = tabsBar('marketing'), sub = 'The LinkedIn, TikTok and YouTube accounts Calybrate posts to. Connect or disconnect them here.';
    if (t === 'acc') {
      body += noteP('Accounts connect through the sign-in page of each platform. Calybrate never sees or stores passwords. Access tokens are kept encrypted and can be revoked here.', false) + '<div class="grid4 rise" style="grid-template-columns:1.2fr 1fr 1fr">' + tile('Connected accounts', '3 of 4', 'LinkedIn, TikTok, YouTube, Instagram', 'mega', true) + tile('Total followers', '12,840', 'Across the three main channels', 'users') + tile('Posts this month', 5, 'Published and scheduled', 'send') + '</div><div class="cgrid rise" style="grid-template-columns:repeat(2,1fr);margin-top:16px">' + CHAN.map(function (c) { return '<div class="card svc"><h4>' + c[0] + '<span class="tag ' + (c[1] === 'Connected' ? 'active' : 'nc') + '">' + c[1] + '</span></h4><p>' + c[2] + '</p><p><b>' + c[3] + '</b></p><button class="lnk" data-a="toast" data-m="' + (c[1] === 'Connected' ? 'Manage ' : 'Connect ') + c[0] + ' (prototype, nothing is really connected)">' + (c[1] === 'Connected' ? 'OPEN' : 'CONNECT') + ' ' + ic('arrow') + '</button></div>'; }).join('') + '</div>';
    } else if (t === 'post') {
      sub = 'Share a video or message on one or more channels, now or later.';
      var m = S.mk, chs = ['LinkedIn', 'TikTok', 'YouTube'];
      body += noteP('Preview only. Nothing is really posted to LinkedIn, TikTok or YouTube.', false) + '<div class="compose rise"><div class="card"><div class="stepn"><i>1</i>Choose channels</div><div class="chips">' + chs.map(function (c) { return '<button class="chip' + (m.ch[c] ? ' on' : '') + '" data-a="mch" data-c="' + c + '">' + c + (m.ch[c] ? ' selected' : ' add') + '</button>'; }).join('') + '</div><div class="stepn"><i>2</i>Add a video</div><button class="drop' + (m.vid ? ' on' : '') + '" data-a="mvid">' + (m.vid ? ic('check') + ' sample-video.mp4 added' : ic('up') + ' Choose a sample video') + '</button><div class="stepn"><i>3</i>Write the caption</div><textarea class="inp" id="mcap" rows="3" placeholder="Write something about your video">' + esc(m.cap) + '</textarea><div class="stepn"><i>4</i>When to post</div><div class="chips"><button class="chip' + (m.when === 'now' ? ' on' : '') + '" data-a="mwhen" data-w="now">Post now</button><button class="chip' + (m.when === 'later' ? ' on' : '') + '" data-a="mwhen" data-w="later">Schedule for later</button></div><div class="tools" style="margin-top:18px"><button class="btn' + (m.vid && m.cap.trim() && Object.keys(m.ch).length ? '' : ' off') + '" data-a="mpost">' + ic('send') + ' ' + (m.when === 'now' ? 'Post now' : 'Schedule') + '</button><button class="btn ghost" data-a="toast" data-m="Saved as draft">Save as draft</button></div></div>' +
        '<div><div class="cap" style="margin-bottom:8px">Preview</div><div class="prev"><div class="vid">' + (m.vid ? ic('play', 'si') : '') + '</div><div class="cp">' + (m.cap.trim() ? esc(m.cap) : '<span style="color:var(--mut)">Your caption will appear here once you write it.</span>') + '</div><div style="padding:0 14px 14px;font-size:11.5px;color:var(--mut)">Posting to ' + (Object.keys(m.ch).join(', ') || 'no channel') + '</div></div></div></div>';
    } else if (t === 'sch') {
      sub = 'What is published and what is planned.';
      body += '<div class="card tbw rise" style="padding:6px 10px"><table class="tb"><thead><tr><th>Post</th><th>Channels</th><th>When</th><th>Status</th></tr></thead><tbody>' + [['How a 360 report is built', 'LinkedIn, YouTube', '28 Oct, 10:00', 'Published'], ['Five signs your culture needs a pulse check', 'LinkedIn', '30 Oct, 09:00', 'Published'], ['Meet the Calybrate team', 'TikTok', '04 Nov, 12:30', 'Scheduled'], ['Case study: ima-2', 'LinkedIn, TikTok', '08 Nov, 09:00', 'Scheduled'], ['Webinar teaser', 'YouTube', '-', 'Draft']].map(function (r) { return '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td>' + r[2] + '</td><td><span class="tag ' + (r[3] === 'Published' ? 'active' : r[3] === 'Draft' ? 'draft' : '') + ' dot">' + r[3] + '</span></td></tr>'; }).join('') + '</tbody></table></div>';
    } else {
      sub = 'How your videos and posts are doing on each channel. Sample data.';
      body += '<div class="grid4 rise">' + tile('Followers', '12,840', '+2.0% this month', 'users', true) + tile('Views', '48,200', 'Last 12 weeks', 'eye') + tile('Engagement rate', '4.7%', 'likes, comments and shares per view', 'heart') + tile('Link clicks', '1,180', 'To the Calybrate site', 'arrow') + '</div><div class="g2 rise" style="margin-top:16px;grid-template-columns:1.4fr 1fr"><div class="card"><b>Views per week</b><div class="sub">Last 12 weeks, oldest to newest. All channels.</div>' + spark() + '</div><div class="card"><b>Best day to post</b><div class="sub">Average engagement rate by day of week</div><div style="margin-top:10px">' + [['Mon', 3.9], ['Tue', 4.8], ['Wed', 5.2], ['Thu', 4.6], ['Fri', 4.0], ['Sat', 2.9], ['Sun', 3.1]].map(function (d) { return '<div class="hrow"><span>' + d[0] + '</span><span class="t"><i style="width:' + d[1] / 5.2 * 100 + '%"></i></span><b>' + d[1] + '%</b></div>'; }).join('') + '</div></div></div>';
    }
    return layout('Marketing', sub, body);
  }

  /* ---------- overlays ---------- */
  var modalEl, scrim, drawerEl, toastEl, tt;
  function openModal(h) { modalEl.innerHTML = h; modalEl.classList.add('open'); scrim.classList.add('open'); var f = $('input,textarea,select', modalEl); if (f) setTimeout(function () { f.focus(); }, 50); }
  function closeModal() { modalEl.classList.remove('open'); drawerEl.classList.remove('open'); scrim.classList.remove('open'); }
  function toast(m) { toastEl.innerHTML = m; toastEl.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { toastEl.classList.remove('show'); }, 2300); }
  var X = '<button class="x" data-a="closem" aria-label="Close">' + ic('x') + '</button>';
  function ask(o) { openModal(X + '<h2>' + o.t + '</h2><p class="lead" style="margin-top:6px">' + o.b + '</p><div class="acts"><button class="btn ghost" data-a="closem">Cancel</button><button class="btn' + (o.red ? ' red' : ' ok') + '" data-a="yes">' + o.yes + '</button></div>'); modalEl._yes = o.on; }
  function decide(ids, d) {
    var rs = REQS.filter(function (r) { return ids.indexOf(r.id) > -1; }), n = rs.length, ok = d === 'approved';
    ask({ t: ok ? (n > 1 ? 'Approve ' + n + ' requests?' : 'Approve this request?') : (n > 1 ? 'Reject ' + n + ' requests?' : 'Reject this request?'), b: (n > 1 ? n + ' organizations' : '<b>' + esc(rs[0].org) + '</b> from ' + esc(rs[0].by)) + (ok ? ' will be set up with the team and told by email.' : ' will be told the request was not accepted. This cannot be undone.'), yes: ok ? 'Approve' : 'Reject', red: !ok,
      on: function () { rs.forEach(function (r) { r._from = r._from || r.st; r.st = d; delete S.sel[r.id]; }); closeModal(); render(true); toast((n > 1 ? n + ' requests ' : 'Request ') + d); } });
  }

  /* ---------- render + events ---------- */
  function view() { switch (S.page) { case 'organizations': return vOrgs(); case 'requests': return vReqs(); case 'consultants': return vCons(); case 'reports': return vRep(); case 'team': return vTeam(); case 'settings': return vSet(); case 'marketing': return vMkt(); default: return vDash(); } }
  function render(keep) { var y = keep ? window.scrollY : 0; $('#root').innerHTML = view(); fx(); window.scrollTo(0, y); }
  function fx() { $$('[data-count]').forEach(function (el) { var to = +el.dataset.count, t0 = performance.now(); (function step(t) { var p = Math.min(1, (t - t0) / 900); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('en-US'); if (p < 1) requestAnimationFrame(step); })(t0); }); }
  function keepFocus(id) { var e = $('#' + id), p = e && e.selectionStart; render(true); var n = $('#' + id); if (n) { n.focus(); n.setSelectionRange(p, p); } }

  document.addEventListener('click', function (e) {
    var m = $('#menu'); if (m && !e.target.closest('.chipwrap')) m.classList.remove('open');
    if (!e.target.closest('.kebab')) $$('.pop.open').forEach(function (p) { p.classList.remove('open'); });
    var el = e.target.closest('[data-a]'); if (!el) { if (e.target === scrim) closeModal(); return; }
    if (el.tagName === 'INPUT') return;
    var a = el.dataset.a, d = el.dataset;
    switch (a) {
      case 'menu': $('#menu').classList.toggle('open'); break;
      case 'nav': S.page = d.p; S.org = null; if (d.st) S.rst = d.st; render(); break;
      case 'tab': S.tab[d.p] = d.t; render(true); break;
      case 'toast': toast(d.m); break;
      case 'closem': closeModal(); break;
      case 'yes': if (modalEl._yes) modalEl._yes(); break;
      case 'cty': S.cty = d.c; render(true); break;
      case 'sort': S.sort = S.sort === 'az' ? 'za' : S.sort === 'za' ? 'emp' : 'az'; render(true); break;
      case 'open-org': S.org = d.n; S.otab = 'req'; render(); break;
      case 'org-back': S.org = null; render(); break;
      case 'otab': S.otab = d.t; render(true); break;
      case 'rst': S.rst = d.s; render(true); break;
      case 'kebab': var pp = $('#pop' + d.id), was = pp.classList.contains('open'); $$('.pop.open').forEach(function (x) { x.classList.remove('open'); }); if (!was) pp.classList.add('open'); break;
      case 'view': var r = REQS.filter(function (x) { return x.id === +d.id; })[0]; openModal(X + '<h2>' + esc(r.org) + '</h2><p class="lead">Culture Assessment request</p><div class="kv"><div><small>Submitted by</small><b>' + esc(r.by) + '</b></div><div><small>Email</small><b style="word-break:break-all">' + esc(r.em) + '</b></div><div><small>Designation</small><b>' + esc(r.des) + '</b></div><div><small>Submitted</small><b>' + r.date + '</b></div><div><small>Status</small><span class="tag ' + (r.st === 'pending' ? 'pending' : r.st === 'approved' ? 'active' : 'rejected') + ' dot">' + cap(r.st) + '</span></div></div><div class="acts"><button class="btn ghost" data-a="closem">Close</button></div>'); break;
      case 'decide': decide([+d.id], d.d); break;
      case 'selrow': if (el.checked) S.sel[d.id] = 1; else delete S.sel[d.id]; render(true); break;
      case 'selall': REQS.filter(function (x) { return x.st === 'pending' && (S.rst === 'all' || S.rst === 'pending'); }).forEach(function (x) { if (el.checked) S.sel[x.id] = 1; else delete S.sel[x.id]; }); render(true); break;
      case 'clrsel': S.sel = {}; render(true); break;
      case 'bulk': decide(Object.keys(S.sel).map(Number), d.d); break;
      case 'addcon': openModal(conForm(null)); break;
      case 'editcon': openModal(conForm(+d.i)); break;
      case 'savecon': if (el.classList.contains('off')) break; var nm = $('#cn').value.trim(), em = $('#ce').value.trim(); if (d.i === '') { CONS.unshift([nm, em]); toast('Consultant added'); } else { CONS[+d.i] = [nm, em]; toast('Changes saved'); } closeModal(); render(true); break;
      case 'sw': S.sw[d.k] = !S.sw[d.k]; render(true); break;
      case 'inviteadm': openModal(X + '<h2>Invite admin</h2><p class="lead">They will get an email with a link to join the Platform Admin portal.</p><div class="fgrid"><label class="fld full">Email <span class="rq">*</span><input class="inp" id="ie" type="email"></label><label class="fld full">Role<select><option>Platform Admin</option><option>Support</option><option>Analyst (aggregated only)</option><option>Read-only</option></select></label></div><div class="acts"><button class="btn ghost" data-a="closem">Cancel</button><button class="btn off" id="isend" data-a="isend">' + ic('send') + ' Send invitation</button></div>'); break;
      case 'isend': if (el.classList.contains('off')) break; ADM.push([$('#ie').value.trim(), 'Platform Admin', null, 'Never', 'Invited']); closeModal(); render(true); toast('Invitation sent'); break;
      case 'svc': var sv = SVC.filter(function (x) { return x[0] === d.n; })[0]; openModal(X + '<h2>' + sv[0] + '</h2><p class="lead">' + sv[2] + '</p><div class="rules"><div>' + ic('key') + '<span>' + sv[3] + '</span></div>' + (sv[1] === 'Needs review' ? '<div>' + ic('info') + '<span>Confirm what employee data is sent to this service before keeping it on.</span></div>' : '') + '</div><div class="acts"><button class="btn ghost" data-a="closem">Close</button><button class="btn" data-a="toast" data-m="Key rotated (prototype)">' + ic('key') + ' Rotate key</button></div>'); break;
      case 'tpl': var tp = TPL[+d.i]; openModal(X + '<h2>' + tp[0] + '</h2><p class="lead">' + tp[3] + '</p><label class="fld">Message<textarea class="inp" rows="4">' + esc(tp[2]) + '</textarea></label><div class="acts"><button class="btn ghost" data-a="closem">Cancel</button><button class="btn" data-a="closem">Save</button></div>'); break;
      case 'mch': if (S.mk.ch[d.c]) delete S.mk.ch[d.c]; else S.mk.ch[d.c] = 1; render(true); break;
      case 'mvid': S.mk.vid = !S.mk.vid; render(true); break;
      case 'mwhen': S.mk.when = d.w; render(true); break;
      case 'mpost': if (el.classList.contains('off')) break; ask({ t: S.mk.when === 'now' ? 'Post now?' : 'Schedule this post?', b: 'Preview only. Nothing is really posted to ' + Object.keys(S.mk.ch).join(', ') + '.', yes: S.mk.when === 'now' ? 'Post' : 'Schedule', on: function () { closeModal(); S.mk = { ch: { LinkedIn: 1, TikTok: 1 }, vid: false, cap: '', when: 'now' }; S.tab.marketing = 'sch'; render(); toast('Added to Posts &amp; Schedule (preview only)'); } }); break;
    }
  });
  document.addEventListener('change', function (e) { var el = e.target; if (el.dataset && (el.dataset.a === 'selrow' || el.dataset.a === 'selall')) el.click && 0; if (el.dataset && el.dataset.a === 'selrow') { if (el.checked) S.sel[el.dataset.id] = 1; else delete S.sel[el.dataset.id]; render(true); } else if (el.dataset && el.dataset.a === 'selall') { REQS.filter(function (x) { return x.st === 'pending'; }).forEach(function (x) { if (el.checked) S.sel[x.id] = 1; else delete S.sel[x.id]; }); render(true); } });
  document.addEventListener('input', function (e) {
    var id = e.target.id;
    if (id === 'cq') { S.cq = e.target.value; keepFocus('cq'); } else if (id === 'oq') { S.oq = e.target.value; keepFocus('oq'); } else if (id === 'rq') { S.rq = e.target.value; keepFocus('rq'); } else if (id === 'pq') { S.pq = e.target.value; keepFocus('pq'); } else if (id === 'aq') { S.aq = e.target.value; keepFocus('aq'); }
    else if (id === 'mcap') { S.mk.cap = e.target.value; var pv = $('.prev .cp'); if (pv) pv.innerHTML = e.target.value.trim() ? esc(e.target.value) : '<span style="color:var(--mut)">Your caption will appear here once you write it.</span>'; var b = $('[data-a="mpost"]'); if (b) b.classList.toggle('off', !(S.mk.vid && e.target.value.trim() && Object.keys(S.mk.ch).length)); }
    else if (id === 'cn' || id === 'ce') { var ok = $('#cn').value.trim() && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($('#ce').value.trim()); $('#csave').classList.toggle('off', !ok); }
    else if (id === 'ie') { $('#isend').classList.toggle('off', !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.target.value.trim())); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  function boot() {
    document.body.insertAdjacentHTML('beforeend', '<div id="root"></div><div class="scrim" id="scrim"></div><div class="modal" id="modal" role="dialog" aria-modal="true"></div><aside class="drawer" id="drawer"></aside><div class="toast" id="toast" role="status"></div>');
    modalEl = $('#modal'); scrim = $('#scrim'); drawerEl = $('#drawer'); toastEl = $('#toast'); render();
  }
  boot();
})();
