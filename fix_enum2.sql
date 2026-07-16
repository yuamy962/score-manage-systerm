ALTER TABLE performance_reviews ALTER COLUMN status DROP DEFAULT;
ALTER TABLE performance_reviews ALTER COLUMN status TYPE "ReviewStatus" USING status::"ReviewStatus";
ALTER TABLE performance_reviews ALTER COLUMN status SET DEFAULT 'DRAFT';
