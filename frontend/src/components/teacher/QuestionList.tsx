import React, { useState, useEffect } from "react";
import { List, ListItem, ListItemText, Paper, Typography } from "@mui/material";

type Question = {
  _id: number;
  question: string;
  subject: string;
};

type QuestionListProps = {
  studentId: number;
};

const QuestionList: React.FC<QuestionListProps> = ({ studentId }) => {
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    if (studentId) {
      fetchQuestions();
    }
  }, [studentId]);

  const fetchQuestions = async () => {
    const response = await fetch(`/api/users/teacher/students/${studentId}/questions`);
    const data = await response.json();
    setQuestions(data);
  };

  return (
    <Paper elevation={3} sx={{ padding: 2, marginTop: 2 }}>
      <Typography variant="h5" gutterBottom align="center">
        질문 목록
      </Typography>
      <List>
        {questions.map((question) => (
          <ListItem key={question._id}>
            <ListItemText primary={question.question} secondary={`과목: ${question.subject}`} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default QuestionList;
