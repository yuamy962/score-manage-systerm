# 积分绩效管理系统 — 全局上下文摘要

> 本文档用于新窗口开启时快速恢复项目上下文，避免重复阅读所有文档。

---
## 零、以下三点全会话保持记忆
1. 每次一轮会话完，告诉是当前会话的第几轮
2. 如果会话超过8轮之后，自动将上下文整理到prod_info.md中，并提醒我开启新的窗口
3. 每次涉及到代码更新，按照文件生成scp的命令，没有特殊命令之前，只是拷贝增量代码，不要拷贝全部
   本地目录  D:\ALL-project\project_web\score-manage-systerm\  
   远程目录  ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm


## 一、项目概况

**项目名称**：部门积分绩效管理系统
**核心理念**：以贡献衡量价值，以数据支撑绩效。积分代表"贡献价值"，不代表工时。
**当前版本**：V1.3（需求文档版本），V1 阶段开发中，V2 功能为规划预留
**项目状态**：核心功能已完成，持续迭代中

---

## 二、技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14 + Tailwind CSS |
| 后端 | NestJS 10 + Prisma 5 |
| 数据库 | PostgreSQL 14+ |
| 认证 | JWT (passport-jwt) |
| 权限 | RBAC（自定义守卫） |
| 通知 | 飞书群机器人 Webhook |
| 定时任务 | @nestjs/schedule |
| 进程管理 | PM2 |
| 反向代理 | Nginx |

---

## 三、服务器与部署

| 项目 | 信息 |
|------|------|
| 应用服务器 | `124.220.134.186`，用户名 `ubuntu` |
| 本地路径 | `D:\project_web\score-manage-systerm` |
| 远端路径 | `ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm` |
| 数据库登录 | `psql -U scoreuser -d scoremanage -h localhost` |
| 后端端口 | 3001，启动命令 `node dist/src/main.js`（注意路径是 dist/src） |
| 前端端口 | 3000 |

---

## 四、系统角色（3种）

| 角色 | 核心职责 | 关键权限 |
|------|----------|----------|
| 部门经理(MANAGER) | 全局管理、终审 | 查看所有数据、审核特殊加减分、管理用户、配置绩效阈值 |
| 项目经理(PM) | 任务管理、积分审核 | 创建任务、分配人员、审核任务、录入积分、生成/下发绩效评语 |
| 普通成员(MEMBER) | 执行任务、提交完成 | 查看本人任务/积分、提交完成、申请延期、领取任务池任务 |

> 部门经理不参与积分统计，本人无积分记录。

---

## 五、核心业务流程

**1. 需求任务积分发放**：项目经理创建任务→分配负责人→成员执行→提交完成→项目经理审核→系统自动计算积分
**积分公式**：个人积分 = 最终工作量(人日) × 贡献比例 × 积分转换比例（自研1.0，非自研0.6）

**2. 运维积分录入**：成员提交申请→项目经理审核（P1级需部门经理终审）

**3. 团队贡献积分**：成员申请→项目经理初审→部门经理终审

**4. 绩效评语流程**：生成评语(草稿)→编辑→下发(不可再改)

**5. 申诉流程**：成员申诉(3个工作日内)→项目经理复核→部门经理裁定(不可再申诉)

**6. 任务池流程**：项目经理创建池任务→成员领取→项目经理确认→进入正常流程

---

## 六、积分体系

| 积分类型 | 说明 |
|----------|------|
| 需求开发 | 标准工作量=基础积分 |
| 测试联调 | 按权重拆分(开发40%/测试25%/联调20%/上线10%/文档5%) |
| 运维支撑 | P3(1~3分)/P2(3~8分)/P1(10~30分)，夜间×1.5，节假日×1.5，双重×1.8 |
| 团队贡献 | 文档/分享/带教/自动化优化 |
| 客户反馈 | 表扬+2~+10，投诉-5~-20 |
| 风险扣减 | 低级错误-3，未按流程-5，严重返工-10，重大事故-20~-50 |

---

## 七、绩效等级与阈值

