import React, { useState } from 'react';
import axios from 'axios';
import { setToken, setRefreshToken, setRole, setUserId, setSchoolName } from '../../utils/auth';
import { Container, TextField, Button, Typography, Box, Paper } from '@mui/material';

const TeacherLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const res = await axios.post('/api/auth/login', { role: 'teacher', email, password });
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
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ padding: 4, marginTop: 8 }}>
        <Typography variant="h4" gutterBottom>
          Teacher Login
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          Login
        </Button>
        {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      </Paper>
    </Container>
  );
};

export default TeacherLoginPage;
