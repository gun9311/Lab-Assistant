import React, { useState, useEffect } from "react";
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
  CircularProgress,
} from "@mui/material";
import { useNotificationContext } from "../contexts/NotificationContext";
import { NotificationsActive, Done, CheckCircle } from "@mui/icons-material";

const NotificationsPage: React.FC = () => {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    loadMoreNotifications,
    hasMore,
    isLoading,
    fetchNotifications,
  } = useNotificationContext();

  useEffect(() => {
    // 페이지에 진입할 때마다 첫 페이지의 알림을 새로고침합니다.
    fetchNotifications(1);
  }, [fetchNotifications]);

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    if (isLoading) return;

    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const hasUnreadNotifications = notifications.some((n) => !n.read);

  return (
    <Container
      component="main"
      maxWidth="sm"
      sx={{ marginTop: { xs: 4, sm: 6 }, mb: 4 }}
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
            startIcon={
              isLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <CheckCircle />
              )
            }
            onClick={handleMarkAllAsRead}
            disabled={isLoading || !hasUnreadNotifications}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
            }}
          >
            {isLoading ? "처리 중..." : "모두 읽음 처리"}
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

        {hasMore && (
          <Box display="flex" justifyContent="center" mt={2} mb={2}>
            <Button
              onClick={loadMoreNotifications}
              disabled={isLoading}
              variant="outlined"
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? "로딩 중..." : "더 보기"}
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default NotificationsPage;
