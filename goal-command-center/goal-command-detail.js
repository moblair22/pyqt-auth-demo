// Goal command-center detail view + Money goal bill onboarding and recurring bills.
// No render/switchView wrappers, observers, or background timers.
(() => {
  const money = new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'});
  const sameId=(a,b)=>String(a??'')===String(b??'');
  const goalTasks=g=>(state.tasks||[]).filter(t=>sameId(t.goalId,g.id));
  const goalHabits=g=>(state.habits||[]).filter(h=>sameId(h.goalId,g.id));
  const taskAmount=t=>Number(t?.amount)||0;
  const isBill=t=>t?.kind==='bill';
  const pad=n=>String(n).padStart(2,'0');
  const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const keyDate=key=>{const[y,m,d]=String(key||'').split('-').map(Number);return new Date(y,m-1,d)};

  const statusFor=t=>{
    if(t.done)return'done';
    if(!t.date)return'unscheduled';
    if(t.date<iso())return'overdue';
    if(t.date===iso())return'today';
    return'upcoming';
  };
  const statusText=t=>({done:'Completed',overdue:'Past due',today:'Due today',upcoming:'Upcoming',unscheduled:'Unscheduled'})[statusFor(t)]||'';
  const sortTasks=list=>[...list].sort((a,b)=>String(a.date||'9999-12-31').localeCompare(String(b.date||'9999-12-31'))||String(a.title||'').localeCompare(String(b.title||'')));

  function ensureStyles(){
    if(document.querySelector('#goalCommandDetailStyles'))return;
    const s=document.createElement('style');s.id='goalCommandDetailStyles';s.textContent=`
      .goal-command-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:16px 0}.goal-command-metric{border:1px solid var(--line);border-radius:12px;padding:11px;background:var(--panel2)}.goal-command-metric strong{display:block;font-size:20px}.goal-command-metric span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-top:3px}
      .goal-command-section{margin-top:22px}.goal-command-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}.goal-command-section-head h3{margin:0;font-size:16px}.goal-command-section-head p{margin:3px 0 0;color:var(--muted);font-size:11px}.goal-command-list{display:grid;gap:8px}.goal-command-row{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:11px;padding:10px 11px;background:var(--panel2)}
      .goal-command-row input[type=checkbox]{width:18px;height:18px;accent-color:var(--accent);flex:0 0 auto}.goal-command-main{min-width:0;flex:1}.goal-command-title{font-weight:800;font-size:13px}.goal-command-title.done{text-decoration:line-through;opacity:.65}.goal-command-meta{color:var(--muted);font-size:10px;margin-top:3px}.goal-command-status{font-size:9px;font-weight:850;border:1px solid var(--line);border-radius:999px;padding:4px 7px;white-space:nowrap}.goal-command-status.overdue{color:var(--danger)}.goal-command-status.today{color:var(--accent)}.goal-command-status.upcoming{color:var(--accent2)}.goal-command-status.done{color:var(--muted)}
      .goal-command-actions{display:flex;gap:6px;flex-wrap:wrap}.goal-command-empty{padding:13px;border:1px dashed var(--line);border-radius:11px;color:var(--muted);font-size:12px;text-align:center}.goal-habit-stats{display:flex;gap:9px;flex-wrap:wrap;color:var(--muted);font-size:10px;margin-top:4px}.bill-amount{font-weight:900;color:var(--accent)}
      .money-onboard{display:grid;gap:14px}.money-onboard-icon{font-size:32px}.money-onboard-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bill-note{font-size:11px;color:var(--muted);line-height:1.45}.bill-repeat-box{border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--panel2);margin-top:10px}.bill-series-row{border-left:3px solid #f0b44d}.bill-series-actions{display:flex;gap:6px;flex-wrap:wrap}.bill-frequency{color:#f0b44d;font-weight:800}
      @media(max-width:650px){.goal-command-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.goal-command-row{align-items:flex-start;flex-wrap:wrap}.goal-command-status{margin-left:28px}.goal-command-actions,.bill-series-actions{margin-left:auto}.money-onboard-choice{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function taskRow(t){
    const st=statusFor(t),bill=isBill(t),amount=bill&&taskAmount(t)?` · ${money.format(taskAmount(t))}`:'';
    return `<div class="goal-command-row"><input type="checkbox" class="goal-task-check" data-id="${esc(t.id)}" ${t.done?'checked':''}><div class="goal-command-main"><div class="goal-command-title ${t.done?'done':''}">${esc(t.title)}</div><div class="goal-command-meta">${t.date?esc(fmt(t.date)):'No due date'}${esc(amount)}${t.seriesId?' · ↻ recurring':''}</div></div><span class="goal-command-status ${st}">${statusText(t)}</span><button type="button" class="icon-btn goal-task-del" data-id="${esc(t.id)}" title="Delete task">×</button></div>`;
  }

  function habitRow(h){
    const scheduled=typeof habitScheduleText==='function'?habitScheduleText(h):'Habit';
    const streak=typeof habitCurrentStreak==='function'?habitCurrentStreak(h):0;
    const week=typeof habitWeekStats==='function'?habitWeekStats(h):{completed:0,target:h.weeklyTarget||1};
    const todayScheduled=typeof habitScheduled==='function'?habitScheduled(h,iso()):true;
    const todayDone=(h.days||[]).includes(iso());
    return `<div class="goal-command-row">${todayScheduled?`<input type="checkbox" class="goal-habit-check" data-id="${esc(h.id)}" ${todayDone?'checked':''}>`:'<span style="width:18px"></span>'}<div class="goal-command-main"><div class="goal-command-title">${esc(h.title)}</div><div class="goal-command-meta">${esc(scheduled)}</div><div class="goal-habit-stats"><span>🔥 ${streak} streak</span><span>${week.completed}/${week.target} this week</span>${todayScheduled?'':'<span>Off today</span>'}</div></div><button type="button" class="secondary-btn goal-edit-habit" data-id="${esc(h.id)}">Edit</button></div>`;
  }

  function section(title,subtitle,html,action=''){
    return `<section class="goal-command-section"><div class="goal-command-section-head"><div><h3>${title}</h3><p>${subtitle}</p></div>${action}</div><div class="goal-command-list">${html}</div></section>`;
  }

  function openGoalTask(gid){
    const g=(state.goals||[]).find(x=>sameId(x.id,gid));if(!g)return;
    modal(`<div class="kicker">${esc(g.title)}</div><h2>Add goal task</h2><div class="field"><label>Task</label><input id="goalTaskTitle" placeholder="What needs to get done?"></div><div class="field"><label>Due date</label><input id="goalTaskDate" type="date" value="${iso()}"></div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="goalTaskSave" class="primary-btn">Add task</button></div>`);
    document.querySelector('#goalTaskSave').onclick=()=>{const title=document.querySelector('#goalTaskTitle').value.trim(),date=document.querySelector('#goalTaskDate').value;if(!title)return toast('Enter a task');if(!date)return toast('Choose a due date');state.tasks.unshift({id:id(),goalId:g.id,title,date,done:false});save();openGoal(g.id);toast('Task added')};
  }

  function billSeriesKey(t){return t.seriesId||t.id;}
  function billFrequencyText(t){if(t.recurrenceType==='bill-monthly')return'Monthly';if(t.recurrenceType==='bill-weekly')return'Weekly';return'One time';}

  function billGroups(g){
    const map=new Map();
    sortTasks(goalTasks(g).filter(isBill)).forEach(t=>{
      const key=String(billSeriesKey(t));
      if(!map.has(key))map.set(key,[]);
      map.get(key).push(t);
    });
    return [...map.entries()].map(([key,items])=>({key,items,first:items[0],next:items.find(x=>!x.done&&x.date>=iso())||items.find(x=>!x.done)||items[items.length-1]}));
  }

  function billGroupRow(group){
    const t=group.first,next=group.next,amount=taskAmount(t),frequency=billFrequencyText(t),done=group.items.filter(x=>x.done).length;
    return `<div class="goal-command-row bill-series-row"><div class="goal-command-main"><div class="goal-command-title">${esc(t.billName||t.title.replace(/^Bill:\s*/,''))}</div><div class="goal-command-meta"><span class="bill-amount">${amount?money.format(amount):'No amount'}</span> · <span class="bill-frequency">${frequency}</span>${next?.date?` · Next ${esc(fmt(next.date))}`:''}${group.items.length>1?` · ${done}/${group.items.length} paid`:''}</div></div><div class="bill-series-actions"><button type="button" class="secondary-btn bill-edit" data-series-key="${esc(group.key)}">Edit</button><button type="button" class="danger-btn bill-delete-series" data-series-key="${esc(group.key)}">Delete</button></div></div>`;
  }

  function makeBillOccurrences({goalId,name,amount,firstDate,frequency,endDate,seriesId=null,doneByDate={}}){
    const common={goalId,kind:'bill',billName:name,amount,title:`Bill: ${name}`};
    if(frequency==='once')return[{id:id(),...common,date:firstDate,done:!!doneByDate[firstDate]}];
    const start=keyDate(firstDate),end=keyDate(endDate);
    if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<start)return[];
    if(Math.round((end-start)/86400000)>730){toast('Recurring bills can be scheduled up to 2 years');return[];}
    const sid=seriesId||id(),out=[];
    if(frequency==='weekly'){
      for(let d=new Date(start),guard=0;d<=end&&guard<110;d.setDate(d.getDate()+7),guard++){
        const key=dateKey(d);out.push({id:id(),seriesId:sid,...common,date:key,done:!!doneByDate[key],recurrenceType:'bill-weekly',recurrenceStart:firstDate,recurrenceEnd:endDate});
      }
    }else if(frequency==='monthly'){
      const baseDay=start.getDate();
      for(let offset=0;offset<30;offset++){
        const y=start.getFullYear(),m=start.getMonth()+offset,last=new Date(y,m+1,0).getDate(),d=new Date(y,m,Math.min(baseDay,last));
        if(d<start)continue;if(d>end)break;
        const key=dateKey(d);out.push({id:id(),seriesId:sid,...common,date:key,done:!!doneByDate[key],recurrenceType:'bill-monthly',recurrenceStart:firstDate,recurrenceEnd:endDate});
      }
    }
    return out;
  }

  function saveBillForm(g,{onboarding=false,editKey=null,addAnother=false}={}){
    const name=document.querySelector('#billName')?.value.trim()||'',amount=Math.max(0,Number(document.querySelector('#billAmount')?.value)||0),firstDate=document.querySelector('#billDate')?.value||'',frequency=document.querySelector('#billFrequency')?.value||'once',endDate=document.querySelector('#billEndDate')?.value||'';
    if(!name)return toast('Enter a bill name');if(!firstDate)return toast('Choose a due date');if(frequency!=='once'&&!endDate)return toast('Choose an end date for the recurring bill');if(frequency!=='once'&&endDate<firstDate)return toast('End date must be on or after the first due date');
    let doneByDate={},seriesId=null;
    if(editKey){const existing=(state.tasks||[]).filter(t=>isBill(t)&&String(billSeriesKey(t))===String(editKey));existing.forEach(t=>{if(t.done)doneByDate[t.date]=true;});seriesId=existing[0]?.seriesId||null;state.tasks=(state.tasks||[]).filter(t=>!(isBill(t)&&String(billSeriesKey(t))===String(editKey)));}
    const created=makeBillOccurrences({goalId:g.id,name,amount,firstDate,frequency,endDate,seriesId,doneByDate});
    if(!created.length)return toast('No bill dates were created');state.tasks.push(...created);save();
    if(addAnother){openBillReminder(g.id,{onboarding,addMode:true});toast(editKey?'Bill updated':'Bill saved — add another');}
    else{openGoal(g.id);toast(editKey?'Bill updated':created.length>1?`${created.length} recurring bill dates added`:'Bill reminder added');}
  }

  function openBillReminder(gid,{onboarding=false,editKey=null,addMode=false}={}){
    const g=(state.goals||[]).find(x=>sameId(x.id,gid));if(!g)return;
    let existing=null,frequency='once',endDate='';
    if(editKey){const items=(state.tasks||[]).filter(t=>isBill(t)&&String(billSeriesKey(t))===String(editKey));existing=sortTasks(items)[0]||null;if(existing?.recurrenceType==='bill-monthly')frequency='monthly';else if(existing?.recurrenceType==='bill-weekly')frequency='weekly';endDate=existing?.recurrenceEnd||sortTasks(items).slice(-1)[0]?.date||'';}
    const firstDate=existing?.recurrenceStart||existing?.date||'',name=existing?.billName||existing?.title?.replace(/^Bill:\s*/,'')||'',amount=taskAmount(existing);
    modal(`<div class="kicker">Money goal</div><h2>${editKey?'Edit bill':'Add bill reminder'}</h2><div class="field"><label>Bill name</label><input id="billName" value="${esc(name)}" placeholder="e.g. Rent"></div><div class="form-grid"><div class="field"><label>Amount</label><input id="billAmount" type="number" min="0" step="0.01" value="${amount||''}" placeholder="0.00"></div><div class="field"><label>${editKey?'First due date':'Due date'}</label><input id="billDate" type="date" value="${esc(firstDate)}"></div></div><div class="field"><label>Repeat</label><select id="billFrequency"><option value="once" ${frequency==='once'?'selected':''}>One time</option><option value="monthly" ${frequency==='monthly'?'selected':''}>Monthly</option><option value="weekly" ${frequency==='weekly'?'selected':''}>Weekly</option></select></div><div id="billRepeatFields" class="bill-repeat-box ${frequency==='once'?'hidden':''}"><div class="field"><label>Repeat through</label><input id="billEndDate" type="date" value="${esc(endDate)}"></div><div class="bill-note">Recurring bills are created as dated bill occurrences on your Calendar. You can mark each payment complete separately.</div></div><div class="bill-note">Bills are linked to this Money goal and appear on the Calendar with their due date and amount.</div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button>${!editKey?'<button id="billSaveAnother" class="secondary-btn">Save & add another</button>':''}<button id="billSave" class="primary-btn">${editKey?'Save changes':'Save & finish'}</button></div>`);
    const frequencyEl=document.querySelector('#billFrequency'),repeatBox=document.querySelector('#billRepeatFields');frequencyEl.onchange=()=>{repeatBox.classList.toggle('hidden',frequencyEl.value==='once');if(frequencyEl.value!=='once'&&!document.querySelector('#billEndDate').value){const start=document.querySelector('#billDate').value||iso(),d=keyDate(start);d.setFullYear(d.getFullYear()+1);document.querySelector('#billEndDate').value=dateKey(d);}};
    document.querySelector('#billSave').onclick=()=>saveBillForm(g,{onboarding,editKey,addAnother:false});
    document.querySelector('#billSaveAnother')?.addEventListener('click',()=>saveBillForm(g,{onboarding,editKey:null,addAnother:true}));
  }

  function askBillOnboarding(gid){
    const g=(state.goals||[]).find(x=>sameId(x.id,gid));if(!g)return;
    modal(`<div class="money-onboard"><div class="money-onboard-icon">▣</div><div><div class="kicker">Money goal setup</div><h2>Add your bills?</h2><p>You can add several bills now. Each bill can have an amount, due date, and optional weekly or monthly recurrence.</p></div><div class="money-onboard-choice"><button id="billOnboardSkip" class="secondary-btn">Not now</button><button id="billOnboardAdd" class="primary-btn">Add bills</button></div></div>`);
    document.querySelector('#billOnboardSkip').onclick=()=>{close();switchView('goals');openGoal(g.id)};
    document.querySelector('#billOnboardAdd').onclick=()=>openBillReminder(g.id,{onboarding:true,addMode:true});
  }

  function bindGoalDetail(g){
    document.querySelectorAll('.goal-task-check').forEach(box=>box.onchange=()=>{const t=(state.tasks||[]).find(x=>sameId(x.id,box.dataset.id));if(t){t.done=box.checked;save();openGoal(g.id)}});
    document.querySelectorAll('.goal-task-del').forEach(btn=>btn.onclick=()=>{const t=(state.tasks||[]).find(x=>sameId(x.id,btn.dataset.id));if(!t)return;if(confirm(`Delete "${t.title}"?`)){state.tasks=state.tasks.filter(x=>!sameId(x.id,t.id));save();openGoal(g.id)}});
    document.querySelectorAll('.goal-habit-check').forEach(box=>box.onchange=()=>{const h=(state.habits||[]).find(x=>sameId(x.id,box.dataset.id));if(!h)return;h.days=Array.isArray(h.days)?h.days:[];h.days=box.checked?[...new Set([...h.days,iso()])]:h.days.filter(d=>d!==iso());save();openGoal(g.id)});
    document.querySelectorAll('.goal-edit-habit').forEach(btn=>btn.onclick=()=>openHabit(btn.dataset.id));
    document.querySelector('#goalAddTask')?.addEventListener('click',()=>openGoalTask(g.id));
    document.querySelector('#goalAddBill')?.addEventListener('click',()=>openBillReminder(g.id));
    document.querySelectorAll('.bill-edit').forEach(btn=>btn.onclick=()=>openBillReminder(g.id,{editKey:btn.dataset.seriesKey}));
    document.querySelectorAll('.bill-delete-series').forEach(btn=>btn.onclick=()=>{const key=btn.dataset.seriesKey,items=(state.tasks||[]).filter(t=>isBill(t)&&String(billSeriesKey(t))===String(key));const name=items[0]?.billName||'this bill';if(confirm(`Delete all reminders for ${name}?`)){state.tasks=(state.tasks||[]).filter(t=>!(isBill(t)&&String(billSeriesKey(t))===String(key)));save();openGoal(g.id);toast('Bill reminders deleted')}});

    document.querySelectorAll('.sg-check').forEach(b=>b.onchange=()=>{const s=g.subgoals.find(x=>sameId(x.id,b.dataset.id));if(s)s.done=b.checked;save();openGoal(g.id)});
    document.querySelectorAll('.sg-del').forEach(b=>b.onclick=()=>{g.subgoals=g.subgoals.filter(x=>!sameId(x.id,b.dataset.id));save();openGoal(g.id)});
    document.querySelector('#mkSG').onclick=()=>{const title=document.querySelector('#sgTitle').value.trim();if(!title)return;g.subgoals.push({id:id(),title,targetDate:document.querySelector('#sgDate').value||'',done:false});save();openGoal(g.id)};
    document.querySelectorAll('.m-check').forEach(b=>b.onchange=()=>{const m=g.milestones.find(x=>sameId(x.id,b.dataset.id));if(m)m.done=b.checked;save();openGoal(g.id)});
    document.querySelectorAll('.m-del').forEach(b=>b.onclick=()=>{g.milestones=g.milestones.filter(x=>!sameId(x.id,b.dataset.id));save();openGoal(g.id)});
    document.querySelector('#mkM').onclick=()=>{const title=document.querySelector('#mTitle').value.trim();if(!title)return;g.milestones.push({id:id(),title,done:false});save();openGoal(g.id)};
    document.querySelector('#delGoal').onclick=()=>{if(confirm('Delete this goal?')){state.goals=state.goals.filter(x=>!sameId(x.id,g.id));(state.tasks||[]).forEach(t=>{if(sameId(t.goalId,g.id))t.goalId=null});(state.habits||[]).forEach(h=>{if(sameId(h.goalId,g.id))h.goalId=null});save();close()}};
  }

  openGoal=function(gid){
    ensureStyles();const g=(state.goals||[]).find(x=>sameId(x.id,gid));if(!g)return;g.subgoals=Array.isArray(g.subgoals)?g.subgoals:[];g.milestones=Array.isArray(g.milestones)?g.milestones:[];
    const tasks=goalTasks(g),open=sortTasks(tasks.filter(t=>!t.done)),done=sortTasks(tasks.filter(t=>t.done)).reverse(),overdue=open.filter(t=>t.date&&t.date<iso()),due=open.filter(t=>!t.date||t.date>=iso()),habits=goalHabits(g),groups=billGroups(g);
    const subRows=g.subgoals.map(s=>`<div class="goal-command-row"><input class="sg-check" data-id="${esc(s.id)}" type="checkbox" ${s.done?'checked':''}><div class="goal-command-main"><div class="goal-command-title ${s.done?'done':''}">${esc(s.title)}</div><div class="goal-command-meta">${s.targetDate?'Target '+esc(fmt(s.targetDate)):'Subgoal'}</div></div><button class="icon-btn sg-del" data-id="${esc(s.id)}">×</button></div>`).join('')||'<div class="goal-command-empty">No subgoals yet.</div>';
    const milestoneRows=g.milestones.map(m=>`<div class="goal-command-row"><input class="m-check" data-id="${esc(m.id)}" type="checkbox" ${m.done?'checked':''}><div class="goal-command-main"><div class="goal-command-title ${m.done?'done':''}">${esc(m.title)}</div></div><button class="icon-btn m-del" data-id="${esc(m.id)}">×</button></div>`).join('')||'<div class="goal-command-empty">No milestones yet.</div>';
    const habitRows=habits.map(habitRow).join('')||'<div class="goal-command-empty">No habits linked to this goal.</div>';
    const openPreview=[...overdue,...due.filter(t=>!overdue.includes(t))].slice(0,20),dueRows=openPreview.map(taskRow).join('')||'<div class="goal-command-empty">No open tasks attached to this goal.</div>';
    const doneRows=done.slice(0,20).map(taskRow).join('')||'<div class="goal-command-empty">No completed tasks yet.</div>';
    const isMoney=String(g.category||'').toLowerCase()==='money',billRows=groups.map(billGroupRow).join('')||'<div class="goal-command-empty">No bill reminders yet.</div>';

    modal(`<div class="goal-top"><div><div class="badge">${esc(g.category)}</div><h2>${esc(g.title)}</h2><p>${esc(g.why||'')}</p><div class="goal-meta">${g.startDate?`Start ${esc(fmt(g.startDate))} · `:''}${(g.endDate||g.targetDate)?`Due ${esc(fmt(g.endDate||g.targetDate))}`:'No deadline'}</div></div><div class="goal-percent">${progress(g)}%</div></div><div class="progress"><span style="width:${progress(g)}%"></span></div><div class="goal-command-metrics"><div class="goal-command-metric"><strong>${habits.length}</strong><span>Habits</span></div><div class="goal-command-metric"><strong>${open.length}</strong><span>Open tasks</span></div><div class="goal-command-metric"><strong>${done.length}</strong><span>Done tasks</span></div><div class="goal-command-metric"><strong>${isMoney?groups.length:overdue.length}</strong><span>${isMoney?'Bills':'Past due'}</span></div></div>${section('Due & upcoming tasks','Everything still requiring action.',dueRows,`<button id="goalAddTask" class="secondary-btn">+ Task</button>`)}${section('Completed tasks','Recent completed work attached to this goal.',doneRows)}${section('Habits','Recurring behaviors supporting this goal.',habitRows)}${isMoney?section('Bill reminders','Add as many bills as you need. Bills can be one-time, weekly, or monthly.',billRows,`<button id="goalAddBill" class="secondary-btn">+ Add bill</button>`):''}${section('Subgoals','Smaller outcomes that roll up to this goal.',subRows)}<div class="form-grid" style="margin-top:10px"><div class="field"><label>New subgoal</label><input id="sgTitle" placeholder="e.g. Finish onboarding"></div><div class="field"><label>Target date</label><input id="sgDate" type="date"></div></div><div style="display:flex;justify-content:flex-end"><button id="mkSG" class="secondary-btn">+ Add subgoal</button></div>${section('Milestones','Checkpoints and proof of progress.',milestoneRows)}<div class="field"><label>Add milestone</label><input id="mTitle"></div><div class="modal-actions"><button id="delGoal" class="danger-btn">Delete goal</button><button class="secondary-btn close-modal">Close</button><button id="mkM" class="primary-btn">Add milestone</button></div>`);
    bindGoalDetail(g);
  };

  openGoalModal=function(){
    modal(`<h2>Create a goal</h2><div class="field"><label>Goal</label><input id="gTitle"></div><div class="form-grid"><div class="field"><label>Category</label><select id="gCat"><option>Personal</option><option>Business</option><option>Money</option><option>Health</option><option>Career</option><option>Learning</option></select></div><div class="field"><label>Target date</label><input id="gDate" type="date" value="${addDays(30)}"></div></div><div class="field"><label>Why does it matter?</label><textarea id="gWhy"></textarea></div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="mkGoal" class="primary-btn">Create goal</button></div>`);
    document.querySelector('#mkGoal').onclick=()=>{const title=document.querySelector('#gTitle').value.trim();if(!title)return toast('Enter a goal');const category=document.querySelector('#gCat').value,newGoal={id:id(),title,category,targetDate:document.querySelector('#gDate').value,why:document.querySelector('#gWhy').value,subgoals:[],milestones:[]};state.goals.unshift(newGoal);save();if(category==='Money')askBillOnboarding(newGoal.id);else{close();switchView('goals')}};
  };

  ensureStyles();const addGoal=document.querySelector('#addGoalBtn');if(addGoal)addGoal.onclick=openGoalModal;
})();
