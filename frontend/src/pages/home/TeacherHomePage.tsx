import React, { useState, useEffect } from "react";
import StudentList from "../../components/teacher/StudentList";
import { getSchoolName } from "../../utils/auth";
import api from "../../utils/api";
import axios, { AxiosError } from "axios";
import {
  Container,
  Typography,
  Box,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  useTheme,
  Snackbar,
  Alert,
  Modal,
  InputAdornment,
  Tooltip,
  ButtonGroup,
  Grid,
  Stack,
  Tabs,
  Tab,
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import GradeIcon from "@mui/icons-material/Grade";
import ClassIcon from "@mui/icons-material/Class";
import AssessmentIcon from "@mui/icons-material/Assessment";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import DashboardIcon from "@mui/icons-material/Dashboard";
import UnifiedModal from "./UnifiedModal";
import ReportGeneration from "../../components/teacher/reportGeneration/ReportGeneration";
import StudentRegistrationResultModal from "./StudentRegistrationResultModal";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ComingSoon from "../../components/common/ComingSoon";
import GetAppIcon from "@mui/icons-material/GetApp";

type Student = {
  _id: number;
  name: string;
  grade: number;
  class: string;
  loginId: string;
  password: string;
  studentId: string;
  studentClass: string;
  school: string;
};

interface FailedStudent {
  studentData: {
    name: string;
    grade: number;
    class: string;
    studentClass: string;
    studentId: string;
    loginId: string;
  };
  error: string;
}

type CreateResult = {
  success: boolean;
  message: string;
  missingNameIndexes?: number[];
};

// 마지막 등록 정보 타입
type LastRegistrationInfo = {
  identifier: string | null;
  grade: number | null;
  classNum: string | null;
};

// UnifiedModal에서 전달할 학생 입력 데이터 타입 정의
export interface StudentInput {
  name: string;
  studentId: string;
  loginId: string;
  password?: string; // 비밀번호는 보통 고정값이므로 옵셔널
  school?: string; // TeacherHomePage에서 추가되므로 옵셔널
  grade?: string; // TeacherHomePage에서 추가되므로 옵셔널
  studentClass?: string; // TeacherHomePage에서 추가되므로 옵셔널
}

// UnifiedModal에서 전달할 전체 데이터 타입 정의 및 export
export interface UnifiedModalSubmitData {
  students: StudentInput[]; // any[] 대신 StudentInput[] 사용
  identifier: string;
  grade: string;
  classNum: string;
}

const TeacherHomePage: React.FC = () => {
  const [grade, setGrade] = useState<number | null>(null);
  const [classNumber, setClassNumber] = useState<string>("");
  const [uniqueIdentifier, setUniqueIdentifier] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [showReportGeneration, setShowReportGeneration] =
    useState<boolean>(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    success: Student[];
    failed: FailedStudent[];
  }>({ success: [], failed: [] });
  const [isResultModalOpen, setResultModalOpen] = useState(false);
  const [lastRegistrationInfo, setLastRegistrationInfo] =
    useState<LastRegistrationInfo>({
      identifier: null,
      grade: null,
      classNum: null,
    });
  const [successReset, setSuccessReset] = useState(false);
  const [errorReset, setErrorReset] = useState("");
  const school = getSchoolName();
  const theme = useTheme();
  const currentTabIndex = showReportGeneration ? 1 : 0;

  const [isChromeBrowser, setIsChromeBrowser] = useState(false);
  const [canCommunicateWithExtension, setCanCommunicateWithExtension] =
    useState(false);
  const [showExtensionAlert, setShowExtensionAlert] = useState(true);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isChrome = userAgent.includes("chrome") && !userAgent.includes("edg");
    setIsChromeBrowser(isChrome);

    if (isChrome && chrome?.runtime?.sendMessage) {
      try {
        chrome.runtime.sendMessage(
          "mlaphiokjhimgcjgcjkpcmmdgdajmjka", // Extension ID
          { type: "PING" },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn(
                "Extension PING failed:",
                chrome.runtime.lastError.message
              );
              setCanCommunicateWithExtension(false);
            } else if (response && response.success) {
              setCanCommunicateWithExtension(true);
            } else {
              setCanCommunicateWithExtension(false);
            }
          }
        );
      } catch (e) {
        console.warn("Error sending PING to extension:", e);
        setCanCommunicateWithExtension(false);
      }
    } else {
      setCanCommunicateWithExtension(false);
    }
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (school && grade && classNumber && uniqueIdentifier) {
        try {
          const res = await api.get("/users/teacher/students", {
            params: { school, grade, class: classNumber, uniqueIdentifier },
          });
          const sortedStudents = res.data.sort(
            (a: Student, b: Student) =>
              parseInt(a.studentId) - parseInt(b.studentId)
          );
          setStudents(sortedStudents);
        } catch (error) {
          console.error("Error fetching students:", error);
        }
      }
    };
    fetchStudents();
  }, [school, grade, classNumber, uniqueIdentifier]);

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleCreateStudent = async (
    submitData: UnifiedModalSubmitData
  ): Promise<CreateResult> => {
    const {
      students, // 이제 StudentInput[] 타입으로 추론됨
      identifier,
      grade: submitGrade,
      classNum: submitClassNum,
    } = submitData;

    // 결과 모달에 전달할 정보 설정 (기존과 동일)
    const currentRegInfo: LastRegistrationInfo = {
      identifier: identifier,
      grade: submitGrade ? Number(submitGrade) : null,
      classNum: submitClassNum,
    };

    // API 요청 본문 생성 (백엔드가 요구하는 최종 형태로 가공)
    const apiPayload = students; // UnifiedModal에서 이미 유효성 검사 완료

    try {
      const res = await api.post("/auth/register/studentByTeacher", apiPayload);
      const { success, failed } = res.data;
      setModalData({ success, failed });
      setLastRegistrationInfo(currentRegInfo);
      setResultModalOpen(true);
      return { success: true, message: "학생 계정 생성 요청 처리 완료" };
    } catch (error) {
      console.error("학생 계정 생성 중 오류:", error);
      if (axios.isAxiosError(error)) {
        if (error.response?.data) {
          const errorData = error.response.data;
          if (
            Array.isArray(errorData.success) &&
            Array.isArray(errorData.failed)
          ) {
            setModalData({
              success: errorData.success,
              failed: errorData.failed,
            });
            setLastRegistrationInfo(currentRegInfo);
            setResultModalOpen(true);
            return { success: true, message: "학생 계정 생성 결과 확인 필요" };
          } else {
            const errorMessage =
              typeof errorData?.error === "string"
                ? errorData.error
                : "학생 계정 생성 중 예상치 못한 오류가 발생했습니다.";
            return { success: false, message: errorMessage };
          }
        } else {
          return {
            success: false,
            message:
              "서버 응답을 받지 못했습니다. 네트워크 연결을 확인해주세요.",
          };
        }
      } else {
        return {
          success: false,
          message: "학생 계정 생성 중 알 수 없는 오류가 발생했습니다.",
        };
      }
    }
  };

  const handleResetStudentPassword = async (studentId: string) => {
    try {
      await api.post("/auth/forgot-student-password", { studentId });
      setSuccessReset(true);
      setErrorReset("");
    } catch (error) {
      console.error("비밀번호 재설정 실패:", error);
      setErrorReset("비밀번호 재설정 요청에 실패했습니다.");
      setSuccessReset(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setShowReportGeneration(newValue === 1);
  };

  return (
    <Container component="main" maxWidth="xl" sx={{ mt: 6, mb: 4 }}>
      {showExtensionAlert &&
        (!isChromeBrowser || !canCommunicateWithExtension) && (
          <Alert
            severity={!isChromeBrowser ? "warning" : "info"}
            sx={{ mb: 2 }}
            action={
              <Box>
                {!isChromeBrowser && (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() =>
                      window.open("https://www.google.com/chrome/", "_blank")
                    }
                    startIcon={<GetAppIcon />}
                  >
                    Chrome 설치
                  </Button>
                )}
                {isChromeBrowser && !canCommunicateWithExtension && (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() =>
                      window.open(
                        "https://chromewebstore.google.com/detail/mlaphiokjhimgcjgcjkpcmmdgdajmjka?utm_source=item-share-cb",
                        "_blank"
                      )
                    }
                    startIcon={<GetAppIcon />}
                  >
                    확장 프로그램 설치
                  </Button>
                )}
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setShowExtensionAlert(false)}
                  sx={{ ml: 1 }}
                >
                  닫기
                </Button>
              </Box>
            }
          >
            {!isChromeBrowser
              ? "NUDGE의 모든 기능을 원활하게 사용하려면 Chrome 브라우저 사용을 권장합니다. NEIS 자동입력 기능은 Chrome에서만 지원됩니다."
              : "NEIS 자동입력 기능을 사용하려면 Chrome 확장 프로그램 설치가 필요합니다. 설치 후 반드시 페이지를 새로고침 해주세요."}
          </Alert>
        )}
      <Paper elevation={3} sx={{ padding: theme.spacing(4), borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 4 }}>
          <Grid item xs>
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: "bold",
                color: theme.palette.primary.dark,
                display: "flex",
                alignItems: "center",
              }}
            >
              <SchoolIcon
                fontSize="large"
                sx={{ verticalAlign: "middle", mr: 1.5 }}
              />
              {school}
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              onClick={handleOpenModal}
              startIcon={<AccountCircleIcon />}
              sx={{
                fontWeight: "bold",
                py: 1,
                px: 2,
                backgroundColor: theme.palette.grey[700],
                color: theme.palette.common.white,
                "&:hover": {
                  backgroundColor: theme.palette.grey[800],
                },
              }}
            >
              학생 계정 관리
            </Button>
          </Grid>
        </Grid>
        <UnifiedModal
          open={isModalOpen}
          onClose={handleCloseModal}
          onSubmitCreate={handleCreateStudent}
          // onSubmitReset={handleResetStudentPassword}
          school={school}
        />
        <Grid
          container
          spacing={2}
          justifyContent="space-between"
          alignItems="center"
          sx={{
            mb: 4,
            borderBottom: `1px solid ${theme.palette.divider}`,
            pb: 1,
          }}
        >
          <Grid item xs={12} md="auto">
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              flexWrap="wrap"
              sx={{ mb: { xs: 2, md: 0 } }}
            >
              <FormControl sx={{ width: { xs: "100%", sm: 150 } }} size="small">
                <TextField
                  label="식별코드"
                  placeholder="식별코드 입력"
                  value={uniqueIdentifier}
                  onChange={(e) => setUniqueIdentifier(e.target.value)}
                  variant="outlined"
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip
                          title={
                            <Typography
                              variant="body2"
                              sx={{ fontSize: "0.9rem" }}
                            >
                              학생 계정 생성 시 설정했던 식별코드를 입력하세요.
                            </Typography>
                          }
                        >
                          <HelpOutlineIcon fontSize="small" />
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />
              </FormControl>
              <FormControl sx={{ width: { xs: "100%", sm: 120 } }} size="small">
                <InputLabel>학년</InputLabel>
                <Select
                  value={grade || ""}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  label="학년"
                >
                  <MenuItem value={2}>2</MenuItem>
                  <MenuItem value={3}>3</MenuItem>
                  <MenuItem value={4}>4</MenuItem>
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={6}>6</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ width: { xs: "100%", sm: 100 } }} size="small">
                <TextField
                  label="반"
                  placeholder="반 입력"
                  value={classNumber}
                  onChange={(e) => setClassNumber(e.target.value)}
                  variant="outlined"
                  size="small"
                />
              </FormControl>
            </Stack>
          </Grid>
          <Grid item xs={12} md="auto">
            <Tabs
              value={currentTabIndex}
              onChange={handleTabChange}
              aria-label="view tabs"
              indicatorColor="primary"
            >
              <Tab
                icon={<DashboardIcon />}
                iconPosition="start"
                label="대시보드"
                sx={{
                  textTransform: "none",
                  minHeight: "48px",
                  color: theme.palette.grey[500],
                  "&.Mui-selected": {
                    color: theme.palette.primary.main,
                  },
                }}
              />
              <Tab
                icon={<AssessmentIcon />}
                iconPosition="start"
                label="평어 생성/일괄조회"
                sx={{
                  textTransform: "none",
                  minHeight: "48px",
                  color: theme.palette.grey[500],
                  "&.Mui-selected": {
                    color: theme.palette.primary.main,
                  },
                }}
              />
            </Tabs>
          </Grid>
        </Grid>
        <StudentRegistrationResultModal
          open={isResultModalOpen}
          onClose={() => setResultModalOpen(false)}
          success={modalData.success}
          failed={modalData.failed}
          identifier={lastRegistrationInfo.identifier}
          grade={lastRegistrationInfo.grade}
          classNum={lastRegistrationInfo.classNum}
          school={school}
        />
        <Box sx={{ mt: 4 }}>
          {showReportGeneration ? (
            <>
              {grade && classNumber && uniqueIdentifier ? (
                <ReportGeneration
                  school={school}
                  grade={grade}
                  classNumber={classNumber}
                  students={students}
                />
              ) : (
                // <ComingSoon />
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    py: 4,
                    gap: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    backgroundColor: theme.palette.background.default,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      color: "text.secondary",
                      textAlign: "center",
                      fontWeight: 500,
                      mb: 2,
                    }}
                  >
                    <b>평어 생성/조회</b>를 시작하려면 다음 정보를 입력해주세요:
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
                      <Alert
                        severity="warning"
                        icon={<GradeIcon fontSize="inherit" />}
                      >
                        <Typography variant="body1">
                          <b>학년</b>을 선택해주세요.
                        </Typography>
                      </Alert>
                    )}
                    {!classNumber && (
                      <Alert
                        severity="warning"
                        icon={<ClassIcon fontSize="inherit" />}
                      >
                        <Typography variant="body1">
                          <b>반</b>을 입력해주세요.
                        </Typography>
                      </Alert>
                    )}
                  </Box>
                </Box>
              )}
            </>
          ) : (
            <StudentList
              school={school}
              grade={grade}
              classNumber={classNumber}
              students={students}
              uniqueIdentifier={uniqueIdentifier}
            />
          )}
        </Box>

        <Snackbar
          open={successReset}
          autoHideDuration={5000}
          onClose={() => setSuccessReset(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSuccessReset(false)}
            severity="success"
            variant="filled"
            sx={{ width: "100%" }}
          >
            비밀번호 재설정 링크가 이메일로 발송되었습니다.
          </Alert>
        </Snackbar>
        <Snackbar
          open={!!errorReset}
          autoHideDuration={3000}
          onClose={() => setErrorReset("")}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setErrorReset("")}
            severity="error"
            variant="filled"
            sx={{ width: "100%" }}
          >
            {errorReset}
          </Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
};

export default TeacherHomePage;
