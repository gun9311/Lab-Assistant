import React from "react";
import { Box, Button } from "@mui/material";

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
    <Box display="flex" justifyContent={isReviewSlide ? "center" : "space-between"} mt={2}>
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
  );
};

export default SlideNavigation;
