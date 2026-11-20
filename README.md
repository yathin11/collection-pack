# Collection Manager pack (Vite + TypeScript + Supabase)

Pages (each its own file): `index` dashboard · `today` · `plan` · `route` · `customers` · `ledger` · `settings` · `login`.

## 1. Connect (10 min)
1. supabase.com > New project > SQL Editor > paste `supabase/schema.sql` > Run.
2. Authentication > Providers > Email: turn OFF "Confirm email" for quick start.
3. Copy `.env.example` to `.env`, fill the Project URL and anon key (Settings > API).
4. `npm install` then `npm run dev` (or `npm run build`).

## 2. Deploy on free Vercel
Push to GitHub > Vercel "Import project" (framework: Vite) > add the two env vars > Deploy.
Open on phone > Share > Add to Home Screen.

## 3. Rent it (own server later)
- Self-host Supabase (docker compose) or plain Postgres, serve `dist/` with Caddy (auto HTTPS).
- Each financier signs up and creates their own business: data is isolated by row-level security.

## 4. Backups (use all)
1. In app: More > JSON / CSV / encrypted backup + restore.
2. `scripts/sheets-backup.gs`: daily mirror into Google Sheets.
3. `scripts/backup.sh`: nightly encrypted pg_dump to Backblaze + Google Drive, Telegram alert.
4. Supabase/VPS daily snapshots. Test a restore monthly.
