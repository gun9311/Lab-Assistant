import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { List, ListItem, ListItemText, Paper, Typography, IconButton, Collapse } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import QuizResults from "./QuizResults";
import ChatSummaryList from "./ChatSummaryList";
import StudentReport from "./StudentReport";

type Student = {
  _id: number;
  name: string;
  grade: string;
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
  const [students, setStudents] = useState<Student[]>([]);
  const [expandedSections, setExpandedSections] = useState<{ [key: number]: { quiz: boolean, chat: boolean, report: boolean } }>({});

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
    setExpandedSections(prevState => ({
      ...prevState,
      [studentId]: {
        ...prevState[studentId],
        [section]: !prevState[studentId]?.[section]
      }
    }));
  };

  return (
    <Paper elevation={3} sx={{ padding: 2, marginTop: 2 }}>
      <Typography variant="h5" gutterBottom align="center">
        학생 목록
      </Typography>
      <List>
        {students.map((student) => (
          <React.Fragment key={student._id}>
            <ListItem>
              <ListItemText
                primary={`${student.studentId} - ${student.name}`}
                secondary={`학년: ${student.grade}, 반: ${student.class}`}
              />
              <IconButton onClick={() => handleToggle(student._id, 'chat')}>
                {expandedSections[student._id]?.chat ? <ExpandLessIcon /> : <ExpandMoreIcon />} 채팅 목록
              </IconButton>
              <IconButton onClick={() => handleToggle(student._id, 'quiz')}>
                {expandedSections[student._id]?.quiz ? <ExpandLessIcon /> : <ExpandMoreIcon />} 퀴즈 결과
              </IconButton>
              <IconButton onClick={() => handleToggle(student._id, 'report')}>
                {expandedSections[student._id]?.report ? <ExpandLessIcon /> : <ExpandMoreIcon />} 학생 보고서
              </IconButton>
            </ListItem>
            <Collapse in={expandedSections[student._id]?.chat}>
              {expandedSections[student._id]?.chat && <ChatSummaryList studentId={student._id} />}
            </Collapse>
            <Collapse in={expandedSections[student._id]?.quiz}>
              {expandedSections[student._id]?.quiz && <QuizResults studentId={student._id} />}
            </Collapse>
            <Collapse in={expandedSections[student._id]?.report}>
              {expandedSections[student._id]?.report && <StudentReport studentId={student._id} />}
            </Collapse>
          </React.Fragment>
        ))}
      </List>
    </Paper>
  );
};

export default StudentList;
