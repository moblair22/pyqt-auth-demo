// Clear shared/demo browser state before the delayed Supabase session is processed.
// Existing signed-in users are restored from their Supabase row by onboarding.js.
(() => {
  if (typeof cloudConfigured === 'undefined' || !cloudConfigured || typeof state === 'undefined') return;

  const emptyState = () => ({
    goals: [],
    tasks: [],
    habits: [],
    checkins: [],
    readingList: [],
    meta: { onboardingComplete: true }
  });

  suppressCloudPush = true;
  state = emptyState();
  normalize();
  saveLocal();
  render();
  suppressCloudPush = false;
})();
