import { boot, load, planned, todayList, dueAmt, money, today, esc, endDate, $, Row } from './core';
(async () => {
  await boot();
  const t = today(), { rows, payments } = await load(t), pl = await planned(t);
  const list = todayList(rows, pl), act = rows.filter(r => !r.cleared);
  const sum = (a: Row[], f: (r: Row) => number) => a.reduce((s, r) => s + f(r), 0);
  const risk = rows.filter(r => r.risk), pend = rows.filter(r => r.pending > 0).sort((a, b) => b.pending - a.pending);
  const stat = (l: string, v: string, c = '') => `<div class="card stat"><small>${l}</small><b class="${c}">${v}</b></div>`;
  const item = (r: Row, v: string, c: string, sub: string) => `<div class="item"><div><b>${esc(r.c.name)}</b> <span class="tag">${r.l.mode}</span><br><span class="mu">${esc(r.c.phone)} · ${sub}</span></div><b class="${c}">${v}</b></div>`;
  $('#app').innerHTML = `<div class="grid">
    ${stat('Today target', money(sum(list, dueAmt)))}${stat('Collected today', money(sum(rows, r => r.paidOn)), 'ok')}
    ${stat('Pending', money(sum(rows, r => r.pending)), 'wa')}${stat('Cleared loans', String(rows.filter(r => r.cleared).length), 'ok')}
    ${stat('Amount in risk', money(sum(risk, r => r.outstanding)), 'rk')}${stat('Outstanding', money(sum(act, r => r.outstanding)))}
    ${stat('Total collected', money(payments.reduce((s: number, p: any) => s + Number(p.amount), 0)))}${stat('Active loans', String(act.length))}</div>
    <a class="btn b full" href="today.html">Start today's collection (${list.length})</a>
    <div class="card gap"><h2>Pending customers</h2>${pend.slice(0, 15).map(r => item(r, money(r.pending), 'wa', 'left ' + money(r.outstanding))).join('') || '<span class="mu">Nothing pending 🎉</span>'}</div>
    <div class="card"><h2>Amount in risk</h2>${risk.map(r => item(r, money(r.outstanding), 'rk', 'ended ' + endDate(r.l))).join('') || '<span class="mu">No risky loans</span>'}</div>`;
})();
