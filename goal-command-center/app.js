const KEY='gcc-v1';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const iso=()=>new Date().toISOString().slice(0,10);
const id=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const addDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
function starter(){
  const a=id(),b=id();
  return{goals:[
    {id:a,title:'Launch my web project',category:'Business',targetDate:addDays(45),why:'Finish a useful version and put it in front of real people.',
      subgoals:[{id:id(),title:'Complete MVP',targetDate:addDays(20),done:false},{id:id(),title:'Recruit beta testers',targetDate:addDays(40),done:false}],
      milestones:[{id:id(),title:'Finish core features',done:true},{id:id(),title:'Polish main screens',done:false},{id:id(),title:'Test with 10 people',done:false}]},
    {id:b,title:'Build an emergency fund',category:'Money',targetDate:addDays(120),why:'Create more financial breathing room.',subgoals:[],
      milestones:[{id:id(),title:'Set savings target',done:true},{id:id(),title:'Automate weekly transfer',done:false}]}
  ],tasks:[{id:id(),goalId:a,title:'Work 30 minutes on the web project',date:iso(),done:false},{id:id(),goalId:b,title:'Review unnecessary spending',date:iso(),done:false}],habits:[{id:id(),title:'Plan tomorrow before bed',days:[]},{id:id(),title:'Read 10 minutes',days:[]}],checkins:[]};
}
let state;try{state=JSON.parse(localStorage.getItem(KEY))||starter()}catch{state=starter()}
function normalize(){
  state.goals=state.goals||[]; state.tasks=state.tasks||[]; state.habits=state.habits||[]; state.checkins=state.checkins||[];
  state.goals.forEach(g=>{g.milestones=g.milestones||[];g.subgoals=g.subgoals||[];g.subgoals.forEach(s=>{if(typeof s.done!=='boolean')s.done=false})});
}
normalize();
function save(){normalize();localStorage.setItem(KEY,JSON.stringify(state));render()}
function progress(g){
  const items=[...(g.milestones||[]),...(g.subgoals||[])];
  return items.length?Math.round(items.filter(x=>x.done).length/items.length*100):0;
}
function overall(){return state.goals.length?Math.round(state.goals.reduce((a,g)=>a+progress(g),0)/state.goals.length):0}
function fmt(d){return d?new Date(d+'T12:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'No deadline'}
function card(g){
  const p=progress(g),mc=(g.milestones||[]).filter(x=>x.done).length,sc=(g.subgoals||[]).filter(x=>x.done).length;
  return `<article class="card goal-card"><div class="goal-top"><div><div class="badge">${esc(g.category)}</div><h3 class="goal-title" style="margin-top:10px">${esc(g.title)}</h3><div class="goal-meta">Target ${fmt(g.targetDate)}</div></div><div class="goal-percent">${p}%</div></div><div class="progress"><span style="width:${p}%"></span></div><div class="goal-footer"><span>${sc}/${(g.subgoals||[]).length} subgoals · ${mc}/${(g.milestones||[]).length} milestones</span><button class="link-btn open-goal" data-id="${g.id}">Open goal</button></div></article>`;
}
function todayTasks(){
  const list=state.tasks.filter(x=>x.date===iso());
  return list.length?list.map(t=>{const g=state.goals.find(x=>x.id===t.goalId);return `<div class="task-row"><input type="checkbox" class="task-check" data-id="${t.id}" ${t.done?'checked':''}><div class="task-main"><div class="task-title ${t.done?'done':''}">${esc(t.title)}</div><div class="task-sub">${esc(g?.title||'Quick action')}</div></div><button class="icon-btn del-task" data-id="${t.id}">×</button></div>`}).join(''):`<div class="empty">Nothing scheduled for today.</div>`;
}
function render(){
  normalize();
  const ts=state.tasks.filter(x=>x.date===iso()),done=ts.filter(x=>x.done).length,hd=state.habits.filter(h=>(h.days||[]).includes(iso())).length,p=overall();
  $('#dashboardView').innerHTML=`<div class="hero"><div class="card hero-main"><div class="kicker">Your system for execution</div><h2>Turn big goals into today’s next move.</h2><p>Break outcomes into subgoals, milestones, and actions that move them forward.</p></div><div class="card"><div class="score-ring" style="--score:${p*3.6}deg"><strong>${p}%</strong></div><div class="score-label">Overall goal progress</div></div></div><div class="grid grid-4" style="margin-top:18px"><div class="card"><div class="metric-label">Active goals</div><div class="metric-value">${state.goals.length}</div></div><div class="card"><div class="metric-label">Today</div><div class="metric-value">${done}/${ts.length}</div></div><div class="card"><div class="metric-label">Habits today</div><div class="metric-value">${hd}/${state.habits.length}</div></div><div class="card"><div class="metric-label">Check-ins</div><div class="metric-value">${state.checkins.length}</div></div></div><div class="section-head"><div><h2>Priority goals</h2><p>Your current outcomes and progress.</p></div></div><div class="grid grid-2">${state.goals.map(card).join('')||'<div class="empty">No goals yet.</div>'}</div><div class="section-head"><div><h2>Today’s actions</h2></div></div><div class="card"><div class="list">${todayTasks()}</div></div>`;
  $('#goalsView').innerHTML=`<div class="section-head" style="margin-top:0"><div><h2>All goals</h2><p>Build each main goal from smaller subgoals.</p></div></div><div class="grid grid-2">${state.goals.map(card).join('')||'<div class="empty">Create your first goal.</div>'}</div>`;
  $('#todayView').innerHTML=`<div class="grid grid-2"><div class="card"><div class="metric-label">Completion</div><div class="metric-value">${ts.length?Math.round(done/ts.length*100):0}%</div><div class="progress"><span style="width:${ts.length?done/ts.length*100:0}%"></span></div></div><div class="card"><div class="metric-label">Rule for today</div><div style="font-size:19px;font-weight:800;margin-top:9px">Make progress visible.</div></div></div><div class="section-head"><div><h2>Today’s list</h2><p>${fmt(iso())}</p></div><button id="todayAddBtn" class="secondary-btn">+ Add action</button></div><div class="card"><div class="list">${todayTasks()}</div></div>`;
  $('#habitsView').innerHTML=`<div class="section-head" style="margin-top:0"><div><h2>Habits</h2><p>Repeat behaviors that support your goals.</p></div><button id="addHabitBtn" class="secondary-btn">+ New habit</button></div><div class="card"><div class="list">${state.habits.map(h=>`<div class="habit-row"><input type="checkbox" class="habit-check" data-id="${h.id}" ${(h.days||[]).includes(iso())?'checked':''}><div class="task-main"><div class="task-title">${esc(h.title)}</div></div><button class="icon-btn del-habit" data-id="${h.id}">×</button></div>`).join('')||'<div class="empty">No habits yet.</div>'}</div></div>`;
  const c=state.checkins.find(x=>x.date===iso());
  $('#checkinView').innerHTML=`<div class="card" style="max-width:760px"><div class="kicker">2-minute review</div><h2>Daily check-in</h2><div class="field"><label>What went well?</label><textarea id="wentWell">${esc(c?.wentWell||'')}</textarea></div><div class="field"><label>What needs attention?</label><textarea id="attention">${esc(c?.attention||'')}</textarea></div><div class="field"><label>Tomorrow’s priority</label><input id="priority" value="${esc(c?.priority||'')}"></div><div class="modal-actions"><button id="saveCheckin" class="primary-btn">Save check-in</button></div></div>`;
  $('#settingsView').innerHTML=`<div class="card settings-card"><div class="kicker">Storage</div><h2>Free browser storage</h2><p>The website itself is available anywhere. Your saved goals currently stay in this browser until cloud sync is connected. Use Export for backup.</p><div class="top-actions"><button id="exportBtn" class="secondary-btn">Export backup</button><label class="secondary-btn">Import backup<input id="importInput" type="file" accept="application/json" hidden></label><button id="resetBtn" class="danger-btn">Reset demo</button></div></div>`;
  bind();
}
function bind(){
  $$('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  $$('.task-check').forEach(b=>b.onchange=()=>{const t=state.tasks.find(x=>x.id===b.dataset.id);if(t)t.done=b.checked;save()});
  $$('.del-task').forEach(b=>b.onclick=()=>{state.tasks=state.tasks.filter(x=>x.id!==b.dataset.id);save()});
  $$('.habit-check').forEach(b=>b.onchange=()=>{const h=state.habits.find(x=>x.id===b.dataset.id);h.days=h.days||[];h.days=b.checked?[...new Set([...h.days,iso()])]:h.days.filter(d=>d!==iso());save()});
  $$('.del-habit').forEach(b=>b.onclick=()=>{state.habits=state.habits.filter(x=>x.id!==b.dataset.id);save()});
  $$('.open-goal').forEach(b=>b.onclick=()=>openGoal(b.dataset.id));
  $('#todayAddBtn')?.addEventListener('click',openTask);$('#addHabitBtn')?.addEventListener('click',openHabit);
  $('#saveCheckin')?.addEventListener('click',()=>{const obj={date:iso(),wentWell:$('#wentWell').value,attention:$('#attention').value,priority:$('#priority').value};state.checkins=state.checkins.filter(x=>x.date!==iso());state.checkins.unshift(obj);save();toast('Check-in saved')});
  $('#exportBtn')?.addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='goal-command-center-backup.json';a.click()});
  $('#importInput')?.addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{state=JSON.parse(r.result);normalize();save();toast('Backup restored')}catch{toast('Invalid backup')}};r.readAsText(f)});
  $('#resetBtn')?.addEventListener('click',()=>{if(confirm('Reset to starter data?')){state=starter();save()}});
}
function switchView(v){
  $$('.view').forEach(x=>x.classList.remove('active'));$(`#${v}View`)?.classList.add('active');
  $$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===v));
  $('#viewTitle').textContent=({dashboard:'Command Center',goals:'Goals',today:'Today',habits:'Habits',checkin:'Daily Check-in',settings:'Settings'})[v]||'Goal Command Center';
}
function modal(html){const r=$('#modalRoot');r.innerHTML=`<div class="modal">${html}</div>`;r.classList.remove('hidden');r.onclick=e=>{if(e.target===r)close()};$$('.close-modal').forEach(b=>b.onclick=close)}
function close(){$('#modalRoot').classList.add('hidden');$('#modalRoot').innerHTML=''}
function openGoalModal(){
  modal(`<h2>Create a goal</h2><div class="field"><label>Goal</label><input id="gTitle"></div><div class="form-grid"><div class="field"><label>Category</label><select id="gCat"><option>Personal</option><option>Business</option><option>Money</option><option>Health</option><option>Career</option><option>Learning</option></select></div><div class="field"><label>Target date</label><input id="gDate" type="date" value="${addDays(30)}"></div></div><div class="field"><label>Why does it matter?</label><textarea id="gWhy"></textarea></div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="mkGoal" class="primary-btn">Create goal</button></div>`);
  $('#mkGoal').onclick=()=>{const title=$('#gTitle').value.trim();if(!title)return;state.goals.unshift({id:id(),title,category:$('#gCat').value,targetDate:$('#gDate').value,why:$('#gWhy').value,subgoals:[],milestones:[]});save();close();switchView('goals')};
}
function openTask(){
  modal(`<h2>Add today’s action</h2><div class="field"><label>Action</label><input id="tTitle"></div><div class="field"><label>Goal</label><select id="tGoal"><option value="">Quick action</option>${state.goals.map(g=>`<option value="${g.id}">${esc(g.title)}</option>`).join('')}</select></div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="mkTask" class="primary-btn">Add action</button></div>`);
  $('#mkTask').onclick=()=>{const title=$('#tTitle').value.trim();if(!title)return;state.tasks.unshift({id:id(),goalId:$('#tGoal').value||null,title,date:iso(),done:false});save();close()};
}
function openHabit(){
  modal(`<h2>Create a habit</h2><div class="field"><label>Habit</label><input id="hTitle"></div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="mkHabit" class="primary-btn">Create habit</button></div>`);
  $('#mkHabit').onclick=()=>{const title=$('#hTitle').value.trim();if(!title)return;state.habits.unshift({id:id(),title,days:[]});save();close()};
}
function openGoal(gid){
  const g=state.goals.find(x=>x.id===gid);if(!g)return;g.subgoals=g.subgoals||[];g.milestones=g.milestones||[];
  const subgoalRows=g.subgoals.map(s=>`<div class="task-row" style="padding-left:8px"><input class="sg-check" data-id="${s.id}" type="checkbox" ${s.done?'checked':''}><div class="task-main"><div class="task-title ${s.done?'done':''}">${esc(s.title)}</div><div class="task-sub">${s.targetDate?'Target '+fmt(s.targetDate):'Subgoal'}</div></div><button class="icon-btn sg-del" data-id="${s.id}">×</button></div>`).join('')||'<div class="empty">No subgoals yet.</div>';
  const milestoneRows=g.milestones.map(m=>`<div class="task-row"><input class="m-check" data-id="${m.id}" type="checkbox" ${m.done?'checked':''}><div class="task-main"><div class="task-title ${m.done?'done':''}">${esc(m.title)}</div></div><button class="icon-btn m-del" data-id="${m.id}">×</button></div>`).join('')||'<div class="empty">No milestones yet.</div>';
  modal(`<div class="goal-top"><div><div class="badge">${esc(g.category)}</div><h2>${esc(g.title)}</h2><p>${esc(g.why||'')}</p></div><div class="goal-percent">${progress(g)}%</div></div><div class="progress"><span style="width:${progress(g)}%"></span></div>
    <div class="section-head" style="margin-top:22px"><div><h3 style="margin:0">Subgoals</h3><p>Smaller outcomes that roll up to this goal.</p></div></div><div class="list">${subgoalRows}</div>
    <div class="form-grid" style="margin-top:14px"><div class="field"><label>New subgoal</label><input id="sgTitle" placeholder="e.g. Finish onboarding"></div><div class="field"><label>Target date</label><input id="sgDate" type="date"></div></div><div style="display:flex;justify-content:flex-end"><button id="mkSG" class="secondary-btn">+ Add subgoal</button></div>
    <div class="section-head" style="margin-top:26px"><div><h3 style="margin:0">Milestones</h3><p>Checkpoints and proof of progress.</p></div></div><div class="list">${milestoneRows}</div><div class="field"><label>Add milestone</label><input id="mTitle"></div>
    <div class="modal-actions"><button id="delGoal" class="danger-btn">Delete goal</button><button class="secondary-btn close-modal">Close</button><button id="mkM" class="primary-btn">Add milestone</button></div>`);
  $$('.sg-check').forEach(b=>b.onchange=()=>{const s=g.subgoals.find(x=>x.id===b.dataset.id);if(s)s.done=b.checked;save();openGoal(gid)});
  $$('.sg-del').forEach(b=>b.onclick=()=>{g.subgoals=g.subgoals.filter(x=>x.id!==b.dataset.id);save();openGoal(gid)});
  $('#mkSG').onclick=()=>{const title=$('#sgTitle').value.trim();if(!title)return;g.subgoals.push({id:id(),title,targetDate:$('#sgDate').value||'',done:false});save();openGoal(gid)};
  $$('.m-check').forEach(b=>b.onchange=()=>{const m=g.milestones.find(x=>x.id===b.dataset.id);if(m)m.done=b.checked;save();openGoal(gid)});
  $$('.m-del').forEach(b=>b.onclick=()=>{g.milestones=g.milestones.filter(x=>x.id!==b.dataset.id);save();openGoal(gid)});
  $('#mkM').onclick=()=>{const title=$('#mTitle').value.trim();if(!title)return;g.milestones.push({id:id(),title,done:false});save();openGoal(gid)};
  $('#delGoal').onclick=()=>{if(confirm('Delete this goal?')){state.goals=state.goals.filter(x=>x.id!==gid);state.tasks.forEach(t=>{if(t.goalId===gid)t.goalId=null});save();close()}};
}
function toast(x){const t=$('#toast');t.textContent=x;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),1800)}
$('#todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
$('#addGoalBtn').onclick=openGoalModal;$('#quickAddBtn').onclick=openTask;$$('.nav-item').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
let installPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#installBtn').classList.remove('hidden')});$('#installBtn').onclick=async()=>{if(installPrompt){installPrompt.prompt();installPrompt=null}};
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
