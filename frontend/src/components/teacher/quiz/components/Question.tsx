import React, { useState, useEffect } from "react";
import { Box, Typography, LinearProgress } from "@mui/material";
import TimerIcon from "@mui/icons-material/Timer"; // 시계 모양 타이머 아이콘
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

interface Question {
  _id: string;
  questionText: string;
  options: { text: string; imageUrl?: string }[];
  correctAnswer: number; // 정답을 인덱스 값으로 처리
  timeLimit: number;
  imageUrl?: string; // 문제 이미지 URL
}

interface QuestionComponentProps {
  currentQuestion: Question | null;
  submittedCount: number;
  totalStudents: number;
  allSubmitted: boolean;
  endTime: number | null;
}

const QuestionComponent: React.FC<QuestionComponentProps> = ({
  currentQuestion,
  submittedCount,
  totalStudents,
  allSubmitted,
  endTime,
}) => {
  const [remainingTime, setRemainingTime] = useState<number>(() => {
    if (endTime) {
      const now = Date.now();
      return Math.max(0, Math.floor((endTime - now) / 1000));
    }
    return 30; // 기본값 설정
  });
  const submissionProgress = (submittedCount / totalStudents) * 100;

  useEffect(() => {
    if (allSubmitted || !endTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
      setRemainingTime(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, allSubmitted]);

  useEffect(() => {
    // 새로운 문제가 주어졌을 때 남은 시간을 초기화
    if (currentQuestion) {
      setRemainingTime(currentQuestion.timeLimit);
    }
  }, [currentQuestion]);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "90%",
        textAlign: "center",
        color: "#fff",
        padding: "2vh 1vw",
      }}
    >
      {/* 문제 이미지 */}
      {currentQuestion?.imageUrl && (
        <img
          src={currentQuestion.imageUrl}
          alt="문제 이미지"
          style={{
            maxWidth: "100%",
            maxHeight: "50vh",
            marginBottom: "2vh",
            borderRadius: "8px",
          }}
        />
      )}

      {/* 문제 텍스트와 타이머 아이콘 */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "1vw",
          marginBottom: "2vh",
        }}
      >
        <Typography
          variant="h2"
          sx={{
            fontWeight: "bold",
            color: "#fff",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            padding: "1vh 2vw",
            borderRadius: "8px",
            fontSize: "3vw",
          }}
        >
          {currentQuestion?.questionText || "현재 출제된 문제가 없습니다."}
        </Typography>
        {/* 시계 모양 타이머 아이콘 */}
        {currentQuestion && (
          <Box sx={{ display: "flex", alignItems: "center", gap: "0.5vw" }}>
            <TimerIcon
              sx={{
                fontSize: "3vw",
                color: remainingTime <= 5 ? "red" : "white",
              }}
            />
            <Typography
              variant="h6"
              sx={{
                color: remainingTime <= 5 ? "red" : "white",
                fontSize: "2vw",
              }}
            >
              {`${remainingTime}s`}
            </Typography>
          </Box>
        )}
      </Box>

      {/* 선택지 목록 (반응형 2열, 모바일에서는 1열) */}
      {currentQuestion && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: "1.5vw",
            justifyItems: "center",
            alignItems: "center",
            marginBottom: "2vh",
            padding: "0 1vw",
          }}
        >
          {currentQuestion.options.map((option, index) => {
            const isCorrect =
              String(index) === String(currentQuestion.correctAnswer);

            return (
              <Box
                key={index}
                sx={{
                  backgroundColor:
                    allSubmitted && isCorrect
                      ? "rgba(0, 200, 150, 0.5)"
                      : allSubmitted
                      ? "rgba(200, 100, 150, 0.3)"
                      : "rgba(0, 0, 0, 0.5)",
                  padding: "1vh",
                  borderRadius: "8px",
                  cursor: "default",
                  width: "100%",
                  textAlign: "center",
                  transition: "background-color 0.3s ease, transform 0.3s ease",
                  transform: allSubmitted && isCorrect ? "scale(1.05)" : "none",
                  boxShadow: allSubmitted
                    ? "0px 4px 8px rgba(0, 0, 0, 0.2)"
                    : "none",
                }}
              >
                {option.imageUrl && (
                  <img
                    src={option.imageUrl}
                    alt="선택지 이미지"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "15vh",
                      marginBottom: "1vh",
                      borderRadius: "5px",
                    }}
                  />
                )}
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    fontSize: "2vw",
                  }}
                >
                  {option.text}
                </Typography>
                {/* 정답 여부에 따른 애니메이션 효과 아이콘 */}
                {allSubmitted && (
                  <Box
                    component="span"
                    sx={{ marginLeft: "1vw", verticalAlign: "middle" }}
                  >
                    {isCorrect ? (
                      <CheckCircleIcon
                        sx={{
                          color: "lightgreen",
                          fontSize: "2vw",
                          animation: "pulse 1s infinite",
                        }}
                      />
                    ) : (
                      <CancelIcon
                        sx={{
                          color: "orange",
                          fontSize: "2vw",
                          animation: "shake 0.5s",
                        }}
                      />
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* 제출 진행 상황 표시 */}
      {!allSubmitted && (
        <Box sx={{ marginTop: "2vh" }}>
          <Typography variant="body1" sx={{ marginBottom: "0.5vh" }}>
            제출한 학생 수: {submittedCount}/{totalStudents}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={submissionProgress}
            sx={{
              height: "1vh",
              borderRadius: "5px",
              backgroundColor: "#e0e0e0",
              "& .MuiLinearProgress-bar": {
                backgroundColor: "#4caf50",
              },
              width: "50%",
              margin: "0 auto",
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default QuestionComponent;
