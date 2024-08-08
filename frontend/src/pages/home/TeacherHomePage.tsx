import React, { useState } from "react";
import StudentList from "../../components/teacher/StudentList";
import { getSchoolName } from "../../utils/auth";
import { Container, Typography, Box, Paper, FormControl, InputLabel, Select, MenuItem, TextField } from "@mui/material";

const TeacherHomePage: React.FC = () => {
  const [grade, setGrade] = useState<number | null>(null);
  const [classNumber, setClassNumber] = useState<string>("");
  const school = getSchoolName();

  return (
    <Container component="main" maxWidth="md">
      <Paper elevation={3} sx={{ padding: 4, marginTop: 8 }}>
        <Typography variant="h4" gutterBottom align="center">
          {school}
        </Typography>
        <Box display="flex" justifyContent="space-between" sx={{ mb: 2 }}>
          <FormControl fullWidth sx={{ mr: 1 }}>
            <InputLabel>학년</InputLabel>
            <Select
              value={grade || ""}
              onChange={(e) => setGrade(Number(e.target.value))}
              label="학년"
            >
              <MenuItem value={3}>3</MenuItem>
              <MenuItem value={4}>4</MenuItem>
              <MenuItem value={5}>5</MenuItem>
              <MenuItem value={6}>6</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ ml: 1 }}>
            <TextField
              label="반"
              type="text"
              value={classNumber}
              onChange={(e) => setClassNumber(e.target.value)}
              variant="outlined"
              fullWidth
            />
          </FormControl>
        </Box>
        <StudentList school={school} grade={grade} classNumber={classNumber} />
      </Paper>
    </Container>
  );
};

export default TeacherHomePage;
