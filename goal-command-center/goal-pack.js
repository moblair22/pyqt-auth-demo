(() => {
  function addImportCard(){
    const settings=document.querySelector('#settingsView');
    if(!settings||document.querySelector('#goalPackImportCard'))return;
    const card=document.createElement('div');
    card.id='goalPackImportCard';
    card.className='card settings-card';
    card.style.marginTop='18px';
    card.innerHTML=`<div class="kicker">Goal updates</div><h2>Import goal update</h2><p>Merge an update into one of your existing goals without replacing your other goals, habits, tasks, or check-ins.</p><label class="secondary-btn">Choose goal update<input id="goalPackInput" type="file" accept="application/json" hidden></label>`;
    settings.appendChild(card);
    card.querySelector('#goalPackInput').onchange=e=>{
      const file=e.target.files?.[0];if(!file)return;
      const reader=new FileReader();
      reader.onload=()=>{try{applyPack(JSON.parse(reader.result))}catch(err){console.error(err);toast('Invalid goal update file')}};
      reader.readAsText(file);
    };
  }

  function normalizeSubgoal(s){
    return {
      id:s.id||id(),
      title:String(s.title||''),
      targetDate:s.targetDate||'',
      done:!!s.done
    };
  }

  function applyPack(pack){
    if(!pack||pack.type!=='goal-update'||!pack.goal)throw new Error('Invalid goal update');
    const g=pack.goal;
    const titles=new Set([g.title,...(g.matchTitles||[])].filter(Boolean));
    let existing=(state.goals||[]).find(x=>(g.seedKey&&x.seedKey===g.seedKey)||titles.has(x.title));

    if(!existing){
      existing={id:id(),seedKey:g.seedKey||'',title:g.title||'New goal',category:g.category||'Personal',targetDate:g.targetDate||'',why:g.why||'',subgoals:[],milestones:[]};
      state.goals.push(existing);
    }

    if(g.title)existing.title=g.title;
    if(g.category)existing.category=g.category;
    if('targetDate' in g)existing.targetDate=g.targetDate||'';
    if('why' in g)existing.why=g.why||'';
    if(g.seedKey)existing.seedKey=g.seedKey;
    if(Array.isArray(g.subgoals))existing.subgoals=g.subgoals.map(normalizeSubgoal);
    if(Array.isArray(g.milestones))existing.milestones=g.milestones.map(m=>({id:m.id||id(),title:String(m.title||''),done:!!m.done}));

    save();
    if(typeof pushCloud==='function'&&currentUser)pushCloud();
    toast('Goal updated');
    switchView('goals');
  }

  const coreRender=render;
  render=function(){coreRender();addImportCard();};
  addImportCard();
})();
