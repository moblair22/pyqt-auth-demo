// App skins / appearance selector. UI preference is stored separately from goal data.
(() => {
  const SKIN_KEY='gcc-skin-v1';
  const skins=[
    {id:'midnight',name:'Midnight',desc:'Deep navy with mint and blue accents.',swatches:['#07101d','#111d2e','#6de1b2','#8bb8ff']},
    {id:'daylight',name:'Daylight',desc:'Clean light workspace with crisp blue accents.',swatches:['#eef3f8','#ffffff','#2b8a75','#3978d4']}
  ];

  function readSkin(){
    const saved=localStorage.getItem(SKIN_KEY)||'midnight';
    return skins.some(s=>s.id===saved)?saved:'midnight';
  }

  function applySkin(id,{persist=true,announce=false}={}){
    const skin=skins.find(s=>s.id===id)||skins[0];
    document.documentElement.dataset.skin=skin.id;
    if(persist)localStorage.setItem(SKIN_KEY,skin.id);
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',skin.swatches[0]);
    refreshChoices();
    if(announce&&typeof toast==='function')toast(`${skin.name} skin applied`);
  }

  function ensureStyles(){
    if(document.querySelector('#skinStyles'))return;
    const style=document.createElement('style');
    style.id='skinStyles';
    style.textContent=`
      html[data-skin="midnight"]{--bg:#07101d;--panel:#0d1726;--panel2:#111d2e;--soft:#182638;--line:#203047;--text:#f5f8fb;--muted:#8ea0b7;--accent:#6de1b2;--accent2:#8bb8ff;--danger:#ff8b93;--skin-sidebar:#08111f;--skin-input:#07111f;--skin-modal:#0d1828;--skin-card:#111d2e}
      html[data-skin="daylight"]{--bg:#eef3f8;--panel:#ffffff;--panel2:#f7f9fc;--soft:#e7edf4;--line:#d5dee8;--text:#172231;--muted:#64758a;--accent:#2b8a75;--accent2:#3978d4;--danger:#cc4b5c;--skin-sidebar:#ffffff;--skin-input:#ffffff;--skin-modal:#ffffff;--skin-card:#ffffff;--shadow:0 12px 32px rgba(27,43,63,.10)}

      html[data-skin] body{background:radial-gradient(circle at 85% 0%,color-mix(in srgb,var(--accent2) 12%,transparent),transparent 32%),var(--bg);color:var(--text)}
      html[data-skin] .sidebar{background:color-mix(in srgb,var(--skin-sidebar) 96%,transparent);border-color:var(--line)}
      html[data-skin] .card{background:linear-gradient(180deg,color-mix(in srgb,var(--skin-card) 97%,white 3%),var(--panel));border-color:var(--line)}
      html[data-skin] .modal{background:var(--skin-modal);border-color:var(--line)}
      html[data-skin] .field input,html[data-skin] .field select,html[data-skin] .field textarea{background:var(--skin-input);color:var(--text);border-color:var(--line)}
      html[data-skin] .task-row,html[data-skin] .habit-row,html[data-skin] .cal-event-row,html[data-skin] .cal-day,html[data-skin] .cal-toggle-row,html[data-skin] .cal-recur-box{background:color-mix(in srgb,var(--panel) 80%,transparent);border-color:var(--line)}
      html[data-skin] .badge{background:var(--panel2);border-color:var(--line);color:var(--text)}
      html[data-skin] .code{background:var(--skin-input);border-color:var(--line)}
      html[data-skin] .scale-btn{background:var(--panel2);border-color:var(--line);color:var(--muted)}
      html[data-skin] .cal-pill{background:var(--panel2)}
      html[data-skin] .field-help::after{background:var(--panel2);color:var(--text);border-color:var(--line)}
      html[data-skin="daylight"] .modal-root{background:rgba(35,47,60,.42)}
      html[data-skin="daylight"] .score-ring:after{background:var(--panel)}
      html[data-skin="daylight"] .primary-btn{color:#fff}
      html[data-skin="daylight"] .cal-day-pick input:checked+span{color:#fff}
      html[data-skin="daylight"] .brand-mark{color:#fff}

      .skin-settings-card{max-width:780px;margin-top:18px}
      .skin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}
      .skin-choice{appearance:none;text-align:left;border:1px solid var(--line);border-radius:15px;padding:13px;background:var(--panel2);color:var(--text);min-width:0;transition:border-color .15s ease,transform .15s ease,background .15s ease}
      .skin-choice:hover{border-color:var(--accent2);transform:translateY(-1px)}
      .skin-choice.active{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent);background:var(--soft)}
      .skin-preview{display:grid;grid-template-columns:repeat(4,1fr);height:38px;border-radius:10px;overflow:hidden;border:1px solid var(--line);margin-bottom:10px}
      .skin-preview i{display:block}
      .skin-name-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .skin-name{font-size:14px;font-weight:850}.skin-selected{font-size:10px;color:var(--accent);font-weight:850;text-transform:uppercase;letter-spacing:.07em}
      .skin-desc{font-size:11px;color:var(--muted);line-height:1.35;margin-top:5px}
      .skin-note{font-size:12px;color:var(--muted);margin-top:12px;line-height:1.45}
      @media(max-width:520px){.skin-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function settingsMarkup(){
    const current=readSkin();
    return `<div class="card settings-card skin-settings-card" id="skinSettingsCard"><div class="kicker">Appearance</div><h2>App Skin</h2><p>Choose between the dark Midnight workspace and the light Daylight workspace.</p><div class="skin-grid">${skins.map(s=>`<button type="button" class="skin-choice ${s.id===current?'active':''}" data-skin-choice="${s.id}" aria-pressed="${s.id===current?'true':'false'}"><span class="skin-preview">${s.swatches.map(c=>`<i style="background:${c}"></i>`).join('')}</span><span class="skin-name-row"><span class="skin-name">${s.name}</span><span class="skin-selected">${s.id===current?'Selected':''}</span></span><span class="skin-desc">${s.desc}</span></button>`).join('')}</div><div class="skin-note">Your skin is an appearance preference only. It does not change or overwrite your goals, tasks, calendar, or cloud data.</div></div>`;
  }

  function ensureSkinSettings(){
    const view=document.querySelector('#settingsView');
    if(!view||view.querySelector('#skinSettingsCard'))return;
    view.insertAdjacentHTML('afterbegin',settingsMarkup());
    bindChoices(view);
  }

  function bindChoices(root=document){
    root.querySelectorAll('[data-skin-choice]').forEach(btn=>{
      btn.onclick=()=>applySkin(btn.dataset.skinChoice,{persist:true,announce:true});
    });
  }

  function refreshChoices(){
    const current=readSkin();
    document.querySelectorAll('[data-skin-choice]').forEach(btn=>{
      const active=btn.dataset.skinChoice===current;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-pressed',active?'true':'false');
      const label=btn.querySelector('.skin-selected');
      if(label)label.textContent=active?'Selected':'';
    });
  }

  ensureStyles();
  applySkin(readSkin(),{persist:false});
  ensureSkinSettings();

  if(typeof render==='function'){
    const baseRender=render;
    render=function(){baseRender();ensureSkinSettings();};
  }

  if(typeof switchView==='function'){
    const baseSwitch=switchView;
    switchView=function(v){baseSwitch(v);if(v==='settings')ensureSkinSettings();};
  }
})();
