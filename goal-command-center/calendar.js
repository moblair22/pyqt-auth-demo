// Calendar planning view: goal start/due dates plus date-specific tasks.
(() => {
  let visibleMonth = (() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  })();
  let selectedDate = '';

  const pad = n => String(n).padStart(2,'0');
  const dayKey = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;
  const todayKey = () => {
    const d = new Date();
    return dayKey(d.getFullYear(),d.getMonth(),d.getDate());
  };
  const parseKey = key => {
    const [y,m,d] = String(key||'').split('-').map(Number);
    return { y, m:m-1, d };
  };
  const formatLong = key => {
    const p=parseKey(key);
    if(!p.y||p.m<0||!p.d)return key;
    return new Date(p.y,p.m,p.d).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  };
  const monthLabel = () => new Date(visibleMonth.y,visibleMonth.m,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const goalEnd = g => g?.endDate || g?.targetDate || '';

  function ensureCalendarUI(){
    const nav=document.querySelector('.nav');
    if(nav&&!document.querySelector('[data-view="calendar"]')){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='nav-item';
      btn.dataset.view='calendar';
      btn.innerHTML='▦ <span>Calendar</span>';
      document.querySelector('[data-view="today"]')?.after(btn);
      btn.onclick=()=>switchView('calendar');
    }
    if(!document.querySelector('#calendarView')){
      const s=document.createElement('section');
      s.id='calendarView';
      s.className='view';
      document.querySelector('#habitsView')?.before(s);
    }
    ensureCalendarStyle();
  }

  function ensureCalendarStyle(){
    if(document.querySelector('#calendarStyle'))return;
    const s=document.createElement('style');
    s.id='calendarStyle';
    s.textContent=`
      .cal-shell{display:grid;gap:14px}
      .cal-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .cal-toolbar h2{margin:0;font-size:22px}
      .cal-actions{display:flex;gap:8px;flex-wrap:wrap}
      .cal-legend{display:flex;gap:14px;flex-wrap:wrap;color:var(--muted);font-size:12px}
      .cal-legend span{display:inline-flex;align-items:center;gap:6px}.cal-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
      .cal-dot.start{background:var(--accent2)}.cal-dot.due{background:var(--danger)}.cal-dot.task{background:var(--accent)}
      .cal-weekdays,.cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
      .cal-weekday{text-align:center;color:var(--muted);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:4px 0}
      .cal-day{min-width:0;min-height:108px;border:1px solid var(--line);border-radius:13px;background:rgba(8,17,31,.55);color:var(--text);padding:8px;text-align:left;display:flex;flex-direction:column;gap:5px;overflow:hidden}
      .cal-day:hover,.cal-day:focus-visible{border-color:#527397;outline:none}.cal-day.outside{opacity:.42}.cal-day.today{box-shadow:inset 0 0 0 1px var(--accent)}.cal-day.selected{background:var(--soft)}
      .cal-num{font-size:12px;font-weight:850}.cal-events{display:grid;gap:3px;min-width:0}.cal-pill{display:flex;align-items:center;gap:5px;min-width:0;font-size:10px;padding:3px 5px;border-radius:7px;background:var(--panel2);white-space:nowrap;overflow:hidden}.cal-pill span:last-child{overflow:hidden;text-overflow:ellipsis}.cal-pill.start{border-left:3px solid var(--accent2)}.cal-pill.due{border-left:3px solid var(--danger)}.cal-pill.task{border-left:3px solid var(--accent)}
      .cal-more{font-size:10px;color:var(--muted);padding-left:4px}
      .cal-day-list{display:grid;gap:10px;margin-top:14px}.cal-section-title{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;font-weight:800;margin-top:16px}
      .cal-event-row{display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:rgba(8,17,31,.55)}.cal-event-row .task-main{min-width:0}
      @media(max-width:650px){
        .cal-weekdays,.cal-grid{gap:3px}.cal-weekday{font-size:9px}.cal-day{min-height:68px;padding:5px;border-radius:9px;gap:3px}.cal-num{font-size:11px}.cal-pill{padding:0;background:transparent;border-left:0!important;gap:3px}.cal-pill .cal-text{display:none}.cal-pill .cal-dot{width:6px;height:6px}.cal-more{font-size:8px;padding-left:0}.cal-toolbar h2{font-size:19px}
      }
    `;
    document.head.appendChild(s);
  }

  function eventsFor(key){
    const items=[];
    (state.goals||[]).forEach(g=>{
      if(g.startDate===key)items.push({type:'start',label:`Start: ${g.title}`,goalId:g.id});
      if(goalEnd(g)===key)items.push({type:'due',label:`Due: ${g.title}`,goalId:g.id});
    });
    const tasks=(state.tasks||[]).filter(t=>t.date===key);
    tasks.forEach(t=>items.push({type:'task',label:t.title,taskId:t.id,goalId:t.goalId||''}));
    return items;
  }

  function renderCalendar(){
    ensureCalendarUI();
    const v=document.querySelector('#calendarView');
    if(!v)return;
    const first=new Date(visibleMonth.y,visibleMonth.m,1);
    const startOffset=first.getDay();
    const gridStart=new Date(visibleMonth.y,visibleMonth.m,1-startOffset);
    const days=[];
    for(let i=0;i<42;i++){
      const d=new Date(gridStart.getFullYear(),gridStart.getMonth(),gridStart.getDate()+i);
      const key=dayKey(d.getFullYear(),d.getMonth(),d.getDate());
      const events=eventsFor(key);
      const shown=events.slice(0,3).map(ev=>`<div class="cal-pill ${ev.type}" title="${esc(ev.label)}"><i class="cal-dot ${ev.type}"></i><span class="cal-text">${esc(ev.label)}</span></div>`).join('');
      const more=events.length>3?`<div class="cal-more">+${events.length-3} more</div>`:'';
      const outside=d.getMonth()!==visibleMonth.m?' outside':'';
      const today=key===todayKey()?' today':'';
      const selected=key===selectedDate?' selected':'';
      days.push(`<button type="button" class="cal-day${outside}${today}${selected}" data-cal-date="${key}" aria-label="${esc(formatLong(key))}, ${events.length} items"><span class="cal-num">${d.getDate()}</span><span class="cal-events">${shown}${more}</span></button>`);
    }
    v.innerHTML=`<div class="cal-shell">
      <div class="cal-toolbar"><div><div class="kicker">Plan by date</div><h2>${esc(monthLabel())}</h2></div><div class="cal-actions"><button id="calPrev" class="secondary-btn">←</button><button id="calToday" class="secondary-btn">Today</button><button id="calNext" class="secondary-btn">→</button></div></div>
      <div class="cal-legend"><span><i class="cal-dot start"></i>Goal start</span><span><i class="cal-dot due"></i>Goal due</span><span><i class="cal-dot task"></i>Task</span></div>
      <div class="cal-weekdays">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<div class="cal-weekday">${x}</div>`).join('')}</div>
      <div class="cal-grid">${days.join('')}</div>
    </div>`;
    document.querySelector('#calPrev').onclick=()=>changeMonth(-1);
    document.querySelector('#calNext').onclick=()=>changeMonth(1);
    document.querySelector('#calToday').onclick=()=>{const d=new Date();visibleMonth={y:d.getFullYear(),m:d.getMonth()};selectedDate=todayKey();renderCalendar();};
    v.querySelectorAll('[data-cal-date]').forEach(b=>b.onclick=()=>openDay(b.dataset.calDate));
  }

  function changeMonth(delta){
    const d=new Date(visibleMonth.y,visibleMonth.m+delta,1);
    visibleMonth={y:d.getFullYear(),m:d.getMonth()};
    renderCalendar();
  }

  function openDay(key){
    selectedDate=key;
    const goalEvents=[];
    (state.goals||[]).forEach(g=>{
      if(g.startDate===key)goalEvents.push({kind:'Goal starts',g});
      if(goalEnd(g)===key)goalEvents.push({kind:'Goal due',g});
    });
    const tasks=(state.tasks||[]).filter(t=>t.date===key);
    const goalRows=goalEvents.map(x=>`<div class="cal-event-row"><i class="cal-dot ${x.kind==='Goal starts'?'start':'due'}"></i><div class="task-main"><div class="task-title">${esc(x.g.title)}</div><div class="task-sub">${esc(x.kind)}</div></div><button type="button" class="link-btn cal-open-goal" data-id="${esc(x.g.id)}">Open</button></div>`).join('')||'<div class="empty">No goal starts or due dates.</div>';
    const taskRows=tasks.map(t=>{const g=(state.goals||[]).find(x=>String(x.id)===String(t.goalId));return `<div class="cal-event-row"><input type="checkbox" class="cal-task-check" data-id="${esc(t.id)}" ${t.done?'checked':''}><div class="task-main"><div class="task-title ${t.done?'done':''}">${esc(t.title)}</div><div class="task-sub">${esc(g?.title||'Unlinked task')}</div></div><button type="button" class="icon-btn cal-task-del" data-id="${esc(t.id)}">×</button></div>`}).join('')||'<div class="empty">No tasks scheduled.</div>';
    modal(`<div class="kicker">Calendar day</div><h2>${esc(formatLong(key))}</h2>
      <div class="cal-section-title">Goals</div><div class="cal-day-list">${goalRows}</div>
      <div class="cal-section-title">Tasks</div><div class="cal-day-list">${taskRows}</div>
      <div class="cal-section-title">Add a task</div>
      <div class="field"><label>Task</label><input id="calTaskTitle" placeholder="What needs to get done?"></div>
      <div class="field"><label>Link to goal</label><select id="calTaskGoal"><option value="">No goal</option>${(state.goals||[]).map(g=>`<option value="${esc(g.id)}">${esc(g.title)}</option>`).join('')}</select></div>
      <div class="modal-actions"><button type="button" class="secondary-btn close-modal">Close</button><button type="button" id="calAddTask" class="primary-btn">Add task</button></div>`);
    document.querySelector('#calAddTask').onclick=()=>{
      const title=document.querySelector('#calTaskTitle').value.trim();
      if(!title)return toast('Enter a task');
      state.tasks=Array.isArray(state.tasks)?state.tasks:[];
      state.tasks.unshift({id:id(),goalId:document.querySelector('#calTaskGoal').value||null,title,date:key,done:false});
      save();openDay(key);toast('Task added');
    };
    document.querySelectorAll('.cal-task-check').forEach(c=>c.onchange=()=>{const t=state.tasks.find(x=>String(x.id)===String(c.dataset.id));if(t)t.done=c.checked;save();openDay(key)});
    document.querySelectorAll('.cal-task-del').forEach(b=>b.onclick=()=>{state.tasks=state.tasks.filter(x=>String(x.id)!==String(b.dataset.id));save();openDay(key)});
    document.querySelectorAll('.cal-open-goal').forEach(b=>b.onclick=()=>{close();openGoal(b.dataset.id)});
  }

  ensureCalendarUI();
  const baseSwitch=switchView;
  switchView=function(v){
    baseSwitch(v);
    if(v==='calendar'){
      renderCalendar();
      const title=document.querySelector('#viewTitle');if(title)title.textContent='Calendar';
      document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view==='calendar'));
    }
  };
  const baseRender=render;
  render=function(){baseRender();ensureCalendarUI();renderCalendar();};
  renderCalendar();
})();
