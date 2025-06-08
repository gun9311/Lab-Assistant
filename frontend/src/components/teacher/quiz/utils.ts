import { Question } from "./types";

export const initialQuestion: Question = {
  questionText: "",
  questionType: "multiple-choice",
  timeLimit: 30,
  correctAnswer: -1,
  options: [
    { text: "", imageUrl: "", image: null },
    { text: "", imageUrl: "", image: null },
  ],
  image: null,
  imageUrl: "",
};