import React, { useState } from 'react';
import Chatbot from '../../components/student/Chatbot';
import LogoutButton from '../../components/auth/LogoutButton';
import SubjectSelector from '../../components/student/SubjectSelector';
import { Container, Typography, Button, Paper, Box } from '@mui/material';
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

  const handleSelectionChange = (newSelection: typeof selection) => {
    setSelection(newSelection);
  };

  const handleChatbotStart = () => {
    setIsChatbotActive(true);
  };

  const handleChatbotEnd = () => {
    setIsChatbotActive(false);
    window.location.reload(); // 페이지 새로고침
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
          <Chatbot
            grade={selection.grade}
            semester={selection.semester}
            subject={selection.subject}
            unit={selection.unit}
            topic={selection.topic}
            onChatbotEnd={handleChatbotEnd}
          />
        )}
        <Box textAlign="center" sx={{ mt: 2 }}>
          <LogoutButton />
        </Box>
      </Paper>
    </Container>
  );
};

export default StudentHomePage;