| 当月积分 | 等级 |
|----------|------|
| ≥180 | A(卓越) |
| ≥135 | B+(优秀) |
| ≥115 | B(达标) |
| ≥77 | C(待改进) |
| <77 | D(不达标) |

> 阈值由部门经理配置可调；同分排名：任务完成数多者优先，并列跳号

---

## 八、任务状态流转

```
草稿(DRAFT) → 待执行(PENDING) → 执行中(IN_PROGRESS) → 待审核(IN_REVIEW) → 已完成(COMPLETED)
                                                                    ↓ 驳回
                                                              已驳回(REJECTED) → 执行中
另有：任务池(POOL) → 待确认(CLAIMED) → 待执行；已取消(CANCELLED)
```

> 已完成不可取消，积分不可回撤。effectMonth取审核通过时间所在月份。

---

## 九、延期扣罚机制

**公式**：最终积分 = 基础积分 × 0.9^延期天数，最低保留30%
**例外**：审批通过的延期不扣罚

---

## 十、已完成功能清单

1. 绩效评语草稿/下发流程
2. 仪表盘历史趋势图（积分+排名）
3. 积分管理页面修复（来源undefined、延期说明、悬停显示）
4. 成员总览选项卡（PM/MANAGER可见）
5. 任务总览选项卡（PM/MANAGER可见）
6. 安全加固（Helmet/CORS/限流/DTO验证/弱密码检测/JWT校验/审计日志）
7. 飞书通知增强（任务提交通知/到期每日提醒/卡片消息）
8. 用户管理增强（手机号/修改密码/修改手机号/修改角色）
9. 首次登录强制修改密码
10. 登录页去敏感信息
11. 用户自助修改密码
12. 侧边栏菜单权限控制
13. 积分录入sourceType空字符串修复
14. 徽章解锁Bug修复（upsert对null处理错误）
15. 登录接口限流双重守卫修复
16. 部门培训文档
17. 激励功能（排行榜增强/目标进度可视化/成就徽章体系/周度之星/月末冲刺提醒）
18. 延期申请与审批功能（extensions模块）
19. PM 任务管理分成与 PM 排行榜
    - PM 创建的任务审核通过后，PM 获得任务总积分 × `pmBonusRatio` 的管理分成
    - 默认比例 10%，存储在 `task_configs` 表，部门经理可在「用户管理 → 任务配置」中调整
    - 新增「月度排行 → PM 榜」，PM 单独排名
    - PM 个人积分仅来自部门经理分配的任务
20. 问题管理功能增强（2026-06-23）
    - 修复积分申请报错（Cannot POST /issue-scores 和 Internal Server Error）
    - 增加部门经理审核权限（PM和部门经理都能看到审核按钮）
    - 问题管理页面增加积分列（显示申请/审核后的积分值）
    - 审核通过自动创建积分记录到 score_records 表（积分类型为 OPS）
    - 修复积分列不显示问题（后端 issues.service.ts 添加 issueScore 关联）
21. 年度积分和排名功能（2026-06-25）
    - 新增年度积分统计：统计用户当年累计获得的积分
    - 新增年度排名：按年度积分对成员和PM进行排名
    - 仪表盘新增「年度积分」和「年度排名」两个统计卡片
    - 排行榜页面支持月度/年度切换

---

## 十一、数据库核心表

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| users | 用户 | id, name, role(MEMBER/PM/MANAGER), status, username, password, phone |
| tasks | 任务 | id, title, description, estimatedDays, finalDays, taskType, taskSource, taskAction, scoreRatio, planFinishAt, actualStartAt, actualFinishAt, status, isPoolTask, weightDev/Test/Debug/Online/Doc |
| task_assignments | 任务分配 | taskId, userId, ratio |
| score_records | 积分记录 | userId, taskId, type, score, reason, evidence, sourceType, sourceNo, sourceName, effectMonth |
| appeals | 申诉 | scoreRecordId, userId, reason, status, pmOpinion, reviewerId, result |
| performance_configs | 绩效配置 | grade, minScore |
| operation_logs | 操作日志 | userId, action, resource, detail |
| task_configs | 任务配置 | pmBonusRatio（PM 管理分成比例，默认 0.10） |
| badges | 徽章 | userId, type, month, reason |

