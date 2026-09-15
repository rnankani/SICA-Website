/* ═══════════════════════════════════════════════════════════
   SICA roles — one definition, six sidebars.

   Everything role-shaped lives here so adding a role, renaming one, or
   moving a page between roles is an edit in one file rather than a
   change across every page. The shell reads this; no page hardcodes a
   sidebar.

   `active` is a local override used for Founder impersonation. Once
   Supabase auth is wired, the real role comes from the signed-in
   profile and this becomes the impersonation layer only.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var I = {
    grid:    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    users:   '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-2.2-4.4"/>',
    user:    '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    cal:     '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    check:   '<path d="M9 11.5 11.5 14 16 8.5"/><rect x="3" y="4" width="18" height="17" rx="2.5"/>',
    mega:    '<path d="M4 10v4a1 1 0 0 0 1 1h3l5 4V5L9 9H5a1 1 0 0 0-1 1Z"/><path d="M17 9.5a4 4 0 0 1 0 5"/>',
    inbox:   '<path d="M3 13h4l2 3h6l2-3h4"/><path d="M4.5 5h15l1.5 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Z"/>',
    book:    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    chart:   '<path d="M4 13h4v7H4zM10 4h4v16h-4zM16 9h4v11h-4z"/>',
    gear:    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
    slider:  '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
    build:   '<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M10 21v-6h4v6"/>',
    money:   '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10M9.5 9.5h5M9.5 14.5h5"/>',
    box:     '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
    cam:     '<rect x="3" y="7" width="18" height="13" rx="2.5"/><circle cx="12" cy="13.5" r="3.5"/><path d="M9 7l1.5-3h3L15 7"/>',
    spark:   '<path d="m12 3 2.2 6.3L21 11l-6.8 1.7L12 19l-2.2-6.3L3 11l6.8-1.7Z"/>',
    doc:     '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
    clip:    '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 3.5h6v2H9z"/><path d="M9 10h6M9 14h4"/>'
  };

  function p(id, label, href, icon, cnt) {
    return { id: id, label: label, href: href, icon: icon, cnt: cnt };
  }

  /* Shared pages. Referenced rather than duplicated, so "Library" is one
     thing that several roles happen to see. */
  var LIB  = p('library',   'Library',   'library.html',   I.book);
  var REF  = p('references','References','references.html',I.doc);
  var TASK = p('tasks',     'Tasks',     'tasks.html',     I.check);
  var CAL  = p('calendar',  'Calendar',  'calendar.html',  I.cal);
  var HB   = p('handbook',  'Handbook',  'handbook.html',  I.clip, '10');

  var ROLES = {
    /* Reyansh holds Founder and President at once for now. They stay two
       roles because in about two years a different student is elected
       President while the Founder keeps oversight — merging them into one
       role today would mean unpicking it exactly when it matters. */
    founder: {
      id: 'founder', label: 'Founder', short: 'FO', color: '#C9A34F',
      person: 'Reyansh Nankani', supreme: true, alsoHolds: 'president',
      note: 'Supreme admin. Every permission, and currently holds President as well.',
      nav: [
        { group: 'Overview', items: [
          p('dashboard', 'Dashboard', 'officers.html', I.grid),
          p('analytics', 'Analytics', 'analytics.html', I.chart)
        ]},
        { group: 'Run the club', items: [
          p('officers',  'Officer Management', 'officer-management.html', I.users, '5'),
          p('members',   'Members',       'members.html',   I.user),
          p('meetings',  'Meetings',      'meetings.html',  I.cal, '4'),
          TASK, p('announcements', 'Announcements', 'announcements.html', I.mega),
          p('applications', 'Applications', 'applications.html', I.inbox, (function(){
            try {
              var c = localStorage.getItem('sica.badge.applications');
              if (c !== null && parseInt(c, 10) > 0) return c;
            } catch(e){}
            return null;
          })())
        ]},
        { group: 'Resources', items: [LIB, REF, HB, CAL] },
        { group: 'Control', items: [
          p('founder-tools', 'Founder Tools', 'founder-tools.html', I.slider),
          p('settings', 'Settings', 'settings.html', I.gear)
        ]}
      ]
    },

    president: {
      id: 'president', label: 'President', short: 'PR', color: '#C9A34F',
      person: 'Reyansh Nankani', heldByFounder: true,
      note: 'Held by the Founder until a successor is elected.',
      nav: [
        { group: 'Overview', items: [ p('dashboard', 'Dashboard', 'officers.html', I.grid) ]},
        { group: 'Run the club', items: [
          p('team', 'Officer Team', 'team.html', I.users, '5'),
          p('meetings', 'Meetings', 'meetings.html', I.cal, '4'),
          TASK,
          p('announcements', 'Announcements', 'announcements.html', I.mega),
          p('members', 'Members', 'members.html', I.user)
        ]},
        { group: 'Resources', items: [LIB, REF, HB, CAL] }
      ]
    },

    vp: {
      id: 'vp', label: 'Vice President', short: 'VP', color: '#7E93B8',
      person: 'Unfilled',
      nav: [
        { group: 'Overview', items: [ p('dashboard', 'Dashboard', 'officers.html', I.grid) ]},
        { group: 'The room', items: [
          p('meeting-builder', 'Meeting Builder', 'meetings.html', I.build),
          p('curriculum', 'Curriculum', 'curriculum.html', I.book, '30'),
          p('practice', 'Practice Sessions', 'practice.html', I.spark),
          TASK
        ]},
        { group: 'Resources', items: [LIB, REF, HB, CAL] }
      ]
    },

    secretary: {
      id: 'secretary', label: 'Secretary', short: 'SC', color: '#7FA88A',
      person: 'Unfilled',
      nav: [
        { group: 'Overview', items: [ p('dashboard', 'Dashboard', 'officers.html', I.grid) ]},
        { group: 'The record', items: [
          p('minutes', 'Meeting Minutes', 'minutes.html', I.doc),
          p('attendance', 'Attendance', 'attendance.html', I.check),
          p('forms', 'Forms', 'forms.html', I.clip),
          TASK
        ]},
        { group: 'Resources', items: [LIB, REF, HB, CAL] }
      ]
    },

    treasurer: {
      id: 'treasurer', label: 'Treasurer', short: 'TR', color: '#7FA88A',
      person: 'Unfilled',
      nav: [
        { group: 'Overview', items: [ p('dashboard', 'Dashboard', 'officers.html', I.grid) ]},
        { group: 'The money', items: [
          p('budget', 'Budget', 'budget.html', I.money),
          p('expenses', 'Expenses', 'expenses.html', I.doc),
          p('fundraising', 'Fundraising', 'fundraising.html', I.spark),
          p('inventory', 'Inventory', 'inventory.html', I.box),
          TASK
        ]},
        { group: 'Resources', items: [LIB, REF, HB, CAL] }
      ]
    },

    pr: {
      id: 'pr', label: 'Public Relations', short: 'PB', color: '#C2685A',
      person: 'Unfilled',
      nav: [
        { group: 'Overview', items: [ p('dashboard', 'Dashboard', 'officers.html', I.grid) ]},
        { group: 'Outward', items: [
          p('social', 'Social Media', 'social.html', I.mega),
          p('content', 'Content Calendar', 'content.html', I.cal),
          p('events', 'Events', 'events.html', I.spark),
          p('graphics', 'Graphics', 'graphics.html', I.cam),
          TASK
        ]},
        { group: 'Resources', items: [LIB, REF, HB, CAL] }
      ]
    }
  };

  var ORDER = ['founder', 'president', 'vp', 'secretary', 'treasurer', 'pr'];

  /* The authenticated profile is the source of truth. Local mode keeps
     Founder as the development fallback. */
  function signedInRole() {
    try {
      var p = JSON.parse(localStorage.getItem('sica.profile') || 'null');
      if (p && ROLES[p.role]) return p.role;
    } catch (e) {}
    return 'founder';
  }

  /* Does the signed-in person hold this role outright, rather than only
     being able to look at it? Founder holds President today, so switching
     between those two is not really impersonation. */
  function holds(id) {
    var me = ROLES[signedInRole()];
    return id === me.id || me.alsoHolds === id;
  }

  function activeRole() {
    var r = null;
    try { r = localStorage.getItem('sica-role'); } catch (e) {}
    return signedInRole() === 'founder' && ROLES[r] ? r : signedInRole();
  }

  function setRole(id) {
    if (!ROLES[id]) return false;
    try { localStorage.setItem('sica-role', id); } catch (e) {}
    return true;
  }

  var PERMISSIONS = {
    founder:   ['tasks.view_team','tasks.create','tasks.assign','tasks.edit_any','tasks.archive','settings.manage'],
    president: ['tasks.view_team','tasks.create','tasks.assign','tasks.edit_any','tasks.archive'],
    vp:        ['tasks.create','tasks.edit_own'],
    secretary: ['tasks.create','tasks.edit_own'],
    treasurer: ['tasks.create','tasks.edit_own'],
    pr:        ['tasks.create','tasks.edit_own']
  };

  window.SICA_ROLES = {
    all: ROLES,
    order: ORDER,
    icons: I,
    signedInRole: signedInRole,
    active: activeRole,
    set: setRole,
    get: function (id) { return ROLES[id || activeRole()]; },
    holds: holds,
    permissions: PERMISSIONS,
    can: function (permission) {
      return (PERMISSIONS[activeRole()] || []).indexOf(permission) >= 0;
    },
    isImpersonating: function () { return !holds(activeRole()); }
  };
})();
