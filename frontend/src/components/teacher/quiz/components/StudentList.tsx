import React, { useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import podiumImage from "../../../../assets/classic-podium.png";
import TopRankers from "./TopRankers";
import WaitingPlayers from "./WaitingPlayers"; // 대기 화면 컴포넌트 추가
import { ArrowForwardIos } from "@mui/icons-material";
import "./StudentList.css";

type Student = {
  id: string;
  name: string;
  isReady: boolean;
  character: string;
  hasSubmitted?: boolean;
  isCorrect?: boolean;
  rank?: number;
  prevRank?: number;
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
  const sortedStudents = [...students].sort(
    (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity)
  );
  const topRankers = sortedStudents.slice(0, 10);
  const [dots, setDots] = useState("");
  const [showNextButton, setShowNextButton] = useState(false);
  const [showEndButtons, setShowEndButtons] = useState(false);
  const [showFinalMessage, setShowFinalMessage] = useState(false);

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

    const getAnimationDuration = (isLast: boolean, rankersCount: number) => {
      if (rankersCount <= 0) return 0;

      const startingRankIndex = Math.min(9, rankersCount - 1);
      let duration = 0;

      // Ranks from startingRankIndex down to 3
      const loopRanksCount = Math.max(0, startingRankIndex - 2);
      duration += loopRanksCount * (isLast ? 1000 : 300);

      // Wait before revealing rank 3
      duration += isLast ? 1000 : 300;
      // Wait before revealing rank 2
      duration += isLast ? 1500 : 500;
      // Wait before revealing rank 1
      duration += isLast ? 2000 : 700;

      return duration;
    };

    const rankersCount = topRankers.length;
    const animationDuration = getAnimationDuration(
      isLastQuestion,
      rankersCount
    );
    const userWaitTime = 1000; // 1 second

    let buttonTimer: NodeJS.Timeout;

    if (isLastQuestion) {
      const initialMessageDuration = 3000;
      setShowFinalMessage(true);
      const finalMessageTimer = setTimeout(
        () => setShowFinalMessage(false),
        initialMessageDuration
      );

      const totalDelay =
        initialMessageDuration + animationDuration + userWaitTime;
      buttonTimer = setTimeout(() => setShowEndButtons(true), totalDelay);

      return () => {
        clearTimeout(finalMessageTimer);
        clearTimeout(buttonTimer);
      };
    } else {
      const totalDelay = animationDuration + userWaitTime;
      buttonTimer = setTimeout(() => setShowNextButton(true), totalDelay);

      return () => clearTimeout(buttonTimer);
    }
  }, [isShowingFeedback, isLastQuestion, topRankers.length]);

  return (
    <Box
      sx={{
        position: "absolute",
        top: "20vh",
        left: "50%",
        transform: "translateX(-50%)",
        textAlign: "center",
        maxWidth: "100%",
        width: "80vw",
      }}
    >
      {!quizStarted && (
        <>
          <Typography
            variant="h4"
            sx={{ marginBottom: "1rem", fontWeight: "bold" }}
          >
            플레이어 대기 중<span style={{ position: "absolute" }}>{dots}</span>
          </Typography>
          <WaitingPlayers students={students} />
        </>
      )}

      {quizStarted && isShowingFeedback && (
        <Box sx={{ textAlign: "center", maxWidth: "100%", padding: "2rem" }}>
          {showFinalMessage ? (
            <Box
              sx={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "100vw",
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 1000,
                // animation: "fadeIn 1s ease-in-out",
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
          ) : (
            <Box
              sx={{
                position: "relative",
                width: "100%",
                maxWidth: "100%",
                margin: "0 auto",
                marginTop: { xs: "13vh", md: "11vh" },
              }}
            >
              <img
                src={podiumImage}
                alt="Podium"
                style={{
                  width: "50%",
                  height: "auto",
                  display: "block",
                  margin: "0 auto",
                }}
              />
              <TopRankers
                topRankers={topRankers}
                isLastQuestion={isLastQuestion}
              />
            </Box>
          )}
          <Box
            sx={{
              marginTop: "5vw",
              display: "flex",
              justifyContent: "center",
              gap: "3vw",
            }}
          >
            {!isLastQuestion && showNextButton && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleNextQuestion}
                startIcon={<ArrowForwardIos />}
                disabled={isProcessingNextQuestion}
                sx={{
                  fontSize: "1.5vw",
                  padding: "1vh 2vw",
                  fontFamily: "'Roboto', sans-serif",
                  background:
                    "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
                  boxShadow: "0 3px 5px 2px rgba(33, 203, 243, .3)",
                  transition: "transform 0.3s ease-in-out",
                  "&:hover": {
                    background:
                      "linear-gradient(45deg, #21CBF3 30%, #2196F3 90%)",
                    transform: "scale(1.05)",
                  },
                }}
              >
                {isProcessingNextQuestion ? "처리중..." : "다음 문제"}
              </Button>
            )}
            {isLastQuestion && showEndButtons && (
              <>
                <Button
                  variant="contained"
                  onClick={handleEndQuiz}
                  disabled={isProcessingEndQuiz}
                  sx={{
                    fontSize: "1.5vw",
                    padding: "1vh 2vw",
                    fontWeight: "bold",
                    background:
                      "linear-gradient(45deg, #27ae60 30%, #2ecc71 90%)",
                    boxShadow: "0 3px 5px 2px rgba(39, 174, 96, .3)",
                    transition: "transform 0.3s ease-in-out",
                    "&:hover": {
                      background:
                        "linear-gradient(45deg, #2ecc71 30%, #27ae60 90%)",
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
                    fontSize: "1.5vw",
                    padding: "1vh 2vw",
                    fontWeight: "bold",
                    borderColor: "#34495e",
                    color: "#34495e",
                    backgroundColor: "#ecf0f1",
                    transition:
                      "transform 0.3s ease-in-out, background-color 0.3s",
                    "&:hover": {
                      backgroundColor: "#bdc3c7",
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  {isProcessingViewResults ? "처리중..." : "결과 자세히 보기"}
                </Button>
              </>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default StudentListComponent;
