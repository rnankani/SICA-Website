/* ═══════════════════════════════════════════════════════════
   The shared task list.

   One component, mounted twice: compact on the dashboard, full on the
   Tasks page. Both read and write the same rows through SICA_DB, so a
   task ticked on the dashboard is ticked everywhere.

   Everything persists immediately — there is no save button, the way
   Notion has no save button. With Supabase connected these become
   network writes and nothing else changes.
   ═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var PRIORITIES = ['low', 'normal', 'high'];

  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function roleLabel(id) {
    var R = window.SICA_ROLES;
    return (R && R.all[id]) ? R.all[id].label : 'Anyone';
  }

  function dueMeta(t) {
    if (!t.due) return null;
    var today = new Date().toISOString().slice(0, 10);
    var d = new Date(t.due + 'T00:00:00');
    var label = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    if (t.due < today) return { label: label, cls: 'over' };
    if (t.due === today) return { label: 'Today', cls: 'soon' };
    return { label: label, cls: '' };
  }

  function when(iso) {
    if (!iso) return '';
    var diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  /* ─── mount ──────────────────────────────────────────────
     opts.compact — dashboard version: no filters, fewer fields.
     opts.onChange — fired after any write, so a host page can refresh
     its own counters and activity feed. */
  window.sicaTaskList = function (el, opts) {
    opts = opts || {};
    var DB = window.SICA_DB;
    var open = [], done = [], expanded = null, filter = 'all', dragId = null;

    async function load() {
      var all = await DB.tasks.list();
      open = all.filter(function (t) { return t.status !== 'done'; });
      done = all.filter(function (t) { return t.status === 'done'; })
                .sort(function (a, b) { return (b.completed_at || '') > (a.completed_at || '') ? 1 : -1; });
      draw();
      if (opts.onChange) opts.onChange({ open: open, done: done });
    }

    function visible() {
      if (filter === 'all') return open;
      var today = new Date().toISOString().slice(0, 10);
      if (filter === 'overdue') return open.filter(function (t) { return t.due && t.due < today; });
      if (filter === 'mine') {
        var me = window.SICA_ROLES ? window.SICA_ROLES.active() : null;
        return open.filter(function (t) { return t.owner_role === me; });
      }
      return open.filter(function (t) { return t.priority === filter; });
    }

    function row(t) {
      var d = dueMeta(t);
      var isOpen = expanded === t.id;
      return '<li class="tk' + (isOpen ? ' open' : '') + '" data-id="' + t.id + '" draggable="true">' +
        '<div class="tk-main">' +
          '<button class="tk-box" data-act="toggle" aria-label="Mark complete"></button>' +
          '<button class="tk-t" data-act="expand">' + esc(t.title) +
            (t.description ? '<i class="tk-hasdesc" title="Has notes"></i>' : '') +
          '</button>' +
          '<span class="tk-meta">' +
            (t.priority && t.priority !== 'normal'
              ? '<span class="tk-pri ' + t.priority + '">' + t.priority + '</span>' : '') +
            (t.owner_role ? '<span class="tk-own">' + esc(roleLabel(t.owner_role)) + '</span>' : '') +
            (d ? '<span class="tk-due ' + d.cls + '">' + d.label + '</span>' : '') +
          '</span>' +
          '<span class="tk-grip" title="Drag to reorder" aria-hidden="true"></span>' +
        '</div>' +
        (isOpen ? detail(t) : '') +
      '</li>';
    }

    function detail(t) {
      var R = window.SICA_ROLES;
      var roleOpts = '<option value="">Anyone</option>' + (R ? R.order.map(function (id) {
        return '<option value="' + id + '"' + (t.owner_role === id ? ' selected' : '') + '>' +
               esc(R.all[id].label) + '</option>';
      }).join('') : '');
      return '<div class="tk-d">' +
        '<textarea class="tk-desc" data-act="desc" rows="2" placeholder="Add a description…">' +
          esc(t.description) + '</textarea>' +
        '<div class="tk-fields">' +
          '<label>Owner<select data-act="owner">' + roleOpts + '</select></label>' +
          '<label>Due<input type="date" data-act="due" value="' + esc(t.due || '') + '"></label>' +
          '<label>Priority<select data-act="pri">' + PRIORITIES.map(function (p) {
            return '<option value="' + p + '"' + (t.priority === p ? ' selected' : '') + '>' + p + '</option>';
          }).join('') + '</select></label>' +
        '</div>' +
        '<div class="tk-acts">' +
          '<button class="tk-up" data-act="up">Move up</button>' +
          '<button class="tk-up" data-act="down">Move down</button>' +
          '<button class="tk-del" data-act="del">Delete</button>' +
        '</div></div>';
    }

    function draw() {
      var list = visible();
      var filters = opts.compact ? '' :
        '<div class="tk-filters">' +
        [['all', 'All'], ['mine', 'Mine'], ['overdue', 'Overdue'], ['high', 'High priority']]
          .map(function (f) {
            return '<button class="tk-f' + (filter === f[0] ? ' on' : '') + '" data-f="' + f[0] + '">' +
                   f[1] + '</button>';
          }).join('') + '</div>';

      var body = list.length
        ? '<ul class="tk-list">' + list.map(row).join('') + '</ul>'
        : '<p class="tk-empty">' + (open.length
            ? 'Nothing matches this filter.'
            : 'No tasks yet. Add the first one below.') + '</p>';

      var doneBlock = (!opts.compact && done.length)
        ? '<div class="tk-donehead">Completed<span>' + done.length + '</span>' +
          '<button class="tk-clear" data-act="clearDone">Clear</button></div>' +
          '<ul class="tk-list tk-donelist">' + done.slice(0, 20).map(function (t) {
            return '<li class="tk done" data-id="' + t.id + '">' +
              '<div class="tk-main"><button class="tk-box on" data-act="toggle" ' +
              'aria-label="Mark not complete"></button>' +
              '<span class="tk-t">' + esc(t.title) + '</span>' +
              '<span class="tk-meta"><span class="tk-when">' + when(t.completed_at) + '</span></span>' +
              '<button class="tk-x" data-act="del" aria-label="Delete">&times;</button></div></li>';
          }).join('') + '</ul>'
        : '';

      el.innerHTML = filters + body +
        '<form class="tk-add"><input placeholder="Add a task and press Enter" ' +
        'aria-label="New task"><button type="submit">Add</button></form>' + doneBlock;
    }

    /* ─── writes ─────────────────────────────────────────── */
    async function add(title) {
      if (!title.trim()) return;
      await DB.tasks.create({ title: title.trim() });
      await load();
    }
    async function toggle(id) {
      var t = open.concat(done).filter(function (x) { return x.id === id; })[0];
      if (!t) return;
      var li = el.querySelector('.tk[data-id="' + id + '"]');
      if (li && t.status !== 'done') {
        /* strike through first, then let it move — the row visibly
           completes rather than vanishing mid-click */
        li.classList.add('striking');
        await new Promise(function (r) { setTimeout(r, 260); });
      }
      await DB.tasks.complete(id, t.status !== 'done');
      expanded = null;
      await load();
    }
    async function patch(id, p) { await DB.tasks.update(id, p); await load(); }
    async function del(id) { await DB.tasks.remove(id); expanded = null; await load(); }

    async function move(id, dir) {
      var list = visible();
      var i = list.findIndex(function (t) { return t.id === id; });
      var j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return;
      var before = dir < 0 ? (list[j - 1] ? list[j - 1].position : null) : list[j].position;
      var after  = dir < 0 ? list[j].position : (list[j + 1] ? list[j + 1].position : null);
      await DB.tasks.move(id, before, after);
      await load();
    }

    async function dropOn(id, targetId) {
      if (id === targetId) return;
      var list = visible();
      var ti = list.findIndex(function (t) { return t.id === targetId; });
      if (ti < 0) return;
      var before = list[ti - 1] ? list[ti - 1].position : null;
      await DB.tasks.move(id, before, list[ti].position);
      await load();
    }

    /* ─── events ─────────────────────────────────────────── */
    el.addEventListener('click', function (e) {
      var f = e.target.closest('.tk-f');
      if (f) { filter = f.dataset.f; draw(); return; }
      if (e.target.dataset.act === 'clearDone') {
        Promise.all(done.map(function (t) { return DB.tasks.remove(t.id); })).then(load);
        return;
      }
      var li = e.target.closest('.tk');
      if (!li) return;
      var id = li.dataset.id, act = e.target.dataset.act;
      if (act === 'toggle') toggle(id);
      else if (act === 'del') del(id);
      else if (act === 'up') move(id, -1);
      else if (act === 'down') move(id, 1);
      else if (act === 'expand') { expanded = expanded === id ? null : id; draw(); }
    });

    el.addEventListener('submit', function (e) {
      e.preventDefault();
      var i = e.target.querySelector('input');
      add(i.value); i.value = '';
    });

    /* field edits save on blur / change, never on every keystroke */
    el.addEventListener('change', function (e) {
      var li = e.target.closest('.tk'); if (!li) return;
      var id = li.dataset.id, a = e.target.dataset.act;
      if (a === 'owner') patch(id, { owner_role: e.target.value || null });
      else if (a === 'due') patch(id, { due: e.target.value || null });
      else if (a === 'pri') patch(id, { priority: e.target.value });
    });
    el.addEventListener('focusout', function (e) {
      if (e.target.dataset.act !== 'desc') return;
      var li = e.target.closest('.tk'); if (!li) return;
      var t = open.filter(function (x) { return x.id === li.dataset.id; })[0];
      if (t && t.description !== e.target.value) patch(li.dataset.id, { description: e.target.value });
    });

    el.addEventListener('dragstart', function (e) {
      var li = e.target.closest('.tk'); if (!li) return;
      dragId = li.dataset.id; li.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragover', function (e) {
      if (!dragId) return;
      e.preventDefault();
      var li = e.target.closest('.tk');
      el.querySelectorAll('.tk.over').forEach(function (n) { n.classList.remove('over'); });
      if (li && li.dataset.id !== dragId) li.classList.add('over');
    });
    el.addEventListener('drop', function (e) {
      e.preventDefault();
      var li = e.target.closest('.tk');
      if (li && dragId) dropOn(dragId, li.dataset.id);
      dragId = null;
    });
    el.addEventListener('dragend', function () {
      dragId = null;
      el.querySelectorAll('.dragging,.over').forEach(function (n) {
        n.classList.remove('dragging', 'over');
      });
    });

    load();
    return { reload: load };
  };
})();
