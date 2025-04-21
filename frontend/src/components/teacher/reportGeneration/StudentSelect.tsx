import React from "react";
import { Paper, Typography, FormControlLabel, Checkbox, Box, Button } from "@mui/material";
import StudentIcon from '@mui/icons-material/Person';

type StudentSelectProps = {
  students: any[];
  selectedStudents: number[];
  handleStudentChange: (studentId: number) => void;
  handleSelectAllStudents: () => void;
  handleDeselectAllStudents: () => void;
  sx?: object;
};

const StudentSelect: React.FC<StudentSelectProps> = ({
  students,
  selectedStudents,
  handleStudentChange,
  handleSelectAllStudents,
  handleDeselectAllStudents,
  sx, // 추가된 부분: sx를 props로 받음
}) => {
  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 1 }}>
        <Typography variant="h6" gutterBottom>
          <StudentIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
          학생 선택
        </Typography>
        <Box sx={{ display: "flex", justifyContent: { xs: "center", sm: "flex-end" }, width: { xs: "100%", sm: "auto" } }}>
          <Button onClick={handleSelectAllStudents}>학생 전체 선택</Button>
          <Button onClick={handleDeselectAllStudents}>학생 전체 해제</Button>
        </Box>
      </Box>
      <Paper
        sx={{
          ...sx, // 추가된 부분: 전달된 sx 스타일을 적용
          maxHeight: 200,
          overflow: "auto",
          padding: 2,
          border: "1px solid rgba(0, 0, 0, 0.12)",
          borderRadius: "4px",
        }}
      >
        {students.length > 0 ? (
          students.map((student) => (
            <FormControlLabel
              key={student._id}
              control={
                <Checkbox
                  checked={selectedStudents.includes(student._id)}
                  onChange={() => handleStudentChange(student._id)}
                />
              }
              label={`${student.studentId} - ${student.name}`}
              sx={{ width: "100%" }}
            />
          ))
        ) : (
          <Typography variant="body2" color="textSecondary" align="center">
            입력한 식별코드, 학년, 반에 대한 학생이 없습니다.
          </Typography>
        )}
      </Paper>
    </>
  );
};

export default StudentSelect;
