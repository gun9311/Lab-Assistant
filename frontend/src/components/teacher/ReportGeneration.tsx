import React, { useState } from "react";
import { Box, Button, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, Typography, FormControlLabel, Checkbox, Paper, Divider, ListItemText } from "@mui/material";
import api from '../../utils/api'; // 서버 요청을 위한 API 유틸리티

interface Student {
  _id: number;
  name: string;
  studentId: string;
}

interface ReportGenerationProps {
  onBack: () => void;
  school: string | null;
  grade: number | null;
  classNumber: string;
  students: Student[];  // 학생 목록을 props로 받음
}

const ReportGeneration: React.FC<ReportGenerationProps> = ({ onBack, school, grade, classNumber, students }) => {
  const [selectedSemesters, setSelectedSemesters] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [reportLines, setReportLines] = useState<number>(3);

  const handleSemesterChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedSemesters(event.target.value as string[]);
  };

  const handleSubjectChange = (event: SelectChangeEvent<string[]>) => {
    setSelectedSubjects(event.target.value as string[]);
  };

  const handleStudentChange = (studentId: number) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAllSemesters = () => {
    setSelectedSemesters(['1학기', '2학기']);
  };

  const handleDeselectAllSemesters = () => {
    setSelectedSemesters([]);
  };

  const handleSelectAllSubjects = () => {
    setSelectedSubjects(['국어', '수학', '사회', '과학', '영어']);
  };

  const handleDeselectAllSubjects = () => {
    setSelectedSubjects([]);
  };

  const handleSelectAllStudents = () => {
    setSelectedStudents(students.map(student => student._id));
  };

  const handleDeselectAllStudents = () => {
    setSelectedStudents([]);
  };

  const handleReportGeneration = async () => {
    try {
      const response = await api.post('/reports/generate', {
        selectedSemesters,
        selectedSubjects,
        selectedStudents,
        reportLines
      });
      console.log('보고서 생성 요청 성공:', response.data);
    } catch (error) {
      console.error('보고서 생성 요청 실패:', error);
    }
  };

  const handleReportLinesChange = (event: SelectChangeEvent<number>) => {
    setReportLines(event.target.value as number);
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" gutterBottom align="center">
        보고서 일괄 생성 및 조회
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 1 }}>
        <Button onClick={handleSelectAllSemesters}>학기 전체 선택</Button>
        <Button onClick={handleDeselectAllSemesters}>학기 전체 해제</Button>
      </Box>
      <FormControl fullWidth sx={{ marginBottom: 2 }}>
        <InputLabel>학기 선택</InputLabel>
        <Select
          multiple
          value={selectedSemesters}
          onChange={handleSemesterChange}
          renderValue={(selected) => selected.join(', ')}
        >
          <MenuItem value="1학기">
            <Checkbox checked={selectedSemesters.includes('1학기')} />
            <ListItemText primary="1학기" />
          </MenuItem>
          <MenuItem value="2학기">
            <Checkbox checked={selectedSemesters.includes('2학기')} />
            <ListItemText primary="2학기" />
          </MenuItem>
        </Select>
      </FormControl>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 1 }}>
        <Button onClick={handleSelectAllSubjects}>과목 전체 선택</Button>
        <Button onClick={handleDeselectAllSubjects}>과목 전체 해제</Button>
      </Box>
      <FormControl fullWidth sx={{ marginBottom: 2 }}>
        <InputLabel>과목 선택</InputLabel>
        <Select
          multiple
          value={selectedSubjects}
          onChange={handleSubjectChange}
          renderValue={(selected) => selected.join(', ')}
        >
          {['국어', '수학', '사회', '과학', '영어'].map(subject => (
            <MenuItem key={subject} value={subject}>
              <Checkbox checked={selectedSubjects.includes(subject)} />
              <ListItemText primary={subject} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
        <Typography variant="h6" gutterBottom>
          학생 선택
        </Typography>
        <Box>
          <Button onClick={handleSelectAllStudents}>학생 전체 선택</Button>
          <Button onClick={handleDeselectAllStudents}>학생 전체 해제</Button>
        </Box>
      </Box>
      <Paper sx={{ maxHeight: 200, overflow: 'auto', padding: 2, border: '1px solid rgba(0, 0, 0, 0.12)', borderRadius: '4px' }}>
        {students.map(student => (
          <FormControlLabel
            key={student._id}
            control={
              <Checkbox
                checked={selectedStudents.includes(student._id)}
                onChange={() => handleStudentChange(student._id)}
              />
            }
            label={`${student.studentId} - ${student.name}`}
            sx={{ width: '100%' }}
          />
        ))}
      </Paper>
      <Divider sx={{ marginY: 2 }} />
      <FormControl fullWidth sx={{ marginBottom: 2 }}>
        <InputLabel>평가 라인 수(최대)</InputLabel>
        <Select
          value={reportLines}
          onChange={handleReportLinesChange}
        >
          {[1, 2, 3, 4, 5].map(lines => (
            <MenuItem key={lines} value={lines}>
              {lines} 줄
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button variant="outlined" onClick={onBack}>
          뒤로가기
        </Button>
        <Button variant="contained" color="primary" onClick={handleReportGeneration}>
          보고서 생성
        </Button>
      </Box>
    </Box>
  );
};

export default ReportGeneration;
