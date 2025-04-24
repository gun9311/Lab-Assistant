import React, { useState, useEffect } from "react";
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
  Paper,
  MobileStepper,
} from "@mui/material";
import { Link } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import backgroundLogo4 from "../../assets/nudge-background-logo4.png";
import adminIcon from "../../assets/admin-icon.png";
import studentIcon from "../../assets/student-icon.png";
import teacherIcon from "../../assets/teacher-icon.png";

const HomePage = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  const tutorialSteps = [
    {
      lottieSrc:
        "https://lottie.host/a3d6c1b3-9f05-4344-9979-d94c9c0962a0/XaXJnOIszd.lottie",
      description:
        "학생 맞춤형 AI 챗봇과 함께하세요.\n안전한 환경과 간편한 모니터링을 제공합니다.",
    },
    {
      lottieSrc:
        "https://lottie.host/81c669e8-198c-4843-a98b-af3c3fd18636/H8vDucmkpi.lottie",
      description:
        "교실이 즐거워지는 실시간 퀴즈!\n편리하게 동료 교사들과 자료를 공유해 보세요.",
    },
    {
      lottieSrc:
        "https://lottie.host/35ec8ec8-40ba-49a7-a1d5-8ef2198c1521/hMol44ecSD.lottie",
      description:
        "원 클릭! 퀴즈 결과를 분석하여\n작성되는 교과별 평어로 업무 부담을 줄여보세요.",
    },
  ];
  const maxSteps = tutorialSteps.length;

  const handleNext = () => {
    setActiveStep((prevActiveStep) => (prevActiveStep + 1) % maxSteps);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      handleNext();
    }, 6000);
    return () => {
      clearInterval(interval);
    };
  }, [activeStep, maxSteps]);

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

  const handleStepChange = (step: number) => {
    setActiveStep(step);
  };

  return (
    <Container
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: { xs: "column", md: "column" },
        alignItems: {
          xs: "center",
          sm: "center",
          md: "center",
        },
        justifyContent: {
          xs: "flex-end",
          sm: "flex-end",
          md: "center",
        },
        pt: { xs: 8, sm: 10, md: 0 },
        pb: { xs: 3, sm: 4 },
        background: {
          xs: `url(${backgroundLogo4})`,
          sm: `url(${backgroundLogo4})`,
          md: "linear-gradient(to bottom, #FFF8E1, #E0F2F7)",
        },
        backgroundSize: { xs: "cover", sm: "cover", md: "auto" },
        backgroundPosition: {
          xs: "center center",
          sm: "center center",
          md: "initial",
        },
        padding: 0,
        width: "100%",
        color: { xs: "white", sm: "white", md: "initial" },
        textShadow: {
          xs: "2px 2px 4px rgba(0, 0, 0, 0.7)",
          sm: "2px 2px 4px rgba(0, 0, 0, 0.7)",
          md: "none",
        },
        animation: "fadeInBackground 2s ease-in-out",
        "@media (max-width: 600px)": {
          backgroundSize: "auto 100%",
          backgroundPosition: "center center",
        },
      }}
      maxWidth={false}
      disableGutters
    >
      <Box
        sx={{
          display: { xs: "none", md: "block" },
          textAlign: "center",
          color: "#004D40",
          mb: { md: 5 },
          width: { md: "auto" },
          mt: { md: "10vh" },
          overflow: "hidden",
        }}
      >
        <Typography
          variant="h5"
          component="h2"
          sx={{
            fontWeight: 400,
            fontSize: { md: "1.8rem" },
            mb: 1.5,
            animation: "fadeInUp 1.2s ease-out",
            animationFillMode: "backwards",
          }}
        >
          Discover Learning's Joy with
        </Typography>
        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontWeight: 700,
            fontSize: { md: "5.5rem", lg: "6rem" },
            lineHeight: 1.1,
            animation: "fadeInUp 1.2s ease-out",
            animationDelay: "0.3s",
            animationFillMode: "backwards",
          }}
        >
          NUDGE!
        </Typography>
      </Box>
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          alignItems: "center",
          zIndex: 1,
          width: "100%",
          maxWidth: {
            md: "550px",
            lg: "600px",
          },
          animation: "fadeIn 2s ease-in-out 0.5s",
          animationFillMode: "backwards",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: { md: "40vh", lg: "50vh", xl: "45vh" },
            mb: 2,
          }}
        >
          <Paper
            square
            elevation={3}
            sx={{
              position: "relative",
              bgcolor: "rgba(255, 255, 255, 0.7)",
              borderRadius: 2,
              color: "#37474F",
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              px: 2,
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <Box
              sx={{
                height: { md: "40%", lg: "45%", xl: "50%" },
                width: "95%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mt: 1,
              }}
            >
              <DotLottieReact
                src={tutorialSteps[activeStep].lottieSrc}
                loop
                autoplay
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "100%",
                }}
              />
            </Box>
            <Typography
              variant="body1"
              sx={{
                textAlign: "center",
                width: "100%",
                fontSize: { md: "1rem", lg: "1.1rem", xl: "1.2rem" },
                lineHeight: 1.5,
                mt: { md: 1, lg: 1, xl: 1.5 },
                flexShrink: 0,
                whiteSpace: "pre-line",
                color: "inherit",
              }}
            >
              {tutorialSteps[activeStep].description}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleLoginClickOpen}
              sx={{
                mt: { md: 2.5, lg: 1, xl: 3 },
                mb: 5,
                backgroundColor: "#00796b",
                "&:hover": {
                  backgroundColor: "#004d40",
                  transform: "scale(1.05)",
                },
                transition: "all 0.3s ease-in-out",
                boxShadow: "0px 5px 15px rgba(0,0,0,0.2)",
                px: { md: 4, lg: 5 },
                py: { md: 1.5, lg: 1.75 },
                fontSize: { md: "1rem", lg: "1.1rem" },
                borderRadius: "12px",
                color: "white",
              }}
            >
              시작하기
            </Button>
            <Stack
              direction="row"
              justifyContent="center"
              spacing={1}
              sx={{
                position: "absolute",
                bottom: 12,
                left: 0,
                right: 0,
              }}
            >
              {tutorialSteps.map((step, index) => (
                <Box
                  key={index}
                  component="button"
                  onClick={() => handleStepChange(index)}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor:
                      activeStep === index ? "#004D40" : "rgba(0, 0, 0, 0.3)",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    transition: "background-color 0.3s",
                    "&:hover": {
                      bgcolor:
                        activeStep === index ? "#00695f" : "rgba(0, 0, 0, 0.4)",
                    },
                  }}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </Stack>
          </Paper>
        </Box>
      </Box>
      <Box
        sx={{
          display: { xs: "flex", sm: "flex", md: "none" },
          flexDirection: "column",
          alignItems: "center",
          width: "90%",
          zIndex: 1,
          animation: "fadeIn 2s ease-in-out",
          pb: 4,
        }}
      >
        <Stack
          spacing={2}
          sx={{
            alignItems: "center",
            width: "100%",
          }}
        >
          <Button
            variant="contained"
            color="primary"
            onClick={handleLoginClickOpen}
            sx={{
              backgroundColor: "rgba(0, 121, 107, 0.9)",
              "&:hover": {
                backgroundColor: "rgba(0, 77, 64, 0.9)",
                transform: "scale(1.05)",
              },
              transition: "all 0.3s ease-in-out",
              boxShadow: "0px 5px 15px rgba(0,0,0,0.3)",
              width: "60vw",
              maxWidth: "300px",
              fontSize: "1rem",
              py: 1.5,
              borderRadius: "12px",
              color: "white",
            }}
          >
            시작하기
          </Button>
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255, 255, 255, 0.8)",
              textAlign: "center",
              mt: 1,
            }}
          >
            NUDGE에 오신 것을 환영합니다!
          </Typography>
        </Stack>
      </Box>
      <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 2 }}>
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
      </Box>
      <Dialog open={loginOpen} onClose={handleLoginClose}>
        <DialogTitle>계정 유형을 선택하세요.</DialogTitle>
        <DialogContent>
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
              setRegisterOpen(false);
              setLoginOpen(true);
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

const styles = `
  @keyframes fadeIn {
    0% { opacity: 0; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
  
  @keyframes slideIn {
    0% { opacity: 0; transform: translateY(-20px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeInUp {
    0% { opacity: 0; transform: translateY(30px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeInBackground {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
`;

document.head.insertAdjacentHTML("beforeend", `<style>${styles}</style>`);

export default HomePage;
