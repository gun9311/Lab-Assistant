import React, { useState, useEffect } from "react";
import { Box, Button, Snackbar } from "@mui/material";
import OverviewPanel from "./slides/OverviewPanel";
import QuizSlide from "./slides/QuizSlide";
import ReviewSlide from "./slides/ReviewSlide";
import SlideNavigation from "./slides/SlideNavigation";
import ImageUploadDialog from "./ImageUploadDialog";
import { Question } from "./types";
import { initialQuestion } from "./utils";
import { getUnits } from "../../../utils/quizApi";

const QuizContainer: React.FC = () => {
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("");
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState("");
  const [units, setUnits] = useState<string[]>([]);
  const [quizImage, setQuizImage] = useState<File | null>(null);
  const [quizImageUrl, setQuizImageUrl] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
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
    setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1));
  };

  const moveToSlide = (index: number) => setCurrentSlideIndex(index);

  const saveQuiz = () => {
    console.log("퀴즈 저장됨:", {
      title,
      grade,
      semester,
      subject,
      unit,
      quizImage,
      questions,
    });
  };

  return (
    <Box display="flex">
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
        questions={questions}
        currentSlideIndex={currentSlideIndex}
        moveToSlide={moveToSlide}
        quizImage={quizImage}
        quizImageUrl={quizImageUrl}
        setQuizImage={setQuizImage}         // 추가된 코드
        setQuizImageUrl={setQuizImageUrl}   // 추가된 코드
        setImageDialogOpen={setImageDialogOpen}
      />

      <Box flex="1">
        {currentSlideIndex === 0 ? (
          <Button variant="contained" onClick={addQuestion}>
            첫 번째 문제 추가
          </Button>
        ) : currentSlideIndex <= questions.length ? (
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
        />
      </Box>

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
        />
      )}
    </Box>
  );
};

export default QuizContainer;
