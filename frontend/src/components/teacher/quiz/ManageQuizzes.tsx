import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Grid,
  CircularProgress,
  Snackbar,
  Paper,
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getQuizzes, deleteQuiz, getQuizById, getUnits } from "../../../utils/quizApi";
import QuizCard from "./components/QuizCard";
import QuizFilter from "./components/QuizFilter";
import CloseIcon from "@mui/icons-material/Close"; // 닫기 아이콘
import api from "../../../utils/api";
import background from '../../../../src/assets/background-logo.webp';
import { Quiz } from "./types"; // 공통 Quiz 타입 import
import QuizContainer from "../quiz/QuizContainer"; // QuizContainer import 추가

const ManageQuizzesPage: React.FC = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("latest");
  const [isTeamMode, setIsTeamMode] = useState<boolean>(false);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [unitFilter, setUnitFilter] = useState<string | null>(null);
  const [units, setUnits] = useState<string[]>([]);

  // 모달 상태 추가
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const data = await getQuizzes();
        setQuizzes(data);
      } catch (err) {
        setError("퀴즈 목록을 가져오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, []);

  useEffect(() => {
    if (gradeFilter && semesterFilter && subjectFilter) {
      const fetchUnits = async () => {
        const { units } = await getUnits(gradeFilter.toString(), semesterFilter, subjectFilter);
        setUnits(units);
      };
      fetchUnits();
    }
  }, [gradeFilter, semesterFilter, subjectFilter]);

  const filteredQuizzes = quizzes.filter((quiz) => {
    const gradeMatch = gradeFilter ? quiz.grade === gradeFilter : true;
    const semesterMatch = semesterFilter ? quiz.semester === semesterFilter : true;
    const subjectMatch = subjectFilter ? quiz.subject === subjectFilter : true;
    const unitMatch = unitFilter ? quiz.unit === unitFilter : true;
    return gradeMatch && semesterMatch && subjectMatch && unitMatch;
  });

  const getSortedQuizzes = () => {
    if (sortBy === "likes") {
      return [...filteredQuizzes].sort((a, b) => b.likeCount - a.likeCount);
    } else {
      return [...filteredQuizzes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  };

  const handleDelete = async (quizId: string) => {
    try {
      await deleteQuiz(quizId);
      setQuizzes(quizzes.filter((quiz) => quiz._id !== quizId));
      setSuccessMessage("퀴즈가 성공적으로 삭제되었습니다.");
    } catch (err) {
      setError("퀴즈를 삭제하는 중 오류가 발생했습니다.");
    }
  };

  const handleCloseSnackbar = () => {
    setError(null);
    setSuccessMessage(null);
  };

  // 모달 열기 핸들러
  const handleOpenModal = async (quizId: string) => {
    try {
      const quizData = await getQuizById(quizId); // ID로 전체 퀴즈 데이터 가져오기
      setSelectedQuiz(quizData);
      setIsModalOpen(true);
    } catch (err) {
      setError("퀴즈 데이터를 가져오는 중 오류가 발생했습니다.");
    }
  };

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedQuiz(null);
  };

  const handleStartQuiz = async (quizId: string) => {
    try {
      const response = await api.post(`/kahoot-quiz/start-session/${quizId}`, {
        isTeamMode,
      });
      const { pin, sessionId } = response.data;
      navigate("/start-quiz-session", { state: { pin, sessionId } });
    } catch (error) {
      setError("퀴즈 세션을 시작하는 중 오류가 발생했습니다.");
    }
  };

  const sortedQuizzes = getSortedQuizzes();

  return (
    <Box sx={{ padding: "2rem", backgroundColor: "#ffffff", minHeight: "100vh" }}>
      <Paper
        elevation={3}
        sx={{
          padding: "2rem",
          paddingBottom: "0",
          marginBottom: "2rem",
          borderRadius: "16px",
          backgroundColor: "#f7f7f7",
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
          minHeight: "350px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <Box display="flex" justifyContent="flex-end" sx={{ position: "absolute", top: "1rem", right: "1rem" }}>
          <Button
            variant="contained"
            sx={{
              borderRadius: "8px",
              backgroundColor: "#FFC107",
              fontWeight: "bold",
              fontSize: "1rem",
              paddingX: "1.5rem",
              "&:hover": { backgroundColor: "#FF9800" },
            }}
            onClick={() => navigate("/create-quiz")}
          >
            퀴즈 생성
          </Button>
        </Box>

        <Box sx={{ mt: "auto" }}>
          <QuizFilter
            gradeFilter={gradeFilter}
            setGradeFilter={setGradeFilter}
            semesterFilter={semesterFilter}
            setSemesterFilter={setSemesterFilter}
            subjectFilter={subjectFilter}
            setSubjectFilter={setSubjectFilter}
            unitFilter={unitFilter}
            setUnitFilter={setUnitFilter}
            units={units}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: 3, borderRadius: "16px", backgroundColor: "#ffffff" }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {sortedQuizzes.length === 0 ? (
              <Grid item xs={12}>
                <Typography variant="h6" align="center" color="textSecondary">
                  필터 조건에 맞는 퀴즈가 없습니다.
                </Typography>
              </Grid>
            ) : (
              sortedQuizzes.map((quiz) => (
                <Grid item xs={12} sm={6} md={4} key={quiz._id}>
                  <QuizCard
                    quiz={quiz}
                    onDelete={handleDelete}
                    onOpenModal={() => handleOpenModal(quiz._id)} // quiz._id를 전달하여 모달 열기
                  />
                </Grid>
              ))
            )}
          </Grid>
        )}
      </Paper>

      <Snackbar open={!!error || !!successMessage} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={error ? "error" : "success"} sx={{ width: "100%" }}>
          {error || successMessage}
        </Alert>
      </Snackbar>

      {/* 퀴즈 확인 모달 */}
      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="md" fullWidth>
        {/* <DialogTitle> */}
          {/* 퀴즈 확인 */}
        <IconButton
          aria-label="close"
          onClick={handleCloseModal}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
        {/* </DialogTitle> */}
        <DialogContent>
          {selectedQuiz && (
            <QuizContainer
              isReadOnly={true} // 읽기 전용 모드 활성화
              initialData={selectedQuiz} // 전체 퀴즈 데이터를 전달
              onStartQuiz={() => handleStartQuiz(selectedQuiz._id)}
              onEditQuiz={() => navigate(`/edit-quiz/${selectedQuiz._id}`)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ManageQuizzesPage;
