import React from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton,
  Button,
} from "@mui/material";
import { Add, Edit, CheckCircleOutline, AccessTime } from "@mui/icons-material";
import { Question } from "../types";

type ReviewSlideProps = {
  questions: Question[];
  addQuestion: () => void;
  moveToSlide: (index: number) => void;
  isReadOnly?: boolean; // 읽기 전용 모드 여부
};

const ReviewSlide: React.FC<ReviewSlideProps> = ({
  questions,
  addQuestion,
  moveToSlide,
  isReadOnly = false,
}) => {
  return (
    <Box
      sx={{
        padding: "2rem",
        backgroundColor: "#f5f7fa",
        borderRadius: "16px",
      }}
    >
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: "bold", color: "#2c3e50" }}
      >
        {isReadOnly ? "전체 보기" : "퀴즈 검토 및 저장"}
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {questions.map((question, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                "&:hover": {
                  transform: "scale(1.03)",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.12)",
                },
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CardContent sx={{ flexGrow: 1, padding: "16px" }}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={2}
                >
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: "bold", color: "#34495e" }}
                  >
                    {`문제 ${index + 1}`}
                  </Typography>

                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      display="flex"
                      alignItems="center"
                      color="text.secondary"
                    >
                      <AccessTime sx={{ fontSize: "1rem", mr: 0.5 }} />
                      <Typography
                        variant="caption"
                        sx={{ fontSize: "0.8rem", lineHeight: 1 }}
                      >{`${question.timeLimit}초`}</Typography>
                    </Box>
                    {!isReadOnly && (
                      <IconButton
                        aria-label="문제 수정"
                        size="small"
                        sx={{
                          backgroundColor: "rgba(0, 0, 0, 0.05)",
                          "&:hover": {
                            backgroundColor: "rgba(0, 0, 0, 0.1)",
                          },
                        }}
                        onClick={() => moveToSlide(index + 1)}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Box>
                <Typography
                  variant="body2"
                  gutterBottom
                  sx={{ color: "#34495e", minHeight: "40px" }}
                >
                  {question.questionText || "문제를 입력하세요."}
                </Typography>

                {(question.imageUrl || question.image) && (
                  <Box mt={1} mb={2}>
                    <img
                      src={
                        question.image
                          ? URL.createObjectURL(question.image)
                          : question.imageUrl
                      }
                      alt="문제 이미지"
                      style={{
                        width: "100%",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                  </Box>
                )}

                <Box mt="auto" pt={2}>
                  {question.options.map((option, optIndex) => (
                    <Box
                      key={optIndex}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        mb: 1,
                        p: 1,
                        borderRadius: "8px",
                        backgroundColor:
                          question.correctAnswer === optIndex
                            ? "#e8f5e9"
                            : "transparent",
                      }}
                    >
                      {question.correctAnswer === optIndex && (
                        <CheckCircleOutline
                          fontSize="small"
                          sx={{ color: "#4caf50", mr: 1 }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight:
                            question.correctAnswer === optIndex
                              ? "bold"
                              : "normal",
                          color:
                            question.correctAnswer === optIndex
                              ? "#2e7d32"
                              : "#34495e",
                        }}
                      >
                        {`${optIndex + 1}. ${
                          option.text ||
                          (option.image || option.imageUrl
                            ? ""
                            : "선택지를 입력하세요")
                        }`}
                      </Typography>
                      {(option.imageUrl || option.image) && (
                        <img
                          src={
                            option.image
                              ? URL.createObjectURL(option.image)
                              : option.imageUrl
                          }
                          alt={`선택지 ${optIndex + 1} 이미지`}
                          style={{
                            width: "24px",
                            height: "24px",
                            marginLeft: "auto",
                            borderRadius: "4px",
                          }}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {!isReadOnly && (
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="outlined"
              onClick={addQuestion}
              sx={{
                height: "100%",
                width: "100%",
                border: "2px dashed #bdc3c7",
                color: "#7f8c8d",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                transition: "border-color 0.3s, color 0.3s",
                "&:hover": {
                  borderColor: "#2980b9",
                  color: "#2980b9",
                  backgroundColor: "rgba(41, 128, 185, 0.05)",
                },
              }}
            >
              <Add sx={{ fontSize: 40 }} />
              <Typography>문제 추가</Typography>
            </Button>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default ReviewSlide;
