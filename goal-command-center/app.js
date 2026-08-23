const KEY='gcc-v1';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const iso=()=>new Date().toISOString().slice(0,10);
const id=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const addDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};

function starter(){
  const a=id(),b=id();
  return{goals:[
    {id:a,title:'Launch my web project',category:'Business',targetDate:addDays(45),why:'Finish a useful version and put it in front of real people.',subgoals:[{id:id(),title:'Complete MVP',targetDate:addDays(20),done:false},{id:id(),title:'Recruit beta testers',targetDate:addDays(40),done:false}],milestones:[{id:id(),title:'Finish core features',done:true},{id:id(),title:'Polish main screens',done:false},{id:id(),title:'Test with 10 people',done:false}]},
    {id:b,title:'Build an emergency fund',category:'Money',targetDate:addDays(120),why:'Create more financial breathing room.',subgoals:[],milestones:[{id:id(),title:'Set savings target',done:true},{id:id(),title:'Automate weekly transfer',done:false}]}
  ],tasks:[{id:id(),goalId:a,title:'Work 30 minutes on the web project',date:iso(),done:false},{id:id(),goalId:b,title:'Review unnecessary spending',date:iso(),done:false}],habits:[{id:id(),title:'Plan tomorrow before bed',days:[],goalId:null,weekdays:[0,1,2,3,4,5,6],weeklyTarget:7,startDate:'',endDate:''},{id:id(),title:'Read 10 minutes',days:[],goalId:null,weekdays:[0,1,2,3,4,5,6],weeklyTarget:7,startDate:'',endDate:''}],checkins:[]};
}

let state;
try{state=JSON.parse(localStorage.getItem(KEY))||starter()}catch{state=starter()}

function normalize(){
  state=state&&typeof state==='object'?state:starter();
  state.goals=Array.isArray(state.goals)?state.goals:[];
  state.tasks=Array.isArray(state.tasks)?state.tasks:[];
  state.habits=Array.isArray(state.habits)?state.habits:[];
  state.checkins=Array.isArray(state.checkins)?state.checkins:[];
  state.goals.forEach(g=>{g.milestones=Array.isArray(g.milestones)?g.milestones:[];g.subgoals=Array.isArray(g.subgoals)?g.subgoals:[];g.subgoals.forEach(s=>{if(typeof s.done!=='boolean')s.done=false})});
  state.habits.forEach(h=>{
    h.days=Array.isArray(h.days)?[...new Set(h.days.filter(Boolean))]:[];
    h.goalId=h.goalId||null;
    h.weekdays=Array.isArray(h.weekdays)&&h.weekdays.length?[...new Set(h.weekdays.map(Number).filter(n=>n>=0&&n<=6))].sort((a,b)=>a-b):[0,1,2,3,4,5,6];
    const target=Number(h.weeklyTarget);
    h.weeklyTarget=Number.isFinite(target)&&target>=1&&target<=7?Math.round(target):Math.max(1,h.weekdays.length);
    h.startDate=h.startDate||'';
    h.endDate=h.endDate||'';
  });
}
normalize();

const cfg=window.GOAL_APP_CONFIG||{};
const supabaseUrl=(cfg.supabaseUrl||'').trim();
const supabaseKey=(cfg.supabasePublishableKey||cfg.supabaseAnonKey||'').trim();
const cloudConfigured=!!(supabaseUrl&&supabaseKey&&window.supabase?.createClient);
const cloud=cloudConfigured?window.supabase.createClient(supabaseUrl,supabaseKey):null;
let currentUser=null;
let cloudBusy=false;
let cloudTimer=null;
let suppressCloudPush=false;

