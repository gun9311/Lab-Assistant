import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, IconButton } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import SendIcon from '@mui/icons-material/Send';
import api from '../../utils/api';

type ChatbotProps = {
  grade: string;
  semester: string;
  subject: string;
  unit: string;
  topic: string;
  onChatbotEnd: () => void;
};

const Chatbot: React.FC<ChatbotProps> = ({ grade, semester, subject, unit, topic, onChatbotEnd }) => {
  const [message, setMessage] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<{ user: string; bot: string }[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;

    // 기존 WebSocket이 열려있으면 닫기
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }

    const newWs = new WebSocket(`${wsUrl}/?token=${token}`);

    newWs.onopen = () => {
      console.log('WebSocket connection established');
    };

    newWs.onmessage = (event) => {
      const { user, bot } = JSON.parse(event.data);
      setChatHistory(prevChatHistory => [...prevChatHistory, { user, bot }]);
    };

    newWs.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    newWs.onclose = () => {
      console.log('WebSocket connection closed');
    };

    setWs(newWs);

    return () => {
      newWs.close();
    };
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "ko-KR";

      recognitionInstance.onstart = () => setIsListening(true);
      recognitionInstance.onend = () => setIsListening(false);
      recognitionInstance.onerror = (event: Event) => console.error("Speech recognition error", event);
      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join("");
        setMessage(transcript);
      };

      setRecognition(recognitionInstance);
    } else {
      console.warn("Speech Recognition API not supported in this browser");
    }
  }, []);

  const handleSendMessage = async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        grade,
        semester,
        subject,
        unit,
        topic,
        userMessage: message
      }));
      setMessage("");
    }
  };

  const handleSaveChatSummary = async () => {
    try {
      await api.post("/chatbot/save-summary", {
        // grade,
        // semester,
        subject,
        // unit,
        // topic,
      });
      setChatHistory([]);
      alert("Chat summary saved successfully");
      onChatbotEnd();
    } catch (error: any) {
      console.error("Error saving chat summary:", error);
      onChatbotEnd();
    }
  };

  const handleStartListening = () => {
    if (recognition && !isListening) {
      recognition.start();
    }
  };

  const handleStopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  return (
    <Paper elevation={3} sx={{ padding: 4, mt: 4 }}>
      <Typography variant="h5" gutterBottom align="center">
        챗봇
      </Typography>
      <TextField
        fullWidth
        multiline
        minRows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="질문을 입력하세요..."
        sx={{ mb: 2 }}
      />
      <Box textAlign="center">
        <Button
          variant="contained"
          color="primary"
          endIcon={<SendIcon />}
          onClick={handleSendMessage}
          sx={{ mb: 2 }}
        >
          전송
        </Button>
      </Box>
      <Box textAlign="center">
        <IconButton onClick={handleStartListening} disabled={isListening} color="primary">
          <MicIcon />
        </IconButton>
        <IconButton onClick={handleStopListening} disabled={!isListening} color="secondary">
          <MicOffIcon />
        </IconButton>
      </Box>
      <Box className="chatbot-response" sx={{ mt: 2 }}>
        {chatHistory.map((chat, index) => (
          <Typography key={index} variant="body1" sx={{ p: 2, bgcolor: "#f1f1f1", borderRadius: 1 }}>
            <strong>사용자:</strong> {chat.user} <br />
            <strong>챗봇:</strong> {chat.bot}
          </Typography>
        ))}
      </Box>
      <Box textAlign="center" sx={{ mt: 2 }}>
        <Button variant="contained" color="secondary" onClick={handleSaveChatSummary}>
          챗봇 종료
        </Button>
      </Box>
    </Paper>
  );
};

export default Chatbot;
