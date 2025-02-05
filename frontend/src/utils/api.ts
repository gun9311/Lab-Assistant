import axios from "axios";
import { getToken, setToken, getRefreshToken, clearAuth } from "./auth";
import { SubjectData, UnitData, RatingData, QuizData } from "./types"; // RatingData 추가

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
export const getSubjects = () => api.get("/subjects");
export const addUnitRating = (ratingData: RatingData) =>
  api.post("/subjects/add-unit-rating", ratingData);
export const addQuiz = (quizData: QuizData) => api.post("/quiz", quizData);

export default api;
