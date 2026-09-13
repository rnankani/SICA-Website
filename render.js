/* ═══════════════════════════════════════════════════════════
   Block renderer.

   Turns a page definition from pages.js into markup. One component set
   across every page, so twenty-odd screens stay consistent and a change
   to (say) how an empty table looks happens once.

   The em dash is load-bearing: any value the database owns renders as
   "—" rather than a number someone might believe.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var DASH = '&mdash;';
  function val(v) { return (v === null || v === undefined) ? '<span class="na">' + DASH + '</span>' : v; }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  var B = {

    stats: function (b) {
      var h = b.title ? '<h2 class="sec-h">' + b.title + '</h2>' : '';
      return h + '<div class="mc-grid">' + b.items.map(function (i) {
        return '<div class="stat"><span class="stat-k">' + i.k + '</span>' +
               '<span class="stat-v">' + val(i.v) + '</span>' +
               '<span class="stat-s">' + (i.s || '') + '</span></div>';
      }).join('') + '</div>';
    },

    tabs: function (b) {
      return '<div class="ptabs">' + b.items.map(function (t, i) {
        return '<button class="ptab' + (i === 0 ? ' on' : '') + '">' + t + '</button>';
      }).join('') + '</div>';
    },

    search: function (b) {
      return '<div class="psearch"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/>' +
             '<path d="m15.5 15.5 4.5 4.5"/></svg>' +
             '<input placeholder="' + b.placeholder + '" disabled></div>';
    },

    table: function (b) {
      var acts = b.actions ? '<div class="tbl-acts">' + b.actions.map(function (a) {
        return '<button disabled>' + a + '</button>';
      }).join('') + '</div>' : '';
      return '<div class="panel"><div class="tblwrap"><table class="tbl"><thead><tr>' +
        b.cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') +
        '</tr></thead></table></div>' +
        '<div class="tbl-empty"><b>' + b.empty + '</b><p>' + b.emptyBody + '</p>' + acts + '</div></div>';
    },

    board: function (b) {
      return '<div class="board">' + b.columns.map(function (c) {
        return '<div class="bcol"><div class="bcol-h">' + c + '<span class="na">' + DASH + '</span></div>' +
               '<div class="bcol-e">Nothing here yet</div></div>';
      }).join('') + '</div>';
    },

    list: function (b) {
      return '<h2 class="sec-h">' + b.title + '</h2><div class="panel"><div class="rows">' +
        b.rows.map(function (r) {
          return '<div class="row2"><b>' + r[0] + '</b><span>' + r[1] + '</span></div>';
        }).join('') + '</div></div>';
    },

    fields: function (b) {
      return '<h2 class="sec-h">' + b.title + '</h2><div class="panel"><div class="rows">' +
        b.rows.map(function (r) {
          return '<div class="row2"><b>' + r[0] + '</b><span>' + val(r[1]) + '</span></div>';
        }).join('') + '</div></div>';
    },

    toggles: function (b) {
      return '<h2 class="sec-h">' + b.title + '</h2><div class="panel"><div class="rows">' +
        b.items.map(function (t) {
          return '<label class="row2 tgl"><b>' + t[0] + '</b>' +
                 '<input type="checkbox"' + (t[1] ? ' checked' : '') + '>' +
                 '<span class="sw" aria-hidden="true"></span></label>';
        }).join('') + '</div></div>' +
        '<p class="hint">Settings and feature preferences. Toggles animate smoothly and save locally until the database connection is live.</p>';
    },

    officers: function () {
      var R = window.SICA_ROLES;
      return '<div class="ocards">' + R.order.map(function (id) {
        var r = R.all[id];
        var filled = r.person !== 'Unfilled';
        return '<div class="ocard' + (filled ? '' : ' vacant') + '">' +
          '<div class="ocard-h"><span class="mini" style="background:linear-gradient(145deg,' + r.color + ',#6E5626)">' + r.short + '</span>' +
          '<div><b>' + r.person + '</b><small>' + r.label + '</small></div>' +
          (filled ? '<span class="pill p-ok">Active</span>' : '<span class="pill p-idle">Vacant</span>') + '</div>' +
          '<dl class="ocard-d">' +
            '<div><dt>Hours</dt><dd>' + val(null) + '</dd></div>' +
            '<div><dt>Completion</dt><dd>' + val(null) + '</dd></div>' +
            '<div><dt>Tasks</dt><dd>' + val(null) + '</dd></div>' +
            '<div><dt>Attendance</dt><dd>' + val(null) + '</dd></div>' +
            '<div><dt>Last login</dt><dd>' + val(null) + '</dd></div>' +
          '</dl>' +
          '<div class="ocard-a"><button disabled>Message</button><button disabled>Promote</button>' +
          '<button disabled>Suspend</button><button disabled>Replace</button></div></div>';
      }).join('') + '</div>';
    },

    roles: function () {
      var R = window.SICA_ROLES;
      return '<h2 class="sec-h">Roles &amp; permissions</h2><div class="panel"><div class="rows">' +
        R.order.map(function (id) {
          var r = R.all[id];
          return '<div class="row2"><b><span class="rdot" style="background:' + r.color + '"></span>' + r.label + '</b>' +
                 '<span>' + r.nav.reduce(function (n, g) { return n + g.items.length; }, 0) + ' pages &middot; ' +
                 (r.supreme ? 'every permission' : 'own role only') + '</span></div>';
        }).join('') + '</div></div>' +
        '<p class="hint">Create, rename and delete roles, plus the permissions editor, land with the database.</p>';
    },

    charts: function (b) {
      return '<div class="charts">' + b.items.map(function (c) {
        return '<div class="chart"><div class="chart-h"><b>' + c[0] + '</b><span>' + c[1] + '</span></div>' +
               '<div class="chart-e"><span class="na">' + DASH + '</span><small>No data yet</small></div></div>';
      }).join('') + '</div>';
    },

    cards: function (b) {
      return '<h2 class="sec-h">' + b.title + '</h2><div class="gcards">' + b.items.map(function (c) {
        return '<div class="gcard"><b>' + c[0] + '</b><span>' + c[1] + '</span></div>';
      }).join('') + '</div>';
    },

    month: function () {
      var d = new Date(), y = d.getFullYear(), m = d.getMonth();
      var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
      var cells = '';
      ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(function (n) { cells += '<span class="cal-n">' + n + '</span>'; });
      for (var i = 0; i < first; i++) cells += '<span class="cal-d out"></span>';
      for (var day = 1; day <= days; day++) {
        var today = day === d.getDate();
        cells += '<span class="cal-d' + (today ? ' today' : '') + '">' + day + '</span>';
      }
      return '<div class="panel cal"><div class="panel-h"><b>' +
        d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) +
        '</b><span>Nothing scheduled</span></div><div class="cal-g">' + cells + '</div></div>';
    },

    status: function () {
      var rows = [
        ['Supabase', 'Not connected', 'warn'],
        ['Authentication', 'Not enabled', 'warn'],
        ['Storage', 'Not configured', 'warn'],
        ['Database health', null, 'idle'],
        ['Latest backup', null, 'idle'],
        ['Site', 'Live on GitHub Pages', 'ok']
      ];
      return '<h2 class="sec-h">System status</h2><div class="panel"><div class="rows">' +
        rows.map(function (r) {
          return '<div class="row2"><b>' + r[0] + '</b><span class="st-' + r[2] + '">' +
                 '<i class="dot-h"></i>' + val(r[1]) + '</span></div>';
        }).join('') + '</div></div>';
    },

    danger: function (b) {
      return '<h2 class="sec-h">Security &amp; danger zone</h2><div class="panel danger"><div class="rows">' +
        b.items.map(function (r, i) {
          var last = i === b.items.length - 1;
          return '<div class="row2"><b>' + r[0] + '</b><span>' + r[1] + '</span>' +
                 '<button class="dbtn' + (last ? ' hot' : '') + '" disabled>Run</button></div>';
        }).join('') + '</div></div>';
    },

    note: function (b) {
      return '<div class="pnote"><b>' + b.title + '</b><p>' + b.body + '</p></div>';
    },

    composer: function () {
      return '<div class="panel composer"><div class="panel-h"><b>New announcement</b>' +
        '<span>Everyone &middot; Officers &middot; One role</span></div>' +
        '<div class="comp-b"><input placeholder="Title" disabled>' +
        '<textarea placeholder="Write the announcement…" disabled rows="3"></textarea>' +
        '<div class="comp-a"><button disabled>Publish</button><button disabled>Schedule</button>' +
        '<button disabled>Pin</button><button disabled>Attach</button></div></div></div>';
    }
  };

  window.sicaRenderPage = function (key) {
    var page = window.SICA_PAGES[key];
    var main = document.querySelector('main');
    if (!page || !main) return;

    var h = '<div class="topbar"><div>' +
      '<div class="crumb">' + page.crumb + '</div>' +
      '<h1 class="ptitle">' + page.title + '</h1>' +
      '<p class="lede">' + page.lede + '</p></div></div>';

    page.blocks.forEach(function (b) {
      if (B[b.type]) h += B[b.type](b);
    });

    h += '<p class="dbfoot">Values shown as <span class="na">&mdash;</span> come from the database. ' +
         'They stay blank until Supabase is connected rather than being filled with sample numbers.</p>';

    main.innerHTML = h;
    document.title = 'SICA — ' + page.title;

    // Restore locally saved toggle states for this page
    var tgls = main.querySelectorAll('.tgl input[type="checkbox"]');
    if (tgls.length) {
      tgls.forEach(function (inp, idx) {
        var sk = 'sica_tgl_' + key + '_' + idx;
        try {
          var saved = localStorage.getItem(sk);
          if (saved !== null) inp.checked = saved === '1';
        } catch(e) {}
        inp.addEventListener('change', function () {
          try { localStorage.setItem(sk, inp.checked ? '1' : '0'); } catch(e) {}
        });
      });
    }

    /* Every em dash above is a value the database owns. With Supabase
       connected this fills them in; without it they stay dashes, which
       is the honest state rather than a placeholder number. */
    if (window.SICA_DB) hydrate(key, main);
  };

  /* ─── hydration ──────────────────────────────────────────
     One place that knows how each page's live values are fetched. Until
     SICA_DB.live is true every one of these resolves to null and the
     dashes stay put. */
  /* ─── small shared formatters ────────────────────────────
     A feed returns `stats` in the order the page declares them and
     `cells` as one array per row, in the order the page declares its
     columns. Anything a feed leaves as null stays an em dash, so a
     figure the club has not measured yet is never invented. */
  function d(v) {
    if (!v) return null;
    var t = new Date(v);
    return isNaN(t) ? v : t.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function money(v) {
    return v === null || v === undefined || v === '' ? null
      : '$' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function pct(n, of) { return of ? Math.round((n / of) * 100) + '%' : null; }
  function titleCase(v) {
    return !v ? null : String(v).replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); });
  }
  function thisMonth(v) {
    if (!v) return false;
    var t = new Date(v), n = new Date();
    return t.getMonth() === n.getMonth() && t.getFullYear() === n.getFullYear();
  }
  function nameOf(people, id) {
    var hit = people.filter(function (x) { return x.id === id; })[0];
    return hit ? (hit.full_name || hit.email) : null;
  }

  var FEEDS = {
    applications: async function (DB) {
      var c = await DB.applications.counts();
      return { stats: [c.submitted, c.interview, c.approved, c.rejected, c.archived],
               rows: await DB.applications.list() };
    },

    members: async function (DB) {
      var rows = await DB.members.list();
      return {
        stats: [rows.length,
                rows.filter(function (r) { return r.status === 'active'; }).length,
                rows.filter(function (r) { return thisMonth(r.joined_at); }).length,
                null],
        cells: rows.map(function (r) {
          return [r.name || r.profile_id, r.grade, d(r.joined_at), null, null,
                  titleCase(r.status), (r.tags || []).join(', ')];
        })
      };
    },

    tasks: async function (DB) {
      var c = await DB.tasks.counts();
      return { stats: [c.open, c.soon, c.overdue, c.done] };
    },

    calendar: async function (DB) {
      var rows = await DB.calendar.list();
      var today = new Date().toISOString().slice(0, 10);
      var ahead = rows.filter(function (r) { return r.date >= today; });
      var week = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
      var meetings = await DB.meetings.list();
      return { stats: [ahead.filter(function (r) { return r.date <= week; }).length,
                       ahead.filter(function (r) { return thisMonth(r.date); }).length,
                       ahead.length ? d(ahead[0].date) : null,
                       meetings.filter(function (m) { return m.status === 'held'; }).length] };
    },

    announcements: async function (DB) {
      var rows = await DB.announcements.list();
      var people = await DB.officers.list().catch(function () { return []; });
      var now = new Date().toISOString();
      return {
        stats: [rows.filter(function (r) { return (r.publish_at || '') <= now; }).length,
                rows.filter(function (r) { return (r.publish_at || '') > now; }).length,
                rows.filter(function (r) { return r.pinned; }).length,
                null],
        cells: rows.map(function (r) {
          return [r.title, titleCase(r.audience), nameOf(people, r.author_id), d(r.publish_at), null];
        })
      };
    },

    practice: async function (DB) {
      var rows = await DB.practice.list();
      var pairs = rows.filter(function (r) { return r.pairs; });
      return {
        stats: [rows.length,
                pairs.length ? Math.round(pairs.reduce(function (t, r) { return t + r.pairs; }, 0) / pairs.length) : null,
                pairs.reduce(function (t, r) { return t + r.pairs * 2; }, 0) || null,
                null],
        cells: rows.map(function (r) {
          return [r.week, r.skill, r.activity, r.pairs, d(r.ran_on), r.notes];
        })
      };
    },

    minutes: async function (DB) {
      var rows = await DB.minutes.list();
      var people = await DB.officers.list().catch(function () { return []; });
      var filed = rows.filter(function (r) { return r.filed_at; });
      return {
        stats: [filed.length,
                rows.length - filed.length,
                rows.reduce(function (t, r) { return t + (r.decisions || []).length; }, 0),
                rows.reduce(function (t, r) { return t + (r.action_items || []).length; }, 0)],
        cells: rows.map(function (r) {
          return [r.meeting_id ? 'Meeting' : '\u2014', d(r.date), nameOf(people, r.author_id),
                  (r.decisions || []).length, (r.action_items || []).length, d(r.filed_at)];
        })
      };
    },

    attendance: async function (DB) {
      var meetings = await DB.meetings.list();
      var held = meetings.filter(function (m) { return m.status === 'held'; });
      var seen = {}, cells = [], totals = [];
      for (var i = 0; i < held.length; i++) {
        var rows = await DB.attendance.forMeeting(held[i].id);
        var present = rows.filter(function (r) { return r.present; });
        var fresh = present.filter(function (r) { return !seen[r.profile_id]; });
        present.forEach(function (r) { seen[r.profile_id] = true; });
        totals.push(present.length);
        cells.push([held[i].topic || ('Meeting ' + held[i].number), d(held[i].date),
                    present.length, fresh.length, present.length - fresh.length,
                    pct(present.length - fresh.length, present.length)]);
      }
      var avg = totals.length ? Math.round(totals.reduce(function (a, b) { return a + b; }, 0) / totals.length) : null;
      var last = cells.length ? cells[cells.length - 1] : null;
      return { stats: [last ? last[2] : null, avg, last ? last[5] : null,
                       Object.keys(seen).length || null],
               cells: cells };
    },

    forms: async function (DB) {
      var rows = await DB.forms.list(), cells = [], responses = 0;
      for (var i = 0; i < rows.length; i++) {
        var rs = await DB.forms.responses(rows[i].id);
        responses += rs.length;
        cells.push([rows[i].title, rows[i].purpose, rs.length, d(rows[i].opened_at), titleCase(rows[i].status)]);
      }
      return {
        stats: [rows.filter(function (r) { return r.status === 'open'; }).length,
                responses, null,
                rows.filter(function (r) { return r.status === 'closed'; }).length],
        cells: cells
      };
    },

    budget: async function (DB) {
      var lines = await DB.budget.withSpend();
      var alloc = lines.reduce(function (t, l) { return t + Number(l.allocated || 0); }, 0);
      var spent = lines.reduce(function (t, l) { return t + l.spent; }, 0);
      return {
        stats: [lines.length ? money(alloc - spent) : null, money(alloc), money(spent),
                lines.length ? money(alloc - spent) : null],
        cells: lines.map(function (l) {
          return [l.category, money(l.allocated), money(l.spent), money(l.remaining), l.notes];
        })
      };
    },

    expenses: async function (DB) {
      var rows = await DB.expenses.list();
      var people = await DB.officers.list().catch(function () { return []; });
      return {
        stats: [money(rows.filter(function (r) { return thisMonth(r.date); })
                          .reduce(function (t, r) { return t + Number(r.amount || 0); }, 0)),
                rows.filter(function (r) { return r.status === 'awaiting'; }).length,
                rows.filter(function (r) { return r.status === 'reimbursed'; }).length,
                rows.filter(function (r) { return !r.receipt_url; }).length],
        cells: rows.map(function (r) {
          return [d(r.date), r.item, money(r.amount), nameOf(people, r.paid_by),
                  nameOf(people, r.approved_by), r.receipt_url ? 'Attached' : null];
        })
      };
    },

    fundraising: async function (DB) {
      var rows = await DB.campaigns.list();
      return {
        stats: [money(rows.reduce(function (t, r) { return t + Number(r.raised || 0); }, 0)),
                money(rows.reduce(function (t, r) { return t + Number(r.target || 0); }, 0)),
                rows.filter(function (r) { return r.status === 'active'; }).length,
                null],
        cells: rows.map(function (r) {
          return [r.name, money(r.target), money(r.raised), r.runs,
                  titleCase(r.owner_role), titleCase(r.status)];
        })
      };
    },

    inventory: async function (DB) {
      var rows = await DB.inventory.list();
      var people = await DB.officers.list().catch(function () { return []; });
      return {
        stats: [rows.reduce(function (t, r) { return t + (r.quantity || 0); }, 0) || null,
                rows.filter(function (r) { return r.held_by; }).length,
                rows.filter(function (r) { return r.condition === 'missing'; }).length,
                money(rows.reduce(function (t, r) { return t + Number(r.value || 0); }, 0))],
        cells: rows.map(function (r) {
          return [r.item, r.quantity, r.location, nameOf(people, r.held_by), titleCase(r.condition)];
        })
      };
    },

    social: async function (DB) {
      var posts = await DB.social.posts();
      var accounts = await DB.social.accounts();
      var best = posts.slice().sort(function (a, b) { return (b.reach || 0) - (a.reach || 0); })[0];
      return {
        stats: [accounts.reduce(function (t, a) { return t + (a.followers || 0); }, 0) || null,
                posts.filter(function (r) { return thisMonth(r.scheduled_at) && r.status === 'published'; }).length,
                posts.filter(function (r) { return r.status === 'scheduled'; }).length,
                best && best.reach ? best.title : null],
        cells: posts.map(function (r) {
          return [r.title, titleCase(r.platform), d(r.scheduled_at), titleCase(r.status), r.reach];
        })
      };
    },

    content: async function (DB) {
      var posts = await DB.social.posts();
      var today = new Date().toISOString();
      return { stats: [posts.filter(function (r) { return r.status === 'planned'; }).length,
                       posts.filter(function (r) { return r.status === 'in_progress'; }).length,
                       posts.filter(function (r) { return r.status === 'published'; }).length,
                       posts.filter(function (r) {
                         return r.status !== 'published' && r.scheduled_at && r.scheduled_at < today;
                       }).length] };
    },

    events: async function (DB) {
      var rows = await DB.events.list(), cells = [], signups = 0;
      var people = await DB.officers.list().catch(function () { return []; });
      var today = new Date().toISOString().slice(0, 10);
      for (var i = 0; i < rows.length; i++) {
        var su = await DB.events.signups(rows[i].id);
        signups += su.length;
        cells.push([rows[i].name, d(rows[i].date), rows[i].location,
                    nameOf(people, rows[i].owner_id), su.length, titleCase(rows[i].status)]);
      }
      return {
        stats: [rows.filter(function (r) { return r.date && r.date >= today; }).length,
                rows.length, null, signups || null],
        cells: cells
      };
    },

    graphics: async function (DB) {
      var rows = await DB.graphics.list();
      return { stats: [rows.filter(function (r) { return !r.is_template; }).length,
                       rows.filter(function (r) { return r.status === 'awaiting'; }).length,
                       rows.filter(function (r) { return r.status === 'published'; }).length,
                       rows.filter(function (r) { return r.is_template; }).length] };
    },

    analytics: async function (DB) {
      var t = await DB.tasks.counts();
      var meetings = await DB.meetings.list();
      var members = await DB.members.list();
      var held = meetings.filter(function (m) { return m.status === 'held'; }).length;
      return { stats: [null,
                       members.filter(function (r) { return thisMonth(r.joined_at); }).length || null,
                       pct(t.done, t.done + t.open),
                       pct(held, meetings.length)] };
    }
  };

  async function hydrate(key, main) {
    var DB = window.SICA_DB;
    var bar = document.createElement('div');
    bar.className = 'dbstate ' + (DB.live ? 'on' : 'off');
    bar.innerHTML = DB.live
      ? '<i></i>Connected &mdash; live data'
      : '<i></i>Not connected &mdash; every <span class="na">&mdash;</span> below fills in once Supabase is wired';
    main.insertBefore(bar, main.children[1] || null);

    if (!DB.live || !FEEDS[key]) return;
    try {
      var data = await FEEDS[key](DB);
      var cells = main.querySelectorAll('.mc-grid .stat-v');
      (data.stats || []).forEach(function (v, i) {
        if (cells[i] && v !== null && v !== undefined) cells[i].textContent = v;
      });
      if (data.cells && data.cells.length) renderCells(main, data.cells);
      else if (data.rows && data.rows.length) renderRows(main, data.rows);
    } catch (e) { /* leave the dashes; a failed fetch must not invent data */ }
  }

  /* A feed that already knows its own column order hands over cells and
     skips the guessing that renderRows has to do from table headers. */
  function renderCells(main, cells) {
    var panel = main.querySelector('.panel .tblwrap table tbody') ||
                main.querySelector('.panel .tblwrap table');
    if (!panel) return;
    var empty = main.querySelector('.tbl-empty');
    var body = document.createElement('tbody');
    cells.forEach(function (row) {
      var tr = document.createElement('tr');
      row.forEach(function (v) {
        var td = document.createElement('td');
        td.textContent = (v === null || v === undefined || v === '') ? '\u2014' : v;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    panel.appendChild(body);
    if (empty) empty.remove();
  }

  function renderRows(main, rows) {
    var panel = main.querySelector('.panel .tblwrap table tbody') ||
                main.querySelector('.panel .tblwrap table');
    var empty = main.querySelector('.tbl-empty');
    if (!panel) return;
    var head = [].slice.call(main.querySelectorAll('.panel .tblwrap th')).map(function (t) {
      return t.textContent.trim().toLowerCase().replace(/ /g, '_');
    });
    var body = document.createElement('tbody');
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      head.forEach(function (col) {
        var td = document.createElement('td');
        var v = r[col] !== undefined ? r[col] : (r[col.replace('_applied_for', '_applied')] || '');
        td.textContent = v === null || v === '' ? '—' : v;
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    panel.appendChild(body);
    if (empty) empty.remove();
  }
})();
