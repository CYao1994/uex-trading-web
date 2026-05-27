# 旧平台停用指南

> 项目已迁移至 EdgeOne Pages，以下步骤引导你逐步停止 Railway 和 Cloudflare Pages 的部署。

---

## 第一步：停止 Railway 服务

### 1.1 登录 Railway

1. 访问 https://railway.app
2. 用 GitHub 账号登录
3. 进入 `uex-trading-web` 项目

### 1.2 停止服务部署

1. 点击服务名称进入详情
2. 点击 **Settings** 标签
3. 找到 **Service** 区域
4. 点击 **Delete Service** 或 **Pause Deployment**
   - ⚠️ 如果选择 Delete，服务将被永久删除（推荐，因为已不需要）
   - 如果只想暂停观察，可以选择 Pause

### 1.3 删除项目（可选）

如果你确定不再需要 Railway：
1. 在项目设置页面，点击 **Delete Project**
2. 确认删除

### 1.4 撤销 GitHub 授权

1. 访问 https://github.com/settings/installations
2. 找到 Railway 的授权
3. 点击 **Configure** → **Revoke access**（或限制仓库访问权限）

### 1.5 删除 Railway API Token（如果创建了）

1. 访问 https://railway.app/account/tokens
2. 删除之前创建的 API Token

### 1.6 清理 GitHub Secrets

1. 访问 https://github.com/CYao1994/uex-trading-web/settings/secrets/actions
2. 删除以下 Secrets（已不再需要）：
   - `RAILWAY_API_TOKEN`
   - `RAILWAY_SERVICE_ID`
   - `RAILWAY_SERVICE_INSTANCE_ID`

---

## 第二步：停止 Cloudflare Pages

### 2.1 登录 Cloudflare

1. 访问 https://dash.cloudflare.com
2. 进入你的账户

### 2.2 删除 Pages 项目

1. 在左侧菜单点击 **Workers & Pages**
2. 找到 `uex-trading-web` 项目
3. 点击进入项目设置
4. 点击 **Settings** → **Delete project**
5. 确认删除

### 2.3 撤销 GitHub 集成

1. 访问 https://github.com/settings/installations
2. 找到 Cloudflare Pages 的授权
3. 点击 **Configure** → **Revoke access**（或限制仓库访问权限）

---

## 第三步：确认清理完成

### 检查清单

| 项目 | 状态 |
|------|------|
| Railway 服务已停止/删除 | ☐ |
| Railway GitHub 授权已撤销 | ☐ |
| Railway API Token 已删除 | ☐ |
| GitHub Actions Secrets 已删除 | ☐ |
| Cloudflare Pages 项目已删除 | ☐ |
| Cloudflare GitHub 授权已撤销 | ☐ |
| EdgeOne Pages 正常运行 | ☐ |
| UEX_API_KEY 已在 EdgeOne 配置 | ☐ |

### 验证 EdgeOne Pages 运行正常

```bash
# 测试前端
curl -s https://你的域名/ | head -5

# 测试 API
curl -s https://你的域名/api/health
```

---

## 注意事项

1. **域名 DNS**：如果之前有自定义域名指向 Cloudflare/Railway，需要将 DNS 记录指向 EdgeOne Pages
2. **数据备份**：Railway 和 Cloudflare Pages 不存储持久数据，无需备份
3. **费用**：停用后不会再产生任何费用
4. **回滚方案**：如果需要回滚，GitHub 仓库中仍有 v3.11.0 的历史代码（包含 backend/ 目录）
