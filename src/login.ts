import { sb, $ } from './core';
const setup = new URLSearchParams(location.search).has('setup');
(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (session && !setup) { location.href = 'index.html'; return; }
  $('#app').innerHTML = session
    ? `<div class="card auth"><h2>Set up your business</h2><label>Business name</label><input id="bn"><button class="b full" id="go">Start</button><p id="m" class="mu"></p></div>`
    : `<div class="card auth"><h2>💰 Collection Manager</h2><label>Email</label><input id="em" type="email"><label>Password</label><input id="pw" type="password"><div class="two gap"><button class="b" id="in">Sign in</button><button class="g" id="up">Create account</button></div><p id="m" class="mu"></p></div>`;
  const m = (t: string) => { $('#m').textContent = t; };
  const v = (id: string) => (document.getElementById(id) as HTMLInputElement).value.trim();
  const on = (id: string, fn: () => Promise<void>) => document.getElementById(id)?.addEventListener('click', fn);
  on('go', async () => { const { error } = await sb.rpc('create_org', { org_name: v('bn') }); if (error) m(error.message); else location.href = 'index.html'; });
  on('in', async () => { const { error } = await sb.auth.signInWithPassword({ email: v('em'), password: v('pw') }); if (error) m(error.message); else location.href = 'index.html'; });
  on('up', async () => { const { error } = await sb.auth.signUp({ email: v('em'), password: v('pw') }); m(error ? error.message : 'Account created. Now sign in.'); });
})();
