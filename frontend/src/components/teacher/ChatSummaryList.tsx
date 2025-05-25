import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import api from "../../utils/api";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Switch,
  FormControlLabel,
  Divider,
  CircularProgress,
  Pagination,
  Alert,
  Chip,
  useTheme,
  Button,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

type Summary = {
  subject?: string;
  summary: string;
  createdAt: string;
};

type SubjectSummary = {
  subject: string;
  summaries: Summary[];
};

// API 응답 타입 정의
type PaginatedChatSummaryResponse = {
  summaries: Summary[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  subject: string;
  queryType: "subject" | "search" | "none";
};

type ChatSummaryListProps = {
  studentId: number;
  selectedSemester: string;
  selectedSubject: string;
  searchTerm: string;
};

const HighlightedText: React.FC<{ text: string; highlight: string }> = ({
  text,
  highlight,
}) => {
  if (!highlight.trim()) {
    return <>{text}</>;
  }
  const regex = new RegExp(
    `(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")})`,
    "gi"
  );
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) =>
        regex.test(part) ? (
          <Box
            component="mark"
            key={index}
            sx={{
              bgcolor: "yellow",
              color: "black",
              px: 0.5,
              borderRadius: "3px",
            }}
          >
            {part}
          </Box>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
};

interface ChatContentExpanderProps {
  fullText: string; // 전체 채팅 내용
  highlightTerm: string; // 강조할 검색어
  isStudentQuestionsOnly: boolean; // 학생 질문만 표시 여부
  initialLines?: number; // 초기에 보여줄 줄 수
}

const ChatContentExpander: React.FC<ChatContentExpanderProps> = ({
  fullText,
  highlightTerm,
  isStudentQuestionsOnly,
  initialLines = 5, // 기본 5줄
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [canOverflow, setCanOverflow] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const formatTextForDisplay = useCallback(
    (text: string, highlight: string, studentOnly: boolean) => {
      const lines = text.split("\n");
      let processedLines = [];

      if (studentOnly) {
        processedLines = lines
          .filter((line) => line.startsWith("You:"))
          .map((line, index, arr) => {
            const prefix = "학생:";
            const content = line.replace(/^You:\s*/, "");
            return (
              <Box
                component="div"
                key={`s-${index}`}
                sx={{ mb: index < arr.length - 1 ? 0.5 : 0 }}
              >
                <Typography component="span" fontWeight="bold" sx={{ mr: 0.5 }}>
                  {prefix}
                </Typography>
                <HighlightedText text={content} highlight={highlight} />
              </Box>
            );
          });
      } else {
        processedLines = lines.map((line, index, arr) => {
          const isStudentLine = line.startsWith("You:");
          const isBotLine = line.startsWith("Bot:");
          const prefix = isStudentLine ? "학생:" : isBotLine ? "챗봇:" : "";
          const content = line.replace(/^(You:|Bot:)\s*/, "");
          return (
            <Box
              component="div"
              key={`a-${index}`}
              sx={{ mb: index < arr.length - 1 ? 0.5 : 0 }}
            >
              {prefix && (
                <Typography component="span" fontWeight="bold" sx={{ mr: 0.5 }}>
                  {prefix}
                </Typography>
              )}
              {isStudentLine && highlight.trim() ? (
                <HighlightedText text={content} highlight={highlight} />
              ) : (
                <span>{content}</span>
              )}
            </Box>
          );
        });
      }
      return <>{processedLines}</>;
    },
    []
  );

  useLayoutEffect(() => {
    if (contentRef.current) {
      const element = contentRef.current;
      // Clone the element to measure its full height without clamping
      const clone = element.cloneNode(true) as HTMLElement;
      clone.style.webkitLineClamp = "none";
      clone.style.overflow = "visible";
      clone.style.maxHeight = "none";
      clone.style.position = "absolute"; // Avoid affecting layout
      clone.style.visibility = "hidden"; // Avoid displaying the clone
      document.body.appendChild(clone); // Needs to be in the DOM to measure

      // Calculate the height of `initialLines`
      // This is a bit tricky. A simpler way for WebkitLineClamp is to compare scrollHeight and clientHeight
      // when clamped.

      // Apply clamping to the original element for measurement
      const originalDisplay = element.style.display;
      const originalWebkitBoxOrient = element.style.webkitBoxOrient;
      const originalWebkitLineClamp = element.style.webkitLineClamp;
      const originalOverflow = element.style.overflow;

      element.style.display = "-webkit-box";
      element.style.webkitBoxOrient = "vertical";
      element.style.webkitLineClamp = `${initialLines}`;
      element.style.overflow = "hidden";

      setCanOverflow(element.scrollHeight > element.clientHeight);

      // Restore original styles
      element.style.display = originalDisplay;
      element.style.webkitBoxOrient = originalWebkitBoxOrient;
      element.style.webkitLineClamp = originalWebkitLineClamp;
      element.style.overflow = originalOverflow;

      if (clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
    }
  }, [
    fullText,
    initialLines,
    isStudentQuestionsOnly,
    highlightTerm,
    formatTextForDisplay,
  ]); // Re-run if text or mode changes

  const displayedContent = formatTextForDisplay(
    fullText,
    highlightTerm,
    isStudentQuestionsOnly
  );

  return (
    <Box>
      <Box
        ref={contentRef}
        sx={{
          whiteSpace: "pre-line", // Ensure newlines are respected
          wordBreak: "break-word",
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: isExpanded ? "none" : initialLines,
          overflow: "hidden",
          textOverflow: "ellipsis",
          // lineHeight: 1.5, // Optional: adjust line height
        }}
      >
        {displayedContent}
      </Box>
      {canOverflow && (
        <Button
          size="small"
          onClick={() => setIsExpanded(!isExpanded)}
          startIcon={
            isExpanded ? (
              <VisibilityOffIcon fontSize="small" />
            ) : (
              <VisibilityIcon fontSize="small" />
            )
          }
          sx={{
            mt: 0.5,
            p: 0.5, // 아이콘 추가로 약간의 패딩 조정
            textTransform: "none",
            fontSize: "0.75rem", // ReportComponent와 유사하게 폰트 크기 조정
          }}
        >
          {isExpanded ? "간략히" : "더보기"}
        </Button>
      )}
    </Box>
  );
};

const ChatSummaryList: React.FC<ChatSummaryListProps> = ({
  studentId,
  selectedSemester,
  selectedSubject,
  searchTerm,
}) => {
  const theme = useTheme();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [onlyStudentQuestions, setOnlyStudentQuestions] =
    useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [noData, setNoData] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentQueryTarget, setCurrentQueryTarget] = useState<string>("");
  const [queryType, setQueryType] = useState<"subject" | "search" | "none">(
    "none"
  );
  const itemsPerPage = 2;

  const fetchChatSummaries = useCallback(
    async (page: number) => {
      if (selectedSubject === "All" && !searchTerm) {
        setLoading(false);
        setNoData(true);
        setSummaries([]);
        setTotalPages(0);
        setCurrentPage(1);
        // setCurrentQueryTarget("과목 선택 또는 검색어 입력 필요");
        setQueryType("none");
        return;
      }

      setLoading(true);
      setNoData(false);

      const params: Record<string, any> = {
        page,
        limit: itemsPerPage,
      };

      if (searchTerm) {
        params.searchTerm = searchTerm;
      } else {
        // Ensure selectedSubject is not "All" if searchTerm is not present
        if (selectedSubject === "All") {
          setLoading(false);
          setNoData(true);
          setSummaries([]);
          setTotalPages(0);
          setCurrentPage(1);
          setQueryType("none");
          return;
        }
        params.subject = selectedSubject;
      }

      try {
        const res = await api.get<PaginatedChatSummaryResponse>(
          `/chat/summary/${studentId}`,
          { params }
        );

        if (res.data && Array.isArray(res.data.summaries)) {
          setSummaries(res.data.summaries);
          setCurrentPage(res.data.currentPage);
          setTotalPages(res.data.totalPages);
          setNoData(res.data.totalItems === 0);
          // setCurrentQueryTarget should be set based on API response or existing logic
          setCurrentQueryTarget(
            searchTerm ? `"${searchTerm}" 검색 결과` : selectedSubject
          );
          setQueryType(
            res.data.queryType || (searchTerm ? "search" : "subject")
          );
        } else {
          setSummaries([]);
          setCurrentPage(1);
          setTotalPages(0);
          setNoData(true);
          setCurrentQueryTarget("데이터 로딩 실패");
          setQueryType("none");
        }
      } catch (error) {
        console.error("Error fetching chat summaries:", error);
        setSummaries([]);
        setCurrentPage(1);
        setTotalPages(0);
        setNoData(true);
        setCurrentQueryTarget("오류 발생");
        setQueryType("none");
      } finally {
        setLoading(false);
      }
    },
    [studentId, selectedSubject, searchTerm, itemsPerPage] // Ensure all dependencies are listed
  );

  useEffect(() => {
    fetchChatSummaries(1); // Fetch on initial load or when key dependencies change
  }, [fetchChatSummaries]);

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOnlyStudentQuestions(event.target.checked);
    // Potentially refetch or re-evaluate 'canOverflow' if display logic changes significantly
  };

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    fetchChatSummaries(value);
  };

  // displayedSummaries filtering logic can be removed if ChatContentExpander handles student-only questions internally
  // OR, it can be kept if we want to completely hide items that have NO student questions AT ALL.
  // For now, let's assume ChatContentExpander will correctly render based on its props.
  // const displayedSummaries = summaries.filter((item) => {
  //   if (!onlyStudentQuestions) return true;
  //   return item.summary.split("\n").some((line) => line.startsWith("You:"));
  // });

  // formatAndHighlightSummaryText and extractAndHighlightStudentQuestions are now part of ChatContentExpander
  // Remove them from here.

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        {/* currentQueryTarget might need adjustment based on API or props */}
        <Typography variant="h6">{currentQueryTarget} 채팅 내역</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={onlyStudentQuestions}
              onChange={handleFilterChange}
              size="small"
              disabled={summaries.length === 0 && !loading} // Keep this disabled logic
            />
          }
          label={<Typography variant="body2">학생 질문만 보기</Typography>}
        />
      </Box>
      <Divider sx={{ mb: 2 }} />

      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          sx={{ minHeight: 100 }}
        >
          <CircularProgress />
        </Box>
      ) : noData ? (
        <Box textAlign="center" sx={{ mt: 2, py: 3 }}>
          <Typography color="text.secondary">
            '{currentQueryTarget}'에 대한 채팅 내역이 없습니다.
          </Typography>
        </Box>
      ) : (
        <>
          <List sx={{ padding: 0 }}>
            {summaries.map(
              (
                item,
                idx // Use 'summaries' directly
              ) => (
                <ListItem
                  key={item.createdAt + idx + (item.subject || "")}
                  divider={idx < summaries.length - 1}
                  alignItems="flex-start"
                  sx={{
                    bgcolor: idx % 2 === 0 ? "#f9f9f9" : "#fff",
                    px: 2,
                    py: 1.5,
                    border: "1px solid #eee",
                    borderRadius: 1,
                    mb: 1,
                    position: "relative",
                  }}
                >
                  {/* Chip logic remains */}
                  {queryType === "search" && item.subject && (
                    <Chip
                      label={item.subject}
                      size="small"
                      color="info"
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        fontSize: "0.7rem",
                        height: "18px",
                      }}
                    />
                  )}
                  <ListItemText
                    primary={
                      <ChatContentExpander
                        fullText={item.summary}
                        highlightTerm={searchTerm}
                        isStudentQuestionsOnly={onlyStudentQuestions}
                        initialLines={5} // Or any other number of lines
                      />
                    }
                    secondary={new Date(item.createdAt).toLocaleString()}
                    primaryTypographyProps={{
                      component: "div", // Important for containing the Box from ChatContentExpander
                      style: {
                        marginRight:
                          queryType === "search" && item.subject ? "70px" : "0", // Ensure space for chip
                      },
                    }}
                    secondaryTypographyProps={{
                      style: { fontSize: "0.8rem", color: "#666" },
                      mt: 0.5,
                    }}
                  />
                </ListItem>
              )
            )}
            {/* This specific message might need re-evaluation based on ChatContentExpander's behavior */}
            {summaries.length > 0 &&
              // Condition for "no student questions on this page" might be harder to determine
              // if ChatContentExpander shows "no content" when student questions are filtered out.
              // For now, let's simplify or remove this specific message.
              // A more robust way would be for ChatContentExpander to signal if it rendered anything.
              false &&
              onlyStudentQuestions && (
                <Typography
                  sx={{
                    p: 2,
                    color: "text.secondary",
                    fontSize: "0.9rem",
                    textAlign: "center",
                  }}
                >
                  해당 페이지의 채팅 내역에는 학생의 질문이 없습니다.
                </Typography>
              )}
          </List>

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default ChatSummaryList;
