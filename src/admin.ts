import {
  initTheme,
  userManager,
  db,
  toast,
  esc,
  formatDate,
  money,
  SUPER_ADMIN_EMAIL,
} from './core';

initTheme();

const renderAdminPortal = () => {
  const app = document.getElementById('app');
  if (!app) return;

  const curUser = userManager.getCurrentUser();
  const isSuperAdmin = curUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && curUser?.role === 'admin' && curUser?.status === 'approved';

  // 1. Private Super Admin Authentication Gate
  if (!isSuperAdmin) {
    app.innerHTML = `
      <div class="onboard-container">
        <div class="onboard-card" style="border-top: 4px solid var(--primary);">
          <div class="onboard-icon-large" style="background: linear-gradient(135deg, var(--primary) 0%, #312e81 100%);">👑</div>
          <h1 class="onboard-title">Super Admin Portal</h1>
          <p class="onboard-desc">
            Private management portal for client rental licensing, tenant approvals, and multi-tenant oversight.
          </p>

          <form id="admin-login-form" onsubmit="return false;">
            <label for="adm-email">Super Admin Email</label>
            <input id="adm-email" type="email" value="${SUPER_ADMIN_EMAIL}" required autofocus>

            <label for="adm-pass">Master Password</label>
            <input id="adm-pass" type="password" placeholder="••••••••" required autocomplete="current-password">

            <button class="btn btn-primary btn-block" id="btn-admin-login" type="button" style="margin-top: 18px; font-size: 15px; padding: 13px;">
              🔓 Sign In as Super Admin
            </button>
            <a class="btn btn-secondary btn-block" href="login.html" style="margin-top: 10px; font-size: 13px;">
              ← Back to Client Sign In
            </a>
          </form>
        </div>
      </div>
    `;

    document.getElementById('btn-admin-login')?.addEventListener('click', async () => {
      const email = (document.getElementById('adm-email') as HTMLInputElement).value.trim();
      const pass = (document.getElementById('adm-pass') as HTMLInputElement).value;

      if (!email || !pass) {
        toast('Please enter admin email and password', 'error');
        return;
      }

      const ok = await userManager.authenticateSuperAdmin(email, pass);
      if (ok) {
        toast(`Welcome Super Admin ${SUPER_ADMIN_EMAIL}!`, 'success');
        renderAdminPortal();
      } else {
        toast('Invalid Super Admin credentials.', 'error');
      }
    });
    return;
  }

  // 2. Authenticated Super Admin Portal
  const users = userManager.getUsers();
  const workspaces = db.getWorkspaces();
  const pendingClients = users.filter(u => u.status === 'pending' && u.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase());
  const activeTenants = users.filter(u => u.status === 'approved' && u.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase());

  // Aggregate platform statistics across all tenant workspaces
  let totalPlatformCustomers = 0;
  let totalPlatformLoans = 0;
  let totalPlatformPortfolio = 0;
  let totalPlatformCollections = 0;

  workspaces.forEach(ws => {
    const custs = db.getCustomers(ws.id);
    const loans = db.getLoans(ws.id);
    const payments = db.getPayments(ws.id);
    totalPlatformCustomers += custs.length;
    totalPlatformLoans += loans.length;
    totalPlatformPortfolio += loans.reduce((s, l) => s + Number(l.total), 0);
    totalPlatformCollections += payments.reduce((s, p) => s + Number(p.amount), 0);
  });

  app.innerHTML = `
    <!-- Top Admin Header -->
    <div class="card" style="background: linear-gradient(135deg, var(--card) 0%, var(--card-subtle) 100%); border-left: 4px solid var(--primary);">
      <div class="card-title-row">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 24px;">👑</span>
            <h1 style="font-size: 22px; font-weight: 800; color: var(--tx);">Super Admin Rental Portal</h1>
          </div>
          <p style="font-size: 13px; color: var(--mu); margin-top: 4px;">
            Logged in as: <b>${esc(SUPER_ADMIN_EMAIL)}</b> · SaaS License & Tenant Manager
          </p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-outline" id="btn-admin-signout" type="button" style="font-size: 13px;">
            🚪 Admin Sign Out
          </button>
        </div>
      </div>
    </div>

    <!-- Platform KPI Stats -->
    <div class="stats-grid">
      <div class="stat-box stat-warning">
        <span class="stat-label">Pending License Approvals</span>
        <span class="stat-val c-warning">${pendingClients.length}</span>
        <span class="stat-sub">clients waiting for rental</span>
      </div>

      <div class="stat-box stat-success">
        <span class="stat-label">Active Rented Businesses</span>
        <span class="stat-val c-success">${workspaces.length}</span>
        <span class="stat-sub">${activeTenants.length} active operators</span>
      </div>

      <div class="stat-box">
        <span class="stat-label">Total Platform Borrowers</span>
        <span class="stat-val">${totalPlatformCustomers}</span>
        <span class="stat-sub">across all tenants</span>
      </div>

      <div class="stat-box stat-success">
        <span class="stat-label">Total Portfolio Managed</span>
        <span class="stat-val c-success">${money(totalPlatformPortfolio)}</span>
        <span class="stat-sub">${money(totalPlatformCollections)} collected</span>
      </div>
    </div>

    <!-- 1. PENDING RENTAL APPROVALS SECTION -->
    <div class="card" style="border: 2px solid ${pendingClients.length > 0 ? 'var(--warning)' : 'var(--card-border)'};">
      <div class="card-title-row">
        <div>
          <h2 class="card-title">
            <span>📋 Rental License Requests (Pending Approvals)</span>
            <span class="badge ${pendingClients.length > 0 ? 'badge-local' : 'badge-cloud'}">${pendingClients.length} Pending</span>
          </h2>
          <p style="font-size: 13px; color: var(--mu); margin-top: 2px;">
            These clients have signed up and cannot create or view any business until you grant approval.
          </p>
        </div>
      </div>

      <div id="pending-clients-list" style="margin-top: 14px;">
        ${pendingClients.length > 0 ? pendingClients.map(u => `
          <div class="collect-card" style="border-left: 4px solid var(--warning); padding: 16px;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
              <div>
                <b style="font-size: 16px; color: var(--tx);">${esc(u.name || 'Client')}</b>
                <span class="badge badge-local" style="margin-left: 8px;">⏳ Awaiting Rental License</span>
                <div style="font-size: 13px; color: var(--mu); margin-top: 4px;">
                  ✉️ <b>${esc(u.email)}</b> ${u.phone ? `· 📞 ${esc(u.phone)}` : ''} · Registered on ${formatDate(u.created_at)}
                </div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary" data-approve="${u.id}" type="button" style="font-size: 13px; padding: 9px 18px;">
                  ✓ Approve & Activate Rental License
                </button>
                <button class="btn btn-danger" data-reject="${u.id}" type="button" style="font-size: 13px; padding: 9px 14px;">
                  ✕ Deny
                </button>
              </div>
            </div>
          </div>
        `).join('') : `
          <div style="text-align: center; padding: 30px; color: var(--mu);">
            ✨ No pending rental requests. All registered clients are approved.
          </div>
        `}
      </div>
    </div>

    <!-- 2. ACTIVE TENANT BUSINESS WORKSPACES -->
    <div class="card">
      <div class="card-title-row">
        <div>
          <h2 class="card-title">🏢 Active Tenant Workspaces (${workspaces.length})</h2>
          <p style="font-size: 13px; color: var(--mu); margin-top: 2px;">
            Businesses currently renting and using your platform. You can suspend access if rental payment is due.
          </p>
        </div>
      </div>

      ${workspaces.length > 0 ? workspaces.map(ws => {
        const custs = db.getCustomers(ws.id);
        const loans = db.getLoans(ws.id);
        const totalPort = loans.reduce((s, l) => s + Number(l.total), 0);
        const ownerUser = users.find(u => u.email.toLowerCase() === ws.owner_email.toLowerCase());
        const isSuspended = ownerUser?.status === 'rejected';

        return `
          <div class="collect-card" style="border-left: 4px solid ${isSuspended ? 'var(--risk)' : 'var(--success)'}; margin-bottom: 14px; padding: 16px;">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
              <div>
                <h3 style="font-size: 18px; font-weight: 700; color: var(--tx);">
                  ${esc(ws.name)}
                  ${isSuspended ? '<span class="badge tag-risk" style="margin-left: 8px;">⏸️ Rental Suspended</span>' : '<span class="badge badge-cloud" style="margin-left: 8px;">✓ Active Rental</span>'}
                </h3>
                <div style="font-size: 13px; color: var(--mu); margin-top: 4px;">
                  Client: <b>${esc(ws.owner_email)}</b> · Created ${formatDate(ws.created_at)} · Modes: ${ws.daily_on ? 'Daily' : ''} ${ws.weekly_on ? 'Weekly' : ''}
                </div>
                <div style="font-size: 13px; color: var(--tx-secondary); margin-top: 8px;">
                  👥 ${custs.length} Borrowers · 📋 ${loans.length} Loans · 💰 Active Portfolio: <b>${money(totalPort)}</b>
                </div>
              </div>

              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${ownerUser ? `
                  ${isSuspended ? `
                    <button class="btn btn-primary" data-reactivate="${ownerUser.id}" type="button" style="font-size: 12px; padding: 7px 14px;">
                      ▶️ Reactivate License
                    </button>
                  ` : `
                    <button class="btn btn-outline" data-suspend="${ownerUser.id}" type="button" style="font-size: 12px; padding: 7px 14px;">
                      ⏸️ Suspend License
                    </button>
                  `}
                ` : ''}
                <button class="btn btn-secondary" data-inspect-ws="${ws.id}" type="button" style="font-size: 12px; padding: 7px 14px;">
                  🔍 Inspect Workspace
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('') : `
        <div style="text-align: center; padding: 30px; color: var(--mu);">
          No active businesses created yet. Once approved, clients set up their workspace.
        </div>
      `}
    </div>

    <!-- 3. ALL REGISTERED CLIENT DIRECTORY -->
    <div class="card">
      <div class="card-title-row">
        <div>
          <h2 class="card-title">👥 All Registered Clients (${users.length})</h2>
        </div>
      </div>

      <div class="ledger-table-wrap">
        <table class="ledger-table">
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Rental Status</th>
              <th>Registered</th>
              <th class="text-right">License Controls</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => {
              const isAdmin = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
              return `
                <tr>
                  <td><b>${esc(u.name || 'Client')}</b> ${isAdmin ? '<span class="badge badge-local">Super Admin</span>' : ''}</td>
                  <td>${esc(u.email)}</td>
                  <td>${esc(u.phone || '-')}</td>
                  <td>
                    <span class="badge ${u.status === 'approved' ? 'badge-cloud' : (u.status === 'pending' ? 'badge-local' : 'tag-risk')}">
                      ${u.status === 'approved' ? 'Active' : (u.status === 'pending' ? 'Pending Approval' : 'Suspended')}
                    </span>
                  </td>
                  <td>${formatDate(u.created_at)}</td>
                  <td class="text-right">
                    ${!isAdmin ? `
                      ${u.status === 'approved' ? `
                        <button class="action-chip action-chip-undo" data-suspend="${u.id}">Suspend</button>
                      ` : `
                        <button class="action-chip action-chip-success" data-approve="${u.id}">Approve</button>
                      `}
                      <button class="action-chip btn-danger" data-delete-user="${u.id}">Delete</button>
                    ` : '<span style="font-size:12px; color:var(--mu);">Owner</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Approve action
  document.querySelectorAll('[data-approve]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.approve!;
      userManager.approveUser(id, curUser?.id);
      toast('Rental license activated! Client can now start their business.', 'success');
      renderAdminPortal();
    });
  });

  // Reactivate action
  document.querySelectorAll('[data-reactivate]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.reactivate!;
      userManager.approveUser(id, curUser?.id);
      toast('Rental license reactivated!', 'success');
      renderAdminPortal();
    });
  });

  // Suspend action
  document.querySelectorAll('[data-suspend]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.suspend!;
      userManager.rejectUser(id);
      toast('Tenant rental license suspended.', 'info');
      renderAdminPortal();
    });
  });

  // Reject action
  document.querySelectorAll('[data-reject]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.reject!;
      userManager.rejectUser(id);
      toast('Rental request denied.', 'info');
      renderAdminPortal();
    });
  });

  // Delete user
  document.querySelectorAll('[data-delete-user]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.deleteUser!;
      if (confirm('Permanently remove this client account?')) {
        userManager.deleteUser(id);
        toast('Client removed', 'info');
        renderAdminPortal();
      }
    });
  });

  // Inspect workspace
  document.querySelectorAll('[data-inspect-ws]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.inspectWs!;
      const ws = workspaces.find(x => x.id === id);
      if (ws) {
        db.setCurrentWorkspace(ws);
        toast(`Opening workspace: ${ws.name}`, 'info');
        setTimeout(() => location.href = 'index.html', 400);
      }
    });
  });

  // Admin sign out
  document.getElementById('btn-admin-signout')?.addEventListener('click', () => {
    userManager.setCurrentUser(null);
    toast('Admin signed out', 'info');
    renderAdminPortal();
  });
};

(async () => {
  renderAdminPortal();
})();
