import React from 'react';
import { Box, Button, Typography, LinearProgress } from '@mui/material';

interface Option {
  text: string;
  imageUrl?: string; // 선택지 이미지 URL을 추가
}

interface QuizQuestionComponentProps {
  currentQuestion: {
    options: Option[];
    imageUrl?: string; // 문제 이미지 URL (필요에 따라 표시 가능)
  };
  selectedAnswer: number | null;
  handleAnswerSelect: (index: number) => void;
  timeLeft: number | null;
}

const QuizQuestionComponent: React.FC<QuizQuestionComponentProps> = ({
  currentQuestion,
  selectedAnswer,
  handleAnswerSelect,
  timeLeft,
}) => {
  // 타이머 색상 변화 (시간에 따라 변화)
  const getTimerColor = () => {
    if (timeLeft === null) return 'primary';
    if (timeLeft > 10) return 'primary'; // 충분한 시간일 때 파란색
    if (timeLeft > 5) return 'warning'; // 중간 정도 시간일 때 노란색
    return 'error'; // 시간이 얼마 안 남았을 때 빨간색
  };

  return (
    <Box>
      {/* 옵션 버튼 */}
      {currentQuestion.options.map((option, index) => (
        <Box key={index} sx={{ mb: 2, textAlign: 'center' }}>
          <Button
            variant={selectedAnswer === index ? 'contained' : 'outlined'}
            color={selectedAnswer === index ? 'success' : 'primary'}
            onClick={() => handleAnswerSelect(index)}
            fullWidth
            sx={{
              padding: '10px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            disabled={!!selectedAnswer}
          >
            {option.imageUrl && (
              <img
                src={option.imageUrl}
                alt="선택지 이미지"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100px',
                  marginBottom: '10px',
                  borderRadius: '5px',
                }}
              />
            )}
            {option.text}
          </Button>
        </Box>
      ))}

      {/* 타이머 */}
      {timeLeft !== null && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography
            variant="h6"
            sx={{ mb: 1, color: getTimerColor() === 'error' ? '#f44336' : '#333' }}
          >
            남은 시간: {timeLeft}초
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(timeLeft / 30) * 100} // 전체 시간을 30초로 가정하고 퍼센트 계산
            color={getTimerColor()}
            sx={{ height: 8, borderRadius: '4px' }}
          />
        </Box>
      )}
    </Box>
  );
};

export default QuizQuestionComponent;
