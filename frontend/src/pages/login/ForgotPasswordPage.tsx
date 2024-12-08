import React, { useState } from 'react';
import { Container, TextField, Button, Typography, Snackbar, Alert } from '@mui/material';
import apiNoAuth from '../../utils/apiNoAuth';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordReset = async () => {
    try {
      await apiNoAuth.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (error) {
      setError('비밀번호 재설정 요청에 실패했습니다. 다시 시도해주세요.');
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
        label="이메일"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
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
        비밀번호 재설정 링크 보내기
      </Button>
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%' }}>
          비밀번호 재설정 링크가 이메일로 발송되었습니다.
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ForgotPasswordPage;