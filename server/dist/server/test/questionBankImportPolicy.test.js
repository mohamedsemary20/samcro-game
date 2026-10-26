import { describe, expect, it } from 'vitest';
import { inspectQuestionBank } from '../src/questions/questionBank.js';
import { planQuestionImport } from '../src/questions/questionBankImportPolicy.js';
describe('question import policy', () => {
    it('skips unchanged records on repeat runs and updates changed source records safely', async () => {
        const record = (await inspectQuestionBank()).normalizedRecords[0];
        const existing = {
            id: record.id,
            promptAr: record.promptAr,
            answer: BigInt(record.answer),
            category: record.category,
            type: record.type,
            difficulty: record.difficulty,
            source: record.source,
            sourceFile: record.sourceFile,
            sourceRecordIndex: record.sourceRecordIndex,
            metadata: record.metadata,
            enabled: false,
            hint: null,
        };
        expect(planQuestionImport([record], []).map(({ kind }) => kind)).toEqual(['insert']);
        expect(planQuestionImport([record], [existing]).map(({ kind }) => kind)).toEqual(['skip']);
        const changed = { ...record, answer: record.answer + 1 };
        expect(planQuestionImport([changed], [existing])).toMatchObject([{ kind: 'update', revokeHintApproval: true }]);
    });
    it('refuses to overwrite a same-ID question owned by another source', async () => {
        const record = (await inspectQuestionBank()).normalizedRecords[0];
        const existing = {
            id: record.id, promptAr: record.promptAr, answer: BigInt(record.answer), category: record.category,
            type: record.type, difficulty: record.difficulty, source: record.source,
            sourceFile: 'manual-editor-entry', sourceRecordIndex: 0, metadata: {}, enabled: true, hint: null,
        };
        expect(planQuestionImport([record], [existing])).toMatchObject([{ kind: 'conflict', reason: 'stable-id-owned-by-another-source' }]);
    });
});
