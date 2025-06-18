// EditQuizPage.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Typography,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import QuizContainer, {
  QuizContainerRef,
  ActionBarState,
} from "./QuizContainer";
import ActionBar, { FIXED_ACTION_BAR_HEIGHT } from "./ActionBar";
import { getQuizById } from "../../../utils/quizApi"; // 이미 구현된 API

const EditQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const { quizId } = useParams<{ quizId: string }>();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const quizContainerRef = useRef<QuizContainerRef>(null);
  const [actionBarState, setActionBarState] = useState<ActionBarState>({
    currentSlideIndex: 1,
    totalQuestions: 1,
    isReviewSlide: false,
  });

  // 취소 확인 다이얼로그 상태 추가
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    const fetchQuizData = async () => {
      if (quizId) {
        try {
          const quizData = await getQuizById(quizId);
          setInitialData(quizData);
        } catch (error) {
          console.error("Failed to fetch quiz data", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchQuizData();
  }, [quizId]);

  const handleSave = () => {
    quizContainerRef.current?.save();
  };
  const handlePreview = () => {
    quizContainerRef.current?.openPreview();
  };
  const handleNavigate = (direction: "prev" | "next") => {
    quizContainerRef.current?.navigate(direction);
  };

  // 취소 핸들러 추가
  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = () => {
    navigate("/manage-quizzes");
  };

  const canNavigateForward =
    !actionBarState.isReviewSlide &&
    actionBarState.totalQuestions > 0 &&
    actionBarState.currentSlideIndex <= actionBarState.totalQuestions;

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          padding: { xs: "1.5rem", md: "1.5rem" },
          borderRadius: "16px",
          boxShadow: "0px 6px 20px rgba(0, 0, 0, 0.1)",
          backgroundColor: "#ffffff",
          maxWidth: "xl",
          width: "100%",
          margin: "40px auto",
          mb: `calc(${FIXED_ACTION_BAR_HEIGHT} + 40px)`, // 액션바 공간 확보
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            color: "#333",
            textAlign: "center",
            fontSize: {
              xs: "1.5rem", // 전화면 (mobile)
              sm: "1.75rem",
              md: "1.75rem", // 태블릿 이상
              lg: "2rem", // 데스크탑 이상
              xl: "2.25rem",
            },
            mb: 2,
          }}
        >
          ✏️ 퀴즈 수정
        </Typography>

        <Divider sx={{ my: 2, borderColor: "#e0e0e0" }} />

        {initialData && (
          <QuizContainer
            ref={quizContainerRef}
            isEdit={true}
            initialData={initialData}
            onStateChange={setActionBarState}
          />
        )}
      </Box>
      <ActionBar
        isEdit={true}
        isReadOnly={false}
        canNavigateBack={actionBarState.currentSlideIndex > 1}
        canNavigateForward={canNavigateForward}
        onNavigate={handleNavigate}
        onPreview={handlePreview}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      {/* 취소 확인 다이얼로그 추가 */}
      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
      >
        <DialogTitle>퀴즈 수정 취소</DialogTitle>
        <DialogContent>
          <DialogContentText>
            퀴즈 수정을 취소하고 목록으로 돌아가시겠습니까?
            <br />
            저장하지 않은 변경사항은 사라집니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>계속 수정</Button>
          <Button onClick={handleConfirmCancel} color="error">
            취소하고 나가기
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditQuizPage;
