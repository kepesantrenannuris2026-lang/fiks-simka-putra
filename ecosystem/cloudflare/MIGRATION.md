# Kepesantrenan Nuris: Cloudflare migration

Status: hosting migration is not published. Connected Cloudflare user is muhyiddinsyarif98@gmail.com; the requested Kepesantrenan account is not connected. No Cloudflare resource, DNS, Supabase data or Netlify setting has been changed in this migration preparation.

## Target

- GitHub: source, reviewed changes, manually triggered production releases, versioned deploy artifacts.
- Cloudflare Workers Static Assets: one site for /, /mutabaah/, /simka/, /simka-putri/, /yaumiyyah/; Worker fallback only for missing application paths.
- Supabase yvcqcgbzdsrjkskvcmqq: existing database, shared sessions, original Mutabaah API and kepesantrenan Edge Function. Keep this project unchanged.
- No D1, KV, R2 or extra database initially. PDF reports are generated in the browser.

## Read-only baseline on 30 October 2026

64 accounts; 856 students; 9,033 setoran; 475 hafalan; 585 sertifikasi; 2,182 hadis; 4 Putra cases; 0 Putri cases; 0 Yaumiyyah records. These counts are not a backup and will naturally grow while users work.

## Before publication

1. Connect the intended Cloudflare account or explicitly authorize use of the currently connected personal account. Choose an institution-owned custom domain, or use the actual workers.dev URL returned by Cloudflare. Do not guess an available hostname.
2. Identify the current live Netlify deploy and compare its public files with the prepared v4 bundle. Preserve newer live changes before publishing; the current portal deploy observed was 6ae3525a72c91019bd10763e.
3. Take a complete server-side database backup through Supabase with an authorized administrator. It must cover public, simka, simka_putri and yaumiyyah, including views, constraints, grants, functions and data. Inventory Storage buckets/objects separately if used. Verify restoration into an isolated project; row counts alone do not prove recovery. Keep backups private and never commit them to GitHub.
4. Preserve exact frontend assets and hashes independently of Netlify. Current build bootstrap still uses ecosystem/mutabaah-snapshot.json and can download from Netlify. Before closing Netlify, vendor this verified public snapshot in the repository or a versioned GitHub Release artifact and make the build read it there. The code-generated snapshot must not contain credentials or student exports.
5. Choose the final HTTPS origin. Add only this exact origin to the Supabase Edge Function CORS list (retain old origin during overlap). Inspect original Mutabaah API CORS, any hostname restrictions and PWA service workers. Never solve CORS by allowing every origin.
6. Build: npm ci; npm run lint; npm run test:ekosistem; npm run build:ekosistem.
7. Prepare assets: NURIS_PUBLIC_ORIGIN=https://<approved-origin> node ecosystem/cloudflare/prepare.mjs. Then deploy with a pinned Wrangler version using wrangler deploy. The asset config is in wrangler.jsonc. There is no database migration in these commands.
8. Set up a GitHub Actions workflow_dispatch release using a scoped Cloudflare API token stored as a GitHub Actions secret. Build only on deliberate releases, cancel redundant runs and cache dependencies. Do not trigger production builds for every documentation commit. Never put a token in this file or client JavaScript.

## Acceptance gate

Verify login for leadership and assigned staff from both campuses, exact student scopes, reads and one authorized reversible write, edit cases, PDF downloads, monthly/semester grades, all app navigation, attachments if used, mobile/tablet/desktop, PWA install/update, CORS and cache headers. Do not cache authenticated API data. Compare database counts and relationships before/after using a consistent checkpoint that accounts for legitimate new entries.

A new domain cannot read the old domain's localStorage. Unsaved local data/offline queues must be synced or exported while the old site still works. Expect a fresh login and possible PWA reinstallation; this is separate from database preservation.

## Cutover and cost control

Give staff the new URL only after the gate passes. Retain the old site temporarily as an announced bridge or redirect. netlify.app belongs to Netlify and cannot be rehosted as a Cloudflare hostname. Fully removing Netlify eventually means retiring those old URLs, so distribute the new address and update links/QR/PWA shortcuts first.

After verified adoption and backup/restore checks, stop Netlify automatic builds and remove the paid plan only after reviewing billing and site-retention consequences. No Netlify deletion or cancellation is authorized by this preparation. Pin and record the last good Cloudflare artifact, so frontend failures can be fixed forward without changing the database.

Static hosting can be inexpensive, but Supabase compute/storage/backups and GitHub build limits still apply. Do not promise a universally free deployment. Serve files directly rather than invoking a Worker for every request; cap logs and monitor actual usage.

## Appearance and free-tier preparation (30 October 2026)

- Liquid-glass runtime is no longer included in any generated app or the legacy-site package. Safari system chrome remains controlled by iOS, not this website.
- Shared light/dark preference is browser-local, synchronized by storage events on the same origin, with no database reads/writes. Different hosting origins retain independent preferences.
- View Transition radial reveal lasts 360ms, with immediate fallback when unsupported or reduced motion is requested. Short button/menu feedback uses transforms/opacity; no perpetual decorative animation or polling was added.
- Hashed JS/CSS assets receive long immutable cache headers in the Cloudflare package. HTML and appearance resources revalidate. Private API responses must never enter public CDN cache.
- Keep static assets served before Worker execution. Keep Supabase as the existing single source of data, and generate reports locally. Do not add D1/R2 replicas, background keepalive jobs, or a paid subscription merely for migration.
- Both Netlify frontends remain usable until a separately verified cutover. No site, database, account, subscription or deploy hook was deleted or disabled.
- Free-tier sufficiency is not guaranteed: measure actual database size, egress, function calls, active users and deployment frequency before estimating capacity. No usage measurement or paid-plan change is claimed by this preparation.
- Current publication blocker remains the Cloudflare account mismatch. Production still requires account choice, backup/restore verification, exact-origin CORS, live-source comparison and browser acceptance checks. Local tests are not visual iPhone validation.


## Published 30 October 2026

Cloudflare account confirmed: kepesantrenannuris2026@gmail.com (031c996ff176bc538a5ccf2d212edd0a).
URL: https://kepesantrenan-nuris.kepesantrenannuris.workers.dev/
Worker kepesantrenan-nuris uses static assets first, no paid add-ons, no database copy.
Supabase kepesantrenan v5 adds precisely this origin and preserves the two existing Netlify origins. All other live v4 function files were preserved. Netlify sites and original api function remain unchanged.
Public portal.js, apps.js and the main original Mutabaah application bundle matched the live Netlify versions. Public Mutabaah assets are archived in mutabaah-public-snapshot.json.gz with manifest SHA-256 verification, allowing clean builds without Netlify. This archive is NOT a database backup.
CORS OPTIONS passed for all three origins. Browser opened the actual Cloudflare login page. Authenticated role/write/PDF tests and physical iPhone acceptance still require user verification; no account passwords or student data were changed for testing.
No database backup or restore test was performed during this hosting-only deployment. Do not retire Netlify or claim disaster recovery is validated based on this release.
