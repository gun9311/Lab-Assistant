import React from "react";
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider
} from "@mui/material";

interface Student {
  _id: string;
  studentId: string;
  name: string;
}

interface Report {
  studentId: Student;
  subject: string;
  semester: string;
  comment: string;
}

interface ReportComponentProps {
  reports: Report[];
  onBack: () => void;
}

const ReportComponent: React.FC<ReportComponentProps> = ({ reports, onBack }) => {
  const groupedReports = reports.reduce((acc: any, report: Report) => {
    if (!acc[report.semester]) {
      acc[report.semester] = {};
    }
    if (!acc[report.semester][report.subject]) {
      acc[report.semester][report.subject] = [];
    }
    acc[report.semester][report.subject].push(report);
    return acc;
  }, {});

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" gutterBottom align="center">
        조회된 보고서
      </Typography>
      {Object.keys(groupedReports).map((semester) => (
        <Box key={semester} sx={{ marginBottom: 4 }}>
          <Typography variant="h5" gutterBottom>
            {semester}
          </Typography>
          {Object.keys(groupedReports[semester]).map((subject) => (
            <Box key={subject} sx={{ marginBottom: 2 }}>
              <Typography variant="h6" gutterBottom>
                {subject}
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>번호</TableCell>
                      <TableCell>이름</TableCell>
                      <TableCell>평어</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {groupedReports[semester][subject]
                      .sort((a: Report, b: Report) => a.studentId.studentId.localeCompare(b.studentId.studentId))
                      .map((report: Report, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{report.studentId.studentId}</TableCell>
                          <TableCell>{report.studentId.name}</TableCell>
                          <TableCell>{report.comment}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Divider sx={{ marginY: 2 }} />
            </Box>
          ))}
        </Box>
      ))}
      <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
        <Button variant="contained" onClick={onBack}>
          다시 조회하기
        </Button>
      </Box>
    </Box>
  );
};

export default ReportComponent;
