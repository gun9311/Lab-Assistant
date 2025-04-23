import React, { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";

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
        setCurrentQueryTarget("과목 선택 또는 검색어 입력 필요");
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
          setCurrentQueryTarget(res.data.subject);
          setQueryType(res.data.queryType);
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
    [studentId, selectedSubject, searchTerm, itemsPerPage]
  );

  useEffect(() => {
    fetchChatSummaries(1);
  }, [fetchChatSummaries]);

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOnlyStudentQuestions(event.target.checked);
  };

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    fetchChatSummaries(value);
  };

  const displayedSummaries = summaries.filter((item) => {
    if (!onlyStudentQuestions) return true;
    return item.summary.split("\n").some((line) => line.startsWith("You:"));
  });

  const extractAndHighlightStudentQuestions = (
    text: string,
    highlight: string
  ) => {
    const studentLines = text
      .split("\n")
      .filter((line) => line.startsWith("You:"))
      .map((line) => line.replace(/^You:/, "학생:"))
      .join("\n");
    return <HighlightedText text={studentLines} highlight={highlight} />;
  };

  const formatAndHighlightSummaryText = (text: string, highlight: string) => {
    const lines = text.split("\n");
    return (
      <>
        {lines.map((line, index) => {
          const isStudentLine = line.startsWith("You:");
          const formattedLine = line
            .replace(/^You:/, "학생:")
            .replace(/^Bot:/, "챗봇:");

          return (
            <React.Fragment key={index}>
              {isStudentLine && highlight.trim() ? (
                <HighlightedText text={formattedLine} highlight={highlight} />
              ) : (
                formattedLine
              )}
              {index < lines.length - 1 && <br />}
            </React.Fragment>
          );
        })}
      </>
    );
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">{currentQueryTarget} 채팅 내역역</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={onlyStudentQuestions}
              onChange={handleFilterChange}
              size="small"
              disabled={summaries.length === 0 && !loading}
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
            {displayedSummaries.map((item, idx) => (
              <ListItem
                key={item.createdAt + idx + (item.subject || "")}
                divider={idx < displayedSummaries.length - 1}
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
                    onlyStudentQuestions
                      ? extractAndHighlightStudentQuestions(
                          item.summary,
                          searchTerm
                        )
                      : formatAndHighlightSummaryText(item.summary, searchTerm)
                  }
                  secondary={new Date(item.createdAt).toLocaleString()}
                  primaryTypographyProps={{
                    component: "div",
                    style: {
                      whiteSpace: "pre-line",
                      fontSize: "0.9rem",
                      marginRight: queryType === "search" ? "60px" : "0",
                    },
                  }}
                  secondaryTypographyProps={{
                    style: { fontSize: "0.8rem", color: "#666" },
                    mt: 0.5,
                  }}
                />
              </ListItem>
            ))}
            {summaries.length > 0 &&
              displayedSummaries.length === 0 &&
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
