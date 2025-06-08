import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Snackbar,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
// import QuizComponent from "./QuizComponent";
import QuizFilter from "./QuizFilter";
import QuizResults from "./QuizResults";
import { getUserId, getGradeStatus } from "../../../utils/auth";
import api from "../../../utils/api";
import { useNavigate } from "react-router-dom";
import background from "../../../../src/assets/nudge-background2-edit.png";
import { PlayCircleFilled } from "@mui/icons-material";

interface Selection {
  grade: string;
  semester: string;
  subject: string;
  unit: string;
  topic: string;
}

type Task = {
  _id: string;
  taskText: string;
};

type Quiz = {
  _id: string;
  grade: string;
  semester: string;
  subject: string;
  unit: string;
  tasks: Task[];
};

interface QuizResult {
  _id: string;
  subject: string;
  semester: string;
  unit: string;
  score: number;
  createdAt: string;
  results: {
    questionId: string;
    taskText: string;
    studentAnswer: string;
    correctAnswer: string;
    similarity: number;
  }[];
}

interface MyQuizzesPageProps {
  setIsQuizMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const MyQuizzesPage: React.FC<MyQuizzesPageProps> = ({ setIsQuizMode }) => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<QuizResult[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizResult | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [pendingQuiz, setPendingQuiz] = useState<Quiz | null>(null);
  const [selection, setSelection] = useState<Selection>({
    grade: getGradeStatus() || "",
    semester: "",
    subject: "",
    unit: "",
    topic: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [pin, setPin] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const studentId = getUserId();
  const navigate = useNavigate();

  const handleSelectionChange = (newSelection: Selection) => {
    // console.log("Selection 변경:", newSelection);
    setSelection(newSelection);
  };

  const handleQuizResultClick = (quizResult: QuizResult) => {
    setSelectedQuiz(quizResult);
  };

  const handleCloseDetails = () => {
    setSelectedQuiz(null);
  };

  const handleQuizRequest = async () => {
    try {
      const response = await api.post("/kahoot-quiz/join-session", { pin });
      if (response.data) {
        const { sessionId } = response.data;
        navigate(`/quiz-session`, { state: { pin, sessionId } });
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setError("세션을 찾을 수 없습니다.");
      } else {
        console.error("Failed to join quiz:", error);
        setError(
          error.response?.data?.message ||
            "퀴즈 세션에 참여하는 데 실패했습니다."
        );
      }
      setSnackbarOpen(true);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <Container component="main" maxWidth="lg" sx={{ mt: 6, mb: 4 }}>
      <Paper
        elevation={3}
        sx={{
          padding: "2rem",
          paddingTop: "1.2rem",
          paddingBottom: "0",
          marginBottom: "1rem",
          borderRadius: "16px",
          backgroundColor: "#f7f7f7",
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "center 40%",
          position: "relative",
          minHeight: "190px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      ></Paper>
      <Paper
        elevation={3}
        sx={{ p: 3, borderRadius: "16px", backgroundColor: "#ffffff" }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <QuizFilter
            selection={selection}
            handleSelectionChange={handleSelectionChange}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleOpenModal}
            startIcon={<PlayCircleFilled />} // 아이콘 추가
            sx={{
              fontWeight: 600,
              padding: "10px 30px", // 크기 조정
              borderRadius: "24px",
              background: "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)", // 색상 개선
              boxShadow: "0 3px 5px 2px rgba(255, 105, 135, .3)", // 그림자 추가
              "&:hover": {
                background: "linear-gradient(45deg, #FF8E53 30%, #FE6B8B 90%)", // 호버 효과
              },
            }}
          >
            PLAY
          </Button>
        </Box>

        <QuizResults
          studentId={studentId}
          selectedSemester={selection.semester || "All"}
          selectedSubject={selection.subject || "All"}
          handleCloseDetails={handleCloseDetails}
          isStudentView={true}
        />
        {/* {currentQuiz && (
          <QuizComponent
            quiz={currentQuiz}
            onSubmit={() => {}}
            onAutoSubmit={() => {}}
          />
        )} */}
      </Paper>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={2000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessMessage(null)}
          severity="success"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="warning"
          sx={{ width: "100%" }}
        >
          세션을 찾을 수 없거나 오류가 발생했습니다.
        </Alert>
      </Snackbar>

      <Dialog open={isModalOpen} onClose={handleCloseModal}>
        <DialogContent>
          <DialogContentText>PIN을 입력하세요.</DialogContentText>
          <TextField
            label="PIN 입력"
            variant="outlined"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="primary">
            취소
          </Button>
          <Button onClick={handleQuizRequest} color="secondary" disabled={!pin}>
            참여
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MyQuizzesPage;
