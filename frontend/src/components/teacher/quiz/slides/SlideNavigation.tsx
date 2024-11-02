import React from "react";
import { Box, Button, Typography } from "@mui/material";

type SlideNavigationProps = {
  currentSlideIndex: number;
  totalSlides: number;
  setCurrentSlideIndex: (index: number) => void;
  addQuestion: () => void;
  saveQuiz: () => void;
  isReviewSlide?: boolean;
};

const SlideNavigation: React.FC<SlideNavigationProps> = ({
  currentSlideIndex,
  totalSlides,
  setCurrentSlideIndex,
  addQuestion,
  saveQuiz,
  isReviewSlide = false,
}) => {
  const goToPreviousSlide = () => {
    if (currentSlideIndex > 1) setCurrentSlideIndex(currentSlideIndex - 1);
  };

  const goToNextSlide = () => {
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      addQuestion();
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      mt={2}
      p={2}
      sx={{
        borderRadius: "12px",
        backgroundColor: "#f9f9f9",
        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* 진행 상황 표시 */}
      <Typography variant="body2" color="textSecondary">
        {isReviewSlide ? "검토 중" : `문제 ${currentSlideIndex} / ${totalSlides - 1}`}
      </Typography>

      {/* 버튼 영역 */}
      <Box display="flex" gap={1}>
        {!isReviewSlide && (
          <Button
            variant="outlined"
            onClick={goToPreviousSlide}
            disabled={currentSlideIndex === 1}
            sx={{
              borderRadius: "8px",
              borderColor: "#ff9800",
              color: "#ff9800",
              "&:hover": { backgroundColor: "#ffe0b2" },
            }}
          >
            이전
          </Button>
        )}

        {!isReviewSlide ? (
          <Button
            variant="contained"
            onClick={goToNextSlide}
            sx={{
              borderRadius: "8px",
              backgroundColor: "#ff9800",
              color: "#fff",
              "&:hover": { backgroundColor: "#fb8c00" },
            }}
          >
            {currentSlideIndex < totalSlides - 1 ? "다음" : "문제 추가"}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={saveQuiz}
            sx={{
              padding: "0.75rem 2rem",
              borderRadius: "8px",
              backgroundColor: "#4caf50",
              "&:hover": { backgroundColor: "#43a047" },
            }}
          >
            퀴즈 저장
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default SlideNavigation;
