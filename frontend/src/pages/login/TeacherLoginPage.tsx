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
      <Paper elevation={3} sx={{ padding: { xs: 2, sm: 4 } }}>
        <Typography variant="h4" gutterBottom>
          교사 로그인
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleLogin}
          sx={{ mt: 2 }}
        >
          로그인
        </Button>
        {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      </Paper>
    </Container>
  );
};

export default TeacherLoginPage;
