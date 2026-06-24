# MiningGuidePanel 优化方案

> 目标：点击矿物卡片后展开详情，显示该矿物的所有刷新地点，按概率从高到低排序。

---

## 一、现状分析

### 当前 MiningGuidePanel（378 行）
- **矿物列表**：从 `mining-data.json` 加载 27 种矿物，展示不稳定性、阻力、爆炸倍率等属性
- **地点信息**：仅有一个硬编码的 `MINERAL_SYSTEM_MAP`，只区分"Stanton 矿区"和"Pyro 矿区"，无具体星球/卫星
- **交互**：纯卡片网格，点击无反应

### 问题
- 玩家想知道"哪里能挖到 Quantainium"，目前只能看到"Stanton 矿区"，信息量为零
- Wiki API 已有完整的矿物→地点→概率数据，未被利用

---

## 二、数据源

### Wiki API 端点
```
GET /api/locations/{slug}?include=resources
```

返回 `resources[]` 数组，每个元素结构：
```json
{
  "group_name": "SpaceShip_Mineables",
  "mining_type": "Ship Mining",
  "mining_type_sort_order": 0,
  "group_probability_percent": 6,
  "resources": [
    {
      "name": "Agricium (Ore)",
      "label": "Agricium",
      "tier": "uncommon",
      "signature": 3885,
      "relative_probability_percent": 28.5,
      "clustering": { "min_size": 3, "max_size": 5, "probability_percent": 100 },
      "materials": [
        {
          "name": "Agricium (Ore)",
          "instability": 350,
          "resistance": 0.5,
          "min_percentage": 24.3,
          "max_percentage": 74.3,
          "quality_min": 245,
          "quality_max": 1000
        }
      ]
    }
  ]
}
```

### 关键字段映射
| API 字段 | 含义 | 用途 |
|---|---|---|
| `mining_type` | Ship Mining / Vehicle Mining / FPS Mining | 分类标签 |
| `group_probability_percent` | 该类矿物在该地点的出现概率 | 地点级概率 |
| `relative_probability_percent` | 该矿物在矿脉中的占比 | 矿物级概率，排序依据 |
| `tier` | common / uncommon / rare / legendary | 稀有度标签 |
| `clustering.min_size / max_size` | 矿簇大小范围 | 矿簇信息 |
| `signature` | 扫描签名强度 | 扫描辅助 |

### 需要遍历的地点（Stanton 系统）
Wiki API 返回 **96 个有资源的地点**，包含：
- **4 大行星**：Hurston, Crusader, ArcCorp, microTech
- **12+ 卫星**：Aberdeen, Arial, Calliope, Cellin, Clio, Daymar, Ita, Lyria, Magda, Microtech moons, Wala 等
- **拉格朗日点**：CRU L1-L5, HUR L1-L5, ARC L1-L5, MIC L1-L5
- **小行星带**：Yela Asteroid Belt 等

仅需遍历 Planet + Moon 类型（~20 个），拉格朗日点和小行星带可选（资源较少）。

---

## 三、实现方案

### Phase 1：数据同步脚本（新增）

**新建文件**：`scripts/sync-mining-locations.js`

**功能**：
1. 遍历 Stanton 系统所有 Planet/Moon/Asteroid 类型且 `has_resources=true` 的地点（约 20-30 个）
2. 对每个地点调用 `/api/locations/{slug}?include=resources`
3. 提取 `resources[]` 中的矿物数据，构建**矿物→地点反向索引**
4. 输出 `frontend/public/data/mining-locations.json`

**输出格式**：
```json
{
  "generated_at": "2026-06-23T02:00:00Z",
  "source": "Star Citizen Wiki API",
  "version": "4.8.2-LIVE.12030094",
  "minerals": {
    "Agricium": {
      "name": "Agricium",
      "name_zh": "银灰矿",
      "locations": [
        {
          "location": "Daymar",
          "location_zh": "戴马尔",
          "parent": "Crusader",
          "parent_zh": "十字军",
          "type": "Moon",
          "mining_type": "Ship Mining",
          "group_probability_percent": 6,
          "relative_probability_percent": 28.5,
          "tier": "uncommon",
          "signature": 3885,
          "cluster_size": "3-5",
          "cluster_probability_percent": 100,
          "quality_range": "245-1000",
          "instability": 350,
          "resistance": 0.5
        },
        // ... 其他地点
      ]
    },
    // ... 其他矿物
  }
}
```

**限速策略**：Wiki API 限制 60 req/min/IP。20-30 个地点，每次 1 请求，约 30 秒完成。脚本内置 2 秒间隔即可。

