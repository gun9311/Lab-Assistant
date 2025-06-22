import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import api from "../utils/api";

export type Notification = {
  _id: string;
  title: string;
  body: string;
  read: boolean;
  type?: string;
  data?: any;
};

type NotificationContextType = {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  loadMoreNotifications: () => Promise<void>;
  hasMore: boolean;
  isLoading: boolean;
  fetchNotifications: (page: number) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case "quiz_result":
        return "퀴즈 결과";
      case "report_generated":
        return "평어 생성";
      case "qna_answer":
        return "Q&A 답변";
      default:
        return "공지사항";
    }
  };

  const fetchNotifications = useCallback(async (page: number) => {
    try {
      const { data } = await api.get(`/notifications?page=${page}&limit=5`);

      const transformedNotifications = data.notifications.map((notif: any) => ({
        _id: notif._id,
        title: getNotificationTitle(notif.type),
        body: notif.message,
        read: notif.read,
        type: notif.type,
        data: notif.data,
      }));

      if (page === 1) {
        setNotifications(transformedNotifications);
      } else {
        setNotifications((prev) => [...prev, ...transformedNotifications]);
      }

      setHasMore(data.hasMore);
      setCurrentPage(page);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  const loadMoreNotifications = async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    await fetchNotifications(currentPage + 1);
    setIsLoading(false);
  };

  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  // 모든 알림을 읽음 처리하는 메서드 추가
  const markAllAsRead = async () => {
    try {
      await api.patch("/notifications/mark-all-read"); // 서버에서 모든 알림을 읽음 처리하는 엔드포인트가 있다고 가정
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        loadMoreNotifications,
        hasMore,
        isLoading,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
