import React, { useState, useEffect } from "react";
import { Box, Button, TextField, Typography, Paper } from "@mui/material";

type Task = {
  _id: string;
  taskText: string;
};

type Quiz = {
  _id: string;
  grade: string;
  semester: string;
  subject: string;
  unit: string;
  tasks: Task[];
};

const QuizComponent: React.FC<{ quiz: Quiz; onSubmit: (answers: { [key: string]: string }) => void }> = ({ quiz, onSubmit }) => {
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [timeLeft, setTimeLeft] = useState<number>(1800); // 30분 = 1800초
  const [isSubmitting, setIsSubmitting] = useState(false); // 제출 상태를 추적합니다

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          handleSubmit(true); // 시간 초과 시 자동 제출
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isSubmitting) {
        event.preventDefault();
        event.returnValue = ''; // 브라우저에서 기본 경고 메시지 표시
      }
    };

    const handleUnload = () => {
      if (!isSubmitting) {
        // 사용자가 새로고침을 누른 경우 제출 동작 수행
        handleSubmit(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, [isSubmitting]);

  const handleChange = (taskId: string, value: string) => {
    setAnswers((prevAnswers) => ({ ...prevAnswers, [taskId]: value }));
  };

  const handleSubmit = (isAutoSubmit = false) => {
    if (!isAutoSubmit) {
      const confirmSubmit = window.confirm(
        "퀴즈를 제출하시겠습니까? 제출 후에는 다시 풀 수 없으며, 수정이 불가합니다."
      );

      if (!confirmSubmit) {
        return; // 사용자가 제출을 취소한 경우
      }
    } else {
      alert("제한 시간이 종료되었거나, 페이지 이탈로 인해 퀴즈가 자동 제출되었습니다.");
    }

    // 실질적인 제출 동작
    setIsSubmitting(true); // 제출 상태를 업데이트합니다
    onSubmit(answers);
  };

  return (
    <Paper elevation={3} sx={{ padding: 4, mt: 2 }}>
      <Typography variant="h5" gutterBottom>
        {quiz.subject} - {quiz.unit}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        남은 시간: {Math.floor(timeLeft / 60)}분 {timeLeft % 60}초
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
      <Box textAlign="center" sx={{ mt: 2 }}>
        <Button variant="contained" color="primary" onClick={() => handleSubmit(false)}>
          퀴즈 제출
        </Button>
      </Box>
    </Paper>
  );
};

export default QuizComponent;
