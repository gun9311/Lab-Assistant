import api from './api';

// // 퀴즈 목록 가져오기 API 호출
// export const getQuizzes = async () => {
//   try {
//     const response = await api.get('/kahoot-quiz/list');
//     return response.data;
//   } catch (error) {
//     console.error("퀴즈 목록 가져오기에 실패했습니다.", error);
//     return [];
//   }
// };

interface GetQuizzesParams {
  page: number;
  limit: number;
  gradeFilter?: number | null;
  semesterFilter?: string | null;
  subjectFilter?: string | null;
  unitFilter?: string | null;
  sortBy?: string; // 정렬 기준 추가
  createdBy?: string; // 생성자 필터 추가
}

export const getQuizzes = async (params: GetQuizzesParams) => {
  try {
    const response = await api.get('/kahoot-quiz/list', {
      params: {
        page: params.page,
        limit: params.limit,
        gradeFilter: params.gradeFilter || undefined,
        semesterFilter: params.semesterFilter || undefined,
        subjectFilter: params.subjectFilter || undefined,
        unitFilter: params.unitFilter || undefined,
        sortBy: params.sortBy || 'latest', // 기본값 'latest' 설정
        createdBy: params.createdBy || undefined, // 생성자 필터 추가
      },
    });
    return response.data;
  } catch (error) {
    console.error("퀴즈 목록 가져오기에 실패했습니다.", error);
    return { quizzes: [], totalCount: 0 };
  }
};

// 퀴즈 삭제 API 호출
export const deleteQuiz = async (quizId: string) => {
  try {
    await api.delete(`/kahoot-quiz/${quizId}`);
  } catch (error) {
    console.error(`퀴즈 삭제에 실패했습니다: ${quizId}`, error);
  }
};


// 퀴즈 생성 API 호출
export const createQuiz = async (quizData: FormData) => {
    try {
      // API 호출
      const response = await api.post('/kahoot-quiz/create', quizData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      return response.data;
    } catch (error) {
      console.error('퀴즈 생성 요청 실패', error);
      throw error;
    }
  };

// 퀴즈 수정 API 호출
export const updateQuiz = async (quizId: string, quizData: FormData) => {
  return await api.put(`/kahoot-quiz/${quizId}`, quizData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const duplicateQuiz = async (quizId: string) => {
  try {
    const response = await api.post(`/kahoot-quiz/duplicate/${quizId}`);
  return response.data;
  } catch (error) {
    console.error(`퀴즈 복제에 실패했습니다: ${quizId}`, error);
    throw error;
  }
};

  // 특정 퀴즈 가져오기 API 호출
export const getQuizById = async (quizId: string) => {
    try {
      const response = await api.get(`/kahoot-quiz/${quizId}`);
      return response.data;
    } catch (error) {
      console.error(`퀴즈 가져오기에 실패했습니다: ${quizId}`, error);
      throw error;
    }
  };

  // 단원 목록 가져오기 API 호출 (학년, 학기, 과목 기반)
export const getUnits = async (grade: string, semester: string, subject: string) => {
    try {
      const response = await api.get('/subjects/units', {
        params: { grade, semester, subject },
      });
      return response.data;
    } catch (error) {
      console.error('단원 목록 가져오기에 실패했습니다.', error);
      throw error;
    }
  };
  