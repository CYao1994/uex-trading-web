# ASTRAL LANCE 开发指南

> 最后更新：2026-06-24 | 供 MiMo 在新设备上快速上手

---

## 项目概览

ASTRAL LANCE（星槊）是星际公民交易导航工具，帮助玩家查询商品价格、规划贸易路线。

- **GitHub**: https://github.com/CYao1994/uex-trading-web
- **域名**: sus2025.com / astrallance.com
- **技术栈**: React 19 + Vite 8 + MUI 9 + Tailwind CSS 4
- **后端**: Python FastAPI（EdgeOne Cloud Functions）
- **部署**: EdgeOne Pages（前端）+ EdgeOne 云函数（后端），push 到 main 分支自动构建
- **版本**: v3.29.0+

---

## 快速上手

```bash
# 1. 克隆仓库
git clone https://github.com/CYao1994/uex-trading-web.git
cd uex-trading-web

# 2. 安装依赖
cd frontend && npm install --legacy-peer-deps

# 3. 构建
npm run build

# 4. 本地开发
node ../serve.cjs  # 访问 http://localhost:3000

# 5. 运行测试
npm test
```

**⚠️ npm install 需要 npmmirror**：
```bash
npm config set registry https://registry.npmmirror.com
```

**⚠️ Git 推送问题**：Windows 上 GitHub 连接失败时执行：
```bash
git config --global http.sslBackend schannel
```

---

## 技术约束

| 项目 | 约束 |
|------|------|
| 编码 | UTF-8，脚本(.mjs/.cjs)纯 ASCII，中文放独立 JSON |
| 构建 | `cd frontend && npm run build` |
| Git | 每个任务单独 commit，`git push origin master:main` |
| 分支 | 本地 master → 远程 main |
| 数据 | 只追加字段，不删除原有数据 |
| API 限速 | Wiki API 60 req/min，脚本 sleep 1.1s |
| 翻译 | 统一用 ParaTranz（paratranz-cache.json），不用 Wiki 中文名 |
| 风格 | 深空金色主题 `rgba(3,12,25)` 背景，`#c9a227` 强调色 |
| 图片 | 使用外部 URL，不本地托管（舰船图片除外） |
| 大文件 | items-catalog/ship-loadouts/blueprints-catalog 用 JSON.parse 读取 |
| 每完成任务 | `npm run build` → `npm test` → commit → 下一个 |
| ⚠️ 推送 | 完成所有任务后不要 git push，等主人确认 |

---

## 数据来源

| 来源 | 用途 | API |
|------|------|-----|
| Wiki API | 舰船参数/组件/武器/蓝图 | api.star-citizen.wiki |
| RSI Ship Matrix API | 舰船列表和图片 | robertsspaceindustries.com/ship-matrix/index |
| UEX API | 购买/租船价格和地点 | api.uexcorp.space |
| ParaTranz | 中文翻译 | paratranz.cn（项目ID: 8340，token 在 scripts/ 中） |
| 游戏解包数据 | mining-data, ship-loadouts | scripts/ 目录 |

### Wiki API 关键端点
- 舰船详情: `GET /api/vehicles/{slug}`
- 组件: `GET /api/items?filter[type]=Cooler&page[size]=50`
- 武器: `GET /api/items?filter[type]=WeaponGun&page[size]=50`
- 蓝图: `GET /api/blueprints?page[number]=1&page[size]=50`（注意：用 page[number] 不用 links.next）
- 矿物: `GET /api/commodities?filter[kind]=mineable&filter[mineable]=true&filter[system]=Nyx+System,Pyro+System,Stanton+System`

### Wiki 图片
- 媒体域名: media.starcitizen.tools（被 Cloudflare 拦截，服务端无法直接访问）
- 替代方案: RSI Ship Matrix API `GET /ship-matrix/index` → `media[0].slug` → `media.robertsspaceindustries.com/{slug}/store_large.jpg`
- 舰船图片已下载到 `frontend/public/ships/`（193/196）

---

## 目录结构

```
uex-trading-web/
├── frontend/
│   ├── src/
│   │   ├── components/          # 所有 React 组件（无 panels 子目录）
│   │   ├── api/client.js        # API 客户端
│   │   ├── hooks/               # 自定义 hooks
│   │   └── utils/               # 工具函数
│   ├── public/data/             # 静态 JSON 数据文件
│   └── public/ships/            # 舰船图片（jpg/png）
├── scripts/                     # 数据同步脚本
├── cloud-functions/
│   ├── backend/                 # Python FastAPI 后端
│   └── api/                     # 副本（两个 data_mapper.py 必须同步更新）
├── edge-functions/api/          # EdgeOne KV 缓存
└── serve.cjs                    # 本地开发服务器
```

