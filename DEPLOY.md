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

---

## 方式一：GitHub 自动构建（推荐 ⭐）

Push 到 GitHub 后自动触发构建和部署，无需手动操作。

### 构建流程

```
GitHub Push → EdgeOne 拉取代码 → npm run build（根目录） → 部署 dist/
```

`npm run build` 执行 `scripts/build.js`，依次：
1. 安装前端依赖（`cd frontend && npm install`）
2. 构建前端（输出到 `dist/`）
3. 复制 `cloud-functions/` 和 `edgeone.json` 到 `dist/`
4. `dist/` 即为最终部署产物

### EdgeOne 控制台配置

在 EdgeOne Pages 控制台 → 项目设置 → 构建配置中设置：

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **构建命令** | `npm run build` | 根目录 package.json 的 build 脚本 |
| **输出目录** | `dist` | 构建产物目录 |
| **Node.js 版本** | 18 或 20 | Vite 8 要求 Node ≥ 18 |
| **根目录** | `/`（留空或 `/`） | 项目根目录 |

### 环境变量

在 EdgeOne Pages 控制台 → 项目设置 → 环境变量中添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `UEX_API_KEY` | 你的 UEX API Key | 未配置时 API 以降级模式运行 |

### 绑定自定义域名（推荐）

绑定自定义域名后，访问时无需 eo_token 认证，体验更好。

---

## 方式二：CLI 手动部署

适合快速验证或紧急修复，本地构建后直接上传。

### 步骤

```bash
# 1. 构建（等同于 EdgeOne 自动构建的过程）
npm run build

# 2. 部署
npx edgeone pages deploy -n uex-trading-web ./dist
```

⚠️ **注意**：如果项目已绑定 GitHub Provider，CLI 部署会报错。需要使用 Upload Provider 的项目。

---

## 费用说明（免费版）

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

---

## 本地开发

### 前置条件

- Node.js 18+
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
| `package.json` | 根目录构建入口（`npm run build`） |
| `scripts/build.js` | 构建脚本（安装依赖→构建前端→组装部署产物） |
| `edgeone.json` | EdgeOne Pages 区域路由配置 |
| `cloud-functions/api/index.py` | Cloud Functions 入口（FastAPI app） |
| `cloud-functions/api/requirements.txt` | Python 依赖 |
| `frontend/vite.config.js` | Vite 构建配置 + 代理设置 |
| `frontend/src/api/client.js` | API 客户端（同源 /api） |
| `.gitignore` | Git 忽略规则 |
