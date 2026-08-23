import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') || '';
const APP_URL = Deno.env.get('APP_URL') || 'https://moblair22.github.io/pyqt-auth-demo/goal-command-center/';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Preference = {
  user_id: string;
  enabled: boolean;
  email: string;
  send_time: string;
  timezone: string;
  include_habits: boolean;
  send_empty: boolean;
};

type Goal = { id?: string; title?: string };
type Task = {
  id?: string;
  goalId?: string | null;
  title?: string;
  date?: string;
  done?: boolean;
  kind?: string;
  billName?: string;
  amount?: number;
};
type Habit = {
  id?: string;
  goalId?: string | null;
  title?: string;
  days?: string[];
  weekdays?: number[];
  startDate?: string;
  endDate?: string;
};

type GoalState = {
  goals?: Goal[];
  tasks?: Task[];
  habits?: Habit[];
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}

function localParts(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    date: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function scheduledNow(pref: Preference, now = new Date()) {
  let parts;
  try {
    parts = localParts(pref.timezone || 'UTC', now);
  } catch {
    parts = localParts('UTC', now);
  }
  const [h, m] = String(pref.send_time || '07:00').slice(0, 5).split(':').map(Number);
  const target = (Number.isFinite(h) ? h : 7) * 60 + (Number.isFinite(m) ? m : 0);
  const current = parts.hour * 60 + parts.minute;
  // Supabase Cron should invoke this function every 15 minutes.
  return { ...parts, due: current >= target && current < target + 15 };
}

function weekdayForDate(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

function habitScheduled(habit: Habit, dateKey: string) {
  if (habit.startDate && dateKey < habit.startDate) return false;
  if (habit.endDate && dateKey > habit.endDate) return false;
  const weekdays = Array.isArray(habit.weekdays) && habit.weekdays.length
    ? habit.weekdays.map(Number)
    : [0, 1, 2, 3, 4, 5, 6];
  return weekdays.includes(weekdayForDate(dateKey));
}

function money(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function displayDate(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

function buildItems(state: GoalState, localDate: string, includeHabits: boolean) {
  const goals = Array.isArray(state.goals) ? state.goals : [];
  const goalMap = new Map(goals.map((g) => [String(g.id || ''), g.title || '']));
  const allTasks = Array.isArray(state.tasks) ? state.tasks : [];
  const due = allTasks
    .filter((t) => !t.done && t.date === localDate)
    .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));

  const bills = due.filter((t) => t.kind === 'bill');
  const tasks = due.filter((t) => t.kind !== 'bill');

  const habits = includeHabits
    ? (Array.isArray(state.habits) ? state.habits : []).filter((h) =>
        habitScheduled(h, localDate) && !(Array.isArray(h.days) ? h.days : []).includes(localDate)
      )
    : [];

  return {
    tasks: tasks.map((t) => ({ ...t, goalTitle: goalMap.get(String(t.goalId || '')) || '' })),
    bills: bills.map((t) => ({ ...t, goalTitle: goalMap.get(String(t.goalId || '')) || '' })),
    habits: habits.map((h) => ({ ...h, goalTitle: goalMap.get(String(h.goalId || '')) || '' })),
  };
}

function row(title: string, meta = '', right = '') {
  return `
    <tr>
      <td style="padding:10px 0;vertical-align:top;width:28px"><span style="display:inline-block;width:17px;height:17px;border:2px solid #94a3b8;border-radius:4px;background:#fff"></span></td>
      <td style="padding:8px 8px 8px 0;vertical-align:top">
        <div style="font-size:15px;line-height:1.35;font-weight:700;color:#0f172a">${escapeHtml(title)}</div>
        ${meta ? `<div style="font-size:12px;line-height:1.4;color:#64748b;margin-top:3px">${escapeHtml(meta)}</div>` : ''}
      </td>
      <td style="padding:8px 0;vertical-align:top;text-align:right;font-size:13px;font-weight:800;color:#0f766e;white-space:nowrap">${escapeHtml(right)}</td>
    </tr>`;
}

function section(title: string, rows: string, count: number) {
  if (!count) return '';
  return `
    <div style="margin-top:24px">
      <div style="font-size:12px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#475569;margin-bottom:6px">${escapeHtml(title)} · ${count}</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${rows}</table>
    </div>`;
}

function buildEmail(state: GoalState, pref: Preference, localDate: string) {
  const items = buildItems(state, localDate, !!pref.include_habits);
  const taskRows = items.tasks.map((t: any) => row(t.title || 'Untitled task', t.goalTitle || 'Task')).join('');
  const billRows = items.bills.map((t: any) => row(t.billName || String(t.title || '').replace(/^Bill:\s*/i, '') || 'Bill', t.goalTitle || 'Bill due', money(t.amount))).join('');
  const habitRows = items.habits.map((h: any) => row(h.title || 'Habit', h.goalTitle || 'Habit')).join('');
  const count = items.tasks.length + items.bills.length + items.habits.length;
  const dateLabel = displayDate(localDate);

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>@media print{.no-print{display:none!important}body{background:#fff!important}.paper{box-shadow:none!important;border:0!important}}</style></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <div style="padding:24px 12px">
    <div class="paper" style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #dbe3ee;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.08)">
      <div style="background:#0b1f3a;padding:28px 30px;color:#fff">
        <div style="font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#6ee7b7">Goal Command Center</div>
        <div style="font-size:28px;font-weight:900;line-height:1.15;margin-top:8px">Today's To-Do List</div>
        <div style="font-size:14px;color:#cbd5e1;margin-top:7px">${escapeHtml(dateLabel)}</div>
      </div>
      <div style="padding:26px 30px 30px">
        <div style="display:inline-block;border-radius:999px;background:#ecfdf5;color:#047857;padding:7px 12px;font-size:12px;font-weight:900">${count} ${count === 1 ? 'item' : 'items'} to complete</div>
        ${count ? '' : '<div style="margin-top:22px;padding:18px;border:1px dashed #cbd5e1;border-radius:12px;color:#64748b;text-align:center">Nothing is due today.</div>'}
        ${section('Tasks due today', taskRows, items.tasks.length)}
        ${section('Bills due today', billRows, items.bills.length)}
        ${section('Habits for today', habitRows, items.habits.length)}
        <div class="no-print" style="margin-top:30px;padding:14px 16px;background:#f8fafc;border-radius:12px;color:#64748b;font-size:12px;line-height:1.5">
          <strong style="color:#334155">Want a paper checklist?</strong> Use your email app's Print command (Ctrl/Cmd + P). This email is formatted to print cleanly as a to-do list.
        </div>
        <div class="no-print" style="margin-top:18px;text-align:center"><a href="${escapeHtml(APP_URL)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-size:13px;font-weight:800">Open Goal Command Center</a></div>
      </div>
    </div>
  </div>
</body></html>`;

  const textLines = [
    `GOAL COMMAND CENTER — TODAY'S TO-DO LIST`,
    dateLabel,
    '',
    ...items.tasks.map((t: any) => `☐ ${t.title}${t.goalTitle ? ` — ${t.goalTitle}` : ''}`),
    ...items.bills.map((t: any) => `☐ ${t.billName || t.title}${money(t.amount) ? ` — ${money(t.amount)}` : ''}`),
    ...items.habits.map((h: any) => `☐ ${h.title}${h.goalTitle ? ` — ${h.goalTitle}` : ''}`),
    '',
    'Print this email to use it as a paper checklist.',
  ];

  return { html, text: textLines.join('\n'), count, dateLabel };
}

async function getState(userId: string): Promise<GoalState> {
  const { data, error } = await admin
    .from('goal_app_state')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.data && typeof data.data === 'object' ? data.data : {}) as GoalState;
}

async function sendEmail(pref: Preference, state: GoalState, localDate: string, isTest: boolean) {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    throw new Error('Email provider is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in Supabase Edge Function secrets.');
  }

  const email = buildEmail(state, pref, localDate);
  if (!isTest && email.count === 0 && !pref.send_empty) {
    return { skipped: true, reason: 'No items due', count: 0 };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': isTest
        ? `gcc-test-${pref.user_id}-${Date.now()}`
        : `gcc-daily-${pref.user_id}-${localDate}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [pref.email],
      subject: `${isTest ? '[TEST] ' : ''}Your To-Do List — ${email.dateLabel}`,
      html: email.html,
      text: email.text,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.message || `Email provider returned ${response.status}`);
  }
  return { skipped: false, count: email.count, providerId: result?.id || null };
}

async function sendScheduledFor(pref: Preference, localDate: string) {
  const { data: previous } = await admin
    .from('daily_email_log')
    .select('status')
    .eq('user_id', pref.user_id)
    .eq('local_date', localDate)
    .maybeSingle();
  if (previous?.status === 'sent') return { userId: pref.user_id, skipped: true, reason: 'Already sent' };

  try {
    const state = await getState(pref.user_id);
    const result = await sendEmail(pref, state, localDate, false);
    if (result.skipped) return { userId: pref.user_id, ...result };

    await admin.from('daily_email_log').upsert({
      user_id: pref.user_id,
      local_date: localDate,
      email: pref.email,
      item_count: result.count,
      status: 'sent',
      provider_message_id: result.providerId,
      error: null,
      sent_at: new Date().toISOString(),
    }, { onConflict: 'user_id,local_date' });

    return { userId: pref.user_id, sent: true, count: result.count };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await admin.from('daily_email_log').upsert({
      user_id: pref.user_id,
      local_date: localDate,
      email: pref.email,
      item_count: 0,
      status: 'failed',
      error: message,
      sent_at: new Date().toISOString(),
    }, { onConflict: 'user_id,local_date' });
    return { userId: pref.user_id, sent: false, error: message };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: 'Supabase server configuration missing' }, 500);

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === 'test' ? 'test' : 'scheduled';

  if (mode === 'test') {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return json({ error: 'Sign in first' }, 401);

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return json({ error: 'Invalid session' }, 401);

    const { data: savedPref } = await admin
      .from('daily_email_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const pref: Preference = savedPref || {
      user_id: user.id,
      enabled: false,
      email: user.email || '',
      send_time: '07:00',
      timezone: 'UTC',
      include_habits: false,
      send_empty: true,
    };
    if (!pref.email) return json({ error: 'Add an email address in Notifications first' }, 400);

    const local = localParts(pref.timezone || 'UTC');
    try {
      const state = await getState(user.id);
      const result = await sendEmail(pref, state, local.date, true);
      return json({ ok: true, sent: true, count: result.count, email: pref.email });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  }

  if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
    return json({ error: 'Unauthorized scheduler' }, 401);
  }

  const { data: preferences, error } = await admin
    .from('daily_email_preferences')
    .select('*')
    .eq('enabled', true);
  if (error) return json({ error: error.message }, 500);

  const due: { pref: Preference; date: string }[] = [];
  for (const pref of (preferences || []) as Preference[]) {
    const timing = scheduledNow(pref);
    if (timing.due) due.push({ pref, date: timing.date });
  }

  const results = [];
  for (const item of due) {
    results.push(await sendScheduledFor(item.pref, item.date));
  }

  return json({ ok: true, checked: preferences?.length || 0, due: due.length, results });
});
