-- 知识中心 V1：基础数据表 + 知识主表 + 知识版本 + 附件

-- 1. 枚举类型
CREATE TYPE "KnowledgeType" AS ENUM ('BASIC', 'OPERATION', 'PROBLEM');
CREATE TYPE "KnowledgeStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'OFFLINE');
CREATE TYPE "KnowledgePermission" AS ENUM ('NORMAL', 'RESTRICTED');

-- 2. 知识模块（系统下的二级模块）
CREATE TABLE "knowledge_modules" (
    "id" TEXT NOT NULL,
    "systemModuleId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_modules_pkey" PRIMARY KEY ("id")
);

-- 3. 知识主表
CREATE TABLE "knowledge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "knowledgeType" "KnowledgeType" NOT NULL,
    "systemModuleId" TEXT,
    "moduleId" TEXT,
    "status" "KnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
    "permissionLevel" "KnowledgePermission" NOT NULL DEFAULT 'NORMAL',
    "currentVersionId" TEXT,
    "creatorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "lastConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_pkey" PRIMARY KEY ("id")
);

-- 4. 知识版本
CREATE TABLE "knowledge_versions" (
    "id" TEXT NOT NULL,
    "knowledgeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "contentJson" JSONB NOT NULL,
    "rawContentJson" JSONB,
    "contentText" TEXT NOT NULL DEFAULT '',
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changeReason" TEXT,
    "creatorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_versions_pkey" PRIMARY KEY ("id")
);

-- 5. 知识附件
CREATE TABLE "knowledge_attachments" (
    "id" TEXT NOT NULL,
    "knowledgeId" TEXT NOT NULL,
    "versionId" TEXT,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT,
    "uploaderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_attachments_pkey" PRIMARY KEY ("id")
);

-- 6. 唯一约束
ALTER TABLE "knowledge_modules" ADD CONSTRAINT "knowledge_modules_systemModuleId_name_key" UNIQUE ("systemModuleId", "name");
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_currentVersionId_key" UNIQUE ("currentVersionId");

-- 7. 外键约束
ALTER TABLE "knowledge_modules" ADD CONSTRAINT "knowledge_modules_systemModuleId_fkey" FOREIGN KEY ("systemModuleId") REFERENCES "system_modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_systemModuleId_fkey" FOREIGN KEY ("systemModuleId") REFERENCES "system_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "knowledge_modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "knowledge" ADD CONSTRAINT "knowledge_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "knowledge_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "knowledge_versions" ADD CONSTRAINT "knowledge_versions_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "knowledge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "knowledge_versions" ADD CONSTRAINT "knowledge_versions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "knowledge_versions" ADD CONSTRAINT "knowledge_versions_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "knowledge_attachments" ADD CONSTRAINT "knowledge_attachments_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "knowledge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 8. 索引
CREATE INDEX "knowledge_creatorId_idx" ON "knowledge"("creatorId");
CREATE INDEX "knowledge_status_idx" ON "knowledge"("status");
CREATE INDEX "knowledge_moduleId_idx" ON "knowledge"("moduleId");
CREATE INDEX "knowledge_versions_knowledgeId_idx" ON "knowledge_versions"("knowledgeId");
CREATE INDEX "knowledge_attachments_knowledgeId_idx" ON "knowledge_attachments"("knowledgeId");