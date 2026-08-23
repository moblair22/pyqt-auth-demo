// Calendar planning view: goal dates, one-time tasks, and weekly recurring task series.
(() => {
  let visibleMonth=(()=>{const d=new Date();return{y:d.getFullYear(),m:d.getMonth()}})();
  let selectedDate='';
  const pad=n=>String(n).padStart(2,'0');
  const dayKey=(y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`;
  const todayKey=()=>{const d=new Date();return dayKey(d.getFullYear(),d.getMonth(),d.getDate())};
  const parseKey=key=>{const [y,m,d]=String(key||'').split('-').map(Number);return{y,m:m-1,d}};
  const keyDate=key=>{const p=parseKey(key);return new Date(p.y,p.m,p.d)};
  const formatLong=key=>{const p=parseKey(key);if(!p.y||p.m<0||!p.d)return key;return new Date(p.y,p.m,p.d).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})};
  const monthLabel=()=>new Date(visibleMonth.y,visibleMonth.m,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const goalEnd=g=>g?.endDate||g?.targetDate||'';
  const weekdayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function addDaysToKey(key,n){const d=keyDate(key);d.setDate(d.getDate()+n);return dayKey(d.getFullYear(),d.getMonth(),d.getDate())}
  function taskGoal(t){return(state.goals||[]).find(g=>String(g.id)===String(t.goalId))}
  function isRecurring(t){return!!t?.seriesId}
  function seriesTasks(seriesId){return(state.tasks||[]).filter(t=>String(t.seriesId||'')===String(seriesId||''))}
  function seriesMeta(task){
    const list=isRecurring(task)?seriesTasks(task.seriesId):[];
    const dates=list.map(t=>t.date).filter(Boolean).sort();
    const start=task?.recurrenceStart||dates[0]||task?.date||todayKey();
    const end=task?.recurrenceEnd||dates[dates.length-1]||task?.date||start;
    let days=Array.isArray(task?.recurrenceDays)?task.recurrenceDays.map(Number).filter(n=>n>=0&&n<=6):[];
    if(!days.length)days=[...new Set(list.map(t=>keyDate(t.date).getDay()))].sort((a,b)=>a-b);
    return{start,end,days};
  }
  function recurrenceText(task){if(!isRecurring(task))return'';const m=seriesMeta(task);return`Repeats ${m.days.map(d=>weekdayNames[d]).join(', ')} · ${formatShort(m.start)} → ${formatShort(m.end)}`}
  function formatShort(key){const p=parseKey(key);if(!p.y||p.m<0||!p.d)return key;return new Date(p.y,p.m,p.d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}

  function ensureCalendarUI(){
    const nav=document.querySelector('.nav');
    if(nav&&!document.querySelector('[data-view="calendar"]')){
      const btn=document.createElement('button');btn.type='button';btn.className='nav-item';btn.dataset.view='calendar';btn.innerHTML='▦ <span>Calendar</span>';
      document.querySelector('[data-view="today"]')?.after(btn);btn.onclick=()=>switchView('calendar');
    }
    if(!document.querySelector('#calendarView')){const s=document.createElement('section');s.id='calendarView';s.className='view';document.querySelector('#habitsView')?.before(s)}
    ensureCalendarStyle();
  }

  function ensureCalendarStyle(){
    if(document.querySelector('#calendarStyle'))return;
    const s=document.createElement('style');s.id='calendarStyle';s.textContent=`
      .cal-shell{display:grid;gap:14px}.cal-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.cal-toolbar h2{margin:0;font-size:22px}.cal-actions{display:flex;gap:8px;flex-wrap:wrap}
      .cal-legend{display:flex;gap:14px;flex-wrap:wrap;color:var(--muted);font-size:12px}.cal-legend span{display:inline-flex;align-items:center;gap:6px}.cal-dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex:0 0 auto}.cal-dot.start{background:var(--accent2)}.cal-dot.due{background:var(--danger)}.cal-dot.task{background:var(--accent)}
      .cal-weekdays,.cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.cal-weekday{text-align:center;color:var(--muted);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:4px 0}
      .cal-day{min-width:0;min-height:108px;border:1px solid var(--line);border-radius:13px;background:rgba(8,17,31,.55);color:var(--text);padding:8px;text-align:left;display:flex;flex-direction:column;gap:5px;overflow:hidden}.cal-day:hover,.cal-day:focus-visible{border-color:#527397;outline:none}.cal-day.outside{opacity:.42}.cal-day.today{box-shadow:inset 0 0 0 1px var(--accent)}.cal-day.selected{background:var(--soft)}
      .cal-num{font-size:12px;font-weight:850}.cal-events{display:grid;gap:3px;min-width:0}.cal-pill{display:flex;align-items:center;gap:5px;min-width:0;font-size:10px;padding:3px 5px;border-radius:7px;background:var(--panel2);white-space:nowrap;overflow:hidden}.cal-pill span:last-child{overflow:hidden;text-overflow:ellipsis}.cal-pill.start{border-left:3px solid var(--accent2)}.cal-pill.due{border-left:3px solid var(--danger)}.cal-pill.task{border-left:3px solid var(--accent)}.cal-more{font-size:10px;color:var(--muted);padding-left:4px}
      .cal-day-list{display:grid;gap:10px;margin-top:14px}.cal-section-title{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;font-weight:800;margin-top:16px}.cal-event-row{display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:rgba(8,17,31,.55)}.cal-event-row .task-main{min-width:0}.cal-row-actions{display:flex;align-items:center;gap:4px}.cal-recurring-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;color:var(--accent2);margin-top:4px}
      .cal-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 13px;border:1px solid var(--line);border-radius:12px;background:rgba(8,17,31,.45);margin-top:14px}.cal-toggle-row label{font-size:13px;font-weight:750}.cal-toggle-row input{width:20px;height:20px;accent-color:var(--accent)}
      .cal-recur-box{margin-top:12px;padding:14px;border:1px solid var(--line);border-radius:14px;background:rgba(8,17,31,.4)}.cal-recur-box.hidden{display:none!important}.cal-day-picks{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:8px}.cal-day-pick{position:relative}.cal-day-pick input{position:absolute;opacity:0;pointer-events:none}.cal-day-pick span{display:grid;place-items:center;min-height:38px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--muted);font-size:11px;font-weight:800;cursor:pointer}.cal-day-pick input:checked+span{background:var(--accent);border-color:var(--accent);color:#06120e}.cal-day-pick input:focus-visible+span{outline:2px solid var(--accent2);outline-offset:2px}
      .cal-scope-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.cal-scope-actions button{width:100%}.cal-help-text{font-size:12px;color:var(--muted);line-height:1.45;margin-top:8px}
      @media(max-width:650px){.cal-weekdays,.cal-grid{gap:3px}.cal-weekday{font-size:9px}.cal-day{min-height:68px;padding:5px;border-radius:9px;gap:3px}.cal-num{font-size:11px}.cal-pill{padding:0;background:transparent;border-left:0!important;gap:3px}.cal-pill .cal-text{display:none}.cal-pill .cal-dot{width:6px;height:6px}.cal-more{font-size:8px;padding-left:0}.cal-toolbar h2{font-size:19px}.cal-day-picks{gap:4px}.cal-day-pick span{min-height:36px;font-size:9px}.cal-event-row{align-items:flex-start}.cal-row-actions{margin-left:auto}.cal-scope-actions{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function eventsFor(key){
    const items=[];
    (state.goals||[]).forEach(g=>{if(g.startDate===key)items.push({type:'start',label:`Start: ${g.title}`,goalId:g.id});if(goalEnd(g)===key)items.push({type:'due',label:`Due: ${g.title}`,goalId:g.id})});
    (state.tasks||[]).filter(t=>t.date===key).forEach(t=>items.push({type:'task',label:`${isRecurring(t)?'↻ ':''}${t.title}`,taskId:t.id,goalId:t.goalId||''}));
    return items;
  }

  function renderCalendar(){
    ensureCalendarUI();const v=document.querySelector('#calendarView');if(!v)return;
    const first=new Date(visibleMonth.y,visibleMonth.m,1),startOffset=first.getDay(),gridStart=new Date(visibleMonth.y,visibleMonth.m,1-startOffset),days=[];
    for(let i=0;i<42;i++){
      const d=new Date(gridStart.getFullYear(),gridStart.getMonth(),gridStart.getDate()+i),key=dayKey(d.getFullYear(),d.getMonth(),d.getDate()),events=eventsFor(key);
      const shown=events.slice(0,3).map(ev=>`<div class="cal-pill ${ev.type}" title="${esc(ev.label)}"><i class="cal-dot ${ev.type}"></i><span class="cal-text">${esc(ev.label)}</span></div>`).join('');
      const more=events.length>3?`<div class="cal-more">+${events.length-3} more</div>`:'',outside=d.getMonth()!==visibleMonth.m?' outside':'',today=key===todayKey()?' today':'',selected=key===selectedDate?' selected':'';
      days.push(`<button type="button" class="cal-day${outside}${today}${selected}" data-cal-date="${key}" aria-label="${esc(formatLong(key))}, ${events.length} items"><span class="cal-num">${d.getDate()}</span><span class="cal-events">${shown}${more}</span></button>`);
    }
    v.innerHTML=`<div class="cal-shell"><div class="cal-toolbar"><div><div class="kicker">Plan by date</div><h2>${esc(monthLabel())}</h2></div><div class="cal-actions"><button id="calPrev" class="secondary-btn">←</button><button id="calToday" class="secondary-btn">Today</button><button id="calNext" class="secondary-btn">→</button></div></div><div class="cal-legend"><span><i class="cal-dot start"></i>Goal start</span><span><i class="cal-dot due"></i>Goal due</span><span><i class="cal-dot task"></i>Task</span><span>↻ Recurring</span></div><div class="cal-weekdays">${weekdayNames.map(x=>`<div class="cal-weekday">${x}</div>`).join('')}</div><div class="cal-grid">${days.join('')}</div></div>`;
    document.querySelector('#calPrev').onclick=()=>changeMonth(-1);document.querySelector('#calNext').onclick=()=>changeMonth(1);document.querySelector('#calToday').onclick=()=>{const d=new Date();visibleMonth={y:d.getFullYear(),m:d.getMonth()};selectedDate=todayKey();renderCalendar()};v.querySelectorAll('[data-cal-date]').forEach(b=>b.onclick=()=>openDay(b.dataset.calDate));
  }
  function changeMonth(delta){const d=new Date(visibleMonth.y,visibleMonth.m+delta,1);visibleMonth={y:d.getFullYear(),m:d.getMonth()};renderCalendar()}

  function goalOptions(selected=''){return`<option value="">No goal</option>${(state.goals||[]).map(g=>`<option value="${esc(g.id)}" ${String(g.id)===String(selected)?'selected':''}>${esc(g.title)}</option>`).join('')}`}
  function weekdayPicker(selected=[]){const set=new Set(selected.map(Number));return`<div class="cal-day-picks">${weekdayNames.map((name,i)=>`<label class="cal-day-pick"><input type="checkbox" class="cal-repeat-day" value="${i}" ${set.has(i)?'checked':''}><span>${name}</span></label>`).join('')}</div>`}
  function selectedWeekdays(root=document){return[...root.querySelectorAll('.cal-repeat-day:checked')].map(x=>Number(x.value)).sort((a,b)=>a-b)}

  function taskRowsForDay(tasks){
    return tasks.map(t=>{const g=taskGoal(t);return`<div class="cal-event-row"><input type="checkbox" class="cal-task-check" data-id="${esc(t.id)}" ${t.done?'checked':''}><div class="task-main"><div class="task-title ${t.done?'done':''}">${esc(t.title)}</div><div class="task-sub">${esc(g?.title||'Unlinked task')}</div>${isRecurring(t)?`<div class="cal-recurring-badge">↻ ${esc(recurrenceText(t))}</div>`:''}</div><div class="cal-row-actions"><button type="button" class="icon-btn cal-task-edit" data-id="${esc(t.id)}" title="Edit task">✎</button><button type="button" class="icon-btn cal-task-del" data-id="${esc(t.id)}" title="Delete task">×</button></div></div>`}).join('')||'<div class="empty">No tasks scheduled.</div>';
  }

  function openDay(key){
    selectedDate=key;const goalEvents=[];
    (state.goals||[]).forEach(g=>{if(g.startDate===key)goalEvents.push({kind:'Goal starts',g});if(goalEnd(g)===key)goalEvents.push({kind:'Goal due',g})});
    const tasks=(state.tasks||[]).filter(t=>t.date===key);
    const goalRows=goalEvents.map(x=>`<div class="cal-event-row"><i class="cal-dot ${x.kind==='Goal starts'?'start':'due'}"></i><div class="task-main"><div class="task-title">${esc(x.g.title)}</div><div class="task-sub">${esc(x.kind)}</div></div><button type="button" class="link-btn cal-open-goal" data-id="${esc(x.g.id)}">Open</button></div>`).join('')||'<div class="empty">No goal starts or due dates.</div>';
    const defaultDay=keyDate(key).getDay(),defaultEnd=addDaysToKey(key,28);
    modal(`<div class="kicker">Calendar day</div><h2>${esc(formatLong(key))}</h2><div class="cal-section-title">Goals</div><div class="cal-day-list">${goalRows}</div><div class="cal-section-title">Tasks</div><div class="cal-day-list">${taskRowsForDay(tasks)}</div><div class="cal-section-title">Add a task</div><div class="field"><label>Task</label><input id="calTaskTitle" placeholder="What needs to get done?"></div><div class="field"><label>Link to goal</label><select id="calTaskGoal">${goalOptions()}</select></div><div class="cal-toggle-row"><label for="calRecurring">Recurring task</label><input id="calRecurring" type="checkbox"></div><div id="calRecurringFields" class="cal-recur-box hidden"><div class="form-grid"><div class="field"><label>Start date</label><input id="calStartDate" type="date" value="${key}"></div><div class="field"><label>End date</label><input id="calEndDate" type="date" value="${defaultEnd}"></div></div><div class="field"><label>Repeat on</label>${weekdayPicker([defaultDay])}<div class="cal-help-text">Choose one or more weekdays. Every matching date between the start and end dates becomes its own task occurrence.</div></div></div><div class="modal-actions"><button type="button" class="secondary-btn close-modal">Close</button><button type="button" id="calAddTask" class="primary-btn">Add task</button></div>`);
    const recur=document.querySelector('#calRecurring'),fields=document.querySelector('#calRecurringFields');recur.onchange=()=>fields.classList.toggle('hidden',!recur.checked);
    document.querySelector('#calAddTask').onclick=()=>addTaskFromDay(key);
    document.querySelectorAll('.cal-task-check').forEach(c=>c.onchange=()=>{const t=state.tasks.find(x=>String(x.id)===String(c.dataset.id));if(t)t.done=c.checked;save();openDay(key)});
    document.querySelectorAll('.cal-task-edit').forEach(b=>b.onclick=()=>{const t=state.tasks.find(x=>String(x.id)===String(b.dataset.id));if(t)chooseScope('edit',t,key)});
    document.querySelectorAll('.cal-task-del').forEach(b=>b.onclick=()=>{const t=state.tasks.find(x=>String(x.id)===String(b.dataset.id));if(t)chooseScope('delete',t,key)});
    document.querySelectorAll('.cal-open-goal').forEach(b=>b.onclick=()=>{close();openGoal(b.dataset.id)});
  }

  function addTaskFromDay(key){
    const title=document.querySelector('#calTaskTitle')?.value.trim(),goalId=document.querySelector('#calTaskGoal')?.value||null,recurring=!!document.querySelector('#calRecurring')?.checked;
    if(!title)return toast('Enter a task');state.tasks=Array.isArray(state.tasks)?state.tasks:[];
    if(!recurring){state.tasks.unshift({id:id(),goalId,title,date:key,done:false});save();openDay(key);toast('Task added');return}
    const start=document.querySelector('#calStartDate')?.value||'',end=document.querySelector('#calEndDate')?.value||'',days=selectedWeekdays();
    if(!start||!end)return toast('Choose a start and end date');if(end<start)return toast('End date must be on or after start date');if(!days.length)return toast('Choose at least one weekday');
    const made=buildSeries({seriesId:id(),title,goalId,start,end,days});if(!made)return;save();openDay(key);toast(`${made} recurring tasks added`);
  }

  function buildSeries({seriesId,title,goalId,start,end,days,doneByDate={}}){
    const startD=keyDate(start),endD=keyDate(end),maxDays=730;if((endD-startD)/86400000>maxDays){toast('Recurring task range can be up to 2 years');return 0}
    const wanted=new Set(days.map(Number));let count=0;
    for(let d=new Date(startD),guard=0;d<=endD&&guard<=maxDays+2;d.setDate(d.getDate()+1),guard++){
      if(!wanted.has(d.getDay()))continue;const date=dayKey(d.getFullYear(),d.getMonth(),d.getDate());state.tasks.push({id:id(),seriesId,title,goalId:goalId||null,date,done:!!doneByDate[date],recurrenceType:'weekly',recurrenceStart:start,recurrenceEnd:end,recurrenceDays:[...days]});count++;
    }
    return count;
  }

  function chooseScope(action,task,returnKey){
    if(!isRecurring(task)){action==='edit'?editOneTask(task,returnKey):deleteOneTask(task,returnKey);return}
    const verb=action==='edit'?'Edit':'Delete';
    modal(`<div class="kicker">Recurring task</div><h2>${verb} recurring task</h2><p>${esc(task.title)}</p><div class="cal-help-text">Choose whether this change applies only to ${esc(formatLong(task.date))} or to the entire recurring series.</div><div class="cal-scope-actions"><button id="calScopeOne" class="secondary-btn">This occurrence only</button><button id="calScopeSeries" class="primary-btn">Entire series</button></div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button></div>`);
    document.querySelector('#calScopeOne').onclick=()=>action==='edit'?editOneTask(task,returnKey):deleteOneTask(task,returnKey);
    document.querySelector('#calScopeSeries').onclick=()=>action==='edit'?editSeries(task,returnKey):deleteSeries(task,returnKey);
  }

  function editOneTask(task,returnKey){
    modal(`<div class="kicker">Task</div><h2>Edit this occurrence</h2><div class="field"><label>Task</label><input id="calEditTitle" value="${esc(task.title)}"></div><div class="field"><label>Link to goal</label><select id="calEditGoal">${goalOptions(task.goalId)}</select></div><div class="field"><label>Date</label><input id="calEditDate" type="date" value="${esc(task.date)}"></div>${isRecurring(task)?'<div class="cal-help-text">Saving this occurrence separately will detach it from the recurring series. The rest of the series will stay unchanged.</div>':''}<div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="calSaveOne" class="primary-btn">Save occurrence</button></div>`);
    document.querySelector('#calSaveOne').onclick=()=>{const title=document.querySelector('#calEditTitle').value.trim(),date=document.querySelector('#calEditDate').value;if(!title)return toast('Enter a task');if(!date)return toast('Choose a date');task.title=title;task.goalId=document.querySelector('#calEditGoal').value||null;task.date=date;if(isRecurring(task)){delete task.seriesId;delete task.recurrenceType;delete task.recurrenceStart;delete task.recurrenceEnd;delete task.recurrenceDays}save();openDay(returnKey);toast('Occurrence updated')};
  }

  function editSeries(task,returnKey){
    const meta=seriesMeta(task);
    modal(`<div class="kicker">Recurring series</div><h2>Edit entire series</h2><div class="field"><label>Task</label><input id="calSeriesTitle" value="${esc(task.title)}"></div><div class="field"><label>Link to goal</label><select id="calSeriesGoal">${goalOptions(task.goalId)}</select></div><div class="form-grid"><div class="field"><label>Start date</label><input id="calSeriesStart" type="date" value="${esc(meta.start)}"></div><div class="field"><label>End date</label><input id="calSeriesEnd" type="date" value="${esc(meta.end)}"></div></div><div class="field"><label>Repeat on</label>${weekdayPicker(meta.days)}</div><div class="cal-help-text">Completed occurrences on dates that remain in the new schedule will stay completed.</div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="calSaveSeries" class="primary-btn">Save series</button></div>`);
    document.querySelector('#calSaveSeries').onclick=()=>{const title=document.querySelector('#calSeriesTitle').value.trim(),goalId=document.querySelector('#calSeriesGoal').value||null,start=document.querySelector('#calSeriesStart').value,end=document.querySelector('#calSeriesEnd').value,days=selectedWeekdays();if(!title)return toast('Enter a task');if(!start||!end)return toast('Choose a start and end date');if(end<start)return toast('End date must be on or after start date');if(!days.length)return toast('Choose at least one weekday');const old=seriesTasks(task.seriesId),doneByDate={};old.forEach(t=>{if(t.done)doneByDate[t.date]=true});const seriesId=task.seriesId;state.tasks=state.tasks.filter(t=>String(t.seriesId||'')!==String(seriesId));const made=buildSeries({seriesId,title,goalId,start,end,days,doneByDate});if(!made){state.tasks.push(...old);return}save();openDay(returnKey);toast('Recurring series updated')};
  }

  function deleteOneTask(task,returnKey){state.tasks=state.tasks.filter(t=>String(t.id)!==String(task.id));save();openDay(returnKey);toast(isRecurring(task)?'Occurrence deleted':'Task deleted')}
  function deleteSeries(task,returnKey){const seriesId=task.seriesId;state.tasks=state.tasks.filter(t=>String(t.seriesId||'')!==String(seriesId));save();openDay(returnKey);toast('Recurring series deleted')}

  ensureCalendarUI();
  const baseSwitch=switchView;switchView=function(v){baseSwitch(v);if(v==='calendar'){renderCalendar();const title=document.querySelector('#viewTitle');if(title)title.textContent='Calendar';document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view==='calendar'))}};
  const baseRender=render;render=function(){baseRender();ensureCalendarUI();renderCalendar()};renderCalendar();
})();
