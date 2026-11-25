import React from 'react'
import { createRoot } from 'react-dom/client'
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material'
import App from './App'
import './style.css'
const theme = createTheme({
  palette: {
    primary: { main: '#166052' },
    background: { default: '#f5f5ef' },
    text: { primary: '#173c35' },
  },
  typography: {
    fontFamily: 'Inter, "Segoe UI", sans-serif',
    button: { textTransform: 'none', fontWeight: 700 },
  },
  spacing: 4,
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true, disableRipple: true } },
    MuiCssBaseline: {
      styleOverrides: (theme) => ({
        ':root': {
          '--focus-color': '#227562',
          '--color-muted': '#51655d',
          '--color-border': '#cbd5cc',
          '--color-divider': '#dce1d9',
          '--space-1': theme.spacing(1),
          '--space-2': theme.spacing(2),
          '--space-3': theme.spacing(3),
          '--space-4': theme.spacing(4),
          '--space-5': theme.spacing(5),
          '--space-6': theme.spacing(6),
        },
      }),
    },
  },
})
createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>,
)
