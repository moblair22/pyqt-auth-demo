// Subgoal dates compatibility layer: show/edit start/end dates and surface them in Calendar.
(() => {
  const sameId=(a,b)=>String(a??'')===String(b??'');
  const dateText=(s)=>{
    const start=s?.startDate||'';
    const end=s?.endDate||s?.targetDate||'';
    const f=d=>typeof fmt==='function'?fmt(d):d;
    if(start&&end)return `${f(start)} → ${f(end)}`;
    if(start)return `Starts ${f(start)}`;
    if(end)return `Due ${f(end)}`;
    return 'No dates set';
  };
  function ensureStyles(){
    if(document.querySelector('#subgoalDateStyles'))return;
    const st=document.createElement('style');st.id='subgoalDateStyles';st.textContent=`
      .sg-date-edit{margin-left:4px}.cal-pill.subgoal-start{border-left:3px solid var(--accent2)}.cal-pill.subgoal-due{border-left:3px solid #b28cff}.cal-dot.subgoal-start{background:var(--accent2)}.cal-dot.subgoal-due{background:#b28cff}
    `;document.head.appendChild(st);
  }
  function saveState(){if(typeof save==='function')save();else if(typeof saveLocal==='function'){saveLocal();if(typeof render==='function')render();}}
  function editSubgoal(gid,sid){
    const g=(state.goals||[]).find(x=>sameId(x.id,gid));if(!g)return;
    const s=(g.subgoals||[]).find(x=>sameId(x.id,sid));if(!s)return;
    const start=s.startDate||'',end=s.endDate||s.targetDate||'';
    modal(`<h2>Edit subgoal</h2><div class="field"><label>Subgoal</label><input id="sgEditTitle" value="${esc(s.title||'')}"></div><div class="form-grid"><div class="field"><label>Start date</label><input id="sgEditStart" type="date" value="${esc(start)}"></div><div class="field"><label>End date</label><input id="sgEditEnd" type="date" value="${esc(end)}"></div></div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="sgEditSave" class="primary-btn">Save changes</button></div>`);
    document.querySelector('#sgEditSave').onclick=()=>{
      const title=document.querySelector('#sgEditTitle').value.trim(),st=document.querySelector('#sgEditStart').value,en=document.querySelector('#sgEditEnd').value;
      if(!title)return toast('Enter a subgoal title');
      if(st&&en&&en<st)return toast('End date must be on or after start date');
      s.title=title;s.startDate=st;s.endDate=en;s.targetDate=en;saveState();close();openGoal(gid);toast('Subgoal updated');
    };
  }
  function enhanceGoal(gid){
    const g=(state.goals||[]).find(x=>sameId(x.id,gid));if(!g)return;
    (g.subgoals||[]).forEach(s=>{
      const check=[...document.querySelectorAll('.sg-check')].find(el=>sameId(el.dataset.id,s.id));
      const row=check?.closest('.goal-command-row,.task-row');if(!row)return;
      const meta=row.querySelector('.goal-command-meta,.task-sub');if(meta)meta.textContent=dateText(s);
      if(!row.querySelector('.sg-date-edit')){
        const b=document.createElement('button');b.type='button';b.className='secondary-btn sg-date-edit';b.textContent='Edit';b.onclick=()=>editSubgoal(gid,s.id);
        const del=row.querySelector('.sg-del');if(del)row.insertBefore(b,del);else row.appendChild(b);
      }
    });
    const title=document.querySelector('#sgTitle'),oldDate=document.querySelector('#sgDate');
    if(title&&oldDate&&!document.querySelector('#sgStartDate')){
      const endField=oldDate.closest('.field');if(endField){const lab=endField.querySelector('label');if(lab)lab.textContent='End date';const startField=document.createElement('div');startField.className='field';startField.innerHTML='<label>Start date</label><input id="sgStartDate" type="date">';endField.parentElement?.insertBefore(startField,endField);}
    }
    const add=document.querySelector('#mkSG');
    if(add&&title){
      add.onclick=()=>{
        const name=title.value.trim(),st=document.querySelector('#sgStartDate')?.value||'',en=document.querySelector('#sgDate')?.value||'';
        if(!name)return toast('Enter a subgoal title');
        if(st&&en&&en<st)return toast('End date must be on or after start date');
        g.subgoals=g.subgoals||[];g.subgoals.push({id:id(),title:name,startDate:st,endDate:en,targetDate:en,done:false});saveState();openGoal(g.id);toast('Subgoal added');
      };
    }
  }
  function annotateCalendar(){
    ensureStyles();
    document.querySelectorAll('.cal-subgoal-legend').forEach(x=>x.remove());
    const legend=document.querySelector('#calendarView .cal-legend');
    if(legend){const span=document.createElement('span');span.className='cal-subgoal-legend';span.innerHTML='<i class="cal-dot subgoal-start"></i>Subgoal start&nbsp;&nbsp;<i class="cal-dot subgoal-due"></i>Subgoal due';legend.appendChild(span);}
    (state.goals||[]).forEach(g=>(g.subgoals||[]).forEach(s=>{
      const pairs=[[s.startDate,'subgoal-start',`Subgoal start: ${s.title}`],[s.endDate||s.targetDate,'subgoal-due',`Subgoal due: ${s.title}`]];
      pairs.forEach(([key,type,label])=>{
        if(!key)return;const cell=document.querySelector(`[data-cal-date="${CSS.escape(key)}"]`);const events=cell?.querySelector('.cal-events');if(!events||events.querySelector(`[data-subgoal-id="${CSS.escape(String(s.id))}"][data-subgoal-type="${type}"]`))return;
        const pill=document.createElement('div');pill.className=`cal-pill ${type}`;pill.dataset.subgoalId=String(s.id);pill.dataset.subgoalType=type;pill.title=label;pill.innerHTML=`<i class="cal-dot ${type}"></i><span class="cal-text">${esc(label)}</span>`;events.appendChild(pill);
      });
    }));
  }
  ensureStyles();
  if(typeof openGoal==='function'){
    const base=openGoal;openGoal=function(gid){base(gid);enhanceGoal(gid);};
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('[data-view="calendar"],#calPrev,#calNext,#calToday,[data-cal-date]'))setTimeout(annotateCalendar,0);
  });
  setTimeout(annotateCalendar,0);
})();