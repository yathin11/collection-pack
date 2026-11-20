import { boot, load, money, today, esc, sb, $, Org } from './core';
(async () => {
  const org: Org = await boot();
  const { customers, rows } = await load();
  const g = (id: string) => (document.getElementById(id) as HTMLInputElement).value.trim();
  const modes = (org.daily_on ? '<option value="daily">Daily</option>' : '') + (org.weekly_on ? '<option value="weekly">Weekly</option>' : '');
  const areas = [...new Set(['Ernakulam', 'Thrissur', 'Kochi', 'Aluva', ...customers.map((c: any) => c.area)].filter(Boolean))];
  $('#app').innerHTML = `<details class="card" open><summary><b>＋ Add customer / loan</b></summary>
    <label>Customer</label><select id="ex"><option value="">New customer</option>${customers.map((c: any) => `<option value="${c.id}">${esc(c.name)} · ${esc(c.phone)}</option>`).join('')}</select>
    <div id="nc"><div class="two"><div><label>Name *</label><input id="nm"></div><div><label>Number *</label><input id="ph" inputmode="tel"></div></div>
    <div class="two"><div><label>Area / District</label><input id="ar" list="al" placeholder="Ernakulam, Thrissur"></div><div><label>Village</label><input id="vi"></div></div>
    <datalist id="al">${areas.map(a => `<option value="${esc(a)}">`).join('')}</datalist>
    <div class="two"><div><label>Address</label><input id="ad"></div><div><label>House location</label><div class="pay"><input id="lo" style="width:100%" placeholder="Maps link or lat,lng"><button class="g" id="gps" type="button">📍</button></div></div></div>
    <div class="two"><div><label>ID proof</label><input id="idn"></div><div><label>Guarantor</label><input id="gu"></div></div></div>
    <div class="two"><div><label>Type</label><select id="mo">${modes}</select></div><div><label>Giving amount ₹</label><input id="pr" type="number" inputmode="decimal"></div></div>
    <div class="two"><div><label>Interest</label><select id="it"><option value="pct">Percentage %</option><option value="amt">Rupees ₹</option></select></div><div><label>Interest value</label><input id="iv" type="number" inputmode="decimal"></div></div>
    <div class="two"><div><label>Installments (days / weeks)</label><input id="n" type="number"></div><div><label>Start date</label><input id="st" type="date" value="${today()}"></div></div>
    <p class="mu" id="pv"></p><button class="b full" id="sv">Save</button></details>
    <input id="s" class="gap" placeholder="🔍 Search name / number / village"><div class="card" id="lst"></div>`;
  const calc = () => { const P = +g('pr'), I = +g('iv'), N = +g('n'), i = g('it') === 'pct' ? P * I / 100 : I; $('#pv').textContent = `Interest ${money(i)} · Total ${money(P + i)} · ${N ? money((P + i) / N) : '₹0'} per ${g('mo') === 'weekly' ? 'week' : 'day'}`; };
  ['pr', 'iv', 'n', 'it', 'mo'].forEach(id => document.getElementById(id)!.addEventListener('input', calc));
  document.getElementById('ex')!.addEventListener('change', () => { $('#nc').style.display = g('ex') ? 'none' : 'block'; });
  document.getElementById('gps')!.onclick = () => navigator.geolocation?.getCurrentPosition(p => { (document.getElementById('lo') as HTMLInputElement).value = p.coords.latitude.toFixed(6) + ',' + p.coords.longitude.toFixed(6); }, () => alert('Location blocked. Paste a Maps link instead'));
  const list = () => {
    const q = g('s').toLowerCase();
    $('#lst').innerHTML = rows.filter(r => (r.c.name + r.c.phone + (r.c.village || '') + (r.c.area || '')).toLowerCase().includes(q)).map(r => `<div class="item"><div class="grow"><b>${esc(r.c.name)}</b> <span class="tag">${r.l.mode}</span>${r.cleared ? ' <span class="tag ok">cleared</span>' : ''}${r.risk ? ' <span class="tag rk">risk</span>' : ''}<br><span class="mu">${esc(r.c.phone)} · ${esc([r.c.village, r.c.area].filter(Boolean).join(', '))}<br>given ${money(r.l.principal)} · total ${money(r.l.total)} · ${money(r.l.inst)}/${r.l.mode === 'daily' ? 'day' : 'wk'}</span><div class="bar"><i style="width:${Math.min(100, r.paid / r.l.total * 100)}%"></i></div></div><div style="text-align:right"><b>${money(r.outstanding)}</b><br><span class="mu">left</span><br><a href="#" data-del="${r.l.id}" class="rk">delete</a></div></div>`).join('') || '<span class="mu">No customers yet</span>';
  };
  list(); calc();
  document.getElementById('s')!.addEventListener('input', list);
  $('#lst').addEventListener('click', async e => {
    const id = (e.target as HTMLElement).dataset.del; if (!id) return; e.preventDefault();
    if (confirm('Delete this loan and its payments?')) { await sb.from('loans').delete().eq('id', id); location.reload(); }
  });
  document.getElementById('sv')!.onclick = async () => {
    const P = +g('pr'), I = +g('iv'), N = +g('n'); let cid = g('ex');
    if (!(P > 0) || !(N > 0)) { alert('Enter giving amount and installments'); return; }
    if (!cid) {
      if (!g('nm') || !g('ph')) { alert('Name and number required'); return; }
      const { data, error } = await sb.from('customers').insert({ name: g('nm'), phone: g('ph'), area: g('ar'), village: g('vi'), address: g('ad'), loc: g('lo'), id_note: g('idn'), guarantor: g('gu') }).select('id').single();
      if (error) { alert(error.message); return; }
      cid = data.id;
    }
    const total = P + (g('it') === 'pct' ? P * I / 100 : I);
    const { error } = await sb.from('loans').insert({ customer_id: cid, mode: g('mo'), principal: P, int_type: g('it'), int_val: I, total, n: N, inst: total / N, start_date: g('st') });
    if (error) alert(error.message); else location.reload();
  };
})();