**翻译**：矿物中文名从 `paratranz-cache.json` 映射；地点中文名可从 Wiki API 的 `description` 提取或手动维护一个 Stanton 地点翻译表（约 20 个条目，可硬编码）。

---

### Phase 2：前端组件改造

#### 2.1 新增 `MineralDetailDialog` 组件

**新建文件**：`frontend/src/components/MineralDetailDialog.jsx`

**交互逻辑**：
- 点击 `MineralCard` → 打开 `MineralDetailDialog`（MUI Dialog，全屏移动端，桌面端居中 max-width=600px）
- Dialog 内容分 3 个区块

**区块 1：矿物概况（顶部）**
```
┌─────────────────────────────────────┐
│  银灰矿 (Agricium)        [困难]    │
│  Ship Mining · Uncommon             │
│  价格: xxx aUEC/SCU                 │
└─────────────────────────────────────┘
```

**区块 2：采矿参数（中部，复用现有 StatRow）**
- 不稳定性 / 阻力 / 最佳窗口 / 爆炸倍率 / 聚簇系数
- 与现有卡片相同的进度条样式

**区块 3：刷新地点列表（核心，底部）**
```
┌─────────────────────────────────────┐
│  刷新地点 (12)                      │
│  ┌─────────────────────────────────┐│
│  │ 🟢 Daymar (Crusader)     28.5% ││  ← 按 relative_probability 降序
│  │    Ship Mining · 矿簇 3-5       ││
│  │    品质 245-1000 · 签名 3885    ││
│  ├─────────────────────────────────┤│
│  │ 🟢 Cellin (Crusader)     24.2% ││
│  │    Ship Mining · 矿簇 4-6       ││
│  │    品质 201-800 · 签名 4100     ││
│  ├─────────────────────────────────┤│
│  │ ...                             ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

每条地点卡片展示：
- **地点名称** + 所属行星
- **采矿类型**（Ship / Vehicle / FPS）
- **占比**（relative_probability_percent）—— 排序依据
- **矿簇大小**（cluster_size）
- **品质范围**（quality_range）
- **签名强度**（signature）

**筛选/分组**：
- 按 `mining_type` 分组：Ship Mining / Vehicle Mining / FPS Mining，用 Tab 或 Collapse 切换
- 每组内按 `relative_probability_percent` 降序排列

#### 2.2 修改现有 `MineralCard`

**改动最小化**：
- 给 `MineralCard` 添加 `onClick` → 打开 `MineralDetailDialog`
- 添加 hover cursor: pointer
- 不改变卡片现有布局

#### 2.3 修改 `MiningGuidePanel`

**数据加载**：
- 新增 `useEffect` 加载 `/data/mining-locations.json`
- 通过 `mineral.rawName` 或 `mineral.name` 匹配地点数据

**数据传递**：
- 将 `miningLocations[mineral.name]` 作为 prop 传给 `MineralDetailDialog`

---

## 四、文件清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `scripts/sync-mining-locations.js` | **新增** | Wiki API 地点数据同步脚本 |
| `frontend/public/data/mining-locations.json` | **新增** | 矿物→地点反向索引数据 |
| `frontend/src/components/MineralDetailDialog.jsx` | **新增** | 矿物详情弹窗组件 |
| `frontend/src/components/MiningGuidePanel.jsx` | **修改** | 加载地点数据 + 卡片点击事件 |

---

## 五、设计规范

遵循现有深空金色主题：
- Dialog 背景：`rgba(3,12,25,0.98)`
- 强调色：`#c9a227`
- 成功色（高概率）：`#00ddaa`
- 警告色（低概率）：`#ff6644`
- 边框：`rgba(201,162,39,0.15)`
- 字体：Orbitron（数字）/ Noto Sans SC（中文）/ Rajdhani（英文）

概率颜色分级：
- `≥20%` → 绿色 `#00ddaa`（常见）
- `5%-20%` → 金色 `#c9a227`（中等）
- `<5%` → 红色 `#ff6644`（稀有）

---

## 六、执行顺序

1. **编写同步脚本** `scripts/sync-mining-locations.js`
2. **运行脚本** 生成 `mining-locations.json`
3. **创建** `MineralDetailDialog.jsx`
4. **修改** `MiningGuidePanel.jsx`（数据加载 + 卡片点击）
5. **构建验证** `npm run build`
6. **本地 commit**（不 push）

---

## 七、预估工作量

| 阶段 | 时间 |
|---|---|
| 同步脚本 | 15 min |
| 数据生成 | 5 min（API 调用） |
| MineralDetailDialog | 30 min |
| MiningGuidePanel 改造 | 15 min |
| 测试 + 修复 | 15 min |
| **合计** | **~80 min** |
