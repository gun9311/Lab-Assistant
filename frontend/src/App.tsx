import React, { useState, useEffect } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { CssBaseline, ThemeProvider, Snackbar, Alert } from "@mui/material";
import HomePage from "./pages/home/HomePage";
import TeacherRegisterPage from "./pages/register/TeacherRegisterPage";
import StudentRegisterPage from "./pages/register/StudentRegisterPage";
import AdminRegisterPage from "./pages/register/AdminRegisterPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import MyQuizzesPage from "./components/student/quiz/MyQuizzesPage";
import {
  getToken,
  getRole,
  clearAuth,
  getRefreshToken,
  setToken,
} from "./utils/auth";
import { jwtDecode, JwtPayload } from "jwt-decode";
import StudentHomePage from "./pages/home/StudentHomePage";
import TeacherHomePage from "./pages/home/TeacherHomePage";
import AdminHomePage from "./pages/home/AdminHomePage";
import AdminLoginPage from "./pages/login/AdminLoginPage";
import TeacherLoginPage from "./pages/login/TeacherLoginPage";
import GoogleCallback from "./pages/login/GoogleCallback";
import StudentLoginPage from "./pages/login/StudentLoginPage";
import theme from "./theme";
import Layout from "./components/Layout";
import { ChatbotProvider } from "./context/ChatbotContext";
import {
  NotificationProvider,
  useNotificationContext,
} from "./context/NotificationContext";
// Firebase import
import { requestPermissionAndGetToken, onMessageListener } from "./firebase"; // 수정된 함수 import
import ManageQuizzesPage from "./components/teacher/quiz/ManageQuizzes";
import CreateQuizPage from "./components/teacher/quiz/CreateQuiz";
import EditQuizPage from "./components/teacher/quiz/EditQuiz";
import QuizSessionPage from "./components/teacher/quiz/QuizSession";
import StudentQuizSessionPage from "./components/student/quiz/StudentQuizSession";
import ForgotPasswordPage from "./pages/login/ForgotPasswordPage";
import ResetPasswordPage from "./pages/login/ResetPasswordPage";
import ResetStudentPasswordPage from "./pages/login/ResetStudentPasswordPage";
import axios from "axios";

// NotificationPayload 타입 정의
type NotificationPayload = {
  notification: {
    title: string;
    body: string;
  };
  data?: {
    notificationId?: string;
  };
};

const isTokenValid = (token: string): boolean => {
  if (!token) return false;

  const decoded = jwtDecode<JwtPayload>(token);
  const currentTime = Date.now() / 1000;

  return decoded.exp! > currentTime;
};

type PrivateRouteProps = {
  element: React.ReactElement;
  roles: string[];
};

const PrivateRoute: React.FC<PrivateRouteProps> = ({ element, roles }) => {
  const [isTokenChecked, setIsTokenChecked] = useState(false);
  const [currentToken, setCurrentToken] = useState(getToken());

  useEffect(() => {
    const checkToken = async () => {
      if (currentToken && !isTokenValid(currentToken)) {
        const newToken = await refreshAccessToken();
        setCurrentToken(newToken);
      }
      setIsTokenChecked(true);
    };
    checkToken();
  }, [currentToken]);

  if (!isTokenChecked) {
    return null; // 로딩 상태를 표시할 수 있습니다.
  }

  const role = getRole();
  return role && roles.includes(role) ? element : <RedirectToHome />;
};

const RedirectToHome: React.FC = () => {
  useEffect(() => {
    window.location.href = "/";
  }, []);

  return null;
};

