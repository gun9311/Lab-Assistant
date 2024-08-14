import React from 'react';
import { Box, FormControl, InputLabel, MenuItem, Select, Button, Grid } from '@mui/material';

interface Selection {
  grade: string;
  semester: string;
  subject: string;
  unit: string;
  topic: string;
}

interface QuizFilterProps {
  selection: Selection;
  handleSelectionChange: (newSelection: Selection) => void;
}

const QuizFilter: React.FC<QuizFilterProps> = ({ selection, handleSelectionChange }) => {
  return (
    <Grid container justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={12} sm={6}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl variant="outlined" fullWidth>
              <InputLabel>학기</InputLabel>
              <Select
                value={selection.semester}
                onChange={(e) => handleSelectionChange({ ...selection, semester: e.target.value })}
                label="학기"
              >
                <MenuItem value="">
                  <em>전체</em>
                </MenuItem>
                <MenuItem value="1학기">1학기</MenuItem>
                <MenuItem value="2학기">2학기</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl variant="outlined" fullWidth>
              <InputLabel>과목</InputLabel>
              <Select
                value={selection.subject}
                onChange={(e) => handleSelectionChange({ ...selection, subject: e.target.value })}
                label="과목"
              >
                <MenuItem value="">
                  <em>전체</em>
                </MenuItem>
                <MenuItem value="국어">국어</MenuItem>
                <MenuItem value="수학">수학</MenuItem>
                <MenuItem value="사회">사회</MenuItem>
                <MenuItem value="과학">과학</MenuItem>
                <MenuItem value="영어">영어</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default QuizFilter;
