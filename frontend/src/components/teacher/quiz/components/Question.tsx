import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer'; // 시계 모양 타이머 아이콘
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

interface Question {
  _id: string;
  questionText: string;
  options: { text: string; imageUrl?: string }[];
  correctAnswer: number; // 정답을 인덱스 값으로 처리
  timeLimit: number;
  imageUrl?: string; // 문제 이미지 URL
}

interface QuestionComponentProps {
  currentQuestion: Question | null;
  submittedCount: number;
  totalStudents: number;
  allSubmitted: boolean;
}

const QuestionComponent: React.FC<QuestionComponentProps> = ({
  currentQuestion,
  submittedCount,
  totalStudents,
  allSubmitted,
}) => {
  const [remainingTime, setRemainingTime] = useState(currentQuestion?.timeLimit || 30);
  const submissionProgress = (submittedCount / totalStudents) * 100;

  useEffect(() => {
    if (allSubmitted) return; // 이미 제출 완료된 경우 타이머 중지

    if (remainingTime > 0) {
      const timer = setTimeout(() => {
        setRemainingTime((prevTime) => prevTime - 1);
      }, 1000);

      return () => clearTimeout(timer); // 컴포넌트 언마운트 시 타이머 해제
    }
  }, [remainingTime, allSubmitted]);

  useEffect(() => {
    // 새로운 문제가 주어졌을 때 남은 시간을 초기화
    if (currentQuestion) {
      setRemainingTime(currentQuestion.timeLimit);
    }
  }, [currentQuestion]);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '5%', // 상단에 배치
        width: '100%',
        textAlign: 'center',
        color: '#fff',
        padding: '0 2rem',
      }}
    >
      {/* 문제 이미지 */}
      {currentQuestion?.imageUrl && (
        <img
          src={currentQuestion.imageUrl}
          alt="문제 이미지"
          style={{
            maxWidth: '100%',
            maxHeight: '300px',
            marginBottom: '20px',
            borderRadius: '8px',
          }}
        />
      )}

      {/* 문제 텍스트와 타이머 아이콘 */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
          {currentQuestion?.questionText || '현재 출제된 문제가 없습니다.'}
        </Typography>
        {/* 시계 모양 타이머 아이콘 */}
        {currentQuestion && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TimerIcon sx={{ fontSize: '2rem', color: remainingTime <= 5 ? 'red' : 'white' }} />
            <Typography
              variant="h6"
              sx={{ color: remainingTime <= 5 ? 'red' : 'white', fontSize: '1.2rem' }}
            >
              {`${remainingTime}s`}
            </Typography>
          </Box>
        )}
      </Box>

      {/* 선택지 목록 (반응형 2열, 모바일에서는 1열) */}
      {currentQuestion && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, // 모바일: 1열, 데스크탑: 2열
            gap: '1.5rem',
            justifyItems: 'center',
            alignItems: 'center',
            marginBottom: '2rem',
            padding: '0 1rem',
          }}
        >
          {currentQuestion.options.map((option, index) => {
            const isCorrect = String(index) === String(currentQuestion.correctAnswer);

            return (
              <Box
                key={index}
                sx={{
                  backgroundColor:
                    allSubmitted && isCorrect
                      ? 'rgba(0, 200, 150, 0.5)' // 정답일 때 푸른색
                      : allSubmitted
                      ? 'rgba(200, 100, 150, 0.3)' // 오답일 때 보라색
                      : 'rgba(0, 0, 0, 0.5)', // 제출 전 기본 색상
                  padding: '1rem',
                  borderRadius: '8px',
                  cursor: 'default', // 클릭할 수 없음을 나타냄
                  width: '100%',
                  textAlign: 'center',
                  transition: 'background-color 0.3s ease, transform 0.3s ease',
                  transform: allSubmitted && isCorrect ? 'scale(1.05)' : 'none', // 정답은 확대
                  boxShadow: allSubmitted ? '0px 4px 8px rgba(0, 0, 0, 0.2)' : 'none',
                }}
              >
                {option.imageUrl && (
                  <img
                    src={option.imageUrl}
                    alt="선택지 이미지"
                    style={{ maxWidth: '100%', maxHeight: '100px', marginBottom: '10px', borderRadius: '5px' }}
                  />
                )}
                {option.text}
                {/* 정답 여부에 따른 애니메이션 효과 아이콘 */}
                {allSubmitted && (
                  <Box component="span" sx={{ marginLeft: '1rem', verticalAlign: 'middle' }}>
                    {isCorrect ? (
                      <CheckCircleIcon sx={{ color: 'lightgreen', fontSize: '2rem', animation: 'pulse 1s infinite' }} />
                    ) : (
                      <CancelIcon sx={{ color: 'orange', fontSize: '2rem', animation: 'shake 0.5s' }} />
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}

      {/* 제출 진행 상황 표시 */}
      {!allSubmitted && (
        <Box sx={{ marginTop: '2rem' }}>
          <Typography variant="body1" sx={{ marginBottom: '0.5rem' }}>
            제출한 학생 수: {submittedCount}/{totalStudents}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={submissionProgress}
            sx={{
              height: '10px',
              borderRadius: '5px',
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#4caf50',
              },
              width: '50%',
              margin: '0 auto',
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default QuestionComponent;
