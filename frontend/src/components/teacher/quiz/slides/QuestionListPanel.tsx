import React, { useState, useEffect } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  Button,
  IconButton,
  Checkbox,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormGroup,
  FormControlLabel,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from "@mui/material";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { Question } from "../types";
import {
  CheckCircle,
  DragIndicator,
  ErrorOutline,
  SettingsApplications,
  ExpandMore as ExpandMoreIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ViewList as ViewListIcon,
  Add as AddIcon,
  DeleteSweep as DeleteSweepIcon,
  UploadFile as UploadFileIcon,
} from "@mui/icons-material";

type QuestionListPanelProps = {
  questions: Question[];
  currentSlideIndex: number;
  moveToSlide: (index: number) => void;
  reorderQuestions: (startIndex: number, endIndex: number) => void;
  goToReview: () => void;
  isReviewSlide: boolean;
  isReadOnly?: boolean;
  selectedQuestionIndexes: number[];
  onSelectQuestion: (index: number, isSelected: boolean) => void;
  onBatchUpdate: (
    updateType: "timeLimit" | "questionType",
    value: any,
    target: "all" | "selected"
  ) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  addQuestion: () => void;
  removeSelectedQuestions: () => void;
  onCsvUpload: () => void;
};

const QuestionListPanel: React.FC<QuestionListPanelProps> = ({
  questions,
  currentSlideIndex,
  moveToSlide,
  reorderQuestions,
  goToReview,
  isReviewSlide,
  isReadOnly = false,
  selectedQuestionIndexes,
  onSelectQuestion,
  onBatchUpdate,
  isCollapsed,
  onToggleCollapse,
  addQuestion,
  removeSelectedQuestions,
  onCsvUpload,
}) => {
  const [batchTimeLimit, setBatchTimeLimit] = useState<number>(30);
  const [batchQuestionType, setBatchQuestionType] =
    useState<string>("multiple-choice");
  const [selectAll, setSelectAll] = useState(false);
  const [isBatchToolsExpanded, setIsBatchToolsExpanded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // 입력 필드에 포커스가 있을 때는 키보드 탐색을 비활성화합니다.
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable=true]")) {
        return;
      }

      if (event.key === "ArrowLeft") {
        if (isReviewSlide) {
          if (questions.length > 0) {
            moveToSlide(questions.length);
          }
        } else if (currentSlideIndex > 1) {
          moveToSlide(currentSlideIndex - 1);
        }
      } else if (event.key === "ArrowRight") {
        if (!isReviewSlide) {
          if (currentSlideIndex < questions.length) {
            moveToSlide(currentSlideIndex + 1);
          } else {
            goToReview();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    currentSlideIndex,
    isReviewSlide,
    questions.length,
    moveToSlide,
    goToReview,
  ]);

  const handleDragEnd = (result: any) => {
    const { destination, source } = result;
    if (!destination || destination.index === source.index) return;
    reorderQuestions(source.index, destination.index);
    onSelectQuestion(-1, false);
    setSelectAll(false);
  };

  const isQuestionInvalid = (q: Question): boolean => {
    if (isReadOnly) return false;
    return (
      !q.questionText.trim() ||
      q.correctAnswer === -1 ||
      q.timeLimit <= 0 ||
      (q.questionType === "multiple-choice" &&
        q.options.filter(
          (opt) => opt.text.trim() !== "" || opt.imageUrl || opt.image
        ).length < 2)
    );
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = event.target.checked;
    setSelectAll(isChecked);
    questions.forEach((_, index) => {
      onSelectQuestion(index, isChecked);
    });
  };

  const handleApplyBatchTimeLimit = (target: "all" | "selected") => {
    if (batchTimeLimit <= 0) {
      alert("시간 제한은 0보다 커야 합니다.");
      return;
    }
    onBatchUpdate("timeLimit", batchTimeLimit, target);
  };

  const handleApplyBatchQuestionType = (target: "all" | "selected") => {
    onBatchUpdate("questionType", batchQuestionType, target);
  };

  return (
    <Box
      sx={{
        padding: isCollapsed ? "0.5rem 0" : "1rem",
        backgroundColor: "#f9f9f9",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
      }}
    >
      <Tooltip
        title={isCollapsed ? "목록 펼치기" : "목록 접기"}
        placement="right"
      >
        <IconButton
          onClick={onToggleCollapse}
          sx={{
            position: "absolute",
            top: isCollapsed ? "calc(50% - 20px)" : "8px",
            right: isCollapsed ? "-18px" : "-18px",
            zIndex: 10,
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            padding: "6px",
            transition: "top 0.3s ease, right 0.3s ease",
            "&:hover": {
              backgroundColor: "#f5f5f5",
            },
          }}
        >
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Tooltip>

      {!isCollapsed && (
        <>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
              pr: 3,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: "#333",
                textAlign: "left",
              }}
            >
              문제 목록
            </Typography>

            {!isReadOnly && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={onCsvUpload}
                sx={{
                  fontSize: "0.75rem",
                  py: 0.5,
                  px: 1,
                  borderRadius: "6px",
                  borderColor: "#e0e0e0",
                  color: "#666",
                  minWidth: "auto",
                  "&:hover": {
                    borderColor: "#1976d2",
                    color: "#1976d2",
                    backgroundColor: "rgba(25, 118, 210, 0.04)",
                  },
                }}
              >
                CSV
              </Button>
            )}
          </Box>

          {!isReadOnly && (
            <Accordion
              expanded={isBatchToolsExpanded}
              onChange={() => setIsBatchToolsExpanded(!isBatchToolsExpanded)}
              sx={{
                mb: 2,
                boxShadow: "none",
                border: "1px solid #e0e0e0",
                borderRadius: "8px !important",
                "&:before": { display: "none" },
                backgroundColor: isBatchToolsExpanded ? "#f0f0f0" : "#f9f9f9",
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="batch-tools-content"
                id="batch-tools-header"
                sx={{
                  minHeight: "48px !important",
                  "& .MuiAccordionSummary-content": {
                    margin: "10px 0 !important",
                    alignItems: "center",
                  },
                }}
              >
                <SettingsApplications sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
                  일괄 변경
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                sx={{
                  p: 1.5,
                  pt: 0,
                  backgroundColor: "#f0f0f0",
                  borderTop: "1px solid #e0e0e0",
                }}
              >
                <FormControl fullWidth margin="dense">
                  <TextField
                    label="시간 제한 (초)"
                    type="number"
                    size="small"
                    value={batchTimeLimit}
                    onChange={(e) =>
                      setBatchTimeLimit(parseInt(e.target.value, 10) || 1)
                    }
                    InputProps={{ inputProps: { min: 1 } }}
                    sx={{
                      "& .MuiInputBase-root": {
                        borderRadius: "6px",
                        backgroundColor: "#fff",
                      },
                    }}
                  />
                </FormControl>
                <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleApplyBatchTimeLimit("selected")}
                    sx={{
                      flexGrow: 1,
                      backgroundColor: "#fff",
                      "&:hover": { backgroundColor: "#f5f5f5" },
                    }}
                    disabled={selectedQuestionIndexes.length === 0}
                  >
                    선택 적용
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleApplyBatchTimeLimit("all")}
                    sx={{
                      flexGrow: 1,
                      backgroundColor: "#fff",
                      "&:hover": { backgroundColor: "#f5f5f5" },
                    }}
                  >
                    전체 적용
                  </Button>
                </Box>

                <FormControl fullWidth margin="dense" sx={{ mt: 1.5 }}>
                  <InputLabel
                    id="batch-question-type-label"
                    sx={{
                      fontSize: "0.85rem",
                      transform: batchQuestionType
                        ? "translate(10px, -7px) scale(0.75)"
                        : "translate(10px, 7px) scale(1)",
                      backgroundColor: batchQuestionType
                        ? "transparent"
                        : "#fff",
                    }}
                  >
                    문제 유형
                  </InputLabel>
                  <Select
                    labelId="batch-question-type-label"
                    value={batchQuestionType}
                    onChange={(e) => setBatchQuestionType(e.target.value)}
                    size="small"
                    sx={{
                      "& .MuiSelect-select": {
                        borderRadius: "6px",
                        backgroundColor: "#fff",
                      },
                    }}
                  >
                    <MenuItem value="multiple-choice">선택형</MenuItem>
                    <MenuItem value="true-false">참/거짓</MenuItem>
                  </Select>
                </FormControl>
                <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleApplyBatchQuestionType("selected")}
                    sx={{
                      flexGrow: 1,
                      backgroundColor: "#fff",
                      "&:hover": { backgroundColor: "#f5f5f5" },
                    }}
                    disabled={selectedQuestionIndexes.length === 0}
                  >
                    선택 적용
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleApplyBatchQuestionType("all")}
                    sx={{
                      flexGrow: 1,
                      backgroundColor: "#fff",
                      "&:hover": { backgroundColor: "#f5f5f5" },
                    }}
                  >
                    전체 적용
                  </Button>
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteSweepIcon />}
                  onClick={removeSelectedQuestions}
                  disabled={selectedQuestionIndexes.length === 0}
                  sx={{
                    mt: 1.5,
                    backgroundColor: "#fff",
                    borderColor: "#d32f2f",
                    color: "#d32f2f",
                    "&:hover": {
                      backgroundColor: "rgba(211, 47, 47, 0.04)",
                      borderColor: "#c62828",
                    },
                  }}
                >
                  삭제 ({selectedQuestionIndexes.length}개)
                </Button>
              </AccordionDetails>
            </Accordion>
          )}

          {!isReadOnly && questions.length > 0 && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={
                    selectAll &&
                    questions.length > 0 &&
                    selectedQuestionIndexes.length === questions.length
                  }
                  onChange={handleSelectAll}
                  disabled={isReadOnly || questions.length === 0}
                  size="small"
                />
              }
              label={
                selectedQuestionIndexes.length > 0
                  ? `${selectedQuestionIndexes.length} / ${questions.length}개 선택`
                  : "전체 선택"
              }
              sx={{
                mb: 1,
                color:
                  questions.length === 0 ? "text.disabled" : "text.primary",
                height: "30px",
                lineHeight: "30px",
              }}
            />
          )}

          <Box
            sx={{ flexGrow: 1, overflowY: "auto", pr: isCollapsed ? 0 : "4px" }}
          >
            <DragDropContext onDragEnd={isReadOnly ? undefined : handleDragEnd}>
              <Droppable droppableId="question-list">
                {(provided: any) => (
                  <List
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    dense
                    sx={{ pt: 0 }}
                  >
                    {questions.map((question, index) => (
                      <Draggable
                        key={`q-item-${index}`}
                        draggableId={`q-drag-${index}`}
                        index={index}
                        isDragDisabled={isReadOnly}
                      >
                        {(providedDraggable: any, snapshot: any) => (
                          <ListItem
                            button={!isReadOnly}
                            selected={currentSlideIndex === index + 1}
                            onClick={() => moveToSlide(index + 1)}
                            ref={providedDraggable.innerRef}
                            {...providedDraggable.draggableProps}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              borderRadius: "8px",
                              mb: "8px",
                              backgroundColor:
                                currentSlideIndex === index + 1
                                  ? "#fff9e6"
                                  : snapshot.isDragging
                                  ? "#e3f2fd"
                                  : selectedQuestionIndexes.includes(index)
                                  ? "#e8eaf6"
                                  : "#fff",
                              boxShadow: snapshot.isDragging
                                ? "0px 4px 8px rgba(0, 0, 0, 0.15)"
                                : "0px 1px 3px rgba(0, 0, 0, 0.1)",
                              transition:
                                "background-color 0.2s ease-out, box-shadow 0.2s ease-out",
                              padding: "4px 8px",
                              minHeight: "52px",
                              border:
                                currentSlideIndex === index + 1
                                  ? "1px solid #f57c00"
                                  : selectedQuestionIndexes.includes(index)
                                  ? "1px solid #3f51b5"
                                  : "1px solid #eee",
                            }}
                          >
                            {!isReadOnly && (
                              <>
                                <Checkbox
                                  edge="start"
                                  checked={selectedQuestionIndexes.includes(
                                    index
                                  )}
                                  onChange={(e) =>
                                    onSelectQuestion(index, e.target.checked)
                                  }
                                  size="small"
                                  sx={{ padding: "2px", mr: "6px" }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <IconButton
                                  edge="start"
                                  {...providedDraggable.dragHandleProps}
                                  sx={{
                                    color: "#757575",
                                    cursor: "grab",
                                    "&:hover": {
                                      color: "#333",
                                      backgroundColor: "rgba(0,0,0,0.04)",
                                    },
                                    padding: "4px",
                                    mr: "6px",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <DragIndicator fontSize="small" />
                                </IconButton>
                              </>
                            )}

                            <ListItemText
                              primary={`${index + 1}. ${
                                question.questionText
                                  ? question.questionText.length >
                                    (isReadOnly ? 15 : 12)
                                    ? question.questionText.slice(
                                        0,
                                        isReadOnly ? 15 : 12
                                      ) + "..."
                                    : question.questionText
                                  : "문제 내용 없음"
                              }`}
                              secondary={
                                isReadOnly
                                  ? `유형: ${
                                      question.questionType ===
                                      "multiple-choice"
                                        ? "선택형"
                                        : "참/거짓"
                                    }, 시간: ${question.timeLimit}초`
                                  : null
                              }
                              primaryTypographyProps={{
                                fontSize: "0.875rem",
                                fontWeight:
                                  currentSlideIndex === index + 1
                                    ? "600"
                                    : "500",
                                color:
                                  currentSlideIndex === index + 1
                                    ? "#f57c00"
                                    : isQuestionInvalid(question) && !isReadOnly
                                    ? "#d32f2f"
                                    : "#212121",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              secondaryTypographyProps={{
                                fontSize: "0.7rem",
                                color: "text.secondary",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              sx={{ my: 0 }}
                            />

                            {isQuestionInvalid(question) && !isReadOnly && (
                              <ErrorOutline
                                sx={{
                                  color: "#d32f2f",
                                  fontSize: "1rem",
                                  marginLeft: "auto",
                                  mr:
                                    currentSlideIndex === index + 1 ? "4px" : 0,
                                }}
                              />
                            )}

                            {currentSlideIndex === index + 1 && (
                              <CheckCircle
                                sx={{
                                  color: "#f57c00",
                                  fontSize: "1rem",
                                  marginLeft:
                                    isQuestionInvalid(question) && !isReadOnly
                                      ? "2px"
                                      : "auto",
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
          </Box>

          <Divider sx={{ my: 1 }} />

          {!isReadOnly && (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addQuestion}
              fullWidth
              sx={{
                mt: 1,
                mb: 1,
                borderRadius: "8px",
                borderColor: "#ff9800",
                color: "#ff9800",
                fontWeight: "medium",
                fontSize: "0.85rem",
                paddingY: "0.5rem",
                boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.05)",
                "&:hover": {
                  backgroundColor: "rgba(255, 152, 0, 0.04)",
                  borderColor: "#fb8c00",
                },
              }}
            >
              문제 추가
            </Button>
          )}

          <Button
            variant="contained"
            onClick={goToReview}
            fullWidth
            disabled={isReviewSlide && !isReadOnly}
            sx={{
              marginTop: "auto",
              borderRadius: "8px",
              backgroundColor:
                isReviewSlide && !isReadOnly ? "#bdbdbd" : "#ff9800",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "0.9rem",
              paddingY: "0.6rem",
              boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.1)",
              "&:hover": {
                backgroundColor:
                  isReviewSlide && !isReadOnly ? "#bdbdbd" : "#fb8c00",
              },
            }}
          >
            {isReadOnly
              ? "전체 보기"
              : isReviewSlide
              ? "퀴즈 검토 중"
              : "퀴즈 검토 및 저장"}
          </Button>
        </>
      )}
      {isCollapsed && (
        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Tooltip title="문제 목록">
            <ViewListIcon fontSize="large" sx={{ color: "#757575" }} />
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export default QuestionListPanel;
