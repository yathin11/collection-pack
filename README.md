# Collection Manager

A mobile-first collection tracker for daily/weekly collection businesses, built with Vite + TypeScript + Supabase.

## Pages
- Home dashboard
- Today's collection
- Collection-day planner
- Route view with Google Maps links
- Customers / loans
- Ledger / print-to-PDF
- Settings / JSON, CSV and encrypted backup & restore

## Setup
1. Create a Supabase project.
2. In Supabase **SQL Editor**, run `supabase/schema.sql` once.
3. In Supabase **Authentication → Providers → Email**, configure email signup. For a quick test, you may disable email confirmation; for production, keep confirmation enabled.
4. Copy `.env.example` to `.env` and fill in the Supabase project URL and public anon key. Never put a service-role key in this client-side app.
5. Run `npm install`.
6. Run `npm run dev` and open the local URL shown by Vite.
7. Run `npm run build` to create the deployable `dist/` folder.

## Deploy
The `dist/` output is a static website. Deploy it to Vercel, Netlify, Cloudflare Pages, or another static host. Set the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variables in the host's build settings. Build command: `npm run build`; output directory: `dist`.

## Backups
Settings supports:
- Full JSON export
- CSV exports for customers, loans, payments and planned collection days
- Password-encrypted backup (AES-GCM, PBKDF2)
- Restore from JSON or encrypted backup

Always keep backups in a separate location and test restoring to a test project before relying on them.

## Important
- `.env` is excluded from the deliverable. Use `.env.example` as the template.
- Supabase RLS is intended to isolate each business. Review the policies in `supabase/schema.sql` before production use.
- Backups contain customer data. Store them securely.
- Location-based features require browser location permission.
- The package's dependencies are not bundled; run `npm install` in this folder before using the scripts.
