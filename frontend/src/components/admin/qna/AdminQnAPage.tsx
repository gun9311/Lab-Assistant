import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Pagination,
  IconButton,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Paper,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Badge,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Reply as ReplyIcon,
  ExpandMore as ExpandMoreIcon,
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import {
  getQuestions,
  getQnAStatistics,
  answerQuestion,
  updateQuestionStatus,
  QnAQuestion,
  QnAStatistics,
  GetQuestionsParams,
  getStatusColor,
  getPriorityColor,
  getCategoryIcon,
} from "../../../utils/qnaApi";

const AdminQnAPage: React.FC = () => {
  // 질문 목록 상태
  const [questions, setQuestions] = useState<QnAQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // 통계 상태
  const [statistics, setStatistics] = useState<QnAStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // 필터 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [sortBy, setSortBy] = useState<
    "latest" | "oldest" | "priority" | "status"
  >("latest");

  // 답변 다이얼로그 상태
  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<QnAQuestion | null>(
    null
  );
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // 통계 로드
  const loadStatistics = async () => {
    try {
      setStatsLoading(true);
      const stats = await getQnAStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error("통계 로드 실패:", err);
    } finally {
      setStatsLoading(false);
    }
  };

  // 질문 목록 로드
  const loadQuestions = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params: GetQuestionsParams = {
        page,
        limit: 10,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        priority: priorityFilter || undefined,
        school: schoolFilter || undefined,
        sortBy,
      };

      const response = await getQuestions(params);
      setQuestions(response.questions);
      setTotalPages(response.pagination.totalPages);
      setCurrentPage(response.pagination.currentPage);
      setTotalCount(response.pagination.totalCount);
    } catch (err) {
      console.error("질문 목록 로드 실패:", err);
      setError("질문 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 초기 로드
  useEffect(() => {
    loadStatistics();
    loadQuestions(1);
  }, [
    searchTerm,
    statusFilter,
    categoryFilter,
    priorityFilter,
    schoolFilter,
    sortBy,
  ]);

  // 페이지 변경
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    loadQuestions(page);
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setCategoryFilter("");
    setPriorityFilter("");
    setSchoolFilter("");
    setSortBy("latest");
  };

  // 답변 다이얼로그 열기
  const handleOpenAnswerDialog = (question: QnAQuestion) => {
    setSelectedQuestion(question);
    setAnswerText(question.answer || "");
    setAnswerDialogOpen(true);
  };

  // 답변 제출
  const handleSubmitAnswer = async () => {
    if (!selectedQuestion || !answerText.trim()) return;

    try {
      setSubmitting(true);
      await answerQuestion(selectedQuestion._id, answerText.trim());

      // 목록 새로고침
      await loadQuestions(currentPage);
      await loadStatistics();

      setAnswerDialogOpen(false);
      setSelectedQuestion(null);
      setAnswerText("");
    } catch (err: any) {
      console.error("답변 제출 실패:", err);
      setError(err.response?.data?.error || "답변 제출에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  // 상태 변경
  const handleStatusChange = async (questionId: string, newStatus: string) => {
    try {
      await updateQuestionStatus(questionId, newStatus);
      await loadQuestions(currentPage);
      await loadStatistics();
    } catch (err: any) {
      console.error("상태 변경 실패:", err);
      setError(err.response?.data?.error || "상태 변경에 실패했습니다.");
    }
  };

  // 날짜 포맷
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <DashboardIcon sx={{ fontSize: 32, color: "primary.main" }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              QnA 관리
            </Typography>
            <Typography variant="body1" color="text.secondary">
              교사들의 질문을 관리하고 답변을 제공합니다.
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 통계 대시보드 */}
      {!statsLoading && statistics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: "center", bgcolor: "primary.50" }}>
              <AssessmentIcon
                sx={{ fontSize: 40, color: "primary.main", mb: 1 }}
              />
              <Typography variant="h4" color="primary.main">
                {statistics.overview.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                총 질문
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: "center", bgcolor: "warning.50" }}>
              <Badge
                badgeContent={statistics.overview.unanswered}
                color="warning"
              >
                <ReplyIcon
                  sx={{ fontSize: 40, color: "warning.main", mb: 1 }}
                />
              </Badge>
              <Typography variant="h4" color="warning.main">
                {statistics.overview.unanswered}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                답변 대기
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: "center", bgcolor: "info.50" }}>
              <TrendingUpIcon
                sx={{ fontSize: 40, color: "info.main", mb: 1 }}
              />
              <Typography variant="h4" color="info.main">
                {statistics.overview.answered}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                답변 완료
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 3, textAlign: "center", bgcolor: "success.50" }}>
              <Typography variant="h4" color="success.main">
                {statistics.overview.recent7Days}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                최근 7일 질문
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 에러 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 검색 및 필터 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="질문 제목, 내용, 작성자명으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>상태</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="상태"
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="대기중">대기중</MenuItem>
                <MenuItem value="답변완료">답변완료</MenuItem>
                <MenuItem value="해결됨">해결됨</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>카테고리</InputLabel>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                label="카테고리"
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="기술문제">기술문제</MenuItem>
                <MenuItem value="계정문제">계정문제</MenuItem>
                <MenuItem value="기능문의">기능문의</MenuItem>
                <MenuItem value="퀴즈관련">퀴즈관련</MenuItem>
                <MenuItem value="기타">기타</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>우선순위</InputLabel>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                label="우선순위"
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="긴급">긴급</MenuItem>
                <MenuItem value="높음">높음</MenuItem>
                <MenuItem value="보통">보통</MenuItem>
                <MenuItem value="낮음">낮음</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="학교"
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              placeholder="학교명"
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>정렬</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                label="정렬"
              >
                <MenuItem value="latest">최신순</MenuItem>
                <MenuItem value="oldest">오래된순</MenuItem>
                <MenuItem value="priority">우선순위순</MenuItem>
                <MenuItem value="status">상태순</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={12} md={2}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={handleResetFilters}
                size="small"
              >
                초기화
              </Button>
              <IconButton
                onClick={() => loadQuestions(currentPage)}
                size="small"
              >
                <RefreshIcon />
              </IconButton>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* 질문 목록 */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : questions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary">
            조건에 맞는 질문이 없습니다
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {questions.map((question) => (
            <Accordion key={question._id}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ width: "100%" }}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    mb={1}
                  >
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="body2">
                          {getCategoryIcon(question.category)}
                        </Typography>
                        <Chip
                          label={question.category}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={question.priority}
                          size="small"
                          sx={{
                            backgroundColor: getPriorityColor(
                              question.priority
                            ),
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
                      <Typography variant="h6" gutterBottom>
                        {question.title}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <PersonIcon
                            sx={{ fontSize: 16, color: "text.secondary" }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {question.authorName}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <SchoolIcon
                            sx={{ fontSize: 16, color: "text.secondary" }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {question.authorSchool}
                          </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <AccessTimeIcon
                            sx={{ fontSize: 16, color: "text.secondary" }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            {formatDate(question.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Box display="flex" gap={1}>
                      {!question.answer && (
                        <Tooltip title="답변 작성">
                          <Button
                            variant="contained"
                            size="small"
                            startIcon={<ReplyIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAnswerDialog(question);
                            }}
                            sx={{ backgroundColor: "#26A69A" }}
                          >
                            답변
                          </Button>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>
                </Box>
              </AccordionSummary>

              <AccordionDetails>
                <Box sx={{ pt: 2 }}>
                  <Divider sx={{ mb: 3 }} />

                  {/* 질문 내용 */}
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="medium"
                      gutterBottom
                    >
                      질문 내용
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.6,
                        bgcolor: "grey.50",
                        p: 2,
                        borderRadius: 1,
                      }}
                    >
                      {question.content}
                    </Typography>
                  </Box>

                  {/* 답변 영역 */}
                  <Box>
                    <Typography
                      variant="subtitle1"
                      fontWeight="medium"
                      gutterBottom
                    >
                      관리자 답변
                    </Typography>
                    {question.answer ? (
                      <Box>
                        <Typography
                          variant="body1"
                          sx={{
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.6,
                            bgcolor: "primary.50",
                            p: 2,
                            borderRadius: 1,
                            mb: 2,
                          }}
                        >
                          {question.answer}
                        </Typography>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography variant="caption" color="text.secondary">
                            답변자: {question.answeredBy?.name} •{" "}
                            {question.answeredAt &&
                              formatDate(question.answeredAt)}
                          </Typography>
                          <Box display="flex" gap={1}>
                            <Button
                              size="small"
                              onClick={() => handleOpenAnswerDialog(question)}
                            >
                              답변 수정
                            </Button>
                            {question.status !== "해결됨" && (
                              <Button
                                size="small"
                                color="success"
                                onClick={() =>
                                  handleStatusChange(question._id, "해결됨")
                                }
                              >
                                해결됨으로 표시
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ) : (
                      <Button
                        variant="outlined"
                        startIcon={<ReplyIcon />}
                        onClick={() => handleOpenAnswerDialog(question)}
                        sx={{ mt: 1 }}
                      >
                        답변 작성하기
                      </Button>
                    )}
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}

      {/* 답변 작성 다이얼로그 */}
      <Dialog
        open={answerDialogOpen}
        onClose={() => setAnswerDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedQuestion?.answer ? "답변 수정" : "답변 작성"}
        </DialogTitle>
        <DialogContent>
          {selectedQuestion && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                질문: {selectedQuestion.title}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={8}
                label="답변 내용"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="교사에게 도움이 되는 구체적인 답변을 작성해주세요..."
                sx={{ mt: 2 }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                {answerText.length}/5000자
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnswerDialogOpen(false)}>취소</Button>
          <Button
            onClick={handleSubmitAnswer}
            variant="contained"
            disabled={submitting || !answerText.trim()}
            startIcon={submitting ? <CircularProgress size={16} /> : undefined}
          >
            {submitting ? "제출 중..." : "답변 제출"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminQnAPage;
