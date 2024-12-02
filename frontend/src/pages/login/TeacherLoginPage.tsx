import React, { useState } from 'react';
import { setToken, setRefreshToken, setRole, setUserId, setSchoolName } from '../../utils/auth';
import { Container, TextField, Button, Typography, Paper } from '@mui/material';
import apiNoAuth from '../../utils/apiNoAuth';
import { requestPermissionAndGetToken } from '../../firebase';  // FCM 권한 요청 및 토큰 발급 함수 import

const TeacherLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isTokenFound, setTokenFound] = useState(false);
  console.log(process.env.REACT_APP_GOOGLE_CLIENT_ID);
  console.log(process.env.REACT_APP_GOOGLE_REDIRECT_URI);

  const handleLogin = async () => {
    try {
      // FCM 토큰 가져오기 (권한 요청 포함)
      let fcmToken = await requestPermissionAndGetToken(setTokenFound);

      if (!fcmToken) {
        // setError('알림 권한이 필요합니다. 알림 권한을 허용해주세요.');
        // return;
        fcmToken = null;
      }

      const res = await apiNoAuth.post('/auth/login', { role: 'teacher', email, password, fcmToken });
      setToken(res.data.accessToken);
      setRefreshToken(res.data.refreshToken);
      setRole(res.data.role);
      setUserId(res.data.userId);
      setSchoolName(res.data.school);
      window.location.href = `/${res.data.role}`;
    } catch (error) {
      setError('Invalid email or password');
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ marginTop: { xs: 4, sm: 8 } }}>
      <Paper elevation={3} sx={{ padding: { xs: 3, sm: 5 }, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
          교사 로그인
        </Typography>
        <Typography variant="body1" gutterBottom sx={{ color: 'text.secondary', mb: 3 }}>
          이메일과 비밀번호를 입력하세요.
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleLogin}
          sx={{
            mt: 2,
            py: 1.5,
            fontSize: '1rem',
            backgroundColor: '#00796b',
            '&:hover': {
              backgroundColor: '#004d40',
            },
          }}
        >
          로그인
        </Button>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={() => window.location.href =  
            `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.REACT_APP_GOOGLE_CLIENT_ID}&redirect_uri=${process.env.REACT_APP_GOOGLE_REDIRECT_URI}&response_type=code&scope=profile email&state=secureRandomState`}
          sx={{
            mt: 2,
            py: 1.5,
            fontSize: '1rem',
            backgroundColor: '#4285F4',
            '&:hover': {
              backgroundColor: '#357AE8',
            },
          }}
        >
          Google로 로그인
        </Button>
        <Button
          fullWidth
          variant="text"
          color="secondary"
          onClick={() => window.location.href = '/teacher-register'}
          sx={{
            mt: 1,
            py: 1.5,
            fontSize: '0.9rem',
            color: '#00796b',
            '&:hover': {
              color: '#004d40',
            },
          }}
        >
          회원가입
        </Button>
        {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      </Paper>
    </Container>
  );
};

export default TeacherLoginPage;
