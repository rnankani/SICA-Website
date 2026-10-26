/* Daily workspace. The database is the source of truth; no task data is
   written to browser storage. Dashboard and Tasks share one mounted shell. */
(function () {
  'use strict';
  const STATUS = {not_started:'Not started', in_progress:'In progress', blocked:'Blocked', completed:'Completed'};
  const PRIORITY = {low:'Low', medium:'Normal', high:'High', urgent:'Urgent'};
  const paths = {
    plus:'M12 5v14M5 12h14', check:'m5 12 4 4L19 6', close:'m6 6 12 12M6 18 18 6',
    arrow:'m9 5 7 7-7 7', calendar:'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z',
    clock:'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    list:'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1',
    timeline:'M3 5h18M3 3v18M7 10h8M11 15h10M6 20h5', refresh:'M20 7v5h-5M4 17v-5h5M6 6a8 8 0 0 1 14 6M4 12a8 8 0 0 0 14 6'
  };
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[name]+'"/></svg>';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = value => new Date(value+'T12:00:00');
  const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const today = () => iso(new Date());
  const shift = (value, days) => {const d = date(value); d.setDate(d.getDate()+days); return iso(d);};
  const distance = (a,b) => Math.round((date(b)-date(a))/86400000);
  const pretty = value => value ? date(value).toLocaleDateString(undefined,{month:'short',day:'numeric'}) : 'No due date';
  const active = task => task.status !== 'completed';
  const overdue = task => active(task) && task.due && task.due < today();
  const role = () => window.SICA_ROLES.active();
  const can = permission => window.SICA_ROLES.can(permission);
  const roleName = key => (window.SICA_ROLES.all[key] || {}).label || 'Unassigned';
  function profile() {try {return JSON.parse(localStorage.getItem('sica.profile') || '{}');} catch (_) {return {};}}
  function mine(task) {
    if ((task.assignee_roles || []).includes(role())) return true;
    // Role previews must not accidentally inherit the founder's personal work.
    if (window.SICA_ROLES.isImpersonating()) return task.owner_role === role();
    return task.owner_id ? task.owner_id === profile().id : task.owner_role === role();
  }
  const editable = task => can('tasks.edit_any') || (can('tasks.edit_own') && mine(task));
  const state = {rows:[], people:[], meetings:[], loaded:false, error:'', extraError:'', scope:'mine', filter:'active', search:'', view:'list', scale:14, offset:0, loading:false, saving:false};
  let root, DB, panel, mobileMenu, returnFocus, panelTask, initialForm = '', loadGeneration = 0, panelGeneration = 0, drag = null;
  const owner = task => {const p = state.people.find(p => p.id === task.owner_id); const lead=p ? p.full_name || roleName(p.role) : roleName(task.owner_role); return [lead,...(task.assignee_roles||[]).filter(r=>r!==task.owner_role).map(roleName)].join(' · ');};
  const scoped = () => state.rows.filter(t => state.scope === 'team' || mine(t));
  function sorted(rows) {
    const ranks = {urgent:0, high:1, medium:2, low:3};
    return rows.slice().sort((a,b) => Number(overdue(b))-Number(overdue(a)) || Number(b.status==='blocked')-Number(a.status==='blocked') || String(a.due||'9999').localeCompare(b.due||'9999') || (ranks[a.priority]||0)-(ranks[b.priority]||0));
  }
  function visible() {
    return sorted(scoped().filter(t => (state.filter==='all' || (state.filter==='active' ? active(t) : t.status===state.filter)) && (t.title+' '+owner(t)+' '+(t.category||'')).toLowerCase().includes(state.search.toLowerCase())));
  }
  function toast(message, error) {
    const el = document.getElementById('workNotice'); el.textContent = message;
    el.classList.toggle('error',!!error); el.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => {el.hidden=true;}, error ? 14000 : 5000);
  }
  function empty(title, text, add) {
    return '<div class="w-empty">'+icon('check')+'<h3>'+title+'</h3><p>'+text+'</p>'+(add && can('tasks.create') ? '<a class="w-btn w-primary" href="officers.html?add=1">'+icon('plus')+'Add a task</a>' : '')+'</div>';
  }
  function scopeControl() {
    return can('tasks.view_team') ? '<div class="w-switch" aria-label="Task scope"><button data-scope="mine" aria-pressed="'+(state.scope==='mine')+'">My work</button><button data-scope="team" aria-pressed="'+(state.scope==='team')+'">Team</button></div>' : '<span class="w-role">'+esc(roleName(role()))+' · My work</span>';
  }
  function row(task) {
    return '<div class="w-row"><button class="w-check '+(!active(task)?'done':'')+'" data-complete="'+esc(task.id)+'" aria-label="'+esc((active(task)?'Complete ':'Reopen ')+task.title)+'" '+(!editable(task)?'disabled':'')+'>'+(!active(task)?icon('check'):'')+'</button><button class="w-row-title" data-edit="'+esc(task.id)+'"><b>'+esc(task.title)+'</b><small>'+esc(owner(task))+(task.category?' · '+esc(task.category):'')+'</small></button><span class="w-status '+esc(task.status)+'">'+esc(STATUS[task.status]||'Not started')+'</span><span class="w-priority '+esc(task.priority)+'">'+esc(PRIORITY[task.priority]||'Normal')+'</span><span class="w-date '+(overdue(task)?'late':'')+'">'+(overdue(task)?'Overdue · ':'')+pretty(task.due)+'</span></div>';
  }
  function timeline(rows) {
    const start = shift(today(), state.offset - 2), span=state.scale, width=span*44;
    const labelWidth=matchMedia('(max-width:700px)').matches?160:220;
    const dated = rows.filter(t => t.start_date && t.due);
    const shown = dated.filter(t => t.due >= start && t.start_date <= shift(start,span-1));
    const unscheduled = rows.length - dated.length;
    let ticks='';
    for(let i=0;i<span;i++) {const d=shift(start,i); ticks+='<span class="w-tick '+(d===today()?'is-today':'')+'">'+date(d).toLocaleDateString(undefined,{weekday:'narrow'})+'<b>'+date(d).getDate()+'</b></span>';}
    let chart='';
    shown.forEach(t => {
      const left=Math.max(0,distance(start,t.start_date));
      const right=Math.min(span,distance(start,t.due)+1);
      const pct=Math.min(100,Math.max(0,Number(t.progress)||0));
      chart+='<div class="w-gantt-row"><button class="w-gantt-label" data-edit="'+esc(t.id)+'"><b>'+esc(t.title)+'</b><small>'+esc(owner(t))+'</small></button><div class="w-track" style="width:'+width+'px"><button class="w-bar '+esc(t.status)+'" data-bar="'+esc(t.id)+'" style="left:'+(left*44)+'px;width:'+((right-left)*44-5)+'px" aria-label="'+esc(t.title+', '+pretty(t.start_date)+' to '+pretty(t.due)+', '+pct+' percent. Open to edit dates.')+'"><span class="w-bar-fill" style="width:'+pct+'%"></span><span class="w-bar-name">'+esc(t.title)+'</span>'+(editable(t)?'<span class="w-resize" data-resize title="Drag to change due date" aria-hidden="true"></span>':'')+'</button></div></div>';
    });
    const now=distance(start,today());
    return '<section class="w-timeline" aria-labelledby="timelineTitle"><div class="w-card-head"><div><h2 id="timelineTitle">'+icon('timeline')+'The plan</h2><p>'+pretty(start)+' — '+pretty(shift(start,span-1))+'</p></div><div class="w-chart-controls"><select aria-label="Timeline range" id="wScale"><option value="14" '+(span===14?'selected':'')+'>2 weeks</option><option value="30" '+(span===30?'selected':'')+'>Month</option></select><button class="w-icon w-prev" data-period="-1" aria-label="Previous period">'+icon('arrow')+'</button><button class="w-btn" data-today>Today</button><button class="w-icon" data-period="1" aria-label="Next period">'+icon('arrow')+'</button></div></div>'+
      (shown.length ? '<div class="w-chart-scroll" tabindex="0" aria-label="Task timeline; scroll horizontally for later dates"><div class="w-chart" style="width:'+(width+labelWidth)+'px"><div class="w-gantt-header"><span>Task / owner</span><div class="w-ticks">'+ticks+'</div></div>'+chart+(now>=0 && now<span?'<div class="w-now" style="left:'+(labelWidth+now*44+22)+'px" aria-hidden="true"></div>':'')+'</div></div>' : empty(dated.length?'Nothing in this window':'Your timeline starts here',dated.length?'Use Today or the arrows to explore other dates.':'Add a start and due date to put a task on the plan.',!rows.length))+
      '<div class="w-chart-foot"><span><i></i> In progress <i class="blocked"></i> Blocked <i class="completed"></i> Done</span><span>'+(unscheduled?unscheduled+' without both dates · ':'')+'Drag to move · edge to resize · click to edit</span></div></section>';
  }
  function render() {
    const dashboard=document.body.dataset.page==='dashboard';
    const all=scoped(), remaining=all.filter(active);
    root.innerHTML='<h1 class="sr-only">'+(dashboard?'Dashboard':'Tasks')+'</h1><header class="w-minimal-head">'+scopeControl()+'<div class="w-head-actions">'+(can('tasks.create')?'<a class="w-add" href="officers.html?add=1" aria-label="Add task">'+icon('plus')+'<span>Add task</span></a>':'')+'<button class="w-icon" data-refresh aria-label="Refresh workspace" '+(state.loading?'disabled':'')+'>'+icon('refresh')+'</button></div></header><span class="w-sync sr-only" role="status">'+(state.loading?'Syncing…':state.error?'Not synced':'Saved to SICA')+'</span>'+
      (state.error?'<div class="w-error" role="alert"><b>Tasks could not be loaded</b><p>'+esc(state.error)+(state.loaded?' Showing the last loaded view.':' This is not an empty task list.')+'</p><button class="w-btn" data-refresh>Try again</button></div>':'')+
      (state.extraError?'<p class="w-warning" role="status">'+esc(state.extraError)+'</p>':'');
    if(!state.loaded) {if(!state.error) root.insertAdjacentHTML('beforeend','<div class="w-loading" role="status">Loading your plan…</div>'); return;}
    if(dashboard) {
      root.insertAdjacentHTML('beforeend',timeline(sorted(remaining)));
      const next=state.meetings.filter(m=>m.date && m.date.slice(0,10)>=today() && m.status!=='cancelled' && m.status!=='completed').sort((a,b)=>a.date.localeCompare(b.date))[0];
      root.insertAdjacentHTML('beforeend','<aside class="w-next-meeting"><span>Next meeting: '+esc(next?next.topic||'Team meeting':'Not scheduled')+'</span><a href="meetings.html">View meetings →</a></aside>');
    }
    {
      root.insertAdjacentHTML('beforeend','<div class="w-toolbar"><label class="w-search"><span class="sr-only">Search tasks</span><input id="wSearch" type="search" placeholder="Find a task or owner…" value="'+esc(state.search)+'"></label><select id="wFilter" aria-label="Filter by status">'+Object.entries({active:'Active tasks',all:'All tasks',...STATUS}).map(([v,label])=>'<option value="'+v+'" '+(state.filter===v?'selected':'')+'>'+label+'</option>').join('')+'</select></div><div id="wResults"></div>');
      renderResults();
    }
  }
  function renderResults() {
    const result=document.getElementById('wResults'); if(!result)return;
    const rows=visible(); result.innerHTML='<section class="w-task-list" aria-label="Task list">'+(rows.length?rows.map(row).join(''):empty('No tasks here',state.search?'Try another search.':'Change the filter or add the next thing to do.',!state.search))+'</section>';
  }
  async function load() {
    const token=++loadGeneration; state.loading=true; render();
    const results=await Promise.allSettled([DB.tasks.list(), DB.officers.list(), DB.meetings.list()]);
    if(token!==loadGeneration)return;
    state.loading=false; state.error=''; state.extraError='';
    if(results[0].status==='fulfilled') {state.rows=results[0].value; state.loaded=true;}
    else state.error=results[0].reason.message||'Check your connection and try again.';
    if(results[1].status==='fulfilled')state.people=results[1].value; else state.extraError='Officer names could not load. Role assignments are still available. ';
    if(results[2].status==='fulfilled')state.meetings=results[2].value; else state.extraError+='Meeting information is unavailable. Retry to check your next meeting.';
    render();
    const params=new URL(location.href).searchParams;
    if(params.has('add') && !panel.open && state.loaded)openEditor();
    else if(params.has('task') && !panel.open && state.loaded)openEditor(params.get('task'));
  }
  function navigate(url, fromHistory) {
    if(!closeEditor())return false;
    closeMobileMenu();
    const path=url.pathname.split('/').pop();
    url.pathname=url.pathname.replace(/tasks\.html$/, 'officers.html');
    if(url.searchParams.has('scope'))state.scope=can('tasks.view_team')&&url.searchParams.get('scope')==='team'?'team':'mine';
    document.body.dataset.page='dashboard';
    document.title='SICA — Dashboard';
    root.setAttribute('aria-label','Dashboard');
    document.querySelectorAll('#rail .navitem').forEach(a=>{
      const selected=new URL(a.href).pathname===url.pathname;
      a.classList.toggle('on',selected); if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    if(!fromHistory)history.pushState({},'',url.pathname+url.search);
    render(); window.scrollTo({top:0,behavior:'instant'});
    if(url.searchParams.has('add'))openEditor();
    else if(url.searchParams.has('task'))openEditor(url.searchParams.get('task'));
    else {root.tabIndex=-1; root.focus({preventScroll:true});}
    return true;
  }
  function choices(values, value) {return Object.entries(values).map(([key,label])=>'<option value="'+esc(key)+'" '+(key===value?'selected':'')+'>'+esc(label)+'</option>').join('');}
  function formSnapshot(){return JSON.stringify(Array.from(new FormData(panel.querySelector('form')).entries()));}
  function dirty(){return panel && panel.open && formSnapshot()!==initialForm;}
  function closeEditor(force) {
    if(!panel || !panel.open)return true;
    if(state.saving)return false;
    if(!force && dirty() && !confirm('Discard your unsaved task changes?'))return false;
    panel.close(); document.body.classList.remove('w-panel-open'); ++panelGeneration;
    if(returnFocus && returnFocus.isConnected)returnFocus.focus();
    // Do not reopen a completed draft when the current URL is refreshed.
    const url=new URL(location.href); if(url.searchParams.has('add') || url.searchParams.has('task')) {url.searchParams.delete('add');url.searchParams.delete('task');history.replaceState({},'',url.pathname+url.search);}
    return true;
  }
  function openEditor(id) {
    if(panel.open && !closeEditor())return;
    const t=id?state.rows.find(t=>t.id===id):null;
    if(id && !t)return;
    if(!t && !can('tasks.create'))return;
    panelTask=t; returnFocus=document.activeElement;
    const readOnly=t && !editable(t), self=profile();
    let owners={};
    if(can('tasks.assign')) {
      Object.entries(window.SICA_ROLES.all).filter(([key])=>key!=='member').forEach(([key,r])=>{owners['role:'+key]=r.label+' · role';});
      state.people.filter(p=>p.role!=='member' && window.SICA_ROLES.all[p.role]).forEach(p=>{owners['person:'+p.id]=(p.full_name||roleName(p.role))+' · '+roleName(p.role);});
    } else {owners['person:'+self.id]=(self.full_name||'Me')+' · '+roleName(role());}
    const defaultOwner=window.SICA_ROLES.isImpersonating()?'role:'+role():'person:'+self.id;
    let selected=t ? (t.owner_id?'person:'+t.owner_id:'role:'+t.owner_role) : defaultOwner;
    if(!(selected in owners)) owners[selected]=t?owner(t):(self.full_name||roleName(role()));
    panel.innerHTML='<div class="w-panel-head"><span class="w-eyebrow">'+(t?'Task details':'A clear next step')+'</span><button class="w-icon" type="button" data-close aria-label="Close task editor">'+icon('close')+'</button></div><form id="wTaskForm"><div class="w-panel-content"><h2 id="wPanelTitle">'+(t?'Edit task':'New task')+'</h2><fieldset '+(readOnly?'disabled':'')+'><label>What needs to get done?<input name="title" required maxlength="140" placeholder="e.g. Draft the first meeting plan" value="'+esc(t?t.title:'')+'" autofocus></label><label>Owner<select name="owner" '+(!can('tasks.assign')?'disabled':'')+'>'+choices(owners,selected)+'</select></label><div class="w-fields"><label>Start<input name="start_date" type="date" value="'+esc(t?t.start_date||'':today())+'"></label><label>Due<input name="due" type="date" value="'+esc(t?t.due||'':'')+'"></label></div><div class="w-fields"><label>Status<select name="status">'+choices(STATUS,t?t.status:'not_started')+'</select></label><label>Priority<select name="priority">'+choices(PRIORITY,t?t.priority:'medium')+'</select></label></div><label>What does done look like?<textarea name="description" rows="3" maxlength="10000" placeholder="A little context helps someone start without asking.">'+esc(t?t.description:'')+'</textarea></label><details '+(t?'open':'')+'><summary>More details</summary><div class="w-fields"><label>Progress (%)<input name="progress" type="number" min="0" max="100" step="1" value="'+(t?Number(t.progress)||0:0)+'"></label><label>Project<input name="category" maxlength="60" placeholder="e.g. Club launch" value="'+esc(t?t.category:'')+'"></label></div></details></fieldset>'+(t?'<section class="w-history"><h3>Activity</h3><div id="wHistory" role="status">Loading task history…</div></section>':'')+'<p class="w-form-error" id="wFormError" role="alert"></p></div><footer class="w-panel-actions">'+(t && can('tasks.archive')?'<button type="button" class="w-btn" data-archive>Archive</button>':'')+'<button type="button" class="w-btn" data-close>Cancel</button>'+(!readOnly?'<button class="w-btn w-primary" type="submit">'+(t?'Save changes':'Create task')+'</button>':'')+'</footer></form>';
    const selectedRoles=t?.assignee_roles||[];
    const assignees='<fieldset class="w-assignees" '+(!can('tasks.assign')||readOnly?'disabled':'')+'><legend>Assignees</legend><p>Share this task with one or more officer roles. The owner stays accountable.</p><div>'+Object.entries(SICA_ROLES.all).filter(([key])=>key!=='member').map(([key,r])=>'<label><input type="checkbox" name="assignee_roles" value="'+key+'" '+(selectedRoles.includes(key)?'checked':'')+'><span>'+esc(r.label)+'</span></label>').join('')+'</div></fieldset>';
    panel.querySelector('[name="owner"]').closest('label').insertAdjacentHTML('afterend',assignees);
    initialForm=formSnapshot(); panel.showModal(); document.body.classList.add('w-panel-open');
    const generation=++panelGeneration;
    if(t)DB.taskActivity.list(t.id).then(items=>{
      if(generation!==panelGeneration)return;
      const target=document.getElementById('wHistory');
      target.innerHTML=items.length?items.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,12).map(a=>'<p><b>'+esc(a.action)+'</b><span>'+esc(a.detail||'')+'</span><small>'+esc(new Date(a.created_at).toLocaleString())+'</small></p>').join(''):'<p>No activity recorded yet.</p>';
    }).catch(()=>{if(generation===panelGeneration)document.getElementById('wHistory').textContent='History could not load. Close and reopen to retry.';});
  }
  async function save(event) {
    event.preventDefault(); if(state.saving)return;
    const form=event.target, data=new FormData(form), error=document.getElementById('wFormError'); error.textContent='';
    if(!form.reportValidity())return;
    const title=data.get('title').trim(); if(!title){error.textContent='Give this task a name.';return;}
    const start=data.get('start_date')||null, due=data.get('due')||null;
    if(start && due && start>due){error.textContent='The due date must be on or after the start date.';return;}
    const assignment=form.elements.owner.value, type=assignment.split(':')[0], key=assignment.slice(assignment.indexOf(':')+1);
    const person=state.people.find(p=>p.id===key) || (key===profile().id?profile():null);
    let patch={title,description:data.get('description').trim(),start_date:start,due,priority:data.get('priority'),status:data.get('status'),progress:Number(data.get('progress')),category:data.get('category').trim()||null};
    if(can('tasks.assign') || !panelTask) {
      if(can('tasks.assign') && (data.getAll('assignee_roles').length || panelTask?.assignee_roles))patch.assignee_roles=data.getAll('assignee_roles');
      patch.owner_id=type==='person'?key:null;
      patch.owner_role=type==='person'?(person?person.role:(panelTask && panelTask.owner_id===key?panelTask.owner_role:null)):key;
      if(!patch.owner_role){error.textContent='The selected owner could not be verified. Refresh officer names and try again.';return;}
    }
    if(patch.progress===100 && (!panelTask || panelTask.status!=='completed'))patch.status='completed';
    patch.progress=patch.status==='completed'?100:Math.min(99,patch.progress);
    patch.completed_at=patch.status==='completed'?(panelTask && panelTask.completed_at || new Date().toISOString()):null;
    patch.completed_by=patch.status==='completed'?(panelTask && panelTask.completed_by || profile().id):null;
    setSaving(true);
    try {
      const row=panelTask?await DB.tasks.update(panelTask.id,patch):await DB.tasks.create(patch);
      if(!row || !row.id)throw new Error('The database did not confirm this save. Your changes are still here.');
      replaceRow(row); setSaving(false); closeEditor(true); render(); toast('Task saved to SICA.');
    } catch(e) {setSaving(false); error.textContent='Not saved. '+(/assignee_roles/.test(e.message)?'Shared assignments need the October 25 database update. Ask the founder to run it in Supabase; your draft is still here.':(e.message||'Check your connection and try again.'));}
  }
  function setSaving(value){state.saving=value;panel.querySelectorAll('button').forEach(b=>b.disabled=value);panel.setAttribute('aria-busy',String(value));}
  function replaceRow(row){const i=state.rows.findIndex(t=>t.id===row.id);if(i<0)state.rows.push(row);else state.rows[i]=row;}
  async function complete(id, button) {
    const t=state.rows.find(t=>t.id===id);if(!t || !editable(t))return;
    button.disabled=true;
    try {const row=await DB.tasks.complete(id,active(t));if(!row || !row.id)throw new Error('The database did not confirm the change.');replaceRow(row);render();toast(active(row)?'Task reopened.':'Task completed. You can reopen it in All tasks.');}
    catch(e){button.disabled=false;toast('Not saved. '+e.message,true);}
  }
  async function archive(){
    if(!panelTask || !can('tasks.archive') || !confirm('Archive this task? It will leave the active workspace; its database record and history are kept.'))return;
    setSaving(true);
    try{const id=panelTask.id;const result=await DB.tasks.archive(id);if(!result || !result.id)throw new Error('The database did not confirm archiving.');state.rows=state.rows.filter(t=>t.id!==id);setSaving(false);closeEditor(true);render();toast('Task archived.');}
    catch(e){setSaving(false);document.getElementById('wFormError').textContent='Not archived. '+e.message;}
  }
  function startDrag(event) {
    const bar=event.target.closest('[data-bar]'); if(!bar || event.button!==0)return;
    const task=state.rows.find(t=>t.id===bar.dataset.bar);if(!task || !editable(task))return;
    drag={bar,task,x:event.clientX,delta:0,resize:!!event.target.closest('[data-resize]'),width:bar.offsetWidth,moved:false};
    bar.setPointerCapture(event.pointerId);
  }
  function moveDrag(event) {
    if(!drag)return;
    const delta=Math.round((event.clientX-drag.x)/44);if(Math.abs(event.clientX-drag.x)>6)drag.moved=true;
    drag.delta=drag.resize?Math.max(-distance(drag.task.start_date,drag.task.due),delta):delta;
    if(drag.moved){drag.bar.classList.add('dragging');if(drag.resize)drag.bar.style.width=Math.max(20,drag.width+drag.delta*44)+'px';else drag.bar.style.transform='translateX('+(drag.delta*44)+'px)';}
  }
  async function endDrag(event) {
    if(!drag)return; const d=drag;drag=null;
    if(d.bar.hasPointerCapture(event.pointerId))d.bar.releasePointerCapture(event.pointerId);
    if(!d.moved)return;
    // Suppress the click generated by pointerup after a drag.
    d.bar.dataset.dragged='true';
    if(!d.delta){render();return;}
    const patch={due:shift(d.task.due,d.delta)};if(!d.resize)patch.start_date=shift(d.task.start_date,d.delta);
    d.bar.disabled=true;toast('Saving dates…');
    try {const row=await DB.tasks.update(d.task.id,patch);if(!row||!row.id)throw new Error('No save confirmation.');replaceRow(row);render();toast('Dates saved · '+pretty(row.start_date)+' — '+pretty(row.due));}
    catch(e){render();toast('Dates not saved. '+e.message,true);}
  }
  function closeMobileMenu() {
    if(window.sicaMobileNav)window.sicaMobileNav.close();
  }
  window.sicaPageInit=function () {
    root=document.getElementById('dailyWorkspace');DB=window.SICA_DB;if(!root || !DB)return;
    const params=new URL(location.href).searchParams;
    state.scope=can('tasks.view_team') && params.get('scope')!=='mine'?'team':'mine';
    if(params.get('view')==='timeline')state.view='timeline';
    mobileMenu=window.sicaMobileNav.dialog;
    panel=document.createElement('dialog');panel.className='w-panel';panel.setAttribute('aria-labelledby','wPanelTitle');document.body.appendChild(panel);
    document.body.insertAdjacentHTML('beforeend','<div id="workNotice" class="w-notice" role="status" aria-live="polite" hidden></div>');
    panel.addEventListener('cancel',e=>{e.preventDefault();closeEditor();});
    panel.addEventListener('submit',save);
    panel.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeEditor();else if(e.target.closest('[data-archive]'))archive();});
    document.addEventListener('click',e=>{
      const link=e.target.closest('a[href]');
      if(link && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey && e.button===0 && !link.target && !link.hasAttribute('download')) {
        const url=new URL(link.href);if(url.origin===location.origin && ['officers.html','tasks.html'].includes(url.pathname.split('/').pop())) {e.preventDefault();navigate(url);return;}
        if(mobileMenu.open)closeMobileMenu();
      }
      const b=e.target.closest('button');if(!b || !root.contains(b))return;
      if(b.hasAttribute('data-refresh'))load();
      if(b.dataset.scope){state.scope=b.dataset.scope;render();}
      if(b.dataset.view){state.view=b.dataset.view;render();}
      if(b.dataset.edit)openEditor(b.dataset.edit);
      if(b.dataset.complete)complete(b.dataset.complete,b);
      if(b.hasAttribute('data-period')){state.offset+=Number(b.dataset.period)*state.scale;render();}
      if(b.hasAttribute('data-today')){state.offset=0;render();}
      if(b.dataset.bar){if(b.dataset.dragged){delete b.dataset.dragged;return;}openEditor(b.dataset.bar);}
    });
    root.addEventListener('input',e=>{if(e.target.id==='wSearch'){state.search=e.target.value;renderResults();}});
    root.addEventListener('change',e=>{if(e.target.id==='wFilter'){state.filter=e.target.value;renderResults();}if(e.target.id==='wScale'){state.scale=Number(e.target.value);render();}});
    root.addEventListener('pointerdown',startDrag);root.addEventListener('pointermove',moveDrag);root.addEventListener('pointerup',endDrag);
    root.addEventListener('pointercancel',()=>{drag=null;render();});
    window.addEventListener('popstate',()=>{if(!navigate(new URL(location.href),true))history.pushState({},'',document.body.dataset.page==='tasks'?'tasks.html':'officers.html');});
    window.addEventListener('beforeunload',e=>{if(dirty()||state.saving){e.preventDefault();e.returnValue='';}});
    window.addEventListener('online',()=>{if(!panel.open)load();});
    window.addEventListener('focus',()=>{if(!panel.open && !drag && !state.loading)load();});
    load();
  };
})();
