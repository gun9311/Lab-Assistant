import React, { useState, useEffect, useCallback } from "react";
import {
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Paper,
  Typography,
  Box,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Alert,
  Grid,
  Tabs,
  Tab,
  CircularProgress,
  Chip,
  AlertTitle,
  TextField,
  InputAdornment,
  IconButton,
  SelectChangeEvent,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import QuizIcon from "@mui/icons-material/Quiz";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PersonPinIcon from "@mui/icons-material/PersonPin";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import GradeIcon from "@mui/icons-material/Grade";
import ClassIcon from "@mui/icons-material/Class";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import QuizResults from "../student/quiz/QuizResults";
import ChatSummaryList from "./ChatSummaryList";
import StudentReport from "./StudentReport";
import { debounce } from "lodash";
import ComingSoon from "../common/ComingSoon";

type QuizResult = any; // 필요하다면 정확한 타입으로 수정

type Student = {
  _id: number;
  name: string;
  grade: number;
  class: string;
  studentId: string;
};

type StudentListProps = {
  school: string | null;
  grade: number | null;
  classNumber: string;
  students: Student[];
  uniqueIdentifier: string;
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`student-detail-tabpanel-${index}`}
      aria-labelledby={`student-detail-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const StudentList: React.FC<StudentListProps> = ({
  school,
  grade,
  classNumber,
  students,
  uniqueIdentifier,
}) => {
  const theme = useTheme();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<number>(0);
  const [selectedSemester, setSelectedSemester] = useState<string>("All");
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 30;

  const totalPages = Math.ceil(students.length / itemsPerPage);
  const currentStudents = students.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  const handleStudentSelect = (student: Student) => {
    setSelectedStudent(student);
    setActiveTab(0);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
    setSelectedStudent(null);
  };

  const debouncedSearchHandler = useCallback(
    debounce((term: string) => {
      const trimmedTerm = term.trim();
      if (trimmedTerm) {
        setSelectedSubject("All");
        setDebouncedSearchTerm(trimmedTerm);
      } else {
        setDebouncedSearchTerm("");
      }
    }, 500),
    []
  );

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    setSearchTerm(newSearchTerm);
    debouncedSearchHandler(newSearchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  };

  const handleSubjectChange = (event: SelectChangeEvent<string>) => {
    const newSubject = event.target.value as string;
    setSelectedSubject(newSubject);
    if (newSubject !== "All") {
      handleClearSearch();
    }
  };

  if (!grade || !classNumber || !uniqueIdentifier) {
    return (
      <Paper
        elevation={0}
        sx={{
          padding: theme.spacing(3),
          marginTop: theme.spacing(2),
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          backgroundColor: theme.palette.background.default,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Typography
          variant="h6"
          gutterBottom
          align="center"
          sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}
        >
          <b>학생 대시보드</b>를 조회하려면 다음 정보를 입력해주세요:
        </Typography>
        <Box
          sx={{
            width: "80%",
            maxWidth: 500,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          {!uniqueIdentifier && (
            <Alert
              severity="warning"
              icon={<HelpOutlineIcon fontSize="inherit" />}
            >
              <Typography variant="body1">
                <b>식별코드</b>를 입력해주세요.
              </Typography>
            </Alert>
          )}
          {!grade && (
            <Alert severity="warning" icon={<GradeIcon fontSize="inherit" />}>
              <Typography variant="body1">
                <b>학년</b>을 선택해주세요.
              </Typography>
            </Alert>
          )}
          {!classNumber && (
            <Alert severity="warning" icon={<ClassIcon fontSize="inherit" />}>
              <Typography variant="body1">
                <b>반</b>을 입력해주세요.
              </Typography>
            </Alert>
          )}
        </Box>
      </Paper>
    );
  }

  if (students.length === 0) {
    return (
      <Paper
        elevation={3}
        sx={{
          padding: theme.spacing(2),
          marginTop: theme.spacing(2),
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Typography
          variant="h5"
          gutterBottom
          align="center"
          sx={{ color: theme.palette.primary.main }}
        >
          입력한 식별코드, 학년, 반에 대한 학생이 없습니다.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        padding: theme.spacing(1),
        marginTop: theme.spacing(2),
        backgroundColor: "transparent",
      }}
    >
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4} md={3}>
          <Paper elevation={2} sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              학생 목록
            </Typography>
            <List dense sx={{ maxHeight: "60vh", overflowY: "auto", mb: 2 }}>
              {currentStudents.map((student) => (
                <ListItemButton
                  key={student._id}
                  selected={selectedStudent?._id === student._id}
                  onClick={() => handleStudentSelect(student)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemText
                    primary={`${student.studentId}. ${student.name}`}
                  />
                </ListItemButton>
              ))}
            </List>
            {students.length > itemsPerPage && (
              <Box display="flex" justifyContent="center" mt="auto">
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                  size="small"
                />
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} sm={8} md={9}>
          <Paper elevation={2} sx={{ p: 3, height: "100%" }}>
            {selectedStudent ? (
              <>
                <Box
                  sx={{
                    mb: 2,
                    pb: 2,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography
                    variant="h5"
                    component="h2"
                    gutterBottom
                    sx={{ display: "flex", alignItems: "center" }}
                  >
                    <PersonPinIcon sx={{ mr: 1, color: "primary.main" }} />
                    {`${selectedStudent.studentId}. ${selectedStudent.name}`}
                    <Chip
                      label={`${selectedStudent.grade}학년 ${selectedStudent.class}반`}
                      size="small"
                      sx={{ ml: 1.5 }}
                    />
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={2} mt={1.5}>
                    <FormControl
                      size="small"
                      sx={{ minWidth: 120 }}
                      disabled={activeTab === 0 || !!debouncedSearchTerm}
                    >
                      <InputLabel>학기</InputLabel>
                      <Select
                        value={selectedSemester}
                        onChange={(e) =>
                          setSelectedSemester(e.target.value as string)
                        }
                        label="학기"
                      >
                        <MenuItem value="All">전체</MenuItem>
                        <MenuItem value="1학기">1학기</MenuItem>
                        <MenuItem value="2학기">2학기</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl
                      size="small"
                      sx={{ minWidth: 120 }}
                      disabled={!!debouncedSearchTerm.trim()}
                    >
                      <InputLabel>과목</InputLabel>
                      <Select
                        value={selectedSubject}
                        onChange={handleSubjectChange}
                        label="과목"
                      >
                        <MenuItem value="All">전체</MenuItem>
                        <MenuItem value="국어">국어</MenuItem>
                        <MenuItem value="도덕">도덕</MenuItem>
                        <MenuItem value="수학">수학</MenuItem>
                        <MenuItem value="과학">과학</MenuItem>
                        <MenuItem value="사회">사회</MenuItem>
                        <MenuItem value="영어">영어</MenuItem>
                        <MenuItem value="음악">음악</MenuItem>
                        <MenuItem value="미술">미술</MenuItem>
                        <MenuItem value="체육">체육</MenuItem>
                        <MenuItem value="실과">실과</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      label="채팅 내용 검색 (학생 질문)"
                      variant="outlined"
                      size="small"
                      value={searchTerm}
                      onChange={handleSearchChange}
                      sx={{ minWidth: 250, flexGrow: 1 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="clear search"
                              onClick={handleClearSearch}
                              edge="end"
                              size="small"
                              style={{
                                visibility: searchTerm ? "visible" : "hidden",
                              }}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Box>
                  {activeTab === 0 &&
                    selectedSubject === "All" &&
                    !debouncedSearchTerm.trim() && (
                      <Alert severity="info" sx={{ mt: 1.5 }}>
                        채팅 내역을 보려면 특정 과목을 선택하거나 검색어를
                        입력해주세요.
                      </Alert>
                    )}
                  {activeTab === 0 &&
                    selectedSubject !== "All" &&
                    !debouncedSearchTerm.trim() && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          mt: 1,
                          color: "text.secondary",
                        }}
                      >
                        '{selectedSubject}' 과목의 채팅 내역을 표시합니다.
                      </Typography>
                    )}
                  {activeTab === 0 && debouncedSearchTerm.trim() && (
                    <Typography
                      variant="caption"
                      sx={{ display: "block", mt: 1, color: "text.secondary" }}
                    >
                      '{debouncedSearchTerm}' 검색 결과를 표시합니다. (모든 과목
                      대상)
                    </Typography>
                  )}
                </Box>
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                  <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    aria-label="student detail tabs"
                  >
                    <Tab
                      icon={<ChatIcon />}
                      iconPosition="start"
                      label="채팅 내역"
                      id="student-detail-tab-0"
                      aria-controls="student-detail-tabpanel-0"
                      sx={{ textTransform: "none" }}
                    />
                    <Tab
                      icon={<QuizIcon />}
                      iconPosition="start"
                      label="퀴즈 결과"
                      id="student-detail-tab-1"
                      aria-controls="student-detail-tabpanel-1"
                      sx={{ textTransform: "none" }}
                    />
                    <Tab
                      icon={<AssessmentIcon />}
                      iconPosition="start"
                      label="평어"
                      id="student-detail-tab-2"
                      aria-controls="student-detail-tabpanel-2"
                      sx={{ textTransform: "none" }}
                    />
                  </Tabs>
                </Box>
                <TabPanel value={activeTab} index={0}>
                  {selectedSubject !== "All" || debouncedSearchTerm.trim() ? (
                    <ChatSummaryList
                      studentId={selectedStudent._id}
                      selectedSemester={selectedSemester}
                      selectedSubject={selectedSubject}
                      searchTerm={debouncedSearchTerm}
                    />
                  ) : (
                    <Box
                      sx={{
                        textAlign: "center",
                        mt: 4,
                        color: "text.secondary",
                      }}
                    >
                      <Typography>
                        과목을 선택하거나 검색어를 입력하면 채팅 내역을 볼 수
                        있습니다.
                      </Typography>
                    </Box>
                  )}
                </TabPanel>
                <TabPanel value={activeTab} index={1}>
                  <QuizResults
                    studentId={selectedStudent._id}
                    selectedSemester={selectedSemester}
                    selectedSubject={selectedSubject}
                    isStudentView={false}
                  />
                  {/* <ComingSoon /> */}
                </TabPanel>
                <TabPanel value={activeTab} index={2}>
                  <StudentReport
                    studentId={selectedStudent._id}
                    selectedSemester={selectedSemester}
                    selectedSubject={selectedSubject}
                  />
                  {/* <ComingSoon /> */}
                </TabPanel>
              </>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: theme.palette.text.secondary,
                }}
              >
                <PersonPinIcon sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h6">학생을 선택해주세요</Typography>
                <Typography variant="body1">
                  왼쪽 목록에서 학생을 클릭하면 상세 정보를 볼 수 있습니다.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default StudentList;
