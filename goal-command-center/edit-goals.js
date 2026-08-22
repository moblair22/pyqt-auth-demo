// Goal and subgoal editing extension with start/end calendar dates.
(() => {
  const categoryOptions=['Personal','Business','Money','Health','Career','Learning','Relationships'];

  function migrateDates(){
    (state.goals||[]).forEach(g=>{
      g.startDate=g.startDate||'';
      g.endDate=g.endDate||g.targetDate||'';
      g.targetDate=g.endDate;
      (g.subgoals||[]).forEach(s=>{
        s.startDate=s.startDate||'';
        s.endDate=s.endDate||s.targetDate||'';
        s.targetDate=s.endDate;
      });
    });
  }

  function optionList(selected){
    const values=[...categoryOptions];
    if(selected && !values.includes(selected)) values.push(selected);
    return values.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('');
  }

  function dateRange(start,end){
    if(start&&end)return `${fmt(start)} → ${fmt(end)}`;
    if(start)return `Starts ${fmt(start)}`;
    if(end)return `Ends ${fmt(end)}`;
    return 'No dates set';
  }

  function validateRange(start,end){
    if(start&&end&&end<start){toast('End date must be on or after start date');return false}
    return true;
  }

  function makeCalendarFriendly(){
    if(document.querySelector('#calendarPickerStyle'))return;
    const s=document.createElement('style');s.id='calendarPickerStyle';
    s.textContent=`input[type="date"]{color-scheme:dark;cursor:pointer}input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;opacity:.9}.date-hint{font-size:12px;opacity:.68;margin-top:5px}`;
    document.head.appendChild(s);
    document.addEventListener('click',e=>{
      if(e.target?.matches?.('input[type="date"]')&&typeof e.target.showPicker==='function'){
        try{e.target.showPicker()}catch(_){ }
      }
    });
  }

  migrateDates();makeCalendarFriendly();saveLocal();

  // Override new-goal form so all newly created goals use start/end dates.
  openGoalModal=function(){
    modal(`<h2>Create a goal</h2>
      <div class="field"><label>Goal</label><input id="gTitle" placeholder="What do you want to accomplish?"></div>
      <div class="field"><label>Category</label><select id="gCat">${optionList('Personal')}</select></div>
      <div class="form-grid">
        <div class="field"><label>Start date</label><input id="gStartDate" type="date"><div class="date-hint">Click to choose from the calendar.</div></div>
        <div class="field"><label>End date</label><input id="gEndDate" type="date" value="${addDays(30)}"><div class="date-hint">Click to choose from the calendar.</div></div>
      </div>
      <div class="field"><label>Why does it matter?</label><textarea id="gWhy"></textarea></div>
      <div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="mkGoal" class="primary-btn">Create goal</button></div>`);
    $('#mkGoal').onclick=()=>{
      const title=$('#gTitle').value.trim(),start=$('#gStartDate').value,end=$('#gEndDate').value;
      if(!title)return toast('Enter a goal title');
      if(!validateRange(start,end))return;
      state.goals.unshift({id:id(),title,category:$('#gCat').value,startDate:start,endDate:end,targetDate:end,why:$('#gWhy').value.trim(),subgoals:[],milestones:[]});
      save();close();switchView('goals');
    };
  };
  $('#addGoalBtn').onclick=openGoalModal;

  function editGoal(gid){
    migrateDates();
    const g=state.goals.find(x=>x.id===gid);if(!g)return;
    modal(`<h2>Edit goal</h2>
      <div class="field"><label>Goal</label><input id="editGoalTitle" value="${esc(g.title||'')}"></div>
      <div class="field"><label>Category</label><select id="editGoalCategory">${optionList(g.category||'Personal')}</select></div>
      <div class="form-grid">
        <div class="field"><label>Start date</label><input id="editGoalStart" type="date" value="${esc(g.startDate||'')}"><div class="date-hint">Click to choose from the calendar.</div></div>
        <div class="field"><label>End date</label><input id="editGoalEnd" type="date" value="${esc(g.endDate||g.targetDate||'')}"><div class="date-hint">Click to choose from the calendar.</div></div>
      </div>
      <div class="field"><label>Why does it matter?</label><textarea id="editGoalWhy">${esc(g.why||'')}</textarea></div>
      <div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="saveGoalEdit" class="primary-btn">Save changes</button></div>`);
    $('#saveGoalEdit').onclick=()=>{
      const title=$('#editGoalTitle').value.trim(),start=$('#editGoalStart').value,end=$('#editGoalEnd').value;
      if(!title)return toast('Enter a goal title');
      if(!validateRange(start,end))return;
      g.title=title;g.category=$('#editGoalCategory').value;g.startDate=start;g.endDate=end;g.targetDate=end;g.why=$('#editGoalWhy').value.trim();
      save();close();openGoal(gid);toast('Goal updated');
    };
  }

  function editSubgoal(gid,sid){
    migrateDates();
    const g=state.goals.find(x=>x.id===gid);if(!g)return;
    const s=(g.subgoals||[]).find(x=>x.id===sid);if(!s)return;
    modal(`<h2>Edit subgoal</h2>
      <div class="field"><label>Subgoal</label><input id="editSubgoalTitle" value="${esc(s.title||'')}"></div>
      <div class="form-grid">
        <div class="field"><label>Start date</label><input id="editSubgoalStart" type="date" value="${esc(s.startDate||'')}"><div class="date-hint">Click to choose from the calendar.</div></div>
        <div class="field"><label>End date</label><input id="editSubgoalEnd" type="date" value="${esc(s.endDate||s.targetDate||'')}"><div class="date-hint">Click to choose from the calendar.</div></div>
      </div>
      <div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="saveSubgoalEdit" class="primary-btn">Save changes</button></div>`);
    $('#saveSubgoalEdit').onclick=()=>{
      const title=$('#editSubgoalTitle').value.trim(),start=$('#editSubgoalStart').value,end=$('#editSubgoalEnd').value;
      if(!title)return toast('Enter a subgoal title');
      if(!validateRange(start,end))return;
      s.title=title;s.startDate=start;s.endDate=end;s.targetDate=end;
      save();close();openGoal(gid);toast('Subgoal updated');
    };
  }

  // Update cards to show a full date range instead of only a target date.
  card=function(g){
    g.startDate=g.startDate||'';g.endDate=g.endDate||g.targetDate||'';g.targetDate=g.endDate;
    const p=progress(g),mc=(g.milestones||[]).filter(x=>x.done).length,sc=(g.subgoals||[]).filter(x=>x.done).length;
    return `<article class="card goal-card"><div class="goal-top"><div><div class="badge">${esc(g.category)}</div><h3 class="goal-title" style="margin-top:10px">${esc(g.title)}</h3><div class="goal-meta">${esc(dateRange(g.startDate,g.endDate))}</div></div><div class="goal-percent">${p}%</div></div><div class="progress"><span style="width:${p}%"></span></div><div class="goal-footer"><span>${sc}/${(g.subgoals||[]).length} subgoals · ${mc}/${(g.milestones||[]).length} milestones</span><button class="link-btn open-goal" data-id="${g.id}">Open goal</button></div></article>`;
  };

  openGoal=function(gid){
    migrateDates();
    const g=state.goals.find(x=>x.id===gid);if(!g)return;
    g.subgoals=g.subgoals||[];g.milestones=g.milestones||[];
    const subgoalRows=g.subgoals.map(s=>`<div class="task-row" style="padding-left:8px"><input class="sg-check" data-id="${s.id}" type="checkbox" ${s.done?'checked':''}><div class="task-main"><div class="task-title ${s.done?'done':''}">${esc(s.title)}</div><div class="task-sub">${esc(dateRange(s.startDate||'',s.endDate||s.targetDate||''))}</div></div><button class="icon-btn sg-edit" data-id="${s.id}" title="Edit subgoal">✎</button><button class="icon-btn sg-del" data-id="${s.id}" title="Delete subgoal">×</button></div>`).join('')||'<div class="empty">No subgoals yet.</div>';
    const milestoneRows=g.milestones.map(m=>`<div class="task-row"><input class="m-check" data-id="${m.id}" type="checkbox" ${m.done?'checked':''}><div class="task-main"><div class="task-title ${m.done?'done':''}">${esc(m.title)}</div></div><button class="icon-btn m-del" data-id="${m.id}">×</button></div>`).join('')||'<div class="empty">No milestones yet.</div>';

    modal(`<div class="goal-top"><div><div class="badge">${esc(g.category)}</div><h2>${esc(g.title)}</h2><div class="goal-meta" style="margin:6px 0 8px">${esc(dateRange(g.startDate,g.endDate))}</div><p>${esc(g.why||'')}</p><button id="editGoalBtn" class="link-btn" style="margin-top:8px">Edit goal</button></div><div class="goal-percent">${progress(g)}%</div></div><div class="progress"><span style="width:${progress(g)}%"></span></div>
      <div class="section-head" style="margin-top:22px"><div><h3 style="margin:0">Subgoals</h3><p>Smaller outcomes that roll up to this goal.</p></div></div><div class="list">${subgoalRows}</div>
      <div class="field" style="margin-top:14px"><label>New subgoal</label><input id="sgTitle" placeholder="e.g. Finish onboarding"></div>
      <div class="form-grid"><div class="field"><label>Start date</label><input id="sgStartDate" type="date"></div><div class="field"><label>End date</label><input id="sgEndDate" type="date"></div></div>
      <div style="display:flex;justify-content:flex-end"><button id="mkSG" class="secondary-btn">+ Add subgoal</button></div>
      <div class="section-head" style="margin-top:26px"><div><h3 style="margin:0">Milestones</h3><p>Checkpoints and proof of progress.</p></div></div><div class="list">${milestoneRows}</div><div class="field"><label>Add milestone</label><input id="mTitle"></div>
      <div class="modal-actions"><button id="delGoal" class="danger-btn">Delete goal</button><button class="secondary-btn close-modal">Close</button><button id="mkM" class="primary-btn">Add milestone</button></div>`);

    $('#editGoalBtn').onclick=()=>editGoal(gid);
    $$('.sg-edit').forEach(b=>b.onclick=()=>editSubgoal(gid,b.dataset.id));
    $$('.sg-check').forEach(b=>b.onchange=()=>{const s=g.subgoals.find(x=>x.id===b.dataset.id);if(s)s.done=b.checked;save();openGoal(gid)});
    $$('.sg-del').forEach(b=>b.onclick=()=>{g.subgoals=g.subgoals.filter(x=>x.id!==b.dataset.id);save();openGoal(gid)});
    $('#mkSG').onclick=()=>{
      const title=$('#sgTitle').value.trim(),start=$('#sgStartDate').value,end=$('#sgEndDate').value;
      if(!title)return toast('Enter a subgoal title');
      if(!validateRange(start,end))return;
      g.subgoals.push({id:id(),title,startDate:start,endDate:end,targetDate:end,done:false});save();openGoal(gid);
    };
    $$('.m-check').forEach(b=>b.onchange=()=>{const m=g.milestones.find(x=>x.id===b.dataset.id);if(m)m.done=b.checked;save();openGoal(gid)});
    $$('.m-del').forEach(b=>b.onclick=()=>{g.milestones=g.milestones.filter(x=>x.id!==b.dataset.id);save();openGoal(gid)});
    $('#mkM').onclick=()=>{const title=$('#mTitle').value.trim();if(!title)return;g.milestones.push({id:id(),title,done:false});save();openGoal(gid)};
    $('#delGoal').onclick=()=>{if(confirm('Delete this goal?')){state.goals=state.goals.filter(x=>x.id!==gid);state.tasks.forEach(t=>{if(t.goalId===gid)t.goalId=null});save();close()}};
  };

  // Re-render once so existing cards immediately show date ranges.
  render();
})();
