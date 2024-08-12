import React from 'react';
import { Container, Typography, Paper, List, ListItem, ListItemText } from '@mui/material';
import { useNotificationContext } from '../context/NotificationContext';

const NotificationsPage: React.FC = () => {
  const { notifications, markAsRead } = useNotificationContext();

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ marginTop: { xs: 4, sm: 8 } }}>
      <Paper elevation={3} sx={{ padding: 4 }}>
        <Typography variant="h4" gutterBottom>
          알림
        </Typography>
        <List>
          {notifications.map((notification, index) => (
            <ListItem
              key={index}
              button
              onClick={() => handleNotificationClick(notification._id)}
            >
              <ListItemText
                primary={notification.title}
                secondary={notification.body}
                style={{ textDecoration: notification.read ? 'line-through' : 'none' }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
};

export default NotificationsPage;
