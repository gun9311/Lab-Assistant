import React from "react";
import { Box, Button, Typography, LinearProgress } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

interface Option {
  text: string;
  imageUrl?: string;
}

interface QuizQuestion {
  options: Option[];
  imageUrl?: string;
  timeLimit: number;
}

interface QuizQuestionComponentProps {
  currentQuestion: QuizQuestion;
  selectedAnswer: number | null;
  handleAnswerSelect: (index: number) => void;
  isAnswerSubmitted: boolean;
}

const QuizQuestionComponent: React.FC<QuizQuestionComponentProps> = ({
  currentQuestion,
  selectedAnswer,
  handleAnswerSelect,
  isAnswerSubmitted,
}) => {
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
              padding: "10px",
              fontSize: "1.7rem !important",
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
                  maxHeight: "140px",
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

      {isAnswerSubmitted && (
        <Box sx={{ mt: 4, textAlign: "center", animation: "fadeIn 0.5s" }}>
          <Typography variant="h6" sx={{ mb: 1, color: "green" }}>
            답변 제출 완료!
            <CheckCircleIcon
              sx={{ color: "green", ml: 1, verticalAlign: "middle" }}
            />
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default QuizQuestionComponent;
