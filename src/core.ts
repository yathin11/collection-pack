import { createClient } from '@supabase/supabase-js';
import './style.css';

export const sb = createClient(import.meta.env.VITE_SUPABASE_URL as string, import.meta.env.VITE_SUPABASE_ANON_KEY as string);
export const $ = (s: string) => document.querySelector(s) as HTMLElement;
export const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
export const money = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN');
export const iso = (d: Date) => d.toLocaleDateString('en-CA');
export const today = () => iso(new Date());
export const addDays = (s: string, n: number) => { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const dd = (a: string, b: string) => Math.round((+new Date(b + 'T00:00:00') - +new Date(a + 'T00:00:00')) / 86400000);
export const stepOf = (l: any) => (l.mode === 'daily' ? 1 : 7);
export const endDate = (l: any) => addDays(l.start_date, l.n * stepOf(l));
export const wa = (phone: string, text: string) => 'https://wa.me/91' + String(phone).replace(/\D/g, '').slice(-10) + '?text=' + encodeURIComponent(text);

export interface Org { id: string; name: string; daily_on: boolean; weekly_on: boolean }
export interface Row { l: any; c: any; paid: number; outstanding: number; pending: number; dueToday: boolean; risk: boolean; cleared: boolean; paidOn: number }

const NAV: [string, string, string][] = [['index', '🏠', 'Home'], ['today', '✅', 'Today'], ['route', '🧭', 'Route'], ['customers', '👥', 'Customers'], ['ledger', '📒', 'Ledger'], ['settings', '⚙️', 'More']];

export async function boot(): Promise<Org> {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { location.href = 'login.html'; throw new Error('no session'); }
  const { data } = await sb.from('orgs').select('*').limit(1);
  if (!data || !data.length) { location.href = 'login.html?setup=1'; throw new Error('no org'); }
  const org = data[0] as Org;
  const here = (location.pathname.split('/').pop() || 'index').replace('.html', '') || 'index';
  const hh = here === 'plan' ? 'today' : here;
  document.body.insertAdjacentHTML('afterbegin', `<header class="top"><b>${esc(org.name)}</b><span class="mu">${new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span></header>`);
  document.body.insertAdjacentHTML('beforeend', `<nav class="nav">${NAV.map(([h, i, t]) => `<a href="${h}.html" class="${h === hh ? 'on' : ''}"><span>${i}</span>${t}</a>`).join('')}</nav>`);
  return org;
}

export async function all<T = any>(table: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select('*').order('id').range(from, from + 999);
    if (error) throw error;
    out.push(...(data as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export async function load(on = today()) {
  const [customers, loans, payments] = await Promise.all([all('customers'), all('loans'), all('payments')]);
  const cm = new Map<string, any>(customers.map((c: any) => [c.id, c]));
  const paid = new Map<string, number>(), paidOn = new Map<string, number>();
  payments.forEach((p: any) => {
    paid.set(p.loan_id, (paid.get(p.loan_id) || 0) + Number(p.amount));
    if (p.paid_on === on) paidOn.set(p.loan_id, (paidOn.get(p.loan_id) || 0) + Number(p.amount));
  });
  const rows: Row[] = loans.filter((l: any) => cm.has(l.customer_id)).map((l: any) => {
    const total = Number(l.total), inst = Number(l.inst), s = stepOf(l), days = dd(l.start_date, on);
    const k = Math.max(0, Math.min(l.n, Math.floor(days / s)));
    const p = paid.get(l.id) || 0, cleared = total - p <= 0.5, outstanding = cleared ? 0 : total - p;
    const pending = Math.min(outstanding, Math.max(0, Math.min(total, k * inst) - p));
    const dueToday = days > 0 && days % s === 0 && days / s <= l.n;
    return { l, c: cm.get(l.customer_id), paid: p, outstanding, pending, dueToday, cleared, paidOn: paidOn.get(l.id) || 0, risk: outstanding > 0 && (on > endDate(l) || pending >= 3 * inst) };
  });
  return { customers, loans, payments, rows };
}

export async function planned(on: string): Promise<Set<string>> {
  const { data } = await sb.from('plan_days').select('loan_id').eq('day', on);
  return new Set((data || []).map((x: any) => x.loan_id));
}
export const todayList = (rows: Row[], pl: Set<string>) => rows.filter(r => (!r.cleared && (r.dueToday || r.pending > 0 || pl.has(r.l.id))) || r.paidOn > 0);
export const dueAmt = (r: Row) => Math.max(r.pending, Math.min(Number(r.l.inst), r.outstanding));

export async function pay(loan_id: string, amount: number, on: string) {
  const { error } = await sb.from('payments').insert({ loan_id, amount, paid_on: on });
  if (error) alert(error.message);
}
export async function undo(loan_id: string, on: string) {
  const { data } = await sb.from('payments').select('id').eq('loan_id', loan_id).eq('paid_on', on).order('created_at', { ascending: false }).limit(1);
  if (data && data.length) await sb.from('payments').delete().eq('id', data[0].id);
}

export function rowHtml(r: Row, plan = false, extra = ''): string {
  const d = dueAmt(r), c = r.c, done = r.paidOn > 0;
  const rem = wa(c.phone, `Hello ${c.name}, today collection Rs ${Math.round(d)} is due. Please keep ready. Thank you.`);
  const rec = wa(c.phone, `Received Rs ${Math.round(r.paidOn)} on ${today()} from ${c.name}. Balance Rs ${Math.round(r.outstanding)}. Thank you.`);
  return `<div class="item"><div class="grow"><b>${esc(c.name)}</b> <span class="tag">${r.l.mode}</span>${r.pending > Number(r.l.inst) ? ' <span class="tag wa">overdue</span>' : ''}${plan ? ' <span class="tag ok">planned</span>' : ''}${done ? ` <span class="tag ok">paid ${money(r.paidOn)}</span>` : ''}<br><span class="mu">${esc([c.village, c.area].filter(Boolean).join(', '))} · left ${money(r.outstanding)}</span><div class="links">${extra}<a href="tel:${esc(c.phone)}">📞 Call</a><a href="${rem}" target="_blank" rel="noopener">💬 Remind</a>${done ? `<a href="${rec}" target="_blank" rel="noopener">🧾 Receipt</a><a href="#" data-a="undo" data-id="${r.l.id}">↩ Undo</a>` : ''}</div></div>${r.cleared ? '' : `<div class="pay"><input id="a-${r.l.id}" type="number" inputmode="decimal" value="${Math.round(d)}"><button class="b" data-a="pay" data-id="${r.l.id}">Collect</button></div>`}</div>`;
}

export function bindPay(rerender: () => void, getRows: () => Row[], on: () => string) {
  $('#app').addEventListener('click', async e => {
    const b = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
    if (!b || !b.dataset.id) return;
    e.preventDefault();
    const id = b.dataset.id, r = getRows().find(x => x.l.id === id);
    if (!r) return;
    if (b.dataset.a === 'pay') {
      const amt = Math.min(Number((document.getElementById('a-' + id) as HTMLInputElement).value), r.outstanding);
      if (amt > 0) { b.setAttribute('disabled', ''); await pay(id, amt, on()); rerender(); }
    } else if (b.dataset.a === 'undo') { await undo(id, on()); rerender(); }
  });
}
