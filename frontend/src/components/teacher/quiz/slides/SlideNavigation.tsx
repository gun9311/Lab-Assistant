import React from "react";
import { Box, Button } from "@mui/material";

type SlideNavigationProps = {
  currentSlideIndex: number;
  totalSlides: number;
  setCurrentSlideIndex: (index: number) => void;
  addQuestion: () => void;
};

const SlideNavigation: React.FC<SlideNavigationProps> = ({
  currentSlideIndex,
  totalSlides,
  setCurrentSlideIndex,
  addQuestion,
}) => {
  const goToPreviousSlide = () => {
    if (currentSlideIndex > 0) setCurrentSlideIndex(currentSlideIndex - 1);
  };

  const goToNextSlide = () => {
    if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else {
      // 검토 슬라이드인 경우 저장 버튼으로 표시
      addQuestion(); // 마지막 슬라이드인 경우 문제 추가
    }
  };

  return (
    <Box display="flex" justifyContent="space-between" mt={2}>
      <Button
        variant="outlined"
        disabled={currentSlideIndex === 0}
        onClick={goToPreviousSlide}
      >
        이전
      </Button>

      <Button variant="contained" onClick={goToNextSlide}>
        {currentSlideIndex < totalSlides - 1 ? "다음" : "퀴즈 저장"}
      </Button>
    </Box>
  );
};

export default SlideNavigation;
