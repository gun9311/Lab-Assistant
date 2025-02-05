import React from "react";
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Badge,
  Button,
} from "@mui/material";
import { useNotificationContext } from "../context/NotificationContext";
import { NotificationsActive, Done, CheckCircle } from "@mui/icons-material";

const NotificationsPage: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead } = useNotificationContext();

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  return (
    <Container
      component="main"
      maxWidth="sm"
      sx={{ marginTop: { xs: 4, sm: 6 } }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          borderRadius: "16px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Typography variant="h5" sx={{ fontWeight: "bold", color: "#333" }}>
            알림
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<CheckCircle />}
            onClick={handleMarkAllAsRead}
            sx={{ backgroundColor: "#4CAF50", borderRadius: "16px" }}
          >
            모두 읽음 처리
          </Button>
        </Box>
        <List>
          {notifications.length === 0 ? (
            <Typography
              sx={{ padding: 2, color: "#757575", textAlign: "center" }}
            >
              새로운 알림이 없습니다.
            </Typography>
          ) : (
            notifications.map((notification, index) => (
              <ListItem
                key={index}
                button
                onClick={() => handleNotificationClick(notification._id)}
                sx={{
                  mb: 2,
                  borderRadius: "12px",
                  backgroundColor: notification.read ? "#f5f5f5" : "#e0f7fa",
                  "&:hover": {
                    backgroundColor: notification.read ? "#e0e0e0" : "#b2ebf2",
                  },
                  boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
                }}
              >
                <ListItemIcon>
                  <Badge
                    color="secondary"
                    variant="dot"
                    invisible={notification.read}
                  >
                    {notification.read ? (
                      <Done sx={{ color: "#81c784" }} />
                    ) : (
                      <NotificationsActive sx={{ color: "#039be5" }} />
                    )}
                  </Badge>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: notification.read ? "normal" : "bold",
                        color: notification.read ? "#757575" : "#000",
                      }}
                    >
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      sx={{
                        color: notification.read ? "#9e9e9e" : "#424242",
                      }}
                    >
                      {notification.body}
                    </Typography>
                  }
                />
              </ListItem>
            ))
          )}
        </List>
      </Paper>
    </Container>
  );
};

export default NotificationsPage;
