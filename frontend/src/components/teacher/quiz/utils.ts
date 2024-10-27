import { Question } from "./types";

export const initialQuestion: Question = {
  questionText: "", // 빈 텍스트 필드
  questionType: "multiple-choice", // 기본 문제 유형을 선택형으로 설정
  options: [
    { text: "", imageUrl: "", image: null },
    { text: "", imageUrl: "", image: null },
    { text: "", imageUrl: "", image: null },
    { text: "", imageUrl: "", image: null },
  ],
  correctAnswer: -1, // 정답 미설정 상태
  image: null, // 문제 이미지 없음
  imageUrl: "", // 문제 이미지 URL 없음
};
