import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, TextField, Button, Typography, Snackbar, Alert } from '@mui/material';
import apiNoAuth from '../../utils/apiNoAuth';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordReset = async () => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      await apiNoAuth.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/teacher-login'), 2000);
    } catch (error) {
      setError('비밀번호 재설정에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 2, textAlign: 'center' }}>
        비밀번호 재설정
      </Typography>
      <TextField
        fullWidth
        variant="outlined"
        margin="normal"
        label="새 비밀번호"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        variant="outlined"
        margin="normal"
        label="비밀번호 확인"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        sx={{ mb: 2 }}
      />
      <Button
        fullWidth
        variant="contained"
        color="primary"
        onClick={handlePasswordReset}
        sx={{
          mt: 2,
          py: 1.5,
          fontSize: '1rem',
          backgroundColor: '#1976d2',
          '&:hover': {
            backgroundColor: '#1565c0',
          },
          borderRadius: '8px',
        }}
      >
        확인
      </Button>
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      <Snackbar
        open={success}
        autoHideDuration={2000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%' }}>
          비밀번호가 성공적으로 재설정되었습니다.
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ResetPasswordPage;