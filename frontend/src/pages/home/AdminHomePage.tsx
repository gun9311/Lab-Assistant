import React from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Paper,
} from "@mui/material";
import {
  HelpOutline as QnAIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import AddThings from "../../components/admin/AddThings";
import LogoutButton from "../../components/auth/LogoutButton";
import AdminStudentList from "../../components/admin/AdminStudentList";
import AdminTeacherList from "../../components/admin/AdminTeacherList";

const AdminHomePage: React.FC = () => {
  const navigate = useNavigate();

  const adminMenuItems = [
    {
      title: "QnA 관리",
      description: "교사들의 질문을 관리하고 답변을 제공합니다",
      icon: <QnAIcon sx={{ fontSize: 40, color: "primary.main" }} />,
      path: "/admin/qna",
      color: "primary.50",
    },
    {
      title: "학생 관리",
      description: "학생 계정을 관리합니다",
      icon: <PeopleIcon sx={{ fontSize: 40, color: "info.main" }} />,
      path: "#students",
      color: "info.50",
    },
    {
      title: "교사 관리",
      description: "교사 계정을 관리합니다",
      icon: <SchoolIcon sx={{ fontSize: 40, color: "success.main" }} />,
      path: "#teachers",
      color: "success.50",
    },
    {
      title: "콘텐츠 추가",
      description: "과목, 단원, 퀴즈 등을 추가합니다",
      icon: <AddIcon sx={{ fontSize: 40, color: "warning.main" }} />,
      path: "#add-content",
      color: "warning.50",
    },
  ];

  const handleCardClick = (path: string) => {
    if (path.startsWith("/")) {
      navigate(path);
    } else {
      // 스크롤 이동 (기존 컴포넌트로)
      const element = document.querySelector(path);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          관리자 대시보드
        </Typography>
        <Typography variant="body1" color="text.secondary">
          시스템 전반을 관리하고 모니터링할 수 있습니다.
        </Typography>
      </Box>

      {/* 메뉴 카드들 */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {adminMenuItems.map((item, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: "100%",
                cursor: "pointer",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 4,
                },
              }}
              onClick={() => handleCardClick(item.path)}
            >
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Box
                  sx={{
                    bgcolor: item.color,
                    borderRadius: 2,
                    p: 2,
                    mb: 2,
                    display: "inline-block",
                  }}
                >
                  {item.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 기존 컴포넌트들 */}
      <Box id="add-content" sx={{ mb: 6 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            콘텐츠 추가
          </Typography>
          <AddThings />
        </Paper>
      </Box>

      <Box id="students" sx={{ mb: 6 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            학생 관리
          </Typography>
          <AdminStudentList />
        </Paper>
      </Box>

      <Box id="teachers" sx={{ mb: 6 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            교사 관리
          </Typography>
          <AdminTeacherList />
        </Paper>
      </Box>

      <Box sx={{ textAlign: "center", mt: 4 }}>
        <LogoutButton />
      </Box>
    </Container>
  );
};

export default AdminHomePage;
