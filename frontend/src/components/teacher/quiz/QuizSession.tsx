// QuizSessionPage.tsx

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { getToken } from "../../../utils/auth";
import StudentListComponent from "./components/StudentList";
import QuestionComponent from "./components/Question";
import ResultComponent from "./components/Result";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
// import backgroundImage from '../../../assets/quiz_show_background.png';
import "./QuizSession.css";
const backgroundImages = [
  // require('../../../assets/quiz-theme/quiz_theme1.webp'),
  // require('../../../assets/quiz-theme/quiz_theme2.webp'),
  // require('../../../assets/quiz-theme/quiz_theme3.webp'),
  // require('../../../assets/quiz-theme/quiz_theme4.webp'),
  // require('../../../assets/quiz-theme/quiz_theme5.webp'),
  // require('../../../assets/quiz-theme/quiz_theme6.webp'),
  require("../../../assets/quiz-theme/quiz_theme1.png"),
  require("../../../assets/quiz-theme/quiz_theme2.png"),
  require("../../../assets/quiz-theme/quiz_theme3.png"),
  require("../../../assets/quiz-theme/quiz_theme4.png"),
  require("../../../assets/quiz-theme/quiz_theme5.png"),
  require("../../../assets/quiz-theme/quiz_theme6.png"),
  // require('../../../assets/quiz-theme/quiz_theme7.webp'),
  // require('../../../assets/quiz-theme/quiz_theme8.webp'),
  // require('../../../assets/quiz-theme/quiz_theme9.webp'),
  // require('../../../assets/quiz-theme/quiz_theme10.webp'),
  // require('../../../assets/quiz-theme/quiz_theme11.webp'),
  // require('../../../assets/quiz-theme/quiz_theme12.webp'),
  // require('../../../assets/quiz-theme/quiz_theme13.webp'),
];

