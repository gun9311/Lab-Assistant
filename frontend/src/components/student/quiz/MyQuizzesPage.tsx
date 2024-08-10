import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, Alert, Button, Tabs, Tab, Fade } from '@mui/material';
import { Quiz as QuizIcon, History as HistoryIcon } from '@mui/icons-material';
import SubjectSelector from "../../../components/student/SubjectSelector";
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
  const [tabValue, setTabValue] = useState<number>(0);

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

  const handleQuizStart = () => {
    setIsQuizMode(true);
    setTabValue(1); // 퀴즈 풀기 탭으로 전환
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
    setTabValue(0); // 퀴즈 결과 조회 탭으로 전환
  };

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ padding: 4, borderRadius: 4 }}>
        <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 'bold', mb: 4 }}>
          Let's Quiz!
        </Typography>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
          sx={{
            marginBottom: 4,
            '.MuiTabs-flexContainer': {
              borderBottom: '1px solid #ddd',
            },
            '.MuiTab-root': {
              fontWeight: 'bold',
              fontSize: '1rem',
              textTransform: 'none',
            },
            '.Mui-selected': {
              color: '#1976d2',
            },
            '.MuiTabs-indicator': {
              backgroundColor: '#1976d2',
            },
          }}
        >
          <Tab icon={<HistoryIcon />} label="퀴즈 결과 조회" />
          <Tab icon={<QuizIcon />} label="퀴즈 풀기" />
        </Tabs>

        <Fade in={tabValue === 0}>
          <Box>
            {tabValue === 0 && (
              <>
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
              </>
            )}
          </Box>
        </Fade>

        <Fade in={tabValue === 1}>
          <Box>
            {tabValue === 1 && (
              <>
                <Box sx={{ mb: 4 }}>
                  <SubjectSelector 
                    onSelectionChange={handleSelectionChange} 
                    showTopic={false} 
                  />
                </Box>
                <Box textAlign="center" sx={{ mt: 2 }}>
                  <Button variant="contained" color="primary" onClick={handleQuizLoad} sx={{ paddingX: 4, paddingY: 1.5, fontSize: '1rem', borderRadius: 2 }}>
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
              </>
            )}
          </Box>
        </Fade>
      </Paper>
    </Container>
  );
};

export default MyQuizzesPage;
