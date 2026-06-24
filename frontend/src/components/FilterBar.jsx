import { Box, Typography, Chip } from '@mui/material';
import { ShoppingCart, FilterList, SortByAlpha, AttachMoney, CompareArrows } from '@mui/icons-material';

const SORT_MODES = [
  { key: 'name', label: '名称', icon: <SortByAlpha sx={{ fontSize: 14 }} /> },
  { key: 'price', label: '价格', icon: <AttachMoney sx={{ fontSize: 14 }} /> },
  { key: 'size', label: '尺寸', icon: <FilterList sx={{ fontSize: 14 }} /> },
  { key: 'dps', label: 'DPS', icon: <SortByAlpha sx={{ fontSize: 14 }} /> },
];

const filterChipSx = (active, _color) => ({
  fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
  fontSize: '0.7rem',
  height: 32,
  background: active ? 'linear-gradient(135deg, rgba(201, 162, 39, 0.15), rgba(154, 122, 26, 0.1))' : 'rgba(0, 10, 20, 0.5)',
  border: `1px solid ${active ? 'rgba(201, 162, 39, 0.35)' : 'rgba(255,255,255,0.08)'}`,
  color: active ? '#c9a227' : 'rgba(255,255,255,0.4)',
  clipPath: active ? 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)' : 'none',
});

function FilterBar({
  buyableFilter, onToggleBuyable,
  filterConfig,
  availableSizes, sizeFilter, onSizeFilterChange,
  hasWeaponTypes, availableWeaponCategories, weaponTypeFilter, onWeaponTypeFilterChange,
  hasClasses, availableClasses, classFilter, onClassFilterChange,
  hasGrades, availableGrades, gradeFilter, onGradeFilterChange,
  sortMode, onSortModeChange,
  compareMode, onToggleCompare,
  classColorMap, gradeColorMap,
  accentColor,
}) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5, alignItems: 'center' }}>
      {/* 可购买筛选 */}
      <Chip
        icon={<ShoppingCart sx={{ fontSize: 14 }} />}
        label="可购买"
        size="small"
        onClick={onToggleBuyable}
        sx={{
          ...filterChipSx(buyableFilter, '#00ddaa'),
          '& .MuiChip-icon': { color: buyableFilter ? '#00ddaa' : 'rgba(255,255,255,0.3)' },
        }}
      />

      {/* 尺寸筛选 */}
      {filterConfig.enableSizeFilter && availableSizes.length > 1 && (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
            尺寸:
          </Typography>
          <Chip label="全部" size="small" onClick={() => onSizeFilterChange('')} sx={filterChipSx(sizeFilter === '')} />
          {availableSizes.map(s => (
            <Chip key={s} label={`S${s}`} size="small" onClick={() => onSizeFilterChange(sizeFilter === s ? '' : s)}
              sx={{ ...filterChipSx(sizeFilter === s), fontFamily: '"Orbitron",sans-serif', fontSize: '0.65rem' }} />
          ))}
        </Box>
      )}

      {/* 武器类型筛选 */}
      {hasWeaponTypes && (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
            种类:
          </Typography>
          {availableWeaponCategories.map(type => (
            <Chip key={type} label={type} size="small" onClick={() => onWeaponTypeFilterChange(weaponTypeFilter === type ? '' : type)}
              sx={filterChipSx(weaponTypeFilter === type)} />
          ))}
        </Box>
      )}

      {/* 分类筛选 */}
      {hasClasses && (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
            分类:
          </Typography>
          {availableClasses.map(cls => (
            <Chip key={cls} label={cls} size="small" onClick={() => onClassFilterChange(classFilter === cls ? '' : cls)}
              sx={filterChipSx(classFilter === cls, classColorMap[cls])} />
          ))}
        </Box>
      )}

      {/* 品级筛选 */}
      {hasGrades && (
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
            品级:
          </Typography>
          {availableGrades.map(g => (
            <Chip key={g} label={`${g}级`} size="small" onClick={() => onGradeFilterChange(gradeFilter === g ? '' : g)}
              sx={{ ...filterChipSx(gradeFilter === g, gradeColorMap[g]), fontFamily: '"Orbitron","Noto Sans SC",sans-serif', fontSize: '0.65rem' }} />
          ))}
        </Box>
      )}

      {/* 排序模式 */}
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', ml: 'auto' }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontFamily: '"Rajdhani",sans-serif', mr: 0.5 }}>
          排序:
        </Typography>
        {SORT_MODES.map(mode => (
          <Chip
            key={mode.key}
            icon={mode.icon}
            label={mode.label}
            size="small"
            onClick={() => onSortModeChange(mode.key)}
            sx={{
              ...filterChipSx(sortMode === mode.key),
              '& .MuiChip-icon': { fontSize: 14, color: sortMode === mode.key ? accentColor : 'rgba(255,255,255,0.3)' },
            }}
          />
        ))}
        <Chip
          icon={<CompareArrows sx={{ fontSize: 14 }} />}
          label="对比"
          size="small"
          onClick={onToggleCompare}
          sx={{
            ...filterChipSx(compareMode, '#00ddaa'),
            '& .MuiChip-icon': { fontSize: 14, color: compareMode ? '#00ddaa' : 'rgba(255,255,255,0.3)' },
          }}
        />
      </Box>
    </Box>
  );
}

export default FilterBar;
