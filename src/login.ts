import {
  db,
  userManager,
  authSession,
  initTheme,
  toggleTheme,
  toast,
  esc,
  formatDate,
  SUPER_ADMIN_EMAIL,
  clearAllBrowserData,
} from './core';

initTheme();

const params = new URLSearchParams(location.search);
const isSetupParam = params.has('setup');
const isPendingParam = params.has('pending');
const isSuspendedParam = params.has('suspended');
const isClearedParam = params.has('cleared');
const isClearAction = params.has('clear');

// Automated clear via URL ?clear=1
if (isClearAction) {
  clearAllBrowserData(true);
}

if (isClearedParam) {
  setTimeout(() => {
    toast('✨ Browser cache and local storage reset to clean slate!', 'success');
  }, 200);
}

if (isSuspendedParam) {
  setTimeout(() => {
    toast('⚠️ Your workspace rental license has been suspended. Please contact administrator.', 'error');
  }, 200);
}

export const renderAuthPage = () => {
  const app = document.getElementById('app');
  if (!app) return;

  // STRICT MNC GATEWAY SECURITY:
  // If user is on index.html without an active session, ensure old lingering localStorage keys do not bypass login!
  const activeSession = authSession.getActiveSession();
  const currentUser = activeSession ? userManager.getUsers().find(u => u.id === activeSession.userId || u.email.toLowerCase() === activeSession.email.toLowerCase()) : null;
  const currentWorkspace = currentUser ? db.getCurrentWorkspace() : null;

  // --------------------------------------------------------------------------
  // Top MNC Enterprise Navbar
  // --------------------------------------------------------------------------
  const navbarHtml = `
    <header class="enterprise-navbar">
      <div class="enterprise-logo-wrap">
        <div class="enterprise-logo-icon">💼</div>
        <div>
          <div class="enterprise-brand-title">Collection Manager</div>
          <div class="enterprise-brand-subtitle">Enterprise Micro-Finance Platform</div>
        </div>
      </div>
      <div class="enterprise-nav-actions">
        <div class="live-status-pill">
          <span class="live-pulse-dot"></span>
          <span>99.99% Uptime · Operational</span>
        </div>
        <button class="theme-btn" id="theme-toggle-btn" title="Toggle Theme" type="button">
          ${document.documentElement.getAttribute('data-theme') === 'light' ? '🌙' : '☀️'}
        </button>
        <button class="btn btn-outline" id="btn-header-clear-cache" type="button" title="Purge Local Cache & Reset State" style="font-size: 12px; padding: 7px 12px;">
          🧹 Reset Cache
        </button>
      </div>
    </header>
  `;

  // --------------------------------------------------------------------------
  // Left Hero Column: Institutional-Grade SaaS Value Proposition
  // --------------------------------------------------------------------------
  const leftHeroHtml = `
    <div class="saas-hero-left">
      <div class="hero-pill-badge">
        <span>🚀 Version 2.4 Enterprise Release · Dual Cloud & Offline Engine</span>
      </div>

      <h1 class="hero-main-title">
        Institutional-Grade Loan Operations & Field Collection Infrastructure
      </h1>

      <p class="hero-main-desc">
        Designed for micro-lenders, finance enterprises, and collection networks. Automate installment schedules, enforce real-time ledger reconciliation, and eliminate cash leakage with bank-grade field operations.
      </p>

      <div class="hero-features-list">
        <div class="hero-feature-card">
          <div class="hero-feature-icon">⚡</div>
          <div>
            <div class="hero-feature-title">Zero-Leakage Real-Time Field Ledger</div>
            <div class="hero-feature-desc">Automated daily & weekly installment tracking with instant receipts, WhatsApp updates, and strict balance verification.</div>
          </div>
        </div>

        <div class="hero-feature-card">
          <div class="hero-feature-icon">🔒</div>
          <div>
            <div class="hero-feature-title">Multi-Tenant Cryptographic Isolation</div>
            <div class="hero-feature-desc">Each business operator operates within a strictly partitioned workspace. Tenant licensing is guarded by administrative approval.</div>
          </div>
        </div>

        <div class="hero-feature-card">
          <div class="hero-feature-icon">📊</div>
          <div>
            <div class="hero-feature-title">Multi-Sheet Excel & Cloud Synchronization</div>
            <div class="hero-feature-desc">One-click multi-sheet workbook generation (SpreadsheetML) and seamless background sync with Supabase cloud infrastructure.</div>
          </div>
        </div>
      </div>

      <div class="hero-metrics-strip">
        <div class="hero-metric-item">
          <span class="hero-metric-num">100%</span>
          <span class="hero-metric-label">Clean Slate Guarantee</span>
        </div>
        <div class="hero-metric-item">
          <span class="hero-metric-num">256-Bit</span>
          <span class="hero-metric-label">Secure Audit Trails</span>
        </div>
        <div class="hero-metric-item">
          <span class="hero-metric-num">0 ms</span>
          <span class="hero-metric-label">Offline-First Latency</span>
        </div>
      </div>
    </div>
  `;

  // --------------------------------------------------------------------------
  // Enterprise Corporate Footer
  // --------------------------------------------------------------------------
  const footerHtml = `
    <footer class="saas-footer">
      <div>
        © 2026 Collection Manager Enterprise SaaS. Bank-Grade Micro-Finance Operations.
      </div>
      <div class="saas-footer-links">
        <span>SOC-2 Architecture</span>
        <span>·</span>
        <span>Cloud Sync SLA</span>
        <span>·</span>
        <span>Privacy & Data Isolation</span>
        <span>·</span>
        <a class="saas-admin-discrete-link" href="admin.html" title="Platform Administration">
          🔒 Platform Admin
        </a>
      </div>
    </footer>
  `;

  // --------------------------------------------------------------------------
  // CASE 1: PENDING RENTAL APPROVAL STATE (Strictly Gated)
  // --------------------------------------------------------------------------
  if (isPendingParam) {
    app.innerHTML = `
      ${navbarHtml}

      <div class="saas-landing-grid">
        ${leftHeroHtml}

        <div class="saas-auth-card">
          <div class="saas-auth-header">
            <div style="width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); display: flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 14px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);">
              ⏳
            </div>
            <h2 class="saas-auth-title">Rental License Review in Progress</h2>
            <p class="saas-auth-subtitle">
              Your workspace rental application has been logged into the platform registry.
            </p>
          </div>

          <!-- Enterprise 3-Step Verification Stepper -->
          <div class="status-stepper">
            <div class="stepper-step">
              <div class="stepper-dot done">✓</div>
              <div class="stepper-info">
                <h4>Application Logged</h4>
                <p>Rental registration submitted for verification.</p>
              </div>
            </div>

            <div class="stepper-step">
              <div class="stepper-dot active">⏳</div>
              <div class="stepper-info">
                <h4>Super Admin Verification</h4>
                <p>Under review by Platform Administrator (<b>${esc(SUPER_ADMIN_EMAIL)}</b>). Activation pending.</p>
              </div>
            </div>

            <div class="stepper-step">
              <div class="stepper-dot pending">3</div>
              <div class="stepper-info">
                <h4>Workspace Provisioning</h4>
                <p>Clean slate business environment (0 dummy records) will be provisioned upon activation.</p>
              </div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
            <a class="btn btn-primary btn-block" href="index.html" style="padding: 13px; font-size: 14px; text-decoration: none;">
              ← Back to Client Sign In
            </a>
            <button class="btn btn-outline" id="btn-clear-pending" type="button" style="font-size: 12px; padding: 8px;">
              🧹 Clear Session Data
            </button>
          </div>
        </div>
      </div>

      ${footerHtml}
    `;

    bindHeaderActions();

    document.getElementById('btn-clear-pending')?.addEventListener('click', () => {
      clearAllBrowserData(true);
    });

    return;
  }

  // --------------------------------------------------------------------------
  // CASE 2: ACTIVELY AUTHENTICATED & APPROVED - WORKSPACE SETUP (ZERO DUMMY DATA)
  // --------------------------------------------------------------------------
  if (currentUser && currentUser.status === 'approved' && (!currentWorkspace || isSetupParam)) {
    app.innerHTML = `
      ${navbarHtml}

      <div class="saas-landing-grid">
        ${leftHeroHtml}

        <div class="saas-auth-card">
          <div class="saas-auth-header">
            <div style="width: 52px; height: 52px; border-radius: 14px; background: linear-gradient(135deg, var(--success) 0%, #047857 100%); display: flex; align-items: center; justify-content: center; font-size: 26px; margin: 0 auto 14px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);">
              🏢
            </div>
            <h2 class="saas-auth-title">Initialize Business Workspace</h2>
            <p class="saas-auth-subtitle">
              Rental License Active for: <b>${esc(currentUser.email)}</b><br>
              Your workspace starts with a <b>100% clean slate (zero dummy records)</b>.
            </p>
          </div>

          <form id="setup-ws-form" onsubmit="return false;">
            <div>
              <label for="ws-name">Business / Finance Enterprise Name *</label>
              <input id="ws-name" type="text" placeholder="e.g. Sri Krishna Finance, City Micro Collections" required autofocus value="${esc(currentUser.business_name || '')}">
            </div>

            <div>
              <label>Collection Frequencies to Enable</label>
              <div class="segmented-tab-bar" id="mode-pills" style="margin-top: 6px; margin-bottom: 0;">
                <button class="segmented-tab selected" data-mode="both" type="button">Daily & Weekly</button>
                <button class="segmented-tab" data-mode="daily" type="button">Daily Only</button>
                <button class="segmented-tab" data-mode="weekly" type="button">Weekly Only</button>
              </div>
            </div>

            <div>
              <label for="curr">Base Ledger Currency</label>
              <input id="curr" type="text" value="₹ (INR) · Indian Rupee" readonly style="opacity: 0.8; cursor: not-allowed;">
            </div>

            <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 10px;">
              <button class="btn btn-primary btn-block" id="btn-create-clean-ws" type="button" style="font-size: 15px; padding: 13px;">
                🚀 Launch Clean Business Workspace
              </button>
              <button class="btn btn-secondary btn-block" id="btn-sign-out-setup" type="button">
                🚪 Sign Out
              </button>
            </div>
          </form>
        </div>
      </div>

      ${footerHtml}
    `;

    bindHeaderActions();

    let selectedMode = 'both';
    const pills = document.querySelectorAll('#mode-pills .segmented-tab');
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

    document.getElementById('btn-sign-out-setup')?.addEventListener('click', () => {
      authSession.endSession();
      renderAuthPage();
    });

    return;
  }

  // --------------------------------------------------------------------------
  // CASE 3: STANDARD CLEAN MNC AUTH GATEWAY
  // NO PERSISTENT BYPASS CARD, NO ADMIN PANEL BUTTON!
  // Requires explicit Email & Password to enter!
  // --------------------------------------------------------------------------
  app.innerHTML = `
    ${navbarHtml}

    <div class="saas-landing-grid">
      ${leftHeroHtml}

      <div class="saas-auth-card">
        <div class="saas-auth-header">
          <h2 class="saas-auth-title">Workspace Portal</h2>
          <p class="saas-auth-subtitle">Sign in to your rented workspace or request an enterprise rental license.</p>
        </div>

        <!-- Segmented Tab Bar: Strictly 2 visible tabs (No Super Admin tab!) -->
        <div class="segmented-tab-bar" id="auth-tabs">
          <button class="segmented-tab selected" id="tab-signin" type="button">Client Sign In</button>
          <button class="segmented-tab" id="tab-signup" type="button">Request Workspace Access</button>
        </div>

        <!-- 1. Client Sign In Form -->
        <form id="signin-form" onsubmit="return false;">
          <div>
            <label for="si-email">Business Owner / Operator Email</label>
            <input id="si-email" type="email" placeholder="owner@enterprise.com" required autofocus autocomplete="username">
          </div>

          <div>
            <label for="si-pass">Account Password</label>
            <input id="si-pass" type="password" placeholder="••••••••" required autocomplete="current-password">
          </div>

          <button class="btn btn-primary btn-block" id="btn-signin" type="button" style="margin-top: 10px; font-size: 14.5px; padding: 12px;">
            Sign In to Workspace
          </button>
        </form>

        <!-- 2. Request Rental License (Client Registration) -->
        <form id="signup-form" onsubmit="return false;" style="display: none;">
          <div>
            <label for="su-name">Full Name / Operator *</label>
            <input id="su-name" type="text" placeholder="e.g. Ramesh Kumar" required>
          </div>

          <div>
            <label for="su-biz">Business / Shop / Finance Enterprise Name *</label>
            <input id="su-biz" type="text" placeholder="e.g. Sri Krishna Finance, City Micro Collections" required>
          </div>

          <div>
            <label for="su-phone">Official Mobile Phone Number *</label>
            <input id="su-phone" type="tel" placeholder="10-digit mobile number" required>
          </div>

          <div>
            <label for="su-email">Business Email (for verification & login) *</label>
            <input id="su-email" type="email" placeholder="owner@enterprise.com" required>
          </div>

          <div>
            <label for="su-pass">Create Account Password *</label>
            <input id="su-pass" type="password" placeholder="Minimum 6 characters" required>
          </div>

          <div style="font-size: 12px; color: var(--mu); line-height: 1.45; background: var(--in); padding: 12px 14px; border-radius: var(--radius-sm); border-left: 3px solid var(--warning);">
            🔒 <b>Enterprise Rental Gating:</b><br>
            All tenant registrations require administrative review and rental license activation by platform administration before business workspaces can be launched.
          </div>

          <button class="btn btn-primary btn-block" id="btn-signup" type="button" style="margin-top: 6px; font-size: 14.5px; padding: 12px;">
            🚀 Submit Workspace Rental Request
          </button>
        </form>

        <!-- Cache Purge Card -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--card-border); text-align: center;">
          <button class="btn btn-outline" id="btn-purge-storage" type="button" style="font-size: 11.5px; padding: 6px 14px; opacity: 0.75;">
            🧹 Clear Browser Cache & Reset Local Data
          </button>
        </div>
      </div>
    </div>

    ${footerHtml}
  `;

  bindHeaderActions();

  // Tab toggling
  const tabSignIn = document.getElementById('tab-signin');
  const tabSignUp = document.getElementById('tab-signup');
  const formSignIn = document.getElementById('signin-form');
  const formSignUp = document.getElementById('signup-form');

  tabSignIn?.addEventListener('click', () => {
    tabSignIn.classList.add('selected');
    tabSignUp?.classList.remove('selected');
    if (formSignIn) formSignIn.style.display = 'flex';
    if (formSignUp) formSignUp.style.display = 'none';
  });

  tabSignUp?.addEventListener('click', () => {
    tabSignUp.classList.add('selected');
    tabSignIn?.classList.remove('selected');
    if (formSignIn) formSignIn.style.display = 'none';
    if (formSignUp) formSignUp.style.display = 'flex';
  });

  // Handle Client Sign In (with Smart Super Admin Detection & Password Verification!)
  document.getElementById('btn-signin')?.addEventListener('click', async () => {
    const email = (document.getElementById('si-email') as HTMLInputElement).value.trim().toLowerCase();
    const pass = (document.getElementById('si-pass') as HTMLInputElement).value;

    if (!email || !pass) {
      toast('Please enter both email and password', 'error');
      return;
    }

    // Authenticate credentials through core security engine
    const authRes = await userManager.verifyCredentials(email, pass);

    if (!authRes.success) {
      if (authRes.pending) {
        toast('Your rental license is pending Super Admin activation.', 'info');
        setTimeout(() => {
          location.href = 'index.html?pending=1';
        }, 300);
        return;
      }
      toast(authRes.error || 'Authentication failed. Please verify your credentials.', 'error');
      return;
    }

    // Success!
    const user = authRes.user!;

    // Super Admin redirect
    if (user.role === 'admin' && user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) {
      toast(`Authenticated Super Admin (${SUPER_ADMIN_EMAIL})`, 'success');
      setTimeout(() => location.href = 'admin.html', 400);
      return;
    }

    // Client redirect
    toast(`Welcome back, ${user.name}!`, 'success');
    const ws = db.getCurrentWorkspace();
    setTimeout(() => {
      location.href = ws ? 'dashboard.html' : 'index.html?setup=1';
    }, 300);
  });

  // Handle Request Rental License (Sign Up)
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
      toast('This email is reserved for platform administration.', 'error');
      return;
    }

    const existing = userManager.getUsers().find(u => u.email.toLowerCase() === email);
    if (existing) {
      toast('An account with this email already exists. Please sign in.', 'error');
      return;
    }

    // Save with strictly pending status and cryptographic password hash
    await userManager.registerNewUser(email, name, phone, biz, pass);

    toast('Workspace request logged! Awaiting Super Admin rental activation.', 'info');
    setTimeout(() => {
      location.href = 'index.html?pending=1';
    }, 400);
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
