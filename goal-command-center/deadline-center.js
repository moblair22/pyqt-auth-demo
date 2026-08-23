// Dashboard deadline center: overdue, due today, and next 3 days.
// No DOM observers or timers. It refreshes only through the app's normal render path.
(() => {
  if (window.__gccDeadlineCenterInstalled) return;
  window.__gccDeadlineCenterInstalled = true;

  const SOON_DAYS = 3;
  const money = new Intl.NumberFormat(undefined, { style:'currency', currency:'USD' });

  function localKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDaysKey(key, days) {
    const [y,m,d] = String(key).split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return localKey(dt);
  }

  function goalFor(task) {
    return (state.goals || []).find(g => String(g.id) === String(task.goalId));
  }

  function taskStatus(task) {
    if (!task || task.done || !task.date) return null;
    const today = localKey();
    const soonEnd = addDaysKey(today, SOON_DAYS);
    if (task.date < today) return 'overdue';
    if (task.date === today) return 'today';
    if (task.date > today && task.date <= soonEnd) return 'soon';
    return null;
  }

  function groups() {
    const out = { overdue:[], today:[], soon:[] };
    (state.tasks || []).forEach(task => {
      const status = taskStatus(task);
      if (status) out[status].push(task);
    });
    out.overdue.sort((a,b) => String(a.date).localeCompare(String(b.date)));
    out.today.sort((a,b) => String(a.title || '').localeCompare(String(b.title || '')));
    out.soon.sort((a,b) => String(a.date).localeCompare(String(b.date)) || String(a.title || '').localeCompare(String(b.title || '')));
    return out;
  }

  function label(status) {
    return status === 'overdue' ? 'Past due' : status === 'today' ? 'Due today' : 'Upcoming';
  }

  function row(task, status) {
    const goal = goalFor(task);
    const bill = task.kind === 'bill';
    const amount = bill && Number(task.amount) > 0 ? ` · ${money.format(Number(task.amount))}` : '';
    const recurrence = task.seriesId ? ' · ↻ recurring' : '';
    return `<div class="deadline-row ${status}">
      <input type="checkbox" class="deadline-check" data-id="${esc(task.id)}" aria-label="Complete ${esc(task.title)}">
      <div class="deadline-main">
        <div class="deadline-title">${esc(task.title)}</div>
        <div class="deadline-meta">${esc(goal?.title || 'Unlinked task')} · ${esc(fmt(task.date))}${esc(amount)}${recurrence}</div>
      </div>
      <span class="deadline-status ${status}">${label(status)}</span>
      ${goal ? `<button type="button" class="link-btn deadline-open-goal" data-goal-id="${esc(goal.id)}">Open</button>` : ''}
    </div>`;
  }

  function ensureStyles() {
    if (document.querySelector('#deadlineCenterStyles')) return;
    const style = document.createElement('style');
    style.id = 'deadlineCenterStyles';
    style.textContent = `
      .deadline-center{margin-top:18px}
      .deadline-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:11px}
      .deadline-head h2{margin:0;font-size:18px}.deadline-head p{margin:4px 0 0;color:var(--muted);font-size:12px}
      .deadline-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:10px}
      .deadline-stat{border:1px solid var(--line);border-radius:13px;padding:12px;background:var(--panel2)}
      .deadline-stat strong{display:block;font-size:22px}.deadline-stat span{display:block;margin-top:4px;color:var(--muted);font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
      .deadline-stat.overdue strong{color:var(--danger)}.deadline-stat.today strong{color:var(--accent)}.deadline-stat.soon strong{color:var(--accent2)}
      .deadline-list{display:grid;gap:8px}.deadline-row{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:11px;padding:10px 11px;background:var(--panel2)}
      .deadline-row.overdue{border-left:4px solid var(--danger)}.deadline-row.today{border-left:4px solid var(--accent)}.deadline-row.soon{border-left:4px solid var(--accent2)}
      .deadline-row input{width:18px;height:18px;accent-color:var(--accent);flex:0 0 auto}.deadline-main{min-width:0;flex:1}.deadline-title{font-size:13px;font-weight:850;overflow:hidden;text-overflow:ellipsis}.deadline-meta{font-size:10px;color:var(--muted);margin-top:3px;overflow:hidden;text-overflow:ellipsis}
      .deadline-status{border:1px solid var(--line);border-radius:999px;padding:4px 7px;font-size:9px;font-weight:850;white-space:nowrap}.deadline-status.overdue{color:var(--danger)}.deadline-status.today{color:var(--accent)}.deadline-status.soon{color:var(--accent2)}
      .deadline-subhead{font-size:10px;color:var(--muted);font-weight:850;text-transform:uppercase;letter-spacing:.06em;margin:12px 0 7px}.deadline-empty{padding:15px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:11px}
      @media(max-width:650px){.deadline-stats{grid-template-columns:repeat(3,1fr);gap:5px}.deadline-stat{padding:9px 7px}.deadline-stat strong{font-size:19px}.deadline-stat span{font-size:8px}.deadline-row{align-items:flex-start;flex-wrap:wrap}.deadline-main{flex-basis:calc(100% - 32px)}.deadline-status{margin-left:28px}.deadline-open-goal{margin-left:auto}}
    `;
    document.head.appendChild(style);
  }

  function bind(section) {
    section.querySelectorAll('.deadline-check').forEach(box => {
      box.onchange = () => {
        const task = (state.tasks || []).find(t => String(t.id) === String(box.dataset.id));
        if (!task) return;
        task.done = box.checked;
        save();
        toast('Task completed');
      };
    });
    section.querySelectorAll('.deadline-open-goal').forEach(btn => {
      btn.onclick = () => openGoal(btn.dataset.goalId);
    });
  }

  function renderDeadlineCenter() {
    ensureStyles();
    const view = document.querySelector('#dashboardView');
    if (!view) return;
    view.querySelector('#deadlineCenter')?.remove();

    const g = groups();
    const upcomingPreview = g.soon.slice(0, 3);
    const urgent = [
      ...g.overdue.map(t => [t,'overdue']),
      ...g.today.map(t => [t,'today'])
    ];

    const urgentHtml = urgent.length
      ? urgent.map(([t,s]) => row(t,s)).join('')
      : '<div class="deadline-empty">No past-due or due-today tasks.</div>';
    const upcomingHtml = upcomingPreview.length
      ? upcomingPreview.map(t => row(t,'soon')).join('')
      : '<div class="deadline-empty">Nothing due in the next 3 days.</div>';

    const html = `<section id="deadlineCenter" class="deadline-center">
      <div class="deadline-head"><div><h2>Due Dates & Task Attention</h2><p>Past due, due today, and your next 3 upcoming tasks within the next 3 days.</p></div></div>
      <div class="deadline-stats">
        <div class="deadline-stat overdue"><strong>${g.overdue.length}</strong><span>Past due</span></div>
        <div class="deadline-stat today"><strong>${g.today.length}</strong><span>Due today</span></div>
        <div class="deadline-stat soon"><strong>${g.soon.length}</strong><span>Next 3 days</span></div>
      </div>
      <div class="card">
        <div class="deadline-subhead">Needs attention</div>
        <div class="deadline-list">${urgentHtml}</div>
        <div class="deadline-subhead">Next 3 upcoming</div>
        <div class="deadline-list">${upcomingHtml}</div>
      </div>
    </section>`;

    const metrics = view.querySelector('.grid.grid-4');
    if (metrics) metrics.insertAdjacentHTML('afterend', html);
    else view.insertAdjacentHTML('afterbegin', html);
    bind(view.querySelector('#deadlineCenter'));
  }

  ensureStyles();
  const baseRender = render;
  render = function() {
    baseRender();
    renderDeadlineCenter();
  };
  renderDeadlineCenter();
})();
