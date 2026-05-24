# UEX Trade Navigator - 部署指南

## 方案一：Railway 部署（推荐 ⭐ 最简单）

### 前置条件
- GitHub 账号
- 项目已推送到 GitHub 仓库

### 步骤

#### 1. 创建 GitHub 仓库并推送代码

```bash
# 在项目目录下（如果还没初始化 git）
cd uex-trading-web

# 如果还没创建 GitHub 仓库，去 https://github.com/new 创建
# 仓库名: uex-trading-web，不要勾选 Initialize with README

# 添加远程仓库并推送
git remote add origin https://github.com/<你的用户名>/uex-trading-web.git
git branch -M main
git push -u origin main
```

#### 2. 在 Railway 上部署

1. 访问 https://railway.app ，用 GitHub 账号登录
2. 点击 **New Project**
3. 选择 **Deploy from GitHub repo**
4. 选择 `uex-trading-web` 仓库
5. Railway 会自动检测到 `Dockerfile` 和 `railway.json`，开始构建
6. 等待构建完成（约 3-5 分钟）

#### 3. 配置域名

1. 在 Railway 项目页面，点击服务名称进入详情
2. 点击 **Settings** 标签
3. 找到 **Domains** 区域，点击 **Generate Domain**
4. Railway 会自动分配一个 `xxx.up.railway.app` 的域名
5. 也可以绑定自定义域名

#### 4. 验证

访问 Railway 分配的域名，应该能看到 UEX Trade Navigator 页面。

### 费用说明
- Railway 免费额度：$5/月额度 + 500 小时执行时间
- 本项目轻量级，免费额度足够日常使用
- 如果超出免费额度，Hobby 计划 $5/月

### 注意事项
- Railway 通过 `PORT` 环境变量指定端口，Dockerfile 已配置自动读取
- 如果构建失败，检查 Build Logs 中的错误信息
- 前端 API 调用使用相对路径 `/api`，Railway 同源部署无需额外配置

---

## 方案二：Docker 部署

### 1. 本地 Docker 运行
```bash
# 构建镜像
docker build -t uex-trading .

# 运行容器
docker run -d -p 8000:8000 --name uex-trading uex-trading

# 访问 http://localhost:8000
```

### 2. Docker Compose
```bash
docker compose up -d
```

---

## 方案三：云服务器部署

### 阿里云/腾讯云 ECS
1. 购买轻量应用服务器（2核2G，约 50元/月）
2. 安装 Docker：
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. 上传项目或 git clone
4. 运行：
   ```bash
   docker compose up -d
   ```
5. 配置域名（可选）+ SSL

---

## 方案四：本地生产模式（单端口）

不需要 Docker，直接运行：

```bash
# 1. 构建前端
cd frontend && npm install && npx vite build && cd ..

# 2. 安装后端依赖
pip install -r backend/requirements.txt

# 3. 启动（单端口模式，:8000 同时服务前端和API）
cd backend
PYTHONPATH=/app/backend python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## 项目配置文件说明

| 文件 | 作用 |
|------|------|
| `Dockerfile` | Docker 镜像构建配置（Python + Node.js + 前端构建 + 后端启动） |
| `railway.json` | Railway 专用配置（指定使用 Dockerfile 构建） |
| `docker-compose.yml` | Docker Compose 编排（含健康检查） |
| `.dockerignore` | Docker 构建时忽略的文件 |
| `.gitignore` | Git 忽略的文件 |
