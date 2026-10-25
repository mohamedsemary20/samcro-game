ALTER TABLE "Question"
  ADD COLUMN "sourceFile" VARCHAR(240),
  ADD COLUMN "sourceRecordIndex" INTEGER,
  ADD COLUMN "metadata" JSONB;

CREATE INDEX "Question_sourceFile_sourceRecordIndex_idx"
  ON "Question"("sourceFile", "sourceRecordIndex");
