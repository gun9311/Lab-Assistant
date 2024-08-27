import React, { useState, useEffect } from 'react';
import { Paper, Typography, Container, Box } from '@mui/material';
import api from '../../utils/api';

type StudentReportProps = {
  studentId: number;
  selectedSemester: string;
  selectedSubject: string;
};

type Report = {
  subject: string;
  semester: string;
  comment: string;
};

const StudentReport: React.FC<StudentReportProps> = ({ studentId, selectedSemester, selectedSubject }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.post('/report/student', {
          studentId,
          selectedSemesters: selectedSemester !== 'All' ? [selectedSemester] : [],
          selectedSubjects: selectedSubject !== 'All' ? [selectedSubject] : []
        });
        setReports(res.data);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [studentId, selectedSemester, selectedSubject]);

  const groupedReports = reports.reduce((acc, report) => {
    if (!acc[report.semester]) {
      acc[report.semester] = [];
    }
    acc[report.semester].push(report);
    return acc;
  }, {} as Record<string, Report[]>);

  if (loading) {
    return (
      <Paper elevation={3} sx={{ padding: 2, marginTop: 2 }}>
        <Typography variant="h6" gutterBottom>Loading...</Typography>
      </Paper>
    );
  }

  if (reports.length === 0) {
    return (
      <Paper elevation={3} sx={{ padding: 2, marginTop: 2 }}>
        <Typography variant="h6" gutterBottom>평어</Typography>
        <Typography variant="body1">조회된 보고서가 없습니다. 보고서를 생성하세요.</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ padding: 2, marginTop: 2 }}>
      {/* <Typography variant="h6" gutterBottom>평가</Typography> */}
      {Object.keys(groupedReports).map(semester => (
        <Box key={semester} sx={{ marginBottom: 2 }}>
          <Typography variant="h6" gutterBottom>{semester}</Typography>
          {groupedReports[semester].map(report => (
            <Box key={report.subject} sx={{ paddingLeft: 2, marginBottom: 1 }}>
              <Typography variant="subtitle1">{report.subject}</Typography>
              <Typography variant="body2">{report.comment}</Typography>
            </Box>
          ))}
        </Box>
      ))}
    </Paper>
  );
};

export default StudentReport;
