import { boot, all, sb, $ } from './core';
const T = ['customers', 'loans', 'payments', 'plan_days'];
const b64 = (u: Uint8Array) => { let s = ''; u.forEach(x => { s += String.fromCharCode(x); }); return btoa(s); };
const unb64 = (s: string): any => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const key = async (pw: string, salt: any) => crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']), { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
async function enc(txt: string, pw: string) { const s = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)); return 'CBK1.' + b64(s) + '.' + b64(iv) + '.' + b64(new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(pw, s), new TextEncoder().encode(txt)))); }
async function dec(t: string, pw: string) { const [, s, iv, c] = t.trim().split('.'); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await key(pw, unb64(s)), unb64(c))); }
const save = (name: string, text: string, type = 'application/json') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); };
const csv = (r: any[]) => { if (!r.length) return ''; const h = Object.keys(r[0]); return [h, ...r.map(x => h.map(k => x[k]))].map(a => a.map((v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n'); };
const dump = async () => { const o: any = {}; for (const t of T) o[t] = await all(t); return o; };
const stamp = () => new Date().toLocaleDateString('en-CA');

(async () => {
  const org = await boot();
  const { data: { user } } = await sb.auth.getUser();
  const { data: mem } = await sb.from('members').select('role').eq('user_id', user!.id).limit(1);
  const owner = mem && mem[0] && mem[0].role === 'owner';
  const pw = () => (document.getElementById('pw') as HTMLInputElement).value;
  $('#app').innerHTML = `<div class="card"><h2>Collection types ${owner ? '' : '<span class="mu">(owner only)</span>'}</h2>
    <label class="item" style="color:var(--tx);font-size:15px;margin:0">Daily collection<input type="checkbox" id="d" style="width:24px" ${org.daily_on ? 'checked' : ''} ${owner ? '' : 'disabled'}></label>
    <label class="item" style="color:var(--tx);font-size:15px;margin:0">Weekly collection<input type="checkbox" id="w" style="width:24px" ${org.weekly_on ? 'checked' : ''} ${owner ? '' : 'disabled'}></label></div>
    <div class="card"><h2>Backup</h2><button class="g full" id="j">Download full backup (JSON)</button><button class="g full" id="c">Download Excel / Sheets files (CSV)</button>
    <label>Backup password</label><input type="password" id="pw" placeholder="for encrypted backup / restore"><button class="b full" id="e">Download encrypted backup</button>
    <label>Restore from backup file (.json or encrypted)</label><input type="file" id="f"></div>
    <div class="card"><h2>Account</h2><p class="mu">${user!.email}</p><button class="g full" id="o">Sign out</button></div>`;
  const tog = async (col: string, v: boolean) => { const { error } = await sb.from('orgs').update({ [col]: v }).eq('id', org.id); if (error) alert(error.message); };
  document.getElementById('d')!.onchange = e => tog('daily_on', (e.target as HTMLInputElement).checked);
  document.getElementById('w')!.onchange = e => tog('weekly_on', (e.target as HTMLInputElement).checked);
  document.getElementById('j')!.onclick = async () => save(`collection-${stamp()}.json`, JSON.stringify(await dump()));
  document.getElementById('c')!.onclick = async () => { for (const t of T.slice(0, 3)) save(`${t}-${stamp()}.csv`, csv(await all(t)), 'text/csv'); };
  document.getElementById('e')!.onclick = async () => { if (pw().length < 6) { alert('Password minimum 6 characters'); return; } save(`collection-${stamp()}.enc`, await enc(JSON.stringify(await dump()), pw()), 'text/plain'); };
  document.getElementById('f')!.onchange = async e => {
    const f = (e.target as HTMLInputElement).files![0]; if (!f) return;
    try {
      let txt = await f.text(); if (txt.startsWith('CBK1.')) txt = await dec(txt, pw());
      const o = JSON.parse(txt); if (!confirm('Restore this backup into your business?')) return;
      for (const t of T) { const r = o[t] || []; for (let i = 0; i < r.length; i += 500) { const { error } = await sb.from(t).upsert(r.slice(i, i + 500)); if (error) { alert(t + ': ' + error.message); return; } } }
      alert('Restored');
    } catch (err) { alert('Wrong password or invalid file'); }
  };
  document.getElementById('o')!.onclick = async () => { await sb.auth.signOut(); location.href = 'login.html'; };
})();
