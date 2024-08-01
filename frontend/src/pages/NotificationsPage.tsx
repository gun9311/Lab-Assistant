// src/pages/NotificationsPage.tsx
import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const NotificationsPage: React.FC = () => {
  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ padding: 4, marginTop: 8 }}>
        <Typography variant="h4" gutterBottom>
          알림
        </Typography>
        <Typography variant="body1">
          여기에서 사용자의 알림을 표시합니다.
        </Typography>
      </Paper>
    </Container>
  );
};

export default NotificationsPage;
