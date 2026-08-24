// Mount Notifications and the PWA install control inside Settings.
(() => {
  const notificationView=document.querySelector('#notificationsView');
  const notificationNav=document.querySelector('[data-view="notifications"]');
  const installBtn=document.querySelector('#installBtn');

  function ensureStyles(){
    if(document.querySelector('#settingsNotificationsStyles'))return;
    const style=document.createElement('style');
    style.id='settingsNotificationsStyles';
    style.textContent=`
      .nav [data-view="notifications"]{display:none!important}
      #settingsView .settings-install-wrap,#settingsView .settings-notifications-wrap{margin-top:18px}
      #settingsView #notificationsView{display:block!important;margin:0;padding:0}
      #settingsView #notificationsView>.email-shell{margin-top:0}
      #settingsView .settings-section-heading{margin:0 0 12px}
      #settingsView .settings-section-heading h2{margin:5px 0 4px}
      #settingsView .settings-section-heading p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}
      #settingsView .settings-install-card{padding:20px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
      #settingsView .settings-install-card p{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.5;max-width:700px}
      #settingsView #installBtn{margin:0}
    `;
    document.head.appendChild(style);
  }

  function mountInstall(){
    const settingsView=document.querySelector('#settingsView');
    if(!settingsView||!installBtn)return;
    let wrap=settingsView.querySelector('.settings-install-wrap');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className='settings-install-wrap';
      wrap.innerHTML='<div class="settings-section-heading"><div class="kicker">App</div><h2>Install Goal Command Center</h2></div><div class="card settings-install-card"><div><strong>Use Goal Command Center like an app</strong><p>Install it on this device for its own app icon and a standalone window. Your existing goals and settings stay the same.</p></div><div class="settings-install-action"></div></div>';
      settingsView.appendChild(wrap);
    }
    const target=wrap.querySelector('.settings-install-action');
    if(target&&installBtn.parentElement!==target)target.appendChild(installBtn);
    installBtn.textContent='Install Goal Command Center';
  }

  function mountNotifications(){
    const settingsView=document.querySelector('#settingsView');
    if(!settingsView||!notificationView)return;
    if(notificationNav)notificationNav.setAttribute('aria-hidden','true');
    let wrap=settingsView.querySelector('.settings-notifications-wrap');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.className='settings-notifications-wrap';
      wrap.innerHTML='<div class="settings-section-heading"><div class="kicker">Notifications</div><h2>Notifications</h2><p>Manage your daily email checklist, delivery time, printable preview, and recent delivery history.</p></div>';
      settingsView.appendChild(wrap);
    }
    if(notificationView.parentElement!==wrap)wrap.appendChild(notificationView);
    notificationView.classList.add('active');
    notificationView.setAttribute('aria-label','Notification settings');
    if(typeof window.renderNotificationSettings==='function')window.renderNotificationSettings();
  }

  function mountSettingsExtras(){mountInstall();mountNotifications();}
  ensureStyles();mountSettingsExtras();
  if(typeof render==='function'){const baseRender=render;render=function(){baseRender();mountSettingsExtras();};}
  if(typeof switchView==='function'){const baseSwitch=switchView;switchView=function(v){baseSwitch(v);mountSettingsExtras();};}
})();