import React, { useState } from "react";
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
  Chip,
  IconButton,
  Paper,
  Divider,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  createQuestion,
  CreateQuestionData,
  getCategoryIcon,
  getPriorityColor,
} from "../../../utils/qnaApi";

const CreateQuestionPage: React.FC = () => {
  const navigate = useNavigate();

  // 폼 상태
  const [formData, setFormData] = useState<CreateQuestionData>({
    title: "",
    content: "",
    category: "기타",
    priority: "보통",
    isPrivate: false,
    attachments: [],
  });

  // UI 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string;
  }>({});

  // 카테고리 옵션
  const categories = [
    {
      value: "기술문제",
      label: "기술문제",
      description: "서비스 이용 중 발생한 기술적 문제",
    },
    {
      value: "계정문제",
      label: "계정문제",
      description: "로그인, 회원가입, 비밀번호 관련 문제",
    },
    {
      value: "기능문의",
      label: "기능문의",
      description: "새로운 기능 요청이나 사용법 문의",
    },
    {
      value: "퀴즈관련",
      label: "퀴즈관련",
      description: "퀴즈 생성, 관리, 결과 관련 문의",
    },
    {
      value: "기타",
      label: "기타",
      description: "위 카테고리에 해당하지 않는 기타 문의",
    },
  ];

  // 우선순위 옵션
  const priorities = [
    { value: "낮음", label: "낮음", description: "일반적인 문의사항" },
    { value: "보통", label: "보통", description: "답변이 필요한 문의" },
    { value: "높음", label: "높음", description: "빠른 답변이 필요한 문의" },
    { value: "긴급", label: "긴급", description: "즉시 해결이 필요한 문제" },
  ];

  // 입력값 변경 핸들러
  const handleInputChange = (field: keyof CreateQuestionData, value: any) => {
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

  // 질문 저장
  const handleSubmit = async () => {
    if (!validateForm()) {
      setError("입력 정보를 확인해주세요.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await createQuestion(formData);

      // 즉시 목록 페이지로 이동 (setTimeout 제거)
      navigate("/qna");
    } catch (err: any) {
      console.error("질문 등록 실패:", err);
      setError(
        err.response?.data?.error ||
          "질문 등록에 실패했습니다. 다시 시도해주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  // 미리보기 토글
  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  // 뒤로가기
  const handleGoBack = () => {
    navigate("/qna");
  };

  // 글자 수 계산
  const getTitleCharCount = () => formData.title.length;
  const getContentCharCount = () => formData.content.length;

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
              새 질문 작성
            </Typography>
            <Typography variant="body1" color="text.secondary">
              궁금한 점 또는 문제사항을 자세히 작성해주세요.
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

      {/* 작성 가이드 */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: "#f8f9fa" }}>
        <Typography variant="h6" gutterBottom>
          📝 작성 가이드
        </Typography>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            • 문제를 구체적으로 설명해주세요. (언제, 어떤 상황에서, 어떤 문제가
            발생했는지)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • 에러 메시지가 있다면 정확히 기재해주세요.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • 스크린샷이나 관련 파일이 있으면 첨부해주세요.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • 긴급한 문제는 우선순위를 '긴급'으로 설정해주세요.
          </Typography>
        </Stack>
      </Paper>

      <Card>
        <CardContent sx={{ p: 4 }}>
          {!showPreview ? (
            // 작성 모드
            <Stack spacing={3}>
              {/* 제목 */}
              <Box>
                <TextField
                  fullWidth
                  label="질문 제목"
                  placeholder="질문 제목을 명확하고 구체적으로 작성해주세요"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  error={!!validationErrors.title}
                  helperText={
                    validationErrors.title || `${getTitleCharCount()}/200자`
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
                          <Box>
                            <Typography variant="body1">
                              {category.label}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {category.description}
                            </Typography>
                          </Box>
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
                          <Box>
                            <Typography variant="body1">
                              {priority.label}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {priority.description}
                            </Typography>
                          </Box>
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
                  placeholder="문제상황을 자세히 설명해주세요.&#10;&#10;예시:&#10;- 언제 문제가 발생했나요?&#10;- 어떤 기능을 사용하던 중이었나요?&#10;- 어떤 에러 메시지가 나타났나요?&#10;- 기대했던 결과는 무엇인가요?"
                  value={formData.content}
                  onChange={(e) => handleInputChange("content", e.target.value)}
                  error={!!validationErrors.content}
                  helperText={
                    validationErrors.content ||
                    `${getContentCharCount()}/5000자`
                  }
                  required
                />
              </Box>

              {/* 첨부파일 (향후 구현) */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  첨부파일 (선택사항)
                </Typography>
                <Paper
                  sx={{
                    p: 3,
                    border: "2px dashed #ddd",
                    textAlign: "center",
                    cursor: "pointer",
                    "&:hover": { backgroundColor: "#f5f5f5" },
                  }}
                >
                  <AttachFileIcon sx={{ fontSize: 48, color: "#ccc", mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    파일을 드래그하거나 클릭해서 업로드하세요
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    (이미지, 문서 파일 등 - 최대 10MB)
                  </Typography>
                </Paper>
              </Box>

              {/* 추가 옵션 */}
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
                  label={
                    <Box>
                      <Typography variant="body2">
                        비공개 질문으로 설정
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        다른 교사들이 볼 수 없는 개인적인 문의
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Stack>
          ) : (
            // 미리보기 모드
            <Stack spacing={3}>
              <Typography variant="h5">
                {formData.title || "제목을 입력해주세요"}
              </Typography>

              <Box display="flex" gap={1}>
                <Chip
                  label={formData.category}
                  size="small"
                  icon={
                    <Typography>
                      {getCategoryIcon(formData.category)}
                    </Typography>
                  }
                />
                <Chip
                  label={formData.priority}
                  size="small"
                  sx={{
                    backgroundColor: getPriorityColor(formData.priority),
                    color: "white",
                  }}
                />
                {formData.isPrivate && (
                  <Chip label="비공개" size="small" color="secondary" />
                )}
              </Box>

              <Divider />

              <Box>
                <Typography
                  variant="body1"
                  sx={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                  }}
                >
                  {formData.content || "내용을 입력해주세요"}
                </Typography>
              </Box>
            </Stack>
          )}

          {/* 액션 버튼 */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mt={4}
          >
            <Box>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={togglePreview}
                sx={{ mr: 1 }}
              >
                {showPreview ? "편집 모드" : "미리보기"}
              </Button>
            </Box>

            <Box display="flex" gap={2}>
              <Button
                variant="outlined"
                onClick={handleGoBack}
                disabled={loading}
              >
                취소
              </Button>
              <Button
                variant="contained"
                startIcon={
                  loading ? <CircularProgress size={20} /> : <SaveIcon />
                }
                onClick={handleSubmit}
                disabled={loading || showPreview}
                sx={{
                  backgroundColor: "#26A69A",
                  "&:hover": { backgroundColor: "#00796B" },
                }}
              >
                {loading ? "저장 중..." : "질문 등록"}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CreateQuestionPage;
