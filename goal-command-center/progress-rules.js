// Goal progress is based on subgoals only. Milestones are checkpoints and do not affect percentage.
(() => {
  progress=function(g){
    const items=Array.isArray(g?.subgoals)?g.subgoals:[];
    return items.length?Math.round(items.filter(x=>x.done).length/items.length*100):0;
  };
  if(typeof render==='function')render();
})();
