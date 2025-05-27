import React, { useState, useRef, useLayoutEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Snackbar,
  TextField,
  Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AssignmentIcon from "@mui/icons-material/Assignment";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import CalculateIcon from "@mui/icons-material/Calculate";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import SchoolIcon from "@mui/icons-material/School";
import ScienceIcon from "@mui/icons-material/Science";
import PublicIcon from "@mui/icons-material/Public";
import TranslateIcon from "@mui/icons-material/Translate";
import PsychologyIcon from "@mui/icons-material/Psychology";
import BuildIcon from "@mui/icons-material/Build";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import PaletteIcon from "@mui/icons-material/Palette";
import SportsSoccerIcon from "@mui/icons-material/SportsSoccer";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";

interface Student {
  _id: string;
  studentId: string;
  name: string;
}

interface Report {
  _id: string;
  studentId: Student;
  subject: string;
  semester: string;
  comment: string;
}

interface ReportComponentProps {
  reports: Report[];
  onBack: () => void;
  onCommentUpdate: (reportId: string, newComment: string) => void;
}

const subjectIcons: { [key: string]: React.ReactElement } = {
  국어: <MenuBookIcon color="primary" />,
  수학: <CalculateIcon color="secondary" />,
  과학: <ScienceIcon color="success" />,
  사회: <PublicIcon color="info" />,
  영어: <TranslateIcon sx={{ color: "orange" }} />,
  도덕: <PsychologyIcon sx={{ color: "purple" }} />,
  실과: <BuildIcon sx={{ color: "brown" }} />,
  음악: <MusicNoteIcon sx={{ color: "pink" }} />,
  미술: <PaletteIcon sx={{ color: "green" }} />,
  체육: <SportsSoccerIcon sx={{ color: "red" }} />,
};

const COMMENT_TRUNCATE_LENGTH = 100; // 평어 더보기/간략히 기준 길이

const SUBJECT_ORDER = [
  "국어",
  "도덕",
  "수학",
  "과학",
  "사회",
  "영어",
  "음악",
  "미술",
  "체육",
  "실과",
];

interface CommentRendererProps {
  text: string;
  isExpanded: boolean;
  onToggle: () => void;
  clampLines?: number;
}

const CommentRenderer: React.FC<CommentRendererProps> = ({
  text,
  isExpanded,
  onToggle,
  clampLines = 3,
}) => {
  const [canOverflow, setCanOverflow] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    if (textRef.current) {
      const element = textRef.current;
      // 넘침 여부를 정확히 측정하기 위해 일시적으로 clamping 스타일 적용
      element.style.display = "-webkit-box";
      element.style.webkitBoxOrient = "vertical";
      element.style.webkitLineClamp = `${clampLines}`;
      element.style.overflow = "hidden";

      setCanOverflow(element.scrollHeight > element.clientHeight);

      // 측정 후 임시로 적용한 인라인 스타일 제거 (sx prop이 최종 스타일을 결정하도록)
      element.style.display = "";
      element.style.webkitBoxOrient = "";
      element.style.webkitLineClamp = "";
      element.style.overflow = "";
    }
  }, [text, clampLines]);

  return (
    <>
      <Typography
        variant="body2"
        ref={textRef}
        sx={{
          whiteSpace: "pre-line",
          wordBreak: "break-word",
          fontSize: "0.875rem",
          lineHeight: 1.6,
          minHeight: `calc(${clampLines} * 1.6em)`, // 최소 높이 추가 (1.6em은 lineHeight * fontSize에 해당)
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: isExpanded ? "none" : clampLines,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {text}
      </Typography>
      {canOverflow && (
        <Button
          size="small"
          onClick={onToggle}
          startIcon={isExpanded ? <VisibilityOffIcon /> : <VisibilityIcon />}
          sx={{
            mt: 0.5,
            p: 0.5,
            fontSize: "0.75rem",
          }}
        >
          {isExpanded ? "간략히" : "더보기"}
        </Button>
      )}
    </>
  );
};

const ReportComponent: React.FC<ReportComponentProps> = ({
  reports,
  onBack,
  onCommentUpdate,
}) => {
  const [expandedComments, setExpandedComments] = useState<{
    [key: string]: boolean;
  }>({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );
  const [editingCommentKey, setEditingCommentKey] = useState<string | null>(
    null
  );
  const [editedCommentText, setEditedCommentText] = useState<string>("");

  const toggleCommentExpansion = (key: string) => {
    setExpandedComments((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSnackbarMessage("평어가 클립보드에 복사되었습니다.");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (err) {
      console.error("클립보드 복사 실패:", err);
      setSnackbarMessage("클립보드 복사에 실패했습니다.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleEditClick = (report: Report) => {
    setEditingCommentKey(report._id);
    setEditedCommentText(report.comment);
  };

  const handleCancelEdit = () => {
    setEditingCommentKey(null);
    setEditedCommentText("");
  };

  const handleSaveEdit = async (reportId: string) => {
    if (editedCommentText.trim() === "") {
      setSnackbarMessage("평어 내용은 비워둘 수 없습니다.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    try {
      onCommentUpdate(reportId, editedCommentText);

      setSnackbarMessage("평어가 성공적으로 수정되었습니다.");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setEditingCommentKey(null);
    } catch (error) {
      console.error("평어 수정 실패:", error);
      setSnackbarMessage("평어 수정에 실패했습니다.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const groupedReports = reports.reduce((acc: any, report: Report) => {
    const semesterKey = report.semester || "미지정 학기";
    const subjectKey = report.subject || "미지정 과목";

    if (!acc[semesterKey]) {
      acc[semesterKey] = {};
    }
    if (!acc[semesterKey][subjectKey]) {
      acc[semesterKey][subjectKey] = [];
    }
    acc[semesterKey][subjectKey].push(report);
    return acc;
  }, {});

  if (reports.length === 0) {
    return (
      <Box sx={{ padding: 3, textAlign: "center", mt: 4 }}>
        <Paper
          elevation={3}
          sx={{
            padding: 3,
            borderRadius: 2,
            display: "inline-block",
            maxWidth: 500,
            width: "100%",
          }}
        >
          <Alert
            severity="info"
            icon={<AssignmentIcon fontSize="large" />}
            sx={{
              justifyContent: "center",
              py: 2,
              mb: 3,
              border: "none",
              backgroundColor: "transparent",
              "& .MuiAlert-icon": {
                fontSize: "3rem",
                mr: 2,
                alignSelf: "center",
              },
              "& .MuiAlert-message": {
                textAlign: "left",
                width: "100%",
              },
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ fontWeight: "bold" }}>
              조회된 평어가 없습니다.
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              다른 조건으로 다시 조회하시거나, '평어 생성' 탭에서 새로운 평어를
              만들어보세요.
            </Typography>
          </Alert>
          <Button
            variant="contained"
            onClick={onBack}
            startIcon={<ArrowBackIcon />}
            size="large"
            sx={{ mt: 1 }}
          >
            선택 화면으로 돌아가기
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: { xs: 1, sm: 2, md: 3 }, backgroundColor: "grey.50" }}>
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 3 }}>
        <Button
          variant="contained"
          onClick={onBack}
          startIcon={<ArrowBackIcon />}
          size="large"
        >
          선택 화면으로 돌아가기
        </Button>
      </Box>

      {Object.keys(groupedReports)
        .sort() // 학기 정렬
        .map((semester) => (
          <Box key={semester} sx={{ marginBottom: 4 }}>
            <Typography
              variant="h4"
              gutterBottom
              sx={{
                fontWeight: "bold",
                color: "primary.dark",
                pb: 1,
                mb: 2,
                borderBottom: (theme) =>
                  `2px solid ${theme.palette.primary.main}`,
              }}
            >
              {semester}
            </Typography>
            {Object.keys(groupedReports[semester])
              .sort(
                (a, b) => SUBJECT_ORDER.indexOf(a) - SUBJECT_ORDER.indexOf(b)
              )
              .map((subject, subjectIndex) => (
                <Accordion
                  key={subject}
                  sx={{
                    mb: 2,
                    boxShadow: "0px 3px 15px rgba(0,0,0,0.1)",
                    "&:before": { display: "none" },
                    borderRadius: 2,
                    "&.Mui-expanded": { margin: "16px 0" },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls={`${semester}-${subject}-content`}
                    id={`${semester}-${subject}-header`}
                    sx={{
                      backgroundColor: "grey.100",
                      borderBottom: "1px solid rgba(0, 0, 0, .125)",
                      minHeight: 64,
                      "& .MuiAccordionSummary-content": {
                        alignItems: "center",
                        justifyContent: "space-between",
                        pr: 1,
                      },
                      "&.Mui-expanded": {
                        borderBottom: "1px solid rgba(0, 0, 0, .125)",
                      },
                      borderRadius: "8px 8px 0 0",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      {subjectIcons[subject] || (
                        <AssignmentIcon
                          sx={{ mr: 1.5, color: "action.active" }}
                        />
                      )}
                      <Typography variant="h6" sx={{ fontWeight: "medium" }}>
                        {subject}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation(); // 아코디언 토글 방지

                          const subjectReports =
                            groupedReports[semester][subject];

                          const payload = {
                            subject,
                            comments: subjectReports.map((report: Report) => ({
                              studentId: report.studentId.studentId,
                              comment: report.comment,
                            })),
                          };

                          if (chrome?.runtime?.sendMessage) {
                            chrome.runtime.sendMessage(
                              "jefkdeojjfmmcdbanibhdfmaggceehbb",
                              {
                                type: "INJECT_COMMENTS",
                                payload,
                              },
                              () => {
                                console.log("평어 전송 완료");
                              }
                            );
                          } else {
                            console.warn("크롬 익스텐션과 통신할 수 없습니다.");
                          }
                        }}
                        sx={{ textTransform: "none" }}
                      >
                        NEIS로 일괄 전송
                      </Button>
                      <Chip
                        label={`${groupedReports[semester][subject].length}명`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <TableContainer
                      component={Paper}
                      sx={{ boxShadow: "none", borderRadius: "0 0 8px 8px" }}
                    >
                      <Table size="small" aria-label={`${subject} 평어 테이블`}>
                        <TableHead>
                          <TableRow
                            sx={{
                              "& th": {
                                backgroundColor: "grey.200",
                                fontWeight: "bold",
                                py: 1.5,
                              },
                            }}
                          >
                            <TableCell sx={{ width: "15%", pl: 2 }}>
                              학번
                            </TableCell>
                            <TableCell sx={{ width: "20%" }}>이름</TableCell>
                            <TableCell sx={{ width: "65%", pr: 2 }}>
                              평어
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {groupedReports[semester][subject]
                            .sort(
                              (a: Report, b: Report) =>
                                parseInt(a.studentId.studentId) -
                                parseInt(b.studentId.studentId)
                            )
                            .map((report: Report, index: number) => {
                              const commentKey = `${report.studentId._id}-${subject}-${index}`;
                              const isExpanded = !!expandedComments[commentKey];

                              return (
                                <TableRow
                                  key={commentKey}
                                  sx={{
                                    "&:hover": {
                                      backgroundColor: "action.hover",
                                    },
                                    "& td, & th": {
                                      borderBottom:
                                        "1px solid rgba(224, 224, 224, 1)",
                                    },
                                    "&:last-child td, &:last-child th": {
                                      border: 0,
                                    },
                                  }}
                                >
                                  <TableCell
                                    sx={{
                                      pl: 2,
                                      verticalAlign: "top",
                                      py: 1.5,
                                    }}
                                  >
                                    <Chip
                                      label={report.studentId.studentId}
                                      size="small"
                                      variant="outlined"
                                    />
                                  </TableCell>
                                  <TableCell
                                    sx={{ verticalAlign: "top", py: 1.5 }}
                                  >
                                    <Typography variant="body2">
                                      {report.studentId.name}
                                    </Typography>
                                  </TableCell>
                                  <TableCell
                                    sx={{
                                      pr: 2,
                                      verticalAlign: "top",
                                      py: 1.5,
                                      position: "relative",
                                    }}
                                  >
                                    {editingCommentKey === report._id ? (
                                      <Box>
                                        <TextField
                                          fullWidth
                                          multiline
                                          rows={3}
                                          value={editedCommentText}
                                          onChange={(e) =>
                                            setEditedCommentText(e.target.value)
                                          }
                                          variant="outlined"
                                          size="small"
                                          sx={{ mb: 1 }}
                                        />
                                        <Box sx={{ display: "flex", gap: 1 }}>
                                          <Button
                                            variant="contained"
                                            color="primary"
                                            size="small"
                                            startIcon={<SaveIcon />}
                                            onClick={() =>
                                              handleSaveEdit(report._id)
                                            }
                                          >
                                            저장
                                          </Button>
                                          <Button
                                            variant="outlined"
                                            color="inherit"
                                            size="small"
                                            startIcon={<CancelIcon />}
                                            onClick={handleCancelEdit}
                                          >
                                            취소
                                          </Button>
                                        </Box>
                                      </Box>
                                    ) : (
                                      <Box sx={{ position: "relative", pr: 6 }}>
                                        <CommentRenderer
                                          text={report.comment}
                                          isExpanded={isExpanded}
                                          onToggle={() =>
                                            toggleCommentExpansion(commentKey)
                                          }
                                        />
                                        <Box
                                          sx={{
                                            position: "absolute",
                                            top: 0,
                                            right: 0,
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 0.5,
                                            backgroundColor: "background.paper",
                                            padding: "4px",
                                            borderRadius: "4px",
                                          }}
                                        >
                                          <Tooltip title="수정하기">
                                            <IconButton
                                              aria-label="edit comment"
                                              size="small"
                                              onClick={() =>
                                                handleEditClick(report)
                                              }
                                              sx={{ color: "text.secondary" }}
                                            >
                                              <EditIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                          <Tooltip title="복사하기">
                                            <IconButton
                                              aria-label="copy comment"
                                              size="small"
                                              onClick={() =>
                                                handleCopyToClipboard(
                                                  report.comment
                                                )
                                              }
                                              sx={{ color: "text.secondary" }}
                                            >
                                              <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        </Box>
                                      </Box>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              ))}
          </Box>
        ))}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReportComponent;
