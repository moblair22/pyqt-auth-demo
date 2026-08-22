// Reliable goal-card opening after cloud sync/import/render wrappers.
(() => {
  function cleanGoalShape(g){
    if(!g)return null;
    g.subgoals=Array.isArray(g.subgoals)?g.subgoals:[];
    g.milestones=Array.isArray(g.milestones)?g.milestones:[];
    g.startDate=g.startDate||'';
    g.endDate=g.endDate||g.targetDate||'';
    g.targetDate=g.endDate;
    g.subgoals.forEach(s=>{
      s.startDate=s.startDate||'';
      s.endDate=s.endDate||s.targetDate||'';
      s.targetDate=s.endDate;
      if(typeof s.done!=='boolean')s.done=false;
    });
    g.milestones.forEach(m=>{if(typeof m.done!=='boolean')m.done=false;});
    return g;
  }

  function norm(v){return String(v||'').trim().toLowerCase();}

  function makeUniqueId(reserved){
    let next='';
    do{
      next=typeof id==='function'?id():`goal-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    }while(reserved.has(String(next)));
    reserved.add(String(next));
    return next;
  }

  function repairIds(preferred){
    const goals=Array.isArray(state.goals)?state.goals:[];
    let changed=false;
    const counts=new Map();
    goals.forEach(g=>{
      const key=String(g?.id||'');
      if(key)counts.set(key,(counts.get(key)||0)+1);
    });

    const reserved=new Set(goals.map(g=>String(g?.id||'')).filter(Boolean));

    // If the clicked goal shares an ID with another card, give the clicked
    // record its own ID first so edit/delete/subgoal actions stay attached
    // to the goal the user actually selected.
    if(preferred){
      const key=String(preferred.id||'');
      if(!key||(counts.get(key)||0)>1){
        preferred.id=makeUniqueId(reserved);
        changed=true;
      }
    }

    const used=new Set();
    goals.forEach(g=>{
      cleanGoalShape(g);
      let key=String(g.id||'');
      if(!key||used.has(key)){
        g.id=makeUniqueId(reserved);
        key=String(g.id);
        changed=true;
      }
      used.add(key);

      const subUsed=new Set();
      g.subgoals.forEach(s=>{
        let sid=String(s.id||'');
        if(!sid||subUsed.has(sid)){
          s.id=makeUniqueId(reserved);
          sid=String(s.id);
          changed=true;
        }
        subUsed.add(sid);
      });

      const milestoneUsed=new Set();
      g.milestones.forEach(m=>{
        let mid=String(m.id||'');
        if(!mid||milestoneUsed.has(mid)){
          m.id=makeUniqueId(reserved);
          mid=String(m.id);
          changed=true;
        }
        milestoneUsed.add(mid);
      });
    });
    return changed;
  }

  function resolveClickedGoal(goalId,visibleTitle){
    const goals=Array.isArray(state.goals)?state.goals:[];
    const wantedId=String(goalId||'');
    const wantedTitle=norm(visibleTitle);
    const byId=goals.filter(g=>String(g.id||'')===wantedId);

    if(wantedTitle){
      const exact=byId.find(g=>norm(g.title)===wantedTitle);
      if(exact)return exact;
      const byTitle=goals.filter(g=>norm(g.title)===wantedTitle);
      if(byTitle.length===1)return byTitle[0];
    }
    return byId[0]||null;
  }

  function openSafely(btn){
    const visibleTitle=btn.closest('.goal-card')?.querySelector('.goal-title')?.textContent||'';
    const g=resolveClickedGoal(btn.dataset.id,visibleTitle);
    if(!g){toast('Goal could not be found');return;}

    const changed=repairIds(g);
    cleanGoalShape(g);

    if(changed){
      saveLocal();
      render();
      if(typeof pushCloud==='function'&&currentUser)pushCloud();
    }else{
      saveLocal();
    }

    try{
      openGoal(g.id);
    }catch(err){
      console.error('Open goal failed',err,g);
      toast('Goal viewer refreshed. Try again.');
      render();
    }
  }

  // Event delegation survives every render and cloud refresh.
  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('.open-goal');
    if(!btn)return;
    e.preventDefault();
    e.stopPropagation();
    openSafely(btn);
  },true);

  // Normalize any records already present. Cloud-loaded records are also
  // repaired on the first click after sync.
  (state.goals||[]).forEach(cleanGoalShape);
  repairIds(null);
  saveLocal();
})();
