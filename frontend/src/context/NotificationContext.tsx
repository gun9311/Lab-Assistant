import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import api from '../utils/api';

type Notification = {
  _id: string;
  title: string;
  body: string;
  read: boolean;
};

type NotificationContextType = {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications');
        console.log(data);
        
        // 데이터 구조를 기대하는 형태로 변환
        const transformedNotifications = data.map((notif: any) => ({
          _id: notif._id,
          title: notif.type === 'quiz_result' ? '퀴즈 결과 알림' : '알림',
          body: notif.message,
          read: notif.read,
        }));
        
        setNotifications(transformedNotifications);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };
  
    fetchNotifications();
  }, []);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [...prev, notification]);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(notification =>
          notification._id === notificationId ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};
