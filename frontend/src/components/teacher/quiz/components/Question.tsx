import React, { useState, useEffect } from "react";
import { Box, Typography, LinearProgress, Button } from "@mui/material";
import TimerIcon from "@mui/icons-material/Timer"; // 시계 모양 타이머 아이콘
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DonutChartComponent from "./DonutChartComponent";

interface Question {
  _id: string;
  questionText: string;
  options: { text: string; imageUrl?: string }[];
  correctAnswer: number | string; // correctAnswer 타입 string도 허용 (미리보기 시 숫자 변환)
  timeLimit: number;
  imageUrl?: string;
  endTime?: number | null; // 실제 세션에서는 사용, 미리보기에서는 사용 안 함
  isPreview?: boolean; // 미리보기 모드임을 명시하는 prop 추가
  showOptions?: boolean; // 선택지 표시 여부 prop 추가
  toggleShowOptions?: () => void; // 선택지 토글 함수 prop 추가
}

interface QuestionComponentProps {
  currentQuestion: Question | null;
  submittedCount?: number; // 선택적 prop으로 변경
  totalStudents?: number; // 선택적 prop으로 변경
  allSubmitted?: boolean; // 정답 즉시 표시용 (미리보기에서 true)
  endTime?: number | null; // 실제 세션에서는 사용, 미리보기에서는 사용 안 함
  isPreview?: boolean; // 미리보기 모드임을 명시하는 prop 추가
  showOptions?: boolean; // 선택지 표시 여부 prop 추가
  toggleShowOptions?: () => void; // 선택지 토글 함수 prop 추가
}

