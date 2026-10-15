/* Shared, database-backed officer utilities. No browser-local data fallback. */
(function(){
  'use strict';
  const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const svg=path=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+path+'"/></svg>';
  const fileIcon=svg('M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6');
  const plus=svg('M12 5v14M5 12h14');
  let DB,R,main,page,docs=[],signups=[],calendarData=[],month=new Date(new Date().getFullYear(),new Date().getMonth(),1),busy=false;
  const leader=()=>['founder','president'].includes(R.active());
  const shortDate=v=>v?new Date(v.slice(0,10)+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Date not recorded';
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  function header(title,description,actions=''){main.innerHTML='<header class="h-heading"><div><h1>'+title+'</h1>'+(description?'<p>'+description+'</p>':'')+'</div><div class="h-actions">'+actions+'<button class="h-button" data-reload aria-label="Refresh page">↻</button></div></header><p id="hubMessage" role="alert"></p><div id="hubContent"></div>';}
  function content(html){document.getElementById('hubContent').innerHTML=html;}
  function error(e){document.getElementById('hubMessage').textContent=e.message||'Could not load. Check your connection, then refresh.';}
  function downloadBlob(text,name,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function csvCell(value){let s=String(value==null?'':value);if(/^[=+@\-\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
  function fileDetails(d){return '<details class="h-details"><summary>Details</summary><div><b>'+esc(d.purpose||'No purpose added yet.')+'</b><span>Added '+shortDate(d.created_at||d.updated_at)+'</span><span>'+esc(d.file_name||'Linked resource')+(d.size_bytes?' · '+(d.size_bytes/1024/1024).toFixed(1)+' MB':'')+'</span><span>'+esc(d.owner_role==='president'?'President & Founder only':'All officers')+'</span></div></details>';}
  const safeURL=value=>{try{const u=new URL(value,location.href);return ['http:','https:'].includes(u.protocol)?u.href:null;}catch(_){return null;}};
  function resourceCard(title,url,purpose,download){const safe=safeURL(url);if(!safe)return '';return '<article class="h-file">'+fileIcon+'<div class="h-file-copy"><a href="'+esc(safe)+'" target="_blank" rel="noopener">'+esc(title)+'</a><span>'+esc(purpose)+'</span></div><div class="h-file-actions">'+(download?'<button class="h-button" data-handbook>Download</button>':'')+'<a class="h-button" href="'+esc(safe)+'" target="_blank" rel="noopener">Open ↗</a></div></article>';}
  function drawDocs(){
    const search=(document.getElementById('documentSearch')?.value||'').toLowerCase();
    const list=docs.filter(d=>(d.title+' '+(d.purpose||'')+' '+(d.category||'')).toLowerCase().includes(search));
    document.getElementById('uploadedDocs').innerHTML=list.length?list.map(d=>'<article class="h-file">'+fileIcon+'<div class="h-file-copy"><button class="h-file-title" data-open="'+esc(d.id)+'">'+esc(d.title)+'</button><span>'+esc(d.category||'Document')+' · '+shortDate(d.created_at||d.updated_at)+'</span>'+fileDetails(d)+'</div><div class="h-file-actions"><button class="h-button" data-download="'+esc(d.id)+'">Download</button><button class="h-button" data-open="'+esc(d.id)+'" aria-label="Open '+esc(d.title)+'">Open ↗</button></div></article>').join(''):'<p class="h-empty">'+(search?'No documents match.':'No uploaded documents yet. Add the first file above.')+'</p>';
  }
  async function references(){
    header('References','Your files, handbooks, and useful links.','<button class="h-button primary" id="uploadFile">'+plus+'Upload file</button>');
    content('<label class="h-search"><span class="sr-only">Find a document</span><input id="documentSearch" type="search" placeholder="Find a document…"></label><h2 class="h-section">Files from the team</h2><div id="uploadedDocs"><p role="status">Loading shared files…</p></div><h2 class="h-section" id="handbooks">Handbooks & guides</h2>'+resourceCard('Officer Handbook','handbook.html','How SICA is run · 10 chapters',true)+'<h2 class="h-section">Workspace resources</h2><div id="builtInDocs"></div>');
    const seen=new Set(['handbook.html']);let links='';
    (window.SICA_REFERENCES||[]).forEach(g=>g.items.forEach(i=>{if(i.url&&!seen.has(i.url)){seen.add(i.url);links+=resourceCard(i.title.replace(/&amp;/g,'&'),i.url,g.group.replace(/&amp;/g,'&'));}}));
    links+=resourceCard('Meeting minutes','minutes.html','Decisions and meeting records');
    if(leader())links+=resourceCard('Saved officer application form','officer-form.html','Reusable form preview; submissions disabled');
    document.getElementById('builtInDocs').innerHTML=links;
    document.getElementById('builtInDocs').insertAdjacentHTML('afterend','<details class="h-missing"><summary>Resources still awaiting an upload</summary><p class="h-muted">These appeared as placeholder cards in the old Library, but had no attached file or link. Uploaded documents are listed above.</p><ul><li>Constitution</li><li>Logo assets</li><li>Presentation template</li><li>Recruitment slides</li><li>Flyers</li><li>Social templates</li></ul></details>');
    document.getElementById('documentSearch').addEventListener('input',drawDocs);
    const uploaded=document.getElementById('uploadedDocs');
    uploaded.addEventListener('pointerover',e=>{if(e.pointerType!=='mouse')return;const card=e.target.closest('.h-file'),details=card&&card.querySelector('details');if(details&&!details.open){details.open=true;details.dataset.hover='true';}});
    uploaded.addEventListener('pointerout',e=>{const card=e.target.closest('.h-file');if(!card||card.contains(e.relatedTarget))return;const details=card.querySelector('details[data-hover]');if(details){details.open=false;delete details.dataset.hover;}});
    uploaded.addEventListener('click',e=>{if(e.target.closest('summary')){const details=e.target.closest('details');delete details.dataset.hover;}});
    document.getElementById('uploadFile').addEventListener('click',()=>document.getElementById('hubFileInput').click());
    try{docs=(await DB.documents.list({metadataOnly:true})).filter(d=>d.owner_role!=='president'||leader());drawDocs();}
    catch(e){document.getElementById('uploadedDocs').innerHTML='<p class="h-empty">Files could not be loaded. Your shared files have not been replaced with a local copy.</p>';error(e);}
  }
  function setupUpload(){
    const input=document.createElement('input');input.type='file';input.id='hubFileInput';input.hidden=true;document.body.appendChild(input);
    const dialog=document.createElement('dialog');dialog.className='h-dialog';dialog.id='uploadDialog';dialog.setAttribute('aria-labelledby','uploadTitle');document.body.appendChild(dialog);
    let selected;
    input.addEventListener('change',()=>{
      selected=input.files[0];if(!selected)return;
      if(!selected.size||selected.size>50*1024*1024){error(new Error('Choose a non-empty file up to 50 MB.'));input.value='';return;}
      dialog.innerHTML='<form id="uploadForm"><div class="h-heading"><h2 id="uploadTitle">Add a reference</h2><button class="h-button" type="button" data-close-upload aria-label="Close upload">×</button></div><p class="h-muted">'+esc(selected.name)+' · '+(selected.size/1024/1024).toFixed(1)+' MB</p><label>Document name<input name="title" required maxlength="140" value="'+esc(selected.name.replace(/\.[^.]+$/,''))+'"></label><label>What is it for?<textarea name="purpose" maxlength="500" rows="2" placeholder="A short note for the next person"></textarea></label><label>Folder<select name="category"><option>Reference files</option><option>Handbooks & Guides</option><option>Governing documents</option><option>Brand & assets</option><option>Recruitment</option></select></label>'+(leader()?'<label>Who can access it?<select name="visibility"><option value="all">All officers</option><option value="president">President & Founder only</option></select></label>':'')+'<p id="uploadError" role="alert"></p><div class="h-actions"><button class="h-button" type="button" data-close-upload>Cancel</button><button class="h-button primary" type="submit">Upload & save</button></div></form>';
      dialog.showModal();dialog.querySelector('input').focus();
    });
    dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
    dialog.addEventListener('click',e=>{if(e.target.closest('[data-close-upload]')&&!busy){dialog.close();input.value='';}});
    dialog.addEventListener('submit',async e=>{
      e.preventDefault();if(busy)return;const data=new FormData(e.target);if(!data.get('title').trim())return;
      busy=true;dialog.querySelectorAll('button').forEach(b=>b.disabled=true);const submit=dialog.querySelector('[type=submit]');submit.textContent='Uploading…';document.getElementById('uploadError').textContent='';
      try{await DB.documents.upload(selected,{title:data.get('title').trim(),purpose:data.get('purpose').trim(),category:data.get('category'),owner_role:data.get('visibility')==='president'?'president':null});dialog.close();input.value='';await references();}
      catch(e){document.getElementById('uploadError').textContent='Not saved. '+e.message;}
      finally{busy=false;dialog.querySelectorAll('button').forEach(b=>b.disabled=false);submit.textContent='Upload & save';}
    });
  }
  async function openDocument(id,download,button){
    // Open a blank tab synchronously so a slow signed-URL request isn't blocked.
    const tab=window.open('about:blank','_blank');if(tab){tab.opener=null;tab.document.body.textContent='Opening your reference…';}
    button.disabled=true;
    try{const url=await DB.documents.fileUrl(id,download);if(tab)tab.location.replace(url);else {const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';a.textContent='Open your file';document.getElementById('hubMessage').replaceChildren('Your browser blocked the new tab. ',a);}}
    catch(e){if(tab)tab.close();error(e);}finally{button.disabled=false;}
  }
  async function handbook(button){
    button.disabled=true;
    try{
      const [html,css]=await Promise.all([fetch('handbook.html'),fetch('officers.css?v=17')]);
      if(!html.ok||!css.ok)throw new Error('The handbook could not be downloaded.');
      const parsed=new DOMParser().parseFromString(await html.text(),'text/html'),body=parsed.querySelector('main'),roles=window.SICA_ROLE_EXPECTATIONS;
      if(!roles)throw new Error('Role expectations could not load. Refresh before downloading.');
      // The normal handbook builds this chapter with JS. Include its current
      // source data in the standalone download, with no scripts or sign-in gate.
      body.querySelector('#roleExpList').innerHTML=roles.order.map(id=>{
        const r=roles.roles[id];if(!r)return '';
        return '<section class="role-x"><h3>'+esc(r.label)+'</h3>'+(r.aside?'<p>'+esc(r.aside)+'</p>':'')+'<dl>'+[['What you own',r.owns],['Weekly commitment',r.commitment],['What success looks like',r.success],['You report to',r.reportsTo]].filter(pair=>pair[1]).map(pair=>'<dt>'+esc(pair[0])+'</dt><dd>'+esc(pair[1])+'</dd>').join('')+'</dl>'+(r.reality?'<p class="rx-real"><b>Reality check. </b>'+esc(r.reality)+'</p>':'')+'</section>';
      }).join('')+'<p>'+esc(roles.universal||'')+'</p>';
      body.querySelectorAll('script,button').forEach(el=>el.remove());
      downloadBlob('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SICA Officer Handbook</title><style>'+await css.text()+'main{margin:auto}</style></head><body class="unlocked">'+body.outerHTML+'</body></html>','SICA-Officer-Handbook.html','text/html');
    }
    catch(e){error(e);}finally{button.disabled=false;}
  }
  function drawSignups(){const query=(document.getElementById('signupSearch').value||'').toLowerCase();const rows=signups.filter(r=>(r.name+' '+r.email+' '+r.grade).toLowerCase().includes(query));document.getElementById('signupCount').textContent=signups.length+' signups';document.getElementById('signupRows').innerHTML=rows.length?rows.map(r=>'<details class="h-signup"><summary><b>'+esc(r.name)+'</b><span>Grade '+r.grade+'</span><span>'+esc(r.email)+'</span><small>'+shortDate(r.created_at)+'</small></summary><div><p><strong>Interested in</strong><br>'+esc(r.interest)+'</p>'+(r.question?'<p><strong>Question</strong><br>'+esc(r.question)+'</p>':'')+'<p class="h-muted">Student ID: '+esc(r.student_id)+'</p></div></details>').join(''):'<p class="h-empty">'+(query?'No matching signups.':'No interest signups yet.')+'</p>';}
  async function interests(){
    header('Interest signups','The mailing list—not officer applications.','<button class="h-button" id="exportSignups" disabled>Export CSV</button><a class="h-button primary" href="interest.html" target="_blank">Open form ↗</a>');
    if(!['founder','president','vp'].includes(R.active())){content('<p class="h-empty">Interest signups are restricted to the President and Vice President, including the Founder.</p>');return;}
    content('<p class="h-muted">Export this list for club updates. Signing up does not create a member account or automatically send email.</p><div class="h-list-tools"><label class="h-search"><span class="sr-only">Search signups</span><input id="signupSearch" type="search" placeholder="Search name, email, or grade"></label><span id="signupCount" role="status">Loading…</span></div><div id="signupRows"></div>');
    try{signups=await DB.interest.list();drawSignups();document.getElementById('exportSignups').disabled=false;}
    catch(e){document.getElementById('signupCount').textContent='Not loaded';error(e);}
    document.getElementById('signupSearch').addEventListener('input',drawSignups);
    document.getElementById('exportSignups').onclick=()=>downloadBlob([['Name','Grade','Email','Interest','Question','Signed up'],...signups.map(r=>[r.name,r.grade,r.email,r.interest,r.question,r.created_at])].map(row=>row.map(csvCell).join(',')).join('\r\n'),'SICA-interest-signups.csv','text/csv;charset=utf-8');
  }
  function drawCalendar(){
    const label=month.toLocaleDateString(undefined,{month:'long',year:'numeric'});document.getElementById('calendarLabel').textContent=label;
    const offset=(month.getDay()+6)%7,last=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();let cells='';
    for(let i=0;i<offset;i++)cells+='<div class="h-day blank" aria-hidden="true"></div>';
    for(let n=1;n<=last;n++){const key=iso(new Date(month.getFullYear(),month.getMonth(),n)),items=calendarData.filter(e=>e.date===key);cells+='<div class="h-day '+(key===iso(new Date())?'today':'')+'"><b>'+n+'</b>'+items.map(e=>'<a class="h-calendar-item '+e.kind+'" href="'+esc(e.href)+'" title="'+esc(e.title)+'">'+esc(e.title)+'</a>').join('')+'</div>';}
    document.getElementById('calendarGrid').innerHTML=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(s=>'<span class="h-weekday">'+s+'</span>').join('')+cells;
  }
  async function calendar(){
    header('Calendar','Task deadlines and meetings, together. Edit a task here or on the timeline—the date is the same.','<a class="h-button" href="tasks.html?view=timeline">Timeline ↗</a>');
    content('<div class="h-calendar-toolbar"><h2 id="calendarLabel"></h2><div class="h-actions"><button class="h-button" data-month="-1" aria-label="Previous month">←</button><button class="h-button" data-month="today">Today</button><button class="h-button" data-month="1" aria-label="Next month">→</button></div></div><div class="h-calendar-scroll"><div class="h-calendar" id="calendarGrid"></div></div><p class="h-muted">Gold: task due · Green: meeting · Neutral: club event. Click a task to edit.</p>');
    calendarData=[];const results=await Promise.allSettled([DB.tasks.list(),DB.meetings.list(),DB.calendar.list()]);
    if(results[0].status==='fulfilled')results[0].value.filter(t=>t.due).forEach(t=>calendarData.push({title:t.title,date:t.due,kind:'task '+(t.status==='completed'?'complete':''),href:'tasks.html?task='+encodeURIComponent(t.id)}));
    if(results[1].status==='fulfilled')results[1].value.filter(m=>m.date&&m.status!=='cancelled').forEach(m=>calendarData.push({title:m.topic||'Meeting',date:m.date.slice(0,10),kind:'meeting',href:'meetings.html'}));
    if(results[2].status==='fulfilled')results[2].value.filter(e=>e.date).forEach(e=>calendarData.push({title:e.title,date:e.date.slice(0,10),kind:'event',href:'calendar.html'}));
    if(results.some(r=>r.status==='rejected'))error(new Error('Some dates could not load. Refresh before treating this as your complete schedule.'));
    drawCalendar();
  }
  async function settings(){
    header('Settings','Your workspace, your way.');const personal='<section class="sidebar-settings-entry"><h2>Your sidebar</h2><p class="h-muted">Pin important tabs and rearrange them. This changes only your account.</p><button class="h-button" data-sidebar-settings>Customize sidebar</button></section>';if(!leader()){content(personal+'<p class="h-muted">Club-wide settings are managed by leadership.</p>');return;}
    content(personal+'<p role="status">Loading club details…</p>');
    try{const value=await DB.settings.get('club_details',{});content(personal+'<form id="clubSettings" class="h-settings"><label>Club contact email<input name="email" type="email" required value="'+esc(value.email||'thesicaorg@gmail.com')+'"></label><label>Faculty advisor<input name="advisor" maxlength="140" value="'+esc(value.advisor||'')+'"></label><label>Usual meeting room<input name="room" maxlength="100" value="'+esc(value.room||'')+'"></label><label>Discord invite link <span class="h-muted">optional</span><input name="discord" type="url" value="'+esc(value.discord||'')+'" placeholder="https://discord.gg/…"></label><p class="h-muted">Meeting dates live in Meetings. Tasks and Calendar share deadlines automatically.</p><button class="h-button primary">Save details</button><p id="settingsResult" role="status"></p></form>');
      document.getElementById('clubSettings').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const button=e.target.querySelector('button');button.disabled=true;document.getElementById('settingsResult').textContent='';document.getElementById('hubMessage').textContent='';const values=Object.fromEntries(new FormData(e.target));try{const saved=await DB.settings.set('club_details',values);if(!saved||saved.key!=='club_details')throw new Error('The database did not confirm these settings. Please try again.');document.getElementById('settingsResult').textContent='Saved to SICA.';}catch(e){error(e);}finally{busy=false;button.disabled=false;}};
    }catch(e){content(personal+'<p class="h-empty">Club settings could not be loaded.</p>');error(e);}
  }
  async function founder(){header('Founder Tools','People, intake, and access.');if(!leader()){content('<p class="h-empty">This page is for the Founder and President.</p>');return;}content('<div class="h-admin-links">'+resourceCard('Officer management','officer-management.html','Manage officer invitations and roles')+resourceCard('Interest signups','interests.html','Student interest and the mailing list')+resourceCard('Officer applications','applications.html','Existing submissions and review actions')+resourceCard('Saved officer form','officer-form.html','Preserved for the next recruitment round')+resourceCard('Settings','settings.html','Club contact details')+'</div><button class="h-button" id="checkConnection">Check connection</button><p id="connectionResult" role="status"></p>');document.getElementById('checkConnection').onclick=async e=>{e.target.disabled=true;try{const result=await SICA_AUTH.ping();document.getElementById('connectionResult').textContent=result.ok?'Supabase is reachable. Private data access is checked by each page.':'Connection issue: '+result.reason;}finally{e.target.disabled=false;}};}
  async function analytics(){header('Analytics','A snapshot of recorded activity, not website traffic.');if(!leader()){content('<p class="h-empty">Analytics is for club leadership.</p>');return;}try{const [tasks,members,meetings]=await Promise.all([DB.tasks.list(),DB.members.list(),DB.meetings.list()]);const complete=tasks.filter(t=>t.status==='completed').length,held=meetings.filter(m=>m.status==='held'||m.status==='completed').length;content('<div class="h-metrics">'+[['Members',members.length],['Tasks completed',complete+' / '+tasks.length],['Meetings held',held+' / '+meetings.length]].map(([label,value])=>'<section><span>'+label+'</span><b>'+value+'</b></section>').join('')+'</div><p class="h-muted">These totals come from Members, Tasks, and Meetings. Attendance retention, website visits, and recruitment conversion are not measured here yet.</p>');}catch(e){error(e);}}
  async function members(){header('Members','The club roster. Interest-form signups stay in the mailing list until membership is recorded.');try{const [members,people]=await Promise.all([DB.members.list(),DB.officers.list()]);content('<label class="h-search"><span class="sr-only">Search members</span><input id="memberSearch" placeholder="Search members…"></label><div id="memberRows"></div>');const draw=()=>{const q=document.getElementById('memberSearch').value.toLowerCase();const rows=members.map(m=>({...m,person:people.find(p=>p.id===m.profile_id)||{}})).filter(m=>(m.name||m.person.full_name||'Member').toLowerCase().includes(q));document.getElementById('memberRows').innerHTML=rows.length?rows.map(m=>'<article class="h-file"><div class="h-file-copy"><b>'+esc(m.name||m.person.full_name||'Member')+'</b><span>Grade '+esc(m.grade||m.person.grade||'not recorded')+' · Joined '+shortDate(m.joined_at)+'</span></div><span>'+esc(m.status||'Member')+'</span></article>').join(''):'<p class="h-empty">No members recorded in this view.</p>';};document.getElementById('memberSearch').oninput=draw;draw();}catch(e){error(e);}}
  function template(){header('Saved officer application form','Preserved for reuse. This preview cannot submit.','<a class="h-button" href="applications.html">Back to applications</a>');if(!leader()){content('<p class="h-empty">This template is for club leadership.</p>');return;}content('<iframe class="h-template" title="Saved officer application form preview" src="templates/officer-application.html" sandbox></iframe><p class="h-muted">The original source is preserved, along with the shared SICA form styles. Reopening officer intake requires an explicit database change.</p>');}
  async function load(){const actions={references,interests,calendar,settings,'founder-tools':founder,analytics,members,'officer-form':template};try{await actions[page]();}catch(e){error(e);}}
  window.sicaPageInit=function(){DB=window.SICA_DB;R=window.SICA_ROLES;main=document.getElementById('hubMain');page=document.body.dataset.page;if(!main)return;setupUpload();main.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.hasAttribute('data-sidebar-settings'))window.SICA_SIDEBAR.open();if(b.hasAttribute('data-reload')&&!busy)load();if(b.dataset.open)openDocument(b.dataset.open,false,b);if(b.dataset.download)openDocument(b.dataset.download,true,b);if(b.hasAttribute('data-handbook'))handbook(b);if(b.hasAttribute('data-month')){month=b.dataset.month==='today'?new Date(new Date().getFullYear(),new Date().getMonth(),1):new Date(month.getFullYear(),month.getMonth()+Number(b.dataset.month),1);drawCalendar();}});window.addEventListener('focus',()=>{if(page==='calendar'&&!busy)load();});window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});load();};
})();
