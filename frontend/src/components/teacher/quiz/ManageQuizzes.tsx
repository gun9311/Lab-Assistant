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
  Pagination,
  Tabs,
  Tab,
} from "@mui/material";
import QuizIcon from "@mui/icons-material/Quiz"; // 전체 퀴즈 아이콘
import PersonIcon from "@mui/icons-material/Person"; // 내 퀴즈 아이콘
import { useNavigate } from "react-router-dom";
import {
  getQuizzes,
  deleteQuiz,
  getQuizById,
  getUnits,
  duplicateQuiz,
} from "../../../utils/quizApi";
import QuizCard from "./components/QuizCard";
import QuizFilter from "./components/QuizFilter";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add"; // 추가된 아이콘
import api from "../../../utils/api";
// import background from '../../../../src/assets/background-logo.webp';
import background from "../../../../src/assets/nudge-background2-edit.png";
import { Quiz } from "./types";
import QuizContainer from "../quiz/QuizContainer";
import { getUserId } from "../../../utils/auth";

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

  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(6);
  const [totalCount, setTotalCount] = useState(0);

  const [isMyQuizzes, setIsMyQuizzes] = useState(false);

  const userId = getUserId();

  // 퀴즈 목록 가져오기
  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        const { quizzes, totalCount } = await getQuizzes({
          page,
          limit,
          gradeFilter,
          semesterFilter,
          subjectFilter,
          unitFilter,
          sortBy,
          createdBy: isMyQuizzes && userId ? userId : undefined,
        });
        setQuizzes(quizzes);
        setTotalCount(totalCount);
      } catch (err) {
        setError("퀴즈 목록을 가져오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuizzes();
  }, [
    page,
    gradeFilter,
    semesterFilter,
    subjectFilter,
    unitFilter,
    sortBy,
    isMyQuizzes,
  ]);

  useEffect(() => {
    setPage(1);
  }, [gradeFilter, semesterFilter, subjectFilter, unitFilter]);

  useEffect(() => {
    if (gradeFilter && semesterFilter && subjectFilter) {
      const fetchUnits = async () => {
        try {
          const { units } = await getUnits(
            gradeFilter.toString(),
            semesterFilter,
            subjectFilter
          );
          setUnits(units);
        } catch (err) {
          setError("단원 목록을 가져오는 중 오류가 발생했습니다.");
        }
      };
      fetchUnits();
    } else {
      setUnits([]);
    }
  }, [gradeFilter, semesterFilter, subjectFilter]);

  const handlePageChange = (event: any, value: any) => {
    setPage(value);
  };

  const totalPages = Math.ceil(totalCount / limit);

  const handleEditQuiz = async () => {
    if (!selectedQuiz) return;

    if (selectedQuiz.createdBy === userId) {
      navigate(`/edit-quiz/${selectedQuiz._id}`);
    } else {
      const confirmClone = window.confirm(
        "수정하려면 퀴즈를 복제해야 합니다. 복제하시겠습니까?"
      );
      if (confirmClone) {
        try {
          const { quizId: duplicatedQuizId } = await duplicateQuiz(
            selectedQuiz._id
          );
          alert("복제된 퀴즈는 '내 퀴즈'에서 확인할 수 있습니다.");
          navigate(`/edit-quiz/${duplicatedQuizId}`);
        } catch (error) {
          setError("퀴즈 복제 중 오류가 발생했습니다.");
        }
      }
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

  const handleOpenModal = async (quizId: string) => {
    try {
      const quizData = await getQuizById(quizId);
      setSelectedQuiz(quizData);
      setIsModalOpen(true);
    } catch (err) {
      setError("퀴즈 데이터를 가져오는 중 오류가 발생했습니다.");
    }
  };

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

  const toggleMyQuizzes = (event: React.SyntheticEvent, newValue: number) => {
    setIsMyQuizzes(newValue === 1);
    setPage(1);
  };

  return (
    <Box sx={{ maxWidth: "lg", margin: "0 auto", padding: "2rem", mt: 2 }}>
      <Paper
        elevation={3}
        sx={{
          padding: "2rem",
          paddingTop: "1.2rem",
          paddingBottom: "0",
          marginBottom: "2rem",
          borderRadius: "16px",
          backgroundColor: "#f7f7f7",
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
          minHeight: "300px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* 탭 형식으로 변경 */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Tabs
            value={isMyQuizzes ? 1 : 0}
            onChange={(event, newValue) => {
              setPage(1);
              setIsMyQuizzes(newValue === 1);
            }}
            centered
            TabIndicatorProps={{
              style: {
                backgroundColor: "#8B4513", // 하이라이트 컬러 (짙은 갈색 계열)
                height: "3px",
              },
            }}
            sx={{
              "& .MuiTab-root": {
                fontFamily: "'Poppins', sans-serif",
                fontWeight: "bold",
                color: "#5D4037", // 기본 글씨 색상 (짙은 갈색)
                opacity: 0.8,
                transition: "color 0.3s ease",
              },
              "& .MuiTab-root.Mui-selected": {
                color: "#4E342E", // 선택된 탭의 글씨 색상 (조금 더 어두운 갈색)
              },
              "& .MuiTab-root:hover": {
                color: "#8B4513", // 호버 시 글씨 색상 (짙은 갈색 계열)
              },
              // "& .MuiTabs-flexContainer": {
              //   backgroundColor: "rgba(255, 235, 205, 0.3)",
              //   borderRadius: "8px",
              //   padding: "0.5rem 1rem",
              // },
            }}
          >
            <Tab
              icon={<QuizIcon />} // 전체 퀴즈 아이콘 추가
              iconPosition="start"
              label="전체 퀴즈"
            />
            <Tab
              icon={<PersonIcon />} // 내 퀴즈 아이콘 추가
              iconPosition="start"
              label="내 퀴즈"
            />
          </Tabs>

          <Button
            variant="contained"
            startIcon={<AddIcon />} // 아이콘 추가
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

      {/* 기존 코드 유지 */}
      <Paper
        elevation={3}
        sx={{ p: 3, borderRadius: "16px", backgroundColor: "#ffffff" }}
      >
        {loading ? (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="50vh"
          >
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {quizzes.length === 0 ? (
              <Grid item xs={12}>
                <Typography variant="h6" align="center" color="textSecondary">
                  필터 조건에 맞는 퀴즈가 없습니다.
                </Typography>
              </Grid>
            ) : (
              quizzes.map((quiz) => (
                <Grid item xs={12} sm={6} md={4} key={quiz._id}>
                  <QuizCard
                    quiz={quiz}
                    onDelete={handleDelete}
                    onOpenModal={() => handleOpenModal(quiz._id)}
                    isMyQuizzes={isMyQuizzes}
                  />
                </Grid>
              ))
            )}
          </Grid>
        )}
      </Paper>

      <Pagination
        count={totalPages}
        page={page}
        onChange={handlePageChange}
        sx={{ display: "flex", justifyContent: "center", marginTop: "2rem" }}
      />

      <Snackbar
        open={!!error || !!successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={error ? "error" : "success"}
          sx={{ width: "100%" }}
        >
          {error || successMessage}
        </Alert>
      </Snackbar>

      <Dialog
        open={isModalOpen}
        onClose={handleCloseModal}
        maxWidth="md"
        fullWidth
      >
        {/* <DialogTitle>
          퀴즈 확인 */}
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
              isReadOnly={true}
              initialData={selectedQuiz}
              onStartQuiz={() => handleStartQuiz(selectedQuiz._id)}
              onEditQuiz={handleEditQuiz}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ManageQuizzesPage;
