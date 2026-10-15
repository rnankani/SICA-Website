(function(){
  'use strict';
  const form=document.getElementById('interestForm'), submit=document.getElementById('interestSubmit');
  const fields=['name','grade','studentId','email','interest','question'];
  let pending=false, submissionId=null, submissionBody=null, sent=false;
  const words=s=>s.trim()?s.trim().split(/\s+/u).length:0;
  function message(id){
    const value=document.getElementById(id).value.trim();
    if(id!=='question'&&!value)return 'Please fill this in.';
    if(id==='grade'&&!['9','10','11','12'].includes(value))return 'Choose a grade from 9 to 12.';
    if(id==='studentId'&&!/^[A-Za-z0-9-]{3,30}$/.test(value))return 'Use your student ID (3–30 letters, numbers, or hyphens).';
    if(id==='email'&&!/^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?$/i.test(value))return 'Enter just your school email username, without @fuhsd.org.';
    if(id==='interest'&&(words(value)<11||words(value)>12))return 'Please use 11 or 12 words. You have '+words(value)+'.';
    return '';
  }
  function validate(id){const el=document.getElementById(id),err=message(id);el.closest('.f').classList.toggle('bad',!!err);el.setAttribute('aria-invalid',String(!!err));document.getElementById(id+'Error').textContent=err;el.setAttribute('aria-describedby',[...new Set(((el.getAttribute('aria-describedby')||'')+' '+id+'Error').trim().split(/\s+/))].join(' '));return !err;}
  fields.forEach(id=>{document.getElementById(id).addEventListener('input',()=>{const el=document.getElementById(id);if(el.closest('.f').classList.contains('bad'))validate(id);if(id==='interest'){const n=words(el.value),count=document.getElementById('interestCount');count.textContent=n+' words · aim for 11–12';count.classList.toggle('over',n>12);}});});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(pending||sent)return;
    const invalid=fields.filter(id=>!validate(id));
    if(invalid.length){const el=document.getElementById(invalid[0]),box=el.closest('.f');box.classList.remove('shake');void box.offsetWidth;box.classList.add('shake');el.focus({preventScroll:true});box.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});return;}
    pending=true;submit.disabled=true;submit.textContent='Saving…';const failure=document.getElementById('submitFail');failure.textContent='';
    try{
      if(!window.crypto||!crypto.randomUUID)throw new Error('Please use a current browser over a secure connection.');
      const value=id=>document.getElementById(id).value.trim();
      const payload={name:value('name'),grade:Number(value('grade')),student_id:value('studentId'),email:value('email').toLowerCase()+'@fuhsd.org',interest:value('interest'),question:value('question')||null};
      const fingerprint=JSON.stringify(payload);
      if(submissionBody!==fingerprint){submissionId=crypto.randomUUID();submissionBody=fingerprint;}
      const result=await window.SICA_DB.interest.submit({id:submissionId,...payload});
      if(result!==true)throw new Error('The database did not confirm your signup. Please try again.');
      sent=true;form.hidden=true;document.getElementById('interestIntro').hidden=true;const done=document.getElementById('interestDone');done.classList.add('on');done.focus();done.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    }catch(e){const unavailable=e.code==='PGRST202'||e.code==='42883';failure.textContent=unavailable?'Signups are not available yet. Please try again later. Nothing has been confirmed.':'Your signup has not been confirmed. '+(e.message||'Check your connection and try again.');}
    finally{pending=false;submit.disabled=false;submit.innerHTML='Keep me updated <span aria-hidden="true">→</span>';}
  });
  window.addEventListener('beforeunload',e=>{if(pending){e.preventDefault();e.returnValue='';}});
})();
