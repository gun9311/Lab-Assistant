import React, { useState } from 'react';
import { Button, Typography, Box, Container, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';
import background from '../../assets/background.png';
import adminIcon from '../../assets/admin-icon.png';

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
      maxWidth="sm"
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backgroundImage: `url(${background})`,
        backgroundSize: {
          xs: 'contain',  // 모바일에서는 이미지 크기를 contain으로 설정
          sm: 'cover',    // 태블릿 이상에서는 cover로 설정
        },
        backgroundPosition: 'center center',
        textAlign: 'center',
        paddingBottom: 4,
        paddingTop: {
          xs: 2,  // 모바일에서 상단 여백 추가
          sm: 0,  // 태블릿 이상에서는 기본 값
        },
        '@media (max-width: 600px)': {
          backgroundPosition: 'top center',
        },
        color: 'white',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
        animation: 'fadeInBackground 2s ease-in-out',
      }}
    >
      <Box
        sx={{
          zIndex: 1,
          width: '100%',
          animation: 'fadeIn 2s ease-in-out',  // 버튼 등장 애니메이션 추가
          mb: 3,  // margin-bottom 값을 줄여서 살짝 위로 이동
        }}
      >
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleLoginClickOpen}
            sx={{
              backgroundColor: 'rgba(0, 121, 107, 0.9)',
              '&:hover': {
                backgroundColor: 'rgba(0, 77, 64, 0.9)',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.3s ease-in-out',
              boxShadow: '0px 5px 15px rgba(0,0,0,0.3)',
              width: '70%',  // 로그인 버튼 길이 조정
              margin: '0 auto',  // 중앙 정렬
            }}
          >
            T-BOT 시작하기
          </Button>
          <MuiLink
            component="button"
            onClick={handleRegisterClickOpen}
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'underline',  // 밑줄 추가
              textAlign: 'right',  // 오른쪽 정렬
              marginRight: 2,  // 여백 추가
              '&:hover': {
                color: 'white',
              },
            }}
          >
            아직 회원이 아니신가요?
          </MuiLink>
        </Stack>
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <Link to="/admin-login" style={{ textDecoration: 'none' }}>
            <Button
              variant="text"
              color="secondary"
              size="small"
              startIcon={
                <img src={adminIcon} alt="관리자" width="16" height="16" />
              }
            >
            </Button>
          </Link>
        </Box>
      </Box>

      {/* 로그인 선택 다이얼로그 */}
      <Dialog open={loginOpen} onClose={handleLoginClose}>
        <DialogTitle>로그인 유형 선택</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            로그인할 계정 유형을 선택하세요.
          </Typography>
          <Stack spacing={2}>
            <Button
              component={Link}
              to="/teacher-login"
              variant="contained"
              color="primary"
              fullWidth
            >
              교사 로그인
            </Button>
            <Button
              component={Link}
              to="/student-login"
              variant="contained"
              color="primary"
              fullWidth
            >
              학생 로그인
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleLoginClose} color="secondary">
            닫기
          </Button>
        </DialogActions>
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
            >
              교사 회원가입
            </Button>
            <Button
              component={Link}
              to="/student-register"
              variant="outlined"
              color="primary"
              fullWidth
            >
              학생 회원가입
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
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
