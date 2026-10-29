# Validation — 28 October 2026

- TypeScript application type check passed.
- Seven server authorization tests passed: unit scope enforcement, identifier injection, protected master/accounts, actor and points forgery, cross-unit student reference, immutable case ownership, cross-student coaching case.
- Vite production build passed (existing large-bundle warning remains).
- Private Supabase schema applied. Live student view: SMP 207, SMA 97, MA 71; 375 Putra students total. Source Mutabaah tables unchanged.
- Official SIMKA source catalogues: 16 violations and 8 coaching levels. No demo users/students/cases imported.
- `anon` and `authenticated` have no schema access. RLS is enabled on private tables with deny-by-default; INFO notices for missing policies are intentional for server-only schema. Existing public pg_net warning predates integration.
- Netlify project: kepesantrenannuris, id 4cb18621-271f-4a6a-9cef-78dd6bd9e61e, account kepesantrenannuris2026@gmail.com.
- Edge Function kepesantrenan deployed (v2). Invalid/missing tokens and invalid one-time handoffs return 401; invalid login returns the expected rejection. CORS accepts the portal origin.
- Edge Function kepesantrenan uses existing Mutabaah login plus live session/account validation. Legacy Mutabaah backend was not modified.
- Deployment and visual/end-to-end signed-in checks remain pending Netlify browser authentication. The user explicitly authorized public portal access on 28 October 2026; Netlify team SSO and site password gates were removed and connector readback confirmed both are disabled. Application data still requires the shared Mutabaah login. During the requested login retry, Google displayed “Sign-in stopped” and said the sign-in request from another device had been rejected. Manual verification is required. No frontend deployment has been uploaded and the legacy Mutabaah site has not been replaced.

## 29 October 2026 — Putri and case fixes
- 15 tests pass: server unit/campus isolation, old-client Indonesian date compatibility, ISO round trip, invalid dates, six coordinator mappings and actual PDF form-data officer selection.
- New private simka_putri schema: 478 active students (SMP 214, SMA 176, MA 88), 16 source catalogue entries, 8 coaching levels; no old history imported.
- Existing Putra cases remained 4; coaching remained 0 across additive migration. No account/password mutations.
- Browser file previews were previously blocked by browser policy; no visual-browser certification claimed.