function saveLocal(){localStorage.setItem(KEY,JSON.stringify(state))}
function save(){normalize();saveLocal();render();queueCloudSave()}
function progress(g){const items=[...(g.milestones||[]),...(g.subgoals||[])];return items.length?Math.round(items.filter(x=>x.done).length/items.length*100):0}
function overall(){return state.goals.length?Math.round(state.goals.reduce((a,g)=>a+progress(g),0)/state.goals.length):0}
function fmt(d){return d?new Date(d+'T12:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'No deadline'}

function setSyncStatus(text,mode='local'){
  const el=$('#syncStatus');if(!el)return;
  el.innerHTML=`<span class="dot"></span> ${esc(text)}`;
  el.dataset.mode=mode;
}

function queueCloudSave(){
  if(!cloud||!currentUser||suppressCloudPush)return;
  clearTimeout(cloudTimer);
  cloudTimer=setTimeout(()=>pushCloud(),450);
}

async function pushCloud(){
  if(!cloud||!currentUser||cloudBusy)return;
  cloudBusy=true;setSyncStatus('Saving…','sync');
  const {error}=await cloud.from('goal_app_state').upsert({user_id:currentUser.id,data:state,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  cloudBusy=false;
  if(error){console.error(error);setSyncStatus('Sync error','error');toast('Cloud sync failed')}else setSyncStatus('Synced','ok');
}

async function pullCloud(){
  if(!cloud||!currentUser)return;
  cloudBusy=true;setSyncStatus('Syncing…','sync');
  const {data,error}=await cloud.from('goal_app_state').select('data,updated_at').eq('user_id',currentUser.id).maybeSingle();
  cloudBusy=false;
  if(error){console.error(error);setSyncStatus('Sync error','error');toast('Could not load cloud data');return}
  if(data?.data&&typeof data.data==='object'){
    suppressCloudPush=true;
    state=data.data;normalize();saveLocal();render();
    suppressCloudPush=false;
    setSyncStatus('Synced','ok');
  }else{
    await pushCloud();
  }
}

async function initCloud(){
  if(!cloudConfigured){setSyncStatus('Local mode','local');return}
  try{
    const {data}=await cloud.auth.getSession();
    currentUser=data?.session?.user||null;
    if(currentUser){await pullCloud()}else{setSyncStatus('Sign in to sync','local');render()}
    cloud.auth.onAuthStateChange(async(event,session)=>{
      currentUser=session?.user||null;
      if(currentUser){setSyncStatus('Syncing…','sync');await pullCloud()}else{setSyncStatus('Sign in to sync','local');render()}
    });
  }catch(err){console.error(err);setSyncStatus('Cloud unavailable','error')}
}

async function signUp(){
  const email=$('#authEmail')?.value.trim(),password=$('#authPassword')?.value||'';
  if(!email||password.length<6){toast('Enter email and a password of at least 6 characters');return}
  const {data,error}=await cloud.auth.signUp({email,password,options:{emailRedirectTo:location.href.split('#')[0]}});
  if(error){toast(error.message);return}
  if(data.session){currentUser=data.user;await pullCloud();toast('Account created and signed in')}else toast('Check your email to confirm your account');
}

async function signIn(){
  const email=$('#authEmail')?.value.trim(),password=$('#authPassword')?.value||'';
  if(!email||!password){toast('Enter your email and password');return}
  const {data,error}=await cloud.auth.signInWithPassword({email,password});
  if(error){toast(error.message);return}
  currentUser=data.user;await pullCloud();toast('Signed in');
}

async function signOut(){if(!cloud)return;await cloud.auth.signOut();currentUser=null;setSyncStatus('Sign in to sync','local');render();toast('Signed out')}
async function syncNow(){if(!currentUser){toast('Sign in first');return}await pushCloud();toast('Cloud sync complete')}

function card(g){
  const p=progress(g),mc=(g.milestones||[]).filter(x=>x.done).length,sc=(g.subgoals||[]).filter(x=>x.done).length;
  return `<article class="card goal-card"><div class="goal-top"><div><div class="badge">${esc(g.category)}</div><h3 class="goal-title" style="margin-top:10px">${esc(g.title)}</h3><div class="goal-meta">Target ${fmt(g.targetDate)}</div></div><div class="goal-percent">${p}%</div></div><div class="progress"><span style="width:${p}%"></span></div><div class="goal-footer"><span>${sc}/${(g.subgoals||[]).length} subgoals · ${mc}/${(g.milestones||[]).length} milestones</span><button class="link-btn open-goal" data-id="${g.id}">Open goal</button></div></article>`;
}

function todayTasks(){
  const list=state.tasks.filter(x=>x.date===iso());
  return list.length?list.map(t=>{const g=state.goals.find(x=>x.id===t.goalId);return `<div class="task-row"><input type="checkbox" class="task-check" data-id="${t.id}" ${t.done?'checked':''}><div class="task-main"><div class="task-title ${t.done?'done':''}">${esc(t.title)}</div><div class="task-sub">${esc(g?.title||'Quick action')}</div></div><button class="icon-btn del-task" data-id="${t.id}">×</button></div>`}).join(''):`<div class="empty">Nothing scheduled for today.</div>`;
}

const HABIT_DAY_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function habitDate(key){const [y,m,d]=String(key||'').split('-').map(Number);return new Date(y,m-1,d)}
function habitKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function habitShift(key,n){const d=habitDate(key);d.setDate(d.getDate()+n);return habitKey(d)}
function habitScheduled(h,key){if(!key)return false;if(h.startDate&&key<h.startDate)return false;if(h.endDate&&key>h.endDate)return false;return(h.weekdays||[]).includes(habitDate(key).getDay())}
function habitGoal(h){return state.goals.find(g=>String(g.id)===String(h.goalId))}
function habitDone(h,key){return(h.days||[]).includes(key)}
function habitWeekStart(key=iso()){const d=habitDate(key);d.setDate(d.getDate()-d.getDay());return habitKey(d)}
function habitWeekStats(h){const start=habitWeekStart(),end=habitShift(start,6),completed=(h.days||[]).filter(d=>d>=start&&d<=end).length;return{completed,target:Number(h.weeklyTarget)||1}}
function habitRate(h,lookback=30){let scheduled=0,done=0;for(let i=lookback-1;i>=0;i--){const key=habitShift(iso(),-i);if(!habitScheduled(h,key))continue;scheduled++;if(habitDone(h,key))done++}return scheduled?Math.round(done/scheduled*100):0}
function habitCurrentStreak(h){let key=iso(),streak=0;if(habitScheduled(h,key)&&!habitDone(h,key))key=habitShift(key,-1);for(let i=0;i<366;i++,key=habitShift(key,-1)){if(!habitScheduled(h,key))continue;if(habitDone(h,key))streak++;else break}return streak}
function habitBestStreak(h){const firstDone=(h.days||[]).slice().sort()[0];let start=habitShift(iso(),-365);if(h.startDate&&h.startDate>start)start=h.startDate;if(firstDone&&firstDone>start)start=habitShift(firstDone,-14);let best=0,current=0,key=start;for(let i=0;i<380&&key<=iso();i++,key=habitShift(key,1)){if(!habitScheduled(h,key))continue;if(habitDone(h,key)){current++;best=Math.max(best,current)}else current=0}return best}
function previousScheduledHabitDate(h,key=iso()){let d=habitShift(key,-1);for(let i=0;i<14;i++,d=habitShift(d,-1))if(habitScheduled(h,d))return d;return''}
function habitNeedsBounceBack(h){const prev=previousScheduledHabitDate(h);return!!(prev&&!habitDone(h,prev)&&habitScheduled(h,iso()))}
function habitScheduleText(h){const days=h.weekdays||[];if(days.length===7)return'Daily';if(days.join(',')==='1,2,3,4,5')return'Weekdays';return days.map(d=>HABIT_DAY_NAMES[d]).join(' · ')}
function habitHeatmap(h){let html='';for(let i=27;i>=0;i--){const key=habitShift(iso(),-i),scheduled=habitScheduled(h,key),done=habitDone(h,key),cls=done?'done':scheduled?'missed':'off',label=done?'Completed':scheduled?'Not completed':'Not scheduled';html+=`<span class="habit-heat ${cls}" title="${esc(fmt(key))}: ${label}"></span>`}return html}
function habitSummary(){const today=iso(),scheduled=state.habits.filter(h=>habitScheduled(h,today)),done=scheduled.filter(h=>habitDone(h,today)).length,totalWeekly=state.habits.reduce((sum,h)=>sum+habitWeekStats(h).completed,0),totalTargets=state.habits.reduce((sum,h)=>sum+habitWeekStats(h).target,0),best=state.habits.reduce((m,h)=>Math.max(m,habitCurrentStreak(h)),0),rates=state.habits.map(h=>habitRate(h)),avg=rates.length?Math.round(rates.reduce((a,b)=>a+b,0)/rates.length):0;return{scheduled,done,totalWeekly,totalTargets,best,avg}}
function habitCard(h){
  const goal=habitGoal(h),week=habitWeekStats(h),rate=habitRate(h),streak=habitCurrentStreak(h),best=habitBestStreak(h),todayScheduled=habitScheduled(h,iso()),todayDone=habitDone(h,iso()),bounce=habitNeedsBounceBack(h);
  return `<article class="card habit-card-v2"><div class="habit-card-top"><div><div class="badge">${esc(goal?.title||'Independent habit')}</div><h3>${esc(h.title)}</h3><div class="habit-schedule">${esc(habitScheduleText(h))} · ${week.target}× weekly</div></div><div class="habit-card-actions"><button class="secondary-btn edit-habit" data-id="${esc(h.id)}">Edit</button><button class="danger-btn del-habit" data-id="${esc(h.id)}">Delete</button></div></div>${todayScheduled?`<label class="habit-today-toggle"><input type="checkbox" class="habit-check" data-id="${esc(h.id)}" ${todayDone?'checked':''}><span>${todayDone?'Completed today':'Complete today'}</span></label>`:'<div class="habit-rest-day">Not scheduled today</div>'}${bounce&&!todayDone?'<div class="habit-bounce">Don’t break twice — get back on track today.</div>':''}<div class="habit-stats"><div><strong>${streak}</strong><span>Current streak</span></div><div><strong>${best}</strong><span>Best streak</span></div><div><strong>${week.completed}/${week.target}</strong><span>This week</span></div><div><strong>${rate}%</strong><span>30-day rate</span></div></div><div class="habit-progress-line"><span style="width:${Math.min(100,Math.round(week.completed/Math.max(1,week.target)*100))}%"></span></div><div class="habit-heatmap" aria-label="Last 28 days">${habitHeatmap(h)}</div><div class="habit-heat-legend"><span><i class="habit-heat done"></i>Done</span><span><i class="habit-heat missed"></i>Missed</span><span><i class="habit-heat off"></i>Off day</span></div></article>`;
}
function renderHabits(){
  ensureHabitStyles();const view=$('#habitsView');if(!view)return;const s=habitSummary();
  const todayRows=s.scheduled.map(h=>{const goal=habitGoal(h),done=habitDone(h,iso());return `<div class="habit-row habit-today-row"><input type="checkbox" class="habit-check" data-id="${esc(h.id)}" ${done?'checked':''}><div class="task-main"><div class="task-title ${done?'done':''}">${esc(h.title)}</div><div class="task-sub">${esc(goal?.title||habitScheduleText(h))}</div></div>${habitNeedsBounceBack(h)&&!done?'<span class="habit-bounce-mini">Back on track</span>':''}</div>`}).join('')||'<div class="empty">No habits are scheduled for today.</div>';
  view.innerHTML=`<div class="section-head" style="margin-top:0"><div><h2>Habits</h2><p>Build consistency around the behaviors that move your goals forward.</p></div><button id="addHabitBtn" class="secondary-btn">+ New habit</button></div><div class="habit-summary-grid"><div class="card"><div class="metric-label">Today</div><div class="metric-value">${s.done}/${s.scheduled.length}</div><div class="task-sub">scheduled habits complete</div></div><div class="card"><div class="metric-label">This week</div><div class="metric-value">${s.totalWeekly}/${s.totalTargets}</div><div class="task-sub">completions toward targets</div></div><div class="card"><div class="metric-label">Strongest streak</div><div class="metric-value">${s.best}</div><div class="task-sub">scheduled completions</div></div><div class="card"><div class="metric-label">30-day rate</div><div class="metric-value">${s.avg}%</div><div class="task-sub">average consistency</div></div></div><div class="section-head"><div><h2>Today’s habits</h2><p>${fmt(iso())}</p></div></div><div class="card"><div class="list">${todayRows}</div></div><div class="section-head"><div><h2>Habit system</h2><p>Schedule, streaks, weekly targets, and recent consistency.</p></div></div><div class="habit-card-grid">${state.habits.map(habitCard).join('')||'<div class="empty">Create your first habit.</div>'}</div>`;
}
function ensureHabitStyles(){
  if($('#habitV2Styles'))return;const style=document.createElement('style');style.id='habitV2Styles';style.textContent=`.habit-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.habit-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.habit-card-v2{display:grid;gap:14px}.habit-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.habit-card-top h3{margin:10px 0 4px}.habit-card-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.habit-schedule{font-size:12px;color:var(--muted)}.habit-today-toggle{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:12px;padding:11px 12px;background:var(--panel2);font-weight:800}.habit-today-toggle input{width:19px;height:19px;accent-color:var(--accent)}.habit-rest-day{font-size:12px;color:var(--muted);padding:8px 0}.habit-bounce{border-left:3px solid var(--danger);padding:8px 10px;border-radius:8px;background:var(--panel2);font-size:12px;color:var(--text)}.habit-bounce-mini{font-size:10px;font-weight:850;color:var(--danger);white-space:nowrap}.habit-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.habit-stats>div{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:9px}.habit-stats strong{display:block;font-size:18px}.habit-stats span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.04em;margin-top:3px}.habit-progress-line{height:6px;background:var(--soft);border-radius:999px;overflow:hidden}.habit-progress-line span{display:block;height:100%;background:var(--accent);border-radius:inherit}.habit-heatmap{display:grid;grid-template-columns:repeat(14,1fr);gap:4px}.habit-heat{display:block;aspect-ratio:1;border-radius:3px;border:1px solid var(--line);background:var(--panel2)}.habit-heat.done{background:var(--accent);border-color:var(--accent)}.habit-heat.missed{background:color-mix(in srgb,var(--danger) 55%,var(--panel2));border-color:var(--danger)}.habit-heat.off{opacity:.35}.habit-heat-legend{display:flex;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:10px}.habit-heat-legend span{display:inline-flex;align-items:center;gap:5px}.habit-heat-legend .habit-heat{width:9px;height:9px;aspect-ratio:auto}.habit-day-picker{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:8px}.habit-day-picker label{position:relative}.habit-day-picker input{position:absolute;opacity:0}.habit-day-picker span{display:grid;place-items:center;min-height:38px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--muted);font-size:11px;font-weight:800;cursor:pointer}.habit-day-picker input:checked+span{background:var(--accent);border-color:var(--accent);color:#06120e}.habit-today-row{gap:12px}@media(max-width:850px){.habit-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.habit-card-grid{grid-template-columns:1fr}}@media(max-width:520px){.habit-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.habit-card-top{display:grid}.habit-card-actions{justify-content:flex-start}.habit-day-picker{gap:4px}.habit-day-picker span{font-size:9px;min-height:36px}.habit-heatmap{grid-template-columns:repeat(14,1fr)}}`;document.head.appendChild(style)
}
function habitDayPicker(selected=[]){const set=new Set(selected.map(Number));return `<div class="habit-day-picker">${HABIT_DAY_NAMES.map((name,i)=>`<label><input type="checkbox" class="habit-weekday" value="${i}" ${set.has(i)?'checked':''}><span>${name}</span></label>`).join('')}</div>`}
function openHabit(habitId=null){
  const h=habitId?state.habits.find(x=>String(x.id)===String(habitId)):null,selected=h?.weekdays||[0,1,2,3,4,5,6],target=h?.weeklyTarget||selected.length||7;
  modal(`<div class="kicker">Habit builder</div><h2>${h?'Edit habit':'Create a habit'}</h2><div class="field"><label>Habit</label><input id="hTitle" value="${esc(h?.title||'')}" placeholder="e.g. Workout 30 minutes"></div><div class="field"><label>Linked goal</label><select id="hGoal"><option value="">No linked goal</option>${state.goals.map(g=>`<option value="${esc(g.id)}" ${String(g.id)===String(h?.goalId||'')?'selected':''}>${esc(g.title)}</option>`).join('')}</select></div><div class="field"><label>Repeat on</label>${habitDayPicker(selected)}</div><div class="form-grid"><div class="field"><label>Weekly target</label><input id="hTarget" type="number" min="1" max="7" value="${target}"></div><div class="field"><label>Start date</label><input id="hStart" type="date" value="${esc(h?.startDate||iso())}"></div></div><div class="field"><label>End date <span class="task-sub">(optional)</span></label><input id="hEnd" type="date" value="${esc(h?.endDate||'')}"></div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="mkHabit" class="primary-btn">${h?'Save habit':'Create habit'}</button></div>`);
  $('#mkHabit').onclick=()=>{const title=$('#hTitle').value.trim();if(!title)return toast('Enter a habit');const weekdays=$$('.habit-weekday:checked').map(x=>Number(x.value));if(!weekdays.length)return toast('Choose at least one weekday');const weeklyTarget=Math.max(1,Math.min(7,Number($('#hTarget').value)||weekdays.length)),startDate=$('#hStart').value||'',endDate=$('#hEnd').value||'';if(startDate&&endDate&&endDate<startDate)return toast('End date must be on or after start date');const values={title,goalId:$('#hGoal').value||null,weekdays,weeklyTarget,startDate,endDate};if(h)Object.assign(h,values);else state.habits.unshift({id:id(),days:[],...values});save();close();switchView('habits');toast(h?'Habit updated':'Habit created')}
}

function authSettings(){
  if(!cloudConfigured){return `<div class="card settings-card"><div class="kicker">Cloud sync</div><h2>Ready to connect</h2><p>The app now supports secure cross-device sync. Add your Supabase Project URL and publishable key to <code>config.js</code>, then sign in here.</p><p class="task-sub">The website is still fully usable in local mode until then.</p></div>`}
  if(currentUser){return `<div class="card settings-card"><div class="kicker">Cloud sync</div><h2>Connected</h2><p>Signed in as <strong>${esc(currentUser.email||'your account')}</strong>. Changes are saved to your cloud record automatically.</p><div class="top-actions"><button id="syncNowBtn" class="primary-btn">Sync now</button><button id="signOutBtn" class="secondary-btn">Sign out</button></div></div>`}
  return `<div class="card settings-card"><div class="kicker">Cloud sync</div><h2>Sign in from any device</h2><p>Create one account, then use the same login on your phone, PC, tablet, or another browser.</p><div class="field"><label>Email</label><input id="authEmail" type="email" autocomplete="email" placeholder="you@example.com"></div><div class="field"><label>Password</label><input id="authPassword" type="password" autocomplete="current-password" placeholder="At least 6 characters"></div><div class="top-actions"><button id="signInBtn" class="primary-btn">Sign in</button><button id="signUpBtn" class="secondary-btn">Create account</button></div></div>`
}

function render(){
  normalize();const ts=state.tasks.filter(x=>x.date===iso()),done=ts.filter(x=>x.done).length,habitToday=state.habits.filter(h=>habitScheduled(h,iso())),hd=habitToday.filter(h=>habitDone(h,iso())).length,p=overall();
  $('#dashboardView').innerHTML=`<div class="hero"><div class="card hero-main"><div class="kicker">Your system for execution</div><h2>Turn big goals into today’s next move.</h2><p>Break outcomes into subgoals, milestones, and actions that move them forward.</p></div><div class="card"><div class="score-ring" style="--score:${p*3.6}deg"><strong>${p}%</strong></div><div class="score-label">Overall goal progress</div></div></div><div class="grid grid-4" style="margin-top:18px"><div class="card"><div class="metric-label">Active goals</div><div class="metric-value">${state.goals.length}</div></div><div class="card"><div class="metric-label">Today</div><div class="metric-value">${done}/${ts.length}</div></div><div class="card"><div class="metric-label">Habits today</div><div class="metric-value">${hd}/${habitToday.length}</div></div><div class="card"><div class="metric-label">Check-ins</div><div class="metric-value">${state.checkins.length}</div></div></div><div class="section-head"><div><h2>Priority goals</h2><p>Your current outcomes and progress.</p></div></div><div class="grid grid-2">${state.goals.map(card).join('')||'<div class="empty">No goals yet.</div>'}</div><div class="section-head"><div><h2>Today’s actions</h2></div></div><div class="card"><div class="list">${todayTasks()}</div></div>`;
  $('#goalsView').innerHTML=`<div class="section-head" style="margin-top:0"><div><h2>All goals</h2><p>Build each main goal from smaller subgoals.</p></div></div><div class="grid grid-2">${state.goals.map(card).join('')||'<div class="empty">Create your first goal.</div>'}</div>`;
  $('#todayView').innerHTML=`<div class="grid grid-2"><div class="card"><div class="metric-label">Completion</div><div class="metric-value">${ts.length?Math.round(done/ts.length*100):0}%</div><div class="progress"><span style="width:${ts.length?done/ts.length*100:0}%"></span></div></div><div class="card"><div class="metric-label">Rule for today</div><div style="font-size:19px;font-weight:800;margin-top:9px">Make progress visible.</div></div></div><div class="section-head"><div><h2>Today’s list</h2><p>${fmt(iso())}</p></div><button id="todayAddBtn" class="secondary-btn">+ Add action</button></div><div class="card"><div class="list">${todayTasks()}</div></div>`;
  renderHabits();
  const c=state.checkins.find(x=>x.date===iso());$('#checkinView').innerHTML=`<div class="card" style="max-width:760px"><div class="kicker">2-minute review</div><h2>Daily check-in</h2><div class="field"><label>What went well?</label><textarea id="wentWell">${esc(c?.wentWell||'')}</textarea></div><div class="field"><label>What needs attention?</label><textarea id="attention">${esc(c?.attention||'')}</textarea></div><div class="field"><label>Tomorrow’s priority</label><input id="priority" value="${esc(c?.priority||'')}"></div><div class="modal-actions"><button id="saveCheckin" class="primary-btn">Save check-in</button></div></div>`;
  $('#settingsView').innerHTML=`${authSettings()}<div class="card settings-card" style="margin-top:18px"><div class="kicker">Backup</div><h2>Portable backup</h2><p>Export a JSON backup whenever you want an extra copy of your goals.</p><div class="top-actions"><button id="exportBtn" class="secondary-btn">Export backup</button><label class="secondary-btn">Import backup<input id="importInput" type="file" accept="application/json" hidden></label><button id="resetBtn" class="danger-btn">Reset demo</button></div></div>`;bind();if(currentUser)setSyncStatus('Synced','ok');else if(cloudConfigured)setSyncStatus('Sign in to sync','local');else setSyncStatus('Local mode','local')
}

function bind(){
  $$('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));$$('.task-check').forEach(b=>b.onchange=()=>{const t=state.tasks.find(x=>x.id===b.dataset.id);if(t)t.done=b.checked;save()});$$('.del-task').forEach(b=>b.onclick=()=>{state.tasks=state.tasks.filter(x=>x.id!==b.dataset.id);save()});
  $$('.habit-check').forEach(b=>b.onchange=()=>{const h=state.habits.find(x=>String(x.id)===String(b.dataset.id));if(!h)return;h.days=h.days||[];h.days=b.checked?[...new Set([...h.days,iso()])]:h.days.filter(d=>d!==iso());save()});$$('.edit-habit').forEach(b=>b.onclick=()=>openHabit(b.dataset.id));$$('.del-habit').forEach(b=>b.onclick=()=>{const h=state.habits.find(x=>String(x.id)===String(b.dataset.id));if(!h)return;if(confirm(`Delete habit "${h.title}"?`)){state.habits=state.habits.filter(x=>String(x.id)!==String(b.dataset.id));save()}});
  $$('.open-goal').forEach(b=>b.onclick=()=>openGoal(b.dataset.id));$('#todayAddBtn')?.addEventListener('click',openTask);$('#addHabitBtn')?.addEventListener('click',()=>openHabit());$('#saveCheckin')?.addEventListener('click',()=>{const obj={date:iso(),wentWell:$('#wentWell').value,attention:$('#attention').value,priority:$('#priority').value};state.checkins=state.checkins.filter(x=>x.date!==iso());state.checkins.unshift(obj);save();toast('Check-in saved')});
  $('#exportBtn')?.addEventListener('click',()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='goal-command-center-backup.json';a.click()});$('#importInput')?.addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{state=JSON.parse(r.result);normalize();save();toast('Backup restored')}catch{toast('Invalid backup')}};r.readAsText(f)});$('#resetBtn')?.addEventListener('click',()=>{if(confirm('Reset to starter data?')){state=starter();save()}});$('#signInBtn')?.addEventListener('click',signIn);$('#signUpBtn')?.addEventListener('click',signUp);$('#signOutBtn')?.addEventListener('click',signOut);$('#syncNowBtn')?.addEventListener('click',syncNow)
}

function switchView(v){$$('.view').forEach(x=>x.classList.remove('active'));$(`#${v}View`)?.classList.add('active');$$('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===v));$('#viewTitle').textContent=({dashboard:'Command Center',goals:'Goals',today:'Today',habits:'Habits',checkin:'Daily Check-in',settings:'Settings'})[v]||'Goal Command Center'}
function modal(html){const r=$('#modalRoot');r.innerHTML=`<div class="modal">${html}</div>`;r.classList.remove('hidden');r.onclick=e=>{if(e.target===r)close()};$$('.close-modal').forEach(b=>b.onclick=close)}
function close(){$('#modalRoot').classList.add('hidden');$('#modalRoot').innerHTML=''}
function openGoalModal(){modal(`<h2>Create a goal</h2><div class="field"><label>Goal</label><input id="gTitle"></div><div class="form-grid"><div class="field"><label>Category</label><select id="gCat"><option>Personal</option><option>Business</option><option>Money</option><option>Health</option><option>Career</option><option>Learning</option></select></div><div class="field"><label>Target date</label><input id="gDate" type="date" value="${addDays(30)}"></div></div><div class="field"><label>Why does it matter?</label><textarea id="gWhy"></textarea></div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="mkGoal" class="primary-btn">Create goal</button></div>`);$('#mkGoal').onclick=()=>{const title=$('#gTitle').value.trim();if(!title)return;state.goals.unshift({id:id(),title,category:$('#gCat').value,targetDate:$('#gDate').value,why:$('#gWhy').value,subgoals:[],milestones:[]});save();close();switchView('goals')}}
function openTask(){modal(`<h2>Add today’s action</h2><div class="field"><label>Action</label><input id="tTitle"></div><div class="field"><label>Goal</label><select id="tGoal"><option value="">Quick action</option>${state.goals.map(g=>`<option value="${g.id}">${esc(g.title)}</option>`).join('')}</select></div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="mkTask" class="primary-btn">Add action</button></div>`);$('#mkTask').onclick=()=>{const title=$('#tTitle').value.trim();if(!title)return;state.tasks.unshift({id:id(),goalId:$('#tGoal').value||null,title,date:iso(),done:false});save();close()}}
function openGoal(gid){
  const g=state.goals.find(x=>x.id===gid);if(!g)return;g.subgoals=g.subgoals||[];g.milestones=g.milestones||[];const subgoalRows=g.subgoals.map(s=>`<div class="task-row" style="padding-left:8px"><input class="sg-check" data-id="${s.id}" type="checkbox" ${s.done?'checked':''}><div class="task-main"><div class="task-title ${s.done?'done':''}">${esc(s.title)}</div><div class="task-sub">${s.targetDate?'Target '+fmt(s.targetDate):'Subgoal'}</div></div><button class="icon-btn sg-del" data-id="${s.id}">×</button></div>`).join('')||'<div class="empty">No subgoals yet.</div>',milestoneRows=g.milestones.map(m=>`<div class="task-row"><input class="m-check" data-id="${m.id}" type="checkbox" ${m.done?'checked':''}><div class="task-main"><div class="task-title ${m.done?'done':''}">${esc(m.title)}</div></div><button class="icon-btn m-del" data-id="${m.id}">×</button></div>`).join('')||'<div class="empty">No milestones yet.</div>';
  modal(`<div class="goal-top"><div><div class="badge">${esc(g.category)}</div><h2>${esc(g.title)}</h2><p>${esc(g.why||'')}</p></div><div class="goal-percent">${progress(g)}%</div></div><div class="progress"><span style="width:${progress(g)}%"></span></div><div class="section-head" style="margin-top:22px"><div><h3 style="margin:0">Subgoals</h3><p>Smaller outcomes that roll up to this goal.</p></div></div><div class="list">${subgoalRows}</div><div class="form-grid" style="margin-top:14px"><div class="field"><label>New subgoal</label><input id="sgTitle" placeholder="e.g. Finish onboarding"></div><div class="field"><label>Target date</label><input id="sgDate" type="date"></div></div><div style="display:flex;justify-content:flex-end"><button id="mkSG" class="secondary-btn">+ Add subgoal</button></div><div class="section-head" style="margin-top:26px"><div><h3 style="margin:0">Milestones</h3><p>Checkpoints and proof of progress.</p></div></div><div class="list">${milestoneRows}</div><div class="field"><label>Add milestone</label><input id="mTitle"></div><div class="modal-actions"><button id="delGoal" class="danger-btn">Delete goal</button><button class="secondary-btn close-modal">Close</button><button id="mkM" class="primary-btn">Add milestone</button></div>`);$$('.sg-check').forEach(b=>b.onchange=()=>{const s=g.subgoals.find(x=>x.id===b.dataset.id);if(s)s.done=b.checked;save();openGoal(gid)});$$('.sg-del').forEach(b=>b.onclick=()=>{g.subgoals=g.subgoals.filter(x=>x.id!==b.dataset.id);save();openGoal(gid)});$('#mkSG').onclick=()=>{const title=$('#sgTitle').value.trim();if(!title)return;g.subgoals.push({id:id(),title,targetDate:$('#sgDate').value||'',done:false});save();openGoal(gid)};$$('.m-check').forEach(b=>b.onchange=()=>{const m=g.milestones.find(x=>x.id===b.dataset.id);if(m)m.done=b.checked;save();openGoal(gid)});$$('.m-del').forEach(b=>b.onclick=()=>{g.milestones=g.milestones.filter(x=>x.id!==b.dataset.id);save();openGoal(gid)});$('#mkM').onclick=()=>{const title=$('#mTitle').value.trim();if(!title)return;g.milestones.push({id:id(),title,done:false});save();openGoal(gid)};$('#delGoal').onclick=()=>{if(confirm('Delete this goal?')){state.goals=state.goals.filter(x=>x.id!==gid);state.tasks.forEach(t=>{if(t.goalId===gid)t.goalId=null});state.habits.forEach(h=>{if(h.goalId===gid)h.goalId=null});save();close()}}
}
function toast(x){const t=$('#toast');t.textContent=x;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2200)}
$('#todayLabel').textContent=new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});$('#addGoalBtn').onclick=openGoalModal;$('#quickAddBtn').onclick=openTask;$$('.nav-item').forEach(b=>b.onclick=()=>switchView(b.dataset.view));let installPrompt=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#installBtn').classList.remove('hidden')});$('#installBtn').onclick=async()=>{if(installPrompt){installPrompt.prompt();installPrompt=null}};if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));render();initCloud();