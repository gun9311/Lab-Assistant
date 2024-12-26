import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';

interface WaitingScreenComponentProps {
  isReady: boolean;
  isQuizStarting: boolean;
  isWaitingForQuizStart: boolean;
  isPreparingNextQuestion: boolean;
  isLastQuestion: boolean;
  selectedCharacter: number | string | null;
  characterImages: string[];
}

const WaitingScreenComponent: React.FC<WaitingScreenComponentProps> = ({
  isReady,
  isQuizStarting,
  isWaitingForQuizStart,
  isPreparingNextQuestion,
  isLastQuestion,
  selectedCharacter,
  characterImages,
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + '.' : ''));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box textAlign="center" sx={{ padding: 3 }}>
      {selectedCharacter !== null && (
        <Box sx={{ mb: 2 }}>
          <img
            src={characterImages[Number(selectedCharacter)]}
            alt={`선택된 캐릭터`}
            style={{ width: 100, height: 100, objectFit: 'contain' }}
          />
        </Box>
      )}
      {/* 퀴즈 시작 대기 중 상태 */}
      {isWaitingForQuizStart && (
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 'bold',
              color: '#333333',
              width: '270px',
              margin: '0 auto',
              textAlign: 'center',
              fontFamily: `'Roboto', 'Helvetica', 'Arial', sans-serif`,
              // backgroundColor: 'rgba(255, 255, 255, 0.8)',
              padding: '10px',
              borderRadius: '8px',
            }}
          >
            퀴즈가 곧 시작됩니다
            <span style={{ position: 'absolute' }}>{dots}</span>
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
