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
  Popover,
  Stack,
  Slider,
  Divider,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import { getToken } from "../../../utils/auth";
import StudentListComponent from "./components/StudentList";
import QuestionComponent from "./components/Question";
import ResultComponent from "./components/ResultComponent";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
// import backgroundImage from '../../../assets/quiz_show_background.png';
import "./QuizSession.css";
import {
  playRandomBgm,
  stopBgm,
  fadeOutBgm,
  playSe,
  toggleMute,
  setBgmVolume,
  setSeVolume,
  getInitialVolumes,
  startTickingLoop,
  stopTickingLoop,
  duckBgm,
  unduckBgm,
  playWinnerSequence,
} from "../../../utils/soundManager";

type Student = {
  id: string;
  name: string;
  isReady: boolean;
  character: string;
  hasSubmitted?: boolean;
  isCorrect?: boolean;
  rank?: number; // 순위 정보 추가
  prevRank?: number;
  score?: number; // 점수 정보 추가
  prevScore?: number; // 이전 점수 추가
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

// 백엔드 payload 구조에 맞춘 타입 정의 (export 추가)
export interface QuizMetadata {
  title: string;
  totalQuestions: number;
  grade?: number;
  subject?: string;
  semester?: string;
  unit?: string;
}

export interface QuestionDetail {
  questionId: string;
  questionText: string;
  questionType: string;
  imageUrl?: string;
  options: { text: string; imageUrl?: string }[];
  correctAnswer: string | number;
  correctAnswerRate: number;
  totalAttempts: number;
  optionDistribution: {
    optionIndex: number;
    text: string;
    imageUrl?: string;
    count: number;
    percentage: number;
  }[];
}

export interface OverallRankingStudent {
  studentId: string;
  name: string;
  score: number;
  responses: any[];
  character?: string;
  rank: number;
}

export interface QuizSummary {
  totalParticipants: number;
  averageScore: number;
  mostDifficultQuestions: {
    questionId: string;
    questionText: string;
    correctAnswerRate: number;
  }[];
  easiestQuestions: {
    questionId: string;
    questionText: string;
    correctAnswerRate: number;
  }[];
}

export interface DetailedResultsPayload {
  overallRanking: OverallRankingStudent[];
  questionDetails: QuestionDetail[];
  quizSummary: QuizSummary;
  quizMetadata: QuizMetadata;
}

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
  // const [allStudentsReady, setAllStudentsReady] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const [isQuizStarting, setIsQuizStarting] = useState(false);
  const [isPreparingNextQuestion, setIsPreparingNextQuestion] = useState(false);
  const [totalParticipantsInQuestion, setTotalParticipantsInQuestion] =
    useState<number>(0);
  const [allSubmitted, setAllSubmitted] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [isShowingFeedback, setIsShowingFeedback] = useState(false);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [detailedQuizResults, setDetailedQuizResults] =
    useState<DetailedResultsPayload | null>(null);
  const [isViewingResults, setIsViewingResults] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [endTime, setEndTime] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0); // 현재 문제 번호 상태 추가
  const [totalQuestions, setTotalQuestions] = useState<number>(0); // 총 문제 수 상태 추가

  // Add new loading states
  const [isProcessingNextQuestion, setIsProcessingNextQuestion] =
    useState(false);
  const [isProcessingEndQuiz, setIsProcessingEndQuiz] = useState(false);
  const [isProcessingViewResults, setIsProcessingViewResults] = useState(false);
  const [showOptions, setShowOptions] = useState<boolean>(false); // 선택지 표시/숨김 상태 추가

  const socketRef = React.useRef<WebSocket | null>(null);

  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");

  const [timeLeft, setTimeLeft] = useState<number>(0);

  // === Sound 상태 =====
  const currentBgmRef = React.useRef<"waiting" | "playing" | "winner" | null>(
    null
  );
  const prevStudentCnt = React.useRef(0);

  // 사운드 컨트롤 UI 상태
  const [soundControlAnchor, setSoundControlAnchor] =
    useState<null | HTMLElement>(null);
  const [isMuted, setIsMuted] = useState(getInitialVolumes().mute);
  const [bgmVolume, setLocalBgmVolume] = useState(getInitialVolumes().bgm);
  const [seVolume, setLocalSeVolume] = useState(getInitialVolumes().se);

  useEffect(() => {
    setIsQuizMode(true);

    const imageCount = 15; // 테마 이미지 개수
    const randomIndex = Math.floor(Math.random() * imageCount) + 1;
    const randomImageUrl = `/assets/quiz-theme/quiz_theme${randomIndex}.png`;
    setBackgroundImage(randomImageUrl);

    const userToken = getToken();
    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;
    const socket = new WebSocket(`${wsUrl}/?token=${userToken}&pin=${pin}`);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "studentJoined") {
        setStudents((prevStudents) => {
          const existingStudent = prevStudents.find(
            (student) => student.id === message.studentId
          );
          if (existingStudent) {
            return prevStudents;
          }
          return [
            ...prevStudents,
            {
              id: message.studentId,
              name: message.name,
              isReady: message.isReady,
              character: message.character,
            },
          ];
        });
      } else if (message.type === "studentDisconnected") {
        setStudents((prevStudents) =>
          prevStudents.filter((student) => student.id !== message.studentId)
        );
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
        if (typeof message.activeStudentCount === "number") {
          setTotalParticipantsInQuestion(message.activeStudentCount);
        }
      } else if (message.type === "preparingNextQuestion") {
        setCurrentQuestionIndex((prevIndex) => prevIndex + 1); // 다음 문제로 인덱스 증가
        setIsPreparingNextQuestion(true);
        setIsLastQuestion(message.isLastQuestion);
        setCurrentQuestion(null);
        setIsShowingFeedback(false);
        setCurrentQuestion(message.currentQuestion);
        setSubmittedCount(0);
        setAllSubmitted(false);
        setEndTime(message.endTime);
        if (typeof message.activeStudentCount === "number") {
          setTotalParticipantsInQuestion(message.activeStudentCount);
        }
        setIsProcessingNextQuestion(false); // Reset loading state also here if flow allows
      } else if (message.type === "newQuestion") {
        setIsPreparingNextQuestion(false);
        setIsShowingFeedback(false);
        setCurrentQuestion(message.currentQuestion);
        setSubmittedCount(0);
        setAllSubmitted(false);
        setEndTime(message.endTime);
        if (typeof message.activeStudentCount === "number") {
          setTotalParticipantsInQuestion(message.activeStudentCount);
        }
        setIsProcessingNextQuestion(false); // Reset loading state also here if flow allows
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
        const feedbackMessageData = message.feedback; // 변수명 변경 (기존 feedbacks와 혼동 방지)
        setAllSubmitted(true);

        setTimeout(() => {
          setStudents((prevStudents) =>
            prevStudents.map((student) => {
              const studentFeedback = feedbackMessageData.find(
                // 변경된 변수명 사용
                (f: any) => f.studentId === student.id
              );
              if (studentFeedback) {
                return {
                  ...student,
                  isCorrect: studentFeedback.isCorrect,
                  prevRank: student.rank,
                  rank: studentFeedback.rank,
                  prevScore: student.score, // 이전 점수 저장
                  score: studentFeedback.score, // 점수 업데이트
                };
              }
              return student;
            })
          );
          setIsShowingFeedback(true);
        }, 3000);
        setFeedbacks(feedbackMessageData); // 변경된 변수명 사용
      } else if (message.type === "quizCompleted") {
        setIsSessionActive(false);
        // setIsProcessingEndQuiz(false); // It might be better to reset on navigate or unmount
      } else if (message.type === "detailedResults") {
        // payload를 사용하도록 수정
        setDetailedQuizResults(message.payload);
        setIsViewingResults(true);
        setIsProcessingViewResults(false);
      } else if (message.type === "sessionEnded") {
        // setIsProcessingEndQuiz(false); // Reset before navigating
        navigate("/manage-quizzes");
      } else if (message.type === "noStudentsRemaining") {
        if (!isViewingResults && !isProcessingViewResults) {
          setConfirmMessage(message.message);
          setOpenConfirmDialog(true);
        } else {
          console.log(
            "Suppressed 'noStudentsRemaining' dialog because detailed results are being viewed or processed."
          );
        }
      } else if (message.type === "sessionClosedByTeacher") {
        // 학생 측에서 받을 메시지
        alert(
          message.message ||
            "The teacher has ended this session or is viewing results. You will be disconnected."
        );
        // 학생의 경우 여기서 추가 정리 로직 (예: 메인 화면으로 이동)
        // socketRef.current?.close(); // 이미 서버에서 닫힐 것이므로 클라이언트에서 또 닫을 필요는 없을 수 있음
        navigate("/"); // 예시: 학생을 홈으로 보냄
      } else if (message.type === "activeStudentCountUpdated") {
        if (typeof message.activeStudentCount === "number") {
          setTotalParticipantsInQuestion(message.activeStudentCount);
        }
      }
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
      // Reset processing states on close as well to be safe
      setIsProcessingNextQuestion(false);
      setIsProcessingEndQuiz(false);
      setIsProcessingViewResults(false);
    };

    return () => {
      socket.close();
      stopBgm(); // 🔹연결 종료 시 BGM 정지
      stopTickingLoop(); // 🔹 Ticking 효과음도 확실히 정지
      setIsQuizMode(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.error(
            `Error exiting full-screen mode: ${err.message} (${err.name})`
          );
        });
      }
    };
  }, [pin, setIsQuizMode, navigate]); // Added navigate to dependency array

  useEffect(() => {
    if (endTime && socketRef.current) {
      const timer = setInterval(() => {
        const now = Date.now();
        const newTimeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
        setTimeLeft(newTimeLeft);

        if (newTimeLeft <= 0) {
          clearInterval(timer);
          // 시간 종료 시 서버에 메시지 전송
          if (
            socketRef.current &&
            socketRef.current.readyState === WebSocket.OPEN
          ) {
            socketRef.current.send(JSON.stringify({ type: "timeUp" }));
            console.log("Time's up! Sent timeUp message to server.");
          }
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [endTime]);

  const allStudentsReady =
    students.length > 0 && students.every((s) => s.isReady);

  const handleStartQuiz = () => {
    fadeOutBgm(); // 로비 BGM 즉시 페이드-아웃
    setQuizStarted(true);
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: "startQuiz" }));
    }
  };

  const handleNextQuestion = () => {
    if (isProcessingNextQuestion) return; // Prevent if already processing
    setIsProcessingNextQuestion(true);
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
    // setIsProcessingNextQuestion will be set to false when 'preparingNextQuestion' or 'newQuestion' is received
  };

  const handleEndQuiz = () => {
    if (isProcessingEndQuiz) return; // Prevent if already processing
    setIsProcessingEndQuiz(true);
    stopBgm(); // 핸들러 호출 시 즉시 BGM 종료
    if (socketRef.current) {
      socketRef.current.send(JSON.stringify({ type: "endQuiz" }));
      setIsSessionActive(false);
      // navigate("/manage-quizzes"); // Navigation will happen on 'sessionEnded'
    }
    // setIsProcessingEndQuiz will be reset implicitly by navigation or component unmount,
    // or explicitly if 'sessionEnded' message isn't guaranteed to always lead to unmount
  };

  const handleViewResults = () => {
    if (isProcessingViewResults) return;
    setIsProcessingViewResults(true);
    stopBgm(); // 결과 화면에서는 모든 사운드 정지
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

  const toggleShowOptions = () => {
    setShowOptions((prev) => !prev);
  };

  // --- Sound Control Handlers ---
  const handleSoundControlOpen = (event: React.MouseEvent<HTMLElement>) => {
    setSoundControlAnchor(event.currentTarget);
  };
  const handleSoundControlClose = () => {
    setSoundControlAnchor(null);
  };
  const handleToggleMute = () => {
    setIsMuted(toggleMute());
  };
  const handleBgmVolumeChange = (event: Event, newValue: number | number[]) => {
    const newVol = newValue as number;
    setLocalBgmVolume(newVol);
    setBgmVolume(newVol);
  };
  const handleSeVolumeChange = (event: Event, newValue: number | number[]) => {
    const newVol = newValue as number;
    setLocalSeVolume(newVol);
    setSeVolume(newVol);
  };
  const isSoundControlOpen = Boolean(soundControlAnchor);
  // ---

  /* ---------- 대기실 BGM ---------- */
  useEffect(() => {
    if (!quizStarted && currentBgmRef.current !== "waiting") {
      playRandomBgm("waiting", true);
      currentBgmRef.current = "waiting";
    }
  }, [quizStarted]);

  /* ---------- 문제 BGM ---------- */
  useEffect(() => {
    if (
      isSessionActive &&
      currentQuestion &&
      currentBgmRef.current !== "playing"
    ) {
      playRandomBgm("playing", true);
      currentBgmRef.current = "playing";
    }
  }, [isSessionActive, currentQuestion]);

  /* ---------- 학생 참여 SE (대기실에서만) ---------- */
  useEffect(() => {
    if (!isSessionActive && students.length > prevStudentCnt.current) {
      playSe("participating");
    }
    prevStudentCnt.current = students.length;
  }, [students.length, isSessionActive]);

  /* ---------- 문제 전환 SE ---------- */
  useEffect(() => {
    if (isQuizStarting || isPreparingNextQuestion) {
      playSe("next");
    }
  }, [isQuizStarting, isPreparingNextQuestion]);

  /* ---------- 정답 공개 SE ---------- */
  useEffect(() => {
    if (allSubmitted) {
      playSe("answer");
    }
  }, [allSubmitted]);

  /* ---------- 정답/순위 공개 시 BGM 줄이기 ---------- */
  useEffect(() => {
    // 마지막 문제가 아닐 때만 BGM 볼륨을 줄임
    if (allSubmitted && !isLastQuestion) {
      duckBgm();
    }
  }, [allSubmitted, isLastQuestion]);

  /* ---------- 다음 문제 준비 시 BGM 원복 ---------- */
  useEffect(() => {
    if (isPreparingNextQuestion) {
      unduckBgm();
    }
  }, [isPreparingNextQuestion]);

  /* ---------- 시간 임박 SE ---------- */
  useEffect(() => {
    // 퀴즈가 진행중이고, 모두가 제출하지 않았으며, 피드백 화면이 아닐 때만
    const isQuestionActive =
      isSessionActive && currentQuestion && !allSubmitted && !isShowingFeedback;
    // 남은 시간이 5초 이하일 때
    const isTickTime = timeLeft > 0 && timeLeft <= 5;

    if (isQuestionActive && isTickTime) {
      startTickingLoop(); // Ticking 루프 시작
    } else {
      stopTickingLoop(); // 그 외 모든 상황에서 Ticking 루프 정지
    }
  }, [
    timeLeft,
    isSessionActive,
    currentQuestion,
    allSubmitted,
    isShowingFeedback,
  ]);

  /* ---------- 결과 상세 보기 시 모든 사운드 정지 ---------- */
  useEffect(() => {
    if (isViewingResults) {
      stopBgm();
    }
  }, [isViewingResults]);

  const showFinalRankings = isShowingFeedback && isLastQuestion;

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
        overflow: isViewingResults && detailedQuizResults ? "hidden" : "auto",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "2vw",
          left: "3vw",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <IconButton
          onClick={() => navigate("/manage-quizzes")}
          sx={{
            color: "white",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.7)",
            },
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        {isSessionActive &&
          currentQuestion &&
          !isViewingResults &&
          !(isShowingFeedback && isLastQuestion) && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                padding: "0.5rem 1.5rem",
                borderRadius: "12px",
              }}
            >
              <VpnKeyIcon
                sx={{
                  color: "white",
                  mr: 1,
                  fontSize: "clamp(1.5rem, 2.8vw, 2.3rem)",
                }}
              />
              <Typography
                sx={{
                  color: "white",
                  fontWeight: "bold",
                  fontSize: "clamp(1.5rem, 2.8vw, 2.3rem)",
                }}
              >
                PIN: {pin}
              </Typography>
            </Box>
          )}
      </Box>

      <Box
        sx={{
          position: "absolute",
          top: "2vw",
          right: "3vw",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <IconButton
          onClick={handleFullscreenToggle}
          sx={{
            color: "white",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.7)",
            },
          }}
        >
          <FullscreenIcon />
        </IconButton>

        {/* --- Sound Control UI --- */}
        <IconButton
          onClick={handleSoundControlOpen}
          sx={{
            color: "white",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.7)" },
          }}
        >
          {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>
        <Popover
          open={isSoundControlOpen}
          anchorEl={soundControlAnchor}
          onClose={handleSoundControlClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          PaperProps={{
            sx: {
              borderRadius: "12px",
              backdropFilter: "blur(10px)",
              backgroundColor: "rgba(255, 255, 255, 0.85)",
              boxShadow: "0px 8px 24px rgba(0,0,0,0.12)",
            },
          }}
        >
          <Box sx={{ p: 2.5, width: 260 }}>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: "bold", mb: 1, textAlign: "center" }}
            >
              사운드 설정
            </Typography>
            <Divider sx={{ my: 1.5 }} />

            <Typography
              id="bgm-volume-slider"
              gutterBottom
              sx={{ fontWeight: "medium", color: "text.secondary" }}
            >
              배경음악
            </Typography>
            <Stack
              spacing={2}
              direction="row"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <MusicNoteIcon color={isMuted ? "disabled" : "action"} />
              <Slider
                aria-labelledby="bgm-volume-slider"
                value={bgmVolume}
                onChange={handleBgmVolumeChange}
                min={0}
                max={1}
                step={0.05}
                disabled={isMuted}
              />
              <Typography
                sx={{
                  minWidth: 40,
                  textAlign: "right",
                  color: isMuted ? "text.disabled" : "text.primary",
                  fontWeight: "medium",
                }}
              >
                {Math.round(bgmVolume * 100)}%
              </Typography>
            </Stack>

            <Typography
              id="se-volume-slider"
              gutterBottom
              sx={{ fontWeight: "medium", color: "text.secondary" }}
            >
              효과음
            </Typography>
            <Stack spacing={2} direction="row" alignItems="center">
              <GraphicEqIcon color={isMuted ? "disabled" : "action"} />
              <Slider
                aria-labelledby="se-volume-slider"
                value={seVolume}
                onChange={handleSeVolumeChange}
                min={0}
                max={1}
                step={0.05}
                disabled={isMuted}
              />
              <Typography
                sx={{
                  minWidth: 40,
                  textAlign: "right",
                  color: isMuted ? "text.disabled" : "text.primary",
                  fontWeight: "medium",
                }}
              >
                {Math.round(seVolume * 100)}%
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              onClick={handleToggleMute}
              fullWidth
              sx={{ mt: 3 }}
            >
              {isMuted ? "소리 켜기" : "전체 음소거"}
            </Button>
          </Box>
        </Popover>
      </Box>

      {isViewingResults && detailedQuizResults ? (
        <Box
          sx={{
            width: "100%",
            height: "100vh",
            overflowY: "auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            py: { xs: 2, sm: 3, md: 4 },
            boxSizing: "border-box",
          }}
        >
          <ResultComponent
            quizResults={detailedQuizResults}
            handleEndQuiz={handleEndQuiz}
            isProcessingEndQuiz={isProcessingEndQuiz}
          />
        </Box>
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
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center", // 수평 중앙 정렬
                alignItems: "center", // 수직 중앙 정렬
              }}
            >
              <Box
                sx={{
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
            </Box>
          )}

          {isPreparingNextQuestion && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                justifyContent: "center", // 수평 중앙 정렬
                alignItems: "center", // 수직 중앙 정렬
              }}
            >
              <Box
                sx={{
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
                opacity: isShowingFeedback ? 0.1 : 1, // 피드백 시 투명도 변화
                transition: "opacity 0.5s ease-in-out",
                pointerEvents: isShowingFeedback ? "none" : "auto", // 피드백 시 클릭 차단
              }}
            >
              <QuestionComponent
                currentQuestion={currentQuestion}
                submittedCount={submittedCount}
                totalStudents={totalParticipantsInQuestion}
                allSubmitted={allSubmitted}
                endTime={endTime}
                showOptions={showOptions}
                toggleShowOptions={toggleShowOptions}
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
                // allStudentsReady={allStudentsReady}
                // handleStartQuiz={handleStartQuiz}
                quizStarted={quizStarted}
                isShowingFeedback={isShowingFeedback}
                isLastQuestion={isLastQuestion}
                handleNextQuestion={handleNextQuestion}
                handleEndQuiz={handleEndQuiz}
                handleViewResults={handleViewResults}
                // Pass new loading states as props
                isProcessingNextQuestion={isProcessingNextQuestion}
                isProcessingEndQuiz={isProcessingEndQuiz}
                isProcessingViewResults={isProcessingViewResults}
              />
            </Box>
          )}

          {/* 퀴즈 시작 버튼을 하단에 추가 */}
          {!quizStarted && students.length > 0 && (
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
