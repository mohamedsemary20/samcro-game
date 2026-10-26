import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const REVIEW_JSON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../reports/question-bank-review.json');
const REVIEW_MARKDOWN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../reports/question-bank-review.md');
const HINTS_JSON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/question-bank-hints.review.json');
const HINTS_MARKDOWN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../reports/question-bank-hints.review.md');
function strings(value) { return typeof value === 'string' ? value : null; }
function key(sourceFile, collection, recordIndex) { return `${sourceFile}#${collection}[${recordIndex}]`; }
function escapeCell(value) { return String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' '); }
function proposedHint(record) {
    const prompt = record.promptAr;
    let text;
    if (/وُلد|ولدت|ولد الفنان|ولدت الفنانة/.test(prompt)) {
        text = 'اربط الإجابة بحدث الميلاد المقصود، ولا تخلطه بتاريخ بداية المسيرة أو أحد الأعمال.';
    }
    else if (/توفي|توفيت|أُعدمت/.test(prompt)) {
        text = 'ركّز على حدث الوفاة أو الإعدام المذكور نفسه، لا على الميلاد أو الأعمال المرتبطة بالشخص.';
    }
    else if (/عمر/.test(prompt)) {
        text = 'اربط العمر بتاريخ الواقعة المذكورة في السؤال، لا بعمر الشخص في فترة أخرى.';
    }
    else if (/حلقة/.test(prompt)) {
        text = 'احصر العدّ في العمل أو الجزء المحدد، ولا تجمع أجزاء أو مواسم أخرى.';
    }
    else if (/دقيقة/.test(prompt)) {
        text = 'حدّد المباراة والواقعة أولاً، وانتبه إلى طريقة احتساب زمن المباراة المذكورة.';
    }
    else if (/هدف/.test(prompt)) {
        text = 'احصر العدّ في البطولة أو الموسم والفريق أو اللاعب المحدد، والتزم بالحد الزمني المذكور.';
    }
    else if (/مباراة/.test(prompt)) {
        text = 'حدّد المسابقة والفترة المذكورتين، ثم التزم بما يعدّه السؤال مشاركة أو مباراة.';
    }
    else if (/منتخباً|منتخبات|مشارك/.test(prompt)) {
        text = 'ركّز على المشاركين في النسخة المحددة، ولا تخلطهم بمنتخبات نسخ أو مراحل أخرى.';
    }
    else if (/نقطة/.test(prompt)) {
        text = 'التزم بالموسم والفريق المذكورين، وانتبه إلى أن المطلوب رصيد النقاط لا ترتيب الفريق.';
    }
    else if (/سعة|مقاعد|قيمة صفقة|مليون يورو/.test(prompt)) {
        text = 'ثبّت الوحدة ونوع القياس المطلوب قبل التفكير في القيمة، ولا تخلطه بمقياس آخر.';
    }
    else if (/كم سنة/.test(prompt)) {
        text = 'ركّز على نقطتي البداية والنهاية المذكورتين، وانتبه إلى طريقة حساب مدة الاستمرار.';
    }
    else if (/سنة|عام|ميلادية/.test(prompt)) {
        text = 'ثبّت الحدث الذي يسأل عنه النص، ولا تخلط بين سنة وقوعه وسنة حدث قريب منه.';
    }
    else {
        text = 'التزم بالمسابقة أو الفترة والعنصر المحدد في السؤال، واستبعد ما يقع خارج هذا النطاق.';
    }
    return {
        text,
        rationale: 'توجيه نطاق الإجابة مستند إلى صياغة السؤال فقط؛ لا يضيف معلومة خارجية ولا يؤكد صحة الإجابة.',
    };
}
async function readCandidates(audit) {
    const rows = [];
    for (const sourceFile of audit.sourceFiles) {
        const fullPath = path.resolve(repoRoot, sourceFile);
        let parsed;
        try {
            parsed = JSON.parse(await readFile(fullPath, 'utf8'));
        }
        catch {
            continue;
        }
        const root = Array.isArray(parsed) ? null : parsed;
        const collections = Array.isArray(parsed)
            ? [{ name: 'records', values: parsed }]
            : ['questions', 'clean'].filter((name) => Array.isArray(root?.[name])).map((name) => ({ name, values: root[name] }));
        for (const collection of collections)
            for (const [recordIndex, value] of collection.values.entries()) {
                if (value && typeof value === 'object' && !Array.isArray(value))
                    rows.push({ sourceFile, collection: collection.name, recordIndex, row: value });
                else
                    rows.push({ sourceFile, collection: collection.name, recordIndex, row: { __malformedRecord: value } });
            }
    }
    return rows;
}
export async function buildQuestionBankReview(audit) {
    const sourceRows = await readCandidates(audit);
    const normalizedBySource = new Map(audit.normalizedRecords.map((record) => [key(record.sourceFile, record.metadata.sourceCollection, record.sourceRecordIndex), record]));
    const rejectedBySource = new Map(audit.rejectedRecords.map((record) => [key(record.sourceFile, record.collection, record.recordIndex), record]));
    const pairBySource = new Map();
    const nearDuplicatePairs = audit.nearDuplicateQuestions.flatMap((pair) => {
        const left = pair.records[0];
        const right = pair.records[1];
        if (!left || !right)
            return [];
        pairBySource.set(key(left.sourceFile, left.collection, left.recordIndex), [...(pairBySource.get(key(left.sourceFile, left.collection, left.recordIndex)) ?? []), right.id ?? '(missing-id)']);
        pairBySource.set(key(right.sourceFile, right.collection, right.recordIndex), [...(pairBySource.get(key(right.sourceFile, right.collection, right.recordIndex)) ?? []), left.id ?? '(missing-id)']);
        return [{
                similarity: pair.similarity,
                first: { id: left.id, sourceFile: left.sourceFile, collection: left.collection, recordIndex: left.recordIndex, promptAr: left.prompt },
                second: { id: right.id, sourceFile: right.sourceFile, collection: right.collection, recordIndex: right.recordIndex, promptAr: right.prompt },
                decision: 'manual-review-required; neither record is removed',
            }];
    });
    const questionRecords = sourceRows.map(({ sourceFile, collection, recordIndex, row }) => {
        const recordKey = key(sourceFile, collection, recordIndex);
        const normalized = normalizedBySource.get(recordKey);
        const rejected = rejectedBySource.get(recordKey);
        const id = strings(row.id);
        const integer = typeof row.answer === 'number' && Number.isSafeInteger(row.answer);
        const validationStatus = normalized ? 'valid_integer_candidate_not_fact_checked' : rejected?.reason ?? 'rejected_or_not_normalized';
        const reviewNotes = [
            normalized ? 'Question data passed structural and numeric normalization; answer still requires factual verification.' : `Not eligible for normalization: ${rejected?.reason ?? 'record did not normalize'}.`,
            ...(pairBySource.has(recordKey) ? [`Near-duplicate review pair(s): ${(pairBySource.get(recordKey) ?? []).join(', ')}. No automatic removal.`] : []),
            normalized ? 'The current gameplay hint requires revision and has no human approval.' : 'No gameplay hint is eligible for this rejected candidate.',
        ];
        return {
            id,
            questionText: strings(row.q),
            originalNumericAnswer: row.answer ?? null,
            unit: strings(row.unit),
            category: strings(row.category),
            originalType: strings(row.type),
            normalizedType: normalized?.type ?? null,
            difficulty: strings(row.difficulty),
            topic: strings(row.topic),
            confidence: typeof row.confidence === 'number' ? row.confidence : null,
            sourceHint: strings(row.source_hint),
            sourceFile,
            sourceCollection: collection,
            sourceRecordIndex: recordIndex,
            validationStatus,
            hintStatus: normalized ? 'needs_revision_pending_human_decision' : integer ? 'requires_manual_review_no_proposal' : 'not_proposed_decimal_or_invalid',
            reviewNotes,
        };
    });
    const hintRecords = audit.normalizedRecords.map((record) => {
        const proposal = proposedHint(record);
        const hasAnswerLeak = containsExactNumericAnswer(proposal.text, record.answer);
        return {
            id: record.id,
            sourceFile: record.sourceFile,
            sourceRecordIndex: record.sourceRecordIndex,
            sourceFingerprint: record.sourceFingerprint,
            promptAr: record.promptAr,
            answer: record.answer,
            unit: record.metadata.unit,
            category: record.category,
            type: record.type,
            originalType: record.metadata.originalType,
            difficulty: record.difficulty,
            topic: record.metadata.topic,
            confidence: record.metadata.confidence,
            sourceHint: record.metadata.sourceHint,
            status: 'needs_revision',
            reviewerDecision: 'pending',
            reviewerNotes: null,
            reviewRecommendation: 'needs_revision',
            reviewRationale: 'الصياغة مفهومة وآمنة من كشف الرقم، لكنها تكرر نطاق السؤال بعبارة عامة ولا تقدم خطوة استدلالية خاصة بهذا السؤال. يلزم تحرير تلميح موجّه بعد التحقق من الإجابة من مرجع موثوق.',
            factCheckStatus: 'needs_fact_check',
            factCheckSources: [],
            factCheckNote: 'لم يُتحقق من الإجابة بمصدر مستقل؛ source_hint بيانات وصفية وليست دليلاً كافياً للتحقق.',
            assessment: {
                arabicClarity: 'clear',
                arabicNaturalness: 'understandable_but_formulaic',
                factualPlausibility: 'no_external_claims',
                directAnswerReveal: false,
                exactAnswerIncluded: hasAnswerLeak,
                numericEquivalentClue: false,
                ambiguityOrMisleadingRisk: 'moderate',
                usefulDirection: 'low',
                manualRewriteRequired: true,
            },
            approved: false,
            suggestion: proposal.text,
            rationale: proposal.rationale,
            gameplayHint: { range: null, accuracy: null, note: null },
            approvalNote: null,
            leakageReview: null,
        };
    });
    const potentiallyRevealing = hintRecords.filter((record) => /[0-9٠-٩۰-۹]/u.test(record.suggestion)).length;
    const hints = {
        schemaVersion: 2,
        generatedAt: new Date().toISOString(),
        policy: 'Recommendations never approve hints. A human approval requires status=approved, reviewerDecision=approved, approved=true, matching full-source SHA-256 fingerprint, verified answer with HTTPS source and fact-check note, complete gameplayHint fields, leakageReview=clear, and approvalNote. Do not copy source_hint into gameplay fields.',
        summary: {
            candidates: hintRecords.length,
            draftHintsReviewed: hintRecords.length,
            proposed: hintRecords.filter((record) => record.status === 'proposed').length,
            requiresManualAuthoring: hintRecords.filter((record) => record.status === 'requires_manual_authoring').length,
            requiresManualReview: hintRecords.length,
            potentiallyRevealing,
            nearDuplicatePairs: nearDuplicatePairs.length,
            answersRequiringFactCheck: questionRecords.filter((record) => typeof record.originalNumericAnswer === 'number').length,
            approved: 0,
            recommendedApproval: 0,
            recommendedRevision: hintRecords.length,
            recommendedRejection: 0,
            requiringFactCheck: hintRecords.length,
            manualRewriteRequired: hintRecords.length,
        },
        records: hintRecords,
    };
    return {
        review: {
            schemaVersion: 1,
            generatedAt: new Date().toISOString(),
            sourceFiles: audit.sourceFiles,
            summary: {
                totalCandidates: questionRecords.length,
                validIntegerCandidates: audit.normalizedRecords.length,
                decimalOrOtherRejected: questionRecords.length - audit.normalizedRecords.length,
                nearDuplicatePairs: nearDuplicatePairs.length,
                answersRequiringFactCheck: questionRecords.filter((record) => typeof record.originalNumericAnswer === 'number').length,
            },
            nearDuplicatePairs,
            records: questionRecords,
        },
        hints,
    };
}
function renderReviewMarkdown(review) {
    const summary = review.summary;
    const pairs = review.nearDuplicatePairs;
    const records = review.records;
    return `# Question data review\n\n- Candidate questions reviewed: ${summary.totalCandidates}\n- Valid integer candidates: ${summary.validIntegerCandidates}\n- Decimal or otherwise rejected: ${summary.decimalOrOtherRejected}\n- Near-duplicate pairs: ${summary.nearDuplicatePairs}\n- Answers still requiring factual verification: ${summary.answersRequiringFactCheck}\n\n## Near-duplicate pairs\n\n${pairs.map((pair) => `- \`${pair.first.id}\` (${pair.first.sourceFile}#${pair.first.recordIndex}) ↔ \`${pair.second.id}\` (${pair.second.sourceFile}#${pair.second.recordIndex}); similarity ${(pair.similarity * 100).toFixed(1)}%. Review both; neither was removed.`).join('\n')}\n\n## Candidate records\n\n| ID | Question | Answer | Unit | Category | Type | Validation | Hint | Review notes |\n|---|---|---:|---|---|---|---|---|---|\n${records.map((record) => `| ${escapeCell(record.id)} | ${escapeCell(record.questionText)} | ${escapeCell(record.originalNumericAnswer)} | ${escapeCell(record.unit)} | ${escapeCell(record.category)} | ${escapeCell(record.originalType)} | ${escapeCell(record.validationStatus)} | ${escapeCell(record.hintStatus)} | ${escapeCell(record.reviewNotes.join(' '))} |`).join('\n')}\n`;
}
function renderHintMarkdown(hints) {
    const table = hints.records.map((record) => [
        record.id,
        record.promptAr,
        `${record.answer}${record.unit ? ` ${record.unit}` : ''}`,
        record.suggestion,
        record.status,
        record.reviewRecommendation,
        record.factCheckStatus,
        record.reviewerDecision,
        record.reviewRationale,
        `Arabic: ${record.assessment.arabicClarity}; style: ${record.assessment.arabicNaturalness}; external factual claims: ${record.assessment.factualPlausibility}; answer reveal: ${record.assessment.directAnswerReveal}; exact answer: ${record.assessment.exactAnswerIncluded}; numeric equivalent: ${record.assessment.numericEquivalentClue}; misleading risk: ${record.assessment.ambiguityOrMisleadingRisk}; usefulness: ${record.assessment.usefulDirection}; manual rewrite: ${record.assessment.manualRewriteRequired}`,
    ].map(escapeCell).join(' | ')).map((row) => '| ' + row + ' |').join('\n');
    return [
        '# Gameplay hint review',
        '',
        '- Existing draft hints reviewed: ' + hints.summary.draftHintsReviewed,
        '- Questions reviewed: ' + hints.summary.candidates,
        '- Recommended for approval: ' + hints.summary.recommendedApproval,
        '- Recommended for revision: ' + hints.summary.recommendedRevision,
        '- Recommended for rejection: ' + hints.summary.recommendedRejection,
        '- Fact-check required: ' + hints.summary.requiringFactCheck,
        '- Requiring manual authoring: ' + hints.summary.requiresManualAuthoring,
        '- Requiring manual rewrite: ' + hints.summary.manualRewriteRequired,
        '- Potentially revealing by numeric-token scan: ' + hints.summary.potentiallyRevealing,
        '- Near-duplicate pairs: ' + hints.summary.nearDuplicatePairs,
        '- Answers still requiring fact-checking: ' + hints.summary.answersRequiringFactCheck,
        '- Approved: ' + hints.summary.approved,
        '',
        'Editorial assessment is a Codex recommendation, not an approval. No hint is approved by this report. To record a human approval, first verify the answer and add one or more reliable URLs to factCheckSources, set factCheckStatus to verified, rewrite gameplayHint.range, gameplayHint.accuracy, and gameplayHint.note as needed, set leakageReview to clear, add approvalNote and optional reviewerNotes, set reviewerDecision and status to approved, and set approved to true. Reject with reviewerDecision/status rejected and approved false. Pending, proposed, needs_revision, needs_fact_check, rejected, stale, or incomplete records are not imported. Do not use sourceHint as a gameplay hint.',
        '',
        '| ID | Original question | Original answer and unit | Current proposed hint | Review status | Recommendation | Fact check | Human decision | Review rationale | Editorial assessment |',
        '|---|---|---|---|---|---|---|---|---|---|',
        table,
        '',
    ].join('\n');
}
export async function writeQuestionBankReviewArtifacts(audit) {
    const { review, hints: generatedHints } = await buildQuestionBankReview(audit);
    let previous = null;
    try {
        const value = JSON.parse(await readFile(HINTS_JSON, 'utf8'));
        if (value && typeof value === 'object' && Array.isArray(value.records))
            previous = value;
    }
    catch { /* First generation starts with every hint unapproved. */ }
    const hints = preserveHintReviewDecisions(generatedHints, previous);
    hints.summary.proposed = hints.records.filter((record) => record.status === 'proposed').length;
    hints.summary.requiresManualAuthoring = hints.records.filter((record) => record.status === 'requires_manual_authoring').length;
    const importableApprovals = collectApprovedGameplayHints(hints, audit.normalizedRecords).approved;
    hints.summary.requiresManualReview = hints.records.length - importableApprovals.size;
    hints.summary.potentiallyRevealing = hints.records.filter((record) => /[0-9٠-٩۰-۹]/u.test(`${record.suggestion} ${record.gameplayHint.range ?? ''} ${record.gameplayHint.accuracy ?? ''} ${record.gameplayHint.note ?? ''}`)).length;
    hints.summary.approved = importableApprovals.size;
    hints.summary.recommendedApproval = hints.records.filter((record) => record.reviewRecommendation === 'recommend_approval').length;
    hints.summary.recommendedRevision = hints.records.filter((record) => record.reviewRecommendation === 'needs_revision').length;
    hints.summary.recommendedRejection = hints.records.filter((record) => record.reviewRecommendation === 'reject').length;
    hints.summary.requiringFactCheck = hints.records.filter((record) => record.factCheckStatus === 'needs_fact_check').length;
    hints.summary.manualRewriteRequired = hints.records.filter((record) => record.assessment.manualRewriteRequired).length;
    await Promise.all([mkdir(path.dirname(REVIEW_JSON), { recursive: true }), mkdir(path.dirname(HINTS_JSON), { recursive: true })]);
    await Promise.all([
        writeFile(REVIEW_JSON, `${JSON.stringify(review, null, 2)}\n`, 'utf8'),
        writeFile(REVIEW_MARKDOWN, renderReviewMarkdown(review), 'utf8'),
        writeFile(HINTS_JSON, `${JSON.stringify(hints, null, 2)}\n`, 'utf8'),
        writeFile(HINTS_MARKDOWN, renderHintMarkdown(hints), 'utf8'),
    ]);
    return { review, hints };
}
/** Keep all reviewer-authored draft and decision fields when the source fingerprint is unchanged. */
export function preserveHintReviewDecisions(generated, previous) {
    const oldById = new Map((previous?.records ?? []).map((entry) => [entry.id, entry]));
    return {
        ...generated,
        records: generated.records.map((entry) => {
            const old = oldById.get(entry.id);
            if (!old || old.sourceFingerprint !== entry.sourceFingerprint)
                return entry;
            return {
                ...entry,
                reviewRecommendation: old.reviewRecommendation,
                reviewRationale: old.reviewRationale,
                assessment: old.assessment,
                suggestion: old.suggestion,
                rationale: old.rationale,
                status: old.status,
                reviewerDecision: old.reviewerDecision ?? 'pending',
                reviewerNotes: old.reviewerNotes ?? null,
                factCheckStatus: old.factCheckStatus ?? 'needs_fact_check',
                factCheckSources: old.factCheckSources ?? [],
                factCheckNote: old.factCheckNote ?? entry.factCheckNote,
                approved: old.approved,
                gameplayHint: old.gameplayHint,
                approvalNote: old.approvalNote,
                leakageReview: old.leakageReview ?? null,
            };
        }),
    };
}
function containsExactNumericAnswer(text, answer) {
    const normalized = text.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (digit) => {
        const code = digit.codePointAt(0);
        return String(code - (code >= 0x06f0 ? 0x06f0 : 0x0660));
    });
    const digits = String(answer);
    return new RegExp(`(^|[^0-9])${digits}(?=$|[^0-9])`).test(normalized);
}
export function collectApprovedGameplayHints(artifact, records) {
    const normalized = new Map(records.map((record) => [record.id, record]));
    const approved = new Map();
    const rejected = [];
    const groups = new Map();
    for (const entry of artifact.records) {
        groups.set(entry.id, [...(groups.get(entry.id) ?? []), entry]);
    }
    for (const [id, entries] of groups) {
        if (entries.length > 1) {
            rejected.push({ id, reason: 'duplicate-hint-review-id' });
            continue;
        }
        const entry = entries[0];
        if (entry.status !== 'approved' || entry.reviewerDecision !== 'approved' || entry.approved !== true) {
            if (entry.status === 'approved' || entry.reviewerDecision === 'approved' || entry.approved)
                rejected.push({ id, reason: 'approval-status-fields-are-inconsistent' });
            continue;
        }
        const source = normalized.get(entry.id);
        if (!source) {
            rejected.push({ id: entry.id, reason: 'question-not-in-valid-normalized-source' });
            continue;
        }
        if (entry.sourceFingerprint !== source.sourceFingerprint || entry.promptAr !== source.promptAr || entry.answer !== source.answer || entry.category !== source.category || entry.type !== source.type || entry.sourceFile !== source.sourceFile || entry.sourceRecordIndex !== source.sourceRecordIndex) {
            rejected.push({ id: entry.id, reason: 'approved-hint-source-snapshot-mismatch' });
            continue;
        }
        const { range, accuracy, note } = entry.gameplayHint;
        if (entry.factCheckStatus !== 'verified' || !entry.factCheckSources.some((source) => /^https:\/\//i.test(source)) || !entry.factCheckNote?.trim()) {
            rejected.push({ id: entry.id, reason: 'approved-question-missing-fact-check-status-source-or-note' });
            continue;
        }
        if (entry.leakageReview !== 'clear' || ![range, accuracy, note, entry.approvalNote].every((value) => typeof value === 'string' && value.trim().length > 0)) {
            rejected.push({ id: entry.id, reason: 'approved-hint-missing-gameplay-fields-approval-note-or-leakage-review' });
            continue;
        }
        if (range.length > 120 || accuracy.length > 120 || note.length > 240) {
            rejected.push({ id: entry.id, reason: 'approved-hint-exceeds-database-field-length' });
            continue;
        }
        if ([range, accuracy, note].some((value) => containsExactNumericAnswer(value, entry.answer))) {
            rejected.push({ id: entry.id, reason: 'approved-hint-contains-exact-numeric-answer' });
            continue;
        }
        approved.set(entry.id, { range: range, accuracy: accuracy, note: note, approvalNote: entry.approvalNote });
    }
    return { approved, rejected };
}
export async function readHintReviewArtifact(filePath = HINTS_JSON) {
    const value = JSON.parse(await readFile(filePath, 'utf8'));
    if (!value || typeof value !== 'object')
        throw new Error('Hint review artifact must be a supported JSON object.');
    const rawArtifact = value;
    const schemaVersion = rawArtifact.schemaVersion;
    if ((schemaVersion !== 1 && schemaVersion !== 2) || !Array.isArray(rawArtifact.records)) {
        throw new Error('Hint review artifact must use schema version 1 or 2 and contain a records array.');
    }
    for (const [index, rawRow] of rawArtifact.records.entries()) {
        const row = rawRow;
        if (!row || typeof row !== 'object' || typeof row.id !== 'string' || typeof row.status !== 'string' || typeof row.approved !== 'boolean'
            || !row.gameplayHint || typeof row.gameplayHint !== 'object' || typeof row.promptAr !== 'string' || typeof row.answer !== 'number'
            || typeof row.sourceFile !== 'string' || typeof row.sourceRecordIndex !== 'number' || !/^[a-f0-9]{64}$/.test(String(row.sourceFingerprint))
            || !['proposed', 'needs_revision', 'needs_fact_check', 'approved', 'rejected', 'requires_manual_authoring'].includes(row.status)
            || !['pending', 'approved', 'rejected'].includes(row.reviewerDecision)
            || !['recommend_approval', 'needs_revision', 'reject'].includes(row.reviewRecommendation)
            || !['needs_fact_check', 'verified', 'disputed'].includes(row.factCheckStatus)
            || !Array.isArray(row.factCheckSources) || !row.factCheckSources.every((source) => typeof source === 'string')
            || (row.reviewerNotes !== null && typeof row.reviewerNotes !== 'string')
            || (row.factCheckNote !== null && typeof row.factCheckNote !== 'string')
            || typeof row.reviewRationale !== 'string' || !row.assessment || typeof row.assessment !== 'object'
            || ![row.assessment.directAnswerReveal, row.assessment.exactAnswerIncluded, row.assessment.numericEquivalentClue, row.assessment.manualRewriteRequired].every((value) => typeof value === 'boolean')
            || (row.leakageReview !== null && row.leakageReview !== 'clear' && row.leakageReview !== 'revise')) {
            throw new Error(`Hint review artifact record ${index} has an invalid structure.`);
        }
    }
    return { ...rawArtifact, schemaVersion: 2 };
}
