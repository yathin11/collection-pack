import {
  boot,
  load,
  planned,
  todayList,
  dueAmt,
  rowHtml,
  bindPay,
  money,
  today,
  addDays,
  $,
  Row,
  toast,
} from './core';

let on = today();
let rows: Row[] = [];
let activeFilter = 'all'; // 'all', 'pending', 'paid'
let searchQuery = '';

async function render() {
  const d = await load(on);
  const pl = await planned(on);
  rows = d.rows;

  const rawList = todayList(rows, pl);
  const targetTotal = rawList.reduce((a, r) => a + dueAmt(r), 0);
  const collectedTotal = rows.reduce((a, r) => a + r.paidOn, 0);
  const progressPercent = targetTotal > 0 ? Math.min(100, Math.round((collectedTotal / targetTotal) * 100)) : (collectedTotal > 0 ? 100 : 0);

  // Filter list
  let filtered = rawList.filter(r => {
    if (activeFilter === 'pending') return r.paidOn === 0;
    if (activeFilter === 'paid') return r.paidOn > 0;
    return true;
  });

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(r =>
      (r.c.name + ' ' + r.c.phone + ' ' + (r.c.village || '') + ' ' + (r.c.area || '')).toLowerCase().includes(q)
    );
  }

  const app = $('#app');
  if (!app) return;

  app.innerHTML = `
    <!-- Top Date Bar & Quick Switcher -->
    <div class="card noprint">
      <div style="display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap;">
        <div style="display: flex; gap: 6px; align-items: center; flex: 1 1 200px;">
          <input type="date" id="date-input" value="${on}" style="font-weight: 700; width: auto; flex: 1;">
          <button class="btn btn-secondary" id="btn-today" type="button" style="padding: 8px 12px; flex-shrink: 0;">Today</button>
        </div>
        <div style="display: flex; gap: 6px; flex: 1 1 auto; justify-content: flex-end;">
          <a class="btn btn-outline" href="plan.html" style="font-size: 13px; flex: 1 1 auto; text-align: center;">📅 Plan Day</a>
          <a class="btn btn-secondary" href="route.html" style="font-size: 13px; flex: 1 1 auto; text-align: center;">🧭 Route Map</a>
        </div>
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="stats-grid">
      <div class="stat-box">
        <span class="stat-label">Scheduled Target</span>
        <span class="stat-val">${money(targetTotal)}</span>
        <span class="stat-sub">${rawList.length} customers scheduled</span>
      </div>

      <div class="stat-box stat-success">
        <span class="stat-label">Collected</span>
        <span class="stat-val c-success">${money(collectedTotal)}</span>
        <span class="stat-sub">${rows.filter(r => r.paidOn > 0).length} received today</span>
      </div>

      <div class="stat-box stat-warning">
        <span class="stat-label">Remaining Due</span>
        <span class="stat-val c-warning">${money(Math.max(0, targetTotal - collectedTotal))}</span>
        <span class="stat-sub">${rawList.filter(r => r.paidOn === 0).length} stops left</span>
      </div>

      <div class="stat-box">
        <span class="stat-label">Collection Rate</span>
        <span class="stat-val">${progressPercent}%</span>
        <span class="stat-sub">of target collected</span>
      </div>
    </div>

    <!-- Filter & Search Toolbar -->
    <div class="card" style="padding: 12px 16px;">
      <div class="search-box-wrap" style="margin-bottom: 8px;">
        <span class="search-icon">🔍</span>
        <input type="text" id="search-input" placeholder="Search customer, phone, village..." value="${searchQuery}">
      </div>

      <div class="chips-wrap" style="margin: 4px 0 0;">
        <span class="filter-chip ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">
          All (${rawList.length})
        </span>
        <span class="filter-chip ${activeFilter === 'pending' ? 'active' : ''}" data-filter="pending">
          ⏳ Pending (${rawList.filter(r => r.paidOn === 0).length})
        </span>
        <span class="filter-chip ${activeFilter === 'paid' ? 'active' : ''}" data-filter="paid">
          ✓ Paid (${rawList.filter(r => r.paidOn > 0).length})
        </span>
      </div>
    </div>

    <!-- Customer Collection Cards List -->
    <div id="collect-list">
      ${filtered.length > 0
        ? filtered.map(r => rowHtml(r, pl.has(r.l.id))).join('')
        : `<div class="card" style="text-align: center; padding: 40px 16px; color: var(--mu);">
            <div style="font-size: 36px; margin-bottom: 8px;">✨</div>
            <h3 style="color: var(--tx);">No customers found for this filter</h3>
            <p style="margin: 6px 0 16px;">Schedule collections using the Plan Day tool or pick another date.</p>
            <a class="btn btn-primary" href="plan.html">📅 Open Day Planner</a>
          </div>`
      }
    </div>
  `;

  // Bind change on date
  (document.getElementById('date-input') as HTMLInputElement).onchange = e => {
    on = (e.target as HTMLInputElement).value || today();
    render();
  };

  document.getElementById('btn-today')?.addEventListener('click', () => {
    on = today();
    render();
  });

  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeFilter = (chip as HTMLElement).dataset.filter || 'all';
      render();
    });
  });

  // Search input
  const searchInput = document.getElementById('search-input') as HTMLInputElement;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      const filteredCards = rawList.filter(r => {
        if (activeFilter === 'pending') return r.paidOn === 0;
        if (activeFilter === 'paid') return r.paidOn > 0;
        return true;
      }).filter(r =>
        (r.c.name + ' ' + r.c.phone + ' ' + (r.c.village || '') + ' ' + (r.c.area || '')).toLowerCase().includes(searchQuery.toLowerCase().trim())
      );

      const listContainer = document.getElementById('collect-list');
      if (listContainer) {
        listContainer.innerHTML = filteredCards.length > 0
          ? filteredCards.map(r => rowHtml(r, pl.has(r.l.id))).join('')
          : `<div class="card" style="text-align: center; padding: 32px; color: var(--mu);">No matching customers.</div>`;
      }
    });
  }
}

(async () => {
  try {
    await boot();
    bindPay(render, () => rows, () => on);
    await render();

    if ('Notification' in window && Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch {}
    }
  } catch (err: any) {
    console.error('Today render error:', err);
    toast('Error loading today collections: ' + (err.message || 'Error'), 'error');
  }
})();
