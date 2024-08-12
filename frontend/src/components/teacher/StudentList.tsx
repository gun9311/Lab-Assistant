import React, { useState } from "react";
import { List, ListItem, ListItemText, Paper, Typography, IconButton, Collapse, Box, useTheme, Divider, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import QuizResults from "../student/quiz/QuizResults";
import ChatSummaryList from "./ChatSummaryList";
import StudentReport from "./StudentReport";

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
};

const StudentList: React.FC<StudentListProps> = ({
  school,
  grade,
  classNumber,
  students,
}) => {
  const theme = useTheme();
  const [expandedSections, setExpandedSections] = useState<{ [key: number]: string }>({});
  const [selectedQuiz, setSelectedQuiz] = useState<QuizResult | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');

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

  if (!grade || !classNumber) {
    return (
      <Paper elevation={3} sx={{ padding: theme.spacing(2), marginTop: theme.spacing(2), backgroundColor: theme.palette.background.paper }}>
        <Typography variant="h5" gutterBottom align="center" sx={{ color: theme.palette.primary.main }}>
          학년과 반을 선택해주세요.
        </Typography>
      </Paper>
    );
  }

  if (students.length === 0) {
    return (
      <Paper elevation={3} sx={{ padding: theme.spacing(2), marginTop: theme.spacing(2), backgroundColor: theme.palette.background.paper }}>
        <Typography variant="h5" gutterBottom align="center" sx={{ color: theme.palette.primary.main }}>
          선택한 학년과 반에 학생이 없습니다.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ padding: theme.spacing(2), marginTop: theme.spacing(2), backgroundColor: theme.palette.background.paper }}>
      <Typography variant="h5" gutterBottom align="center" sx={{ color: theme.palette.primary.main }}>
        학생 목록
      </Typography>
      
      {/* 학기와 과목 선택 UI */}
      <Box display="flex" justifyContent="space-between" mb={2}>
        <FormControl variant="outlined" sx={{ minWidth: 120 }}>
          <InputLabel id="semester-select-label">학기</InputLabel>
          <Select
            labelId="semester-select-label"
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value as string)}
            label="학기"
          >
            <MenuItem value="All">전체</MenuItem>
            <MenuItem value="1학기">1학기</MenuItem>
            <MenuItem value="2학기">2학기</MenuItem>
            {/* 필요에 따라 학기를 더 추가 */}
          </Select>
        </FormControl>

        <FormControl variant="outlined" sx={{ minWidth: 120 }}>
          <InputLabel id="subject-select-label">과목</InputLabel>
          <Select
            labelId="subject-select-label"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value as string)}
            label="과목"
          >
            <MenuItem value="All">전체</MenuItem>
            <MenuItem value="국어">국어</MenuItem>
            <MenuItem value="영어">영어</MenuItem>
            <MenuItem value="수학">수학</MenuItem>
            <MenuItem value="과학">과학</MenuItem>
            <MenuItem value="사회">사회</MenuItem>
            {/* 필요에 따라 과목을 더 추가 */}
          </Select>
        </FormControl>
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
                <Typography variant="body2" sx={{ ml: 1, fontSize: '1rem' }}>평가</Typography>
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
                  <StudentReport 
                    studentId={student._id} 
                    selectedSemester={selectedSemester}
                    selectedSubject={selectedSubject}
                  />
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
