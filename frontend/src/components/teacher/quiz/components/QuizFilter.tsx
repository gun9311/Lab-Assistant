import React, { useState, useEffect } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tooltip,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SchoolIcon from "@mui/icons-material/School";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import SubjectIcon from "@mui/icons-material/Subject";
import ListIcon from "@mui/icons-material/List";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import { getSubjects } from "../../../../utils/api";

interface QuizFilterProps {
  gradeFilter: number | null;
  setGradeFilter: (value: number | null) => void;
  semesterFilter: string | null;
  setSemesterFilter: (value: string | null) => void;
  subjectFilter: string | null;
  setSubjectFilter: (value: string | null) => void;
  unitFilter: string | null;
  setUnitFilter: (value: string | null) => void;
  titleFilter: string | null;
  setTitleFilter: (value: string | null) => void;
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
  titleFilter,
  setTitleFilter,
  units,
  sortBy,
  setSortBy,
}) => {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState(titleFilter || "");

  // 검색이 활성화되어 있는지 확인
  const isSearchActive = !!searchInput.trim();

  useEffect(() => {
    const timer = setTimeout(() => {
      setTitleFilter(searchInput.trim() || null);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, setTitleFilter]);

  useEffect(() => {
    setSearchInput(titleFilter || "");
  }, [titleFilter]);

  // 검색 시작할 때 필터들 자동 초기화
  useEffect(() => {
    if (isSearchActive) {
      // 검색이 활성화되면 모든 필터를 초기화
      if (gradeFilter || semesterFilter || subjectFilter || unitFilter) {
        setGradeFilter(null);
        setSemesterFilter(null);
        setSubjectFilter(null);
        setUnitFilter(null);
      }
    }
  }, [
    isSearchActive,
    gradeFilter,
    semesterFilter,
    subjectFilter,
    unitFilter,
    setGradeFilter,
    setSemesterFilter,
    setSubjectFilter,
    setUnitFilter,
  ]);

  const handleClearSearch = () => {
    setSearchInput("");
    setTitleFilter(null);
  };

  // 필터 변경 시 검색 초기화
  const handleGradeChange = (value: number | null) => {
    setGradeFilter(value);
    setUnitFilter(null);
    if (value) {
      setSearchInput("");
      setTitleFilter(null);
    }
  };

  const handleSemesterChange = (value: string | null) => {
    setSemesterFilter(value);
    setUnitFilter(null);
    if (value) {
      setSearchInput("");
      setTitleFilter(null);
    }
  };

  const handleSubjectChange = (value: string | null) => {
    setSubjectFilter(value);
    setUnitFilter(null);
    if (value) {
      setSearchInput("");
      setTitleFilter(null);
    }
  };

  const handleUnitChange = (value: string | null) => {
    setUnitFilter(value);
    if (value) {
      setSearchInput("");
      setTitleFilter(null);
    }
  };

  useEffect(() => {
    const fetchSubjects = async () => {
      if (gradeFilter) {
        try {
          const semestersToFetch = semesterFilter
            ? [semesterFilter]
            : ["1학기", "2학기"];
          const response = await getSubjects(gradeFilter, semestersToFetch);
          setSubjects(response.data);
          if (subjectFilter && !response.data.includes(subjectFilter)) {
            setSubjectFilter(null);
          }
        } catch (error) {
          console.error("Failed to fetch subjects:", error);
          setSubjects([]);
        }
      } else {
        setSubjects([]);
        setSubjectFilter(null);
      }
    };
    fetchSubjects();
  }, [gradeFilter, semesterFilter, subjectFilter, setSubjectFilter]);

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
        <Grid item xs={12} sm={6} md={2.5}>
          <TextField
            fullWidth
            label="제목 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="퀴즈 제목을 입력하세요"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#9E9E9E" }} />
                </InputAdornment>
              ),
              endAdornment: searchInput && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch}>
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
              },
            }}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={1.8}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: isSearchActive ? "#BDBDBD" : "inherit" }}>
              학년
            </InputLabel>
            <Tooltip title={isSearchActive ? "검색 사용 중" : "학년 필터"}>
              <Select
                value={gradeFilter ?? ""}
                onChange={(e) => {
                  handleGradeChange(
                    e.target.value ? Number(e.target.value) : null
                  );
                }}
                disabled={isSearchActive}
                startAdornment={
                  <SchoolIcon
                    sx={{
                      marginRight: "8px",
                      color: isSearchActive ? "#E0E0E0" : "#FFC107",
                    }}
                  />
                }
                sx={{
                  backgroundColor: isSearchActive ? "#f5f5f5" : "inherit",
                }}
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

        <Grid item xs={12} sm={6} md={1.8}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: isSearchActive ? "#BDBDBD" : "inherit" }}>
              학기
            </InputLabel>
            <Tooltip title={isSearchActive ? "검색 사용 중" : "학기 필터"}>
              <Select
                value={semesterFilter ?? ""}
                onChange={(e) => {
                  handleSemesterChange(e.target.value || null);
                }}
                disabled={isSearchActive}
                startAdornment={
                  <CalendarTodayIcon
                    sx={{
                      marginRight: "8px",
                      color: isSearchActive ? "#E0E0E0" : "#FF9800",
                    }}
                  />
                }
                sx={{
                  backgroundColor: isSearchActive ? "#f5f5f5" : "inherit",
                }}
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

        <Grid item xs={12} sm={6} md={1.8}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: isSearchActive ? "#BDBDBD" : "inherit" }}>
              과목
            </InputLabel>
            <Tooltip title={isSearchActive ? "검색 사용 중" : "과목 필터"}>
              <Select
                value={subjectFilter ?? ""}
                onChange={(e) => {
                  handleSubjectChange(e.target.value || null);
                }}
                disabled={isSearchActive}
                startAdornment={
                  <SubjectIcon
                    sx={{
                      marginRight: "8px",
                      color: isSearchActive ? "#E0E0E0" : "#8BC34A",
                    }}
                  />
                }
                sx={{
                  backgroundColor: isSearchActive ? "#f5f5f5" : "inherit",
                }}
              >
                <MenuItem value="">
                  <em>전체</em>
                </MenuItem>
                {subjects.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </Tooltip>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={2.5}>
          <FormControl fullWidth>
            <InputLabel sx={{ color: isSearchActive ? "#BDBDBD" : "inherit" }}>
              단원(영역)
            </InputLabel>
            <Tooltip title={isSearchActive ? "검색 사용 중" : "단원 필터"}>
              <Select
                value={unitFilter ?? ""}
                onChange={(e) => handleUnitChange(e.target.value || null)}
                disabled={!units.length || isSearchActive}
                startAdornment={
                  <ListIcon
                    sx={{
                      marginRight: "8px",
                      color: isSearchActive ? "#E0E0E0" : "#03A9F4",
                    }}
                  />
                }
                sx={{
                  backgroundColor: isSearchActive ? "#f5f5f5" : "inherit",
                }}
              >
                <MenuItem value="">
                  <em>전체</em>
                </MenuItem>
                {units.map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {unit}
                  </MenuItem>
                ))}
                <MenuItem value="기타">기타</MenuItem>
              </Select>
            </Tooltip>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={1.6}>
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
