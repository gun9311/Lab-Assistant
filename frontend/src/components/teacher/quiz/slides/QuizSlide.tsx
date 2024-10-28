import React, { useState } from "react";
import { Box, TextField, IconButton, Button, Typography, Grid } from "@mui/material";
import { Delete, Image } from "@mui/icons-material";
import { Question } from "../types";
import ImageUploadDialog from "../ImageUploadDialog";

type QuizSlideProps = {
  question: Question;
  questionIndex: number;
  updateQuestion: (index: number, updatedQuestion: Question) => void;
  removeQuestion: (index: number) => void;
};

const QuizSlide: React.FC<QuizSlideProps> = ({
  question,
  questionIndex,
  updateQuestion,
  removeQuestion,
}) => {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageType, setImageType] = useState<"question" | "option">("question");
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);

  const handleQuestionChange = (field: keyof Question, value: string | number | File | null) => {
    const updatedQuestion = { ...question, [field]: value };
    updateQuestion(questionIndex, updatedQuestion);
  };

  const handleOptionChange = (optionIndex: number, field: "text" | "imageUrl" | "image", value: string | File | null) => {
    const updatedOptions = [...question.options];
    updatedOptions[optionIndex] = { ...updatedOptions[optionIndex], [field]: value };
    updateQuestion(questionIndex, { ...question, options: updatedOptions });
  };

  const handleCorrectAnswerChange = (optionIndex: number) => {
    updateQuestion(questionIndex, { ...question, correctAnswer: optionIndex });
  };

  return (
    <Box sx={{ padding: "2rem" }}>
      <Typography variant="h5" gutterBottom>문제 {questionIndex + 1}</Typography>

      <TextField
        fullWidth
        label="문제 텍스트"
        value={question.questionText}
        onChange={(e) => handleQuestionChange("questionText", e.target.value)}
        sx={{ marginBottom: "1rem" }}
      />

      <TextField
        fullWidth
        label="시간 제한 (초)"
        type="number"
        value={question.timeLimit}
        onChange={(e) => handleQuestionChange("timeLimit", parseInt(e.target.value))}
        sx={{ marginBottom: "1rem" }}
      />

      <IconButton onClick={() => { setImageDialogOpen(true); setImageType("question"); }}>
        <Image />
      </IconButton>

      {/* 문제 이미지 렌더링 - 파일 또는 URL을 구분하여 표시 */}
      {question.image && (
        <Box>
          <img
            src={typeof question.image === "string" ? question.image : URL.createObjectURL(question.image)}
            alt="문제 이미지"
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <Button onClick={() => handleQuestionChange("image", null)}>이미지 삭제</Button>
        </Box>
      )}
      {question.imageUrl && !question.image && (
        <Box>
          <img
            src={question.imageUrl}
            alt="문제 이미지 URL"
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <Button onClick={() => handleQuestionChange("imageUrl", "")}>URL 이미지 삭제</Button>
        </Box>
      )}

      <Grid container spacing={2}>
        {question.options.map((option, optionIndex) => (
          <Grid item xs={6} key={optionIndex}>
            <TextField
              fullWidth
              label={`선택지 ${optionIndex + 1}`}
              value={option.text}
              onChange={(e) => handleOptionChange(optionIndex, "text", e.target.value)}
            />

            <IconButton onClick={() => { setImageDialogOpen(true); setImageType("option"); setSelectedOptionIndex(optionIndex); }}>
              <Image />
            </IconButton>

            {/* 선택지 이미지 렌더링 - 파일 또는 URL을 구분하여 표시 */}
            {option.image && (
              <Box>
                <img
                  src={typeof option.image === "string" ? option.image : URL.createObjectURL(option.image)}
                  alt={`선택지 ${optionIndex + 1} 이미지`}
                  style={{ maxWidth: "100%", height: "auto" }}
                />
                <Button onClick={() => handleOptionChange(optionIndex, "image", null)}>이미지 삭제</Button>
              </Box>
            )}
            {option.imageUrl && !option.image && (
              <Box>
                <img
                  src={option.imageUrl}
                  alt={`선택지 ${optionIndex + 1} 이미지 URL`}
                  style={{ maxWidth: "100%", height: "auto" }}
                />
                <Button onClick={() => handleOptionChange(optionIndex, "imageUrl", "")}>URL 이미지 삭제</Button>
              </Box>
            )}

            <Button onClick={() => handleCorrectAnswerChange(optionIndex)} variant={question.correctAnswer === optionIndex ? "contained" : "outlined"}>
              {question.correctAnswer === optionIndex ? "정답" : "정답으로 설정"}
            </Button>
          </Grid>
        ))}
      </Grid>

      <IconButton color="error" onClick={() => removeQuestion(questionIndex)}>
        <Delete />
      </IconButton>

      <ImageUploadDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onImageChange={(file) => {
          if (imageType === "question") {
            handleQuestionChange("image", file);
          } else if (imageType === "option" && selectedOptionIndex !== null) {
            handleOptionChange(selectedOptionIndex, "image", file);
          }
        }}
        onImageUrlChange={(url) => {
          if (imageType === "question") {
            handleQuestionChange("imageUrl", url);
          } else if (imageType === "option" && selectedOptionIndex !== null) {
            handleOptionChange(selectedOptionIndex, "imageUrl", url);
          }
        }}
        imageUrl={imageType === "question" ? question.imageUrl : selectedOptionIndex !== null ? question.options[selectedOptionIndex].imageUrl : ""}
        imageFile={imageType === "question" ? question.image : selectedOptionIndex !== null ? question.options[selectedOptionIndex].image : null}
      />
    </Box>
  );
};

export default QuizSlide;
