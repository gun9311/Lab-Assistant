import React, { useState, useEffect, useCallback } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import {
  CssBaseline,
  ThemeProvider,
  Snackbar,
  Alert,
  Box,
} from "@mui/material";
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
import { ChatbotProvider } from "./contexts/ChatbotContext";
import {
  NotificationProvider,
  useNotificationContext,
} from "./contexts/NotificationContext";
import { requestPermissionAndGetToken, onMessageListener } from "./firebase"; // 수정된 함수 import
import ManageQuizzesPage from "./components/teacher/quiz/ManageQuizzes"; // 주석 처리
import CreateQuizPage from "./components/teacher/quiz/CreateQuiz"; // 주석 처리
import EditQuizPage from "./components/teacher/quiz/EditQuiz"; // 주석 처리
import QuizSessionPage from "./components/teacher/quiz/QuizSession"; // 주석 처리
import StudentQuizSessionPage from "./components/student/quiz/StudentQuizSession";
import ForgotPasswordPage from "./pages/login/ForgotPasswordPage";
import ResetPasswordPage from "./pages/login/ResetPasswordPage";
import ResetStudentPasswordPage from "./pages/login/ResetStudentPasswordPage";
import axios from "axios";
import ComingSoon from "./components/common/ComingSoon"; // ComingSoon 임포트 추가
import ServiceUnavailable from "./components/ServiceUnavailable"; // 새로 만든 컴포넌트 import
import NotFoundPage from "./pages/NotFoundPage"; // 404 페이지 임포트
import ServerErrorPage from "./pages/ServerErrorPage"; // 500 에러 페이지 임포트
import api from "./utils/api"; // 인증된 API 요청용 인스턴스 (또는 apiNoAuth 사용)
import QnAListPage from "./components/teacher/qna/QnAListPage";
import CreateQuestionPage from "./components/teacher/qna/CreateQuestionPage";
import QuestionDetailPage from "./components/teacher/qna/QuestionDetailPage";
import AdminQnAPage from "./components/admin/qna/AdminQnAPage";
import EditQuestionPage from "./components/teacher/qna/EditQuestionPage";

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

// 서버 시간 상태 확인 함수 (API 호출 방식으로 변경)
const checkServerTimeAvailability = async (): Promise<boolean> => {
  try {
    // 백엔드의 시간 상태 확인 API 호출
    const response = await api.get("/time/status");
    // API 응답에서 isAvailable 값 반환
    return response.data.isAvailable;
  } catch (error: any) {
    console.error("Error checking server time availability:", error);
    // API 호출 실패 시 (네트워크, 서버 오류, 인증 오류 등)
    // 안전하게 서비스 이용 불가로 간주
    return false;
  }
};

// 학생 전용 라우트를 감싸는 컴포넌트 (시간 체크 포함)
const StudentRouteGuard: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  // 시간 체크 로직 시작 - 임시 비활성화
  const [isServiceAvailable, setIsServiceAvailable] = useState<boolean | null>(
    null
  ); // null: 로딩 중

  const checkAvailability = useCallback(async () => {
    const available = await checkServerTimeAvailability();
    setIsServiceAvailable(available);
  }, []);

  useEffect(() => {
    checkAvailability();
    // 선택적: 주기적으로 시간 상태 다시 확인 (예: 1분마다)
    const intervalId = setInterval(checkAvailability, 3600 * 1000);
    return () => clearInterval(intervalId);
  }, [checkAvailability]);

  if (isServiceAvailable === null) {
    // 로딩 상태 표시 (선택적)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <p>시간 확인 중...</p>
      </Box>
    );
  }

  return isServiceAvailable ? children : <ServiceUnavailable />;
  // 시간 체크 로직 끝 - 임시 비활성화

  // 시간 체크 로직 비활성화 시 항상 children 렌더링
  // return children;
};

