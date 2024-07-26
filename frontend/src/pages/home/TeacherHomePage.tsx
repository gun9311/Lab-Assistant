import React, { useState } from "react";
import StudentList from "../../components/teacher/StudentList";
import QuizResults from "../../components/teacher/QuizResults";
import QuestionList from "../../components/teacher/QuestionList";
import ChatSummaryList from "../../components/teacher/ChatSummaryList";
import StudentReport from "../../components/teacher/StudentReport";
import LogoutButton from "../../components/auth/LogoutButton";
import { getSchoolName } from "../../utils/auth";
import { Container, Typography, TextField, Button, Box, Paper } from "@mui/material";
import Navbar from '../../components/Navbar';

type Student = {
  _id: number;
  name: string;
  grade: string;
  class: string;
  studentId: string;
};

const TeacherHomePage: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [classNumber, setClassNumber] = useState<string>("");
  const school = getSchoolName();

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
  };

  return (
    <Container component="main" maxWidth="md">
      <Paper elevation={3} sx={{ padding: 4, marginTop: 8 }}>
        <Typography variant="h4" gutterBottom align="center">
          교사 홈 페이지
        </Typography>
        <Typography variant="h6" gutterBottom align="center">
          학교: {school}
        </Typography>
        <Box display="flex" justifyContent="space-between" sx={{ mb: 2 }}>
          <TextField
            label="학년"
            type="number"
            value={grade || ""}
            onChange={(e) => setGrade(Number(e.target.value))}
            variant="outlined"
            fullWidth
            sx={{ mr: 1 }}
          />
          <TextField
            label="반"
            type="text"
            value={classNumber}
            onChange={(e) => setClassNumber(e.target.value)}
            variant="outlined"
            fullWidth
            sx={{ ml: 1 }}
          />
        </Box>
        <StudentList
          school={school}
          grade={grade}
          classNumber={classNumber}
          onSelectStudent={handleSelectStudent}
        />
        {selectedStudent && (
          <>
            <Typography variant="h5" gutterBottom align="center">
              선택된 학생: {selectedStudent.name}
            </Typography>
            <QuizResults studentId={selectedStudent._id} />
            <QuestionList studentId={selectedStudent._id} />
            <ChatSummaryList studentId={selectedStudent._id} />
            <StudentReport studentId={selectedStudent._id} />
          </>
        )}
        <Box textAlign="center" sx={{ mt: 2 }}>
          <LogoutButton />
        </Box>
      </Paper>
    </Container>
  );
};

export default TeacherHomePage;
