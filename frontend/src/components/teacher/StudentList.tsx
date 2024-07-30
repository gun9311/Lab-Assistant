import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { List, ListItem, ListItemText, Paper, Typography, IconButton, Collapse, Box, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent, useTheme, Divider, Button } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import QuizResults from "../student/quiz/QuizResults";
import ChatSummaryList from "./ChatSummaryList";
import StudentReport from "./StudentReport";
import ReportGeneration from "./ReportGeneration";

interface QuizResult {
  _id: string;
  subject: string;
  semester: string;
  unit: string;
  score: number;
  createdAt: string;
  results: {
    questionId: string;
    taskText: string;
    studentAnswer: string;
    correctAnswer: string;
    similarity: number;
  }[];
}

type Student = {
  _id: number;
  name: string;
  grade: number;  // 숫자 타입으로 수정
  class: string;
  studentId: string;
};

type StudentListProps = {
  school: string | null;
  grade: number | null;
  classNumber: string;
};

const StudentList: React.FC<StudentListProps> = ({
  school,
  grade,
  classNumber,
}) => {
  const theme = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [expandedSections, setExpandedSections] = useState<{ [key: number]: string }>({});
  const [selectedQuiz, setSelectedQuiz] = useState<QuizResult | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [showReportGeneration, setShowReportGeneration] = useState<boolean>(false);

  useEffect(() => {
    const fetchStudents = async () => {
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
    };

    if (school && grade && classNumber) {
      fetchStudents();
    }
  }, [school, grade, classNumber]);

  const handleToggle = (studentId: number, section: 'quiz' | 'chat' | 'report') => {
    setExpandedSections(prevState => {
      if (prevState[studentId] === section) {
        return { ...prevState, [studentId]: "" };
      }
      return { ...prevState, [studentId]: section };
    });
  };

  const handleQuizResultClick = (quizResult: QuizResult) => {
    setSelectedQuiz(quizResult);
  };

  const handleCloseDetails = () => {
    setSelectedQuiz(null);
  };

  const handleSemesterChange = (event: SelectChangeEvent<string>) => {
    setSelectedSemester(event.target.value);
  };

  const handleSubjectChange = (event: SelectChangeEvent<string>) => {
    setSelectedSubject(event.target.value);
  };

  const handleShowReportGeneration = () => {
    setShowReportGeneration(true);
  };

  const handleBackToList = () => {
    setShowReportGeneration(false);
  };

  if (showReportGeneration) {
    return <ReportGeneration onBack={handleBackToList} school={school} grade={grade} classNumber={classNumber} students={students} />;
  }

  return (
    <Paper elevation={3} sx={{ padding: theme.spacing(2), marginTop: theme.spacing(2), backgroundColor: theme.palette.background.paper }}>
      <Typography variant="h5" gutterBottom align="center" sx={{ color: theme.palette.primary.main }}>
        학생 목록
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: theme.spacing(2) }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>학기 선택</InputLabel>
          <Select
            value={selectedSemester}
            onChange={handleSemesterChange}
          >
            <MenuItem value="All">전체</MenuItem>
            <MenuItem value="1학기">1학기</MenuItem>
            <MenuItem value="2학기">2학기</MenuItem>
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120, marginLeft: theme.spacing(2) }}>
          <InputLabel>과목 선택</InputLabel>
          <Select
            value={selectedSubject}
            onChange={handleSubjectChange}
          >
            <MenuItem value="All">전체</MenuItem>
            <MenuItem value="국어">국어</MenuItem>
            <MenuItem value="수학">수학</MenuItem>
            <MenuItem value="사회">사회</MenuItem>
            <MenuItem value="과학">과학</MenuItem>
            <MenuItem value="영어">영어</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" color="primary" onClick={handleShowReportGeneration} sx={{ marginLeft: 'auto' }}>
          보고서 일괄 생성 및 조회
        </Button>
      </Box>
      <List>
        {students.map((student) => (
          <React.Fragment key={student._id}>
            <ListItem sx={{ backgroundColor: theme.palette.grey[100], borderRadius: theme.shape.borderRadius, marginBottom: theme.spacing(1), boxShadow: expandedSections[student._id] ? `0 4px 8px ${theme.palette.primary.main}` : 'none' }}>
              <ListItemText
                primary={`${student.studentId} - ${student.name}`}
                secondary={`학년: ${student.grade}, 반: ${student.class}`}
              />
              <IconButton
                onClick={() => handleToggle(student._id, 'chat')}
                sx={{ backgroundColor: expandedSections[student._id] === 'chat' ? theme.palette.action.selected : 'transparent' }}
              >
                {expandedSections[student._id] === 'chat' ? <ExpandLessIcon /> : <ExpandMoreIcon />} 
                <Typography variant="body2" sx={{ ml: 1, fontSize: '1rem' }}>채팅 목록</Typography>
              </IconButton>
              <IconButton
                onClick={() => handleToggle(student._id, 'quiz')}
                sx={{ backgroundColor: expandedSections[student._id] === 'quiz' ? theme.palette.action.selected : 'transparent' }}
              >
                {expandedSections[student._id] === 'quiz' ? <ExpandLessIcon /> : <ExpandMoreIcon />} 
                <Typography variant="body2" sx={{ ml: 1, fontSize: '1rem' }}>퀴즈 결과</Typography>
              </IconButton>
              <IconButton
                onClick={() => handleToggle(student._id, 'report')}
                sx={{ backgroundColor: expandedSections[student._id] === 'report' ? theme.palette.action.selected : 'transparent' }}
              >
                {expandedSections[student._id] === 'report' ? <ExpandLessIcon /> : <ExpandMoreIcon />} 
                <Typography variant="body2" sx={{ ml: 1, fontSize: '1rem' }}>학생 보고서</Typography>
              </IconButton>
            </ListItem>
            <Collapse in={expandedSections[student._id] === 'chat'}>
              {expandedSections[student._id] === 'chat' && (
                <Box sx={{ padding: theme.spacing(2), marginBottom: theme.spacing(1) }}>
                  <ChatSummaryList
                    studentId={student._id}
                    selectedSemester={selectedSemester}
                    selectedSubject={selectedSubject}
                  />
                </Box>
              )}
            </Collapse>
            <Collapse in={expandedSections[student._id] === 'quiz'}>
              {expandedSections[student._id] === 'quiz' && (
                <Box sx={{ padding: theme.spacing(2), marginBottom: theme.spacing(1) }}>
                  <QuizResults 
                    studentId={student._id}
                    selectedSemester={selectedSemester}
                    selectedSubject={selectedSubject}
                    selectedQuiz={selectedQuiz}
                    handleQuizResultClick={handleQuizResultClick}
                    handleCloseDetails={handleCloseDetails}
                  />
                </Box>
              )}
            </Collapse>
            <Collapse in={expandedSections[student._id] === 'report'}>
              {expandedSections[student._id] === 'report' && (
                <Box sx={{ padding: theme.spacing(2), marginBottom: theme.spacing(1) }}>
                  <StudentReport studentId={student._id} />
                </Box>
              )}
            </Collapse>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default StudentList;
