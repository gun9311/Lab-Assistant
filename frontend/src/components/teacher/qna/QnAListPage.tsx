import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Schedule as ScheduleIcon,
  Reply as ReplyIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {
  getQuestions,
  QnAQuestion,
  GetQuestionsParams,
  getStatusColor,
  getPriorityColor,
  getCategoryIcon,
} from "../../../utils/qnaApi";

type ViewMode = "table" | "card";
type ViewType = "all" | "my";

const QnAListPage: React.FC = () => {
  const navigate = useNavigate();

  // 상태 관리
  const [questions, setQuestions] = useState<QnAQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // UI 상태
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [viewType, setViewType] = useState<ViewType>("all");

  // 필터 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortBy, setSortBy] = useState<
    "latest" | "oldest" | "priority" | "status"
  >("latest");

  // 데이터 로드 함수
  const loadQuestions = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params: GetQuestionsParams = {
        page,
        limit: 20, // 한 페이지에 20개
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        priority: priorityFilter || undefined,
        sortBy,
        viewType, // 새로운 파라미터
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

  // 초기 로드 및 필터 변경 시 데이터 재로드
  useEffect(() => {
    loadQuestions(1);
  }, [
    searchTerm,
    statusFilter,
    categoryFilter,
    priorityFilter,
    sortBy,
    viewType,
  ]);

  // 페이지 변경
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    page: number
  ) => {
    loadQuestions(page);
  };

  // 검색 실행
  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    loadQuestions(1);
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setCategoryFilter("");
    setPriorityFilter("");
    setSortBy("latest");
  };

  // 질문 카드 클릭 시 상세 페이지로 이동
  const handleQuestionClick = (questionId: string) => {
    navigate(`/qna/${questionId}`);
  };

  // 날짜 포맷 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "어제";
    } else if (diffDays < 7) {
      return `${diffDays}일 전`;
    } else {
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
    }
  };

  // 통계 계산
  const getStats = () => {
    const myQuestions = questions.filter((q) => viewType === "my" || q.author);
    return {
      total: totalCount,
      unanswered: questions.filter((q) => q.status === "대기중").length,
      answered: questions.filter((q) => q.status === "답변완료").length,
      resolved: questions.filter((q) => q.status === "해결됨").length,
    };
  };

  const stats = getStats();

  // 테이블 뷰 렌더링
  const renderTableView = () => (
    <TableContainer component={Paper} sx={{ maxHeight: "70vh" }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold" }}>상태</TableCell>
            <TableCell sx={{ fontWeight: "bold", minWidth: 300 }}>
              제목
            </TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>작성자</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>카테고리</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>우선순위</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>작성일</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>답변</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {questions.map((question) => (
            <TableRow
              key={question._id}
              hover
              sx={{
                cursor: "pointer",
                "&:hover": { backgroundColor: "action.hover" },
              }}
              onClick={() => handleQuestionClick(question._id)}
            >
              <TableCell>
                <Chip
                  label={question.status}
                  size="small"
                  sx={{
                    backgroundColor: getStatusColor(question.status),
                    color: "white",
                    fontWeight: "bold",
                    minWidth: 80,
                  }}
                />
              </TableCell>
              <TableCell>
                <Box>
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{ mb: 0.5 }}
                  >
                    {getCategoryIcon(question.category)} {question.title}
                  </Typography>
                  {question.isPrivate && (
                    <Chip
                      label="비공개"
                      size="small"
                      color="secondary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: "0.75rem" }}>
                    {question.authorName[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {question.authorName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {question.authorSchool}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={question.category}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={question.priority}
                  size="small"
                  sx={{
                    backgroundColor: getPriorityColor(question.priority),
                    color: "white",
                  }}
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {formatDate(question.createdAt)}
                </Typography>
              </TableCell>
              <TableCell>
                {question.answer ? (
                  <Tooltip title="답변 완료">
                    <CheckCircleIcon color="success" />
                  </Tooltip>
                ) : (
                  <Tooltip title="답변 대기">
                    <ScheduleIcon color="warning" />
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // 카드 뷰 렌더링 (기존보다 더 컴팩트)
  const renderCardView = () => (
    <Grid container spacing={2}>
      {questions.map((question) => (
        <Grid item xs={12} md={6} lg={4} key={question._id}>
          <Card
            sx={{
              cursor: "pointer",
              height: "100%",
              transition: "all 0.2s ease",
              "&:hover": {
                boxShadow: 3,
                transform: "translateY(-2px)",
              },
            }}
            onClick={() => handleQuestionClick(question._id)}
          >
            <CardContent sx={{ p: 2 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="flex-start"
                mb={1}
              >
                <Box display="flex" gap={0.5}>
                  <Chip
                    label={question.status}
                    size="small"
                    sx={{
                      backgroundColor: getStatusColor(question.status),
                      color: "white",
                      fontSize: "0.65rem",
                    }}
                  />
                  <Chip
                    label={question.priority}
                    size="small"
                    sx={{
                      backgroundColor: getPriorityColor(question.priority),
                      color: "white",
                      fontSize: "0.65rem",
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(question.createdAt)}
                </Typography>
              </Box>

              <Typography
                variant="subtitle2"
                fontWeight="bold"
                gutterBottom
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  lineHeight: 1.3,
                  height: "2.6em",
                }}
              >
                {getCategoryIcon(question.category)} {question.title}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  mb: 1,
                }}
              >
                {question.content}
              </Typography>

              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Avatar sx={{ width: 20, height: 20, fontSize: "0.7rem" }}>
                    {question.authorName[0]}
                  </Avatar>
                  <Typography variant="caption">
                    {question.authorName}
                  </Typography>
                </Box>
                {question.answer ? (
                  <CheckCircleIcon color="success" sx={{ fontSize: 16 }} />
                ) : (
                  <ScheduleIcon color="warning" sx={{ fontSize: 16 }} />
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 6 }}>
      {/* 헤더 - 여백과 배경 개선 */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          borderRadius: 3,
        }}
      >
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexDirection={{ xs: "column", md: "row" }}
          gap={3}
        >
          <Box textAlign={{ xs: "center", md: "left" }}>
            <Typography
              variant="h3"
              gutterBottom
              sx={{
                fontWeight: 700,
                background: "linear-gradient(45deg, #26A69A, #00796B)",
                backgroundClip: "text",
                textFillColor: "transparent",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              💬 Q&A
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{ maxWidth: 500, lineHeight: 1.6 }}
            >
              궁금한 점 또는 개선사항을 남겨주세요.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/qna/create")}
            size="large"
            sx={{
              backgroundColor: "#26A69A",
              px: 4,
              py: 1.5,
              borderRadius: 3,
              fontSize: "1.1rem",
              fontWeight: 600,
              boxShadow: "0 8px 16px rgba(38, 166, 154, 0.3)",
              transition: "all 0.3s ease",
              "&:hover": {
                backgroundColor: "#00796B",
                boxShadow: "0 12px 20px rgba(38, 166, 154, 0.4)",
                transform: "translateY(-2px)",
              },
            }}
          >
            새 질문 작성
          </Button>
        </Box>
      </Paper>

      {/* 통계 카드 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h5" color="primary">
              {stats.total}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              총 질문
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: "center", bgcolor: "warning.50" }}>
            <Typography variant="h5" color="warning.main">
              {stats.unanswered}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              답변 대기
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: "center", bgcolor: "info.50" }}>
            <Typography variant="h5" color="info.main">
              {stats.answered}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              답변 완료
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: "center", bgcolor: "success.50" }}>
            <Typography variant="h5" color="success.main">
              {stats.resolved}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              해결 완료
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* 뷰 타입 및 뷰 모드 선택 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Box display="flex" gap={2} alignItems="center">
            <ToggleButtonGroup
              value={viewType}
              exclusive
              onChange={(e, newViewType) =>
                newViewType && setViewType(newViewType)
              }
              size="small"
            >
              <ToggleButton value="all">모든 질문</ToggleButton>
              <ToggleButton value="my">내 질문만</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newViewMode) =>
              newViewMode && setViewMode(newViewMode)
            }
            size="small"
          >
            <ToggleButton value="table">
              <ViewListIcon />
            </ToggleButton>
            <ToggleButton value="card">
              <ViewModuleIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* 검색 */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="질문 제목이나 내용으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            size="small"
          />
        </Box>

        {/* 필터 */}
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

          <Grid item xs={12} sm={12} md={4}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={handleResetFilters}
                size="small"
              >
                필터 초기화
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
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button onClick={() => loadQuestions(currentPage)} sx={{ ml: 1 }}>
            다시 시도
          </Button>
        </Alert>
      ) : questions.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            질문이 없습니다
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            궁금한 점 또는 문제가 있으시면 새 질문을 작성해보세요.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("/qna/create")}
          >
            첫 질문 작성하기
          </Button>
        </Paper>
      ) : (
        <Box sx={{ mb: 3 }}>
          {viewMode === "table" ? renderTableView() : renderCardView()}
        </Box>
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
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Container>
  );
};

export default QnAListPage;
