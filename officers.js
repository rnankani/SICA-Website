/* ═══════════════════════════════════════════════════════════
   SICA Officer Workspace — shared shell behaviour
   Loaded by every page. Renders the rail from one definition so eight
   separate pages can't drift out of sync, handles the access gate, and
   runs the command palette (which now navigates to real URLs).
   ═══════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  var CODE = 'SICA2026';
  var page = document.body.dataset.page || 'dashboard';

  var R  = window.SICA_ROLES;
  var ROLE = R.get();
  var NAV = ROLE.nav;
  function esc(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  /* ─── rail ───────────────────────────────────────────────
     Rendered rather than copy-pasted into eight files: one definition
     means a new tab is a single line here, not eight edits. */
  function renderRail(){
    /* The profile may have loaded after this script was parsed. Resolve
       the role at render time so a first-time officer never inherits the
       Founder navigation from the local fallback. */
    ROLE = R.get();
    NAV = ROLE.nav;
    var rail = document.getElementById('rail');
    if (!rail) return;
    var profile = null;
    try { profile = JSON.parse(localStorage.getItem('sica.profile') || 'null'); } catch(e){}
    var displayName = profile && profile.full_name ? profile.full_name : ROLE.person;
    var h = '<button class="brand" id="railToggle" type="button" aria-label="Collapse sidebar" aria-expanded="true">' +
            '<span class="brand-ic"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg></span>' +
            '<span class="brand-txt"><b>SICA</b><span>Officer Workspace</span></span></button>';
    NAV.forEach(function(g){
      h += '<div class="navgroup"><div class="navlabel">' + g.group + '</div>';
      g.items.forEach(function(i){
        h += '<a class="navitem' + (i.id === page ? ' on' : '') + '" href="' + i.href + '"' +
             ' data-label="' + i.label + '"' +
             (i.id === page ? ' aria-current="page"' : '') + '>' +
             '<svg viewBox="0 0 24 24">' + i.icon + '</svg>' +
             '<span class="navitem-t">' + i.label + '</span>' +
             (i.cnt ? '<span class="cnt">' + i.cnt + '</span>' : '') + '</a>';
      });
      h += '</div>';
    });
    h += '<div class="railfoot">' +
         '<button class="kbd-hint" id="palBtn"><span>Search</span><kbd>⌘K</kbd></button>' +
         (R.isImpersonating()
            ? '<div class="imp" id="impBar"><span>Viewing as ' + ROLE.label + '</span>' +
              '<button type="button" id="impExit">Exit</button></div>'
            : '') +
         '<button class="whoami" type="button" id="roleBtn" data-label="' + ROLE.label + '" aria-haspopup="menu" aria-expanded="false">' +
         '<span class="av" style="background:linear-gradient(145deg,' + ROLE.color + ',#6E5626)">' + ROLE.short + '</span>' +
         '<span class="whoami-txt"><b>' + esc(displayName) + '</b><span>' + ROLE.label + '</span></span>' +
         '<i class="whoami-c" aria-hidden="true">&#9662;</i></button></div>';
    rail.innerHTML = h;

    /* Collapse preference is per-device and survives navigation, so the
       rail does not silently re-expand on every page load. */
    var rb = document.getElementById('roleBtn');
    if (rb) rb.addEventListener('click', openRoleMenu);
    var ie = document.getElementById('impExit');
    if (ie) ie.addEventListener('click', function(){ R.set(R.signedInRole()); location.reload(); });

    var t = document.getElementById('railToggle');
    if (t) t.addEventListener('click', function(){
      var now = !document.body.classList.contains('rail-collapsed');
      document.body.classList.toggle('rail-collapsed', now);
      t.setAttribute('aria-expanded', String(!now));
      t.setAttribute('aria-label', now ? 'Expand sidebar' : 'Collapse sidebar');
      try { localStorage.setItem('sica-rail', now ? '1' : '0'); } catch(e){}
    });
    syncRailBadges();
  }

  function updateAppBadge(count){
    var appLink = document.querySelector('.rail a.navitem[href="applications.html"]');
    if (appLink) {
      var cntEl = appLink.querySelector('.cnt');
      if (count > 0) {
        if (!cntEl) {
          cntEl = document.createElement('span');
          cntEl.className = 'cnt';
          appLink.appendChild(cntEl);
        }
        cntEl.textContent = String(count);
      } else if (cntEl) {
        cntEl.remove();
      }
    }
    if (NAV) {
      NAV.forEach(function(g){
        g.items.forEach(function(item){
          if (item.id === 'applications') {
            item.cnt = count > 0 ? String(count) : null;
          }
        });
      });
    }
  }

  function syncRailBadges(){
    var DB = window.SICA_DB;
    if (!DB || !DB.applications || typeof DB.applications.counts !== 'function') return;
    try {
      var cached = localStorage.getItem('sica.badge.applications');
      if (cached !== null) {
        var n = parseInt(cached, 10);
        if (!isNaN(n)) updateAppBadge(n);
      }
    } catch(e){}
    DB.applications.counts().then(function(c){
      var count = c && typeof c.submitted === 'number' ? c.submitted : null;
      if (count !== null) {
        try { localStorage.setItem('sica.badge.applications', String(count)); } catch(e){}
        updateAppBadge(count);
      }
    }).catch(function(){});
  }

  window.addEventListener('focus', syncRailBadges);
  window.sicaSyncRailBadges = syncRailBadges;

  if (window.SICA_DB && window.SICA_DB.applications) {
    var dbApps = window.SICA_DB.applications;
    ['setStatus', 'remove', 'create'].forEach(function(fn){
      var orig = dbApps[fn];
      if (typeof orig === 'function') {
        dbApps[fn] = async function() {
          var res = await orig.apply(this, arguments);
          syncRailBadges();
          return res;
        };
      }
    });
  }

  /* ─── role switcher ──────────────────────────────────────
     Founder-only. The spec calls for impersonating every role to test
     what each officer actually sees; this is that, and it doubles as the
     way the six dashboards are built before auth exists. */
  function openRoleMenu(){
    if (document.getElementById('roleMenu')) return closeRoleMenu();
    var cur = R.active();
    var signedRole = R.signedInRole();
    var profile = null;
    try { profile = JSON.parse(localStorage.getItem('sica.profile') || 'null'); } catch(e){}
    var h = '';
    if (signedRole === 'founder') {
      h += '<div class="rm-head">Switch view</div>';
      R.order.forEach(function(id){
        var r = R.all[id];
        h += '<button class="rm-row' + (id === cur ? ' on' : '') + '" data-role="' + id + '">' +
             '<span class="rm-av" style="background:linear-gradient(145deg,' + r.color + ',#6E5626)">' + r.short + '</span>' +
             '<span class="rm-t"><b>' + r.label + '</b><span>' + r.person + '</span></span>' +
             (R.holds(id) ? '<span class="rm-you">you</span>' : '') + '</button>';
      });
      h += '<div class="rm-foot">You hold Founder and President. The other four are views for testing.</div>';
    }
    h += '<div class="rm-account">' +
         '<div class="rm-head">Account</div>' +
         '<div class="rm-identity"><b>' + esc(profile && profile.full_name || ROLE.person) + '</b>' +
         '<span>' + esc(profile && profile.email || ROLE.label) + '</span></div>' +
         '<button class="rm-signout" type="button" id="accountSignOut">Sign out</button></div>';
    var m = document.createElement('div');
    m.className = 'rolemenu'; m.id = 'roleMenu'; m.innerHTML = h;
    document.body.appendChild(m);
    document.getElementById('roleBtn').setAttribute('aria-expanded', 'true');
    var b = document.getElementById('roleBtn').getBoundingClientRect();
    m.style.left = Math.max(10, b.left) + 'px';
    m.style.bottom = (innerHeight - b.top + 10) + 'px';
    requestAnimationFrame(function(){ m.classList.add('open'); });
    m.addEventListener('click', function(e){
      var row = e.target.closest('.rm-row');
      if (row && R.set(row.dataset.role)) return location.reload();
      var out = e.target.closest('#accountSignOut');
      if (!out) return;
      out.disabled = true;
      out.textContent = 'Signing out…';
      var A = window.SICA_AUTH;
      Promise.resolve(A && A.signOut ? A.signOut() : null).finally(function(){
        try {
          localStorage.removeItem('sica-role');
          localStorage.removeItem('sica.badge.applications');
          sessionStorage.removeItem('sica-officer');
        } catch(err){}
        location.href = 'officers.html';
      });
    });
    setTimeout(function(){ addEventListener('click', outsideRole); }, 0);
  }
  function closeRoleMenu(){
    var m = document.getElementById('roleMenu');
    if (m) m.remove();
    var b = document.getElementById('roleBtn');
    if (b) b.setAttribute('aria-expanded', 'false');
    removeEventListener('click', outsideRole);
  }
  function outsideRole(e){
    if (!e.target.closest('#roleMenu') && !e.target.closest('#roleBtn')) closeRoleMenu();
  }

  /* ─── gate ───────────────────────────────────────────────
     A latch, not security: the code is in this file, so it keeps the
     workspace out of casual reach and nothing more. Anything genuinely
     private needs a real login with a server behind it. */
  function unlock(){
    try { sessionStorage.setItem('sica-officer','1'); } catch(e){}
    var g = document.getElementById('gate');
    if (g) g.remove();
    document.body.classList.add('unlocked');
    start();
  }

  function showGate(reason){
    var A = window.SICA_AUTH;
    var live = A && A.live;

    /* Signed in, but not staff. Say so plainly rather than looping them
       back to a sign-in box that will keep appearing to work. */
    if (reason === 'notOfficer'){
      var g2 = document.createElement('div');
      g2.className = 'gate'; g2.id = 'gate';
      g2.innerHTML = '<div class="gate-card"><h1>Not an officer account</h1>' +
        '<p>You are signed in, but this workspace is for SICA officers. ' +
        'Applying for a role is how you get access &mdash; an approved application ' +
        'is what turns an account into an officer account.</p>' +
        '<div class="row" style="margin-top:22px">' +
        '<a href="index.html">&larr; Back to site</a>' +
        '<span style="display:flex;gap:8px">' +
        '<button type="button" class="btn ghost" id="gateOut">Sign out</button>' +
        '<a class="btn" href="apply.html">Apply</a></span></div></div>';
      document.body.appendChild(g2);
      document.getElementById('gateOut').addEventListener('click', function(){
        A.signOut().then(function(){ location.reload(); });
      });
      return;
    }
    var g = document.createElement('div');
    g.className = 'gate'; g.id = 'gate';
    if (reason === 'database') {
      g.innerHTML = '<div class="gate-card"><h1>Database unavailable</h1>' +
        '<p>This workspace only shows shared Supabase data. It will not open a browser-only copy. ' +
        'Check the connection and reload this page.</p>' +
        '<a class="btn" href="">Reload</a>' +
        '<a class="gate-back" href="index.html">&larr; Back to site</a></div>';
      return;
    }

    g.innerHTML = live
      ? '<div class="gate-card"><h1>Officer sign-in</h1>' +
        '<p>Use your SICA account. Applications are only visible once you are signed in. ' +
        'New accounts need the emailed confirmation link before the first sign-in.</p>' +
        '<form id="gateForm">' +
        '<input id="gateEmail" type="email" autocomplete="username" placeholder="Email" aria-label="Email">' +
        '<input id="gateCode" type="password" autocomplete="current-password" placeholder="Password" aria-label="Password">' +
        '<div class="err" id="gateErr" role="alert"></div>' +
        '<div class="row"><a href="index.html">&larr; Back to site</a>' +
        '<span style="display:flex;gap:8px">' +
        '<button type="button" class="btn ghost" id="gateNew">Create account</button>' +
        '<button type="submit" class="btn">Sign in</button></span></div></form>' +
        '<p class="gate-state" id="gateState"></p></div>'
      : '<div class="gate-card"><h1>Officer access</h1>' +
        '<p>This workspace is for SICA officers. Enter the current access code.</p>' +
        '<form id="gateForm"><input id="gateCode" type="password" autocomplete="off" placeholder="ACCESS CODE" aria-label="Access code">' +
        '<div class="err" id="gateErr" role="alert"></div>' +
        '<div class="row"><a href="index.html">&larr; Back to site</a>' +
        '<button type="submit" class="btn">Enter</button></div></form></div>';

    document.body.appendChild(g);
    var err = document.getElementById('gateErr');
    (document.getElementById('gateEmail') || document.getElementById('gateCode')).focus();

    if (live) {
      A.ping().then(function (p) {
        var el = document.getElementById('gateState');
        if (el) el.textContent = p.ok ? '' : p.reason;
        if (el) el.className = 'gate-state' + (p.ok ? '' : ' bad');
      });
      document.getElementById('gateNew').addEventListener('click', function () {
        var e = document.getElementById('gateEmail').value.trim();
        var p = document.getElementById('gateCode').value;
        if (!e || p.length < 8) { err.textContent = 'Enter an email and a password of at least 8 characters.'; return; }
        err.textContent = 'Creating account…';
        A.signUp(e, p).then(function (d) {
          if (d && d.access_token) unlock();
          else err.textContent = 'Account created. Open the confirmation link we just emailed you, ' +
                                 'then come back and sign in.';
        }).catch(function (ex) { err.textContent = ex.message; });
      });
    }

    document.getElementById('gateForm').addEventListener('submit', function (e) {
      e.preventDefault();
      if (!live) {
        var v = document.getElementById('gateCode');
        if (v.value.trim().toUpperCase() === CODE) unlock();
        else { err.textContent = 'That code is not right.'; v.value = ''; v.focus(); }
        return;
      }
      var em = document.getElementById('gateEmail').value.trim();
      var pw = document.getElementById('gateCode').value;
      err.textContent = 'Signing in…';
      A.signIn(em, pw)
        .then(function () { return A.profile(true); })
        .then(function (p) {
          if (p && p.role && p.role !== 'member') return unlock();
          document.getElementById('gate').remove();
          showGate('notOfficer');
        })
        .catch(function (ex) { err.textContent = ex.message; });
    });
  }

  /* ─── command palette ────────────────────────────────────
     The rail gets you to a section; this gets you to a thing. Every
     result is a real URL, so it works identically from any page. */
  var ITEMS = [];
  NAV.forEach(function(g){
    g.items.forEach(function(i){
      ITEMS.push({sec:'Go to', k:i.id.slice(0,5).toUpperCase(), label:i.label, rt:'Page', href:i.href});
    });
  });
  var CH = ['Culture','Expectations','Hiring','Removal','Meetings','Conflict','Communication','Elections','Succession','Scaling'];
  CH.forEach(function(c, i){
    ITEMS.push({sec:'Handbook', k:'CH' + (i < 9 ? '0' : '') + (i + 1), label:c, rt:'Chapter', href:'handbook.html#ch' + (i + 1)});
  });
  ITEMS.push({sec:'Curriculum', k:'W05', label:'Active Listening', rt:'Phase 1', href:'curriculum.html#w5'});
  ITEMS.push({sec:'Meetings',   k:'M05', label:'Active Listening', rt:'Thu 3 Sep', href:'meetings.html'});
  ITEMS.push({sec:'Team',       k:'PRES',label:'Reyansh Nankani',  rt:'President', href:'president.html'});
  ITEMS.push({sec:'Branding',   k:'HEX', label:'SICA colour palette', rt:'Identity', href:'branding.html'});
  ITEMS.unshift({sec:'Tasks', k:'NEW', label:'Add task', rt:'Quick action', href:'tasks.html?add=1'});
  ITEMS.unshift({sec:'Tasks', k:'TEAM', label:'Team tasks', rt:'Workspace', href:'tasks.html?view=team'});
  ITEMS.unshift({sec:'Tasks', k:'MINE', label:'My tasks', rt:'Workspace', href:'tasks.html'});
  ITEMS.unshift({sec:'Dashboard', k:'TODAY', label:'Today command center', rt:'Dashboard', href:'officers.html'});

  /* References are searchable from anywhere, so a doc is one ⌘K away even
     when you are three tabs deep. Rows with no URL yet are still listed —
     finding out a doc is missing is more useful than it being invisible. */
  if (window.SICA_REFERENCES){
    window.SICA_REFERENCES.forEach(function(g){
      g.items.forEach(function(i){
        var t = i.title.replace(/&amp;/g, '&');
        ITEMS.push({
          sec: 'References',
          k: i.url ? (i.internal ? 'PAGE' : 'DOC') : '—',
          label: t,
          rt: g.group.replace(/&amp;/g, '&'),
          href: i.url || 'references.html',
          blank: !!(i.url && !i.internal)
        });
      });
    });
  }

  var palWrap, palInput, palList, sel = 0, shown = [];

  function renderPal(){
    var q = palInput.value.trim().toLowerCase();
    shown = ITEMS.filter(function(i){
      return !q || (i.label + ' ' + i.k + ' ' + i.rt + ' ' + i.sec).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 12);
    if (!shown.length){
      palList.innerHTML = '<div class="pal-sec">No matches</div>' +
        '<div class="pal-row" style="cursor:default">Nothing matches “' + palInput.value + '”.</div>';
      return;
    }
    if (sel >= shown.length) sel = shown.length - 1;
    if (sel < 0) sel = 0;
    var h = '', last = '';
    shown.forEach(function(i, n){
      if (i.sec !== last){ h += '<div class="pal-sec">' + i.sec + '</div>'; last = i.sec; }
      h += '<button class="pal-row' + (n === sel ? ' on' : '') + '" data-i="' + n + '">' +
           '<span class="k">' + i.k + '</span>' + i.label +
           '<span class="rt">' + i.rt + '</span></button>';
    });
    palList.innerHTML = h;
  }
  function openPal(){ palWrap.classList.add('open'); palInput.value = ''; sel = 0; renderPal(); palInput.focus(); }
  function closePal(){ palWrap.classList.remove('open'); }
  function run(i){
    var it = shown[i];
    if (!it) return;
    /* external docs open in a new tab, same as clicking them on the page */
    if (it.blank) window.open(it.href, '_blank', 'noopener');
    else location.href = it.href;
    closePal();
  }

  function buildPal(){
    palWrap = document.createElement('div');
    palWrap.className = 'pal-wrap'; palWrap.id = 'palWrap';
    palWrap.innerHTML =
      '<div class="pal"><div class="pal-in">' +
      '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/></svg>' +
      '<input id="palInput" placeholder="Search pages, chapters, weeks…" autocomplete="off"><kbd>ESC</kbd>' +
      '</div><div class="pal-list" id="palList"></div></div>';
    document.body.appendChild(palWrap);
    palInput = document.getElementById('palInput');
    palList  = document.getElementById('palList');

    palInput.addEventListener('input', function(){ sel = 0; renderPal(); });
    palList.addEventListener('click', function(e){
      var r = e.target.closest('.pal-row');
      if (r && r.dataset.i) run(+r.dataset.i);
    });
    palWrap.addEventListener('click', function(e){ if (e.target === palWrap) closePal(); });
    var pb = document.getElementById('palBtn');
    if (pb) pb.addEventListener('click', openPal);

    addEventListener('keydown', function(e){
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); openPal(); return; }
      if (!palWrap.classList.contains('open')) return;
      if (e.key === 'Escape') closePal();
      else if (e.key === 'ArrowDown'){ e.preventDefault(); sel = Math.min(sel + 1, shown.length - 1); renderPal(); }
      else if (e.key === 'ArrowUp'){ e.preventDefault(); sel = Math.max(sel - 1, 0); renderPal(); }
      else if (e.key === 'Enter'){ e.preventDefault(); run(sel); }
    });
  }

  /* ─── toast ─────────────────────────────────────────────── */
  var toastEl, toastT;
  window.sicaToast = function(msg){
    if (!toastEl){
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function(){ toastEl.classList.remove('show'); }, 1800);
  };

  function start(){
    try { if (localStorage.getItem('sica-rail') === '1') document.body.classList.add('rail-collapsed'); } catch(e){}
    renderRail();
    buildPal();
    if (typeof window.sicaPageInit === 'function') window.sicaPageInit();
  }

  /* Wait for DOMContentLoaded before booting: this file is loaded before
     each page's inline sicaPageInit, so starting synchronously would call
     a hook that does not exist yet. */
  function boot(){
    var A = window.SICA_AUTH;
    if (A && A.live){
      /* A real session beats the passcode. Refresh first so an officer
         returning after an hour is not bounced for no reason. */
      A.refresh().then(function(){
        if (!A.signedIn()) return showGate();
        /* Signed in is not the same as authorised. Anyone may create an
           account; only an officer profile may open the workspace. */
        return A.profile(false).then(function(p){
          if (p && p.role && p.role !== 'member'){
            document.body.classList.add('unlocked');
            start();
          } else {
            showGate(p ? 'notOfficer' : null);
          }
        });
      });
      return;
    }
    if (window.SICA_DB && window.SICA_DB.mode === 'local') {
      var already = false;
      try { already = sessionStorage.getItem('sica-officer') === '1'; } catch(e){}
      if (already){ document.body.classList.add('unlocked'); start(); }
      else showGate();
      return;
    }
    showGate('database');
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();
})();
