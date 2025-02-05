import React, { useState } from "react";
import {
  Button,
  Typography,
  Box,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Link as MuiLink,
} from "@mui/material";
import { Link } from "react-router-dom";
import backgroundLogo4 from "../../assets/nudge-background-logo4.png";
import background3 from "../../assets/nudge-desktop-background.png";
import adminIcon from "../../assets/admin-icon.png";
import studentIcon from "../../assets/student-icon.png";
import teacherIcon from "../../assets/teacher-icon.png";

const HomePage = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const handleLoginClickOpen = () => {
    setLoginOpen(true);
  };

  const handleRegisterClickOpen = () => {
    setRegisterOpen(true);
  };

  const handleLoginClose = () => {
    setLoginOpen(false);
  };

  const handleRegisterClose = () => {
    setRegisterOpen(false);
  };

  return (
    <Container
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: {
          xs: "center",
          sm: "center",
          md: "center",
          lg: "flex-start",
        },
        backgroundImage: {
          xs: `url(${backgroundLogo4})`,
          md: `url(${background3})`,
        },
        backgroundSize: "cover",
        backgroundPosition: "center center",
        paddingBottom: 4,
        paddingTop: {
          xs: 2,
          sm: 0,
          md: 0,
        },
        "@media (max-width: 600px)": {
          backgroundSize: "auto 100%",
          backgroundPosition: "center center",
        },
        "@media (min-width: 960px) and (max-width: 1199px)": {
          padding: "16px",
          maxWidth: "680px",
        },
        "@media (min-width: 1200px)": {
          padding: "20px",
          maxWidth: "2000px",
          backgroundSize: "cover",
        },
        color: "white",
        textShadow: "2px 2px 4px rgba(0, 0, 0, 0.7)",
        animation: "fadeInBackground 2s ease-in-out",
        width: "100%",
      }}
    >
      <Box
        sx={{
          zIndex: 1,
          width: "auto",
          maxWidth: {
            xs: "100%",
            sm: "580px",
            md: "680px",
            lg: "750px",
          },
          animation: "fadeIn 2s ease-in-out",
          mb: 3,
          "@media (min-width: 960px)": {
            marginBottom: "8vh",
            marginLeft: "3vw",
          },
        }}
      >
        <Stack spacing={2} sx={{ alignItems: "center" }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleLoginClickOpen}
            sx={{
              backgroundColor: "rgba(0, 121, 107, 0.9)",
              "&:hover": {
                backgroundColor: "rgba(0, 77, 64, 0.9)",
                transform: "scale(1.05)",
              },
              transition: "all 0.3s ease-in-out",
              boxShadow: "0px 5px 15px rgba(0,0,0,0.3)",
              width: {
                xs: "50vw",
                sm: "50vw",
                md: "50vw",
                lg: "30vw",
              },
              margin: "0 auto",
              fontSize: {
                xs: "1rem",
                sm: "1.1rem",
                md: "1rem",
                lg: "1.2rem",
              },
              padding: {
                xs: "8px 16px",
                md: "10px 20px",
                lg: "12px 24px",
              },
            }}
          >
            시작하기
          </Button>
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255, 255, 255, 0.8)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            NUDGE에 오신 것을 환영합니다!
          </Typography>
        </Stack>
        {/* <Box sx={{ position: "absolute", top: 16, right: 16 }}>
          <Link to="/admin-login" style={{ textDecoration: "none" }}>
            <Button
              variant="text"
              color="secondary"
              size="small"
              startIcon={
                <img src={adminIcon} alt="관리자" width="16" height="16" />
              }
            ></Button>
          </Link>
        </Box> */}
      </Box>

      {/* 로그인 선택 다이얼로그 */}
      <Dialog open={loginOpen} onClose={handleLoginClose}>
        <DialogTitle>계정 유형을 선택하세요.</DialogTitle>
        <DialogContent>
          {/* <Typography gutterBottom>
            계정 유형을 선택하세요.
          </Typography> */}
          <Stack spacing={2}>
            <Button
              component={Link}
              to="/teacher-login"
              variant="contained"
              color="primary"
              fullWidth
              startIcon={
                <img src={teacherIcon} alt="교사" width="24" height="24" />
              }
              sx={{
                borderRadius: "20px",
                backgroundColor: "#00796b",
                "&:hover": {
                  backgroundColor: "#004d40",
                  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
                },
                transition: "all 0.3s ease",
              }}
            >
              교사
            </Button>
            <Button
              component={Link}
              to="/student-login"
              variant="contained"
              color="primary"
              fullWidth
              startIcon={
                <img src={studentIcon} alt="학생" width="24" height="24" />
              }
              sx={{
                borderRadius: "20px",
                backgroundColor: "#00796b",
                "&:hover": {
                  backgroundColor: "#004d40",
                  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
                },
                transition: "all 0.3s ease",
              }}
            >
              학생
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* 회원가입 선택 다이얼로그 */}
      <Dialog open={registerOpen} onClose={handleRegisterClose}>
        <DialogTitle>회원가입 유형 선택</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            회원가입할 계정 유형을 선택하세요.
          </Typography>
          <Stack spacing={2}>
            <Button
              component={Link}
              to="/teacher-register"
              variant="outlined"
              color="primary"
              fullWidth
              startIcon={
                <img src={teacherIcon} alt="교사" width="24" height="24" />
              }
              sx={{
                borderRadius: "20px",
                borderColor: "#00796b",
                color: "#00796b",
                "&:hover": {
                  borderColor: "#004d40",
                  color: "#004d40",
                  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
                },
                transition: "all 0.3s ease",
              }}
            >
              교사 회원가입
            </Button>
            <Button
              component={Link}
              to="/student-register"
              variant="outlined"
              color="primary"
              fullWidth
              startIcon={
                <img src={studentIcon} alt="학생" width="24" height="24" />
              }
              sx={{
                borderRadius: "20px",
                borderColor: "#00796b",
                color: "#00796b",
                "&:hover": {
                  borderColor: "#004d40",
                  color: "#004d40",
                  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
                },
                transition: "all 0.3s ease",
              }}
            >
              학생 회원가입
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Button
            onClick={() => {
              setRegisterOpen(false); // 회원가입 다이얼로그 닫기
              setLoginOpen(true); // 로그인 다이얼로그 열기
            }}
            sx={{
              borderRadius: "20px",
              color: "#1976d2",
              "&:hover": {
                color: "#115293",
              },
            }}
          >
            로그인
          </Button>
          <Button onClick={handleRegisterClose} color="secondary">
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// 애니메이션 정의 (전역 CSS에 포함)
const styles = `
  @keyframes fadeIn {
    0% { opacity: 0; transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes slideIn {
    0% { opacity: 0; transform: translateY(-20px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeInUp {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeInBackground {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
`;

document.head.insertAdjacentHTML("beforeend", `<style>${styles}</style>`);

export default HomePage;
