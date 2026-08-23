// Goal command-center detail view + Money goal bill reminder onboarding.
// Deliberately avoids render/switchView wrappers, observers, and timers for stability.
(() => {
  const money = new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'});
  const sameId=(a,b)=>String(a??'')===String(b??'');
  const goalTasks=g=>(state.tasks||[]).filter(t=>sameId(t.goalId,g.id));
  const goalHabits=g=>(state.habits||[]).filter(h=>sameId(h.goalId,g.id));
  const taskAmount=t=>Number(t?.amount)||0;
  const isBill=t=>t?.kind==='bill';
  const statusFor=t=>{
    if(t.done)return'done';
    if(!t.date)return'unscheduled';
    if(t.date<iso())return'overdue';
    if(t.date===iso())return'today';
    return'upcoming';
  };
  const statusText=t=>({done:'Completed',overdue:'Overdue',today:'Due today',upcoming:'Upcoming',unscheduled:'Unscheduled'})[statusFor(t)]||'';
  const sortTasks=list=>[...list].sort((a,b)=>String(a.date||'9999-12-31').localeCompare(String(b.date||'9999-12-31'))||String(a.title||'').localeCompare(String(b.title||'')));

  function ensureStyles(){
    if(document.querySelector('#goalCommandDetailStyles'))return;
    const s=document.createElement('style');s.id='goalCommandDetailStyles';s.textContent=`
      .goal-command-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:16px 0}
      .goal-command-metric{border:1px solid var(--line);border-radius:12px;padding:11px;background:var(--panel2)}
      .goal-command-metric strong{display:block;font-size:20px}.goal-command-metric span{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-top:3px}
      .goal-command-section{margin-top:22px}.goal-command-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}.goal-command-section-head h3{margin:0;font-size:16px}.goal-command-section-head p{margin:3px 0 0;color:var(--muted);font-size:11px}
      .goal-command-list{display:grid;gap:8px}.goal-command-row{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:11px;padding:10px 11px;background:var(--panel2)}
      .goal-command-row input[type=checkbox]{width:18px;height:18px;accent-color:var(--accent);flex:0 0 auto}.goal-command-main{min-width:0;flex:1}.goal-command-title{font-weight:800;font-size:13px}.goal-command-title.done{text-decoration:line-through;opacity:.65}.goal-command-meta{color:var(--muted);font-size:10px;margin-top:3px}.goal-command-status{font-size:9px;font-weight:850;border:1px solid var(--line);border-radius:999px;padding:4px 7px;white-space:nowrap}.goal-command-status.overdue{color:var(--danger)}.goal-command-status.today{color:var(--accent)}.goal-command-status.upcoming{color:var(--accent2)}.goal-command-status.done{color:var(--muted)}
      .goal-command-actions{display:flex;gap:6px;flex-wrap:wrap}.goal-command-empty{padding:13px;border:1px dashed var(--line);border-radius:11px;color:var(--muted);font-size:12px;text-align:center}
      .goal-habit-stats{display:flex;gap:9px;flex-wrap:wrap;color:var(--muted);font-size:10px;margin-top:4px}.bill-amount{font-weight:900;color:var(--accent)}
      .money-onboard{display:grid;gap:14px}.money-onboard-icon{font-size:32px}.money-onboard-choice{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bill-note{font-size:11px;color:var(--muted);line-height:1.45}
      @media(max-width:650px){.goal-command-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.goal-command-row{align-items:flex-start;flex-wrap:wrap}.goal-command-status{margin-left:28px}.goal-command-actions{margin-left:auto}.money-onboard-choice{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function taskRow(t){
    const st=statusFor(t),bill=isBill(t),amount=bill&&taskAmount(t)?` · <span class="bill-amount">${esc(money.format(taskAmount(t)))}</span>`:'';
    return `<div class="goal-command-row"><input type="checkbox" class="goal-task-check" data-id="${esc(t.id)}" ${t.done?'checked':''}><div class="goal-command-main"><div class="goal-command-title ${t.done?'done':''}">${esc(t.title)}</div><div class="goal-command-meta">${t.date?esc(fmt(t.date)):'No due date'}${amount}${t.seriesId?' · ↻ recurring':''}</div></div><span class="goal-command-status ${st}">${statusText(t)}</span><button type="button" class="icon-btn goal-task-del" data-id="${esc(t.id)}" title="Delete task">×</button></div>`;
  }

  function habitRow(h){
    const scheduled=typeof habitScheduleText==='function'?habitScheduleText(h):'Habit';
    const streak=typeof habitCurrentStreak==='function'?habitCurrentStreak(h):0;
    const week=typeof habitWeekStats==='function'?habitWeekStats(h):{completed:0,target:h.weeklyTarget||1};
    const todayScheduled=typeof habitScheduled==='function'?habitScheduled(h,iso()):true;
    const todayDone=(h.days||[]).includes(iso());
    return `<div class="goal-command-row">${todayScheduled?`<input type="checkbox" class="goal-habit-check" data-id="${esc(h.id)}" ${todayDone?'checked':''}>`:'<span style="width:18px"></span>'}<div class="goal-command-main"><div class="goal-command-title">${esc(h.title)}</div><div class="goal-command-meta">${esc(scheduled)}</div><div class="goal-habit-stats"><span>🔥 ${streak} streak</span><span>${week.completed}/${week.target} this week</span>${todayScheduled?'': '<span>Off today</span>'}</div></div><button type="button" class="secondary-btn goal-edit-habit" data-id="${esc(h.id)}">Edit</button></div>`;
  }

  function section(title,subtitle,html,action=''){
    return `<section class="goal-command-section"><div class="goal-command-section-head"><div><h3>${title}</h3><p>${subtitle}</p></div>${action}</div><div class="goal-command-list">${html}</div></section>`;
  }

  function openGoalTask(gid){
    const g=(state.goals||[]).find(x=>sameId(x.id,gid));if(!g)return;
    modal(`<div class="kicker">${esc(g.title)}</div><h2>Add goal task</h2><div class="field"><label>Task</label><input id="goalTaskTitle" placeholder="What needs to get done?"></div><div class="field"><label>Due date</label><input id="goalTaskDate" type="date" value="${iso()}"></div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="goalTaskSave" class="primary-btn">Add task</button></div>`);
    document.querySelector('#goalTaskSave').onclick=()=>{const title=document.querySelector('#goalTaskTitle').value.trim(),date=document.querySelector('#goalTaskDate').value;if(!title)return toast('Enter a task');if(!date)return toast('Choose a due date');state.tasks.unshift({id:id(),goalId:g.id,title,date,done:false});save();openGoal(g.id);toast('Task added')};
  }

  function openBillReminder(gid){
    const g=(state.goals||[]).find(x=>sameId(x.id,gid));if(!g)return;
    modal(`<div class="kicker">Money goal</div><h2>Add bill reminder</h2><div class="field"><label>Bill name</label><input id="billName" placeholder="e.g. Rent"></div><div class="form-grid"><div class="field"><label>Amount</label><input id="billAmount" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label>Due date</label><input id="billDate" type="date"></div></div><div class="bill-note">This creates a goal-linked bill task. It will appear on your Calendar on the due date and inside this goal.</div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="billSave" class="primary-btn">Add reminder</button></div>`);
    document.querySelector('#billSave').onclick=()=>{const name=document.querySelector('#billName').value.trim(),amount=Math.max(0,Number(document.querySelector('#billAmount').value)||0),date=document.querySelector('#billDate').value;if(!name)return toast('Enter a bill name');if(!date)return toast('Choose a due date');const amountText=amount?` (${money.format(amount)})`:'';state.tasks.unshift({id:id(),goalId:g.id,kind:'bill',billName:name,amount,title:`Bill: ${name}${amountText}`,date,done:false});save();openGoal(g.id);toast('Bill reminder added to Calendar')};
  }

  function askBillOnboarding(gid){
    const g=(state.goals||[]).find(x=>sameId(x.id,gid));if(!g)return;
    modal(`<div class="money-onboard"><div class="money-onboard-icon">▣</div><div><div class="kicker">Money goal setup</div><h2>Add bill reminders?</h2><p>Would you like to put bills connected to <strong>${esc(g.title)}</strong> on your Calendar with their due date and amount?</p></div><div class="money-onboard-choice"><button id="billOnboardSkip" class="secondary-btn">Not now</button><button id="billOnboardAdd" class="primary-btn">Add a bill reminder</button></div></div>`);
    document.querySelector('#billOnboardSkip').onclick=()=>{close();switchView('goals');openGoal(g.id)};
    document.querySelector('#billOnboardAdd').onclick=()=>openBillReminder(g.id);
  }

  function bindGoalDetail(g){
    document.querySelectorAll('.goal-task-check').forEach(box=>box.onchange=()=>{const t=(state.tasks||[]).find(x=>sameId(x.id,box.dataset.id));if(t){t.done=box.checked;save();openGoal(g.id)}});
    document.querySelectorAll('.goal-task-del').forEach(btn=>btn.onclick=()=>{const t=(state.tasks||[]).find(x=>sameId(x.id,btn.dataset.id));if(!t)return;if(confirm(`Delete "${t.title}"?`)){state.tasks=state.tasks.filter(x=>!sameId(x.id,t.id));save();openGoal(g.id)}});
    document.querySelectorAll('.goal-habit-check').forEach(box=>box.onchange=()=>{const h=(state.habits||[]).find(x=>sameId(x.id,box.dataset.id));if(!h)return;h.days=Array.isArray(h.days)?h.days:[];h.days=box.checked?[...new Set([...h.days,iso()])]:h.days.filter(d=>d!==iso());save();openGoal(g.id)});
    document.querySelectorAll('.goal-edit-habit').forEach(btn=>btn.onclick=()=>openHabit(btn.dataset.id));
    document.querySelector('#goalAddTask')?.addEventListener('click',()=>openGoalTask(g.id));
    document.querySelector('#goalAddBill')?.addEventListener('click',()=>openBillReminder(g.id));

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
    const tasks=goalTasks(g),open=sortTasks(tasks.filter(t=>!t.done)),done=sortTasks(tasks.filter(t=>t.done)).reverse(),overdue=open.filter(t=>t.date&&t.date<iso()),due=open.filter(t=>!t.date||t.date>=iso()),habits=goalHabits(g),bills=tasks.filter(isBill);
    const subRows=g.subgoals.map(s=>`<div class="goal-command-row"><input class="sg-check" data-id="${esc(s.id)}" type="checkbox" ${s.done?'checked':''}><div class="goal-command-main"><div class="goal-command-title ${s.done?'done':''}">${esc(s.title)}</div><div class="goal-command-meta">${s.targetDate?'Target '+esc(fmt(s.targetDate)):'Subgoal'}</div></div><button class="icon-btn sg-del" data-id="${esc(s.id)}">×</button></div>`).join('')||'<div class="goal-command-empty">No subgoals yet.</div>';
    const milestoneRows=g.milestones.map(m=>`<div class="goal-command-row"><input class="m-check" data-id="${esc(m.id)}" type="checkbox" ${m.done?'checked':''}><div class="goal-command-main"><div class="goal-command-title ${m.done?'done':''}">${esc(m.title)}</div></div><button class="icon-btn m-del" data-id="${esc(m.id)}">×</button></div>`).join('')||'<div class="goal-command-empty">No milestones yet.</div>';
    const habitRows=habits.map(habitRow).join('')||'<div class="goal-command-empty">No habits linked to this goal.</div>';
    const dueRows=[...overdue,...due.filter(t=>!overdue.includes(t))].map(taskRow).join('')||'<div class="goal-command-empty">No open tasks attached to this goal.</div>';
    const doneRows=done.slice(0,20).map(taskRow).join('')||'<div class="goal-command-empty">No completed tasks yet.</div>';
    const isMoney=String(g.category||'').toLowerCase()==='money';

    modal(`<div class="goal-top"><div><div class="badge">${esc(g.category)}</div><h2>${esc(g.title)}</h2><p>${esc(g.why||'')}</p><div class="goal-meta">${g.startDate?`Start ${esc(fmt(g.startDate))} · `:''}${(g.endDate||g.targetDate)?`Due ${esc(fmt(g.endDate||g.targetDate))}`:'No deadline'}</div></div><div class="goal-percent">${progress(g)}%</div></div><div class="progress"><span style="width:${progress(g)}%"></span></div><div class="goal-command-metrics"><div class="goal-command-metric"><strong>${habits.length}</strong><span>Habits</span></div><div class="goal-command-metric"><strong>${open.length}</strong><span>Open tasks</span></div><div class="goal-command-metric"><strong>${done.length}</strong><span>Done tasks</span></div><div class="goal-command-metric"><strong>${isMoney?bills.length:overdue.length}</strong><span>${isMoney?'Bills':'Overdue'}</span></div></div>${section('Due & upcoming tasks','Everything still requiring action.',dueRows,`<button id="goalAddTask" class="secondary-btn">+ Task</button>`)}${section('Completed tasks','Recent completed work attached to this goal.',doneRows)}${section('Habits','Recurring behaviors supporting this goal.',habitRows)}${isMoney?section('Bill reminders','Bills attached to this Money goal and shown on Calendar.',bills.length?sortTasks(bills).map(taskRow).join(''):'<div class="goal-command-empty">No bill reminders yet.</div>',`<button id="goalAddBill" class="secondary-btn">+ Bill reminder</button>`):''}${section('Subgoals','Smaller outcomes that roll up to this goal.',subRows)}<div class="form-grid" style="margin-top:10px"><div class="field"><label>New subgoal</label><input id="sgTitle" placeholder="e.g. Finish onboarding"></div><div class="field"><label>Target date</label><input id="sgDate" type="date"></div></div><div style="display:flex;justify-content:flex-end"><button id="mkSG" class="secondary-btn">+ Add subgoal</button></div>${section('Milestones','Checkpoints and proof of progress.',milestoneRows)}<div class="field"><label>Add milestone</label><input id="mTitle"></div><div class="modal-actions"><button id="delGoal" class="danger-btn">Delete goal</button><button class="secondary-btn close-modal">Close</button><button id="mkM" class="primary-btn">Add milestone</button></div>`);
    bindGoalDetail(g);
  };

  openGoalModal=function(){
    modal(`<h2>Create a goal</h2><div class="field"><label>Goal</label><input id="gTitle"></div><div class="form-grid"><div class="field"><label>Category</label><select id="gCat"><option>Personal</option><option>Business</option><option>Money</option><option>Health</option><option>Career</option><option>Learning</option></select></div><div class="field"><label>Target date</label><input id="gDate" type="date" value="${addDays(30)}"></div></div><div class="field"><label>Why does it matter?</label><textarea id="gWhy"></textarea></div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="mkGoal" class="primary-btn">Create goal</button></div>`);
    document.querySelector('#mkGoal').onclick=()=>{const title=document.querySelector('#gTitle').value.trim();if(!title)return toast('Enter a goal');const category=document.querySelector('#gCat').value,newGoal={id:id(),title,category,targetDate:document.querySelector('#gDate').value,why:document.querySelector('#gWhy').value,subgoals:[],milestones:[]};state.goals.unshift(newGoal);save();if(category==='Money')askBillOnboarding(newGoal.id);else{close();switchView('goals')}};
  };

  ensureStyles();
  const addGoal=document.querySelector('#addGoalBtn');if(addGoal)addGoal.onclick=openGoalModal;
})();
