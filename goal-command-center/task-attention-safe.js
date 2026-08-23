// Stable task attention system: dashboard alerts + calendar urgency colors without DOM observers.
(() => {
  const SOON_DAYS = 3;

  function localKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDaysKey(key, days) {
    const [y, m, d] = String(key).split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    return localKey(dt);
  }

  function prettyDate(key) {
    if (!key) return 'No date';
    const [y, m, d] = String(key).split('-').map(Number);
    if (!y || !m || !d) return key;
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  function goalFor(task) {
    return (state.goals || []).find(g => String(g.id) === String(task.goalId));
  }

  function classify(task) {
    if (!task || task.done || !task.date) return null;
    const today = localKey();
    const soonEnd = addDaysKey(today, SOON_DAYS);
    if (task.date < today) return 'overdue';
    if (task.date === today) return 'today';
    if (task.date > today && task.date <= soonEnd) return 'soon';
    return null;
  }

  function attentionData() {
    const groups = { overdue: [], today: [], soon: [] };
    (state.tasks || []).forEach(task => {
      const kind = classify(task);
      if (kind) groups[kind].push(task);
    });
    groups.overdue.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    groups.today.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    groups.soon.sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.title || '').localeCompare(String(b.title || '')));
    return groups;
  }

  function statusLabel(kind) {
    return kind === 'overdue' ? 'Overdue' : kind === 'today' ? 'Due today' : 'Due soon';
  }

  function taskRow(task, kind) {
    const goal = goalFor(task);
    const recurring = !!task.seriesId;
    return `<div class="attention-task ${kind}">
      <input type="checkbox" class="attention-check" data-id="${esc(task.id)}" aria-label="Mark ${esc(task.title)} complete">
      <div class="attention-main">
        <div class="attention-title">${esc(task.title)}</div>
        <div class="attention-meta">${esc(goal?.title || 'Unlinked task')} · ${esc(prettyDate(task.date))}${recurring ? ' · ↻ recurring' : ''}</div>
      </div>
      <span class="attention-badge ${kind}">${statusLabel(kind)}</span>
      <button type="button" class="attention-delete" data-id="${esc(task.id)}">Delete</button>
    </div>`;
  }

  function attentionItems(groups) {
    return [
      ...groups.overdue.map(t => [t, 'overdue']),
      ...groups.today.map(t => [t, 'today']),
      ...groups.soon.map(t => [t, 'soon'])
    ];
  }

  function summaryMarkup(groups) {
    return `<div class="attention-summary">
      <div class="attention-stat overdue"><strong>${groups.overdue.length}</strong><span>Overdue</span></div>
      <div class="attention-stat today"><strong>${groups.today.length}</strong><span>Due today</span></div>
      <div class="attention-stat soon"><strong>${groups.soon.length}</strong><span>Next 3 days</span></div>
    </div>`;
  }

  function ensureStyles() {
    if (document.querySelector('#taskAttentionStyles')) return;
    const style = document.createElement('style');
    style.id = 'taskAttentionStyles';
    style.textContent = `
      .task-attention{margin-top:28px}
      .task-attention-head{display:flex;align-items:end;justify-content:space-between;gap:14px;margin-bottom:12px}
      .task-attention-head h2{margin:0;font-size:18px}.task-attention-head p{margin:3px 0 0;color:var(--muted);font-size:13px}
      .attention-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}
      .attention-stat{border:1px solid var(--line);border-radius:14px;padding:13px 14px;background:var(--panel2)}
      .attention-stat strong{display:block;font-size:24px;line-height:1.1}.attention-stat span{display:block;margin-top:5px;color:var(--muted);font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em}
      .attention-stat.overdue strong{color:var(--danger)}.attention-stat.today strong{color:var(--accent)}.attention-stat.soon strong{color:var(--accent2)}
      .attention-list{display:grid;gap:8px}
      .attention-task{display:flex;align-items:center;gap:11px;padding:12px 13px;border:1px solid var(--line);border-radius:13px;background:var(--panel)}
      .attention-task.overdue{border-left:4px solid var(--danger)}.attention-task.today{border-left:4px solid var(--accent)}.attention-task.soon{border-left:4px solid var(--accent2)}
      .attention-check{width:18px;height:18px;accent-color:var(--accent);flex:0 0 auto}.attention-main{min-width:0;flex:1}.attention-title{font-size:14px;font-weight:800;overflow:hidden;text-overflow:ellipsis}.attention-meta{font-size:11px;color:var(--muted);margin-top:3px;overflow:hidden;text-overflow:ellipsis}
      .attention-badge{flex:0 0 auto;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:850;border:1px solid var(--line);white-space:nowrap}.attention-badge.overdue{color:var(--danger)}.attention-badge.today{color:var(--accent)}.attention-badge.soon{color:var(--accent2)}
      .attention-delete{border:1px solid var(--line);background:transparent;color:var(--danger);border-radius:10px;padding:7px 9px;font-size:11px;font-weight:800}
      .attention-clear{padding:18px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:14px}
      .today-overdue{margin:18px 0 6px}.today-overdue .task-attention-head{margin-bottom:10px}

      .cal-day.task-overdue{border-color:var(--danger);background:color-mix(in srgb,var(--danger) 12%,var(--panel))}
      .cal-day.task-today{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--panel))}
      .cal-day.task-soon{border-color:var(--accent2);background:color-mix(in srgb,var(--accent2) 11%,var(--panel))}
      .cal-day.task-overdue .cal-num{color:var(--danger)}.cal-day.task-today .cal-num{color:var(--accent)}.cal-day.task-soon .cal-num{color:var(--accent2)}
      .cal-attention-chip{display:inline-flex;align-items:center;width:max-content;max-width:100%;padding:3px 6px;border-radius:999px;font-size:9px;font-weight:850;line-height:1.1;margin-top:auto;white-space:nowrap;background:var(--panel2)}
      .cal-attention-chip.overdue{color:var(--danger)}.cal-attention-chip.today{color:var(--accent)}.cal-attention-chip.soon{color:var(--accent2)}

      @media(max-width:650px){
        .attention-summary{grid-template-columns:repeat(3,1fr);gap:6px}.attention-stat{padding:10px 8px}.attention-stat strong{font-size:20px}.attention-stat span{font-size:8px}.attention-task{align-items:flex-start;flex-wrap:wrap}.attention-main{flex-basis:calc(100% - 34px)}.attention-badge{margin-left:29px}.attention-delete{margin-left:auto}.task-attention-head{align-items:flex-start}
        .cal-attention-chip{font-size:7px;padding:2px 4px}
      }
    `;
    document.head.appendChild(style);
  }

  function bindRows(root) {
    if (!root) return;
    root.querySelectorAll('.attention-check').forEach(box => {
      box.onchange = () => {
        const task = (state.tasks || []).find(t => String(t.id) === String(box.dataset.id));
        if (!task) return;
        task.done = true;
        save();
        if (typeof toast === 'function') toast('Task completed');
      };
    });
    root.querySelectorAll('.attention-delete').forEach(btn => {
      btn.onclick = () => {
        const task = (state.tasks || []).find(t => String(t.id) === String(btn.dataset.id));
        if (!task) return;
        state.tasks = (state.tasks || []).filter(t => String(t.id) !== String(btn.dataset.id));
        save();
        if (typeof toast === 'function') toast(task.seriesId ? 'Recurring occurrence deleted' : 'Task deleted');
      };
    });
  }

  function injectDashboard() {
    const view = document.querySelector('#dashboardView');
    if (!view) return;
    view.querySelector('#taskAttentionSection')?.remove();
    const groups = attentionData();
    const items = attentionItems(groups);
    const html = `<section id="taskAttentionSection" class="task-attention">
      <div class="task-attention-head"><div><h2>Task Attention</h2><p>Deadlines that need action now or within the next 3 days.</p></div></div>
      ${summaryMarkup(groups)}
      <div class="card"><div class="attention-list">${items.length ? items.map(([t,k]) => taskRow(t,k)).join('') : '<div class="attention-clear">Nothing urgent right now. You are caught up.</div>'}</div></div>
    </section>`;
    const metrics = view.querySelector('.grid.grid-4');
    if (metrics) metrics.insertAdjacentHTML('afterend', html); else view.insertAdjacentHTML('afterbegin', html);
    bindRows(view.querySelector('#taskAttentionSection'));
  }

  function injectTodayOverdue() {
    const view = document.querySelector('#todayView');
    if (!view) return;
    view.querySelector('#todayOverdueSection')?.remove();
    const overdue = attentionData().overdue;
    if (!overdue.length) return;
    const html = `<section id="todayOverdueSection" class="today-overdue">
      <div class="task-attention-head"><div><h2>Overdue</h2><p>These unfinished tasks passed their due date.</p></div></div>
      <div class="card"><div class="attention-list">${overdue.map(t => taskRow(t,'overdue')).join('')}</div></div>
    </section>`;
    const firstGrid = view.querySelector('.grid.grid-2');
    if (firstGrid) firstGrid.insertAdjacentHTML('afterend', html); else view.insertAdjacentHTML('afterbegin', html);
    bindRows(view.querySelector('#todayOverdueSection'));
  }

  function calendarStatusForDate(key) {
    const unfinished = (state.tasks || []).filter(t => !t.done && t.date === key);
    if (!unfinished.length) return null;
    const kind = classify(unfinished[0]);
    return kind ? { kind, count: unfinished.length } : null;
  }

  function decorateCalendarDays() {
    const view = document.querySelector('#calendarView');
    if (!view) return;
    view.querySelector('#calendarTaskAttentionSection')?.remove();

    view.querySelectorAll('.cal-day[data-cal-date]').forEach(cell => {
      const info = calendarStatusForDate(cell.dataset.calDate);
      cell.classList.remove('task-overdue','task-today','task-soon');
      cell.querySelector('.cal-attention-chip')?.remove();
      if (!info) return;

      cell.classList.add(`task-${info.kind}`);
      const chip = document.createElement('span');
      chip.className = `cal-attention-chip ${info.kind}`;
      chip.textContent = info.kind === 'overdue'
        ? `${info.count} overdue`
        : info.kind === 'today'
          ? `${info.count} today`
          : `${info.count} soon`;
      cell.appendChild(chip);
    });
  }

  function refreshAttention() {
    ensureStyles();
    injectDashboard();
    injectTodayOverdue();
    decorateCalendarDays();
  }

  ensureStyles();
  refreshAttention();

  if (typeof render === 'function') {
    const baseRender = render;
    render = function() {
      baseRender();
      refreshAttention();
    };
  }

  // Calendar redraws itself for month navigation and when opening the Calendar tab.
  // Use a single delegated click listener instead of observing/mutating the DOM recursively.
  document.addEventListener('click', event => {
    const trigger = event.target?.closest?.('#calPrev,#calNext,#calToday,[data-view="calendar"]');
    if (!trigger) return;
    setTimeout(decorateCalendarDays, 0);
  });
})();
