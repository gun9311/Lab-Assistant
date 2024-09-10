import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box, IconButton, Collapse, CircularProgress, useMediaQuery, useTheme } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import api from '../../../utils/api';

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
    similarity: number; // 문제당 개별 점수
  }[];
}

interface QuizResultsProps {
  studentId?: number;
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
  isStudentView = false  // 기본값은 false로 설정
}) => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState<boolean>(false);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 학생일 경우 점수를 평가 문구 및 이모티콘으로 변환하는 함수
  const getEvaluation = (score: number) => {
    if (score >= 80) {
      return { text: '훌륭해요', emoji: '🏆' };
    } else if (score >= 60) {
      return { text: '잘했어요', emoji: '👍' };
    } else {
      return { text: '노력해요', emoji: '💪' };
    }
  };

  useEffect(() => {
    const fetchQuizResults = async () => {
      if (studentId) {
        setLoading(true);
        try {
          const response = await api.get(`/quiz-results/${studentId}`);
          setQuizResults(response.data);
          setNoData(response.data.length === 0);
        } catch (err) {
          setError('퀴즈 결과를 가져오는 중 오류가 발생했습니다.');
          setNoData(true);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchQuizResults();
  }, [studentId]);

  const results = studentId ? quizResults : filteredResults || [];

  const filteredQuizResults = (selectedSemester && selectedSubject)
    ? results.filter(result => 
        (selectedSemester === 'All' || result.semester === selectedSemester) &&
        (selectedSubject === 'All' || result.subject === selectedSubject)
      )
    : results;

  if (studentId && loading) {
    return <CircularProgress />;
  }

  if (studentId && error) {
    return <Typography>Error: {error}</Typography>;
  }

  const toggleQuizDetails = (quizId: string) => {
    setExpandedQuizId(prev => (prev === quizId ? null : quizId));
  };

  return (
    <>
      {noData ? (
        <Box textAlign="center" sx={{ mt: 2 }}>
          <Typography>퀴즈 내역이 없습니다.</Typography>
        </Box>
      ) : filteredQuizResults.length === 0 ? (
        <Box textAlign="center" sx={{ mt: 2 }}>
          <Typography>선택한 학기 또는 과목에 대한 퀴즈 내역이 없습니다.</Typography>
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
                <TableCell>총점</TableCell>
                <TableCell align="center">상세보기</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredQuizResults.map(result => (
                <React.Fragment key={result._id}>
                  <TableRow sx={{ cursor: 'pointer' }}>
                    <TableCell>{new Date(result.createdAt).toLocaleDateString()}</TableCell>
                    {!isMobile && <TableCell>{result.semester}</TableCell>}
                    <TableCell>{result.subject}</TableCell>
                    {!isMobile && <TableCell>{result.unit}</TableCell>}
                    
                    {/* 학생이 자신의 결과를 볼 때는 이모티콘과 문구로 표시 */}
                    <TableCell>
                      {isStudentView
                        ? `${getEvaluation(result.score).text} ${getEvaluation(result.score).emoji}`
                        : result.score} {/* 교사는 점수를 그대로 숫자로 표시 */}
                    </TableCell>

                    <TableCell align="center">
                      <IconButton 
                        onClick={() => toggleQuizDetails(result._id)}
                        color="primary"
                        aria-label="view details"
                      >
                        {expandedQuizId === result._id ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={isMobile ? 5 : 6} sx={{ padding: 0, borderBottom: 'none' }}>
                      <Collapse in={expandedQuizId === result._id} timeout="auto" unmountOnExit>
                        <Box sx={{ padding: 2 }}>
                          <Typography variant="h6" gutterBottom>
                            퀴즈 상세 내용
                          </Typography>
                          <Typography variant="body1">과목: {result.subject}</Typography>
                          <Typography variant="body1">단원: {result.unit}</Typography>
                          <Typography variant="body1">총점: {isStudentView ? `${getEvaluation(result.score).text} ${getEvaluation(result.score).emoji}` : result.score}</Typography>
                          <TableContainer component={Paper} sx={{ mt: 2 }}>
                            <Table>
                              <TableHead>
                                <TableRow>
                                  <TableCell>문제</TableCell>
                                  <TableCell>내 답변</TableCell>
                                  <TableCell>정답</TableCell>
                                  <TableCell>점수</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {result.results.map((detail, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{detail.taskText || '문제를 찾을 수 없음'}</TableCell>
                                    <TableCell>{detail.studentAnswer}</TableCell>
                                    <TableCell>{detail.correctAnswer}</TableCell>
                                    {/* 문제당 점수를 이모티콘과 문구로 표시 */}
                                    <TableCell>
                                      {isStudentView
                                        ? `${getEvaluation(detail.similarity).text} ${getEvaluation(detail.similarity).emoji}`
                                        : detail.similarity} {/* 교사는 점수를 숫자로 표시 */}
                                    </TableCell>
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
