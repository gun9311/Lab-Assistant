import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import podiumImage from '../../../../assets/podium3.png';
import TopRankers from './TopRankers';
import BottomRankers from './BottomRankers';
import WaitingPlayers from './WaitingPlayers'; // 대기 화면 컴포넌트 추가

type Student = {
  id: string;
  name: string;
  isReady: boolean;
  character: string;
  hasSubmitted?: boolean;
  isCorrect?: boolean;
  rank?: number;
  prevRank?: number;
};

interface StudentListComponentProps {
  students: Student[];
  allStudentsReady: boolean;
  handleStartQuiz: () => void;
  quizStarted: boolean;
  isShowingFeedback: boolean;
  isLastQuestion: boolean;
  handleNextQuestion: () => void;
  handleEndQuiz: () => void;
  handleViewResults: () => void;
}

const StudentListComponent: React.FC<StudentListComponentProps> = ({
  students,
  allStudentsReady,
  handleStartQuiz,
  quizStarted,
  isShowingFeedback,
  isLastQuestion,
  handleNextQuestion,
  handleEndQuiz,
  handleViewResults,
}) => {
  const sortedStudents = [...students].sort(
    (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity)
  );
  const topRankers = sortedStudents.slice(0, 3);
  const bottomRankers = sortedStudents.slice(3);

  return (
    <Box sx={{ textAlign: 'center', maxWidth: '100%' }}>
      {!quizStarted && (
        <>
          <Typography
            variant="h5"
            sx={{ marginBottom: '1rem', fontWeight: 'bold' }}
          >
            플레이어 대기 중
          </Typography>
          <WaitingPlayers students={students} /> {/* 대기 화면에 학생 목록 추가 */}
          {allStudentsReady ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleStartQuiz}
              sx={{ marginTop: '2rem' }}
            >
              퀴즈 시작
            </Button>
          ) : (
            <Box
              sx={{
                marginTop: '2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography
                variant="h6"
                color="error"
                sx={{ fontWeight: 'bold' }}
              >
                모든 플레이어가 준비되지 않았습니다.
              </Typography>
            </Box>
          )}
        </>
      )}

      {quizStarted && isShowingFeedback && (
        <Box sx={{ textAlign: 'center', maxWidth: '100%', padding: '2rem' }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: '800px',
              margin: '0 auto',
              marginTop: { xs: '5vh', md: '10vh' },
            }}
          >
            <img
              src={podiumImage}
              alt="Podium"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
            <TopRankers topRankers={topRankers} />
          </Box>
          <BottomRankers bottomRankers={bottomRankers} />
          <Box
            sx={{
              marginTop: '2rem',
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
            }}
          >
            {!isLastQuestion && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleNextQuestion}
              >
                다음 문제
              </Button>
            )}
            {isLastQuestion && (
              <>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleEndQuiz}
                >
                  퀴즈 종료
                </Button>
                <Button variant="outlined" onClick={handleViewResults}>
                  결과 자세히 보기
                </Button>
              </>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default StudentListComponent;
