# UEX Trade Navigator - 部署指南

## 方案一：Docker 部署（推荐）

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

## 方案二：云服务器部署

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

### Fly.io（免费额度可用）
1. 安装 Fly CLI：
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```
2. 登录：
   ```bash
   fly auth login
   ```
3. 启动应用：
   ```bash
   fly launch
   fly deploy
   ```
4. 自动获得 `xxx.fly.dev` 域名

### Railway（最简单）
1. 访问 https://railway.app
2. 用 GitHub 登录
3. New Project → Deploy from GitHub repo
4. 自动构建 Dockerfile
5. 自动获得域名

---

## 方案三：本地生产模式（单端口）

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

## 注意事项

- 后端需要 **curl** 命令可用（用于访问 UEX API，解决 TLS 兼容问题）
- UEX API 偶尔不稳定，已内置重试逻辑
- 建议开启 `--reload` 仅用于开发，生产不要加
- 如需 HTTPS，推荐用 Nginx 反代或云服务商自带的 SSL
