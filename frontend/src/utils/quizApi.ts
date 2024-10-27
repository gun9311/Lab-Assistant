import api from './api';

// 퀴즈 목록 가져오기 API 호출
export const getQuizzes = async () => {
  try {
    const response = await api.get('/kahoot-quiz/list');
    return response.data;
  } catch (error) {
    console.error("퀴즈 목록 가져오기에 실패했습니다.", error);
    return [];
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
  export const updateQuiz = async (id: string, updatedQuizData: any) => {
    try {
      const formData = new FormData();
      formData.append('title', updatedQuizData.title);
      formData.append('unit', updatedQuizData.unit);
  
      // 문제와 선택지 처리
      updatedQuizData.questions.forEach((question: any, index: number) => {
        formData.append(`questions[${index}][questionText]`, question.questionText);
        formData.append(`questions[${index}][correctAnswer]`, question.correctAnswer);
  
        // 선택지 추가
        question.options.forEach((option: string, optIndex: number) => {
          formData.append(`questions[${index}][options][${optIndex}]`, option);
        });
  
        // 새 이미지가 있으면 추가하고, 없으면 기존 이미지 URL 유지
        if (question.newImage) {
          formData.append(`questions[${index}][image]`, question.newImage);
        } else if (question.imageUrl) {
          formData.append(`questions[${index}][imageUrl]`, question.imageUrl);  // 기존 이미지 유지
        }
      });
  
      // API에 수정된 퀴즈 데이터 전송
      const response = await api.put(`/kahoot-quiz/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
  
      return response.data;
    } catch (error) {
      console.error('퀴즈 수정 요청 실패', error);
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
  