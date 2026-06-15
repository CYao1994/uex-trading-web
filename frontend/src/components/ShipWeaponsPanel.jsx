// ShipWeaponsPanel.jsx - 飞船武器数据库面板
import ShipItemsPanel from './ShipItemsPanel';

// 根据 UEX API 分类配置
// section=Vehicle Weapons: 火炮/导弹/导弹架/炮塔/炸弹/点防御炮
const WEAPON_CATEGORIES = [
  { id: 32, label: '火炮', color: '#ff6644' },
  { id: 34, label: '导弹', color: '#ffaa44' },
  { id: 33, label: '导弹架', color: '#ff8844' },
  { id: 35, label: '炮塔', color: '#ff4466' },
  { id: 70, label: '炸弹', color: '#ff4444' },
  { id: 79, label: '点防御炮', color: '#ff6688' },
];

const WEAPON_FILTER_CONFIG = {
  enableSizeFilter: true,
  enableWeaponTypeFilter: true,   // 启用 catalog item.weapon_category 武器种类筛选
  enableClassFilter: false,
  enableGradeFilter: false,
};

export default function ShipWeaponsPanel() {
  return (
    <ShipItemsPanel
      categories={WEAPON_CATEGORIES}
      itemTypeLabel="武器"
      accentColor="#8b2500"
      filterConfig={WEAPON_FILTER_CONFIG}
    />
  );
}
