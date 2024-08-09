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
      '@media (max-width:600px)': {
        fontSize: '2rem',  // 모바일 화면에서 글자 크기 조정
      },
    },
    h6: {
      fontSize: '1.25rem',
      '@media (max-width:600px)': {
        fontSize: '1rem',  // 모바일 화면에서 글자 크기 조정
      },
    },
    button: {
      textTransform: 'none',
      fontSize: '1rem',
      '@media (max-width:600px)': {
        fontSize: '0.875rem',  // 모바일 화면에서 버튼 텍스트 크기 조정
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
});

export default theme;
