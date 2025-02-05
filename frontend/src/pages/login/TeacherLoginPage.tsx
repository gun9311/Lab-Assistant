import React, { useState } from "react";
import {
  setToken,
  setRefreshToken,
  setRole,
  setUserId,
  setSchoolName,
} from "../../utils/auth";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Box,
  Divider,
  Link,
} from "@mui/material";
import apiNoAuth from "../../utils/apiNoAuth";
import { requestPermissionAndGetToken } from "../../firebase"; // FCM 권한 요청 및 토큰 발급 함수 import
import GoogleIcon from "../../assets/google-icon.png";

const TeacherLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isTokenFound, setTokenFound] = useState(false);

  const handleLogin = async () => {
    try {
      // FCM 토큰 가져오기 (권한 요청 포함)
      let fcmToken = await requestPermissionAndGetToken(setTokenFound);

      if (!fcmToken) {
        // setError('알림 권한이 필요합니다. 알림 권한을 허용해주세요.');
        // return;
        fcmToken = null;
      }

      const res = await apiNoAuth.post("/auth/login", {
        role: "teacher",
        email,
        password,
        fcmToken,
      });
      setToken(res.data.accessToken);
      setRefreshToken(res.data.refreshToken);
      setRole(res.data.role);
      setUserId(res.data.userId);
      setSchoolName(res.data.school);
      window.location.href = `/${res.data.role}`;
    } catch (error) {
      setError("Invalid email or password");
    }
  };

  return (
    <Container
      component="main"
      maxWidth="xs"
      sx={{ marginY: { xs: 4, sm: 12, xl: 12 } }}
    >
      <Paper
        elevation={3}
        sx={{ padding: { xs: 3, sm: 5 }, textAlign: "center" }}
      >
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontWeight: "bold",
            fontSize: { xs: "1.8rem", sm: "2.2rem" },
            fontFamily: "Arial, sans-serif",
          }}
        >
          교사 로그인
        </Typography>
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="이메일"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2, fontSize: "1rem" }}
        />
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2, fontSize: "1rem" }}
        />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleLogin}
          sx={{
            mt: 2,
            py: 1.5,
            fontSize: "1rem",
            backgroundColor: "#388e3c",
            "&:hover": {
              backgroundColor: "#2e7d32",
            },
            borderRadius: "8px",
          }}
        >
          로그인
        </Button>

        <Typography
          variant="body2"
          sx={{ mt: 4, color: "text.secondary", fontSize: "0.9rem" }}
        >
          계정이 없으신가요?{" "}
          <Link
            href="/teacher-register"
            sx={{
              color: "#1976d2",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            가입하기
          </Link>
        </Typography>
        <Typography
          variant="body2"
          sx={{ mt: 2, color: "text.secondary", fontSize: "0.9rem" }}
        >
          <Link
            href="/forgot-password"
            sx={{
              color: "#1976d2",
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            비밀번호를 잊으셨나요?
          </Link>
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", mt: 3, mb: 3 }}>
          <Divider sx={{ flexGrow: 1 }} />
          <Typography
            variant="body2"
            sx={{ mx: 2, color: "text.secondary", fontSize: "0.9rem" }}
          >
            또는
          </Typography>
          <Divider sx={{ flexGrow: 1 }} />
        </Box>

        <Button
          fullWidth
          variant="contained"
          onClick={() =>
            (window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.REACT_APP_GOOGLE_CLIENT_ID}&redirect_uri=${process.env.REACT_APP_GOOGLE_REDIRECT_URI}&response_type=code&scope=profile email&state=secureRandomState`)
          }
          sx={{
            mt: 2,
            py: 1.5,
            fontSize: "1rem",
            backgroundColor: "#FFFFFF",
            color: "#000000",
            "&:hover": {
              backgroundColor: "#f5f5f5",
            },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
            border: "1px solid #dcdcdc",
          }}
        >
          <img
            src={GoogleIcon}
            alt="Google"
            style={{ marginRight: 8, width: 20, height: 20 }}
          />
          Google로 로그인
        </Button>

        {error && (
          <Typography color="error" sx={{ mt: 2, fontSize: "0.9rem" }}>
            {error}
          </Typography>
        )}

        <Typography
          variant="body2"
          sx={{
            mt: 4,
            color: "text.secondary",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Link
            href="https://gun9311.github.io/Lab-Assistant/"
            color="inherit"
            sx={{ marginLeft: 1 }}
          >
            개인정보처리방침
          </Link>
        </Typography>
      </Paper>
    </Container>
  );
};

export default TeacherLoginPage;
