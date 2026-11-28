import {
  boot,
  load,
  money,
  today,
  esc,
  db,
  $,
  Org,
  Customer,
  Loan,
  toast,
  getSupabase,
} from './core';

(async () => {
  try {
    const org: Org = await boot();
    const { customers, loans, rows } = await load();

    const params = new URLSearchParams(location.search);
    const preCust = params.get('cust') || '';
    const preParent = params.get('parent') || '';

    const g = (id: string) => ((document.getElementById(id) as HTMLInputElement)?.value || '').trim();

    const modes = [
      org.daily_on ? '<option value="daily">Daily Collection</option>' : '',
      org.weekly_on ? '<option value="weekly">Weekly Collection</option>' : '',
    ].filter(Boolean).join('') || '<option value="daily">Daily Collection</option>';

    const areas = [...new Set(customers.map((c: any) => c.area).filter(Boolean))];

    const app = $('#app');
    if (!app) return;

    app.innerHTML = `
      <!-- Add Customer / Main or Child Loan Form Accordion -->
      <details class="card" id="form-details" ${customers.length === 0 || preCust ? 'open' : ''}>
        <summary style="font-size: 16px; font-weight: 700; color: var(--tx); cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
          <span>＋ Issue Loan / Child Loan / Add Customer</span>
          <span style="font-size: 12px; font-weight: 600; color: var(--primary);">Tap to toggle</span>
        </summary>

        <div style="margin-top: 16px; border-top: 1px solid var(--card-border); padding-top: 14px;">
          <!-- Existing Customer Dropdown -->
          <div class="form-field">
            <label for="ex">Customer Selection</label>
            <select id="ex">
              <option value="">＋ Create New Customer Profile</option>
              ${customers.map(c => `<option value="${c.id}" ${c.id === preCust ? 'selected' : ''}>${esc(c.name)} · 📞 ${esc(c.phone)}${c.village || c.area ? ` (${esc(c.village || c.area)})` : ''}</option>`).join('')}
            </select>
          </div>

          <!-- New Customer Details Section -->
          <div id="nc" style="margin-top: 10px; ${preCust ? 'display: none;' : ''}">
            <div class="form-row form-row-2">
              <div>
                <label for="nm">Full Name *</label>
                <input id="nm" placeholder="e.g. Suresh Kumar">
              </div>
              <div>
                <label for="ph">Phone Number *</label>
                <input id="ph" type="tel" inputmode="tel" placeholder="10-digit mobile number">
              </div>
            </div>

            <div class="form-row form-row-2">
              <div>
                <label for="ar">District / Area</label>
                <input id="ar" list="area-list" placeholder="e.g. City / District">
                <datalist id="area-list">
                  ${areas.map(a => `<option value="${esc(a)}">`).join('')}
                </datalist>
              </div>
              <div>
                <label for="vi">Village / Locality</label>
                <input id="vi" placeholder="e.g. Market Road / Sector">
              </div>
            </div>

            <div class="form-row form-row-2">
              <div>
                <label for="ad">Street Address</label>
                <input id="ad" placeholder="House no, street landmark">
              </div>
              <div>
                <label for="lo">GPS Location / Maps Link</label>
                <div style="display: flex; gap: 6px;">
                  <input id="lo" placeholder="Lat,Lng or Google Maps URL">
                  <button class="btn btn-secondary" id="btn-gps" type="button" title="Capture GPS coordinates" style="padding: 10px 14px;">
                    📍
                  </button>
                </div>
              </div>
            </div>

            <div class="form-row form-row-2">
              <div>
                <label for="idn">ID Proof / Aadhaar / Voter</label>
                <input id="idn" placeholder="Aadhaar or Voter ID note">
              </div>
              <div>
                <label for="gu">Guarantor Name & Phone</label>
                <input id="gu" placeholder="Name, relation, phone">
              </div>
            </div>
          </div>

          <!-- Loan Hierarchy & Terms Section -->
          <div style="margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--card-border);">
            <div class="form-row form-row-2" id="hierarchy-row" style="${customers.length === 0 ? 'display: none;' : ''}">
              <div>
                <label for="parent-loan">Loan Hierarchy (Main or Child Loan)</label>
                <select id="parent-loan">
                  <option value="">Main / Standalone Loan</option>
                </select>
              </div>
              <div>
                <label for="loan-label">Loan Title / Account Label</label>
                <input id="loan-label" placeholder="e.g. Main Loan, Child Top-Up">
              </div>
            </div>

            <div class="form-row form-row-2">
              <div>
                <label for="mo">Collection Mode</label>
                <select id="mo">${modes}</select>
              </div>
              <div>
                <label for="pr">Giving Amount (Principal ₹) *</label>
                <input id="pr" type="number" inputmode="decimal" placeholder="e.g. 10000" min="100">
              </div>
            </div>

            <div class="form-row form-row-2">
              <div>
                <label for="it">Interest Type</label>
                <select id="it">
                  <option value="pct">Percentage % (e.g. 10%)</option>
                  <option value="amt">Flat Rupees ₹ (e.g. 1000)</option>
                </select>
              </div>
              <div>
                <label for="iv">Interest Rate / Value *</label>
                <input id="iv" type="number" inputmode="decimal" placeholder="10" value="10">
              </div>
            </div>

            <div class="form-row form-row-2">
              <div>
                <label for="n">Number of Installments (Days / Weeks) *</label>
                <input id="n" type="number" placeholder="e.g. 50 or 100" value="50">
              </div>
              <div>
                <label for="st">Loan Start Date</label>
                <input id="st" type="date" value="${today()}">
              </div>
            </div>

            <!-- Live Calculation Preview Card -->
            <div id="loan-preview" class="card" style="background: var(--card-subtle); margin-top: 14px; padding: 12px 16px; border: 1px dashed var(--primary);">
              <span class="sub-label">Loan Calculation Summary</span>
              <div id="pv-text" style="font-size: 14px; font-weight: 700; color: var(--tx); margin-top: 4px;">
                Enter principal amount to calculate
              </div>
            </div>

            <button class="btn btn-primary btn-block" id="btn-save-loan" type="button" style="font-size: 15px; padding: 12px; margin-top: 12px;">
              💾 Save & Issue Loan
            </button>
          </div>
        </div>
      </details>

      <!-- Customer Directory List & Search -->
      <div class="card" style="padding: 12px 16px;">
        <div class="search-box-wrap" style="margin-bottom: 8px;">
          <span class="search-icon">🔍</span>
          <input type="text" id="s" placeholder="Search customer, phone number, village, area...">
        </div>

        <div class="chips-wrap" style="margin: 4px 0 0;">
          <span class="filter-chip active" data-filter="all">All Loans (${rows.length})</span>
          <span class="filter-chip" data-filter="active">Active (${rows.filter(r => !r.cleared).length})</span>
          <span class="filter-chip" data-filter="child">Child Loans (${rows.filter(r => !!r.l.parent_loan_id).length})</span>
          <span class="filter-chip" data-filter="cleared">Cleared (${rows.filter(r => r.cleared).length})</span>
          <span class="filter-chip" data-filter="risk">Risk (${rows.filter(r => r.risk).length})</span>
        </div>
      </div>

      <div id="customers-list"></div>
    `;

    // Populate parent loan options dynamically for selected existing customer
    const syncHierarchyOptions = (selectedCustId: string, selectedParentId = '') => {
      const hierRow = document.getElementById('hierarchy-row');
      const parentSel = document.getElementById('parent-loan') as HTMLSelectElement | null;
      const labelInp = document.getElementById('loan-label') as HTMLInputElement | null;
      if (!parentSel) return;

      if (!selectedCustId) {
        if (hierRow) hierRow.style.display = 'none';
        parentSel.innerHTML = '<option value="">Main / Standalone Loan</option>';
        if (labelInp) labelInp.value = '';
        return;
      }

      if (hierRow) hierRow.style.display = 'grid';
      const custLoans = loans.filter(l => l.customer_id === selectedCustId && !l.parent_loan_id);
      const childExistingCount = loans.filter(l => l.customer_id === selectedCustId && !!l.parent_loan_id).length;

      parentSel.innerHTML = `
        <option value="">Main / Standalone Loan</option>
        ${custLoans.map(pl => `
          <option value="${pl.id}" ${pl.id === selectedParentId ? 'selected' : ''}>
            ↳ Child Loan under: ${esc(pl.loan_label || 'Main Loan')} (${money(pl.principal)} · ${pl.mode})
          </option>
        `).join('')}
      `;

      if (labelInp) {
        if (selectedParentId) {
          labelInp.value = `Child Loan #${childExistingCount + 1}`;
        } else if (!labelInp.value) {
          labelInp.value = custLoans.length > 0 ? `Loan #${custLoans.length + 1}` : 'Main Loan';
        }
      }
    };

    if (preCust) {
      syncHierarchyOptions(preCust, preParent);
    }

    document.getElementById('parent-loan')?.addEventListener('change', () => {
      const pVal = g('parent-loan');
      const labelInp = document.getElementById('loan-label') as HTMLInputElement | null;
      const cid = g('ex');
      if (labelInp && cid) {
        const childCount = loans.filter(l => l.customer_id === cid && !!l.parent_loan_id).length;
        labelInp.value = pVal ? `Child Loan #${childCount + 1}` : 'Main Loan';
      }
    });

    // Dynamic Loan Calculator
    const calc = () => {
      const P = +g('pr') || 0;
      const I = +g('iv') || 0;
      const N = +g('n') || 1;
      const it = g('it');
      const mode = g('mo');

      const interestAmt = it === 'pct' ? (P * I) / 100 : I;
      const totalAmt = P + interestAmt;
      const instAmt = N > 0 ? totalAmt / N : 0;

      const previewEl = document.getElementById('pv-text');
      if (previewEl) {
        if (P > 0) {
          previewEl.innerHTML = `
            Principal: <b>${money(P)}</b> + Interest: <b>${money(interestAmt)}</b> = Total: <b>${money(totalAmt)}</b><br>
            <span style="color:var(--primary); font-size:15px;">➡️ ${money(instAmt)} per ${mode === 'weekly' ? 'week' : 'day'} for ${N} installments</span>
          `;
        } else {
          previewEl.textContent = 'Enter principal amount above to see loan breakdown.';
        }
      }
    };

    ['pr', 'iv', 'n', 'it', 'mo'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', calc);
    });
    calc();

    // Toggle new customer form when selecting existing
    document.getElementById('ex')?.addEventListener('change', () => {
      const cid = g('ex');
      const nc = document.getElementById('nc');
      if (nc) nc.style.display = cid ? 'none' : 'block';
      syncHierarchyOptions(cid);
    });

    // Capture GPS
    document.getElementById('btn-gps')?.addEventListener('click', () => {
      toast('Requesting current GPS coordinates...', 'info');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          p => {
            const val = p.coords.latitude.toFixed(6) + ',' + p.coords.longitude.toFixed(6);
            (document.getElementById('lo') as HTMLInputElement).value = val;
            toast('GPS location recorded!', 'success');
          },
          () => toast('GPS permission denied. Paste Google Maps link instead.', 'error')
        );
      } else {
        toast('Geolocation not supported in browser.', 'error');
      }
    });

    let currentFilter = 'all';

    // Order rows cleanly: Parent loans followed directly by their Child loans
    const orderedRows: typeof rows = [];
    const seenIds = new Set<string>();
    rows.filter(r => !r.l.parent_loan_id).forEach(parentRow => {
      orderedRows.push(parentRow);
      seenIds.add(parentRow.l.id);
      rows
        .filter(cr => cr.l.parent_loan_id === parentRow.l.id)
        .forEach(childRow => {
          orderedRows.push(childRow);
          seenIds.add(childRow.l.id);
        });
    });
    rows.forEach(r => { if (!seenIds.has(r.l.id)) orderedRows.push(r); });

    const renderList = () => {
      const query = g('s').toLowerCase();
      let list = orderedRows.filter(r => {
        const text = (r.c.name + ' ' + r.c.phone + ' ' + (r.c.village || '') + ' ' + (r.c.area || '') + ' ' + (r.l.loan_label || '')).toLowerCase();
        return text.includes(query);
      });

      if (currentFilter === 'active') list = list.filter(r => !r.cleared);
      else if (currentFilter === 'child') list = list.filter(r => !!r.l.parent_loan_id);
      else if (currentFilter === 'cleared') list = list.filter(r => r.cleared);
      else if (currentFilter === 'risk') list = list.filter(r => r.risk);

      const container = document.getElementById('customers-list');
      if (!container) return;

      container.innerHTML = list.length > 0
        ? list.map(r => {
            const isChild = !!r.l.parent_loan_id;
            const loanLabel = r.l.loan_label || (isChild ? 'Child Loan' : 'Main Loan');
            return `
              <div class="collect-card ${r.cleared ? 'is-collected' : ''} ${r.risk ? 'is-risk' : ''} ${isChild ? 'is-child-loan' : ''}">
                <div class="collect-header">
                  <div>
                    <h3 class="customer-name">${esc(r.c.name)}</h3>
                    <div class="tags-row">
                      <span class="tag tag-mode">${r.l.mode}</span>
                      ${isChild
                        ? `<span class="tag tag-child">↳ ${esc(loanLabel)}${r.parentLoan ? ` · under ${esc(r.parentLoan.loan_label || 'Main')}` : ''}</span>`
                        : `<span class="tag tag-plan">${esc(loanLabel)}${r.childCount > 0 ? ` · ${r.childCount} Child` : ''}</span>`
                      }
                      ${r.cleared ? '<span class="tag tag-success">✓ Cleared</span>' : ''}
                      ${r.risk ? '<span class="tag tag-risk">🚨 High Risk</span>' : ''}
                      ${r.pending > Number(r.l.inst) ? `<span class="tag tag-overdue">Overdue ${money(r.pending)}</span>` : ''}
                    </div>
                    <div class="collect-meta">
                      <span>📞 ${esc(r.c.phone)}</span>
                      <span>📍 ${esc([r.c.village, r.c.area].filter(Boolean).join(', ') || 'No area set')}</span>
                    </div>
                  </div>
                  <div class="balance-badge">
                    <span class="sub-label">Outstanding</span>
                    <span class="balance-num ${r.cleared ? 'c-success' : (r.risk ? 'c-risk' : '')}">${money(r.outstanding)}</span>
                  </div>
                </div>

                <!-- Loan details bar -->
                <div style="font-size: 12px; color: var(--tx-secondary); margin-top: 8px;">
                  Principal: ${money(r.l.principal)} · Total: ${money(r.l.total)} · <b>${money(r.l.inst)}/${r.l.mode === 'daily' ? 'day' : 'wk'}</b> (${r.l.n} inst)
                </div>

                <div class="progress-bar">
                  <div class="progress-fill ${r.risk ? 'fill-risk' : ''}" style="width: ${r.progressPct}%;"></div>
                </div>
                <div style="font-size: 11px; color: var(--mu); display: flex; justify-content: space-between;">
                  <span>Repaid: ${money(r.paid)} (${r.progressPct}%)</span>
                  <span>Remaining: ${money(r.outstanding)}</span>
                </div>

                <div class="action-links" style="margin-top: 12px;">
                  ${r.c.phone ? `<a class="action-chip" href="tel:${esc(r.c.phone)}">📞 Call</a>` : ''}
                  ${r.c.phone ? `<a class="action-chip" href="https://wa.me/91${esc(r.c.phone).replace(/\D/g,'').slice(-10)}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
                  <a class="action-chip" href="ledger.html?c=${r.c.id}&loan=${r.l.id}">📒 Ledger</a>
                  <button class="action-chip" data-add-child="${r.c.id}" data-parent-loan="${r.l.parent_loan_id || r.l.id}" type="button">
                    ＋ Child Loan
                  </button>
                  <button class="action-chip btn-danger" data-del="${r.l.id}" type="button" style="margin-left: auto;">
                    🗑️ Delete
                  </button>
                </div>
              </div>
            `;
          }).join('')
        : `<div class="card" style="text-align: center; padding: 40px; color: var(--mu);">
            No loans match the current search or filter.
          </div>`;
    };

    renderList();
    document.getElementById('s')?.addEventListener('input', renderList);

    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = (chip as HTMLElement).dataset.filter || 'all';
        renderList();
      });
    });

    // Quick "+ Child Loan" & Delete loan handlers
    document.getElementById('customers-list')?.addEventListener('click', async e => {
      const childBtn = (e.target as HTMLElement).closest('[data-add-child]') as HTMLElement | null;
      if (childBtn && childBtn.dataset.addChild) {
        e.preventDefault();
        const cid = childBtn.dataset.addChild;
        const pid = childBtn.dataset.parentLoan || '';
        const details = document.getElementById('form-details') as HTMLDetailsElement | null;
        const exSel = document.getElementById('ex') as HTMLSelectElement | null;
        const nc = document.getElementById('nc');
        if (details) details.open = true;
        if (exSel) exSel.value = cid;
        if (nc) nc.style.display = 'none';
        syncHierarchyOptions(cid, pid);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => (document.getElementById('pr') as HTMLInputElement | null)?.focus(), 200);
        toast('Issuing Child Loan — enter principal amount above', 'info');
        return;
      }

      const target = (e.target as HTMLElement).closest('[data-del]') as HTMLElement | null;
      if (!target || !target.dataset.del) return;
      e.preventDefault();

      const loanId = target.dataset.del;
      if (confirm('Are you sure you want to delete this loan and its payment records?')) {
        db.deleteLoan(loanId);
        const client = getSupabase();
        if (org.cloud_sync && client) {
          try { await client.from('loans').delete().eq('id', loanId); } catch {}
        }
        toast('Loan deleted successfully', 'info');
        location.reload();
      }
    });

    // Save Customer & Loan (Main or Child)
    document.getElementById('btn-save-loan')?.addEventListener('click', async () => {
      const P = +g('pr');
      const I = +g('iv');
      const N = +g('n');
      let cid = g('ex');

      if (!(P > 0) || !(N > 0)) {
        toast('Please enter giving amount and number of installments', 'error');
        return;
      }

      if (!cid) {
        const name = g('nm');
        const phone = g('ph');
        if (!name || !phone) {
          toast('Customer name and phone number are required', 'error');
          return;
        }

        const newCustomer: Partial<Customer> = {
          name,
          phone,
          area: g('ar'),
          village: g('vi'),
          address: g('ad'),
          loc: g('lo'),
          id_note: g('idn'),
          guarantor: g('gu'),
        };

        const savedCust = db.saveCustomer(newCustomer);
        cid = savedCust.id;

        const client = getSupabase();
        if (org.cloud_sync && client) {
          try { await client.from('customers').insert({ ...savedCust, org_id: org.id }); } catch (e) { console.warn(e); }
        }
      }

      const parentLoanId = g('parent-loan') || null;
      const loanLabel = g('loan-label') || (parentLoanId ? 'Child Loan' : 'Main Loan');
      const total = P + (g('it') === 'pct' ? (P * I) / 100 : I);
      const newLoan: Partial<Loan> = {
        customer_id: cid,
        parent_loan_id: parentLoanId,
        loan_label: loanLabel,
        mode: (g('mo') as any) || 'daily',
        principal: P,
        int_type: (g('it') as any) || 'pct',
        int_val: I,
        total,
        n: N,
        inst: total / N,
        start_date: g('st') || today(),
      };

      const savedLoan = db.saveLoan(newLoan);
      const client = getSupabase();
      if (org.cloud_sync && client) {
        try { await client.from('loans').insert({ ...savedLoan, org_id: org.id }); } catch (e) { console.warn(e); }
      }

      toast(`${parentLoanId ? 'Child Loan' : 'Loan'} saved successfully!`, 'success');
      setTimeout(() => location.href = 'customers.html', 350);
    });
  } catch (err: any) {
    console.error('Customers render failure:', err);
    toast('Error loading customer list: ' + (err.message || 'Error'), 'error');
  }
})();
