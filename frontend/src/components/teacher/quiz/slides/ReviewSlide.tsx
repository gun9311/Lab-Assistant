import React from "react";
import { Box, Typography, Grid, Card, CardContent, IconButton, Button } from "@mui/material";
import { Add, Edit } from "@mui/icons-material";
import { Question } from "../types";

type ReviewSlideProps = {
  questions: Question[];
  addQuestion: () => void;
  saveQuiz: () => void;
  moveToSlide: (index: number) => void;
};

const ReviewSlide: React.FC<ReviewSlideProps> = ({
  questions,
  addQuestion,
  saveQuiz,
  moveToSlide,
}) => {
  return (
    <Box sx={{ padding: "2rem", backgroundColor: "#ffffff", borderRadius: "16px", boxShadow: "0px 6px 20px rgba(0, 0, 0, 0.1)" }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold", color: "#333" }}>
        퀴즈 검토 및 저장
      </Typography>
      <Typography variant="subtitle1" gutterBottom sx={{ color: "#666" }}>
        아래에서 모든 문제를 검토하고 필요 시 수정하세요.
      </Typography>

      <Grid container spacing={3}>
        {questions.map((question, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              variant="outlined"
              sx={{
                borderRadius: "8px",
                boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
                position: "relative",
                padding: "1rem",
                backgroundColor: "#f9f9f9",
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "#333" }}>
                  {`문제 ${index + 1}`}
                </Typography>
                <Typography variant="body2" gutterBottom sx={{ color: "#555" }}>
                  {question.questionText || "문제 텍스트가 입력되지 않았습니다."}
                </Typography>

                {question.imageUrl && (
                  <Box mt={1}>
                    <img
                      src={question.imageUrl}
                      alt="문제 이미지"
                      style={{ maxWidth: "100%", borderRadius: "8px", boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.1)" }}
                    />
                  </Box>
                )}
                {question.image && (
                  <Box mt={1}>
                    <img
                      src={URL.createObjectURL(question.image)}
                      alt="문제 이미지"
                      style={{ maxWidth: "100%", borderRadius: "8px", boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.1)" }}
                    />
                  </Box>
                )}

                <Box mt={2}>
                  {question.options.map((option, optIndex) => (
                    <Box key={optIndex} display="flex" alignItems="center" mb={1}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: question.correctAnswer === optIndex ? "bold" : "normal",
                          color: question.correctAnswer === optIndex ? "#ff9800" : "#555",
                        }}
                      >
                        {`${optIndex + 1}. ${option.text || "선택지 텍스트 없음"}`}
                      </Typography>

                      {option.imageUrl && (
                        <img
                          src={option.imageUrl}
                          alt={`선택지 ${optIndex + 1} 이미지`}
                          style={{ width: "30px", height: "30px", marginLeft: "0.5rem", borderRadius: "4px", boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)" }}
                        />
                      )}
                      {option.image && (
                        <img
                          src={URL.createObjectURL(option.image)}
                          alt={`선택지 ${optIndex + 1} 이미지`}
                          style={{ width: "30px", height: "30px", marginLeft: "0.5rem", borderRadius: "4px", boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)" }}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              </CardContent>

              <IconButton
                aria-label="문제 수정"
                sx={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  backgroundColor: "#ff9800",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#fb8c00" },
                  borderRadius: "8px",
                }}
                onClick={() => moveToSlide(index + 1)}
              >
                <Edit />
              </IconButton>
            </Card>
          </Grid>
        ))}

        <Grid item xs={12} sm={6} md={4}>
          <Card
            variant="outlined"
            sx={{
              height: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: "8px",
              boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
              backgroundColor: "#ffecb3",
              color: "#555",
              transition: "background-color 0.2s ease",
              "&:hover": { backgroundColor: "#ffe082" },
            }}
          >
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={addQuestion}
              sx={{ color: "#ff9800", borderColor: "#ff9800", "&:hover": { borderColor: "#fb8c00" } }}
            >
              문제 추가
            </Button>
          </Card>
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="center" mt={3}>
        <Button
          variant="contained"
          color="primary"
          onClick={saveQuiz}
          sx={{
            padding: "0.75rem 2rem",
            borderRadius: "8px",
            backgroundColor: "#4caf50",
            "&:hover": { backgroundColor: "#43a047" },
          }}
        >
          퀴즈 저장
        </Button>
      </Box>
    </Box>
  );
};

export default ReviewSlide;
