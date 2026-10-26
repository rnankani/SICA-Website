/* Personal navigation; shared data stays in Supabase, never browser storage. */
(function(){
  'use strict';
  let preferences={},ready=false,loadError='',refresh=()=>{},dialog,draft,busy=false,menu,returnFocus;
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const profile=()=>{try{return JSON.parse(localStorage.getItem('sica.profile')||'null');}catch(_){return null;}};
  const items=()=>window.SICA_ROLES.get().nav.flatMap(g=>g.items);
  const clean=(v,allowed)=>Array.isArray(v)?[...new Set(v.filter(id=>allowed.includes(id)))]:[];
  function current(){const all=items().map(i=>i.id),p=preferences[window.SICA_ROLES.active()]||{};return {order:[...clean(p.order,all),...all.filter(id=>!clean(p.order,all).includes(id))],pinned:clean(p.pinned,all)};}
  async function load(){
    ready=false;loadError='';
    try{const p=profile();if(!p?.id)throw new Error('Sign in to customize your sidebar.');const row=await SICA_DB.sidebar.get(p.id);preferences=row?.preferences||{};ready=true;refresh();}
    catch(e){loadError='Sidebar preferences could not load. '+e.message;}
    finally{if(dialog?.open&&!busy){draft=current();draw();}}
  }
  function apply(groups){
    if(!ready||!preferences[window.SICA_ROLES.active()])return groups;
    const p=current(),lookup=new Map(items().map(i=>[i.id,i])),ordered=p.order.map(id=>lookup.get(id)).filter(Boolean);
    return [{group:'Pinned',items:ordered.filter(i=>p.pinned.includes(i.id))},{group:'Workspace',items:ordered.filter(i=>!p.pinned.includes(i.id))}].filter(g=>g.items.length);
  }
  function move(id,step){const same=draft.order.filter(key=>draft.pinned.includes(key)===draft.pinned.includes(id)),at=same.indexOf(id),other=same[at+step];if(!other)return;const a=draft.order.indexOf(id),b=draft.order.indexOf(other);[draft.order[a],draft.order[b]]=[draft.order[b],draft.order[a]];}
  function draw(focusId){
    const lookup=new Map(items().map(i=>[i.id,i]));
    const ordered=[...draft.order.filter(id=>draft.pinned.includes(id)),...draft.order.filter(id=>!draft.pinned.includes(id))];
    dialog.innerHTML='<header><div><h2 id="sidebarTitle">Your sidebar</h2><p>Pin your essentials. Drag the handles to reorder. Keyboard: focus a handle, then use ↑ or ↓.<br>Saved to your account across devices; other officers keep their own layout.</p></div><button type="button" data-close aria-label="Close sidebar settings">×</button></header>'+
      '<p class="sidebar-error" role="alert">'+esc(loadError)+'</p><div class="sidebar-list">'+ordered.map(id=>{const i=lookup.get(id),pinned=draft.pinned.includes(id);return '<div class="sidebar-setting" data-id="'+esc(id)+'"><button type="button" class="sidebar-drag" draggable="'+ready+'" data-drag="'+esc(id)+'" aria-label="Drag '+esc(i.label)+' to reorder" title="Drag to reorder">⠿</button><b>'+esc(i.label)+'</b><button type="button" data-pin="'+esc(id)+'" aria-pressed="'+pinned+'" aria-label="'+(pinned?'Unpin ':'Pin ')+esc(i.label)+'">'+(pinned?'Pinned':'Pin')+'</button></div>';}).join('')+'</div><footer><button type="button" data-reset>Reset layout</button><button type="button" data-retry '+(loadError?'':'hidden')+'>Retry loading</button><button type="button" data-save '+(!ready?'disabled':'')+'>Save sidebar</button></footer>';
    if(focusId){const row=[...dialog.querySelectorAll('[data-id]')].find(el=>el.dataset.id===focusId);row?.querySelector('button').focus();}
    if(!ready)dialog.querySelectorAll('[data-pin],[data-drag],[data-reset]').forEach(b=>b.disabled=true);
  }
  function close(){if(busy)return;const original=current();if(JSON.stringify(original)!==JSON.stringify(draft)&&!confirm('Discard your unsaved sidebar changes?'))return;dialog.close();returnFocus?.focus();}
  async function open(id){
    returnFocus=document.activeElement;
    menu?.remove();menu=null;
    window.sicaMobileNav?.close();
    if(!dialog){
      dialog=document.createElement('dialog');dialog.className='sidebar-dialog';dialog.setAttribute('aria-labelledby','sidebarTitle');document.body.appendChild(dialog);
      let dragged=null,touchDrag=null;
      function drop(id,target){
        if(!ready||busy||!id||!target||id===target)return;
        const before=draft.order.indexOf(id)>draft.order.indexOf(target);
        draft.order=draft.order.filter(x=>x!==id);
        draft.order.splice(draft.order.indexOf(target)+(before?0:1),0,id);
        draft.pinned=draft.pinned.filter(x=>x!==id);
        if(draft.pinned.includes(target))draft.pinned.push(id);
        draw(id);
      }
      dialog.addEventListener('dragstart',e=>{const handle=e.target.closest('[data-drag]');if(!handle||!ready||busy){e.preventDefault();return;}dragged=handle.dataset.drag;e.dataTransfer.setData('text/plain',dragged);e.dataTransfer.effectAllowed='move';});
      dialog.addEventListener('dragover',e=>{if(dragged&&e.target.closest('[data-id]')){e.preventDefault();e.dataTransfer.dropEffect='move';}});
      dialog.addEventListener('drop',e=>{e.preventDefault();drop(dragged,e.target.closest('[data-id]')?.dataset.id);dragged=null;});
      dialog.addEventListener('dragend',()=>{dragged=null;});
      dialog.addEventListener('pointerdown',e=>{const h=e.target.closest('[data-drag]');if(h&&e.pointerType!=='mouse'&&ready&&!busy){touchDrag=h.dataset.drag;h.setPointerCapture(e.pointerId);}});
      dialog.addEventListener('pointerup',e=>{if(touchDrag){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-id]')?.dataset.id;drop(touchDrag,target);touchDrag=null;}});
      dialog.addEventListener('pointercancel',()=>{touchDrag=null;});
      dialog.addEventListener('keydown',e=>{const h=e.target.closest('[data-drag]');if(h&&ready&&!busy&&['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();move(h.dataset.drag,e.key==='ArrowUp'?-1:1);draw(h.dataset.drag);}});
      dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
      dialog.addEventListener('click',async e=>{
        const b=e.target.closest('button');if(!b||busy)return;
        if(b.hasAttribute('data-close'))return close();
        if(b.dataset.pin){const id=b.dataset.pin;draft.pinned=draft.pinned.includes(id)?draft.pinned.filter(x=>x!==id):[...draft.pinned,id];draw(id);}
        if(b.hasAttribute('data-reset')){draft={order:items().map(i=>i.id),pinned:[]};draw();}
        if(b.hasAttribute('data-retry')){await load();draft=current();draw();}
        if(b.hasAttribute('data-save')){
          busy=true;dialog.querySelectorAll('button').forEach(el=>el.disabled=true);b.textContent='Saving…';
          try{const next={...preferences,[SICA_ROLES.active()]:draft};await SICA_DB.sidebar.save(profile().id,next);preferences=next;refresh();dialog.close();}
          catch(error){loadError='Not saved. '+error.message;draw();}
          finally{busy=false;}
        }
      });
    }
    draft=current();draw();if(!dialog.open)dialog.showModal();if(id)draw(id);
  }
  function context(id,x,y,anchor){
    menu?.remove();
    menu=document.createElement('div');menu.className='sidebar-context';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Tab options');
    const pinned=current().pinned.includes(id);
    menu.innerHTML='<button role="menuitem" data-context-pin>'+(pinned?'Unpin tab':'Pin tab')+'</button><button role="menuitem" data-context-arrange>Rearrange tabs…</button>';
    document.body.appendChild(menu);
    menu.style.left=Math.max(8,Math.min(x,innerWidth-menu.offsetWidth-8))+'px';
    menu.style.top=Math.max(8,Math.min(y,innerHeight-menu.offsetHeight-8))+'px';
    menu.querySelector('button').focus();
    menu.addEventListener('click',async e=>{
      const pin=e.target.closest('[data-context-pin]');
      if(!pin&&!e.target.closest('[data-context-arrange]'))return;
      await open(id);
      if(pin&&ready){draft.pinned=pinned?draft.pinned.filter(x=>x!==id):[...draft.pinned,id];draw(id);}
    });
    menu.addEventListener('keydown',e=>{
      if(e.key==='Escape'){menu.remove();menu=null;anchor?.focus();}
      else if(['ArrowDown','ArrowUp','Tab'].includes(e.key)){e.preventDefault();const buttons=[...menu.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);buttons[(index+1)%buttons.length].focus();}
    });
  }
  document.addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target)){menu.remove();menu=null;}});
  window.SICA_SIDEBAR={apply,open,context,init:callback=>{refresh=callback;return load();}};
  window.addEventListener('beforeunload',e=>{if(busy||(dialog?.open&&JSON.stringify(current())!==JSON.stringify(draft))){e.preventDefault();e.returnValue='';}});
})();
