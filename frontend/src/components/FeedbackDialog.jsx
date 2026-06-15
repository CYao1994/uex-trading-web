// FeedbackDialog.jsx — 飞书反馈对话框，HUD 风格
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, TextField, Select, MenuItem, FormControl,
  InputLabel, Button, IconButton, Snackbar, Alert,
} from '@mui/material';
import { Close, CloudUpload, Delete, Feedback as FeedbackIcon } from '@mui/icons-material';
import { canSubmit, recordSubmit, getRemainingCooldown } from '../utils/feedbackThrottle';
import { collectEnvInfo, formatEnvInfo } from '../utils/envCollector';
import { submitFeedback } from '../api/client';

/** Maximum image dimensions and size for compression */
const MAX_IMAGE_WIDTH = 1200;
const IMAGE_QUALITY = 0.7;
const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500KB per image
const MAX_SCREENSHOTS = 3;
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB per upload

const FEEDBACK_TYPES = [
  { value: 'bug', label: 'Bug 报告' },
  { value: 'suggestion', label: '功能建议' },
  { value: 'other', label: '其他' },
];

/**
 * Compress an image file to base64 with max width and quality constraints.
 * Returns a promise that resolves to the base64 data URL string.
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Scale down if wider than MAX_IMAGE_WIDTH
        if (width > MAX_IMAGE_WIDTH) {
          height = Math.round((height * MAX_IMAGE_WIDTH) / width);
          width = MAX_IMAGE_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Try with target quality first, reduce if still too large
        let dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);

        // If still too large, reduce quality further
        let quality = IMAGE_QUALITY;
        while (dataUrl.length > MAX_IMAGE_SIZE_BYTES * 1.37 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

function FeedbackDialog({ open, onClose, activeTab = '' }) {
  const [feedbackType, setFeedbackType] = useState('bug');
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState([]); // Array of { dataUrl, name }
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const fileInputRef = useRef(null);
  const pasteHandlerRef = useRef(null);

  // Check cooldown on open
  useEffect(() => {
    if (open) {
      const remaining = getRemainingCooldown();
      setCooldownRemaining(remaining);
    }
  }, [open]);

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return;

    const timer = setInterval(() => {
      setCooldownRemaining((prev) => {
        const next = prev - 1000;
        return next <= 0 ? 0 : next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Paste event listener for screenshots
  useEffect(() => {
    if (!open) return;

    const handlePaste = async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            await addScreenshot(file);
          }
          break;
        }
      }
    };

    pasteHandlerRef.current = handlePaste;
    document.addEventListener('paste', handlePaste);

    return () => {
      if (pasteHandlerRef.current) {
        document.removeEventListener('paste', pasteHandlerRef.current);
      }
    };
  }, [open, screenshots]); // eslint-disable-line react-hooks/exhaustive-deps

  const addScreenshot = useCallback(async (file) => {
    if (screenshots.length >= MAX_SCREENSHOTS) {
      setToast({ open: true, message: `最多上传 ${MAX_SCREENSHOTS} 张截图`, severity: 'warning' });
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setToast({ open: true, message: '单张图片不能超过 2MB', severity: 'warning' });
      return;
    }

    try {
      const dataUrl = await compressImage(file);
      setScreenshots((prev) => [...prev, { dataUrl, name: file.name || '截图' }]);
    } catch {
      setToast({ open: true, message: '图片处理失败，请重试', severity: 'error' });
    }
  }, [screenshots.length]);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      if (screenshots.length >= MAX_SCREENSHOTS) break;
      await addScreenshot(file);
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeScreenshot = (index) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const envInfo = collectEnvInfo(activeTab);
  const envDisplay = formatEnvInfo(envInfo);

  const handleSubmit = async () => {
    // Validation
    if (!description.trim() || description.trim().length < 10) {
      setToast({ open: true, message: '描述至少需要 10 个字符', severity: 'warning' });
      return;
    }

    // Check throttle
    if (!canSubmit()) {
      setToast({ open: true, message: '提交过于频繁，请稍后再试', severity: 'warning' });
      return;
    }

    setSubmitting(true);

    try {
      await submitFeedback({
        type: feedbackType,
        description: description.trim(),
        screenshots: screenshots.map((s) => s.dataUrl),
        contact: contact.trim(),
        env: envInfo,
      });

      setToast({ open: true, message: '感谢反馈！', severity: 'success' });
      recordSubmit();
      // Reset form
      setFeedbackType('bug');
      setDescription('');
      setScreenshots([]);
      setContact('');
      // Close after a brief delay
      setTimeout(() => onClose(), 800);
    } catch {
      setToast({ open: true, message: '提交失败，请稍后重试', severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const cooldownSeconds = Math.ceil(cooldownRemaining / 1000);
  const isCooldownActive = cooldownRemaining > 0;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(3, 10, 22, 0.98)',
            border: '1px solid rgba(201, 162, 39, 0.15)',
            borderRadius: '4px',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 0 40px rgba(201, 162, 39, 0.08), 0 8px 32px rgba(0, 0, 0, 0.6)',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.4) 30%, rgba(201, 162, 39, 0.4) 70%, transparent 100%)',
            },
          },
        }}
        BackdropProps={{
          sx: {
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(201, 162, 39, 0.1)',
          pb: 1.5,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 28, height: 28,
              background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.15), rgba(154, 122, 26, 0.1))',
              border: '1px solid rgba(201, 162, 39, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              clipPath: 'polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)',
            }}>
              <FeedbackIcon sx={{ color: '#c9a227', fontSize: 16 }} />
            </Box>
            <Typography sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: '#c9a227',
              letterSpacing: '0.05em',
            }}>
              反馈
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ color: 'rgba(201, 162, 39, 0.5)', '&:hover': { color: '#c9a227' } }}>
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          {/* Feedback type selector */}
          <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
            <InputLabel sx={{
              color: 'rgba(201, 162, 39, 0.5)',
              fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
              '&.Mui-focused': { color: '#c9a227' },
            }}>
              反馈类型
            </InputLabel>
            <Select
              value={feedbackType}
              label="反馈类型"
              onChange={(e) => setFeedbackType(e.target.value)}
              sx={{
                color: '#e0e8f0',
                fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(201, 162, 39, 0.15)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(201, 162, 39, 0.3)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#c9a227',
                },
                '& .MuiSelect-icon': {
                  color: 'rgba(201, 162, 39, 0.4)',
                },
              }}
              MenuProps={{
                PaperProps: {
                  sx: {
                    background: 'rgba(3, 10, 22, 0.98)',
                    border: '1px solid rgba(201, 162, 39, 0.15)',
                  },
                },
              }}
            >
              {FEEDBACK_TYPES.map((type) => (
                <MenuItem
                  key={type.value}
                  value={type.value}
                  sx={{
                    color: '#e0e8f0',
                    fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                    '&.Mui-selected': {
                      background: 'rgba(201, 162, 39, 0.1)',
                      color: '#c9a227',
                    },
                    '&:hover': {
                      background: 'rgba(201, 162, 39, 0.08)',
                    },
                  }}
                >
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Description */}
          <TextField
            multiline
            minRows={4}
            maxRows={8}
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="请详细描述你遇到的问题或建议（至少 10 个字符）"
            sx={{
              mb: 2.5,
              '& .MuiOutlinedInput-root': {
                color: '#e0e8f0',
                fontFamily: '"Noto Sans SC", "Rajdhani", sans-serif',
                fontSize: '0.9rem',
                '& fieldset': { borderColor: 'rgba(201, 162, 39, 0.15)' },
                '&:hover fieldset': { borderColor: 'rgba(201, 162, 39, 0.3)' },
                '&.Mui-focused fieldset': { borderColor: '#c9a227' },
                '&.Mui-focused': { boxShadow: '0 0 8px rgba(201, 162, 39, 0.2)' },
              },
              '& .MuiInputAdornment-root': { color: 'rgba(201, 162, 39, 0.3)' },
            }}
            inputProps={{ minLength: 10 }}
            helperText={description.length > 0 && description.length < 10 ? `还需 ${10 - description.length} 个字符` : ''}
            FormHelperTextProps={{
              sx: { color: 'rgba(255, 170, 0, 0.5)', fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif' },
            }}
          />

          {/* Screenshot upload */}
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{
              color: 'rgba(201, 162, 39, 0.5)',
              fontSize: '0.75rem',
              fontFamily: '"Orbitron", sans-serif',
              fontWeight: 600,
              letterSpacing: '0.08em',
              mb: 1,
            }}>
              截图（可选，最多 {MAX_SCREENSHOTS} 张，支持粘贴）
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              {screenshots.map((shot, idx) => (
                <Box
                  key={idx}
                  sx={{
                    position: 'relative',
                    width: 64,
                    height: 64,
                    borderRadius: '2px',
                    overflow: 'hidden',
                    border: '1px solid rgba(201, 162, 39, 0.15)',
                  }}
                >
                  <img
                    src={shot.dataUrl}
                    alt={shot.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeScreenshot(idx)}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 20,
                      height: 20,
                      background: 'rgba(0, 0, 0, 0.7)',
                      color: '#ff6666',
                      '&:hover': { background: 'rgba(255, 0, 0, 0.3)' },
                      p: 0,
                    }}
                  >
                    <Delete sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              ))}

              {screenshots.length < MAX_SCREENSHOTS && (
                <Box
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    width: 64,
                    height: 64,
                    border: '1px dashed rgba(201, 162, 39, 0.25)',
                    borderRadius: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                    '&:hover': {
                      borderColor: 'rgba(201, 162, 39, 0.5)',
                      background: 'rgba(201, 162, 39, 0.04)',
                    },
                  }}
                >
                  <CloudUpload sx={{ fontSize: 20, color: 'rgba(201, 162, 39, 0.3)' }} />
                  <Typography sx={{ fontSize: '0.55rem', color: 'rgba(201, 162, 39, 0.3)', mt: 0.3 }}>
                    上传
                  </Typography>
                </Box>
              )}
            </Box>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <Typography sx={{ color: 'rgba(201, 162, 39, 0.2)', fontSize: '0.65rem', fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif' }}>
              点击上传或 Ctrl+V 粘贴截图 · 单张 ≤2MB · 自动压缩至 500KB 以内
            </Typography>
          </Box>

          {/* Contact info */}
          <TextField
            fullWidth
            size="small"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="游戏ID / Discord / 邮箱（可选）"
            sx={{
              mb: 2.5,
              '& .MuiOutlinedInput-root': {
                color: '#e0e8f0',
                fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                fontSize: '0.85rem',
                '& fieldset': { borderColor: 'rgba(201, 162, 39, 0.15)' },
                '&:hover fieldset': { borderColor: 'rgba(201, 162, 39, 0.3)' },
                '&.Mui-focused fieldset': { borderColor: '#c9a227' },
                '&.Mui-focused': { boxShadow: '0 0 8px rgba(201, 162, 39, 0.2)' },
              },
            }}
          />

          {/* Environment info (read-only display) */}
          <Box sx={{
            p: 1.5,
            background: 'rgba(0, 10, 20, 0.4)',
            border: '1px solid rgba(201, 162, 39, 0.08)',
            borderRadius: '2px',
          }}>
            <Typography sx={{
              color: 'rgba(201, 162, 39, 0.35)',
              fontSize: '0.65rem',
              fontFamily: '"Orbitron", sans-serif',
              letterSpacing: '0.06em',
              mb: 0.75,
            }}>
              环境信息（自动采集）
            </Typography>
            <Typography sx={{
              color: 'rgba(201, 162, 39, 0.5)',
              fontSize: '0.75rem',
              fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
              whiteSpace: 'pre-line',
              lineHeight: 1.6,
            }}>
              {envDisplay}
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{
          px: 3,
          pb: 2,
          pt: 0,
          borderTop: '1px solid rgba(201, 162, 39, 0.06)',
        }}>
          <Button
            onClick={onClose}
            sx={{
              color: 'rgba(201, 162, 39, 0.5)',
              fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
              fontWeight: 600,
              '&:hover': { color: '#c9a227' },
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || isCooldownActive || description.trim().length < 10}
            sx={{
              px: 3,
              py: 1,
              fontFamily: '"Orbitron", sans-serif',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              borderRadius: '2px',
              clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
              background: submitting || isCooldownActive
                ? 'rgba(201, 162, 39, 0.08)'
                : 'linear-gradient(135deg, #c9a227, #9a7a1a)',
              color: submitting || isCooldownActive ? '#555' : '#020810',
              border: submitting || isCooldownActive ? '1px solid rgba(201, 162, 39, 0.15)' : '1px solid transparent',
              transition: 'background 0.3s, box-shadow 0.3s',
              '&:hover': {
                boxShadow: '0 0 20px rgba(201, 162, 39, 0.4)',
                background: submitting || isCooldownActive
                  ? 'rgba(201, 162, 39, 0.08)'
                  : 'linear-gradient(135deg, #d4ad30, #a8861c)',
              },
              '&.Mui-disabled': {
                background: 'rgba(201, 162, 39, 0.05)',
                color: '#333',
                border: '1px solid rgba(201, 162, 39, 0.08)',
              },
            }}
          >
            {submitting ? '提交中...' : isCooldownActive ? `冷却中 ${cooldownSeconds}s` : '提交反馈'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          sx={{
            background: toast.severity === 'success'
              ? 'rgba(0, 255, 136, 0.12)'
              : toast.severity === 'warning'
                ? 'rgba(255, 170, 0, 0.12)'
                : 'rgba(255, 50, 50, 0.12)',
            border: `1px solid ${
              toast.severity === 'success' ? 'rgba(0, 255, 136, 0.3)'
              : toast.severity === 'warning' ? 'rgba(255, 170, 0, 0.3)'
              : 'rgba(255, 50, 50, 0.3)'
            }`,
            color: toast.severity === 'success' ? '#00ff88'
              : toast.severity === 'warning' ? '#ffaa00'
              : '#ff6666',
            backdropFilter: 'blur(12px)',
            fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
            fontWeight: 600,
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default FeedbackDialog;
