import React, { useState, useEffect } from 'react';
import Chatbot from '../../components/student/Chatbot';
import LogoutButton from '../../components/auth/LogoutButton';
import SubjectSelector from '../../components/student/SubjectSelector';
import { Container, Typography, Button, Paper, Box, Snackbar, Alert } from '@mui/material';
import { useChatbotContext } from '../../context/ChatbotContext';

const StudentHomePage: React.FC = () => {
  const { isChatbotActive, setIsChatbotActive, setAlertOpen } = useChatbotContext();
  const [selection, setSelection] = useState({
    grade: '',
    semester: '',
    subject: '',
    unit: '',
    topic: ''
  });
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [sessionEndedAlertOpen, setSessionEndedAlertOpen] = useState(false);

  const handleSelectionChange = (newSelection: typeof selection) => {
    setSelection(newSelection);
  };

  const handleChatbotStart = () => {
    setIsChatbotActive(true);
    setRemainingTime(3600); // 1시간 = 3600초
  };

  const handleChatbotEnd = () => {
    setIsChatbotActive(false);
    setRemainingTime(null);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isChatbotActive && remainingTime !== null) {
      timer = setInterval(() => {
        setRemainingTime(prevTime => {
          if (prevTime !== null && prevTime > 0) {
            return prevTime - 1;
          } else {
            clearInterval(timer);
            handleChatbotEnd();
            setSessionEndedAlertOpen(true);
            return null;
          }
        });
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isChatbotActive, remainingTime]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isChatbotActive) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isChatbotActive, setAlertOpen]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ padding: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          챗봇
        </Typography>
        <SubjectSelector 
          onSelectionChange={handleSelectionChange} 
          showTopic={true} 
          disabled={isChatbotActive} 
        />
        {selection.unit && selection.topic && !isChatbotActive && (
          <Box textAlign="center" sx={{ mt: 2 }}>
            <Button variant="contained" color="primary" onClick={handleChatbotStart}>
              챗봇 생성하기
            </Button>
          </Box>
        )}
        {isChatbotActive && (
          <Box textAlign="center" sx={{ mt: 2 }}>
            <Typography variant="h6" color="secondary">
              남은 시간: {formatTime(remainingTime || 0)}
            </Typography>
          </Box>
        )}
        {isChatbotActive && (
          <Chatbot
            grade={selection.grade}
            semester={selection.semester}
            subject={selection.subject}
            unit={selection.unit}
            topic={selection.topic}
            onChatbotEnd={handleChatbotEnd}
          />
        )}
      </Paper>
      <Snackbar 
        open={sessionEndedAlertOpen} 
        autoHideDuration={3000} 
        onClose={() => setSessionEndedAlertOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSessionEndedAlertOpen(false)} severity="warning" sx={{ width: '100%' }}>
          챗봇 세션이 종료되었습니다!
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StudentHomePage;
