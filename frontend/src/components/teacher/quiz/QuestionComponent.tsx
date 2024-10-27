import React from "react";
import { Box, TextField, IconButton, Grid, FormControlLabel, Radio, Button, Typography } from "@mui/material";
import { Delete, Image } from "@mui/icons-material";
import { Option, Question } from "./types";

type Props = {
  question: Question;
  questionIndex: number;
  questions: Question[];
  setQuestions: (questions: Question[]) => void;
  openImageDialog: (type: "question" | "option", index: number) => void;
};

export const QuestionComponent: React.FC<Props> = ({
  question,
  questionIndex,
  questions,
  setQuestions,
  openImageDialog,
}) => {
    const handleQuestionChange = (
        index: number,
        field: keyof Question,
        value: string | File | Option[] | number | null
    ) => {
    const updatedQuestions = [...questions];
    
    if (field === "image") {
        updatedQuestions[index].imageUrl = "";
        updatedQuestions[index].image = value as File | null; // 이미지 필드가 null일 수 있도록 설정
    } else if (field === "options") {
        updatedQuestions[index].options = value as Option[];
    } else if (field === "correctAnswer") {
        if (typeof value === "number") {
        updatedQuestions[index].correctAnswer = value;
        }
    } else {
        updatedQuestions[index][field] = value as string;
    }
    
    setQuestions(updatedQuestions);
    };
    
    const handleOptionChange = (
        questionIndex: number,
        optionIndex: number,
        field: keyof Option,
        value: string | File | null // null 허용
    ) => {
    const updatedQuestions = [...questions];
    
    if (field === "image") {
        updatedQuestions[questionIndex].options[optionIndex].imageUrl = "";
        updatedQuestions[questionIndex].options[optionIndex].image = value as File | null;
    } else {
        updatedQuestions[questionIndex].options[optionIndex][field] = value as string;
    }
    
    setQuestions(updatedQuestions);
    };

  const handleCorrectAnswerChange = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].correctAnswer = optionIndex;
    setQuestions(updatedQuestions);
  };

  const handleQuestionTypeChange = (questionIndex: number, value: string) => {
    const updatedQuestions = [...questions];
    updatedQuestions[questionIndex].questionType = value;

    if (value === "true-false") {
      updatedQuestions[questionIndex].options = [
        { text: "참", imageUrl: "", image: null },
        { text: "거짓", imageUrl: "", image: null },
      ];
      updatedQuestions[questionIndex].correctAnswer = -1;
    } else if (value === "multiple-choice") {
      updatedQuestions[questionIndex].options = [
        { text: "", imageUrl: "", image: null },
        { text: "", imageUrl: "", image: null },
        { text: "", imageUrl: "", image: null },
        { text: "", imageUrl: "", image: null },
      ];
      updatedQuestions[questionIndex].correctAnswer = -1;
    }

    setQuestions(updatedQuestions);
  };

  return (
    <Box sx={{ marginBottom: "2rem", border: "1px solid #ccc", padding: "1rem" }}>
      <TextField
        label={`문제 ${questionIndex + 1}`}
        fullWidth
        value={question.questionText}
        onChange={(e) => handleQuestionChange(questionIndex, "questionText", e.target.value)}
      />
      <IconButton onClick={() => openImageDialog("question", questionIndex)}>
        <Image />
      </IconButton>

      {/* 문제 이미지 미리보기 및 삭제 기능 */}
      {question.image || question.imageUrl ? (
        <Box>
          <Typography>문제 이미지 미리보기:</Typography>
          <img
            src={question.image ? URL.createObjectURL(question.image) : question.imageUrl}
            alt="문제 이미지"
            style={{ maxWidth: "100%", height: "auto" }}
          />
          {/* 이미지 삭제 버튼 추가 */}
          <Button variant="outlined" color="secondary" onClick={() => handleQuestionChange(questionIndex, "image", null)}>
            이미지 삭제
          </Button>
        </Box>
      ) : null}

      <TextField
        select
        label="문제 유형"
        value={question.questionType}
        onChange={(e) => handleQuestionTypeChange(questionIndex, e.target.value)}
        SelectProps={{ native: true }}
        fullWidth
        sx={{ marginBottom: "1rem" }}
      >
        <option value="multiple-choice">선택형</option>
        <option value="true-false">참/거짓</option>
      </TextField>

      <Grid container spacing={2}>
        {question.options.map((option, optionIndex) => (
          <Grid item xs={6} key={optionIndex}>
            <TextField
              label={`선택지 ${optionIndex + 1}`}
              fullWidth
              value={option.text}
              onChange={(e) =>
                handleOptionChange(questionIndex, optionIndex, "text", e.target.value)
              }
            />
            <IconButton onClick={() => openImageDialog("option", questionIndex * 4 + optionIndex)}>
              <Image />
            </IconButton>

            {/* 선택지 이미지 미리보기 및 삭제 기능 */}
            {option.image || option.imageUrl ? (
              <Box>
                <Typography>선택지 이미지 미리보기:</Typography>
                <img
                  src={option.image ? URL.createObjectURL(option.image) : option.imageUrl}
                  alt={`선택지 ${optionIndex + 1} 이미지`}
                  style={{ maxWidth: "100%", height: "auto" }}
                />
                {/* 이미지 삭제 버튼 추가 */}
                <Button variant="outlined" color="secondary" onClick={() => handleOptionChange(questionIndex, optionIndex, "image", null)}>
                  이미지 삭제
                </Button>
              </Box>
            ) : null}

            <FormControlLabel
              control={<Radio checked={question.correctAnswer === optionIndex} />}
              label="정답으로 선택"
              onChange={() => handleCorrectAnswerChange(questionIndex, optionIndex)}
            />
          </Grid>
        ))}
      </Grid>
      <IconButton color="error" onClick={() => setQuestions(questions.filter((_, idx) => idx !== questionIndex))}>
        <Delete />
      </IconButton>
    </Box>
  );
};
