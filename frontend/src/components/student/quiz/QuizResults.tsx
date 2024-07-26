import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Box, Button, Collapse } from '@mui/material';

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
  filteredResults: QuizResult[];
  selectedQuiz: QuizResult | null;
  handleQuizResultClick: (quizResult: QuizResult) => void;
  handleCloseDetails: () => void;
}

const QuizResults: React.FC<QuizResultsProps> = ({ filteredResults, selectedQuiz, handleQuizResultClick, handleCloseDetails }) => {
  return (
    <>
      {filteredResults.length === 0 ? (
        <Box textAlign="center" sx={{ mt: 2 }}>
          <Typography variant="h6">퀴즈 내역이 없습니다.</Typography>
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
              {filteredResults.map(result => (
                <TableRow key={result._id} onClick={() => handleQuizResultClick(result)}>
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
