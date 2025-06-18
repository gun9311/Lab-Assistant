import React, { useEffect, useState, useRef, useCallback } from "react";
import { Box, Typography, Button } from "@mui/material";
import { useSpring, animated } from "react-spring";
import podiumImage from "../../../../assets/classic-podium.png";
import TopRankers from "./TopRankers";
import WaitingPlayers from "./WaitingPlayers"; // 대기 화면 컴포넌트 추가
import {
  ArrowForwardIos,
  ArrowUpward,
  ArrowDownward,
  EmojiEvents as EmojiEventsIcon, // 왕관 아이콘
} from "@mui/icons-material";
import "./StudentList.css";
import { playWinnerSequence, playSe } from "../../../../utils/soundManager";
import { Howl } from "howler";

// 타입 정의 추가 (수정)
declare const require: {
  context: (
    path: string,
    deep?: boolean,
    filter?: RegExp
  ) => {
    keys: () => string[];
    (key: string): string;
  };
};

// 이미지 디렉토리에서 모든 이미지를 가져와 배열로 관리 (추가)
const images = require.context("../../../../assets/character", false, /\.png$/);
const characterImages = images
  .keys()
  .sort((a: string, b: string) => {
    const numA = parseInt(a.match(/\d+/)![0], 10);
    const numB = parseInt(b.match(/\d+/)![0], 10);
    return numA - numB;
  })
  .map((key: string) => images(key));

type Student = {
  id: string;
  name: string;
  isReady: boolean;
  character: string;
  hasSubmitted?: boolean;
  isCorrect?: boolean;
  rank?: number;
  prevRank?: number;
  score?: number; // 점수 추가
  prevScore?: number; // 이전 점수 추가
};

interface StudentListComponentProps {
  students: Student[];
  // allStudentsReady: boolean;
  // handleStartQuiz: () => void;
  quizStarted: boolean;
  isShowingFeedback: boolean;
  isLastQuestion: boolean;
  handleNextQuestion: () => void;
  handleEndQuiz: () => void;
  handleViewResults: () => void;
  // Add new props for loading states
  isProcessingNextQuestion: boolean;
  isProcessingEndQuiz: boolean;
  isProcessingViewResults: boolean;
}

// --- 추가: 순위 숫자 애니메이션을 위한 컴포넌트 ---
const AnimatedNumber = ({
  n,
  isAnimating,
}: {
  n: number;
  isAnimating: boolean;
}) => {
  const { number } = useSpring({
    from: { number: isAnimating ? n + 1 : n }, // 애니메이션 시작 시 이전 값에서 시작 (임의)
    to: { number: n },
    config: { duration: 500 },
    reset: isAnimating,
  });

  return <animated.span>{number.to((val) => Math.floor(val))}</animated.span>;
};

