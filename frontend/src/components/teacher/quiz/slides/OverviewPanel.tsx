import React from "react";
import {
  Box,
  Typography,
  IconButton,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Button,
} from "@mui/material";
import { Image } from "@mui/icons-material";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { Question } from "../types";

type OverviewPanelProps = {
  title: string;
  setTitle: (title: string) => void;
  grade: string;
  setGrade: (grade: string) => void;
  semester: string;
  setSemester: (semester: string) => void;
  subject: string;
  setSubject: (subject: string) => void;
  unit: string;
  setUnit: (unit: string) => void;
  units: string[];
  questions: Question[];
  currentSlideIndex: number;
  moveToSlide: (index: number) => void;
  quizImage: File | null;
  quizImageUrl: string;
  setQuizImage: (image: File | null) => void;
  setQuizImageUrl: (url: string) => void;
  setImageDialogOpen: (open: boolean) => void;
};

const OverviewPanel: React.FC<OverviewPanelProps> = ({
  title,
  setTitle,
  grade,
  setGrade,
  semester,
  setSemester,
  subject,
  setSubject,
  unit,
  setUnit,
  units,
  questions,
  currentSlideIndex,
  moveToSlide,
  quizImage,
  quizImageUrl,
  setQuizImage,
  setQuizImageUrl,
  setImageDialogOpen,
}) => {
  const handleDragEnd = (result: any) => {
    const { destination, source } = result;
    if (!destination || destination.index === source.index) return;

    const reorderedQuestions = [...questions];
    const [movedItem] = reorderedQuestions.splice(source.index, 1);
    reorderedQuestions.splice(destination.index, 0, movedItem);
    moveToSlide(currentSlideIndex);
  };

  return (
    <Box sx={{ width: "250px", padding: "1rem", borderRight: "1px solid #ccc" }}>
      <Typography variant="h6">퀴즈 개요</Typography>

      <Typography variant="subtitle2">퀴즈 제목</Typography>
      <TextField
        fullWidth
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="퀴즈 제목 입력"
      />

      <Typography variant="subtitle2">학년</Typography>
      <TextField
        select
        label="학년"
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
        fullWidth
        sx={{ marginBottom: "1rem" }}
      >
        <MenuItem value="5">5</MenuItem>
        <MenuItem value="6">6</MenuItem>
      </TextField>

      <Typography variant="subtitle2">학기</Typography>
      <TextField
        select
        label="학기"
        value={semester}
        onChange={(e) => setSemester(e.target.value)}
        fullWidth
        sx={{ marginBottom: "1rem" }}
      >
        <MenuItem value="1학기">1학기</MenuItem>
        <MenuItem value="2학기">2학기</MenuItem>
      </TextField>

      <Typography variant="subtitle2">과목</Typography>
      <TextField
        select
        label="과목"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        fullWidth
        sx={{ marginBottom: "1rem" }}
      >
        <MenuItem value="수학">수학</MenuItem>
        <MenuItem value="과학">과학</MenuItem>
      </TextField>

      <Typography variant="subtitle2">단원</Typography>
      <TextField
        select
        label="단원"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        fullWidth
        sx={{ marginBottom: "1.5rem" }}
      >
        <MenuItem value="">단원 선택</MenuItem>
        {units.map((unit, index) => (
          <MenuItem key={index} value={unit}>{unit}</MenuItem>
        ))}
      </TextField>

      <Typography variant="subtitle2">퀴즈 이미지</Typography>
      <IconButton onClick={() => setImageDialogOpen(true)}>
        <Image />
      </IconButton>
      {(quizImage || quizImageUrl) && (
        <Box mt={2}>
          <img
            src={quizImage ? URL.createObjectURL(quizImage) : quizImageUrl}
            alt="퀴즈 이미지"
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <Button onClick={() => { setQuizImage(null); setQuizImageUrl(""); }}>이미지 삭제</Button>
        </Box>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="overview">
          {(provided:any) => (
            <List {...provided.droppableProps} ref={provided.innerRef} sx={{ mt: 2 }}>
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

      {/* 퀴즈 검토 버튼 추가 */}
      <Button
        variant="contained"
        color="primary"
        onClick={() => moveToSlide(questions.length + 1)}
        sx={{ marginTop: "1rem" }}
      >
        퀴즈 검토 및 저장
      </Button>
    </Box>
  );
};

export default OverviewPanel;
