import React from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'; // 준비 완료 아이콘
import TimerIcon from '@mui/icons-material/Timer'; // 타이머 아이콘
import DoneIcon from '@mui/icons-material/Done'; // 완료 아이콘

interface WaitingScreenComponentProps {
  isReady: boolean;
  isQuizStarting: boolean;
  isWaitingForQuizStart: boolean;
  isPreparingNextQuestion: boolean;
  isLastQuestion: boolean;
  handleReady: () => void;
}

const WaitingScreenComponent: React.FC<WaitingScreenComponentProps> = ({
  isReady,
  isQuizStarting,
  isWaitingForQuizStart,
  isPreparingNextQuestion,
  isLastQuestion,
  handleReady,
}) => {
  return (
    <Box textAlign="center" sx={{ padding: 3 }}>
      {/* 준비 완료 버튼 */}
      {!isReady && !isQuizStarting && !isWaitingForQuizStart && !isPreparingNextQuestion && (
        <Button
          variant="contained"
          color="success"
          onClick={handleReady}
          startIcon={<CheckCircleOutlineIcon />}
          sx={{
            fontSize: '1.2rem',
            padding: '10px 20px',
            borderRadius: '8px',
            backgroundColor: '#4caf50',
            '&:hover': { backgroundColor: '#388e3c' },
          }}
        >
          준비 완료
        </Button>
      )}

      {/* 퀴즈 시작 대기 중 상태 */}
      {isWaitingForQuizStart && (
        <Box>
          <CircularProgress sx={{ color: '#ff9800', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
            퀴즈가 곧 시작됩니다. 대기 중입니다...
          </Typography>
        </Box>
      )}

      {/* 퀴즈가 곧 시작될 때 */}
      {isQuizStarting && (
        <Box>
          <TimerIcon sx={{ fontSize: 50, color: '#f44336', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#f44336' }}>
            퀴즈가 곧 시작됩니다...
          </Typography>
        </Box>
      )}

      {/* 다음 문제를 준비 중일 때 */}
      {isPreparingNextQuestion && (
        <Box>
          <CircularProgress sx={{ color: '#2196f3', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2196f3' }}>
            {isLastQuestion ? '마지막 문제입니다...' : '다음 문제가 곧 출제됩니다...'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default WaitingScreenComponent;
