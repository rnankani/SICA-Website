/* ═══════════════════════════════════════════════════════════
   The data layer.

   Every read and write the portal needs is declared here once, behind a
   single contract. Pages never touch storage directly — they call
   SICA_DB.applications.create(), SICA_DB.members.list() and so on.

   Two adapters sit behind that contract:

     local     — works today, no account needed. Writes to this browser
                 only, which is honest but useless for collecting real
                 applications, so the application form pairs it with an
                 email hand-off that actually reaches the club.

     supabase  — the real one. Switches on automatically the moment
                 supabase-config.js has a url and key. No page changes.

   Because the contract is identical, wiring Supabase is a config edit
   rather than a rewrite.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CFG = window.SICA_SUPABASE || {};
  var LIVE = !!(CFG.url && CFG.anonKey);

  /* ─── table contract ─────────────────────────────────────
     Mirrors schema.sql exactly. Anything the UI shows as an em dash is
     a column here that has no rows yet. */
  var TABLES = {
    profiles:     ['id', 'email', 'full_name', 'grade', 'role', 'created_at', 'last_seen'],
    officer_invites: ['id', 'email', 'full_name', 'role', 'status', 'profile_id', 'invited_by',
                      'invited_at', 'registered_at', 'decided_by', 'decided_at', 'note'],
    applications: ['id', 'created_at', 'name', 'grade', 'email', 'role_applied', 'role_other',
                   'links', 'q_built', 'q_weakness', 'q_sica', 'q_first_month',
                   'lunch_days', 'after_school', 'commitments', 'anything_else',
                   'status', 'reviewed_by', 'reviewed_at', 'review_note'],
    members:      ['id', 'profile_id', 'joined_at', 'status', 'tags', 'notes'],
    meetings:     ['id', 'number', 'topic', 'week_ref', 'date', 'room', 'status', 'notes'],
    attendance:   ['id', 'meeting_id', 'profile_id', 'present', 'is_new'],
    tasks:        ['id', 'title', 'description', 'owner_role', 'owner_id', 'due', 'priority',
                   'status', 'position', 'meeting_id', 'created_at', 'completed_at', 'completed_by'],
    announcements:['id', 'title', 'body', 'audience', 'author_id', 'publish_at', 'pinned'],
    documents:    ['id', 'title', 'category', 'url', 'owner_role', 'updated_at'],
    expenses:     ['id', 'date', 'item', 'amount', 'paid_by', 'approved_by', 'receipt_url',
                   'category', 'status'],
    settings:     ['key', 'value'],

    practice_sessions: ['id', 'week', 'skill', 'activity', 'pairs', 'ran_on', 'notes', 'meeting_id'],
    minutes:      ['id', 'meeting_id', 'date', 'author_id', 'body', 'decisions', 'action_items', 'filed_at'],
    forms:        ['id', 'title', 'purpose', 'fields', 'status', 'opened_at', 'closed_at'],
    form_responses: ['id', 'form_id', 'profile_id', 'answers', 'submitted_at'],
    budget_lines: ['id', 'category', 'allocated', 'notes', 'year'],
    campaigns:    ['id', 'name', 'target', 'raised', 'runs', 'owner_role', 'status'],
    inventory_items: ['id', 'item', 'quantity', 'location', 'held_by', 'condition', 'value'],
    social_accounts: ['platform', 'handle', 'url', 'followers'],
    social_posts: ['id', 'title', 'platform', 'body', 'scheduled_at', 'status', 'reach', 'owner_id'],
    events:       ['id', 'name', 'date', 'location', 'owner_id', 'status', 'notes'],
    event_signups:['id', 'event_id', 'profile_id', 'name', 'email', 'signed_at'],
    graphics_assets: ['id', 'title', 'kind', 'url', 'status', 'is_template', 'owner_id'],
    calendar_events: ['id', 'title', 'date', 'ends', 'kind', 'notes'],
    member_hours: ['id', 'profile_id', 'date', 'hours', 'reason'],
    curriculum_weeks: ['week', 'skill', 'activity', 'notes', 'updated_at'],
    audit_log:    ['id', 'at', 'actor_id', 'actor_email', 'action', 'subject', 'detail'],
    email_outbox: ['id', 'created_at', 'to_email', 'to_name', 'subject', 'body', 'kind', 'sent_at']
  };

  var APPLICATION_STATUS = ['submitted', 'interview', 'approved', 'rejected', 'archived'];

  /* ─── local adapter ──────────────────────────────────────
     Deliberately minimal. It exists so the UI can be built and tested
     end to end, not so the club can run on it. */
  function lsGet(t) {
    try { return JSON.parse(localStorage.getItem('sica.' + t) || '[]'); }
    catch (e) { return []; }
  }
  function lsSet(t, rows) {
    try { localStorage.setItem('sica.' + t, JSON.stringify(rows)); } catch (e) {}
    return rows;
  }
  function uid() { return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  var local = {
    mode: 'local',
    async upsert(t, row) {
      var k = KEYS(t), rows = lsGet(t), hit = false;
      rows = rows.map(function (r) { if (r[k] !== row[k]) return r; hit = true; return Object.assign({}, r, row); });
      if (!hit) rows.push(row);
      lsSet(t, rows); return row;
    },
    async list(t, opts) {
      var rows = lsGet(t);
      if (opts && opts.where) {
        Object.keys(opts.where).forEach(function (k) {
          rows = rows.filter(function (r) { return r[k] === opts.where[k]; });
        });
      }
      if (opts && opts.order) rows.sort(function (a, b) {
        return (b[opts.order] || '') > (a[opts.order] || '') ? 1 : -1;
      });
      return rows;
    },
    async get(t, id) {
      return lsGet(t).filter(function (r) { return r[KEYS(t)] === id; })[0] || null;
    },
    async insert(t, row, opts) {
      row.id = row.id || uid();
      row.created_at = row.created_at || new Date().toISOString();
      var rows = lsGet(t); rows.push(row); lsSet(t, rows);
      return (opts && opts.minimal) ? true : row;
    },
    async update(t, id, patch) {
      var rows = lsGet(t), hit = null;
      rows = rows.map(function (r) {
        if (r[KEYS(t)] !== id) return r;
        hit = Object.assign({}, r, patch); return hit;
      });
      lsSet(t, rows);
      return hit;
    },
    async remove(t, id) {
      lsSet(t, lsGet(t).filter(function (r) { return r[KEYS(t)] !== id; }));
      return true;
    },
    async count(t, where) { return (await this.list(t, { where: where })).length; }
  };

  /* ─── supabase adapter ───────────────────────────────────
     Talks to PostgREST directly, so there is no SDK to load and no build
     step. Row Level Security in schema.sql decides what each caller may
     actually see; the anon key alone grants nothing. */
  function sb(path, opts) {
    opts = opts || {};
    var token = null;
    /* `anon` is for writes any visitor is allowed to make. A stale or
       expired session token left in localStorage would otherwise be sent
       as the Authorization header and rejected with a 401 before RLS
       ever got a look at the row — which is exactly what killed the
       public application form for anyone who had ever signed in. */
    if (!opts.anon) {
      try { token = localStorage.getItem('sica.token'); } catch (e) {}
    }
    return fetch(CFG.url + '/rest/v1/' + path, {
      method: opts.method || 'GET',
      headers: {
        apikey: CFG.anonKey,
        Authorization: 'Bearer ' + (token || CFG.anonKey),
        'Content-Type': 'application/json',
        Prefer: opts.prefer || 'return=representation'
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(async function (r) {
      var text = await r.text();
      if (!r.ok) {
        var msg = text;
        try { var j = JSON.parse(text); msg = j.message || j.hint || text; } catch (e) {}
        throw new Error(msg || ('Error ' + r.status));
      }
      /* A write sent with Prefer: return=minimal answers 201 with an
         empty body. Calling .json() on that throws, which made a
         successful insert look like a failure to the caller. */
      if (!text) return null;
      try { return JSON.parse(text); } catch (e) { return null; }
    });
  }

  function rpc(fn, args) {
    var token = null;
    try { token = localStorage.getItem('sica.token'); } catch (e) {}
    return fetch(CFG.url + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: {
        apikey: CFG.anonKey,
        Authorization: 'Bearer ' + (token || CFG.anonKey),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args || {})
    }).then(async function (r) {
      var d = null;
      try { d = await r.json(); } catch (e) {}
      if (!r.ok) throw new Error((d && (d.message || d.hint)) || ('Error ' + r.status));
      return d;
    });
  }

  /* Primary key per table, for the handful that are not `id`. */
  var PK = { settings: 'key', social_accounts: 'platform', curriculum_weeks: 'week' };
  function KEYS(t) { return PK[t] || 'id'; }

  var supabase = {
    mode: 'supabase',
    async list(t, opts) {
      var q = [];
      if (opts && opts.where) Object.keys(opts.where).forEach(function (k) {
        q.push(k + '=eq.' + encodeURIComponent(opts.where[k]));
      });
      if (opts && opts.order) q.push('order=' + opts.order + '.desc');
      q.push('select=*');
      return sb(t + '?' + q.join('&'));
    },
    async get(t, id) {
      return (await sb(t + '?' + KEYS(t) + '=eq.' + encodeURIComponent(id) + '&select=*'))[0] || null;
    },
    /* `minimal` asks PostgREST not to return the created row. That
       matters for a public write: returning the row requires SELECT
       permission, and someone submitting an application deliberately
       cannot read the applications table. Asking for the row back turns
       a successful insert into a row-level-security error. */
    async insert(t, row, opts) {
      var anon = !!(opts && opts.anon);
      if (opts && opts.minimal) {
        await sb(t, { method: 'POST', body: row, prefer: 'return=minimal', anon: anon });
        return true;
      }
      return (await sb(t, { method: 'POST', body: row, anon: anon }))[0];
    },
    /* Not every table is keyed on `id`: settings is keyed on `key`,
       social_accounts on `platform`, curriculum_weeks on `week`. KEYS
       says so once, here, rather than each caller remembering. */
    async update(t, id, patch) {
      return (await sb(t + '?' + KEYS(t) + '=eq.' + encodeURIComponent(id),
                       { method: 'PATCH', body: patch }))[0];
    },
    async upsert(t, row) {
      return (await sb(t, { method: 'POST', body: row, prefer: 'resolution=merge-duplicates,return=representation' }))[0];
    },
    async remove(t, id) {
      return sb(t + '?' + KEYS(t) + '=eq.' + encodeURIComponent(id),
                { method: 'DELETE', prefer: 'return=minimal' });
    },
    async count(t, where) { return (await this.list(t, { where: where })).length; }
  };

  var A = LIVE ? supabase : local;

  /* ─── the API pages actually use ─────────────────────────
     Named for what the club does, not for what the table is called. */
  var DB = {
    live: LIVE,
    mode: A.mode,
    tables: TABLES,
    statuses: APPLICATION_STATUS,

    applications: {
      create: function (a) {
        return A.insert('applications', {
          name: a.name,
          grade: a.grade ? parseInt(a.grade, 10) : null,
          email: a.email,
          role_applied: a.role,
          role_other: a.role === 'other' ? (a.role_other || null) : null,
          links: a.links || null,
          q_built: a.q_built || null,
          q_weakness: a.q_weakness || null,
          q_sica: a.q_sica || null,
          q_first_month: a.q_first_month || null,
          lunch_days: a.lunch_days && a.lunch_days.length ? a.lunch_days : null,
          after_school: typeof a.after_school === 'boolean' ? a.after_school : null,
          commitments: a.commitments || null,
          anything_else: a.anything_else || null,
          status: 'submitted'
        }, { minimal: true, anon: true });
      },
      list: function (status) {
        return A.list('applications', { where: status ? { status: status } : null, order: 'created_at' });
      },
      get: function (id) { return A.get('applications', id); },
      /* A hard delete, on purpose. An application is somebody's honest
         account of their own weaknesses; keeping a rejected one on file
         forever is worse than losing it. There is no recycle bin, so
         every caller asks before reaching this. */
      remove: function (id) { return A.remove('applications', id); },
      setStatus: function (id, status, note) {
        return A.update('applications', id, {
          status: status, review_note: note || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (window.SICA_ROLES && window.SICA_ROLES.active()) || null
        });
      },
      counts: async function () {
        var all = await A.list('applications', {});
        var c = { total: all.length };
        APPLICATION_STATUS.forEach(function (s) {
          c[s] = all.filter(function (r) { return r.status === s; }).length;
        });
        return c;
      }
    },

    /* Invite-first access. The founder adds an email here; nobody who is
       not on this list can create an account at all. Registering is not
       the same as being let in — approve() is what grants the role. */
    invites: {
      list: function () { return A.list('officer_invites', { order: 'invited_at' }); },
      add: function (i) {
        return A.insert('officer_invites', {
          email: (i.email || '').trim().toLowerCase(),
          full_name: i.full_name || null,
          role: i.role,
          status: 'invited'
        });
      },
      remove: function (id) { return A.remove('officer_invites', id); },
      /* These go through database functions, not a direct role update, so
         a role change is always checked and stamped. */
      approve: function (id) {
        return LIVE ? rpc('approve_officer', { invite: id })
                    : A.update('officer_invites', id, { status: 'approved', decided_at: new Date().toISOString() });
      },
      deny: function (id, why) {
        return LIVE ? rpc('deny_officer', { invite: id, why: why || null })
                    : A.update('officer_invites', id, { status: 'denied', note: why || null, decided_at: new Date().toISOString() });
      },
      revoke: function (id, why) {
        return LIVE ? rpc('revoke_officer', { invite: id, why: why || null })
                    : A.update('officer_invites', id, { status: 'revoked', note: why || null, decided_at: new Date().toISOString() });
      },
      counts: async function () {
        var all = await A.list('officer_invites', {});
        var c = { total: all.length };
        ['invited','registered','approved','denied','revoked'].forEach(function (k) {
          c[k] = all.filter(function (r) { return r.status === k; }).length;
        });
        return c;
      }
    },

    members:  { list: function () { return A.list('members', { order: 'joined_at' }); },
                create: function (m) { return A.insert('members', m); },
                count: function () { return A.count('members'); } },
    /* Everyone with an account. The name lookups in render.js need the
       whole table, not a filtered slice — a filter of role=null matched
       nobody, so every 'Paid by' and 'Author' column came back blank. */
    officers: { list: function () { return A.list('profiles', {}); },
                byRole: function (r) { return A.list('profiles', { where: { role: r } }); },
                upsert: function (p) { return A.insert('profiles', p); } },
    meetings: { list: function () { return A.list('meetings', { order: 'date' }); },
                create: function (m) { return A.insert('meetings', m); },
                update: function (id, p) { return A.update('meetings', id, p); } },
    /* Ordering uses a float `position` rather than an index, so moving one
       task rewrites one row instead of renumbering the whole list. */
    tasks: {
      list: async function (status) {
        var rows = await A.list('tasks', { where: status ? { status: status } : null });
        return rows.sort(function (a, b) { return (a.position || 0) - (b.position || 0); });
      },
      create: async function (t) {
        var open = await A.list('tasks', { where: { status: 'open' } });
        var min = open.reduce(function (m, r) { return Math.min(m, r.position || 0); }, 0);
        return A.insert('tasks', {
          title: t.title,
          description: t.description || '',
          owner_role: t.owner_role || null,
          due: t.due || null,
          priority: t.priority || 'normal',
          status: 'open',
          position: min - 1000            /* newest sits at the top */
        });
      },
      update: function (id, p) { return A.update('tasks', id, p); },
      remove: function (id) { return A.remove('tasks', id); },
      complete: function (id, done) {
        return A.update('tasks', id, {
          status: done ? 'done' : 'open',
          completed_at: done ? new Date().toISOString() : null,
          completed_by: done ? ((window.SICA_ROLES && window.SICA_ROLES.active()) || null) : null
        });
      },
      /* Drop `id` between `before` and `after`, halfway between their
         positions. No other row is touched. */
      move: function (id, beforePos, afterPos) {
        var p;
        if (beforePos === null && afterPos === null) p = 0;
        else if (beforePos === null) p = afterPos - 1000;
        else if (afterPos === null) p = beforePos + 1000;
        else p = (beforePos + afterPos) / 2;
        return A.update('tasks', id, { position: p });
      },
      counts: async function () {
        var all = await A.list('tasks', {});
        var today = new Date().toISOString().slice(0, 10);
        var open = all.filter(function (t) { return t.status === 'open'; });
        return {
          open: open.length,
          done: all.filter(function (t) { return t.status === 'done'; }).length,
          overdue: open.filter(function (t) { return t.due && t.due < today; }).length,
          soon: open.filter(function (t) { return t.due && t.due >= today; }).length
        };
      }
    },
    attendance: { forMeeting: function (id) { return A.list('attendance', { where: { meeting_id: id } }); },
                mark: function (row) { return A.insert('attendance', row); } },
    announcements: { list: function () { return A.list('announcements', { order: 'publish_at' }); },
                create: function (a) { return A.insert('announcements', a); } },
    documents: { list: function () { return A.list('documents', { order: 'updated_at' }); },
                create: function (d) { return A.insert('documents', d); } },
    expenses: { list: function () { return A.list('expenses', { order: 'date' }); },
                create: function (e) { return A.insert('expenses', e); } },
    /* Keyed on the setting name, not on an id — and a setting nobody has
       written yet has no row at all, so this upserts rather than
       updating something that is not there. */
    settings: {
      all: function () { return A.list('settings', {}); },
      async map() {
        var rows = await A.list('settings', {}), out = {};
        rows.forEach(function (r) { out[r.key] = r.value; });
        return out;
      },
      get: async function (k, fallback) {
        var r = await A.get('settings', k);
        return r && r.value !== null && r.value !== undefined
          ? r.value : (fallback === undefined ? null : fallback);
      },
      set: function (k, v) { return A.upsert('settings', { key: k, value: v }); }
    },

    /* ─── the rest of the portal ───────────────────────────
       Each of these is the same few verbs over one table. They are
       written out rather than generated from a list, so a page calling
       DB.events.list() leads to a table by reading rather than by
       working out what a factory produced. */
    practice:  { list: function () { return A.list('practice_sessions', { order: 'ran_on' }); },
                 create: function (r) { return A.insert('practice_sessions', r); },
                 update: function (id, p) { return A.update('practice_sessions', id, p); },
                 remove: function (id) { return A.remove('practice_sessions', id); } },

    minutes:   { list: function () { return A.list('minutes', { order: 'date' }); },
                 create: function (r) { return A.insert('minutes', r); },
                 update: function (id, p) { return A.update('minutes', id, p); },
                 remove: function (id) { return A.remove('minutes', id); },
                 file: function (id) { return A.update('minutes', id, { filed_at: new Date().toISOString() }); } },

    forms:     { list: function () { return A.list('forms', { order: 'opened_at' }); },
                 create: function (r) { return A.insert('forms', r); },
                 update: function (id, p) { return A.update('forms', id, p); },
                 remove: function (id) { return A.remove('forms', id); },
                 responses: function (id) { return A.list('form_responses', { where: { form_id: id } }); },
                 /* A public write, the same shape as an application: the
                    person filling it in is not signed in. */
                 respond: function (id, answers) {
                   return A.insert('form_responses', { form_id: id, answers: answers },
                                   { minimal: true, anon: true });
                 } },

    budget:    { list: function () { return A.list('budget_lines', { order: 'category' }); },
                 create: function (r) { return A.insert('budget_lines', r); },
                 update: function (id, p) { return A.update('budget_lines', id, p); },
                 remove: function (id) { return A.remove('budget_lines', id); },
                 /* Spend is never stored. It is summed from the expenses
                    in the category, so a budget line and its receipts
                    cannot drift apart. */
                 async withSpend() {
                   var lines = await A.list('budget_lines', { order: 'category' });
                   var ex = await A.list('expenses', {});
                   return lines.map(function (l) {
                     var spent = ex.filter(function (e) { return e.category === l.category; })
                                   .reduce(function (t, e) { return t + Number(e.amount || 0); }, 0);
                     return Object.assign({}, l, { spent: spent, remaining: Number(l.allocated || 0) - spent });
                   });
                 } },

    campaigns: { list: function () { return A.list('campaigns', { order: 'created_at' }); },
                 create: function (r) { return A.insert('campaigns', r); },
                 update: function (id, p) { return A.update('campaigns', id, p); },
                 remove: function (id) { return A.remove('campaigns', id); } },

    inventory: { list: function () { return A.list('inventory_items', { order: 'updated_at' }); },
                 create: function (r) { return A.insert('inventory_items', r); },
                 update: function (id, p) { return A.update('inventory_items', id, p); },
                 remove: function (id) { return A.remove('inventory_items', id); } },

    social:    { accounts: function () { return A.list('social_accounts', {}); },
                 setAccount: function (r) { return A.upsert('social_accounts', r); },
                 posts: function () { return A.list('social_posts', { order: 'scheduled_at' }); },
                 create: function (r) { return A.insert('social_posts', r); },
                 update: function (id, p) { return A.update('social_posts', id, p); },
                 remove: function (id) { return A.remove('social_posts', id); } },

    events:    { list: function () { return A.list('events', { order: 'date' }); },
                 create: function (r) { return A.insert('events', r); },
                 update: function (id, p) { return A.update('events', id, p); },
                 remove: function (id) { return A.remove('events', id); },
                 signups: function (id) { return A.list('event_signups', { where: { event_id: id } }); },
                 signUp: function (id, who) {
                   return A.insert('event_signups', {
                     event_id: id, name: who.name || null, email: who.email || null
                   }, { minimal: true, anon: true });
                 } },

    graphics:  { list: function () { return A.list('graphics_assets', { order: 'updated_at' }); },
                 create: function (r) { return A.insert('graphics_assets', r); },
                 update: function (id, p) { return A.update('graphics_assets', id, p); },
                 remove: function (id) { return A.remove('graphics_assets', id); } },

    calendar:  { list: function () { return A.list('calendar_events', { order: 'date' }); },
                 create: function (r) { return A.insert('calendar_events', r); },
                 update: function (id, p) { return A.update('calendar_events', id, p); },
                 remove: function (id) { return A.remove('calendar_events', id); } },

    hours:     { list: function () { return A.list('member_hours', { order: 'date' }); },
                 log: function (r) { return A.insert('member_hours', r); },
                 remove: function (id) { return A.remove('member_hours', id); } },

    curriculum:{ overrides: function () { return A.list('curriculum_weeks', { order: 'week' }); },
                 set: function (r) { return A.upsert('curriculum_weeks', r); } },

    audit:     { list: function () { return A.list('audit_log', { order: 'at' }); } },

    /* The queue an approval email lands in. Reading it is how the
       founder checks that a message actually went out. */
    outbox:    { list: function () { return A.list('email_outbox', { order: 'created_at' }); },
                 pending: async function () {
                   return (await A.list('email_outbox', { order: 'created_at' }))
                     .filter(function (r) { return !r.sent_at; });
                 },
                 markSent: function (id) {
                   return A.update('email_outbox', id, { sent_at: new Date().toISOString() });
                 } },

    /* Pages call this to decide between a real number and an em dash. */
    async stat(fn) {
      if (!LIVE) return null;
      try { return await fn(); } catch (e) { return null; }
    }
  };

  window.SICA_DB = DB;
})();
