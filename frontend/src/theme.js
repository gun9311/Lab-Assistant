// src/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    h1: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
    },
    h6: {
      fontSize: '1.25rem',
    },
    button: {
      textTransform: 'none',
    },
  },
});

export default theme;
