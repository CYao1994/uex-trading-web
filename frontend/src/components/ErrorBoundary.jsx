// ErrorBoundary.jsx - React Error Boundary ????????????
import { Component } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Refresh, BugReport } from '@mui/icons-material';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Component crashed:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          p: 4,
          textAlign: 'center',
        }}>
          <Box sx={{
            width: 56, height: 56,
            mb: 2,
            background: 'rgba(255, 68, 102, 0.08)',
            border: '1px solid rgba(255, 68, 102, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
          }}>
            <BugReport sx={{ color: '#ff4466', fontSize: 28 }} />
          </Box>
          <Typography sx={{
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 700,
            fontSize: '0.9rem',
            color: '#ff4466',
            mb: 1,
            letterSpacing: '0.05em',
          }}>
            ??????
          </Typography>
          <Typography sx={{
            color: 'rgba(200, 220, 255, 0.5)',
            fontSize: '0.8rem',
            mb: 3,
            fontFamily: '"Noto Sans SC", sans-serif',
          }}>
            ????????????,?????
          </Typography>
          <Button
            onClick={this.handleReload}
            startIcon={<Refresh />}
            size="small"
            sx={{
              color: '#ff4466',
              borderColor: 'rgba(255, 68, 102, 0.25)',
              fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#ff4466',
                background: 'rgba(255, 68, 102, 0.05)',
              },
            }}
            variant="outlined"
          >
            ??
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
