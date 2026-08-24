(() => {
  const TUDRUNT_WEB_BETA_PACK_VERSION='tudrunt-web-beta-v1';
  const TUDRUNT_WEB_BETA_GOAL={
    type:'goal-update',
    goal:{
      seedKey:'launch-tudrunt-web-beta',
      title:'Launch Tudrunt Web Beta',
      matchTitles:['Lunch Tudrunt web beta','Launch Tudrunt web beta','Launch Tudrunt Web Beta'],
      category:'Business',
      startDate:'',
      endDate:'',
      targetDate:'',
      why:'Launch a secure, useful Tudrunt web beta with real user accounts, persistent financial data, and a focused group of beta testers so we can learn, improve, and prepare for public launch.',
      subgoals:[
        {title:'Lock the web beta scope and success criteria',startDate:'',endDate:'',done:false},
        {title:'Finish detailed onboarding with income sources entered one by one',startDate:'',endDate:'',done:false},
        {title:'Add item-by-item recurring bills with amounts, due dates, and edit/delete controls',startDate:'',endDate:'',done:false},
        {title:'Add item-by-item variable expenses with categories and edit/delete controls',startDate:'',endDate:'',done:false},
        {title:'Add debts with balances, minimum payments, due dates, and interest information',startDate:'',endDate:'',done:false},
        {title:'Add account balances and first-goal setup to onboarding',startDate:'',endDate:'',done:false},
        {title:'Make Tudrunt calculate monthly income, bills, spending, debt payments, and cash flow automatically',startDate:'',endDate:'',done:false},
        {title:'Fix onboarding completion so the dashboard opens immediately after setup',startDate:'',endDate:'',done:false},
        {title:'Create the Supabase project and production-safe environment configuration',startDate:'',endDate:'',done:false},
        {title:'Build email sign-up, login, logout, password reset, and email verification',startDate:'',endDate:'',done:false},
        {title:'Implement secure session handling and authenticated routing',startDate:'',endDate:'',done:false},
        {title:'Create the cloud database schema for profiles, income, bills, expenses, debts, goals, and cash-flow items',startDate:'',endDate:'',done:false},
        {title:'Add Row Level Security so every user can access only their own financial data',startDate:'',endDate:'',done:false},
        {title:'Build the cloud repository layer and migrate away from SharedPreferences as the primary source of truth',startDate:'',endDate:'',done:false},
        {title:'Keep local storage only for caching and offline convenience',startDate:'',endDate:'',done:false},
        {title:'Sync profile, onboarding, goals, and cash-flow plan across devices',startDate:'',endDate:'',done:false},
        {title:'Finish Home dashboard with Safe to Spend, daily briefing, next event, and financial overview',startDate:'',endDate:'',done:false},
        {title:'Finish Plan with recurring income/expenses, full cash-flow timeline, editing, and shortfall alerts',startDate:'',endDate:'',done:false},
        {title:'Finish Future with projections, goals, future scenarios, and a clean 30-day outlook summary',startDate:'',endDate:'',done:false},
        {title:'Stabilize Ask Tudrunt affordability, Safe to Spend, savings, and debt guidance with validation and guardrails',startDate:'',endDate:'',done:false},
        {title:'Finish Profile and Settings with account management, financial profile editing, privacy controls, and logout',startDate:'',endDate:'',done:false},
        {title:'Add account deletion and user-data deletion workflow',startDate:'',endDate:'',done:false},
        {title:'Create Privacy Policy, Terms of Use, disclosures, and beta notice',startDate:'',endDate:'',done:false},
        {title:'Add error logging, analytics, and basic production monitoring',startDate:'',endDate:'',done:false},
        {title:'Build and deploy a staging Flutter Web version',startDate:'',endDate:'',done:false},
        {title:'Connect the production domain and configure HTTPS',startDate:'',endDate:'',done:false},
        {title:'Test desktop and mobile browsers for layout, performance, and accessibility',startDate:'',endDate:'',done:false},
        {title:'Run authentication, database security, and Row Level Security tests',startDate:'',endDate:'',done:false},
        {title:'Run end-to-end tests from sign-up through onboarding, dashboard, goals, Plan, Future, Ask, and Profile',startDate:'',endDate:'',done:false},
        {title:'Fix all launch-blocking bugs and complete final UI polish',startDate:'',endDate:'',done:false},
        {title:'Recruit the first 10 private beta testers',startDate:'',endDate:'',done:false},
        {title:'Create a simple beta feedback and bug-reporting process',startDate:'',endDate:'',done:false},
        {title:'Invite beta users and verify they can complete onboarding successfully',startDate:'',endDate:'',done:false},
        {title:'Launch Tudrunt private web beta',startDate:'',endDate:'',done:false},
        {title:'Monitor beta usage, collect feedback, and triage issues',startDate:'',endDate:'',done:false},
        {title:'Complete the beta review and prioritize changes for public launch',startDate:'',endDate:'',done:false}
      ],
      milestones:[
        {title:'Web beta scope locked',done:false},
        {title:'Detailed onboarding works end to end',done:false},
        {title:'Authentication works',done:false},
        {title:'Cloud database and Row Level Security work',done:false},
        {title:'All five core screens use the same user data',done:false},
        {title:'Staging web build is live',done:false},
        {title:'Security and end-to-end testing passed',done:false},
        {title:'10 beta testers recruited',done:false},
        {title:'First beta user completes onboarding',done:false},
        {title:'Private Tudrunt web beta launched',done:false}
      ]
    }
  };

  function addImportCard(){
    const settings=document.querySelector('#settingsView');
    if(!settings||document.querySelector('#goalPackImportCard'))return;
    const card=document.createElement('div');
    card.id='goalPackImportCard';
    card.className='card settings-card';
    card.style.marginTop='18px';
    card.innerHTML=`<div class="kicker">Goal updates</div><h2>Import goal update</h2><p>Merge one goal or a full goal pack into your account without replacing unrelated habits, tasks, check-ins, or reading data.</p><label class="secondary-btn">Choose goal update<input id="goalPackInput" type="file" accept="application/json" hidden></label>`;
    settings.appendChild(card);
    card.querySelector('#goalPackInput').onchange=e=>{
      const file=e.target.files?.[0];if(!file)return;
      const reader=new FileReader();
      reader.onload=()=>{try{applyPack(JSON.parse(reader.result))}catch(err){console.error(err);toast('Invalid goal update file')}};
      reader.readAsText(file);
    };
  }

  function normalizeSubgoal(s,existing){
    const end=s.endDate||s.targetDate||'';
    return {
      id:s.id||existing?.id||id(),
      title:String(s.title||''),
      startDate:s.startDate||'',
      endDate:end,
      targetDate:end,
      done:typeof s.done==='boolean'?s.done:!!existing?.done
    };
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
    toast(goals.length===1?'Goal updated':`${goals.length} goals updated`);
    switchView('goals');
  }

  function ensureTudruntWebBetaGoal(){
    if(!state||!Array.isArray(state.goals))return false;
    const existing=state.goals.find(g=>g.seedKey==='launch-tudrunt-web-beta'||g.title==='Launch Tudrunt Web Beta'||g.title==='Launch Tudrunt web beta'||g.title==='Lunch Tudrunt web beta');
    if(existing?.goalPackVersion===TUDRUNT_WEB_BETA_PACK_VERSION)return false;
    const goal=applyGoal(TUDRUNT_WEB_BETA_GOAL.goal);
    goal.goalPackVersion=TUDRUNT_WEB_BETA_PACK_VERSION;
    if(typeof normalize==='function')normalize();
    if(typeof saveLocal==='function')saveLocal();
    if(typeof queueCloudSave==='function')queueCloudSave();
    return true;
  }

  const coreRender=render;
  render=function(){ensureTudruntWebBetaGoal();coreRender();addImportCard();};
  ensureTudruntWebBetaGoal();
  render();
})();
