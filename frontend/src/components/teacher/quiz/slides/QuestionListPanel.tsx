import React from "react";
import { Box, List, ListItem, ListItemText, Typography, Button, IconButton } from "@mui/material";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { Question } from "../types";
import { CheckCircle, DragIndicator } from "@mui/icons-material";

type QuestionListPanelProps = {
  questions: Question[];
  currentSlideIndex: number;
  moveToSlide: (index: number) => void;
  reorderQuestions: (startIndex: number, endIndex: number) => void;
  goToReview: () => void;
  isReviewSlide: boolean;
  isReadOnly?: boolean; // NEW: 읽기 전용 모드 추가
};

const QuestionListPanel: React.FC<QuestionListPanelProps> = ({
  questions,
  currentSlideIndex,
  moveToSlide,
  reorderQuestions,
  goToReview,
  isReviewSlide,
  isReadOnly = false, // 기본값은 편집 모드
}) => {
  const handleDragEnd = (result: any) => {
    const { destination, source } = result;
    if (!destination || destination.index === source.index) return;
    reorderQuestions(source.index, destination.index);
    moveToSlide(currentSlideIndex);
  };

  return (
    <Box
      sx={{
        padding: "1rem",
        backgroundColor: "#f9f9f9",
        borderRadius: "12px",
        boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.05)",
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: "bold", color: "#333", marginBottom: "1rem" }}>
        문제 목록
      </Typography>

      <DragDropContext onDragEnd={isReadOnly ? undefined : handleDragEnd}>
        <Droppable droppableId="question-list">
          {(provided: any) => (
            <List {...provided.droppableProps} ref={provided.innerRef}>
              {questions.map((question, index) => (
                <Draggable
                  key={index}
                  draggableId={String(index)}
                  index={index}
                  isDragDisabled={isReadOnly} // NEW: 읽기 전용일 때 드래그 비활성화
                >
                  {(provided: any, snapshot: any) => (
                    <ListItem
                      button
                      selected={currentSlideIndex === index + 1}
                      onClick={() => moveToSlide(index + 1)}
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...(!isReadOnly && provided.dragHandleProps)} // NEW: 읽기 전용일 때 드래그 핸들 제거
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        borderRadius: "8px",
                        marginBottom: "8px",
                        backgroundColor:
                          currentSlideIndex === index + 1 ? "#fff9e6" : "#fff",
                        boxShadow: snapshot.isDragging
                          ? "0px 4px 8px rgba(0, 0, 0, 0.15)"
                          : "0px 2px 4px rgba(0, 0, 0, 0.1)",
                        transition: "background-color 0.3s ease",
                        padding: "0.5rem 1rem",
                      }}
                    >
                      {/* 드래그 핸들 아이콘 (읽기 전용일 때 비활성화) */}
                      {!isReadOnly && (
                        <IconButton
                          edge="start"
                          sx={{
                            color: "#ccc",
                            cursor: "move",
                            "&:hover": { color: "#888" },
                          }}
                        >
                          <DragIndicator fontSize="small" />
                        </IconButton>
                      )}

                      {/* 문제 텍스트 일부 표시, 텍스트가 없을 경우 '비어있음' 표시 */}
                      <ListItemText
                        primary={`${index + 1}. ${
                          question.questionText ? question.questionText.slice(0, 10) + "..." : "문제 없음"
                        }`}
                        primaryTypographyProps={{
                          fontSize: "1rem",
                          fontWeight: currentSlideIndex === index + 1 ? "bold" : "normal",
                          color: currentSlideIndex === index + 1 ? "#f57c00" : "#333",
                        }}
                      />

                      {/* 선택된 문제 아이콘 */}
                      {currentSlideIndex === index + 1 && (
                        <CheckCircle
                          sx={{
                            color: "#f57c00",
                            fontSize: "1rem",
                            marginLeft: "auto",
                          }}
                        />
                      )}
                    </ListItem>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </List>
          )}
        </Droppable>
      </DragDropContext>

      {/* 검토 버튼: 읽기 전용일 때는 "전체 보기" 텍스트로 표시 */}
      <Button
        variant="contained"
        onClick={goToReview}
        fullWidth
        disabled={isReviewSlide} // 리뷰 슬라이드일 때 비활성화
        sx={{
          marginTop: "1.5rem",
          borderRadius: "8px",
          backgroundColor: isReviewSlide ? "#bdbdbd" : "#ff9800",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "1rem",
          paddingY: "0.8rem",
          boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
          "&:hover": { backgroundColor: isReviewSlide ? "#bdbdbd" : "#fb8c00" },
        }}
      >
        {isReadOnly ? "전체 보기" : isReviewSlide ? "퀴즈 검토 중" : "퀴즈 검토 및 저장"}
      </Button>
    </Box>
  );
};

export default QuestionListPanel;
