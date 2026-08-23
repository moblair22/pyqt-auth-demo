// Unified recurring-task controls for Quick action and Goal task screens.
// Keeps weekday buttons (Sun-Sat) alongside Weekly / Biweekly / Monthly options.
// Uses direct event handlers only: no render/switchView wrappers, observers, or timers.
(() => {
  const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const pad=n=>String(n).padStart(2,'0');
  const localKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parseKey=key=>{const[y,m,d]=String(key||'').split('-').map(Number);return new Date(y,m-1,d)};
  const addDays=(key,n)=>{const d=parseKey(key);d.setDate(d.getDate()+n);return localKey(d)};
  const daysBetween=(a,b)=>Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000);
  const sameId=(a,b)=>String(a??'')===String(b??'');

  function ensureStyle(){
    if(document.querySelector('#taskRepeatAllStyle'))return;
    const style=document.createElement('style');
    style.id='taskRepeatAllStyle';
    style.textContent=`
      .tra-repeat-box{margin-top:10px;padding:13px;border:1px solid var(--line);border-radius:13px;background:var(--panel2)}
      .tra-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:8px}
      .tra-day{position:relative;display:block}.tra-day input{position:absolute;opacity:0}
      .tra-day span{display:grid;place-items:center;min-height:40px;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--muted);font-size:11px;font-weight:800;cursor:pointer}
      .tra-day input:checked+span{background:var(--accent);border-color:var(--accent);color:#06120e}
      .tra-day input:focus-visible+span{outline:2px solid var(--accent2);outline-offset:2px}
      .tra-help{font-size:12px;color:var(--muted);line-height:1.45;margin-top:8px}
      @media(max-width:650px){.tra-days{gap:4px}.tra-day span{min-height:38px;font-size:9px}}
    `;
    document.head.appendChild(style);
  }

  function goalOptions(selected=''){
    return `<option value="">Quick action</option>${(state.goals||[]).map(g=>`<option value="${esc(g.id)}" ${sameId(g.id,selected)?'selected':''}>${esc(g.title)}</option>`).join('')}`;
  }

  function dayPicker(selected=[]){
    const set=new Set((selected||[]).map(Number));
    return `<div class="tra-days">${weekdays.map((name,i)=>`<label class="tra-day"><input type="checkbox" class="tra-repeat-day" value="${i}" ${set.has(i)?'checked':''}><span>${name}</span></label>`).join('')}</div>`;
  }

  function selectedDays(){
    return [...document.querySelectorAll('.tra-repeat-day:checked')].map(x=>Number(x.value)).filter(n=>n>=0&&n<=6).sort((a,b)=>a-b);
  }

  function makeOccurrences({seriesId,title,goalId,start,end,frequency,days}){
    const startD=parseKey(start),endD=parseKey(end);
    if(Number.isNaN(startD.getTime())||Number.isNaN(endD.getTime()))return[];
    const span=daysBetween(startD,endD);
    if(span<0)return[];
    if(span>730){toast('Recurring task range can be up to 2 years');return[];}
    const out=[];

    if(frequency==='monthly'){
      const anchor=startD.getDate();
      for(let cursor=new Date(startD.getFullYear(),startD.getMonth(),1),guard=0;cursor<=endD&&guard<30;cursor.setMonth(cursor.getMonth()+1),guard++){
        const last=new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate();
        const d=new Date(cursor.getFullYear(),cursor.getMonth(),Math.min(anchor,last));
        if(d<startD||d>endD)continue;
        const date=localKey(d);
        out.push({id:id(),seriesId,title,goalId:goalId||null,date,done:false,recurrenceType:'monthly',recurrenceStart:start,recurrenceEnd:end,recurrenceDays:[...days]});
      }
      return out;
    }

    const wanted=new Set(days.map(Number));
    for(let d=new Date(startD),guard=0;d<=endD&&guard<=732;d.setDate(d.getDate()+1),guard++){
      if(!wanted.has(d.getDay()))continue;
      if(frequency==='biweekly'&&Math.floor(daysBetween(startD,d)/7)%2!==0)continue;
      const date=localKey(d);
      out.push({id:id(),seriesId,title,goalId:goalId||null,date,done:false,recurrenceType:frequency,recurrenceStart:start,recurrenceEnd:end,recurrenceDays:[...days]});
    }
    return out;
  }

  function frequencyHelp(frequency){
    if(frequency==='weekly')return'Weekly: repeats every week on the selected weekday(s).';
    if(frequency==='biweekly')return'Biweekly: repeats every 2 weeks on the selected weekday(s), anchored to the first date.';
    if(frequency==='monthly')return'Monthly: repeats on the same calendar date as the first date. The weekday buttons stay visible so you can keep your day selections if you switch frequency.';
    return'';
  }

  function openTaskForm({goalId=null,returnToGoal=false}={}){
    ensureStyle();
    const today=localKey(new Date());
    const end=addDays(today,90);
    const weekday=parseKey(today).getDay();
    const goal=(state.goals||[]).find(g=>sameId(g.id,goalId));

    modal(`${goal?`<div class="kicker">${esc(goal.title)}</div>`:''}<h2>Add task</h2>
      <div class="field"><label>Task</label><input id="traTitle" placeholder="What needs to get done?"></div>
      ${goal?`<input id="traGoal" type="hidden" value="${esc(goal.id)}">`:`<div class="field"><label>Goal</label><select id="traGoal">${goalOptions()}</select></div>`}
      <div class="field"><label>Date / first date</label><input id="traStart" type="date" value="${today}"></div>
      <div class="field"><label>Repeat</label><select id="traFrequency"><option value="none">Does not repeat</option><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option></select></div>
      <div id="traRepeatBox" class="tra-repeat-box hidden">
        <div class="field"><label>End date</label><input id="traEnd" type="date" value="${end}"></div>
        <div class="field"><label>Repeat on</label>${dayPicker([weekday])}</div>
        <div id="traHelp" class="tra-help"></div>
      </div>
      <div class="modal-actions"><button type="button" class="secondary-btn close-modal">Cancel</button><button type="button" id="traSave" class="primary-btn">Add task</button></div>`);

    const frequency=document.querySelector('#traFrequency');
    const repeatBox=document.querySelector('#traRepeatBox');
    const help=document.querySelector('#traHelp');
    const startInput=document.querySelector('#traStart');

    const sync=()=>{
      const f=frequency.value;
      repeatBox.classList.toggle('hidden',f==='none');
      help.textContent=frequencyHelp(f);
    };
    frequency.onchange=sync;
    startInput.onchange=()=>{
      const d=parseKey(startInput.value);
      if(Number.isNaN(d.getTime()))return;
      document.querySelectorAll('.tra-repeat-day').forEach(x=>x.checked=Number(x.value)===d.getDay());
    };
    sync();

    document.querySelector('#traSave').onclick=()=>{
      const title=document.querySelector('#traTitle').value.trim();
      const selectedGoal=document.querySelector('#traGoal')?.value||null;
      const start=startInput.value;
      const f=frequency.value;
      if(!title)return toast('Enter a task');
      if(!start)return toast('Choose a date');
      state.tasks=Array.isArray(state.tasks)?state.tasks:[];

      if(f==='none'){
        state.tasks.unshift({id:id(),goalId:selectedGoal||null,title,date:start,done:false});
        save();
        if(returnToGoal&&selectedGoal)openGoal(selectedGoal);else close();
        toast('Task added');
        return;
      }

      const endDate=document.querySelector('#traEnd').value;
      const days=selectedDays();
      if(!endDate)return toast('Choose an end date');
      if(endDate<start)return toast('End date must be on or after first date');
      if((f==='weekly'||f==='biweekly')&&!days.length)return toast('Choose at least one weekday');
      const occurrences=makeOccurrences({seriesId:id(),title,goalId:selectedGoal,start,end:endDate,frequency:f,days});
      if(!occurrences.length)return toast('No dates matched that recurring schedule');
      state.tasks.push(...occurrences);
      save();
      if(returnToGoal&&selectedGoal)openGoal(selectedGoal);else close();
      toast(`${occurrences.length} recurring tasks added`);
    };
  }

  function bindQuickAction(){
    const btn=document.querySelector('#quickAddBtn');
    if(btn)btn.onclick=()=>openTaskForm();
  }

  const baseOpenGoal=window.openGoal;
  if(typeof baseOpenGoal==='function'){
    window.openGoal=function(gid){
      baseOpenGoal(gid);
      const old=document.querySelector('#goalAddTask');
      if(!old)return;
      const clean=old.cloneNode(true);
      old.replaceWith(clean);
      clean.addEventListener('click',()=>openTaskForm({goalId:gid,returnToGoal:true}));
    };
  }

  // Calendar already has weekly / biweekly / monthly and weekday controls.
  // Keep the weekday row visible even when Monthly is selected so all add-task screens stay consistent.
  function keepCalendarWeekdaysVisible(){
    document.querySelector('#calWeekdayFields')?.classList.remove('hidden');
    document.querySelector('#calSeriesWeekdayFields')?.classList.remove('hidden');
  }
  document.addEventListener('change',e=>{
    if(e.target?.matches?.('#calFrequency,#calSeriesFrequency'))keepCalendarWeekdaysVisible();
  });
  document.addEventListener('click',()=>keepCalendarWeekdaysVisible());

  bindQuickAction();
})();
