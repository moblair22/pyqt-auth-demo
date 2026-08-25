// Dedicated Supabase account screen and visible sign-out control.
(() => {
  if (typeof cloud === 'undefined' || !cloud) return;
  const style=document.createElement('style');
  style.textContent=`.auth-gate{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at top,#1b3555 0,#0b1220 55%)}.auth-gate.hidden{display:none}.auth-panel{width:min(460px,100%);padding:30px;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:var(--panel,#111b2e);box-shadow:0 24px 80px rgba(0,0,0,.45)}.auth-brand{display:flex;align-items:center;gap:12px;margin-bottom:24px}.auth-brand .brand-mark{flex:0 0 auto}.auth-panel h1{margin:0 0 8px;font-size:28px}.auth-panel>p{margin:0 0 22px;color:var(--muted)}.auth-error{min-height:20px;margin:10px 0;color:#ff8f8f;font-size:13px}.account-actions{display:flex;align-items:center;gap:8px}.account-email{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:12px}@media(max-width:650px){.account-email{display:none}}`;
  document.head.appendChild(style);
  const gate=document.createElement('div');
  gate.id='authGate';gate.className='auth-gate hidden';
  gate.innerHTML=`<div class="auth-panel"><div class="auth-brand"><div class="brand-mark">G</div><div><strong>Goal Command</strong><div class="task-sub">Center</div></div></div><h1>Welcome back</h1><p>Sign in to access and sync your goals across your devices.</p><div class="field"><label>Email</label><input id="gateEmail" type="email" autocomplete="email" placeholder="you@example.com"></div><div class="field"><label>Password</label><input id="gatePassword" type="password" autocomplete="current-password" placeholder="At least 6 characters"></div><label style="display:flex;align-items:center;gap:9px;margin:4px 0 12px"><input id="gateRemember" type="checkbox" checked style="width:18px;height:18px"><span>Remember me on this device</span></label><div id="gateError" class="auth-error"></div><div class="top-actions"><button id="gateSignIn" class="primary-btn">Sign In</button><button id="gateSignUp" class="secondary-btn">Create Account</button></div><button id="gateForgot" class="link-btn" style="margin-top:16px">Forgot password?</button></div>`;
  document.body.appendChild(gate);
  const errorEl=gate.querySelector('#gateError');
  const credentials=()=>({email:gate.querySelector('#gateEmail').value.trim(),password:gate.querySelector('#gatePassword').value});
  const busy=value=>gate.querySelectorAll('button').forEach(b=>b.disabled=value);
  async function submit(mode){
    const {email,password}=credentials();
    if(!email||password.length<6){errorEl.textContent='Enter an email and a password of at least 6 characters.';return}
    busy(true);errorEl.textContent='';
    const remember=gate.querySelector('#gateRemember').checked;
    localStorage.setItem('gcc-remember-login',remember?'1':'0');
    if(remember)sessionStorage.removeItem('gcc-session-login');else sessionStorage.setItem('gcc-session-login','1');
    const result=mode==='in'?await cloud.auth.signInWithPassword({email,password}):await cloud.auth.signUp({email,password,options:{emailRedirectTo:location.href.split('#')[0]}});
    busy(false);
    if(result.error){errorEl.textContent=result.error.message;return}
    if(mode==='up'&&!result.data.session){errorEl.style.color='var(--accent)';errorEl.textContent='Check your email to confirm your account.'}
  }
  gate.querySelector('#gateSignIn').onclick=()=>submit('in');
  gate.querySelector('#gateSignUp').onclick=()=>submit('up');
  gate.querySelector('#gateForgot').onclick=async()=>{
    const email=gate.querySelector('#gateEmail').value.trim();
    errorEl.style.color='';
    if(!email){errorEl.textContent='Enter your email address first.';return}
    busy(true);errorEl.textContent='';
    const {error}=await cloud.auth.resetPasswordForEmail(email,{redirectTo:location.href.split('#')[0]});
    busy(false);
    if(error){errorEl.textContent=error.message;return}
    errorEl.style.color='var(--accent)';
    errorEl.textContent='Password reset email sent. Check your inbox.';
  };
  gate.querySelector('#gatePassword').addEventListener('keydown',e=>{if(e.key==='Enter')submit('in')});
  function accountControl(user){
    document.querySelector('#accountActions')?.remove();
    if(!user)return;
    const wrap=document.createElement('div');wrap.id='accountActions';wrap.className='account-actions';
    wrap.innerHTML=`<span class="account-email">${String(user.email||'Signed in')}</span><button id="headerSignOut" class="secondary-btn">Sign Out</button>`;
    document.querySelector('.top-actions')?.appendChild(wrap);
    wrap.querySelector('#headerSignOut').onclick=async()=>{await cloud.auth.signOut()};
  }
  function showRecovery(){
    modal(`<div class="kicker">Account recovery</div><h2>Create a new password</h2><p class="task-sub">Enter a new password for your Goal Command Center account.</p><div class="field"><label>New password</label><input id="recoveryPassword" type="password" autocomplete="new-password" placeholder="At least 6 characters"></div><div class="field"><label>Confirm password</label><input id="recoveryConfirm" type="password" autocomplete="new-password"></div><div id="recoveryError" class="auth-error"></div><div class="modal-actions"><button id="saveRecoveryPassword" class="primary-btn">Update Password</button></div>`);
    document.querySelector('#saveRecoveryPassword').onclick=async()=>{
      const password=document.querySelector('#recoveryPassword').value;
      const confirmation=document.querySelector('#recoveryConfirm').value;
      const message=document.querySelector('#recoveryError');
      if(password.length<6){message.textContent='Use at least 6 characters.';return}
      if(password!==confirmation){message.textContent='The passwords do not match.';return}
      const {error}=await cloud.auth.updateUser({password});
      if(error){message.textContent=error.message;return}
      close();toast('Password updated successfully');
    };
  }
  function apply(session){const user=session?.user||null;gate.classList.toggle('hidden',!!user);accountControl(user)}
  cloud.auth.getSession().then(async({data})=>{
    const remembered=localStorage.getItem('gcc-remember-login')!=='0';
    const sessionOnly=sessionStorage.getItem('gcc-session-login')==='1';
    if(data?.session&&!remembered&&!sessionOnly){await cloud.auth.signOut();apply(null);return}
    apply(data?.session);
  });
  cloud.auth.onAuthStateChange((event,session)=>setTimeout(()=>{apply(session);if(event==='PASSWORD_RECOVERY')showRecovery()},0));
})();