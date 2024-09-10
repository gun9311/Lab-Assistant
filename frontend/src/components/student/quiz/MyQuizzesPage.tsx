import React, { useEffect, useState } from 'react';
import SubjectSelector from "../../../components/student/SubjectSelector";
import { Container, Typography, Paper, Box, Button, Tabs, Tab, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import QuizComponent from './QuizComponent';
import QuizFilter from './QuizFilter';
import QuizResults from './QuizResults';
import { getUserId } from '../../../utils/auth';
import api from '../../../utils/api';
import { PlayCircleFilled, History } from '@mui/icons-material';

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
  const [pendingQuiz, setPendingQuiz] = useState<Quiz | null>(null); // Pending 상태의 퀴즈
  const [selection, setSelection] = useState<Selection>({ grade: '', semester: '', subject: '', unit: '', topic: '' });
  const [error, setError] = useState<string | null>(null);
  const [isQuizModeLocal, setIsQuizModeLocal] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);

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

  const handleQuizRequest = async () => {
    if (!selection.semester || !selection.subject || !selection.unit) {
      alert("학기, 과목, 단원을 모두 선택해야 퀴즈를 시작할 수 있습니다.");
      return;
    }

    try {
      const response = await api.get('/quiz', { params: selection });
      if (response.data) {
        setPendingQuiz(response.data); // 퀴즈가 로드되면 pending 상태로 설정
        setError(null);
        setConfirmDialogOpen(true); // 퀴즈가 정상적으로 로드되면 확인창 띄우기
      } 
    } catch (error: any) {
      if (error.response?.status === 404) {
        setError('퀴즈를 찾을 수 없습니다.');
      } else if (error.response?.status === 400) {
        setError('이미 제출한 퀴즈입니다. 다시 풀 수 없습니다.');
      } else {
        console.error('Failed to start quiz:', error);
        setError(error.response?.data?.message || '퀴즈를 시작하는 데 실패했습니다.');
      }
    }
  };

  const handleQuizStart = () => {
    setCurrentQuiz(pendingQuiz); // "시작" 버튼을 누르면 currentQuiz를 설정
    setPendingQuiz(null); // pending 상태 초기화
    setIsQuizMode(true);
    setIsQuizModeLocal(true);
    setConfirmDialogOpen(false); // 퀴즈 시작 시 대화 상자 닫기
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

  const handleQuizAutoSubmit = () => {
    // 자동 제출 시 호출되는 핸들러
    setSnackbarOpen(true); // Snackbar 열기
    setTimeout(() => setSnackbarOpen(false), 6000); // Snackbar 6초 후 닫기
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
              <Tab icon={<History />} label="퀴즈 결과 조회" />
              <Tab icon={<PlayCircleFilled />} label="퀴즈 풀기" />
            </Tabs>

            {/* Tabs와 필터 사이에 여백 추가 */}
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
                제한 시간이 종료되었거나, 페이지 이탈로 인해 퀴즈가 자동 제출되었습니다.
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
                  isStudentView={true}  // 학생이 자신의 결과를 확인할 때 true로 설정
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
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleQuizRequest} // 퀴즈 요청 함수로 변경
                    startIcon={<PlayCircleFilled />}
                    sx={{
                      fontWeight: 600,
                      padding: '8px 24px',
                      borderRadius: '24px',
                      background: (!selection.semester || !selection.subject || !selection.unit) 
                        ? 'linear-gradient(45deg, #cccccc 30%, #cccccc 90%)' // 회색으로 비활성화 상태 표현
                        : 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
                    }}
                    disabled={!selection.semester || !selection.subject || !selection.unit} // 조건에 따른 비활성화
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
          <QuizComponent quiz={currentQuiz} onSubmit={handleQuizSubmit} onAutoSubmit={handleQuizAutoSubmit} />
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
            <Button onClick={handleQuizStart} color="secondary">
              시작
            </Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Container>
  );
};

export default MyQuizzesPage;
