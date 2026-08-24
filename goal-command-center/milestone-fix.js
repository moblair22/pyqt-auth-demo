// Final-layer milestone binding so Add milestone always targets the currently open goal.
(() => {
  if (typeof openGoal !== 'function') return;
  const baseOpenGoal = openGoal;

  openGoal = function(gid) {
    baseOpenGoal(gid);
    const button = document.querySelector('#mkM');
    const input = document.querySelector('#mTitle');
    if (!button || !input) return;

    button.onclick = () => {
      const goal = (state.goals || []).find(g => String(g.id) === String(gid));
      if (!goal) return;
      const title = input.value.trim();
      if (!title) {
        if (typeof toast === 'function') toast('Enter a milestone');
        input.focus();
        return;
      }
      goal.milestones = Array.isArray(goal.milestones) ? goal.milestones : [];
      goal.milestones.push({ id: id(), title, done: false });
      save();
      openGoal(gid);
      if (typeof toast === 'function') toast('Milestone added');
    };

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        button.click();
      }
    });
  };
})();