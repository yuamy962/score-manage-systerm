#!/bin/bash
PGPASSWORD=QH_bss_0971 psql -d scoremanage -U scoreuser -h localhost << EOF
CREATE TYPE "IssueCategory" AS ENUM ('CONSULTATION', 'BUG', 'DATA_QUERY', 'TEST_SUPPORT', 'OTHER');
ALTER TABLE "issues" ALTER COLUMN "category" TYPE "IssueCategory" USING "category"::"IssueCategory";
EOF
