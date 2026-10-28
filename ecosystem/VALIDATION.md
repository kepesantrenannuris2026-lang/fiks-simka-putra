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
- Deployment and visual/end-to-end signed-in checks remain pending Netlify browser authentication. Google rejected the submitted password; manual browser handoff is required. Automatic approval review rejected changing visitor SSO scope. The new site still requires Netlify team SSO on all deploys. No frontend deployment has been uploaded and the legacy Mutabaah site has not been replaced.
