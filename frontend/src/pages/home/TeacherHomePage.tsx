import React, { useState, useEffect } from "react";
import StudentList from "../../components/teacher/StudentList";
import { getSchoolName } from "../../utils/auth";
import api from "../../utils/api";
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
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import GradeIcon from "@mui/icons-material/Grade";
import ClassIcon from "@mui/icons-material/Class";
import AssessmentIcon from "@mui/icons-material/Assessment";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import UnifiedModal from "./UnifiedModal";
import ReportGeneration from "../../components/teacher/reportGeneration/ReportGeneration";
import StudentRegistrationResultModal from "./StudentRegistrationResultModal";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

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
  };
  error: string;
}

type CreateResult = {
  success: boolean;
  message: string;
  missingNameIndexes?: number[];
};

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
  const [successReset, setSuccessReset] = useState(false);
  const [errorReset, setErrorReset] = useState("");
  const school = getSchoolName();
  const theme = useTheme();

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

  const handleShowReportGeneration = () => {
    if (grade && classNumber) {
      setShowReportGeneration(true);
    } else {
      alert("학년과 반을 모두 선택해 주세요.");
    }
  };

  const handleBackToList = () => {
    setShowReportGeneration(false);
  };

  const handleOpenModal = () => {
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleCreateStudent = async (
    studentData: any
  ): Promise<CreateResult> => {
    // 필수 필드 검증
    const missingFields: string[] = [];
    const missingNameIndexes: number[] = [];

    for (const student of studentData) {
      if (!student.name) {
        missingNameIndexes.push(parseInt(student.studentId));
      }
    }

    if (missingNameIndexes.length > 0) {
      return {
        success: false,
        message: "입력되지 않은 학생 이름이 있습니다.",
        missingNameIndexes,
      };
    }

    try {
      const res = await api.post(
        "/auth/register/studentByTeacher",
        studentData
      );
      const { success, failed } = res.data;

      setModalData({ success, failed });
      setResultModalOpen(true);

      return { success: true, message: "학생 계정 생성 완료" };
    } catch (error) {
      console.error("학생 계정 생성 중 오류:", error);
      return {
        success: false,
        message: "학생 계정 생성 중 오류가 발생했습니다.",
      };
    }
  };

  const handleResetStudentPassword = async (studentId: string) => {
    try {
      await api.post("/auth/forgot-student-password", { studentId });
      setSuccessReset(true);
    } catch (error) {
      console.error("비밀번호 재설정 실패:", error);
      setErrorReset("비밀번호 재설정 요청에 실패했습니다.");
    }
  };

  return (
    <Container component="main" maxWidth="lg" sx={{ mt: 6, mb: 4 }}>
      <Paper elevation={3} sx={{ padding: 4, borderRadius: 2 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          sx={{ mb: 6, position: "relative" }}
        >
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: "bold",
              color: theme.palette.primary.dark,
              textAlign: "center",
            }}
          >
            <SchoolIcon
              fontSize="large"
              sx={{ verticalAlign: "middle", mr: 1 }}
            />
            {school}
          </Typography>
          <Box sx={{ position: "absolute", right: 0 }}>
            <Button
              variant="contained"
              onClick={handleOpenModal}
              sx={{
                backgroundColor: "#333",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: "6px",
                boxShadow: "0 3px 5px 2px rgba(0, 0, 0, .2)",
                fontWeight: "bold",
                fontSize: "14px",
                "&:hover": {
                  backgroundColor: "#555",
                },
                ml: 2,
              }}
            >
              <AccountCircleIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              학생 계정 관리
            </Button>
          </Box>
        </Box>
        <UnifiedModal
          open={isModalOpen}
          onClose={handleCloseModal}
          onSubmitCreate={handleCreateStudent}
          onSubmitReset={handleResetStudentPassword}
          school={school}
        />
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 8 }}
        >
          <Box display="flex" gap={2}>
            <FormControl sx={{ minWidth: 120, width: 120 }}>
              <TextField
                label="식별코드"
                placeholder="식별코드"
                value={uniqueIdentifier}
                onChange={(e) => setUniqueIdentifier(e.target.value)}
                variant="outlined"
                sx={{
                  borderRadius: 1,
                  backgroundColor: theme.palette.background.paper,
                  width: 120,
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip
                        title={
                          <Typography variant="body1" sx={{ fontSize: "1rem" }}>
                            학생 계정 생성 시 설정했던 식별코드를 입력하세요.
                          </Typography>
                        }
                      >
                        <HelpOutlineIcon />
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </FormControl>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>
                {/* <GradeIcon sx={{ mr: 1, verticalAlign: "middle" }} /> */}
                학년
              </InputLabel>
              <Select
                value={grade || ""}
                onChange={(e) => setGrade(Number(e.target.value))}
                label="학년"
                sx={{
                  borderRadius: 1,
                  backgroundColor: theme.palette.background.paper,
                  minWidth: 120,
                }}
              >
                <MenuItem value={3}>3</MenuItem>
                <MenuItem value={4}>4</MenuItem>
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={6}>6</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 120, width: 120 }}>
              <TextField
                label={<ClassIcon sx={{ mr: 1, verticalAlign: "middle" }} />}
                value={classNumber}
                onChange={(e) => setClassNumber(e.target.value)}
                variant="outlined"
                sx={{
                  borderRadius: 1,
                  backgroundColor: theme.palette.background.paper,
                  width: 120,
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">반</InputAdornment>
                  ),
                }}
              />
            </FormControl>
          </Box>
          {!showReportGeneration && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleShowReportGeneration}
              disabled={!grade || !classNumber || !uniqueIdentifier}
              sx={{
                padding: "10px 24px",
                borderRadius: 4,
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                  boxShadow: "none",
                },
              }}
            >
              <AssessmentIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              평어 생성 및 일괄 조회
            </Button>
          )}
        </Box>
        <StudentRegistrationResultModal
          open={isResultModalOpen}
          onClose={() => setResultModalOpen(false)}
          success={modalData.success}
          failed={modalData.failed}
        />
        {showReportGeneration ? (
          <ReportGeneration
            onBack={handleBackToList}
            school={school}
            grade={grade}
            classNumber={classNumber}
            students={students}
          />
        ) : (
          <StudentList
            school={school}
            grade={grade}
            classNumber={classNumber}
            students={students}
            uniqueIdentifier={uniqueIdentifier}
          />
        )}

        {/* Snackbar: 비밀번호 재설정 성공 */}
        <Snackbar
          open={successReset}
          autoHideDuration={5000}
          onClose={() => setSuccessReset(false)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSuccessReset(false)}
            severity="success"
            sx={{ width: "100%" }}
          >
            비밀번호 재설정 링크가 이메일로 발송되었습니다.
          </Alert>
        </Snackbar>

        {/* Snackbar: 비밀번호 재설정 실패 */}
        {errorReset && (
          <Snackbar
            open={!!errorReset}
            autoHideDuration={2000}
            onClose={() => setErrorReset("")}
            anchorOrigin={{ vertical: "top", horizontal: "center" }}
          >
            <Alert
              onClose={() => setErrorReset("")}
              severity="error"
              sx={{ width: "100%" }}
            >
              {errorReset}
            </Alert>
          </Snackbar>
        )}
      </Paper>
    </Container>
  );
};

export default TeacherHomePage;
