import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import { Question } from "./types"; // 퀴즈 문제 타입
import QuestionComponent from "./components/Question"; // Question 컴포넌트 재사용

interface QuizPreviewModalProps {
  open: boolean;
  onClose: () => void;
  quizTitle: string;
  questions: Question[];
}

const QuizPreviewModal: React.FC<QuizPreviewModalProps> = ({
  open,
  onClose,
  quizTitle,
  questions,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [currentQuestionForDisplay, setCurrentQuestionForDisplay] =
    useState<any>(null);

  useEffect(() => {
    if (open) {
      const imageCount = 15; // 테마 이미지 개수
      const randomIndex = Math.floor(Math.random() * imageCount) + 1;
      const randomImageUrl = `/assets/quiz-theme/quiz_theme${randomIndex}.png`;
      setBackgroundImage(randomImageUrl);
      setCurrentQuestionIndex(0); // 모달 열릴 때 첫 문제로
    }
  }, [open]);

  useEffect(() => {
    if (
      open &&
      questions.length > 0 &&
      currentQuestionIndex < questions.length
    ) {
      const question = questions[currentQuestionIndex];
      if (question) {
        // QuestionComponent에 전달할 Question 객체 형식에 맞춤
        // correctAnswer를 숫자로 변환 (Question 타입에서는 number 또는 string일 수 있음)
        const correctAnswerAsNumber =
          typeof question.correctAnswer === "string"
            ? parseInt(question.correctAnswer, 10)
            : question.correctAnswer;

        // imageUrl, image, options 내부의 imageUrl, image 필드 확인 및 기본값 처리
        const processedOptions = question.options.map((opt) => ({
          text: opt.text || "",
          imageUrl: opt.imageUrl || "",
          // image: opt.image || null, // File 객체는 미리보기에서 직접 다루기 어려움
        }));

        setCurrentQuestionForDisplay({
          _id: `preview-${currentQuestionIndex}`, // 임시 ID
          questionText: question.questionText || "문제가 없습니다.",
          options: processedOptions,
          correctAnswer: correctAnswerAsNumber, // 숫자형으로 전달
          timeLimit: question.timeLimit || 30, // 기본 시간 제한
          imageUrl: question.imageUrl || "",
          // image: question.image || null, // File 객체
        });
      } else {
        setCurrentQuestionForDisplay(null);
      }
    } else if (open && questions.length === 0) {
      setCurrentQuestionForDisplay(null); // 문제가 없으면 null 처리
    }
  }, [open, questions, currentQuestionIndex]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    } else {
      // 마지막 문제 다음에는 모달을 닫거나, 첫 문제로 돌아가기 등 선택
      onClose(); // 여기서는 마지막 문제에서 "다음" 누르면 모달 닫기로 처리
    }
  }, [currentQuestionIndex, questions.length, onClose]);

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prevIndex) => prevIndex - 1);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose} // 배경 클릭이나 ESC로 닫기 허용
      PaperProps={{
        sx: {
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        },
      }}
    >
      {/* 상단 바: 퀴즈 제목, 문제 진행도, 닫기 버튼 */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: { xs: "0.5rem 1rem", sm: "1rem 2rem" }, // 반응형 패딩
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          color: "#fff",
        }}
      >
        <Typography
          variant="h5"
          sx={{ fontWeight: "bold", fontSize: { xs: "1.2rem", sm: "1.5rem" } }}
        >
          {quizTitle || "퀴즈 미리보기"}
        </Typography>
        {questions.length > 0 && (
          <Typography
            variant="h6"
            sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
          >
            문제 {currentQuestionIndex + 1} / {questions.length}
          </Typography>
        )}
        <IconButton onClick={onClose} sx={{ color: "#fff" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* 중앙: 문제 내용 (QuestionComponent 재사용) */}
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden", // 스크롤 자동 (필요에 따라)
          padding: "0 !important", // DialogContent 기본 패딩 제거
          flexGrow: 1, // 남은 공간을 채우도록
        }}
      >
        {currentQuestionForDisplay && questions.length > 0 ? (
          <QuestionComponent
            currentQuestion={currentQuestionForDisplay}
            allSubmitted={true} // 항상 정답을 보여주도록 설정
            isPreview={true} // 미리보기 모드임을 명시
            // submittedCount, totalStudents, endTime 등은 전달 X (QuestionComponent에서 기본값 처리)
          />
        ) : (
          <Typography
            variant="h4"
            sx={{ color: "#fff", textAlign: "center", padding: "2rem" }}
          >
            {questions.length === 0
              ? "미리 볼 문제가 없습니다. 문제를 추가해주세요."
              : "문제를 불러오는 중..."}
          </Typography>
        )}
      </DialogContent>

      {/* 하단 바: 이전/다음 버튼 */}
      {questions.length > 0 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-around", // 버튼 간 간격 균등하게
            alignItems: "center",
            padding: "1rem",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
          }}
        >
          <Button
            variant="contained"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
            startIcon={<ArrowBackIosNewIcon />}
            sx={{
              backgroundColor: "rgba(255,255,255,0.3)",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.5)" },
              fontSize: { xs: "0.8rem", sm: "1rem" },
              padding: { xs: "0.4rem 0.8rem", sm: "0.6rem 1.2rem" },
            }}
          >
            이전 문제
          </Button>
          <Button
            variant="contained"
            onClick={handleNextQuestion}
            // 마지막 문제에서는 "미리보기 종료" 텍스트로 변경하고 onClose 호출
            endIcon={<ArrowForwardIosIcon />}
            sx={{
              backgroundColor: "rgba(255,255,255,0.3)",
              "&:hover": { backgroundColor: "rgba(255,255,255,0.5)" },
              fontSize: { xs: "0.8rem", sm: "1rem" },
              padding: { xs: "0.4rem 0.8rem", sm: "0.6rem 1.2rem" },
            }}
          >
            {currentQuestionIndex === questions.length - 1
              ? "미리보기 종료"
              : "다음 문제"}
          </Button>
        </Box>
      )}
    </Dialog>
  );
};

export default QuizPreviewModal;
