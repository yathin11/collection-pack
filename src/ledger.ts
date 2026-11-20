import { boot, load, money, esc, endDate, $, Row } from './core';
(async () => {
  await boot();
  const { customers, rows, payments } = await load();
  let area = ''; const sel = new Set<string>();
  const areas = [...new Set(customers.map((c: any) => (c.area || '').trim()).filter(Boolean))];
  const draw = () => {
    const inA = (c: any) => !area || (c.area || '').trim().toLowerCase() === area.toLowerCase();
    const list = rows.filter(r => inA(r.c) && (!sel.size || sel.has(r.c.id)));
    const sum = (f: (r: Row) => number) => list.reduce((a, r) => a + f(r), 0);
    const block = (r: Row) => {
      let bal = 0;
      const e: any[] = [[r.l.start_date, 'Amount given', r.l.principal, 0], [r.l.start_date, 'Interest ' + (r.l.int_type === 'pct' ? r.l.int_val + '%' : 'flat'), r.l.total - r.l.principal, 0],
        ...payments.filter((p: any) => p.loan_id === r.l.id).sort((a: any, b: any) => a.paid_on.localeCompare(b.paid_on)).map((p: any) => [p.paid_on, 'Collection received', 0, Number(p.amount)])];
      return `<div class="card"><b>${esc(r.c.name)}</b> <span class="mu">· ${esc(r.c.phone)} · ${esc([r.c.village, r.c.area].filter(Boolean).join(', '))} · ${r.l.mode} · ${r.l.start_date} to ${endDate(r.l)}</span>
      <table class="lt"><tr><th>Date</th><th>Particulars</th><th class="r">Debit</th><th class="r">Credit</th><th class="r">Balance</th></tr>
      ${e.map(x => { bal += x[2] - x[3]; return `<tr><td>${x[0]}</td><td>${x[1]}</td><td class="r">${x[2] ? money(x[2]) : ''}</td><td class="r">${x[3] ? money(x[3]) : ''}</td><td class="r">${money(bal)}</td></tr>`; }).join('')}
      <tr><td colspan="2"><b>Total</b></td><td class="r"><b>${money(r.l.total)}</b></td><td class="r"><b>${money(r.paid)}</b></td><td class="r"><b>${money(r.outstanding)}</b></td></tr></table>
      <span class="mu">${r.cleared ? 'Cleared' : 'Pending now ' + money(r.pending)}${r.risk ? ' · AT RISK' : ''}</span></div>`;
    };
    $('#app').innerHTML = `<div class="card noprint"><h2>Ledger PDF</h2><select id="ar"><option value="">All areas</option>${areas.map(a => `<option ${a === area ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
      <label>Select persons (empty = everyone in the area)</label><div class="chips">${customers.filter(inA).map((c: any) => `<span class="chip ${sel.has(c.id) ? 'on' : ''}" data-id="${c.id}">${esc(c.name)}</span>`).join('')}</div>
      <button class="b full" id="pr">Print / Save as PDF</button></div>
      <div class="card"><h2>Collection Ledger${area ? ' · ' + esc(area) : ''}</h2><span class="mu">${new Date().toLocaleDateString('en-IN')} · ${list.length} loans · Given ${money(sum(r => r.l.principal))} · Due ${money(sum(r => r.l.total))} · Received ${money(sum(r => r.paid))} · <b>Balance ${money(sum(r => r.outstanding))}</b></span></div>${list.map(block).join('')}`;
    (document.getElementById('ar') as HTMLSelectElement).onchange = e => { area = (e.target as HTMLSelectElement).value; sel.clear(); draw(); };
    document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { const id = (c as HTMLElement).dataset.id!; sel.has(id) ? sel.delete(id) : sel.add(id); draw(); }));
    document.getElementById('pr')!.onclick = () => window.print();
  };
  draw();
})();
