import React, {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  Box,
  Snackbar,
  Divider,
  IconButton,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import OverviewPanel from "./slides/OverviewPanel";
import QuizSlide from "./slides/QuizSlide";
import ReviewSlide from "./slides/ReviewSlide";
import ImageUploadDialog from "./ImageUploadDialog";
import QuestionListPanel from "./slides/QuestionListPanel";
import { Question, Option } from "./types";
import { initialQuestion } from "./utils";
import { getUnits, createQuiz, updateQuiz } from "../../../utils/quizApi";
import { getSubjects } from "../../../utils/api";
import { useNavigate } from "react-router-dom";
import QuizPreviewModal from "./QuizPreviewModal";

export interface QuizContainerRef {
  save: () => void;
  openPreview: () => void;
  navigate: (direction: "prev" | "next") => void;
}

export interface ActionBarState {
  currentSlideIndex: number;
  totalQuestions: number;
  isReviewSlide: boolean;
}

interface QuizContainerProps {
  isEdit?: boolean;
  initialData?: any;
  isReadOnly?: boolean; // 읽기 전용 모드 추가
  onStateChange?: (state: ActionBarState) => void;
  // onStartQuiz, onEditQuiz props는 이제 부모가 직접 ActionBar에 전달하므로 제거
}

// localStorage 키 정의
const TEMP_QUIZ_DATA_KEY = "tempQuizData";
const QUESTION_LIST_PANEL_WIDTH = "280px"; // 패널 너비 상수로 정의 (기존 260px + 패딩 고려)
const QUESTION_LIST_PANEL_COLLAPSED_WIDTH = "60px"; // 접혔을 때 너비

const QuizContainer = forwardRef<QuizContainerRef, QuizContainerProps>(
  (
    {
      isEdit = false,
      initialData,
      isReadOnly = false,
      onStateChange,
    }: QuizContainerProps,
    ref
  ) => {
    const navigate = useNavigate();
    const [title, setTitle] = useState(initialData?.title || "");
    const [grade, setGrade] = useState(initialData?.grade || "");
    const [semester, setSemester] = useState(initialData?.semester || "");
    const [subject, setSubject] = useState(initialData?.subject || "");
    const [unit, setUnit] = useState(initialData?.unit || "");
    const [units, setUnits] = useState<string[]>([]);
    const [quizImage, setQuizImage] = useState<File | null>(null);
    const [quizImageUrl, setQuizImageUrl] = useState(
      initialData?.imageUrl || ""
    );

    const processedInitialQuestions = initialData?.questions
      ? initialData.questions.map((q: any) => ({
          ...q,
          correctAnswer:
            q.correctAnswer !== undefined &&
            q.correctAnswer !== null &&
            !isNaN(Number(q.correctAnswer))
              ? Number(q.correctAnswer)
              : -1,
          options: q.options.map((opt: any) => ({
            text: opt.text || "",
            imageUrl: opt.imageUrl || "",
            image: null, // 초기 데이터에서 파일 객체는 불러오지 않음
          })),
          image: null, // 초기 데이터에서 파일 객체는 불러오지 않음
          imageUrl: q.imageUrl || "",
        }))
      : [initialQuestion];

    const [questions, setQuestions] = useState<Question[]>(
      processedInitialQuestions
    );
    const [currentSlideIndex, setCurrentSlideIndex] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [isReviewSlide, setIsReviewSlide] = useState(false);
    const [subjects, setSubjects] = useState<string[]>([]);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [selectedQuestionIndexes, setSelectedQuestionIndexes] = useState<
      number[]
    >([]); // 선택된 문제 인덱스 상태
    const [isQuestionListCollapsed, setIsQuestionListCollapsed] =
      useState(false); // 문제 목록 패널 접힘 상태
    const [validationAttempted, setValidationAttempted] = useState(false); // 유효성 검사 시도 상태 추가
    const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] =
      useState(false); // 일괄 삭제 확인 다이얼로그

    useEffect(() => {
      if (!isEdit && !initialData && !isReadOnly) {
        try {
          const savedDataString = localStorage.getItem(TEMP_QUIZ_DATA_KEY);
          if (savedDataString) {
            const userAgreesToRestore = window.confirm(
              "이전에 작업하던 퀴즈 내용이 있습니다. 이어서 작업하시겠습니까?\n(취소 시 이전 내용은 삭제됩니다.)"
            );

            if (userAgreesToRestore) {
              const savedData = JSON.parse(savedDataString);
              if (savedData) {
                setTitle(savedData.title || "");
                setGrade(savedData.grade || "");
                setSemester(savedData.semester || "");
                setSubject(savedData.subject || "");
                setUnit(savedData.unit || "");
                setQuizImageUrl(savedData.quizImageUrl || "");
                const restoredQuestions = (
                  savedData.questions || [initialQuestion]
                ).map((q: any) => ({
                  ...q,
                  correctAnswer:
                    q.correctAnswer !== undefined &&
                    q.correctAnswer !== null &&
                    !isNaN(Number(q.correctAnswer))
                      ? Number(q.correctAnswer)
                      : -1,
                  options: q.options.map((opt: any) => ({
                    text: opt.text || "",
                    imageUrl: opt.imageUrl || "",
                    image: null,
                  })),
                  image: null,
                  imageUrl: q.imageUrl || "",
                }));
                setQuestions(restoredQuestions);
                setError(
                  "이전에 작업하던 내용을 불러왔습니다. 이미지는 필요한 경우 다시 첨부해주세요."
                );
              }
            } else {
              // 사용자가 복원을 원하지 않으면 임시 데이터 삭제
              localStorage.removeItem(TEMP_QUIZ_DATA_KEY);
            }
          }
        } catch (e) {
          console.error(
            "임시 저장된 퀴즈 데이터를 처리하는 데 실패했습니다.",
            e
          );
          localStorage.removeItem(TEMP_QUIZ_DATA_KEY); // 오류 발생 시 안전하게 데이터 제거
        }
      }
    }, [isEdit, initialData, isReadOnly]);

    useEffect(() => {
      if (!isEdit && !isReadOnly) {
        try {
          const dataToSave = {
            title,
            grade,
            semester,
            subject,
            unit,
            quizImageUrl,
            questions: questions.map((q) => ({
              ...q,
              image: null,
              options: q.options.map((opt) => ({ ...opt, image: null })),
            })),
          };
          localStorage.setItem(TEMP_QUIZ_DATA_KEY, JSON.stringify(dataToSave));
        } catch (e) {
          console.error("퀴즈 데이터를 임시 저장하는 데 실패했습니다.", e);
        }
      }
    }, [
      title,
      grade,
      semester,
      subject,
      unit,
      quizImageUrl,
      questions,
      isEdit,
      isReadOnly,
    ]);

    useEffect(() => {
      setIsReviewSlide(currentSlideIndex > questions.length);
    }, [currentSlideIndex, questions.length]);

    useEffect(() => {
      fetchUnits();
      if (!isReadOnly) {
        fetchSubjects();
      }
    }, [grade, semester, subject, isReadOnly]);

    const fetchUnits = useCallback(async () => {
      if (grade && semester && subject) {
        try {
          const { units: fetchedUnits } = await getUnits(
            grade,
            semester,
            subject
          );
          setUnits(fetchedUnits);
        } catch (error) {
          setError("단원 목록을 가져오는 중 오류가 발생했습니다.");
        }
      } else {
        setUnits([]);
      }
    }, [grade, semester, subject]);

    const fetchSubjects = useCallback(async () => {
      if (grade && semester) {
        try {
          const response = await getSubjects(parseInt(grade), [semester]);
          const fetchedSubjectsData = response.data;
          setSubjects(fetchedSubjectsData);
          if (subject && !fetchedSubjectsData.includes(subject)) {
            setSubject("");
            setUnit("");
          } else if (!subject && fetchedSubjectsData.length > 0) {
            // 만약 과목이 설정되지 않았고, 가져온 과목 목록이 있다면
            // 기본값으로 첫번째 과목을 설정하거나, 사용자가 선택하도록 둘 수 있습니다.
            // 여기서는 기존 로직대로 둡니다.
          }
        } catch (error) {
          setError("과목 목록을 가져오는 중 오류가 발생했습니다.");
          setSubjects([]);
        }
      } else {
        setSubjects([]);
        // 학년이나 학기가 없어지면 과목 및 단원도 초기화
        // setSubject(""); // 이 부분은 사용자가 직접 선택하는것이 나을 수 있어 주석처리
        // setUnit("");
      }
    }, [grade, semester, subject]);

    const addQuestion = () => {
      setQuestions([...questions, initialQuestion]);
      setCurrentSlideIndex(questions.length + 1);
      setValidationAttempted(false); // 새 문제 추가 시 유효성 검사 시도 상태 초기화
    };

    const updateQuestion = (index: number, updatedQuestion: Question) => {
      const updatedQuestions = [...questions];
      updatedQuestions[index] = updatedQuestion;
      setQuestions(updatedQuestions);
      setValidationAttempted(false); // 문제 순서 변경 시 유효성 검사 시도 상태 초기화
      setSelectedQuestionIndexes([]); // 간단하게 선택 해제
    };

    const removeQuestion = (index: number) => {
      const updatedQuestions = questions.filter((_, i) => i !== index);
      setQuestions(updatedQuestions);
      setSelectedQuestionIndexes((prev) =>
        prev
          .filter((idx) => idx !== index)
          .map((idx) => (idx > index ? idx - 1 : idx))
      ); // 삭제된 문제 인덱스 조정
      setCurrentSlideIndex(Math.max(1, currentSlideIndex - 1));
    };

    const moveToSlide = (index: number) => setCurrentSlideIndex(index);

    const reorderQuestions = (startIndex: number, endIndex: number) => {
      const reorderedQuestions = Array.from(questions);
      const [removed] = reorderedQuestions.splice(startIndex, 1);
      reorderedQuestions.splice(endIndex, 0, removed);
      setQuestions(reorderedQuestions);
      // 선택된 인덱스도 순서 변경에 맞춰 업데이트 (복잡하므로 여기서는 생략, 필요시 추가 구현)
      setSelectedQuestionIndexes([]); // 간단하게 선택 해제
    };

    const validateAll = (forSave: boolean = false): boolean => {
      if (!title.trim() && !isReadOnly) {
        setError("퀴즈 제목을 입력해주세요.");
        return false;
      }
      if (!isReadOnly) {
        // 읽기 전용이 아닐 때만 나머지 필드 검사
        if (!grade) {
          setError("학년을 선택해주세요.");
          return false;
        }
        if (!semester) {
          setError("학기를 선택해주세요.");
          return false;
        }
        if (!subject) {
          setError("과목을 선택해주세요.");
          return false;
        }
      }

      if (questions.length === 0 && !isReadOnly) {
        setError("최소 1개 이상의 문제가 필요합니다.");
        return false;
      }
      if (forSave && questions.length < 3 && !isReadOnly) {
        setError("퀴즈를 저장하려면 최소 3개 이상의 문제가 필요합니다.");
        return false;
      }

      if (!unit || unit.trim() === "") {
        setError("단원을 선택해주세요.");
        return false;
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.questionText.trim() && !isReadOnly) {
          setError(`문제 ${i + 1}: 문제 내용을 입력해주세요.`);
          setCurrentSlideIndex(i + 1);
          return false;
        }
        if (q.correctAnswer === -1 && !isReadOnly) {
          setError(`문제 ${i + 1}: 정답을 설정해주세요.`);
          setCurrentSlideIndex(i + 1);
          return false;
        }
        if (q.questionType === "multiple-choice" && !isReadOnly) {
          const filledOptions = q.options.filter(
            (opt) => opt.text.trim() !== "" || opt.imageUrl || opt.image
          );
          if (filledOptions.length < 2) {
            setError(
              `문제 ${
                i + 1
              }: 객관식 선택지는 최소 2개 이상 입력해야 합니다 (내용 또는 이미지).`
            );
            setCurrentSlideIndex(i + 1);
            return false;
          }
          if (filledOptions.length !== q.options.length) {
            setError(
              `문제 ${
                i + 1
              }: 비어있는 선택지가 있습니다. 내용을 입력하거나 선택지를 삭제해주세요.`
            );
            setCurrentSlideIndex(i + 1);
            return false;
          }
        }
        if (q.timeLimit <= 0 && !isReadOnly) {
          setError(`문제 ${i + 1}: 시간 제한은 0보다 커야 합니다.`);
          setCurrentSlideIndex(i + 1);
          return false;
        }
      }
      setError(null);
      return true;
    };

    const handleOpenPreviewModal = () => {
      setValidationAttempted(true); // 미리보기 시 유효성 검사 시도
      if (!validateAll(false)) {
        // 저장용 유효성 검사가 아님
        return;
      }
      setIsPreviewModalOpen(true);
    };

    const handleClosePreviewModal = () => {
      setIsPreviewModalOpen(false);
      setSelectedQuestionIndexes([]); // 적용 후 선택 해제
    };

    const handleSelectQuestion = (index: number, isSelected: boolean) => {
      if (isSelected) {
        setSelectedQuestionIndexes((prev) => [...new Set([...prev, index])]); // 중복 방지
      } else {
        setSelectedQuestionIndexes((prev) => prev.filter((i) => i !== index));
      }
    };

    const batchUpdateQuestions = (
      updateType: "timeLimit" | "questionType",
      value: number | string,
      target: "all" | "selected"
    ) => {
      if (target === "selected" && selectedQuestionIndexes.length === 0) {
        setError("일괄 적용할 문제를 선택해주세요.");
        return;
      }
      if (
        updateType === "timeLimit" &&
        typeof value === "number" &&
        value <= 0
      ) {
        setError("시간 제한은 0보다 커야 합니다.");
        return;
      }

      setQuestions((prevQuestions) =>
        prevQuestions.map((question, index) => {
          const shouldUpdate =
            target === "all" || selectedQuestionIndexes.includes(index);

          if (shouldUpdate) {
            let updatedQuestion = { ...question };
            if (updateType === "timeLimit") {
              updatedQuestion.timeLimit = value as number;
            } else if (updateType === "questionType") {
              updatedQuestion.questionType = value as string;
              // 문제 유형 변경 시 선택지 및 정답 초기화
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
            }
            return updatedQuestion;
          }
          return question;
        })
      );
      setError(
        `${target === "all" ? "모든" : "선택된"} 문제에 ${
          updateType === "timeLimit" ? "시간 제한" : "문제 유형"
        }이(가) 일괄 적용되었습니다.`
      );
      setSelectedQuestionIndexes([]); // 적용 후 선택 해제
    };

    const toggleQuestionListCollapse = () => {
      setIsQuestionListCollapsed(!isQuestionListCollapsed);
    };

    const removeSelectedQuestions = () => {
      if (selectedQuestionIndexes.length === 0) {
        setError("삭제할 문제를 선택해주세요.");
        return;
      }
      setShowDeleteConfirmDialog(true); // 삭제 확인 다이얼로그 표시
    };

    const confirmRemoveSelectedQuestions = () => {
      setQuestions((prevQuestions) =>
        prevQuestions.filter(
          (_, index) => !selectedQuestionIndexes.includes(index)
        )
      );
      setSelectedQuestionIndexes([]);
      setShowDeleteConfirmDialog(false);
      setError(`${selectedQuestionIndexes.length}개의 문제가 삭제되었습니다.`);
      if (
        currentSlideIndex >
        questions.length - selectedQuestionIndexes.length
      ) {
        setCurrentSlideIndex(
          Math.max(1, questions.length - selectedQuestionIndexes.length)
        );
      }
    };

    const handleNavigateItem = (newIndex: number) => {
      if (
        newIndex > currentSlideIndex &&
        currentSlideIndex <= questions.length
      ) {
        // 다음 문제로 이동 시도
        setValidationAttempted(true);
        const currentQ = questions[currentSlideIndex - 1];
        if (!isReadOnly) {
          if (!currentQ.questionText.trim()) {
            setError(`문제 ${currentSlideIndex}: 문제 내용을 입력해주세요.`);
            return;
          }
          if (currentQ.correctAnswer === -1) {
            setError(`문제 ${currentSlideIndex}: 정답을 설정해주세요.`);
            return;
          }
          if (currentQ.questionType === "multiple-choice") {
            const filledOptions = currentQ.options.filter(
              (opt) => opt.text.trim() !== "" || opt.imageUrl || opt.image
            );
            if (filledOptions.length < 2) {
              setError(
                `문제 ${currentSlideIndex}: 객관식 선택지는 최소 2개 이상 입력해야 합니다 (내용 또는 이미지).`
              );
              return;
            }
          }
          if (currentQ.timeLimit <= 0) {
            setError(
              `문제 ${currentSlideIndex}: 시간 제한은 0보다 커야 합니다.`
            );
            return;
          }
        }
      }
      setError(null); // 현재 슬라이드 유효하면 에러 없음
      setCurrentSlideIndex(newIndex);
      setValidationAttempted(false); // 슬라이드 이동 후에는 다시 false로 (해당 슬라이드 편집 전까지)
    };

    const saveQuiz = async () => {
      if (isReadOnly) return;
      setValidationAttempted(true); // 저장 시 유효성 검사 시도
      if (!validateAll(true)) {
        // 저장용 유효성 검사 (3문제 이상 등)
        return;
      }
      setError(null);

      try {
        const formData = new FormData();
        formData.append("title", title);
        formData.append("grade", grade);
        formData.append("subject", subject);
        formData.append("semester", semester);
        formData.append("unit", unit);

        if (quizImage) formData.append("image", quizImage);
        else if (quizImageUrl) formData.append("imageUrl", quizImageUrl);

        const formattedQuestions = questions.map((question) => {
          // eslint-disable-next-line no-unused-vars
          const { image, options, ...rest } = question;

          // 객관식 문제에 대해서만 내용이 없는(텍스트, 이미지 모두 없는) 선택지를 필터링합니다.
          const filteredOptions =
            question.questionType === "multiple-choice"
              ? options.filter(
                  (opt) => opt.text.trim() !== "" || opt.imageUrl || opt.image
                )
              : options;

          return {
            ...rest,
            // 필터링된 선택지로 교체하고, 각 선택지에서 File 객체(image)를 제외합니다.
            options: filteredOptions.map((opt) => ({
              text: opt.text,
              imageUrl: opt.imageUrl || null,
            })),
          };
        });

        formData.append("questions", JSON.stringify(formattedQuestions));

        questions.forEach((question, index) => {
          if (question.image)
            formData.append(`questionImages_${index}`, question.image);

          question.options.forEach((option, optionIndex) => {
            if (option.image)
              formData.append(
                `optionImages_${index}_${optionIndex}`,
                option.image
              );
          });
        });

        if (isEdit && initialData?._id) {
          await updateQuiz(initialData._id, formData);
        } else {
          await createQuiz(formData);
        }

        if (!isEdit) {
          localStorage.removeItem(TEMP_QUIZ_DATA_KEY);
        }
        navigate("/manage-quizzes");
      } catch (error) {
        console.error("퀴즈 저장에 실패했습니다.", error);
        // 에러 메시지 표시 (필요시)
        // if (error.response && error.response.data && error.response.data.error) {
        //   setError(error.response.data.error);
        // } else {
        //   setError("퀴즈 저장 중 오류가 발생했습니다.");
        // }
      }
    };

    useEffect(() => {
      onStateChange?.({
        currentSlideIndex,
        totalQuestions: questions.length,
        isReviewSlide,
      });
    }, [currentSlideIndex, questions.length, isReviewSlide, onStateChange]);

    useImperativeHandle(ref, () => ({
      save: saveQuiz,
      openPreview: handleOpenPreviewModal,
      navigate: (direction) => {
        if (direction === "prev") {
          handleNavigateItem(currentSlideIndex - 1);
        } else {
          handleNavigateItem(currentSlideIndex + 1);
        }
      },
    }));

    return (
      <Box
        sx={{
          pt: 2,
          backgroundColor: "#eef2f6",
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ mb: 2.5, px: { xs: 1, md: 2 } }}>
          <OverviewPanel
            title={title}
            setTitle={setTitle}
            grade={grade}
            setGrade={setGrade}
            semester={semester}
            setSemester={setSemester}
            subject={subject}
            setSubject={setSubject}
            subjects={subjects}
            unit={unit}
            setUnit={setUnit}
            units={units}
            quizImage={quizImage}
            quizImageUrl={quizImageUrl}
            setQuizImage={setQuizImage}
            setQuizImageUrl={setQuizImageUrl}
            setImageDialogOpen={setImageDialogOpen}
            isReadOnly={isReadOnly}
            validationAttempted={validationAttempted}
          />
        </Box>

        <Box display="flex" sx={{ px: { xs: 1, md: 2 } }}>
          <Box
            sx={{
              width: isQuestionListCollapsed
                ? QUESTION_LIST_PANEL_COLLAPSED_WIDTH
                : QUESTION_LIST_PANEL_WIDTH,
              minWidth: isQuestionListCollapsed
                ? QUESTION_LIST_PANEL_COLLAPSED_WIDTH
                : QUESTION_LIST_PANEL_WIDTH,
              padding: isQuestionListCollapsed ? "1rem 0.2rem" : "1.5rem",
              borderRight: "1px solid #ddd",
              backgroundColor: "#fafafa",
              borderRadius: "12px 0 0 12px",
              boxShadow: "1px 0 8px rgba(0, 0, 0, 0.05)",
              position: "sticky",
              top: "20px",
              alignSelf: "flex-start",
              maxHeight: "calc(100vh - 120px)",
              overflowY: "auto",
              transition:
                "width 0.3s ease, min-width 0.3s ease, padding 0.3s ease",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <QuestionListPanel
              questions={questions}
              currentSlideIndex={currentSlideIndex}
              moveToSlide={moveToSlide}
              reorderQuestions={reorderQuestions}
              goToReview={() => handleNavigateItem(questions.length + 1)}
              isReviewSlide={isReviewSlide}
              isReadOnly={isReadOnly}
              selectedQuestionIndexes={selectedQuestionIndexes}
              onSelectQuestion={handleSelectQuestion}
              onBatchUpdate={batchUpdateQuestions}
              isCollapsed={isQuestionListCollapsed}
              onToggleCollapse={toggleQuestionListCollapse}
              addQuestion={addQuestion}
              removeSelectedQuestions={removeSelectedQuestions}
            />
          </Box>

          <Box
            sx={{
              flex: 1,
              padding: { xs: "1rem", md: "2rem" },
              backgroundColor: "#ffffff",
              boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.08)",
              borderRadius: "8px",
              marginLeft: "1rem",
              minHeight: "calc(100vh - 160px)",
            }}
          >
            {currentSlideIndex <= questions.length ? (
              <QuizSlide
                question={questions[currentSlideIndex - 1]}
                questionIndex={currentSlideIndex - 1}
                updateQuestion={updateQuestion}
                removeQuestion={removeQuestion}
                isReadOnly={isReadOnly}
                validationAttempted={validationAttempted}
                totalQuestions={questions.length}
              />
            ) : (
              <ReviewSlide
                questions={questions}
                addQuestion={addQuestion}
                moveToSlide={moveToSlide}
                isReadOnly={isReadOnly}
              />
            )}
          </Box>
        </Box>

        <ImageUploadDialog
          open={imageDialogOpen}
          onClose={() => setImageDialogOpen(false)}
          onImageChange={(file) => {
            setQuizImage(file);
            setQuizImageUrl("");
          }}
          onImageUrlChange={(url) => {
            setQuizImageUrl(url);
            setQuizImage(null);
          }}
          imageFile={quizImage}
          imageUrl={quizImageUrl}
        />

        {error && (
          <Snackbar
            open={true}
            autoHideDuration={6000}
            onClose={() => setError(null)}
            message={error}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            sx={{
              bottom: "80px !important",
              "& .MuiSnackbarContent-root": {
                backgroundColor:
                  error &&
                  (error.includes("불러왔습니다") ||
                    error.includes("복원") ||
                    error.includes("적용되었습니다") ||
                    error.includes("삭제되었습니다"))
                    ? "#4caf50"
                    : "#d32f2f",
                color: "#ffffff",
                fontWeight: "bold",
                borderRadius: "8px",
              },
            }}
          />
        )}

        <QuizPreviewModal
          open={isPreviewModalOpen}
          onClose={handleClosePreviewModal}
          quizTitle={title}
          questions={questions}
        />

        <Dialog
          open={showDeleteConfirmDialog}
          onClose={() => setShowDeleteConfirmDialog(false)}
          aria-labelledby="delete-confirm-dialog-title"
          aria-describedby="delete-confirm-dialog-description"
        >
          <DialogTitle id="delete-confirm-dialog-title">
            문제 일괄 삭제
          </DialogTitle>
          <DialogContent>
            <DialogContentText id="delete-confirm-dialog-description">
              선택한 {selectedQuestionIndexes.length}개의 문제를 정말
              삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setShowDeleteConfirmDialog(false)}
              color="primary"
            >
              취소
            </Button>
            <Button
              onClick={confirmRemoveSelectedQuestions}
              color="error"
              autoFocus
            >
              삭제
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
);

export default QuizContainer;
