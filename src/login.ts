import {
  db,
  userManager,
  initTheme,
  toast,
  esc,
  SUPER_ADMIN_EMAIL,
  verifyAdminPassword,
  getSupabase,
} from './core';

initTheme();

const params = new URLSearchParams(location.search);
const isSetupParam = params.has('setup');

const renderAuthPage = () => {
  const app = document.getElementById('app');
  if (!app) return;

  const currentUser = userManager.getCurrentUser();
  const currentWorkspace = db.getCurrentWorkspace();

  // 1. If user is logged in but PENDING admin approval (Rental license not yet activated)
  if (currentUser && currentUser.status === 'pending') {
    app.innerHTML = `
      <div class="onboard-container">
        <div class="onboard-card" style="border-top: 4px solid var(--warning);">
          <div class="onboard-icon-large" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">🔒</div>
          <h1 class="onboard-title">Rental License Pending Approval</h1>
          <p class="onboard-desc">
            Welcome, <b>${esc(currentUser.name || currentUser.email)}</b>!<br>
            Your account has been registered with email verification. To activate your software rental and start your business workspace, please contact the administrator.
          </p>

          <div class="card" style="background: var(--card-subtle); padding: 18px; text-align: left; font-size: 13px; margin: 18px 0;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span>Client Account:</span>
              <b style="color:var(--tx);">${esc(currentUser.email)}</b>
            </div>
            ${currentUser.phone ? `
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span>Phone:</span>
                <span>${esc(currentUser.phone)}</span>
              </div>
            ` : ''}
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span>License Status:</span>
              <span class="badge badge-local">⏳ Awaiting Admin Activation</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span>Administrator Contact:</span>
              <b style="color:var(--primary);">${esc(SUPER_ADMIN_EMAIL)}</b>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span>Registered On:</span>
              <span>${new Date(currentUser.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button class="btn btn-primary btn-block" id="btn-recheck-status" type="button" style="padding: 12px; font-size: 15px;">
              🔄 Check License Activation Status
            </button>
            <button class="btn btn-secondary btn-block" id="btn-sign-out-pending" type="button">
              🚪 Sign Out
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-recheck-status')?.addEventListener('click', () => {
      const updated = userManager.getUsers().find(u => u.id === currentUser.id);
      if (updated && updated.status === 'approved') {
        userManager.setCurrentUser(updated);
        toast('Rental license activated! Please set up your business workspace.', 'success');
        setTimeout(() => {
          location.href = 'login.html?setup=1';
        }, 500);
      } else {
        toast('Account is still awaiting admin approval. Please contact administrator.', 'info');
      }
    });

    document.getElementById('btn-sign-out-pending')?.addEventListener('click', async () => {
      userManager.setCurrentUser(null);
      const client = getSupabase();
      if (client) { try { await client.auth.signOut(); } catch {} }
      renderAuthPage();
    });
    return;
  }

  // 2. If client is approved, but has NO workspace yet: Prompt to create clean business workspace
  if (currentUser && currentUser.status === 'approved' && (!currentWorkspace || isSetupParam)) {
    app.innerHTML = `
      <div class="onboard-container">
        <div class="onboard-card">
          <div class="onboard-icon-large">🏢</div>
          <h1 class="onboard-title">Create Your Business Workspace</h1>
          <p class="onboard-desc">
            License Active for: <b>${esc(currentUser.email)}</b><br>
            Set up your clean business workspace. Starts with 100% clean slate (zero dummy records).
          </p>

          <form id="setup-ws-form" onsubmit="return false;">
            <label for="ws-name">Business / Finance / Shop Name *</label>
            <input id="ws-name" type="text" placeholder="e.g. Sri Krishna Finance, City Micro Collections" required autofocus value="${currentWorkspace ? esc(currentWorkspace.name) : ''}">

            <label>Collection Frequencies to Enable</label>
            <div class="pill-selector" id="mode-pills">
              <div class="pill-option selected" data-mode="both">Both Daily & Weekly</div>
              <div class="pill-option" data-mode="daily">Daily Only</div>
              <div class="pill-option" data-mode="weekly">Weekly Only</div>
            </div>

            <label for="curr">Currency</label>
            <input id="curr" type="text" value="₹ (INR)" readonly style="opacity: 0.8; cursor: not-allowed;">

            <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 10px;">
              <button class="btn btn-primary btn-block" id="btn-create-clean-ws" type="button" style="font-size: 16px; padding: 13px;">
                🚀 Start My Business (Clean Slate)
              </button>
              <button class="btn btn-secondary btn-block" id="btn-sign-out-setup" type="button">
                🚪 Sign Out
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    let selectedMode = 'both';
    const pills = document.querySelectorAll('#mode-pills .pill-option');
    pills.forEach(p => {
      p.addEventListener('click', () => {
        pills.forEach(x => x.classList.remove('selected'));
        p.classList.add('selected');
        selectedMode = (p as HTMLElement).dataset.mode || 'both';
      });
    });

    document.getElementById('btn-create-clean-ws')?.addEventListener('click', () => {
      const name = (document.getElementById('ws-name') as HTMLInputElement).value.trim() || 'My Collection Business';
      const ws = db.createFreshWorkspace(
        name,
        currentUser.id,
        currentUser.email,
        selectedMode === 'both' || selectedMode === 'daily',
        selectedMode === 'both' || selectedMode === 'weekly'
      );
      toast(`Workspace "${ws.name}" created with zero dummy data!`, 'success');
      setTimeout(() => location.href = 'index.html', 400);
    });

    document.getElementById('btn-sign-out-setup')?.addEventListener('click', async () => {
      userManager.setCurrentUser(null);
      const client = getSupabase();
      if (client) { try { await client.auth.signOut(); } catch {} }
      renderAuthPage();
    });
    return;
  }

  // 3. Client Public Auth Form (Sign In / Register Account)
  const activeSessionHtml = (currentUser && currentUser.status === 'approved' && currentWorkspace) ? `
    <div class="card" style="background: var(--card-subtle); border: 1px solid var(--primary); padding: 14px 16px; margin-bottom: 18px; text-align: left;">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
        <div>
          <span style="font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase;">Active Workspace Session:</span>
          <b style="display: block; font-size: 15px; color: var(--tx);">${esc(currentWorkspace.name)}</b>
          <span style="font-size: 12px; color: var(--mu);">${esc(currentUser.email)}</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <a class="btn btn-primary" href="index.html" style="font-size: 12px; padding: 7px 14px;">
            → Open Workspace
          </a>
          <button class="btn btn-secondary" id="btn-session-signout" type="button" style="font-size: 12px; padding: 7px 12px;">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  ` : '';

  app.innerHTML = `
    <div class="onboard-container">
      ${activeSessionHtml}

      <div class="onboard-card">
        <div class="onboard-icon-large">💼</div>
        <h1 class="onboard-title">Collection Manager</h1>
        <p class="onboard-desc">Sign in to your business workspace or register for software rental access.</p>

        <!-- Auth Tabs: Sign In / Register Account -->
        <div class="pill-selector" id="auth-tabs" style="margin-bottom: 20px;">
          <div class="pill-option selected" id="tab-signin">Sign In</div>
          <div class="pill-option" id="tab-signup">Register for Rental</div>
        </div>

        <!-- Sign In Form -->
        <form id="signin-form" onsubmit="return false;">
          <label for="si-email">Email Address</label>
          <input id="si-email" type="email" placeholder="you@company.com" required autofocus>

          <label for="si-pass">Password</label>
          <input id="si-pass" type="password" placeholder="••••••••" required>

          <button class="btn btn-primary btn-block" id="btn-signin" type="button" style="margin-top: 18px; font-size: 15px; padding: 12px;">
            Sign In to Workspace
          </button>
        </form>

        <!-- Register Account Form (Hidden by default) -->
        <form id="signup-form" onsubmit="return false;" style="display: none;">
          <label for="su-name">Full Name / Business Owner *</label>
          <input id="su-name" type="text" placeholder="e.g. Ramesh Kumar" required>

          <label for="su-phone">Mobile Phone Number *</label>
          <input id="su-phone" type="tel" placeholder="10-digit mobile number" required>

          <label for="su-email">Email Address (for verification) *</label>
          <input id="su-email" type="email" placeholder="you@company.com" required>

          <label for="su-pass">Create Password *</label>
          <input id="su-pass" type="password" placeholder="Minimum 6 characters" required>

          <div style="margin: 14px 0 8px; font-size: 12px; color: var(--mu); line-height: 1.4; background: var(--in); padding: 10px 12px; border-radius: var(--radius-sm);">
            ℹ️ <b>Software Rental:</b> New client registrations require approval and rental activation by the Administrator (<b>${esc(SUPER_ADMIN_EMAIL)}</b>) before business workspace access is granted.
          </div>

          <button class="btn btn-primary btn-block" id="btn-signup" type="button" style="margin-top: 12px; font-size: 15px; padding: 12px;">
            Register & Request Rental License
          </button>
        </form>
      </div>

      <div style="text-align: center; margin-top: 20px;">
        <button class="btn btn-outline" id="btn-quick-reset" type="button" style="font-size: 12px; padding: 6px 14px; opacity: 0.8;">
          🧪 Reset Client Session (Test Pending Registration Flow)
        </button>
      </div>
    </div>
  `;

  // Bind active session signout
  document.getElementById('btn-session-signout')?.addEventListener('click', async () => {
    userManager.setCurrentUser(null);
    const client = getSupabase();
    if (client) { try { await client.auth.signOut(); } catch {} }
    toast('Signed out', 'info');
    renderAuthPage();
  });

  // Quick reset for testing client flow
  document.getElementById('btn-quick-reset')?.addEventListener('click', () => {
    userManager.setCurrentUser(null);
    toast('Session reset. You can now register as a new client.', 'info');
    renderAuthPage();
  });

  // Tab toggling
  const tabSignIn = document.getElementById('tab-signin');
  const tabSignUp = document.getElementById('tab-signup');
  const formSignIn = document.getElementById('signin-form');
  const formSignUp = document.getElementById('signup-form');

  tabSignIn?.addEventListener('click', () => {
    tabSignIn.classList.add('selected');
    tabSignUp?.classList.remove('selected');
    if (formSignIn) formSignIn.style.display = 'block';
    if (formSignUp) formSignUp.style.display = 'none';
  });

  tabSignUp?.addEventListener('click', () => {
    tabSignUp.classList.add('selected');
    tabSignIn?.classList.remove('selected');
    if (formSignIn) formSignIn.style.display = 'none';
    if (formSignUp) formSignUp.style.display = 'block';
  });

  // Handle Sign In
  document.getElementById('btn-signin')?.addEventListener('click', async () => {
    const email = (document.getElementById('si-email') as HTMLInputElement).value.trim().toLowerCase();
    const pass = (document.getElementById('si-pass') as HTMLInputElement).value;

    if (!email || !pass) {
      toast('Please enter both email and password', 'error');
      return;
    }

    // Check if Super Admin login
    if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
      const isAdminValid = await userManager.authenticateSuperAdmin(email, pass);
      if (isAdminValid) {
        toast(`Welcome Super Admin ${SUPER_ADMIN_EMAIL}!`, 'success');
        setTimeout(() => location.href = 'admin.html', 400);
        return;
      } else {
        toast('Invalid Super Admin password', 'error');
        return;
      }
    }

    // Try Supabase auth if online
    const client = getSupabase();
    if (client) {
      try {
        await client.auth.signInWithPassword({ email, password: pass });
      } catch {}
    }

    // Check client in directory
    let user = userManager.getUsers().find(u => u.email.toLowerCase() === email);
    if (!user) {
      toast('No account found with this email. Please click "Register for Rental".', 'error');
      return;
    }

    userManager.setCurrentUser(user);

    if (user.status !== 'approved') {
      toast('Account is awaiting administrator approval.', 'info');
      renderAuthPage();
      return;
    }

    // User is approved!
    toast(`Welcome back, ${user.name}!`, 'success');
    const ws = db.getCurrentWorkspace();
    setTimeout(() => {
      location.href = ws ? 'index.html' : 'login.html?setup=1';
    }, 300);
  });

  // Handle Sign Up
  document.getElementById('btn-signup')?.addEventListener('click', async () => {
    const name = (document.getElementById('su-name') as HTMLInputElement).value.trim();
    const phone = (document.getElementById('su-phone') as HTMLInputElement).value.trim();
    const email = (document.getElementById('su-email') as HTMLInputElement).value.trim().toLowerCase();
    const pass = (document.getElementById('su-pass') as HTMLInputElement).value;

    if (!name || !email || pass.length < 6) {
      toast('Please enter your full name, email, and password (min 6 chars)', 'error');
      return;
    }

    const client = getSupabase();
    if (client) {
      try {
        await client.auth.signUp({
          email,
          password: pass,
          options: { data: { full_name: name, phone } },
        });
      } catch {}
    }

    // Normal client registration is strictly pending!
    const user = userManager.registerNewUser(email, name, phone);
    userManager.setCurrentUser(user);

    toast('Registration successful! Rental license pending admin approval.', 'info');
    renderAuthPage();
  });
};

(async () => {
  renderAuthPage();
})();
