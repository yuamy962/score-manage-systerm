-- 为 performance_configs.grade 补充唯一约束（对齐 schema.prisma 中的 @unique）
CREATE UNIQUE INDEX "performance_configs_grade_key" ON "performance_configs"("grade");