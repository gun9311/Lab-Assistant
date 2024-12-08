import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, TextField, Button, Typography, Paper } from '@mui/material';
import apiNoAuth from '../../utils/apiNoAuth';

const ResetStudentPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const token = query.get('token');

  const handlePasswordReset = async () => {
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      await apiNoAuth.post('/auth/reset-student-password', { token, password });
      alert('비밀번호가 성공적으로 재설정되었습니다.');
      navigate('/teacher');
    } catch (error) {
      setError('비밀번호 재설정에 실패했습니다.');
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ padding: 4 }}>
        <Typography variant="h5" gutterBottom>
          학생 비밀번호 재설정
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="새 비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="비밀번호 확인"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handlePasswordReset}
          sx={{ mt: 2 }}
        >
          비밀번호 재설정
        </Button>
      </Paper>
    </Container>
  );
};

export default ResetStudentPasswordPage;