const StudentListComponent: React.FC<StudentListComponentProps> = ({
  students,
  // allStudentsReady,
  // handleStartQuiz,
  quizStarted,
  isShowingFeedback,
  isLastQuestion,
  handleNextQuestion,
  handleEndQuiz,
  handleViewResults,
  // Destructure new props
  isProcessingNextQuestion,
  isProcessingEndQuiz,
  isProcessingViewResults,
}) => {
  const [latchedStudents, setLatchedStudents] = useState<Student[]>([]);
  const [isAnimatingRanks, setIsAnimatingRanks] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showFinalRanks, setShowFinalRanks] = useState(false);
  const [studentsForLayout, setStudentsForLayout] = useState<Student[]>([]);
  // 중간 순위 발표를 위한 상태 추가
  const [jumpKing, setJumpKing] = useState<{
    student: Student;
    change: number;
  } | null>(null);
  const [displayState, setDisplayState] = useState<
    "idle" | "jumpKing" | "rankList"
  >("idle");
  const [visibleRankCount, setVisibleRankCount] = useState(0);
  const [showNextButton, setShowNextButton] = useState(false);
  const [showEndButtons, setShowEndButtons] = useState(false);
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [showPodium, setShowPodium] = useState(false);
  const [showLeaderboardTitle, setShowLeaderboardTitle] = useState(false); // 리더보드 타이틀 상태
  const flipSoundRef = useRef<Howl | null>(null);
  const rateIntervalRef = useRef<NodeJS.Timeout | null>(null); // <<-- 재생 속도 조절 인터벌을 위한 ref

  useEffect(() => {
    // isShowingFeedback이 true가 되는 순간의 학생 목록을 저장합니다.
    if (isShowingFeedback && latchedStudents.length === 0) {
      setLatchedStudents(students);
    }
    // isShowingFeedback이 false로 바뀌면(다음 문제로 넘어가면) latchedStudents를 초기화합니다.
    if (!isShowingFeedback) {
      setLatchedStudents([]);
      // 중간 순위 발표 상태 초기화
      setDisplayState("idle");
      setJumpKing(null);
      setShowNextButton(false);
      setShowEndButtons(false);
      setShowFinalMessage(false);
      setShowPodium(false);
      setVisibleRankCount(0);
      setShowLeaderboardTitle(false);
      setIsFlipping(false);
      setShowFinalRanks(false);
      setStudentsForLayout([]);
      setIsAnimatingRanks(false);
    }
  }, [isShowingFeedback, students, latchedStudents.length]);

  // 순위 발표 관련 로직은 latchedStudents를 사용합니다.
  // 그 외 대기 화면 등은 실시간 students prop을 사용합니다.
  const studentsForDisplay =
    isShowingFeedback && latchedStudents.length > 0
      ? latchedStudents
      : students;

  const sortedStudentsByRank = [...studentsForDisplay].sort(
    (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity)
  );
  const topRankers = sortedStudentsByRank.slice(0, 10);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isShowingFeedback) {
      setShowNextButton(false);
      setShowEndButtons(false);
      return;
    }

    if (isLastQuestion) {
      // --- 최종 순위 발표 로직 ---
      const PODIUM_DELAY_MS = 1000;

      // 1. '최종 결과' + 드럼롤
      setShowFinalMessage(true);
      playWinnerSequence(() => {
        /* 드럼롤 끝 */
        setShowFinalMessage(false);

        /* 2. 1s 기다렸다가 포디움 슬라이드-업 */
        setTimeout(() => setShowPodium(true), PODIUM_DELAY_MS);
      });

      // 3. TopRankers 애니메이션이 끝나면 버튼을 표시하도록 콜백 핸들러를 설정합니다.
      // (아래 JSX의 onAnimationComplete prop 참고)
    } else {
      // --- 중간 순위 발표 로직 (수정) ---
      const isFirstRound = studentsForDisplay.every(
        (s) => s.prevRank === undefined
      );

      // 첫 라운드일 경우, 플립 없이 바로 결과 표시
      if (isFirstRound) {
        setDisplayState("rankList");
        const studentsSortedByRank = [...studentsForDisplay].sort(
          (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity)
        );
        setStudentsForLayout(studentsSortedByRank.slice(0, 10));
        setShowFinalRanks(true); // 바로 최종 순위 내용 표시
        setIsFlipping(false); // 플립 안함

        // 잠시 후 '다음' 버튼 표시
        const t = setTimeout(() => setShowNextButton(true), 2500);
        return () => clearTimeout(t);
      }

      // 1. 점프왕 계산 (첫 라운드가 아닐 때만)
      let bestRiser: Student | null = null;
      let maxChange = 0;
      for (const student of studentsForDisplay) {
        if (student.rank !== undefined && student.prevRank !== undefined) {
          const change = student.prevRank - student.rank;
          if (change > maxChange) {
            maxChange = change;
            bestRiser = student;
          }
        }
      }

      const jumpKingInfo =
        bestRiser && maxChange >= 3 // 조건 변경: 3계단 이상 상승 시
          ? { student: bestRiser, change: maxChange }
          : null;

      if (jumpKingInfo) {
        setJumpKing(jumpKingInfo);
      }

      // 2. 순차적 UI 표시
      const jumpKingDisplayTime = 3500; // 점프왕 표시 시간
      const rankListStartTime = jumpKingInfo ? jumpKingDisplayTime : 0;
      const rankRevealDuration = 2000; // 랭킹 카드 모두 표시되는 데 걸리는 시간
      const buttonDelay = 1000;
      const flipAnimationDuration = 1200; // 플립 애니메이션 시간 (수정: 1000 -> 1200)

      const t1 = setTimeout(
        () => setDisplayState(jumpKingInfo ? "jumpKing" : "rankList"),
        500
      );

      const t2 = setTimeout(() => {
        if (jumpKingInfo) {
          setDisplayState("rankList");
        }
        // --- 수정: 순위 뒤집기 애니메이션 로직 ---
        const studentsSortedByPrev = [...studentsForDisplay].sort(
          (a, b) => (a.prevRank ?? Infinity) - (b.prevRank ?? Infinity)
        );
        setStudentsForLayout(studentsSortedByPrev.slice(0, 10));

        setShowFinalRanks(false);
        setIsFlipping(false);

        // 카드가 나타난 후 플립 애니메이션 시작
        const flipTimer = setTimeout(() => {
          setIsFlipping(true);
          const sound = playSe("board-flip", { rate: 1.2 }); // <<-- 1.2배속으로 재생 시작
          flipSoundRef.current = sound;

          if (sound) {
            // 1초에 걸쳐 재생 속도를 1.2에서 1.0으로 점진적으로 변경
            const DURATION = 1000;
            const STEPS = 20;
            const intervalTime = DURATION / STEPS;
            const initialRate = 1.2;
            const finalRate = 1.0;
            const rateChangePerStep = (initialRate - finalRate) / STEPS;
            let currentStep = 0;

            rateIntervalRef.current = setInterval(() => {
              currentStep++;
              if (currentStep > STEPS) {
                if (rateIntervalRef.current)
                  clearInterval(rateIntervalRef.current);
                return;
              }
              const newRate = initialRate - rateChangePerStep * currentStep;
              sound.rate(newRate);
            }, intervalTime);
          }
        }, rankRevealDuration);

        // 플립 애니메이션이 끝난 후, 최종 순위 내용으로 교체
        const contentSwapTimer = setTimeout(() => {
          setShowFinalRanks(true);
        }, rankRevealDuration + flipAnimationDuration);

        // 모든 애니메이션이 끝난 후 '다음' 버튼 표시
        const nextButtonTimer = setTimeout(
          () => setShowNextButton(true),
          rankRevealDuration + flipAnimationDuration + buttonDelay
        );

        // 애니메이션 시작 1초 후부터 0.5초간 페이드아웃하여 사운드 정지
        const FADE_START_DELAY = 1000;
        const FADE_DURATION = 500;
        const fadeSoundTimer = setTimeout(() => {
          const sound = flipSoundRef.current;
          if (sound) {
            sound.fade(sound.volume(), 0, FADE_DURATION);
          }
        }, rankRevealDuration + FADE_START_DELAY);

        return () => {
          clearTimeout(flipTimer);
          clearTimeout(contentSwapTimer);
          clearTimeout(nextButtonTimer);
          clearTimeout(fadeSoundTimer);
          if (rateIntervalRef.current) clearInterval(rateIntervalRef.current); // <<-- 인터벌 정리
          flipSoundRef.current?.stop(); // 컴포넌트 언마운트 시 사운드 즉시 정지
        };
      }, 500 + rankListStartTime);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isShowingFeedback, isLastQuestion, studentsForDisplay]);

  // 순위 카드를 순차적으로 보여주기 위한 useEffect (수정)
  useEffect(() => {
    if (displayState === "rankList" && !isLastQuestion) {
      playSe("swoosh");
      setVisibleRankCount(0); // 카운트 초기화
      const interval = setInterval(() => {
        setVisibleRankCount((prevCount) => {
          const nextCount = prevCount + 1;
          if (nextCount > 10) {
            // 상위 10명까지 표시
            clearInterval(interval);
            return prevCount;
          }
          // playSe("slide-in"); // <<-- 효과음 제거
          return nextCount;
        });
      }, 150); // 0.15초마다 카드 하나씩 표시

      return () => clearInterval(interval);
    }
  }, [displayState, isLastQuestion]);

  // TopRankers 애니메이션 종료 시 호출될 콜백 함수
  const handleTopRankerAnimationEnd = useCallback(() => {
    setTimeout(() => {
      setShowEndButtons(true);
    }, 2000); // 1위 발표 후 2초 뒤에 버튼 표시
  }, []);

  return (
    <>
      {/* 최종 결과 오버레이 (수정: 뷰포트 기준으로 위치하도록 외부로 분리) */}
      {showFinalMessage && (
        <Box
          sx={{
            position: "fixed",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "100vw",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
            padding: "2rem",
          }}
        >
          <Typography
            variant="h2"
            sx={{
              color: "#FFD700",
              fontFamily: "'Fredoka One', cursive",
              fontSize: "8vw",
              textShadow: "4px 4px 8px #000000",
              animation: "flyIn 1s ease-out",
            }}
          >
            최종 결과
          </Typography>
        </Box>
      )}

      {/* --- 리더보드 타이틀 --- */}
      {showLeaderboardTitle && (
        <Typography className="leaderboard-title">LEADERBOARD</Typography>
      )}

      <Box
        sx={{
          position: "absolute",
          top:
            quizStarted &&
            isShowingFeedback &&
            !isLastQuestion &&
            displayState === "rankList"
              ? "8vh" // 위치 상향 조정 (2)
              : "20vh", // 중간 순위표일 때만 위치를 상향 조정
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          maxWidth: "100%",
          width: "80vw",
          transition: "top 0.4s ease-out", // 부드러운 위치 이동 효과
          ...(quizStarted &&
            isShowingFeedback && {
              height:
                !isLastQuestion && displayState === "rankList"
                  ? "88vh"
                  : "80vh", // 높이도 동적으로 조절
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }),
        }}
      >
        {!quizStarted && (
          <>
            <Typography
              variant="h4"
              sx={{ marginBottom: "1rem", fontWeight: "bold" }}
            >
              플레이어 대기 중
              <span style={{ position: "absolute" }}>{dots}</span>
            </Typography>
            <WaitingPlayers students={students} />
          </>
        )}

        {quizStarted &&
          isShowingFeedback &&
          (isLastQuestion ? (
            // --- 최종 결과 발표 UI ---
            <Box sx={{ flexGrow: 1 }}>
              <Box
                sx={{ textAlign: "center", maxWidth: "100%", padding: "2rem" }}
              >
                {showPodium && (
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      maxWidth: "100%",
                      margin: "0 auto",
                      marginTop: { xs: "13vh", md: "9vh" },
                      animation: "slideUpFade 0.8s ease-out",
                    }}
                  >
                    <img
                      src={podiumImage}
                      alt="Podium"
                      style={{
                        width: "55%",
                        height: "auto",
                        display: "block",
                        margin: "0 auto",
                      }}
                    />
                    <TopRankers
                      topRankers={topRankers}
                      isLastQuestion={isLastQuestion}
                      onAnimationComplete={handleTopRankerAnimationEnd}
                    />
                  </Box>
                )}
              </Box>
            </Box>
          ) : (
            // --- 중간 순위 발표 UI (수정) ---
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                paddingTop: "2vh", // 패딩 조정
                width: "100%",
              }}
            >
              {displayState === "jumpKing" && jumpKing && (
                <Box
                  className="fade-in-out"
                  sx={{
                    textAlign: "center",
                    background:
                      "radial-gradient(ellipse at center, rgba(80, 60, 20, 0.98) 0%, rgba(33, 33, 33, 0.98) 70%)", // 배경 개선
                    padding: { xs: "1.5rem 1rem", md: "2rem" },
                    borderRadius: "24px",
                    border: "3px solid #FFC107", // 테두리 색상 변경
                    boxShadow:
                      "0 0 30px rgba(255, 193, 7, 0.7), inset 0 0 20px rgba(0,0,0,0.7)", // 그림자 효과 강화
                    minWidth: { xs: "80vw", md: "500px" },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <EmojiEventsIcon
                      sx={{ fontSize: "3rem", color: "#FFD700" }}
                    />
                    <Typography
                      variant="h3"
                      sx={{
                        color: "#FFD700",
                        fontWeight: "bold",
                        fontFamily: "'Fredoka One', cursive",
                        textShadow:
                          "0 0 5px #FF9800, 0 0 10px #FF9800, 0 0 15px #E65100",
                      }}
                    >
                      이번 라운드의 점프왕!
                    </Typography>
                  </Box>
                  <Box
                    component="img"
                    src={
                      characterImages[
                        parseInt(
                          jumpKing.student.character.replace("character", "")
                        ) - 1
                      ]
                    }
                    alt={`${jumpKing.student.name} character`}
                    sx={{
                      width: "150px",
                      height: "150px",
                      margin: "1rem auto",
                      animation: "bounce 1.5s infinite",
                      border: "4px solid #FFD700", // 캐릭터 테두리 추가
                      borderRadius: "50%",
                      boxShadow: "0 0 25px #FFD700", // 캐릭터 그림자 추가
                    }}
                  />
                  <Typography
                    variant="h4"
                    sx={{ color: "white", fontWeight: "bold" }}
                  >
                    {jumpKing.student.name}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    <ArrowUpward
                      sx={{ color: "#4caf50", fontSize: "2.5rem" }}
                    />
                    <Typography
                      variant="h4"
                      sx={{ color: "#4caf50", fontWeight: "bold" }}
                    >
                      {jumpKing.change}계단 상승!
                    </Typography>
                  </Box>
                </Box>
              )}

              {displayState === "rankList" && (
                <Box
                  sx={{
                    position: "relative",
                    width: { xs: "95vw", sm: "90vw", md: "80vw", lg: "70vw" },
                    paddingTop: "6vh", // 타이틀 공간 확보
                  }}
                >
                  <Typography
                    sx={{
                      position: "absolute",
                      top: 0,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontFamily: "'Fredoka One', cursive",
                      fontSize: "clamp(2rem, 5vw, 4rem)", // 타이틀 크기 대폭 확대
                      color: "#fff",
                      textShadow:
                        "0 0 5px #FF9800, 0 0 10px #FF9800, 0 0 20px #E65100", // 네온 효과 강화
                      zIndex: 1,
                    }}
                  >
                    LEADERBOARD
                  </Typography>
                  <Box
                    className="ranking-board"
                    sx={{
                      backgroundColor: "rgba(33, 33, 33, 0.95)", // 차콜 배경
                      padding: { xs: "1.5rem 1rem", md: "2rem" }, // 내부 패딩 조정
                      borderRadius: "24px",
                      border: "3px solid #FF9800", // 오렌지 테두리
                      boxShadow:
                        "0 0 25px rgba(255, 152, 0, 0.6), inset 0 0 15px rgba(0,0,0,0.6)", // 오렌지 그림자
                      maxHeight: "65vh",
                      overflowY: "auto",
                      "&::-webkit-scrollbar": {
                        width: "10px",
                      },
                      "&::-webkit-scrollbar-track": {
                        background: "rgba(0,0,0,0.3)",
                        borderRadius: "5px",
                      },
                      "&::-webkit-scrollbar-thumb": {
                        background: "#FF9800", // 오렌지 스크롤바
                        borderRadius: "5px",
                        border: "1px solid rgba(255,255,255,0.1)",
                      },
                      "&::-webkit-scrollbar-thumb:hover": {
                        background: "#FFA726",
                      },
                    }}
                  >
                    {/* --- 2단 분할 레이아웃 --- */}
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: { xs: "column", md: "row" },
                        gap: { xs: "1rem", md: "2rem" }, // 컬럼 간격 조정
                      }}
                    >
                      {[0, 1].map((col) => (
                        <Box
                          key={col}
                          sx={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: "1rem", // 카드 간격 조정
                          }}
                        >
                          {studentsForLayout
                            .slice(col * 5, col * 5 + 5)
                            .map((studentForLayout, index) => {
                              const overallIndex = col * 5 + index;
                              const studentForRank =
                                sortedStudentsByRank[overallIndex];

                              // 이전/현재 순위 학생 정보가 모두 있어야 렌더링
                              if (!studentForLayout || !studentForRank) {
                                return null;
                              }

                              // 플립 전/후에 표시될 학생 정보를 명확히 구분
                              const preFlipStudent = studentForLayout;
                              const postFlipStudent = studentForRank;

                              const studentToDisplay = showFinalRanks
                                ? postFlipStudent
                                : preFlipStudent;

                              // 표시할 순위: 플립 전에는 이전 순위, 플립 후에는 현재 순위
                              const rankToDisplay = showFinalRanks
                                ? postFlipStudent.rank
                                : preFlipStudent.prevRank;

                              // 표시할 점수: 플립 전에는 이전 점수, 플립 후에는 현재 점수
                              const scoreToDisplay = showFinalRanks
                                ? postFlipStudent.score
                                : preFlipStudent.prevScore;

                              const rankChange =
                                postFlipStudent.prevRank !== undefined &&
                                postFlipStudent.rank !== undefined
                                  ? postFlipStudent.prevRank -
                                    postFlipStudent.rank
                                  : 0;

                              const isVisible = overallIndex < visibleRankCount;
                              const hasRankChanged =
                                showFinalRanks && rankChange !== 0;

                              // 플립 후에만 순위별 테두리 클래스를 적용
                              const getRankHighlightClass = () => {
                                if (!showFinalRanks) return "";
                                switch (postFlipStudent.rank) {
                                  case 1:
                                    return "ranking-card-first";
                                  case 2:
                                    return "ranking-card-second";
                                  case 3:
                                    return "ranking-card-third";
                                  default:
                                    return "";
                                }
                              };

                              return (
                                <Box
                                  key={preFlipStudent.id} // 키를 이전 순위 학생 ID로 고정
                                  className={`ranking-card ${
                                    isVisible ? "visible" : ""
                                  } ${
                                    isFlipping ? "is-flipping" : ""
                                  } ${getRankHighlightClass()}`}
                                  style={{
                                    animationDelay: `${overallIndex * 100}ms`,
                                  }}
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "1rem 1.25rem", // 패딩 확대
                                    mb: 0,
                                    backgroundColor: "rgba(0, 0, 0, 0.4)", // 카드 배경
                                    borderRadius: "16px",
                                    border:
                                      "1px solid rgba(255, 255, 255, 0.15)",
                                    transition:
                                      "transform 0.2s ease-in-out, background-color 0.2s",
                                    "&:hover": {
                                      transform: "scale(1.03)",
                                      backgroundColor: "rgba(0, 0, 0, 0.6)",
                                    },
                                  }}
                                >
                                  {/* Character Image */}
                                  <Box
                                    component="img"
                                    src={
                                      characterImages[
                                        parseInt(
                                          studentToDisplay.character.replace(
                                            "character",
                                            ""
                                          )
                                        ) - 1
                                      ]
                                    }
                                    alt=""
                                    sx={{
                                      width: { xs: "52px", sm: "64px" }, // 크기 확대
                                      height: { xs: "52px", sm: "64px" },
                                      marginRight: "1.25rem",
                                      borderRadius: "50%",
                                      border: "2px solid #fff",
                                    }}
                                  />

                                  {/* Rank & Name */}
                                  <Box
                                    sx={{
                                      flexGrow: 1,
                                      overflow: "hidden",
                                      textAlign: "left",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "baseline",
                                        gap: "1rem",
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          color:
                                            showFinalRanks &&
                                            rankToDisplay === 1
                                              ? "#FFD700"
                                              : "#fff",
                                          fontWeight: "bold",
                                          fontSize:
                                            "clamp(1.5rem, 2.2vw, 2rem)", // 폰트 대폭 확대
                                          fontFamily: "'Fredoka One', cursive",
                                          lineHeight: 1.2,
                                          textShadow:
                                            showFinalRanks &&
                                            rankToDisplay === 1
                                              ? "0 0 8px rgba(255, 215, 0, 0.7)"
                                              : "none",
                                          minWidth: "4rem", // 너비 확보
                                          ...(hasRankChanged && {
                                            animation: `rank-flash 0.6s ease-in-out`,
                                          }),
                                        }}
                                      >
                                        <AnimatedNumber
                                          n={rankToDisplay ?? 0}
                                          isAnimating={hasRankChanged}
                                        />
                                        위
                                      </Typography>
                                      <Typography
                                        sx={{
                                          color: "rgba(255, 255, 255, 0.95)",
                                          fontSize: "clamp(1.2rem, 2vw, 2rem)", // 폰트 대폭 확대
                                          fontWeight: 600,
                                          whiteSpace: "normal",
                                          wordBreak: "break-word",
                                        }}
                                      >
                                        {studentToDisplay.name}
                                      </Typography>
                                    </Box>
                                  </Box>

                                  {/* Score (New Position) */}
                                  <Typography
                                    sx={{
                                      color: "#FFC107",
                                      fontSize: "clamp(1.1rem, 1.8vw, 1.5rem)", // 폰트 크기 조정
                                      fontWeight: 500,
                                      width: "auto", // 고정 너비 제거
                                      textAlign: "right",
                                      mr: 2, // 오른쪽 여백으로 간격 조절 (이 값을 조절하세요)
                                    }}
                                  >
                                    {`${(
                                      scoreToDisplay || 0
                                    ).toLocaleString()} pts`}
                                  </Typography>

                                  {/* Rank Change */}
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      // width: { xs: "5rem", md: "6rem" }, // 너비 조정
                                      width: "auto",
                                      justifyContent: "flex-end",
                                      gap: "0.4rem",
                                    }}
                                  >
                                    {showFinalRanks && rankChange !== 0 ? (
                                      <>
                                        {rankChange > 0 ? (
                                          <ArrowUpward
                                            sx={{
                                              color: "#4caf50",
                                              fontSize: "1.8rem", // 아이콘 확대
                                            }}
                                          />
                                        ) : (
                                          <ArrowDownward
                                            sx={{
                                              color: "#f44336",
                                              fontSize: "1.8rem",
                                            }}
                                          />
                                        )}
                                        <Typography
                                          sx={{
                                            fontSize: "1.7rem", // 폰트 확대
                                            fontWeight: "bold",
                                            color:
                                              rankChange > 0
                                                ? "#4caf50"
                                                : "#f44336",
                                          }}
                                        >
                                          {Math.abs(rankChange)}
                                        </Typography>
                                      </>
                                    ) : (
                                      <Typography
                                        sx={{
                                          color: "rgba(255, 255, 255, 0.5)",
                                          fontSize: "1.8rem",
                                        }}
                                      >
                                        -
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              );
                            })}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          ))}

        {/* --- 버튼 영역 (하단 중앙 - 최종 결과) --- */}
        {isLastQuestion && showEndButtons && (
          <Box
            className="fade-in"
            sx={{
              paddingBottom: "10vh",
              display: "flex",
              justifyContent: "center",
              gap: "2rem",
              alignItems: "center",
            }}
          >
            <Button
              variant="contained"
              onClick={handleEndQuiz}
              disabled={isProcessingEndQuiz}
              sx={{
                fontSize: "clamp(1rem, 1.5vw, 1.4rem)",
                padding: "1vh 2vw",
                fontWeight: "bold",
                minWidth: "220px",
                minHeight: "55px",
                background: "linear-gradient(45deg, #43A047 30%, #66BB6A 90%)", // 개선된 색상
                boxShadow: "0 4px 8px 2px rgba(67, 160, 71, .3)",
                border: "1px solid rgba(255,255,255,0.2)",
                transition: "transform 0.3s ease-in-out",
                "&:hover": {
                  background:
                    "linear-gradient(45deg, #4CAF50 30%, #81C784 90%)",
                  transform: "scale(1.05)",
                },
              }}
            >
              {isProcessingEndQuiz ? "처리중..." : "결과 저장 및 종료"}
            </Button>

            <Button
              variant="outlined"
              onClick={handleViewResults}
              disabled={isProcessingViewResults}
              sx={{
                fontSize: "clamp(1rem, 1.5vw, 1.4rem)",
                padding: "1vh 2vw",
                fontWeight: "bold",
                minWidth: "220px",
                minHeight: "55px",
                borderColor: "#90A4AE", // 개선된 색상
                color: "#263238",
                backgroundColor: "rgba(236, 239, 241, 0.9)",
                transition: "transform 0.3s ease-in-out, background-color 0.3s",
                "&:hover": {
                  backgroundColor: "#CFD8DC",
                  borderColor: "#546E7A",
                  transform: "scale(1.05)",
                },
              }}
            >
              {isProcessingViewResults ? "처리중..." : "결과 자세히 보기"}
            </Button>
          </Box>
        )}
      </Box>

      {/* --- 다음 문제 버튼 (화면 우측 하단 고정) --- */}
      {quizStarted &&
        isShowingFeedback &&
        !isLastQuestion &&
        showNextButton && (
          <Box
            className="fade-in"
            sx={{
              position: "fixed", // 고정 위치
              bottom: "5vh",
              left: 0, // 변경: 50% → 0
              right: 0, // 추가: 전체 너비 확보
              display: "flex", // 추가: flex 레이아웃
              justifyContent: "center", // 추가: 중앙 정렬
              zIndex: 1200, // 다른 요소들 위에 오도록 z-index 설정
              pointerEvents: "none", // 추가: 부모는 클릭 차단
            }}
          >
            <Button
              variant="contained"
              color="primary"
              onClick={handleNextQuestion}
              startIcon={<ArrowForwardIos />}
              disabled={isProcessingNextQuestion}
              sx={{
                fontSize: "clamp(1rem, 1.5vw, 1.4rem)", // 반응형 폰트
                padding: "1vh 2vw",
                minWidth: "200px", // 최소 너비
                minHeight: "55px", // 최소 높이
                fontFamily: "'Roboto', sans-serif",
                fontWeight: "bold",
                background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)", // 파란색 테마
                boxShadow: "0 4px 8px 2px rgba(33, 150, 243, .3)",
                transition: "transform 0.3s ease-in-out",
                pointerEvents: "auto", // 추가: 버튼은 클릭 가능
                "&:hover": {
                  background:
                    "linear-gradient(45deg, #21CBF3 30%, #2196F3 90%)",
                  transform: "scale(1.05)",
                },
              }}
            >
              {isProcessingNextQuestion ? "처리중..." : "다음 문제"}
            </Button>
          </Box>
        )}
    </>
  );
};

export default StudentListComponent;
