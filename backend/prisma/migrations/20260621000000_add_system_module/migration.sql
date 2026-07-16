-- Create SystemModule table
CREATE TABLE "system_modules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_modules_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "system_modules_name_key" UNIQUE ("name"),
    CONSTRAINT "system_modules_code_key" UNIQUE ("code")
);

-- Add systemModuleId to tasks table
ALTER TABLE "tasks" ADD COLUMN "systemModuleId" TEXT;

-- Add foreign key constraint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_systemModuleId_fkey" FOREIGN KEY ("systemModuleId") REFERENCES "system_modules"("id") ON DELETE SET NULL;

-- Insert initial system modules
INSERT INTO "system_modules" ("id", "name", "code", "description", "status", "createdAt", "updatedAt") VALUES
('sys_billing', '计费中心', 'BILLING', '负责计费相关业务', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sys_account', '账务中心', 'ACCOUNT', '负责账务管理业务', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sys_settlement', '结算中心', 'SETTLEMENT', '负责结算相关业务', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sys_payment', '支付中心', 'PAYMENT', '负责支付相关业务', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sys_terminal', '全品类终端', 'TERMINAL', '全品类终端管理', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sys_customer', '客户价值', 'CUSTOMER', '客户价值管理', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('sys_enterprise', '政企资金', 'ENTERPRISE', '政企资金管理', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
