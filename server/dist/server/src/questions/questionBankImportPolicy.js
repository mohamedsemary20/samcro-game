function stableJson(value) {
    if (Array.isArray(value))
        return `[${value.map(stableJson).join(',')}]`;
    if (!value || typeof value !== 'object')
        return JSON.stringify(value) ?? 'undefined';
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
}
function differs(existing, record) {
    return existing.promptAr !== record.promptAr
        || existing.answer !== BigInt(record.answer)
        || existing.category !== record.category
        || existing.type !== record.type
        || existing.difficulty !== record.difficulty
        || existing.source !== record.source
        || existing.sourceFile !== record.sourceFile
        || existing.sourceRecordIndex !== record.sourceRecordIndex
        || stableJson(existing.metadata) !== stableJson(record.metadata);
}
export function planQuestionImport(records, existingQuestions) {
    const existingById = new Map(existingQuestions.map((question) => [question.id, question]));
    return records.map((record) => {
        const existing = existingById.get(record.id);
        if (!existing)
            return { kind: 'insert', record };
        if (existing.sourceFile !== record.sourceFile)
            return { kind: 'conflict', record, reason: 'stable-id-owned-by-another-source' };
        if (!differs(existing, record))
            return { kind: 'skip', record };
        const revokeHintApproval = existing.promptAr !== record.promptAr
            || existing.answer !== BigInt(record.answer)
            || existing.type !== record.type;
        return { kind: 'update', record, revokeHintApproval };
    });
}
