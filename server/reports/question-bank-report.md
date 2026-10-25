# Samkaro question bank audit

Generated: 2026-10-24T23:20:10.643Z

## Source

- Directory: `web/questions`
- Files: `web/questions/trivia_clean.json`
- Total source records: 200
- Candidate records: 171
- Excluded by source bank: 29

## Source schema

- `answer`: number
- `category`: string
- `confidence`: number
- `difficulty`: string
- `id`: string
- `q`: string
- `reason`: string
- `source_hint`: string
- `topic`: string
- `type`: string
- `unit`: string

## Answer formats

- missing: 29
- number-decimal: 2
- number-integer: 169

## Normalization and eligibility

- Valid normalized records: 169
- Rejected candidate records: 2
- Missing approved game hints: 171
- Playable records: 0
- Database import: Not run.
- Invalid JSON/root errors: 0
- Duplicate IDs: 0
- Exact duplicate prompts: 0
- Near-duplicate review candidates: 14

## Categories

- كرة القدم: 82
- مسلسلات: 89

## Original types

- count: 61
- measure: 3
- money_or_large: 2
- year: 105

## Rejected candidates

- football_027 @ web/questions/trivia_clean.json#clean[26]: decimal-answer-unsupported-by-bigint-scoring (answer=7.32)
- football_066 @ web/questions/trivia_clean.json#clean[65]: decimal-answer-unsupported-by-bigint-scoring (answer=6.175)

## Source-excluded records

- small_answer: 15
- ambiguous: 5
- bad_format: 3
- wrong_answer_suspected: 1
- low_confidence: 5

## Near-duplicate candidates

- series_016 @ web/questions/trivia_clean.json#clean[97] ↔ series_018 @ web/questions/trivia_clean.json#clean[99] (94.2% textual similarity; manual review only)
- series_017 @ web/questions/trivia_clean.json#clean[98] ↔ series_018 @ web/questions/trivia_clean.json#clean[99] (96.2% textual similarity; manual review only)
- series_054 @ web/questions/trivia_clean.json#clean[135] ↔ series_075 @ web/questions/trivia_clean.json#clean[156] (92.5% textual similarity; manual review only)
- series_056 @ web/questions/trivia_clean.json#clean[137] ↔ series_066 @ web/questions/trivia_clean.json#clean[147] (92.1% textual similarity; manual review only)
- series_056 @ web/questions/trivia_clean.json#clean[137] ↔ series_077 @ web/questions/trivia_clean.json#clean[158] (92.1% textual similarity; manual review only)
- series_056 @ web/questions/trivia_clean.json#clean[137] ↔ series_086 @ web/questions/trivia_clean.json#clean[167] (91.9% textual similarity; manual review only)
- series_056 @ web/questions/trivia_clean.json#clean[137] ↔ 7_72 @ web/questions/trivia_clean.json#removed[25] (97.3% textual similarity; manual review only)
- series_066 @ web/questions/trivia_clean.json#clean[147] ↔ 7_72 @ web/questions/trivia_clean.json#removed[25] (92.1% textual similarity; manual review only)
- series_069 @ web/questions/trivia_clean.json#clean[150] ↔ series_078 @ web/questions/trivia_clean.json#clean[159] (92.9% textual similarity; manual review only)
- series_070 @ web/questions/trivia_clean.json#clean[151] ↔ series_080 @ web/questions/trivia_clean.json#clean[161] (92.7% textual similarity; manual review only)
- series_071 @ web/questions/trivia_clean.json#clean[152] ↔ series_081 @ web/questions/trivia_clean.json#clean[162] (92.3% textual similarity; manual review only)
- series_074 @ web/questions/trivia_clean.json#clean[155] ↔ series_079 @ web/questions/trivia_clean.json#clean[160] (92.9% textual similarity; manual review only)
- series_086 @ web/questions/trivia_clean.json#clean[167] ↔ 7_72 @ web/questions/trivia_clean.json#removed[25] (91.9% textual similarity; manual review only)
- series_086 @ web/questions/trivia_clean.json#clean[167] ↔ 7_98 @ web/questions/trivia_clean.json#removed[28] (91.9% textual similarity; manual review only)

## Policy

- Stable IDs are preserved. Duplicate IDs are rejected as conflicts; records are never silently merged.
- Exact prompt duplicates are reported, not deleted. Similarity candidates are editorial review hints, not automatic duplicates.
- Only integer, non-negative, JavaScript-safe answers map to the existing PostgreSQL `BigInt` and scoring rules. Decimal answers are rejected until the game model supports them.
- Source types `year` map to `year`; `count`, `measure`, and `money_or_large` map to `number`, while the original type and metadata are preserved.
- `source_hint` is preserved as a source note; generated gameplay suggestions remain unapproved drafts and never inherit that source note as a game hint.
- Only records with complete, source-matched editorial and fact-check approval are enabled for gameplay. Pending, rejected, stale, and incomplete records remain unplayable.
- Answer correctness has not been independently fact-checked.
