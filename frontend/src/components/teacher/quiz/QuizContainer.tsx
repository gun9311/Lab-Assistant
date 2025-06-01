import React, { useState, useEffect } from "react";
import { Box, Snackbar, Divider } from "@mui/material";
import OverviewPanel from "./slides/OverviewPanel";
import QuizSlide from "./slides/QuizSlide";
import ReviewSlide from "./slides/ReviewSlide";
import SlideNavigation from "./slides/SlideNavigation";
import ImageUploadDialog from "./ImageUploadDialog";
import QuestionListPanel from "./slides/QuestionListPanel";
import { Question } from "./types";
import { initialQuestion } from "./utils";
import { getUnits, createQuiz, updateQuiz } from "../../../utils/quizApi";
import { getSubjects } from "../../../utils/api";
import { useNavigate } from "react-router-dom";

interface QuizContainerProps {
  isEdit?: boolean;
  initialData?: any;
  isReadOnly?: boolean; // 읽기 전용 모드 추가
  onStartQuiz?: () => void; // 퀴즈 시작 핸들러 추가
  onEditQuiz?: () => void; // 퀴즈 편집 핸들러 추가
}

const QuizContainer: React.FC<QuizContainerProps> = ({
  isEdit = false,
  initialData,
  isReadOnly = false,
  onStartQuiz,
  onEditQuiz,
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initialData?.title || "");
  const [grade, setGrade] = useState(initialData?.grade || "");
  const [semester, setSemester] = useState(initialData?.semester || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [unit, setUnit] = useState(initialData?.unit || "");
  const [units, setUnits] = useState<string[]>([]);
  const [quizImage, setQuizImage] = useState<File | null>(null);
  const [quizImageUrl, setQuizImageUrl] = useState(initialData?.imageUrl || "");

  // 초기 데이터가 있을 경우 correctAnswer를 숫자로 변환
  const processedInitialQuestions = initialData?.questions
    ? initialData.questions.map((q: any) => ({
        ...q,
        // correctAnswer를 숫자로 변환합니다.
        // MongoDB에서 문자열로 오므로, 프론트엔드 타입(number)에 맞춥니다.
        correctAnswer:
          q.correctAnswer !== undefined &&
          q.correctAnswer !== null &&
          !isNaN(Number(q.correctAnswer))
            ? Number(q.correctAnswer)
            : -1, // 변환 실패 시 또는 값이 없을 경우 기본값 -1
        options: q.options.map((opt: any) => ({
          // 옵션도 imageUrl, image 필드 확인
          text: opt.text || "",
          imageUrl: opt.imageUrl || "",
          image: opt.image || null,
        })),
        // 문제 자체의 image와 imageUrl도 확인
        image: q.image || null,
        imageUrl: q.imageUrl || "",
      }))
    : [initialQuestion];

  const [questions, setQuestions] = useState<Question[]>(
    processedInitialQuestions
  );
  const [currentSlideIndex, setCurrentSlideIndex] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [isReviewSlide, setIsReviewSlide] = useState(false);
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
    setIsReviewSlide(currentSlideIndex > questions.length);
  }, [currentSlideIndex, questions.length]);

  useEffect(() => {
    fetchUnits();
    if (!isReadOnly) {
      fetchSubjects();
    }
  }, [grade, semester, subject, isReadOnly]);

  const fetchUnits = async () => {
    if (grade && semester && subject) {
      try {
        const { units: fetchedUnits } = await getUnits(
          grade,
          semester,
          subject
        );
        setUnits(fetchedUnits);
      } catch (error) {
        setError("단원 목록을 가져오는 중 오류가 발생했습니다.");
      }
    } else {
      setUnits([]);
    }
  };

  const fetchSubjects = async () => {
    if (grade && semester) {
      try {
        const response = await getSubjects(parseInt(grade), [semester]);
        const fetchedSubjectsData = response.data;
        setSubjects(fetchedSubjectsData);
        if (subject && !fetchedSubjectsData.includes(subject)) {
          setSubject("");
          setUnit("");
        }
      } catch (error) {
        setError("과목 목록을 가져오는 중 오류가 발생했습니다.");
        setSubjects([]);
      }
    } else {
      setSubjects([]);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, initialQuestion]);
    setCurrentSlideIndex(questions.length + 1);
  };

  const updateQuestion = (index: number, updatedQuestion: Question) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = updatedQuestion;
    setQuestions(updatedQuestions);
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
    setCurrentSlideIndex(Math.max(1, currentSlideIndex - 1));
  };

  const moveToSlide = (index: number) => setCurrentSlideIndex(index);

  const reorderQuestions = (startIndex: number, endIndex: number) => {
    const reorderedQuestions = Array.from(questions);
    const [removed] = reorderedQuestions.splice(startIndex, 1);
    reorderedQuestions.splice(endIndex, 0, removed);
    setQuestions(reorderedQuestions);
  };

  const saveQuiz = async () => {
    if (!title.trim()) {
      setError("퀴즈 제목을 입력해주세요.");
      return;
    }
    if (!grade) {
      setError("학년을 선택해주세요.");
      return;
    }
    if (!semester) {
      setError("학기를 선택해주세요.");
      return;
    }
    if (!subject) {
      setError("과목을 선택해주세요.");
      return;
    }

    if (questions.length < 3) {
      setError("최소 3개 이상의 문제가 필요합니다.");
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        setError(`문제 ${i + 1}: 문제 내용을 입력해주세요.`);
        setCurrentSlideIndex(i + 1);
        return;
      }
      if (q.correctAnswer === -1) {
        setError(`문제 ${i + 1}: 정답을 설정해주세요.`);
        setCurrentSlideIndex(i + 1);
        return;
      }
      if (q.questionType === "multiple-choice") {
        const filledOptions = q.options.filter(
          (opt) => opt.text.trim() !== "" || opt.imageUrl || opt.image
        );
        if (filledOptions.length < 2) {
          setError(
            `문제 ${
              i + 1
            }: 객관식 선택지는 최소 2개 이상 입력해야 합니다 (내용 또는 이미지).`
          );
          setCurrentSlideIndex(i + 1);
          return;
        }
      }
      if (q.timeLimit <= 0) {
        setError(`문제 ${i + 1}: 시간 제한은 0보다 커야 합니다.`);
        setCurrentSlideIndex(i + 1);
        return;
      }
    }
    setError(null);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("grade", grade);
      formData.append("subject", subject);
      formData.append("semester", semester);
      formData.append("unit", unit);

      if (quizImage) formData.append("image", quizImage);
      else if (quizImageUrl) formData.append("imageUrl", quizImageUrl);

      const formattedQuestions = questions.map((question) => ({
        ...question,
        options: question.options.map((opt) => ({
          text: opt.text,
          imageUrl: opt.imageUrl || null,
          image: opt.image || null,
        })),
      }));

      formData.append("questions", JSON.stringify(formattedQuestions));

      questions.forEach((question, index) => {
        if (question.image)
          formData.append(`questionImages_${index}`, question.image);
        else if (question.imageUrl)
          formData.append(`questionImageUrls_${index}`, question.imageUrl);

        question.options.forEach((option, optionIndex) => {
          if (option.image)
            formData.append(
              `optionImages_${index}_${optionIndex}`,
              option.image
            );
          else if (option.imageUrl)
            formData.append(
              `optionImageUrls_${index}_${optionIndex}`,
              option.imageUrl
            );
        });
      });

      if (isEdit && initialData?._id) {
        await updateQuiz(initialData._id, formData);
      } else {
        await createQuiz(formData);
      }
      navigate("/manage-quizzes");
    } catch (error) {
      console.error("퀴즈 저장에 실패했습니다.", error);
    }
  };

  return (
    <Box>
      {/* 상단: 퀴즈 개요 패널 */}
      <Box sx={{ mb: 3 }}>
        <OverviewPanel
          title={title}
          setTitle={setTitle}
          grade={grade}
          setGrade={setGrade}
          semester={semester}
          setSemester={setSemester}
          subject={subject}
          setSubject={setSubject}
          subjects={subjects}
          unit={unit}
          setUnit={setUnit}
          units={units}
          quizImage={quizImage}
          quizImageUrl={quizImageUrl}
          setQuizImage={setQuizImage}
          setQuizImageUrl={setQuizImageUrl}
          setImageDialogOpen={setImageDialogOpen}
          isReadOnly={isReadOnly}
          onStartQuiz={onStartQuiz}
          onEditQuiz={onEditQuiz}
        />
      </Box>

      {/* 퀴즈 생성 화면 */}
      <Box display="flex">
        {/* 좌측 패널 */}
        <Box
          sx={{
            width: "260px",
            padding: "1.5rem",
            borderRight: "1px solid #ddd",
            backgroundColor: "#fafafa",
            borderRadius: "16px 0 0 16px",
            boxShadow: "2px 0 10px rgba(0, 0, 0, 0.05)",
            position: "sticky",
            top: "20px",
            maxHeight: "calc(100vh - 40px)",
            overflowY: "auto",
          }}
        >
          <QuestionListPanel
            questions={questions}
            currentSlideIndex={currentSlideIndex}
            moveToSlide={moveToSlide}
            reorderQuestions={reorderQuestions}
            goToReview={() => setCurrentSlideIndex(questions.length + 1)}
            isReviewSlide={isReviewSlide}
            isReadOnly={isReadOnly}
          />
        </Box>

        {/* 중앙 패널 */}
        <Box
          sx={{
            flex: 1,
            padding: "2rem",
            backgroundColor: "#ffffff",
            boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
            borderRadius: "8px",
            marginX: "1rem",
          }}
        >
          {currentSlideIndex <= questions.length ? (
            <QuizSlide
              question={questions[currentSlideIndex - 1]}
              questionIndex={currentSlideIndex - 1}
              updateQuestion={updateQuestion}
              removeQuestion={removeQuestion}
              isReadOnly={isReadOnly}
            />
          ) : (
            <ReviewSlide
              questions={questions}
              addQuestion={addQuestion}
              moveToSlide={moveToSlide}
              isReadOnly={isReadOnly}
            />
          )}

          <SlideNavigation
            currentSlideIndex={currentSlideIndex}
            totalSlides={questions.length + 1}
            setCurrentSlideIndex={setCurrentSlideIndex}
            addQuestion={addQuestion}
            saveQuiz={saveQuiz}
            isReviewSlide={currentSlideIndex > questions.length}
            isReadOnly={isReadOnly}
          />
        </Box>
      </Box>

      {/* 이미지 업로드 다이얼로그 */}
      <ImageUploadDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onImageChange={(file) => {
          setQuizImage(file);
          setQuizImageUrl("");
        }}
        onImageUrlChange={(url) => {
          setQuizImageUrl(url);
          setQuizImage(null);
        }}
        imageFile={quizImage}
        imageUrl={quizImageUrl}
      />

      {error && (
        <Snackbar
          open={true}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          message={error}
          sx={{
            backgroundColor: "#e57373",
            color: "#ffffff",
            fontWeight: "bold",
            borderRadius: "8px",
          }}
        />
      )}
    </Box>
  );
};

export default QuizContainer;
