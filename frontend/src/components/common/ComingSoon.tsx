import React from "react";
import { Box, Typography, Container, Paper } from "@mui/material";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const ComingSoon: React.FC = () => {
  return (
    // Container와 Paper를 사용하여 다른 페이지와 유사한 레이아웃 제공
    <Container
      component="main"
      maxWidth="sm"
      sx={{ mt: { xs: 4, sm: 8 }, mb: 4 }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: { xs: 3, sm: 5 },
          textAlign: "center",
          borderRadius: "16px", // 디자인 일관성을 위한 둥근 모서리
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3, // 요소 간 간격 추가
        }}
      >
        {/* Lottie 애니메이션 크기 제어 */}
        <Box sx={{ width: "80%", maxWidth: 300 }}>
          <DotLottieReact
            src="https://lottie.host/2a125b1a-d108-40f4-a582-0cad9f6b46ed/rdkNjG8yyS.lottie"
            loop
            autoplay
            style={{ width: "100%", height: "auto" }} // 반응형 크기 조정
          />
        </Box>
        <Typography
          variant="h5"
          component="h2"
          sx={{ fontWeight: "bold", color: "text.secondary" }}
        >
          서비스 준비 중입니다
        </Typography>
        <Typography variant="body1" color="text.secondary">
          더 좋은 기능으로 찾아뵙겠습니다. 조금만 기다려주세요!
        </Typography>
      </Paper>
    </Container>
  );
};

export default ComingSoon;
