import React from "react";
import { Box, Typography, Paper } from "@mui/material";
// import AccessTimeIcon from "@mui/icons-material/AccessTime"; // 아이콘 대신 Lottie 사용
import { DotLottieReact } from "@lottiefiles/dotlottie-react"; // Lottie 임포트

const ServiceUnavailable: React.FC = () => {
  // --- 하드코딩된 시간 설정 ---
  const startHour = 8; // 오전 9시
  const endHour = 23; // 오후 3시
  // --- 하드코딩 끝 ---

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="calc(100vh - 64px)" // 예시: 헤더 높이 제외
      textAlign="center"
      p={3}
    >
      <Paper
        elevation={3}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 2,
          maxWidth: 400,
          width: "90%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* AccessTimeIcon 대신 Lottie 애니메이션 추가 */}
        <DotLottieReact
          src="https://lottie.host/4272aae6-9848-4176-aa7e-f8cba1284856/oWNo1aJWmd.lottie"
          loop
          autoplay
          style={{ width: "150px", height: "150px", marginBottom: "16px" }} // Lottie 크기 및 간격 조절
        />
        <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
          서비스 이용 불가 시간
        </Typography>
        <Typography variant="body1" color="text.secondary">
          현재는 서비스를 이용할 수 없는 시간입니다.
          <br />
          이용 가능 시간:{" "}
          <strong>
            오전 {startHour}시 ~ 오후 {endHour}시
          </strong>
        </Typography>
      </Paper>
    </Box>
  );
};

export default ServiceUnavailable;
