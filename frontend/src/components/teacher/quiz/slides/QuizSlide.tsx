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
import {
  Delete,
  Image,
  CheckCircleRounded as CheckCircleRoundedIcon,
  AddPhotoAlternateRounded as AddPhotoAlternateRoundedIcon,
  RadioButtonUncheckedRounded as RadioButtonUncheckedIcon,
  CheckCircleOutlineRounded as CheckCircleOutlineIcon,
} from "@mui/icons-material";
import { Question } from "../types";
import ImageUploadDialog from "../ImageUploadDialog";

type QuizSlideProps = {
  question: Question;
  questionIndex: number;
  updateQuestion: (index: number, updatedQuestion: Question) => void;
  removeQuestion: (index: number) => void;
  isReadOnly?: boolean;
  validationAttempted?: boolean;
  totalQuestions: number;
};

const QuizSlide: React.FC<QuizSlideProps> = ({
  question,
  questionIndex,
  updateQuestion,
  removeQuestion,
  isReadOnly = false,
  validationAttempted = false,
  totalQuestions,
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
  const displayCorrectAnswerErrorGlobal =
    validationAttempted && isCorrectAnswerNotSet;

  const getOptionError = (optionIndex: number): string => {
    if (isReadOnly || question.questionType !== "multiple-choice") return "";
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
        mb={1}
      >
        <Typography variant="h5" sx={{ fontWeight: "600", color: "#2c3e50" }}>
          {`문제 ${questionIndex + 1}`}
          {totalQuestions > 0 && (
            <Typography
              component="span"
              variant="h6"
              sx={{ color: "#757575", ml: 0.5 }}
            >
              {`/ ${totalQuestions}`}
            </Typography>
          )}
        </Typography>
        {!isReadOnly && (
          <IconButton
            onClick={() => removeQuestion(questionIndex)}
            color="error"
            aria-label="문제 삭제"
            sx={
              {
                // backgroundColor: 'rgba(211, 47, 47, 0.1)', // 필요시 배경색 살짝 추가
                // '&:hover': {
                //   backgroundColor: 'rgba(211, 47, 47, 0.2)',
                // }
              }
            }
          >
            <Delete />
          </IconButton>
        )}
      </Box>

      {displayCorrectAnswerErrorGlobal && !isReadOnly && (
        <Typography
          color="error"
          variant="body2"
          sx={{
            mb: 1.5,
            fontWeight: "medium",
            textAlign: "center",
          }}
        >
          {question.questionType === "multiple-choice"
            ? "객관식 문제는 정답을 선택해주세요."
            : "참/거짓 문제는 정답을 선택해주세요."}
        </Typography>
      )}

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
              sx={{
                "& .MuiInputBase-root": { borderRadius: "6px" },
                "& .MuiSelect-select": { fontSize: "1rem" },
              }}
              disabled={isReadOnly}
            >
              <MenuItem value="multiple-choice" sx={{ fontSize: "1rem" }}>
                선택형
              </MenuItem>
              <MenuItem value="true-false" sx={{ fontSize: "1rem" }}>
                참/거짓
              </MenuItem>
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
              sx={{
                "& .MuiInputBase-root": { borderRadius: "6px" },
                "& input": { fontSize: "1rem" },
              }}
              disabled={isReadOnly}
              InputProps={{ inputProps: { min: 1 } }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={2} sx={{ p: 2, mb: 2.5, borderRadius: "8px" }}>
        <Grid container spacing={1} alignItems="flex-start">
          <Grid item xs={isReadOnly ? 12 : 10.5}>
            <TextField
              fullWidth
              label="문제 내용"
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
                  paddingTop: "12px",
                  paddingBottom: "12px",
                },
                "& .MuiInputBase-input": {
                  fontSize: "2.5rem",
                  lineHeight: "1.4",
                },
                "& .MuiInputLabel-root": {
                  fontSize: "1rem",
                },
                "& .MuiFormHelperText-root": {
                  fontSize: "0.85rem",
                },
              }}
              disabled={isReadOnly}
              multiline
              minRows={isReadOnly ? 1 : 1}
            />
          </Grid>
          {!isReadOnly && (
            <Grid
              item
              xs={1.5}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                height: "100%",
                pt: "12px",
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
                <AddPhotoAlternateRoundedIcon />
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
              maxHeight: "220px",
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
                maxHeight: "220px",
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
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  color: "#d32f2f",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 1)",
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
        {displayMultipleChoiceOptionsError && !isReadOnly && (
          <Typography
            color="error"
            variant="body2"
            sx={{
              display: "block",
              mb: 1.5,
              fontWeight: "medium",
              textAlign: "center",
            }}
          >
            객관식 선택지는 내용 또는 이미지가 있는 것이 최소 2개 이상이어야
            합니다.
          </Typography>
        )}

        <Grid container spacing={1.5}>
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
                <Paper
                  variant="outlined"
                  onClick={
                    !isReadOnly
                      ? () => handleCorrectAnswerChange(optionIndex)
                      : undefined
                  }
                  sx={{
                    borderRadius: "8px",
                    padding: "8px 12px",
                    position: "relative",
                    cursor: isReadOnly ? "default" : "pointer",
                    backgroundColor: isCorrect
                      ? (theme) =>
                          theme.palette.mode === "light"
                            ? theme.palette.success.light + "30"
                            : theme.palette.success.dark + "30"
                      : "#ffffff",
                    border: isCorrect
                      ? (theme) => `2px solid ${theme.palette.success.main}`
                      : displayOptionSpecificError
                      ? (theme) => `1px solid ${theme.palette.error.main}`
                      : (theme) => `1px solid ${theme.palette.divider}`,
                    transition:
                      "border-color 0.2s, background-color 0.2s, box-shadow 0.2s",
                    minHeight: "64px",
                    display: "flex",
                    alignItems: "center",
                    "&:hover": {
                      borderColor: isReadOnly
                        ? undefined
                        : (theme) =>
                            isCorrect
                              ? theme.palette.success.dark
                              : theme.palette.primary.main,
                      boxShadow: isReadOnly
                        ? undefined
                        : (theme) =>
                            `0 0 0 2px ${theme.palette.primary.light + "50"}`,
                      backgroundColor: isReadOnly
                        ? undefined
                        : (theme) =>
                            isCorrect
                              ? theme.palette.mode === "light"
                                ? theme.palette.success.light + "50"
                                : theme.palette.success.dark + "50"
                              : theme.palette.action.hover,
                    },
                  }}
                >
                  {!isReadOnly && (
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCorrectAnswerChange(optionIndex);
                      }}
                      sx={{
                        mr: 1,
                        padding: "4px",
                        color: isCorrect ? "success.main" : "action.active",
                      }}
                      aria-label={
                        isCorrect ? "정답으로 선택됨" : "정답으로 선택"
                      }
                    >
                      {isCorrect ? (
                        <CheckCircleOutlineIcon fontSize="medium" />
                      ) : (
                        <RadioButtonUncheckedIcon fontSize="medium" />
                      )}
                    </IconButton>
                  )}
                  {isReadOnly && isCorrect && (
                    <CheckCircleOutlineIcon
                      fontSize="medium"
                      sx={{ color: "success.main", mr: 1 }}
                    />
                  )}

                  <Box
                    sx={{
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }}
                  >
                    {(option.image || option.imageUrl) && (
                      <Box
                        sx={{
                          position: "relative",
                          width: "100%",
                          height: "90px",
                          borderRadius: "4px",
                          overflow: "hidden",
                          border: (theme) =>
                            `1px solid ${theme.palette.divider}`,
                          mb: option.text ? 0.5 : 0,
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: (theme) => theme.palette.grey[50],
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
                            maxHeight: "90px",
                            objectFit: "contain",
                          }}
                        />
                        {!isReadOnly && (
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOptionChange(optionIndex, {
                                image: null,
                                imageUrl: "",
                              });
                            }}
                            sx={{
                              position: "absolute",
                              top: "2px",
                              right: "2px",
                              backgroundColor: "rgba(0, 0, 0, 0.4)",
                              color: "white",
                              "&:hover": {
                                backgroundColor: "rgba(0, 0, 0, 0.6)",
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
                      placeholder={
                        question.questionType === "true-false"
                          ? `선택지 ${optionIndex + 1}`
                          : `선택지 ${optionIndex + 1} 내용`
                      }
                      value={option.text}
                      onChange={(e) => {
                        if (
                          isReadOnly ||
                          (question.questionType === "true-false" &&
                            !isReadOnly)
                        )
                          return;
                        e.stopPropagation();
                        handleOptionChange(optionIndex, {
                          text: e.target.value,
                        });
                      }}
                      onClick={(e) => {
                        if (
                          isReadOnly ||
                          (question.questionType === "true-false" &&
                            !isReadOnly)
                        )
                          return;
                        e.stopPropagation();
                      }}
                      sx={{
                        width: "100%",
                        "& .MuiInputBase-root": {
                          borderRadius: "4px",
                          backgroundColor: isReadOnly ? "transparent" : "#fff",
                          fontSize:
                            question.questionType === "true-false" && isReadOnly
                              ? "2rem"
                              : "2rem",
                          fontWeight:
                            question.questionType === "true-false" && isReadOnly
                              ? "medium"
                              : "normal",
                        },
                        mr:
                          !isReadOnly &&
                          question.questionType === "multiple-choice" &&
                          !(option.image || option.imageUrl)
                            ? 1
                            : 0,
                      }}
                      disabled={
                        isReadOnly ||
                        (question.questionType === "true-false" && !isReadOnly)
                      }
                      multiline={question.questionType !== "true-false"}
                      minRows={1}
                      variant="outlined"
                      size="small"
                    />
                  </Box>

                  {!isReadOnly &&
                    question.questionType === "multiple-choice" && (
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageDialogOpen(true);
                          setImageType("option");
                          setSelectedOptionIndex(optionIndex);
                        }}
                        sx={{
                          color: "text.secondary",
                          backgroundColor: (theme) => theme.palette.grey[200],
                          borderRadius: "6px",
                          padding: "6px",
                          alignSelf: "flex-start",
                          mt: option.image || option.imageUrl ? 0 : "4px",
                          ml: 1,
                          "&:hover": {
                            backgroundColor: (theme) => theme.palette.grey[300],
                          },
                        }}
                        size="small"
                        title="선택지 이미지 추가/변경"
                      >
                        <AddPhotoAlternateRoundedIcon fontSize="small" />
                      </IconButton>
                    )}
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

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
