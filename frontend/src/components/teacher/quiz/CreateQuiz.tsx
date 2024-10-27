import React from "react";
import { Box, Typography } from "@mui/material";
import QuizContainer from "./QuizContainer";

const CreateQuizPage: React.FC = () => {
  return (
    <Box sx={{ padding: "2rem" }}>
      <Typography variant="h4" gutterBottom>
        퀴즈 생성
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        퀴즈의 기본 정보를 입력하고 문제를 추가하여 퀴즈를 완성하세요.
      </Typography>

      {/* QuizContainer를 사용하여 퀴즈 생성 흐름 제공 */}
      <QuizContainer />
    </Box>
  );
};

export default CreateQuizPage;
