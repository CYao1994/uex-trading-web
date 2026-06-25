# MiMo 技能清单（统一版）

> 最后更新: 2026-06-25
> 技能安装路径: `~\.agents\skills\` + `~\.claude\skills\`

---

## 一、系统内置技能（17个 compose 流程技能）

| 技能 | 用途 |
|------|------|
| compose:brainstorm | 新功能设计前的头脑风暴 |
| compose:ask | 向用户提问/确认 |
| compose:parallel | 并行执行独立任务 |
| compose:plan | 多步骤任务规划 |
| compose:execute | 执行实施计划 |
| compose:tdd | 测试驱动开发 |
| compose:debug | 调试流程 |
| compose:verify | 完成前验证 |
| compose:review | 代码审查 |
| compose:report | 生成报告 |
| compose:merge | 合并/PR 管理 |
| compose:new-skill | 创建新技能 |
| compose:subagent | 子代理执行 |
| compose:feedback | 代码审查反馈 |
| compose:worktree | 工作树隔离 |

---

## 二、已安装的项目技能（22个）

### 项目开发专用（8个）

| 技能名 | 来源 | 安装量 | 用途 | 安装时间 |
|--------|------|--------|------|----------|
| **impeccable** | pbakaus/impeccable@impeccable | 170.3K | UI/UX代码审查(5维度评分) | 2026-06-24 |
| **react-performance-optimization** | nickcrew/claude-ctx-plugin | 1.6K | React性能优化(memo/useCallback/虚拟化) | 2026-06-24 |
| **python-fastapi-development** | sickn33/antigravity-awesome-skills | 451 | FastAPI后端最佳实践 | 2026-06-24 |
| **chart-visualization** | antvis/chart-visualization-skills | 4.2K | 数据可视化/图表(ECharts/AntV) | 2026-06-24 |
| **frontend-design-ui-ux** | ulpi-io/skills@frontend-design-ui-ux | — | 前端设计规范生成(非代码) | 2026-06-24 |
| **ui-ux-pro-max** | nexu-io/open-design@ui-ux-pro-max | — | UI/UX模式库(仅catalog) | 2026-06-24 |
| **crawl4ai-skill** | lancelin111/crawl4ai-skill | — | AI爬虫(UEX/RSI数据抓取) | 2026-06-24 |
| **kernel-cli** | kernel/skills@kernel-cli | — | 云端浏览器自动化(CDP) | 2026-06-24 |

### 安全审计套件（13个）

| 技能名 | 用途 |
|--------|------|
| **skill-vetter** | 技能安全审查(安装前检查) |
| **skill-auditor** | 技能综合安全审计 |
| **skill-guard** | 运行时技能安全监控 |
| **config-hardener** | OpenClaw配置安全加固 |
| **credential-scanner** | 凭证泄露扫描 |
| **dependency-auditor** | 依赖漏洞审计(npm/pip/Go) |
| **incident-responder** | 安全事件响应指南 |
| **network-watcher** | 网络请求监控/数据泄露检测 |
| **output-sanitizer** | 输出脱敏(凭证/PII/内部路径) |
| **permission-auditor** | 权限审计(识别过度授权) |
| **prompt-guard** | 提示注入检测/防御 |
| **sandbox-guard** | Docker沙箱配置 |
| **setup-auditor** | 环境配置审计 |

### 通用工具（1个）

| 技能名 | 用途 |
|--------|------|
| **find-skills** | 发现和安装新技能 |

---

## 三、安装失败的技能

| 技能名 | 失败原因 |
|--------|----------|
| computer-use (stablyai/orca, 4.4K) | 仓库极大，git clone超时(300s) |
| computer-use (kortix-ai, 73) | 仓库大，120s超时 |
| browser-use (mxyhi/ok-skills, 42) | 仓库极大，多次克隆超时 |
| kernel-cli (CLI二进制) | skill文件OK，CLI二进制GitHub下载超时 |
| taste-skill | open-design仓库中无此skill名 |

---

## 四、未安装的推荐技能

### 高优先级

| 技能名 | 来源 | 安装量 | 用途 | 推荐理由 |
|--------|------|--------|------|----------|
| **react-devtools** | callstackincubator/agent-react-devtools@react-devtools | 1.7K | React调试工具 | 调试大组件拆分后渲染问题 |
| **react-expert** | reactjs/react.dev@react-expert | 1K | React官方最佳实践 | 来自React团队 |
| **owasp-security** | hoodini/ai-agents-skills@owasp-security | 2.3K | OWASP安全审计 | P0端点安全后深度审计 |
| **python-backend** | jiatastic/open-python-skills@python-backend | 1.7K | Python后端模式 | 补充通用Python最佳实践 |
| **web-scraping** | mindrally/skills@web-scraping | 3.9K | Web爬虫 | UEX/RSI数据抓取 |

### 中优先级

| 技能名 | 来源 | 安装量 | 用途 |
|--------|------|--------|------|
| **api-rate-limiting** | secondsky/claude-skills@api-rate-limiting | 308 | API限流设计 |
| **token-optimization** | claude-dev-suite/claude-dev-suite@token-optimization | 251 | Agent token优化 |
| **performance-optimizer** | daffy0208/ai-dev-standards@performance-optimizer | 196 | 通用性能优化 |
| **api-endpoint-builder** | sickn33/antigravity-awesome-skills@api-endpoint-builder | 165 | API端点构建 |

### 低优先级

| 技能名 | 来源 | 安装量 | 用途 |
|--------|------|--------|------|
| **fastapi** | martinholovsky/claude-skills-generator@fastapi | 214 | FastAPI模式（可能与已装重叠） |
| **vite** | display-design-studio/skills@vite | 24 | Vite配置 |
| **charting** | starchild-ai-agent/official-skills@charting | 4.4K | 图表（可能与chart-visualization重叠） |

---

## 五、技能使用记录

| 日期 | 技能 | 结果 |
|------|------|------|
| 2026-06-24 | impeccable | 全面审查(A11y 2/4, Perf 3/4, Theme 3/4, Responsive 2/4) |
| 2026-06-24 | react-performance-optimization | 发现零React.memo、1214内联sx |
| 2026-06-24 | python-fastapi-development | 发现端点无认证、无CORS、SSL禁用 |
| 2026-06-24 | frontend-design-ui-ux | 发现WCAG AA对比度不足、触摸目标<44px |
| 2026-06-24 | ui-ux-pro-max | 仅catalog入口，完整workflow需上游assets |
