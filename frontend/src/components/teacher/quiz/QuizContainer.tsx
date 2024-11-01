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
import { getUnits, createQuiz } from "../../../utils/quizApi";
import { useNavigate } from "react-router-dom";

const QuizContainer: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("");
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState("");
  const [units, setUnits] = useState<string[]>([]);
  const [quizImage, setQuizImage] = useState<File | null>(null);
  const [quizImageUrl, setQuizImageUrl] = useState("");
  const [questions, setQuestions] = useState<Question[]>([initialQuestion]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  const fetchUnits = async () => {
    if (grade && semester && subject) {
      try {
        const { units: fetchedUnits } = await getUnits(grade, semester, subject);
        setUnits(fetchedUnits);
      } catch (error) {
        setError("단원 목록을 가져오는 중 오류가 발생했습니다.");
      }
    } else {
      setUnits([]);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, [grade, semester, subject]);

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
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("grade", grade);
      formData.append("subject", subject);
      formData.append("semester", semester);
      formData.append("unit", unit);
      
      if (quizImage) formData.append("image", quizImage);
      else if (quizImageUrl) formData.append("imageUrl", quizImageUrl);

      const formattedQuestions = questions.map((question, index) => ({
        ...question,
        options: question.options.map((opt) => ({
          text: opt.text,
          imageUrl: opt.imageUrl || null,
          image: opt.image || null,
        })),
      }));

      formData.append("questions", JSON.stringify(formattedQuestions));

      questions.forEach((question, index) => {
        if (question.image) formData.append(`questionImages_${index}`, question.image);
        else if (question.imageUrl) formData.append(`questionImageUrls_${index}`, question.imageUrl);
      
        question.options.forEach((option, optionIndex) => {
          if (option.image) formData.append(`optionImages_${index}_${optionIndex}`, option.image);
          else if (option.imageUrl) formData.append(`optionImageUrls_${index}_${optionIndex}`, option.imageUrl);
        });
      });

      await createQuiz(formData);
      navigate("/manage-quizzes");
      console.log("퀴즈가 성공적으로 생성되었습니다.");
    } catch (error) {
      console.error("퀴즈 생성에 실패했습니다.", error);
    }
  };

  return (
    <Box display="flex">
      {/* 좌측 패널 */}
      <Box
        sx={{
          width: "260px",
          padding: "1.5rem",
          borderRight: "1px solid #ddd",     // 경계선 색상 조정
          backgroundColor: "#fafafa",         // 패널 배경색 변경
          borderRadius: "16px 0 0 16px",
          boxShadow: "2px 0 10px rgba(0, 0, 0, 0.05)",
          position: "sticky",
          top: "20px",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto"
        }}
      >
        <OverviewPanel
          title={title}
          setTitle={setTitle}
          grade={grade}
          setGrade={setGrade}
          semester={semester}
          setSemester={setSemester}
          subject={subject}
          setSubject={setSubject}
          unit={unit}
          setUnit={setUnit}
          units={units}
          quizImage={quizImage}
          quizImageUrl={quizImageUrl}
          setQuizImage={setQuizImage}
          setQuizImageUrl={setQuizImageUrl}
          setImageDialogOpen={setImageDialogOpen}
        />
      </Box>

      {/* 가운데: 문제 슬라이드 */}
      <Box
        sx={{
          flex: 1,
          padding: "2rem",
          backgroundColor: "#ffffff",         // 슬라이드 영역 배경색 설정
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
          borderRadius: "8px",
          marginX: "1rem"
        }}
      >
        {currentSlideIndex <= questions.length ? (
          <QuizSlide
            question={questions[currentSlideIndex - 1]}
            questionIndex={currentSlideIndex - 1}
            updateQuestion={updateQuestion}
            removeQuestion={removeQuestion}
          />
        ) : (
          <ReviewSlide
            questions={questions}
            addQuestion={addQuestion}
            saveQuiz={saveQuiz}
            moveToSlide={moveToSlide}
          />
        )}
        
        <SlideNavigation
          currentSlideIndex={currentSlideIndex}
          totalSlides={questions.length + 1}
          setCurrentSlideIndex={setCurrentSlideIndex}
          addQuestion={addQuestion}
          saveQuiz={saveQuiz}
          isReviewSlide={currentSlideIndex > questions.length}
        />
      </Box>

      {/* 우측 패널 */}
      <Box
        sx={{
          width: "260px",
          padding: "1.5rem",
          borderLeft: "1px solid #ddd",       // 경계선 색상 조정
          backgroundColor: "#fafafa",         // 패널 배경색 변경
          borderRadius: "0 16px 16px 0",
          boxShadow: "-2px 0 10px rgba(0, 0, 0, 0.05)",
          position: "sticky",
          top: "20px",
          maxHeight: "calc(100vh - 40px)",
          overflowY: "auto"
        }}
      >
        <QuestionListPanel
          questions={questions}
          currentSlideIndex={currentSlideIndex}
          moveToSlide={moveToSlide}
          reorderQuestions={reorderQuestions}
          goToReview={() => setCurrentSlideIndex(questions.length + 1)}
        />
      </Box>

      {/* 이미지 업로드 다이얼로그 */}
      <ImageUploadDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onImageChange={(file) => { setQuizImage(file); setQuizImageUrl(""); }}
        onImageUrlChange={(url) => { setQuizImageUrl(url); setQuizImage(null); }}
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
            borderRadius: "8px"
          }}
        />
      )}
    </Box>
  );
};

export default QuizContainer;
