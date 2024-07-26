import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { List, ListItem, ListItemText, Paper, Typography, Container } from '@mui/material';

type QuizResult = {
  _id: number;
  subject: string;
  score: number;
};

type QuizResultsProps = {
  studentId: number;
};

const QuizResults: React.FC<QuizResultsProps> = ({ studentId }) => {
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);

  useEffect(() => {
    if (studentId) {
      fetchQuizResults();
    }
  }, [studentId]);

  const fetchQuizResults = async () => {
    try {
      const res = await axios.get(`/api/users/teacher/students/${studentId}/quizResults`);
      setQuizResults(res.data);
    } catch (error) {
      console.error('Error fetching quiz results:', error);
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Paper elevation={3} sx={{ padding: 2, marginTop: 2 }}>
        <Typography variant="h5" gutterBottom align="center">
          퀴즈 결과
        </Typography>
        <List>
          {quizResults.map((result) => (
            <ListItem key={result._id}>
              <ListItemText primary={`${result.subject} - 점수: ${result.score}`} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
};

export default QuizResults;
