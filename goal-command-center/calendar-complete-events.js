// Calendar complete-events layer: subgoals are first-class calendar events and day clicks show the full schedule.
(() => {
  const sameId=(a,b)=>String(a??'')===String(b??'');
  const safe=v=>typeof esc==='function'?esc(String(v??'')):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'});
  const fmtDate=key=>{if(!key)return'';const[y,m,d]=String(key).split('-').map(Number);return new Date(y,m-1,d).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});};
  const goalEnd=g=>g?.endDate||g?.targetDate||'';
  const subEnd=s=>s?.endDate||s?.targetDate||'';
  const goalFor=id=>(state.goals||[]).find(g=>sameId(g.id,id));

  function ensureStyles(){
    if(document.querySelector('#calendarCompleteStyles'))return;
    const st=document.createElement('style');st.id='calendarCompleteStyles';st.textContent=`
      .cal-pill.subgoal-start{border-left:3px solid #8bb8ff}.cal-pill.subgoal-due{border-left:3px solid #b28cff}.cal-dot.subgoal-start{background:#8bb8ff}.cal-dot.subgoal-due{background:#b28cff}.cal-dot.habit{background:#62c995}
      .cal-complete-list{display:grid;gap:9px;margin-top:10px}.cal-complete-row{display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}.cal-complete-row .cal-dot{margin-top:5px}.cal-complete-main{min-width:0;flex:1}.cal-complete-title{font-size:13px;font-weight:800}.cal-complete-meta{font-size:10px;color:var(--muted);margin-top:3px}.cal-complete-status{font-size:9px;font-weight:850;border:1px solid var(--line);border-radius:999px;padding:4px 7px;white-space:nowrap}.cal-complete-status.done{color:var(--accent);opacity:.8}.cal-complete-status.open{color:var(--accent2)}.cal-complete-section{margin-top:18px}.cal-complete-section-title{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;font-weight:850;margin-bottom:8px}.cal-complete-empty{padding:12px;border:1px dashed var(--line);border-radius:11px;color:var(--muted);font-size:12px;text-align:center}.cal-complete-summary{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 2px}.cal-complete-summary .badge{font-size:10px}
    `;document.head.appendChild(st);
  }

  function allForDay(key){
    const out={goals:[],subgoals:[],tasks:[],bills:[],habits:[]};
    (state.goals||[]).forEach(g=>{
      if(g.startDate===key)out.goals.push({kind:'Goal starts',g});
      if(goalEnd(g)===key)out.goals.push({kind:'Goal due',g});
      (g.subgoals||[]).forEach(s=>{
        if(s.startDate===key)out.subgoals.push({kind:'Subgoal starts',g,s});
        if(subEnd(s)===key)out.subgoals.push({kind:'Subgoal due',g,s});
      });
    });
    (state.tasks||[]).filter(t=>t.date===key).forEach(t=>{if(t.kind==='bill')out.bills.push(t);else out.tasks.push(t);});
    if(typeof habitScheduled==='function'){
      (state.habits||[]).filter(h=>habitScheduled(h,key)).forEach(h=>out.habits.push(h));
    }
    return out;
  }

  function row(dot,title,meta,status='',action=''){
    return `<div class="cal-complete-row"><i class="cal-dot ${dot}"></i><div class="cal-complete-main"><div class="cal-complete-title">${safe(title)}</div><div class="cal-complete-meta">${safe(meta)}</div></div>${status?`<span class="cal-complete-status ${status==='Done'?'done':'open'}">${safe(status)}</span>`:''}${action}</div>`;
  }
  function section(title,html){return `<section class="cal-complete-section"><div class="cal-complete-section-title">${safe(title)}</div><div class="cal-complete-list">${html||'<div class="cal-complete-empty">Nothing scheduled.</div>'}</div></section>`;}

  function openCompleteDay(key){
    ensureStyles();
    const data=allForDay(key);
    const total=data.goals.length+data.subgoals.length+data.tasks.length+data.bills.length+data.habits.length;
    const goalRows=data.goals.map(x=>row(x.kind==='Goal starts'?'start':'due',x.g.title,x.kind,'',`<button type="button" class="link-btn complete-open-goal" data-id="${safe(x.g.id)}">Open</button>`)).join('');
    const subRows=data.subgoals.map(x=>row(x.kind==='Subgoal starts'?'subgoal-start':'subgoal-due',x.s.title,`${x.kind} · ${x.g.title}`,x.s.done?'Done':'Open',`<button type="button" class="link-btn complete-open-goal" data-id="${safe(x.g.id)}">Goal</button>`)).join('');
    const taskRows=data.tasks.map(t=>{const g=goalFor(t.goalId),rec=t.seriesId?' · recurring':'';return row('task',t.title,`${g?.title||'Unlinked task'}${rec}`,t.done?'Done':'Open');}).join('');
    const billRows=data.bills.map(t=>{const g=goalFor(t.goalId),amt=Number(t.amount)>0?money.format(Number(t.amount)):'';return row('bill',t.billName||String(t.title||'').replace(/^Bill:\s*/i,''),`${g?.title||'Bill'}${amt?` · ${amt}`:''}${t.seriesId?' · recurring':''}`,t.done?'Done':'Open');}).join('');
    const habitRows=data.habits.map(h=>{const g=goalFor(h.goalId),done=(h.days||[]).includes(key);return row('habit',h.title,g?.title||'Habit',done?'Done':'Open');}).join('');
    modal(`<div class="kicker">Calendar day</div><h2>${safe(fmtDate(key))}</h2><div class="cal-complete-summary"><span class="badge">${total} scheduled</span>${data.subgoals.length?`<span class="badge">${data.subgoals.length} subgoal ${data.subgoals.length===1?'event':'events'}</span>`:''}${data.tasks.length+data.bills.length?`<span class="badge">${data.tasks.length+data.bills.length} tasks/bills</span>`:''}</div>${section('Goals',goalRows)}${section('Subgoals',subRows)}${section('Tasks',taskRows)}${section('Bills',billRows)}${section('Habits',habitRows)}<div class="modal-actions"><button type="button" class="secondary-btn close-modal">Close</button><button type="button" id="completeAddTask" class="primary-btn">+ Add task</button></div>`);
    document.querySelectorAll('.complete-open-goal').forEach(b=>b.onclick=()=>{close();openGoal(b.dataset.id);});
    const add=document.querySelector('#completeAddTask');if(add)add.onclick=()=>{close();setTimeout(()=>{const cell=document.querySelector(`[data-cal-date="${CSS.escape(key)}"]`);if(cell)cell.click();},0);};
  }

  function annotateGrid(){
    ensureStyles();
    if(typeof window.applyTudruntWebBetaDates==='function')window.applyTudruntWebBetaDates();
    const view=document.querySelector('#calendarView');if(!view)return;
    const legend=view.querySelector('.cal-legend');
    if(legend&&!legend.querySelector('.complete-subgoal-legend')){
      const el=document.createElement('span');el.className='complete-subgoal-legend';el.innerHTML='<i class="cal-dot subgoal-start"></i>Subgoal start&nbsp;&nbsp;<i class="cal-dot subgoal-due"></i>Subgoal due';legend.appendChild(el);
    }
    (state.goals||[]).forEach(g=>(g.subgoals||[]).forEach(s=>{
      [[s.startDate,'subgoal-start',`Subgoal start: ${s.title}`],[subEnd(s),'subgoal-due',`Subgoal due: ${s.title}`]].forEach(([key,type,label])=>{
        if(!key)return;
        const cell=view.querySelector(`[data-cal-date="${CSS.escape(key)}"]`),box=cell?.querySelector('.cal-events');if(!box)return;
        if(box.querySelector(`[data-subgoal-id="${CSS.escape(String(s.id))}"][data-subgoal-type="${type}"]`))return;
        const pill=document.createElement('div');pill.className=`cal-pill ${type}${s.done?' done':''}`;pill.dataset.subgoalId=String(s.id);pill.dataset.subgoalType=type;pill.title=label;pill.innerHTML=`<i class="cal-dot ${type}"></i><span class="cal-text">${safe(label)}</span>`;box.appendChild(pill);
      });
    }));
  }

  // Capture day clicks before the original partial day modal runs.
  document.addEventListener('click',e=>{
    const day=e.target.closest('#calendarView [data-cal-date]');
    if(day){e.preventDefault();e.stopImmediatePropagation();openCompleteDay(day.dataset.calDate);return;}
    if(e.target.closest('[data-view="calendar"],#calPrev,#calNext,#calToday'))setTimeout(annotateGrid,30);
  },true);

  // Re-annotate after app renders or cloud data arrives.
  if(typeof render==='function'){
    const base=render;render=function(){const result=base.apply(this,arguments);setTimeout(annotateGrid,30);return result;};
  }
  setTimeout(annotateGrid,50);setTimeout(annotateGrid,500);setTimeout(annotateGrid,1500);
})();