const AppContent: React.FC = () => {
  const [notification, setNotification] = useState<NotificationPayload | null>(
    null
  );
  const { addNotification } = useNotificationContext();
  const role = getRole();

  // isQuizMode 상태를 추가
  const [isQuizMode, setIsQuizMode] = useState<boolean>(false);

  useEffect(() => {
    onMessageListener()
      .then((payload) => {
        console.log("Message received. ", payload);
        setNotification(payload as NotificationPayload);

        addNotification({
          _id: payload.data.notificationId,
          title: payload.notification.title,
          body: payload.notification.body,
          read: false,
        });
      })
      .catch((err) =>
        console.log("Failed to receive foreground message ", err)
      );
  }, [addNotification]);

  return (
    <>
      <Routes>
        {role && (
          <>
            <Route path="/admin-login" element={<Navigate to={`/${role}`} />} />
            <Route
              path="/teacher-login"
              element={<Navigate to={`/${role}`} />}
            />
            <Route
              path="/student-login"
              element={<Navigate to={`/${role}`} />}
            />
            <Route
              path="/teacher-register"
              element={<Navigate to={`/${role}`} />}
            />
            <Route
              path="/student-register"
              element={<Navigate to={`/${role}`} />}
            />
            <Route
              path="/admin-register"
              element={<Navigate to={`/${role}`} />}
            />
          </>
        )}
        <Route path="/" element={<Navigate to={`/${role}`} />} />
        <Route path="/home" element={<Navigate to={`/${role}`} />} />

        <Route element={<Layout isQuizMode={isQuizMode} />}>
          {/* isQuizMode 전달 */}
          <Route
            path="/student"
            element={
              <PrivateRoute roles={["student"]} element={<StudentHomePage />} />
            }
          />
          <Route
            path="/teacher"
            element={
              <PrivateRoute roles={["teacher"]} element={<TeacherHomePage />} />
            }
          />
          <Route
            path="/admin"
            element={
              <PrivateRoute roles={["admin"]} element={<AdminHomePage />} />
            }
          />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route
            path="/my-quizzes"
            element={<MyQuizzesPage setIsQuizMode={setIsQuizMode} />} // isQuizMode를 설정하는 함수 전달
          />
          <Route
            path="/manage-quizzes"
            element={
              <PrivateRoute
                roles={["teacher"]}
                element={<ManageQuizzesPage />}
              />
            }
          />
          <Route path="/create-quiz" element={<CreateQuizPage />} />{" "}
          {/* 퀴즈 생성 페이지 */}
          <Route path="/edit-quiz/:quizId" element={<EditQuizPage />} />
          <Route
            path="/start-quiz-session"
            element={<QuizSessionPage setIsQuizMode={setIsQuizMode} />}
          />{" "}
          {/* 퀴즈 세션 페이지 */}
          <Route
            path="/quiz-session"
            element={<StudentQuizSessionPage />}
          />{" "}
          {/* 학생 퀴즈 세션 페이지 */}
          <Route
            path="/reset-student-password"
            element={
              <PrivateRoute
                roles={["teacher"]}
                element={<ResetStudentPasswordPage />}
              />
            }
          />
        </Route>
        {/* 모든 다른 경로를 /로 리다이렉트 */}
        <Route path="*" element={<RedirectToHome />} />
      </Routes>

      {notification && (
        <Snackbar
          open={true}
          autoHideDuration={2000}
          onClose={() => setNotification(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          sx={{
            marginBottom: {
              xs: "15%",
              sm: "10%",
              md: "7%",
              lg: "5%",
            },
            ".MuiSnackbarContent-root": {
              backgroundColor: "#323232",
              color: "#ffffff",
              borderRadius: "8px",
              padding: "8px 16px",
              fontSize: {
                xs: "1rem",
                sm: "1rem",
                md: "1rem",
                lg: "1.125rem",
              },
            },
          }}
        >
          <Alert onClose={() => setNotification(null)} severity="info">
            {notification.notification.title}: {notification.notification.body}
          </Alert>
        </Snackbar>
      )}
    </>
  );
};

const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  try {
    const { data } = await axios.post(
      `${process.env.REACT_APP_API_URL}/auth/refresh-token`,
      { refreshToken }
    );
    setToken(data.accessToken);
    return data.accessToken;
  } catch (error) {
    clearAuth();
    return null;
  }
};

const App: React.FC = () => {
  const [isTokenFound, setTokenFound] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    console.log("firebase 권한 확인 및 요청");
    requestPermissionAndGetToken(setTokenFound);

    const checkToken = async () => {
      let token = getToken();
      if (token && !isTokenValid(token)) {
        token = await refreshAccessToken();
      }
      setIsLoggedIn(token ? isTokenValid(token) : false);
    };

    checkToken();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {isLoggedIn ? (
        <NotificationProvider>
          <ChatbotProvider>
            <AppContent />
          </ChatbotProvider>
        </NotificationProvider>
      ) : (
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/teacher-login" element={<TeacherLoginPage />} />
          <Route path="/student-login" element={<StudentLoginPage />} />
          <Route path="/teacher-register" element={<TeacherRegisterPage />} />
          <Route path="/student-register" element={<StudentRegisterPage />} />
          <Route path="/admin-register" element={<AdminRegisterPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          {/* 모든 다른 경로를 /로 리다이렉트 */}
          <Route path="*" element={<RedirectToHome />} />
        </Routes>
      )}
    </ThemeProvider>
  );
};

export default App;
