import React from "react";
import { Box, List, ListItem, ListItemText, Typography, Button } from "@mui/material";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { Question } from "../types";

type QuestionListPanelProps = {
  questions: Question[];
  currentSlideIndex: number;
  moveToSlide: (index: number) => void;
  reorderQuestions: (startIndex: number, endIndex: number) => void;
  goToReview: () => void; // 검토 슬라이드로 이동 함수 추가
};

const QuestionListPanel: React.FC<QuestionListPanelProps> = ({
  questions,
  currentSlideIndex,
  moveToSlide,
  reorderQuestions,
  goToReview,
}) => {
  const handleDragEnd = (result: any) => {
    const { destination, source } = result;
    if (!destination || destination.index === source.index) return;

    reorderQuestions(source.index, destination.index); // 문제 순서 반영
    moveToSlide(currentSlideIndex);
  };

  return (
    <Box>
      <Typography variant="h6">문제 목록</Typography>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="question-list">
          {(provided:any) => (
            <List {...provided.droppableProps} ref={provided.innerRef}>
              {questions.map((question, index) => (
                <Draggable key={index} draggableId={String(index)} index={index}>
                  {(provided:any) => (
                    <ListItem
                      button
                      selected={currentSlideIndex === index + 1}
                      onClick={() => moveToSlide(index + 1)}
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      <ListItemText primary={`문제 ${index + 1}`} />
                    </ListItem>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </List>
          )}
        </Droppable>
      </DragDropContext>

      {/* "퀴즈 검토 및 저장" 버튼 추가 */}
      <Button
        variant="contained"
        color="primary"
        onClick={goToReview}
        sx={{ marginTop: "1rem", width: "100%" }}
      >
        퀴즈 검토 및 저장
      </Button>
    </Box>
  );
};

export default QuestionListPanel;
