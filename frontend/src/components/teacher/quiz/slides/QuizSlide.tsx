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
} from "@mui/material";
import { Delete, Image } from "@mui/icons-material";
import { Question } from "../types";
import ImageUploadDialog from "../ImageUploadDialog";

type QuizSlideProps = {
  question: Question;
  questionIndex: number;
  updateQuestion: (index: number, updatedQuestion: Question) => void;
  removeQuestion: (index: number) => void;
  isReadOnly?: boolean; // 추가된 prop
};

const QuizSlide: React.FC<QuizSlideProps> = ({
  question,
  questionIndex,
  updateQuestion,
  removeQuestion,
  isReadOnly = false, // 기본값을 false로 설정
}) => {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageType, setImageType] = useState<"question" | "option">("question");
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(
    null
  );

  // 실시간 유효성 검사 상태
  const isQuestionTextEmpty =
    !isReadOnly && question.questionText.trim() === "";
  const isTimeLimitInvalid = !isReadOnly && question.timeLimit <= 0;
  const isCorrectAnswerNotSet = !isReadOnly && question.correctAnswer === -1;

  const getOptionError = (optionIndex: number): string => {
    if (isReadOnly || question.questionType !== "multiple-choice") return "";
    const option = question.options[optionIndex];
    if (option.text.trim() === "" && !option.imageUrl && !option.image) {
      return "선택지 내용을 입력하거나 이미지를 추가해주세요.";
    }
    return "";
  };

  const handleQuestionChange = (fields: Partial<Question>) => {
    if (isReadOnly) return; // 읽기 전용 모드에서는 변경 방지
    const updatedQuestion = { ...question, ...fields };
    updateQuestion(questionIndex, updatedQuestion);
  };

  const handleOptionChange = (
    optionIndex: number,
    fields: Partial<Question["options"][0]>
  ) => {
    if (isReadOnly) return; // 읽기 전용 모드에서는 변경 방지
    const updatedOptions = [...question.options];
    updatedOptions[optionIndex] = { ...updatedOptions[optionIndex], ...fields };
    updateQuestion(questionIndex, { ...question, options: updatedOptions });
  };

  const handleCorrectAnswerChange = (optionIndex: number) => {
    if (isReadOnly) return; // 읽기 전용 모드에서는 변경 방지
    handleQuestionChange({ correctAnswer: optionIndex });
  };

  const handleQuestionTypeChange = (value: string) => {
    if (isReadOnly) return; // 읽기 전용 모드에서는 변경 방지
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

  return (
    <Box
      sx={{
        padding: "2rem",
        borderRadius: "16px",
        boxShadow: "0px 6px 20px rgba(0, 0, 0, 0.1)",
        backgroundColor: "#ffffff",
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontWeight: "bold", color: "#333" }}
        >
          {questionIndex + 1}번 문제
        </Typography>
        {isCorrectAnswerNotSet && (
          <Typography color="error" variant="caption" sx={{ mb: 1 }}>
            정답을 선택해주세요!
          </Typography>
        )}
      </Box>

      {/* 문제 유형 및 시간 설정 */}
      <Grid container spacing={2} sx={{ marginBottom: "1.5rem" }}>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            label="문제 유형"
            value={question.questionType}
            onChange={(e) => handleQuestionTypeChange(e.target.value)}
            fullWidth
            sx={{
              "& .MuiInputBase-root": {
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
              },
            }}
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
            value={question.timeLimit}
            onChange={(e) =>
              handleQuestionChange({ timeLimit: parseInt(e.target.value) })
            }
            error={isTimeLimitInvalid}
            helperText={
              isTimeLimitInvalid ? "시간 제한은 0보다 커야 합니다." : ""
            }
            sx={{
              "& .MuiInputBase-root": {
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
              },
            }}
            disabled={isReadOnly}
          />
        </Grid>
      </Grid>

      {/* 문제 텍스트 입력 필드 및 이미지 업로드 아이콘 */}
      <Grid
        container
        spacing={1}
        alignItems="flex-start"
        sx={{ marginBottom: "1.5rem" }}
      >
        <Grid item xs={isReadOnly ? 12 : 11}>
          {" "}
          {/* 읽기 전용일 때는 전체 너비 사용 */}
          <TextField
            fullWidth
            label="문제"
            value={question.questionText}
            onChange={(e) =>
              handleQuestionChange({ questionText: e.target.value })
            }
            error={isQuestionTextEmpty}
            helperText={isQuestionTextEmpty ? "문제 내용을 입력해주세요." : ""}
            sx={{
              "& .MuiInputBase-root": {
                borderRadius: "8px",
                backgroundColor: "#f9f9f9",
              },
              // marginBottom: "1rem", // 이미 Grid spacing으로 간격 조절
            }}
            disabled={isReadOnly}
            multiline
            minRows={2}
          />
        </Grid>
        {!isReadOnly && (
          <Grid item xs={1}>
            <IconButton
              onClick={() => {
                setImageDialogOpen(true);
                setImageType("question");
              }}
              sx={{
                color: "#000",
                backgroundColor: "#ffcc00",
                borderRadius: "8px",
                "&:hover": { backgroundColor: "#ffaa00" },
                padding: "8px",
                mt: "8px", // TextField와의 정렬을 위해 약간의 마진 추가
              }}
            >
              <Image />
            </IconButton>
          </Grid>
        )}
      </Grid>

      {/* 문제 이미지 미리보기 및 삭제 */}
      {(question.image || question.imageUrl) && (
        <Box
          sx={{
            position: "relative",
            maxWidth: "100%", // 가로 화면에 맞춤
            height: "250px", // 문제 이미지 높이 고정
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
            border: "1px solid #ddd",
            marginTop: "1rem",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
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
              width: "auto",
              height: "100%", // 높이를 컨테이너에 맞추고, 비율 유지
              objectFit: "contain",
            }}
          />
          {!isReadOnly && ( // 읽기 전용이 아닐 때만 삭제 버튼 표시
            <IconButton
              onClick={() =>
                handleQuestionChange({ image: null, imageUrl: "" })
              }
              sx={{
                position: "absolute",
                top: "4px",
                right: "4px",
                backgroundColor: "#ff6f61",
                color: "#fff",
                width: "24px",
                height: "24px",
                "&:hover": { backgroundColor: "#e57373" },
              }}
              size="small"
            >
              <Delete fontSize="small" />
            </IconButton>
          )}
        </Box>
      )}

      {/* 선택지 입력 필드 */}
      <Grid container spacing={2} sx={{ marginTop: "1rem" }}>
        {question.options.map((option, optionIndex) => {
          const optionError = getOptionError(optionIndex);
          return (
            <Grid item xs={12} md={6} key={optionIndex}>
              <Card
                sx={{
                  borderRadius: "8px",
                  boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                  backgroundColor:
                    isReadOnly && optionIndex === question.correctAnswer
                      ? "#e8f5e9"
                      : "#ffffff",
                  border:
                    isReadOnly && optionIndex === question.correctAnswer
                      ? "2px solid #4caf50"
                      : optionError
                      ? "1px solid #d32f2f"
                      : "1px solid transparent",
                }}
              >
                <CardContent>
                  {/* 선택지 이미지 */}
                  {(option.image || option.imageUrl) && (
                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        height: "150px",
                        borderRadius: "8px",
                        overflow: "hidden",
                        boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
                        border: "1px solid #ddd",
                        marginBottom: "0.5rem",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
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
                          width: "auto",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                      {!isReadOnly && ( // 읽기 전용이 아닐 때만 삭제 버튼 표시
                        <Button
                          onClick={() =>
                            handleOptionChange(optionIndex, {
                              image: null,
                              imageUrl: "",
                            })
                          }
                          sx={{
                            color: "#ff6f61",
                            position: "absolute",
                            top: "4px",
                            right: "4px",
                          }}
                          size="small"
                        >
                          <Delete fontSize="small" />
                        </Button>
                      )}
                    </Box>
                  )}

                  {/* 선택지 텍스트 */}
                  <TextField
                    fullWidth
                    label={`선택지 ${optionIndex + 1}`}
                    value={option.text}
                    onChange={(e) =>
                      handleOptionChange(optionIndex, { text: e.target.value })
                    }
                    error={!!optionError}
                    helperText={optionError}
                    sx={{
                      "& .MuiInputBase-root": {
                        borderRadius: "8px",
                        backgroundColor: "#f9f9f9",
                      },
                      marginBottom: "0.5rem",
                    }}
                    disabled={isReadOnly}
                    multiline
                    minRows={1}
                  />

                  {/* 이미지 업로드 아이콘과 정답 버튼 */}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    {!isReadOnly && (
                      <IconButton
                        onClick={() => {
                          setImageDialogOpen(true);
                          setImageType("option");
                          setSelectedOptionIndex(optionIndex);
                        }}
                        sx={{
                          backgroundColor: "#ffcc00",
                          color: "#000",
                          borderRadius: "8px",
                          padding: "4px",
                          "&:hover": { backgroundColor: "#ffaa00" },
                        }}
                      >
                        <Image fontSize="small" />
                      </IconButton>
                    )}

                    {!isReadOnly && (
                      <Button
                        onClick={() => handleCorrectAnswerChange(optionIndex)}
                        variant={
                          question.correctAnswer === optionIndex
                            ? "contained"
                            : "outlined"
                        }
                        sx={{
                          color:
                            question.correctAnswer === optionIndex
                              ? "#fff"
                              : "#ff9800",
                          backgroundColor:
                            question.correctAnswer === optionIndex
                              ? "#ff9800"
                              : "transparent",
                          borderColor:
                            question.correctAnswer !== optionIndex &&
                            isCorrectAnswerNotSet &&
                            question.options.every(
                              (opt) =>
                                opt.text.trim() === "" &&
                                !opt.imageUrl &&
                                !opt.image
                            )
                              ? "#d32f2f"
                              : question.correctAnswer === optionIndex
                              ? undefined
                              : "#ff9800", // 정답 미선택 및 모든 옵션 비었을때 테두리 빨갛게 (선택적)
                          "&:hover": {
                            backgroundColor:
                              question.correctAnswer === optionIndex
                                ? "#fb8c00"
                                : "rgba(255, 152, 0, 0.08)",
                          },
                          borderRadius: "8px",
                          fontSize: "0.875rem",
                          minWidth: "90px",
                        }}
                      >
                        {question.correctAnswer === optionIndex
                          ? "정답"
                          : "정답 설정"}
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* 문제 삭제 버튼 */}
      {!isReadOnly && ( // 읽기 전용이 아닐 때만 문제 삭제 버튼 표시
        <IconButton
          color="error"
          onClick={() => removeQuestion(questionIndex)}
          sx={{
            marginTop: "1.5rem",
            backgroundColor: "#f44336",
            color: "#fff",
            borderRadius: "8px",
          }}
        >
          <Delete />
        </IconButton>
      )}

      {/* 이미지 업로드 다이얼로그 */}
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
            : selectedOptionIndex !== null
            ? question.options[selectedOptionIndex].imageUrl
            : ""
        }
        imageFile={
          imageType === "question"
            ? question.image
            : selectedOptionIndex !== null
            ? question.options[selectedOptionIndex].image
            : null
        }
      />
    </Box>
  );
};

export default QuizSlide;
