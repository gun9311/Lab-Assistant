import React, { useState, useEffect } from 'react';
import { Paper, Typography, Container } from '@mui/material';
import api from '../../utils/api';

type Report = {
  quizPerformance: string;
  chatInteraction: string;
  overallFeedback: string;
};

type StudentReportProps = {
  studentId: number;
};

const StudentReport: React.FC<StudentReportProps> = ({ studentId }) => {
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    if (studentId) {
      fetchStudentReport();
    }
  }, [studentId]);

  const fetchStudentReport = async () => {
    try {
      const res = await api.get(`/report/student/${studentId}`);
      setReport(res.data);
    } catch (error) {
      console.error('Error fetching student report:', error);
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Paper elevation={3} sx={{ padding: 2, marginTop: 2 }}>
        <Typography variant="h5" gutterBottom align="center">
          학생 보고서
        </Typography>
        {report ? (
          <div>
            <Typography variant="h6" gutterBottom>
              퀴즈 성과
            </Typography>
            <Typography paragraph>{report.quizPerformance}</Typography>
            <Typography variant="h6" gutterBottom>
              채팅 상호작용
            </Typography>
            <Typography paragraph>{report.chatInteraction}</Typography>
            <Typography variant="h6" gutterBottom>
              종합 피드백
            </Typography>
            <Typography paragraph>{report.overallFeedback}</Typography>
          </div>
        ) : (
          <Typography paragraph>보고서가 없습니다</Typography>
        )}
      </Paper>
    </Container>
  );
};

export default StudentReport;