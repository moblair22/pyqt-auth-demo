// Generic, user-initiated goal import. This file contains no bundled goals or personal data.
(() => {
  function addImportCard(){
    const settings=document.querySelector('#settingsView');
    if(!settings||document.querySelector('#goalImportCard'))return;
    const card=document.createElement('div');
    card.id='goalImportCard';
    card.className='card settings-card';
    card.style.marginTop='18px';
    card.innerHTML=`<div class="kicker">Goal updates</div><h2>Import goal update</h2><p>Import one goal or a goal pack from a JSON file you choose. Nothing is bundled into the public app.</p><label class="secondary-btn">Choose goal update<input id="goalImportInput" type="file" accept="application/json" hidden></label>`;
    settings.appendChild(card);
    card.querySelector('#goalImportInput').onchange=e=>{
      const file=e.target.files?.[0];if(!file)return;
      const reader=new FileReader();
      reader.onload=()=>{try{applyPack(JSON.parse(reader.result))}catch(err){console.error(err);toast('Invalid goal update file')}};
      reader.readAsText(file);
    };
  }

  function normalizeSubgoal(s,existing){
    const end=s.endDate||s.targetDate||'';
    return {id:s.id||existing?.id||id(),title:String(s.title||''),startDate:s.startDate||'',endDate:end,targetDate:end,done:typeof s.done==='boolean'?s.done:!!existing?.done};
  }

  function normalizeMilestone(m,existing){
    return {id:m.id||existing?.id||id(),title:String(m.title||''),done:typeof m.done==='boolean'?m.done:!!existing?.done};
  }

  function applyGoal(g){
    if(!g||!g.title)throw new Error('Invalid goal');
    const titles=new Set([g.title,...(g.matchTitles||[])].filter(Boolean));
    let existing=(state.goals||[]).find(x=>(g.seedKey&&x.seedKey===g.seedKey)||titles.has(x.title));
    if(!existing){
      existing={id:id(),seedKey:g.seedKey||'',title:g.title,category:g.category||'Personal',startDate:'',endDate:'',targetDate:'',why:'',subgoals:[],milestones:[]};
      state.goals.push(existing);
    }
    if(g.title)existing.title=g.title;
    if(g.category)existing.category=g.category;
    if('startDate' in g)existing.startDate=g.startDate||'';
    if('endDate' in g||'targetDate' in g){existing.endDate=g.endDate||g.targetDate||'';existing.targetDate=existing.endDate;}
    if('why' in g)existing.why=g.why||'';
    if(g.seedKey)existing.seedKey=g.seedKey;
    if(Array.isArray(g.subgoals)){
      const old=Array.isArray(existing.subgoals)?existing.subgoals:[];
      existing.subgoals=g.subgoals.map(s=>normalizeSubgoal(s,old.find(x=>x.title===s.title)));
    }
    if(Array.isArray(g.milestones)){
      const old=Array.isArray(existing.milestones)?existing.milestones:[];
      existing.milestones=g.milestones.map(m=>normalizeMilestone(m,old.find(x=>x.title===m.title)));
    }
    return existing;
  }

  function applyPack(pack){
    if(!pack)throw new Error('Invalid goal update');
    let goals=[];
    if(pack.type==='goal-update'&&pack.goal)goals=[pack.goal];
    else if(pack.type==='goal-batch-update'&&Array.isArray(pack.goals))goals=pack.goals;
    else throw new Error('Invalid goal update');
    goals.forEach(applyGoal);
    save();
    if(typeof pushCloud==='function'&&currentUser)pushCloud();
    toast(goals.length===1?'Goal imported':`${goals.length} goals imported`);
    switchView('goals');
  }

  const coreRender=render;
  render=function(){coreRender();addImportCard();};
  render();
})();
