import React from "react";
import { Box, Button, Typography } from "@mui/material";

type SlideNavigationProps = {
  currentSlideIndex: number;
  totalSlides: number;
  setCurrentSlideIndex: (index: number) => void;
  addQuestion: () => void;
  saveQuiz: () => void;
  isReviewSlide?: boolean;
  isReadOnly?: boolean;
};

const SlideNavigation: React.FC<SlideNavigationProps> = ({
  currentSlideIndex,
  totalSlides,
  setCurrentSlideIndex,
  addQuestion,
  saveQuiz,
  isReviewSlide = false,
  isReadOnly = false,
}) => {
  const goToPreviousSlide = () => {
    if (currentSlideIndex > 1) setCurrentSlideIndex(currentSlideIndex - 1);
  };

  const goToNextSlide = () => {
    if (isReadOnly && currentSlideIndex === totalSlides - 1) {
      setCurrentSlideIndex(totalSlides);
    } else if (currentSlideIndex < totalSlides - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    } else if (!isReadOnly) {
      addQuestion();
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      mt={1}   // 상단 여백 줄임
      mb={1}   // 하단 여백 줄임
      p={2}    // 전체 padding을 줄여 버튼 간격 조절
      sx={{
        borderRadius: "12px",
        backgroundColor: "#f4f6f8",
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* 진행 상황 표시 */}
      <Box mb={1}>
        {(!isReviewSlide || isReadOnly) && currentSlideIndex < totalSlides && (
          <Typography variant="body1" color="textSecondary" fontWeight="bold" fontSize="1.1rem">
            문제 {currentSlideIndex} / {totalSlides - 1}
          </Typography>
        )}
      </Box>

      {/* 버튼 영역 */}
      <Box display="flex" gap={1} mt={1} mb={1} flexDirection="row" alignItems="center">
        {/* 이전 버튼 */}
        {!isReviewSlide && (
          <Button
            variant="outlined"
            onClick={goToPreviousSlide}
            disabled={currentSlideIndex === 1}
            sx={{
              borderRadius: "12px",
              borderColor: "#ff9800",
              color: "#ff9800",
              padding: "0.6rem 1.2rem",
              fontSize: "0.9rem",
              fontWeight: "bold",
              "&:hover": { backgroundColor: "#fff7e1" },
              "&.Mui-disabled": { color: "#ccc", borderColor: "#ccc" },
            }}
          >
            이전
          </Button>
        )}

        {/* 다음 또는 문제 추가 버튼 */}
        {!isReviewSlide ? (
          <Button
            variant="contained"
            onClick={goToNextSlide}
            sx={{
              borderRadius: "12px",
              backgroundColor: "#ff9800",
              color: "#fff",
              padding: "0.6rem 1.2rem",
              fontSize: "0.9rem",
              fontWeight: "bold",
              "&:hover": { backgroundColor: "#fb8c00" },
            }}
          >
            {currentSlideIndex < totalSlides - 1
              ? "다음"
              : isReadOnly
              ? "전체 보기"
              : "문제 추가"}
          </Button>
        ) : isReadOnly ? (
          <Box display="flex" flexDirection="column" alignItems="center" gap={1} mt={1}>
            <Box display="flex" gap={1} mt={1}>
              <Button
                variant="outlined"
                onClick={() => setCurrentSlideIndex(1)}
                sx={{
                  borderRadius: "12px",
                  borderColor: "#1565c0",
                  color: "#1565c0",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  "&:hover": { backgroundColor: "#e3f2fd" },
                }}
              >
                개별 문제 보기
              </Button>
            </Box>
          </Box>
        ) : (
          <Button
            variant="contained"
            color="primary"
            onClick={saveQuiz}
            sx={{
              borderRadius: "12px",
              backgroundColor: "#4caf50",
              color: "#fff",
              padding: "0.75rem 2rem",
              fontSize: "1rem",
              fontWeight: "bold",
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
