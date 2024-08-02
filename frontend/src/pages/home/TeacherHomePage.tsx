  import React, { useState } from "react";
  import StudentList from "../../components/teacher/StudentList";
  import LogoutButton from "../../components/auth/LogoutButton";
  import { getSchoolName } from "../../utils/auth";
  import { Container, Typography, TextField, Box, Paper } from "@mui/material";

  const TeacherHomePage: React.FC = () => {
    const [grade, setGrade] = useState<number | null>(null);
    const [classNumber, setClassNumber] = useState<string>("");
    const school = getSchoolName();

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
          <StudentList school={school} grade={grade} classNumber={classNumber} />
          <Box textAlign="center" sx={{ mt: 2 }}>
            <LogoutButton />
          </Box>
        </Paper>
      </Container>
    );
  };

  export default TeacherHomePage;
