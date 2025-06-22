import React, { useEffect, useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Container,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Avatar,
  CircularProgress,
} from "@mui/material";
import {
  Home,
  Person,
  Notifications,
  Quiz,
  Logout,
  CheckCircle,
  Done,
  NotificationsActive,
  HelpOutline,
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { useChatbotContext } from "../contexts/ChatbotContext";
import {
  useNotificationContext,
  Notification,
} from "../contexts/NotificationContext";
import { clearAuth, getUserId } from "../utils/auth";
import logo from "../assets/nudge-navlogo.png";
import apiNoAuth from "../utils/apiNoAuth";

const Navbar: React.FC<{ role: string; isQuizMode: boolean }> = ({
  role,
  isQuizMode,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isChatbotActive, setAlertOpen } = useChatbotContext();
  const {
    notifications,
    markAllAsRead,
    markAsRead,
    hasMore,
    loadMoreNotifications,
    isLoading,
  } = useNotificationContext();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  // 현재 선택된 메뉴 값을 저장하는 상태
  const [value, setValue] = useState(0);
  // 퀴즈 진행 중 페이지 이동 제한 다이얼로그
  const [openDialog, setOpenDialog] = useState(false);
  // 프로필 메뉴를 위한 앵커 엘리먼트
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  // 로그아웃 확인 다이얼로그 상태
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  // 알림 메뉴 앵커 엘리먼트
  const [notificationAnchorEl, setNotificationAnchorEl] =
    useState<null | HTMLElement>(null);
  const notificationOpen = Boolean(notificationAnchorEl);

  const clearTeacherFilters = () => {
    sessionStorage.removeItem("teacherHomePageState");
  };

  const handleNotificationItemClick = (notification: Notification) => {
    markAsRead(notification._id);
    handleNotificationClose();

    if (notification.type === "qna_answer" && notification.data?.questionId) {
      navigate(`/qna/${notification.data.questionId}`);
    } else if (notification.type === "report_generated") {
      sessionStorage.setItem("teacherHomePageTab", "reports");
      navigate("/teacher");
    } else {
      navigate("/notifications");
    }
  };

  // 현재 경로에 따라 선택된 메뉴 설정
  useEffect(() => {
    switch (location.pathname) {
      case "/student":
      case "/teacher":
      case "/admin":
        setValue(0);
        break;
      case "/my-quizzes":
        setValue(1);
        break;
      case "/manage-quizzes":
      case "/create-quiz":
        setValue(2);
        break;
      case "/notifications":
        setValue(3);
        break;
      case "/profile":
        setValue(4);
        break;
      default:
        if (location.pathname.startsWith("/edit-quiz")) {
          setValue(2);
        } else {
          setValue(0);
        }
        break;
    }
  }, [location.pathname]);

  // 메뉴 변경 핸들러 (퀴즈 진행 중, 챗봇 활성 시 이동 제한)
  const handleChange = (newValue: number) => {
    if (isChatbotActive) {
      setAlertOpen(true);
      return;
    }

    if (isQuizMode) {
      // 퀴즈 진행 중에는 페이지 이동 제한
      setOpenDialog(true);
      return;
    }

    clearTeacherFilters();
    setValue(newValue);
    switch (newValue) {
      case 0:
        if (role === "student") {
          navigate("/student");
        } else if (role === "teacher") {
          navigate("/teacher");
        } else if (role === "admin") {
          navigate("/admin");
        } else {
          navigate("/");
        }
        break;
      case 1:
        if (role === "student") {
          navigate("/my-quizzes");
        }
        break;
      case 2:
        if (role === "teacher") {
          navigate("/manage-quizzes");
        }
        break;
      case 3:
        navigate("/notifications");
        break;
      case 4:
        navigate("/profile");
        break;
      default:
        break;
    }
  };

  // 홈 버튼 라벨 반환 (사용자 역할에 따라 다름)
  const getHomeLabel = () => {
    switch (role) {
      case "student":
        return "T-BOT";
      case "teacher":
        return "홈";
      case "admin":
      default:
        return "홈";
    }
  };

  // 읽지 않은 알림 개수 계산
  const unreadNotificationsCount = notifications.filter(
    (notification) => !notification.read
  ).length;

  // 프로필 버튼 클릭 시 메뉴 열기
  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // 로그아웃 버튼 클릭 시 로그아웃 확인 다이얼로그 열기
  const handleLogoutClick = () => {
    setLogoutDialogOpen(true);
  };

  // 로그아웃 요청
  const confirmLogout = async () => {
    try {
      const userId = getUserId();
      await apiNoAuth.post("/auth/logout", { userId });
      clearAuth();
      window.location.href = "/home";
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  // 알림 아이콘 클릭 시
  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    if (isDesktop) {
      setNotificationAnchorEl(event.currentTarget);
    } else {
      navigate("/notifications");
    }
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  return (
    <>
      {isDesktop ? (
        // 데스크탑 버전: 상단 AppBar
        <AppBar
          position="static"
          sx={{
            backgroundColor: "#ffffff",
            color: "#333",
            boxShadow: "none",
            marginTop: "15px",
            height: "35px",
          }}
        >
          <Container maxWidth="xl">
            <Toolbar
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                minHeight: "5.5vh",
              }}
            >
              {/* 왼쪽: 로고와 브랜드 이름 및 네비게이션 버튼 */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <img
                  src={logo}
                  alt="로고"
                  style={{ height: 40, marginRight: 8 }}
                  onClick={() => {
                    clearTeacherFilters();
                    navigate("/");
                  }}
                />
                {/* 네비게이션 버튼 */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2.5,
                    marginLeft: 3,
                  }}
                >
                  <Button
                    onClick={() => handleChange(0)}
                    sx={{
                      fontSize: "17px",
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontWeight: value === 0 ? 700 : 480,
                      color: value === 0 ? "#333333 " : "#666666",
                      position: "relative",
                      padding: "8px 12px",
                      transition: "all 0.3s ease",
                      textTransform: "none",
                      "&:hover": {
                        backgroundColor: "transparent",
                        color: "#333333",
                        "&::after": {
                          width: "100%",
                          opacity: 0.5,
                        },
                      },
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        bottom: 0,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: value === 0 ? "4px" : "0",
                        height: "4px",
                        borderRadius: "50%",
                        background:
                          value === 0
                            ? "linear-gradient(90deg, #26A69A, #80CBC4)"
                            : "transparent",
                        transition: "all 0.3s ease",
                        opacity: value === 0 ? 1 : 0,
                      },
                    }}
                  >
                    {getHomeLabel()}
                  </Button>
                  {role === "student" && (
                    <Button
                      onClick={() => handleChange(1)}
                      sx={{
                        fontSize: "17px",
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontWeight: value === 1 ? 700 : 480,
                        color: value === 1 ? "#333333" : "#666666",
                        position: "relative",
                        padding: "8px 12px",
                        transition: "all 0.3s ease",
                        textTransform: "none",
                        "&:hover": {
                          backgroundColor: "transparent",
                          color: "#333333",
                          "&::after": {
                            width: "100%",
                            opacity: 0.5,
                          },
                        },
                        "&::after": {
                          content: '""',
                          position: "absolute",
                          bottom: 0,
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: value === 1 ? "4px" : "0",
                          height: "4px",
                          borderRadius: "50%",
                          background:
                            value === 1
                              ? "linear-gradient(90deg, #26A69A, #80CBC4)"
                              : "transparent",
                          transition: "all 0.3s ease",
                          opacity: value === 1 ? 1 : 0,
                        },
                      }}
                    >
                      퀴즈
                    </Button>
                  )}
                  {role === "teacher" && (
                    <Button
                      onClick={() => handleChange(2)}
                      sx={{
                        fontSize: "17px",
                        fontFamily: "'Noto Sans KR', sans-serif",
                        fontWeight: value === 2 ? 700 : 480,
                        color: value === 2 ? "#333333" : "#666666",
                        position: "relative",
                        padding: "8px 12px",
                        transition: "all 0.3s ease",
                        textTransform: "none",
                        "&:hover": {
                          backgroundColor: "transparent",
                          color: "#333333",
                          "&::after": {
                            width: "100%",
                            opacity: 0.5,
                          },
                        },
                        "&::after": {
                          content: '""',
                          position: "absolute",
                          bottom: 0,
                          left: "50%",
                          transform: "translateX(-50%)",
                          width: value === 2 ? "4px" : "0",
                          height: "4px",
                          borderRadius: "50%",
                          background:
                            value === 2
                              ? "linear-gradient(90deg, #26A69A, #80CBC4)"
                              : "transparent",
                          transition: "all 0.3s ease",
                          opacity: value === 2 ? 1 : 0,
                        },
                      }}
                    >
                      퀴즈
                    </Button>
                  )}
                </Box>
              </Box>
              {/* 오른쪽: QnA, 알림 및 프로필 */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {/* 교사용 QnA 버튼 */}
                {role === "teacher" && (
                  <IconButton
                    onClick={() => {
                      clearTeacherFilters();
                      navigate("/qna");
                    }}
                    aria-label="문의하기"
                    sx={{
                      transition: "all 0.2s ease",
                      "&:hover": { transform: "scale(1.1)" },
                    }}
                  >
                    <HelpOutline sx={{ fontSize: 28 }} />
                  </IconButton>
                )}

                {/* 관리자용 QnA 관리 버튼 */}
                {role === "admin" && (
                  <IconButton
                    onClick={() => navigate("/admin/qna")}
                    aria-label="QnA 관리"
                    sx={{
                      transition: "all 0.2s ease",
                      "&:hover": { transform: "scale(1.1)" },
                    }}
                  >
                    <HelpOutline sx={{ fontSize: 28 }} />
                  </IconButton>
                )}

                <IconButton
                  onClick={handleNotificationClick}
                  aria-label="알림"
                  sx={{
                    transition: "all 0.2s ease",
                    "&:hover": { transform: "scale(1.1)" },
                  }}
                >
                  <Badge
                    badgeContent={unreadNotificationsCount}
                    color="secondary"
                  >
                    <Notifications sx={{ fontSize: 28 }} />
                  </Badge>
                </IconButton>
                <IconButton
                  onClick={handleProfileClick}
                  aria-label="프로필"
                  sx={{
                    transition: "all 0.2s ease",
                    "&:hover": { transform: "scale(1.1)" },
                  }}
                >
                  <Avatar alt="프로필" sx={{ width: 40, height: 40 }}>
                    {role === "admin" ? "A" : role === "teacher" ? "T" : "S"}
                  </Avatar>
                </IconButton>
              </Box>
            </Toolbar>
          </Container>
        </AppBar>
      ) : (
        // 모바일 버전: 하단 BottomNavigation
        <BottomNavigation
          value={value}
          onChange={(event, newValue) => handleChange(newValue)}
          showLabels
          sx={{
            position: "fixed",
            bottom: 0,
            width: "100%",
            zIndex: 1000,
            paddingLeft: 0,
            paddingRight: 0,
            boxSizing: "border-box",
          }}
        >
          <BottomNavigationAction label={getHomeLabel()} icon={<Home />} />
          {role === "student" && (
            <BottomNavigationAction label="퀴즈" icon={<Quiz />} />
          )}
          {role === "teacher" && (
            <BottomNavigationAction label="퀴즈" icon={<Quiz />} />
          )}
          <BottomNavigationAction
            label="알림"
            icon={
              <Badge badgeContent={unreadNotificationsCount} color="secondary">
                <Notifications />
              </Badge>
            }
          />
          <BottomNavigationAction label="프로필" icon={<Person />} />
        </BottomNavigation>
      )}

      {/* 알림 드롭다운 메뉴 */}
      <Menu
        anchorEl={notificationAnchorEl}
        open={notificationOpen}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: "400px",
            p: 1,
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
            borderRadius: "16px",
          },
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1, px: 1 }}
        >
          <Typography variant="h6" sx={{ fontWeight: "bold", color: "#333" }}>
            알림
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="small"
            startIcon={<CheckCircle />}
            onClick={() => {
              markAllAsRead();
              handleNotificationClose();
            }}
            sx={{
              backgroundColor: "#4CAF50",
              borderRadius: "16px",
              textTransform: "none",
              fontSize: "0.75rem",
            }}
          >
            모두 읽음
          </Button>
        </Box>
        {notifications.length === 0 ? (
          <Typography sx={{ p: 2, color: "#757575" }}>
            새로운 알림이 없습니다.
          </Typography>
        ) : (
          <>
            {notifications.map((notification) => (
              <MenuItem
                key={notification._id}
                onClick={() => handleNotificationItemClick(notification)}
                sx={{
                  mb: 1,
                  borderRadius: "12px",
                  backgroundColor: notification.read ? "#f5f5f5" : "#e0f7fa",
                  "&:hover": {
                    backgroundColor: notification.read ? "#e0e0e0" : "#b2ebf2",
                  },
                  transition: "background-color 0.2s ease",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                }}
              >
                <ListItemIcon>
                  <Badge
                    color="secondary"
                    variant="dot"
                    invisible={notification.read}
                  >
                    {notification.read ? (
                      <Done sx={{ color: "#81c784" }} />
                    ) : (
                      <NotificationsActive sx={{ color: "#039be5" }} />
                    )}
                  </Badge>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: notification.read ? "normal" : "bold",
                        color: notification.read ? "#757575" : "#000",
                        wordBreak: "break-word",
                      }}
                    >
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      sx={{
                        color: notification.read ? "#9e9e9e" : "#424242",
                        wordBreak: "break-word",
                      }}
                    >
                      {notification.body}
                    </Typography>
                  }
                />
              </MenuItem>
            ))}
            {hasMore && (
              <Box display="flex" justifyContent="center" mt={1} mb={1}>
                <Button
                  onClick={loadMoreNotifications}
                  disabled={isLoading}
                  variant="outlined"
                  size="small"
                  startIcon={isLoading ? <CircularProgress size={16} /> : null}
                  sx={{
                    borderRadius: "16px",
                    textTransform: "none",
                    fontSize: "0.75rem",
                  }}
                >
                  {isLoading ? "로딩 중..." : "더 보기"}
                </Button>
              </Box>
            )}
          </>
        )}
      </Menu>

      {/* 프로필 드롭다운 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          onClick={() => {
            clearTeacherFilters();
            navigate("/profile");
            handleClose();
          }}
        >
          <ListItemIcon>
            <Person sx={{ fontSize: 18 }} />
          </ListItemIcon>
          내 프로필
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleLogoutClick();
            handleClose();
          }}
        >
          <ListItemIcon>
            <Logout sx={{ fontSize: 18 }} />
          </ListItemIcon>
          로그아웃
        </MenuItem>
      </Menu>

      {/* 퀴즈 진행 중 페이지 이동 제한 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>퀴즈 진행 중</DialogTitle>
        <DialogContent>
          <DialogContentText>
            퀴즈 진행 중에는 페이지를 이동할 수 없습니다. 퀴즈를 먼저
            제출해주세요.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            확인
          </Button>
        </DialogActions>
      </Dialog>

      {/* 로그아웃 확인 다이얼로그 */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
      >
        <DialogTitle>확인</DialogTitle>
        <DialogContent>
          <DialogContentText>로그아웃 하시겠습니까?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)} color="primary">
            취소
          </Button>
          <Button onClick={confirmLogout} color="primary">
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Navbar;
