import React, { useEffect, useState } from 'react';
import { Box, Typography, Slide } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface QuizFeedbackComponentProps {
  feedbackMessage: string | null;
  isLastQuestion: boolean; // 마지막 문제 여부
}

const QuizFeedbackComponent: React.FC<QuizFeedbackComponentProps> = ({
  feedbackMessage,
  isLastQuestion,
}) => {
  const [showFinalMessage, setShowFinalMessage] = useState(false); // 최종 메시지 상태 추가
  const isCorrect = feedbackMessage?.includes('정답'); // 정답 여부 판별
  const feedbackColor = isCorrect ? '#4caf50' : '#f44336'; // 정답이면 초록색, 오답이면 빨간색
  const FeedbackIcon = isCorrect ? CheckCircleIcon : CancelIcon; // 정답/오답에 따른 아이콘

  // 마지막 문제일 경우 일정 시간이 지난 후 최종 문구를 보여주는 로직
  useEffect(() => {
    if (isLastQuestion) {
      const timer = setTimeout(() => {
        setShowFinalMessage(true); // 3초 후 최종 문구 보여줌
      }, 1000); // 1초 대기

      return () => clearTimeout(timer); // 컴포넌트 언마운트 시 타이머 정리
    }
  }, [isLastQuestion]);

  return (
    <Slide direction="up" in={!!feedbackMessage} mountOnEnter unmountOnExit>
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        {/* 기존 피드백 표시 */}
        <FeedbackIcon sx={{ fontSize: 60, color: feedbackColor, mb: 2 }} />
        <Typography
          variant="h5"
          sx={{
            color: feedbackColor,
            fontWeight: 'bold',
            animation: 'fadeIn 1s ease',
          }}
        >
          {feedbackMessage}
        </Typography>

        {/* 마지막 문제일 경우 일정 시간이 지난 후 최종 메시지 표시 */}
        {isLastQuestion && showFinalMessage && (
          <>
            <EmojiEventsIcon sx={{ fontSize: 60, color: '#ffeb3b', mt: 4 }} />
            <Typography
              variant="h5"
              sx={{
                color: '#ffeb3b',
                fontWeight: 'bold',
                animation: 'fadeIn 1s ease',
              }}
            >
              모든 문제가 끝났습니다!
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: '#607d8b',
                mt: 2,
              }}
            >
              최종 결과를 확인해보세요.
            </Typography>
          </>
        )}
      </Box>
    </Slide>
  );
};

export default QuizFeedbackComponent;
