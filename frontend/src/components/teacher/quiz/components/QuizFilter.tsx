import React from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tooltip,
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SubjectIcon from "@mui/icons-material/Subject";
import ListIcon from "@mui/icons-material/List";

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
  sortBy: string;
  setSortBy: (value: string) => void;
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
  sortBy,
  setSortBy,
}) => {
  return (
    <Box
      sx={{
        marginBottom: "0.5rem",
        padding: "0.7rem",
        borderRadius: "16px",
        backgroundColor: "#f7f7f7",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.1)",
      }}
    >
      <Grid container spacing={2} alignItems="center">
        {/* 학년 필터 */}
        <Grid item xs={12} sm={6} md={2.25}>
          <FormControl fullWidth>
            <InputLabel>학년</InputLabel>
            <Tooltip title="학년 필터">
              <Select
                value={gradeFilter ?? ""}
                onChange={(e) => {
                  setGradeFilter(
                    e.target.value ? Number(e.target.value) : null
                  );
                  setUnitFilter(null);
                }}
                startAdornment={
                  <SchoolIcon sx={{ marginRight: "8px", color: "#FFC107" }} />
                }
              >
                <MenuItem value="">
                  <em>전체</em>
                </MenuItem>
                <MenuItem value={1}>1학년</MenuItem>
                <MenuItem value={2}>2학년</MenuItem>
                <MenuItem value={3}>3학년</MenuItem>
                <MenuItem value={4}>4학년</MenuItem>
                <MenuItem value={5}>5학년</MenuItem>
                <MenuItem value={6}>6학년</MenuItem>
              </Select>
            </Tooltip>
          </FormControl>
        </Grid>

        {/* 학기 필터 */}
        <Grid item xs={12} sm={6} md={2.25}>
          <FormControl fullWidth>
            <InputLabel>학기</InputLabel>
            <Tooltip title="학기 필터">
              <Select
                value={semesterFilter ?? ""}
                onChange={(e) => {
                  setSemesterFilter(e.target.value || null);
                  setUnitFilter(null);
                }}
                startAdornment={
                  <CalendarTodayIcon
                    sx={{ marginRight: "8px", color: "#FF9800" }}
                  />
                }
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
        <Grid item xs={12} sm={6} md={2.25}>
          <FormControl fullWidth>
            <InputLabel>과목</InputLabel>
            <Tooltip title="과목 필터">
              <Select
                value={subjectFilter ?? ""}
                onChange={(e) => {
                  setSubjectFilter(e.target.value || null);
                  setUnitFilter(null);
                }}
                startAdornment={
                  <SubjectIcon sx={{ marginRight: "8px", color: "#8BC34A" }} />
                }
              >
                <MenuItem value="">
                  <em>전체</em>
                </MenuItem>
                <MenuItem value="국어">국어</MenuItem>
                <MenuItem value="도덕">도덕</MenuItem>
                <MenuItem value="수학">수학</MenuItem>
                <MenuItem value="과학">과학</MenuItem>
                <MenuItem value="사회">사회</MenuItem>
                <MenuItem value="영어">영어</MenuItem>
                <MenuItem value="음악">음악</MenuItem>
                <MenuItem value="미술">미술</MenuItem>
                <MenuItem value="체육">체육</MenuItem>
                <MenuItem value="실과">실과</MenuItem>
              </Select>
            </Tooltip>
          </FormControl>
        </Grid>

        {/* 단원 필터 */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>단원(영역)</InputLabel>
            <Tooltip title="단원 필터">
              <Select
                value={unitFilter ?? ""}
                onChange={(e) => setUnitFilter(e.target.value || null)}
                disabled={!units.length}
                startAdornment={
                  <ListIcon sx={{ marginRight: "8px", color: "#03A9F4" }} />
                }
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

        {/* 정렬 기준 필터 */}
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth>
            <InputLabel>정렬 기준</InputLabel>
            <Tooltip title="정렬 기준 선택">
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                displayEmpty
              >
                <MenuItem value="latest">최신 순</MenuItem>
                <MenuItem value="likes">좋아요 순</MenuItem>
              </Select>
            </Tooltip>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QuizFilter;
