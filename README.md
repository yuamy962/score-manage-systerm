# 积分绩效管理系统

> 以贡献衡量价值，以数据支撑绩效

## 项目结构

```
score-manage-systerm/
├── backend/                  # NestJS + Prisma 后端 API
│   ├── prisma/
│   │   ├── schema.prisma     # 数据库模型定义
│   │   └── seed.ts           # 初始化数据脚本
│   ├── src/
│   │   ├── auth/             # 认证模块（JWT 登录）
│   │   ├── users/            # 用户管理模块
│   │   ├── tasks/            # 任务管理模块
│   │   ├── scores/           # 积分管理模块
│   │   ├── appeals/          # 申诉管理模块
│   │   ├── common/           # 公共（守卫、装饰器）
│   │   ├── prisma/           # Prisma 服务
│   │   ├── main.ts           # 入口文件
│   │   └── app.module.ts     # 根模块
│   ├── .env.example          # 环境变量模板
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # Next.js 14 前端
│   ├── app/
│   │   ├── login/            # 登录页
│   │   ├── dashboard/        # 后台管理
│   │   │   ├── page.tsx      # 仪表盘
│   │   │   ├── tasks/        # 任务管理
│   │   │   ├── scores/       # 积分管理
│   │   │   ├── ranking/      # 月度排行
│   │   │   ├── appeals/      # 申诉管理
│   │   │   └── users/        # 用户管理
│   │   ├── layout.tsx
│   │   ├── page.tsx          # 首页（自动跳转）
│   │   └── globals.css
│   ├── lib/
│   │   ├── api.ts            # Axios API 封装
│   │   └── utils.ts          # 工具函数
│   ├── package.json
│   ├── tailwind.config.ts
│   └── next.config.js
│
└── docs/                     # 需求文档
    └── 积分绩效管理系统需求文档_V1.2.md
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 14 + React 18 |
| UI 样式 | Tailwind CSS |
| 后端框架 | NestJS 10 |
| ORM | Prisma 5 |
| 数据库 | PostgreSQL |
| 认证 | JWT (Bearer Token) |
| 部署 | PM2 + Nginx |

## 快速开始

### 1. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd ../frontend
npm install
```

### 2. 配置数据库

复制环境变量模板：
```bash
cp backend/.env.example backend/.env
```

编辑 `backend/.env`，填入 PostgreSQL 连接信息：
```env
DATABASE_URL="postgresql://scoreuser:密码@localhost:5432/scoremanage?schema=public"
JWT_SECRET="your-secret-key"
PORT=3001
```

### 3. 初始化数据库

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### 4. 启动服务

```bash
# 后端（终端 1）
cd backend
npm run start:dev

# 前端（终端 2）
cd frontend
npm run dev
```

- 前端地址：http://localhost:3000
- 后端地址：http://localhost:3001
- API 文档：http://localhost:3001/api/docs

### 5. 测试账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 部门经理 | admin | admin123 |
| 项目经理 | pm01 | pm123 |
| 普通成员 | member01 | member123 |

## 核心功能模块

- [x] JWT 认证登录
- [x] RBAC 权限控制（3 角色）
- [x] 用户管理（部门经理专属）
- [x] 任务全生命周期管理（创建 → 分配 → 执行 → 审核 → 积分发放）
- [x] 多人协作比例分配
- [x] 积分记录与月度统计
- [x] 月度排行榜（含绩效等级映射）
- [x] 申诉流程（项目经理初审 → 部门经理终审）
- [x] 操作日志留痕

## 小程序对接预留

用户表已预留微信登录字段：
- `openid` - 微信用户唯一标识
- `unionid` - 微信开放平台统一标识
- `phone` - 绑定手机号

小程序端可复用同一套 NestJS API，仅需增加微信 `code2Session` 登录接口。

## 部署

购买腾讯云轻量服务器后：

1. 服务器上安装 PostgreSQL
2. 配置 Nginx 反向代理
3. PM2 管理 Node 进程
4. 执行数据库迁移和 Seed

详见 `docs/积分绩效管理系统需求文档_V1.2.md`
