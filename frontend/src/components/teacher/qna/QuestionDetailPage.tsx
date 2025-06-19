import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Paper,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tooltip,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  AccessTime as AccessTimeIcon,
  Reply as ReplyIcon,
} from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import {
  getQuestionById,
  deleteQuestion,
  markQuestionAsResolved,
  QnAQuestion,
  getStatusColor,
  getPriorityColor,
  getCategoryIcon,
} from "../../../utils/qnaApi";

const QuestionDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // 상태 관리
  const [question, setQuestion] = useState<QnAQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // 다이얼로그 상태
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

  // 질문 데이터 로드
  const loadQuestion = async () => {
    if (!id) {
      setError("질문 ID가 없습니다.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const questionData = await getQuestionById(id);
      setQuestion(questionData);
    } catch (err: any) {
      console.error("질문 로드 실패:", err);
      setError(err.response?.data?.error || "질문을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestion();
  }, [id]);

  // 질문 삭제
  const handleDelete = async () => {
    if (!question || !id) return;

    try {
      setActionLoading(true);
      await deleteQuestion(id);
      navigate("/qna");
    } catch (err: any) {
      console.error("질문 삭제 실패:", err);
      setError(err.response?.data?.error || "질문 삭제에 실패했습니다.");
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  // 해결됨으로 상태 변경
  const handleMarkAsResolved = async () => {
    if (!question || !id) return;

    try {
      setActionLoading(true);
      await markQuestionAsResolved(id);
      setQuestion({ ...question, status: "해결됨" });
    } catch (err: any) {
      console.error("상태 변경 실패:", err);
      setError(err.response?.data?.error || "상태 변경에 실패했습니다.");
    } finally {
      setActionLoading(false);
      setResolveDialogOpen(false);
    }
  };

  // 수정 페이지로 이동
  const handleEdit = () => {
    navigate(`/qna/edit/${id}`);
  };

  // 뒤로가기
  const handleGoBack = () => {
    navigate("/qna");
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 경과 시간 계산
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays}일 전`;
    if (diffHours > 0) return `${diffHours}시간 전`;
    if (diffMinutes > 0) return `${diffMinutes}분 전`;
    return "방금 전";
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

  if (error || !question) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || "질문을 찾을 수 없습니다."}
          <Button onClick={() => navigate("/qna")} sx={{ ml: 2 }}>
            목록으로 돌아가기
          </Button>
        </Alert>
      </Container>
    );
  }

  const canEdit = !question.answer && question.status === "대기중";
  const canMarkResolved = question.answer && question.status === "답변완료";

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={handleGoBack} sx={{ p: 1 }}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" gutterBottom>
                질문 상세
              </Typography>
              <Box display="flex" alignItems="center" gap={1} mt={1}>
                <VisibilityIcon
                  sx={{ fontSize: 16, color: "text.secondary" }}
                />
                <Typography variant="caption" color="text.secondary">
                  조회 {question.viewCount}회
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • {getTimeAgo(question.createdAt)}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* 액션 버튼 */}
          <Box display="flex" gap={1}>
            {canEdit && (
              <>
                <Tooltip title="질문 수정">
                  <IconButton onClick={handleEdit} color="primary">
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="질문 삭제">
                  <IconButton
                    onClick={() => setDeleteDialogOpen(true)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {canMarkResolved && (
              <Tooltip title="해결됨으로 표시">
                <Button
                  variant="outlined"
                  startIcon={<CheckCircleIcon />}
                  onClick={() => setResolveDialogOpen(true)}
                  color="success"
                  size="small"
                >
                  해결됨
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      {/* 질문 정보 카드 */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {/* 상태 및 카테고리 칩 */}
          <Box display="flex" gap={1} mb={3}>
            <Chip
              label={question.category}
              size="small"
              icon={
                <Typography sx={{ fontSize: "14px !important" }}>
                  {getCategoryIcon(question.category)}
                </Typography>
              }
              variant="outlined"
            />
            <Chip
              label={question.priority}
              size="small"
              sx={{
                backgroundColor: getPriorityColor(question.priority),
                color: "white",
              }}
            />
            <Chip
              label={question.status}
              size="small"
              sx={{
                backgroundColor: getStatusColor(question.status),
                color: "white",
              }}
            />
            {question.isPrivate && (
              <Chip
                label="비공개"
                size="small"
                color="secondary"
                variant="outlined"
              />
            )}
          </Box>

          {/* 제목 */}
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            {question.title}
          </Typography>

          {/* 작성자 정보 */}
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <Avatar sx={{ bgcolor: "primary.main" }}>
              <PersonIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">
                {question.authorName}
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <SchoolIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  {question.authorSchool}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* 질문 내용 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              질문 내용
            </Typography>
            <Typography
              variant="body1"
              sx={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.8,
                fontSize: "1.1rem",
              }}
            >
              {question.content}
            </Typography>
          </Box>

          {/* 첨부파일 (향후 구현) */}
          {question.attachments && question.attachments.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                첨부파일
              </Typography>
              <Stack spacing={1}>
                {question.attachments.map((attachment, index) => (
                  <Paper key={index} sx={{ p: 2, bgcolor: "grey.50" }}>
                    <Typography variant="body2">
                      첨부파일 {index + 1} (구현 예정)
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}

          {/* 메타 정보 */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            sx={{ color: "text.secondary", fontSize: "0.875rem" }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <AccessTimeIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2">
                작성일: {formatDate(question.createdAt)}
              </Typography>
            </Box>
            {question.updatedAt !== question.createdAt && (
              <Typography variant="body2">
                수정일: {formatDate(question.updatedAt)}
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* 답변 영역 */}
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <ReplyIcon color="primary" />
            <Typography variant="h6">관리자 답변</Typography>
          </Box>

          {question.answer ? (
            // 답변이 있는 경우
            <Box>
              {/* 답변자 정보 */}
              <Box display="flex" alignItems="center" gap={2} mb={3}>
                <Avatar sx={{ bgcolor: "success.main" }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {question.answeredBy?.name || "관리자"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {question.answeredAt && formatDate(question.answeredAt)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* 답변 내용 */}
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.8,
                  fontSize: "1.1rem",
                  bgcolor: "grey.50",
                  p: 3,
                  borderRadius: 2,
                }}
              >
                {question.answer}
              </Typography>

              {/* 해결됨 버튼 */}
              {canMarkResolved && (
                <Box mt={3} textAlign="center">
                  <Button
                    variant="contained"
                    startIcon={<CheckCircleIcon />}
                    onClick={() => setResolveDialogOpen(true)}
                    color="success"
                    disabled={actionLoading}
                  >
                    문제가 해결되었습니다
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            // 답변이 없는 경우
            <Paper sx={{ p: 4, textAlign: "center", bgcolor: "grey.50" }}>
              <ScheduleIcon
                sx={{ fontSize: 48, color: "text.secondary", mb: 2 }}
              />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                답변 대기 중
              </Typography>
              <Typography variant="body2" color="text.secondary">
                관리자가 확인 후 답변을 드릴 예정입니다.
                <br />
                보통 1-2일 내에 답변을 받으실 수 있습니다.
              </Typography>
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>질문 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            정말로 이 질문을 삭제하시겠습니까?
            <br />
            삭제된 질문은 복구할 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button
            onClick={handleDelete}
            color="error"
            disabled={actionLoading}
            startIcon={
              actionLoading ? <CircularProgress size={16} /> : undefined
            }
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 해결됨 확인 다이얼로그 */}
      <Dialog
        open={resolveDialogOpen}
        onClose={() => setResolveDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>문제 해결 확인</DialogTitle>
        <DialogContent>
          <DialogContentText>
            이 질문의 문제가 해결되었나요?
            <br />
            해결됨으로 표시하면 상태가 변경됩니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialogOpen(false)}>아니요</Button>
          <Button
            onClick={handleMarkAsResolved}
            color="success"
            disabled={actionLoading}
            startIcon={
              actionLoading ? <CircularProgress size={16} /> : undefined
            }
          >
            예, 해결되었습니다
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuestionDetailPage;
