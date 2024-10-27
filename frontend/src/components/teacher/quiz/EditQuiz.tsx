import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getQuizById, updateQuiz } from "../../../utils/quizApi"; // API 호출 함수

type Option = {
  text: string;
  image?: File | null; // 선택지 이미지가 있을 수도 있고 없을 수도 있음
};

type Question = {
  questionText: string;
  options: Option[];
  correctAnswer: string;
  newImage?: File | null; // 새로운 이미지 파일
};

type QuizFormProps = {
  initialData: {
    title: string;
    unit: string;
    questions: Question[];
    id: string;
  };
  onSubmit: (id: string, updatedQuizData: any) => Promise<void>;
};

const QuizForm: React.FC<QuizFormProps> = ({ initialData, onSubmit }) => {
  const [title, setTitle] = useState(initialData.title);
  const [unit, setUnit] = useState(initialData.unit);
  const [questions, setQuestions] = useState<Question[]>(initialData.questions);

  const handleImageChange = (index: number, file: File) => {
    setQuestions((prevQuestions: Question[]) =>
      prevQuestions.map((q, i) => (i === index ? { ...q, newImage: file } : q))
    );
  };

  const handleOptionChange = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    setQuestions((prevQuestions: Question[]) =>
      prevQuestions.map((q, i) =>
        i === questionIndex
          ? {
              ...q,
              options: q.options.map((opt, optIdx) =>
                optIdx === optionIndex ? { ...opt, text: value } : opt
              ),
            }
          : q
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedData = {
      title,
      unit,
      questions,
    };

    try {
      await onSubmit(initialData.id, updatedData); // 퀴즈 수정 API 호출
      alert("퀴즈 수정 완료!");
    } catch (error) {
      console.error("퀴즈 수정에 실패했습니다.", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        type="text"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
      />

      {/* 문제 및 선택지 수정 UI */}
      {questions.map((question, index) => (
        <div key={index}>
          <input
            type="text"
            value={question.questionText}
            onChange={(e) =>
              setQuestions((prev) =>
                prev.map((q, i) =>
                  i === index ? { ...q, questionText: e.target.value } : q
                )
              )
            }
          />
          {/* 문제 이미지 업로드 */}
          <input
            type="file"
            onChange={(e) => handleImageChange(index, e.target.files![0])}
          />
          {/* 선택지 및 이미지 처리 */}
          {question.options.map((option, optIndex) => (
            <input
              key={optIndex}
              type="text"
              value={option.text}
              onChange={(e) =>
                handleOptionChange(index, optIndex, e.target.value)
              }
            />
          ))}
        </div>
      ))}

      <button type="submit">수정하기</button>
    </form>
  );
};

const EditQuizPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // URL에서 퀴즈 ID를 추출
  const [quizData, setQuizData] = useState<null | {
    title: string;
    unit: string;
    questions: Question[];
    id: string;
  }>(null);

  useEffect(() => {
    // 퀴즈 ID를 기반으로 기존 데이터 불러오기
    const fetchQuizData = async () => {
      if (id) {
        // id가 있는 경우에만 호출
        try {
          const data = await getQuizById(id); // 기존 퀴즈 데이터 가져오기
          setQuizData(data);
        } catch (error) {
          console.error("퀴즈 데이터를 가져오는 데 실패했습니다.", error);
        }
      }
    };

    fetchQuizData();
  }, [id]);

  // 퀴즈 데이터가 로드되기 전에는 로딩 상태 표시
  if (!quizData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* 기존 퀴즈 데이터를 수정할 수 있는 UI */}
      <QuizForm initialData={quizData} onSubmit={updateQuiz} />
    </div>
  );
};

export default EditQuizPage;
