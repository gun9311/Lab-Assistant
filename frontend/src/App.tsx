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
import { getToken, getRole, clearAuth } from "./utils/auth";
import { jwtDecode, JwtPayload } from "jwt-decode";
import StudentHomePage from "./pages/home/StudentHomePage";
import TeacherHomePage from "./pages/home/TeacherHomePage";
import AdminHomePage from "./pages/home/AdminHomePage";
import AdminLoginPage from "./pages/login/AdminLoginPage";
import TeacherLoginPage from "./pages/login/TeacherLoginPage";
import StudentLoginPage from "./pages/login/StudentLoginPage";
import theme from "./theme";
import Layout from "./components/Layout";
import { ChatbotProvider } from "./context/ChatbotContext";
import { NotificationProvider, useNotificationContext } from './context/NotificationContext';
// Firebase import
import { requestPermissionAndGetToken, onMessageListener } from './firebase'; // 수정된 함수 import

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
  const role = getRole();
  const token = getToken();
  if (token && !isTokenValid(token)) {
    clearAuth();
    return <Navigate to="/home" />;
  }
  return role && roles.includes(role) ? element : <Navigate to="/home" />;
};

const AppContent: React.FC = () => {
  const [notification, setNotification] = useState<NotificationPayload | null>(null);
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
      .catch((err) => console.log("Failed to receive foreground message ", err));
  }, [addNotification]);

  return (
    <>
      <Routes>
        {role && (
          <>
            <Route path="/admin-login" element={<Navigate to={`/${role}`} />} />
            <Route path="/teacher-login" element={<Navigate to={`/${role}`} />} />
            <Route path="/student-login" element={<Navigate to={`/${role}`} />} />
            <Route path="/teacher-register" element={<Navigate to={`/${role}`} />} />
            <Route path="/student-register" element={<Navigate to={`/${role}`} />} />
            <Route path="/admin-register" element={<Navigate to={`/${role}`} />} />
          </>
        )}
        <Route path="/" element={<Navigate to={`/${role}`} />} />
        <Route path="/home" element={<Navigate to={`/${role}`} />} />

        <Route element={<Layout isQuizMode={isQuizMode} />}>  {/* isQuizMode 전달 */}
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
            element={<MyQuizzesPage setIsQuizMode={setIsQuizMode} />}  // isQuizMode를 설정하는 함수 전달
          />
        </Route>
      </Routes>

      {notification && (
        <Snackbar
          open={true}
          autoHideDuration={2000}
          onClose={() => setNotification(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{ 
            marginBottom: {
              xs: '15%',
              sm: '10%',
              md: '7%',
              lg: '5%',
            },
            '.MuiSnackbarContent-root': { 
              backgroundColor: '#323232',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: {
                xs: '1rem',
                sm: '1rem',
                md: '1rem',
                lg: '1.125rem',
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

const App: React.FC = () => {
  const [isTokenFound, setTokenFound] = useState(false);

  useEffect(() => {
    console.log('firebase 권한 확인 및 요청');
    requestPermissionAndGetToken(setTokenFound);
  }, []);

  const token = getToken();
  console.log(token);
  const isLoggedIn = token ? isTokenValid(token) : false;
  console.log(isLoggedIn);

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
          </Routes>
      )}
    </ThemeProvider>
  );
};

export default App;