---

## 十二、后端模块结构

```
AppModule
├── AuthModule (JWT登录/Token验证/密码管理/首次登录强制改密)
├── UsersModule (用户CRUD/角色修改/密码重置/手机号)
├── TasksModule (任务CRUD/状态流转/积分自动计算)
├── ScoresModule (积分CRUD/历史查询/进度查询/月度/年度排行)
├── AppealsModule (申诉管理)
├── ReviewsModule (绩效评语生成/编辑/下发)
├── ConfigModule (任务配置，如 PM 管理分成比例)
├── BadgesModule (成就徽章解锁/查询)
├── ExtensionsModule (延期申请/审批)
├── NotificationModule (飞书群通知/定时提醒)
├── CommonModule (审计日志/DTO验证/守卫/装饰器)
└── PrismaModule (数据库连接)
```

---

## 十三、前端页面结构

```
/login              - 登录页（含首次登录强制改密弹窗）
/dashboard          - 仪表盘（我的概览/成员总览/任务总览）
/dashboard/tasks    - 任务管理
/dashboard/scores   - 积分管理
/dashboard/ranking  - 月度/年度排行
/dashboard/progress - 绩效进度（我的进度）
/dashboard/badges   - 成就徽章
/dashboard/appeals  - 申诉管理
/dashboard/reviews  - 绩效评语
/dashboard/extensions - 延期申请
/dashboard/users    - 用户管理（仅MANAGER可见）
```

---

## 十四、关键文件索引

**后端核心文件**：
- `backend/prisma/schema.prisma` — 数据库模型
- `backend/src/main.ts` — 入口（Helmet/Swagger/CORS/限流配置）
- `backend/src/auth/auth.service.ts` — 认证/密码/强制改密
- `backend/src/tasks/tasks.service.ts` — 任务流转/积分计算
- `backend/src/scores/scores.service.ts` — 积分/排行/进度/年度排行
- `backend/src/reviews/reviews.service.ts` — 评语生成/下发
- `backend/src/badges/badges.service.ts` — 徽章解锁
- `backend/src/notification/notification.service.ts` — 飞书通知
- `backend/src/extensions/extensions.service.ts` — 延期申请
- `backend/src/common/services/audit.service.ts` — 审计日志

**前端核心文件**：
- `frontend/app/login/page.tsx` — 登录页
- `frontend/app/dashboard/layout.tsx` — 侧边栏/改密弹窗
- `frontend/app/dashboard/page.tsx` — 仪表盘
- `frontend/app/dashboard/tasks/page.tsx` — 任务管理
- `frontend/app/dashboard/scores/page.tsx` — 积分管理
- `frontend/lib/api.ts` — API封装

---

## 十五、默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 超级管理员 | sadmin | QH_hezuo_2026 |
| 部门经理 | admin | admin123 |
| 项目经理 | pm01/pm02/pm03 | pm123 |
| 普通成员 | member01~04 | member123 |

> 首次登录强制修改密码，弱密码无法继续使用。

---

## 十六、会话规则（需保持记忆）

1. 每轮会话结束，告知当前会话第几轮
2. 超过8轮后，自动整理上下文到PROJECT_STATUS.md，提醒开新窗口
3. 涉及代码更新时，按文件生成scp命令：`scp 本地路径 ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/对应路径`

---

## 十七、PM 积分规则（已落地）

> 自 2026-06-16 起，PM 积分按以下规则计算：

1. **PM 个人积分**：PM 作为任务执行人时，只有任务创建人是 `MANAGER`（部门经理）才获得个人积分；
2. **PM 管理分成**：PM 创建的任务审核通过后，PM 额外获得该任务成员总积分 × `pmBonusRatio` 的 `PM_BONUS` 积分；
3. **默认比例**：`pmBonusRatio = 0.10`（10%），由部门经理在「用户管理 → 任务配置」中维护；
4. **排行榜**：PM 与成员共用同一套 A/B+/B/C/D 阈值，但新增「PM 榜」单独展示 PM 排名。

