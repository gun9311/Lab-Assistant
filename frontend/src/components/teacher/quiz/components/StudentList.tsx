import React from 'react';
import { Box, Typography, Chip, Button } from '@mui/material';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { useTheme } from '@mui/material/styles';

type Student = {
  id: string;
  name: string;
  isReady: boolean;
  character: string;
  hasSubmitted?: boolean;
  isCorrect?: boolean;
  rank?: number; // 순위 정보 추가
};

type Feedback = {
  studentId: string;
  name: string;
  score: number;
  isCorrect: boolean;
  rank: number;
};

interface StudentListComponentProps {
  students: Student[];
  feedbacks: Feedback[];
  allStudentsReady: boolean;
  handleStartQuiz: () => void;
  quizStarted: boolean;
  isShowingFeedback: boolean;
  isLastQuestion: boolean;
  rankMoveEnabled: boolean;  // 순위 이동 활성화 여부 추가
  handleNextQuestion: () => void;  // 다음 문제 핸들러
  handleEndQuiz: () => void;       // 퀴즈 종료 핸들러
  handleViewResults: () => void;   // 결과 자세히 보기 핸들러
}

const StudentListComponent: React.FC<StudentListComponentProps> = ({
  students,
  feedbacks,
  allStudentsReady,
  handleStartQuiz,
  quizStarted,
  isShowingFeedback,
  isLastQuestion,
  rankMoveEnabled,
  handleNextQuestion,  // 핸들러 추가
  handleEndQuiz,
  handleViewResults,
}) => {
  const theme = useTheme();

  // 순위에 따른 스타일 변화 (순위권 학생 이동)
  const getStudentRankStyle = (rank: number | undefined) => {
    if (rankMoveEnabled && rank !== undefined && rank <= 3) {
      switch (rank) {
        case 1:
          return {
            backgroundColor: 'gold',
            transform: 'scale(1.2)', // 1등 캐릭터 확대
            boxShadow: '0px 4px 10px rgba(255, 215, 0, 0.7)',
            transition: 'transform 0.5s ease, box-shadow 0.5s ease',
          };
        case 2:
          return {
            backgroundColor: 'silver',
            transform: 'scale(1.15)', // 2등 캐릭터 확대
            boxShadow: '0px 4px 10px rgba(192, 192, 192, 0.7)',
            transition: 'transform 0.5s ease, box-shadow 0.5s ease',
          };
        case 3:
          return {
            backgroundColor: 'bronze',
            transform: 'scale(1.1)', // 3등 캐릭터 확대
            boxShadow: '0px 4px 10px rgba(205, 127, 50, 0.7)',
            transition: 'transform 0.5s ease, box-shadow 0.5s ease',
          };
        default:
          return {};
      }
    }

    return {
      backgroundColor: 'none',
      transform: 'none',
      boxShadow: 'none',
      transition: 'transform 0.5s ease, box-shadow 0.5s ease',
    };
  };

  // 순위 아이콘
  const getRankIcon = (rank: number | undefined) => {
    return rank ? (
      <Typography
        variant="h4"
        sx={{
          position: 'absolute',
          top: '-10px',
          right: '-10px',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          borderRadius: '50%',
          padding: '0.5rem',
          color: 'black',
        }}
      >
        {rank}
      </Typography>
    ) : null;
  };

  return (
    <Box sx={{ textAlign: 'center', maxWidth: '100%' }}>
      {!quizStarted && (
        <>
          <Typography variant="h5" sx={{ marginBottom: '1rem', fontWeight: 'bold' }}>
            참여 중인 학생들
          </Typography>

          {/* 학생 캐릭터 리스트 */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(5, 1fr)', md: 'repeat(8, 1fr)' },
              gap: '1rem',
              padding: '1rem',
            }}
          >
            {students.map((student) => (
              <Box key={student.id} sx={{ textAlign: 'center' }}>
                <img
                  src={`/assets/character/${student.character}.png`}
                  alt={`${student.name}'s character`}
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '50%',
                    border: student.isReady ? '3px solid green' : '3px solid red',
                  }}
                />
                <Typography variant="subtitle1" sx={{ marginTop: '0.5rem' }}>
                  {student.name}
                </Typography>
                <Chip
                  label={student.isReady ? '준비 완료' : '준비 중'}
                  icon={student.isReady ? <CheckCircleIcon /> : <HourglassEmptyIcon />}
                  color={student.isReady ? 'success' : 'warning'}
                  sx={{ marginTop: '0.5rem' }}
                />
              </Box>
            ))}
          </Box>

          {/* 퀴즈 시작 버튼 */}
          {allStudentsReady ? (
            <Button
              variant="contained"
              color="primary"
              onClick={handleStartQuiz}
              sx={{
                marginTop: '2rem',
                fontSize: '1.2rem',
                padding: '0.75rem 1.5rem',
              }}
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
              <ErrorOutlineIcon color="error" sx={{ marginRight: '0.5rem' }} />
              <Typography variant="h6" color="error" sx={{ fontWeight: 'bold' }}>
                모든 학생이 준비되지 않았습니다.
              </Typography>
            </Box>
          )}
        </>
      )}

      {quizStarted && (
        <Box
          sx={{
            display: isShowingFeedback ? 'flex' : 'grid', // 피드백일 때는 중앙 정렬, 아니면 그리드
            justifyContent: isShowingFeedback ? 'center' : 'unset', // 피드백일 때 중앙 정렬
            alignItems: isShowingFeedback ? 'center' : 'unset', // 피드백일 때 중앙 정렬
            gridTemplateColumns: isShowingFeedback
              ? 'none'
              : { xs: 'repeat(3, 1fr)', sm: 'repeat(5, 1fr)', md: 'repeat(8, 1fr)' }, // 그리드 형식 유지
            gap: '1rem',
            padding: '1rem',
            height: isShowingFeedback ? '100vh' : 'auto', // 피드백일 때 전체 화면 사용
          }}
        >
          {students
            .filter((student) => !isShowingFeedback || (student.rank && student.rank <= 3)) // 피드백 시 3등 이하 숨기기
            .map((student) => (
              <Box
                key={student.id}
                sx={{
                  textAlign: 'center',
                  position: 'relative',
                  padding: '1rem',
                  borderRadius: '10px',
                  ...getStudentRankStyle(student.rank), // 순위에 따른 스타일 적용
                }}
              >
                {getRankIcon(student.rank)}
                <img
                  src={`/assets/character/${student.character}.png`}
                  alt={`${student.name}'s character`}
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'cover',
                    borderRadius: '50%',
                  }}
                />
                <Typography variant="subtitle1" sx={{ marginTop: '0.5rem' }}>
                  {student.name}
                </Typography>

                {student.hasSubmitted && (
                  <Typography variant="body2" sx={{ color: 'lightgreen' }}>
                    제출됨
                  </Typography>
                )}

                {student.isCorrect !== undefined && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '0',
                      right: '0',
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: '50%',
                      padding: '0.5rem',
                    }}
                  >
                    {student.isCorrect ? (
                      <CheckCircleIcon sx={{ fontSize: '2rem', color: 'green' }} />
                    ) : (
                      <CancelIcon sx={{ fontSize: '2rem', color: 'red' }} />
                    )}
                  </Box>
                )}
              </Box>
            ))}

          {/* 다음 문제, 퀴즈 종료, 결과 보기 버튼 추가 */}
          {isShowingFeedback && (
            <Box
              sx={{
                position: 'absolute',  // 절대 위치로 고정
                bottom: '5%',  // 화면 하단에서 5% 위치
                left: '50%',  // 수평 중앙 정렬
                transform: 'translateX(-50%)',  // 중앙 정렬 보정
                display: 'flex',
                justifyContent: 'center',
                gap: '1rem',
              }}
            >
              {!isLastQuestion && (
                <Button
                  onClick={handleNextQuestion}
                  variant="contained"
                  sx={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
                >
                  다음 문제
                </Button>
              )}
              {isLastQuestion && (
                <>
                  <Button
                    onClick={handleEndQuiz}
                    variant="contained"
                    color="error"
                    sx={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
                  >
                    퀴즈 종료
                  </Button>
                  <Button
                    onClick={handleViewResults}
                    variant="outlined"
                    sx={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
                  >
                    결과 자세히 보기
                  </Button>
                </>
              )}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default StudentListComponent;
