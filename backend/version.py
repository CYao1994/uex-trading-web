"""
UEX Trade Navigator - Version
Single source of truth for the application version.
Update this when making changes to the application.
"""

VERSION = "3.2.0"

# Changelog (displayed in app):
CHANGELOG = [
    {
        "version": "3.2.0",
        "date": "2025-05-26",
        "changes": [
            "修复：Cloudflare Pages 部署后 UI 闪烁问题（维护遮罩不再卸载整个应用）",
            "修复：后端健康检测增加防抖逻辑，避免短暂网络波动导致闪烁",
            "战争债券：物品显示中文名称+英文副标题",
            "战争债券：每个物品显示对应图片",
            "战争债券：移除单个物品的RSI链接，新增统一RSI商店入口按钮",
            "战争债券：新增分类 — 组合包、游戏装备、涂装",
            "战争债券：智能分类（含'plus/kit/module'等关键词自动归类）",
        ],
    },
    {
        "version": "3.1.0",
        "date": "2025-05-25",
        "changes": [
            "架构升级：前后端分离部署（Cloudflare Pages + Railway）",
            "新增：GitHub Actions 自动暂停/恢复 Railway（02:00-10:00 北京时间）",
            "新增：后端维护模式（暂停期间前端显示维护提示）",
            "后端 API 跨域支持（CORS）",
            "节省 Railway 免费时长：16小时/天 → 480小时/月",
        ],
    },
    {
        "version": "3.0.0",
        "date": "2025-05-25",
        "changes": [
            "新增：战争债券信息模块（CCU升级包+单船分类展示）",
            "移除：价格查询模块和进货路线模块",
            "战争债券数据来自starnotifier.com实时爬取",
            "每个商品含RSI商店跳转链接",
        ],
    },
    {
        "version": "2.1.0",
        "date": "2025-05-25",
        "changes": [
            "新增：版本更新公告功能（点击版本号查看）",
            "新增：货物清单中已选货物可编辑SCU数量",
        ],
    },
    {
        "version": "2.0.0",
        "date": "2025-05-24",
        "changes": [
            "全面UI重构：星际公民HUD主题",
            "斜切面板、扫描线动画、量子跃迁加载",
            "HUD网格背景、暗角效果",
        ],
    },
    {
        "version": "1.3.0",
        "date": "2025-05-24",
        "changes": [
            "新增SUS2025舰队品牌标识",
            "Navbar和Footer显示舰队Logo和名称",
        ],
    },
    {
        "version": "1.2.1",
        "date": "2025-05-23",
        "changes": [
            "修复价格查询面板选择商品后无响应的Bug",
            "修复Autocomplete受控模式冲突问题",
        ],
    },
    {
        "version": "1.2.0",
        "date": "2025-05-23",
        "changes": [
            "修复规划路线500错误（空值星球字段）",
            "过滤掉无价格数据的PLATINUM BAY终端",
        ],
    },
    {
        "version": "1.1.0",
        "date": "2025-05-22",
        "changes": [
            "新增商品价格查询功能（PricePanel）",
            "支持收购价/出售价双Tab切换",
            "星级评级显示",
        ],
    },
    {
        "version": "1.0.0",
        "date": "2025-05-21",
        "changes": [
            "首次发布：清仓路线规划",
            "中文站名映射",
            "Railway部署上线",
        ],
    },
]
