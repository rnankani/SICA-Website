/* ═══════════════════════════════════════════════════════════
   Every portal page, as data.

   A page is a title plus an ordered list of blocks. The renderer in
   render.js turns that into markup, so all twenty-odd pages share one
   set of components and cannot drift apart.

   NOTHING HERE INVENTS DATA. Any figure that has to come out of the
   database is written as `null`, and the renderer prints an em dash.
   Tables declare their columns and show a "waiting on the database"
   state instead of fake rows. When Supabase is connected, the only
   change is swapping `null` for a query.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var DB = 'Connect Supabase to populate this.';

  /* shorthand: a stat whose value is not known until the database exists */
  function s(k, sub) { return { k: k, v: null, s: sub || DB }; }

  var PAGES = {

    /* ══════ shared across roles ══════ */
    tasks: {
      crumb: 'Work', title: 'Tasks',
      lede: 'Everything assigned, who owns it, and what is overdue.',
      blocks: [
        { type: 'tabs', items: ['Board', 'List', 'Timeline', 'Calendar'] },
        { type: 'board', columns: ['Backlog', 'This week', 'In progress', 'Done'] },
        { type: 'note', title: 'What a task carries',
          body: 'Priority, owner, due date, progress, comments, attachments and completion history. Views switch between board, list, timeline and calendar without changing the underlying task.' }
      ]
    },

    calendar: {
      crumb: 'Time', title: 'Calendar',
      lede: 'Meetings, deadlines, events, and school dates in one place.',
      blocks: [
        { type: 'stats', items: [ s('This week'), s('This month'), s('Next deadline'), s('Meetings held') ] },
        { type: 'month' },
        { type: 'list', title: 'What appears here', rows: [
          ['Meetings', 'Pulled from the Meetings page'],
          ['Deadlines', 'Task due dates'],
          ['Events', 'Anything PR schedules'],
          ['Officer birthdays', 'From officer profiles'],
          ['School events', 'Entered manually for now'],
          ['Application deadlines', 'From the Applications page']
        ]},
        { type: 'note', title: 'Google Calendar',
          body: 'A two-way sync is planned once accounts exist, so club dates land in each officer’s own calendar rather than only here.' }
      ]
    },

    /* ══════ founder ══════ */
    'officer-management': {
      crumb: 'People', title: 'Officer Management',
      lede: 'Every seat, who holds it, and what they owe this week.',
      blocks: [
        { type: 'stats', items: [
          { k: 'Seats filled', v: '1 / 6', s: 'Founder & President held by Reyansh' },
          s('Avg completion'), s('Hours this month'), s('Overdue tasks') ] },
        { type: 'officers' },
        { type: 'note', title: 'Card actions',
          body: 'Replace officer, suspend, promote and message all write to the officer record and the audit log. They are disabled until accounts exist.' }
      ]
    },

    members: {
      crumb: 'People', title: 'Members',
      lede: 'The student database. Searchable, filterable, exportable.',
      blocks: [
        { type: 'stats', items: [ s('Total members'), s('Active this month'), s('New this month'), s('Avg attendance') ] },
        { type: 'search', placeholder: 'Search members by name, grade or tag…' },
        { type: 'table', cols: ['Name', 'Grade', 'Member since', 'Attendance', 'Hours', 'Status', 'Tags'],
          empty: 'No members yet', emptyBody: 'The club has not been approved, so nobody has signed up. Members appear here the moment registration opens.' }
      ]
    },

    announcements: {
      crumb: 'Comms', title: 'Announcements',
      lede: 'Internal posts to everyone, to officers, or to one role.',
      blocks: [
        { type: 'stats', items: [ s('Published'), s('Scheduled'), s('Pinned'), s('Unread') ] },
        { type: 'composer' },
        { type: 'table', cols: ['Title', 'Audience', 'Author', 'Published', 'Reactions'],
          empty: 'Nothing posted yet', emptyBody: 'Write the first announcement above. Posts can be pinned, scheduled, and targeted at everyone, officers only, or a single role.' }
      ]
    },

    applications: {
      crumb: 'Intake', title: 'Applications',
      lede: 'Officer and student applications, and the queue for reviewing them.',
      blocks: [
        { type: 'stats', items: [
          s('Awaiting review'), s('Interviews requested'), s('Approved'), s('Rejected'), s('Archived') ] },
        { type: 'tabs', items: ['Officer applications', 'Student applications', 'Archive'] },
        { type: 'table', cols: ['Applicant', 'Grade', 'Role applied for', 'Submitted', 'Status'],
          empty: 'No applications yet',
          emptyBody: 'The application form is not live. Once it is wired up, every submission lands here with the reviewer actions below.',
          actions: ['Approve', 'Reject', 'Request interview', 'Archive'] },
        { type: 'list', title: 'Open roles', rows: [
          ['Vice President', 'Open — fill first'],
          ['Secretary', 'Open'],
          ['Treasurer', 'Open'],
          ['Public Relations', 'Open'],
          ['President', 'Held by Reyansh until a successor is elected'],
          ['Founder', 'Permanent'] ]},
        { type: 'stats', title: 'Application analytics', items: [
          s('Applications received'), s('Conversion to interview'), s('Accept rate'), s('Median time to decide') ] }
      ]
    },

    analytics: {
      crumb: 'Founder only', title: 'Analytics',
      lede: 'Trends across the club. Every series is empty until there is history to draw.',
      blocks: [
        { type: 'stats', items: [ s('Return rate'), s('Member growth'), s('Task completion'), s('Meeting completion') ] },
        { type: 'charts', items: [
          ['Attendance trend', 'Members present per meeting'],
          ['Member growth', 'Cumulative signups'],
          ['Officer workload', 'Tasks per officer per week'],
          ['Meeting completion', 'Planned vs. run'],
          ['Recruitment funnel', 'Interest → applied → attended → returned'],
          ['Engagement', 'Weekly challenge completion'] ]},
        { type: 'note', title: 'The number that matters',
          body: 'Return rate, not attendance. Of the people who came last week, how many came back? A club growing at 60% return is failing louder than one holding steady at 85%. Handbook §10.' }
      ]
    },

    settings: {
      crumb: 'Admin', title: 'Settings',
      lede: 'Club details, the advisor, and how the workspace behaves.',
      blocks: [
        { type: 'fields', title: 'Club', rows: [
          ['Club name', 'Student Influence & Communication Association'],
          ['School', 'Cupertino High School'],
          ['Club email', 'thesicaorg@gmail.com'],
          ['Founded', '2026'],
          ['Faculty advisor', null],
          ['Meeting room', null],
          ['Meeting time', null] ]},
        { type: 'toggles', title: 'Workspace', items: [
          ['Email notifications', false], ['Weekly digest', false],
          ['Show officer hours publicly', false], ['Allow officers to edit curriculum', true] ]}
      ]
    },

    'founder-tools': {
      crumb: 'Founder only', title: 'Founder Tools',
      lede: 'The control surface. Nothing here is visible to any other role.',
      blocks: [
        { type: 'toggles', title: 'Authentication', items: [
          ['Enable login', false], ['Require Cupertino email', true], ['Require student ID', false],
          ['Enable officer accounts', false], ['Enable student accounts', false],
          ['Allow guest mode', true], ['Maintenance mode', false] ]},
        { type: 'toggles', title: 'Feature toggles', items: [
          ['Applications', true], ['Officer portal', true], ['Student portal', false],
          ['Announcements', true], ['Library', true], ['Calendar', true], ['Tasks', true],
          ['Attendance', false], ['Hours tracking', false], ['Analytics', true],
          ['Recruitment', true], ['Curriculum', true], ['Notifications', false], ['Messaging', false] ]},
        { type: 'toggles', title: 'Recruitment', items: [
          ['Officer applications open', true], ['Member registration open', false],
          ['Recruitment banner on homepage', false] ]},
        { type: 'roles' },
        { type: 'fields', title: 'Homepage controls', rows: [
          ['Hero message', 'From first impressions to difficult conversations. Practice the skills that shape how you work with people.'],
          ['Primary CTA', 'Officer applications open'],
          ['Banner', 'Off'],
          ['Featured announcement', null],
          ['Countdown', 'Off'] ]},
        { type: 'fields', title: 'Branding', rows: [
          ['Accent', '#C9A34F'], ['Display face', 'Bodoni Moda — wordmarks only'],
          ['Interface face', 'Inter'], ['Logo', 'Wordmark, no symbol'],
          ['Homepage image', null] ]},
        { type: 'status' },
        { type: 'danger', items: [
          ['View active sessions', 'See every signed-in device'],
          ['Sign everyone out', 'Ends all sessions immediately'],
          ['Reset permissions', 'Returns every role to defaults'],
          ['Export database', 'Full JSON export'],
          ['Audit log', 'Every privileged action, with who and when'],
          ['Backup now', 'Snapshot to storage'],
          ['Reset application', 'Destroys all club data. Cannot be undone.'] ]}
      ]
    },

    /* ══════ vice president ══════ */
    practice: {
      crumb: 'The room', title: 'Practice Sessions',
      lede: 'The activity for each week, and how it ran.',
      blocks: [
        { type: 'stats', items: [ s('Sessions run'), s('Avg pairs'), s('Members practised'), s('Skipped') ] },
        { type: 'table', cols: ['Week', 'Skill', 'Activity', 'Pairs', 'Ran on', 'Notes'],
          empty: 'No sessions run yet', emptyBody: 'Each week’s paired activity is logged here after the meeting, with what worked and what to change.' },
        { type: 'note', title: 'The rule that does not scale away',
          body: 'Everyone practises at the same time, in pairs. Never pairs performing in front of the room. Handbook §5.' }
      ]
    },

    /* ══════ secretary ══════ */
    minutes: {
      crumb: 'The record', title: 'Meeting Minutes',
      lede: 'What happened, decided within 48 hours of each meeting.',
      blocks: [
        { type: 'stats', items: [ s('Minutes filed'), s('Awaiting write-up'), s('Decisions logged'), s('Action items open') ] },
        { type: 'table', cols: ['Meeting', 'Date', 'Author', 'Decisions', 'Action items', 'Filed'],
          empty: 'No minutes yet', emptyBody: 'Minutes are written within 48 hours of each meeting and become the club’s record. Handbook §7: if a decision only exists in a group chat, it did not happen.' }
      ]
    },

    attendance: {
      crumb: 'The record', title: 'Attendance',
      lede: 'Who came, and — more importantly — who came back.',
      blocks: [
        { type: 'stats', items: [ s('Last meeting'), s('Average'), s('Return rate'), s('Unique members') ] },
        { type: 'table', cols: ['Meeting', 'Date', 'Present', 'New', 'Returning', 'Return rate'],
          empty: 'Nothing recorded yet', emptyBody: 'Attendance is taken at the welcome block each week. Return rate is the number worth watching.' }
      ]
    },

    forms: {
      crumb: 'The record', title: 'Forms',
      lede: 'Sign-ups, permission slips and anything collected from members.',
      blocks: [
        { type: 'stats', items: [ s('Active forms'), s('Responses'), s('Awaiting'), s('Closed') ] },
        { type: 'table', cols: ['Form', 'Purpose', 'Responses', 'Opened', 'Status'],
          empty: 'No forms yet', emptyBody: 'Create a form for sign-ups, feedback, or permissions. Responses are stored against the member record.' }
      ]
    },

    /* ══════ treasurer ══════ */
    budget: {
      crumb: 'The money', title: 'Budget',
      lede: 'What the club has, what is committed, and what is left.',
      blocks: [
        { type: 'stats', items: [ s('Balance'), s('Allocated'), s('Spent'), s('Remaining') ] },
        { type: 'table', cols: ['Category', 'Allocated', 'Spent', 'Remaining', 'Notes'],
          empty: 'No budget set', emptyBody: 'Set a budget once ASB confirms the club’s allocation for the year.' }
      ]
    },

    expenses: {
      crumb: 'The money', title: 'Expenses',
      lede: 'Every purchase, who approved it, and the receipt.',
      blocks: [
        { type: 'stats', items: [ s('This month'), s('Awaiting approval'), s('Reimbursed'), s('Receipts missing') ] },
        { type: 'table', cols: ['Date', 'Item', 'Amount', 'Paid by', 'Approved by', 'Receipt'],
          empty: 'No expenses logged', emptyBody: 'Log every purchase with a receipt. Anything above the approval threshold needs the President as well as the Treasurer.' }
      ]
    },

    fundraising: {
      crumb: 'The money', title: 'Fundraising',
      lede: 'Campaigns, targets, and what has actually come in.',
      blocks: [
        { type: 'stats', items: [ s('Raised'), s('Target'), s('Active campaigns'), s('Donors') ] },
        { type: 'table', cols: ['Campaign', 'Target', 'Raised', 'Runs', 'Owner', 'Status'],
          empty: 'No campaigns yet', emptyBody: 'A club this size rarely needs fundraising in year one. Add a campaign only when there is something specific to buy.' }
      ]
    },

    inventory: {
      crumb: 'The money', title: 'Inventory',
      lede: 'Physical things the club owns and where they are.',
      blocks: [
        { type: 'stats', items: [ s('Items'), s('Checked out'), s('Missing'), s('Value') ] },
        { type: 'table', cols: ['Item', 'Quantity', 'Location', 'Held by', 'Condition'],
          empty: 'Nothing tracked yet', emptyBody: 'Timers, notecards, the camera, printed materials — anything that has to come back after a meeting.' }
      ]
    },

    /* ══════ public relations ══════ */
    social: {
      crumb: 'Outward', title: 'Social Media',
      lede: 'Accounts, posts, and how they performed.',
      blocks: [
        { type: 'stats', items: [ s('Followers'), s('Posts this month'), s('Scheduled'), s('Best performing') ] },
        { type: 'fields', title: 'Accounts', rows: [
          ['Instagram', null], ['Club email', 'thesicaorg@gmail.com'], ['Website', 'This site'] ]},
        { type: 'table', cols: ['Post', 'Platform', 'Scheduled', 'Status', 'Reach'],
          empty: 'No posts yet', emptyBody: 'The Instagram account is created after club approval. Until then this stays empty on purpose.' }
      ]
    },

    content: {
      crumb: 'Outward', title: 'Content Calendar',
      lede: 'What goes out, when, and who is making it.',
      blocks: [
        { type: 'stats', items: [ s('Planned'), s('In progress'), s('Published'), s('Overdue') ] },
        { type: 'month' },
        { type: 'note', title: 'One message a week',
          body: 'Handbook §7 caps member announcements at one per week. More than that and people stop reading all of them.' }
      ]
    },

    events: {
      crumb: 'Outward', title: 'Events',
      lede: 'Club fair, showcases, and anything outside a normal meeting.',
      blocks: [
        { type: 'stats', items: [ s('Upcoming'), s('This semester'), s('Attendance'), s('Signups') ] },
        { type: 'table', cols: ['Event', 'Date', 'Location', 'Owner', 'Signups', 'Status'],
          empty: 'No events yet', emptyBody: 'The club fair is usually the first one. Add it once the date is published by ASB.' }
      ]
    },

    graphics: {
      crumb: 'Outward', title: 'Graphics',
      lede: 'Flyers, slides and posts, all on the brand.',
      blocks: [
        { type: 'stats', items: [ s('Assets'), s('Awaiting approval'), s('Published'), s('Templates') ] },
        { type: 'cards', title: 'Templates', items: [
          ['Instagram post', 'Square, gold on ink'],
          ['Instagram story', 'Vertical'],
          ['Flyer', 'Half page, printable'],
          ['Slide deck', 'Meeting template'],
          ['Recruitment poster', 'Club fair'] ]},
        { type: 'note', title: 'Before publishing',
          body: 'Everything public follows the rules in Branding, and the President has final say on anything published. Handbook §7.' }
      ]
    }
  };

  window.SICA_PAGES = PAGES;
})();
