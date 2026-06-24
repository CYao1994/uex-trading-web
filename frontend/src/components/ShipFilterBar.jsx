import { Box, TextField, InputAdornment, Chip, Select, MenuItem, FormControl } from '@mui/material';
import { Search, SortByAlpha, Inventory2, AttachMoney, CompareArrows } from '@mui/icons-material';

const ROLE_ZH = {
  'Heavy Fighter': '重型战斗机', 'Light Fighter': '轻型战斗机', 'Medium Fighter': '中型战斗机',
  'Heavy Freight': '重型运输', 'Medium Freight': '中型运输', 'Light Freight': '轻型运输',
  'Expedition': '探索', 'Pathfinder': '探路者', 'Racing': '竞速',
  'Medical': '医疗', 'Interdiction': '截击', 'Stealth Fighter': '隐形战斗机',
  'Dropship': '运输舰', 'Heavy Gunship': '重型炮艇', 'Gunship': '炮艇',
  'Frigate': '护卫舰', 'Luxury Touring': '豪华巡游', 'Snub Fighter': '子战斗机',
  'Light Salvage': '轻型打捞', 'Heavy Salvage': '重型打捞',
  'Interceptor': '拦截机', 'Stealth Bomber': '隐形轰炸', 'Bomber': '轰炸机',
  'Heavy Bomber': '重型轰炸', 'Starter': '入门', 'Modular': '模块化',
  'Light Mining': '轻型采矿', 'Medium Mining': '中型采矿',
  'Medium Salvage': '中型打捞', 'Passenger': '客运', 'Recovery': '救援',
  'Generalist': '多用途', 'Transport': '运输', 'Medium Data': '中型数据',
  'Heavy Dropship': '重型运输舰', 'Carrier': '航母', 'Reporting': '侦察',
  'Light Science': '轻型科研', 'Light Refueling': '轻型加油',
  'Heavy Refueling': '重型加油', 'Touring': '巡游', 'Corvette': '驱逐舰',
  'Destroyer': '歼灭舰',
};

function ShipFilterBar({
  searchQuery, onSearchChange,
  roleFilter, onRoleFilterChange, roles,
  sizeFilter, onSizeFilterChange,
  mfrFilter, onMfrFilterChange, manufacturers,
  sortBy, onSortChange,
  compareMode, onCompareModeToggle,
}) {
  return (
    <>
      <TextField
        fullWidth size="small" placeholder="搜索飞船名称（中/英）、制造商..."
        value={searchQuery} onChange={e => onSearchChange(e.target.value)}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search sx={{ color: 'rgba(201,162,39,0.4)' }} /></InputAdornment>,
        }}
        sx={{ '& .MuiOutlinedInput-root': { color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' } }}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        <Chip label="全部" size="small" onClick={() => onRoleFilterChange('')}
          sx={{ background: !roleFilter ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,162,39,0.2)', color: !roleFilter ? '#c9a227' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }} />
        {roles.map(([label, count]) => (
          <Chip key={label} label={`${ROLE_ZH[label] || label} (${count})`} size="small"
            onClick={() => onRoleFilterChange(roleFilter === label ? '' : label)}
            sx={{
              background: roleFilter === label ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${roleFilter === label ? 'rgba(201,162,39,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: roleFilter === label ? '#c9a227' : 'rgba(255,255,255,0.5)',
              fontSize: '0.65rem',
            }} />
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {[
            { key: '', label: '全部尺寸' },
            { key: 'small', label: '小型 (S1-S2)' },
            { key: 'medium', label: '中型 (S3)' },
            { key: 'large', label: '大型 (S4+)' },
          ].map(s => (
            <Chip key={s.key} label={s.label} size="small"
              onClick={() => onSizeFilterChange(sizeFilter === s.key ? '' : s.key)}
              sx={{
                background: sizeFilter === s.key ? 'rgba(0,221,170,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${sizeFilter === s.key ? 'rgba(0,221,170,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: sizeFilter === s.key ? '#00ddaa' : 'rgba(255,255,255,0.5)',
                fontSize: '0.65rem',
              }} />
          ))}
        </Box>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={mfrFilter} onChange={e => onMfrFilterChange(e.target.value)}
            displayEmpty
            sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(201,162,39,0.3)' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(201,162,39,0.5)' } }}>
            <MenuItem value="" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>全部制造商</MenuItem>
            {manufacturers.map(([name, count]) => (
              <MenuItem key={name} value={name} sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>{name} ({count})</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Chip icon={<SortByAlpha sx={{ fontSize: 12 }} />} label="名称" size="small" onClick={() => onSortChange('name')}
            sx={{ background: sortBy === 'name' ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${sortBy === 'name' ? 'rgba(201,162,39,0.3)' : 'rgba(255,255,255,0.08)'}`, color: sortBy === 'name' ? '#c9a227' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem', '& .MuiChip-icon': { color: 'inherit' } }} />
          <Chip icon={<Inventory2 sx={{ fontSize: 12 }} />} label="SCU" size="small" onClick={() => onSortChange('scu')}
            sx={{ background: sortBy === 'scu' ? 'rgba(0,221,170,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${sortBy === 'scu' ? 'rgba(0,221,170,0.3)' : 'rgba(255,255,255,0.08)'}`, color: sortBy === 'scu' ? '#00ddaa' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem', '& .MuiChip-icon': { color: 'inherit' } }} />
          <Chip icon={<AttachMoney sx={{ fontSize: 12 }} />} label="价格" size="small" onClick={() => onSortChange('price')}
            sx={{ background: sortBy === 'price' ? 'rgba(255,170,0,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${sortBy === 'price' ? 'rgba(255,170,0,0.3)' : 'rgba(255,255,255,0.08)'}`, color: sortBy === 'price' ? '#ffaa00' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem', '& .MuiChip-icon': { color: 'inherit' } }} />
        </Box>

        <Chip
          icon={<CompareArrows sx={{ fontSize: 14 }} />}
          label="对比模式"
          size="small"
          onClick={onCompareModeToggle}
          sx={{
            background: compareMode ? 'rgba(0,221,170,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${compareMode ? 'rgba(0,221,170,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: compareMode ? '#00ddaa' : 'rgba(255,255,255,0.5)',
            fontSize: '0.65rem',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      </Box>
    </>
  );
}

export default ShipFilterBar;
