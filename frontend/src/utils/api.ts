import axios from "axios";
import { getToken, setToken, getRefreshToken, clearAuth } from "./auth";
import { SubjectData, UnitData, RatingData, QuizData } from "./types"; // RatingData 추가

// ChatUsageData 인터페이스 정의 (선택적이지만 권장)
export interface ChatUsageData {
  dailyLimit: number;
  monthlyLimit: number;
  dailyCount: number;
  monthlyCount: number;
  dailyRemaining: number;
  monthlyRemaining: number;
}

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getToken(); // 최신 토큰을 가져옵니다.
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = getRefreshToken();

      try {
        const { data } = await axios.post(
          `${process.env.REACT_APP_API_URL}/auth/refresh-token`,
          { refreshToken }
        );
        setToken(data.accessToken);
        console.log(data.accessToken);
        originalRequest.headers["Authorization"] = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearAuth();
        window.location.href = "/home";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const addSubject = (subjectData: SubjectData) =>
  api.post("/subjects/add-subject", subjectData);
export const addUnits = (unitData: UnitData) =>
  api.post("/subjects/add-units", unitData);
export const getAllSubjects = () => api.get("/subjects/all");
export const addUnitRating = (ratingData: RatingData) =>
  api.post("/subjects/add-unit-rating", ratingData);
export const addQuiz = (quizData: QuizData) => api.post("/quiz", quizData);

// --- 추가된 함수 ---
export const getChatUsage = (): Promise<{ data: ChatUsageData }> =>
  api.get("/users/chat-usage");

// getSubjects 함수 수정: grade와 semester 파라미터 추가
export const getSubjects = (
  grade?: number | null,
  semesters?: string[] | null // 여러 학기를 문자열 배열로 받음
): Promise<{ data: string[] }> => {
  // 반환 타입을 string[]로 명시
  let params: any = {};
  if (grade) {
    params.grade = grade;
  }
  if (semesters && semesters.length > 0) {
    // 여러 학기를 쉼표로 구분된 문자열로 변환
    params.semester = semesters.join(",");
  }
  return api.get("/subjects", { params });
};

// 평어 수정 함수 추가
export const updateReportComment = (
  reportId: string,
  comment: string
): Promise<{ data: any }> => // data 타입을 실제 반환 타입에 맞게 수정할 수 있음
  api.put(`/report/comment/${reportId}`, { comment });

// --- 추가된 함수 끝 ---

export default api;
