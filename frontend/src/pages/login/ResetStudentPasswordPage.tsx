import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import apiNoAuth from "../../utils/apiNoAuth";

const ResetStudentPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [passwordMatchError, setPasswordMatchError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const token = query.get("token");

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordMatchError(
      newPassword !== confirmPassword && confirmPassword !== ""
    );
    if (error) setError("");
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    setPasswordMatchError(
      password !== newConfirmPassword && newConfirmPassword !== ""
    );
    if (error) setError("");
  };

  const handlePasswordReset = async () => {
    setError("");
    setPasswordMatchError(false);
    if (isLoading) return;
    if (!token) {
      setError("유효하지 않은 접근입니다. 다시 시도해주세요.");
      return;
    }
    if (!password || !confirmPassword) {
      setError("새 비밀번호와 비밀번호 확인을 모두 입력해주세요.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      setPasswordMatchError(true);
      return;
    }

    setIsLoading(true);
    setSuccess(false);

    try {
      await apiNoAuth.post("/auth/reset-student-password", { token, password });
      setSuccess(true);
      setTimeout(() => navigate("/teacher"), 3000);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error || "비밀번호 재설정에 실패했습니다.";
      setError(errorMessage);
      console.error("Student password reset failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const disableButton =
    isLoading || !password || !confirmPassword || passwordMatchError;

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ padding: 4 }}>
        <Typography variant="h5" gutterBottom>
          학생 비밀번호 재설정
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="새 비밀번호"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          disabled={isLoading}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="비밀번호 확인"
          type="password"
          value={confirmPassword}
          onChange={handleConfirmPasswordChange}
          disabled={isLoading}
          error={passwordMatchError}
          helperText={passwordMatchError ? "비밀번호가 일치하지 않습니다." : ""}
        />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handlePasswordReset}
          disabled={disableButton}
          sx={{ mt: 2 }}
          startIcon={
            isLoading ? <CircularProgress size={24} color="inherit" /> : null
          }
        >
          {isLoading ? "처리 중..." : "확인"}
        </Button>
        <Snackbar
          open={!!error && !passwordMatchError}
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
        <Snackbar
          open={success}
          autoHideDuration={3000}
          onClose={() => setSuccess(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSuccess(false)}
            severity="success"
            variant="filled"
            sx={{ width: "100%" }}
          >
            비밀번호가 성공적으로 재설정되었습니다.
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default ResetStudentPasswordPage;
