import React from "react";
import {
  Paper,
  Typography,
  Checkbox,
  Box,
  Button,
  Divider,
  Grid,
  FormControlLabel,
  Tooltip,
} from "@mui/material";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

type Student = {
  _id: number;
  name: string;
  studentId: string;
};

type StudentSelectProps = {
  students: Student[];
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
  sx,
}) => {
  const allSelected =
    students.length > 0 && selectedStudents.length === students.length;

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, ...sx }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 500, display: "flex", alignItems: "center" }}
        >
          <PeopleOutlineIcon
            sx={{ mr: 1, fontSize: "1.3rem", color: "primary.main" }}
          />
          학생 선택 ({selectedStudents.length} / {students.length})
        </Typography>
        {students.length > 0 && (
          <Button
            onClick={
              allSelected ? handleDeselectAllStudents : handleSelectAllStudents
            }
            size="small"
            variant={allSelected ? "contained" : "outlined"}
            color="primary"
            startIcon={
              allSelected ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />
            }
            sx={{ textTransform: "none", borderRadius: 1.5 }}
          >
            {allSelected ? "전체 해제" : "전체 선택"}
          </Button>
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ maxHeight: 280, overflow: "auto", pr: 0.5 }}>
        {students.length > 0 ? (
          <Grid container spacing={{ xs: 0.5, sm: 1 }}>
            {students.map((student) => (
              <Grid item xs={6} sm={4} md={3} key={student._id}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 0.5,
                    borderRadius: 1.5,
                    backgroundColor: selectedStudents.includes(student._id)
                      ? "primary.lighter"
                      : "transparent",
                    transition: "background-color 0.2s",
                    "&:hover": {
                      backgroundColor: selectedStudents.includes(student._id)
                        ? "primary.lighter"
                        : "action.hover",
                    },
                    cursor: "pointer",
                  }}
                  onClick={() => handleStudentChange(student._id)}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedStudents.includes(student._id)}
                        onChange={() => handleStudentChange(student._id)}
                        size="small"
                      />
                    }
                    label={
                      <Tooltip
                        title={`${student.studentId}. ${student.name}`}
                        placement="top"
                      >
                        <Typography
                          variant="body2"
                          noWrap
                          sx={{ fontSize: "0.8rem" }}
                        >
                          {`${student.studentId}. ${student.name}`}
                        </Typography>
                      </Tooltip>
                    }
                    sx={{ width: "100%", m: 0 }}
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ py: 3 }}
          >
            학생 정보가 없습니다. (학년/반/식별코드 확인 필요)
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default StudentSelect;
