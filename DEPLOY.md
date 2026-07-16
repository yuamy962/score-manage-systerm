# 部署文档

## 环境准备

### 必需软件
- Node.js >= 18
- PostgreSQL >= 14
- Git

### 环境变量
在 `backend` 目录下创建 `.env` 文件，参考 `.env.example`：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/score_manage?schema=public"
JWT_SECRET="your-jwt-secret-key-change-in-production"
PORT=3001
NODE_ENV="development"
```

## 部署步骤

### 1. 初始化数据库

```bash
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
```

### 2. 启动后端服务

```bash
# 开发环境
npm run start:dev

# 生产环境
npm run build
npm run start:prod
```

后端服务将在 `http://localhost:3001` 启动。

### 3. 启动前端服务

```bash
cd frontend
npm install
npm run build
npm run start
```

前端服务将在 `http://localhost:3000` 启动。

### 4. Nginx 配置（生产环境）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## PM2 进程管理（生产环境）

在 `backend` 目录下创建 `ecosystem.config.js`：

```js
module.exports = {
  apps: [{
    name: 'score-backend',
    script: './dist/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      JWT_SECRET: 'your-secret',
      DATABASE_URL: 'postgres://...',
    },
  }],
};
```

启动命令：
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 文件上传配置（运维凭证）

创建上传目录：
```bash
mkdir -p /var/www/uploads
chmod 755 /var/www/uploads
```

更新后端配置以支持文件上传（根据需要）。
