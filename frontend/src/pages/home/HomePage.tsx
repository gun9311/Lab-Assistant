import React from 'react';
import { Link } from 'react-router-dom';
import { Button, Typography, Box, Container, Paper } from '@mui/material';
import adminIcon from '../../assets/admin-icon.png';
import teacherIcon from '../../assets/teacher-icon.png';
import studentIcon from '../../assets/student-icon.png';
import homeRobot from '../../assets/home-robot.webp';

const HomePage = () => {
  return (
    <Container component="main" maxWidth="sm" sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f8ff' }}>
      <Paper elevation={3} sx={{ padding: 4, textAlign: 'center', position: 'relative' }}>
        <img src={homeRobot} alt="Home Robot" style={{ width: '100%', maxWidth: '200px', margin: '0 auto' }} />
        <Typography variant="h4" gutterBottom sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 'bold', color: 'green' }}>
          Welcome! T-bot
        </Typography>
        <Box sx={{ mt: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-around', gap: 2 }}>
          <Box sx={{ width: '100%' }}>
            <Link to="/teacher-login" style={{ textDecoration: 'none' }}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth 
                sx={{ mb: 2 }} 
                startIcon={<img src={teacherIcon} alt="교사" width="24" height="24" />}
              >
                교사 로그인
              </Button>
            </Link>
            <Link to="/teacher-register" style={{ textDecoration: 'none' }}>
              <Button 
                variant="outlined" 
                color="primary" 
                fullWidth 
                sx={{ mb: 2 }}
              >
                교사용 회원가입
              </Button>
            </Link>
          </Box>
          <Box sx={{ width: '100%' }}>
            <Link to="/student-login" style={{ textDecoration: 'none' }}>
              <Button 
                variant="contained" 
                color="primary" 
                fullWidth 
                sx={{ mb: 2 }} 
                startIcon={<img src={studentIcon} alt="학생" width="24" height="24" />}
              >
                학생 로그인
              </Button>
            </Link>
            <Link to="/student-register" style={{ textDecoration: 'none' }}>
              <Button 
                variant="outlined" 
                color="primary" 
                fullWidth 
                sx={{ mb: 2 }}
              >
                학생용 회원가입
              </Button>
            </Link>
          </Box>
        </Box>
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <Link to="/admin-login" style={{ textDecoration: 'none' }}>
            <Button 
              variant="text" 
              color="secondary" 
              size="small" 
              startIcon={<img src={adminIcon} alt="관리자" width="16" height="16" />}
            >
            </Button>
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default HomePage;
