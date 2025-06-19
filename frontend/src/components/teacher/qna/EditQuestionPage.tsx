import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Stack,
  IconButton,
  Paper,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import {
  getQuestionById,
  updateQuestion,
  UpdateQuestionData,
  QnAQuestion,
  getCategoryIcon,
  getPriorityColor,
} from "../../../utils/qnaApi";

const EditQuestionPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // 상태 관리
  const [originalQuestion, setOriginalQuestion] = useState<QnAQuestion | null>(
    null
  );
  const [formData, setFormData] = useState<UpdateQuestionData>({
    title: "",
    content: "",
    category: "기타",
    priority: "보통",
    isPrivate: false,
    attachments: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});

  // 카테고리 및 우선순위 옵션
  const categories = [
    { value: "기술문제", label: "기술문제" },
    { value: "계정문제", label: "계정문제" },
    { value: "기능문의", label: "기능문의" },
    { value: "퀴즈관련", label: "퀴즈관련" },
    { value: "기타", label: "기타" },
  ];

  const priorities = [
    { value: "낮음", label: "낮음" },
    { value: "보통", label: "보통" },
    { value: "높음", label: "높음" },
    { value: "긴급", label: "긴급" },
  ];

  // 질문 데이터 로드
  useEffect(() => {
    const loadQuestion = async () => {
      if (!id) {
        setError("질문 ID가 없습니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const question = await getQuestionById(id);

        // 답변이 있으면 수정 불가
        if (question.answer) {
          setError("답변이 완료된 질문은 수정할 수 없습니다.");
          setLoading(false);
          return;
        }

        setOriginalQuestion(question);
        setFormData({
          title: question.title,
          content: question.content,
          category: question.category,
          priority: question.priority,
          isPrivate: question.isPrivate,
          attachments: question.attachments || [],
        });
      } catch (err: any) {
        console.error("질문 로드 실패:", err);
        setError(
          err.response?.data?.error || "질문을 불러오는데 실패했습니다."
        );
      } finally {
        setLoading(false);
      }
    };

    loadQuestion();
  }, [id]);

  // 입력값 변경 핸들러
  const handleInputChange = (field: keyof UpdateQuestionData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // 에러 메시지 클리어
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  // 폼 검증
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      errors.title = "제목을 입력해주세요.";
    } else if (formData.title.length > 200) {
      errors.title = "제목은 200자 이하로 입력해주세요.";
    }

    if (!formData.content.trim()) {
      errors.content = "내용을 입력해주세요.";
    } else if (formData.content.length > 5000) {
      errors.content = "내용은 5000자 이하로 입력해주세요.";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 질문 수정 저장
  const handleSave = async () => {
    if (!validateForm() || !id) {
      setError("입력 정보를 확인해주세요.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await updateQuestion(id, formData);

      setSuccess("질문이 성공적으로 수정되었습니다!");

      // 2초 후 상세 페이지로 이동
      setTimeout(() => {
        navigate(`/qna/${id}`);
      }, 2000);
    } catch (err: any) {
      console.error("질문 수정 실패:", err);
      setError(
        err.response?.data?.error ||
          "질문 수정에 실패했습니다. 다시 시도해주세요."
      );
    } finally {
      setSaving(false);
    }
  };

  // 뒤로가기
  const handleGoBack = () => {
    navigate(`/qna/${id}`);
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="400px"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error && !originalQuestion) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button onClick={() => navigate("/qna")} sx={{ ml: 2 }}>
            목록으로 돌아가기
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <IconButton onClick={handleGoBack} sx={{ p: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" gutterBottom>
              질문 수정
            </Typography>
            <Typography variant="body1" color="text.secondary">
              질문 내용을 수정할 수 있습니다.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 알림 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={3}>
            {/* 제목 */}
            <Box>
              <TextField
                fullWidth
                label="질문 제목"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                error={!!validationErrors.title}
                helperText={
                  validationErrors.title || `${formData.title.length}/200자`
                }
                required
              />
            </Box>

            {/* 카테고리 */}
            <Box>
              <FormControl fullWidth required>
                <InputLabel>카테고리</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) =>
                    handleInputChange("category", e.target.value)
                  }
                  label="카테고리"
                >
                  {categories.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography>
                          {getCategoryIcon(category.value)}
                        </Typography>
                        <Typography>{category.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* 우선순위 */}
            <Box>
              <FormControl fullWidth required>
                <InputLabel>우선순위</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) =>
                    handleInputChange("priority", e.target.value)
                  }
                  label="우선순위"
                >
                  {priorities.map((priority) => (
                    <MenuItem key={priority.value} value={priority.value}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box
                          width={12}
                          height={12}
                          borderRadius="50%"
                          bgcolor={getPriorityColor(priority.value)}
                        />
                        <Typography>{priority.label}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* 내용 */}
            <Box>
              <TextField
                fullWidth
                multiline
                rows={12}
                label="질문 내용"
                value={formData.content}
                onChange={(e) => handleInputChange("content", e.target.value)}
                error={!!validationErrors.content}
                helperText={
                  validationErrors.content ||
                  `${formData.content.length}/5000자`
                }
                required
              />
            </Box>

            {/* 비공개 설정 */}
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isPrivate}
                    onChange={(e) =>
                      handleInputChange("isPrivate", e.target.checked)
                    }
                  />
                }
                label="비공개 질문으로 설정"
              />
            </Box>
          </Stack>

          {/* 액션 버튼 */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mt={4}
          >
            <Button variant="outlined" onClick={handleGoBack} disabled={saving}>
              취소
            </Button>

            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                backgroundColor: "#26A69A",
                "&:hover": { backgroundColor: "#00796B" },
              }}
            >
              {saving ? "저장 중..." : "수정 완료"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default EditQuestionPage;
