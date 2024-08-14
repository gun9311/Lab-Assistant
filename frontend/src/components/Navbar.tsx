import React, { useEffect } from 'react';
import { BottomNavigation, BottomNavigationAction, Badge } from '@mui/material';
import { Home, Person, Notifications, Quiz } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChatbotContext } from '../context/ChatbotContext';
import { useNotificationContext } from '../context/NotificationContext';

const Navbar: React.FC<{ role: string, isQuizMode: boolean }> = ({ role, isQuizMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isChatbotActive, setAlertOpen } = useChatbotContext();
  const { notifications } = useNotificationContext();
  const [value, setValue] = React.useState(0);

  // 현재 경로에 따라 네비게이션 바의 선택된 상태를 설정
  useEffect(() => {
    switch (location.pathname) {
      case '/student':
      case '/teacher':
      case '/admin':
        setValue(0);
        break;
      case '/profile':
        setValue(1);
        break;
      case '/notifications':
        setValue(2);
        break;
      case '/my-quizzes':
        setValue(3);
        break;
      default:
        setValue(0);
        break;
    }
  }, [location.pathname]);

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    if (isChatbotActive) {
      setAlertOpen(true);
      return;
    }

    if (isQuizMode) {  // 퀴즈 진행 중일 때 이동 제한
      alert("퀴즈 진행 중에는 페이지를 이동할 수 없습니다. 퀴즈를 먼저 제출해주세요.");
      return;
    }

    setValue(newValue);
    switch (newValue) {
      case 0:
        if (role === 'student') {
          navigate('/student');
        } else if (role === 'teacher') {
          navigate('/teacher');
        } else if (role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
        break;
      case 1:
        navigate('/profile');
        break;
      case 2:
        navigate('/notifications');
        break;
      case 3:
        if (role === 'student') {
          navigate('/my-quizzes');
        }
        break;
      default:
        break;
    }
  };

  const getHomeLabel = () => {
    switch (role) {
      case 'student':
        return '챗봇';
      case 'teacher':
        return '대시보드';
      case 'admin':
      default:
        return '홈';
    }
  };

  // 읽지 않은 알림의 수 계산
  const unreadNotificationsCount = notifications.filter(notification => !notification.read).length;

  return (
    <BottomNavigation
      value={value}
      onChange={handleChange}
      showLabels
      sx={{
        position: 'fixed',
        bottom: 0,
        width: '100%',
        zIndex: 1000,
        '@media (min-width: 1200px)': {
          position: 'relative',
          bottom: 'auto',
          marginTop: 'auto',
          width: '100%',
        },
      }}
    >
      <BottomNavigationAction 
        label={getHomeLabel()} 
        icon={<Home />} 
      />
      <BottomNavigationAction 
        label="프로필" 
        icon={<Person />} 
      />
      <BottomNavigationAction 
        label="알림" 
        icon={
          <Badge badgeContent={unreadNotificationsCount} color="secondary">
            <Notifications />
          </Badge>
        } 
      />
      {role === 'student' && (
        <BottomNavigationAction 
          label="나의 퀴즈" 
          icon={<Quiz />} 
        />
      )}
    </BottomNavigation>
  );
};

export default Navbar;
