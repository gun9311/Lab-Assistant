import React from 'react';
import { BottomNavigation, BottomNavigationAction } from '@mui/material';
import { Home, Person, Notifications, Quiz } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useChatbotContext } from '../context/ChatbotContext';

const Navbar: React.FC<{ role: string }> = ({ role }) => {
  const navigate = useNavigate();
  const { isChatbotActive, setAlertOpen } = useChatbotContext();
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    if (isChatbotActive) {
      setAlertOpen(true);
      return;
    }

    setValue(newValue);
    switch (newValue) {
      case 0:
        navigate('/');
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

  return (
    <BottomNavigation value={value} onChange={handleChange} showLabels>
      <BottomNavigationAction label={getHomeLabel()} icon={<Home />} />
      <BottomNavigationAction label="프로필" icon={<Person />} />
      <BottomNavigationAction label="알림" icon={<Notifications />} />
      {role === 'student' && <BottomNavigationAction label="나의 퀴즈" icon={<Quiz />} />}
    </BottomNavigation>
  );
};

export default Navbar;
