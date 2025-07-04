import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
  Paper,
  Typography,
  Box,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  useTheme,
  Chip,
  List,
  ListItem,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import api from "../../utils/api";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
// import { getSubjectIcon } from "./iconMapper"; // 실제 아이콘 매퍼 경로

type StudentReportProps = {
  studentId: number;
  selectedSemester: string;
  selectedSubject: string;
};

type Report = {
  subject: string;
  semester: string;
  comment: string;
  _id?: string;
};

// 각 평어의 확장 상태를 관리하기 위한 타입
type ExpandedCommentsState = {
  [key: string]: boolean;
};

// 새로운 내부 컴포넌트 정의
interface CommentDisplayProps {
  comment: string;
  commentKey: string; // 고유 키 전달
  isExpanded: boolean;
  onToggleExpansion: () => void;
}

const CommentDisplay: React.FC<CommentDisplayProps> = ({
  comment,
  commentKey, // 사용하지 않더라도 props로 받을 수 있음 (혹은 제거)
  isExpanded,
  onToggleExpansion,
}) => {
  const [canOverflow, setCanOverflow] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const clampLines = 3;

  useLayoutEffect(() => {
    if (textRef.current) {
      const element = textRef.current;
      // Temporarily apply clamping styles to measure
      const originalStyles = {
        display: element.style.display,
        webkitBoxOrient: element.style.webkitBoxOrient,
        webkitLineClamp: element.style.webkitLineClamp,
        overflow: element.style.overflow,
      };

      element.style.display = "-webkit-box";
      element.style.webkitBoxOrient = "vertical";
      element.style.webkitLineClamp = `${clampLines}`;
      element.style.overflow = "hidden";

      setCanOverflow(element.scrollHeight > element.clientHeight);

      // Restore original styles (or remove inline styles if sx prop handles it)
      element.style.display = originalStyles.display;
      element.style.webkitBoxOrient = originalStyles.webkitBoxOrient;
      element.style.webkitLineClamp = originalStyles.webkitLineClamp;
      element.style.overflow = originalStyles.overflow;
    }
  }, [comment, clampLines]);

  return (
    <Box>
      <Typography
        variant="body2"
        sx={{
          whiteSpace: "pre-line",
          wordBreak: "break-word",
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: isExpanded ? "none" : clampLines,
          overflow: "hidden",
          textOverflow: "ellipsis",
          lineHeight: 1.6,
        }}
        ref={textRef}
      >
        {comment}
      </Typography>
      {canOverflow && (
        <Button
          size="small"
          onClick={onToggleExpansion}
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

const StudentReport: React.FC<StudentReportProps> = ({
  studentId,
  selectedSemester,
  selectedSubject,
}) => {
  const theme = useTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedComments, setExpandedComments] =
    useState<ExpandedCommentsState>({});
  const [expandedAccordions, setExpandedAccordions] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const res = await api.post("/report/student", {
          studentId,
          selectedSemesters:
            selectedSemester !== "All" ? [selectedSemester] : [],
          selectedSubjects: selectedSubject !== "All" ? [selectedSubject] : [],
        });
        setReports(res.data || []);
      } catch (error) {
        console.error("Error fetching reports:", error);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchReports();
    } else {
      setLoading(false);
      setReports([]);
    }
  }, [studentId, selectedSemester, selectedSubject]);

  const groupedReports = reports.reduce((acc, report) => {
    if (!acc[report.semester]) {
      acc[report.semester] = [];
    }
    acc[report.semester].push(report);
    return acc;
  }, {} as Record<string, Report[]>);

  // 학기 정렬 (예: "2학기", "1학기" 순이 아닌 "1학기", "2학기" 순으로)
  const sortedSemesters = Object.keys(groupedReports).sort((a, b) => {
    if (a.includes("1학기") && b.includes("2학기")) return -1;
    if (a.includes("2학기") && b.includes("1학기")) return 1;
    return a.localeCompare(b); // 그 외 일반적인 문자열 비교
  });

  const toggleCommentExpansion = (key: string) => {
    setExpandedComments((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAccordionChange =
    (semester: string) =>
    (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpandedAccordions((prev) => ({
        ...prev,
        [semester]: isExpanded,
      }));
    };

  const renderReportItem = (
    report: Report,
    reportIndex: number,
    totalInSemester: number
  ) => {
    const commentKey = report._id || `${report.subject}-${reportIndex}`;
    return (
      <ListItem
        key={commentKey}
        divider={reportIndex < totalInSemester - 1}
        sx={{
          py: 1.5,
          px: 2,
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mb: 0.5,
            width: "100%",
          }}
        >
          {/* <SubjectIcon sx={{ mr: 1, color: 'primary.main' }} /> */}
          {/* 아이콘 예시: getSubjectIcon(report.subject) */}
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: "bold", flexGrow: 1 }}
          >
            {report.subject}
          </Typography>
          {/* <Chip label="세부평가" size="small" variant="outlined" sx={{ml: 1}}/> */}
        </Box>
        <CommentDisplay
          comment={report.comment}
          commentKey={commentKey}
          isExpanded={!!expandedComments[commentKey]}
          onToggleExpansion={() => toggleCommentExpansion(commentKey)}
        />
      </ListItem>
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 3,
          minHeight: 150,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (reports.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          padding: theme.spacing(2.5),
          marginTop: theme.spacing(0), // StudentList 내부이므로 mt 조정
          border: `1px dashed ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
          textAlign: "center",
          backgroundColor: theme.palette.background.default,
        }}
      >
        <InfoOutlinedIcon
          sx={{ fontSize: 40, color: theme.palette.text.secondary, mb: 1 }}
        />
        <Typography
          variant="h6"
          gutterBottom
          sx={{ color: theme.palette.text.primary, fontWeight: 500 }}
        >
          평어 기록 없음
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: theme.palette.text.secondary }}
        >
          선택된 조건에 해당하는 평어 기록이 없습니다.
          <br />
          필요시 "평어 생성/일괄조회" 탭에서 평어를 생성해주세요.
        </Typography>
      </Paper>
    );
  }

  // "전체 학기" 및 "전체 과목" 선택 시 아코디언 사용
  const useAccordion = selectedSemester === "All" && selectedSubject === "All";

  return (
    <Box sx={{ width: "100%" }}>
      {useAccordion ? (
        sortedSemesters.map((semester) => (
          <Accordion
            key={semester}
            expanded={expandedAccordions[semester] || false} // 기본적으로 닫힘
            onChange={handleAccordionChange(semester)}
            sx={{
              mb: 1.5,
              boxShadow: "none",
              border: `1px solid ${theme.palette.divider}`,
              "&:before": { display: "none" },
              "&.Mui-expanded": {
                margin: "0 0 12px 0",
              },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`semester-content-${semester}`}
              id={`semester-header-${semester}`}
              sx={{
                backgroundColor:
                  theme.palette.mode === "light"
                    ? theme.palette.grey[50]
                    : theme.palette.grey[800],
                borderBottom: `1px solid ${theme.palette.divider}`,
                minHeight: "48px",
                "& .MuiAccordionSummary-content": {
                  margin: "12px 0",
                },
                "&.Mui-expanded": {
                  minHeight: "48px",
                },
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: "medium" }}>
                {semester} (총 {groupedReports[semester].length}개 과목)
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <List sx={{ width: "100%", bgcolor: "background.paper", p: 0 }}>
                {groupedReports[semester].map((report, reportIndex) =>
                  renderReportItem(
                    report,
                    reportIndex,
                    groupedReports[semester].length
                  )
                )}
              </List>
            </AccordionDetails>
          </Accordion>
        ))
      ) : (
        // 특정 학기 또는 특정 과목 선택 시 아코디언 없이 바로 표시
        <Paper
          elevation={0}
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: theme.shape.borderRadius,
          }}
        >
          {sortedSemesters.map((semester) => (
            <Box key={semester} sx={{}}>
              {selectedSemester === "All" && ( // 여러 학기 결과가 나올 수 있는 경우 (특정 과목 + 전체 학기) 학기 제목 표시
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: "medium",
                    p: 2,
                    pb: 1,
                    backgroundColor:
                      theme.palette.mode === "light"
                        ? theme.palette.grey[50]
                        : theme.palette.grey[800],
                    borderBottom:
                      reports.length > 0
                        ? `1px solid ${theme.palette.divider}`
                        : "none",
                  }}
                >
                  {semester}
                </Typography>
              )}
              <List sx={{ width: "100%", bgcolor: "background.paper", p: 0 }}>
                {groupedReports[semester].map((report, reportIndex) =>
                  renderReportItem(
                    report,
                    reportIndex,
                    groupedReports[semester].length
                  )
                )}
              </List>
              {/* 여러 학기 표시 시 학기 사이에 구분선 추가 (마지막 학기 제외) */}
              {selectedSemester === "All" &&
                sortedSemesters.indexOf(semester) <
                  sortedSemesters.length - 1 && <Divider sx={{ my: 1 }} />}
            </Box>
          ))}
          {/* 만약 selectedSemester가 특정 학기이고, selectedSubject가 'All'이 아닌 경우,
              여기서 해당 과목명만 간단히 표시하고 바로 내용 들어가는 것도 고려 가능 */}
        </Paper>
      )}
    </Box>
  );
};

export default StudentReport;
