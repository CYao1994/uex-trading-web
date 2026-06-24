import { Box, Typography, IconButton, Chip } from '@mui/material';
import { Close } from '@mui/icons-material';

function ItemDetailHeader({ item, displaySize, onClose, sfx }) {
  return (
    <Box sx={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      borderBottom: '1px solid rgba(201, 162, 39, 0.1)',
      pb: 1,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.15), rgba(154, 122, 26, 0.1))',
          border: '1px solid rgba(201, 162, 39, 0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          clipPath: 'polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)',
        }}>
          <Typography sx={{ color: '#c9a227', fontSize: '0.9rem', fontFamily: '"Orbitron",sans-serif' }}>
            {item.name_zh ? item.name_zh.charAt(0) : item.name.charAt(0)}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontFamily: '"Noto Sans SC","Orbitron",sans-serif', color: '#c9a227', fontWeight: 600, fontSize: '1rem' }}>
            {item.name_zh || item.name}
          </Typography>
        {item.name_zh && (
          <Typography sx={{ fontFamily: '"Rajdhani",sans-serif', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', mt: 0.15 }}>
            {item.name}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
            {item.category_zh}{item.item_type_zh ? ` · ${item.item_type_zh}` : ''}{displaySize ? ` · S${displaySize}` : ''} · {item.company_name_zh || item.company_name}
          </Typography>
          {item.item_class_zh && (
            <Chip label={item.item_class_zh} size="small" sx={{
              fontFamily: '"Noto Sans SC",sans-serif', fontSize: '0.6rem', height: 18,
              background: `${item.item_class_zh === '军用' ? '#ff4444' : item.item_class_zh === '民用' ? '#44aaff' : item.item_class_zh === '工业' ? '#ffaa00' : item.item_class_zh === '竞赛' ? '#aa66ff' : '#66ddaa'}15`,
              border: `1px solid ${item.item_class_zh === '军用' ? '#ff4444' : item.item_class_zh === '民用' ? '#44aaff' : item.item_class_zh === '工业' ? '#ffaa00' : item.item_class_zh === '竞赛' ? '#aa66ff' : '#66ddaa'}33`,
              color: item.item_class_zh === '军用' ? '#ff4444' : item.item_class_zh === '民用' ? '#44aaff' : item.item_class_zh === '工业' ? '#ffaa00' : item.item_class_zh === '竞赛' ? '#aa66ff' : '#66ddaa',
            }} />
          )}
          {item.grade && (
            <Chip label={`${item.grade}级`} size="small" sx={{
              fontFamily: '"Orbitron","Noto Sans SC",sans-serif', fontSize: '0.55rem', height: 18,
              background: `${item.grade === 'A' ? '#00ddaa' : item.grade === 'B' ? '#44aaff' : item.grade === 'C' ? '#ffaa00' : '#ff6644'}15`,
              border: `1px solid ${item.grade === 'A' ? '#00ddaa' : item.grade === 'B' ? '#44aaff' : item.grade === 'C' ? '#ffaa00' : '#ff6644'}33`,
              color: item.grade === 'A' ? '#00ddaa' : item.grade === 'B' ? '#44aaff' : item.grade === 'C' ? '#ffaa00' : '#ff6644',
            }} />
          )}
        </Box>
      </Box>
      </Box>
      <IconButton onClick={() => { sfx('detail_close'); onClose(); }} sx={{ color: 'rgba(255,255,255,0.5)' }}>
        <Close />
      </IconButton>
    </Box>
  );
}

export default ItemDetailHeader;
