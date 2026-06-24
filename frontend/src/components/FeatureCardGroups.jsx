import { Box, Typography } from '@mui/material';
import { ShoppingCart, Link, MilitaryTech, Build, GpsFixed, SwapHoriz, PrecisionManufacturing, DirectionsBoat, Science } from '@mui/icons-material';
import FeatureCard from './FeatureCard';

const FEATURES = [
  {
    icon: <SwapHoriz sx={{ fontSize: 26 }} />,
    title: '清仓路线',
    desc: '规划最优卖出路线',
    tab: 'sell',
    color: '#c9a227',
    group: 'trade',
  },
  {
    icon: <ShoppingCart sx={{ fontSize: 26 }} />,
    title: '进货路线',
    desc: '找到最便宜的购买地点',
    tab: 'buy',
    color: '#44aaff',
    group: 'trade',
  },
  {
    icon: <Link sx={{ fontSize: 26 }} />,
    title: '链式交易',
    desc: '自动规划多段连续交易',
    tab: 'chain',
    color: '#00ddaa',
    group: 'trade',
  },
  {
    icon: <DirectionsBoat sx={{ fontSize: 26 }} />,
    title: '舰船数据库',
    desc: '飞船参数、价格与出厂配置',
    tab: 'ships',
    color: '#c9a227',
    group: 'data',
  },
  {
    icon: <Build sx={{ fontSize: 26 }} />,
    title: '飞船组件',
    desc: '护盾、发电机、量子引擎',
    tab: 'ship_components',
    color: '#66bbff',
    group: 'data',
  },
  {
    icon: <GpsFixed sx={{ fontSize: 26 }} />,
    title: '飞船武器',
    desc: '火炮、导弹、炮塔数据库',
    tab: 'ship_weapons',
    color: '#ff6644',
    group: 'data',
  },
  {
    icon: <PrecisionManufacturing sx={{ fontSize: 26 }} />,
    title: '制造蓝图',
    desc: '配方、材料与获取途径',
    tab: 'blueprint',
    color: '#aa66ff',
    group: 'data',
  },
  {
    icon: <Science sx={{ fontSize: 26 }} />,
    title: '采矿指南',
    desc: '矿物属性与开采难度',
    tab: 'mining_guide',
    color: '#c9a227',
    group: 'data',
  },
  {
    icon: <MilitaryTech sx={{ fontSize: 26 }} />,
    title: '战争债券',
    desc: 'CCU升级包和飞船优惠',
    tab: 'warbond',
    color: '#d4760a',
    group: 'info',
  },
];

const GROUP_LABELS = {
  trade: '交易路线',
  data: '数据库',
  info: '信息',
};

function FeatureCardGroups({ onTabChange, sfx }) {
  return (
    <>
      <Typography sx={{
        fontFamily: '"Orbitron", sans-serif',
        fontSize: '0.6rem',
        color: 'rgba(201, 162, 39, 0.35)',
        letterSpacing: '0.15em',
        mb: 1,
        ml: 0.5,
      }}>
        {GROUP_LABELS.trade}
      </Typography>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(3, 1fr)' },
        gap: 1.2,
        mb: 2.5,
      }}>
        {FEATURES.filter(f => f.group === 'trade').map((feature, index) => (
          <FeatureCard key={feature.tab} feature={feature} index={index} onTabChange={onTabChange} sfx={sfx} />
        ))}
      </Box>

      <Typography sx={{
        fontFamily: '"Orbitron", sans-serif',
        fontSize: '0.6rem',
        color: 'rgba(201, 162, 39, 0.35)',
        letterSpacing: '0.15em',
        mb: 1,
        ml: 0.5,
      }}>
        {GROUP_LABELS.data}
      </Typography>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
        gap: 1.2,
        mb: 2.5,
      }}>
        {FEATURES.filter(f => f.group === 'data').map((feature, index) => (
          <FeatureCard key={feature.tab} feature={feature} index={index + 3} onTabChange={onTabChange} sfx={sfx} />
        ))}
      </Box>

      <Typography sx={{
        fontFamily: '"Orbitron", sans-serif',
        fontSize: '0.6rem',
        color: 'rgba(201, 162, 39, 0.35)',
        letterSpacing: '0.15em',
        mb: 1,
        ml: 0.5,
      }}>
        {GROUP_LABELS.info}
      </Typography>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
        gap: 1.2,
      }}>
        {FEATURES.filter(f => f.group === 'info').map((feature, index) => (
          <FeatureCard key={feature.tab} feature={feature} index={index + 7} onTabChange={onTabChange} sfx={sfx} />
        ))}
      </Box>
    </>
  );
}

export default FeatureCardGroups;
