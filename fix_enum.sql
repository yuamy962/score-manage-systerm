CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'PUBLISHED');
ALTER TABLE performance_reviews ALTER COLUMN status TYPE "ReviewStatus" USING status::"ReviewStatus";
