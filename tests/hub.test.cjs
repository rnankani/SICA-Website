// UI integration: real frontend + HTTP substitutes. Never writes to production.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const root=path.resolve(__dirname,'..'),out=fs.mkdtempSync(path.join(os.tmpdir(),'sica-hub-qa-'));
const profile={id:'00000000-0000-4000-8000-000000000001',full_name:'QA Founder',email:'qa@example.test',role:'founder'};
const now=new Date(),day=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
const store={interest_signups:[],documents:[{id:'old-file',title:'Existing Library upload',purpose:'Use this to prepare the first meeting',storage_path:'officers/old/plan.pdf',file_name:'plan.pdf',category:'Governing documents',created_at:'2026-09-01T00:00:00Z'}],profiles:[profile],tasks:[{id:'task-one',title:'Prepare the activity',owner_id:profile.id,owner_role:'founder',start_date:day,due:day,status:'in_progress',priority:'medium',progress:50}],meetings:[],calendar_events:[],settings:[],members:[],task_activity:[],sidebar_preferences:[]};
let rejectSignup=false,unconfirmed=false,rejectUpload=false,failDocs=false,loseDocumentAck=false,failPreferences=false;const requests=[],errors=[];
const server=http.createServer((req,res)=>{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep)||!/^.*\.(html|js|css|svg|png|jpg)$/.test(file))return res.writeHead(404).end();fs.readFile(file,(e,data)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({html:'text/html',js:'text/javascript',css:'text/css'})[file.split('.').pop()]||'application/octet-stream');res.end(data);});});
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 async function make(signed=true,options={},asProfile=profile){
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},...options});
  if(signed)await ctx.addInitScript(p=>{if(location.hostname!=='127.0.0.1'||window!==window.top)return;localStorage.setItem('sica.profile',JSON.stringify(p));localStorage.setItem('sica.token','qa.'+btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.qa');localStorage.setItem('sica.refresh','qa-refresh');},asProfile);
  await ctx.route('**/*.supabase.co/**',async route=>{
   const req=route.request(),url=new URL(req.url()),method=req.method();requests.push({url: req.url(),method,auth:req.headers().authorization});
   const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
   if(url.pathname.includes('/storage/v1/object/sign/')&&method==='POST')return json({signedURL:'/object/sign/sica-documents/officers/mock.pdf?token=qa'});
   if(url.pathname.includes('/storage/v1/')&&method==='GET')return route.fulfill({status:200,contentType:'text/plain',body:'QA file content'});
   if(url.pathname.includes('/storage/v1/'))return rejectUpload?json({message:'Upload temporarily unavailable'},503):json({Key:'saved'});
   if(url.pathname.includes('/auth/v1/'))return json({});
   const table=url.pathname.split('/').pop(),body=method==='GET'?null:req.postDataJSON();
   if(table==='submit_interest'){
    if(rejectSignup)return json({message:'Signup service unavailable'},503);
    if(unconfirmed)return json(null);
    await new Promise(r=>setTimeout(r,120));
    if(!store.interest_signups.some(r=>r.id===body.payload.id||r.email===body.payload.email))store.interest_signups.push({...body.payload,created_at:new Date().toISOString()});
    return json(true);
   }
   if(table==='list_applications_json')return json([]);
   if(table==='sidebar_preferences'&&method==='POST'&&failPreferences)return json({message:'Preferences temporarily unavailable'},503);
   if(!store[table])return json({message:'Unexpected '+table},500);
   if(method==='GET'){if(table==='documents'&&failDocs)return json({message:'Database temporarily unavailable'},503);let rows=store[table];for(const [key,value] of url.searchParams)if(value.startsWith('eq.'))rows=rows.filter(r=>String(r[key])===value.slice(3));const offset=Number(url.searchParams.get("offset")||0),limit=Number(url.searchParams.get("limit")||rows.length);return json(rows.slice(offset,offset+limit));}
   if(method==='POST'){if(table==='sidebar_preferences'){const previous=store[table].find(r=>r.user_id===body.user_id);if(previous){Object.assign(previous,body);return json([previous]);}}const row={...body,id:body.id||'doc-'+store[table].length,created_at:new Date().toISOString()};store[table].push(row);if(table==='documents'&&loseDocumentAck){loseDocumentAck=false;return route.abort('failed');}return json([row],201);}
   if(method==='PATCH'){const row=store[table].find(r=>r.id===url.searchParams.get('id').slice(3));Object.assign(row,body);return json([row]);}
   return json([]);
  });ctx.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));return ctx;
 }
 try{
  const guest=await make(false),p=await guest.newPage();await p.goto(base+'/interest.html');
  await p.evaluate(()=>localStorage.setItem('sica.token','expired-officer-session'));
  await p.getByRole('button',{name:'Keep me updated'}).click();assert.equal(await p.locator('.f.bad').count(),5);assert.equal(await p.evaluate(()=>document.activeElement.id),'name');
  await p.locator('#name').fill('QA Student');await p.locator('#grade').selectOption('10');await p.locator('#studentId').fill('0123456');await p.locator('#email').fill('qa.student');
  await p.locator('#interest').fill('one two three four five six seven eight nine ten');await p.getByRole('button',{name:'Keep me updated'}).click();assert.match(await p.locator('#interestError').textContent(),/at least 15/);assert.equal(store.interest_signups.length,0);
  await p.locator('#email').fill('qa@gmail.com');await p.getByRole('button',{name:'Keep me updated'}).click();assert.match(await p.locator('#emailError').textContent(),/@fuhsd/);await p.locator('#email').fill('qa.student');
  await p.locator('#interest').fill('I want to practice everyday conversations and feel more confident meeting people. I also want to make new friends.');
  for(const id of ['123456','12345678','123a567','123-567']){await p.locator('#studentId').fill(id);await p.getByRole('button',{name:'Keep me updated'}).click();assert.match(await p.locator('#studentIdError').textContent(),/exactly 7/);}
  await p.locator('#studentId').fill('0123456');await p.locator('#email').fill(' QA.Student@FUHSD.ORG ');
  rejectSignup=true;await p.getByRole('button',{name:'Keep me updated'}).click();await p.locator('#submitFail').filter({hasText:'not been confirmed'}).waitFor();assert.equal(await p.locator('#interestForm').isVisible(),true);assert.equal(store.interest_signups.length,0);
  rejectSignup=false;unconfirmed=true;await p.getByRole('button',{name:'Keep me updated'}).click();await p.locator('#submitFail').filter({hasText:'did not confirm'}).waitFor();assert.equal(await p.locator('#interestDone').isVisible(),false);
  unconfirmed=false;await p.getByRole('button',{name:'Keep me updated'}).dblclick();await p.locator('#interestDone').waitFor();assert.equal(store.interest_signups.length,1);assert.equal(store.interest_signups[0].email,'qa.student@fuhsd.org');assert.equal(store.interest_signups[0].question,null);
  assert(requests.filter(r=>r.url.includes('/rpc/submit_interest')).every(r=>r.auth!=='Bearer expired-officer-session'));
  assert.equal(await p.locator('#interest').getAttribute('aria-describedby'),'interestHint interestCount interestError');
  assert.equal(await p.evaluate(()=>Object.keys(localStorage).some(k=>/interest|signup/.test(k))),false);
  console.log('PASS public form required fields, locked domain, word validation, failure retention, confirmation, double click');
  const officer=await make(),page=await officer.newPage();await page.goto(base+'/interests.html');await page.getByText('QA Student',{exact:true}).waitFor();
  await page.locator('.h-signup summary').click();await page.getByText('Student ID: 0123456',{exact:true}).waitFor();
  const csv=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV'}).click();assert.equal((await csv).suggestedFilename(),'SICA-interest-signups.csv');
  await page.screenshot({path:path.join(out,'interest-inbox.png'),fullPage:true});
  console.log('PASS independent officer context sees signup and can export CSV');
  for(const role of ['president','vp','secretary','treasurer','pr']){
    const roleCtx=await make(true,{}, {...profile,role}),rolePage=await roleCtx.newPage();await rolePage.goto(base+'/interests.html');
    const allowed=['president','vp'].includes(role);
    if(allowed)await rolePage.getByText('QA Student',{exact:true}).waitFor();else await rolePage.getByText(/Interest signups are restricted/).waitFor();
    assert.equal(await rolePage.locator('#rail').getByRole('link',{name:'Interest signups',exact:true}).count(),allowed?1:0);
    if(!allowed)assert.equal(await rolePage.getByText('QA Student',{exact:true}).count(),0);
    await roleCtx.close();
  }
  console.log('PASS President/VP inbox and sidebar access; other officer roles denied');
  await page.getByRole('button',{name:'Customize sidebar',exact:true}).click();await page.getByRole('button',{name:'Pin References',exact:true}).click();await page.getByRole('button',{name:'Save sidebar',exact:true}).click();await page.locator('.sidebar-dialog').waitFor({state:'hidden'});
  assert.equal(await page.locator('#rail .navgroup').first().getByRole('link').first().textContent(),'References');
  await page.locator('#rail').getByRole('button',{name:'Customize References tab',exact:true}).click();await page.getByRole('button',{name:'Pin Tasks',exact:true}).click();await page.getByRole('button',{name:'Move Tasks down',exact:true}).click();await page.getByRole('button',{name:'Save sidebar',exact:true}).click();await page.locator('.sidebar-dialog').waitFor({state:'hidden'});
  await page.reload();await page.getByText('QA Student',{exact:true}).waitFor();assert.equal(await page.locator('#rail .navgroup').first().getByRole('link').first().textContent(),'References');
  const personalCtx=await make(),personalPage=await personalCtx.newPage();await personalPage.goto(base+'/interests.html');await personalPage.waitForFunction(()=>document.querySelector('#rail .navlabel')?.textContent==='Pinned');assert.equal(await personalPage.locator('#rail .navgroup').first().getByRole('link').count(),2);await personalCtx.close();
  console.log('PASS sidebar pin/reorder saved across page reloads and independent browsers');
  await page.getByRole('button',{name:'Customize sidebar',exact:true}).click();await page.getByRole('button',{name:'Pin Calendar',exact:true}).click();failPreferences=true;await page.getByRole('button',{name:'Save sidebar',exact:true}).click();await page.getByText(/Not saved. Preferences temporarily unavailable/).waitFor();assert.equal(await page.getByRole('button',{name:'Unpin Calendar',exact:true}).getAttribute('aria-pressed'),'true');failPreferences=false;await page.getByRole('button',{name:'Save sidebar',exact:true}).click();await page.locator('.sidebar-dialog').waitFor({state:'hidden'});
  await page.goto(base+'/references.html');await page.getByRole('button',{name:'Existing Library upload',exact:true}).waitFor();
  assert.equal(await page.locator('#rail').getByRole('link',{name:'Library',exact:true}).count(),0);assert.equal(await page.locator('#rail').getByRole('link',{name:'Handbook',exact:true}).count(),0);assert.equal(await page.locator('#rail').getByRole('link',{name:'Announcements',exact:true}).count(),0);
  await page.getByRole('button',{name:'Existing Library upload',exact:true}).hover();assert.equal(await page.getByText('Use this to prepare the first meeting',{exact:true}).isVisible(),true);
  let chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'Upload file',exact:true}).click();await (await chooser).setFiles({name:'club-initiation.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from('QA document')});
  await page.locator('#uploadDialog[open]').waitFor();await page.locator('[name=title]').fill('Club initiation');await page.locator('[name=purpose]').fill('Steps for launching the club');
  rejectUpload=true;await page.getByRole('button',{name:'Upload & save'}).click();await page.locator('#uploadError').filter({hasText:'Not saved'}).waitFor();assert.equal(await page.locator('[name=title]').inputValue(),'Club initiation');
  rejectUpload=false;loseDocumentAck=true;await page.getByRole('button',{name:'Upload & save'}).click();await page.locator('#uploadDialog[open]').waitFor({state:'hidden'});await page.getByRole('button',{name:'Club initiation',exact:true}).waitFor();assert.equal(store.documents.length,2);assert.equal(store.documents[1].purpose,'Steps for launching the club');assert(!requests.some(r=>r.method==='DELETE'&&r.url.includes('/storage/')));
  const pop=page.waitForEvent('popup');await page.getByRole('button',{name:'Club initiation',exact:true}).click();const tab=await pop;await tab.waitForURL('**/storage/v1/**');await tab.close();
  const pop2=page.waitForEvent('popup');await page.locator('.h-file').filter({hasText:'Club initiation'}).getByRole('button',{name:'Download',exact:true}).click();const dl=await pop2;await dl.waitForURL('**/*download=*');await dl.close();
  const book=page.waitForEvent('download');await page.locator('.h-file').filter({hasText:'Officer Handbook'}).getByRole('button',{name:'Download',exact:true}).click();const bookDownload=await book;assert.equal(bookDownload.suggestedFilename(),'SICA-Officer-Handbook.html');const bookHTML=fs.readFileSync(await bookDownload.path(),'utf8');assert.match(bookHTML,/Backup to the President/);assert(!bookHTML.includes('<script'));
  await page.reload();await page.getByRole('button',{name:'Club initiation',exact:true}).waitFor();
  await page.screenshot({path:path.join(out,'references-desktop.png'),fullPage:true});
  failDocs=true;await page.getByRole('button',{name:'Refresh page'}).click();await page.getByText(/Files could not be loaded/).waitFor();assert.equal(await page.getByText('No uploaded documents yet.',{exact:false}).count(),0);failDocs=false;
  console.log('PASS existing files preserved, upload picker/retry, details, signed open/download, handbook download, no local fallback');
  const existingDocs=store.documents.slice();for(let i=0;i<1001;i++)store.documents.push({id:'pagination-'+i,title:'Pagination file '+i,created_at:'2026-01-01T00:00:00Z'});
  const paged=await page.evaluate(()=>SICA_DB.documents.list({metadataOnly:true}));assert.equal(paged.length,1003);assert(paged.some(d=>d.id==='pagination-1000'));store.documents=existingDocs;
  console.log('PASS all 1,003 document records load beyond a single API page');
  await page.goto(base+'/calendar.html');await page.getByRole('link',{name:'Prepare the activity',exact:true}).waitFor();await page.getByRole('link',{name:'Prepare the activity',exact:true}).click();await page.locator('.w-panel[open]').waitFor();assert.equal(await page.locator('[name=title]').inputValue(),'Prepare the activity');await page.getByRole('button',{name:'Close task editor'}).click();
  console.log('PASS calendar uses task deadline and opens its real editor');
  await page.goto(base+'/settings.html');await page.locator('#clubSettings').waitFor();await page.locator('[name=room]').fill('Room 12');await page.getByRole('button',{name:'Save details'}).click();await page.getByText('Saved to SICA.',{exact:true}).waitFor();assert.equal(store.settings[0].value.room,'Room 12');
  await page.goto(base+'/founder-tools.html');assert.equal(await page.getByText('Reset application',{exact:true}).count(),0);await page.getByRole('button',{name:'Check connection'}).click();await page.getByText(/Supabase is reachable/).waitFor();
  await page.goto(base+'/officer-form.html');await page.frameLocator('iframe').getByText('Saved officer form · Preview only · Submission disabled',{exact:true}).waitFor();assert.equal(await page.frameLocator('iframe').getByRole('button',{name:'Submit application'}).isDisabled(),true);
  console.log('PASS minimal persisted settings, real founder actions, preserved disabled form template');
  const phoneCtx=await make(false,{viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),phone=await phoneCtx.newPage();await phone.goto(base+'/interest.html');assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await phone.screenshot({path:path.join(out,'interest-mobile.png'),fullPage:true});
  const mobile=await make(true,{viewport:{width:390,height:844},isMobile:true,hasTouch:true}),mp=await mobile.newPage();await mp.goto(base+'/references.html');await mp.getByRole('button',{name:'Club initiation',exact:true}).waitFor();assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mp.screenshot({path:path.join(out,'references-mobile.png'),fullPage:true});
  await mp.getByRole('button',{name:'Open navigation'}).click();await mp.locator('#workMobileMenu[open]').getByRole('link',{name:'Settings',exact:true}).click();await mp.waitForURL('**/settings.html');await mp.locator('#clubSettings').waitFor();assert.equal(await mp.locator('[name=room]').inputValue(),'Room 12');
  await mp.locator('#hubMain').getByRole('button',{name:'Customize sidebar',exact:true}).click();await mp.locator('.sidebar-dialog[open]').waitFor();assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mp.screenshot({path:path.join(out,'sidebar-mobile.png'),fullPage:true});await mp.getByRole('button',{name:'Close sidebar settings',exact:true}).click();
  await phone.goto(base+'/index.html');assert.equal(await phone.getByText(/applications closed/i).count(),0);await phone.locator('.interest-float').click();await phone.waitForURL('**/interest.html');
  await p.goto(base+'/index.html');await p.getByRole('link',{name:'Interest Form',exact:true}).first().waitFor();await p.waitForFunction(()=>[...document.querySelectorAll('.hero-r')].every(el=>getComputedStyle(el).opacity==='1'));await p.screenshot({path:path.join(out,'home-desktop.png')});
  await phone.setViewportSize({width:320,height:740});await phone.goto(base+'/interest.html');assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  console.log('PASS mobile layouts, public interest CTAs, reduced-motion form');assert.deepEqual(errors,[]);console.log('PASS no browser JS errors');console.log('Screenshots: '+out);
 }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
