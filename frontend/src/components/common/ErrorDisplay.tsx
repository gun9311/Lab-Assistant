import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

interface ErrorDisplayProps {
  title: string;
  message: React.ReactNode;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ title, message }) => {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="calc(100vh - 64px)"
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
        <DotLottieReact
          src="https://lottie.host/4272aae6-9848-4176-aa7e-f8cba1284856/oWNo1aJWmd.lottie"
          loop
          autoplay
          style={{ width: "150px", height: "150px", marginBottom: "16px" }}
        />
        <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      </Paper>
    </Box>
  );
};

export default ErrorDisplay;
