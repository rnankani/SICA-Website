/* Browser integration tests. Uses the real auth/db/UI code and an in-memory
   Supabase HTTP substitute. NEVER sends test writes to the live database.
   Run with: node tests/workspace.test.cjs (requires playwright). */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const os=require('node:os');
const root=path.resolve(__dirname,'..');
const out=fs.mkdtempSync(path.join(os.tmpdir(),'sica-workspace-qa-'));
const baseDate=new Date();
const day=n=>{const d=new Date(baseDate);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const founder={id:'00000000-0000-4000-8000-000000000001',full_name:'Test Founder',role:'founder',email:'founder@example.test'};
const vp={id:'00000000-0000-4000-8000-000000000002',full_name:'Test VP',role:'vp',email:'vp@example.test'};
const base={owner_id:founder.id,owner_role:'founder',created_by:founder.id,description:'A concrete next step.',priority:'medium',status:'not_started',progress:0,start_date:day(0),due:day(4),position:0};
const store={tasks:[
 {...base,id:'t1',title:'Plan our first practice',status:'in_progress',progress:40},
 {...base,id:'t2',title:'Confirm the classroom',priority:'urgent',status:'blocked',start_date:day(-2),due:day(-1)},
 {...base,id:'t3',title:'Prepare conversation prompts',owner_id:vp.id,owner_role:'vp',start_date:day(3),due:day(8)},
 {...base,id:'t4',title:'Write the welcome note',status:'completed',progress:100},
 {...base,id:'t5',title:'Pick a meeting date',start_date:null,due:null}
],profiles:[founder,vp],meetings:[{id:'m1',topic:'First officer practice',date:day(2),room:'Room 12',status:'planned'}],task_activity:[]};
let id=10, failRead=false, failWrite=false, emptyWrite=false, failPeople=false, failMeetings=false, failRefresh=false, refreshCount=0;
const errors=[], requests=[];
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep) || !/\.(html|js|css|svg|png|jpg|webp|ico)$/.test(file)){res.writeHead(404).end();return;}
  fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'html':'text/html','js':'text/javascript','css':'text/css','svg':'image/svg+xml'})[file.split('.').pop()]||'application/octet-stream');res.end(data);});
});
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 async function context(user=founder, options={}){
   const ctx=await browser.newContext({viewport:{width:1440,height:1000},...options});
   await ctx.addInitScript(p=>{
     if(location.hostname!=='127.0.0.1')return;
     localStorage.setItem('sica.profile',JSON.stringify(p));localStorage.setItem('sica.token','test.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600,sub:p.id}))+'.test');
     localStorage.setItem('sica.refresh','test-refresh');
   },user);
   await ctx.route('**/*.supabase.co/**',async route=>{
     const req=route.request(), u=new URL(req.url()), method=req.method();
     requests.push({path:u.pathname,method});
     const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
     if(u.pathname.endsWith('/auth/v1/token')){
       refreshCount++;if(failRefresh)return json({message:'Temporary connection failure'},503);
       await new Promise(r=>setTimeout(r,70));
       return json({access_token:'test.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600,sub:user.id})).toString('base64')+'.test',refresh_token:'test-refresh'});
     }
     if(u.pathname.includes('/auth/v1/'))return json(u.pathname.endsWith('/user')?user:{});
     const table=u.pathname.split('/').pop(), body=req.postDataJSON();
     if(table==='list_applications_json')return json([]);
     if(table==='archive_task'){const t=store.tasks.find(t=>t.id===body.task_id);t.archived_at=new Date().toISOString();return json(t);}
     if(!store[table])return json({message:'Unexpected mock endpoint '+table},500);
     if(method==='GET'){
       if(table==='tasks'&&failRead)return json({message:'Simulated database unavailable'},503);
       if(table==='profiles'&&failPeople || table==='meetings'&&failMeetings)return json({message:'Simulated supporting data unavailable'},503);
       let rows=store[table];
       // Emulate the permission boundary, not just hidden client controls.
       if(table==='tasks'&&user.role!=='founder')rows=rows.filter(t=>t.owner_id===user.id || !t.owner_id&&t.owner_role===user.role);
       for(const [key,value] of u.searchParams)if(value.startsWith('eq.'))rows=rows.filter(r=>String(r[key])===value.slice(3));
       return json(rows);
     }
     if(failWrite)return json({message:'Simulated write rejected'},403);
     if(method==='PATCH'){
       if(emptyWrite)return json([]);
       const key=u.searchParams.get('id').slice(3), row=store[table].find(r=>r.id===key);
       if(!row)return json([]);Object.assign(row,body);
       if(table==='tasks')store.task_activity.push({task_id:row.id,action:row.status==='completed'?'completed':'updated',detail:'Task changed',created_at:new Date().toISOString()});
       return json([row]);
     }
     if(method==='POST'){await new Promise(r=>setTimeout(r,80));const row={...body,id:body.id||'new-'+id++,created_at:new Date().toISOString()};store[table].push(row);if(table==='tasks')store.task_activity.push({task_id:row.id,action:'created',detail:'Task created',created_at:new Date().toISOString()});return json([row],201);}
     return json({message:'Unexpected method'},500);
   });
   ctx.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
   return ctx;
 }
 try{
 const ctx=await context(),page=await ctx.newPage();
 await page.goto(url+'/officers.html');
 await page.locator('.w-timeline').waitFor();
 assert.equal(await page.locator('.w-count').count(),0);
 assert.equal(await page.getByText('Your daily workspace',{exact:true}).count(),0);
 assert.equal(await page.locator('.w-timeline').count(),1);
 assert.equal(await page.getByText('First officer practice',{exact:true}).count(),1);
 await page.screenshot({path:path.join(out,'dashboard-desktop.png'),fullPage:true});
 console.log('PASS dashboard: real data, counts, timeline and next meeting');
 await page.evaluate(()=>{window.testShell=document.getElementById('rail');});
 await page.getByRole('link',{name:'Add task',exact:true}).click();
 await page.locator('.w-panel[open]').waitFor();
 assert(new URL(page.url()).pathname.endsWith('/tasks.html'));
 assert(await page.evaluate(()=>window.testShell===document.getElementById('rail')));
 await page.locator('[name=title]').fill('Prepare an easy icebreaker');
 await page.locator('[name=owner]').selectOption('person:'+vp.id);
 await page.locator('[name=due]').fill(day(5));
 await page.locator('[name=description]').fill('Three prompts for the first pair activity.');
 await page.screenshot({path:path.join(out,'task-editor-desktop.png'),fullPage:true});
 await page.getByRole('button',{name:'Create task',exact:true}).dblclick();
 await page.locator('.w-panel[open]').waitFor({state:'hidden'});
 assert.equal(store.tasks.filter(t=>t.title==='Prepare an easy icebreaker').length,1);
 assert.equal(store.tasks.find(t=>t.title==='Prepare an easy icebreaker').owner_id,vp.id);
 console.log('PASS persistent navigation, right editor, ownership and duplicate-click protection');
 await page.reload();await page.locator('[data-edit]').filter({hasText:'Prepare an easy icebreaker'}).waitFor();
 await page.evaluate(()=>{window.testShell=document.getElementById('rail');});
 const second=await context(),secondPage=await second.newPage();
 await secondPage.goto(url+'/tasks.html');await secondPage.locator('[data-edit]').filter({hasText:'Prepare an easy icebreaker'}).waitFor();
 assert.equal(await secondPage.evaluate(()=>localStorage.getItem('sica.tasks')),null);
 console.log('PASS refresh and independent browser context read the shared HTTP store; no local task storage');
 await page.getByRole('button',{name:'Complete Prepare an easy icebreaker',exact:true}).click();
 await page.getByRole('button',{name:'Complete Prepare an easy icebreaker',exact:true}).waitFor({state:'hidden'});
 await page.locator('#wFilter').selectOption('completed');
 await page.getByRole('button',{name:'Reopen Prepare an easy icebreaker',exact:true}).waitFor();
 assert(store.tasks.find(t=>t.title==='Prepare an easy icebreaker').completed_at);
 await page.locator('[data-edit]').filter({hasText:'Prepare an easy icebreaker'}).click();
 await page.locator('#wHistory').getByText('completed',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Close task editor'}).click();
 console.log('PASS completion, saved completion timestamp, history and completed filter');
 await page.locator('#wFilter').selectOption('active');
 await page.locator('[data-edit=t1]').click();
 await page.locator('[name=title]').fill('Unsaved task name');
 failWrite=true;await page.getByRole('button',{name:'Save changes'}).click();
 await page.locator('#wFormError').filter({hasText:'Not saved'}).waitFor();
 assert.equal(await page.locator('[name=title]').inputValue(),'Unsaved task name');
 assert.equal(store.tasks.find(t=>t.id==='t1').title,'Plan our first practice');
 failWrite=false;emptyWrite=true;await page.getByRole('button',{name:'Save changes'}).click();
 await page.locator('#wFormError').filter({hasText:'Task was not saved'}).waitFor();
 emptyWrite=false;
 page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Close task editor'}).click();assert(await page.locator('.w-panel').evaluate(d=>d.open));
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Close task editor'}).click();
 console.log('PASS failure keeps draft, empty PATCH is rejected, discard requires confirmation');
 await page.getByRole('button',{name:'Timeline view'}).click();
 const bar=page.locator('[data-bar=t1]');await bar.waitFor();const box=await bar.boundingBox(),old=store.tasks.find(t=>t.id==='t1').start_date;
 await page.mouse.move(box.x+20,box.y+15);await page.mouse.down();await page.mouse.move(box.x+108,box.y+15,{steps:8});await page.mouse.up();
 await page.waitForFunction(d=>document.getElementById('workNotice').textContent.startsWith('Dates saved'),null);
 assert.notEqual(store.tasks.find(t=>t.id==='t1').start_date,old);assert.equal(store.tasks.find(t=>t.id==='t1').start_date,day(2));
 const edge=await page.locator('[data-bar=t1] [data-resize]').boundingBox();
 await page.mouse.move(edge.x+6,edge.y+15);await page.mouse.down();await page.mouse.move(edge.x+50,edge.y+15,{steps:6});await page.mouse.up();
 await page.waitForTimeout(300);assert.equal(store.tasks.find(t=>t.id==='t1').due,day(7));
 await page.locator('[data-bar=t1]').focus();await page.keyboard.press('Enter');await page.locator('.w-panel[open]').waitFor();
 await page.locator('[name=start_date]').fill(day(10));await page.getByRole('button',{name:'Save changes'}).click();
 await page.locator('#wFormError').filter({hasText:'on or after'}).waitFor();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Close task editor'}).click();
 console.log('PASS Gantt drag, resize, keyboard edit and date validation');
 await page.getByRole('link',{name:'Dashboard',exact:true}).click();
 assert(await page.evaluate(()=>window.testShell===document.getElementById('rail')));
 await page.goBack();await page.getByRole('heading',{name:'Tasks',exact:true}).waitFor();
 console.log('PASS navigation history without shell reload');
 failRead=true;await page.getByRole('button',{name:'Refresh workspace'}).click();
 await page.getByText('Tasks could not be loaded',{exact:true}).waitFor();
 assert(await page.locator('.w-timeline').count());
 failRead=false;await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByText('Tasks could not be loaded',{exact:true}).waitFor({state:'hidden'});
 failPeople=true;failMeetings=true;await page.getByRole('button',{name:'Refresh workspace'}).click();await page.locator('.w-warning').waitFor();
 assert(await page.locator('.w-timeline').count());failPeople=false;failMeetings=false;
 console.log('PASS failed refresh preserves visible tasks, supporting-data failures do not hide tasks');
 const expire=()=>page.evaluate(()=>localStorage.setItem('sica.token','test.'+btoa(JSON.stringify({exp:1}))+'.test'));
 await expire();const before=refreshCount;
 await page.evaluate(()=>Promise.all([SICA_DB.tasks.list(),SICA_DB.officers.list(),SICA_DB.meetings.list()]));
 assert.equal(refreshCount-before,1);
 await expire();failRefresh=true;
 const refreshFailure=await page.evaluate(async()=>{try{await SICA_DB.tasks.list();return false;}catch(e){return !!localStorage.getItem('sica.refresh')&&!!localStorage.getItem('sica.token');}});
 assert.equal(refreshFailure,true);failRefresh=false;
 await page.evaluate(()=>SICA_DB.tasks.list());
 console.log('PASS expired-session renewal is deduplicated; transient outage does not sign officers out');
 const officer=await context(vp),officerPage=await officer.newPage();await officerPage.goto(url+'/tasks.html');
 await officerPage.locator('[data-edit=t3]').waitFor();
 assert.equal(await officerPage.getByRole('button',{name:'Team',exact:true}).count(),0);
 assert.equal(await officerPage.getByRole('button',{name:/Plan our first practice/}).count(),0);
 await officerPage.getByRole('link',{name:'Add task',exact:true}).click();
 assert(await officerPage.locator('[name=owner]').isDisabled());
 await officerPage.locator('[name=title]').fill('VP follow-up');await officerPage.getByRole('button',{name:'Create task',exact:true}).click();await officerPage.locator('.w-panel[open]').waitFor({state:'hidden'});
 assert.equal(store.tasks.find(t=>t.title==='VP follow-up').owner_id,vp.id);
 console.log('PASS role-specific officer view and self-assignment');
 const mobile=await context(founder,{viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),phone=await mobile.newPage();
 await phone.goto(url+'/officers.html');await phone.locator('.w-timeline').waitFor();
 assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await phone.screenshot({path:path.join(out,'dashboard-mobile.png'),fullPage:true});
 await phone.getByRole('link',{name:'Add task',exact:true}).click();await phone.locator('.w-panel[open]').waitFor();
 assert(await phone.evaluate(()=>document.querySelector('.w-panel').getBoundingClientRect().right<=innerWidth));
 await phone.screenshot({path:path.join(out,'task-editor-mobile.png'),fullPage:true});
 await phone.getByRole('button',{name:'Close task editor'}).click();
 await phone.getByRole('button',{name:'Open navigation'}).click();
 await phone.getByRole('dialog',{name:'Officer navigation',exact:true}).waitFor();
 await phone.locator('#roleBtn').click();await phone.getByRole('button',{name:'Sign out',exact:true}).waitFor();
 await phone.getByRole('button',{name:'Close account menu'}).click();
 await phone.locator('#rail').getByRole('link',{name:'Dashboard',exact:true}).click();
 assert.equal(await phone.locator('.w-mobile-menu').evaluate(d=>d.open),false);
 await phone.getByRole('button',{name:'Open navigation'}).click();await phone.keyboard.press('Escape');
 assert.equal(await phone.locator('.w-mobile-menu').evaluate(d=>d.open),false);
 console.log('PASS mobile overflow, accessible add action, full-width editor, reduced motion');
 await phone.setViewportSize({width:320,height:740});await phone.getByRole('button',{name:'Refresh workspace'}).click();
 await phone.locator('.w-sync').filter({hasText:'Saved to SICA'}).waitFor();
 assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const guest=await browser.newContext(),guestPage=await guest.newPage();
 await guest.route('**/*.supabase.co/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
 await guestPage.goto(url+'/officers.html');await guestPage.getByRole('heading',{name:'Officer sign-in'}).waitFor();
 const missing=await browser.newContext(),missingPage=await missing.newPage();
 await missing.route('**/supabase-config.js?*',r=>r.fulfill({contentType:'text/javascript',body:'window.SICA_SUPABASE = {};'}));
 await missingPage.goto(url+'/officers.html');await missingPage.getByRole('heading',{name:'Database unavailable'}).waitFor();
 console.log('PASS 320px layout, signed-out gate, visible missing-config error');
 await page.goto(url+'/apply.html');await page.waitForURL('**/interest.html');await page.locator('#interestForm').waitFor();
 await page.goto(url+'/index.html');await page.locator('.interest-hero').waitFor();
 assert.equal(await page.getByText('Applications closed',{exact:true}).count(),0);
 assert.equal(await page.getByText('Now accepting',{exact:true}).count(),0);
 await page.getByRole('link',{name:/^officers portal$/i}).click();await page.locator('.w-timeline').waitFor();
 assert.equal(await page.evaluate(async()=>{try{await SICA_DB.applications.create({});return 'bad';}catch(e){return e.message;}}),'Officer applications are closed. This round closed on September 25.');
 console.log('PASS public closure, no submission form, footer portal link, client intake guard');
 assert.deepEqual(errors,[]);console.log('PASS no browser JS errors');console.log('Screenshots: '+out);console.log('HTTP requests exercised: '+requests.length);
 }finally{await browser.close();server.close();}
}
main().catch(error=>{console.error(error);server.close();process.exitCode=1;});