## 十八、部署注意事项

- 涉及数据库变更时，服务器上必须执行：
  ```bash
  npx prisma migrate deploy
  npx prisma generate
  ```
- 如果 `prisma migrate deploy` 提示旧 migration 已存在但 `_prisma_migrations` 表未记录，可用 `npx prisma migrate resolve --applied <migration_name>` 标记为已应用。

## 十九、V2规划（当前不实现）

知识库系统、技能矩阵、模块地图、自动报表、时间系数启用、AI知识助手、权重调整

---

## 二十、系统配置功能（2026-06-21）

### 功能概述
为系统增加了系统配置管理功能，支持管理系统模块配置，并在任务创建时关联系统归属。

### 新增功能

**1. 系统配置管理** - 在「用户管理 → 系统配置」选项卡中管理系统模块：
- 支持添加、编辑、删除系统模块
- 初始数据包含7个系统模块：计费中心、账务中心、结算中心、支付中心、全品类终端、客户价值、政企资金
- 每个模块包含：名称、编码、描述、状态（启用/禁用）

**2. 任务系统归属** - 创建任务时增加系统归属选择：
- 从系统配置中读取可用的系统模块
- 支持为任务关联所属系统模块

### 修改的文件

**后端：**
- `backend/prisma/schema.prisma` - 添加 `SystemModule` 模型，`Task` 模型添加 `systemModuleId` 字段
- `backend/prisma/migrations/20260621000000_add_system_module/migration.sql` - 数据库迁移文件
- `backend/src/config/config.service.ts` - 添加系统模块 CRUD 方法
- `backend/src/config/config.controller.ts` - 添加系统模块 REST API 端点

**前端：**
- `frontend/lib/api.ts` - 添加系统模块 API 封装
- `frontend/app/dashboard/users/page.tsx` - 添加「系统配置」选项卡及管理功能
- `frontend/app/dashboard/tasks/page.tsx` - 在任务创建表单中添加系统归属选择框

### 新增数据库表
| 表名 | 说明 | 关键字段 |
|------|------|----------|
| system_modules | 系统模块配置 | id, name(唯一), code(唯一), description, status, createdAt, updatedAt |

### API 接口
| 接口 | 方法 | 说明 |
|------|------|------|
| /config/system-modules | GET | 获取启用的系统模块列表 |
| /config/system-modules/all | GET | 获取所有系统模块（含禁用） |
| /config/system-modules | POST | 创建系统模块 |
| /config/system-modules/:id | PUT | 更新系统模块 |
| /config/system-modules/:id | DELETE | 删除系统模块 |

### SCP 上传命令参考
```bash
# 后端文件
scp d:\project_web\score-manage-systerm\backend\src\config\config.service.ts ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/backend/src/config/
scp d:\project_web\score-manage-systerm\backend\src\config\config.controller.ts ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/backend/src/config/
scp d:\project_web\score-manage-systerm\backend\prisma\schema.prisma ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/backend/prisma/
scp d:\project_web\score-manage-systerm\backend\prisma\migrations\20260621000000_add_system_module/migration.sql ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/backend/prisma/migrations/20260621000000_add_system_module/

# 前端文件
scp d:\project_web\score-manage-systerm\frontend\lib\api.ts ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/frontend/lib/
scp d:\project_web\score-manage-systerm\frontend\app\dashboard\users\page.tsx ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/frontend/app/dashboard/users/
scp d:\project_web\score-manage-systerm\frontend\app\dashboard\tasks\page.tsx ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/frontend/app/dashboard/tasks/
```

### 部署验证
- 部署状态：✅ 正常
- 数据库迁移：✅ 已完成
- 后端构建：✅ 成功
- 前端构建：✅ 成功
- PM2 服务：score-backend 和 score-frontend 均在线

## 二十一、快速更新脚本

### 使用方法
```bash
# 服务器端执行
cd /home/ubuntu/score-manage-systerm
./script/quick-update.sh
```

### 脚本功能
- 停止 PM2 服务
- 执行 Prisma 迁移
- 重新生成 Prisma 客户端
- 构建后端
- 构建前端
- 重启 PM2 服务

