import React, { useState } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import apiNoAuth from "../../utils/apiNoAuth";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handlePasswordReset = async () => {
    if (isLoading || !email.trim()) return;

    setIsLoading(true);
    setError("");
    setSuccess(false);

    try {
      await apiNoAuth.post("/auth/forgot-password", { email });
      setSuccess(true);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        "비밀번호 재설정 요청에 실패했습니다. 다시 시도해주세요.";
      setError(errorMessage);
      console.error("Password reset request failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 4 }}>
      <Typography
        variant="h5"
        gutterBottom
        sx={{ fontWeight: "bold", mb: 2, textAlign: "center" }}
      >
        비밀번호 재설정
      </Typography>
      <TextField
        fullWidth
        variant="outlined"
        margin="normal"
        label="이메일"
        type="email"
        value={email}
        onChange={handleEmailChange}
        sx={{ mb: 2 }}
        disabled={isLoading}
        error={!!error}
        helperText={error}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isLoading && email.trim()) {
            e.preventDefault();
            handlePasswordReset();
          }
        }}
      />
      <Button
        fullWidth
        variant="contained"
        color="primary"
        onClick={handlePasswordReset}
        disabled={isLoading || !email.trim()}
        sx={{
          mt: 2,
          py: 1.5,
          fontSize: "1rem",
          backgroundColor: "#1976d2",
          "&:hover": {
            backgroundColor: "#1565c0",
          },
          borderRadius: "8px",
        }}
        startIcon={
          isLoading ? <CircularProgress size={24} color="inherit" /> : null
        }
      >
        {isLoading ? "처리 중..." : "비밀번호 재설정 링크 보내기"}
      </Button>
      <Snackbar
        open={success}
        autoHideDuration={5000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccess(false)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          비밀번호 재설정 링크가 이메일로 발송되었습니다.
        </Alert>
      </Snackbar>
      <Snackbar
        open={!!error && !error.includes("이메일")}
        autoHideDuration={6000}
        onClose={() => setError("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setError("")}
          severity="error"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ForgotPasswordPage;
