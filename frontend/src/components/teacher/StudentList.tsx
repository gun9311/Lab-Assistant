import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import { List, ListItem, ListItemText, Paper, Typography } from "@mui/material";

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
  onSelectStudent: (student: Student) => void;
};

const StudentList: React.FC<StudentListProps> = ({
  school,
  grade,
  classNumber,
  onSelectStudent,
}) => {
  const [students, setStudents] = useState<Student[]>([]);

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

  return (
    <Paper elevation={3} sx={{ padding: 2, marginTop: 2 }}>
      <Typography variant="h5" gutterBottom align="center">
        학생 목록
      </Typography>
      <List>
        {students.map((student) => (
          <ListItem button key={student._id} onClick={() => onSelectStudent(student)}>
            <ListItemText primary={`${student.studentId} - ${student.name}`} secondary={`학년: ${student.grade}, 반: ${student.class}`} />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default StudentList;