---

## 二十二、问题管理功能（2026-06-21）

### 功能概述
新增问题管理模块，支持普通员工录入运维问题，并申请积分，由PM进行审核。

### 新增功能

**1. 问题录入** - 普通员工可录入运维过程中的问题：
- 标题、内容简述
- 所属系统（从系统配置获取）
- 发生时间、解决时间
- 时间花费（小时）
- 问题分类：咨询、系统BUG、提数、测试配合、其它
- 备注

**2. 积分申请** - 普通员工可对已录入的问题申请积分：
- 申请积分额度：0.5 - 5 分
- 选择审核PM（下拉列表显示项目经理和部门经理）
- 温馨提示：请确保该问题已整理成文档，重复的问题不要重复申请

**3. 积分审核** - PM/部门经理可审核积分申请：
- 可修改积分：0 - 5 分
- 审核状态：通过/拒绝
- 备注
- 温馨提示：请确认已收到该问题的文档后再审核，重复问题无积分

### 数据库设计

**新增枚举**：
```prisma
enum IssueCategory {
  CONSULTATION  // 咨询
  BUG           // 系统BUG
  DATA_QUERY    // 提数
  TEST_SUPPORT  // 测试配合
  OTHER         // 其它
}

enum IssueScoreStatus {
  PENDING   // 待审核
  APPROVED  // 已通过
  REJECTED  // 已拒绝
}
```

**新增表**：
| 表名 | 说明 | 关键字段 |
|------|------|----------|
| issues | 问题记录 | id, title, description, systemModuleId, occurredAt, resolvedAt, hoursSpent, category, remark, creatorId |
| issue_scores | 积分申请 | id, issueId(唯一), requestedScore, approvedScore, reviewerId, status, remark |

### 修改的文件

**后端：**
- `backend/prisma/schema.prisma` - 添加 `Issue`、`IssueScore` 模型和枚举
- `backend/src/issues/issues.module.ts` - 问题模块
- `backend/src/issues/issues.controller.ts` - 问题API控制器
- `backend/src/issues/issues.service.ts` - 问题服务
- `backend/src/issues/issue-score.controller.ts` - 积分申请API控制器
- `backend/src/issues/issue-score.service.ts` - 积分申请服务
- `backend/src/users/users.controller.ts` - 移除findAll的角色限制，让普通员工能获取PM列表

**前端：**
- `frontend/lib/api.ts` - 添加 `issueApi` 和 `issueScoreApi`
- `frontend/app/dashboard/issues/page.tsx` - 问题管理页面

### API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /issues | GET | 获取问题列表 |
| /issues | POST | 创建问题 |
| /issues/:id | GET | 获取问题详情 |
| /issues/:id | PUT | 更新问题 |
| /issues/:id | DELETE | 删除问题 |
| /issue-scores | GET | 获取积分申请列表 |
| /issue-scores | POST | 创建积分申请 |
| /issue-scores/:id | GET | 获取积分申请详情 |
| /issue-scores/:id | PUT | 审核积分申请（PM/MANAGER） |
| /issue-scores/:id | DELETE | 删除积分申请 |

### 已解决的问题

**问题1：下拉菜单中不显示项目经理和部门经理**
- 原因：`/users` 接口有 `@Roles(Role.PM, Role.MANAGER)` 装饰器限制，普通员工调用返回403
- 解决：移除 `findAll` 方法的角色限制，让所有登录用户都能获取用户列表

**问题2：积分申请API返回404**
- 原因：`IssueScoreController` 缺少 `@UseGuards` 装饰器，导致控制器未正确注册
- 解决：添加 `@UseGuards(JwtAuthGuard, RolesGuard)` 和 `@ApiTags`、`@ApiBearerAuth` 装饰器

**问题3：Prisma枚举类型不存在**
- 原因：数据库中未创建 `IssueCategory` 枚举类型
- 解决：手动执行SQL创建枚举类型，或重新执行迁移

