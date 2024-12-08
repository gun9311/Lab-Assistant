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

export type Quiz = {
    _id: string;
    title: string;
    unit: string;
    questionsCount: number;
    likeCount: number;
    grade: number;
    semester: string;
    subject: string;
    imageUrl?: string;
    userLiked: boolean;
    createdBy: string;
    createdAt: string;
  };  
  
