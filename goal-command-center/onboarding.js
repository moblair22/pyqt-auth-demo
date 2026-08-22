// Clean first-account onboarding. Existing cloud users are left unchanged.
(() => {
  const emptyState = () => ({
    goals: [], tasks: [], habits: [], checkins: [], readingList: [],
    meta: { onboardingComplete: false }
  });

  const templates = {
    Health: {
      title: 'Improve My Health & Fitness',
      why: 'Build sustainable routines that improve energy, fitness, nutrition, and sleep.',
      subgoals: ['Exercise consistently each week', 'Improve nutrition and hydration', 'Build a better sleep routine']
    },
    Money: {
      title: 'Strengthen My Finances',
      why: 'Create more financial stability and make steady progress toward my money goals.',
      subgoals: ['Set a clear savings target', 'Review spending every week', 'Build a consistent savings habit']
    },
    Career: {
      title: 'Grow My Career',
      why: 'Build skills and take consistent actions that improve my career options.',
      subgoals: ['Choose one skill to improve', 'Take one career action each week', 'Review progress every month']
    },
    Business: {
      title: 'Build My Business',
      why: 'Turn the business into a real, useful product or service through focused execution.',
      subgoals: ['Define the next major milestone', 'Work on the business every week', 'Get feedback from real users or customers']
    },
    Relationships: {
      title: 'Strengthen My Relationships',
      why: 'Build healthier, more supportive relationships through intentional time and communication.',
      subgoals: ['Reach out consistently', 'Schedule quality time', 'Practice clear and thoughtful communication']
    },
    'Personal Growth': {
      title: 'Invest in Personal Growth',
      why: 'Become more consistent, self-aware, and intentional in everyday life.',
      subgoals: ['Choose one habit to strengthen', 'Complete a weekly reflection', 'Keep going after imperfect days']
    },
    Reading: {
      title: 'Read 6 Books',
      why: 'Read consistently and apply useful ideas from six books.',
      subgoals: Array.from({length: 6}, (_, i) => `Finish book ${i + 1}`),
      reading: true
    }
  };

  function makeGoal(category, t) {
    return {
      id: id(),
      seedKey: t.reading ? 'reading-6' : undefined,
      title: t.title,
      category,
      targetDate: '',
      why: t.why,
      subgoals: t.subgoals.map(title => ({ id: id(), title, targetDate: '', done: false })),
      milestones: []
    };
  }

  function showOnboarding() {
    if (!currentUser || state?.meta?.onboardingComplete) return;
    const selected = new Set();
    modal(`<div class="kicker">Welcome</div>
      <h2>Build your Goal Command Center</h2>
      <p>Choose the areas you want to improve. We’ll create a clean starting workspace that you can edit anytime.</p>
      <div id="areaChoices" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:18px 0">
        ${Object.keys(templates).map(area => `<button type="button" class="secondary-btn onboarding-area" data-area="${esc(area)}" style="justify-content:flex-start">${esc(area)}</button>`).join('')}
      </div>
      <div class="field"><label>Optional custom goal</label><input id="onboardingCustomGoal" placeholder="e.g. Run my first 5K"></div>
      <div class="field"><label>Your name or nickname (optional)</label><input id="onboardingName" placeholder="What should the app call you?"></div>
      <div class="modal-actions"><button id="onboardingBlank" class="secondary-btn">Start blank</button><button id="onboardingCreate" class="primary-btn">Create my workspace</button></div>`);

    const root = document.querySelector('#modalRoot');
    if (root) root.onclick = () => {};

    document.querySelectorAll('.onboarding-area').forEach(btn => {
      btn.onclick = () => {
        const area = btn.dataset.area;
        if (selected.has(area)) {
          selected.delete(area);
          btn.classList.remove('primary-btn');
          btn.classList.add('secondary-btn');
        } else {
          selected.add(area);
          btn.classList.remove('secondary-btn');
          btn.classList.add('primary-btn');
        }
      };
    });

    const finish = (blank = false) => {
      state = emptyState();
      state.meta.onboardingComplete = true;
      state.meta.profileName = document.querySelector('#onboardingName')?.value.trim() || '';

      if (!blank) {
        selected.forEach(area => {
          const t = templates[area];
          if (!t) return;
          const g = makeGoal(area, t);
          state.goals.push(g);
          if (t.reading) {
            state.meta.readingTarget = 6;
            state.meta.readingGoalKey = 'reading-6';
          }
        });

        const custom = document.querySelector('#onboardingCustomGoal')?.value.trim();
        if (custom) {
          state.goals.unshift({
            id: id(), title: custom, category: 'Personal', targetDate: '',
            why: '', subgoals: [], milestones: []
          });
        }
      }

      saveLocal();
      render();
      close();
      switchView('dashboard');
      pushCloud();
      toast(blank ? 'Blank workspace created' : 'Your workspace is ready');
    };

    document.querySelector('#onboardingBlank').onclick = () => finish(true);
    document.querySelector('#onboardingCreate').onclick = () => {
      const custom = document.querySelector('#onboardingCustomGoal')?.value.trim();
      if (!selected.size && !custom) return toast('Choose at least one area or add a custom goal');
      finish(false);
    };
  }

  // Override the core first-sync behavior so brand-new accounts never inherit browser demo data.
  pullCloud = async function () {
    if (!cloud || !currentUser) return;
    cloudBusy = true;
    setSyncStatus('Syncing…', 'sync');
    const { data, error } = await cloud.from('goal_app_state').select('data,updated_at').eq('user_id', currentUser.id).maybeSingle();
    cloudBusy = false;

    if (error) {
      console.error(error);
      setSyncStatus('Sync error', 'error');
      toast('Could not load cloud data');
      return;
    }

    if (data?.data && typeof data.data === 'object') {
      suppressCloudPush = true;
      state = data.data;
      normalize();
      saveLocal();
      render();
      suppressCloudPush = false;
      setSyncStatus('Synced', 'ok');
      return;
    }

    suppressCloudPush = true;
    state = emptyState();
    normalize();
    saveLocal();
    render();
    suppressCloudPush = false;
    setSyncStatus('New account', 'ok');
    setTimeout(showOnboarding, 50);
  };

  window.__gccReleaseCloud?.();
})();
