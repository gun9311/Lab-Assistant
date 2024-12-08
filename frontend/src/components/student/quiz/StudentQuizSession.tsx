import React, { useEffect, useState } from 'react';
import { Container, Paper, Box, Typography, Button, CircularProgress, Tooltip } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { getToken } from '../../../utils/auth';
import QuizQuestionComponent from './components/QuizQuestion';
import QuizFeedbackComponent from './components/QuizFeedback';
import WaitingScreenComponent from './components/WaitingScreen';

// 각 캐릭터 이미지를 정적으로 가져와 배열에 저장
import Character1 from '../../../assets/character/character1.png';
import Character2 from '../../../assets/character/character2.png';
import Character3 from '../../../assets/character/character3.png';
import Character4 from '../../../assets/character/character4.png';
import Character5 from '../../../assets/character/character5.png';
import Character6 from '../../../assets/character/character6.png';
import Character7 from '../../../assets/character/character7.png';
import Character8 from '../../../assets/character/character8.png';
import Character9 from '../../../assets/character/character9.png';
import Character10 from '../../../assets/character/character10.png';

const characterImages = [
  Character1,
  Character2,
  Character3,
  Character4,
  Character5,
  Character6,
  Character7,
  Character8,
  Character9,
  Character10,
];

interface Option {
  text: string;
  imageUrl?: string;
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
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
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
  const [selectedCharacter, setSelectedCharacter] = useState<number | string | null>(null); // 캐릭터 선택 상태
  const [takenCharacters, setTakenCharacters] = useState<Set<number>>(new Set());
  
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
      // else if (parsedData.type === 'characterAcknowledged') {
      //   setSelectedCharacter(parsedData.character);
      else if (parsedData.error === 'Character already taken') {
        alert('이미 선택된 캐릭터입니다. 다른 캐릭터를 선택하세요.');
      } else if (parsedData.type === 'characterSelected') {
        setTakenCharacters(prev => new Set(prev).add(parseInt(parsedData.character.replace('character', '')) - 1));
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
  const sendCharacterSelection = (characterIndex: number) => {
    if (webSocket && webSocket.readyState === WebSocket.OPEN && !takenCharacters.has(characterIndex)) {
      const message = JSON.stringify({ type: 'characterSelected', character: `character${characterIndex + 1}` });
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
        ? selectedAnswer : -1; 
  
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

  const handleCharacterSelect = (index: number) => {
    setSelectedCharacter(index);
    sendCharacterSelection(index);
  };

  const handleReady = () => {
    if (webSocket && !isReady) {
      webSocket.send(JSON.stringify({ type: 'ready' }));
      setIsReady(true);
      setIsWaitingForQuizStart(true);  
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer || isAnswerSubmitted) return; 
    setIsAnswerSubmitted(true); 
    
    console.log(index);
    setSelectedAnswer(index);

    if (webSocket && currentQuestion && startTime) {
      const responseTime = Date.now() - startTime; 

      webSocket.send(
        JSON.stringify({
          type: 'submitAnswer',
          answerIndex: index,  
          questionId: currentQuestion.questionId,   
          responseTime: responseTime,        
        })
      );
      setWaitingForFeedback(true); 
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ padding: 4, borderRadius: '16px' }}>
        {!selectedCharacter ? (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h6">캐릭터를 선택하세요:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', mt: 2, gap: 2 }}>
              {characterImages.map((characterImage, index) => (
                <Tooltip
                  key={index}
                  title={takenCharacters.has(index) ? "이미 선택된 캐릭터입니다" : ""}
                  arrow
                >
                  <Button
                    onClick={() => handleCharacterSelect(index)}
                    sx={{
                      p: 0,
                      filter: takenCharacters.has(index) ? 'grayscale(100%)' : 'none',
                      opacity: takenCharacters.has(index) ? 0.5 : 1,
                      cursor: takenCharacters.has(index) ? 'not-allowed' : 'pointer',
                    }}
                    disabled={takenCharacters.has(index)}
                  >
                    <img src={characterImage} alt={`캐릭터 ${index + 1}`} width={100} />
                  </Button>
                </Tooltip>
              ))}
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
