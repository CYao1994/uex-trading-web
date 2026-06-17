# 接手文档：EdgeOne Pages Cloud Functions 后端 404 问题

**最后更新**：2026-06-17  
**仓库**：https://github.com/CYao1994/uex-trading-web  
**当前线上地址**：https://sus2025.com  
**问题症状**：`/api/health` 404，`/api/terminals` 返回 `{"error":"Backend error","detail":""}` 表示 Edge Function 通了但 Python 后端 404

---

## 当前状态（最新 commit：a0046fe）

- ✅ 前端页面正常加载
- ✅ Edge Functions 已部署成功（`/api/terminals` 能触发 Edge Function，说明路由注册成功）
- ❌ Cloud Functions（Python FastAPI 后端）未被正确注册，`/backend/*` 全部返回 404
- ❓ `/api/health` 仍然 404（该端点在 Edge Function 里有独立 health 检查，不转发后端）

---

## 真正的根因（已通过官方文档确认）

### 1. **Cloud Function 目录路径错误（核心问题）**

官方文档的路由规则：
```
/cloud-functions/backend/index.py  →  URL 路由 /backend
```

但官方文档中所有 FastAPI 示例都是放在 `cloud-functions/api/` 下：
```
/cloud-functions/api/index.py  →  URL 路由 /api
```

**你的项目把 FastAPI app 放在 `cloud-functions/backend/index.py`**，理论上路由应该是 `/backend`。  
但实际 `/backend/health` 测试返回 404，说明这个 Cloud Function **根本没被注册上**。

### 2. **可能原因：入口识别失败**

官方文档说只有包含以下**入口标识**的文件才会被注册为路由：
- `app = FastAPI(...)` ← 你的代码有这个 ✅

但你的 `index.py` 中 `app = FastAPI(...)` 定义在 `lifespan` 函数之后（第 42 行），且前面有大量 import 和函数定义。如果平台做静态扫描时没找到顶层的 `app =` 赋值，会判定为辅助模块跳过。

### 3. **requirements.txt（已修复，但可能还不够）**

已把 `requirements.txt` 从 `cloud-functions/backend/requirements.txt` 复制到 `cloud-functions/requirements.txt`（官方优先识别路径）。这一步是对的，但可能不是唯一问题。

---

## 推荐修复方案（按优先级排序）

### 方案 A：将 Cloud Function 移至正确目录（推荐，最彻底）

**官方推荐结构**：
```
cloud-functions/
└── api/
    └── [[default]].py  ← FastAPI app（catch-all 接收所有 /api/* 请求）
└── requirements.txt
```

**操作**：
1. 在 `cloud-functions/api/` 下创建 `[[default]].py`
2. 将 `cloud-functions/backend/index.py` 里的 FastAPI app 和 routes 迁移进来
3. 路由变为 `/api/*`，FastAPI 内部路由无需 `/api` 前缀（平台自动剥离）
4. **Edge Functions 的 KV 缓存层还可以保留**：Edge Function 接到 `/api/*` 请求 → 检查 KV 缓存 → 未命中时转发到 `/api/*`（改 forwardToBackend 里的 `/backend` → `/api`）
5. 或者**直接移除 Edge Functions**，让前端直接打 `/api/*`（FastAPI 直接响应）

**改动最小版**：
```python
# cloud-functions/api/[[default]].py
from fastapi import FastAPI
from api.routes import router  # 相对 import 需要注意路径

app = FastAPI(...)
app.include_router(router)
```
注意：`api/routes.py` 等辅助文件需要跟着移动，或者调整 `sys.path`。

### 方案 B：在 `cloud-functions/backend/index.py` 顶部添加明确的入口标识注释（低成本试验）

官方说"顶层赋值"需要能被扫描到。改一下让 `app = FastAPI(...)` 移到文件最前面（import 之后立刻定义，不放在 lifespan 之后），确保静态扫描能识别：

```python
# 改成：先 import，然后立即定义 app
from fastapi import FastAPI
app = FastAPI(...)  # 必须在顶层，不能放在函数内
```

### 方案 C：测试一下 `/backend` 路径是否真的可访问（排除误判）

部署完成后，在 EdgeOne Pages 控制台查看 **Functions** 标签页，确认 `backend` 函数是否出现在已注册函数列表中。如果出现了，说明注册成功但有其他问题（如运行时错误）。

---

## 项目架构背景

```
uex-trading-web/
├── frontend/                    # React + Vite 前端
│   └── src/
├── edge-functions/              # JS Edge Functions（KV 缓存层）
│   └── api/
│       ├── _shared/
│       │   └── cache-helper.js  # forwardToBackend() 转发到 /backend/*
│       ├── health.js
│       ├── terminals.js
│       └── ... (14 个端点)
├── cloud-functions/             # Python Cloud Functions
│   ├── api/                     # 空目录（只有 __pycache__）
│   ├── backend/                 # FastAPI 应用（路由 /backend）
│   │   ├── index.py             # app = FastAPI(...) + include_router
│   │   ├── api/routes.py        # 800+ 行路由定义（无前缀，FastAPI 内部路由）
│   │   ├── services/            # 业务逻辑
│   │   └── requirements.txt     # 依赖（已复制到 cloud-functions/requirements.txt）
│   └── requirements.txt         # 新增（官方优先识别位置）
├── scripts/
│   └── build.js                 # 自定义构建脚本
└── edgeone.json                 # 当前配置（见下）
```

### 当前 `edgeone.json`（最新）
```json
{
  "cloudFunctions": {
    "mainlandRegions": ["ap-guangzhou"],
    "overseasRegions": ["ap-singapore"],
    "python": {
      "maxDuration": 60
    }
  }
}
```

### Edge Function 转发逻辑
- 文件：`edge-functions/api/_shared/cache-helper.js` 第 216 行
- 当前写死转发路径：`https://sus2025.com/backend/<path>`
- 如果 Cloud Function 改为 `/api/*`，需要同步修改为 `/api/<path>`

---

## 已完成的修复（本轮已 push）

| commit | 内容 | 状态 |
|--------|------|------|
| `7325437` | 删除 `build.js` 里 edge-functions 复制到 dist 的逻辑，添加 package.json 复制 | ✅ 已 push |
| `4b5727d` | 修正 `edgeone.json` 格式（regions 移入 cloudFunctions，删除非官方字段） | ✅ 已 push |
| `a0046fe` | 添加 `cloud-functions/requirements.txt`（官方优先识别位置） | ✅ 已 push |

---

## 关键结论

**已解决的问题**：
- `meta file is missing` 警告已消失（build.js 修复有效）
- Edge Functions 路由注册成功（`/api/terminals` 能触发 JS 函数）

**未解决的问题**：
- Python Cloud Function `cloud-functions/backend/index.py` 未被平台注册，`/backend/*` 全部 404
- 根因疑似：目录名 `backend` 不是官方示例目录名，或 `app = FastAPI(...)` 在文件中的位置不满足静态扫描要求

**下一步最优先行动**：
1. 去 EdgeOne Pages 控制台 → Functions 标签页，确认 `backend` 函数是否在已注册列表中
2. 如果没有注册，走**方案 A**（迁移到 `cloud-functions/api/[[default]].py`）
3. 同步修改 `edge-functions/api/_shared/cache-helper.js` 中 `/backend` → `/api`
