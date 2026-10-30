# Offline question approval status

The bundled offline pack is intentionally empty. The source review reports 169 safe integer question candidates, but the canonical hint review records **0 approved**, **169 requiring fact checks**, **169 requiring manual hint rewrites**, and **14 near duplicate pairs**. A candidate being syntactically playable does not approve its answer or hint.

The reviewable source records are in [`server/data/question-bank-hints.review.json`](../server/data/question-bank-hints.review.json), with editorial guidance in [`server/reports/question-bank-approval-shortlist.md`](../server/reports/question-bank-approval-shortlist.md). To enter the mobile pack, a reviewer must follow the canonical policy and explicitly set the answer fact check, hint review, duplicate decision, approval fields, and current source fingerprint. The exporter only includes records that satisfy all of those checks.

After the editorial review is complete, run `npm run questions:export-mobile` from `server/`, inspect the diff under `mobile/assets/offline-questions.json`, and run `npm run questions:check-mobile`. The exporter never edits source questions, review records, or a database. The app validates the generated bundle and will show the actual approved count; it will refuse to start until at least five distinct approved questions are available.