const QuestionComponent: React.FC<QuestionComponentProps> = ({
  currentQuestion,
  submittedCount = 0, // 기본값 0
  totalStudents = 0, // 기본값 0
  allSubmitted = false,
  endTime,
  isPreview = false, // 기본값 false
  showOptions = false, // 기본값 false
  toggleShowOptions,
}) => {
  const [remainingTime, setRemainingTime] = useState<number>(() => {
    if (!isPreview && endTime) {
      // 미리보기가 아닐 때만 endTime으로 계산
      const now = Date.now();
      return Math.max(0, Math.floor((endTime - now) / 1000));
    }
    return currentQuestion?.timeLimit || 0; // 미리보기 시 또는 endTime 없을 시 timeLimit 표시
  });
  const shouldShowOptions = allSubmitted || showOptions;

  useEffect(() => {
    if (isPreview || allSubmitted || !endTime) return; // 미리보기 모드이거나, 모두 제출했거나, endTime 없으면 타이머 X

    const interval = setInterval(() => {
      const now = Date.now();
      const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
      setRemainingTime(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, allSubmitted, isPreview]);

  useEffect(() => {
    // 새로운 문제가 주어졌을 때 남은 시간을 초기화 (미리보기 시에는 timeLimit으로 고정)
    if (currentQuestion) {
      setRemainingTime(currentQuestion.timeLimit);
    }
  }, [currentQuestion]);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "95%",
        textAlign: "center",
        color: "#fff",
        padding: "2vh 1vw",
        position: "relative", // For positioning the toggle button
        height: "100%", // Ensure the box takes full height for positioning
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* 문제 이미지 */}
      {currentQuestion?.imageUrl && (
        <img
          src={currentQuestion.imageUrl}
          alt="문제 이미지"
          style={{
            maxWidth: "100%",
            maxHeight: "40vh", // 이미지 최대 높이 조정 가능
            marginBottom: "2vh",
            borderRadius: "8px",
            objectFit: "contain",
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
          flexGrow: 1, // 남은 공간을 채우도록 설정
          maxHeight: shouldShowOptions ? "35vh" : "60vh", // 조건부 최대 높이
          overflow: "hidden", // 스크롤바 제거
          transition: "max-height 0.5s ease-in-out",
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
            // 문제 텍스트 크기를 동적으로 조정
            fontSize: `clamp(2rem, ${
              shouldShowOptions ? "4.5vw" : "6vw"
            }, 8rem)`,
            transition: "font-size 0.5s ease-in-out",
            lineHeight: 1.2,
            wordBreak: "keep-all",
          }}
        >
          {currentQuestion?.questionText || "현재 출제된 문제가 없습니다."}
        </Typography>
        {/* 시계 모양 타이머 아이콘 */}
        {currentQuestion && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5vw",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "0.5vw" }}>
              <TimerIcon
                sx={{
                  fontSize: "3vw", // 반응형 아이콘 크기
                  color:
                    !isPreview && remainingTime <= 5 && remainingTime > 0
                      ? "red"
                      : "white",
                }}
              />
              <Typography
                variant="h6"
                sx={{
                  color:
                    !isPreview && remainingTime <= 5 && remainingTime > 0
                      ? "red"
                      : "white",
                  fontSize: "3vw", // 반응형 폰트 크기
                }}
              >
                {/* 미리보기 시에는 설정된 시간 제한 표시, 실제 세션에서는 남은 시간 표시 */}
                {isPreview
                  ? `${currentQuestion.timeLimit}s`
                  : `${remainingTime}s`}
              </Typography>
            </Box>
            {/* 제출 현황 차트 (미리보기 모드가 아니고 학생이 있을 때만 표시) */}
            {!isPreview && totalStudents > 0 && (
              <Box sx={{ width: "50%", margin: "0 auto" }}>
                {" "}
                {/* 크기 고정 */}
                <DonutChartComponent
                  submittedCount={submittedCount}
                  totalStudents={totalStudents}
                />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* 선택지 목록 */}
      {currentQuestion && shouldShowOptions && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: "1.5vw",
            justifyItems: "center",
            alignItems: "center",
            marginBottom: "2vh",
            padding: "0 1vw",
            opacity: shouldShowOptions ? 1 : 0,
            transform: shouldShowOptions ? "translateY(0)" : "translateY(50px)",
            transition: "opacity 0.5s ease-in-out, transform 0.5s ease-in-out",
          }}
        >
          {currentQuestion.options.map((option, index) => {
            // correctAnswer가 문자열일 수 있으므로, 비교 시 숫자형으로 변환된 값과 비교
            const correctAnswerAsNumber =
              typeof currentQuestion.correctAnswer === "string"
                ? parseInt(currentQuestion.correctAnswer, 10)
                : currentQuestion.correctAnswer;
            const isCorrect = index === correctAnswerAsNumber;

            return (
              <Box
                key={index}
                sx={{
                  backgroundColor:
                    allSubmitted && isCorrect // allSubmitted (미리보기에선 항상 true) 이고 정답일 때
                      ? "rgba(0, 200, 150, 0.7)" // 더 진한 초록색 배경
                      : allSubmitted // allSubmitted 이고 오답일 때
                      ? "rgba(200, 100, 150, 0.4)" // 오답 배경 유지 또는 다른 색
                      : "rgba(0, 0, 0, 0.5)", // 기본 배경
                  padding: "1vh", // 내부 패딩 조정
                  borderRadius: "8px",
                  cursor: "default",
                  width: "100%",
                  minHeight: allSubmitted ? "12vh" : "8vh", // 정답 공개 시 높이 증가
                  display: "flex",
                  flexDirection: option.imageUrl ? "column" : "row", // 이미지가 있으면 수직, 없으면 수평 정렬
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                  transition:
                    "background-color 0.3s ease, transform 0.3s ease, min-height 0.5s ease-in-out",
                  transform: allSubmitted && isCorrect ? "scale(1.05)" : "none", // 정답일 때 약간 확대
                  boxShadow:
                    allSubmitted && isCorrect
                      ? "0px 6px 12px rgba(0, 200, 150, 0.3)" // 정답일 때 그림자 효과
                      : "none",
                  overflow: "hidden", // 내용 넘침 방지
                  position: "relative", // 아이콘 위치 기준
                }}
              >
                {option.imageUrl && (
                  <img
                    src={option.imageUrl}
                    alt={`선택지 ${index + 1} 이미지`}
                    style={{
                      maxWidth: "90%", // 이미지 크기 조정
                      maxHeight: "13vh", // 이미지 최대 높이
                      marginBottom: option.text ? "1vh" : "0", // 텍스트 있을 때만 마진
                      borderRadius: "5px",
                      objectFit: "contain",
                    }}
                  />
                )}
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: "bold",
                    fontSize: {
                      xs: "3vw",
                      sm: allSubmitted ? "3vw" : "2.5vw",
                      md: allSubmitted ? "2.5vw" : "2vw",
                    }, // 반응형 폰트 크기
                    color: "#fff", // 텍스트 색상 흰색으로 고정
                    wordBreak: "keep-all",
                    overflowWrap: "break-word",
                  }}
                >
                  {option.text}
                </Typography>
                {/* 정답 여부에 따른 아이콘 (미리보기에서는 항상 표시) */}
                {allSubmitted && ( // isPreview일 때는 항상 true로 전달될 것임
                  <Box
                    component="span"
                    sx={{
                      position: "absolute", // 아이콘 위치 조정
                      top: "10px",
                      right: "10px",
                    }}
                  >
                    {isCorrect ? (
                      <CheckCircleIcon
                        sx={{
                          color: "lightgreen",
                          fontSize: { xs: "4vw", sm: "3vw", md: "2.5vw" },
                        }}
                      />
                    ) : (
                      <CancelIcon
                        sx={{
                          color: "rgba(255, 160, 122, 0.9)", // 연한 주황색 (오답 표시)
                          fontSize: { xs: "4vw", sm: "3vw", md: "2.5vw" },
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

      {/* 선택지 토글 버튼: 문제가 있고, 아직 정답 공개 전일 때만 표시 */}
      {currentQuestion && !allSubmitted && toggleShowOptions && (
        <Button
          onClick={toggleShowOptions}
          variant="contained"
          startIcon={showOptions ? <VisibilityOffIcon /> : <VisibilityIcon />}
          sx={{
            position: "absolute",
            bottom: "2vh",
            right: "2vw",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            color: "white",
            "&:hover": {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
            },
          }}
        >
          {showOptions ? "선택지 숨기기" : "선택지 표시"}
        </Button>
      )}
    </Box>
  );
};

export default QuestionComponent;
