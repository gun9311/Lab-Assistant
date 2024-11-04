import React from "react";
import { Box, Typography, Grid, Card, CardContent, IconButton, Button } from "@mui/material";
import { Add, Edit } from "@mui/icons-material";
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
  isReadOnly = false, // 기본값을 편집 가능 모드로 설정
}) => {
  return (
    <Box sx={{ padding: "2rem", backgroundColor: "#ffffff", borderRadius: "16px", boxShadow: "0px 6px 20px rgba(0, 0, 0, 0.1)" }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold", color: "#333" }}>
        {isReadOnly ? "전체 보기" : "퀴즈 검토 및 저장"} {/* 읽기 전용일 때 텍스트 변경 */}
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
                  {question.questionText || "문제를 입력하세요."}
                </Typography>

                {(question.imageUrl || question.image) && (
                  <Box mt={1}>
                    <img
                      src={question.image ? URL.createObjectURL(question.image) : question.imageUrl}
                      alt="문제 이미지"
                      style={{
                        maxWidth: "100%",
                        borderRadius: "8px",
                        boxShadow: "0px 2px 5px rgba(0, 0, 0, 0.1)",
                      }}
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
                        {`${optIndex + 1}. ${option.text || ((option.image || option.imageUrl) ? "" : "선택지를 입력하세요")}`}
                      </Typography>

                      {(option.imageUrl || option.image) && (
                        <img
                          src={option.image ? URL.createObjectURL(option.image) : option.imageUrl}
                          alt={`선택지 ${optIndex + 1} 이미지`}
                          style={{
                            width: "30px",
                            height: "30px",
                            marginLeft: "0.5rem",
                            borderRadius: "4px",
                            boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              </CardContent>

              {/* 읽기 전용이 아닐 때만 문제 편집 버튼 표시 */}
              {!isReadOnly && (
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
              )}
            </Card>
          </Grid>
        ))}

        {/* 문제 추가 카드: 읽기 전용이 아닐 때만 표시 */}
        {!isReadOnly && (
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
        )}
      </Grid>
    </Box>
  );
};

export default ReviewSlide;
