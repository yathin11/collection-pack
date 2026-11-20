import { boot, load, addDays, today, esc, money, sb, $ } from './core';
let day = addDays(today(), 1);
async function render() {
  const { rows } = await load(day);
  const { data } = await sb.from('plan_days').select('loan_id').eq('day', day);
  const sel = new Set((data || []).map((x: any) => x.loan_id));
  $('#app').innerHTML = `<div class="card"><h2>Plan a collection day</h2><input type="date" id="d" value="${day}"><p class="mu">${sel.size} customers selected</p>
    ${rows.filter(r => !r.cleared).map(r => `<label class="item" style="color:var(--tx);font-size:15px;margin:0"><span><b>${esc(r.c.name)}</b> <span class="tag">${r.l.mode}</span><br><span class="mu">${esc([r.c.village, r.c.area].filter(Boolean).join(', '))} · left ${money(r.outstanding)}</span></span><input type="checkbox" style="width:24px" data-id="${r.l.id}" ${sel.has(r.l.id) ? 'checked' : ''}></label>`).join('')}</div>`;
  (document.getElementById('d') as HTMLInputElement).onchange = e => { day = (e.target as HTMLInputElement).value || day; render(); };
  document.querySelectorAll('#app input[type=checkbox]').forEach(cb => cb.addEventListener('change', async () => {
    const el = cb as HTMLInputElement;
    if (el.checked) await sb.from('plan_days').insert({ day, loan_id: el.dataset.id });
    else await sb.from('plan_days').delete().eq('day', day).eq('loan_id', el.dataset.id);
    render();
  }));
}
(async () => { await boot(); render(); })();
