import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { inspectQuestionBank } from '../src/questions/questionBank.js';
const directory = fileURLToPath(new URL('../data/browser-match-test/', import.meta.url));
const draftPath = fileURLToPath(new URL('../data/browser-match-test/question-drafts.json', import.meta.url));
describe('isolated browser-match question drafts', () => {
    it('normalizes ten tagged records while keeping every draft ineligible for gameplay', async () => {
        const pack = JSON.parse(await readFile(draftPath, 'utf8'));
        const audit = await inspectQuestionBank(directory);
        expect(pack.label).toBe('BROWSER_MATCH_TEST_ONLY_PENDING_REVIEW');
        expect(pack.approvalStatus).toBe('pending_human_review');
        expect(pack.questions).toHaveLength(10);
        expect(new Set(pack.questions.map((question) => question.id)).size).toBe(10);
        expect(pack.questions.every((question) => question.testOnly)).toBe(true);
        expect(audit.valid).toBe(true);
        expect(audit.normalizedRecords).toHaveLength(10);
        expect(audit.rejectedRecords).toHaveLength(0);
        expect(audit.playableCount).toBe(0);
        expect(audit.normalizedRecords.every((question) => question.playable === false && question.approvedHint === null)).toBe(true);
        const expectedAnswers = new Map([
            ['browser_test_area_rectangle_001', 126],
            ['browser_test_square_perimeter_002', 52],
            ['browser_test_time_conversion_003', 205],
            ['browser_test_percentage_004', 36],
            ['browser_test_fraction_of_quantity_005', 270],
            ['browser_test_arithmetic_mean_006', 20],
            ['browser_test_cube_volume_007', 125],
            ['browser_test_map_scale_008', 2000],
            ['browser_test_polygon_diagonals_009', 35],
            ['browser_test_speed_distance_010', 180],
        ]);
        for (const question of pack.questions) {
            expect(question.id.startsWith('browser_test_')).toBe(true);
            expect(question.q).toMatch(/[\u0600-\u06ff]/u);
            expect(Number.isSafeInteger(question.answer) && question.answer >= 0).toBe(true);
            expect(question.answer).toBe(expectedAnswers.get(question.id));
            expect(question.category.trim().length).toBeGreaterThan(0);
            expect(['count', 'measure']).toContain(question.type);
            expect(question.reviewDraft).toMatchObject({
                status: 'needs_fact_check',
                reviewerDecision: 'pending',
                approved: false,
                factCheckStatus: 'needs_fact_check',
                factCheckSources: [],
                leakageReview: null,
                approvalNote: null,
            });
            expect(Object.values(question.reviewDraft.gameplayHint).every((value) => value.trim().length > 0)).toBe(true);
            const hint = Object.values(question.reviewDraft.gameplayHint).join(' ');
            expect(new RegExp(`(^|\\D)${question.answer}(?=$|\\D)`, 'u').test(hint)).toBe(false);
        }
    });
});
