import React, { useState, useEffect } from "react";
import { Box, Button, TextField, Typography, IconButton } from "@mui/material";
import { Add, Image } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { createQuiz, getUnits } from "../../../utils/quizApi";
import { Question } from "./types";
import { QuestionComponent } from "./QuestionComponent";
import { ImageUploadDialog } from "./ImageUploadDialog";

const CreateQuizPage: React.FC = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("");
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [units, setUnits] = useState<string[]>([]);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [quizImage, setQuizImage] = useState<File | null>(null);
  const [quizImageUrl, setQuizImageUrl] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    {
      questionText: "",
      questionType: "multiple-choice",
      options: [
        { text: "", imageUrl: "", image: null },
        { text: "", imageUrl: "", image: null },
        { text: "", imageUrl: "", image: null },
        { text: "", imageUrl: "", image: null },
      ],
      correctAnswer: -1,
      image: null,
      imageUrl: "",
    },
  ]);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageType, setImageType] = useState<"quiz" | "question" | "option">("quiz");
  const [imageTargetIndex, setImageTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    if (grade && semester && subject) {
      fetchUnits(grade, semester, subject);
    }
  }, [grade, semester, subject]);

  const fetchUnits = async (grade: string, semester: string, subject: string) => {
    try {
      const { units } = await getUnits(grade, semester, subject);
      setUnits(units);
    } catch (error) {
      console.error("단원 목록을 불러오는 데 실패했습니다.", error);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: "",
        questionType: "multiple-choice",
        options: [
          { text: "", imageUrl: "", image: null },
          { text: "", imageUrl: "", image: null },
          { text: "", imageUrl: "", image: null },
          { text: "", imageUrl: "", image: null },
        ],
        correctAnswer: -1,
        image: null,
        imageUrl: "",
      },
    ]);
  };

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("grade", grade);
      formData.append("subject", subject);
      formData.append("semester", semester);
      formData.append("unit", selectedUnit);
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
    } catch (error) {
      console.error("퀴즈 생성에 실패했습니다.", error);
    }
  };

  const openImageDialog = (type: "quiz" | "question" | "option", index: number | null = null) => {
    setImageType(type);
    setImageTargetIndex(index);

    if (type === "quiz") {
      setQuizImage(quizImage);
      setQuizImageUrl(quizImageUrl);
    } else if (type === "question" && index !== null) {
      const updatedQuestions = [...questions];
      setQuestions(updatedQuestions);
    } else if (type === "option" && index !== null) {
      const updatedQuestions = [...questions];
      setQuestions(updatedQuestions);
    }

    setImageDialogOpen(true);
  };

  return (
    <Box sx={{ padding: "2rem" }}>
      <Typography variant="h4" gutterBottom>퀴즈 생성</Typography>
      <Box sx={{ display: "flex", alignItems: "center", marginBottom: "1.5rem" }}>
        <TextField label="퀴즈 제목" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />
        <IconButton component="label" sx={{ marginLeft: "1rem" }} onClick={() => openImageDialog("quiz")}>
          <Image />
        </IconButton>
      </Box>

      {/* 퀴즈 이미지 미리보기 및 삭제 기능 */}
      {quizImage || quizImageUrl ? (
        <Box>
          <Typography>퀴즈 이미지 미리보기:</Typography>
          <img
            src={quizImage ? URL.createObjectURL(quizImage) : quizImageUrl}
            alt="퀴즈 이미지"
            style={{ maxWidth: "100%", height: "auto" }}
          />
          {/* 이미지 삭제 버튼 추가 */}
          <Button variant="outlined" color="secondary" onClick={() => { setQuizImage(null); setQuizImageUrl(""); }}>
            이미지 삭제
          </Button>
        </Box>
      ) : null}

      {/* 학년, 학기, 과목 및 단원 선택 필드 */}
      <TextField select label="학년" value={grade} onChange={(e) => setGrade(e.target.value)} SelectProps={{ native: true }} fullWidth sx={{ marginBottom: "1.5rem" }}>
        <option value="">학년 선택</option>
        <option value="5">5</option>
        <option value="6">6</option>
      </TextField>

      <TextField select label="학기" value={semester} onChange={(e) => setSemester(e.target.value)} SelectProps={{ native: true }} fullWidth sx={{ marginBottom: "1.5rem" }}>
        <option value="">학기 선택</option>
        <option value="1학기">1학기</option>
        <option value="2학기">2학기</option>
      </TextField>

      <TextField select label="과목" value={subject} onChange={(e) => setSubject(e.target.value)} SelectProps={{ native: true }} fullWidth sx={{ marginBottom: "1.5rem" }}>
        <option value="">과목 선택</option>
        <option value="수학">수학</option>
        <option value="과학">과학</option>
      </TextField>

      {units.length > 0 && (
        <TextField select label="단원" value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} SelectProps={{ native: true }} fullWidth sx={{ marginBottom: "2rem" }}>
          <option value="">단원 선택</option>
          {units.map((unit, index) => (
            <option key={index} value={unit}>{unit}</option>
          ))}
        </TextField>
      )}

      {/* 질문 및 옵션 UI */}
      {questions.map((question, index) => (
        <QuestionComponent
          key={index}
          question={question}
          questionIndex={index}
          questions={questions}
          setQuestions={setQuestions}
          openImageDialog={openImageDialog}
        />
      ))}

      <Button variant="outlined" color="primary" startIcon={<Add />} onClick={handleAddQuestion} sx={{ marginBottom: "2rem" }}>문제 추가</Button>
      <Button variant="contained" color="primary" fullWidth onClick={handleSubmit}>퀴즈 생성하기</Button>

      {/* 이미지 업로드 다이얼로그 */}
      <ImageUploadDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onImageChange={(file) => {
          if (imageType === "quiz") {
            setQuizImage(file);
            setQuizImageUrl("");
          } else if (imageType === "question" && imageTargetIndex !== null) {
            const updatedQuestions = [...questions];
            updatedQuestions[imageTargetIndex].image = file;
            updatedQuestions[imageTargetIndex].imageUrl = "";
            setQuestions(updatedQuestions);
          } else if (imageType === "option" && imageTargetIndex !== null) {
            const questionIndex = Math.floor(imageTargetIndex / 4);
            const optionIndex = imageTargetIndex % 4;
            const updatedQuestions = [...questions];
            updatedQuestions[questionIndex].options[optionIndex].image = file;
            updatedQuestions[questionIndex].options[optionIndex].imageUrl = "";
            setQuestions(updatedQuestions);
          }
        }}
        onImageUrlChange={(url) => {
          if (imageType === "quiz") {
            setQuizImageUrl(url);
            setQuizImage(null);
          } else if (imageType === "question" && imageTargetIndex !== null) {
            const updatedQuestions = [...questions];
            updatedQuestions[imageTargetIndex].imageUrl = url;
            updatedQuestions[imageTargetIndex].image = null;
            setQuestions(updatedQuestions);
          } else if (imageType === "option" && imageTargetIndex !== null) {
            const questionIndex = Math.floor(imageTargetIndex / 4);
            const optionIndex = imageTargetIndex % 4;
            const updatedQuestions = [...questions];
            updatedQuestions[questionIndex].options[optionIndex].imageUrl = url;
            updatedQuestions[questionIndex].options[optionIndex].image = null;
            setQuestions(updatedQuestions);
          }
        }}
        imageFile={quizImage}
        imageUrl={quizImageUrl}
      />
    </Box>
  );
};

export default CreateQuizPage;