const AppContent: React.FC = () => {
  const [notification, setNotification] = useState<NotificationPayload | null>(
    null
  );
  const { addNotification } = useNotificationContext();
  const role = getRole();
  const location = useLocation();

  // isQuizMode 상태를 추가
  const [isQuizMode, setIsQuizMode] = useState<boolean>(false);

  useEffect(() => {
    // 퀴즈 세션 관련 경로에서는 네비게이션 바를 숨김 (isQuizMode=true)
    const quizPaths = ["/start-quiz-session", "/quiz-session"];
    const inQuizPath = quizPaths.some((path) =>
      location.pathname.startsWith(path)
    );
    setIsQuizMode(inQuizPath);
  }, [location.pathname]);

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
              <PrivateRoute
                roles={["student"]}
                element={
                  <StudentRouteGuard>
                    <StudentHomePage />
                  </StudentRouteGuard>
                }
              />
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
          <Route
            path="/profile"
            element={
              role === "student" ? (
                <PrivateRoute
                  roles={["student", "teacher"]}
                  element={
                    <StudentRouteGuard>
                      <ProfilePage />
                    </StudentRouteGuard>
                  }
                />
              ) : (
                <PrivateRoute
                  roles={["student", "teacher"]}
                  element={<ProfilePage />}
                />
              )
            }
          />
          <Route
            path="/notifications"
            element={
              role === "student" ? (
                <PrivateRoute
                  roles={["student", "teacher"]}
                  element={
                    <StudentRouteGuard>
                      <NotificationsPage />
                    </StudentRouteGuard>
                  }
                />
              ) : (
                <PrivateRoute
                  roles={["student", "teacher"]}
                  element={<NotificationsPage />}
                />
              )
            }
          />
          <Route
            path="/my-quizzes"
            // element={<MyQuizzesPage setIsQuizMode={setIsQuizMode} />} // 기존 컴포넌트 주석 처리
            element={
              <PrivateRoute
                roles={["student"]}
                element={
                  <StudentRouteGuard>
                    <ComingSoon />
                  </StudentRouteGuard>
                }
              />
            }
          />
          <Route
            path="/manage-quizzes"
            element={
              <PrivateRoute
                roles={["teacher"]}
                // element={<ManageQuizzesPage />} // 기존 컴포넌트 주석 처리
                element={<ComingSoon />} // ComingSoon 컴포넌트로 대체
              />
            }
          />
          <Route path="/create-quiz" element={<CreateQuizPage />} />{" "}
          {/* 퀴즈 생성 페이지 주석 처리 */}
          <Route path="/edit-quiz/:quizId" element={<EditQuizPage />} />{" "}
          {/* 퀴즈 수정 페이지 주석 처리 */}
          <Route
            path="/start-quiz-session"
            element={<QuizSessionPage setIsQuizMode={setIsQuizMode} />} // 기존 컴포넌트 주석 처리
            // element={<ComingSoon />} // ComingSoon 컴포넌트로 대체
          />{" "}
          {/* 퀴즈 세션 페이지 */}
          <Route
            path="/quiz-session"
            element={
              <PrivateRoute
                roles={["student"]}
                element={<StudentQuizSessionPage />}
              />
            }
          />
          <Route
            path="/reset-student-password"
            element={
              <PrivateRoute
                roles={["teacher"]}
                element={<ResetStudentPasswordPage />}
              />
            }
          />
          {/* QnA 관련 라우트 (교사 전용) */}
          <Route
            path="/qna"
            element={
              <PrivateRoute roles={["teacher"]} element={<QnAListPage />} />
            }
          />
          <Route
            path="/qna/create"
            element={
              <PrivateRoute
                roles={["teacher"]}
                element={<CreateQuestionPage />}
              />
            }
          />
          <Route
            path="/qna/:id"
            element={
              <PrivateRoute
                roles={["teacher"]}
                element={<QuestionDetailPage />}
              />
            }
          />
          <Route
            path="/qna/edit/:id"
            element={
              <PrivateRoute
                roles={["teacher"]}
                element={<EditQuestionPage />}
              />
            }
          />
          {/* 관리자 QnA 관리 라우트 */}
          <Route
            path="/admin/qna"
            element={
              <PrivateRoute roles={["admin"]} element={<AdminQnAPage />} />
            }
          />
          {/* 일치하는 경로가 없을 경우 404 페이지 표시 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        {/* 서버 오류 페이지 라우트 */}
        <Route path="/server-error" element={<ServerErrorPage />} />
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
          {/* 서버 오류 페이지 라우트 (비로그인 시)*/}
          <Route path="/server-error" element={<ServerErrorPage />} />
          {/* 모든 다른 경로를 /로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </ThemeProvider>
  );
};

export default App;
