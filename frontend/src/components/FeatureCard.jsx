import { Box, Typography } from '@mui/material';

function FeatureCard({ feature, index, onTabChange, sfx }) {
  return (
    <Box
      onClick={() => { sfx('page_transition'); onTabChange(feature.tab); }}
      onMouseEnter={() => sfx('button_hover')}
      sx={{
        p: { xs: 1.5, sm: 2 },
        background: `linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(5, 10, 20, 0.95) 100%)`,
        border: `1px solid ${feature.color}20`,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        opacity: 0,
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay: `${index * 0.06}s`,
        clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${feature.color}50, transparent)`,
        },
        '&:hover': {
          transform: 'translateY(-2px)',
          border: `1px solid ${feature.color}60`,
          boxShadow: `0 4px 16px ${feature.color}25`,
          '& .feature-icon': {
            transform: 'scale(1.05)',
            background: `${feature.color}15`,
            borderColor: `${feature.color}40`,
          },
        },
      }}
    >
      <Box
        className="feature-icon"
        sx={{
          width: 36,
          height: 36,
          background: 'rgba(201, 162, 39, 0.05)',
          border: '1px solid rgba(201, 162, 39, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1,
          transition: 'all 0.3s ease',
        }}
      >
        <Box sx={{ color: feature.color }}>
          {feature.icon}
        </Box>
      </Box>
      <Typography sx={{
        fontFamily: '"Orbitron", sans-serif',
        fontSize: { xs: '0.65rem', sm: '0.7rem' },
        fontWeight: 600,
        color: feature.color,
        mb: 0.2,
        lineHeight: 1.2,
      }}>
        {feature.title}
      </Typography>
      <Typography sx={{
        fontFamily: '"Noto Sans SC", sans-serif',
        fontSize: { xs: '0.6rem', sm: '0.65rem' },
        color: 'rgba(255, 255, 255, 0.3)',
        lineHeight: 1.3,
      }}>
        {feature.desc}
      </Typography>
    </Box>
  );
}

export default FeatureCard;
