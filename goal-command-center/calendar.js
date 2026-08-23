// Calendar planning view: goal dates, task urgency, bills, one-time tasks, and recurring weekly tasks.
(() => {
  let visibleMonth = (() => {
    const d = new Date();
    return { y:d.getFullYear(), m:d.getMonth() };
  })();
  let selectedDate = '';

  const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const pad = n => String(n).padStart(2,'0');
  const dayKey = (y,m,d) => `${y}-${pad(m+1)}-${pad(d)}`;
  const todayKey = () => {
    const d = new Date();
    return dayKey(d.getFullYear(), d.getMonth(), d.getDate());
  };
  const parseKey = key => {
    const [y,m,d] = String(key || '').split('-').map(Number);
    return { y, m:m-1, d };
  };
  const keyDate = key => {
    const p = parseKey(key);
    return new Date(p.y,p.m,p.d);
  };
  const formatLong = key => {
    const p = parseKey(key);
    if (!p.y || p.m < 0 || !p.d) return String(key || '');
    return new Date(p.y,p.m,p.d).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
  };
  const formatShort = key => {
    const p = parseKey(key);
    if (!p.y || p.m < 0 || !p.d) return String(key || '');
    return new Date(p.y,p.m,p.d).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
  };
  const monthLabel = () => new Date(visibleMonth.y,visibleMonth.m,1).toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const goalEnd = g => g?.endDate || g?.targetDate || '';
  const isRecurring = task => !!task?.seriesId;
  const isBill = task => task?.kind === 'bill';
  const billMoney = new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'});

  function addDaysToKey(key,n) {
    const d = keyDate(key);
    d.setDate(d.getDate()+n);
    return dayKey(d.getFullYear(),d.getMonth(),d.getDate());
  }

  function taskGoal(task) {
    return (state.goals || []).find(g => String(g.id) === String(task.goalId));
  }

  function seriesTasks(seriesId) {
    return (state.tasks || []).filter(t => String(t.seriesId || '') === String(seriesId || ''));
  }

  function seriesMeta(task) {
    const siblings = isRecurring(task) ? seriesTasks(task.seriesId) : [];
    const dates = siblings.map(t => t.date).filter(Boolean).sort();
    const start = task.recurrenceStart || dates[0] || task.date || todayKey();
    const end = task.recurrenceEnd || dates[dates.length-1] || task.date || start;
    let days = Array.isArray(task.recurrenceDays)
      ? task.recurrenceDays.map(Number).filter(n => n >= 0 && n <= 6)
      : [];
    if (!days.length && siblings.length && task.recurrenceType === 'weekly') {
      days = [...new Set(siblings.map(t => keyDate(t.date).getDay()))].sort((a,b) => a-b);
    }
    return { start,end,days };
  }

  function recurrenceText(task) {
    if (!isRecurring(task)) return '';
    const meta = seriesMeta(task);
    if (task.recurrenceType === 'bill-monthly') return `Monthly bill · ${formatShort(meta.start)} → ${formatShort(meta.end)}`;
    if (task.recurrenceType === 'bill-weekly') return `Weekly bill · ${formatShort(meta.start)} → ${formatShort(meta.end)}`;
    const names = meta.days.map(d => weekdayNames[d]).join(', ');
    return `${names || 'Weekly'} · ${formatShort(meta.start)} → ${formatShort(meta.end)}`;
  }

  function urgencyForDate(key) {
    const unfinished = (state.tasks || []).filter(t => !t.done && t.date === key);
    if (!unfinished.length) return null;
    const today = todayKey();
    const soonEnd = addDaysToKey(today,3);
    if (key < today) return { kind:'overdue', count:unfinished.length };
    if (key === today) return { kind:'today', count:unfinished.length };
    if (key > today && key <= soonEnd) return { kind:'soon', count:unfinished.length };
    return null;
  }

  function ensureCalendarUI() {
    const nav = document.querySelector('.nav');
    if (nav && !document.querySelector('[data-view="calendar"]')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-item';
      btn.dataset.view = 'calendar';
      btn.innerHTML = '▦ <span>Calendar</span>';
      document.querySelector('[data-view="today"]')?.after(btn);
      btn.onclick = () => switchView('calendar');
    }
    if (!document.querySelector('#calendarView')) {
      const section = document.createElement('section');
      section.id = 'calendarView';
      section.className = 'view';
      document.querySelector('#habitsView')?.before(section);
    }
    ensureCalendarStyle();
  }

  function ensureCalendarStyle() {
    if (document.querySelector('#calendarStyle')) return;
    const style = document.createElement('style');
    style.id = 'calendarStyle';
    style.textContent = `
      .cal-shell{display:grid;gap:14px}.cal-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.cal-toolbar h2{margin:0;font-size:22px}.cal-actions{display:flex;gap:8px;flex-wrap:wrap}
      .cal-legend{display:flex;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:11px}.cal-legend span{display:inline-flex;align-items:center;gap:6px}.cal-dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex:0 0 auto}.cal-dot.start{background:var(--accent2)}.cal-dot.due{background:var(--danger)}.cal-dot.task{background:var(--accent)}.cal-dot.bill{background:#f0b44d}
      .cal-urgency-key{width:10px;height:10px;border-radius:3px;display:inline-block}.cal-urgency-key.overdue{background:var(--danger)}.cal-urgency-key.today{background:var(--accent)}.cal-urgency-key.soon{background:var(--accent2)}
      .cal-weekdays,.cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.cal-weekday{text-align:center;color:var(--muted);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:4px 0}
      .cal-day{min-width:0;min-height:112px;border:1px solid var(--line);border-radius:13px;background:var(--panel);color:var(--text);padding:8px;text-align:left;display:flex;flex-direction:column;gap:5px;overflow:hidden;position:relative}.cal-day:hover,.cal-day:focus-visible{border-color:var(--accent2);outline:none}.cal-day.outside{opacity:.42}.cal-day.today{box-shadow:inset 0 0 0 1px var(--accent)}.cal-day.selected{outline:1px solid var(--accent2)}
      .cal-day.urg-overdue{border-color:var(--danger);background:color-mix(in srgb,var(--danger) 12%,var(--panel))}.cal-day.urg-today{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--panel))}.cal-day.urg-soon{border-color:var(--accent2);background:color-mix(in srgb,var(--accent2) 11%,var(--panel))}
      .cal-day.urg-overdue .cal-num{color:var(--danger)}.cal-day.urg-today .cal-num{color:var(--accent)}.cal-day.urg-soon .cal-num{color:var(--accent2)}.cal-num{font-size:12px;font-weight:850}
      .cal-urgency-chip{display:inline-flex;width:max-content;max-width:100%;padding:3px 6px;border-radius:999px;background:var(--panel2);font-size:9px;font-weight:850;line-height:1.1;margin-top:auto}.cal-urgency-chip.overdue{color:var(--danger)}.cal-urgency-chip.today{color:var(--accent)}.cal-urgency-chip.soon{color:var(--accent2)}
      .cal-events{display:grid;gap:3px;min-width:0}.cal-pill{display:flex;align-items:center;gap:5px;min-width:0;font-size:10px;padding:3px 5px;border-radius:7px;background:var(--panel2);white-space:nowrap;overflow:hidden}.cal-pill span:last-child{overflow:hidden;text-overflow:ellipsis}.cal-pill.start{border-left:3px solid var(--accent2)}.cal-pill.due{border-left:3px solid var(--danger)}.cal-pill.task{border-left:3px solid var(--accent)}.cal-pill.bill{border-left:3px solid #f0b44d}.cal-pill.done{opacity:.5}.cal-more{font-size:10px;color:var(--muted);padding-left:4px}
      .cal-day-list{display:grid;gap:10px;margin-top:12px}.cal-section-title{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;font-weight:800;margin-top:18px}.cal-event-row{display:flex;align-items:center;gap:10px;padding:11px 12px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}.cal-event-row .task-main{min-width:0;flex:1}.cal-row-actions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.cal-delete-task{padding:7px 10px!important;font-size:12px!important}.cal-recurring-badge{font-size:11px;color:var(--accent2);margin-top:4px;line-height:1.35}.cal-bill-meta{font-size:11px;color:#f0b44d;margin-top:4px;font-weight:800}
      .cal-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 13px;border:1px solid var(--line);border-radius:12px;background:var(--panel2);margin-top:14px}.cal-toggle-row label{font-size:13px;font-weight:750}.cal-toggle-row input{width:22px;height:22px;accent-color:var(--accent)}.cal-recur-box{margin-top:12px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--panel2)}
      .cal-day-picks{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:8px}.cal-day-pick{position:relative;display:block}.cal-day-pick input{position:absolute;opacity:0}.cal-day-pick span{display:grid;place-items:center;min-height:40px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--muted);font-size:11px;font-weight:800;cursor:pointer}.cal-day-pick input:checked+span{background:var(--accent);border-color:var(--accent);color:#06120e}.cal-day-pick input:focus-visible+span{outline:2px solid var(--accent2);outline-offset:2px}.cal-help-text{font-size:12px;color:var(--muted);line-height:1.45;margin-top:8px}.cal-scope-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}.cal-scope-actions button{width:100%}
      @media(max-width:650px){.cal-weekdays,.cal-grid{gap:3px}.cal-weekday{font-size:9px}.cal-day{min-height:74px;padding:5px;border-radius:9px;gap:3px}.cal-num{font-size:11px}.cal-pill{padding:0;background:transparent;border-left:0!important;gap:3px}.cal-pill .cal-text{display:none}.cal-pill .cal-dot{width:6px;height:6px}.cal-more{font-size:8px;padding-left:0}.cal-toolbar h2{font-size:19px}.cal-day-picks{gap:4px}.cal-day-pick span{min-height:38px;font-size:9px}.cal-event-row{align-items:flex-start;flex-wrap:wrap}.cal-row-actions{width:100%;justify-content:flex-end}.cal-scope-actions{grid-template-columns:1fr}.cal-urgency-chip{font-size:7px;padding:2px 4px}}
    `;
    document.head.appendChild(style);
  }

  function eventsFor(key) {
    const items = [];
    (state.goals || []).forEach(g => {
      if (g.startDate === key) items.push({type:'start',label:`Start: ${g.title}`,done:false});
      if (goalEnd(g) === key) items.push({type:'due',label:`Goal due: ${g.title}`,done:false});
    });
    (state.tasks || []).filter(t => t.date === key).forEach(t => {
      const type = isBill(t) ? 'bill' : 'task';
      const amount = isBill(t) && Number(t.amount)>0 ? ` ${billMoney.format(Number(t.amount))}` : '';
      const prefix = isBill(t) ? 'Bill:' : (isRecurring(t) ? '↻' : 'Task:');
      items.push({type,label:`${prefix} ${t.billName || t.title}${amount}`,done:!!t.done});
    });
    return items;
  }

  function renderCalendar() {
    ensureCalendarUI();
    const view = document.querySelector('#calendarView');
    if (!view) return;
    const first = new Date(visibleMonth.y,visibleMonth.m,1);
    const startOffset = first.getDay();
    const gridStart = new Date(visibleMonth.y,visibleMonth.m,1-startOffset);
    const cells = [];

    for (let i=0;i<42;i++) {
      const d = new Date(gridStart.getFullYear(),gridStart.getMonth(),gridStart.getDate()+i);
      const key = dayKey(d.getFullYear(),d.getMonth(),d.getDate());
      const events = eventsFor(key);
      const urgency = urgencyForDate(key);
      const shown = events.slice(0,3).map(ev => `<div class="cal-pill ${ev.type}${ev.done?' done':''}" title="${esc(ev.label)}"><i class="cal-dot ${ev.type}"></i><span class="cal-text">${esc(ev.label)}</span></div>`).join('');
      const more = events.length>3 ? `<div class="cal-more">+${events.length-3} more</div>` : '';
      const outside = d.getMonth()!==visibleMonth.m ? ' outside' : '';
      const today = key===todayKey() ? ' today' : '';
      const selected = key===selectedDate ? ' selected' : '';
      const urgentClass = urgency ? ` urg-${urgency.kind}` : '';
      const urgentChip = urgency ? `<span class="cal-urgency-chip ${urgency.kind}">${urgency.count} ${urgency.kind==='overdue'?'past due':urgency.kind==='today'?'due today':'due soon'}</span>` : '';
      cells.push(`<button type="button" class="cal-day${outside}${today}${selected}${urgentClass}" data-cal-date="${key}" aria-label="${esc(formatLong(key))}, ${events.length} items"><span class="cal-num">${d.getDate()}</span><span class="cal-events">${shown}${more}</span>${urgentChip}</button>`);
    }

    view.innerHTML = `<div class="cal-shell">
      <div class="cal-toolbar"><div><div class="kicker">Plan by date</div><h2>${esc(monthLabel())}</h2></div><div class="cal-actions"><button type="button" id="calPrev" class="secondary-btn">←</button><button type="button" id="calToday" class="secondary-btn">Today</button><button type="button" id="calNext" class="secondary-btn">→</button></div></div>
      <div class="cal-legend"><span><i class="cal-urgency-key overdue"></i>Past due</span><span><i class="cal-urgency-key today"></i>Due today</span><span><i class="cal-urgency-key soon"></i>Next 3 days</span><span><i class="cal-dot bill"></i>Bill</span><span><i class="cal-dot start"></i>Goal start</span><span><i class="cal-dot due"></i>Goal due</span><span>↻ Recurring</span></div>
      <div class="cal-weekdays">${weekdayNames.map(x=>`<div class="cal-weekday">${x}</div>`).join('')}</div><div class="cal-grid">${cells.join('')}</div>
    </div>`;

    document.querySelector('#calPrev').onclick = () => changeMonth(-1);
    document.querySelector('#calNext').onclick = () => changeMonth(1);
    document.querySelector('#calToday').onclick = () => {const d=new Date();visibleMonth={y:d.getFullYear(),m:d.getMonth()};selectedDate=todayKey();renderCalendar();};
    view.querySelectorAll('[data-cal-date]').forEach(btn => btn.onclick = () => openDay(btn.dataset.calDate));
  }

  function changeMonth(delta) {
    const d = new Date(visibleMonth.y,visibleMonth.m+delta,1);
    visibleMonth = {y:d.getFullYear(),m:d.getMonth()};
    renderCalendar();
  }

  function goalOptions(selected='') {
    return `<option value="">No goal</option>${(state.goals||[]).map(g=>`<option value="${esc(g.id)}" ${String(g.id)===String(selected)?'selected':''}>${esc(g.title)}</option>`).join('')}`;
  }

  function weekdayPicker(selected=[]) {
    const set = new Set(selected.map(Number));
    return `<div class="cal-day-picks">${weekdayNames.map((name,i)=>`<label class="cal-day-pick"><input type="checkbox" class="cal-repeat-day" value="${i}" ${set.has(i)?'checked':''}><span>${name}</span></label>`).join('')}</div>`;
  }

  function selectedWeekdays() {
    return [...document.querySelectorAll('.cal-repeat-day:checked')].map(el=>Number(el.value)).filter(n=>n>=0&&n<=6).sort((a,b)=>a-b);
  }

  function makeSeriesOccurrences({seriesId,title,goalId,start,end,days,doneByDate={}}) {
    const startD = keyDate(start), endD = keyDate(end);
    if (Number.isNaN(startD.getTime()) || Number.isNaN(endD.getTime())) return [];
    const rangeDays = Math.round((endD-startD)/86400000);
    if (rangeDays>730) {toast('Recurring task range can be up to 2 years');return [];}
    const wanted = new Set(days.map(Number)), out=[];
    for (let d=new Date(startD),guard=0;d<=endD&&guard<=732;d.setDate(d.getDate()+1),guard++) {
      if (!wanted.has(d.getDay())) continue;
      const date = dayKey(d.getFullYear(),d.getMonth(),d.getDate());
      out.push({id:id(),seriesId,title,goalId:goalId||null,date,done:!!doneByDate[date],recurrenceType:'weekly',recurrenceStart:start,recurrenceEnd:end,recurrenceDays:[...days]});
    }
    return out;
  }

  function taskRowsForDay(tasks) {
    if (!tasks.length) return '<div class="empty">No tasks scheduled.</div>';
    return tasks.map(task => {
      const g=taskGoal(task);
      const billMeta=isBill(task)?`<div class="cal-bill-meta">${Number(task.amount)>0?billMoney.format(Number(task.amount)):'Bill'}${isRecurring(task)?' · recurring':''}</div>`:'';
      const manageBill=isBill(task)&&isRecurring(task)&&task.goalId?`<button type="button" class="secondary-btn cal-open-goal" data-id="${esc(task.goalId)}">Manage bill</button>`:`<button type="button" class="secondary-btn cal-task-edit" data-id="${esc(task.id)}">Edit</button>`;
      return `<div class="cal-event-row"><input type="checkbox" class="cal-task-check" data-id="${esc(task.id)}" ${task.done?'checked':''}><div class="task-main"><div class="task-title ${task.done?'done':''}">${esc(task.title)}</div><div class="task-sub">${esc(g?.title||'Unlinked task')}</div>${billMeta}${isRecurring(task)?`<div class="cal-recurring-badge">↻ ${esc(recurrenceText(task))}</div>`:''}</div><div class="cal-row-actions">${manageBill}<button type="button" class="danger-btn cal-delete-task cal-task-del" data-id="${esc(task.id)}">Delete</button></div></div>`;
    }).join('');
  }

  function goalRowsForDay(key) {
    const items=[];
    (state.goals||[]).forEach(g=>{if(g.startDate===key)items.push({kind:'Goal starts',g});if(goalEnd(g)===key)items.push({kind:'Goal due',g});});
    if(!items.length)return'<div class="empty">No goal starts or due dates.</div>';
    return items.map(x=>`<div class="cal-event-row"><i class="cal-dot ${x.kind==='Goal starts'?'start':'due'}"></i><div class="task-main"><div class="task-title">${esc(x.g.title)}</div><div class="task-sub">${esc(x.kind)}</div></div><button type="button" class="link-btn cal-open-goal" data-id="${esc(x.g.id)}">Open</button></div>`).join('');
  }

  function openDay(key) {
    selectedDate=key;
    const tasks=(state.tasks||[]).filter(t=>t.date===key);
    const defaultWeekday=keyDate(key).getDay(),defaultEnd=addDaysToKey(key,28);
    const urgency=urgencyForDate(key);
    const urgencyText=urgency?`<div class="cal-help-text"><strong>${urgency.count}</strong> unfinished ${urgency.kind==='overdue'?'past-due':urgency.kind==='today'?'due-today':'upcoming'} task${urgency.count===1?'':'s'} on this date.</div>`:'';

    modal(`<div class="kicker">Calendar day</div><h2>${esc(formatLong(key))}</h2>${urgencyText}<div class="cal-section-title">Goals</div><div class="cal-day-list">${goalRowsForDay(key)}</div><div class="cal-section-title">Tasks & bills</div><div class="cal-day-list">${taskRowsForDay(tasks)}</div><div class="cal-section-title">Add a task</div><div class="field"><label>Task</label><input id="calTaskTitle" placeholder="What needs to get done?"></div><div class="field"><label>Link to goal</label><select id="calTaskGoal">${goalOptions()}</select></div><div class="cal-toggle-row"><label for="calRecurring">Recurring task</label><input id="calRecurring" type="checkbox"></div><div id="calRecurringFields" class="cal-recur-box hidden"><div class="form-grid"><div class="field"><label>Start date</label><input id="calStartDate" type="date" value="${key}"></div><div class="field"><label>End date</label><input id="calEndDate" type="date" value="${defaultEnd}"></div></div><div class="field"><label>Repeat on</label>${weekdayPicker([defaultWeekday])}</div><div class="cal-help-text">Pick one or more weekdays. Each occurrence is created as an individual dated task.</div></div><div class="modal-actions"><button type="button" class="secondary-btn close-modal">Close</button><button type="button" id="calAddTask" class="primary-btn">Add task</button></div>`);

    const recurring=document.querySelector('#calRecurring'),fields=document.querySelector('#calRecurringFields');
    recurring.onchange=()=>fields.classList.toggle('hidden',!recurring.checked);
    document.querySelector('#calAddTask').onclick=()=>addTaskFromDay(key);
    document.querySelectorAll('.cal-task-check').forEach(box=>box.onchange=()=>{const task=(state.tasks||[]).find(t=>String(t.id)===String(box.dataset.id));if(!task)return;task.done=box.checked;save();openDay(key);});
    document.querySelectorAll('.cal-task-edit').forEach(btn=>btn.onclick=()=>{const task=(state.tasks||[]).find(t=>String(t.id)===String(btn.dataset.id));if(task)chooseEditScope(task,key);});
    document.querySelectorAll('.cal-task-del').forEach(btn=>btn.onclick=()=>{const task=(state.tasks||[]).find(t=>String(t.id)===String(btn.dataset.id));if(task)chooseDeleteScope(task,key);});
    document.querySelectorAll('.cal-open-goal').forEach(btn=>btn.onclick=()=>{close();openGoal(btn.dataset.id);});
  }

  function addTaskFromDay(returnKey) {
    const title=document.querySelector('#calTaskTitle')?.value.trim()||'',goalId=document.querySelector('#calTaskGoal')?.value||null,recurring=!!document.querySelector('#calRecurring')?.checked;
    if(!title)return toast('Enter a task');
    state.tasks=Array.isArray(state.tasks)?state.tasks:[];
    if(!recurring){state.tasks.unshift({id:id(),goalId,title,date:returnKey,done:false});save();openDay(returnKey);toast('Task added');return;}
    const start=document.querySelector('#calStartDate')?.value||'',end=document.querySelector('#calEndDate')?.value||'',days=selectedWeekdays();
    if(!start||!end)return toast('Choose a start and end date');if(end<start)return toast('End date must be on or after start date');if(!days.length)return toast('Choose at least one weekday');
    const seriesId=id(),occurrences=makeSeriesOccurrences({seriesId,title,goalId,start,end,days});
    if(!occurrences.length)return toast('No dates matched that recurring schedule');state.tasks.push(...occurrences);save();openDay(returnKey);toast(`${occurrences.length} recurring tasks added`);
  }

  function chooseDeleteScope(task,returnKey) {
    if(!isRecurring(task)){confirmDeleteOne(task,returnKey);return;}
    modal(`<div class="kicker">Delete recurring ${isBill(task)?'bill':'task'}</div><h2>What do you want to delete?</h2><p>${esc(task.title)}</p><div class="cal-help-text">${esc(formatLong(task.date))}</div><div class="cal-scope-actions"><button type="button" id="calDeleteOne" class="secondary-btn">This occurrence only</button><button type="button" id="calDeleteSeries" class="danger-btn">Entire series</button></div><div class="modal-actions"><button type="button" class="secondary-btn close-modal">Cancel</button></div>`);
    document.querySelector('#calDeleteOne').onclick=()=>deleteOne(task,returnKey);document.querySelector('#calDeleteSeries').onclick=()=>deleteSeries(task,returnKey);
  }

  function confirmDeleteOne(task,returnKey) {
    modal(`<div class="kicker">Delete ${isBill(task)?'bill':'task'}</div><h2>Delete this item?</h2><p>${esc(task.title)}</p><div class="modal-actions"><button type="button" class="secondary-btn close-modal">Cancel</button><button type="button" id="calConfirmDeleteOne" class="danger-btn">Delete</button></div>`);
    document.querySelector('#calConfirmDeleteOne').onclick=()=>deleteOne(task,returnKey);
  }

  function deleteOne(task,returnKey) {state.tasks=(state.tasks||[]).filter(t=>String(t.id)!==String(task.id));save();openDay(returnKey);toast(isRecurring(task)?'Occurrence deleted':'Task deleted');}
  function deleteSeries(task,returnKey) {const sid=String(task.seriesId||'');state.tasks=(state.tasks||[]).filter(t=>String(t.seriesId||'')!==sid);save();openDay(returnKey);toast('Recurring series deleted');}

  function chooseEditScope(task,returnKey) {
    if(!isRecurring(task)){editOne(task,returnKey);return;}
    if(isBill(task)){editOne(task,returnKey);return;}
    modal(`<div class="kicker">Recurring task</div><h2>Edit recurring task</h2><p>${esc(task.title)}</p><div class="cal-scope-actions"><button type="button" id="calEditOne" class="secondary-btn">This occurrence only</button><button type="button" id="calEditSeries" class="primary-btn">Entire series</button></div><div class="modal-actions"><button type="button" class="secondary-btn close-modal">Cancel</button></div>`);
    document.querySelector('#calEditOne').onclick=()=>editOne(task,returnKey);document.querySelector('#calEditSeries').onclick=()=>editSeries(task,returnKey);
  }

  function editOne(task,returnKey) {
    modal(`<div class="kicker">${isBill(task)?'Bill occurrence':'Task'}</div><h2>Edit ${isBill(task)?'this bill occurrence':'task'}</h2><div class="field"><label>Task</label><input id="calEditTitle" value="${esc(task.title)}"></div><div class="field"><label>Link to goal</label><select id="calEditGoal">${goalOptions(task.goalId)}</select></div><div class="field"><label>Date</label><input id="calEditDate" type="date" value="${esc(task.date)}"></div>${isRecurring(task)?'<div class="cal-help-text">Editing this occurrence detaches it from the recurring series.</div>':''}<div class="modal-actions"><button type="button" class="secondary-btn close-modal">Cancel</button><button type="button" id="calSaveOne" class="primary-btn">Save</button></div>`);
    document.querySelector('#calSaveOne').onclick=()=>{const title=document.querySelector('#calEditTitle').value.trim(),date=document.querySelector('#calEditDate').value;if(!title)return toast('Enter a task');if(!date)return toast('Choose a date');task.title=title;task.goalId=document.querySelector('#calEditGoal').value||null;task.date=date;if(isRecurring(task)){delete task.seriesId;delete task.recurrenceType;delete task.recurrenceStart;delete task.recurrenceEnd;delete task.recurrenceDays;}save();openDay(returnKey);toast('Updated');};
  }

  function editSeries(task,returnKey) {
    const meta=seriesMeta(task);
    modal(`<div class="kicker">Recurring series</div><h2>Edit entire series</h2><div class="field"><label>Task</label><input id="calSeriesTitle" value="${esc(task.title)}"></div><div class="field"><label>Link to goal</label><select id="calSeriesGoal">${goalOptions(task.goalId)}</select></div><div class="form-grid"><div class="field"><label>Start date</label><input id="calSeriesStart" type="date" value="${esc(meta.start)}"></div><div class="field"><label>End date</label><input id="calSeriesEnd" type="date" value="${esc(meta.end)}"></div></div><div class="field"><label>Repeat on</label>${weekdayPicker(meta.days)}</div><div class="cal-help-text">Completed dates that remain in the schedule stay completed.</div><div class="modal-actions"><button type="button" class="secondary-btn close-modal">Cancel</button><button type="button" id="calSaveSeries" class="primary-btn">Save series</button></div>`);
    document.querySelector('#calSaveSeries').onclick=()=>{const title=document.querySelector('#calSeriesTitle').value.trim(),goalId=document.querySelector('#calSeriesGoal').value||null,start=document.querySelector('#calSeriesStart').value,end=document.querySelector('#calSeriesEnd').value,days=selectedWeekdays();if(!title)return toast('Enter a task');if(!start||!end)return toast('Choose a start and end date');if(end<start)return toast('End date must be on or after start date');if(!days.length)return toast('Choose at least one weekday');const old=seriesTasks(task.seriesId),doneByDate={};old.forEach(t=>{if(t.done)doneByDate[t.date]=true;});const replacements=makeSeriesOccurrences({seriesId:task.seriesId,title,goalId,start,end,days,doneByDate});if(!replacements.length)return toast('No dates matched that recurring schedule');const sid=String(task.seriesId);state.tasks=(state.tasks||[]).filter(t=>String(t.seriesId||'')!==sid);state.tasks.push(...replacements);save();openDay(returnKey);toast('Recurring series updated');};
  }

  ensureCalendarUI();
  const baseSwitch=switchView;
  switchView=function(viewName){baseSwitch(viewName);if(viewName==='calendar'){renderCalendar();const title=document.querySelector('#viewTitle');if(title)title.textContent='Calendar';document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view==='calendar'));}};
  const baseRender=render;
  render=function(){baseRender();ensureCalendarUI();renderCalendar();};
  renderCalendar();
})();
