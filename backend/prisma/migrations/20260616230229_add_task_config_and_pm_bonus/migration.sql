-- AlterEnum
ALTER TYPE "ScoreType" ADD VALUE 'PM_BONUS';

-- CreateTable
CREATE TABLE "task_configs" (
    "id" TEXT NOT NULL,
    "pmBonusRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_configs_pkey" PRIMARY KEY ("id")
);
