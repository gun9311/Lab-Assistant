import React from "react";
import { Box, FormControl, InputLabel, Select, MenuItem, Grid, Tooltip } from "@mui/material";
import SchoolIcon from '@mui/icons-material/School'; // 학년 아이콘
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'; // 학기 아이콘
import SubjectIcon from '@mui/icons-material/Subject'; // 과목 아이콘
import ListIcon from '@mui/icons-material/List'; // 단원 아이콘

interface QuizFilterProps {
  gradeFilter: number | null;
  setGradeFilter: (value: number | null) => void;
  semesterFilter: string | null;
  setSemesterFilter: (value: string | null) => void;
  subjectFilter: string | null;
  setSubjectFilter: (value: string | null) => void;
  unitFilter: string | null;
  setUnitFilter: (value: string | null) => void;
  units: string[];
}

const QuizFilter: React.FC<QuizFilterProps> = ({
  gradeFilter,
  setGradeFilter,
  semesterFilter,
  setSemesterFilter,
  subjectFilter,
  setSubjectFilter,
  unitFilter,
  setUnitFilter,
  units,
}) => {
  return (
    <Box sx={{ marginBottom: "2rem", padding: "1rem", borderRadius: "16px", backgroundColor: "#f7f7f7", boxShadow: "0 6px 20px rgba(0, 0, 0, 0.1)" }}>
      <Grid container spacing={2} alignItems="center">
        {/* 학년 필터 */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>학년</InputLabel>
            <Tooltip title="학년 필터">
              <Select
                value={gradeFilter || ""}
                onChange={(e) => setGradeFilter(e.target.value ? Number(e.target.value) : null)}
                startAdornment={<SchoolIcon sx={{ marginRight: '8px' }} />}
              >
                <MenuItem value="">
                  <em>전체</em>
                </MenuItem>
                <MenuItem value={4}>4학년</MenuItem>
                <MenuItem value={5}>5학년</MenuItem>
                <MenuItem value={6}>6학년</MenuItem>
              </Select>
            </Tooltip>
          </FormControl>
        </Grid>

        {/* 학기 필터 */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>학기</InputLabel>
            <Tooltip title="학기 필터">
              <Select
                value={semesterFilter || ""}
                onChange={(e) => setSemesterFilter(e.target.value || null)}
                startAdornment={<CalendarTodayIcon sx={{ marginRight: '8px' }} />}
              >
                <MenuItem value="">
                  <em>전체</em>
                </MenuItem>
                <MenuItem value="1학기">1학기</MenuItem>
                <MenuItem value="2학기">2학기</MenuItem>
              </Select>
            </Tooltip>
          </FormControl>
        </Grid>

        {/* 과목 필터 */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>과목</InputLabel>
            <Tooltip title="과목 필터">
              <Select
                value={subjectFilter || ""}
                onChange={(e) => setSubjectFilter(e.target.value || null)}
                startAdornment={<SubjectIcon sx={{ marginRight: '8px' }} />}
              >
                <MenuItem value="">
                  <em>전체</em>
                </MenuItem>
                <MenuItem value="수학">수학</MenuItem>
                <MenuItem value="과학">과학</MenuItem>
                <MenuItem value="영어">영어</MenuItem>
              </Select>
            </Tooltip>
          </FormControl>
        </Grid>

        {/* 단원 필터 */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>단원</InputLabel>
            <Tooltip title="단원 필터">
              <Select
                value={unitFilter || ""}
                onChange={(e) => setUnitFilter(e.target.value || null)}
                disabled={!units.length}
                startAdornment={<ListIcon sx={{ marginRight: '8px' }} />}
              >
                <MenuItem value="">
                  <em>전체</em>
                </MenuItem>
                {units.map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {unit}
                  </MenuItem>
                ))}
              </Select>
            </Tooltip>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QuizFilter;