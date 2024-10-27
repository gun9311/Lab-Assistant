import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Grid,
  CircularProgress,
  Snackbar,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getQuizzes, deleteQuiz, getUnits } from "../../../utils/quizApi";
import QuizCard from "./components/QuizCard";
import QuizFilter from "./components/QuizFilter";
import api from "../../../utils/api";

type Quiz = {
  _id: string;
  title: string;
  unit: string;
  questionsCount: number;
  likeCount: number;
  grade: number; // 학년 필드
  semester: string; // 학기 필드
  subject: string; // 과목 필드
  imageUrl?: string; // 퀴즈 이미지 필드 (옵션)
  userLiked: boolean; // 백엔드에서 받아온 사용자 좋아요 여부
  createdBy: string;  // 퀴즈 작성자의 ID
  createdAt: string;  // 퀴즈 생성 시간
};

const ManageQuizzesPage: React.FC = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // 로딩 상태
  const [error, setError] = useState<string | null>(null); // 에러 상태
  const [sortBy, setSortBy] = useState<string>("latest"); // 기본 정렬 기준: 최신 순
  const [isTeamMode, setIsTeamMode] = useState<boolean>(false); // 팀 모드 상태
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [unitFilter, setUnitFilter] = useState<string | null>(null); // 단원 필터
  const [units, setUnits] = useState<string[]>([]); // 단원 목록

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

  // 정렬 함수
  const getSortedQuizzes = () => {
    if (sortBy === "likes") {
      return [...filteredQuizzes].sort((a, b) => b.likeCount - a.likeCount);  // 좋아요 순
    } else {
      return [...filteredQuizzes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());  // 최신 순 (기본)
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
        isTeamMode, // 팀 모드 여부 전달
      });
      const { pin, sessionId } = response.data;
      navigate(`/start-quiz-session`, { state: { pin, sessionId } });
    } catch (error) {
      setError("퀴즈 세션을 시작하는 중 오류가 발생했습니다.");
    }
  };

  const sortedQuizzes = getSortedQuizzes();

  return (
    <Box sx={{ padding: "2rem" }}>
      <Paper elevation={3} sx={{ padding: "2rem", marginBottom: "2rem", borderRadius: '16px', backgroundColor: '#f9f9f9' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
          퀴즈 관리
        </Typography>

        <Button
          variant="contained"
          color="primary"
          sx={{ marginBottom: "2rem", borderRadius: "8px", backgroundColor: '#6200EA', fontWeight: 'bold', fontSize: '1rem' }}
          onClick={() => navigate("/create-quiz")}
        >
          퀴즈 만들기
        </Button>

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
        />

        {/* 정렬 기준 선택 */}
        <FormControl sx={{ marginBottom: "2rem", minWidth: 200 }}>
          <InputLabel>정렬 기준</InputLabel>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <MenuItem value="latest">최신 순</MenuItem>
            <MenuItem value="likes">좋아요 순</MenuItem>
          </Select>
        </FormControl>
      </Paper>

      <Paper elevation={3} sx={{ padding: "2rem", borderRadius: '16px', backgroundColor: '#f9f9f9' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="50vh">
            <CircularProgress sx={{ color: '#6200EA' }} />
          </Box>
        ) : (
          <Grid container spacing={4}>
            {sortedQuizzes.length === 0 ? (
              <Grid item xs={12}>
                <Typography variant="h6" align="center" sx={{ fontWeight: 'bold', color: '#ff5252' }}>
                  필터 조건에 맞는 퀴즈가 없습니다.
                </Typography>
              </Grid>
            ) : (
              sortedQuizzes.map((quiz) => (
                <Grid item xs={12} sm={6} md={4} key={quiz._id}>
                  <QuizCard
                    quiz={quiz}
                    onDelete={handleDelete}
                    onStartQuiz={handleStartQuiz}
                  />
                </Grid>
              ))
            )}
          </Grid>
        )}
      </Paper>

      {error && (
        <Snackbar
          open={true}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          message={error}
          sx={{ backgroundColor: "#ff5252", color: "white" }}
        />
      )}
    </Box>
  );
};

export default ManageQuizzesPage;
