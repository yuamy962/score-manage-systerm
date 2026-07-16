-- Create IssueScoreStatus enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IssueScoreStatus') THEN
        CREATE TYPE "IssueScoreStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END $$;

-- Create issue_scores table if not exists
CREATE TABLE IF NOT EXISTS "issue_scores" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "requestedScore" DOUBLE PRECISION NOT NULL,
    "approvedScore" DOUBLE PRECISION,
    "reviewerId" TEXT,
    "status" "IssueScoreStatus" NOT NULL DEFAULT 'PENDING',
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "issue_scores_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "issue_scores_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "issues"("id") ON DELETE CASCADE,
    CONSTRAINT "issue_scores_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL,
    CONSTRAINT "issue_scores_issueId_key" UNIQUE ("issueId")
);

-- Create index if not exists
CREATE INDEX IF NOT EXISTS "issue_scores_reviewerId_idx" ON "issue_scores"("reviewerId");
