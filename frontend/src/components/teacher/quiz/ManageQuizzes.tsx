import React, { useEffect, useState, useRef } from "react";
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
  useTheme,
  useMediaQuery,
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
import background from "../../../../src/assets/nudge-background3-edit.png";
import { Quiz } from "./types";
import QuizContainer, {
  QuizContainerRef,
  ActionBarState,
} from "../quiz/QuizContainer";
import ActionBar, { FIXED_ACTION_BAR_HEIGHT } from "../quiz/ActionBar";
import { getUserId } from "../../../utils/auth";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

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
  const [limit, setLimit] = useState(8);
  const [totalCount, setTotalCount] = useState(0);

  const [isMyQuizzes, setIsMyQuizzes] = useState(false);
  const quizContainerRef = useRef<QuizContainerRef>(null);
  const [actionBarState, setActionBarState] = useState<ActionBarState | null>(
    null
  );
  const [activeLottie, setActiveLottie] = useState<"existing" | "new">("new"); // Lottie 상태 추가. 'new'가 먼저 시작되도록 변경

  const userId = getUserId();

  const theme = useTheme();
  const isXl = useMediaQuery(theme.breakpoints.up("xl"));
  const isLg = useMediaQuery(theme.breakpoints.only("lg"));
  const isMd = useMediaQuery(theme.breakpoints.only("md"));
  const isSm = useMediaQuery(theme.breakpoints.only("sm"));

  const [titleFilter, setTitleFilter] = useState<string | null>(null);

  useEffect(() => {
    if (isXl) {
      setLimit(10);
    } else if (isLg) {
      setLimit(8);
    } else if (isMd) {
      setLimit(6);
    } else if (isSm) {
      setLimit(6);
    } else {
      setLimit(5);
    }
  }, [isXl, isLg, isMd, isSm]);

  // Lottie 애니메이션 순차 재생을 위한 useEffect
  useEffect(() => {
    const LOTTIE_EXISTING_DURATION = 10000; // 10초
    const LOTTIE_NEW_DURATION = 7000; // 7초

    let timerId: NodeJS.Timeout;

    if (activeLottie === "existing") {
      timerId = setTimeout(() => {
        setActiveLottie("new");
      }, LOTTIE_EXISTING_DURATION);
    } else {
      // activeLottie === 'new'
      timerId = setTimeout(() => {
        setActiveLottie("existing");
      }, LOTTIE_NEW_DURATION);
    }

    return () => clearTimeout(timerId); // 컴포넌트 언마운트 시 타이머 제거
  }, [activeLottie]);

  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true);
      try {
        const { quizzes, totalCount } = await getQuizzes({
          page,
          limit,
          gradeFilter: titleFilter ? null : gradeFilter,
          semesterFilter: titleFilter ? null : semesterFilter,
          subjectFilter: titleFilter ? null : subjectFilter,
          unitFilter: titleFilter ? null : unitFilter,
          titleFilter,
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
    limit,
    gradeFilter,
    semesterFilter,
    subjectFilter,
    unitFilter,
    titleFilter,
    sortBy,
    isMyQuizzes,
  ]);

  useEffect(() => {
    setPage(1);
  }, [gradeFilter, semesterFilter, subjectFilter, unitFilter, titleFilter]);

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

  const handleNavigate = (direction: "prev" | "next") => {
    quizContainerRef.current?.navigate(direction);
  };

  const handlePreview = () => {
    quizContainerRef.current?.openPreview();
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
      setActionBarState({
        currentSlideIndex: 1,
        totalQuestions: quizData.questions.length,
        isReviewSlide: false,
      });
    } catch (err) {
      setError("퀴즈 데이터를 가져오는 중 오류가 발생했습니다.");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedQuiz(null);
    setActionBarState(null);
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
    <Box sx={{ maxWidth: "xl", margin: "0 auto", padding: "2rem", mt: 2 }}>
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
          minHeight: "27vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
        }}
      >
        {activeLottie === "existing" && (
          <Box
            sx={{
              position: "absolute",
              top: "-38%",
              left: "calc(50% - 17vh)", // 중앙에서 왼쪽으로
              transform: "translateX(-50%)",
              width: {
                xs: "32vh",
                sm: "35vh",
                md: "38vh",
                lg: "40vh",
                xl: "43vh",
              },
              height: {
                xs: "32vh",
                sm: "35vh",
                md: "38vh",
                lg: "40vh",
                xl: "43vh",
              },
              pointerEvents: "none",
            }}
          >
            <DotLottieReact
              src="https://lottie.host/a62dc818-22b3-4e0d-97dc-decacfc0a71e/qdg21mWNev.lottie"
              loop
              autoplay
              style={{ width: "100%", height: "100%" }}
            />
          </Box>
        )}

        {activeLottie === "new" && (
          <Box
            sx={{
              position: "absolute",
              top: "-38%",
              left: "calc(50% + 17vh)", // 중앙에서 오른쪽으로
              transform: "translateX(-50%) scaleX(-1)", // 좌우 반전
              width: {
                xs: "28vh",
                sm: "30vh",
                md: "32vh",
                lg: "35vh",
                xl: "38vh",
              },
              height: {
                xs: "28vh",
                sm: "30vh",
                md: "32vh",
                lg: "35vh",
                xl: "38vh",
              },
              pointerEvents: "none",
            }}
          >
            <DotLottieReact
              src="https://lottie.host/b346ae84-f7df-4864-b978-155db9f1576f/uekDctlmz7.lottie"
              loop
              autoplay
              style={{ width: "100%", height: "100%" }}
            />
          </Box>
        )}

        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2, position: "relative", zIndex: 1 }}
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

        <Box sx={{ mt: "auto", position: "relative", zIndex: 1 }}>
          <QuizFilter
            gradeFilter={gradeFilter}
            setGradeFilter={setGradeFilter}
            semesterFilter={semesterFilter}
            setSemesterFilter={setSemesterFilter}
            subjectFilter={subjectFilter}
            setSubjectFilter={setSubjectFilter}
            unitFilter={unitFilter}
            setUnitFilter={setUnitFilter}
            titleFilter={titleFilter}
            setTitleFilter={setTitleFilter}
            units={units}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
        </Box>
      </Paper>

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
                <Grid item xs={12} sm={6} md={4} lg={3} xl={2.4} key={quiz._id}>
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
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            width: "80%",
            height: "90vh",
            display: "flex",
            flexDirection: "column",
            maxHeight: "900px",
          },
        }}
      >
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
        <DialogContent
          sx={{
            p: 0,
            overflow: "hidden",
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ flex: "1 1 auto", overflowY: "auto" }}>
            {selectedQuiz && (
              <QuizContainer
                ref={quizContainerRef}
                isReadOnly={true}
                initialData={selectedQuiz}
                onStateChange={setActionBarState}
              />
            )}
          </Box>
        </DialogContent>
        {isModalOpen && selectedQuiz && actionBarState && (
          <ActionBar
            variant="dialog"
            isReadOnly={true}
            canNavigateBack={actionBarState.currentSlideIndex > 1}
            canNavigateForward={
              !actionBarState.isReviewSlide &&
              actionBarState.totalQuestions > 0 &&
              actionBarState.currentSlideIndex <= actionBarState.totalQuestions
            }
            onNavigate={handleNavigate}
            onPreview={handlePreview}
            onEdit={handleEditQuiz}
            onStart={() => handleStartQuiz(selectedQuiz._id)}
          />
        )}
      </Dialog>
    </Box>
  );
};

export default ManageQuizzesPage;
