/* Calybrate product journey — transcribed from the hand-drawn sketches (1.jpeg – 14.jpeg).
   Steps are listed in story order (depth-first); `p` is the parent step.
   k = kind, e = label on the edge coming into the step, g = "continues at" step ids,
   gr = feature flows unlocked (role steps), n = interpretation note where the sketch is ambiguous. */
(function () {
  const S = (id, t, p, k, d, o) => Object.assign({ id, t, p, k, d }, o || {});
  const REF = (id, t, d, g) => ({ id, t, d, k: 'ref', ref: true, g });

  const acts = [
    { n: 'I', name: 'Onboarding', color: '#d8b4fe' },
    { n: 'II', name: 'Campaigns', color: '#a855f7' },
    { n: 'III', name: 'People', color: '#e879f9' },
    { n: 'IV', name: 'Admin', color: '#818cf8' }
  ];

  const chapters = [
    {
      n: 1, act: 0, name: 'The Front Door', short: 'Front Door', sketch: [1],
      blurb: 'Everything begins on the Calybrate landing page. A visitor can jump straight in, start calibrating, or ask for a demo first.',
      steps: [
        S('1', 'Landing Page', null, 'screen', 'The calybrate-app landing page — the first thing every visitor sees.'),
        S('2', 'Get Started', '1', 'action', 'Primary call to action on the landing page.'),
        S('5', 'Sign in / Sign up', '2', 'key', 'One entry point for returning and new users.', { g: ['7'] }),
        S('3', 'Start Calibration', '1', 'action', 'Second call to action — it also leads to Sign in / Sign up.', { g: ['5'] }),
        S('4', 'Request Demo', '1', 'action', 'For visitors who want to see Calybrate before signing up.'),
        S('6', 'Demo request form', '4', 'screen', 'The visitor fills in a form and the team follows up.')
      ]
    },
    {
      n: 2, act: 0, name: 'Creating an Account', short: 'Account', sketch: [1, 2],
      blurb: 'Gmail, Microsoft or plain email — three ways in, then an org name, a confirmation email and a first sign-in.',
      steps: [
        S('7', 'Create Account', null, 'key', 'Reached from Sign in / Sign up (5).'),
        S('11', 'Account creation', '7', 'choice', 'Choose how the account is created.'),
        S('8', 'Gmail', '11', 'action', 'Continue with a Google account.'),
        S('9', 'Microsoft', '11', 'action', 'Continue with a Microsoft account.'),
        S('10', 'Email & Password', '11', 'action', 'Classic sign-up with an email address and a password.'),
        S('12', 'Org name, password etc.', '10', 'screen', 'Collect organisation name, password and the remaining profile details.'),
        S('13', 'Email Confirmation', '12', 'mail', 'A confirmation email is sent to verify the address.', { n: 'Highlighted green in the sketch. The sketch draws Gmail / Microsoft / Email all joining here — worth confirming whether SSO skips this step.' }),
        S('14', 'Auth', '13', 'key', 'The user is authenticated after confirming.'),
        S('15', 'Sign-in Page', '14', 'screen', 'The user lands on the sign-in page.'),
        S('16', 'Welcome & Tour guide', '15', 'screen', 'A welcome screen and guided tour of the product.', { g: ['17'] })
      ]
    },
    {
      n: 3, act: 0, name: 'First Steps', short: 'First Steps', sketch: [2, 3],
      blurb: 'Is this the first user of the org? The first user is dropped into a demo dashboard; everyone else goes to the console.',
      steps: [
        S('17', 'First user?', null, 'choice', 'The product branches on whether this is the organisation\'s first user.'),
        S('18', 'Yes — first user', '17', 'choice', 'The first user gets the guided demo experience.', { e: 'Y' }),
        S('20', 'Demo Dashboard', '18', 'screen', 'A demo dashboard populated with sample data.'),
        S('22', 'Redirect: Me · 180 · 360 · Culture', '20', 'action', 'Redirected into the four assessment types: 1 Me, 2 180, 3 360, 4 Culture.'),
        S('23', 'Unique sample into dashboard', '22', 'data', 'Each assessment type drops a unique sample into the dashboard.', { g: ['24'] }),
        S('19', 'No — not the first user', '17', 'choice', 'Everyone after the first user.', { e: 'N' }),
        S('21', 'Console', '19', 'screen', 'Straight to the console, ready to create a campaign.', { g: ['24'] })
      ]
    },
    {
      n: 4, act: 1, name: 'Build a Campaign', short: 'Campaign', sketch: [3],
      blurb: 'Me, 180, 360 or Culture — the user chooses what to measure. Culture takes a personal detour through the SB Admin team.',
      steps: [
        S('24', 'Create Campaign', null, 'flag', 'Entry point for every new campaign (also the start of feature flow 52A).'),
        S('25', 'Create individual campaign', '24', 'action', 'Start an individual campaign.'),
        S('26', 'Pick the assessment type', '25', 'choice', 'Me, 180, 360 or Culture.'),
        S('27', 'Unique Create Campaign', '26', 'action', 'Me / 180 / 360 campaigns are created directly.'),
        S('36', 'Quick assessment', '27', 'action', 'A lightweight, fast route.', { g: ['33'], n: 'The sketch loops this path around to Org / Team Setup (33).' }),
        S('30', 'Bulk', '27', 'data', 'Create campaigns in bulk.', { g: ['33'] }),
        S('31A', 'Setup Org.', '27', 'action', 'Set up the organisation before launching.'),
        S('32', 'Guide', '31A', 'screen', 'A guide walks the user through the org setup.', { g: ['33'] }),
        S('28', 'Culture → Request Demo', '26', 'action', 'Culture is not self-serve — the user requests a demo.'),
        S('29', 'Email to SB Admin', '28', 'mail', 'The request is emailed to the SB Admin.'),
        S('31B', 'Personalised call & Setup', '29', 'people', 'SB Admin runs a personalised call and sets everything up.', { g: ['33'] })
      ]
    },
    {
      n: 5, act: 1, name: 'Org, Team & Launch', short: 'Launch', sketch: [3, 4],
      blurb: 'People come in through HRIS, CSV or one by one. Review, confirm — and press launch.',
      steps: [
        S('33', 'Org / Team Setup', null, 'screen', 'Define the organisation and the teams taking part.'),
        S('34A', 'Link to HRIS', '33', 'data', 'Sync the org structure from the HRIS.'),
        S('35A', 'CSV', '33', 'data', 'Upload the org structure as a CSV.'),
        S('37', 'Add team members', '33', 'people', 'Add the people who will be assessed.', { n: 'Circle 37 has no label in the sketch — named from context.' }),
        S('34B', 'Link to HRIS', '37', 'data', 'Pull employees from the HRIS.'),
        S('35B', 'CSV', '37', 'data', 'Upload employees as a CSV.'),
        S('38', 'Add Employee', '37', 'action', 'Add a single employee manually.'),
        S('39', 'Unique Launch Campaign', '33', 'flag', 'Prepare the campaign for launch.'),
        S('40A', 'Revise & Confirm', '39', 'screen', 'Review every setting before going live.'),
        S('40B', 'Link to Campaign', '40A', 'action', 'Share or attach the campaign link.', { n: 'Highlighted green in the sketch.' }),
        S('41', 'Launch', '40A', 'flag', 'The campaign goes live and invitations go out.', { g: ['43', '44'] })
      ]
    },
    {
      n: 6, act: 2, name: 'The Raters', short: 'Raters', sketch: [2, 5],
      blurb: 'Launch sends the invites. Participants and other raters get an email, a dashboard and their assessments.',
      steps: [
        REF('ref-41', 'From Launch (41)', 'The campaign has just launched.', ['41']),
        S('43', 'Participant Raters', 'ref-41', 'people', 'The participants themselves, rating as part of the campaign.'),
        S('42', 'Other Raters', 'ref-41', 'people', 'Everyone else invited to rate — managers, peers, direct reports.'),
        S('49', 'Email Notification', 'ref-41', 'mail', 'Every rater is notified by email.'),
        S('50', 'Rater Dashboard', '49', 'screen', 'Raters land on their own dashboard.'),
        S('51', 'Assessments', '50', 'screen', 'The assessments waiting to be completed.')
      ]
    },
    {
      n: 7, act: 2, name: 'Insight Viewers', short: 'Insight', sketch: [5],
      blurb: 'Once responses land, client C-suite and viewers get their own emails, access and views of the insight.',
      steps: [
        REF('ref-41b', 'From Launch (41) — Insight', 'Insight audiences are set up at launch.', ['41']),
        S('44', 'Client C-suite', 'ref-41b', 'role', 'Senior leaders at the client organisation.'),
        S('56', 'Email Notification', '44', 'mail', 'The C-suite user is notified by email.'),
        S('57', 'Password Reset', '56', 'key', 'Optional password reset.', { n: 'Marked "optional" in the sketch.' }),
        S('58', 'Own Portal access', '57', 'screen', 'Optional access to their own portal.', { n: 'Marked "optional" in the sketch.' }),
        S('59', 'Org. Overview', '58', 'chart', 'The organisation-level overview.'),
        S('59A', 'Direct Reportees', '59', 'chart', 'Department-wise view of direct reportees.'),
        S('59B', 'Overall Insights', '59', 'chart', 'Overall insights across the organisation.'),
        S('45', 'Viewers', 'ref-41b', 'role', 'People who get view-only access to results.'),
        S('54', 'Email Notification', '45', 'mail', 'Viewers are notified by email.'),
        S('55', 'Report-only access', '54', 'chart', 'Viewers can only access the report.')
      ]
    },
    {
      n: 8, act: 3, name: 'Who Can Do What', short: 'Roles', sketch: [5, 6],
      blurb: 'Three admin tiers — Sub Admin, Client Admin and SB Admin — each unlocking a different slice of the 52A–52E feature flows.',
      steps: [
        { id: 'hub-admin', t: 'Admin', k: 'role', hub: true, d: 'Everyone who administers a campaign or an organisation.' },
        S('46', 'Sub Admin', 'hub-admin', 'role', 'Manages assessments, report access and employees.', { gr: ['52B', '52C', '52E'] }),
        S('47', 'Client Admin', 'hub-admin', 'role', 'Full control inside their own organisation.', { gr: ['52A', '52B', '52C', '52D', '52E'] }),
        S('48', 'SB Admin', 'hub-admin', 'role', 'The Calybrate-side administrator.'),
        S('52*', 'All features', '48', 'role', 'SB Admin reaches every feature flow.', { gr: ['52A', '52B', '52C', '52D', '52E'], n: 'The asterisk is read as a wildcard (everything) — confirm with the team.' }),
        S('53', 'Create Organisations', '52*', 'action', 'Only SB Admin can create organisations.', { n: 'Sketch note: "if only an existing org, get blocked etc."' })
      ]
    },
    {
      n: 9, act: 3, name: '52A · Create Assessments', short: '52A Create', sketch: [7],
      blurb: 'Creating an assessment is the whole campaign journey you already walked — steps 24 through 41.',
      steps: [
        S('52A', 'Create Assessments', null, 'feature', 'Feature flow 52A re-uses the campaign journey: Create Campaign (24) all the way to Launch (41).', { g: ['24', '41'] })
      ]
    },
    {
      n: 10, act: 3, name: '52B · Manage Assessments', short: '52B Manage', sketch: [7],
      blurb: 'Once a campaign is running, admins keep it moving: more time, a progress filter, new people and gentle reminders.',
      steps: [
        S('52B', 'Manage Assessments', null, 'feature', 'Feature flow 52B.'),
        S('52B-1', 'Extend due date', '52B', 'action', 'Push the campaign deadline out.'),
        S('52B-2', 'Filter Progress', '52B-1', 'action', 'See who has and has not responded.'),
        S('52B-3', 'Add Employee', '52B-2', 'people', 'Add late joiners to a running campaign.'),
        S('52B-4', 'Send Reminders', '52B-3', 'mail', 'Nudge anyone who is still pending.'),
        S('52B-5', 'Export CSV', '52B-4', 'download', 'Export progress as a CSV.')
      ]
    },
    {
      n: 11, act: 3, name: '52C · Reports — Me', short: '52C Me', sketch: [12, 11],
      blurb: 'Report access starts with "Me". C-suite sees the Insight Overview; everyone else gets the employee-wise personality summary.',
      steps: [
        S('52C', 'Report access (180 / 360 / Culture)', null, 'feature', 'Feature flow 52C. Three report families: 1 Me, 2 180/360, 3 Culture.'),
        S('52C-1', 'Me', '52C', 'chart', 'Report family 1.'),
        S('52C-1.1', 'C-suite?', '52C-1', 'choice', 'Is the viewer C-suite?'),
        S('52C-1.1a', 'Insight Overview', '52C-1.1', 'chart', 'C-suite gets the Insight Overview.', { e: 'Y' }),
        S('52C-1.1b', 'Personality type summary — employee-wise', '52C-1.1', 'chart', 'Everyone else gets a personality-type summary per employee.', { e: 'N' }),
        S('52C-1.1c', 'View', '52C-1.1b', 'choice', 'Three ways to view the summary.'),
        S('52C-1.1c-1', 'Personality Profile summary', '52C-1.1c', 'chart', 'Strengths, weaknesses and so on.'),
        S('52C-1.1c-2', 'Distribution (Overall)', '52C-1.1c', 'chart', 'Overall distribution of types.'),
        S('52C-1.1c-3', 'Individual type percentage view', '52C-1.1c', 'chart', 'Percentage breakdown for one individual.')
      ]
    },
    {
      n: 12, act: 3, name: '52C · Reports — 180 / 360', short: '52C 180/360', sketch: [13, 11],
      blurb: 'For 180 and 360, non-C-suite viewers pick report filters and dive into leadership facets and impact.',
      steps: [
        REF('ref-52C', 'From Report access (52C)', 'Second report family.', ['52C']),
        S('52C-2', '180 / 360', 'ref-52C', 'chart', 'Report family 2.'),
        S('52C-2.1', 'C-suite?', '52C-2', 'choice', 'Is the viewer C-suite?'),
        S('52C-2.1a', 'Insight Overview', '52C-2.1', 'chart', 'C-suite gets the Insight Overview.', { e: 'Y' }),
        S('52C-2.1b', 'Report filters', '52C-2.1', 'action', 'Everyone else narrows the report with filters first.', { e: 'N' }),
        S('52C-2.1c', 'View', '52C-2.1b', 'choice', 'Three views of the filtered report.'),
        S('52C-2.1c-1', 'Leadership facets', '52C-2.1c', 'chart', 'Scores by leadership facet.'),
        S('52C-2.1c-2', 'Impact view', '52C-2.1c', 'chart', 'Where the biggest impact sits.'),
        S('52C-2.1c-3', 'Facet deep dive', '52C-2.1c', 'chart', 'Drill into a single facet.'),
        S('52C-2.1d', 'Download or Share', '52C-2.1c', 'download', 'Any of the views can be downloaded or shared.')
      ]
    },
    {
      n: 13, act: 3, name: '52C · Reports — Culture', short: '52C Culture', sketch: [14, 11],
      blurb: 'Culture reports filter by campaign and group, then open as an overall, multi, six-dimension or feedback view.',
      steps: [
        REF('ref-52C-b', 'From Report access (52C)', 'Third report family.', ['52C']),
        S('52C-3', 'Culture', 'ref-52C-b', 'chart', 'Report family 3.'),
        S('52C-3.1', 'Campaign filters', '52C-3', 'action', 'Choose which campaign(s) to include.'),
        S('52C-3.2', 'Group filters', '52C-3.1', 'action', 'Narrow to groups or teams.'),
        S('52C-3.3', 'View', '52C-3.2', 'choice', 'Four ways to look at culture results.'),
        S('52C-3.3a', 'Overall', '52C-3.3', 'chart', 'The overall culture view.'),
        S('52C-3.3b', 'Multi-view', '52C-3.3', 'chart', 'Compare several groups side by side.'),
        S('52C-3.3c', '6 dimensions view', '52C-3.3', 'chart', 'Results across the six culture dimensions.'),
        S('52C-3.3d', 'Feedback', '52C-3.3', 'chart', 'Open-text feedback.'),
        S('52C-3.4', 'Collective Assessments', '52C-3.3', 'chart', 'A bracket over the four views leads to collective assessments.'),
        S('52C-3.5', 'Download or Share', '52C-3.4', 'download', 'Download or share the culture report.')
      ]
    },
    {
      n: 14, act: 3, name: '52D · User Management', short: '52D Users', sketch: [8],
      blurb: 'Invite an admin by email and decide how much they may see and do.',
      steps: [
        S('52D', 'User Management', null, 'feature', 'Feature flow 52D.'),
        S('52D-1', 'Invite Admin', '52D', 'action', 'Start an admin invitation.'),
        S('52D-2', 'Enter email', '52D-1', 'mail', 'Type the invitee\'s email address.'),
        S('52D-3', 'Assign Role', '52D-2', 'choice', 'Pick the role for the new user.'),
        S('52D-3-A', 'View only', '52D-3', 'role', 'Can look but not change.'),
        S('52D-3-B', 'C-suite', '52D-3', 'role', 'Senior leader access to insight.'),
        S('52D-3-C', 'Client Admin', '52D-3', 'role', 'Full control inside the organisation.'),
        S('52D-3-D', 'Sub Admin', '52D-3', 'role', 'Manages assessments, reports and employees.')
      ]
    },
    {
      n: 15, act: 3, name: '52E · Employee Management', short: '52E Employees', sketch: [9],
      blurb: 'Add new people, see their details, deactivate them, or change who they report to — without losing history.',
      steps: [
        S('52E', 'Employee Management', null, 'feature', 'Feature flow 52E.'),
        S('52E-A1', 'Add new employee', '52E', 'people', 'Path A — add someone new.', { e: 'A' }),
        S('52E-A2', 'Add employee details', '52E-A1', 'screen', 'Fill in the employee\'s details.'),
        S('52E-B1', 'See details', '52E', 'screen', 'Path B — open an existing employee.', { e: 'B' }),
        S('52E-B1-1', 'Deactivate', '52E-B1', 'action', 'Deactivate the employee.'),
        S('52E-B1-2', 'Edit relationship', '52E-B1', 'action', 'Change who the employee reports to.'),
        S('52E-B1-2a', 'Update new Manager', '52E-B1-2', 'people', 'Keep the old manager\'s details on record.', { e: 'a' }),
        S('52E-B1-3', 'Launch Linked Campaign', '52E-B1-2a', 'flag', 'A linked campaign is launched for the new relationship.'),
        S('52E-B1-2b', 'Change to an existing Manager', '52E-B1-2', 'people', 'Send a separate campaign and keep the old data.', { e: 'b' })
      ]
    }
  ];

  // default photo rotation (degrees) so the handwriting reads upright
  const rot = { 1: 180 }; // every other photo was taken sideways and needs a 270° turn
  for (let i = 2; i <= 14; i++) rot[i] = 270;

  window.CALYBRATE = { acts, chapters, rot, imageCount: 14 };
})();
