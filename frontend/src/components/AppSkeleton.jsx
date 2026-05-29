import { Box, Skeleton } from '@mui/material';

/**
 * AppSkeleton — HUD-style skeleton screen for Suspense fallback.
 * Mimics the Layout + Navbar + SellPanel shape to reduce layout shift.
 */
function AppSkeleton() {
  return (
    <Box sx={{ display: 'flex', gap: 3, minHeight: 'calc(100vh - 100px)' }}>
      {/* Left panel skeleton */}
      <Box sx={{ width: { xs: '100%', md: 380, lg: 420, xl: 480 }, flexShrink: 0, maxWidth: 480 }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, rgba(5, 15, 30, 0.85) 0%, rgba(2, 10, 20, 0.9) 100%)',
            border: '1px solid rgba(0, 180, 255, 0.12)',
            borderRadius: '2px',
            p: 2.5,
          }}
        >
          {/* Title skeleton */}
          <Skeleton
            variant="text"
            width="60%"
            height={28}
            sx={{ bgcolor: 'rgba(0, 180, 255, 0.06)', mb: 2 }}
          />

          {/* Form field skeletons */}
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <Skeleton
                variant="text"
                width="40%"
                height={16}
                sx={{ bgcolor: 'rgba(0, 180, 255, 0.04)', mb: 0.5 }}
              />
              <Skeleton
                variant="rounded"
                width="100%"
                height={40}
                sx={{ bgcolor: 'rgba(0, 180, 255, 0.05)' }}
              />
            </Box>
          ))}

          {/* Button skeleton */}
          <Skeleton
            variant="rounded"
            width="100%"
            height={42}
            sx={{ bgcolor: 'rgba(0, 180, 255, 0.06)', mt: 2 }}
          />
        </Box>
      </Box>

      {/* Right area skeleton */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Skeleton
            variant="rounded"
            width={90}
            height={90}
            sx={{ bgcolor: 'rgba(0, 180, 255, 0.04)', mx: 'auto', mb: 2 }}
          />
          <Skeleton
            variant="text"
            width={160}
            height={24}
            sx={{ bgcolor: 'rgba(0, 180, 255, 0.04)', mx: 'auto' }}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default AppSkeleton;