### SCP 上传命令参考
```bash
# 后端文件
scp backend/prisma/schema.prisma ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/backend/prisma/
scp backend/src/issues/issues.module.ts ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/backend/src/issues/
scp backend/src/issues/issues.controller.ts ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/backend/src/issues/
scp backend/src/issues/issues.service.ts ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/backend/src/issues/
scp backend/src/issues/issue-score.controller.ts ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/backend/src/issues/
scp backend/src/issues/issue-score.service.ts ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/backend/src/issues/
scp backend/src/users/users.controller.ts ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/backend/src/users/

# 前端文件
scp frontend/lib/api.ts ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/frontend/lib/
scp frontend/app/dashboard/issues/page.tsx ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/frontend/app/dashboard/issues/
```

### 部署步骤
```bash
# 1. 生成Prisma客户端
cd /home/ubuntu/score-manage-systerm/backend && npx prisma generate

# 2. 执行数据库迁移
cd /home/ubuntu/score-manage-systerm/backend && npx prisma migrate deploy

# 3. 构建后端
cd /home/ubuntu/score-manage-systerm/backend && npm run build

# 4. 重启后端服务
pm2 restart score-backend

# 5. 构建前端
cd /home/ubuntu/score-manage-systerm/frontend && npm run build

# 6. 重启前端服务
pm2 restart score-frontend
```

---

## 二十三、飞书通知功能改造（2026-06-24）

### 功能概述
将任务下发通知渠道从企业微信改为飞书群，采用飞书卡片消息实现。

### 飞书签名算法（关键修复）

```typescript
function generateSignature(): { timestamp: string; sign: string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const stringToSign = `${timestamp}\n${secret}`;
  const sign = crypto
    .createHmac('sha256', stringToSign)
    .update('')
    .digest('base64');
  return { timestamp, sign };
}
```

**算法要点**：
- 使用秒级时间戳（10位）
- 签名字符串格式：`timestamp + "\n" + secret`
- 使用 HMAC-SHA256，以上述字符串作为密钥，对空字符串进行哈希
- 签名和时间戳放入请求体（非请求头）

### 修改的文件

| 文件路径 | 修改内容 |
|----------|----------|
| `backend/src/notification/notification.service.ts` | 重构为飞书卡片消息发送，修复签名算法 |
| `backend/.env` | 添加飞书 Webhook URL 和 Secret |
| `backend/test-feishu.ts` | 测试脚本，验证飞书消息发送 |
| `docs/运维文档.md` | 更新通知配置说明为飞书 |
| `docs/部门培训文档.md` | 更新业务流程中的通知方式 |
| `docs/项目操作与结构说明.md` | 更新功能清单中的通知类型 |

### 飞书配置项

```env
FEISHU_WEBHOOK_URL="https://open.feishu.cn/open-apis/bot/v2/hook/b96893fe-e90b-4cb9-93e0-9109eead6c15"
FEISHU_SECRET="kPlFb9FsarVQqgtPhgRHJh"
```

### DeepSeek 配置项（AI评审功能）

```env
DEEPSEEK_API_KEY="your-deepseek-api-key"
DEEPSEEK_API_URL="https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL="deepseek-chat"
```

### 通知场景

1. 📋 任务提交审核通知（卡片消息）
2. 📋 新任务下发通知（卡片消息）
3. ⚠️ 即将到期任务提醒（每日 10:00）
4. ⭐ 本周之星推送（每周五 17:30）
5. 🔥 月末冲刺提醒（每月末）
6. 🎉 里程碑达成通知
7. 🏅 成就徽章通知

### SCP 上传命令参考
```bash
scp d:\project_web\score-manage-systerm\backend\src\notification\notification.service.ts ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/backend/src/notification/
```

### 测试结果
✅ 飞书卡片消息发送成功（已验证）

---

## 二十四、年度积分和排名功能（2026-06-25）

### 功能概述
新增年度积分统计和排名功能，支持按年度查看积分和排名。

### 新增功能
1. **年度积分统计**：统计用户当年累计获得的积分
2. **年度排名**：按年度积分对成员和PM进行排名
3. **仪表盘年度卡片**：新增「年度积分」和「年度排名」两个统计卡片
4. **排行榜年度视图**：排行榜页面支持月度/年度切换

