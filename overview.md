# UEX Trade Navigator — 交付概览

## TL;DR
星际公民 UEX 交易路线 Web 应用，全栈部署于 EdgeOne Pages（前端静态 + Cloud Functions Python 后端）。

## 交付状态
- ✅ 前端 React 19 + MUI 9 + Tailwind CSS 4 深空主题界面
- ✅ 后端 FastAPI Cloud Functions（路线规划 + 数据代理）
- ✅ 库存清仓路线规划 API
- ✅ 进货路线规划 API
- ✅ 终端/商品/载具搜索 API（中英文）
- ✅ 战争债券数据
- ✅ 全栈部署于 EdgeOne Pages
- ✅ 同源调用，无需 CORS

## 部署架构

```
EdgeOne Pages (uex-trading-web-yui6hm8i.edgeone.cool)
├── 静态文件 → React SPA
└── /api/* → Cloud Functions (Python 3.10 + FastAPI)
```

## 文件清单

### 后端（Cloud Functions）
- `cloud-functions/api/index.py` — FastAPI 入口
- `cloud-functions/api/api/routes.py` — API 路由（无 prefix）
- `cloud-functions/api/api/schemas.py` — 数据模型
- `cloud-functions/api/services/` — 业务逻辑
- `cloud-functions/api/version.py` — 版本信息

### 前端
- `frontend/src/App.jsx` — 主应用
- `frontend/src/theme.js` — 深空主题
- `frontend/src/components/` — 全部 UI 组件
- `frontend/src/api/client.js` — API 请求封装（同源 /api）

### 配置
- `edgeone.json` — EdgeOne 区域路由
- `frontend/vite.config.js` — Vite 构建 + 代理

## 用户下一步建议
1. **配置 UEX_API_KEY**：EdgeOne 控制台 → 项目设置 → 环境变量
2. **绑定自定义域名**：关闭 eo_token 认证，提升访问体验
3. **本地开发**：`cd cloud-functions/api && python -m uvicorn index:app --port 8000` + `cd frontend && npm run dev`
4. **部署更新**：构建前端 → 准备部署目录 → `npx edgeone pages deploy`
