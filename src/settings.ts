import {
  boot,
  db,
  userManager,
  $,
  Workspace,
  toast,
  getStoredCloudConfig,
  setStoredCloudConfig,
  getSupabase,
  generateExcelWorkbook,
  downloadExcelFile,
  backupWorkspaceToCloud,
  restoreWorkspaceFromCloud,
  load,
  esc,
  formatDate,
  SUPER_ADMIN_EMAIL,
} from './core';

const stamp = () => new Date().toISOString().split('T')[0];

const saveCsv = (name: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const saveJson = (name: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const csv = (r: any[]) => {
  if (!r.length) return '';
  const h = Object.keys(r[0]);
  return [h, ...r.map(x => h.map(k => x[k]))]
    .map(a => a.map((v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(','))
    .join('\n');
};

(async () => {
  try {
    const ws = await boot();
    const curUser = userManager.getCurrentUser();
    const cloudCfg = getStoredCloudConfig();
    const { customers, loans, payments, rows } = await load();

    const app = $('#app');
    if (!app) return;

    app.innerHTML = `
      <!-- Workspace Information Card -->
      <div class="card">
        <div class="card-title-row">
          <div>
            <h2 class="card-title">🏢 Workspace Profile</h2>
            <p style="font-size: 13px; color: var(--mu); margin-top: 2px;">
              Manage active workspace settings & collection frequencies.
            </p>
          </div>
          <span class="badge ${ws.cloud_sync ? 'badge-cloud' : 'badge-local'}">
            ${ws.cloud_sync ? '☁️ Cloud Connected' : '⚡ Local-First'}
          </span>
        </div>

        <label for="ws-name-input">Workspace Business Name</label>
        <div style="display: flex; gap: 8px;">
          <input id="ws-name-input" value="${esc(ws.name)}">
          <button class="btn btn-secondary" id="btn-save-name" type="button">Update</button>
        </div>

        <div style="margin-top: 14px; font-size: 12px; color: var(--mu);">
          Owner: <b>${esc(ws.owner_email)}</b> · Workspace ID: <code>${esc(ws.id)}</code>
        </div>

        <div style="margin-top: 16px;">
          <label style="font-size: 13px; font-weight: 700; color: var(--tx);">Enabled Collection Frequencies</label>
          <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--card-border); cursor: pointer; margin: 0;">
            <span>Daily Collection (Daily installments)</span>
            <input type="checkbox" id="daily-toggle" style="width: 22px; height: 22px; accent-color: var(--primary);" ${ws.daily_on ? 'checked' : ''}>
          </label>
          <label style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; cursor: pointer; margin: 0;">
            <span>Weekly Collection (7-day installments)</span>
            <input type="checkbox" id="weekly-toggle" style="width: 22px; height: 22px; accent-color: var(--primary);" ${ws.weekly_on ? 'checked' : ''}>
          </label>
        </div>
      </div>

      <!-- EXCEL SPREADSHEET BACKUPS SECTION -->
      <div class="card" style="border-left: 4px solid var(--success);">
        <div class="card-title-row">
          <div>
            <h2 class="card-title">📊 Excel & Spreadsheet Backups</h2>
            <p style="font-size: 13px; color: var(--mu); margin-top: 2px;">
              Export full customer directories, loan schedules, collections & passbook ledger.
            </p>
          </div>
          <span class="badge badge-cloud">Multi-sheet .XLS</span>
        </div>

        <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 10px;">
          <button class="btn btn-primary" id="btn-dl-excel" type="button" style="font-size: 15px; padding: 12px;">
            📥 Download Complete Multi-Sheet Excel Workbook (.xls)
          </button>
          <p style="font-size: 12px; color: var(--mu); margin-top: -4px;">
            Includes 4 separate formatted sheets: <b>Customers</b>, <b>Loans</b>, <b>Payment Collections</b>, and <b>Ledger Summary</b>.
          </p>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
            <button class="btn btn-secondary" id="btn-dl-csv-cust" type="button" style="font-size: 13px;">
              📄 Customers CSV
            </button>
            <button class="btn btn-secondary" id="btn-dl-csv-loans" type="button" style="font-size: 13px;">
              📄 Loans CSV
            </button>
            <button class="btn btn-secondary" id="btn-dl-csv-payments" type="button" style="font-size: 13px;">
              📄 Payments CSV
            </button>
            <button class="btn btn-secondary" id="btn-dl-json" type="button" style="font-size: 13px;">
              📦 Full JSON Backup
            </button>
          </div>
        </div>
      </div>

      <!-- CLOUD BACKUP & SUPABASE SYNC SECTION -->
      <div class="card" style="border-left: 4px solid var(--primary);">
        <div class="card-title-row">
          <div>
            <h2 class="card-title">☁️ Cloud Backup & Supabase Sync</h2>
            <p style="font-size: 13px; color: var(--mu); margin-top: 2px;">
              Safeguard your records with instant cloud backups and multi-device access.
            </p>
          </div>
          <span class="badge ${ws.last_cloud_backup ? 'badge-cloud' : 'badge-local'}">
            ${ws.last_cloud_backup ? 'Cloud Saved: ' + formatDate(ws.last_cloud_backup) : 'No Cloud Backup Yet'}
          </span>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap;">
          <button class="btn btn-primary" id="btn-cloud-backup-now" type="button" style="flex: 1;">
            ☁️ Backup Workspace to Cloud Now
          </button>
          <button class="btn btn-secondary" id="btn-cloud-restore-now" type="button" style="flex: 1;">
            📥 Restore Workspace from Cloud
          </button>
        </div>

        <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed var(--card-border);">
          <details>
            <summary style="font-size: 13px; font-weight: 600; color: var(--mu); cursor: pointer;">
              ⚙️ Supabase Credentials & Connection Settings
            </summary>
            <div style="margin-top: 12px;">
              <label for="cfg-sb-url">Supabase Project URL</label>
              <input id="cfg-sb-url" placeholder="https://yourproject.supabase.co" value="${esc(cloudCfg.url)}">

              <label for="cfg-sb-key">Supabase Public Anon Key</label>
              <input id="cfg-sb-key" type="password" placeholder="sb_publishable_..." value="${esc(cloudCfg.key)}">

              <button class="btn btn-secondary" id="btn-save-cloud-keys" type="button" style="margin-top: 10px;">
                Save Cloud Configuration
              </button>
            </div>
          </details>
        </div>
      </div>

      <!-- Account & Super Admin Link -->
      <div class="card">
        <div class="card-title-row">
          <div>
            <h2 class="card-title">👤 User Account & License</h2>
          </div>
          <span class="badge ${curUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? 'badge-local' : 'tag-mode'}">
            ${curUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? '👑 Super Admin' : '👔 Rented Workspace Owner'}
          </span>
        </div>

        <p style="font-size: 13px; color: var(--tx);">
          Logged in as: <b>${esc(curUser?.email)}</b>
        </p>

        <div style="display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap;">
          ${curUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? `
            <a class="btn btn-primary" href="admin.html" style="flex: 1;">
              👑 Open Super Admin Portal
            </a>
          ` : ''}
          <button class="btn btn-danger" id="btn-logout" type="button" style="flex: 1;">
            🚪 Sign Out
          </button>
        </div>
      </div>
    `;

    // Save workspace name
    document.getElementById('btn-save-name')?.addEventListener('click', () => {
      const val = (document.getElementById('ws-name-input') as HTMLInputElement).value.trim();
      if (!val) { toast('Please enter a business name', 'error'); return; }
      ws.name = val;
      db.saveWorkspace(ws);
      db.setCurrentWorkspace(ws);
      toast('Workspace name updated!', 'success');
      setTimeout(() => location.reload(), 400);
    });

    // Toggle daily / weekly
    document.getElementById('daily-toggle')?.addEventListener('change', e => {
      ws.daily_on = (e.target as HTMLInputElement).checked;
      db.saveWorkspace(ws);
      db.setCurrentWorkspace(ws);
      toast('Daily collection mode updated', 'success');
    });

    document.getElementById('weekly-toggle')?.addEventListener('change', e => {
      ws.weekly_on = (e.target as HTMLInputElement).checked;
      db.saveWorkspace(ws);
      db.setCurrentWorkspace(ws);
      toast('Weekly collection mode updated', 'success');
    });

    // Download Multi-Sheet Excel (.xls)
    document.getElementById('btn-dl-excel')?.addEventListener('click', () => {
      toast('Generating Excel Workbook with all sheets...', 'info');
      const xml = generateExcelWorkbook(ws.name, customers, loans, payments, rows);
      downloadExcelFile(`${ws.name.replace(/\s+/g, '_')}_Backup_${stamp()}.xls`, xml);
      toast('Excel Workbook downloaded successfully!', 'success');
    });

    // Download CSVs
    document.getElementById('btn-dl-csv-cust')?.addEventListener('click', () => {
      saveCsv(`customers_${stamp()}.csv`, csv(customers));
      toast('Customers CSV exported', 'success');
    });

    document.getElementById('btn-dl-csv-loans')?.addEventListener('click', () => {
      saveCsv(`loans_${stamp()}.csv`, csv(loans));
      toast('Loans CSV exported', 'success');
    });

    document.getElementById('btn-dl-csv-payments')?.addEventListener('click', () => {
      saveCsv(`payments_${stamp()}.csv`, csv(payments));
      toast('Payments CSV exported', 'success');
    });

    // Download JSON
    document.getElementById('btn-dl-json')?.addEventListener('click', () => {
      const dump = {
        workspace: ws,
        customers,
        loans,
        payments,
        plan_days: db.getPlanDays(ws.id),
      };
      saveJson(`${ws.name.replace(/\s+/g, '_')}_backup_${stamp()}.json`, JSON.stringify(dump, null, 2));
      toast('Full JSON backup downloaded', 'success');
    });

    // Cloud Backup Now
    document.getElementById('btn-cloud-backup-now')?.addEventListener('click', async () => {
      toast('Starting cloud backup to Supabase...', 'info');
      const res = await backupWorkspaceToCloud();
      if (res.success) {
        toast(res.message, 'success');
        setTimeout(() => location.reload(), 600);
      } else {
        toast(res.message, 'error');
      }
    });

    // Cloud Restore Now
    document.getElementById('btn-cloud-restore-now')?.addEventListener('click', async () => {
      if (confirm('Restore workspace records from Supabase Cloud? This will sync cloud data into your workspace.')) {
        toast('Restoring from cloud...', 'info');
        const res = await restoreWorkspaceFromCloud();
        if (res.success) {
          toast(res.message, 'success');
          setTimeout(() => location.reload(), 600);
        } else {
          toast(res.message, 'error');
        }
      }
    });

    // Save Cloud Keys
    document.getElementById('btn-save-cloud-keys')?.addEventListener('click', () => {
      const url = (document.getElementById('cfg-sb-url') as HTMLInputElement).value.trim();
      const key = (document.getElementById('cfg-sb-key') as HTMLInputElement).value.trim();
      setStoredCloudConfig(url, key);
      toast('Cloud configuration saved!', 'success');
    });

    // Sign Out
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      userManager.setCurrentUser(null);
      const client = getSupabase();
      if (client) { try { await client.auth.signOut(); } catch {} }
      toast('Signed out successfully', 'info');
      setTimeout(() => location.href = 'login.html', 300);
    });
  } catch (err: any) {
    console.error('Settings render error:', err);
    toast('Error loading settings: ' + (err.message || 'Error'), 'error');
  }
})();
