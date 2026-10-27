# Question-bank approval shortlist

Prepared 2026-10-27 from the source questions and official FIFA pages. This shortlist is editorial assistance only: it does not approve questions or hints, and it is not consumed by the importer. The canonical review artifact remains `server/data/question-bank-hints.review.json`; all five records below must remain pending until a human completes and approves each record.

## Candidates to review

| ID | Source answer | Primary fact-check source | Human check still required |
|---|---:|---|---|
| `football_001` | 1930 | [FIFA: World Cup champions 1930–1978](https://www.fifa.com/en/de/mens/worldcup/articles/world-cup-champions-1930-1978-uruguay-italy-germany-brazil-england-argentina) | Confirm that the wording asks for the first tournament's year, not the decision/founding year. |
| `football_002` | 13 | [FIFA: World Cup champions 1930–1978](https://www.fifa.com/en/de/mens/worldcup/articles/world-cup-champions-1930-1978-uruguay-italy-germany-brazil-england-argentina) | Check the count is participating national teams in the 1930 final tournament. |
| `football_003` | 172 | [FIFA Publications: Qatar 2022 summary](https://publications.fifa.com/de/annual-report-2022/2022-at-a-glance/fifa-world-cup-qatar-2022-summary/) | Confirm the source's tournament goal total matches the question's exclusion of penalty-shootout kicks. |
| `football_004` | 171 | [FIFA: Triumphant Argentina conclude unprecedented FIFA World Cup](https://inside.fifa.com/tournaments/mens/worldcup/qatar2022/news/triumphant-argentina-conclude-unprecedented-fifa-world-cup) | Confirm the comparison is the France 1998 tournament total, not a team or player total. |
| `football_005` | 16 | [FIFA: All Miroslav Klose's record 16 World Cup goals](https://www.fifa.com/en/articles/watch-miroslav-klose-goals-record) | Confirm the count is Klose's goals across FIFA World Cup final tournaments only. |

These source pages support the listed candidate values. A reviewer must independently check the full original question, answer scope, and source before changing `factCheckStatus` to `verified`.

## Required human edits for each accepted candidate

In the matching `records[]` entry in `server/data/question-bank-hints.review.json`:

1. Keep `sourceFingerprint` unchanged; if the source question changes, the review is stale and must be redone.
2. Verify the answer against the cited source and wording; record the verification and any scope/definition caveat in `factCheckNote`, and keep the HTTPS source URL in `factCheckSources`.
3. Write non-empty `gameplayHint.range`, `gameplayHint.accuracy`, and `gameplayHint.note`. Review the final text for usefulness, ambiguity, and answer leakage. Do not copy `source_hint` or this shortlist into those fields.
4. Only if the answer is verified and the final hint passes editorial review, set `factCheckStatus` to `verified`, `leakageReview` to `clear`, add a reasoned `approvalNote`, set both `status` and `reviewerDecision` to `approved`, and set `approved` to `true`. Otherwise leave the record pending/revision or reject it explicitly.
5. Review duplicate flags for each chosen ID in the full artifact; do not approve a duplicate pair without recording the editorial decision.

After the human edits, run `npm.cmd run questions:validate` from `server/`, inspect its regenerated reports and confirm the five approvals survived with matching fingerprints. Then inspect the target database identity without printing its URL. Only after explicitly approving the target database and import, run `npm.cmd run questions:import` there. The importer only enables records with explicit, complete, current approvals and provenance; it does not approve recommendations or drafts.
