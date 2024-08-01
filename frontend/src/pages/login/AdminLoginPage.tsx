import React, { useState } from 'react';
import { setToken, setRefreshToken, setRole, setUserId } from '../../utils/auth';
import { Container, TextField, Button, Typography, Box, Paper } from '@mui/material';
import apiNoAuth from '../../utils/apiNoAuth';

const AdminLoginPage = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const res = await apiNoAuth.post('/auth/login', { role: 'admin', name, password });
      setToken(res.data.accessToken);
      setRefreshToken(res.data.refreshToken);
      setRole(res.data.role);
      setUserId(res.data.userId);
      window.location.href = `/${res.data.role}`;
    } catch (error) {
      setError('Invalid name or password');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ padding: 4, marginTop: 8 }}>
        <Typography variant="h4" gutterBottom>
          Administor
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="Password"
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
          Admin
        </Button>
        {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      </Paper>
    </Container>
  );
};

export default AdminLoginPage;
