import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Grid,
  Box,
  TextField,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  InputLabel,
  FormControl as MuiFormControl,
  SelectChangeEvent,
  Stack,
  Snackbar,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SubjectSelect from "../../components/teacher/reportGeneration/SubjectSelect";
import SemesterSelect from "../../components/teacher/reportGeneration/SemesterSelect";
import { getSubjects, getCommentsForLibrary } from "../../utils/api";
import type { LibraryFilters, LibraryResult } from "../../utils/api";
import { useNavigate } from "react-router-dom";

const typeOptions = ["심화·응용", "성장·과정", "태도·잠재력"];
const levelLabels: { [key: string]: string } = {
  상: "심화·응용",
  중: "성장·과정",
  하: "태도·잠재력",
};

const getChipColorByLevel = (level: string): "success" | "warning" | "info" => {
  switch (level) {
    case "상":
      return "success";
    case "중":
      return "warning";
    case "하":
      return "info";
    default:
      return "info";
  }
};

const CommentLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<LibraryFilters>({
    grade: 1,
    semesters: [],
    subjects: [],
    themes: typeOptions,
    keyword: "",
  });
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [results, setResults] = useState<LibraryResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  useEffect(() => {
    const fetchSubjectsForSelection = async () => {
      if (filters.grade && filters.semesters && filters.semesters.length > 0) {
        try {
          const response = await getSubjects(filters.grade, filters.semesters);
          setAvailableSubjects(response.data || []);
        } catch (error) {
          console.error("Failed to fetch subjects:", error);
          setAvailableSubjects([]);
        }
      } else {
        setAvailableSubjects([]);
      }
    };
    fetchSubjectsForSelection();
  }, [filters.grade, filters.semesters]);

  const handleFilterChange = (name: keyof LibraryFilters, value: unknown) => {
    const newFilters = { ...filters, [name]: value };
    // 학년이나 학기가 변경되면 과목 선택 초기화
    if (name === "grade" || name === "semesters") {
      newFilters.subjects = [];
    }
    setFilters(newFilters);
  };

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = event.target;
    const currentThemes = filters.themes || [];
    const newThemes = checked
      ? [...currentThemes, name]
      : currentThemes.filter((theme) => theme !== name);
    handleFilterChange("themes", newThemes);
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);
    try {
      const response = await getCommentsForLibrary(filters);
      setResults(response.data);
    } catch (error) {
      console.error("Error fetching library comments:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters({
      grade: 1,
      semesters: [],
      subjects: [],
      themes: typeOptions,
      keyword: "",
    });
    setResults([]);
    setAvailableSubjects([]);
    setSearched(false);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setSnackbarMessage("클립보드에 복사되었습니다.");
        setSnackbarOpen(true);
      },
      (err) => {
        console.error("Could not copy text: ", err);
        setSnackbarMessage("복사에 실패했습니다.");
        setSnackbarOpen(true);
      }
    );
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <LibraryBooksIcon
            color="primary"
            sx={{ fontSize: { xs: 32, sm: 40 } }}
          />
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: "bold" }}>
              평어 라이브러리
            </Typography>
            <Typography variant="body2" color="text.secondary">
              과목, 학기, 유형별로 등록된 평어를 조회하고 참고할 수 있습니다.
            </Typography>
          </Box>
        </Box>
      </Paper>
      <Grid container spacing={3}>
        {/* Filter Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, borderRadius: 2, position: "sticky", top: 20 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              검색 필터
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={12}>
                <MuiFormControl fullWidth>
                  <InputLabel>학년</InputLabel>
                  <Select
                    value={filters.grade || ""}
                    label="학년"
                    onChange={(e: SelectChangeEvent<number>) =>
                      handleFilterChange("grade", e.target.value as number)
                    }
                  >
                    {[1, 2, 3, 4, 5, 6].map((g) => (
                      <MenuItem key={g} value={g}>
                        {g}학년
                      </MenuItem>
                    ))}
                  </Select>
                </MuiFormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={12}>
                <SemesterSelect
                  selectedSemesters={filters.semesters || []}
                  handleSemesterChange={(e) =>
                    handleFilterChange("semesters", e.target.value)
                  }
                  handleSelectAllSemesters={() =>
                    handleFilterChange("semesters", ["1학기", "2학기"])
                  }
                  handleDeselectAllSemesters={() =>
                    handleFilterChange("semesters", [])
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <SubjectSelect
                  allSubjectItemsFromProps={availableSubjects}
                  selectedSubjects={filters.subjects || []}
                  handleSubjectChange={(e) =>
                    handleFilterChange("subjects", e.target.value)
                  }
                  handleSelectAllSubjects={() =>
                    handleFilterChange("subjects", availableSubjects)
                  }
                  handleDeselectAllSubjects={() =>
                    handleFilterChange("subjects", [])
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                  평어 유형
                </Typography>
                <FormGroup row>
                  {typeOptions.map((theme) => (
                    <FormControlLabel
                      key={theme}
                      control={
                        <Checkbox
                          checked={(filters.themes || []).includes(theme)}
                          onChange={handleThemeChange}
                          name={theme}
                        />
                      }
                      label={theme}
                    />
                  ))}
                </FormGroup>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="키워드 검색"
                  variant="outlined"
                  value={filters.keyword}
                  onChange={(e) =>
                    handleFilterChange("keyword", e.target.value)
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<SearchIcon />}
                    onClick={handleSearch}
                    disabled={loading}
                  >
                    조회하기
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<RestartAltIcon />}
                    onClick={handleReset}
                  >
                    초기화
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        {/* Results Panel */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2.5, borderRadius: 2, minHeight: "80vh" }}>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                }}
              >
                <CircularProgress />
              </Box>
            ) : !searched ? (
              <Alert severity="info">
                좌측 필터를 사용하여 조회할 평어를 검색해 보세요.
              </Alert>
            ) : results.length === 0 ? (
              <Alert severity="warning">
                선택하신 조건에 맞는 평어가 없습니다.
              </Alert>
            ) : (
              results.map((subjectResult) => (
                <Accordion
                  key={subjectResult.subjectName}
                  sx={{ mb: 1, boxShadow: 3, borderRadius: 2 }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">
                      {subjectResult.subjectName}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: { xs: 1, sm: 2 } }}>
                    <Stack spacing={2}>
                      {subjectResult.semesters
                        .sort((a, b) => a.semester.localeCompare(b.semester))
                        .map((semesterData) => (
                          <Box key={semesterData.semester}>
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: "bold",
                                borderBottom: 1,
                                borderColor: "divider",
                                pb: 1,
                                mb: 1.5,
                              }}
                            >
                              {semesterData.semester}
                            </Typography>
                            <Stack spacing={1.5}>
                              {semesterData.units.map((unit) => (
                                <Accordion
                                  key={unit.unitName}
                                  variant="outlined"
                                  sx={{
                                    borderRadius: 1.5,
                                    "&:before": { display: "none" },
                                  }}
                                >
                                  <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    sx={{
                                      backgroundColor: "action.hover",
                                      borderRadius: "6px 6px 0 0",
                                    }}
                                  >
                                    <Typography
                                      variant="subtitle1"
                                      sx={{ fontWeight: "medium" }}
                                    >
                                      {unit.unitName}
                                    </Typography>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    {unit.ratings
                                      .sort((a, b) => {
                                        const order = { 상: 0, 중: 1, 하: 2 };
                                        return order[a.level] - order[b.level];
                                      })
                                      .map((rating) => (
                                        <Box key={rating.level} sx={{ mb: 2 }}>
                                          <Chip
                                            label={levelLabels[rating.level]}
                                            size="small"
                                            color={getChipColorByLevel(
                                              rating.level
                                            )}
                                            sx={{ mb: 1 }}
                                          />
                                          <Stack spacing={1}>
                                            {rating.comments.map(
                                              (comment, i) => (
                                                <Paper
                                                  key={i}
                                                  variant="outlined"
                                                  sx={{
                                                    p: 1.5,
                                                    backgroundColor: "grey.50",
                                                    borderRadius: 1.5,
                                                    display: "flex",
                                                    justifyContent:
                                                      "space-between",
                                                    alignItems: "center",
                                                  }}
                                                >
                                                  <Typography
                                                    variant="body2"
                                                    sx={{
                                                      lineHeight: 1.6,
                                                      flexGrow: 1,
                                                    }}
                                                  >
                                                    {comment}
                                                  </Typography>
                                                  <IconButton
                                                    onClick={() =>
                                                      handleCopy(comment)
                                                    }
                                                    size="small"
                                                    sx={{ ml: 1 }}
                                                  >
                                                    <ContentCopyIcon fontSize="small" />
                                                  </IconButton>
                                                </Paper>
                                              )
                                            )}
                                          </Stack>
                                        </Box>
                                      ))}
                                  </AccordionDetails>
                                </Accordion>
                              ))}
                            </Stack>
                          </Box>
                        ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Container>
  );
};

export default CommentLibraryPage;
