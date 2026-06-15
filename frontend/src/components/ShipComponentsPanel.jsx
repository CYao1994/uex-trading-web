// ShipComponentsPanel.jsx - 飞船组件数据库面板
import ShipItemsPanel from './ShipItemsPanel';

// 根据 UEX API 分类配置
// section=Systems: 护盾发生器/发电机/量子引擎/冷却器
// section=Utility: 牵引光束/打捞光束/采矿激光
// section=Avionics: 雷达/飞行模块
// section=Propulsion: 量子驱动器
const COMPONENT_CATEGORIES = [
  // Systems
  { id: 23, label: '护盾发生器', color: '#44bbff' },
  { id: 21, label: '发电机', color: '#ffaa00' },
  { id: 22, label: '量子引擎', color: '#aa66ff' },
  { id: 19, label: '冷却器', color: '#00ddaa' },
  // Avionics
  { id: 83, label: '雷达', color: '#77bbff' },
  { id: 82, label: '飞行模块', color: '#99aacc' },
  // Utility - Mining
  { id: 29, label: '采矿激光器', color: '#ff6644' },
  { id: 30, label: '采矿设备', color: '#ff8866' },
  // Utility - Other
  { id: 67, label: '牵引光束', color: '#66ddff' },
  { id: 110, label: '打捞光束', color: '#cc88aa' },
  { id: 26, label: '油箱', color: '#66aaff' },
  { id: 25, label: '对接环', color: '#88cc88' },
  { id: 31, label: '跳跃模块', color: '#bbaacc' },
  // Propulsion
  { id: 86, label: '量子驱动器', color: '#bb88ff' },
];

const COMPONENT_FILTER_CONFIG = {
  enableSizeFilter: true,
  enableWeaponTypeFilter: false,
  enableClassFilter: true,   // 启用分类筛选（军用/民用/工业/竞赛/隐身）
  enableGradeFilter: true,   // 启用品级筛选（A/B/C/D）
};

export default function ShipComponentsPanel() {
  return (
    <ShipItemsPanel
      categories={COMPONENT_CATEGORIES}
      itemTypeLabel="组件"
      accentColor="#44bbff"
      filterConfig={COMPONENT_FILTER_CONFIG}
    />
  );
}
