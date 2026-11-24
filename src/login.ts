import {
  db,
  userManager,
  initTheme,
  toggleTheme,
  toast,
  esc,
  formatDate,
  SUPER_ADMIN_EMAIL,
  verifyAdminPassword,
  getSupabase,
  clearAllBrowserData,
} from './core';

initTheme();

const params = new URLSearchParams(location.search);
const isSetupParam = params.has('setup');
const isPendingParam = params.has('pending');
const isSuspendedParam = params.has('suspended');
const isClearedParam = params.has('cleared');
const isClearAction = params.has('clear');

// If requested immediate clear via URL ?clear=1
if (isClearAction) {
  clearAllBrowserData(true);
}

if (isClearedParam) {
  setTimeout(() => {
    toast('✨ Browser cache and local storage cleared successfully!', 'success');
  }, 200);
}

if (isSuspendedParam) {
  setTimeout(() => {
    toast('⚠️ Your rental license has been suspended. Please contact administrator.', 'error');
  }, 200);
}

export const renderAuthPage = () => {
  const app = document.getElementById('app');
  if (!app) return;

  const currentUser = userManager.getCurrentUser();
  const currentWorkspace = db.getCurrentWorkspace();

  // Top SaaS Brand & Theme Header
  const brandHeaderHtml = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--card-border);">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 38px; height: 38px; border-radius: 10px; background: linear-gradient(135deg, var(--primary) 0%, #312e81 100%); display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: var(--shadow-sm);">
          💼
        </div>
        <div>
          <h1 style="font-size: 18px; font-weight: 800; color: var(--tx); margin: 0; line-height: 1.2;">Collection Manager SaaS</h1>
          <span style="font-size: 11px; color: var(--mu);">Multi-Tenant Micro-Finance & Daily/Weekly Collection Platform</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button class="theme-btn" id="theme-toggle-btn" title="Toggle Theme" type="button" style="width: 36px; height: 36px; border-radius: var(--radius-sm); border: 1px solid var(--card-border); background: var(--in); cursor: pointer; display: flex; align-items: center; justify-content: center;">
          ${document.documentElement.getAttribute('data-theme') === 'light' ? '🌙' : '☀️'}
        </button>
        <button class="btn btn-outline" id="btn-header-clear-cache" type="button" title="Purge Local Cache & Reset State" style="font-size: 12px; padding: 6px 12px; border-color: var(--card-border);">
          🧹 Clear Cache
        </button>
      </div>
    </div>
  `;

  // --------------------------------------------------------------------------
  // 1. PENDING RENTAL APPROVAL STATE
  // --------------------------------------------------------------------------
  if (currentUser && (currentUser.status === 'pending' || isPendingParam)) {
    app.innerHTML = `
      <div class="onboard-container">
        ${brandHeaderHtml}

        <div class="onboard-card" style="border-top: 4px solid var(--warning);">
          <div class="onboard-icon-large" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">🔒</div>
          <h2 class="onboard-title">Rental License Pending Approval</h2>
          <p class="onboard-desc">
            Welcome, <b>${esc(currentUser.name || currentUser.email)}</b>!<br>
            Your account request has been submitted. Software rental activation is required before you can access the business workspace.
          </p>

          <div class="card" style="background: var(--card-subtle); padding: 18px; text-align: left; font-size: 13px; margin: 18px 0; border: 1px solid var(--card-border);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="color:var(--mu);">Applicant Account:</span>
              <b style="color:var(--tx);">${esc(currentUser.email)}</b>
            </div>
            ${currentUser.business_name ? `
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="color:var(--mu);">Requested Business:</span>
                <b style="color:var(--primary);">${esc(currentUser.business_name)}</b>
              </div>
            ` : ''}
            ${currentUser.phone ? `
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <span style="color:var(--mu);">Phone:</span>
                <span>${esc(currentUser.phone)}</span>
              </div>
            ` : ''}
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="color:var(--mu);">Rental Status:</span>
              <span class="badge badge-local" style="font-weight: 700;">⏳ Awaiting Super Admin Approval</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="color:var(--mu);">Platform Super Admin:</span>
              <b style="color:var(--tx);">${esc(SUPER_ADMIN_EMAIL)}</b>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="color:var(--mu);">Submitted On:</span>
              <span>${formatDate(currentUser.created_at)}</span>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button class="btn btn-primary btn-block" id="btn-recheck-status" type="button" style="padding: 12px; font-size: 15px;">
              🔄 Check License Activation Status
            </button>
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-secondary" id="btn-sign-out-pending" type="button" style="flex: 1;">
                🚪 Sign Out
              </button>
              <button class="btn btn-danger" id="btn-clear-pending" type="button" style="flex: 1;">
                🧹 Reset Session
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    bindHeaderActions();

    document.getElementById('btn-recheck-status')?.addEventListener('click', () => {
      const updated = userManager.getUsers().find(u => u.id === currentUser.id);
      if (updated && updated.status === 'approved') {
        userManager.setCurrentUser(updated);
        toast('🎉 Rental license activated by Super Admin! Starting workspace...', 'success');
        setTimeout(() => {
          const ws = db.getCurrentWorkspace();
          location.href = ws ? 'dashboard.html' : 'index.html?setup=1';
        }, 500);
      } else {
        toast('License is still awaiting administrator activation. Please contact yathinm316@gmail.com.', 'info');
      }
    });

    document.getElementById('btn-sign-out-pending')?.addEventListener('click', async () => {
      userManager.setCurrentUser(null);
      const client = getSupabase();
      if (client) { try { await client.auth.signOut(); } catch {} }
      toast('Signed out', 'info');
      renderAuthPage();
    });

    document.getElementById('btn-clear-pending')?.addEventListener('click', () => {
      if (confirm('Clear stored session and return to fresh sign in?')) {
        clearAllBrowserData(true);
      }
    });

    return;
  }

  // --------------------------------------------------------------------------
  // 2. APPROVED CLIENT - WORKSPACE SETUP (ZERO DUMMY DATA)
  // --------------------------------------------------------------------------
  if (currentUser && currentUser.status === 'approved' && (!currentWorkspace || isSetupParam)) {
    app.innerHTML = `
      <div class="onboard-container">
        ${brandHeaderHtml}

        <div class="onboard-card" style="border-top: 4px solid var(--success);">
          <div class="onboard-icon-large" style="background: linear-gradient(135deg, var(--success) 0%, #059669 100%);">🏢</div>
          <h2 class="onboard-title">Setup Your Business Workspace</h2>
          <p class="onboard-desc">
            Rental License Active for: <b>${esc(currentUser.email)}</b><br>
            Initialize your clean business workspace. Starts with <b>100% clean slate (zero dummy records)</b>.
          </p>

          <form id="setup-ws-form" onsubmit="return false;">
            <label for="ws-name">Business / Finance / Shop Name *</label>
            <input id="ws-name" type="text" placeholder="e.g. Sri Krishna Finance, City Micro Collections" required autofocus value="${esc(currentUser.business_name || '')}">

            <label>Collection Frequencies to Enable</label>
            <div class="pill-selector" id="mode-pills">
              <div class="pill-option selected" data-mode="both">Both Daily & Weekly</div>
              <div class="pill-option" data-mode="daily">Daily Only</div>
              <div class="pill-option" data-mode="weekly">Weekly Only</div>
            </div>

            <label for="curr">Base Currency</label>
            <input id="curr" type="text" value="₹ (INR)" readonly style="opacity: 0.8; cursor: not-allowed;">

            <div style="margin-top: 24px; display: flex; flex-direction: column; gap: 10px;">
              <button class="btn btn-primary btn-block" id="btn-create-clean-ws" type="button" style="font-size: 16px; padding: 13px;">
                🚀 Launch Clean Business Workspace
              </button>
              <button class="btn btn-secondary btn-block" id="btn-sign-out-setup" type="button">
                🚪 Sign Out
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    bindHeaderActions();

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
      const name = (document.getElementById('ws-name') as HTMLInputElement).value.trim() || currentUser.business_name || 'My Collection Business';
      const ws = db.createFreshWorkspace(
        name,
        currentUser.id,
        currentUser.email,
        selectedMode === 'both' || selectedMode === 'daily',
        selectedMode === 'both' || selectedMode === 'weekly'
      );
      toast(`Workspace "${ws.name}" created with zero dummy data!`, 'success');
      setTimeout(() => location.href = 'dashboard.html', 400);
    });

    document.getElementById('btn-sign-out-setup')?.addEventListener('click', async () => {
      userManager.setCurrentUser(null);
      const client = getSupabase();
      if (client) { try { await client.auth.signOut(); } catch {} }
      renderAuthPage();
    });

    return;
  }

  // --------------------------------------------------------------------------
  // 3. ACTIVE SESSION CARD (IF LOGGED IN AND APPROVED)
  // --------------------------------------------------------------------------
  const activeSessionHtml = (currentUser && currentUser.status === 'approved' && currentWorkspace) ? `
    <div class="card" style="background: var(--card-subtle); border: 2px solid var(--primary); padding: 16px 18px; margin-bottom: 20px; text-align: left; border-radius: var(--radius-md);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div>
          <span style="font-size: 11px; font-weight: 700; color: var(--primary); text-transform: uppercase; letter-spacing: 0.5px;">
            ${currentUser.role === 'admin' ? '👑 Platform Super Admin' : '✓ Active Business Workspace'}
          </span>
          <h3 style="font-size: 18px; font-weight: 800; color: var(--tx); margin: 2px 0 4px;">${esc(currentWorkspace.name)}</h3>
          <span style="font-size: 13px; color: var(--mu);">Logged in as: <b>${esc(currentUser.email)}</b></span>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${currentUser.role === 'admin' ? `
            <a class="btn btn-secondary" href="admin.html" style="font-size: 13px; padding: 8px 14px; color: var(--warning); border-color: var(--warning);">
              👑 Admin Panel
            </a>
          ` : ''}
          <a class="btn btn-primary" href="dashboard.html" style="font-size: 13px; padding: 8px 16px;">
            🚀 Open Dashboard →
          </a>
          <button class="btn btn-secondary" id="btn-session-signout" type="button" style="font-size: 13px; padding: 8px 12px;">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  ` : '';

  // --------------------------------------------------------------------------
  // 4. MAIN SAAS AUTH PORTAL (TABS: SIGN IN / REGISTER / SUPER ADMIN)
  // --------------------------------------------------------------------------
  app.innerHTML = `
    <div class="onboard-container">
      ${brandHeaderHtml}

      ${activeSessionHtml}

      <div class="onboard-card">
        <div class="onboard-icon-large">💼</div>
        <h2 class="onboard-title">SaaS Workspace Gateway</h2>
        <p class="onboard-desc">Sign in to your rented workspace or submit an application for software rental access.</p>

        <!-- 3 Auth Tabs -->
        <div class="pill-selector" id="auth-tabs" style="margin-bottom: 20px;">
          <div class="pill-option selected" id="tab-signin">Client Sign In</div>
          <div class="pill-option" id="tab-signup">Register for Rental</div>
          <div class="pill-option" id="tab-admin">Super Admin</div>
        </div>

        <!-- 1. Client Sign In Form -->
        <form id="signin-form" onsubmit="return false;">
          <label for="si-email">Business Owner / Client Email</label>
          <input id="si-email" type="email" placeholder="you@company.com" required autofocus autocomplete="username">

          <label for="si-pass">Password</label>
          <input id="si-pass" type="password" placeholder="••••••••" required autocomplete="current-password">

          <button class="btn btn-primary btn-block" id="btn-signin" type="button" style="margin-top: 18px; font-size: 15px; padding: 12px;">
            Sign In to Workspace
          </button>
        </form>

        <!-- 2. Register for Rental License (Client Permission Request) -->
        <form id="signup-form" onsubmit="return false;" style="display: none;">
          <label for="su-name">Full Name / Operator *</label>
          <input id="su-name" type="text" placeholder="e.g. Ramesh Kumar" required>

          <label for="su-biz">Business / Shop / Finance Name *</label>
          <input id="su-biz" type="text" placeholder="e.g. Sri Krishna Finance, City Micro Collections" required>

          <label for="su-phone">Mobile Phone Number *</label>
          <input id="su-phone" type="tel" placeholder="10-digit mobile number" required>

          <label for="su-email">Email Address (for verification & login) *</label>
          <input id="su-email" type="email" placeholder="you@company.com" required>

          <label for="su-pass">Create Account Password *</label>
          <input id="su-pass" type="password" placeholder="Minimum 6 characters" required>

          <div style="margin: 14px 0 8px; font-size: 12px; color: var(--mu); line-height: 1.45; background: var(--in); padding: 12px 14px; border-radius: var(--radius-sm); border-left: 3px solid var(--warning);">
            🔒 <b>SaaS Rental Approval Notice:</b><br>
            All new client accounts are placed in <b>Pending Status</b>. Super Admin (<b>${esc(SUPER_ADMIN_EMAIL)}</b>) must review and activate your software rental license before you can start managing collections.
          </div>

          <button class="btn btn-primary btn-block" id="btn-signup" type="button" style="margin-top: 12px; font-size: 15px; padding: 12px;">
            🚀 Submit Rental License Request
          </button>
        </form>

        <!-- 3. Super Admin Direct Portal Login -->
        <form id="admin-form" onsubmit="return false;" style="display: none;">
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 14px; font-size: 12px; color: var(--warning-text);">
            👑 <b>Platform Owner Authentication:</b> Restricted access for tenant approval, license activations, and system oversight.
          </div>

          <label for="sa-email">Super Admin Email</label>
          <input id="sa-email" type="email" value="${esc(SUPER_ADMIN_EMAIL)}" required readonly style="opacity: 0.85;">

          <label for="sa-pass">Master Password</label>
          <input id="sa-pass" type="password" placeholder="••••••••" required autocomplete="current-password">

          <button class="btn btn-primary btn-block" id="btn-admin-auth" type="button" style="margin-top: 18px; font-size: 15px; padding: 12px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);">
            👑 Sign In to Super Admin Panel
          </button>
        </form>
      </div>

      <!-- Quick Reset & Browser Cache Purge Utility Card -->
      <div class="card" style="margin-top: 20px; padding: 14px 18px; background: var(--card); border: 1px dashed var(--card-border); text-align: center;">
        <span style="font-size: 13px; color: var(--mu); display: block; margin-bottom: 8px;">
          Seeing previous test workspaces or need a clean start?
        </span>
        <button class="btn btn-outline" id="btn-purge-storage" type="button" style="font-size: 12px; padding: 7px 16px; border-color: var(--risk); color: var(--risk);">
          🧹 Clear Browser Cache & Reset App Data
        </button>
      </div>
    </div>
  `;

  bindHeaderActions();

  // Bind active session signout
  document.getElementById('btn-session-signout')?.addEventListener('click', async () => {
    userManager.setCurrentUser(null);
    const client = getSupabase();
    if (client) { try { await client.auth.signOut(); } catch {} }
    toast('Signed out from workspace', 'info');
    renderAuthPage();
  });

  // Tab toggling
  const tabSignIn = document.getElementById('tab-signin');
  const tabSignUp = document.getElementById('tab-signup');
  const tabAdmin = document.getElementById('tab-admin');
  const formSignIn = document.getElementById('signin-form');
  const formSignUp = document.getElementById('signup-form');
  const formAdmin = document.getElementById('admin-form');

  tabSignIn?.addEventListener('click', () => {
    tabSignIn.classList.add('selected');
    tabSignUp?.classList.remove('selected');
    tabAdmin?.classList.remove('selected');
    if (formSignIn) formSignIn.style.display = 'block';
    if (formSignUp) formSignUp.style.display = 'none';
    if (formAdmin) formAdmin.style.display = 'none';
  });

  tabSignUp?.addEventListener('click', () => {
    tabSignUp.classList.add('selected');
    tabSignIn?.classList.remove('selected');
    tabAdmin?.classList.remove('selected');
    if (formSignIn) formSignIn.style.display = 'none';
    if (formSignUp) formSignUp.style.display = 'block';
    if (formAdmin) formAdmin.style.display = 'none';
  });

  tabAdmin?.addEventListener('click', () => {
    tabAdmin.classList.add('selected');
    tabSignIn?.classList.remove('selected');
    tabSignUp?.classList.remove('selected');
    if (formSignIn) formSignIn.style.display = 'none';
    if (formSignUp) formSignUp.style.display = 'none';
    if (formAdmin) formAdmin.style.display = 'block';
  });

  // Handle Client Sign In
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

    // Try Supabase auth if configured
    const client = getSupabase();
    if (client) {
      try {
        await client.auth.signInWithPassword({ email, password: pass });
      } catch {}
    }

    // Check user in directory
    const user = userManager.getUsers().find(u => u.email.toLowerCase() === email);
    if (!user) {
      toast('No account found with this email. Please click "Register for Rental" to request access.', 'error');
      return;
    }

    userManager.setCurrentUser(user);

    if (user.status === 'pending') {
      toast('Your rental license is pending Super Admin approval.', 'info');
      renderAuthPage();
      return;
    }

    if (user.status === 'rejected') {
      toast('Your rental access has been suspended. Please contact administrator.', 'error');
      return;
    }

    // User is approved!
    toast(`Welcome back, ${user.name}!`, 'success');
    const ws = db.getCurrentWorkspace();
    setTimeout(() => {
      location.href = ws ? 'dashboard.html' : 'index.html?setup=1';
    }, 300);
  });

  // Handle Register (Request Rental License)
  document.getElementById('btn-signup')?.addEventListener('click', async () => {
    const name = (document.getElementById('su-name') as HTMLInputElement).value.trim();
    const biz = (document.getElementById('su-biz') as HTMLInputElement).value.trim();
    const phone = (document.getElementById('su-phone') as HTMLInputElement).value.trim();
    const email = (document.getElementById('su-email') as HTMLInputElement).value.trim().toLowerCase();
    const pass = (document.getElementById('su-pass') as HTMLInputElement).value;

    if (!name || !biz || !phone || !email || pass.length < 6) {
      toast('Please fill all fields: Name, Business Name, Phone, Email, and Password (min 6 chars)', 'error');
      return;
    }

    if (email === SUPER_ADMIN_EMAIL.toLowerCase()) {
      toast('This email is reserved for Super Admin. Please use another email or use Super Admin tab.', 'error');
      return;
    }

    // Try Supabase Auth signup
    const client = getSupabase();
    if (client) {
      try {
        await client.auth.signUp({
          email,
          password: pass,
          options: { data: { full_name: name, phone, business_name: biz } },
        });
      } catch {}
    }

    // Register user with STRICTLY pending status
    const user = userManager.registerNewUser(email, name, phone, biz);
    userManager.setCurrentUser(user);

    toast('Rental request submitted! Awaiting administrator approval.', 'info');
    renderAuthPage();
  });

  // Handle Super Admin Direct Form
  document.getElementById('btn-admin-auth')?.addEventListener('click', async () => {
    const email = SUPER_ADMIN_EMAIL;
    const pass = (document.getElementById('sa-pass') as HTMLInputElement).value;

    if (!pass) {
      toast('Please enter your Super Admin password', 'error');
      return;
    }

    const ok = await userManager.authenticateSuperAdmin(email, pass);
    if (ok) {
      toast(`Welcome Super Admin ${SUPER_ADMIN_EMAIL}!`, 'success');
      setTimeout(() => location.href = 'admin.html', 400);
    } else {
      toast('Invalid Super Admin password', 'error');
    }
  });

  // Purge Storage Button
  document.getElementById('btn-purge-storage')?.addEventListener('click', () => {
    if (confirm('Clear all local browser storage, previous test workspaces, and session data?')) {
      clearAllBrowserData(true);
    }
  });
};

function bindHeaderActions() {
  document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
    const next = toggleTheme();
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.textContent = next === 'light' ? '🌙' : '☀️';
  });

  document.getElementById('btn-header-clear-cache')?.addEventListener('click', () => {
    if (confirm('Clear all browser cache and local storage?')) {
      clearAllBrowserData(true);
    }
  });
}

(async () => {
  renderAuthPage();
})();
