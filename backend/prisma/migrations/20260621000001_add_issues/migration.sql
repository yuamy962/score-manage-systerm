-- Create IssueCategory enum
CREATE TYPE "IssueCategory" AS ENUM (
    'CONSULTATION',
    'BUG',
    'DATA_QUERY',
    'TEST_SUPPORT',
    'OTHER'
);

-- Create Issue table
CREATE TABLE "issues" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "systemModuleId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "hoursSpent" DOUBLE PRECISION NOT NULL,
    "category" "IssueCategory" NOT NULL,
    "remark" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "issues_systemModuleId_fkey" FOREIGN KEY ("systemModuleId") REFERENCES "system_modules"("id") ON DELETE SET NULL,
    CONSTRAINT "issues_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create index for createdBy
CREATE INDEX "issues_createdBy_idx" ON "issues"("createdBy");
