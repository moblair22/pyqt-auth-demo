// Daily email notification settings and printable today's-list preview.
// This file does not wrap render/switchView and uses no DOM observers or timers.
(() => {
  const view = document.querySelector('#notificationsView');
  const nav = document.querySelector('[data-view="notifications"]');
  if (!view || !nav) return;

  const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  const moneyFmt = new Intl.NumberFormat(undefined, { style:'currency', currency:'USD' });
  let loadedPreference = null;

  function localKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function ensureStyles() {
    if (document.querySelector('#emailReminderStyles')) return;
    const style = document.createElement('style');
    style.id = 'emailReminderStyles';
    style.textContent = `
      .email-shell{display:grid;gap:16px}.email-hero{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(260px,.6fr);gap:16px;align-items:stretch}.email-hero-copy{padding:22px}.email-hero-copy h2{margin:7px 0 8px;font-size:25px}.email-hero-copy p{margin:0;color:var(--muted);line-height:1.55}.email-hero-art{min-height:180px;border-radius:16px;border:1px solid var(--line);background:linear-gradient(145deg,var(--panel2),var(--panel));display:grid;place-items:center;overflow:hidden;position:relative}.email-hero-art:before{content:'✉';font-size:72px;filter:drop-shadow(0 12px 22px rgba(0,0,0,.2))}.email-hero-art:after{content:'✓  ✓  ✓';position:absolute;bottom:18px;font-size:18px;letter-spacing:10px;color:var(--accent)}
      .email-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}.email-card h3{margin:0 0 5px}.email-card p{margin:0;color:var(--muted);font-size:12px;line-height:1.5}.email-toggle{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 13px;border:1px solid var(--line);border-radius:12px;background:var(--panel2);margin-top:14px}.email-toggle input{width:21px;height:21px;accent-color:var(--accent)}.email-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}.email-status{margin-top:12px;border-radius:10px;padding:10px 12px;font-size:12px;background:var(--panel2);color:var(--muted);border:1px solid var(--line)}.email-status.ok{color:var(--accent)}.email-status.error{color:var(--danger)}
      .email-preview-paper{margin-top:14px;background:#fff;color:#0f172a;border-radius:14px;padding:20px;border:1px solid #dbe3ee}.email-preview-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding-bottom:14px;border-bottom:1px solid #e2e8f0}.email-preview-kicker{font-size:9px;text-transform:uppercase;letter-spacing:.12em;font-weight:900;color:#0f766e}.email-preview-head h4{margin:4px 0 0;font-size:20px;color:#0f172a}.email-preview-date{font-size:11px;color:#64748b}.email-preview-section{margin-top:17px}.email-preview-title{font-size:10px;color:#64748b;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}.email-preview-row{display:grid;grid-template-columns:22px minmax(0,1fr) auto;gap:8px;padding:8px 0;border-bottom:1px solid #f1f5f9;align-items:start}.email-preview-box{width:14px;height:14px;border:2px solid #94a3b8;border-radius:3px;margin-top:1px}.email-preview-name{font-size:12px;font-weight:800;color:#0f172a}.email-preview-meta{font-size:10px;color:#64748b;margin-top:2px}.email-preview-amount{font-size:11px;font-weight:900;color:#0f766e}.email-preview-empty{padding:16px;text-align:center;color:#64748b;font-size:12px}.email-print-note{margin-top:15px;background:#f8fafc;border-radius:9px;padding:10px 11px;font-size:10px;color:#64748b}.email-history{display:grid;gap:7px;margin-top:12px}.email-history-row{display:flex;justify-content:space-between;gap:10px;border:1px solid var(--line);border-radius:10px;padding:9px 11px;background:var(--panel2);font-size:11px}.email-history-row span:last-child{color:var(--muted)}
      @media(max-width:850px){.email-hero,.email-grid{grid-template-columns:1fr}.email-hero-art{min-height:135px}}@media(max-width:520px){.email-actions>*{width:100%}.email-preview-head{display:grid}}
    `;
    document.head.appendChild(style);
  }

  function goalFor(item) {
    return (state.goals || []).find(g => String(g.id) === String(item.goalId));
  }

  function habitScheduledFor(h, key) {
    if (h.startDate && key < h.startDate) return false;
    if (h.endDate && key > h.endDate) return false;
    const [y,m,d] = key.split('-').map(Number);
    const weekday = new Date(y,m-1,d).getDay();
    const weekdays = Array.isArray(h.weekdays) && h.weekdays.length ? h.weekdays.map(Number) : [0,1,2,3,4,5,6];
    return weekdays.includes(weekday);
  }

  function todayItems(includeHabits = false) {
    const key = localKey();
    const due = (state.tasks || []).filter(t => !t.done && t.date === key);
    const bills = due.filter(t => t.kind === 'bill');
    const tasks = due.filter(t => t.kind !== 'bill');
    const habits = includeHabits ? (state.habits || []).filter(h => habitScheduledFor(h,key) && !(h.days || []).includes(key)) : [];
    return { key, tasks, bills, habits };
  }

  function previewRow(item, kind) {
    const g = goalFor(item);
    const title = kind === 'bill' ? (item.billName || String(item.title || '').replace(/^Bill:\s*/i,'')) : item.title;
    const amount = kind === 'bill' && Number(item.amount) > 0 ? moneyFmt.format(Number(item.amount)) : '';
    return `<div class="email-preview-row"><span class="email-preview-box"></span><div><div class="email-preview-name">${esc(title || 'Untitled')}</div><div class="email-preview-meta">${esc(g?.title || (kind === 'habit' ? 'Habit' : kind === 'bill' ? 'Bill due today' : 'Task'))}</div></div><div class="email-preview-amount">${esc(amount)}</div></div>`;
  }

  function previewSection(title, items, kind) {
    if (!items.length) return '';
    return `<div class="email-preview-section"><div class="email-preview-title">${esc(title)} · ${items.length}</div>${items.map(i => previewRow(i,kind)).join('')}</div>`;
  }

  function previewHtml(includeHabits = false) {
    const items = todayItems(includeHabits);
    const count = items.tasks.length + items.bills.length + items.habits.length;
    return `<div class="email-preview-paper"><div class="email-preview-head"><div><div class="email-preview-kicker">Goal Command Center</div><h4>Today's To-Do List</h4></div><div class="email-preview-date">${esc(new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}))}</div></div>${count ? '' : '<div class="email-preview-empty">Nothing is due today.</div>'}${previewSection('Tasks due today',items.tasks,'task')}${previewSection('Bills due today',items.bills,'bill')}${previewSection('Habits for today',items.habits,'habit')}<div class="email-print-note"><strong>Printable:</strong> the email uses this same checklist layout. Use Print in your email app (Ctrl/Cmd + P) for a paper to-do list.</div></div>`;
  }

  function setStatus(text, mode = '') {
    const el = document.querySelector('#dailyEmailStatus');
    if (!el) return;
    el.textContent = text;
    el.className = `email-status ${mode}`;
  }

  function renderPreview() {
    const target = document.querySelector('#dailyEmailPreview');
    if (!target) return;
    target.innerHTML = previewHtml(!!document.querySelector('#dailyEmailHabits')?.checked);
  }

  function printToday() {
    const includeHabits = !!document.querySelector('#dailyEmailHabits')?.checked;
    const items = todayItems(includeHabits);
    const count = items.tasks.length + items.bills.length + items.habits.length;
    const sections = [
      items.tasks.length ? `<h2>Tasks due today</h2>${items.tasks.map(t => `<div class="row"><span class="box"></span><div><strong>${esc(t.title)}</strong><small>${esc(goalFor(t)?.title || 'Task')}</small></div></div>`).join('')}` : '',
      items.bills.length ? `<h2>Bills due today</h2>${items.bills.map(t => `<div class="row"><span class="box"></span><div><strong>${esc(t.billName || t.title)}</strong><small>${esc(goalFor(t)?.title || 'Bill')}</small></div><b>${Number(t.amount)>0?esc(moneyFmt.format(Number(t.amount))):''}</b></div>`).join('')}` : '',
      items.habits.length ? `<h2>Habits for today</h2>${items.habits.map(h => `<div class="row"><span class="box"></span><div><strong>${esc(h.title)}</strong><small>${esc(goalFor(h)?.title || 'Habit')}</small></div></div>`).join('')}` : ''
    ].join('');
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) return toast('Allow pop-ups to print the list');
    w.document.write(`<!doctype html><html><head><title>Today's To-Do List</title><style>body{font-family:Arial,sans-serif;color:#0f172a;max-width:760px;margin:36px auto;padding:0 22px}header{border-bottom:3px solid #0f766e;padding-bottom:14px}h1{margin:0;font-size:28px}header p{color:#64748b;margin:6px 0 0}h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#475569;margin-top:28px}.row{display:grid;grid-template-columns:28px 1fr auto;gap:8px;align-items:start;padding:11px 0;border-bottom:1px solid #e2e8f0}.box{width:17px;height:17px;border:2px solid #64748b;border-radius:4px}.row strong{display:block;font-size:15px}.row small{display:block;color:#64748b;margin-top:3px}.empty{padding:30px 0;color:#64748b}@media print{body{margin:0 auto}}</style></head><body><header><h1>Today's To-Do List</h1><p>${esc(new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}))} · ${count} item${count===1?'':'s'}</p></header>${sections || '<div class="empty">Nothing is due today.</div>'}<script>window.onload=()=>window.print();<\/script></body></html>`);
    w.document.close();
  }

  function shell() {
    const signedIn = !!currentUser;
    return `<div class="email-shell"><div class="email-hero"><div class="card email-hero-copy"><div class="kicker">Daily briefing</div><h2>Your to-do list, delivered every morning.</h2><p>Receive one printable email containing every unfinished task and bill due that day. You can optionally include today's habits too.</p></div><div class="email-hero-art" aria-hidden="true"></div></div><div class="email-grid"><div class="card email-card"><h3>Daily To-Do Email</h3><p>Choose where and when the daily checklist should arrive.</p>${signedIn ? `<div class="email-toggle"><div><strong>Send daily email</strong><div class="task-sub">Only sends when something is due unless you choose otherwise.</div></div><input id="dailyEmailEnabled" type="checkbox"></div><div class="field"><label>Email address</label><input id="dailyEmailAddress" type="email" autocomplete="email" placeholder="you@example.com"></div><div class="form-grid"><div class="field"><label>Send time</label><input id="dailyEmailTime" type="time" step="900" value="07:00"></div><div class="field"><label>Time zone</label><input id="dailyEmailTimezone" value="${esc(defaultTimezone)}"></div></div><div class="email-toggle"><div><strong>Include today's habits</strong><div class="task-sub">Adds scheduled, unfinished habits to the checklist.</div></div><input id="dailyEmailHabits" type="checkbox"></div><div class="email-toggle"><div><strong>Send an empty list</strong><div class="task-sub">Email me even when nothing is due.</div></div><input id="dailyEmailEmpty" type="checkbox"></div><div class="email-actions"><button id="saveDailyEmail" class="primary-btn">Save email settings</button><button id="testDailyEmail" class="secondary-btn">Send test email</button></div><div id="dailyEmailStatus" class="email-status">Loading your notification settings…</div>` : `<div class="email-status">Sign in from Settings to turn on daily email delivery.</div>`}</div><div class="card email-card"><h3>Today's printable preview</h3><p>This is the checklist format the email will use.</p><div id="dailyEmailPreview">${previewHtml(false)}</div><div class="email-actions"><button id="printDailyList" class="secondary-btn">Print today's list</button></div></div></div>${signedIn ? `<div class="card email-card"><h3>Recent email deliveries</h3><p>Your latest daily-email delivery results.</p><div id="dailyEmailHistory" class="email-history"><div class="task-sub">Loading history…</div></div></div>` : ''}</div>`;
  }

  async function loadPreference() {
    if (!cloud || !currentUser) return;
    const { data, error } = await cloud.from('daily_email_preferences').select('*').eq('user_id', currentUser.id).maybeSingle();
    if (error) {
      setStatus('Daily-email backend is not deployed yet. The app UI is ready, but the Supabase table/function still needs to be published.', 'error');
      return;
    }
    loadedPreference = data || null;
    const enabled = document.querySelector('#dailyEmailEnabled');
    const email = document.querySelector('#dailyEmailAddress');
    const time = document.querySelector('#dailyEmailTime');
    const timezone = document.querySelector('#dailyEmailTimezone');
    const habits = document.querySelector('#dailyEmailHabits');
    const empty = document.querySelector('#dailyEmailEmpty');
    if (enabled) enabled.checked = !!data?.enabled;
    if (email) email.value = data?.email || currentUser.email || '';
    if (time) time.value = String(data?.send_time || '07:00').slice(0,5);
    if (timezone) timezone.value = data?.timezone || defaultTimezone;
    if (habits) habits.checked = !!data?.include_habits;
    if (empty) empty.checked = !!data?.send_empty;
    setStatus(data?.enabled ? `Daily email is on for ${String(data.send_time || '07:00').slice(0,5)}.` : 'Daily email is currently off.', data?.enabled ? 'ok' : '');
    renderPreview();
  }

  async function loadHistory() {
    if (!cloud || !currentUser) return;
    const target = document.querySelector('#dailyEmailHistory');
    if (!target) return;
    const { data, error } = await cloud.from('daily_email_log').select('local_date,status,item_count,sent_at').eq('user_id',currentUser.id).order('local_date',{ascending:false}).limit(7);
    if (error) { target.innerHTML = '<div class="task-sub">Delivery history will appear after the backend is deployed.</div>'; return; }
    if (!data?.length) { target.innerHTML = '<div class="task-sub">No daily emails sent yet.</div>'; return; }
    target.innerHTML = data.map(x => `<div class="email-history-row"><strong>${esc(fmt(x.local_date))} · ${esc(x.status)}</strong><span>${Number(x.item_count)||0} item${Number(x.item_count)===1?'':'s'}</span></div>`).join('');
  }

  async function savePreference({ silent = false } = {}) {
    if (!cloud || !currentUser) { toast('Sign in first'); return false; }
    const email = document.querySelector('#dailyEmailAddress')?.value.trim() || '';
    const sendTime = document.querySelector('#dailyEmailTime')?.value || '07:00';
    const timezone = document.querySelector('#dailyEmailTimezone')?.value.trim() || defaultTimezone;
    if (!email || !email.includes('@')) { setStatus('Enter a valid email address.', 'error'); return false; }
    if (!timezone) { setStatus('Enter a time zone.', 'error'); return false; }
    setStatus('Saving…');
    const payload = {
      user_id: currentUser.id,
      enabled: !!document.querySelector('#dailyEmailEnabled')?.checked,
      email,
      send_time: sendTime,
      timezone,
      include_habits: !!document.querySelector('#dailyEmailHabits')?.checked,
      send_empty: !!document.querySelector('#dailyEmailEmpty')?.checked,
      updated_at: new Date().toISOString(),
    };
    const { error } = await cloud.from('daily_email_preferences').upsert(payload,{onConflict:'user_id'});
    if (error) { setStatus(`Could not save: ${error.message}`, 'error'); return false; }
    loadedPreference = payload;
    setStatus(payload.enabled ? `Daily email saved for ${sendTime}.` : 'Email settings saved. Daily delivery is off.', 'ok');
    if (!silent) toast('Email reminder settings saved');
    return true;
  }

  async function sendTest() {
    if (!(await savePreference({silent:true}))) return;
    setStatus('Sending test email…');
    const { data, error } = await cloud.functions.invoke('send-daily-todos',{body:{mode:'test'}});
    if (error) { setStatus(`Test email failed: ${error.message}`, 'error'); return; }
    if (data?.error) { setStatus(`Test email failed: ${data.error}`, 'error'); return; }
    setStatus(`Test email sent to ${data?.email || loadedPreference?.email || 'your email'} with ${Number(data?.count)||0} item${Number(data?.count)===1?'':'s'}.`, 'ok');
    toast('Test email sent');
  }

  function bind() {
    document.querySelector('#saveDailyEmail')?.addEventListener('click',()=>savePreference());
    document.querySelector('#testDailyEmail')?.addEventListener('click',sendTest);
    document.querySelector('#printDailyList')?.addEventListener('click',printToday);
    document.querySelector('#dailyEmailHabits')?.addEventListener('change',renderPreview);
  }

  async function renderNotifications() {
    ensureStyles();
    view.innerHTML = shell();
    bind();
    const title = document.querySelector('#viewTitle');
    if (view.classList.contains('active') && title) title.textContent = 'Notifications';
    if (currentUser) {
      await loadPreference();
      await loadHistory();
    }
  }

  nav.addEventListener('click',()=>setTimeout(renderNotifications,0));
  if (cloud) cloud.auth.onAuthStateChange(()=>setTimeout(()=>{ if (view.classList.contains('active')) renderNotifications(); },0));
  ensureStyles();
  renderNotifications();
})();
