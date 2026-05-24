import { useState, useEffect, useCallback } from 'react';
import { Dialog, Box, Typography, IconButton } from '@mui/material';
import { Close as CloseIcon, NewReleases } from '@mui/icons-material';
import api from '../api/client';

function ChangelogDialog({ open, onClose }) {
  const [changelog, setChangelog] = useState([]);
  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    if (open) {
      api.get('/version')
        .then(res => {
          setChangelog(res.data.changelog || []);
          setCurrentVersion(res.data.version || '');
        })
        .catch(() => {});
    }
  }, [open]);

  const escClose = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', escClose);
      return () => document.removeEventListener('keydown', escClose);
    }
  }, [open, escClose]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(180deg, rgba(3, 12, 28, 0.98) 0%, rgba(2, 8, 18, 0.99) 100%)',
          border: '1px solid rgba(0, 200, 255, 0.2)',
          borderRadius: '3px',
          boxShadow: '0 0 40px rgba(0, 150, 255, 0.15), 0 0 80px rgba(0, 100, 200, 0.05)',
          clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
          overflow: 'hidden',
          position: 'relative',
          // Top glow
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(0, 200, 255, 0.5) 30%, rgba(0, 200, 255, 0.5) 70%, transparent 100%)',
            zIndex: 1,
          },
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: 'rgba(0, 4, 12, 0.85)',
          backdropFilter: 'blur(4px)',
        },
      }}
    >
      {/* Header */}
      <Box sx={{
        px: 3,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0, 180, 255, 0.1)',
        background: 'linear-gradient(90deg, rgba(0, 100, 200, 0.08) 0%, transparent 100%)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 28, height: 28,
            background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.15), rgba(0, 100, 200, 0.1))',
            border: '1px solid rgba(0, 200, 255, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            clipPath: 'polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)',
          }}>
            <NewReleases sx={{ color: '#00c8ff', fontSize: 16 }} />
          </Box>
          <Box>
            <Typography sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: '#00c8ff',
              letterSpacing: '0.05em',
            }}>
              更新公告
            </Typography>
            <Typography sx={{
              color: 'rgba(0, 200, 255, 0.3)',
              fontSize: '0.6rem',
              fontFamily: '"Orbitron", sans-serif',
              letterSpacing: '0.08em',
            }}>
              RELEASE NOTES
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'rgba(0, 200, 255, 0.4)',
            '&:hover': { color: '#00c8ff', background: 'rgba(0, 200, 255, 0.08)' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{
        px: 3,
        py: 2,
        maxHeight: '60vh',
        overflow: 'auto',
        // Custom scrollbar
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(0, 200, 255, 0.15)', borderRadius: 2 },
      }}>
        {changelog.map((entry, idx) => {
          const isLatest = entry.version === currentVersion;
          return (
            <Box
              key={entry.version}
              sx={{
                mb: idx < changelog.length - 1 ? 2.5 : 0,
                pb: idx < changelog.length - 1 ? 2.5 : 0,
                borderBottom: idx < changelog.length - 1 ? '1px solid rgba(0, 180, 255, 0.06)' : 'none',
              }}
            >
              {/* Version header */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography sx={{
                  fontFamily: '"Orbitron", sans-serif',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: isLatest ? '#00c8ff' : 'rgba(0, 200, 255, 0.6)',
                  letterSpacing: '0.05em',
                }}>
                  v{entry.version}
                </Typography>
                {isLatest && (
                  <Box sx={{
                    px: 1,
                    py: 0.15,
                    background: 'linear-gradient(135deg, #00c8ff, #0088dd)',
                    borderRadius: '2px',
                    fontFamily: '"Orbitron", sans-serif',
                    fontSize: '0.5rem',
                    fontWeight: 700,
                    color: '#020810',
                    letterSpacing: '0.08em',
                  }}>
                    LATEST
                  </Box>
                )}
                <Typography sx={{
                  color: 'rgba(0, 200, 255, 0.25)',
                  fontSize: '0.7rem',
                  fontFamily: '"Rajdhani", sans-serif',
                  ml: 'auto',
                }}>
                  {entry.date}
                </Typography>
              </Box>

              {/* Changes list */}
              <Box sx={{ pl: 1.5 }}>
                {entry.changes.map((change, ci) => (
                  <Box key={ci} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                    <Box sx={{
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: change.startsWith('修复')
                        ? 'rgba(255, 100, 100, 0.6)'
                        : change.startsWith('新增')
                          ? 'rgba(0, 255, 136, 0.6)'
                          : 'rgba(0, 200, 255, 0.4)',
                      mt: '7px',
                      flexShrink: 0,
                    }} />
                    <Typography sx={{
                      color: isLatest ? 'rgba(200, 230, 255, 0.85)' : 'rgba(200, 230, 255, 0.5)',
                      fontSize: '0.8rem',
                      lineHeight: 1.6,
                      fontFamily: '"Noto Sans SC", "Rajdhani", sans-serif',
                    }}>
                      {change}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Box sx={{
        px: 3,
        py: 1.5,
        borderTop: '1px solid rgba(0, 180, 255, 0.06)',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <Typography sx={{
          color: 'rgba(0, 200, 255, 0.2)',
          fontSize: '0.6rem',
          fontFamily: '"Orbitron", sans-serif',
          letterSpacing: '0.1em',
        }}>
          UEX TRADE NAVIGATOR · DATA FROM UEXCORP
        </Typography>
      </Box>
    </Dialog>
  );
}

export default ChangelogDialog;