---

## 数据文件清单

| 文件 | 内容 | 数量 |
|------|------|------|
| wiki-vehicles.json | 舰船参数+载荷+定价 | 242 艘 |
| wiki-weapons.json | 武器数据+DPS+翻译 | 613 件 |
| wiki-items.json | 组件数据+翻译 | 692 件 |
| wiki-blueprints.json | 蓝图+材料+制作时间 | 1559 个 |
| mining-data.json | 采矿矿物+参数 | 33 种 |
| mining-locations.json | 矿物采集地点 | 47 地点 |
| ship-prices.json | UEX 舰船价格 | 128 艘 |
| ship-loadouts.json | 舰船默认配置 | — |
| items-catalog.json | UEX 组件目录 | — |
| ammo-params.json | 弹药参数 | — |
| paratranz-cache.json | 中文翻译缓存 | 20K+ 条 |
| ship-loadouts.json | 舰船装备配置 | — |
| shop-inventory-summary.json | 商店库存汇总 | — |

### 数据同步脚本

| 脚本 | 用途 | 命令 |
|------|------|------|
| sync-wiki-vehicles.mjs | Wiki 舰船列表同步 | `node scripts/sync-wiki-vehicles.mjs` |
| sync-wiki-vehicles-detail.mjs | Wiki 舰船详情（含载荷） | `node scripts/sync-wiki-vehicles-detail.mjs` |
| sync-wiki-vehicles-detail2.mjs | Wiki 舰船详情（武器/组件槽位） | `node scripts/sync-wiki-vehicles-detail2.mjs` |
| sync-wiki-items.mjs | Wiki 组件同步 | `node scripts/sync-wiki-items.mjs` |
| sync-wiki-weapons.mjs | Wiki 武器同步 | `node scripts/sync-wiki-weapons.mjs` |
| sync-wiki-blueprints.mjs | Wiki 蓝图同步 | `node scripts/sync-wiki-blueprints.mjs` |
| sync-mining-locations.js | Wiki 采矿地点同步 | `node scripts/sync-mining-locations.js` |
| cross-validate-wiki.mjs | Wiki 数据交叉验证 | `node scripts/cross-validate-wiki.mjs` |
| audit-items-catalog.mjs | 数据质量审计 | `node scripts/audit-items-catalog.mjs` |

---

## 已知问题与待优化

### 未解决问题
| 问题 | 优先级 | 说明 |
|------|--------|------|
| 武器/组件图片覆盖率低 | P1 | wiki-weapons 85%，wiki-items 94% |
| 蓝图翻译未完成 | P2 | 73.9% 覆盖率，407 条缺失 |
| Wiki 舰船 `is_production_ready` | P3 | API 返回 null，无法过滤未实装船 |
| UEX API 价格数据 | P2 | ship-prices.json 仅 50/128 艘有 AUEC 价格 |

### 代码审查发现的 WARNING（非阻塞）
- BlueprintPanel 使用 window.dispatchEvent 进行跨组件通信（脆弱但可用）
- ChainPanel 使用 loadAllVehicles() 的 a-z 查询 workaround
- EdgeOne KV 缓存层可能有过期问题

---

## Git 历史摘要

```
98dbd3e fix(mining): Nyx system minerals
880c134 fix(mining): MINERAL_SYSTEM_MAP Wiki key format
39ce229 fix(mining): Nyx system minerals added
51198d4 fix(mining): re-sync from correct Wiki URL
11d1e68 fix(mining): 铁钛矿 translation
8683d05 fix(mining): complete mineral list from Wiki
66d0f7f fix(weapons/items): re-sync from Wiki API
e7dd514 feat(ships): redesign with RSI API + Wiki loadout
dfc24d3 fix(ships): remove BIS ships + old webp files
1a68af9 feat(ships): complete 193/196 ship images via API
3e779b0 fix(wiki): vehicle images, quantum data
b93d59c fix: 12 code review issues
```

---

> 本文件由 MiMo 自动生成，供开发者在新设备上快速上手项目。
