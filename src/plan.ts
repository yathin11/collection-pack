import { boot, load, addDays, today, esc, money, db, $, toast } from './core';

let day = addDays(today(), 1);
let searchQuery = '';

async function render() {
  const { rows } = await load(day);
  const activeLoans = rows.filter(r => !r.cleared);
  const planItems = db.getPlanDays().filter(p => p.day === day);
  const sel = new Set(planItems.map(x => x.loan_id));

  let filtered = activeLoans;
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(r =>
      (r.c.name + ' ' + r.c.phone + ' ' + (r.c.village || '') + ' ' + (r.c.area || '')).toLowerCase().includes(q)
    );
  }

  const app = $('#app');
  if (!app) return;

  app.innerHTML = `
    <div class="card">
      <div class="card-title-row">
        <div>
          <h2 class="card-title">📅 Collection Day Planner</h2>
          <p style="font-size: 13px; color: var(--mu); margin-top: 2px;">
            Select which customers to visit and collect from on this date.
          </p>
        </div>
        <span class="badge badge-local" style="font-size: 13px; padding: 4px 10px;">
          ${sel.size} scheduled
        </span>
      </div>

      <div style="display: flex; gap: 10px; align-items: center; margin-top: 14px; flex-wrap: wrap;">
        <input type="date" id="plan-date" value="${day}" style="font-weight: 700; width: auto; flex: 1;">
        <button class="btn btn-secondary" id="btn-tomorrow" type="button">Tomorrow</button>
        <button class="btn btn-secondary" id="btn-today" type="button">Today</button>
      </div>
    </div>

    <!-- Toolbar: Search & Bulk Selection -->
    <div class="card" style="padding: 12px 16px;">
      <div class="search-box-wrap" style="margin-bottom: 8px;">
        <span class="search-icon">🔍</span>
        <input type="text" id="search-input" placeholder="Search customer, area, village..." value="${searchQuery}">
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
        <span style="font-size: 13px; font-weight: 600; color: var(--tx);">
          ${filtered.length} active loans
        </span>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-outline" id="btn-select-all" type="button" style="padding: 5px 10px; font-size: 12px;">
            ✓ Select All
          </button>
          <button class="btn btn-outline" id="btn-clear-all" type="button" style="padding: 5px 10px; font-size: 12px;">
            ✕ Clear All
          </button>
        </div>
      </div>
    </div>

    <!-- Customer Checklist -->
    <div class="card" id="plan-list" style="padding: 0 16px;"></div>

    <div style="margin-top: 16px;">
      <a class="btn btn-primary btn-block" href="today.html" style="font-size: 15px; padding: 12px;">
        ✓ Done Planning · Go to Today Collection
      </a>
    </div>
  `;

  const renderChecklist = () => {
    let list = activeLoans;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r =>
        (r.c.name + ' ' + r.c.phone + ' ' + (r.c.village || '') + ' ' + (r.c.area || '')).toLowerCase().includes(q)
      );
    }
    const container = document.getElementById('plan-list');
    if (!container) return;
    container.innerHTML = list.length > 0 ? list.map(r => {
      const isChecked = sel.has(r.l.id);
      const loc = [r.c.village, r.c.area].filter(Boolean).join(', ');
      return `
        <label style="display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid var(--card-border); cursor: pointer; margin: 0;">
          <div style="flex: 1; padding-right: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <b style="font-size: 15px; color: var(--tx);">${esc(r.c.name)}</b>
              <span class="tag tag-mode">${r.l.mode}</span>
              ${r.pending > Number(r.l.inst) ? `<span class="tag tag-overdue">Overdue</span>` : ''}
            </div>
            <div style="font-size: 12px; color: var(--mu); margin-top: 3px;">
              📍 ${esc(loc || 'No area set')} · Balance: <b style="color:var(--tx);">${money(r.outstanding)}</b> · Due: ${money(r.l.inst)}
            </div>
          </div>
          <input type="checkbox" style="width: 22px; height: 22px; accent-color: var(--primary); cursor: pointer; flex-shrink: 0;"
                 data-id="${r.l.id}" ${isChecked ? 'checked' : ''}>
        </label>
      `;
    }).join('') : `
      <div style="text-align: center; padding: 32px; color: var(--mu);">
        ${activeLoans.length === 0
          ? 'No active customers yet. <a href="customers.html" style="color:var(--primary); font-weight:600;">Add your first borrower</a> first.'
          : 'No matching active customers.'}
      </div>
    `;

    container.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => {
        const el = cb as HTMLInputElement;
        const loanId = el.dataset.id;
        if (!loanId) return;
        db.togglePlanDay(day, loanId);
        toast(el.checked ? 'Added to schedule' : 'Removed from schedule', 'info');
        render();
      });
    });
  };
  renderChecklist();

  // Bind date change
  (document.getElementById('plan-date') as HTMLInputElement).onchange = e => {
    day = (e.target as HTMLInputElement).value || day;
    render();
  };

  document.getElementById('btn-tomorrow')?.addEventListener('click', () => {
    day = addDays(today(), 1);
    render();
  });

  document.getElementById('btn-today')?.addEventListener('click', () => {
    day = today();
    render();
  });

  // Search input without blurring mobile keyboard
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      renderChecklist();
    });
  }

  // Select all / Clear all
  document.getElementById('btn-select-all')?.addEventListener('click', () => {
    filtered.forEach(r => {
      if (!sel.has(r.l.id)) db.togglePlanDay(day, r.l.id);
    });
    toast('Selected all visible customers', 'success');
    render();
  });

  document.getElementById('btn-clear-all')?.addEventListener('click', () => {
    filtered.forEach(r => {
      if (sel.has(r.l.id)) db.togglePlanDay(day, r.l.id);
    });
    toast('Cleared selections', 'info');
    render();
  });
}

(async () => {
  try {
    await boot();
    await render();
  } catch (err: any) {
    console.error('Plan day render failure:', err);
    toast('Error loading day planner: ' + (err.message || 'Error'), 'error');
  }
})();
