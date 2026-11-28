import {
  boot,
  load,
  planned,
  todayList,
  dueAmt,
  money,
  today,
  esc,
  endDate,
  rowHtml,
  bindPay,
  $,
  Row,
  toast,
} from './core';

(async () => {
  try {
    await boot();
    const t = today();

    let data = await load(t);
    let pl = await planned(t);

    const render = async () => {
      data = await load(t);
      pl = await planned(t);
      const rows = data.rows;
      const payments = data.payments;

      const list = todayList(rows, pl);
      const act = rows.filter(r => !r.cleared);
      const risk = rows.filter(r => r.risk);
      const pend = rows.filter(r => r.pending > 0).sort((a, b) => b.pending - a.pending);

      const sum = (a: Row[], f: (r: Row) => number) => a.reduce((s, r) => s + f(r), 0);

      const targetToday = sum(list, dueAmt);
      const collectedToday = sum(rows, r => r.paidOn);
      const todayPays = payments.filter(p => p.paid_on === t);
      const cashToday = todayPays.filter(p => (p.pay_mode || 'cash') === 'cash').reduce((s, p) => s + Number(p.amount), 0);
      const upiToday = todayPays.filter(p => p.pay_mode === 'upi').reduce((s, p) => s + Number(p.amount), 0);
      const bankToday = todayPays.filter(p => p.pay_mode === 'bank').reduce((s, p) => s + Number(p.amount), 0);
      const modeSub = collectedToday > 0
        ? [cashToday ? `Cash ${money(cashToday)}` : '', upiToday ? `UPI ${money(upiToday)}` : '', bankToday ? `Bank ${money(bankToday)}` : ''].filter(Boolean).join(' · ')
        : '0 payments received';
      const progressPercent = targetToday > 0 ? Math.min(100, Math.round((collectedToday / targetToday) * 100)) : (collectedToday > 0 ? 100 : 0);
      const totalOutstanding = sum(act, r => r.outstanding);
      const pendingTotal = sum(rows, r => r.pending);
      const riskTotal = sum(risk, r => r.outstanding);
      const totalLifetime = payments.reduce((s, p) => s + Number(p.amount), 0);

      const app = $('#app');
      if (!app) return;

      app.innerHTML = `
        ${data.customers.length === 0 ? `
          <div class="card" style="border: 2px dashed var(--primary); background: var(--card); padding: 28px 20px; text-align: center; margin-bottom: 20px; border-radius: var(--radius-lg);">
            <div style="font-size: 40px; margin-bottom: 10px;">✨</div>
            <h3 style="font-size: 20px; font-weight: 800; color: var(--tx); letter-spacing: -0.02em;">Clean Workspace Ready</h3>
            <p style="font-size: 13.5px; color: var(--mu); margin: 6px auto 18px; max-width: 480px; line-height: 1.5;">
              Your business workspace is provisioned with a 100% clean slate (zero dummy records). Click below to register your first borrower and issue a loan.
            </p>
            <a class="btn btn-primary" href="customers.html" style="font-size: 14px; padding: 11px 24px;">
              ＋ Register First Customer & Issue Loan
            </a>
          </div>
        ` : ''}

        <!-- Hero Today Collection Target Card -->
        <div class="card" style="background: linear-gradient(135deg, var(--card) 0%, var(--card-subtle) 100%); border-left: 4px solid var(--primary);">
          <div class="card-title-row">
            <div>
              <span class="sub-label">Today's Collection Progress</span>
              <h2 style="font-size: 26px; font-weight: 800; color: var(--tx); margin-top: 2px;">
                ${money(collectedToday)} <span style="font-size: 16px; font-weight: 500; color: var(--mu);">/ target ${money(targetToday)}</span>
              </h2>
            </div>
            <div style="text-align: right;">
              <span class="badge ${progressPercent >= 100 ? 'badge-cloud' : 'badge-local'}" style="font-size: 13px; padding: 4px 10px;">
                ${progressPercent}% Complete
              </span>
            </div>
          </div>

          <div class="progress-bar" style="height: 10px; margin: 12px 0 16px;">
            <div class="progress-fill" style="width: ${progressPercent}%;"></div>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
            <a class="btn btn-primary" href="today.html" style="flex: 1 1 200px;">
              🚀 Start Today's Collection (${list.length} stops)
            </a>
            <a class="btn btn-secondary" href="customers.html" style="flex: 1 1 120px;">
              ＋ Add Loan
            </a>
            <a class="btn btn-secondary" href="route.html" style="flex: 1 1 120px;">
              🧭 Map Route
            </a>
          </div>
        </div>

        <!-- Metric Stats Grid -->
        <div class="stats-grid">
          <div class="stat-box">
            <span class="stat-label">Today Target</span>
            <span class="stat-val">${money(targetToday)}</span>
            <span class="stat-sub">${list.length} customers due</span>
          </div>

          <div class="stat-box stat-success">
            <span class="stat-label">Collected Today</span>
            <span class="stat-val c-success">${money(collectedToday)}</span>
            <span class="stat-sub">${modeSub}</span>
          </div>

          <div class="stat-box stat-warning">
            <span class="stat-label">Overdue Pending</span>
            <span class="stat-val c-warning">${money(pendingTotal)}</span>
            <span class="stat-sub">${pend.length} customers behind</span>
          </div>

          <div class="stat-box stat-risk">
            <span class="stat-label">High Risk</span>
            <span class="stat-val c-risk">${money(riskTotal)}</span>
            <span class="stat-sub">${risk.length} loans past end</span>
          </div>

          <div class="stat-box">
            <span class="stat-label">Portfolio Balance</span>
            <span class="stat-val">${money(totalOutstanding)}</span>
            <span class="stat-sub">${act.length} active borrowers</span>
          </div>

          <div class="stat-box stat-success">
            <span class="stat-label">Cleared Loans</span>
            <span class="stat-val c-success">${rows.filter(r => r.cleared).length}</span>
            <span class="stat-sub">100% repaid</span>
          </div>

          <div class="stat-box">
            <span class="stat-label">Lifetime Collected</span>
            <span class="stat-val">${money(totalLifetime)}</span>
            <span class="stat-sub">${payments.length} total receipts</span>
          </div>

          <div class="stat-box">
            <span class="stat-label">Total Customers</span>
            <span class="stat-val">${data.customers.length}</span>
            <span class="stat-sub">in directory</span>
          </div>
        </div>

        <!-- Today Due Quick Collection Section -->
        <div class="card">
          <div class="card-title-row">
            <h3 class="card-title">⚡ Today's Priority Collections</h3>
            <a href="today.html" style="font-size: 13px; font-weight: 600; color: var(--primary);">View all (${list.length}) →</a>
          </div>
          ${list.length > 0
            ? list.slice(0, 5).map(r => rowHtml(r, pl.has(r.l.id))).join('')
            : (rows.length === 0
              ? '<div style="text-align: center; padding: 20px 0; color: var(--mu);">No active loans yet. <a href="customers.html" style="color:var(--primary); font-weight:600;">Add your first customer & loan</a> to start collecting.</div>'
              : '<div style="text-align: center; padding: 20px 0; color: var(--mu);">No scheduled collections for today. Use <a href="plan.html" style="color:var(--primary); font-weight:600;">Plan day</a> to schedule stops.</div>')
          }
        </div>

        <!-- Pending Overdue Attention Section -->
        <div class="card">
          <div class="card-title-row">
            <h3 class="card-title">⚠️ Overdue Attention Needed</h3>
            <span class="badge badge-local">${pend.length} Customers</span>
          </div>
          ${pend.length > 0
            ? pend.slice(0, 5).map(r => `
                <div class="collect-card" style="border-left: 4px solid var(--warning);">
                  <div class="collect-header">
                    <div>
                      <h4 class="customer-name">${esc(r.c.name)}</h4>
                      <span class="tag tag-overdue">Delayed: ${money(r.pending)}</span>
                      <div class="collect-meta">
                        <span>📞 ${esc(r.c.phone)}</span>
                        <span>📍 ${esc([r.c.village, r.c.area].filter(Boolean).join(', '))}</span>
                      </div>
                    </div>
                    <div class="balance-badge">
                      <span class="sub-label">Balance</span>
                      <span class="balance-num">${money(r.outstanding)}</span>
                    </div>
                  </div>
                  <div class="action-links">
                    <a class="action-chip" href="tel:${esc(r.c.phone)}">📞 Call</a>
                    <a class="action-chip" href="today.html">Collect Now →</a>
                  </div>
                </div>
              `).join('')
            : '<div style="color: var(--success); font-weight: 600; padding: 12px 0;">🎉 Great news! Zero pending overdue installments.</div>'
          }
        </div>

        <!-- High Risk Section (if any) -->
        ${risk.length > 0 ? `
          <div class="card" style="border-left: 4px solid var(--risk);">
            <div class="card-title-row">
              <h3 class="card-title" style="color: var(--risk);">🚨 High Risk Loans (${risk.length})</h3>
            </div>
            ${risk.map(r => `
              <div class="collect-card is-risk">
                <div class="collect-header">
                  <div>
                    <h4 class="customer-name">${esc(r.c.name)}</h4>
                    <span class="tag tag-risk">Term expired on ${endDate(r.l)}</span>
                    <div class="collect-meta">
                      <span>📞 ${esc(r.c.phone)}</span>
                      <span>📍 ${esc([r.c.village, r.c.area].filter(Boolean).join(', '))}</span>
                    </div>
                  </div>
                  <div class="balance-badge">
                    <span class="sub-label">Outstanding</span>
                    <span class="balance-num" style="color: var(--risk);">${money(r.outstanding)}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `;
    };

    bindPay(render, () => data.rows, () => t);
    await render();
  } catch (err: any) {
    console.error('Dashboard load failure:', err);
    toast('Error loading dashboard: ' + (err.message || 'Error'), 'error');
  }
})();
