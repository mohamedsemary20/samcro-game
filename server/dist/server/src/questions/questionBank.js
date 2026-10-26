import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const DEFAULT_SOURCE_DIRECTORY = path.join(repoRoot, 'web', 'questions');
export const DEFAULT_NORMALIZED_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/question-bank.normalized.json');
export const DEFAULT_REPORT_JSON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../reports/question-bank-report.json');
export const DEFAULT_REPORT_MARKDOWN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../reports/question-bank-report.md');
function asNonEmptyString(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function stableJson(value) {
    if (Array.isArray(value))
        return `[${value.map(stableJson).join(',')}]`;
    if (!value || typeof value !== 'object')
        return JSON.stringify(value);
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
}
function fingerprintSourceRecord(sourceFile, collection, recordIndex, row) {
    return createHash('sha256').update(stableJson({ sourceFile, collection, recordIndex, row })).digest('hex');
}
function sourceRef(sourceFile, collection, recordIndex, id, prompt, rawAnswer) {
    return {
        sourceFile,
        collection,
        recordIndex,
        id: asNonEmptyString(id),
        prompt: asNonEmptyString(prompt),
        ...(rawAnswer !== undefined ? { rawAnswer } : {}),
        reason: '',
    };
}
function mapDigits(value) {
    return value.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (digit) => {
        const code = digit.codePointAt(0);
        const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
        return String(code - base);
    });
}
/** Parses only unambiguous numeric formats; punctuation is never stripped blindly. */
export function parseNumericAnswer(input) {
    if (typeof input === 'number') {
        if (!Number.isFinite(input) || input < 0)
            return { ok: false, reason: 'invalid-number' };
        if (!Number.isSafeInteger(input) && Number.isInteger(input))
            return { ok: false, reason: 'unsafe-number' };
        return { ok: true, value: input, kind: Number.isInteger(input) ? 'integer' : 'decimal' };
    }
    if (typeof input !== 'string' || !input.trim())
        return { ok: false, reason: 'missing-answer' };
    const value = mapDigits(input.normalize('NFKC').trim()).replace(/\u2212/g, '-');
    if (!/^[+]?[0-9\u066b\u066c.,'\u2019\s]+$/.test(value))
        return { ok: false, reason: 'invalid-number' };
    const compact = value.replace(/^\+/, '');
    if (/^\s|-/.test(compact) || compact.startsWith('.'))
        return { ok: false, reason: 'invalid-number' };
    const hasArabicDecimal = compact.includes('\u066b');
    const hasArabicThousands = compact.includes('\u066c');
    if (hasArabicDecimal && hasArabicThousands)
        return { ok: false, reason: 'ambiguous-number' };
    let canonical;
    if (hasArabicDecimal) {
        if ((compact.match(/\u066b/g) ?? []).length !== 1 || /[,.'\u2019\s\u066c]/.test(compact))
            return { ok: false, reason: 'ambiguous-number' };
        canonical = compact.replace('\u066b', '.');
    }
    else if (hasArabicThousands) {
        const groups = compact.split('\u066c');
        if (!validThousandsGroups(groups) || /[.,'\u2019\s]/.test(compact))
            return { ok: false, reason: 'invalid-number' };
        canonical = groups.join('');
    }
    else {
        const separators = [...compact.matchAll(/[.,'\u2019\s]/g)].map((match) => match[0]);
        const distinct = [...new Set(separators)];
        if (distinct.length > 1) {
            if (distinct.some((separator) => separator === "'" || separator === '\u2019' || separator === ' '))
                return { ok: false, reason: 'ambiguous-number' };
            const decimalSeparator = compact.lastIndexOf('.') > compact.lastIndexOf(',') ? '.' : ',';
            const decimalAt = compact.lastIndexOf(decimalSeparator);
            const integerPart = compact.slice(0, decimalAt);
            const fraction = compact.slice(decimalAt + 1);
            const groupingSeparator = decimalSeparator === '.' ? ',' : '.';
            const groups = integerPart.split(groupingSeparator);
            if (!fraction || !/^\d+$/.test(fraction) || (groups.length > 1 && !validThousandsGroups(groups)))
                return { ok: false, reason: 'ambiguous-number' };
            canonical = `${groups.join('')}.${fraction}`;
        }
        else if (distinct.length === 1) {
            const separator = distinct[0];
            const groups = compact.split(separator);
            if (groups.length > 2 && validThousandsGroups(groups))
                canonical = groups.join('');
            else if ((separator === "'" || separator === '\u2019' || separator === ' ') && validThousandsGroups(groups))
                canonical = groups.join('');
            else if (groups.length === 2 && groups.every((part) => /^\d+$/.test(part)))
                return { ok: false, reason: 'ambiguous-number' };
            else
                return { ok: false, reason: 'invalid-number' };
        }
        else
            canonical = compact;
    }
    if (!/^\d+(?:\.\d+)?$/.test(canonical))
        return { ok: false, reason: 'invalid-number' };
    const parsed = Number(canonical);
    if (!Number.isFinite(parsed))
        return { ok: false, reason: 'unsafe-number' };
    if (Number.isInteger(parsed) && !Number.isSafeInteger(parsed))
        return { ok: false, reason: 'unsafe-number' };
    return { ok: true, value: parsed, kind: Number.isInteger(parsed) ? 'integer' : 'decimal' };
}
function validThousandsGroups(groups) {
    return groups.length > 1 && /^[0-9]{1,3}$/.test(groups[0]) && groups.slice(1).every((group) => /^[0-9]{3}$/.test(group));
}
function normalizeCandidate(value, sourceFile, collection, recordIndex) {
    const row = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    const issue = sourceRef(sourceFile, collection, recordIndex, row?.id, row?.q, row?.answer);
    const fail = (reason) => ({ issue: { ...issue, reason } });
    if (!row)
        return fail('record-not-object');
    const id = typeof row.id === 'string' && row.id.trim() ? row.id : null;
    if (!id || !/^[A-Za-z0-9_-]{1,64}$/.test(id))
        return fail('missing-or-invalid-stable-id');
    const promptAr = typeof row.q === 'string' && row.q.trim() ? row.q : null;
    if (!promptAr)
        return fail('missing-question-text');
    if (!/[\u0600-\u06ff]/.test(promptAr))
        return fail('question-text-not-arabic');
    const category = typeof row.category === 'string' && row.category.trim() ? row.category : null;
    if (!category || category.length > 80)
        return fail('missing-or-invalid-category');
    if (typeof row.type !== 'string')
        return fail('missing-question-type');
    const originalType = row.type;
    const typeMap = { year: 'year', count: 'number', measure: 'number', money_or_large: 'number' };
    const type = typeMap[originalType];
    if (!type)
        return fail(`unsupported-question-type:${originalType}`);
    const numericAnswer = parseNumericAnswer(row.answer);
    if (!numericAnswer.ok)
        return fail(`answer-${numericAnswer.reason}`);
    if (numericAnswer.kind !== 'integer' || !Number.isSafeInteger(numericAnswer.value))
        return fail('decimal-answer-unsupported-by-bigint-scoring');
    const optionalText = (field) => {
        const value = row[field];
        if (value === undefined || value === null)
            return null;
        return typeof value === 'string' ? value : undefined;
    };
    const difficulty = optionalText('difficulty');
    if (difficulty === undefined || (difficulty !== null && (!difficulty.trim() || difficulty.length > 24)))
        return fail('invalid-difficulty');
    const unit = optionalText('unit');
    const topic = optionalText('topic');
    const sourceHint = optionalText('source_hint');
    if (unit === undefined || topic === undefined || sourceHint === undefined)
        return fail('invalid-string-metadata');
    if (sourceHint && sourceHint.length > 240)
        return fail('invalid-source-hint-metadata');
    const confidence = row.confidence === undefined || row.confidence === null ? null : row.confidence;
    if (confidence !== null && (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 100))
        return fail('invalid-confidence-metadata');
    return {
        record: {
            id,
            promptAr,
            answer: numericAnswer.value,
            category,
            type,
            difficulty,
            source: sourceHint,
            sourceFile,
            sourceRecordIndex: recordIndex,
            sourceFingerprint: fingerprintSourceRecord(sourceFile, collection, recordIndex, row),
            metadata: { sourceCollection: collection, originalType, unit, topic, confidence: confidence, sourceHint },
            approvedHint: null,
            playable: false,
        },
    };
}
function extractCollections(parsed) {
    if (Array.isArray(parsed))
        return [{ name: 'records', records: parsed }];
    if (!parsed || typeof parsed !== 'object')
        return null;
    const root = parsed;
    const collections = [];
    for (const name of ['questions', 'clean', 'removed'])
        if (Array.isArray(root[name]))
            collections.push({ name, records: root[name] });
    return collections.length ? collections : null;
}
async function listJsonFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const paths = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(directory, entry.name);
        return entry.isDirectory() ? listJsonFiles(fullPath) : entry.isFile() && entry.name.toLowerCase().endsWith('.json') ? [fullPath] : [];
    }));
    return paths.flat().sort((a, b) => a.localeCompare(b));
}
function normalizePrompt(prompt) {
    return prompt.normalize('NFKC').toLowerCase()
        .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
        .replace(/[\u061f?!.,\u060c:;\u061b()\[\]{}"'`\u00ab\u00bb]/g, ' ')
        .replace(/\s+/g, ' ').trim();
}
function editDistance(left, right) {
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
    for (let i = 1; i <= left.length; i += 1) {
        let diagonal = previous[0];
        previous[0] = i;
        for (let j = 1; j <= right.length; j += 1) {
            const old = previous[j];
            previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (left[i - 1] === right[j - 1] ? 0 : 1));
            diagonal = old;
        }
    }
    return previous[right.length];
}
export async function inspectQuestionBank(sourceDirectory = DEFAULT_SOURCE_DIRECTORY) {
    const sourceFiles = await listJsonFiles(sourceDirectory);
    const relative = (fullPath) => path.relative(repoRoot, fullPath).split(path.sep).join('/');
    const invalidJsonFiles = [];
    const candidates = [];
    const rejectedRecords = [];
    const excludedRecords = [];
    const sourceRecords = [];
    const prompts = new Map();
    const categories = {};
    const sourceTypes = {};
    const difficulties = {};
    const sourceFieldTypes = new Map();
    const answerFormats = {};
    let totalSourceRecords = 0;
    let candidateRecords = 0;
    for (const fullPath of sourceFiles) {
        const sourceFile = relative(fullPath);
        let parsed;
        try {
            parsed = JSON.parse(await readFile(fullPath, 'utf8'));
        }
        catch (error) {
            invalidJsonFiles.push({ sourceFile, error: error instanceof Error ? error.message : 'Invalid JSON.' });
            continue;
        }
        const collections = extractCollections(parsed);
        if (!collections) {
            invalidJsonFiles.push({ sourceFile, error: 'JSON root must be an array or contain a questions, clean, or removed array.' });
            continue;
        }
        for (const { name, records } of collections) {
            totalSourceRecords += records.length;
            for (const [recordIndex, raw] of records.entries()) {
                const rawRecord = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null;
                const issue = sourceRef(sourceFile, name, recordIndex, rawRecord?.id, rawRecord?.q, rawRecord?.answer);
                sourceRecords.push(issue);
                prompts.set(`${sourceFile}:${name}:${recordIndex}`, asNonEmptyString(rawRecord?.q) ?? '');
                if (rawRecord)
                    for (const [field, value] of Object.entries(rawRecord)) {
                        const type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
                        sourceFieldTypes.set(field, (sourceFieldTypes.get(field) ?? new Set()).add(type));
                    }
                const answerFormat = rawRecord?.answer === undefined ? 'missing'
                    : rawRecord.answer === null ? 'null'
                        : typeof rawRecord.answer === 'number' ? Number.isInteger(rawRecord.answer) ? 'number-integer' : 'number-decimal'
                            : Array.isArray(rawRecord.answer) ? 'array'
                                : typeof rawRecord.answer;
                answerFormats[answerFormat] = (answerFormats[answerFormat] ?? 0) + 1;
                if (name === 'removed') {
                    const reason = asNonEmptyString(rawRecord?.reason) ?? 'source-excluded-without-reason';
                    excludedRecords.push({ ...issue, reason });
                    continue;
                }
                candidateRecords += 1;
                const sourceRow = rawRecord;
                const sourceCategory = asNonEmptyString(sourceRow?.category);
                const sourceType = asNonEmptyString(sourceRow?.type);
                const sourceDifficulty = asNonEmptyString(sourceRow?.difficulty);
                if (sourceCategory)
                    categories[sourceCategory] = (categories[sourceCategory] ?? 0) + 1;
                if (sourceType)
                    sourceTypes[sourceType] = (sourceTypes[sourceType] ?? 0) + 1;
                if (sourceDifficulty)
                    difficulties[sourceDifficulty] = (difficulties[sourceDifficulty] ?? 0) + 1;
                const normalized = normalizeCandidate(raw, sourceFile, name, recordIndex);
                if (normalized.issue) {
                    rejectedRecords.push(normalized.issue);
                    continue;
                }
                const record = normalized.record;
                candidates.push(record);
            }
        }
    }
    if (sourceFiles.length === 0)
        invalidJsonFiles.push({ sourceFile: path.relative(repoRoot, sourceDirectory).split(path.sep).join('/'), error: 'No JSON source files were found.' });
    const idGroups = new Map();
    for (const record of sourceRecords)
        if (record.id)
            idGroups.set(record.id, [...(idGroups.get(record.id) ?? []), record]);
    const duplicateIds = [...idGroups].filter(([, group]) => group.length > 1).map(([id, records]) => ({ id, records }));
    const candidateIdGroups = new Map();
    for (const record of sourceRecords)
        if (record.id && record.collection !== 'removed')
            candidateIdGroups.set(record.id, [...(candidateIdGroups.get(record.id) ?? []), record]);
    const importIdConflicts = new Set([...candidateIdGroups].filter(([, group]) => group.length > 1).map(([id]) => id));
    for (const duplicateId of importIdConflicts)
        for (const record of candidateIdGroups.get(duplicateId) ?? []) {
            const normalized = candidates.find((candidate) => candidate.id === duplicateId && candidate.sourceFile === record.sourceFile && candidate.sourceRecordIndex === record.recordIndex);
            if (!normalized)
                continue;
            candidates.splice(candidates.indexOf(normalized), 1);
            rejectedRecords.push({ ...record, reason: `duplicate-stable-id:${duplicateId}` });
        }
    const duplicateRecords = sourceRecords.filter((record) => record.prompt);
    const exactGroups = new Map();
    for (const record of duplicateRecords) {
        const key = normalizePrompt(prompts.get(`${record.sourceFile}:${record.collection}:${record.recordIndex}`) ?? '');
        exactGroups.set(key, [...(exactGroups.get(key) ?? []), record]);
    }
    const exactDuplicateQuestions = [...exactGroups].filter(([key, group]) => key && group.length > 1).map(([normalizedPrompt, records]) => ({ normalizedPrompt, records }));
    const nearDuplicateQuestions = [];
    for (let i = 0; i < duplicateRecords.length; i += 1) {
        const left = duplicateRecords[i];
        const leftText = normalizePrompt(prompts.get(`${left.sourceFile}:${left.collection}:${left.recordIndex}`) ?? '');
        for (let j = i + 1; j < duplicateRecords.length; j += 1) {
            const right = duplicateRecords[j];
            const rightText = normalizePrompt(prompts.get(`${right.sourceFile}:${right.collection}:${right.recordIndex}`) ?? '');
            if (leftText === rightText || Math.min(leftText.length, rightText.length) < 25)
                continue;
            const distance = editDistance(leftText, rightText);
            if (distance <= 3)
                nearDuplicateQuestions.push({ similarity: 1 - distance / Math.max(leftText.length, rightText.length), records: [left, right] });
        }
    }
    const valid = invalidJsonFiles.length === 0 && importIdConflicts.size === 0;
    return {
        generatedAt: new Date().toISOString(),
        sourceDirectory: path.relative(repoRoot, sourceDirectory).split(path.sep).join('/'),
        sourceFiles: sourceFiles.map(relative),
        totalSourceRecords,
        candidateRecords,
        sourceExcludedRecords: excludedRecords.length,
        normalizedRecords: candidates,
        rejectedRecords,
        excludedRecords,
        duplicateIds,
        exactDuplicateQuestions,
        nearDuplicateQuestions,
        categories: Object.fromEntries(Object.entries(categories).filter(([, count]) => count > 0).sort(([a], [b]) => a.localeCompare(b))),
        sourceTypes: Object.fromEntries(Object.entries(sourceTypes).filter(([, count]) => count > 0).sort(([a], [b]) => a.localeCompare(b))),
        difficulties: Object.fromEntries(Object.entries(difficulties).filter(([, count]) => count > 0).sort(([a], [b]) => a.localeCompare(b))),
        sourceFieldTypes: Object.fromEntries([...sourceFieldTypes].sort(([a], [b]) => a.localeCompare(b)).map(([field, types]) => [field, [...types].sort()])),
        answerFormats: Object.fromEntries(Object.entries(answerFormats).sort(([a], [b]) => a.localeCompare(b))),
        missingHintCount: candidateRecords,
        playableCount: 0,
        invalidJsonFiles,
        valid,
    };
}
export function withDatabaseImport(audit, counts, error) {
    return { ...audit, databaseImport: counts ? { ...counts } : null, ...(error ? { databaseImportError: error } : {}) };
}
export function renderQuestionBankReport(audit, databaseImport = null, importError) {
    const report = withDatabaseImport(audit, databaseImport, importError);
    const categoryLines = Object.entries(audit.categories).map(([category, count]) => `- ${category}: ${count}`).join('\n') || '- None';
    const typeLines = Object.entries(audit.sourceTypes).map(([type, count]) => `- ${type}: ${count}`).join('\n') || '- None';
    const fieldLines = Object.entries(audit.sourceFieldTypes).map(([field, types]) => `- \`${field}\`: ${types.join(', ')}`).join('\n') || '- None';
    const answerFormatLines = Object.entries(audit.answerFormats).map(([format, count]) => `- ${format}: ${count}`).join('\n') || '- None';
    const nearLines = audit.nearDuplicateQuestions.map(({ similarity, records }) => `- ${records.map((record) => `${record.id ?? '(no id)'} @ ${record.sourceFile}#${record.collection}[${record.recordIndex}]`).join(' ↔ ')} (${(similarity * 100).toFixed(1)}% textual similarity; manual review only)`).join('\n') || '- None';
    const rejectionLines = audit.rejectedRecords.map((record) => `- ${record.id ?? '(no id)'} @ ${record.sourceFile}#${record.collection}[${record.recordIndex}]: ${record.reason}${record.rawAnswer !== undefined ? ` (answer=${JSON.stringify(record.rawAnswer)})` : ''}`).join('\n') || '- None';
    const excludedLines = audit.excludedRecords.reduce((counts, record) => ({ ...counts, [record.reason]: (counts[record.reason] ?? 0) + 1 }), {});
    const importText = databaseImport ? `Inserted: ${databaseImport.inserted}; updated: ${databaseImport.updated}; skipped: ${databaseImport.skipped}; rejected: ${databaseImport.rejected}.` : importError ? `Not imported: ${importError}` : 'Not run.';
    return `# Samkaro question bank audit\n\nGenerated: ${report.generatedAt}\n\n## Source\n\n- Directory: \`${audit.sourceDirectory}\`\n- Files: ${audit.sourceFiles.length ? audit.sourceFiles.map((file) => `\`${file}\``).join(', ') : 'none'}\n- Total source records: ${audit.totalSourceRecords}\n- Candidate records: ${audit.candidateRecords}\n- Excluded by source bank: ${audit.sourceExcludedRecords}\n\n## Source schema\n\n${fieldLines}\n\n## Answer formats\n\n${answerFormatLines}\n\n## Normalization and eligibility\n\n- Valid normalized records: ${audit.normalizedRecords.length}\n- Rejected candidate records: ${audit.rejectedRecords.length}\n- Missing approved game hints: ${audit.missingHintCount}\n- Playable records: ${audit.playableCount}\n- Database import: ${importText}\n- Invalid JSON/root errors: ${audit.invalidJsonFiles.length}\n- Duplicate IDs: ${audit.duplicateIds.length}\n- Exact duplicate prompts: ${audit.exactDuplicateQuestions.length}\n- Near-duplicate review candidates: ${audit.nearDuplicateQuestions.length}\n\n## Categories\n\n${categoryLines}\n\n## Original types\n\n${typeLines}\n\n## Rejected candidates\n\n${rejectionLines}\n\n## Source-excluded records\n\n${Object.entries(excludedLines).map(([reason, count]) => `- ${reason}: ${count}`).join('\n') || '- None'}\n\n## Near-duplicate candidates\n\n${nearLines}\n\n## Policy\n\n- Stable IDs are preserved. Duplicate IDs are rejected as conflicts; records are never silently merged.\n- Exact prompt duplicates are reported, not deleted. Similarity candidates are editorial review hints, not automatic duplicates.\n- Only integer, non-negative, JavaScript-safe answers map to the existing PostgreSQL \`BigInt\` and scoring rules. Decimal answers are rejected until the game model supports them.\n- Source types \`year\` map to \`year\`; \`count\`, \`measure\`, and \`money_or_large\` map to \`number\`, while the original type and metadata are preserved.\n- \`source_hint\` is preserved as a source note; generated gameplay suggestions remain unapproved drafts and never inherit that source note as a game hint.\n- Only records with complete, source-matched editorial and fact-check approval are enabled for gameplay. Pending, rejected, stale, and incomplete records remain unplayable.\n- Answer correctness has not been independently fact-checked.\n`;
}
export async function writeQuestionBankArtifacts(audit, databaseImport = null, error) {
    await Promise.all([mkdir(path.dirname(DEFAULT_NORMALIZED_FILE), { recursive: true }), mkdir(path.dirname(DEFAULT_REPORT_JSON), { recursive: true })]);
    const report = withDatabaseImport(audit, databaseImport, error);
    await Promise.all([
        writeFile(DEFAULT_NORMALIZED_FILE, `${JSON.stringify({ schemaVersion: 1, sourceFiles: audit.sourceFiles, records: audit.normalizedRecords }, null, 2)}\n`, 'utf8'),
        writeFile(DEFAULT_REPORT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
        writeFile(DEFAULT_REPORT_MARKDOWN, renderQuestionBankReport(audit, databaseImport, error), 'utf8'),
    ]);
}
