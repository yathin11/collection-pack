// Google Apps Script: mirrors one business into a Google Sheet. Add a daily time trigger on backup().
// Keep this script PRIVATE (it holds the service key).
const SB_URL = 'https://YOUR-PROJECT.supabase.co', SB_KEY = 'SERVICE_ROLE_KEY', ORG_ID = 'ORG-UUID';
function backup() {
  const ss = SpreadsheetApp.getActive();
  ['customers', 'loans', 'payments', 'plan_days'].forEach(t => {
    let rows = [], off = 0, r;
    do {
      r = JSON.parse(UrlFetchApp.fetch(`${SB_URL}/rest/v1/${t}?select=*&org_id=eq.${ORG_ID}&order=id&limit=1000&offset=${off}`, { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY } }).getContentText());
      rows = rows.concat(r); off += 1000;
    } while (r.length === 1000);
    const sh = ss.getSheetByName(t) || ss.insertSheet(t); sh.clear();
    if (!rows.length) return;
    const h = Object.keys(rows[0]);
    sh.getRange(1, 1, rows.length + 1, h.length).setValues([h].concat(rows.map(x => h.map(k => x[k] == null ? '' : x[k]))));
  });
}
