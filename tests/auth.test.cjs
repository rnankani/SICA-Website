// Real browser, real auth/UI code, isolated HTTP substitute. No production writes.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep))return res.writeHead(404).end();fs.readFile(file,(e,data)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'text/plain');res.end(data);});});
async function main(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 let role='member',signupError=null,loginError=null,profileError=false,immediate=false,signups=[],resends=0;const errors=[];
 const user={id:'00000000-0000-4000-8000-000000000077',email:'officer@gmail.com'};
 const session={access_token:'qa.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64')+'.qa',refresh_token:'qa-refresh'};
 async function context(){const ctx=await browser.newContext({viewport:{width:390,height:844}});ctx.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  await ctx.route('**/*.supabase.co/**',async route=>{const req=route.request(),u=new URL(req.url()),body=req.postDataJSON();const json=(d,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(d)});
   if(u.pathname.endsWith('/settings')&&u.pathname.includes('/auth/'))return json({});
   if(u.pathname.endsWith('/signup')){signups.push({body,redirect:u.searchParams.get('redirect_to')});await new Promise(r=>setTimeout(r,100));return signupError?json(signupError,422):json(immediate?{...session,user}:{id:user.id});}
   if(u.pathname.endsWith('/resend')){resends++;return json({});}
   if(u.pathname.endsWith('/token'))return loginError?json(loginError,400):json({...session,user});
   if(u.pathname.endsWith('/user'))return json(user);
   if(u.pathname.endsWith('/logout'))return json({});
   if(u.pathname.endsWith('/profiles'))return profileError?json({message:'Permission denied'},403):json([{...user,full_name:'Test Officer',role}]);
   return json([]);
  });return ctx;
 }
 try{
  const ctx=await context(),page=await ctx.newPage();await page.goto(base+'/officers.html');await page.getByRole('heading',{name:'Officer sign-in'}).waitFor();
  await page.setViewportSize({width:320,height:740});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#gateEmail').fill(' Officer@GMAIL.com ');await page.locator('#gateCode').fill('test-password-123');
  // An old cached config cannot reintroduce the removed email restriction.
  await page.evaluate(()=>{SICA_SUPABASE.emailDomain='@student.fuhsd.org';});
  await page.getByRole('button',{name:'Create account',exact:true}).dblclick();await page.locator('#gateErr').filter({hasText:'Check your inbox'}).waitFor();
  assert.equal(signups.length,1);assert.equal(signups[0].body.email,'officer@gmail.com');assert.equal(signups[0].redirect,'https://www.joinsica.page/officers.html');
  await page.getByRole('button',{name:'Resend confirmation'}).click();await page.locator('#gateErr').filter({hasText:'If this account needs confirmation'}).waitFor();assert.equal(resends,1);
  for(const email of ['person@outlook.com','person@fuhsd.org','person@student.fuhsd.org']){await page.locator('#gateEmail').fill(email);await page.getByRole('button',{name:'Create account',exact:true}).click();await page.locator('#gateErr').filter({hasText:'Check your inbox'}).waitFor();assert.equal(signups.at(-1).body.email,email);}
  console.log('PASS any email domain, normalization, confirmation redirect, resend, duplicate-click protection');
  signupError={code:'email_address_not_authorized',msg:'Email address not authorized'};await page.getByRole('button',{name:'Create account',exact:true}).click();await page.locator('#gateErr').filter({hasText:'custom SMTP'}).waitFor();signupError=null;
  loginError={code:'invalid_credentials',msg:'Invalid login credentials'};await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('#gateErr').filter({hasText:'Create account first'}).waitFor();
  loginError={code:'email_not_confirmed',msg:'Email not confirmed'};await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('#gateErr').filter({hasText:'Confirm your email'}).waitFor();loginError=null;
  profileError=true;await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('#gateErr').filter({hasText:'role could not be loaded'}).waitFor();assert.equal(await page.getByRole('heading',{name:'Waiting for founder approval'}).count(),0);profileError=false;
  await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.getByRole('heading',{name:'Waiting for founder approval'}).waitFor();assert.equal(await page.getByRole('link',{name:'Apply',exact:true}).count(),0);
  await page.getByRole('button',{name:'Check approval'}).click();await page.getByText('Still waiting for founder approval. Your account is registered.').waitFor();role='vp';await page.getByRole('button',{name:'Check approval'}).click();await page.locator('.w-timeline').waitFor();
  console.log('PASS actionable auth errors, profile failure is not pending approval, real approval recheck opens dashboard');
  const second=await context(),p2=await second.newPage();await p2.goto(base+'/officers.html');await p2.locator('#gateEmail').fill('officer@gmail.com');await p2.locator('#gateCode').fill('test-password-123');await p2.getByRole('button',{name:'Sign in',exact:true}).click();await p2.locator('.w-timeline').waitFor();
  role='member';immediate=true;const third=await context(),p3=await third.newPage();await p3.goto(base+'/officers.html');await p3.locator('#gateEmail').fill('new@yahoo.com');await p3.locator('#gateCode').fill('test-password-123');await p3.getByRole('button',{name:'Create account',exact:true}).click();await p3.getByRole('heading',{name:'Waiting for founder approval'}).waitFor();assert.equal(await p3.locator('.w-timeline').count(),0);
  console.log('PASS independent browser sign-in and immediate signup session cannot bypass founder approval');
  const fourth=await context(),p4=await fourth.newPage();await p4.goto(base+'/officers.html#error=access_denied&error_code=otp_expired');await p4.locator('#gateErr').filter({hasText:'expired or invalid'}).waitFor();assert.equal(new URL(p4.url()).hash,'');
  await p4.goto(base+'/officers.html#access_token='+encodeURIComponent(session.access_token)+'&refresh_token=qa-refresh&type=signup');await p4.reload();await p4.getByRole('heading',{name:'Waiting for founder approval'}).waitFor();assert.equal(new URL(p4.url()).hash,'');
  assert.deepEqual(errors,[]);console.log('PASS confirmation callbacks, expired link recovery, token cleanup and no browser errors');
 }finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);server.close();process.exitCode=1;});
