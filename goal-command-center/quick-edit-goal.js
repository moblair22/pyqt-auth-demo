// Quick edit controls for goal name and dates.
(() => {
  function editGoalQuick(gid){
    const g=(state.goals||[]).find(x=>String(x.id)===String(gid));
    if(!g)return;
    g.startDate=g.startDate||'';
    g.endDate=g.endDate||g.targetDate||'';
    modal(`<h2>Edit goal</h2>
      <div class="field"><label>Goal name</label><input id="quickEditGoalTitle" value="${esc(g.title||'')}"></div>
      <div class="form-grid">
        <div class="field"><label>Start date</label><input id="quickEditGoalStart" type="date" value="${esc(g.startDate||'')}"></div>
        <div class="field"><label>End date</label><input id="quickEditGoalEnd" type="date" value="${esc(g.endDate||g.targetDate||'')}"></div>
      </div>
      <div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="quickEditGoalSave" class="primary-btn">Save changes</button></div>`);
    $('#quickEditGoalSave').onclick=()=>{
      const title=$('#quickEditGoalTitle').value.trim();
      const start=$('#quickEditGoalStart').value;
      const end=$('#quickEditGoalEnd').value;
      if(!title)return toast('Enter a goal name');
      if(start&&end&&end<start)return toast('End date must be on or after start date');
      g.title=title;
      g.startDate=start;
      g.endDate=end;
      g.targetDate=end;
      save();
      close();
      toast('Goal updated');
    };
  }

  window.editGoalQuick=editGoalQuick;

  const baseCard=card;
  card=function(g){
    const html=baseCard(g);
    return html.replace(
      `<button class="link-btn open-goal" data-id="${g.id}">Open goal</button>`,
      `<span style="display:flex;gap:8px;align-items:center"><button class="link-btn quick-edit-goal" data-id="${g.id}">Edit</button><button class="link-btn open-goal" data-id="${g.id}">Open goal</button></span>`
    );
  };

  document.addEventListener('click',e=>{
    const btn=e.target.closest('.quick-edit-goal');
    if(!btn)return;
    e.preventDefault();
    e.stopPropagation();
    editGoalQuick(btn.dataset.id);
  });

  if(typeof render==='function')render();
})();