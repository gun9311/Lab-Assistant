import React from "react";
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
import theme from "./theme"; // theme import
import Layout from "./components/Layout"; // layout import
import { ChatbotProvider } from "./context/ChatbotContext";

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

const App: React.FC = () => {
  const token = getToken();
  const role = getRole();

  const renderRedirect = () => {
    if (token && isTokenValid(token)) {
      if (role === "student") return <Navigate to="/student" />;
      if (role === "teacher") return <Navigate to="/teacher" />;
      if (role === "admin") return <Navigate to="/admin" />;
    }
    clearAuth();
    return <Navigate to="/home" />;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ChatbotProvider>
        <Routes>
          <Route path="/" element={renderRedirect()} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/teacher-login" element={<TeacherLoginPage />} />
          <Route path="/student-login" element={<StudentLoginPage />} />
          <Route path="/teacher-register" element={<TeacherRegisterPage />} />
          <Route path="/student-register" element={<StudentRegisterPage />} />
          <Route path="/admin-register" element={<AdminRegisterPage />} />
          <Route element={<Layout />}>
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
            <Route path="/my-quizzes" element={<MyQuizzesPage />} />
          </Route>
        </Routes>
      </ChatbotProvider>
    </ThemeProvider>
  );
};

export default App;
