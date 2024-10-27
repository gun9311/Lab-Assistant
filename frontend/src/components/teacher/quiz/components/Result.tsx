import React from 'react';
import { Box, Typography, Button, Card, CardContent, Grid } from '@mui/material';

type Feedback = {
  studentId: string;
  name: string;
  score: number;
};

interface ResultComponentProps {
  quizResults: Feedback[] | null;
  handleEndQuiz: () => void;
}

const ResultComponent: React.FC<ResultComponentProps> = ({ quizResults, handleEndQuiz }) => {
  return (
    <Box sx={{ padding: '2rem', textAlign: 'center' }}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', marginBottom: '2rem' }}>
        퀴즈 상세 결과
      </Typography>

      {/* 결과 리스트를 카드 스타일로 개선 */}
      <Grid container spacing={3} justifyContent="center">
        {quizResults?.map((result, index) => (
          <Grid item xs={12} sm={6} md={4} key={result.studentId}>
            <Card
              sx={{
                backgroundColor: '#f9f9f9',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                textAlign: 'left',
                padding: '1rem',
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {index + 1}등: {result.name}
                </Typography>
                <Typography variant="body1">
                  최종 점수: <strong>{result.score}</strong>
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 퀴즈 종료 버튼만 남기고 결과 자세히 보기 버튼은 삭제 */}
      <Box sx={{ marginTop: '3rem', display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleEndQuiz}
          sx={{ padding: '0.5rem 1.5rem', fontWeight: 'bold' }}
        >
          퀴즈 종료
        </Button>
      </Box>
    </Box>
  );
};

export default ResultComponent;
