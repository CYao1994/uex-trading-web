import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#c9a227',
      light: '#e8c55a',
      dark: '#9a7a1a',
      contrastText: '#0a0e17',
    },
    secondary: {
      main: '#d4760a',
      light: '#e8922a',
      dark: '#a85c08',
    },
    background: {
      default: '#060a13',
      paper: '#0d1321',
    },
    text: {
      primary: '#e0e6ed',
      secondary: '#7a8ba0',
    },
    success: {
      main: '#00ff88',
    },
    warning: {
      main: '#ffaa00',
    },
    error: {
      main: '#ff3366',
    },
    divider: 'rgba(201, 162, 39, 0.12)',
    // Custom glow accent tokens - reference via theme.palette.glow.cyan etc.
    glow: {
      amber: '#c9a227',
      orange: '#d4760a',
      crimson: '#8b2500',
      silver: '#b0c4d8',
      cyan: '#00c8ff',
      green: '#00ff88',
      purple: '#a855f7',
    },
  },
  typography: {
    fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
    h1: {
      fontFamily: '"Orbitron", sans-serif',
      fontWeight: 700,
      letterSpacing: '0.05em',
    },
    h2: {
      fontFamily: '"Orbitron", sans-serif',
      fontWeight: 600,
      letterSpacing: '0.03em',
    },
    h3: {
      fontFamily: '"Orbitron", sans-serif',
      fontWeight: 600,
    },
    h4: {
      fontFamily: '"Orbitron", sans-serif',
      fontWeight: 500,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    body1: {
      fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
      fontSize: '1rem',
    },
    button: {
      fontFamily: '"Orbitron", sans-serif',
      fontWeight: 600,
      letterSpacing: '0.05em',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #c9a227 0%, #9a7a1a 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #e8c55a 0%, #c9a227 100%)',
            boxShadow: '0 0 10px rgba(201, 162, 39, 0.3)',
          },
        },
        outlinedPrimary: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
            boxShadow: '0 0 8px rgba(201, 162, 39, 0.2)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(201, 162, 39, 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: 'rgba(201, 162, 39, 0.2)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(201, 162, 39, 0.4)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#c9a227',
              boxShadow: '0 0 10px rgba(201, 162, 39, 0.2)',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
        },
      },
    },
  },
});

export default theme;
