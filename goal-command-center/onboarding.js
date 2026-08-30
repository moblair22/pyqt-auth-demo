// Privacy-safe account bootstrap. Existing Supabase state is loaded unchanged;
// brand-new accounts are initialized with an empty workspace only.
(() => {
  const emptyState = () => ({
    goals: [],
    tasks: [],
    habits: [],
    checkins: [],
    readingList: [],
    meta: { onboardingComplete: true }
  });

  function useEmptyState(){
    suppressCloudPush = true;
    state = emptyState();
    normalize();
    saveLocal();
    render();
    suppressCloudPush = false;
  }

  // Override core first-sync behavior before cloud-guard releases getSession().
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

    // No cloud row means this is a new account. Never migrate browser/demo data.
    useEmptyState();
    setSyncStatus('Synced', 'ok');
    await pushCloud();
  };

  // Clear the in-memory/shared browser copy when a session ends so another
  // person using this browser cannot see or inherit the prior account state.
  cloud?.auth?.onAuthStateChange((event, session) => {
    if (session?.user) return;
    setTimeout(() => {
      useEmptyState();
      setSyncStatus('Sign in to sync', 'local');
    }, 0);
  });

  window.__gccReleaseCloud?.();
})();
