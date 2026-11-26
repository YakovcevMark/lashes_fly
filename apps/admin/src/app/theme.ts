import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  spacing: 4,
  shape: { borderRadius: 12 },
  palette: {
    primary: { main: '#66324d', dark: '#452033', contrastText: '#fff' },
    background: { default: '#faf8f5', paper: '#fffcfa' },
    text: { primary: '#31232a', secondary: '#675c63' },
    divider: '#e2d7d9',
  },
  typography: {
    fontFamily: '"Segoe UI", Roboto, sans-serif',
    h1: { fontFamily: 'Georgia, serif', fontSize: '2.6rem', fontWeight: 400, lineHeight: 1.12 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 48, fontSize: '1rem' } },
    },
  },
});
