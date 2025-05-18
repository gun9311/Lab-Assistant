import React from "react";
import { Box, Button, Typography, LinearProgress } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface Option {
  text: string;
  imageUrl?: string;
}

interface QuizQuestionComponentProps {
  currentQuestion: {
    options: Option[];
    imageUrl?: string;
  };
  selectedAnswer: number | null;
  handleAnswerSelect: (index: number) => void;
  timeLeft: number | null;
  isAnswerSubmitted: boolean;
}

const QuizQuestionComponent: React.FC<QuizQuestionComponentProps> = ({
  currentQuestion,
  selectedAnswer,
  handleAnswerSelect,
  timeLeft,
  isAnswerSubmitted,
}) => {
  const getTimerColor = () => {
    if (timeLeft === null || isAnswerSubmitted) return "success";
    if (timeLeft > 10) return "primary";
    if (timeLeft > 5) return "warning";
    return "error";
  };

  return (
    <Box>
      {currentQuestion.options.map((option, index) => (
        <Box key={index} sx={{ mb: 2, textAlign: "center" }}>
          <Button
            variant={selectedAnswer === index ? "contained" : "outlined"}
            color={selectedAnswer === index ? "success" : "primary"}
            onClick={() => handleAnswerSelect(index)}
            fullWidth
            sx={{
              padding: "6px",
              fontSize: "1.5rem !important",
              fontWeight: "bold",
              fontFamily: "'Montserrat', sans-serif",
              borderRadius: "12px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              transition:
                "transform 0.2s, background-color 0.2s, color 0.2s, border-color 0.2s",
              color: selectedAnswer === index ? "#ffffff" : "#000000",
              borderColor: selectedAnswer === index ? "#66bb6a" : "#d3d3d3",
              "&:hover": {
                transform: "scale(1.05)",
                backgroundColor:
                  selectedAnswer === index ? "#66bb6a" : "#d3d3d3",
                color: selectedAnswer === index ? "#ffffff" : "#000000",
                borderColor: selectedAnswer === index ? "#66bb6a" : "#d3d3d3",
              },
            }}
            disabled={selectedAnswer !== null}
          >
            {option.imageUrl && (
              <img
                src={option.imageUrl}
                alt="선택지 이미지"
                style={{
                  maxWidth: "100%",
                  maxHeight: "120px",
                  marginBottom: "10px",
                  borderRadius: "8px",
                  objectFit: "cover",
                }}
              />
            )}
            {option.text}
          </Button>
        </Box>
      ))}

      {timeLeft !== null && (
        <Box sx={{ mt: 4, textAlign: "center", animation: "fadeIn 0.5s" }}>
          <Typography
            variant="h6"
            sx={{
              mb: 1,
              color: getTimerColor() === "error" ? "#f44336" : "#333",
            }}
          >
            {isAnswerSubmitted ? (
              <>
                제출 완료: {timeLeft}초{" "}
                <CheckCircleIcon sx={{ color: "green", ml: 1 }} />
              </>
            ) : (
              `남은 시간: ${timeLeft}초`
            )}
          </Typography>
          {!isAnswerSubmitted && (
            <LinearProgress
              variant="determinate"
              value={(timeLeft / 30) * 100}
              color={getTimerColor()}
              sx={{ height: 8, borderRadius: "4px" }}
            />
          )}
        </Box>
      )}
    </Box>
  );
};

export default QuizQuestionComponent;
