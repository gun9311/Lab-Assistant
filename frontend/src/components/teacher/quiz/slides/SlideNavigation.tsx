import React from "react";
import { Box, Button, Typography } from "@mui/material";
import { Question as QuestionType } from "../types";

type SlideNavigationProps = {
  currentSlideIndex: number;
  totalSlides: number; // 전체 슬라이드 수 (Overview + Questions + Review)
  setCurrentSlideIndex: (index: number) => void;
  addQuestion: () => void;
  // saveQuiz: () => void; // 제거됨
  isReviewSlide?: boolean;
  isReadOnly?: boolean;
  questions: QuestionType[];
  isQuestionListCollapsed: boolean;
  // openPreviewModal?: () => void; // 제거됨
};

const SlideNavigation: React.FC<SlideNavigationProps> = ({
  currentSlideIndex,
  totalSlides,
  setCurrentSlideIndex,
  addQuestion,
  isReviewSlide = false,
  isReadOnly = false,
  questions,
  isQuestionListCollapsed,
}) => {
  const goToPreviousSlide = () => {
    if (currentSlideIndex > 1) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const goToNextSlide = () => {
    if (currentSlideIndex < questions.length + 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      mt={2.5}
      mb={1}
      p={1.5}
      sx={{
        borderRadius: "10px",
        backgroundColor: "#f4f6f8",
      }}
    >
      {!isReviewSlide && ( // isReviewSlide가 false일 때만 진행 상황 표시
        <Box mb={1.5}>
          {currentSlideIndex <= questions.length && questions.length > 0 ? (
            <Typography variant="body2" color="textSecondary" fontWeight="500">
              문제 {currentSlideIndex} / {questions.length}
            </Typography>
          ) : currentSlideIndex > questions.length && !isReadOnly ? (
            <Typography variant="body2" color="primary" fontWeight="500">
              퀴즈 검토 중
            </Typography>
          ) : currentSlideIndex > questions.length && isReadOnly ? (
            <Typography variant="body2" color="primary" fontWeight="500">
              전체 보기 모드
            </Typography>
          ) : (
            <Typography variant="body2" color="textSecondary" fontWeight="500">
              문제 {currentSlideIndex} / {Math.max(1, questions.length)}
            </Typography>
          )}
        </Box>
      )}

      <Box display="flex" gap={1.5} flexDirection="row" alignItems="center">
        {!isReviewSlide && ( // 리뷰 슬라이드가 아닐 때만 이전/다음 버튼 표시
          <>
            <Button
              variant="outlined"
              onClick={goToPreviousSlide}
              disabled={currentSlideIndex === 1}
              sx={{
                borderRadius: "8px",
                borderColor: "#607d8b",
                color: "#607d8b",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: "500",
                minWidth: "80px",
                "&:hover": { backgroundColor: "rgba(96, 125, 139, 0.04)" },
              }}
            >
              이전
            </Button>
            <Button
              variant="contained"
              onClick={goToNextSlide} // 항상 다음 슬라이드로 이동
              sx={{
                borderRadius: "8px",
                backgroundColor:
                  currentSlideIndex < questions.length || questions.length === 0
                    ? "#ff9800"
                    : "#4caf50", // 마지막 문제면 다른 색상 (검토로 가는 버튼)
                color: "#fff",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: "500",
                minWidth: "80px",
                "&:hover": {
                  backgroundColor:
                    currentSlideIndex < questions.length ||
                    questions.length === 0
                      ? "#fb8c00"
                      : "#388e3c",
                },
              }}
            >
              {currentSlideIndex < questions.length || questions.length === 0
                ? "다음"
                : isReadOnly
                ? "전체 보기"
                : "퀴즈 검토"}
            </Button>
          </>
        )}

        {isReviewSlide &&
          isReadOnly && ( // 리뷰 슬라이드 + 읽기 전용 모드
            <Button
              variant="outlined"
              onClick={() => setCurrentSlideIndex(1)} // 첫 문제로 이동
              sx={{
                borderRadius: "8px",
                borderColor: "#1565c0",
                color: "#1565c0",
                fontSize: "0.875rem",
                fontWeight: "500",
                padding: "0.5rem 1rem",
              }}
            >
              개별 문제 보기
            </Button>
          )}
        {isReviewSlide &&
          !isReadOnly && ( // 리뷰 슬라이드 + 편집 모드 (이 버튼의 기능은 추후 명확히 할 필요 있음)
            <Button
              variant="outlined"
              onClick={() => setCurrentSlideIndex(1)} // 예: 첫 문제로 가서 편집 시작
              sx={{
                display: { xs: "none", md: "inline-flex" },
                minWidth: "auto",
                padding: "6px 8px",
              }}
            >
              문제 편집하기
            </Button>
          )}
      </Box>
    </Box>
  );
};

export default SlideNavigation;
