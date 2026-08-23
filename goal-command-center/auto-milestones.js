// Smart rule-based milestone generator for Goal Command Center.
// No render/switchView wrappers, observers, intervals, or external APIs.
(() => {
  if (window.__gccAutoMilestonesInstalled) return;
  window.__gccAutoMilestonesInstalled = true;

  const sameId=(a,b)=>String(a??'')===String(b??'');
  const pad=n=>String(n).padStart(2,'0');
  const keyOf=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const parseKey=key=>{const [y,m,d]=String(key||'').split('-').map(Number);return new Date(y,m-1,d)};
  const moneyFmt=new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0});

  function ensureStyles(){
    if(document.querySelector('#autoMilestoneStyles'))return;
    const s=document.createElement('style');
    s.id='autoMilestoneStyles';
    s.textContent=`
      .auto-milestone-create{margin:14px 0;padding:12px 13px;border:1px solid var(--line);border-radius:12px;background:var(--panel2)}
      .auto-milestone-create label{display:flex;align-items:flex-start;gap:10px;font-size:13px;font-weight:800;cursor:pointer}
      .auto-milestone-create input{width:19px;height:19px;accent-color:var(--accent);margin-top:1px;flex:0 0 auto}
      .auto-milestone-create p{margin:6px 0 0 29px;color:var(--muted);font-size:11px;line-height:1.4}
      .auto-milestone-controls{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
      .auto-milestone-badge{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:3px 6px;font-size:9px;font-weight:850;color:var(--accent2);margin-left:6px;vertical-align:middle}
      .auto-milestone-date{font-size:10px;color:var(--muted);margin-top:3px}
      @media(max-width:650px){.auto-milestone-controls{width:100%;margin-top:6px}.goal-command-section-head:has(.auto-milestone-controls){flex-wrap:wrap}}
    `;
    document.head.appendChild(s);
  }

  function goalDeadline(g){return g?.endDate||g?.targetDate||'';}

  function milestoneDates(g,count){
    const endKey=goalDeadline(g);
    if(!endKey||!count)return Array(count).fill('');
    const startKey=g.startDate||iso();
    const start=parseKey(startKey),end=parseKey(endKey);
    if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<start)return Array(count).fill('');
    const span=end-start;
    return Array.from({length:count},(_,i)=>{
      const ratio=(i+1)/count;
      const d=new Date(start.getTime()+Math.round(span*ratio));
      return keyOf(d);
    });
  }

  function parseMoneyTarget(title){
    const text=String(title||'');
    const regex=/\$?\s*(\d[\d,]*(?:\.\d{1,2})?)\s*([kKmM])?/g;
    let match,best=0;
    while((match=regex.exec(text))){
      let n=Number(match[1].replace(/,/g,''));
      if(!Number.isFinite(n))continue;
      const suffix=(match[2]||'').toLowerCase();
      if(suffix==='k')n*=1000;if(suffix==='m')n*=1000000;
      const explicit=match[0].includes('$')||!!suffix;
      if(explicit||n>=100)best=Math.max(best,n);
    }
    return best;
  }

  function moneyMilestones(g){
    const title=String(g.title||'').toLowerCase();
    const target=parseMoneyTarget(g.title);
    const debt=/debt|pay off|payoff|credit card|loan/.test(title);
    if(target){
      const q=n=>moneyFmt.format(Math.round(target*n));
      return debt?[
        'List balances, interest rates, and payoff order',
        `Pay off 25% of the target (${q(.25)})`,
        `Pay off 50% of the target (${q(.50)})`,
        `Pay off 75% of the target (${q(.75)})`,
        `Complete the payoff target (${q(1)})`
      ]:[
        'Confirm the starting balance and contribution plan',
        `Reach 25% of the target (${q(.25)})`,
        `Reach 50% of the target (${q(.50)})`,
        `Reach 75% of the target (${q(.75)})`,
        `Reach the full target (${q(1)})`
      ];
    }
    return debt?[
      'List balances, interest rates, and minimum payments',
      'Choose the payoff order and monthly payment amount',
      'Complete the first payoff checkpoint',
      'Reach the halfway payoff checkpoint',
      'Finish the remaining balance and review the result'
    ]:[
      'Define the exact money target and starting point',
      'Set the recurring contribution or payment plan',
      'Reach the first 25% checkpoint',
      'Reach the halfway checkpoint',
      'Reach 75% and complete the final push',
      'Complete the money goal and review the result'
    ];
  }

  function templatesFor(g){
    const category=String(g.category||'Personal').toLowerCase();
    const title=String(g.title||'').toLowerCase();
    if(category==='money')return moneyMilestones(g);
    if(category==='business')return[
      'Define scope, success criteria, and must-have outcome',
      'Complete the foundation and core setup',
      'Finish the core deliverable or feature set',
      'Test with real use cases and fix major issues',
      /launch|beta|release|website|app/.test(title)?'Prepare the launch, release, or beta':'Prepare the final delivery and rollout',
      'Complete the goal and review results'
    ];
    if(category==='health')return[
      'Record the baseline and define the measurable target',
      'Set the weekly routine and tracking method',
      'Complete the first consistency checkpoint',
      'Reach the halfway progress checkpoint',
      'Complete the final consistency push',
      'Review results and set the maintenance plan'
    ];
    if(category==='career')return[
      'Define the exact career outcome or skill target',
      'Create the learning and execution plan',
      'Complete the first proof-of-skill deliverable',
      'Get feedback and close the biggest gaps',
      'Complete the final portfolio, application, or work product',
      'Review the result and choose the next career step'
    ];
    if(category==='learning'||/read|book|course|learn|study/.test(title))return[
      'Choose the material and define the learning plan',
      'Complete the first 25% of the material',
      'Reach the halfway checkpoint',
      'Complete 75% and review weak areas',
      'Finish the material and capture the key lessons'
    ];
    if(category==='relationships')return[
      'Define what improvement would look like',
      'Choose one repeatable connection or communication habit',
      'Complete the first consistency checkpoint',
      'Review what is working and adjust',
      'Complete the final checkpoint and set the next standard'
    ];
    return[
      'Define the outcome and what success looks like',
      'Complete the first meaningful step',
      'Reach the first progress checkpoint',
      'Reach the halfway checkpoint',
      'Complete the final push',
      'Finish the goal and review the result'
    ];
  }

  function buildGenerated(g){
    const titles=templatesFor(g);
    const dates=milestoneDates(g,titles.length);
    return titles.map((title,i)=>({
      id:id(),title,done:false,targetDate:dates[i]||'',autoGenerated:true,autoSource:'rule-v1'
    }));
  }

  function generateForGoal(g,{replaceAuto=false}={}){
    g.milestones=Array.isArray(g.milestones)?g.milestones:[];
    const manual=g.milestones.filter(m=>!m.autoGenerated);
    const oldAuto=g.milestones.filter(m=>m.autoGenerated);
    const doneByTitle=new Map(oldAuto.map(m=>[String(m.title||'').toLowerCase(),!!m.done]));
    const existingTitles=new Set(manual.map(m=>String(m.title||'').trim().toLowerCase()));
    const generated=buildGenerated(g).filter(m=>!existingTitles.has(m.title.trim().toLowerCase()));
    generated.forEach(m=>{if(doneByTitle.has(m.title.toLowerCase()))m.done=doneByTitle.get(m.title.toLowerCase());});
    g.milestones=replaceAuto?[...manual,...generated]:[...g.milestones,...generated.filter(m=>!g.milestones.some(x=>String(x.title||'').trim().toLowerCase()===m.title.trim().toLowerCase()))];
    return generated.length;
  }

  function enhanceGoalMilestones(gid){
    const g=(state.goals||[]).find(x=>sameId(x.id,gid));
    if(!g)return;
    const modalEl=document.querySelector('#modalRoot .modal');
    if(!modalEl)return;
    const sections=[...modalEl.querySelectorAll('.goal-command-section')];
    const milestoneSection=sections.find(s=>s.querySelector('h3')?.textContent.trim()==='Milestones');
    if(!milestoneSection)return;

    const head=milestoneSection.querySelector('.goal-command-section-head');
    let controls=milestoneSection.querySelector('.auto-milestone-controls');
    const autoCount=(g.milestones||[]).filter(m=>m.autoGenerated).length;
    if(!controls){
      controls=document.createElement('div');
      controls.className='auto-milestone-controls';
      head?.appendChild(controls);
    }
    controls.innerHTML=`<button type="button" id="autoMilestoneBtn" class="secondary-btn">${autoCount?'↻ Regenerate auto':'✨ Generate milestones'}</button>`;
    controls.querySelector('#autoMilestoneBtn').onclick=()=>{
      if(autoCount&&!confirm('Regenerate the auto-generated milestones? Your manual milestones will stay.'))return;
      const count=generateForGoal(g,{replaceAuto:autoCount>0});
      save();
      openGoal(g.id);
      toast(count?`${count} milestones generated`:'Milestones are already up to date');
    };

    milestoneSection.querySelectorAll('.m-check').forEach(box=>{
      const m=(g.milestones||[]).find(x=>sameId(x.id,box.dataset.id));
      const row=box.closest('.goal-command-row');
      const main=row?.querySelector('.goal-command-main');
      const title=main?.querySelector('.goal-command-title');
      if(!m||!main||!title)return;
      if(m.autoGenerated&&!title.querySelector('.auto-milestone-badge')){
        const badge=document.createElement('span');badge.className='auto-milestone-badge';badge.textContent='AUTO';title.appendChild(badge);
      }
      if(m.targetDate&&!main.querySelector('.auto-milestone-date')){
        const meta=document.createElement('div');meta.className='auto-milestone-date';meta.textContent=`Target ${fmt(m.targetDate)}`;main.appendChild(meta);
      }
    });
  }

  ensureStyles();

  if(typeof openGoal==='function'){
    const baseOpenGoal=openGoal;
    openGoal=function(gid){baseOpenGoal(gid);enhanceGoalMilestones(gid);};
  }

  if(typeof openGoalModal==='function'){
    const baseOpenGoalModal=openGoalModal;
    openGoalModal=function(){
      baseOpenGoalModal();
      const btn=document.querySelector('#mkGoal');
      const actions=btn?.closest('.modal-actions');
      if(!btn||!actions)return;
      const box=document.createElement('div');
      box.className='auto-milestone-create';
      box.innerHTML=`<label><input id="autoMilestoneCreate" type="checkbox" checked><span>Automatically generate milestones for this goal</span></label><p>Creates 4–6 editable checkpoints based on the goal category and deadline.</p>`;
      actions.before(box);
      const original=btn.onclick;
      btn.onclick=()=>{
        const wants=!!document.querySelector('#autoMilestoneCreate')?.checked;
        const before=new Set((state.goals||[]).map(g=>String(g.id)));
        original?.call(btn);
        if(!wants)return;
        const created=(state.goals||[]).find(g=>!before.has(String(g.id)));
        if(!created)return;
        generateForGoal(created,{replaceAuto:false});
        save();
        toast('Milestones generated');
      };
    };
  }

  const addGoal=document.querySelector('#addGoalBtn');
  if(addGoal)addGoal.onclick=openGoalModal;
})();
