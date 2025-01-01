import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  IconButton,
  Collapse,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import api from "../../../utils/api";

// interface QuizResult {
//   _id: string;
//   subject: string;
//   semester: string;
//   unit: string;
//   score: number;
//   createdAt: string;
//   results: {
//     questionId: string;
//     taskText: string;
//     studentAnswer: string;
//     correctAnswer: string;
//     similarity: number; // 문제당 개별 점수
//   }[];
// }

interface QuizResult {
  _id: string;
  quizId: string; // 퀴즈 ID 추가
  subject: string;
  semester: string;
  unit: string;
  score: number;
  createdAt: string;
}

interface QuizDetail {
  questionText: string;
  correctAnswer: string;
  studentAnswer: string;
  isCorrect: boolean;
}

interface QuizResultsProps {
  studentId?: number | string | null;
  filteredResults?: QuizResult[];
  selectedQuiz?: QuizResult | null;
  selectedSemester?: string;
  selectedSubject?: string;
  handleQuizResultClick?: (quizResult: QuizResult) => void;
  handleCloseDetails?: () => void;
  isStudentView?: boolean; // 학생이 자신의 결과를 보는지 여부를 구분하기 위한 prop 추가
}

const QuizResults: React.FC<QuizResultsProps> = ({
  studentId,
  filteredResults,
  selectedQuiz,
  selectedSemester,
  selectedSubject,
  handleQuizResultClick,
  handleCloseDetails,
  isStudentView = false, // 기본값은 false로 설정
}) => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState<boolean>(false);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const [quizDetails, setQuizDetails] = useState<QuizDetail[]>([]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // 학생일 경우 점수를 평가 문구 및 이모티콘으로 변환하는 함수
  const getEvaluation = (score: number) => {
    if (score >= 75) {
      return { text: "훌륭해요", emoji: "🏆" };
    } else if (score >= 55) {
      return { text: "잘했어요", emoji: "👍" };
    } else {
      return { text: "노력해요", emoji: "💪" };
    }
  };

  // 교사일 경우 단원별 총평을 상/중/하로 변환하는 함수
  const getTeacherUnitEvaluation = (score: number) => {
    if (score >= 75) {
      return "상 🟢";
    } else if (score >= 55) {
      return "중 🟡";
    } else {
      return "하 🔴";
    }
  };

  useEffect(() => {
    const fetchQuizResults = async () => {
      // console.log(studentId);
      if (studentId) {
        setLoading(true);
        try {
          const response = await api.get(`/quiz-results/${studentId}`);
          // console.log('API 호출 성공:', response.data);
          setQuizResults(response.data);
          setNoData(response.data.length === 0);
        } catch (err) {
          console.error("API 호출 실패:", err);
          setError("퀴즈 결과를 가져오는 중 오류가 발생했습니다.");
          setNoData(true);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchQuizResults();
    // console.log('퀴즈결과 호출');
  }, [studentId]);

  const results = studentId ? quizResults : filteredResults || [];

  const filteredQuizResults =
    selectedSemester && selectedSubject
      ? results.filter(
          (result) =>
            (selectedSemester === "All" ||
              result.semester === selectedSemester) &&
            (selectedSubject === "All" || result.subject === selectedSubject)
        )
      : results;

  if (studentId && loading) {
    return <CircularProgress />;
  }

  if (studentId && error) {
    return <Typography>Error: {error}</Typography>;
  }

  const fetchQuizDetails = async (quizId: string) => {
    try {
      const response = await api.get(
        `/quiz-results/details/${quizId}/${studentId}`
      );
      setQuizDetails(response.data);
    } catch (err) {
      console.error("Failed to fetch quiz details:", err);
    }
  };

  // const toggleQuizDetails = (quizId: string) => {
  // setExpandedQuizId(prev => (prev === quizId ? null : quizId));
  // };

  const toggleQuizDetails = (quizId: string) => {
    if (expandedQuizId === quizId) {
      setExpandedQuizId(null);
    } else {
      setExpandedQuizId(quizId);
      fetchQuizDetails(quizId);
    }
  };

  return (
    <>
      {noData ? (
        <Box textAlign="center" sx={{ mt: 2 }}>
          <Typography>퀴즈 내역이 없습니다.</Typography>
        </Box>
      ) : filteredQuizResults.length === 0 ? (
        <Box textAlign="center" sx={{ mt: 2 }}>
          <Typography>
            선택한 학기 또는 과목에 대한 퀴즈 내역이 없습니다.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>날짜</TableCell>
                {!isMobile && <TableCell>학기</TableCell>}
                <TableCell>과목</TableCell>
                {!isMobile && <TableCell>단원</TableCell>}
                <TableCell>점수</TableCell>
                <TableCell align="center">상세보기</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredQuizResults.map((result) => (
                <React.Fragment key={result._id}>
                  <TableRow sx={{ cursor: "pointer" }}>
                    <TableCell>
                      {new Date(result.createdAt).toLocaleDateString()}
                    </TableCell>
                    {!isMobile && <TableCell>{result.semester}</TableCell>}
                    <TableCell>{result.subject}</TableCell>
                    {!isMobile && <TableCell>{result.unit}</TableCell>}

                    <TableCell>{Math.round(result.score)}</TableCell>

                    <TableCell align="center">
                      <IconButton
                        onClick={() => toggleQuizDetails(result.quizId)}
                        color="primary"
                        aria-label="view details"
                      >
                        {expandedQuizId === result.quizId ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      colSpan={isMobile ? 5 : 6}
                      sx={{ padding: 0, borderBottom: "none" }}
                    >
                      <Collapse
                        in={expandedQuizId === result.quizId}
                        timeout="auto"
                        unmountOnExit
                      >
                        <Box sx={{ padding: 2 }}>
                          <Typography variant="h6" gutterBottom>
                            퀴즈 상세 내용
                          </Typography>
                          <Typography variant="body1">
                            과목: {result.subject}
                          </Typography>
                          <Typography variant="body1">
                            단원: {result.unit}
                          </Typography>
                          <Typography variant="body1">
                            점수: {Math.round(result.score)}
                          </Typography>

                          <TableContainer component={Paper} sx={{ mt: 2 }}>
                            <Table>
                              <TableHead>
                                <TableRow>
                                  <TableCell>문제</TableCell>
                                  <TableCell>정답</TableCell>
                                  <TableCell>내 답변</TableCell>
                                  {!isStudentView && (
                                    <TableCell>정답 여부</TableCell>
                                  )}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {quizDetails.map((detail, index) => (
                                  <TableRow key={index}>
                                    <TableCell>
                                      {detail.questionText ||
                                        "문제를 찾을 수 없음"}
                                    </TableCell>
                                    <TableCell>
                                      {detail.correctAnswer}
                                    </TableCell>
                                    <TableCell>
                                      {detail.studentAnswer}
                                    </TableCell>
                                    {!isStudentView && (
                                      <TableCell>
                                        {detail.isCorrect ? "정답" : "오답"}
                                      </TableCell>
                                    )}
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};

export default QuizResults;
