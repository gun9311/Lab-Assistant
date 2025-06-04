import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  IconButton,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  MenuItem,
  Paper,
  Divider,
} from "@mui/material";
import { Delete, Image, CheckCircleOutline } from "@mui/icons-material";
import { Question } from "../types";
import ImageUploadDialog from "../ImageUploadDialog";

type QuizSlideProps = {
  question: Question;
  questionIndex: number;
  updateQuestion: (index: number, updatedQuestion: Question) => void;
  removeQuestion: (index: number) => void;
  isReadOnly?: boolean;
  validationAttempted?: boolean;
};

const QuizSlide: React.FC<QuizSlideProps> = ({
  question,
  questionIndex,
  updateQuestion,
  removeQuestion,
  isReadOnly = false,
  validationAttempted = false,
}) => {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageType, setImageType] = useState<"question" | "option">("question");
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(
    null
  );

  const isQuestionTextEmpty =
    !isReadOnly && question.questionText.trim() === "";
  const displayQuestionTextError = validationAttempted && isQuestionTextEmpty;

  const isTimeLimitInvalid = !isReadOnly && question.timeLimit <= 0;
  const displayTimeLimitError = validationAttempted && isTimeLimitInvalid;

  const isCorrectAnswerNotSet = !isReadOnly && question.correctAnswer === -1;
  const displayCorrectAnswerError =
    validationAttempted && isCorrectAnswerNotSet;

  const getOptionError = (optionIndex: number): string => {
    if (isReadOnly || question.questionType !== "multiple-choice") return "";
    const option = question.options[optionIndex];
    if (
      question.questionType === "multiple-choice" &&
      option.text.trim() === "" &&
      !option.imageUrl &&
      !option.image
    ) {
    }
    return "";
  };

  const areMultipleChoiceOptionsInvalid = (): boolean => {
    if (isReadOnly || question.questionType !== "multiple-choice") return false;
    const filledOptions = question.options.filter(
      (opt) => opt.text.trim() !== "" || opt.imageUrl || opt.image
    );
    return filledOptions.length < 2;
  };
  const displayMultipleChoiceOptionsError =
    validationAttempted && areMultipleChoiceOptionsInvalid();

  const handleQuestionChange = (fields: Partial<Question>) => {
    if (isReadOnly) return;
    const updatedQuestion = { ...question, ...fields };
    updateQuestion(questionIndex, updatedQuestion);
  };

  const handleOptionChange = (
    optionIndex: number,
    fields: Partial<Question["options"][0]>
  ) => {
    if (isReadOnly) return;
    const updatedOptions = [...question.options];
    updatedOptions[optionIndex] = { ...updatedOptions[optionIndex], ...fields };
    updateQuestion(questionIndex, { ...question, options: updatedOptions });
  };

  const handleCorrectAnswerChange = (optionIndex: number) => {
    if (isReadOnly) return;
    handleQuestionChange({ correctAnswer: optionIndex });
  };

  const handleQuestionTypeChange = (value: string) => {
    if (isReadOnly) return;
    const updatedQuestion = { ...question, questionType: value };

    if (value === "true-false") {
      updatedQuestion.options = [
        { text: "참", imageUrl: "", image: null },
        { text: "거짓", imageUrl: "", image: null },
      ];
    } else if (value === "multiple-choice") {
      updatedQuestion.options = [
        { text: "", imageUrl: "", image: null },
        { text: "", imageUrl: "", image: null },
        { text: "", imageUrl: "", image: null },
        { text: "", imageUrl: "", image: null },
      ];
    }

    updatedQuestion.correctAnswer = -1;
    updateQuestion(questionIndex, updatedQuestion);
  };

  useEffect(() => {
    if (!question.image && !question.imageUrl) {
      console.log("이미지 필드가 성공적으로 초기화되었습니다.");
    }
  }, [question.image, question.imageUrl]);

  const correctAnswerIndex =
    typeof question.correctAnswer === "string"
      ? parseInt(question.correctAnswer, 10)
      : question.correctAnswer;

  return (
    <Box
      sx={{
        padding: { xs: "1rem", md: "1.5rem" },
        borderRadius: "12px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2.5}
      >
        <Typography variant="h5" sx={{ fontWeight: "600", color: "#2c3e50" }}>
          {`문제 ${questionIndex + 1}`}
        </Typography>
        {displayCorrectAnswerError && !isReadOnly && (
          <Typography
            color="error"
            variant="caption"
            sx={{ mb: 1, fontWeight: "medium" }}
          >
            정답을 선택해주세요!
          </Typography>
        )}
      </Box>

      <Paper elevation={2} sx={{ p: 2, mb: 2.5, borderRadius: "8px" }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              label="문제 유형"
              value={question.questionType}
              onChange={(e) => handleQuestionTypeChange(e.target.value)}
              fullWidth
              size="small"
              sx={{ "& .MuiInputBase-root": { borderRadius: "6px" } }}
              disabled={isReadOnly}
            >
              <MenuItem value="multiple-choice">선택형</MenuItem>
              <MenuItem value="true-false">참/거짓</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="시간 제한 (초)"
              type="number"
              size="small"
              value={question.timeLimit}
              onChange={(e) =>
                handleQuestionChange({
                  timeLimit: parseInt(e.target.value) || 0,
                })
              }
              error={displayTimeLimitError}
              helperText={
                displayTimeLimitError ? "시간 제한은 0보다 커야 합니다." : ""
              }
              sx={{ "& .MuiInputBase-root": { borderRadius: "6px" } }}
              disabled={isReadOnly}
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={2} sx={{ p: 2, mb: 2.5, borderRadius: "8px" }}>
        <Typography
          variant="subtitle1"
          gutterBottom
          sx={{ fontWeight: "medium", color: "#34495e" }}
        >
          문제 내용
        </Typography>
        <Grid container spacing={1} alignItems="flex-start">
          <Grid item xs={isReadOnly ? 12 : 10.5}>
            <TextField
              fullWidth
              label="문제 설명"
              value={question.questionText}
              onChange={(e) =>
                handleQuestionChange({ questionText: e.target.value })
              }
              error={displayQuestionTextError}
              helperText={
                displayQuestionTextError ? "문제 내용을 입력해주세요." : ""
              }
              sx={{
                "& .MuiInputBase-root": {
                  borderRadius: "6px",
                  backgroundColor: isReadOnly ? "transparent" : "#fff",
                },
              }}
              disabled={isReadOnly}
              multiline
              minRows={isReadOnly ? 1 : 3}
            />
          </Grid>
          {!isReadOnly && (
            <Grid
              item
              xs={1.5}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                mt: 0.5,
              }}
            >
              <IconButton
                onClick={() => {
                  setImageDialogOpen(true);
                  setImageType("question");
                }}
                sx={{
                  color: "#546e7a",
                  backgroundColor: "#eceff1",
                  borderRadius: "8px",
                  "&:hover": { backgroundColor: "#cfd8dc" },
                  padding: "10px",
                }}
                title="문제 이미지 추가/변경"
              >
                <Image />
              </IconButton>
            </Grid>
          )}
        </Grid>

        {(question.image || question.imageUrl) && (
          <Box
            mt={2}
            sx={{
              position: "relative",
              width: "100%",
              maxHeight: "200px",
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid #ddd",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#f0f0f0",
            }}
          >
            <Box
              component="img"
              src={
                question.image
                  ? URL.createObjectURL(question.image)
                  : question.imageUrl
              }
              alt="문제 이미지"
              sx={{
                maxWidth: "100%",
                maxHeight: "200px",
                objectFit: "contain",
              }}
            />
            {!isReadOnly && (
              <IconButton
                onClick={() =>
                  handleQuestionChange({ image: null, imageUrl: "" })
                }
                sx={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  backgroundColor: "rgba(255, 255, 255, 0.7)",
                  color: "#d32f2f",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.9)",
                    color: "#b71c1c",
                  },
                }}
                size="small"
                title="문제 이미지 삭제"
              >
                <Delete fontSize="small" />
              </IconButton>
            )}
          </Box>
        )}
      </Paper>

      <Paper elevation={2} sx={{ p: 2, borderRadius: "8px" }}>
        <Typography
          variant="subtitle1"
          gutterBottom
          sx={{ fontWeight: "medium", color: "#34495e" }}
        >
          선택지 (정답{" "}
          {isReadOnly && correctAnswerIndex !== -1
            ? `${correctAnswerIndex + 1}번`
            : ""}
          )
        </Typography>
        {displayCorrectAnswerError &&
          !isReadOnly &&
          question.questionType === "multiple-choice" && (
            <Typography
              color="error"
              variant="caption"
              sx={{ display: "block", mb: 1, fontWeight: "medium" }}
            >
              객관식 문제는 정답을 선택해주세요.
            </Typography>
          )}
        {displayMultipleChoiceOptionsError && !isReadOnly && (
          <Typography
            color="error"
            variant="caption"
            sx={{ display: "block", mb: 1, fontWeight: "medium" }}
          >
            객관식 선택지는 내용 또는 이미지가 있는 것이 최소 2개 이상이어야
            합니다.
          </Typography>
        )}

        <Grid container spacing={2}>
          {question.options.map((option, optionIndex) => {
            const optionError = getOptionError(optionIndex);
            const displayOptionSpecificError =
              validationAttempted && !!optionError && !isReadOnly;
            const isCorrect = correctAnswerIndex === optionIndex;

            return (
              <Grid
                item
                xs={12}
                md={question.questionType === "true-false" ? 12 : 6}
                key={optionIndex}
              >
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: "8px",
                    backgroundColor:
                      isReadOnly && isCorrect
                        ? "#e6ffed"
                        : isReadOnly && !isCorrect
                        ? "#fff"
                        : !isReadOnly && isCorrect
                        ? "#fff9e6"
                        : "#ffffff",
                    border:
                      isReadOnly && isCorrect
                        ? "1.5px solid #4caf50"
                        : !isReadOnly && isCorrect
                        ? `1.5px solid #ffb300`
                        : displayOptionSpecificError
                        ? "1.5px solid #d32f2f"
                        : "1px solid #e0e0e0",
                    position: "relative",
                    transition: "border-color 0.2s, background-color 0.2s",
                  }}
                >
                  <CardContent sx={{ p: "12px !important" }}>
                    {(option.image || option.imageUrl) && (
                      <Box
                        sx={{
                          position: "relative",
                          width: "100%",
                          height: "120px",
                          borderRadius: "6px",
                          overflow: "hidden",
                          border: "1px solid #eee",
                          mb: 1,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: "#f5f5f5",
                        }}
                      >
                        <img
                          src={
                            option.image
                              ? URL.createObjectURL(option.image)
                              : option.imageUrl
                          }
                          alt={`선택지 ${optionIndex + 1} 이미지`}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "120px",
                            objectFit: "contain",
                          }}
                        />
                        {!isReadOnly && (
                          <IconButton
                            onClick={() =>
                              handleOptionChange(optionIndex, {
                                image: null,
                                imageUrl: "",
                              })
                            }
                            sx={{
                              position: "absolute",
                              top: "4px",
                              right: "4px",
                              backgroundColor: "rgba(255, 255, 255, 0.7)",
                              color: "#d32f2f",
                              "&:hover": {
                                backgroundColor: "rgba(255, 255, 255, 0.9)",
                                color: "#b71c1c",
                              },
                              padding: "2px",
                            }}
                            size="small"
                            title="선택지 이미지 삭제"
                          >
                            <Delete fontSize="inherit" />
                          </IconButton>
                        )}
                      </Box>
                    )}

                    <TextField
                      fullWidth
                      label={
                        question.questionType === "true-false"
                          ? `선택지 ${optionIndex + 1}`
                          : `선택지 ${optionIndex + 1} 내용`
                      }
                      value={option.text}
                      onChange={(e) =>
                        handleOptionChange(optionIndex, {
                          text: e.target.value,
                        })
                      }
                      error={displayOptionSpecificError}
                      helperText={displayOptionSpecificError ? optionError : ""}
                      sx={{
                        "& .MuiInputBase-root": {
                          borderRadius: "6px",
                          backgroundColor: isReadOnly ? "transparent" : "#fff",
                          fontSize:
                            question.questionType === "true-false" && isReadOnly
                              ? "1.1rem"
                              : "0.9rem",
                          fontWeight:
                            question.questionType === "true-false" && isReadOnly
                              ? "medium"
                              : "normal",
                        },
                        mb: isReadOnly ? 0 : 1,
                      }}
                      disabled={
                        isReadOnly ||
                        (question.questionType === "true-false" && !isReadOnly)
                      }
                      multiline={question.questionType !== "true-false"}
                      minRows={1}
                    />

                    {!isReadOnly && (
                      <Box
                        display="flex"
                        justifyContent={
                          question.questionType === "multiple-choice"
                            ? "space-between"
                            : "flex-end"
                        }
                        alignItems="center"
                        mt={0.5}
                      >
                        {question.questionType === "multiple-choice" && (
                          <IconButton
                            onClick={() => {
                              setImageDialogOpen(true);
                              setImageType("option");
                              setSelectedOptionIndex(optionIndex);
                            }}
                            sx={{
                              color: "#546e7a",
                              backgroundColor: "#eceff1",
                              borderRadius: "6px",
                              padding: "6px",
                              "&:hover": { backgroundColor: "#cfd8dc" },
                            }}
                            size="small"
                            title="선택지 이미지 추가/변경"
                          >
                            <Image fontSize="small" />
                          </IconButton>
                        )}

                        <Button
                          onClick={() => handleCorrectAnswerChange(optionIndex)}
                          variant={isCorrect ? "contained" : "outlined"}
                          size="small"
                          sx={{
                            minWidth: "80px",
                            borderRadius: "6px",
                            fontSize: "0.8rem",
                            color: isCorrect
                              ? "#fff"
                              : question.questionType === "true-false"
                              ? "#4caf50"
                              : "#ff9800",
                            backgroundColor: isCorrect
                              ? question.questionType === "true-false"
                                ? "#4caf50"
                                : "#ff9800"
                              : "transparent",
                            borderColor: isCorrect
                              ? undefined
                              : question.questionType === "true-false"
                              ? "#4caf50"
                              : "#ff9800",
                            "&:hover": {
                              backgroundColor: isCorrect
                                ? question.questionType === "true-false"
                                  ? "#388e3c"
                                  : "#fb8c00"
                                : question.questionType === "true-false"
                                ? "rgba(76, 175, 80, 0.08)"
                                : "rgba(255, 152, 0, 0.08)",
                            },
                          }}
                          startIcon={
                            isCorrect ? (
                              <CheckCircleOutline fontSize="small" />
                            ) : null
                          }
                        >
                          {isCorrect ? "정답" : "정답으로"}
                        </Button>
                      </Box>
                    )}
                    {isReadOnly && isCorrect && (
                      <CheckCircleOutline
                        fontSize="small"
                        sx={{
                          color: "success.main",
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {!isReadOnly && (
        <Box display="flex" justifyContent="flex-end" mt={2.5}>
          <Button
            variant="outlined"
            color="error"
            onClick={() => removeQuestion(questionIndex)}
            startIcon={<Delete />}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: "medium",
            }}
          >
            문제 삭제
          </Button>
        </Box>
      )}

      <ImageUploadDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        onImageChange={(file) => {
          if (imageType === "question") {
            handleQuestionChange({ image: file, imageUrl: "" });
          } else if (imageType === "option" && selectedOptionIndex !== null) {
            handleOptionChange(selectedOptionIndex, {
              image: file,
              imageUrl: "",
            });
          }
        }}
        onImageUrlChange={(url) => {
          if (imageType === "question") {
            handleQuestionChange({ imageUrl: url, image: null });
          } else if (imageType === "option" && selectedOptionIndex !== null) {
            handleOptionChange(selectedOptionIndex, {
              imageUrl: url,
              image: null,
            });
          }
        }}
        imageUrl={
          imageType === "question"
            ? question.imageUrl
            : selectedOptionIndex !== null &&
              question.options[selectedOptionIndex]
            ? question.options[selectedOptionIndex].imageUrl
            : ""
        }
        imageFile={
          imageType === "question"
            ? question.image
            : selectedOptionIndex !== null &&
              question.options[selectedOptionIndex]
            ? question.options[selectedOptionIndex].image
            : null
        }
      />
    </Box>
  );
};

export default QuizSlide;
