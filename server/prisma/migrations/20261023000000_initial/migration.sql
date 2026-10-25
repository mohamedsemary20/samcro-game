CREATE TYPE "RoomStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED');
CREATE TYPE "MatchStatus" AS ENUM ('ACTIVE', 'FINISHED', 'ABANDONED');
CREATE TYPE "LoanStatus" AS ENUM ('OPEN', 'REPAID');

CREATE TABLE "Player" (
  "id" TEXT NOT NULL,
  "displayName" VARCHAR(40) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlayerSession" (
  "id" TEXT NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "playerId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "PlayerSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Room" (
  "id" TEXT NOT NULL,
  "code" VARCHAR(12) NOT NULL,
  "createRequestKey" VARCHAR(36) NOT NULL,
  "hostPlayerId" TEXT NOT NULL,
  "status" "RoomStatus" NOT NULL DEFAULT 'WAITING',
  "capacity" INTEGER NOT NULL DEFAULT 7,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RoomMember" (
  "roomId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "isReady" BOOLEAN NOT NULL DEFAULT false,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "disconnectedAt" TIMESTAMP(3),
  "leftAt" TIMESTAMP(3),
  CONSTRAINT "RoomMember_pkey" PRIMARY KEY ("roomId", "playerId")
);
CREATE TABLE "GameMatch" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "status" "MatchStatus" NOT NULL DEFAULT 'ACTIVE',
  "roundNumber" INTEGER NOT NULL DEFAULT 0,
  "phase" VARCHAR(32) NOT NULL DEFAULT 'lobby',
  "pot" BIGINT NOT NULL DEFAULT 0,
  "questionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "version" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "GameMatch_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MatchParticipant" (
  "matchId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "chips" BIGINT NOT NULL DEFAULT 500,
  "debt" BIGINT NOT NULL DEFAULT 0,
  "loanTaken" BOOLEAN NOT NULL DEFAULT false,
  "goldenHintUsed" BOOLEAN NOT NULL DEFAULT false,
  "finalRank" INTEGER,
  "netScore" BIGINT,
  CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("matchId", "playerId")
);
CREATE TABLE "Question" (
  "id" TEXT NOT NULL,
  "promptAr" TEXT NOT NULL,
  "answer" BIGINT NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "type" VARCHAR(24) NOT NULL,
  "difficulty" VARCHAR(24),
  "locale" VARCHAR(8) NOT NULL DEFAULT 'ar',
  "source" VARCHAR(240),
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ApprovedQuestionHint" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "range" VARCHAR(120) NOT NULL,
  "accuracy" VARCHAR(120) NOT NULL,
  "note" VARCHAR(240) NOT NULL,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "approvedAt" TIMESTAMP(3),
  "source" VARCHAR(240),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApprovedQuestionHint_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "GameRound" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "phase" VARCHAR(32) NOT NULL DEFAULT 'question-betting',
  "questionId" TEXT NOT NULL,
  "pot" BIGINT NOT NULL DEFAULT 0,
  "currentBet" BIGINT NOT NULL DEFAULT 0,
  "actorPlayerId" TEXT,
  "deadlineAt" TIMESTAMP(3),
  "rolloverPot" BIGINT NOT NULL DEFAULT 0,
  "engineState" JSONB,
  "revealedAt" TIMESTAMP(3),
  CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlayerHintRecord" (
  "id" TEXT NOT NULL,
  "roundId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "range" VARCHAR(120) NOT NULL,
  "accuracy" VARCHAR(120) NOT NULL,
  "note" VARCHAR(240) NOT NULL,
  "isGolden" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlayerHintRecord_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PlayerGuessRecord" (
  "id" TEXT NOT NULL,
  "roundId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "value" BIGINT NOT NULL,
  "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revealedAt" TIMESTAMP(3),
  CONSTRAINT "PlayerGuessRecord_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ChipTransaction" (
  "id" TEXT NOT NULL,
  "idempotencyKey" VARCHAR(100) NOT NULL,
  "playerId" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "kind" VARCHAR(32) NOT NULL,
  "roundNumber" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChipTransaction_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LoanRecord" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "amount" BIGINT NOT NULL DEFAULT 200,
  "remaining" BIGINT NOT NULL DEFAULT 200,
  "status" "LoanStatus" NOT NULL DEFAULT 'OPEN',
  "borrowedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "repaidAt" TIMESTAMP(3),
  CONSTRAINT "LoanRecord_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "GameAction" (
  "id" TEXT NOT NULL,
  "idempotencyKey" VARCHAR(100) NOT NULL,
  "matchId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "type" VARCHAR(32) NOT NULL,
  "payload" JSONB NOT NULL,
  "response" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GameAction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerSession_tokenHash_key" ON "PlayerSession"("tokenHash");
CREATE INDEX "PlayerSession_playerId_expiresAt_idx" ON "PlayerSession"("playerId", "expiresAt");
CREATE UNIQUE INDEX "Room_code_key" ON "Room"("code");
CREATE UNIQUE INDEX "Room_createRequestKey_key" ON "Room"("createRequestKey");
CREATE INDEX "Room_status_createdAt_idx" ON "Room"("status", "createdAt");
CREATE INDEX "RoomMember_playerId_idx" ON "RoomMember"("playerId");
CREATE INDEX "GameMatch_roomId_status_idx" ON "GameMatch"("roomId", "status");
CREATE INDEX "MatchParticipant_playerId_matchId_idx" ON "MatchParticipant"("playerId", "matchId");
CREATE UNIQUE INDEX "ApprovedQuestionHint_questionId_key" ON "ApprovedQuestionHint"("questionId");
CREATE UNIQUE INDEX "GameRound_matchId_number_key" ON "GameRound"("matchId", "number");
CREATE INDEX "GameRound_phase_deadlineAt_idx" ON "GameRound"("phase", "deadlineAt");
CREATE UNIQUE INDEX "PlayerHintRecord_roundId_playerId_key" ON "PlayerHintRecord"("roundId", "playerId");
CREATE UNIQUE INDEX "PlayerGuessRecord_roundId_playerId_key" ON "PlayerGuessRecord"("roundId", "playerId");
CREATE UNIQUE INDEX "ChipTransaction_idempotencyKey_key" ON "ChipTransaction"("idempotencyKey");
CREATE INDEX "ChipTransaction_playerId_matchId_createdAt_idx" ON "ChipTransaction"("playerId", "matchId", "createdAt");
CREATE UNIQUE INDEX "LoanRecord_matchId_playerId_key" ON "LoanRecord"("matchId", "playerId");
CREATE UNIQUE INDEX "GameAction_idempotencyKey_key" ON "GameAction"("idempotencyKey");
CREATE INDEX "GameAction_matchId_playerId_createdAt_idx" ON "GameAction"("matchId", "playerId", "createdAt");

ALTER TABLE "PlayerSession" ADD CONSTRAINT "PlayerSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Room" ADD CONSTRAINT "Room_hostPlayerId_fkey" FOREIGN KEY ("hostPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RoomMember" ADD CONSTRAINT "RoomMember_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameMatch" ADD CONSTRAINT "GameMatch_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MatchParticipant" ADD CONSTRAINT "MatchParticipant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovedQuestionHint" ADD CONSTRAINT "ApprovedQuestionHint_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerHintRecord" ADD CONSTRAINT "PlayerHintRecord_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerHintRecord" ADD CONSTRAINT "PlayerHintRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlayerGuessRecord" ADD CONSTRAINT "PlayerGuessRecord_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlayerGuessRecord" ADD CONSTRAINT "PlayerGuessRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChipTransaction" ADD CONSTRAINT "ChipTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChipTransaction" ADD CONSTRAINT "ChipTransaction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoanRecord" ADD CONSTRAINT "LoanRecord_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoanRecord" ADD CONSTRAINT "LoanRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameAction" ADD CONSTRAINT "GameAction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "GameMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameAction" ADD CONSTRAINT "GameAction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameAction" ADD CONSTRAINT "GameAction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PlayerSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
