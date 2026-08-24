(() => {
  const VERSION='tudrunt-web-beta-dates-v3';
  const GOAL_START='2026-08-24',GOAL_END='2026-10-18';
  const schedule={
    'Lock the web beta scope and success criteria':['2026-08-24','2026-08-25'],'Finish detailed onboarding with income sources entered one by one':['2026-08-24','2026-08-28'],'Add item-by-item recurring bills with amounts, due dates, and edit/delete controls':['2026-08-26','2026-08-30'],'Add item-by-item variable expenses with categories and edit/delete controls':['2026-08-28','2026-09-01'],'Add debts with balances, minimum payments, due dates, and interest information':['2026-08-30','2026-09-02'],'Add account balances and first-goal setup to onboarding':['2026-09-01','2026-09-03'],'Make Tudrunt calculate monthly income, bills, spending, debt payments, and cash flow automatically':['2026-09-02','2026-09-05'],'Fix onboarding completion so the dashboard opens immediately after setup':['2026-09-04','2026-09-06'],'Create the Supabase project and production-safe environment configuration':['2026-09-05','2026-09-07'],'Build email sign-up, login, logout, password reset, and email verification':['2026-09-07','2026-09-11'],'Implement secure session handling and authenticated routing':['2026-09-10','2026-09-13'],'Create the cloud database schema for profiles, income, bills, expenses, debts, goals, and cash-flow items':['2026-09-08','2026-09-12'],'Add Row Level Security so every user can access only their own financial data':['2026-09-11','2026-09-14'],'Build the cloud repository layer and migrate away from SharedPreferences as the primary source of truth':['2026-09-13','2026-09-18'],'Keep local storage only for caching and offline convenience':['2026-09-17','2026-09-19'],'Sync profile, onboarding, goals, and cash-flow plan across devices':['2026-09-18','2026-09-21'],'Finish Home dashboard with Safe to Spend, daily briefing, next event, and financial overview':['2026-09-20','2026-09-23'],'Finish Plan with recurring income/expenses, full cash-flow timeline, editing, and shortfall alerts':['2026-09-22','2026-09-26'],'Finish Future with projections, goals, future scenarios, and a clean 30-day outlook summary':['2026-09-24','2026-09-27'],'Stabilize Ask Tudrunt affordability, Safe to Spend, savings, and debt guidance with validation and guardrails':['2026-09-26','2026-09-30'],'Finish Profile and Settings with account management, financial profile editing, privacy controls, and logout':['2026-09-28','2026-10-01'],'Add account deletion and user-data deletion workflow':['2026-09-30','2026-10-02'],'Create Privacy Policy, Terms of Use, disclosures, and beta notice':['2026-10-01','2026-10-03'],'Add error logging, analytics, and basic production monitoring':['2026-10-02','2026-10-04'],'Build and deploy a staging Flutter Web version':['2026-10-03','2026-10-05'],'Connect the production domain and configure HTTPS':['2026-10-04','2026-10-06'],'Test desktop and mobile browsers for layout, performance, and accessibility':['2026-10-05','2026-10-08'],'Run authentication, database security, and Row Level Security tests':['2026-10-06','2026-10-09'],'Run end-to-end tests from sign-up through onboarding, dashboard, goals, Plan, Future, Ask, and Profile':['2026-10-08','2026-10-11'],'Fix all launch-blocking bugs and complete final UI polish':['2026-10-09','2026-10-13'],'Recruit the first 10 private beta testers':['2026-10-05','2026-10-13'],'Create a simple beta feedback and bug-reporting process':['2026-10-10','2026-10-12'],'Invite beta users and verify they can complete onboarding successfully':['2026-10-13','2026-10-15'],'Launch Tudrunt private web beta':['2026-10-16','2026-10-16'],'Monitor beta usage, collect feedback, and triage issues':['2026-10-16','2026-10-18'],'Complete the beta review and prioritize changes for public launch':['2026-10-18','2026-10-18']};
  const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
  function applyDates(){
    if(typeof state==='undefined'||!Array.isArray(state.goals))return false;
    const goal=state.goals.find(g=>g.seedKey==='launch-tudrunt-web-beta'||/tudrunt.*web.*beta/i.test(g.title||''));
    if(!goal)return false;
    let changed=false;
    if(goal.startDate!==GOAL_START){goal.startDate=GOAL_START;changed=true}
    if(goal.endDate!==GOAL_END){goal.endDate=GOAL_END;changed=true}
    if(goal.targetDate!==GOAL_END){goal.targetDate=GOAL_END;changed=true}
    const lookup=new Map(Object.entries(schedule).map(([k,v])=>[norm(k),v]));
    (goal.subgoals||[]).forEach(s=>{
      const dates=lookup.get(norm(s.title));
      if(!dates)return;
      if(s.startDate!==dates[0]){s.startDate=dates[0];changed=true}
      if(s.endDate!==dates[1]){s.endDate=dates[1];changed=true}
      if(s.targetDate!==dates[1]){s.targetDate=dates[1];changed=true}
    });
    goal.webBetaDatesVersion=VERSION;
    if(changed){
      if(typeof normalize==='function')normalize();
      if(typeof saveLocal==='function')saveLocal();
      if(typeof queueCloudSave==='function')queueCloudSave();
    }
    return changed;
  }
  window.applyTudruntWebBetaDates=applyDates;
  const coreRender=window.render;
  if(typeof coreRender==='function')window.render=function(){applyDates();return coreRender.apply(this,arguments)};
  applyDates();
  setTimeout(()=>{if(applyDates()&&typeof render==='function')render()},300);
  setTimeout(()=>{if(applyDates()&&typeof render==='function')render()},1200);
})();