import React, { useEffect, useState } from 'react';
import { Container, Paper, Box, Typography, Button, CircularProgress } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { getToken } from '../../../utils/auth';
import QuizQuestionComponent from './components/QuizQuestion';
import QuizFeedbackComponent from './components/QuizFeedback';
import WaitingScreenComponent from './components/WaitingScreen';

import Character1 from '../../../assets/character/character1.png';
import Character2 from '../../../assets/character/character2.png';


interface Option {
  text: string;
}

interface QuizQuestion {
  questionId: string;
  questionText: string;
  options: Option[];  // 옵션을 객체 배열로 정의
  timeLimit: number;
}

const StudentQuizSessionPage: React.FC = () => {
  const location = useLocation(); // useLocation을 통해 state로 전달된 데이터 받기
  const navigate = useNavigate();
  const { pin, sessionId } = location.state; // state에서 전달된 pin과 sessionId 받기
  const userToken = getToken(); // 사용자 토큰 가져오기

  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null); // 문제 시작 시간 저장
  const [isQuizStarting, setIsQuizStarting] = useState<boolean>(false);  // 퀴즈 시작 준비 화면 상태 추가
  const [isPreparingNextQuestion, setIsPreparingNextQuestion] = useState<boolean>(false);  // 다음 문제 준비 화면 상태 추가
  const [isLastQuestion, setIsLastQuestion] = useState(false); // 마지막 문제 여부
  const [isWaitingForQuizStart, setIsWaitingForQuizStart] = useState<boolean>(false);  // 교사가 퀴즈 시작을 누르기 전 상태 추가
  const [isReady, setIsReady] = useState<boolean>(false);  // 학생 준비 완료 상태 추가
  const [score, setScore] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null); // 피드백 메시지 저장
  const [error, setError] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false); // 정답 제출 상태 관리
  const [waitingForFeedback, setWaitingForFeedback] = useState<boolean>(false); // 피드백 대기 상태
  const [isFeedbackReceived, setIsFeedbackReceived] = useState<boolean>(false);  // 피드백 상태 추가
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null); // 캐릭터 선택 상태

  // 웹소켓 연결 설정
  useEffect(() => {
    if (!pin || !userToken) {
      setError("PIN 또는 사용자 토큰이 누락되었습니다.");
      return;
    }

    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;
    const socket = new WebSocket(`${wsUrl}?token=${userToken}&pin=${pin}`);

    socket.onopen = () => {
      console.log('웹소켓 연결 성공');
    };

    socket.onmessage = async (message) => {
      let parsedData;

      if (typeof message.data === 'string') {
        parsedData = JSON.parse(message.data);
      } else if (message.data instanceof ArrayBuffer) {
        const text = await arrayBufferToString(message.data);
        parsedData = JSON.parse(text);
      } else if (message.data instanceof Blob) {
        const text = await blobToString(message.data);
        parsedData = JSON.parse(text);
      } else {
        console.error("지원되지 않는 메시지 형식입니다.");
        return;
      }

      if (parsedData.type === 'quizStartingSoon') {
        setIsQuizStarting(true);  
        setIsWaitingForQuizStart(false);  
      } 
      else if (parsedData.type === 'preparingNextQuestion') {
        setIsPreparingNextQuestion(true);  
        setIsLastQuestion(parsedData.isLastQuestion); 
        setIsFeedbackReceived(false);  
        setCurrentQuestion(null); 
      } 
      else if (parsedData.type === 'newQuestionOptions') {
        setIsQuizStarting(false);  
        setIsPreparingNextQuestion(false);  
        setCurrentQuestion(parsedData);
        setTimeLeft(parsedData.timeLimit);
        setSelectedAnswer(null);
        setStartTime(Date.now());  
        setIsAnswerSubmitted(false); 
        setWaitingForFeedback(false); 
        setIsFeedbackReceived(false);  
      } 
      else if (parsedData.type === 'feedback') {
        const feedback = parsedData.correct ? "정답입니다!" : "오답입니다.";
        setScore(parsedData.score); 
        if (isLastQuestion) {
          setFeedbackMessage(`${feedback} 최종 점수: ${parsedData.score}`);
        } else {
          setFeedbackMessage(`${feedback} 현재 점수: ${parsedData.score}`);
        }
        setWaitingForFeedback(false); 
        setIsFeedbackReceived(true);  
      }
      else if (parsedData.type === 'quizCompleted') {
        navigate(`/quiz-result/${pin}`);
      } 
      else if (parsedData.type === 'sessionEnded') {
        navigate('/my-quizzes');
      }
    };

    socket.onerror = (error) => {
      console.error('웹소켓 오류:', error);
      setError('서버와의 연결에 문제가 발생했습니다.');
    };

    socket.onclose = () => {
      console.log('웹소켓 연결 종료');
      setError('서버와의 연결이 종료되었습니다.');
    };

    setWebSocket(socket);

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [pin, userToken, navigate]);

  // 캐릭터 선택 시 메시지 전송
  const sendCharacterSelection = (character: string) => {
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type: 'characterSelected', character });
      webSocket.send(message);
      console.log(`캐릭터 선택 메시지 전송: ${message}`);
    }
  };

  const arrayBufferToString = (buffer: ArrayBuffer): Promise<string> => {
    return new Promise((resolve) => {
      const decoder = new TextDecoder('utf-8');
      resolve(decoder.decode(buffer));
    });
  };

  const blobToString = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blob);
    });
  };

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0)); 
      }, 1000);
  
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && webSocket && currentQuestion && startTime && !isAnswerSubmitted) {
      const responseTime = Date.now() - startTime;
      const selectedOptionIndex = selectedAnswer
        ? currentQuestion.options.findIndex(option => option.text === selectedAnswer)
        : -1; 
  
      webSocket.send(
        JSON.stringify({
          type: 'submitAnswer',
          answerIndex: selectedOptionIndex,  
          questionId: currentQuestion.questionId,
          responseTime: responseTime,
        })
      );
      setIsAnswerSubmitted(true); 
      setWaitingForFeedback(true); 
    }
  }, [timeLeft, selectedAnswer, currentQuestion, startTime, webSocket, isAnswerSubmitted]);

  const handleCharacterSelect = (character: string) => {
    setSelectedCharacter(character);
    sendCharacterSelection(character); // 캐릭터 선택 시 메시지 전송
  };

  const handleReady = () => {
    if (webSocket && !isReady) {
      webSocket.send(JSON.stringify({ type: 'ready' }));
      setIsReady(true);
      setIsWaitingForQuizStart(true);  
    }
  };

  const handleAnswerSelect = (answer: string) => {
    if (selectedAnswer || isAnswerSubmitted) return; 
    
    setSelectedAnswer(answer);

    if (webSocket && currentQuestion && startTime) {
      const responseTime = Date.now() - startTime; 

      const selectedOptionIndex = currentQuestion.options.findIndex(
        option => option.text === answer
      );

      webSocket.send(
        JSON.stringify({
          type: 'submitAnswer',
          answerIndex: selectedOptionIndex,  
          questionId: currentQuestion.questionId,   
          responseTime: responseTime,        
        })
      );
      setIsAnswerSubmitted(true); 
      setWaitingForFeedback(true); 
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ padding: 4, borderRadius: '16px' }}>
        {!selectedCharacter ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h6">캐릭터를 선택하세요:</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button onClick={() => handleCharacterSelect('character1')}>
                <img src={Character1} alt="캐릭터 1" width={100} />
              </Button>
              <Button onClick={() => handleCharacterSelect('character2')}>
                <img src={Character2} alt="캐릭터 2" width={100} />
              </Button>
            </Box>
          </Box>
        ) : (
          <>
            <WaitingScreenComponent
              isReady={isReady}
              isQuizStarting={isQuizStarting}
              isWaitingForQuizStart={isWaitingForQuizStart}
              isPreparingNextQuestion={isPreparingNextQuestion}
              isLastQuestion={isLastQuestion}
              handleReady={handleReady}
            />

            {currentQuestion && !isFeedbackReceived && (
              <QuizQuestionComponent
                currentQuestion={currentQuestion}
                selectedAnswer={selectedAnswer}
                handleAnswerSelect={handleAnswerSelect}
                timeLeft={timeLeft}
              />
            )}

            {isFeedbackReceived && (
              <QuizFeedbackComponent feedbackMessage={feedbackMessage} isLastQuestion={isLastQuestion} />
            )}

            {waitingForFeedback && (
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <CircularProgress />
                <Typography variant="body1">피드백을 기다리는 중입니다...</Typography>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default StudentQuizSessionPage;
