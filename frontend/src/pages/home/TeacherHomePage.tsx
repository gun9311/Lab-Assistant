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
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import GradeIcon from "@mui/icons-material/Grade";
import ClassIcon from "@mui/icons-material/Class";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PersonAddIcon from "@mui/icons-material/PersonAdd"; // 학생 추가 아이콘
import ReportGeneration from "../../components/teacher/reportGeneration/ReportGeneration";
import StudentAccountModal from "./StudentAccountModal";

type Student = {
  _id: number;
  name: string;
  grade: number;
  class: string;
  studentId: string;
};

const TeacherHomePage: React.FC = () => {
  const [grade, setGrade] = useState<number | null>(null);
  const [classNumber, setClassNumber] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [showReportGeneration, setShowReportGeneration] =
    useState<boolean>(false);
  const school = getSchoolName();
  const theme = useTheme();
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      if (school && grade && classNumber) {
        try {
          const res = await api.get("/users/teacher/students", {
            params: { school, grade, class: classNumber },
          });
          const sortedStudents = res.data.sort((a: Student, b: Student) =>
            a.studentId.localeCompare(b.studentId)
          );
          setStudents(sortedStudents);
        } catch (error) {
          console.error("Error fetching students:", error);
        }
      }
    };

    fetchStudents();
  }, [school, grade, classNumber]);

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

  const handleCreateStudent = async (studentData: any) => {
    try {
      const res = await api.post('/auth/register/studentByTeacher', studentData);
      console.log('학생 계정 생성 완료:', res.data);
      // 성공 메시지 표시 로직 추가
    } catch (error) {
      console.error('학생 계정 생성 실패:', error);
      // 오류 메시지 표시 로직 추가
    }
  };

  return (
    <Container component="main" maxWidth="md" sx={{ mt: 8, mb: 4 }}>
      <Paper elevation={3} sx={{ padding: 4, borderRadius: 2 }}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          sx={{ mb: 6, position: 'relative' }} // 여백을 더 추가하여 섹션 간의 간격을 늘림
        >
          <Typography
            variant="h4"
            gutterBottom
            sx={{ fontWeight: "bold", color: theme.palette.primary.dark, textAlign: "center" }}
          >
            <SchoolIcon
              fontSize="large"
              sx={{ verticalAlign: "middle", mr: 1 }}
            />
            {school}
          </Typography>
          <Box sx={{ position: 'absolute', right: 0 }}>
            <Button
              variant="contained"
              onClick={handleOpenModal}
              sx={{
                backgroundColor: '#333', // 짙은 회색
                color: '#fff', // 흰색 텍스트
                padding: '8px 16px',
                borderRadius: '6px',
                boxShadow: '0 3px 5px 2px rgba(0, 0, 0, .2)',
                fontWeight: 'bold', // 굵기
                fontSize: '14px', // 크기
                '&:hover': {
                  backgroundColor: '#555', // 호버 시 밝은 회색
                },
                ml: 2
              }}
              startIcon={<PersonAddIcon />} // 아이콘 추가
            >
              학생 계정 생성
            </Button>
          </Box>
        </Box>
        <StudentAccountModal open={isModalOpen} onClose={handleCloseModal} onSubmit={handleCreateStudent} school={school} />
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 8 }} // 여백을 더 추가하여 섹션 간의 간격을 늘림
        >
          <Box display="flex" gap={2}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>
                <GradeIcon sx={{ mr: 1, verticalAlign: "middle" }} />
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
            <FormControl sx={{ minWidth: 120 }}>
              <TextField
                label={<ClassIcon sx={{ mr: 1, verticalAlign: "middle" }} />}
                placeholder="반"
                value={classNumber}
                onChange={(e) => setClassNumber(e.target.value)}
                variant="outlined"
                sx={{
                  borderRadius: 1,
                  backgroundColor: theme.palette.background.paper,
                  minWidth: 120,
                }}
              />
            </FormControl>
          </Box>
          {!showReportGeneration && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleShowReportGeneration}
              disabled={!grade || !classNumber}
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
          />
        )}
      </Paper>
    </Container>
  );
};

export default TeacherHomePage;