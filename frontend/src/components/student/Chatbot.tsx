import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, TextField, Typography, Paper, IconButton, Avatar } from '@mui/material';
import { Mic, MicOff, Send, StopCircle } from '@mui/icons-material';
import SmartToyIcon from '@mui/icons-material/SmartToy'; // 챗봇 아이콘
import { SxProps } from '@mui/system'; // SxProps 타입 추가

type ChatbotProps = {
  grade: string;
  semester: string;
  subject: string;
  unit: string;
  topic: string;
  onChatbotEnd: () => void;
  sx?: SxProps; // sx 속성 추가
};

const Chatbot: React.FC<ChatbotProps> = ({ grade, semester, subject, unit, topic, onChatbotEnd, sx }) => {
  const [message, setMessage] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<{ sender: string; content: string }[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const chatBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;
    const encodedSubject = encodeURIComponent(subject);

    if (ws) {
      ws.close();
    }

    const newWs = new WebSocket(`${wsUrl}/?token=${token}&subject=${encodedSubject}`);

    newWs.onopen = () => {
      console.log('WebSocket connection established');
    };

    newWs.onmessage = (event) => {
      const { bot } = JSON.parse(event.data);
      setChatHistory(prevChatHistory => [...prevChatHistory, { sender: '챗봇', content: bot }]);
    };

    newWs.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(newWs);

    return () => {
      if (newWs.readyState === WebSocket.OPEN) {
        newWs.close();
      }
    };
  }, [subject]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "ko-KR";

      recognitionInstance.onstart = () => setIsListening(true);
      recognitionInstance.onend = () => {
        setIsListening(false);
        setMessage("");
      };
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

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      setChatHistory(prevChatHistory => [...prevChatHistory, { sender: '사용자', content: message }]);
      ws.send(JSON.stringify({
        grade,
        semester,
        subject,
        unit,
        topic,
        userMessage: message
      }));
      setMessage("");

      if (recognition) {
        recognition.stop();
      }
    }
  };

  const handleSaveChatSummary = async () => {
    try {
      setChatHistory([]);
      onChatbotEnd();
      alert("Chat summary saved successfully");
    } catch (error: any) {
      console.error("Error saving chat summary:", error);
      onChatbotEnd();
    } finally {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
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
    <Paper elevation={3} sx={{ padding: 4, mt: 4, fontFamily: 'Roboto, sans-serif', display: 'flex', flexDirection: 'column', height: '100%', ...sx }}>
      {/* 채팅 내용 */}
      <Box ref={chatBoxRef} className="chatbot-response" sx={{ flexGrow: 1, maxHeight: '60vh', overflowY: 'auto', mb: 2 }}>
        {chatHistory.map((chat, index) => (
          <Box 
            key={index} 
            sx={{ 
              display: 'flex', 
              flexDirection: chat.sender === '사용자' ? 'row-reverse' : 'row', 
              alignItems: 'center', 
              mb: 3, 
              mr: chat.sender === '사용자' ? 2 : 0 // 사용자 말풍선에 오른쪽 여백 추가
            }}
          >
            {chat.sender === '챗봇' && (
              <Avatar sx={{ bgcolor: '#f1f1f1', mr: 1 }}>
                <SmartToyIcon />
              </Avatar>
            )}
            <Typography 
              variant="body1" 
              sx={{ 
                p: 2, 
                borderRadius: 1, 
                bgcolor: chat.sender === '사용자' ? "#d1e7dd" : "#f1f1f1", 
                maxWidth: '70%', 
                textAlign: chat.sender === '사용자' ? 'right' : 'left' 
              }}
            >
              {chat.content}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* 입력창 및 버튼 */}
      <Box sx={{ mt: 'auto', py: 1, px: 2, bgcolor: '#ffffff', boxShadow: '0px -2px 10px rgba(0, 0, 0, 0.1)' }}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="궁금한 점을 입력해보세요!"
          sx={{ mb: 1 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <IconButton onClick={handleStartListening} disabled={isListening} color="primary">
              <Mic />
            </IconButton>
            <IconButton onClick={handleStopListening} disabled={!isListening} color="secondary">
              <MicOff />
            </IconButton>
          </Box>
          <Box>
            <Button
              variant="contained"
              color="primary"
              endIcon={<Send />}
              onClick={handleSendMessage}
              sx={{ mr: 1 }}
            >
              전송
            </Button>
            <Button variant="contained" color="secondary" startIcon={<StopCircle />} onClick={handleSaveChatSummary}>
              대화 종료
            </Button>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default Chatbot;
