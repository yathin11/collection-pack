import { boot, load, planned, todayList, dueAmt, rowHtml, bindPay, money, today, $, Row } from './core';
let on = today(), rows: Row[] = [];
async function render() {
  const d = await load(on), pl = await planned(on);
  rows = d.rows;
  const list = todayList(rows, pl);
  $('#app').innerHTML = `<div class="two noprint"><input type="date" id="d" value="${on}"><a class="btn g" href="plan.html" style="text-align:center">📅 Plan day</a></div>
    <div class="grid gap"><div class="card stat"><small>Target</small><b>${money(list.reduce((a, r) => a + dueAmt(r), 0))}</b></div><div class="card stat"><small>Collected</small><b class="ok">${money(rows.reduce((a, r) => a + r.paidOn, 0))}</b></div></div>
    <div class="card">${list.map(r => rowHtml(r, pl.has(r.l.id))).join('') || '<span class="mu">No collection on this day. Use Plan day to add customers.</span>'}</div>`;
  (document.getElementById('d') as HTMLInputElement).onchange = e => { on = (e.target as HTMLInputElement).value || today(); render(); };
}
(async () => { await boot(); bindPay(render, () => rows, () => on); render();
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch (e) {} })();
