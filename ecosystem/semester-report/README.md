# Semester Al-Qur'an report (Cloudflare)

Open Mutabaah Tahfidz → Santri → Raport. The existing route now opens a semester report. Select academic year and Ganjil/Genap, complete any missing assessments, then download PDF or open it to print at actual size (100%). PDF pages are F5 **165 × 210 mm**, including all appendices. Long content paginates at readable type sizes instead of shrinking or clipping. Signature blocks reserve space for actual signatures; the app does not reproduce handwritten signatures.

Sources inspected across all three connected Drive accounts:

- [Original folder, semester 2 2025–2026](https://drive.google.com/drive/folders/1_RLxJyCeCTjmBU3RRT2bNRtegXx_wuLT): templates for grades 7/10, 8/11, 9/12 and 7+ juz. The original Word page is 12242 × 18711 twips (about 216 × 330 mm), so F5 is intentionally a smaller, paginated adaptation.
- [Panduan Pengisian Rapor Al-Qur'an](https://docs.google.com/document/d/1B57914JsEsx0ydA6Wwr0pqZ6LdTEA3Oq5aUqWGu5yu4/edit): five aspects, Iqro topics, semester achievement thresholds and narratives.
- [Grade 8/11 template](https://docs.google.com/document/d/1tlBHDdY_-X3MCf5oQRMDbSCPIauw7imp/edit) and [7+ juz template](https://docs.google.com/document/d/1cNv_uJNqhXLuNwS-SDc6SRXsygyXGoac/edit): head name **Abdul Fattah Ismail Farros, Lc., M.IRKH**. Signature title follows the requested Kepala Bidang Kepesantrenan. Musyrif/ah comes from the selected student's own assignment, never the shuffled examiner.

Data mapping:

| Report field | Source |
| --- | --- |
| Period | July–December (Ganjil), January–June (Genap) of selected school year |
| Five aspects | Saved semester supplement; then existing semester assessment; then latest in-period makhraj/tajwid assessment |
| Hafalan predicate fallback | Recorded new memorization / guide target: >100% A+, ≥90% A, ≥80% B+, ≥70% B, otherwise C. First semester grades 7/10 focuses on tahsin; recorded memorization gives A+. No records means no invented grade. |
| Final exam | Latest FINAL attempt only, each juz score and question count retained; basic/partial exams labelled separately |
| Discipline / development | Existing teacher assessment or explicit supplement; never inferred just from attendance counts |
| Iqro | Explicit teacher assessment per topic; basic exam does not fabricate 11 topic grades |
| Ziyadah | Same normalized location counted at maximum recorded coverage; unlabelled records summed, matching the existing anti-repeat principle. All weekly records printed for review. |
| Opening / end hafalan | Manually verified opening or a dated verification no later than semester end. Current cumulative balance is never substituted into a past report. Missing opening remains unverified. |
| Certification | Only certification dated on/before selected semester end |

The supplementary table is additive, private/RLS, and version-checked. Only the student's own musyrif/ah, unit coordinator, or administrator can edit it; same-unit examiners can read. Legacy grades, exams, weekly records, and certification are not overwritten. The report adds no background polling or Realtime subscriptions; PDF generation is lazy-loaded in the browser. Netlify output is untouched.

Deploy: apply `schema.sql` once, deploy the existing `ujian-tahfidz` Edge Function with `semester-report.ts` and existing auth, build `node ecosystem/semester-report/build.mjs`, patch `node ecosystem/cloudflare/route-semester-report.mjs`, then upload the Cloudflare asset package. Future `apply-exam.mjs` runs include both steps automatically. Do not rebuild the legacy baseline from an older snapshot.
