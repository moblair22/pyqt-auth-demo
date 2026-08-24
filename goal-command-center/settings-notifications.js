// Mount the existing Notifications experience inside Settings.
(() => {
  const notificationView=document.querySelector('#notificationsView');
  const notificationNav=document.querySelector('[data-view="notifications"]');

  function ensureStyles(){
    if(document.querySelector('#settingsNotificationsStyles'))return;
    const style=document.createElement('style');
    style.id='settingsNotificationsStyles';
    style.textContent=`
      .nav [data-view="notifications"]{display:none!important}
      #settingsView .settings-notifications-wrap{margin-top:18px}
      #settingsView #notificationsView{display:block!important;margin:0;padding:0}
      #settingsView #notificationsView>.email-shell{margin-top:0}
      #settingsView .settings-notifications-heading{margin:0 0 12px}
      #settingsView .settings-notifications-heading h2{margin:5px 0 4px}
      #settingsView .settings-notifications-heading p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}
    `;
    document.head.appendChild(style);
  }

  function mountNotifications(){
    const settingsView=document.querySelector('#settingsView');
    if(!settingsView||!notificationView)return;

    // Keep the original nav element in the DOM so email-reminders.js can initialize,
    // but hide it from the sidebar with CSS.
    if(notificationNav)notificationNav.setAttribute('aria-hidden','true');

    let wrap=settingsView.querySelector('.settings-notifications-wrap');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className='settings-notifications-wrap';
      wrap.innerHTML='<div class="settings-notifications-heading"><div class="kicker">Notifications</div><h2>Notifications</h2><p>Manage your daily email checklist, delivery time, printable preview, and recent delivery history.</p></div>';
      settingsView.appendChild(wrap);
    }

    if(notificationView.parentElement!==wrap)wrap.appendChild(notificationView);
    notificationView.classList.add('active');
    notificationView.setAttribute('aria-label','Notification settings');
  }

  ensureStyles();
  mountNotifications();

  if(typeof render==='function'){
    const baseRender=render;
    render=function(){
      baseRender();
      mountNotifications();
    };
  }

  if(typeof switchView==='function'){
    const baseSwitch=switchView;
    switchView=function(v){
      baseSwitch(v);
      mountNotifications();
    };
  }
})();