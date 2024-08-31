import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Box, TextField, Typography, Paper, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { getGradeStatus } from '../../utils/auth';

type SubjectSelectorProps = {
  onSelectionChange: (selection: {
    grade: string;
    semester: string;
    subject: string;
    unit: string;
    topic: string;
  }) => void;
  showTopic: boolean;
  disabled?: boolean;
};

const SubjectSelector: React.FC<SubjectSelectorProps> = ({ onSelectionChange, showTopic, disabled = false }) => {
  const [grade, setGrade] = useState(getGradeStatus() || '');
  const [semester, setSemester] = useState('');
  const [subject, setSubject] = useState('');
  const [unit, setUnit] = useState('');
  const [topic, setTopic] = useState('');
  const [units, setUnits] = useState<string[]>([]);

  const subjects = ['국어', '수학', '사회', '과학', '영어'];

  useEffect(() => {
    const fetchUnits = async () => {
      if (subject && semester) {
        try {
          const res = await api.get('/subjects/units', {
            params: { grade, semester, subject },
          });
          // Fetch된 단원 데이터를 처리하고 설정
          const fetchedUnits = res.data.units;
          fetchedUnits.sort((a: string, b: string) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
            const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
            return numA - numB;
          });
          setUnits(fetchedUnits);  // 단원 목록 설정
        } catch (error) {
          console.error('Failed to fetch units:', error);
        }
      } else {
        setUnits([]); // 과목 또는 학기가 선택되지 않은 경우 단원 목록 초기화
      }
    };

    fetchUnits();
  }, [grade, semester, subject]);

  const handleSelectionChange = () => {
    onSelectionChange({ grade, semester, subject, unit, topic: topic || "" });
  };

  useEffect(() => {
    handleSelectionChange();
  }, [grade, semester, subject, unit, topic]);

  return (
    <Paper elevation={3} sx={{ padding: 4, marginTop: 4 }}>
      <Typography variant="h5" gutterBottom>
        과목 선택
      </Typography>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <TextField
          value={grade + '학년'}
          variant="outlined"
          disabled={disabled}
        />
      </FormControl>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>학기</InputLabel>
        <Select value={semester} onChange={(e) => setSemester(e.target.value)} label="학기" disabled={disabled}>
          <MenuItem value="1학기">1학기</MenuItem>
          <MenuItem value="2학기">2학기</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>과목</InputLabel>
        <Select value={subject} onChange={(e) => setSubject(e.target.value)} label="과목" disabled={disabled}>
          {subjects.map((sub, index) => (
            <MenuItem key={index} value={sub}>
              {sub}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {units.length > 0 && (
        <>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>단원</InputLabel>
            <Select value={unit} onChange={(e) => setUnit(e.target.value)} label="단원" disabled={disabled}>
              {units.map((unit, index) => (
                <MenuItem key={index} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {showTopic && (
            <TextField
              fullWidth
              variant="outlined"
              margin="normal"
              label="주제"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="학습 주제를 입력하세요"
              disabled={disabled}
            />
          )}
        </>
      )}
    </Paper>
  );
};

export default SubjectSelector;
