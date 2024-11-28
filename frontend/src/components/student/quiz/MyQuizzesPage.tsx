import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, Button, Tabs, Tab, Snackbar, Alert, TextField, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { PlayCircleFilled, History } from '@mui/icons-material';
import QuizComponent from './QuizComponent';
import QuizFilter from './QuizFilter';
import QuizResults from './QuizResults';
import { getUserId } from '../../../utils/auth';
import api from '../../../utils/api';
import { useNavigate } from 'react-router-dom'; // 페이지 이동을 위한 useNavigate 사용

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
  const [pendingQuiz, setPendingQuiz] = useState<Quiz | null>(null);
  const [selection, setSelection] = useState<Selection>({ grade: '', semester: '', subject: '', unit: '', topic: '' });
  const [error, setError] = useState<string | null>(null);
  const [isQuizModeLocal, setIsQuizModeLocal] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [pin, setPin] = useState<string>(''); // PIN 입력 상태 추가
  const studentId = getUserId();
  const navigate = useNavigate(); // 페이지 이동을 위한 useNavigate 훅

  // const fetchQuizResults = async () => {
  //   try {
  //     const response = await api.get('/quiz-results');
  //     setQuizResults(response.data);
  //     setFilteredResults(response.data);
  //   } catch (error: any) {
  //     console.error('Failed to fetch quiz results:', error);
  //     setError(error.response?.data?.message || '퀴즈 결과를 불러오는 데 실패했습니다.');
  //   }
  // };

  // useEffect(() => {
  //   fetchQuizResults();
  // }, []);

  // useEffect(() => {
  //   filterResults();
  // }, [selection]);

  // const filterResults = () => {
  //   setFilteredResults(
  //     quizResults.filter(result => 
  //       (!selection.semester || result.semester === selection.semester) &&
  //       (!selection.subject || result.subject === selection.subject) &&
  //       (!selection.unit || result.unit === selection.unit)
  //     )
  //   );
  // };

  const handleSelectionChange = (newSelection: Selection) => {
    console.log('Selection 변경:', newSelection);
    setSelection(newSelection);
  };

  const handleQuizResultClick = (quizResult: QuizResult) => {
    setSelectedQuiz(quizResult);
  };

  const handleCloseDetails = () => {
    setSelectedQuiz(null);
  };

  const handleQuizRequest = async () => {
    try {
      const response = await api.post('/kahoot-quiz/join-session', { pin }); // PIN으로 세션 참여 요청
      if (response.data) {
        const { sessionId } = response.data; // 서버로부터 sessionId를 받음
        // 세션이 정상적으로 시작되면 퀴즈 참여 페이지로 이동
        navigate(`/quiz-session`, { state: { pin, sessionId } });
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setError('세션을 찾을 수 없습니다.');
      } else {
        console.error('Failed to join quiz:', error);
        setError(error.response?.data?.message || '퀴즈 세션에 참여하는 데 실패했습니다.');
      }
      setSnackbarOpen(true);
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
      <Paper elevation={3} sx={{ padding: 4, borderRadius: '16px', boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)' }}>
        {!currentQuiz && (
          <>
            <Typography variant="h4" gutterBottom align="center" sx={{ fontWeight: 700, color: '#3f51b5' }}>
              Let's Quiz!
            </Typography>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              centered
              sx={{ mb: 2 }}
            >
              <Tab icon={<History />} label="퀴즈 결과" />
              <Tab icon={<PlayCircleFilled />} label="퀴즈 참여" />
            </Tabs>

            <Box sx={{ mt: 3 }}></Box>

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

            <Snackbar
              open={snackbarOpen}
              autoHideDuration={6000}
              onClose={() => setSnackbarOpen(false)}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
              <Alert onClose={() => setSnackbarOpen(false)} severity="warning" sx={{ width: '100%' }}>
                세션을 찾을 수 없거나 오류가 발생했습니다.
              </Alert>
            </Snackbar>

            {tabValue === 0 && (
              <>
                <QuizFilter 
                  selection={selection}
                  handleSelectionChange={handleSelectionChange}
                />
                <QuizResults 
                  // filteredResults={filteredResults}
                  // selectedQuiz={selectedQuiz}
                  // handleQuizResultClick={handleQuizResultClick}
                  studentId={studentId}
                  selectedSemester={selection.semester || 'All'} // 기본값을 'All'로 설정
                  selectedSubject={selection.subject || 'All'} // 기본값을 'All'로 설정
                  handleCloseDetails={handleCloseDetails}
                  isStudentView={true}  // 학생이 자신의 결과를 확인할 때 true로 설정
                />
              </>
            )}

            {/* 퀴즈 풀기 탭에서 PIN 입력 기능 추가 */}
            {tabValue === 1 && (
              <>
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                  <TextField
                    label="PIN 입력"
                    variant="outlined"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    fullWidth
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleQuizRequest} // 퀴즈 세션 참여 요청
                    startIcon={<PlayCircleFilled />}
                    sx={{
                      fontWeight: 600,
                      padding: '8px 24px',
                      borderRadius: '24px',
                      background: !pin 
                        ? 'linear-gradient(45deg, #cccccc 30%, #cccccc 90%)' // 비활성화 상태 표현
                        : 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                    }}
                    disabled={!pin} // PIN 입력이 없으면 버튼 비활성화
                  >
                    퀴즈 시작
                  </Button>
                </Box>
              </>
            )}
          </>
        )}

        {/* 퀴즈 컴포넌트만 표시 */}
        {currentQuiz && (
          <QuizComponent quiz={currentQuiz} onSubmit={() => {}} onAutoSubmit={() => {}} />
        )}

        {/* 퀴즈 시작 확인 Dialog */}
        <Dialog
          open={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
        >
          <DialogTitle>퀴즈 시작</DialogTitle>
          <DialogContent>
            <DialogContentText>
              퀴즈를 시작하시겠습니까? 퀴즈가 시작되면 중단할 수 없으며, 제출 후에는 다시 풀 수 없습니다.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
              취소
            </Button>
            <Button onClick={() => {}} color="secondary">
              시작
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default MyQuizzesPage;
