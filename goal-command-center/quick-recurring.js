// Recurring-task controls for the main Quick action button.
// Uses direct event handlers only: no render wrappers, observers, or timers.
(() => {
  const btn = document.querySelector('#quickAddBtn');
  if (!btn) return;

  const pad = n => String(n).padStart(2,'0');
  const localKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parseKey = key => {
    const [y,m,d] = String(key || '').split('-').map(Number);
    return new Date(y,m-1,d);
  };
  const addDays = (key,n) => {
    const d=parseKey(key); d.setDate(d.getDate()+n); return localKey(d);
  };
  const daysBetween = (a,b) => Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000);
  const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function ensureStyle(){
    if(document.querySelector('#quickRecurringStyle'))return;
    const style=document.createElement('style');
    style.id='quickRecurringStyle';
    style.textContent=`
      .qr-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin-top:8px}
      .qr-day{position:relative;display:block}.qr-day input{position:absolute;opacity:0}
      .qr-day span{display:grid;place-items:center;min-height:40px;border:1px solid var(--line);border-radius:10px;background:var(--panel2);color:var(--muted);font-size:11px;font-weight:800;cursor:pointer}
      .qr-day input:checked+span{background:var(--accent);border-color:var(--accent);color:#06120e}
      .qr-help{font-size:12px;color:var(--muted);line-height:1.45;margin-top:8px}
      @media(max-width:650px){.qr-days{gap:4px}.qr-day span{min-height:38px;font-size:9px}}
    `;
    document.head.appendChild(style);
  }

  function goalOptions(){
    return `<option value="">Quick action</option>${(state.goals||[]).map(g=>`<option value="${esc(g.id)}">${esc(g.title)}</option>`).join('')}`;
  }

  function dayPicker(selected){
    const set=new Set(selected||[]);
    return `<div class="qr-days">${weekdays.map((name,i)=>`<label class="qr-day"><input type="checkbox" class="qr-repeat-day" value="${i}" ${set.has(i)?'checked':''}><span>${name}</span></label>`).join('')}</div>`;
  }

  function selectedDays(){
    return [...document.querySelectorAll('.qr-repeat-day:checked')].map(x=>Number(x.value)).filter(n=>n>=0&&n<=6).sort((a,b)=>a-b);
  }

  function makeOccurrences({seriesId,title,goalId,start,end,frequency,days}){
    const startD=parseKey(start),endD=parseKey(end);
    if(Number.isNaN(startD.getTime())||Number.isNaN(endD.getTime()))return [];
    const span=daysBetween(startD,endD);
    if(span<0)return [];
    if(span>730){toast('Recurring task range can be up to 2 years');return [];}
    const out=[];

    if(frequency==='monthly'){
      const anchor=startD.getDate();
      for(let cursor=new Date(startD.getFullYear(),startD.getMonth(),1),guard=0;cursor<=endD&&guard<30;cursor.setMonth(cursor.getMonth()+1),guard++){
        const last=new Date(cursor.getFullYear(),cursor.getMonth()+1,0).getDate();
        const d=new Date(cursor.getFullYear(),cursor.getMonth(),Math.min(anchor,last));
        if(d<startD||d>endD)continue;
        const date=localKey(d);
        out.push({id:id(),seriesId,title,goalId:goalId||null,date,done:false,recurrenceType:'monthly',recurrenceStart:start,recurrenceEnd:end,recurrenceDays:[]});
      }
      return out;
    }

    const wanted=new Set(days);
    for(let d=new Date(startD),guard=0;d<=endD&&guard<=732;d.setDate(d.getDate()+1),guard++){
      if(!wanted.has(d.getDay()))continue;
      if(frequency==='biweekly'&&Math.floor(daysBetween(startD,d)/7)%2!==0)continue;
      const date=localKey(d);
      out.push({id:id(),seriesId,title,goalId:goalId||null,date,done:false,recurrenceType:frequency,recurrenceStart:start,recurrenceEnd:end,recurrenceDays:[...days]});
    }
    return out;
  }

  function openQuickTask(){
    ensureStyle();
    const today=localKey(new Date());
    const end=addDays(today,90);
    const weekday=parseKey(today).getDay();
    modal(`<h2>Add task</h2>
      <div class="field"><label>Action</label><input id="qrTitle" placeholder="What needs to get done?"></div>
      <div class="field"><label>Goal</label><select id="qrGoal">${goalOptions()}</select></div>
      <div class="field"><label>Repeat</label><select id="qrFrequency"><option value="none">Does not repeat</option><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option></select></div>
      <div class="field"><label>Date / first date</label><input id="qrStart" type="date" value="${today}"></div>
      <div id="qrRecurringFields" class="hidden">
        <div class="field"><label>End date</label><input id="qrEnd" type="date" value="${end}"></div>
        <div id="qrWeekdayWrap" class="field"><label>Repeat on</label>${dayPicker([weekday])}</div>
        <div id="qrHelp" class="qr-help"></div>
      </div>
      <div class="modal-actions"><button type="button" class="secondary-btn close-modal">Cancel</button><button type="button" id="qrSave" class="primary-btn">Add task</button></div>`);

    const freq=document.querySelector('#qrFrequency');
    const recurringFields=document.querySelector('#qrRecurringFields');
    const weekdayWrap=document.querySelector('#qrWeekdayWrap');
    const help=document.querySelector('#qrHelp');
    const sync=()=>{
      const f=freq.value;
      recurringFields.classList.toggle('hidden',f==='none');
      weekdayWrap.classList.toggle('hidden',f==='monthly');
      help.textContent=f==='weekly'?'Repeats every week on the selected weekday(s).':f==='biweekly'?'Repeats every 2 weeks on the selected weekday(s).':f==='monthly'?'Repeats monthly on the day of the first date. Shorter months use their last day.':'';
    };
    freq.onchange=sync; sync();

    document.querySelector('#qrSave').onclick=()=>{
      const title=document.querySelector('#qrTitle').value.trim();
      const goalId=document.querySelector('#qrGoal').value||null;
      const frequency=freq.value;
      const start=document.querySelector('#qrStart').value;
      if(!title)return toast('Enter a task');
      if(!start)return toast('Choose a date');
      state.tasks=Array.isArray(state.tasks)?state.tasks:[];

      if(frequency==='none'){
        state.tasks.unshift({id:id(),goalId,title,date:start,done:false});
        save(); close(); toast('Task added'); return;
      }

      const end=document.querySelector('#qrEnd').value;
      const days=frequency==='monthly'?[]:selectedDays();
      if(!end)return toast('Choose an end date');
      if(end<start)return toast('End date must be on or after first date');
      if(frequency!=='monthly'&&!days.length)return toast('Choose at least one weekday');
      const occurrences=makeOccurrences({seriesId:id(),title,goalId,start,end,frequency,days});
      if(!occurrences.length)return toast('No dates matched that recurring schedule');
      state.tasks.push(...occurrences);
      save(); close(); toast(`${occurrences.length} recurring tasks added`);
    };
  }

  btn.onclick=openQuickTask;
})();
