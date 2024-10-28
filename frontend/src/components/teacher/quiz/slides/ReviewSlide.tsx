import React from "react";
import { Box, Button, Typography, Grid, Card, CardContent, IconButton } from "@mui/material";
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
    <Box sx={{ padding: "2rem" }}>
      <Typography variant="h4" gutterBottom>
        퀴즈 검토 및 저장
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        아래에서 모든 문제를 검토하고 필요 시 수정하세요.
      </Typography>

      <Grid container spacing={3}>
        {questions.map((question, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card variant="outlined" sx={{ position: "relative" }}>
              <CardContent>
                <Typography variant="h6">{`문제 ${index + 1}`}</Typography>
                <Typography variant="body2" gutterBottom>
                  {question.questionText || "문제 텍스트가 입력되지 않았습니다."}
                </Typography>

                {/* 이미지 렌더링 - 파일 또는 URL을 구분하여 표시 */}
                {question.imageUrl && (
                  <Box mt={1}>
                    <img src={question.imageUrl} alt="문제 이미지" style={{ maxWidth: "100%" }} />
                  </Box>
                )}
                {question.image && (
                  <Box mt={1}>
                    <img
                      src={URL.createObjectURL(question.image)}
                      alt="문제 이미지"
                      style={{ maxWidth: "100%" }}
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
                        }}
                      >
                        {`${optIndex + 1}. ${option.text || "선택지 텍스트 없음"}`}
                      </Typography>

                      {/* 선택지 이미지 렌더링 - 파일 또는 URL을 구분하여 표시 */}
                      {option.imageUrl && (
                        <img
                          src={option.imageUrl}
                          alt={`선택지 ${optIndex + 1} 이미지`}
                          style={{ width: "30px", height: "30px", marginLeft: "0.5rem" }}
                        />
                      )}
                      {option.image && (
                        <img
                          src={URL.createObjectURL(option.image)}
                          alt={`선택지 ${optIndex + 1} 이미지`}
                          style={{ width: "30px", height: "30px", marginLeft: "0.5rem" }}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              </CardContent>

              {/* 문제 수정 버튼 */}
              <IconButton
                aria-label="문제 수정"
                sx={{ position: "absolute", top: "10px", right: "10px" }}
                onClick={() => moveToSlide(index + 1)}
              >
                <Edit />
              </IconButton>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 문제 추가 버튼 */}
      <Box mt={3} display="flex" justifyContent="space-between">
        <Button variant="outlined" startIcon={<Add />} onClick={addQuestion}>
          문제 추가
        </Button>
      </Box>
    </Box>
  );
};

export default ReviewSlide;
