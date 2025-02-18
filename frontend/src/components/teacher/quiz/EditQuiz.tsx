// EditQuizPage.tsx
import React, { useEffect, useState } from "react";
import { Box, Typography, Divider, CircularProgress } from "@mui/material";
import QuizContainer from "./QuizContainer";
import { useParams } from "react-router-dom";
import { getQuizById } from "../../../utils/quizApi"; // 이미 구현된 API

const EditQuizPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuizData = async () => {
      if (quizId) {
        try {
          const quizData = await getQuizById(quizId);
          setInitialData(quizData);
        } catch (error) {
          console.error("Failed to fetch quiz data", error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchQuizData();
  }, [quizId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress color="primary" />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        padding: { xs: "1.5rem", md: "2.5rem" },
        borderRadius: "16px",
        boxShadow: "0px 6px 20px rgba(0, 0, 0, 0.1)",
        backgroundColor: "#ffffff",
        maxWidth: "lg",
        width: "100%",
        margin: "40px auto",
      }}
    >
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: "bold", color: "#333", textAlign: "center" }}
      >
        ✏️ 퀴즈 수정
      </Typography>

      <Divider sx={{ my: 4, borderColor: "#e0e0e0" }} />

      {/* QuizContainer에 수정 모드와 초기 데이터를 전달 */}
      {initialData && <QuizContainer isEdit={true} initialData={initialData} />}
    </Box>
  );
};

export default EditQuizPage;
