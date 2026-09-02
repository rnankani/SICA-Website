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

  var NAV = [
    {group:'Run the club', items:[
      {id:'dashboard', label:'Dashboard', href:'officers.html',   icon:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'},
      {id:'curriculum',label:'Curriculum',href:'curriculum.html', cnt:'30', icon:'<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v18H5.5A1.5 1.5 0 0 1 4 19.5v-15Z"/><path d="M8 3v18"/>'},
      {id:'meetings',  label:'Meetings',  href:'meetings.html',   cnt:'4',  icon:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>'},
      {id:'team',      label:'Team',      href:'team.html',       cnt:'5',  icon:'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-2.2-4.4"/>'},
      {id:'library',   label:'Library',   href:'library.html',    cnt:'10', icon:'<rect x="3" y="4" width="18" height="4.5" rx="1.2"/><path d="M5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5M10 12.5h4"/>'},
      {id:'references',label:'References',href:'references.html',  icon:'<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 13v6a1.8 1.8 0 0 1-1.8 1.8H5A1.8 1.8 0 0 1 3.2 19V7.8A1.8 1.8 0 0 1 5 6h6"/>'}
    ]},
    {group:'The manual', items:[
      {id:'handbook',  label:'Handbook',  href:'handbook.html',   cnt:'10', icon:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'},
      {id:'branding',  label:'Branding',  href:'branding.html',   icon:'<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18"/>'},
      {id:'president', label:'President', href:'president.html',  icon:'<path d="M4 8l4 3 4-6 4 6 4-3-1.5 10h-13z"/>'}
    ]}
  ];

  /* ─── rail ───────────────────────────────────────────────
     Rendered rather than copy-pasted into eight files: one definition
     means a new tab is a single line here, not eight edits. */
  function renderRail(){
    var rail = document.getElementById('rail');
    if (!rail) return;
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
         '<a class="whoami" href="president.html" data-label="President"><span class="av">RN</span>' +
         '<span class="whoami-txt"><b>Reyansh Nankani</b><span>President</span></span></a></div>';
    rail.innerHTML = h;

    /* Collapse preference is per-device and survives navigation, so the
       rail does not silently re-expand on every page load. */
    var t = document.getElementById('railToggle');
    if (t) t.addEventListener('click', function(){
      var now = !document.body.classList.contains('rail-collapsed');
      document.body.classList.toggle('rail-collapsed', now);
      t.setAttribute('aria-expanded', String(!now));
      t.setAttribute('aria-label', now ? 'Expand sidebar' : 'Collapse sidebar');
      try { localStorage.setItem('sica-rail', now ? '1' : '0'); } catch(e){}
    });
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

  function showGate(){
    var g = document.createElement('div');
    g.className = 'gate'; g.id = 'gate';
    g.innerHTML =
      '<div class="gate-card"><h1>Officer access</h1>' +
      '<p>This workspace is for SICA officers. Enter the current access code.</p>' +
      '<form id="gateForm"><input id="gateCode" type="password" autocomplete="off" placeholder="ACCESS CODE" aria-label="Access code">' +
      '<div class="err" id="gateErr" role="alert"></div>' +
      '<div class="row"><a href="index.html">&larr; Back to site</a>' +
      '<button type="submit" class="btn">Enter</button></div></form></div>';
    document.body.appendChild(g);
    document.getElementById('gateCode').focus();
    document.getElementById('gateForm').addEventListener('submit', function(e){
      e.preventDefault();
      var v = document.getElementById('gateCode');
      if (v.value.trim().toUpperCase() === CODE) unlock();
      else {
        document.getElementById('gateErr').textContent = 'That code is not right.';
        v.value = ''; v.focus();
      }
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
    var already = false;
    try { already = sessionStorage.getItem('sica-officer') === '1'; } catch(e){}
    if (already){ document.body.classList.add('unlocked'); start(); }
    else showGate();
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot);
  else boot();
})();
