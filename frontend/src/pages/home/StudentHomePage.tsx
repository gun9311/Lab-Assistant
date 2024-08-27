import React, { useState, useEffect } from 'react';
import { Container, Typography, Button, Paper, Box, Snackbar, Alert } from '@mui/material';
import { Assistant, PlayArrow, StopCircle, AccessTime } from '@mui/icons-material';
import Chatbot from '../../components/student/Chatbot';
import SubjectSelector from '../../components/student/SubjectSelector';
import { useChatbotContext } from '../../context/ChatbotContext';

const StudentHomePage: React.FC = () => {
  const { isChatbotActive, setIsChatbotActive } = useChatbotContext();
  const [selection, setSelection] = useState({
    grade: '',
    semester: '',
    subject: '',
    unit: '',
    topic: ''
  });
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [sessionEndedAlertOpen, setSessionEndedAlertOpen] = useState(false);
  const [chatbotEndAlertOpen, setChatbotEndAlertOpen] = useState(false); // 새로운 알림 상태 추가

  const handleSelectionChange = (newSelection: typeof selection) => {
    setSelection(newSelection);
  };

  const handleChatbotStart = () => {
    setIsChatbotActive(true);
    setRemainingTime(900); // 15분 = 900초
  };

  const handleChatbotEnd = () => {
    setIsChatbotActive(false);
    setRemainingTime(null);
  };

  const handleExtendTime = () => {
    setRemainingTime(900); // 시간을 15분으로 연장
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
        event.returnValue = '';  // 경고 메시지를 표시하는 역할
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isChatbotActive]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <Container 
      component="main" 
      maxWidth={isChatbotActive ? 'lg' : 'md'} 
      sx={{ mt: 8, fontFamily: 'Roboto, sans-serif' }}
    >
      <Paper elevation={3} sx={{ padding: 4 }}>
        {!isChatbotActive && (
          <Typography 
            variant="h4" 
            gutterBottom 
            align="center" 
            sx={{ fontFamily: 'Montserrat, sans-serif', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            <Assistant sx={{ mr: 1 }} />
            T-BOT
          </Typography>
        )}
        {!isChatbotActive && (
          <SubjectSelector 
            onSelectionChange={handleSelectionChange} 
            showTopic={true} 
            disabled={isChatbotActive} 
          />
        )}
        {selection.unit && selection.topic && !isChatbotActive && (
          <Box textAlign="center" sx={{ mt: 2 }}>
            <Button variant="contained" color="primary" onClick={handleChatbotStart} startIcon={<PlayArrow />}>
              학습 챗봇 시작하기
            </Button>
          </Box>
        )}
        {isChatbotActive && (
          <Box textAlign="center" sx={{ mt: 2 }}>
            <Typography 
              variant="h6" 
              color={remainingTime !== null && remainingTime < 60 ? "error" : "third"} 
              sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <AccessTime sx={{ mr: 1 }} />
              남은 시간: {formatTime(remainingTime || 0)}
            </Typography>
            <Button 
              variant="outlined" 
              color="primary" 
              onClick={handleExtendTime} 
              sx={{ mt: 2 }}
            >
              시간 연장
            </Button>
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
            onAlertOpen={() => setChatbotEndAlertOpen(true)} // 알림 상태 제어 함수 전달
            sx={{ height: '70vh' }} // 챗봇의 높이를 크게 설정하여 화면을 더 많이 차지하도록 함
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
          세션이 종료되었습니다. 계속 학습하려면 새로 시작하세요.
        </Alert>
      </Snackbar>

      <Snackbar 
        open={chatbotEndAlertOpen} 
        autoHideDuration={2000} 
        onClose={() => setChatbotEndAlertOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setChatbotEndAlertOpen(false)} severity="success" sx={{ width: '100%' }}>
          대화가 종료되었습니다!
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StudentHomePage;
