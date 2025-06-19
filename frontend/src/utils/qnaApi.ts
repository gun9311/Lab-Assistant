import api from "./api";

// QnA 관련 인터페이스 정의
export interface QnAQuestion {
  _id: string;
  title: string;
  content: string;
  category: "기술문제" | "계정문제" | "기능문의" | "퀴즈관련" | "기타";
  priority: "낮음" | "보통" | "높음" | "긴급";
  status: "대기중" | "답변완료" | "해결됨";
  author: {
    _id: string;
    name: string;
    email: string;
    school: string;
  };
  authorName: string;
  authorSchool: string;
  answer?: string;
  answeredBy?: {
    _id: string;
    name: string;
  };
  answeredAt?: string;
  isPrivate: boolean;
  attachments: string[];
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QnAListResponse {
  questions: QnAQuestion[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasMore: boolean;
  };
}

export interface QnAStatistics {
  overview: {
    total: number;
    unanswered: number;
    answered: number;
    resolved: number;
    recent7Days: number;
  };
  categoryStats: Array<{
    _id: string;
    count: number;
  }>;
  priorityStats: Array<{
    _id: string;
    count: number;
  }>;
  schoolStats: Array<{
    _id: string;
    count: number;
  }>;
}

export interface GetQuestionsParams {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  priority?: string;
  school?: string;
  search?: string;
  sortBy?: "latest" | "oldest" | "priority" | "status";
  viewType?: "all" | "my";
}

export interface CreateQuestionData {
  title: string;
  content: string;
  category: string;
  priority: string;
  isPrivate?: boolean;
  attachments?: string[];
}

export interface UpdateQuestionData {
  title: string;
  content: string;
  category: string;
  priority: string;
  isPrivate?: boolean;
  attachments?: string[];
}

// === API 함수들 ===

// 질문 목록 조회
export const getQuestions = async (
  params: GetQuestionsParams = {}
): Promise<QnAListResponse> => {
  try {
    const response = await api.get("/qna", {
      params: {
        page: params.page || 1,
        limit: params.limit || 10,
        status: params.status || undefined,
        category: params.category || undefined,
        priority: params.priority || undefined,
        school: params.school || undefined,
        search: params.search || undefined,
        sortBy: params.sortBy || "latest",
        viewType: params.viewType || "all",
      },
    });
    return response.data;
  } catch (error) {
    console.error("질문 목록 조회에 실패했습니다:", error);
    throw error;
  }
};

// 질문 상세 조회
export const getQuestionById = async (id: string): Promise<QnAQuestion> => {
  try {
    const response = await api.get(`/qna/${id}`);
    return response.data;
  } catch (error) {
    console.error(`질문 조회에 실패했습니다 (ID: ${id}):`, error);
    throw error;
  }
};

// 질문 생성 (교사 전용)
export const createQuestion = async (
  questionData: CreateQuestionData
): Promise<{ message: string; qna: QnAQuestion }> => {
  try {
    const response = await api.post("/qna", questionData);
    return response.data;
  } catch (error) {
    console.error("질문 생성에 실패했습니다:", error);
    throw error;
  }
};

// 질문 수정 (교사 전용)
export const updateQuestion = async (
  id: string,
  questionData: UpdateQuestionData
): Promise<{ message: string; question: QnAQuestion }> => {
  try {
    const response = await api.put(`/qna/${id}`, questionData);
    return response.data;
  } catch (error) {
    console.error(`질문 수정에 실패했습니다 (ID: ${id}):`, error);
    throw error;
  }
};

// 질문 삭제 (교사 전용)
export const deleteQuestion = async (
  id: string
): Promise<{ message: string }> => {
  try {
    const response = await api.delete(`/qna/${id}`);
    return response.data;
  } catch (error) {
    console.error(`질문 삭제에 실패했습니다 (ID: ${id}):`, error);
    throw error;
  }
};

// 답변 작성 (관리자 전용)
export const answerQuestion = async (
  id: string,
  answer: string
): Promise<{ message: string; question: QnAQuestion }> => {
  try {
    const response = await api.post(`/qna/${id}/answer`, { answer });
    return response.data;
  } catch (error) {
    console.error(`답변 작성에 실패했습니다 (ID: ${id}):`, error);
    throw error;
  }
};

// 질문 상태 변경 (교사용)
export const markQuestionAsResolved = async (
  id: string
): Promise<{ message: string; question: QnAQuestion }> => {
  try {
    const response = await api.patch(`/qna/${id}/resolve`, {
      status: "해결됨",
    });
    return response.data;
  } catch (error) {
    console.error(`질문 해결 표시에 실패했습니다 (ID: ${id}):`, error);
    throw error;
  }
};

// 관리자용 상태 변경은 기존 함수 유지
export const updateQuestionStatus = async (
  id: string,
  status: string
): Promise<{ message: string; question: QnAQuestion }> => {
  try {
    const response = await api.patch(`/qna/${id}/status`, { status });
    return response.data;
  } catch (error) {
    console.error(`상태 변경에 실패했습니다 (ID: ${id}):`, error);
    throw error;
  }
};

// QnA 통계 조회 (관리자 전용)
export const getQnAStatistics = async (): Promise<QnAStatistics> => {
  try {
    const response = await api.get("/qna/admin/statistics");
    return response.data;
  } catch (error) {
    console.error("QnA 통계 조회에 실패했습니다:", error);
    throw error;
  }
};

// 헬퍼 함수들
export const getStatusColor = (status: string): string => {
  switch (status) {
    case "대기중":
      return "#f57c00"; // orange
    case "답변완료":
      return "#1976d2"; // blue
    case "해결됨":
      return "#388e3c"; // green
    default:
      return "#757575"; // grey
  }
};

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case "긴급":
      return "#d32f2f"; // red
    case "높음":
      return "#f57c00"; // orange
    case "보통":
      return "#1976d2"; // blue
    case "낮음":
      return "#388e3c"; // green
    default:
      return "#757575"; // grey
  }
};

export const getCategoryIcon = (category: string): string => {
  switch (category) {
    case "기술문제":
      return "🔧";
    case "계정문제":
      return "👤";
    case "기능문의":
      return "❓";
    case "퀴즈관련":
      return "📝";
    case "기타":
      return "💬";
    default:
      return "💬";
  }
};
