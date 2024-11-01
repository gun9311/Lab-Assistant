// ManageQuizzesPage.tsx
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
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getQuizzes, deleteQuiz, getUnits } from "../../../utils/quizApi";
import QuizCard from "./components/QuizCard";
import QuizFilter from "./components/QuizFilter";
import api from "../../../utils/api";
import logo from '../../../../src/assets/quiz_pie-logo2.png';
import background from '../../../../src/assets/background-logo.webp'; // 배경 이미지 경로 추가

type Quiz = {
  _id: string;
  title: string;
  unit: string;
  questionsCount: number;
  likeCount: number;
  grade: number;
  semester: string;
  subject: string;
  imageUrl?: string;
  userLiked: boolean;
  createdBy: string;
  createdAt: string;
};

const ManageQuizzesPage: React.FC = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("latest");
  const [isTeamMode, setIsTeamMode] = useState<boolean>(false);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [unitFilter, setUnitFilter] = useState<string | null>(null);
  const [units, setUnits] = useState<string[]>([]);

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
    } catch (err) {
      setError("퀴즈를 삭제하는 중 오류가 발생했습니다.");
    }
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
          paddingBottom: "0", // 하단 패딩을 줄임
          marginBottom: "2rem",
          borderRadius: "16px",
          backgroundColor: "#f7f7f7",
          backgroundImage: `url(${background})`, // 배경 이미지 유지
          backgroundSize: "cover",
          backgroundPosition: "center",
          position: "relative",
          minHeight: "350px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between", // 상단과 하단에 컨텐츠 배치
        }}
      >
        {/* 퀴즈 생성 버튼을 페이퍼 우측 상단에 배치 */}
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

        {/* QuizFilter를 페이퍼의 하단에 더 가까이 위치시킴 */}
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
                  <QuizCard quiz={quiz} onDelete={handleDelete} onStartQuiz={handleStartQuiz} />
                </Grid>
              ))
            )}
          </Grid>
        )}
      </Paper>
    </Box>
  );
};

export default ManageQuizzesPage;
