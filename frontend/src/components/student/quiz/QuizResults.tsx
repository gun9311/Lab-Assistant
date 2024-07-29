import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box, Button, Collapse, CircularProgress } from '@mui/material';
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
    similarity: number;
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
}

const QuizResults: React.FC<QuizResultsProps> = ({
  studentId,
  filteredResults,
  selectedQuiz,
  selectedSemester,
  selectedSubject,
  handleQuizResultClick,
  handleCloseDetails
}) => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState<boolean>(false); // 추가된 상태: 퀴즈 내역이 전혀 없는 경우

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

  // 조건에 따라 결과 목록 설정
  const results = studentId ? quizResults : filteredResults || [];

  const filteredQuizResults = results.filter(result => 
    (selectedSemester === 'All' || result.semester === selectedSemester) &&
    (selectedSubject === 'All' || result.subject === selectedSubject)
  );

  if (studentId && loading) {
    return <CircularProgress />;
  }

  if (studentId && error) {
    return <Typography>Error: {error}</Typography>;
  }

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
                <TableCell>학기</TableCell>
                <TableCell>과목</TableCell>
                <TableCell>단원</TableCell>
                <TableCell>점수</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredQuizResults.map(result => (
                <TableRow key={result._id} onClick={() => handleQuizResultClick && handleQuizResultClick(result)}>
                  <TableCell>{new Date(result.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{result.semester}</TableCell>
                  <TableCell>{result.subject}</TableCell>
                  <TableCell>{result.unit}</TableCell>
                  <TableCell>{result.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {selectedQuiz && (
        <Collapse in={Boolean(selectedQuiz)}>
          <Paper elevation={3} sx={{ padding: 4, mt: 2 }}>
            <Typography variant="h5" gutterBottom>
              퀴즈 결과
            </Typography>
            <Typography variant="body1">
              과목: {selectedQuiz.subject}
            </Typography>
            <Typography variant="body1">
              단원: {selectedQuiz.unit}
            </Typography>
            <Typography variant="body1">
              점수: {selectedQuiz.score}
            </Typography>
            <TableContainer component={Paper} sx={{ mt: 2 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>문제</TableCell>
                    <TableCell>학생 답변</TableCell>
                    <TableCell>정답</TableCell>
                    <TableCell>유사도</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedQuiz.results.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{result.taskText || '문제를 찾을 수 없음'}</TableCell>
                      <TableCell>{result.studentAnswer}</TableCell>
                      <TableCell>{result.correctAnswer}</TableCell>
                      <TableCell>{result.similarity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box textAlign="center" sx={{ mt: 2 }}>
              <Button variant="contained" color="primary" onClick={handleCloseDetails}>
                닫기
              </Button>
            </Box>
          </Paper>
        </Collapse>
      )}
    </>
  );
};

export default QuizResults;
