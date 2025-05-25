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

interface Student {
  _id: string;
  studentId: string;
  name: string;
}

interface Report {
  studentId: Student;
  subject: string;
  semester: string;
  comment: string;
}

interface ReportComponentProps {
  reports: Report[];
  onBack: () => void;
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
}) => {
  const [expandedComments, setExpandedComments] = useState<{
    [key: string]: boolean;
  }>({});

  const toggleCommentExpansion = (key: string) => {
    setExpandedComments((prev) => ({ ...prev, [key]: !prev[key] }));
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
                    <Chip
                      label={`${groupedReports[semester][subject].length}명`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
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
                            .sort((a: Report, b: Report) =>
                              a.studentId.studentId.localeCompare(
                                b.studentId.studentId
                              )
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
                                    }}
                                  >
                                    <CommentRenderer
                                      text={report.comment}
                                      isExpanded={isExpanded}
                                      onToggle={() =>
                                        toggleCommentExpansion(commentKey)
                                      }
                                    />
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
    </Box>
  );
};

export default ReportComponent;
