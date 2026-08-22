// Ensure every rendered subgoal row uses its own saved title and schedule.
(() => {
  function fmtDate(value){
    if(!value)return '';
    try{return new Date(value+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});}catch{return value;}
  }

  function findSubgoal(id){
    for(const g of (state?.goals||[])){
      const s=(g.subgoals||[]).find(x=>String(x.id)===String(id));
      if(s)return s;
    }
    return null;
  }

  function repairRows(root=document){
    const rows=[...root.querySelectorAll?.('.sg-check')||[]];
    rows.forEach((check,index)=>{
      const s=findSubgoal(check.dataset.id);
      const row=check.closest('.task-row');
      if(!s||!row)return;

      const title=row.querySelector('.task-title');
      if(title)title.textContent=String(s.title||`Subgoal ${index+1}`);

      let number=row.querySelector('.subgoal-number');
      if(!number&&title){
        number=document.createElement('div');
        number.className='subgoal-number';
        number.textContent=`Subgoal ${index+1}`;
        title.before(number);
      }else if(number){
        number.textContent=`Subgoal ${index+1}`;
      }

      const meta=row.querySelector('.task-sub');
      if(meta){
        const start=s.startDate||'';
        const end=s.endDate||s.targetDate||'';
        if(start&&end)meta.textContent=`Schedule: ${fmtDate(start)} → ${fmtDate(end)}`;
        else if(end)meta.textContent=`Due: ${fmtDate(end)}`;
        else if(start)meta.textContent=`Starts: ${fmtDate(start)}`;
        else meta.textContent='';
        meta.style.display=meta.textContent?'block':'none';
      }
    });
  }

  if(!document.querySelector('#subgoalViewFixStyle')){
    const style=document.createElement('style');
    style.id='subgoalViewFixStyle';
    style.textContent='.subgoal-number{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:var(--accent2);font-weight:800;margin-bottom:3px}.task-title{white-space:normal;overflow-wrap:anywhere}';
    document.head.appendChild(style);
  }

  repairRows();
  const observer=new MutationObserver(()=>repairRows(document));
  observer.observe(document.body,{childList:true,subtree:true});
})();
