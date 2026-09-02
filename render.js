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
                 '<input type="checkbox"' + (t[1] ? ' checked' : '') + ' disabled>' +
                 '<span class="sw" aria-hidden="true"></span></label>';
        }).join('') + '</div></div>' +
        '<p class="hint">Switches are read-only until the database is connected &mdash; a toggle that does not persist is worse than one that is clearly not live yet.</p>';
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
  };
})();
