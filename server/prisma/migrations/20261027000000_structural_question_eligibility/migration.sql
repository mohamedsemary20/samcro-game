-- Eligibility uses the active flag and structurally usable database fields.
-- Legacy per-question hint/review rows are intentionally retained unchanged.
UPDATE "Question"
SET "enabled" = TRUE
WHERE "sourceFile" = 'web/questions/trivia_clean.json'
  AND btrim("promptAr") <> ''
  AND "promptAr" ~ '[ء-ي]'
  AND btrim("category") <> ''
  AND "type" IN ('year', 'number')
  AND "answer" >= 0
  AND "answer" <= 9007199254740991;

CREATE INDEX "Question_enabled_type_idx" ON "Question"("enabled", "type");
