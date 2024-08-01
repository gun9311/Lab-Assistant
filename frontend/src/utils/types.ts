export interface SubjectData {
  _id?: string;
  name: string;
  grade: number;
  semester: string;
  units: { name: string }[]; // 혹은 string[]
}

export interface UnitData {
  subject: string; // 여기에 subjectId 대신 subject를 사용합니다.
  units: string[];
}

export interface AdminStudentData {
  _id: string;
  name: string;
  grade: number;
  class: string;
  studentId: string;
  school: string;
}

export interface AdminTeacherData {
  _id: string;
  name: string;
  email: string;
  school: string;
  phone?: string;
}

export interface RatingData {
  subjectId: string;
  unitName: string;
  ratingLevel: string;
  comment: string;
}

export interface TaskData {
  taskText: string;
  correctAnswer: string;
}

export interface QuizData {
  subjectId: string;
  unitName: string;
  tasks: TaskData[];
}


