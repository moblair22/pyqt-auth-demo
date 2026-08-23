// Add Settings access to the mobile bottom navigation.
(() => {
  function ensureMobileSettings(){
    const nav=document.querySelector('.nav');
    if(!nav)return;
    let btn=document.querySelector('.mobile-settings-nav');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.className='nav-item mobile-settings-nav';
      btn.dataset.view='settings';
      btn.innerHTML='⚙ <span>Settings</span>';
      nav.appendChild(btn);
    }
    btn.onclick=()=>switchView('settings');
  }

  if(!document.querySelector('#mobileSettingsStyle')){
    const style=document.createElement('style');
    style.id='mobileSettingsStyle';
    style.textContent=`
      .mobile-settings-nav{display:none}
      @media(max-width:650px){
        .mobile-settings-nav{display:grid}
        .nav{display:flex!important;overflow-x:auto;overflow-y:hidden;gap:2px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
        .nav::-webkit-scrollbar{display:none}
        .nav .nav-item{flex:1 0 54px;min-width:54px}
      }
    `;
    document.head.appendChild(style);
  }

  ensureMobileSettings();
  const observer=new MutationObserver(()=>ensureMobileSettings());
  observer.observe(document.body,{childList:true,subtree:true});
})();
