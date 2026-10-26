import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { inspectQuestionBank } from '../src/questions/questionBank.js';
import { importQuestionBank } from '../src/questions/questionBankImporter.js';
import { buildQuestionBankReview, collectApprovedGameplayHints, preserveHintReviewDecisions, readHintReviewArtifact } from '../src/questions/questionBankReview.js';
describe('question review and proposed gameplay hints', () => {
    it('reviews every clean candidate and keeps each generic proposal pending revision and fact checking', async () => {
        const audit = await inspectQuestionBank();
        const { review, hints } = await buildQuestionBankReview(audit);
        expect(hints.schemaVersion).toBe(2);
        expect(review.summary).toMatchObject({ totalCandidates: 171, validIntegerCandidates: 169, decimalOrOtherRejected: 2, nearDuplicatePairs: 14 });
        expect(review.records).toHaveLength(171);
        expect(hints.summary).toMatchObject({ candidates: 169, draftHintsReviewed: 169, proposed: 0, requiresManualAuthoring: 0, requiresManualReview: 169, potentiallyRevealing: 0, nearDuplicatePairs: 14, answersRequiringFactCheck: 171, approved: 0, recommendedApproval: 0, recommendedRevision: 169, recommendedRejection: 0, requiringFactCheck: 169, manualRewriteRequired: 169 });
        expect(hints.records.every((record) => record.status === 'needs_revision' && record.reviewerDecision === 'pending' && record.approved === false)).toBe(true);
        expect(hints.records.every((record) => !/[0-9٠-٩۰-۹]/u.test(record.suggestion))).toBe(true);
        expect(hints.records.map((record) => record.id)).not.toContain('football_027');
        expect(review.nearDuplicatePairs).toEqual(expect.arrayContaining([
            expect.objectContaining({ first: expect.objectContaining({ id: 'series_016' }), second: expect.objectContaining({ id: 'series_018' }) }),
        ]));
    });
    it('upgrades a legacy v1 review artifact to the current v2 contract', async () => {
        const artifactPath = fileURLToPath(new URL('./fixtures/hint-review-v1.json', import.meta.url));
        const artifact = await readHintReviewArtifact(artifactPath);
        expect(artifact.schemaVersion).toBe(2);
        expect(artifact.records).toHaveLength(0);
    });
    it('preserves reviewer-authored hint drafts and decisions while source fingerprints stay unchanged', async () => {
        const audit = await inspectQuestionBank();
        const { hints } = await buildQuestionBankReview(audit);
        const original = hints.records[0];
        const previous = {
            ...hints,
            records: hints.records.map((entry) => entry.id === original.id ? {
                ...entry,
                suggestion: 'human-edited draft',
                rationale: 'human rationale',
                reviewRationale: 'human review note',
            } : entry),
        };
        const regenerated = {
            ...hints,
            records: hints.records.map((entry) => entry.id === original.id ? { ...entry, suggestion: 'fresh generated draft' } : entry),
        };
        const merged = preserveHintReviewDecisions(regenerated, previous);
        expect(merged.records.find((entry) => entry.id === original.id)).toMatchObject({
            suggestion: 'human-edited draft', rationale: 'human rationale', reviewRationale: 'human review note',
        });
        const stale = { ...previous, records: previous.records.map((entry) => entry.id === original.id ? { ...entry, sourceFingerprint: 'stale' } : entry) };
        const staleMerged = preserveHintReviewDecisions(regenerated, stale);
        expect(staleMerged.records.find((entry) => entry.id === original.id)?.suggestion).toBe('fresh generated draft');
    });
    it('only accepts an explicit approval with complete gameplay fields and an unchanged source snapshot', async () => {
        const audit = await inspectQuestionBank();
        const { hints } = await buildQuestionBankReview(audit);
        expect(collectApprovedGameplayHints(hints, audit.normalizedRecords).approved.size).toBe(0);
        const record = hints.records[0];
        const approved = {
            ...hints,
            records: hints.records.map((entry) => entry.id === record.id ? {
                ...entry, status: 'approved', approved: true,
                reviewerDecision: 'approved',
                factCheckStatus: 'verified',
                factCheckSources: ['https://example.org/verified-source'],
                factCheckNote: 'تمت مراجعة الإجابة في المصدر المحدد.',
                reviewerNotes: 'اعتماد بشري بعد التحرير والتحقق.',
                gameplayHint: { range: 'مكتمل بعد مراجعة المحرر', accuracy: 'مكتمل بعد مراجعة المحرر', note: entry.suggestion },
                approvalNote: 'راجع المحرر النص والمجال والدقة.',
                leakageReview: 'clear',
            } : entry),
        };
        const accepted = collectApprovedGameplayHints(approved, audit.normalizedRecords);
        expect(accepted.approved.size).toBe(1);
        expect(accepted.approved.get(record.id)?.note).toBe(record.suggestion);
        const leaking = { ...approved, records: approved.records.map((entry) => entry.id === record.id ? { ...entry, gameplayHint: { ...entry.gameplayHint, note: String(entry.answer) } } : entry) };
        expect(collectApprovedGameplayHints(leaking, audit.normalizedRecords).approved.size).toBe(0);
        const stale = { ...approved, records: approved.records.map((entry) => entry.id === record.id ? { ...entry, answer: entry.answer + 1 } : entry) };
        expect(collectApprovedGameplayHints(stale, audit.normalizedRecords).approved.size).toBe(0);
        const staleFingerprint = { ...approved, records: approved.records.map((entry) => entry.id === record.id ? { ...entry, sourceFingerprint: 'stale-fingerprint' } : entry) };
        expect(collectApprovedGameplayHints(staleFingerprint, audit.normalizedRecords).approved.size).toBe(0);
        const unverified = { ...approved, records: approved.records.map((entry) => entry.id === record.id ? { ...entry, factCheckSources: [], factCheckStatus: 'needs_fact_check' } : entry) };
        expect(collectApprovedGameplayHints(unverified, audit.normalizedRecords).approved.size).toBe(0);
    });
    it('does not write database rows when no gameplay hints are explicitly approved', async () => {
        const audit = await inspectQuestionBank();
        const { hints } = await buildQuestionBankReview(audit);
        let writes = 0;
        const tx = {
            question: { findMany: async () => [], create: async () => { writes += 1; }, update: async () => { writes += 1; } },
            approvedQuestionHint: { updateMany: async () => { writes += 1; }, upsert: async () => { writes += 1; } },
        };
        const prisma = { $transaction: async (operation) => operation(tx) };
        const counts = await importQuestionBank(prisma, audit, hints);
        expect(counts).toEqual({ inserted: 0, updated: 0, skipped: 169, rejected: 2 });
        expect(writes).toBe(0);
    });
    it('enables a question only when its complete source-matched hint review is explicitly approved', async () => {
        const audit = await inspectQuestionBank();
        const { hints } = await buildQuestionBankReview(audit);
        const candidate = hints.records[0];
        const approved = {
            ...hints,
            records: hints.records.map((entry) => entry.id === candidate.id ? {
                ...entry,
                status: 'approved',
                reviewerDecision: 'approved',
                approved: true,
                factCheckStatus: 'verified',
                factCheckSources: ['https://example.invalid/test-only-source'],
                factCheckNote: 'Synthetic test approval only.',
                gameplayHint: { range: 'test range', accuracy: 'test accuracy', note: 'test hint' },
                approvalNote: 'Synthetic test approval only.',
                leakageReview: 'clear',
            } : entry),
        };
        const created = [];
        const tx = {
            question: {
                findMany: async () => [],
                create: async (input) => { created.push(input.data); },
                update: async () => undefined,
            },
            approvedQuestionHint: { updateMany: async () => undefined, upsert: async () => undefined },
        };
        const prisma = { $transaction: async (operation) => operation(tx) };
        const counts = await importQuestionBank(prisma, audit, approved);
        expect(created).toHaveLength(1);
        expect(created[0]).toMatchObject({ id: candidate.id, enabled: true, answer: BigInt(candidate.answer) });
        expect(counts.inserted).toBe(1);
        expect(counts.skipped).toBe(168);
    });
    it('disables a previously imported source question if its hint is no longer explicitly approved', async () => {
        const audit = await inspectQuestionBank();
        const record = audit.normalizedRecords[0];
        const { hints } = await buildQuestionBankReview(audit);
        let disabled = 0;
        let revoked = 0;
        const tx = {
            question: {
                findMany: async () => [{ id: record.id, sourceFile: record.sourceFile, enabled: true, promptAr: record.promptAr, answer: BigInt(record.answer), category: record.category, type: record.type, difficulty: record.difficulty, source: record.source, sourceRecordIndex: record.sourceRecordIndex, metadata: record.metadata, hint: { range: 'old', accuracy: 'old', note: 'old', approved: true, approvedAt: new Date() } }],
                create: async () => { throw new Error('unapproved record must not be inserted'); },
                update: async () => { disabled += 1; },
            },
            approvedQuestionHint: { updateMany: async () => { revoked += 1; }, upsert: async () => { throw new Error('unapproved hint must not be written'); } },
        };
        const prisma = { $transaction: async (operation) => operation(tx) };
        const counts = await importQuestionBank(prisma, audit, hints);
        expect(disabled).toBe(1);
        expect(revoked).toBe(1);
        expect(counts.updated).toBe(1);
        expect(counts.skipped).toBe(168);
    });
});
