// Personal goals + reading list extension for Goal Command Center
(() => {
  const SEED_VERSION = 1;
  const READING_TARGET = 6;

  const seededGoals = [
    {
      key:'tudrunt-beta', title:'Launch Tudrunt Web Beta', category:'Business', targetDate:'',
      why:'Finish the core product, improve the experience, test it, and launch a useful beta.',
      subgoals:['Finish the core beta features','Improve design and user experience','Complete testing and fix launch-blocking bugs','Recruit the first 10 beta testers','Launch the web beta']
    },
    {
      key:'save-20k', title:'Save $20,000', category:'Money', targetDate:'2026-12-31',
      why:'Build stronger financial stability and make consistent savings progress.',
      subgoals:['Follow the monthly savings plan','Track savings progress each month','Reach the $20,000 target by year-end']
    },
    {
      key:'health-fitness', title:'Improve Health & Fitness', category:'Health', targetDate:'',
      why:'Build sustainable routines that improve energy, fitness, nutrition, and sleep.',
      subgoals:['Exercise consistently each week','Improve everyday nutrition and hydration','Build a consistent sleep routine']
    },
    {
      key:'focus-discipline', title:'Build Stronger Focus & Discipline', category:'Personal', targetDate:'',
      why:'Become more consistent and keep moving forward even when the schedule changes.',
      subgoals:['Use a sustainable daily routine','Plan the week before it starts','Complete a short daily check-in']
    },
    {
      key:'friendships', title:'Build Supportive Friendships', category:'Relationships', targetDate:'',
      why:'Create stronger, healthier social connections.',
      subgoals:['Make time for meaningful conversations','Reach out consistently','Spend quality time with supportive people']
    },
    {
      key:'relationship', title:'Strengthen Dating & Romantic Life', category:'Relationships', targetDate:'',
      why:'Give meaningful attention to building a healthy romantic relationship.',
      subgoals:['Make intentional time for dating and connection','Communicate clearly and confidently','Reflect on what a healthy relationship looks like']
    },
    {
      key:'time-self', title:'Spend Quality Time With Myself', category:'Personal', targetDate:'',
      why:'Make room for rest, reflection, enjoyment, and personal reset time.',
      subgoals:['Plan regular solo time','Do activities I genuinely enjoy','Protect time for reflection and reset']
    },
    {
      key:'style-grooming', title:'Upgrade Personal Style & Grooming', category:'Personal', targetDate:'',
      why:'Build a polished personal style and consistent grooming routine.',
      subgoals:['Build a better everyday wardrobe','Create a consistent grooming routine','Improve skincare and presentation']
    },
    {
      key:'communication', title:'Improve Communication & Social Confidence', category:'Personal', targetDate:'',
      why:'Become more comfortable, clear, and confident when communicating with people.',
      subgoals:['Practice confident conversation','Improve listening and communication','Take regular social-confidence actions']
    },
    {
      key:'faith-reflection', title:'Grow in Faith & Reflection', category:'Personal', targetDate:'',
      why:'Create consistent space for faith, reflection, gratitude, and spiritual growth.',
      subgoals:['Set aside regular reflection time','Build a consistent faith practice','Review personal values and direction']
    },
    {
      key:'reading-6', title:'Read 6 Self-Growth Books', category:'Learning', targetDate:'2026-12-31',
      why:'Complete six self-growth books and apply the best lessons.',
      subgoals:Array.from({length:6},(_,i)=>`Finish self-growth book ${i+1}`)
    },
    {
      key:'professional-growth', title:'Improve Professional Skills & Report Writing', category:'Career', targetDate:'',
      why:'Keep improving report quality, professional skills, and job performance.',
      subgoals:['Improve report-writing quality','Complete useful training','Review progress and skill gaps regularly']
    }
  ];

  function makeGoal(g){
    return {
      id:id(), seedKey:g.key, title:g.title, category:g.category, targetDate:g.targetDate, why:g.why,
      subgoals:g.subgoals.map(title=>({id:id(),title,targetDate:'',done:false})),
      milestones:[]
    };
  }

  function mergePersonalData(){
    if(!state || typeof state!=='object') return;
    state.meta=state.meta||{};
    state.readingList=Array.isArray(state.readingList)?state.readingList:[];
    if((state.meta.personalGoalSeedVersion||0) >= SEED_VERSION) return;

    const demoTitles=new Set(['Launch my web project','Build an emergency fund']);
    state.goals=(state.goals||[]).filter(g=>!demoTitles.has(g.title));

    seededGoals.forEach(seed=>{
      const exists=state.goals.some(g=>g.seedKey===seed.key || g.title===seed.title);
      if(!exists) state.goals.push(makeGoal(seed));
    });

    state.meta.personalGoalSeedVersion=SEED_VERSION;
    state.meta.readingTarget=READING_TARGET;
    save();
  }

  function syncReadingGoal(){
    const readingGoal=state.goals.find(g=>g.seedKey==='reading-6' || g.title==='Read 6 Self-Growth Books');
    if(!readingGoal) return;
    readingGoal.subgoals=readingGoal.subgoals||[];
    while(readingGoal.subgoals.length<READING_TARGET){
      const n=readingGoal.subgoals.length+1;
      readingGoal.subgoals.push({id:id(),title:`Finish self-growth book ${n}`,targetDate:'',done:false});
    }
    const finished=(state.readingList||[]).filter(b=>b.status==='Finished').length;
    readingGoal.subgoals.slice(0,READING_TARGET).forEach((sg,i)=>sg.done=i<finished);
  }

  function injectReadingUI(){
    if(!document.querySelector('[data-view="reading"]')){
      const habitsBtn=document.querySelector('[data-view="habits"]');
      const btn=document.createElement('button');
      btn.className='nav-item';btn.dataset.view='reading';btn.innerHTML='▤ <span>Reading</span>';
      habitsBtn?.after(btn);
    }
    if(!document.querySelector('#readingView')){
      const section=document.createElement('section');section.id='readingView';section.className='view';
      document.querySelector('#checkinView')?.before(section);
    }
    if(!document.querySelector('#readingExtensionStyle')){
      const style=document.createElement('style');style.id='readingExtensionStyle';
      style.textContent=`
        .reading-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:18px}
        .book-row{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(120px,.7fr) minmax(120px,.7fr) auto;gap:12px;align-items:center;padding:15px 0;border-bottom:1px solid rgba(255,255,255,.08)}
        .book-row:last-child{border-bottom:0}.book-title{font-weight:800}.book-author{font-size:13px;opacity:.7;margin-top:3px}
        .book-row select,.book-row input{width:100%}.reading-progress-label{font-size:12px;opacity:.7;margin-bottom:5px}
        @media(max-width:800px){.reading-summary{grid-template-columns:1fr}.book-row{grid-template-columns:1fr}.book-row .icon-btn{justify-self:end}}
      `;
      document.head.appendChild(style);
    }
  }

  function bookProgress(b){
    const total=Number(b.totalPages)||0, read=Math.min(Number(b.pagesRead)||0,total||Infinity);
    return total>0?Math.min(100,Math.round(read/total*100)):(b.status==='Finished'?100:0);
  }

  function renderReading(){
    injectReadingUI();
    state.readingList=Array.isArray(state.readingList)?state.readingList:[];
    const books=state.readingList;
    const finished=books.filter(b=>b.status==='Finished').length;
    const reading=books.filter(b=>b.status==='Reading').length;
    const overallPct=Math.min(100,Math.round(finished/READING_TARGET*100));
    const rows=books.map(b=>{
      const p=bookProgress(b);
      return `<div class="book-row">
        <div><div class="book-title">${esc(b.title||'Untitled book')}</div><div class="book-author">${esc(b.author||'Author not added')}</div><div class="progress" style="margin-top:9px"><span style="width:${p}%"></span></div></div>
        <div><div class="reading-progress-label">Status</div><select class="book-status" data-id="${b.id}"><option ${b.status==='Want to read'?'selected':''}>Want to read</option><option ${b.status==='Reading'?'selected':''}>Reading</option><option ${b.status==='Finished'?'selected':''}>Finished</option></select></div>
        <div><div class="reading-progress-label">Pages</div><div style="display:flex;gap:6px"><input class="book-pages-read" data-id="${b.id}" type="number" min="0" value="${Number(b.pagesRead)||0}" aria-label="Pages read"><input class="book-pages-total" data-id="${b.id}" type="number" min="0" value="${Number(b.totalPages)||0}" aria-label="Total pages"></div></div>
        <button class="icon-btn del-book" data-id="${b.id}" title="Delete book">×</button>
      </div>`;
    }).join('') || `<div class="empty">Your reading list is empty. Add your first self-growth book.</div>`;

    const el=document.querySelector('#readingView');if(!el)return;
    el.innerHTML=`
      <div class="section-head" style="margin-top:0"><div><h2>Reading List</h2><p>Six-book self-growth challenge · target December 31, 2026.</p></div><button id="addBookBtn" class="secondary-btn">+ Add book</button></div>
      <div class="reading-summary"><div class="card"><div class="metric-label">Finished</div><div class="metric-value">${finished}/${READING_TARGET}</div></div><div class="card"><div class="metric-label">Reading now</div><div class="metric-value">${reading}</div></div><div class="card"><div class="metric-label">Challenge progress</div><div class="metric-value">${overallPct}%</div><div class="progress"><span style="width:${overallPct}%"></span></div></div></div>
      <div class="card"><div class="list">${rows}</div></div>`;

    document.querySelector('#addBookBtn')?.addEventListener('click',openBookModal);
    document.querySelectorAll('.book-status').forEach(x=>x.onchange=()=>updateBook(x.dataset.id,{status:x.value}));
    document.querySelectorAll('.book-pages-read').forEach(x=>x.onchange=()=>updateBook(x.dataset.id,{pagesRead:Number(x.value)||0}));
    document.querySelectorAll('.book-pages-total').forEach(x=>x.onchange=()=>updateBook(x.dataset.id,{totalPages:Number(x.value)||0}));
    document.querySelectorAll('.del-book').forEach(x=>x.onclick=()=>{state.readingList=state.readingList.filter(b=>b.id!==x.dataset.id);syncReadingGoal();save()});
  }

  function updateBook(bookId,patch){
    const b=state.readingList.find(x=>x.id===bookId);if(!b)return;
    Object.assign(b,patch);
    if(b.totalPages>0 && b.pagesRead>=b.totalPages) b.status='Finished';
    syncReadingGoal();save();
  }

  function openBookModal(){
    modal(`<h2>Add a book</h2><div class="field"><label>Title</label><input id="bookTitle" placeholder="Book title"></div><div class="field"><label>Author</label><input id="bookAuthor" placeholder="Author"></div><div class="form-grid"><div class="field"><label>Total pages</label><input id="bookTotalPages" type="number" min="0" placeholder="0"></div><div class="field"><label>Status</label><select id="bookStatus"><option>Want to read</option><option>Reading</option><option>Finished</option></select></div></div><div class="field"><label>Notes / takeaway</label><textarea id="bookNotes" placeholder="What do you want to remember or apply?"></textarea></div><div class="modal-actions"><button class="secondary-btn close-modal">Cancel</button><button id="saveBookBtn" class="primary-btn">Add book</button></div>`);
    document.querySelector('#saveBookBtn').onclick=()=>{
      const title=document.querySelector('#bookTitle').value.trim();if(!title)return toast('Enter a book title');
      state.readingList.unshift({id:id(),title,author:document.querySelector('#bookAuthor').value.trim(),totalPages:Number(document.querySelector('#bookTotalPages').value)||0,pagesRead:0,status:document.querySelector('#bookStatus').value,notes:document.querySelector('#bookNotes').value.trim()});
      syncReadingGoal();save();close();switchView('reading');
    };
  }

  injectReadingUI();

  const coreSwitchView=switchView;
  switchView=function(v){
    coreSwitchView(v);
    if(v==='reading'){
      renderReading();
      const title=document.querySelector('#viewTitle');if(title)title.textContent='Reading List';
      document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view==='reading'));
    }
  };

  const coreRender=render;
  render=function(){coreRender();injectReadingUI();renderReading();};

  if(typeof pullCloud==='function'){
    const corePullCloud=pullCloud;
    pullCloud=async function(){await corePullCloud();mergePersonalData();syncReadingGoal();saveLocal();render();};
  }

  mergePersonalData();
  syncReadingGoal();
  saveLocal();
  render();

  if(typeof cloud!=='undefined' && cloud){
    cloud.auth.onAuthStateChange(()=>setTimeout(()=>{mergePersonalData();syncReadingGoal();saveLocal();render();queueCloudSave();},600));
  }
})();
