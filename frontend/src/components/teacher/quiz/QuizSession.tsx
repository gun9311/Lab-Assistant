import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { getToken } from '../../../utils/auth';
import StudentListComponent from './components/StudentList';
import QuestionComponent from './components/Question';
import ResultComponent from './components/Result';
import backgroundImage from '../../../assets/quiz_show_background.png';

type Student = {
  id: string;
  name: string;
  isReady: boolean;
  character: string;
  hasSubmitted?: boolean;
  isCorrect?: boolean;
  rank?: number; // 순위 정보 추가
};

type Question = {
  _id: string;
  questionText: string;
  correctAnswer: number;
  options: { text: string }[];
  timeLimit: number;
};

type Feedback = {
  studentId: string;
  name: string;
  score: number;
  isCorrect: boolean;
  rank: number;
};

const QuizSessionPage = () => {
  const location = useLocation();
  const { pin } = location.state;
  const [students, setStudents] = useState<Student[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [allStudentsReady, setAllStudentsReady] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [isQuizStarting, setIsQuizStarting] = useState(false);
  const [isPreparingNextQuestion, setIsPreparingNextQuestion] = useState(false);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [allSubmitted, setAllSubmitted] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isShowingFeedback, setIsShowingFeedback] = useState(false);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [quizResults, setQuizResults] = useState<Feedback[] | null>(null);
  const [isViewingResults, setIsViewingResults] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const navigate = useNavigate();

  const socketRef = React.useRef<WebSocket | null>(null);

  useEffect(() => {
    const userToken = getToken();
    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;
    const socket = new WebSocket(`${wsUrl}?token=${userToken}&pin=${pin}`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connection established');
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'studentJoined') {
        setStudents((prevStudents) => [
          ...prevStudents,
          { 
            id: message.studentId, 
            name: message.name, 
            isReady: false, 
            character: message.character
          },
        ]);
        setTotalStudents((prevCount) => prevCount + 1);
      } else if (message.type === 'studentReady') {
        setStudents((prevStudents) =>
          prevStudents.map((student) =>
            student.id === message.studentId ? { ...student, isReady: true } : student
          )
        );
      } else if (message.type === 'quizStartingSoon') {
        setIsQuizStarting(true);
      } else if (message.type === 'quizStarted') {
        setIsQuizStarting(false);
        setIsSessionActive(true);
        setIsShowingFeedback(false);
        setCurrentQuestion(message.currentQuestion);
      } else if (message.type === 'preparingNextQuestion') {
        setIsPreparingNextQuestion(true)
        setIsLastQuestion(message.isLastQuestion);
        setCurrentQuestion(null);
        setIsShowingFeedback(false);
      } else if (message.type === 'newQuestion') {
        setIsPreparingNextQuestion(false)
        setIsShowingFeedback(false);
        setCurrentQuestion(message.currentQuestion);
        setSubmittedCount(0);
        setAllSubmitted(false);
      } else if (message.type === 'studentSubmitted') {
        setStudents((prevStudents) =>
          prevStudents.map((student) =>
            student.id === message.studentId
              ? { ...student, hasSubmitted: true }
              : student
          )
        );
        setSubmittedCount((prevCount) => prevCount + 1);
      } else if (message.type === 'allStudentsSubmitted') {
        console.log('모두 제출')
        const feedback = message.feedback;
        setAllSubmitted(true);
        
        setTimeout(() => {
          setStudents((prevStudents) =>
          prevStudents.map((student) => {
            const studentFeedback = feedback.find((f:any) => f.studentId === student.id);
            if (studentFeedback) {
              return {
                ...student,
                hasSubmitted: false,
                isCorrect: studentFeedback.isCorrect,
                rank: studentFeedback.rank, // 순위 반영
              };
            }
            return student;
          })
        );
          setIsShowingFeedback(true);  // 피드백 표시 상태로 전환
        }, 3000);  // 3초 지연
        setFeedbacks(feedback);  // 피드백 저장
      } else if (message.type === 'quizCompleted') {
        setIsSessionActive(false);
      } else if (message.type === 'detailedResults') {
        setQuizResults(message.results);
        setIsViewingResults(true);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      socket.close();
    };
  }, [pin]);

  useEffect(() => {
    const allReady = students.length > 0 && students.every((student) => student.isReady);
    setAllStudentsReady(allReady);
  }, [students]);

  const handleStartQuiz = () => {
    setQuizStarted(true);
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: 'startQuiz' }));
    }
  };

  const handleNextQuestion = () => {
    setStudents((prevStudents) =>
      prevStudents.map((student) => ({
        ...student,
        hasSubmitted: false,
        isCorrect: undefined,
        rank: undefined,
      }))
    );
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: 'nextQuestion' }));
    }
  };

  const handleEndQuiz = () => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: 'endQuiz' }));
      setIsSessionActive(false);
      navigate('/manage-quizzes');
    }
  };

  const handleViewResults = () => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: 'viewDetailedResults' }));
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start', // 상단으로 문제 영역을 배치
        padding: '1rem', // 상단에 여유 공간 추가
      }}
    >
      {isViewingResults ? (
        <ResultComponent quizResults={quizResults} handleEndQuiz={handleEndQuiz} />
      ) : (
        <>
          {!quizStarted && (
            <Box sx={{ position: 'absolute', top: '5%', textAlign: 'center' }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#fff' }}>
                PIN: {pin}
              </Typography>
            </Box>
          )}

          {isQuizStarting && (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                퀴즈가 곧 시작됩니다...
              </Typography>
            </Box>
          )}

          {isPreparingNextQuestion && (
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2196f3' }}>
                {isLastQuestion ? '마지막 문제입니다...' : '다음 문제가 곧 출제됩니다...'}
              </Typography>
            </Box>
          )}

          {/* 문제 컴포넌트 상단 배치 */}
          {isSessionActive && currentQuestion && (
            <Box
              sx={{
                display: 'flex', 
                justifyContent: 'center',
                alignItems: 'center',
                opacity: isShowingFeedback ? 0.3 : 1, // 피드백 시 투명도 변화
                transition: 'opacity 0.5s ease-in-out',
              }}
            >
              <QuestionComponent
                currentQuestion={currentQuestion}
                submittedCount={submittedCount}
                totalStudents={totalStudents}
                allSubmitted={allSubmitted}
              />
            </Box>
          )}

          {/* 학생 목록 컴포넌트 */}
          <Box
            sx={{
              position: isShowingFeedback ? 'absolute' : 'fixed', // 피드백 시 상단까지 확장
              bottom: isShowingFeedback ? '0' : '10%', // 피드백 시 하단 고정 해제
              top: isShowingFeedback ? '0' : 'auto',  // 피드백 시 상단까지 확장
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '2rem',
              padding: '0 2rem',
              height: isShowingFeedback ? '100vh' : 'auto', // 피드백 시 전체 화면 사용
              transition: 'all 0.5s ease-in-out', // 부드러운 전환
            }}
          >
            <StudentListComponent
              students={students}
              feedbacks={feedbacks}
              allStudentsReady={allStudentsReady}
              handleStartQuiz={handleStartQuiz}
              quizStarted={quizStarted}
              isShowingFeedback={isShowingFeedback}
              isLastQuestion={isLastQuestion}
              rankMoveEnabled={isShowingFeedback}  /* 순위 이동 활성화 */
              handleNextQuestion={handleNextQuestion}  /* 핸들러 추가 */
              handleEndQuiz={handleEndQuiz}
              handleViewResults={handleViewResults}
            />
          </Box>
        </>
      )}
    </Box>
  );
};

export default QuizSessionPage;
