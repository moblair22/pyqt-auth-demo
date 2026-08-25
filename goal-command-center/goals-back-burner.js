// Places Back Burner management directly below the Goals list.
(() => {
  const escText = value => typeof esc === 'function' ? esc(String(value ?? '')) : String(value ?? '');
  function persistBackBurner(){
    if (typeof save === 'function') save();
    else if (typeof render === 'function') render();
  }
  function draw(){
    const goalsView=document.querySelector('#goalsView');
    if(!goalsView || typeof state === 'undefined') return;
    goalsView.querySelector('#goalsBackBurner')?.remove();
    goalsView.querySelectorAll('.goal-card').forEach(card=>{
      const goal=(state.goals||[]).find(g=>String(g.id)===String(card.querySelector('.open-goal')?.dataset.id));
      if(goal?.backBurner) card.remove();
    });
    const active=(state.goals||[]).filter(g=>!g.backBurner);
    const parked=(state.goals||[]).filter(g=>g.backBurner);
    const section=document.createElement('section');
    section.id='goalsBackBurner';
    section.innerHTML=`<div class="section-head"><div><h2>Back Burner</h2><p>Pause a goal without deleting it.</p></div></div><div class="card"><div class="list">${parked.length?parked.map(g=>`<div class="task-row"><div class="task-main"><div class="task-title">${escText(g.title||'Untitled goal')}</div><div class="task-sub">${escText(g.category||'Goal')}</div></div><button class="secondary-btn" data-restore-goal="${escText(g.id)}">Bring Back</button></div>`).join(''):'<div class="empty">Nothing is on the Back Burner.</div>'}</div>${active.length?`<div class="field" style="margin-top:16px"><label>Move a goal to Back Burner</label><select id="backBurnerGoal"><option value="">Choose a goal</option>${active.map(g=>`<option value="${escText(g.id)}">${escText(g.title)}</option>`).join('')}</select></div><button id="parkGoalBtn" class="secondary-btn">Move to Back Burner</button>`:''}</div>`;
    goalsView.appendChild(section);
    section.querySelector('#parkGoalBtn')?.addEventListener('click',()=>{
      const id=section.querySelector('#backBurnerGoal')?.value;
      const goal=(state.goals||[]).find(g=>String(g.id)===String(id));
      if(!goal)return;
      goal.backBurner=true; goal.backBurnerAt=new Date().toISOString(); persistBackBurner(); draw();
      if(typeof toast==='function')toast('Goal moved to Back Burner');
    });
    section.querySelectorAll('[data-restore-goal]').forEach(button=>button.addEventListener('click',()=>{
      const goal=(state.goals||[]).find(g=>String(g.id)===String(button.dataset.restoreGoal));
      if(!goal)return;
      goal.backBurner=false; delete goal.backBurnerAt; persistBackBurner(); draw();
      if(typeof toast==='function')toast('Goal brought back');
    }));
  }
  document.addEventListener('click',event=>{if(event.target.closest('[data-view="goals"]'))setTimeout(draw,0)});
  const originalRender=window.render;
  if(typeof originalRender==='function')window.render=function(){originalRender.apply(this,arguments);setTimeout(draw,0)};
  setTimeout(draw,0);
})();