type Student = {
  id: string;
  name: string;
  isReady: boolean;
  character: string;
  hasSubmitted?: boolean;
  isCorrect?: boolean;
  rank?: number; // 순위 정보 추가
  prevRank?: number;
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

const QuizSessionPage = ({
  setIsQuizMode,
}: {
  setIsQuizMode: (value: boolean) => void;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [backgroundImage, setBackgroundImage] = useState<string>(
    backgroundImages[0]
  ); // 초기값 설정
  const [endTime, setEndTime] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0); // 현재 문제 번호 상태 추가
  const [totalQuestions, setTotalQuestions] = useState<number>(0); // 총 문제 수 상태 추가

  const socketRef = React.useRef<WebSocket | null>(null);

  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");

  useEffect(() => {
    setIsQuizMode(true);

    const randomImage =
      backgroundImages[Math.floor(Math.random() * backgroundImages.length)];
    setBackgroundImage(randomImage);

    const userToken = getToken();
    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;
    const socket = new WebSocket(`${wsUrl}?token=${userToken}&pin=${pin}`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "studentJoined") {
        setStudents((prevStudents) => [
          ...prevStudents,
          {
            id: message.studentId,
            name: message.name,
            isReady: message.isReady,
            character: message.character,
          },
        ]);
        setTotalStudents((prevCount) => prevCount + 1);
      } else if (message.type === "studentDisconnected") {
        setStudents((prevStudents) =>
          prevStudents.filter((student) => student.id !== message.studentId)
        );
        setTotalStudents((prevCount) => prevCount - 1);
        console.log(`Student ${message.name} disconnected`);
      } else if (message.type === "quizStartingSoon") {
        setTotalQuestions(message.totalQuestions); // 총 문제 수 설정
        setCurrentQuestionIndex(1); // 첫 번째 문제로 설정
        setIsQuizStarting(true);
      } else if (message.type === "quizStarted") {
        setIsQuizStarting(false);
        setIsSessionActive(true);
        setIsShowingFeedback(false);
        setCurrentQuestion(message.currentQuestion);
        setEndTime(message.endTime);
      } else if (message.type === "preparingNextQuestion") {
        setCurrentQuestionIndex((prevIndex) => prevIndex + 1); // 다음 문제로 인덱스 증가
        setIsPreparingNextQuestion(true);
        setIsLastQuestion(message.isLastQuestion);
        setCurrentQuestion(null);
        setIsShowingFeedback(false);
      } else if (message.type === "newQuestion") {
        setIsPreparingNextQuestion(false);
        setIsShowingFeedback(false);
        setCurrentQuestion(message.currentQuestion);
        setSubmittedCount(0);
        setAllSubmitted(false);
        setEndTime(message.endTime);
      } else if (message.type === "studentSubmitted") {
        setStudents((prevStudents) =>
          prevStudents.map((student) =>
            student.id === message.studentId
              ? { ...student, hasSubmitted: true }
              : student
          )
        );
        setSubmittedCount((prevCount) => prevCount + 1);
      } else if (message.type === "allStudentsSubmitted") {
        console.log("모두 제출");
        const feedback = message.feedback;
        setAllSubmitted(true);

        setTimeout(() => {
          setStudents((prevStudents) =>
            prevStudents.map((student) => {
              const studentFeedback = feedback.find(
                (f: any) => f.studentId === student.id
              );
              if (studentFeedback) {
                return {
                  ...student,
                  // hasSubmitted: false,
                  isCorrect: studentFeedback.isCorrect,
                  prevRank: student.rank,
                  rank: studentFeedback.rank, // 순위 반영
                };
              }
              return student;
            })
          );
          console.log("Updated students with ranks:", students);
          setIsShowingFeedback(true); // 피드백 표시 상태로 전환
        }, 3000); // 3초 지연
        setFeedbacks(feedback); // 피드백 저장
      } else if (message.type === "quizCompleted") {
        setIsSessionActive(false);
      } else if (message.type === "detailedResults") {
        setQuizResults(message.results);
        setIsViewingResults(true);
      } else if (message.type === "sessionEnded") {
        navigate("/manage-quizzes");
      } else if (message.type === "noStudentsRemaining") {
        setConfirmMessage(message.message);
        setOpenConfirmDialog(true);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      socket.close();
      setIsQuizMode(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.error(
            `Error exiting full-screen mode: ${err.message} (${err.name})`
          );
        });
      }
    };
  }, [pin, setIsQuizMode]);

  useEffect(() => {
    const allReady =
      students.length > 0 && students.every((student) => student.isReady);
    setAllStudentsReady(allReady);
  }, [students]);

  const handleStartQuiz = () => {
    setQuizStarted(true);
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: "startQuiz" }));
    }
  };

  const handleNextQuestion = () => {
    setStudents((prevStudents) =>
      prevStudents.map((student) => ({
        ...student,
        hasSubmitted: false,
        // isCorrect: undefined,
        // rank: undefined,
      }))
    );
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: "nextQuestion" }));
    }
  };

  const handleEndQuiz = () => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: "endQuiz" }));
      setIsSessionActive(false);
      // navigate("/manage-quizzes");
    }
  };

  const handleViewResults = () => {
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: "viewDetailedResults" }));
    }
  };

  const handleConfirmClose = (confirm: boolean) => {
    setOpenConfirmDialog(false);
    if (confirm) {
      if (isLastQuestion && allSubmitted) {
        handleEndQuiz(); // 마지막 문제를 모두 풀었다면 세션 종료
      } else {
        navigate("/manage-quizzes"); // 그렇지 않다면 바로 이동
      }
    }
  };

  const handleFullscreenToggle = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: "100%",
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "0",
        margin: "0",
        boxSizing: "border-box",
      }}
    >
      <IconButton
        onClick={() => navigate("/manage-quizzes")}
        sx={{
          position: "absolute",
          top: "2vw",
          left: "3vw",
          zIndex: 1000,
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.7)",
          },
        }}
      >
        <ArrowBackIcon />
      </IconButton>

      <IconButton
        onClick={handleFullscreenToggle}
        sx={{
          position: "absolute",
          top: "2vw",
          right: "3vw",
          zIndex: 1000,
          color: "white",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.7)",
          },
        }}
      >
        <FullscreenIcon />
      </IconButton>

      {isViewingResults ? (
        <ResultComponent
          quizResults={quizResults}
          handleEndQuiz={handleEndQuiz}
        />
      ) : (
        <>
          {!quizStarted && (
            <Box sx={{ position: "absolute", top: "5%", textAlign: "center" }}>
              <Typography
                variant="h2"
                gutterBottom
                sx={{
                  fontWeight: "bold",
                  color: "#fff",
                  backgroundColor: "rgba(0, 0, 0, 0.5)", // 배경색 추가
                  padding: "0.5rem 1rem", // 패딩 추가
                  borderRadius: "8px", // 모서리 둥글게
                }}
              >
                PIN: {pin}
              </Typography>
            </Box>
          )}

          {isQuizStarting && (
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                backgroundColor: "rgba(0, 0, 0, 0.7)", // 배경색 추가
                padding: "1rem 2rem", // 패딩 추가
                borderRadius: "12px", // 모서리 둥글게
                border: "2px solid #FFD700", // 테두리 추가
                animation: "fadeIn 1s ease-in-out", // 애니메이션 추가
              }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontWeight: "bold",
                  color: "#FFD700", // 밝고 대조적인 색상
                  fontFamily: "'Fredoka One', cursive", // 활기찬 글씨체
                  fontSize: "7vw", // 더 큰 글씨 크기
                  textShadow: "2px 2px 4px #000000", // 그림자 효과
                  animation: "bounce 1.5s infinite", // 애니메이션 추가
                }}
              >
                {currentQuestionIndex}/{totalQuestions}
              </Typography>
            </Box>
          )}

          {isPreparingNextQuestion && (
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                backgroundColor: "rgba(0, 0, 0, 0.7)", // 배경색 추가
                padding: "1rem 2rem", // 패딩 추가
                borderRadius: "12px", // 모서리 둥글게
                border: "2px solid #FFD700", // 테두리 추가
                animation: "fadeIn 1s ease-in-out", // 애니메이션 추가
              }}
            >
              <Typography
                variant="h2"
                sx={{
                  fontWeight: "bold",
                  color: "#FFD700", // 밝고 대조적인 색상
                  fontFamily: "'Fredoka One', cursive", // 활기찬 글씨체
                  fontSize: "7vw", // 큰 글씨 크기
                  textShadow: "2px 2px 4px #000000", // 그림자 효과
                  animation: "bounce 1.5s infinite", // 애니메이션 추가
                }}
              >
                {currentQuestionIndex}/{totalQuestions}
              </Typography>
            </Box>
          )}

          {/* 문제 컴포넌트를 위한 독립된 중앙 배치 박스 */}
          {isSessionActive && currentQuestion && (
            <Box
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "95%",
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                opacity: isShowingFeedback ? 0.3 : 1, // 피드백 시 투명도 변화
                transition: "opacity 0.5s ease-in-out",
                pointerEvents: isShowingFeedback ? "none" : "auto", // 피드백 시 클릭 차단
              }}
            >
              <QuestionComponent
                currentQuestion={currentQuestion}
                submittedCount={submittedCount}
                totalStudents={totalStudents}
                allSubmitted={allSubmitted}
                endTime={endTime}
              />
            </Box>
          )}

          {/* 학생 목록 컴포넌트를 위한 별도의 중앙 배치 박스 */}
          {(!isSessionActive || isShowingFeedback) && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100vw", // 화면 너비의 100%
                height: "100vh", // 화면 높이의 100%
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: "0 2vw", // 화면 비율로 패딩 설정
                zIndex: isShowingFeedback ? 10 : 1, // 피드백 시 학생 목록 우선
              }}
            >
              <StudentListComponent
                students={students}
                allStudentsReady={allStudentsReady}
                handleStartQuiz={handleStartQuiz}
                quizStarted={quizStarted}
                isShowingFeedback={isShowingFeedback}
                isLastQuestion={isLastQuestion}
                handleNextQuestion={handleNextQuestion}
                handleEndQuiz={handleEndQuiz}
                handleViewResults={handleViewResults}
              />
            </Box>
          )}

          {/* 퀴즈 시작 버튼을 하단에 추가 */}
          {!quizStarted && allStudentsReady && (
            <Box
              sx={{
                position: "absolute",
                bottom: "10%",
                textAlign: "center",
                zIndex: 1000,
                marginBottom: "2vh", // 작은 화면에서 여유 공간 추가
              }}
            >
              <Button
                variant="contained"
                onClick={handleStartQuiz}
                startIcon={<PlayArrowIcon />} // 아이콘 추가
                sx={{
                  fontSize: "1.3vw", // 화면 너비의 비율로 글씨 크기 설정
                  fontWeight: "bold",
                  padding: "0.7vw 1.5vw", // 화면 비율로 패딩 설정
                  background:
                    "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)",
                  boxShadow: "0 3px 5px 2px rgba(255, 105, 135, .3)",
                  color: "white",
                  fontFamily: "'Roboto', sans-serif", // 글씨체 변경
                  transition: "transform 0.3s ease-in-out",
                  "&:hover": {
                    background:
                      "linear-gradient(45deg, #FF8E53 30%, #FE6B8B 90%)",
                    transform: "scale(1.1)",
                  },
                }}
              >
                START
              </Button>
            </Box>
          )}
        </>
      )}

      <Dialog
        open={openConfirmDialog}
        onClose={() => handleConfirmClose(false)}
      >
        <DialogTitle>세션 종료</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmMessage}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleConfirmClose(false)} color="primary">
            취소
          </Button>
          <Button
            onClick={() => handleConfirmClose(true)}
            color="primary"
            autoFocus
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuizSessionPage;
