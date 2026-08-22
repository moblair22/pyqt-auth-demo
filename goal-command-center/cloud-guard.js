// Ensures account bootstrap code is installed before the initial cloud session is processed.
(() => {
  let release;
  window.__gccCloudReady = new Promise(resolve => { release = resolve; });
  window.__gccReleaseCloud = release;

  const originalCreateClient = window.supabase?.createClient;
  if (!originalCreateClient) {
    release();
    return;
  }

  window.supabase.createClient = function (...args) {
    const client = originalCreateClient.apply(this, args);
    const originalGetSession = client.auth.getSession.bind(client.auth);
    client.auth.getSession = async function (...sessionArgs) {
      await window.__gccCloudReady;
      return originalGetSession(...sessionArgs);
    };
    return client;
  };
})();
