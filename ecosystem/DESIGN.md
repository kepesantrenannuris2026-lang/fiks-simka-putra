# UI reference lock — Mutabaah Nurista

Source: current Mutabaah production deployment 6ae1f22533dfeb1cb6979257, user mobile screenshot image(20261028-131027).png, and official Nuris transparent 1080px logo attachment. This existing product target replaces generic style exploration.

Preserve exact Mutabaah tokens: pine #082e1a, leaf-deep #0d4a28, leaf #17873f, saffron #ee8a35 (primary actions only), mist #f2f6f3, ink #122219, muted #5e6f65, line #dce5df. Use the same self-hosted Plus Jakarta Sans font. White student cards with 18px corners, mint inset point panels, dark green desktop sidebar, and five-item mobile navigation with an orange central recording action.

The shared logo is a geometric SVG trace of the supplied official logo; preserve the supplied transparent 1080px PNG as fallback. Never stretch or crop the mark. Render app icons from the SVG.

App switching: compact grid button adjacent to the notification bell. It mounts only into the actual header, never floats above bottom navigation. The menu gives access to the portal, Mutabaah, and SIMKA. Embedded apps retain their frames when switching; the portal hides duplicate outer bars while a module is open.

UI-only change: no database schema, account, password, record, or API authorization changes.

SIMKA Putri uses the same reference-locked frontend with an explicit PUTRI build, separate /simka-putri/ route, per-campus sessions, server authorization, and isolated simka_putri schema. Official violation and coaching catalogues come from mlwildan12-arch/NEW-SIMKA-PUTRI-V1 at 6b41d701de50e3d1ee774a7f5b2f38388304881a. Do not copy sample accounts or passwords. Prior case history from external SIMKA databases has not been imported.

Incident dates use datetime-local explicitly labelled WIB; all writes normalize to ISO UTC both in the client and the server. PDF coordinator names are the six unit/campus officers supplied by the owner, never the recorder or a random user.

Yaumiyyah reference: the attached 2026/2027 Nuris booklet, 15 daily activity rows plus July-December and January-June summaries. Daily-sheet targets take precedence over inconsistent semester-sheet targets. School attendance defaults to Monday-Friday with explicit non-assessed days. The existing Mutabaah palette and official logo are retained.

Liquid glass navigation is one shared, progressive-enhancement script, mounted into horizontal tablists, mobile app navigation and portal navigation. A single translucent highlight tracks the actual selected element, responds to resizing and late rendering, and respects reduced-motion and reduced-transparency preferences. It never changes routes, data or tab selection. Existing Mutabaah JS assets remain unchanged.
