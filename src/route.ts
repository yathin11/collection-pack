import {
  boot,
  load,
  planned,
  todayList,
  rowHtml,
  bindPay,
  today,
  esc,
  money,
  $,
  Row,
  toast,
} from './core';

type XY = [number, number];

const coords = (s?: string): XY | null => {
  const m = (s || '').match(/(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/) || (s || '').match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
};

const dest = (c: any) => {
  const x = coords(c.loc);
  return x ? x.join(',') : encodeURIComponent([c.address, c.village, c.area].filter(Boolean).join(', '));
};

const navUrl = (c: any) => {
  if (!coords(c.loc) && /^https?:/.test(c.loc || '')) return c.loc;
  return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' + dest(c);
};

// Haversine / Equirectangular distance in km
const km = (a: XY, b: XY) => Math.hypot((a[1] - b[1]) * Math.cos(a[0] * Math.PI / 180), a[0] - b[0]) * 111;

let rows: Row[] = [];
let vil = '';
let me: XY | null = null;
let sorted = false;

async function render() {
  const d = await load();
  const pl = await planned(today());
  rows = d.rows;

  const all = todayList(rows, pl);
  const done = all.filter(r => r.paidOn > 0);
  const place = (r: Row) => (r.c.village || r.c.area || '').trim();
  const places = [...new Set(all.map(place).filter(Boolean))];

  let stops = all.filter(r => !r.cleared && r.paidOn === 0 && (!vil || place(r) === vil));

  if (sorted) {
    const rest = stops.filter(s => coords(s.c.loc));
    const nox = stops.filter(s => !coords(s.c.loc));
    const out: Row[] = [];
    let cur: XY | null = me || (rest[0] ? coords(rest[0].c.loc) : null);

    while (rest.length && cur) {
      let bi = 0;
      let bd = 1e9;
      rest.forEach((s, i) => {
        const k = km(cur as XY, coords(s.c.loc) as XY);
        if (k < bd) {
          bd = k;
          bi = i;
        }
      });
      const s = rest.splice(bi, 1)[0];
      out.push(s);
      cur = coords(s.c.loc);
    }
    stops = [...out, ...nox];
  }

  // Google Maps URL with waypoints (up to 10)
  const rs = stops.slice(0, 10);
  const multiStopUrl = rs.length > 0
    ? 'https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=' +
      dest(rs[rs.length - 1].c) +
      (rs.length > 1 ? '&waypoints=' + rs.slice(0, -1).map(s => dest(s.c)).join('%7C') : '')
    : '';

  const app = $('#app');
  if (!app) return;

  app.innerHTML = `
    <!-- Top Route Overview Card -->
    <div class="card">
      <div class="card-title-row">
        <div>
          <h2 class="card-title">🧭 Daily Collection Route</h2>
          <p style="font-size: 13px; color: var(--mu); margin-top: 2px;">
            Optimized driving sequence & Google Maps turn-by-turn navigation.
          </p>
        </div>
        <span class="badge ${sorted ? 'badge-cloud' : 'badge-local'}">
          ${sorted ? '📍 GPS Sorted' : 'Standard Order'}
        </span>
      </div>

      <!-- Area / Village Selector -->
      <label for="village-select">Filter by Village / Area</label>
      <select id="village-select">
        <option value="">All Areas (${all.length} stops)</option>
        ${places.map(p => `<option value="${esc(p)}" ${p === vil ? 'selected' : ''}>${esc(p)}</option>`).join('')}
      </select>

      <div style="display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap;">
        <button class="btn btn-secondary" id="btn-sort-gps" type="button" style="flex: 1;">
          📍 Sort by Nearest Stop First
        </button>
        ${multiStopUrl ? `
          <a class="btn btn-primary" href="${multiStopUrl}" target="_blank" rel="noopener" style="flex: 1;">
            🗺️ Open Route in Google Maps
          </a>
        ` : ''}
      </div>

      <div style="margin-top: 14px; display: flex; justify-content: space-between; font-size: 13px; color: var(--mu);">
        <span>Remaining: <b style="color:var(--tx);">${stops.length} stops</b></span>
        <span>Collected: <b style="color:var(--success);">${done.length} (${money(done.reduce((a, r) => a + r.paidOn, 0))})</b></span>
      </div>
      ${stops.length > 10 ? '<p style="font-size: 11px; color: var(--mu); margin-top: 4px;">* Google Maps accepts up to 10 stops at once.</p>' : ''}
    </div>

    <!-- Stop by Stop Cards -->
    <div id="route-stops">
      ${stops.length > 0 ? stops.map((r, i) => {
        const navButton = `
          <a class="action-chip" style="background:var(--primary-light); color:var(--primary); font-weight:700;"
             href="${navUrl(r.c)}" target="_blank" rel="noopener">
            🧭 Stop #${i + 1} Navigate
          </a>
        `;
        return rowHtml(r, false, navButton);
      }).join('') : `
        <div class="card" style="text-align: center; padding: 48px 16px;">
          <div style="font-size: 40px; margin-bottom: 8px;">🎉</div>
          <h3 style="color: var(--tx);">All stops completed!</h3>
          <p style="color: var(--mu); margin: 6px 0 16px;">Great job, all scheduled collections for this area are collected.</p>
          <a class="btn btn-primary" href="today.html">Back to Today Collection</a>
        </div>
      `}
    </div>
  `;

  // Filter village change
  (document.getElementById('village-select') as HTMLSelectElement).onchange = e => {
    vil = (e.target as HTMLSelectElement).value;
    render();
  };

  // Sort by GPS
  document.getElementById('btn-sort-gps')?.addEventListener('click', () => {
    toast('Locating your position for shortest route...', 'info');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        p => {
          me = [p.coords.latitude, p.coords.longitude];
          sorted = true;
          toast('Stops ordered by closest distance from your GPS position!', 'success');
          render();
        },
        () => {
          me = null;
          sorted = true;
          toast('Location permission denied. Sorting from first stop location.', 'info');
          render();
        }
      );
    } else {
      sorted = true;
      render();
    }
  });
}

(async () => {
  try {
    await boot();
    bindPay(render, () => rows, today);
    await render();
  } catch (err: any) {
    console.error('Route render failure:', err);
    toast('Error loading route: ' + (err.message || 'Error'), 'error');
  }
})();
