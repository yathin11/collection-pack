import { boot, load, planned, todayList, rowHtml, bindPay, today, esc, money, $, Row } from './core';
type XY = [number, number];
const coords = (s?: string): XY | null => {
  const m = (s || '').match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/) || (s || '').match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
};
const dest = (c: any) => { const x = coords(c.loc); return x ? x.join(',') : encodeURIComponent([c.address, c.village, c.area, 'Kerala'].filter(Boolean).join(', ')); };
const nav = (c: any) => (!coords(c.loc) && /^https?:/.test(c.loc || '')) ? c.loc : 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + dest(c);
const km = (a: XY, b: XY) => Math.hypot((a[1] - b[1]) * Math.cos(a[0] * Math.PI / 180), a[0] - b[0]) * 111;
let rows: Row[] = [], vil = '', me: XY | null = null, sorted = false;

async function render() {
  const d = await load(), pl = await planned(today());
  rows = d.rows;
  const all = todayList(rows, pl), done = all.filter(r => r.paidOn > 0);
  const place = (r: Row) => (r.c.village || r.c.area || '').trim();
  const places = [...new Set(all.map(place).filter(Boolean))];
  let stops = all.filter(r => !r.cleared && r.paidOn === 0 && (!vil || place(r) === vil));
  if (sorted) {
    const rest = stops.filter(s => coords(s.c.loc)), nox = stops.filter(s => !coords(s.c.loc)), out: Row[] = [];
    let cur: XY | null = me || (rest[0] ? coords(rest[0].c.loc) : null);
    while (rest.length && cur) {
      let bi = 0, bd = 1e9;
      rest.forEach((s, i) => { const k = km(cur as XY, coords(s.c.loc) as XY); if (k < bd) { bd = k; bi = i; } });
      const s = rest.splice(bi, 1)[0]; out.push(s); cur = coords(s.c.loc);
    }
    stops = [...out, ...nox];
  }
  const rs = stops.slice(0, 10);
  const url = rs.length ? 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + dest(rs[rs.length - 1].c) + (rs.length > 1 ? '&waypoints=' + rs.slice(0, -1).map(s => dest(s.c)).join('%7C') : '') : '';
  $('#app').innerHTML = `<div class="card"><h2>Route today</h2><select id="v"><option value="">All villages / areas</option>${places.map(p => `<option ${p === vil ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>
    <div class="two gap"><button class="g" id="so">↕ Nearest first</button>${url ? `<a class="btn b" style="text-align:center" target="_blank" rel="noopener" href="${url}">Open in Maps</a>` : '<span></span>'}</div>
    <span class="mu">${stops.length} left · ${done.length} collected (${money(done.reduce((a, r) => a + r.paidOn, 0))})${stops.length > 10 ? ' · Maps uses first 10 stops' : ''}</span></div>
    <div class="card">${stops.map((r, i) => rowHtml(r, false, `<a href="${nav(r.c)}" target="_blank" rel="noopener">🧭 #${i + 1} Navigate</a>`)).join('') || '<span class="mu">All done 🎉</span>'}</div>`;
  (document.getElementById('v') as HTMLSelectElement).onchange = e => { vil = (e.target as HTMLSelectElement).value; render(); };
  document.getElementById('so')!.onclick = () => {
    const go = () => { sorted = true; render(); };
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(p => { me = [p.coords.latitude, p.coords.longitude]; go(); }, () => { me = null; go(); }); else go();
  };
}
(async () => { await boot(); bindPay(render, () => rows, today); render(); })();
