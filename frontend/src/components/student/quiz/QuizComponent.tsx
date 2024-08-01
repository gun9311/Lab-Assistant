import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
} from "@mui/material";
import { getUserId } from "../../../utils/auth";
import api from "../../../utils/api";

type Task = {
  _id: string;
  taskText: string;
};

type Quiz = {
  grade: string;
  semester: string;
  subject: string;
  unit: string;
  tasks: Task[];
};

const QuizComponent: React.FC<{ quiz: Quiz; onSubmit: () => void }> = ({
  quiz,
  onSubmit,
}) => {
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);

  const handleChange = (taskId: string, value: string) => {
    setAnswers({ ...answers, [taskId]: value });
  };

  const handleSubmit = async () => {
    const quizData = {
      studentId: getUserId(), // 실제로는 로그인된 학생의 ID를 사용해야 합니다.
      subject: quiz.subject,
      semester: quiz.semester,
      unit: quiz.unit,
      answers: Object.entries(answers).map(([questionId, studentAnswer]) => ({
        questionId,
        taskText:
          quiz.tasks.find((task) => task._id === questionId)?.taskText || "",
        studentAnswer,
      })),
    };

    try {
      await api.post("/quiz/submit", quizData);
      onSubmit();
    } catch (error: any) {
      console.error("Failed to submit quiz:", error);
      setError(error.response?.data?.message || "퀴즈 제출에 실패했습니다.");
    }
  };

  return (
    <Paper elevation={3} sx={{ padding: 4, mt: 2 }}>
      <Typography variant="h5" gutterBottom>
        {quiz.subject} - {quiz.unit}
      </Typography>
      {quiz.tasks.map((task) => (
        <Box key={task._id} sx={{ mb: 2 }}>
          <Typography variant="body1">{task.taskText}</Typography>
          <TextField
            fullWidth
            variant="outlined"
            value={answers[task._id] || ""}
            onChange={(e) => handleChange(task._id, e.target.value)}
          />
        </Box>
      ))}
      {error && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}
      <Box textAlign="center" sx={{ mt: 2 }}>
        <Button variant="contained" color="primary" onClick={handleSubmit}>
          퀴즈 제출
        </Button>
      </Box>
    </Paper>
  );
};

export default QuizComponent;
