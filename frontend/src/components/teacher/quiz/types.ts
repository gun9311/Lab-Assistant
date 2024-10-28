export type Option = {
    text: string;
    imageUrl: string;
    image: File | null;
  };
  
  export type Question = {
    questionText: string;
    questionType: string;
    options: Option[];
    correctAnswer: number;
    image: File | null;
    imageUrl: string;
    timeLimit: number;
  };
  