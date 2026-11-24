import { boot, load, money, esc, endDate, $, Row, toast } from './core';

(async () => {
  try {
    await boot();
    const { customers, rows, payments } = await load();

    let area = '';
    const sel = new Set<string>();
    const areas = [...new Set(customers.map(c => (c.area || '').trim()).filter(Boolean))];

    const draw = () => {
      const inA = (c: any) => !area || (c.area || '').trim().toLowerCase() === area.toLowerCase();
      const list = rows.filter(r => inA(r.c) && (!sel.size || sel.has(r.c.id)));
      const sum = (f: (r: Row) => number) => list.reduce((a, r) => a + f(r), 0);

      const totalGiven = sum(r => r.l.principal);
      const totalDue = sum(r => r.l.total);
      const totalPaid = sum(r => r.paid);
      const totalBal = sum(r => r.outstanding);

      const block = (r: Row) => {
        let bal = 0;
        const entries: any[] = [
          [r.l.start_date, 'Loan Principal Issued', r.l.principal, 0],
          [r.l.start_date, 'Interest Charge (' + (r.l.int_type === 'pct' ? r.l.int_val + '%' : 'flat') + ')', r.l.total - r.l.principal, 0],
          ...payments
            .filter((p: any) => p.loan_id === r.l.id)
            .sort((a: any, b: any) => a.paid_on.localeCompare(b.paid_on))
            .map((p: any) => [p.paid_on, 'Collection Received', 0, Number(p.amount)]),
        ];

        return `
          <div class="card" style="margin-bottom: 20px;">
            <div class="card-title-row" style="margin-bottom: 8px;">
              <div>
                <b style="font-size: 17px; color: var(--tx);">${esc(r.c.name)}</b>
                <span class="tag tag-mode" style="margin-left: 6px;">${r.l.mode}</span>
                ${r.cleared ? '<span class="tag tag-success">Cleared</span>' : ''}
                ${r.risk ? '<span class="tag tag-risk">At Risk</span>' : ''}
              </div>
              <div style="text-align: right;">
                <span class="sub-label">Balance</span>
                <b style="font-size: 18px; color: ${r.cleared ? 'var(--success)' : (r.risk ? 'var(--risk)' : 'var(--tx)')};">
                  ${money(r.outstanding)}
                </b>
              </div>
            </div>

            <div style="font-size: 12px; color: var(--mu); margin-bottom: 12px;">
              📞 ${esc(r.c.phone)} · 📍 ${esc([r.c.village, r.c.area].filter(Boolean).join(', '))} · Term: ${r.l.start_date} to ${endDate(r.l)}
            </div>

            <div class="ledger-table-wrap">
              <table class="ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Particulars</th>
                    <th class="text-right">Debit (₹)</th>
                    <th class="text-right">Credit (₹)</th>
                    <th class="text-right">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${entries.map(x => {
                    bal += x[2] - x[3];
                    return `
                      <tr>
                        <td>${x[0]}</td>
                        <td>${x[1]}</td>
                        <td class="text-right">${x[2] ? money(x[2]) : '-'}</td>
                        <td class="text-right" style="color: ${x[3] ? 'var(--success)' : 'inherit'}; font-weight: ${x[3] ? '600' : 'normal'};">
                          ${x[3] ? money(x[3]) : '-'}
                        </td>
                        <td class="text-right" style="font-weight: 700;">${money(bal)}</td>
                      </tr>
                    `;
                  }).join('')}
                  <tr style="background: var(--in); font-weight: 800;">
                    <td colspan="2">Total Summary</td>
                    <td class="text-right">${money(r.l.total)}</td>
                    <td class="text-right" style="color: var(--success);">${money(r.paid)}</td>
                    <td class="text-right" style="color: ${r.cleared ? 'var(--success)' : 'var(--tx)'};">${money(r.outstanding)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="font-size: 12px; color: var(--mu); margin-top: 8px; display: flex; justify-content: space-between;">
              <span>Status: ${r.cleared ? '✅ Fully Repaid' : `Pending Now: ${money(r.pending)}`}</span>
              <span>Installment: ${money(r.l.inst)}/${r.l.mode === 'daily' ? 'day' : 'wk'}</span>
            </div>
          </div>
        `;
      };

      const app = $('#app');
      if (!app) return;

      app.innerHTML = `
        <!-- Filter and Print Toolbar -->
        <div class="card noprint">
          <div class="card-title-row">
            <div>
              <h2 class="card-title">📒 Customer Passbook & Ledger</h2>
              <p style="font-size: 13px; color: var(--mu); margin-top: 2px;">
                Filter statement by area or person and print official PDF passbooks.
              </p>
            </div>
            <button class="btn btn-primary" id="btn-print" type="button">
              🖨️ Print / Save as PDF
            </button>
          </div>

          <label for="area-select">Filter by Area</label>
          <select id="area-select">
            <option value="">All Areas (${customers.length} total customers)</option>
            ${areas.map(a => `<option value="${esc(a)}" ${a === area ? 'selected' : ''}>${esc(a)}</option>`).join('')}
          </select>

          <label style="margin-top: 12px;">Select Customer (click to filter, empty = all)</label>
          <div class="chips-wrap">
            ${customers.filter(inA).map(c => `
              <span class="filter-chip ${sel.has(c.id) ? 'active' : ''}" data-id="${c.id}">
                ${esc(c.name)}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Ledger Header Summary Card -->
        <div class="card">
          <div class="card-title-row">
            <div>
              <h3 style="font-size: 18px; font-weight: 800; color: var(--tx);">
                Financial Statement ${area ? '· ' + esc(area) : ''}
              </h3>
              <p style="font-size: 12px; color: var(--mu);">
                Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <span class="badge badge-local">${list.length} loans included</span>
          </div>

          <div class="stats-grid" style="margin-top: 14px;">
            <div class="stat-box">
              <span class="stat-label">Principal Given</span>
              <span class="stat-val">${money(totalGiven)}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Total with Interest</span>
              <span class="stat-val">${money(totalDue)}</span>
            </div>
            <div class="stat-box stat-success">
              <span class="stat-label">Total Received</span>
              <span class="stat-val c-success">${money(totalPaid)}</span>
            </div>
            <div class="stat-box stat-warning">
              <span class="stat-label">Net Balance Left</span>
              <span class="stat-val c-warning">${money(totalBal)}</span>
            </div>
          </div>
        </div>

        <!-- Ledger Entries -->
        ${list.length > 0 ? list.map(block).join('') : `
          <div class="card" style="text-align: center; padding: 40px; color: var(--mu);">
            No loans match the selected area and customer filter.
          </div>
        `}
      `;

      // Area change
      (document.getElementById('area-select') as HTMLSelectElement).onchange = e => {
        area = (e.target as HTMLSelectElement).value;
        sel.clear();
        draw();
      };

      // Customer chips
      document.querySelectorAll('.chips-wrap .filter-chip').forEach(c => {
        c.addEventListener('click', () => {
          const id = (c as HTMLElement).dataset.id!;
          if (sel.has(id)) sel.delete(id);
          else sel.add(id);
          draw();
        });
      });

      // Print
      document.getElementById('btn-print')?.addEventListener('click', () => {
        window.print();
      });
    };

    draw();
  } catch (err: any) {
    console.error('Ledger render failure:', err);
    toast('Error loading ledger: ' + (err.message || 'Error'), 'error');
  }
})();
