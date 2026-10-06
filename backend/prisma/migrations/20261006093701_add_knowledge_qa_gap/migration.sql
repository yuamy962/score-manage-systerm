/*
  Warnings:

  - You are about to drop the column `stdManDays` on the `tasks` table. All the data in the column will be lost.
  - Added the required column `estimatedDays` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('REQUIREMENT_DEV', 'OPS_SUPPORT');

-- CreateEnum
CREATE TYPE "TaskAction" AS ENUM ('SELF_DEV', 'NON_SELF_DEV');

-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('PROJECT', 'REQUIREMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "BadgeType" AS ENUM ('MONTHLY_STAR', 'CONSECUTIVE_A_GRADE', 'TASK_HARVESTER', 'ZERO_REJECTION', 'KNOWLEDGE_CONTRIBUTOR', 'MILESTONE_100', 'MILESTONE_500', 'MILESTONE_1000', 'CONSECUTIVE_BP');

-- CreateEnum
CREATE TYPE "KnowledgeGapStatus" AS ENUM ('PENDING', 'PROCESSING', 'RESOLVED', 'CONVERTED');

-- AlterEnum
ALTER TYPE "ScoreSourceType" ADD VALUE 'OTHER';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskStatus" ADD VALUE 'POOL';
ALTER TYPE "TaskStatus" ADD VALUE 'CLAIMED';

-- DropForeignKey
ALTER TABLE "issue_scores" DROP CONSTRAINT "issue_scores_issueId_fkey";

-- DropForeignKey
ALTER TABLE "issue_scores" DROP CONSTRAINT "issue_scores_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "issues" DROP CONSTRAINT "issues_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "issues" DROP CONSTRAINT "issues_systemModuleId_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_systemModuleId_fkey";

-- DropIndex
DROP INDEX "issue_scores_reviewerId_idx";

-- DropIndex
DROP INDEX "issues_createdBy_idx";

-- DropIndex
DROP INDEX "knowledge_creatorId_idx";

-- DropIndex
DROP INDEX "knowledge_moduleId_idx";

-- DropIndex
DROP INDEX "knowledge_status_idx";

-- DropIndex
DROP INDEX "knowledge_attachments_knowledgeId_idx";

-- DropIndex
DROP INDEX "knowledge_versions_knowledgeId_idx";

-- AlterTable
ALTER TABLE "task_configs" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "stdManDays",
ADD COLUMN     "actualStartAt" TIMESTAMP(3),
ADD COLUMN     "claimRatio" DOUBLE PRECISION,
ADD COLUMN     "claimedBy" TEXT,
ADD COLUMN     "estimatedDays" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "finalDays" DOUBLE PRECISION,
ADD COLUMN     "isPoolTask" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scoreRatio" DOUBLE PRECISION NOT NULL DEFAULT 1.00,
ADD COLUMN     "taskAction" "TaskAction" NOT NULL DEFAULT 'SELF_DEV',
ADD COLUMN     "taskSource" "TaskSource" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "taskType" "TaskType" NOT NULL DEFAULT 'REQUIREMENT_DEV';

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BadgeType" NOT NULL,
    "reason" TEXT NOT NULL,
    "month" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_question_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "matchedKnowledgeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'performance_system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_question_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_gaps" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "systemModuleId" TEXT,
    "moduleId" TEXT,
    "submitterId" TEXT NOT NULL,
    "handlerId" TEXT,
    "status" "KnowledgeGapStatus" NOT NULL DEFAULT 'PENDING',
    "handleNote" TEXT,
    "knowledgeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "knowledge_gaps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "badges_userId_type_month_key" ON "badges"("userId", "type", "month");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_claimedBy_fkey" FOREIGN KEY ("claimedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_systemModuleId_fkey" FOREIGN KEY ("systemModuleId") REFERENCES "system_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_scores" ADD CONSTRAINT "issue_scores_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_scores" ADD CONSTRAINT "issue_scores_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_systemModuleId_fkey" FOREIGN KEY ("systemModuleId") REFERENCES "system_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_question_logs" ADD CONSTRAINT "knowledge_question_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_gaps" ADD CONSTRAINT "knowledge_gaps_systemModuleId_fkey" FOREIGN KEY ("systemModuleId") REFERENCES "system_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_gaps" ADD CONSTRAINT "knowledge_gaps_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "knowledge_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_gaps" ADD CONSTRAINT "knowledge_gaps_submitterId_fkey" FOREIGN KEY ("submitterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_gaps" ADD CONSTRAINT "knowledge_gaps_handlerId_fkey" FOREIGN KEY ("handlerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_gaps" ADD CONSTRAINT "knowledge_gaps_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "knowledge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
