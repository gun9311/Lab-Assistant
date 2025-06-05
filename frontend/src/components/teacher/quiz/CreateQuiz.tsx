import React from "react";
import { Box, Typography, Divider } from "@mui/material";
import QuizContainer from "./QuizContainer";

const CreateQuizPage: React.FC = () => {
  return (
    <Box
      sx={{
        padding: { xs: "1.5rem", md: "1.5rem" }, // 작은 화면에서는 좁게, 큰 화면에서는 넓게
        borderRadius: "16px",
        boxShadow: "0px 6px 20px rgba(0, 0, 0, 0.1)",
        backgroundColor: "#ffffff",
        maxWidth: "xl", // 전체 화면의 90% 너비 사용
        width: "100%",
        margin: "40px auto",
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          color: "#333",
          textAlign: "center",
          fontSize: {
            xs: "1.5rem", // 전화면 (mobile)
            sm: "1.75rem",
            md: "1.75rem", // 태블릿 이상
            lg: "2rem", // 데스크탑 이상
            xl: "2.25rem",
          },
          mb: 1, // 하단 마진 추가 (gutterBottom 대용으로 조절)
        }}
      >
        📝 퀴즈 생성
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{
          color: "#666",
          textAlign: "center",
          maxWidth: "800px",
          margin: "0 auto",
          lineHeight: 1.6,
          mb: 3, // 하단 마진 추가 (Divider 와의 간격 조절)
        }}
      >
        퀴즈의 기본 정보를 입력하고 문제를 추가하여 퀴즈를 생성하세요!
      </Typography>
      {/* 구분선 추가로 시각적 구획 분리 */}
      <Divider sx={{ my: 2, borderColor: "#e0e0e0" }} />{" "}
      {/* my 값을 4에서 2로 줄임 */}
      {/* QuizContainer를 사용하여 퀴즈 생성 흐름 제공 */}
      <QuizContainer />
    </Box>
  );
};

export default CreateQuizPage;
