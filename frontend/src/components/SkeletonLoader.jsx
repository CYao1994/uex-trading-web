// SkeletonLoader.jsx - 骨架屏加载组件
import { Box, Skeleton } from '@mui/material';

// 卡片骨架
export function CardSkeleton({ count = 6 }) {
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
      gap: 1.5,
    }}>
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          className="card-stagger"
          sx={{
            p: 1.5,
            background: 'rgba(3, 12, 25, 0.9)',
            border: '1px solid rgba(201, 162, 39, 0.08)',
            clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
            animationDelay: `${i * 0.08}s`,
          }}
        >
          <Skeleton
            variant="text"
            sx={{ bgcolor: 'rgba(201, 162, 39, 0.08)', width: '70%', height: 20 }}
          />
          <Skeleton
            variant="text"
            sx={{ bgcolor: 'rgba(201, 162, 39, 0.05)', width: '50%', height: 14, mb: 1 }}
          />
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
            <Skeleton variant="rounded" sx={{ bgcolor: 'rgba(201, 162, 39, 0.06)', width: 32, height: 18, borderRadius: '3px' }} />
            <Skeleton variant="rounded" sx={{ bgcolor: 'rgba(201, 162, 39, 0.06)', width: 40, height: 18, borderRadius: '3px' }} />
          </Box>
          <Skeleton
            variant="text"
            sx={{ bgcolor: 'rgba(201, 162, 39, 0.05)', width: '40%', height: 12 }}
          />
          <Skeleton
            variant="text"
            sx={{ bgcolor: 'rgba(255, 170, 0, 0.1)', width: '60%', height: 24, mt: 0.5 }}
          />
        </Box>
      ))}
    </Box>
  );
}

// 表格骨架
export function TableSkeleton({ rows = 8 }) {
  return (
    <Box sx={{ width: '100%' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Box
          key={i}
          className="card-stagger"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 1.5,
            px: 2,
            borderBottom: '1px solid rgba(201, 162, 39, 0.05)',
            animationDelay: `${i * 0.05}s`,
          }}
        >
          <Skeleton variant="rounded" sx={{ bgcolor: 'rgba(201, 162, 39, 0.08)', width: 40, height: 40, borderRadius: '4px' }} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" sx={{ bgcolor: 'rgba(201, 162, 39, 0.08)', width: '60%', height: 18 }} />
            <Skeleton variant="text" sx={{ bgcolor: 'rgba(201, 162, 39, 0.05)', width: '40%', height: 14 }} />
          </Box>
          <Skeleton variant="text" sx={{ bgcolor: 'rgba(255, 170, 0, 0.1)', width: 80, height: 20 }} />
        </Box>
      ))}
    </Box>
  );
}

// 面板骨架
export function PanelSkeleton() {
  return (
    <Box sx={{ p: 2.5 }}>
      <Skeleton variant="text" sx={{ bgcolor: 'rgba(201, 162, 39, 0.1)', width: '40%', height: 28, mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} variant="rounded" sx={{ bgcolor: 'rgba(201, 162, 39, 0.06)', width: 60, height: 28, borderRadius: '14px' }} />
        ))}
      </Box>
      <Skeleton variant="rounded" sx={{ bgcolor: 'rgba(201, 162, 39, 0.06)', width: '100%', height: 40, mb: 2, borderRadius: '4px' }} />
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} variant="rounded" sx={{ bgcolor: 'rgba(201, 162, 39, 0.06)', width: 50, height: 24, borderRadius: '12px' }} />
        ))}
      </Box>
      <CardSkeleton count={4} />
    </Box>
  );
}

// 结果面板骨架
export function ResultSkeleton() {
  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Skeleton variant="rounded" sx={{ bgcolor: 'rgba(201, 162, 39, 0.1)', width: 120, height: 36, borderRadius: '4px' }} />
        <Skeleton variant="rounded" sx={{ bgcolor: 'rgba(201, 162, 39, 0.08)', width: 100, height: 36, borderRadius: '4px' }} />
      </Box>
      <Skeleton variant="text" sx={{ bgcolor: 'rgba(201, 162, 39, 0.08)', width: '30%', height: 24, mb: 1 }} />
      {[1, 2, 3].map(i => (
        <Box key={i} sx={{ mb: 2, p: 1.5, background: 'rgba(201, 162, 39, 0.03)', borderRadius: '4px' }}>
          <Skeleton variant="text" sx={{ bgcolor: 'rgba(201, 162, 39, 0.06)', width: '50%', height: 18 }} />
          <Skeleton variant="text" sx={{ bgcolor: 'rgba(201, 162, 39, 0.04)', width: '80%', height: 14 }} />
          <Skeleton variant="text" sx={{ bgcolor: 'rgba(255, 170, 0, 0.08)', width: '30%', height: 20 }} />
        </Box>
      ))}
    </Box>
  );
}

export default CardSkeleton;
