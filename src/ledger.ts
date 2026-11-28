import {
  boot,
  load,
  money,
  esc,
  endDate,
  $,
  Row,
  toast,
  wa,
  db,
  formatPayMode,
  formatPayType,
} from './core';

(async () => {
  try {
    await boot();
    const { customers, rows, payments } = await load();

    const urlParams = new URLSearchParams(location.search);
    const preselectCid = urlParams.get('c') || '';
    const preselectLoan = urlParams.get('loan') || '';

    let area = '';
    let selectedCustId = preselectCid && customers.some(c => c.id === preselectCid) ? preselectCid : '';
    let selectedLoanId = preselectLoan || '';
    const areas = [...new Set(customers.map(c => (c.area || '').trim()).filter(Boolean))];

    const draw = () => {
      const inA = (c: any) => !area || (c.area || '').trim().toLowerCase() === area.toLowerCase();
      const filteredCusts = customers.filter(inA);

      let list = rows.filter(r => inA(r.c) && (!selectedCustId || r.c.id === selectedCustId));
      if (selectedLoanId && list.some(r => r.l.id === selectedLoanId)) {
        list = list.filter(r => r.l.id === selectedLoanId);
      }

      // Order cleanly: Main loans before their Child loans
      const ordered: Row[] = [];
      const seen = new Set<string>();
      list.filter(r => !r.l.parent_loan_id).forEach(pr => {
        ordered.push(pr);
        seen.add(pr.l.id);
        list.filter(cr => cr.l.parent_loan_id === pr.l.id).forEach(cr => {
          ordered.push(cr);
          seen.add(cr.l.id);
        });
      });
      list.forEach(r => { if (!seen.has(r.l.id)) ordered.push(r); });
      list = ordered;

      const sum = (f: (r: Row) => number) => list.reduce((a, r) => a + f(r), 0);

      const totalGiven = sum(r => r.l.principal);
      const totalDue = sum(r => r.l.total);
      const totalPaid = sum(r => r.paid);
      const totalBal = sum(r => r.outstanding);

      // Compute Cash / UPI / Bank breakdown across displayed loans
      const shownLoanIds = new Set(list.map(r => r.l.id));
      const shownPayments = payments.filter(p => shownLoanIds.has(p.loan_id));
      const cashTotal = shownPayments.filter(p => (p.pay_mode || 'cash') === 'cash').reduce((s, p) => s + Number(p.amount), 0);
      const upiTotal = shownPayments.filter(p => p.pay_mode === 'upi').reduce((s, p) => s + Number(p.amount), 0);
      const bankTotal = shownPayments.filter(p => p.pay_mode === 'bank').reduce((s, p) => s + Number(p.amount), 0);

      const singleCustomer = selectedCustId ? customers.find(c => c.id === selectedCustId) : null;
      const wsName = db.getCurrentWorkspace()?.name || 'Collection Manager';

      const waStatementMsg = singleCustomer
        ? `Account Statement - ${wsName}\nBorrower: ${singleCustomer.name}\nTotal Loan Amount: ${money(totalDue)}\nTotal Repaid: ${money(totalPaid)} (Cash ${money(cashTotal)}${upiTotal ? `, UPI ${money(upiTotal)}` : ''}${bankTotal ? `, Bank ${money(bankTotal)}` : ''})\nBalance Due: ${money(totalBal)}\nThank you.`
        : '';

      const block = (r: Row) => {
        let bal = 0;
        const isChild = !!r.l.parent_loan_id;
        const loanTitle = r.l.loan_label || (isChild ? 'Child Loan' : 'Main Loan');

        const loanPays = payments
          .filter((p: any) => p.loan_id === r.l.id)
          .sort((a: any, b: any) => a.paid_on.localeCompare(b.paid_on) || (a.created_at || '').localeCompare(b.created_at || ''));

        const entries: Array<{ date: string; part: string; modeTypeHtml: string; debit: number; credit: number }> = [
          {
            date: r.l.start_date,
            part: `Principal Disbursed (${loanTitle})`,
            modeTypeHtml: '<span class="tag tag-mode">Disbursement</span>',
            debit: Number(r.l.principal),
            credit: 0,
          },
          {
            date: r.l.start_date,
            part: 'Interest Charge (' + (r.l.int_type === 'pct' ? r.l.int_val + '%' : 'flat') + ')',
            modeTypeHtml: '<span class="tag tag-mode">Interest</span>',
            debit: Number(r.l.total) - Number(r.l.principal),
            credit: 0,
          },
          ...loanPays.map((p: any) => ({
            date: p.paid_on,
            part: 'Payment Received',
            modeTypeHtml: `<span class="receipt-pill">${formatPayMode(p.pay_mode)} · <b>${formatPayType(p.pay_type)}</b></span>`,
            debit: 0,
            credit: Number(p.amount),
          })),
        ];

        return `
          <div class="card ${isChild ? 'is-child-loan' : ''}" style="margin-bottom: 16px;">
            <div class="card-title-row" style="margin-bottom: 8px;">
              <div>
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <b style="font-size: 16px; color: var(--tx);">${esc(r.c.name)}</b>
                  <span class="tag tag-mode">${r.l.mode}</span>
                  ${isChild
                    ? `<span class="tag tag-child">↳ ${esc(loanTitle)}</span>`
                    : `<span class="tag tag-plan">${esc(loanTitle)}</span>`}
                  ${r.cleared ? '<span class="tag tag-success">Cleared</span>' : ''}
                  ${r.risk ? '<span class="tag tag-risk">At Risk</span>' : ''}
                </div>
              </div>
              <div style="text-align: right;">
                <span class="sub-label">Balance</span>
                <b style="font-size: 18px; color: ${r.cleared ? 'var(--success)' : (r.risk ? 'var(--risk)' : 'var(--tx)')};">
                  ${money(r.outstanding)}
                </b>
              </div>
            </div>

            <div style="font-size: 12px; color: var(--mu); margin-bottom: 10px;">
              📞 ${esc(r.c.phone || '-')} · 📍 ${esc([r.c.village, r.c.area].filter(Boolean).join(', ') || 'No area set')} · Term: ${r.l.start_date} to ${endDate(r.l)}
            </div>

            <div class="ledger-table-wrap">
              <table class="ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Particulars</th>
                    <th>Mode & Payment Type</th>
                    <th class="text-right">Debit (₹)</th>
                    <th class="text-right">Credit (₹)</th>
                    <th class="text-right">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${entries.map(x => {
                    bal += x.debit - x.credit;
                    return `
                      <tr>
                        <td>${x.date}</td>
                        <td>${esc(x.part)}</td>
                        <td>${x.modeTypeHtml}</td>
                        <td class="text-right">${x.debit ? money(x.debit) : '-'}</td>
                        <td class="text-right" style="color: ${x.credit ? 'var(--success)' : 'inherit'}; font-weight: ${x.credit ? '600' : 'normal'};">
                          ${x.credit ? money(x.credit) : '-'}
                        </td>
                        <td class="text-right" style="font-weight: 700;">${money(bal)}</td>
                      </tr>
                    `;
                  }).join('')}
                  <tr style="background: var(--in); font-weight: 800;">
                    <td colspan="3">Loan Account Total</td>
                    <td class="text-right">${money(r.l.total)}</td>
                    <td class="text-right" style="color: var(--success);">${money(r.paid)}</td>
                    <td class="text-right" style="color: ${r.cleared ? 'var(--success)' : 'var(--tx)'};">${money(r.outstanding)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="font-size: 12px; color: var(--mu); margin-top: 8px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
              <span>Status: ${r.cleared ? '✅ Fully Repaid' : `Pending Due: ${money(r.pending)}`}</span>
              <span>Installment: ${money(r.l.inst)}/${r.l.mode === 'daily' ? 'day' : 'wk'}</span>
            </div>
          </div>
        `;
      };

      const app = $('#app');
      if (!app) return;

      app.innerHTML = `
        <!-- Filter & Individual Borrower Selector -->
        <div class="card noprint">
          <div class="card-title-row">
            <div>
              <h2 class="card-title">📒 Individual & Overall Ledger</h2>
              <p style="font-size: 12.5px; color: var(--mu); margin-top: 2px;">
                View individual borrower passbooks, parent & child loan accounts, and payment modes.
              </p>
            </div>
            <button class="btn btn-primary" id="btn-print" type="button">
              🖨️ Print / PDF
            </button>
          </div>

          <div class="form-row form-row-2">
            <div>
              <label for="cust-select">Individual Borrower Ledger</label>
              <select id="cust-select">
                <option value="">All Borrowers (${filteredCusts.length})</option>
                ${filteredCusts.map(c => `<option value="${c.id}" ${c.id === selectedCustId ? 'selected' : ''}>${esc(c.name)} · 📞 ${esc(c.phone)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label for="area-select">Filter by Area</label>
              <select id="area-select">
                <option value="">All Areas (${customers.length} customers)</option>
                ${areas.map(a => `<option value="${esc(a)}" ${a === area ? 'selected' : ''}>${esc(a)}</option>`).join('')}
              </select>
            </div>
          </div>

          ${filteredCusts.length > 0 ? `
            <div style="margin-top: 8px;">
              <span class="sub-label" style="margin-bottom: 4px;">Quick Individual Passbook Switch</span>
              <div class="chips-wrap">
                <span class="filter-chip ${!selectedCustId ? 'active' : ''}" data-cid="">All</span>
                ${filteredCusts.map(c => `
                  <span class="filter-chip ${selectedCustId === c.id ? 'active' : ''}" data-cid="${c.id}">
                    ${esc(c.name)}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${selectedLoanId && selectedCustId ? `
            <div style="margin-top: 10px;">
              <button class="btn btn-outline" id="btn-show-all-cust-loans" type="button" style="font-size: 12px; padding: 6px 12px;">
                Show All Loans (Parent & Child) for ${esc(singleCustomer?.name || 'Customer')}
              </button>
            </div>
          ` : ''}
        </div>

        <!-- Individual Borrower Profile Header (when specific individual is selected) -->
        ${singleCustomer ? `
          <div class="card" style="border-left: 4px solid var(--primary);">
            <div class="card-title-row" style="margin-bottom: 10px;">
              <div>
                <span class="sub-label" style="color: var(--primary);">Individual Borrower Passbook</span>
                <h2 style="font-size: 20px; font-weight: 800; color: var(--tx); margin-top: 2px;">
                  ${esc(singleCustomer.name)}
                </h2>
                <div style="font-size: 12.5px; color: var(--mu); margin-top: 4px;">
                  📞 ${esc(singleCustomer.phone || '-')} · 📍 ${esc([singleCustomer.address, singleCustomer.village, singleCustomer.area].filter(Boolean).join(', ') || 'No address set')}
                  ${singleCustomer.id_note ? ` · ID: ${esc(singleCustomer.id_note)}` : ''}
                  ${singleCustomer.guarantor ? ` · Guarantor: ${esc(singleCustomer.guarantor)}` : ''}
                </div>
              </div>
              <div class="action-links noprint" style="margin-top: 0;">
                ${singleCustomer.phone ? `<a class="action-chip" href="tel:${esc(singleCustomer.phone)}">📞 Call</a>` : ''}
                ${singleCustomer.phone ? `<a class="action-chip action-chip-success" href="${wa(singleCustomer.phone, waStatementMsg)}" target="_blank" rel="noopener">💬 Send Statement</a>` : ''}
                <a class="action-chip" href="customers.html?cust=${singleCustomer.id}">＋ Child Loan</a>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Financial Summary & Payment Mode Breakdown -->
        <div class="card">
          <div class="card-title-row">
            <div>
              <h3 style="font-size: 17px; font-weight: 800; color: var(--tx);">
                ${singleCustomer ? `${esc(singleCustomer.name)} · Summary` : `Financial Statement ${area ? '· ' + esc(area) : ''}`}
              </h3>
              <p style="font-size: 12px; color: var(--mu);">
                Generated ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <span class="badge badge-local">${list.length} loan account${list.length === 1 ? '' : 's'}</span>
          </div>

          <div class="stats-grid" style="margin-top: 12px;">
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
              <span class="stat-sub">Cash ${money(cashTotal)} · UPI ${money(upiTotal)}</span>
            </div>
            <div class="stat-box stat-warning">
              <span class="stat-label">Net Balance Left</span>
              <span class="stat-val c-warning">${money(totalBal)}</span>
              <span class="stat-sub">Bank ${money(bankTotal)}</span>
            </div>
          </div>
        </div>

        <!-- Loan-by-Loan Ledger Entries -->
        ${list.length > 0 ? list.map(block).join('') : `
          <div class="card" style="text-align: center; padding: 40px; color: var(--mu);">
            No loan accounts match the selected borrower or area filter.
          </div>
        `}
      `;

      // Individual customer dropdown change
      (document.getElementById('cust-select') as HTMLSelectElement).onchange = e => {
        selectedCustId = (e.target as HTMLSelectElement).value;
        selectedLoanId = '';
        draw();
      };

      // Area change
      (document.getElementById('area-select') as HTMLSelectElement).onchange = e => {
        area = (e.target as HTMLSelectElement).value;
        selectedCustId = '';
        selectedLoanId = '';
        draw();
      };

      // Quick Customer chips
      document.querySelectorAll('.chips-wrap .filter-chip').forEach(c => {
        c.addEventListener('click', () => {
          selectedCustId = (c as HTMLElement).dataset.cid || '';
          selectedLoanId = '';
          draw();
        });
      });

      document.getElementById('btn-show-all-cust-loans')?.addEventListener('click', () => {
        selectedLoanId = '';
        draw();
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
