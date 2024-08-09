import React, { useEffect, useState } from 'react';
import SubjectSelector from "../../../components/student/SubjectSelector";
import { Container, Typography, Paper, Box, Alert, Button } from '@mui/material';
import QuizComponent from './QuizComponent';
import api from '../../../utils/api';
import QuizFilter from './QuizFilter';
import QuizResults from './QuizResults';

interface Selection {
  grade: string;
  semester: string;
  subject: string;
  unit: string;
  topic: string;
}

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

const MyQuizzesPage: React.FC = () => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<QuizResult[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizResult | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [selection, setSelection] = useState<Selection>({ grade: '', semester: '', subject: '', unit: '', topic: '' });
  const [error, setError] = useState<string | null>(null);
  const [isQuizMode, setIsQuizMode] = useState<boolean>(false);

  const fetchQuizResults = async () => {
    try {
      const response = await api.get('/quiz-results');
      setQuizResults(response.data);
      setFilteredResults(response.data);
    } catch (error: any) {
      console.error('Failed to fetch quiz results:', error);
      setError(error.response?.data?.message || '퀴즈 결과를 불러오는 데 실패했습니다.');
    }
  };

  useEffect(() => {
    fetchQuizResults();
  }, []);

  useEffect(() => {
    filterResults();
  }, [selection]);

  const filterResults = () => {
    setFilteredResults(
      quizResults.filter(result => 
        (!selection.semester || result.semester === selection.semester) &&
        (!selection.subject || result.subject === selection.subject) &&
        (!selection.unit || result.unit === selection.unit)
      )
    );
  };

  const handleSelectionChange = (newSelection: Selection) => {
    setSelection(newSelection);
  };

  const handleQuizResultClick = (quizResult: QuizResult) => {
    setSelectedQuiz(quizResult);
  };

  const handleCloseDetails = () => {
    setSelectedQuiz(null);
  };

  const handleQuizStart = async () => {
    setIsQuizMode(true);
  };

  const handleQuizLoad = async () => {
    try {
      const response = await api.get('/quiz', { params: selection });
      setCurrentQuiz(response.data);
      setError(null);
    } catch (error: any) {
      console.error('Failed to start quiz:', error);
      setError(error.response?.data?.message || '퀴즈를 시작하는 데 실패했습니다.');
    }
  };

  const handleQuizSubmit = () => {
    setCurrentQuiz(null);
    setIsQuizMode(false);
    fetchQuizResults();
  };

  if (isQuizMode) {
    return (
      <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ padding: 4 }}>
          <Typography variant="h4" gutterBottom align="center">
            퀴즈 풀기
          </Typography>
          <SubjectSelector 
            onSelectionChange={handleSelectionChange} 
            showTopic={false} 
          />
          <Box textAlign="center" sx={{ mt: 2 }}>
            <Button variant="contained" color="primary" onClick={handleQuizLoad}>
              퀴즈 시작
            </Button>
          </Box>
          {error && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="error">{error}</Alert>
            </Box>
          )}
          {currentQuiz && (
            <QuizComponent quiz={currentQuiz} onSubmit={handleQuizSubmit} />
          )}
        </Paper>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ padding: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Let's Quiz!
        </Typography>
        <QuizFilter 
          selection={selection}
          handleSelectionChange={handleSelectionChange}
          handleQuizStart={handleQuizStart}
        />
        {error && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
        <QuizResults 
          filteredResults={filteredResults}
          selectedQuiz={selectedQuiz}
          handleQuizResultClick={handleQuizResultClick}
          handleCloseDetails={handleCloseDetails}
        />
      </Paper>
    </Container>
  );
};

export default MyQuizzesPage;
