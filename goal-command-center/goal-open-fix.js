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

  function openSafely(goalId){
    const g=(state.goals||[]).find(x=>String(x.id)===String(goalId));
    if(!g){toast('Goal could not be found');return;}
    cleanGoalShape(g);
    saveLocal();
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
    openSafely(btn.dataset.id);
  },true);

  // Normalize existing records once without changing user content.
  (state.goals||[]).forEach(cleanGoalShape);
  saveLocal();
})();
