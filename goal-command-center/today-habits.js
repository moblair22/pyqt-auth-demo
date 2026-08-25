// Shows habits scheduled for the current date inside the Today tab.
(() => {
  function drawTodayHabits(){
    const view=document.querySelector('#todayView');
    if(!view||typeof state==='undefined'||typeof habitScheduled!=='function')return;
    view.querySelector('#todayScheduledHabits')?.remove();
    const key=iso();
    const scheduled=(state.habits||[]).filter(h=>habitScheduled(h,key));
    const done=scheduled.filter(h=>habitDone(h,key)).length;
    const section=document.createElement('section');
    section.id='todayScheduledHabits';
    section.innerHTML=`<div class="section-head"><div><h2>Scheduled habits</h2><p>${done}/${scheduled.length} completed today</p></div><button id="todayNewHabit" class="secondary-btn">+ New habit</button></div><div class="card"><div class="list">${scheduled.length?scheduled.map(h=>{const complete=habitDone(h,key),goal=typeof habitGoal==='function'?habitGoal(h):null;return `<label class="task-row"><input type="checkbox" data-today-habit="${esc(h.id)}" ${complete?'checked':''}><div class="task-main"><div class="task-title ${complete?'done':''}">${esc(h.title)}</div><div class="task-sub">${esc(goal?.title||habitScheduleText(h))}</div></div></label>`}).join(''):'<div class="empty">No habits are scheduled for today.</div>'}</div></div>`;
    view.appendChild(section);
    section.querySelectorAll('[data-today-habit]').forEach(box=>box.addEventListener('change',()=>{
      const habit=(state.habits||[]).find(h=>String(h.id)===String(box.dataset.todayHabit));
      if(!habit)return;
      habit.days=habit.days||[];
      habit.days=box.checked?[...new Set([...habit.days,key])]:habit.days.filter(day=>day!==key);
      save();
      if(typeof toast==='function')toast(box.checked?'Habit completed':'Habit marked incomplete');
    }));
    section.querySelector('#todayNewHabit')?.addEventListener('click',()=>{if(typeof openHabit==='function')openHabit()});
  }
  document.addEventListener('click',event=>{if(event.target.closest('[data-view="today"]'))setTimeout(drawTodayHabits,0)});
  const previousRender=window.render;
  if(typeof previousRender==='function')window.render=function(){previousRender.apply(this,arguments);setTimeout(drawTodayHabits,0)};
  setTimeout(drawTodayHabits,0);
})();