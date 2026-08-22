// Goal and subgoal editing extension.
(() => {
  const categoryOptions=['Personal','Business','Money','Health','Career','Learning','Relationships'];

  function optionList(selected){
    const values=[...categoryOptions];
    if(selected && !values.includes(selected)) values.push(selected);
    return values.map(v=>`<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`).join('');
  }

  function editGoal(gid){
    const g=state.goals.find(x=>x.id===gid);if(!g)return;
    modal(`<h2>Edit goal</h2>
      <div class="field"><label>Goal</label><input id="editGoalTitle" value="${esc(g.title||'')}"></div>
      <div class="form-grid">
        <div class="field"><label>Category</label><select id="editGoalCategory">${optionList(g.category||'Personal')}</select></div>
        <div class="field"><label>Target date</label><input id="editGoalDate" type="date" value="${esc(g.targetDate||'')}"></div>
      </div>
      <div class="field"><label>Why does it matter?</label><textarea id="editGoalWhy">${esc(g.why||'')}</textarea></div>
      <div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="saveGoalEdit" class="primary-btn">Save changes</button></div>`);
    $('#saveGoalEdit').onclick=()=>{
      const title=$('#editGoalTitle').value.trim();if(!title)return toast('Enter a goal title');
      g.title=title;
      g.category=$('#editGoalCategory').value;
      g.targetDate=$('#editGoalDate').value;
      g.why=$('#editGoalWhy').value.trim();
      save();close();openGoal(gid);toast('Goal updated');
    };
  }

  function editSubgoal(gid,sid){
    const g=state.goals.find(x=>x.id===gid);if(!g)return;
    const s=(g.subgoals||[]).find(x=>x.id===sid);if(!s)return;
    modal(`<h2>Edit subgoal</h2>
      <div class="field"><label>Subgoal</label><input id="editSubgoalTitle" value="${esc(s.title||'')}"></div>
      <div class="field"><label>Target date</label><input id="editSubgoalDate" type="date" value="${esc(s.targetDate||'')}"></div>
      <div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="saveSubgoalEdit" class="primary-btn">Save changes</button></div>`);
    $('#saveSubgoalEdit').onclick=()=>{
      const title=$('#editSubgoalTitle').value.trim();if(!title)return toast('Enter a subgoal title');
      s.title=title;s.targetDate=$('#editSubgoalDate').value;
      save();close();openGoal(gid);toast('Subgoal updated');
    };
  }

  openGoal=function(gid){
    const g=state.goals.find(x=>x.id===gid);if(!g)return;
    g.subgoals=g.subgoals||[];g.milestones=g.milestones||[];
    const subgoalRows=g.subgoals.map(s=>`<div class="task-row" style="padding-left:8px"><input class="sg-check" data-id="${s.id}" type="checkbox" ${s.done?'checked':''}><div class="task-main"><div class="task-title ${s.done?'done':''}">${esc(s.title)}</div><div class="task-sub">${s.targetDate?'Target '+fmt(s.targetDate):'Subgoal'}</div></div><button class="icon-btn sg-edit" data-id="${s.id}" title="Edit subgoal">✎</button><button class="icon-btn sg-del" data-id="${s.id}" title="Delete subgoal">×</button></div>`).join('')||'<div class="empty">No subgoals yet.</div>';
    const milestoneRows=g.milestones.map(m=>`<div class="task-row"><input class="m-check" data-id="${m.id}" type="checkbox" ${m.done?'checked':''}><div class="task-main"><div class="task-title ${m.done?'done':''}">${esc(m.title)}</div></div><button class="icon-btn m-del" data-id="${m.id}">×</button></div>`).join('')||'<div class="empty">No milestones yet.</div>';

    modal(`<div class="goal-top"><div><div class="badge">${esc(g.category)}</div><h2>${esc(g.title)}</h2><p>${esc(g.why||'')}</p><button id="editGoalBtn" class="link-btn" style="margin-top:8px">Edit goal</button></div><div class="goal-percent">${progress(g)}%</div></div><div class="progress"><span style="width:${progress(g)}%"></span></div>
      <div class="section-head" style="margin-top:22px"><div><h3 style="margin:0">Subgoals</h3><p>Smaller outcomes that roll up to this goal.</p></div></div><div class="list">${subgoalRows}</div>
      <div class="form-grid" style="margin-top:14px"><div class="field"><label>New subgoal</label><input id="sgTitle" placeholder="e.g. Finish onboarding"></div><div class="field"><label>Target date</label><input id="sgDate" type="date"></div></div><div style="display:flex;justify-content:flex-end"><button id="mkSG" class="secondary-btn">+ Add subgoal</button></div>
      <div class="section-head" style="margin-top:26px"><div><h3 style="margin:0">Milestones</h3><p>Checkpoints and proof of progress.</p></div></div><div class="list">${milestoneRows}</div><div class="field"><label>Add milestone</label><input id="mTitle"></div>
      <div class="modal-actions"><button id="delGoal" class="danger-btn">Delete goal</button><button class="secondary-btn close-modal">Close</button><button id="mkM" class="primary-btn">Add milestone</button></div>`);

    $('#editGoalBtn').onclick=()=>editGoal(gid);
    $$('.sg-edit').forEach(b=>b.onclick=()=>editSubgoal(gid,b.dataset.id));
    $$('.sg-check').forEach(b=>b.onchange=()=>{const s=g.subgoals.find(x=>x.id===b.dataset.id);if(s)s.done=b.checked;save();openGoal(gid)});
    $$('.sg-del').forEach(b=>b.onclick=()=>{g.subgoals=g.subgoals.filter(x=>x.id!==b.dataset.id);save();openGoal(gid)});
    $('#mkSG').onclick=()=>{const title=$('#sgTitle').value.trim();if(!title)return;g.subgoals.push({id:id(),title,targetDate:$('#sgDate').value||'',done:false});save();openGoal(gid)};
    $$('.m-check').forEach(b=>b.onchange=()=>{const m=g.milestones.find(x=>x.id===b.dataset.id);if(m)m.done=b.checked;save();openGoal(gid)});
    $$('.m-del').forEach(b=>b.onclick=()=>{g.milestones=g.milestones.filter(x=>x.id!==b.dataset.id);save();openGoal(gid)});
    $('#mkM').onclick=()=>{const title=$('#mTitle').value.trim();if(!title)return;g.milestones.push({id:id(),title,done:false});save();openGoal(gid)};
    $('#delGoal').onclick=()=>{if(confirm('Delete this goal?')){state.goals=state.goals.filter(x=>x.id!==gid);state.tasks.forEach(t=>{if(t.goalId===gid)t.goalId=null});save();close()}};
  };
})();
