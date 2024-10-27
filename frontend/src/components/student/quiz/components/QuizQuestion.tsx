import React from 'react';
import { Box, Button, Typography, LinearProgress } from '@mui/material';

interface Option {
  text: string;
}

interface QuizQuestionComponentProps {
  currentQuestion: {
    questionText: string;
    options: Option[];
  };
  selectedAnswer: string | null;
  handleAnswerSelect: (answer: string) => void;
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
      {/* 질문 텍스트
      <Typography
        variant="h5"
        sx={{
          mb: 3,
          fontWeight: 'bold',
          textAlign: 'center',
          color: '#333',
        }}
      >
        {currentQuestion.questionText}
      </Typography> */}

      {/* 옵션 버튼 */}
      {currentQuestion.options.map((option, index) => (
        <Button
          key={index}
          variant={selectedAnswer === option.text ? 'contained' : 'outlined'}
          color={selectedAnswer === option.text ? 'success' : 'primary'}
          onClick={() => handleAnswerSelect(option.text)}
          fullWidth
          sx={{
            mb: 2,
            padding: '10px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            borderRadius: '8px',
          }}
          disabled={!!selectedAnswer}
        >
          {option.text}
        </Button>
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