### 新增 API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/scores/ranking/yearly` | GET | 成员年度排名（参数：year） |
| `/scores/ranking/yearly/pm` | GET | PM年度排名（参数：year） |

### 修改的文件

| 文件路径 | 修改内容 |
|----------|----------|
| `backend/src/scores/scores.service.ts` | 添加 `getYearlyRanking`、`getYearlyPmRanking`、`getYearlyMemberRanking` 方法 |
| `backend/src/scores/scores.controller.ts` | 添加年度排名 API 路由 |
| `frontend/lib/api.ts` | 添加 `yearlyRanking`、`yearlyPmRanking` API 调用 |
| `frontend/app/dashboard/ranking/page.tsx` | 添加月度/年度切换、年份选择器 |
| `frontend/app/dashboard/page.tsx` | 添加年度积分和年度排名卡片 |

### 前端改动说明

**排行榜页面**：
- 新增「月度」/「年度」切换按钮
- 年度模式下显示年份输入框
- 表格列标题自动切换（当月积分 ↔ 年度积分）

**仪表盘页面**：
- 统计卡片网格从 4 列扩展为 6 列
- 新增「年度积分」卡片（紫色主题）
- 新增「年度排名」卡片（紫色主题）

### SCP 上传命令参考
```bash
# 后端文件
scp d:\project_web\score-manage-systerm\backend\src\scores\scores.service.ts ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/backend/src/scores/
scp d:\project_web\score-manage-systerm\backend\src\scores\scores.controller.ts ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/backend/src/scores/

# 前端文件
scp d:\project_web\score-manage-systerm\frontend\lib\api.ts ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/frontend/lib/
scp d:\project_web\score-manage-systerm\frontend\app\dashboard\ranking\page.tsx ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/frontend/app/dashboard/ranking/
scp d:\project_web\score-manage-systerm\frontend\app\dashboard\page.tsx ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/frontend/app/dashboard/
```

### 测试结果
✅ 后端项目构建成功

---

## 二十五、会话记录

### 当前会话：第 7 轮

### 会话规则（需保持记忆）
1. 每轮会话结束，告知当前会话第几轮
2. 超过8轮后，自动整理上下文到PROJECT_STATUS.md，提醒开新窗口
3. 涉及代码更新时，按文件生成 scp 命令：`scp 本地路径 ubuntu@124.220.134.186:/home/ubuntu/score-manage-systerm/对应路径`
4. 启动脚本统一使用：`/home/ubuntu/score-manage-systerm/script/quick-update.sh`

### 第 7 轮会话内容（2026-06-28）

**年度排行功能Bug修复**：
1. 问题：年度排行选择不存在年份（如2039、2025）时仍显示2026年数据
2. 原因：Prisma `startsWith` 查询在某些情况下过滤不正确
3. 修复：将 `effectMonth: { startsWith: year }` 改为范围查询 `effectMonth: { gte: year-01, lte: year-12 }`
4. 添加了年份参数校验和调试日志
5. 修改文件：`backend/src/scores/scores.service.ts`、`backend/src/scores/scores.controller.ts`
6. 测试验证：选择2039年显示空，选择2026年显示数据，选择2025年显示空

### 第 6 轮会话内容（2026-06-25）

**飞书通知功能改造**：
1. 将通知渠道从企业微信改为飞书群
2. 实现飞书卡片消息发送
3. 修复飞书签名验证问题（使用秒级时间戳 + HMAC-SHA256 算法）
4. 测试验证飞书消息发送成功

**年度积分和排名功能**：
1. 新增年度积分统计：统计用户当年累计获得的积分
2. 新增年度排名：按年度积分对成员和PM进行排名
3. 仪表盘新增「年度积分」和「年度排名」两个统计卡片
4. 排行榜页面支持月度/年度切换

**文档整合**：
1. 将根目录 pro_info.md 和 docs/pro_info.md 整合到 docs/pro_info.md
2. 更新已完成功能清单，添加年度积分和排名功能
3. 更新技术栈中的通知方式为飞书
4. 更新后端模块结构中的通知模块描述
