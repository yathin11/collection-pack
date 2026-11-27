import {
  initTheme,
  toggleTheme,
  userManager,
  adminSession,
  db,
  toast,
  esc,
  formatDate,
  money,
  SUPER_ADMIN_EMAIL,
  clearAllBrowserData,
  generateExcelWorkbook,
  downloadExcelFile,
} from './core';

initTheme();

let inspectedWsId: string | null = null;

const renderAdminPortal = () => {
  const app = document.getElementById('app');
  if (!app) return;

  const admSess = adminSession.getAdminSession();
  const isSuperAdmin = !!(admSess && admSess.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() && admSess.role === 'admin');

  // 1. Strictly Private Platform Administration Gate (No pre-filled email)
  if (!isSuperAdmin) {
    app.innerHTML = `
      <div style="max-width: 440px; margin: 40px auto 0; padding: 0 4px;">
        <div class="saas-auth-card" style="border-top: 4px solid var(--primary);">
          <div class="saas-auth-header">
            <div style="width: 48px; height: 48px; border-radius: 10px; background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22px; margin: 0 auto 12px;">
              🛡️
            </div>
            <h2 class="saas-auth-title">Platform Administration</h2>
            <p class="saas-auth-subtitle">
              Authorized console for tenant rental licensing, provisioning, and platform oversight.
            </p>
          </div>

          <form id="admin-login-form" onsubmit="return false;">
            <div class="form-field">
              <label for="adm-email">Administrator Email</label>
              <input id="adm-email" type="email" placeholder="admin@platform.com" required autofocus autocomplete="username">
            </div>

            <div class="form-field">
              <label for="adm-pass">Master Password</label>
              <input id="adm-pass" type="password" placeholder="••••••••" required autocomplete="current-password">
            </div>

            <button class="btn btn-primary btn-block" id="btn-admin-login" type="submit" style="margin-top: 8px; padding: 12px;">
              Sign In to Admin Console
            </button>
          </form>
        </div>
      </div>
    `;

    const handleAdminLogin = async () => {
      const email = (document.getElementById('adm-email') as HTMLInputElement).value.trim();
      const pass = (document.getElementById('adm-pass') as HTMLInputElement).value;

      if (!email || !pass) {
        toast('Please enter administrator email and password', 'error');
        return;
      }

      const ok = await userManager.authenticateSuperAdmin(email, pass);
      if (ok) {
        toast('Authenticated to Platform Administration', 'success');
        renderAdminPortal();
      } else {
        toast('Invalid administrator credentials.', 'error');
      }
    };

    document.getElementById('admin-login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAdminLogin();
    });
    return;
  }

  // 2. Authenticated Platform Administration Console
  const users = userManager.getUsers();
  const clientUsers = users.filter(u => u.email.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase());
  const workspaces = db.getWorkspaces();
  const pendingClients = clientUsers.filter(u => u.status === 'pending');
  const activeTenants = clientUsers.filter(u => u.status === 'approved');

  // Aggregate platform KPIs across all tenant workspaces
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

  // Optional In-Page Tenant Inspector view (keeps Admin strictly isolated from client dashboard!)
  const inspectedWs = inspectedWsId ? workspaces.find(w => w.id === inspectedWsId) : null;
  let inspectorHtml = '';
  if (inspectedWs) {
    const tCusts = db.getCustomers(inspectedWs.id);
    const tLoans = db.getLoans(inspectedWs.id);
    const tPayments = db.getPayments(inspectedWs.id);
    const tPort = tLoans.reduce((s, l) => s + Number(l.total), 0);
    const tColl = tPayments.reduce((s, p) => s + Number(p.amount), 0);
    const custMap = new Map(tCusts.map(c => [c.id, c]));

    inspectorHtml = `
      <div class="card" style="border: 2px solid var(--primary); margin-bottom: 18px;">
        <div class="card-title-row">
          <div>
            <span class="sub-label" style="color: var(--primary);">Read-Only Tenant Audit</span>
            <h2 class="card-title">🏢 ${esc(inspectedWs.name)}</h2>
            <p style="font-size: 12px; color: var(--mu); margin-top: 2px;">
              Owner: <b>${esc(inspectedWs.owner_email)}</b> · Created ${formatDate(inspectedWs.created_at)}
            </p>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-secondary" id="btn-export-tenant-xls" type="button" style="font-size: 12px; padding: 7px 12px;">
              📊 Export Tenant Excel
            </button>
            <button class="btn btn-outline" id="btn-close-inspector" type="button" style="font-size: 12px; padding: 7px 12px;">
              ✕ Close Audit
            </button>
          </div>
        </div>

        <div class="stats-grid" style="margin-top: 12px;">
          <div class="stat-box">
            <span class="stat-label">Borrowers</span>
            <span class="stat-val">${tCusts.length}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Loans Issued</span>
            <span class="stat-val">${tLoans.length}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Total Portfolio</span>
            <span class="stat-val">${money(tPort)}</span>
          </div>
          <div class="stat-box stat-success">
            <span class="stat-label">Collected</span>
            <span class="stat-val c-success">${money(tColl)}</span>
          </div>
        </div>

        ${tLoans.length > 0 ? `
          <div class="ledger-table-wrap">
            <table class="ledger-table">
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Phone</th>
                  <th>Mode</th>
                  <th class="text-right">Principal</th>
                  <th class="text-right">Total Due</th>
                  <th>Start Date</th>
                </tr>
              </thead>
              <tbody>
                ${tLoans.slice(0, 20).map(l => {
                  const c = custMap.get(l.customer_id);
                  return `
                    <tr>
                      <td><b>${esc(c?.name || 'Customer')}</b></td>
                      <td>${esc(c?.phone || '-')}</td>
                      <td><span class="tag tag-mode">${l.mode}</span></td>
                      <td class="text-right">${money(l.principal)}</td>
                      <td class="text-right"><b>${money(l.total)}</b></td>
                      <td>${formatDate(l.start_date)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="text-align: center; padding: 20px; color: var(--mu); font-size: 13px;">
            Clean slate workspace — zero borrowers or loans created yet.
          </div>
        `}
      </div>
    `;
  }

  app.innerHTML = `
    <!-- Top Admin Header -->
    <header class="enterprise-navbar">
      <div class="enterprise-logo-wrap">
        <div class="enterprise-logo-icon">🛡️</div>
        <div>
          <div class="enterprise-brand-title">Platform Administration</div>
          <div class="enterprise-brand-subtitle">${esc(SUPER_ADMIN_EMAIL)}</div>
        </div>
      </div>
      <div class="enterprise-nav-actions">
        <button class="theme-btn" id="btn-admin-theme" title="Toggle Theme" type="button">
          ${document.documentElement.getAttribute('data-theme') === 'light' ? '🌙' : '☀️'}
        </button>
        <button class="btn btn-secondary" id="btn-admin-signout" type="button" style="font-size: 12.5px; padding: 7px 14px;">
          Sign Out
        </button>
      </div>
    </header>

    <!-- Platform KPI Stats -->
    <div class="stats-grid">
      <div class="stat-box stat-warning">
        <span class="stat-label">Pending Approvals</span>
        <span class="stat-val c-warning">${pendingClients.length}</span>
        <span class="stat-sub">awaiting license review</span>
      </div>

      <div class="stat-box stat-success">
        <span class="stat-label">Rented Workspaces</span>
        <span class="stat-val c-success">${workspaces.length}</span>
        <span class="stat-sub">${activeTenants.length} active owners</span>
      </div>

      <div class="stat-box">
        <span class="stat-label">Platform Borrowers</span>
        <span class="stat-val">${totalPlatformCustomers}</span>
        <span class="stat-sub">${totalPlatformLoans} total loans</span>
      </div>

      <div class="stat-box stat-success">
        <span class="stat-label">Managed Portfolio</span>
        <span class="stat-val c-success">${money(totalPlatformPortfolio)}</span>
        <span class="stat-sub">${money(totalPlatformCollections)} collected</span>
      </div>
    </div>

    ${inspectorHtml}

    <!-- 1. PENDING RENTAL APPROVALS SECTION -->
    <div class="card" style="border-left: 4px solid ${pendingClients.length > 0 ? 'var(--warning)' : 'var(--card-border)'};">
      <div class="card-title-row">
        <div>
          <h2 class="card-title">
            <span>Pending Access Requests</span>
            <span class="badge ${pendingClients.length > 0 ? 'badge-local' : 'badge-cloud'}">${pendingClients.length} Pending</span>
          </h2>
          <p style="font-size: 12.5px; color: var(--mu); margin-top: 2px;">
            New registrations cannot access or launch a workspace until approved.
          </p>
        </div>
      </div>

      <div id="pending-clients-list">
        ${pendingClients.length > 0 ? pendingClients.map(u => `
          <div class="collect-card" style="border-left: 4px solid var(--warning);">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
              <div style="min-width: 220px; flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <b style="font-size: 15px; color: var(--tx);">${esc(u.name || 'Client')}</b>
                  <span class="badge badge-local">Pending</span>
                </div>
                <div style="font-size: 13px; color: var(--tx-secondary); margin-top: 4px;">
                  Business: <b style="color:var(--primary);">${esc(u.business_name || 'Micro Finance')}</b>
                </div>
                <div style="font-size: 12px; color: var(--mu); margin-top: 3px;">
                  ${esc(u.email)} ${u.phone ? `· ${esc(u.phone)}` : ''} · ${formatDate(u.created_at)}
                </div>
              </div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap; flex: 1 1 220px; justify-content: flex-end;">
                <button class="btn btn-primary" data-approve="${u.id}" type="button" style="flex: 1 1 150px; font-size: 12.5px;">
                  ✓ Approve & Provision
                </button>
                <button class="btn btn-danger" data-reject="${u.id}" type="button" style="flex: 0 1 90px; font-size: 12.5px;">
                  ✕ Reject
                </button>
              </div>
            </div>
          </div>
        `).join('') : `
          <div style="text-align: center; padding: 24px; color: var(--mu); font-size: 13px;">
            No pending requests. All registered business requests have been processed.
          </div>
        `}
      </div>
    </div>

    <!-- 2. ACTIVE TENANT WORKSPACES -->
    <div class="card">
      <div class="card-title-row">
        <div>
          <h2 class="card-title">Tenant Workspaces (${workspaces.length})</h2>
          <p style="font-size: 12.5px; color: var(--mu); margin-top: 2px;">
            Manage active businesses, audit portfolio health, or suspend overdue rentals.
          </p>
        </div>
      </div>

      ${workspaces.length > 0 ? workspaces.map(ws => {
        const custs = db.getCustomers(ws.id);
        const loans = db.getLoans(ws.id);
        const totalPort = loans.reduce((s, l) => s + Number(l.total), 0);
        const ownerUser = clientUsers.find(u => u.id === ws.owner_id || u.email.toLowerCase() === ws.owner_email.toLowerCase());
        const isSuspended = ownerUser?.status === 'rejected';

        return `
          <div class="collect-card" style="border-left: 4px solid ${isSuspended ? 'var(--risk)' : 'var(--success)'};">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
              <div style="min-width: 220px; flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <h3 style="font-size: 16px; font-weight: 700; color: var(--tx);">${esc(ws.name)}</h3>
                  ${isSuspended ? '<span class="badge tag-risk">Suspended</span>' : '<span class="badge badge-cloud">Active</span>'}
                </div>
                <div style="font-size: 12px; color: var(--mu); margin-top: 3px;">
                  Owner: <b>${esc(ws.owner_email)}</b> · ${formatDate(ws.created_at)}
                </div>
                <div style="font-size: 12.5px; color: var(--tx-secondary); margin-top: 6px;">
                  <b>${custs.length}</b> Borrowers · <b>${loans.length}</b> Loans · Portfolio: <b>${money(totalPort)}</b>
                </div>
              </div>

              <div style="display: flex; gap: 8px; flex-wrap: wrap; flex: 1 1 240px; justify-content: flex-end;">
                <button class="btn btn-secondary" data-inspect-ws="${ws.id}" type="button" style="flex: 1 1 120px; font-size: 12.5px;">
                  🔍 Audit Tenant
                </button>
                ${ownerUser ? `
                  ${isSuspended ? `
                    <button class="btn btn-primary" data-reactivate="${ownerUser.id}" type="button" style="flex: 1 1 120px; font-size: 12.5px;">
                      Reactivate
                    </button>
                  ` : `
                    <button class="btn btn-outline" data-suspend="${ownerUser.id}" type="button" style="flex: 1 1 110px; font-size: 12.5px;">
                      Suspend
                    </button>
                  `}
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('') : `
        <div style="text-align: center; padding: 24px; color: var(--mu); font-size: 13px;">
          No tenant workspaces provisioned yet.
        </div>
      `}
    </div>

    <!-- 3. CLIENT DIRECTORY -->
    <div class="card">
      <div class="card-title-row">
        <div>
          <h2 class="card-title">Registered Business Accounts (${clientUsers.length})</h2>
        </div>
      </div>

      ${clientUsers.length > 0 ? `
        <div class="ledger-table-wrap">
          <table class="ledger-table">
            <thead>
              <tr>
                <th>Operator</th>
                <th>Business</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Registered</th>
                <th class="text-right">Controls</th>
              </tr>
            </thead>
            <tbody>
              ${clientUsers.map(u => `
                <tr>
                  <td><b>${esc(u.name || 'Client')}</b></td>
                  <td>${esc(u.business_name || '-')}</td>
                  <td>${esc(u.email)}</td>
                  <td>${esc(u.phone || '-')}</td>
                  <td>
                    <span class="badge ${u.status === 'approved' ? 'badge-cloud' : (u.status === 'pending' ? 'badge-local' : 'tag-risk')}">
                      ${u.status === 'approved' ? 'Active' : (u.status === 'pending' ? 'Pending' : 'Suspended')}
                    </span>
                  </td>
                  <td>${formatDate(u.created_at)}</td>
                  <td class="text-right">
                    <div style="display: inline-flex; gap: 6px;">
                      ${u.status === 'approved' ? `
                        <button class="action-chip action-chip-undo" data-suspend="${u.id}">Suspend</button>
                      ` : `
                        <button class="action-chip action-chip-success" data-approve="${u.id}">Approve</button>
                      `}
                      <button class="action-chip btn-danger" data-delete-user="${u.id}">Delete</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <div style="text-align: center; padding: 20px; color: var(--mu); font-size: 13px;">
          No business clients registered yet.
        </div>
      `}
    </div>

    <!-- Platform Maintenance Footer -->
    <footer class="saas-footer">
      <div>Platform Administration Console · Isolated Role</div>
      <div>
        <button class="btn btn-outline" id="btn-admin-clear-cache" type="button" style="font-size: 11.5px; padding: 6px 12px; color: var(--risk);">
          Reset Local Browser Storage
        </button>
      </div>
    </footer>
  `;

  // Approve / Reactivate
  document.querySelectorAll('[data-approve], [data-reactivate]').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement;
      const id = el.dataset.approve || el.dataset.reactivate;
      if (!id) return;
      userManager.approveUser(id, admSess?.userId);
      toast('License activated! Client workspace provisioned with clean slate.', 'success');
      renderAdminPortal();
    });
  });

  // Suspend / Reject
  document.querySelectorAll('[data-suspend], [data-reject]').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement;
      const id = el.dataset.suspend || el.dataset.reject;
      if (!id) return;
      userManager.rejectUser(id);
      toast('Client license suspended / rejected.', 'info');
      renderAdminPortal();
    });
  });

  // Delete user + workspace cascade
  document.querySelectorAll('[data-delete-user]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.deleteUser!;
      if (confirm('Permanently delete this client account and all associated workspace records?')) {
        userManager.deleteUser(id);
        if (inspectedWs && inspectedWs.owner_id === id) inspectedWsId = null;
        toast('Client and workspace deleted', 'info');
        renderAdminPortal();
      }
    });
  });

  // Inspect Tenant In-Page (Zero Client Session Hijack!)
  document.querySelectorAll('[data-inspect-ws]').forEach(btn => {
    btn.addEventListener('click', () => {
      inspectedWsId = (btn as HTMLElement).dataset.inspectWs || null;
      renderAdminPortal();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.getElementById('btn-close-inspector')?.addEventListener('click', () => {
    inspectedWsId = null;
    renderAdminPortal();
  });

  document.getElementById('btn-export-tenant-xls')?.addEventListener('click', () => {
    if (!inspectedWs) return;
    const custs = db.getCustomers(inspectedWs.id);
    const loans = db.getLoans(inspectedWs.id);
    const pays = db.getPayments(inspectedWs.id);
    const xml = generateExcelWorkbook(inspectedWs.name, custs, loans, pays, []);
    downloadExcelFile(`${inspectedWs.name.replace(/\s+/g, '_')}_Audit.xls`, xml);
    toast('Tenant Excel report exported!', 'success');
  });

  document.getElementById('btn-admin-theme')?.addEventListener('click', () => {
    const next = toggleTheme();
    const btn = document.getElementById('btn-admin-theme');
    if (btn) btn.textContent = next === 'light' ? '🌙' : '☀️';
  });

  document.getElementById('btn-admin-signout')?.addEventListener('click', () => {
    adminSession.endAdminSession();
    inspectedWsId = null;
    toast('Signed out of Platform Administration', 'info');
    renderAdminPortal();
  });

  document.getElementById('btn-admin-clear-cache')?.addEventListener('click', () => {
    if (confirm('Reset all local browser storage? All local accounts and workspaces in this browser will be erased.')) {
      clearAllBrowserData(false);
      inspectedWsId = null;
      renderAdminPortal();
      toast('Local storage reset cleanly', 'info');
    }
  });
};

(async () => {
  renderAdminPortal();
})();
