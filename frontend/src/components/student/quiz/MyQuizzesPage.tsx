import React, { useEffect, useState } from 'react';
import SubjectSelector from "../../../components/student/SubjectSelector";
import { Container, Typography, Paper, Box, Button, Tabs, Tab, Snackbar, Alert } from '@mui/material';
import QuizComponent from './QuizComponent';
import api from '../../../utils/api';
import QuizFilter from './QuizFilter';
import QuizResults from './QuizResults';
import { getUserId } from '../../../utils/auth';

interface Selection {
  grade: string;
  semester: string;
  subject: string;
  unit: string;
  topic: string;
}

type Task = {
  _id: string;
  taskText: string;
};

type Quiz = {
  _id: string;
  grade: string;
  semester: string;
  subject: string;
  unit: string;
  tasks: Task[];
};

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

interface MyQuizzesPageProps {
  setIsQuizMode: React.Dispatch<React.SetStateAction<boolean>>;
}

const MyQuizzesPage: React.FC<MyQuizzesPageProps> = ({ setIsQuizMode }) => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<QuizResult[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<QuizResult | null>(null);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [selection, setSelection] = useState<Selection>({ grade: '', semester: '', subject: '', unit: '', topic: '' });
  const [error, setError] = useState<string | null>(null);
  const [isQuizModeLocal, setIsQuizModeLocal] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    try {
      const response = await api.get('/quiz', { params: selection });
      if (response.data) {
        setCurrentQuiz(response.data);
        setError(null);
        setIsQuizMode(true); // 퀴즈 모드로 전환
        setIsQuizModeLocal(true);
      } else {
        setError('퀴즈를 불러올 수 없습니다.');
      }
    } catch (error: any) {
      if (error.response?.status === 400) {
        setError('이미 제출한 퀴즈입니다. 다시 풀 수 없습니다.');
      } else {
        console.error('Failed to start quiz:', error);
        setError(error.response?.data?.message || '퀴즈를 시작하는 데 실패했습니다.');
      }
    }
  };

  const handleQuizSubmit = async (answers: { [key: string]: string }) => {
    if (currentQuiz) {
      const quizData = {
        quizId: currentQuiz._id,
        studentId: getUserId(),
        subject: currentQuiz.subject,
        semester: currentQuiz.semester,
        unit: currentQuiz.unit,
        answers: currentQuiz.tasks.map((task) => ({
          questionId: task._id,
          studentAnswer: answers[task._id] !== undefined ? answers[task._id] : "", // 빈 문자열 또는 답변을 포함
        })),
      };
  
      try {
        const response = await api.post("/quiz/submit", quizData);
        setCurrentQuiz(null);
        setIsQuizMode(false); // 퀴즈 모드 종료
        setIsQuizModeLocal(false);
        fetchQuizResults();
        setTabValue(1); // 퀴즈 결과 조회 탭으로 전환
  
        // 성공 메시지를 설정
        setSuccessMessage(response.data.message);
      } catch (error: any) {
        console.error("Failed to submit quiz:", error);
        setError(error.response?.data?.message || "퀴즈 제출에 실패했습니다.");
      }
    }
  };

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    if (isQuizModeLocal) {
      alert("퀴즈 진행 중에는 탭을 변경할 수 없습니다. 퀴즈를 먼저 제출해주세요.");
      return;
    }
    setTabValue(newValue);
  };

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ padding: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Let's Quiz!
        </Typography>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="퀴즈 결과 조회" />
          <Tab label="퀴즈 풀기" />
        </Tabs>

        <Snackbar
          open={!!successMessage}
          autoHideDuration={2000}
          onClose={() => setSuccessMessage(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSuccessMessage(null)} severity="success" sx={{ width: '100%' }}>
            {successMessage}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>

        {tabValue === 0 && (
          <>
            <QuizFilter 
              selection={selection}
              handleSelectionChange={handleSelectionChange}
            />
            <QuizResults 
              filteredResults={filteredResults}
              selectedQuiz={selectedQuiz}
              handleQuizResultClick={handleQuizResultClick}
              handleCloseDetails={handleCloseDetails}
            />
          </>
        )}

        {tabValue === 1 && (
          <>
            <SubjectSelector 
              onSelectionChange={handleSelectionChange} 
              showTopic={false} 
            />
            <Box textAlign="center" sx={{ mt: 2 }}>
              <Button variant="contained" color="primary" onClick={handleQuizStart}>
                퀴즈 시작
              </Button>
            </Box>
            {currentQuiz && (
              <QuizComponent quiz={currentQuiz} onSubmit={handleQuizSubmit} />
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default MyQuizzesPage;
