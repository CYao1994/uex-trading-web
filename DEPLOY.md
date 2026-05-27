# UEX Trade Navigator - 部署指南

## EdgeOne Pages 全栈部署（当前方案 ⭐）

### 架构概览

```
EdgeOne Pages
├── 静态文件（前端 React SPA）
│   ├── index.html
│   ├── assets/（JS/CSS/图片）
│   └── favicon.svg, icons.svg
├── Cloud Functions（后端 FastAPI）
│   └── cloud-functions/api/
│       ├── index.py          # FastAPI 入口
│       ├── requirements.txt  # Python 依赖
│       └── api/, services/   # 路由和业务逻辑
└── edgeone.json              # 区域路由配置
```

### 前置条件

- Node.js 22+（前端构建）
- EdgeOne CLI（部署工具）
- UEX API Key（可选，未配置时降级运行）

### 部署步骤

#### 1. 构建前端

```bash
cd frontend
npm install --legacy-peer-deps
npm run build
# 构建产物输出到项目根目录 dist/
```

#### 2. 准备部署目录

```bash
# 将 dist 内容和 cloud-functions 一起打包
mkdir -p uex-deploy
cp -r dist/* uex-deploy/          # 前端文件（index.html 必须在根目录）
cp -r cloud-functions uex-deploy/  # 后端 Cloud Functions
cp edgeone.json uex-deploy/        # EdgeOne 配置
```

⚠️ **重要**：`index.html` 必须在部署目录的根层级，不能放在 `dist/` 子目录中。

#### 3. 部署到 EdgeOne Pages

```bash
# 安装 EdgeOne CLI（首次）
npm install -g edgeone

# 登录
npx edgeone login

# 部署
npx edgeone pages deploy -n uex-trading-web ./uex-deploy
```

#### 4. 配置环境变量

在 EdgeOne Pages 控制台 → 项目设置 → 环境变量中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `UEX_API_KEY` | 你的 UEX API Key | 未配置时 API 以降级模式运行 |

#### 5. 绑定自定义域名（推荐）

绑定自定义域名后，访问时无需 eo_token 认证，体验更好。

### 费用说明（免费版）

| 资源 | 免费额度 |
|------|---------|
| 静态流量 | 不限 |
| Cloud Functions 请求 | 100 万次/月 |
| Cloud Functions 执行时间 | 50 万 GBs/月 |
| KV 存储 | 1GB |
| 构建次数 | 500 次/月 |

### 关键技术要点

1. **路由前缀剥离**：EdgeOne Cloud Functions 转发 `/api/*` 请求时会自动剥离 `/api` 前缀，因此 FastAPI router 不设置 prefix
2. **同源调用**：前端 `baseURL: '/api'`，无需 CORS
3. **Cloud Functions 入口**：`cloud-functions/api/index.py` 中必须有顶层 `app` 变量
4. **Python 运行时**：Python 3.10.11，包大小限制 128MB，内存 1GB，超时 120s
5. **本地开发**：使用 Vite 代理 + 本地 FastAPI（见下方）

---

## 本地开发

### 前置条件

- Node.js 22+
- Python 3.10+
- UEX API Key（可选）

### 启动步骤

```bash
# 终端 1：启动后端
cd cloud-functions/api
pip install -r requirements.txt
UEX_API_KEY=your_key python -m uvicorn index:app --host 0.0.0.0 --port 8000 --reload

# 终端 2：启动前端
cd frontend
npm install --legacy-peer-deps
npm run dev
# 前端 http://localhost:5173
# API 文档 http://localhost:8000/docs
```

Vite 开发服务器会自动将 `/api/*` 请求代理到 `localhost:8000`，并剥离 `/api` 前缀。

---

## 项目配置文件说明

| 文件 | 作用 |
|------|------|
| `edgeone.json` | EdgeOne Pages 区域路由配置 |
| `cloud-functions/api/index.py` | Cloud Functions 入口（FastAPI app） |
| `cloud-functions/api/requirements.txt` | Python 依赖 |
| `frontend/vite.config.js` | Vite 构建配置 + 代理设置 |
| `frontend/src/api/client.js` | API 客户端（同源 /api） |
| `.gitignore` | Git 忽略规则 |
