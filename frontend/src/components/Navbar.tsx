import React, { useEffect, useState } from 'react';
import { BottomNavigation, BottomNavigationAction, Badge, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import { Home, Person, Notifications, Quiz } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChatbotContext } from '../context/ChatbotContext';
import { useNotificationContext } from '../context/NotificationContext';

const Navbar: React.FC<{ role: string, isQuizMode: boolean }> = ({ role, isQuizMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isChatbotActive, setAlertOpen } = useChatbotContext();
  const { notifications } = useNotificationContext();
  const [value, setValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);

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
      case '/manage-quizzes': // 새로운 퀴즈 관리 탭
        setValue(4);
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
      setOpenDialog(true);  // 다이얼로그 열기
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
      case 4:
        if (role === 'teacher') {  // 교사일 때만 퀴즈 관리로 이동
          navigate('/manage-quizzes');
        }
        break;
      default:
        break;
    }
  };

  const getHomeLabel = () => {
    switch (role) {
      case 'student':
        return 'T-BOT';
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
    <>
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
            label="퀴즈" 
            icon={<Quiz />} 
          />
        )}
        {role === 'teacher' && (  // 교사일 경우 퀴즈 관리 탭 추가
          <BottomNavigationAction
            label="퀴즈 관리"
            icon={<Quiz />}
          />
        )}
      </BottomNavigation>

      {/* 다이얼로그 컴포넌트 추가 */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      >
        <DialogTitle>퀴즈 진행 중</DialogTitle>
        <DialogContent>
          <DialogContentText>
            퀴즈 진행 중에는 페이지를 이동할 수 없습니다. 퀴즈를 먼저 제출해주세요.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Navbar;
