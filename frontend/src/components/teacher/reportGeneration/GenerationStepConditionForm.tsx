import React from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Alert,
  SelectChangeEvent,
  CircularProgress,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import UnitSelect from "./UnitSelect";

// 타입 정의 (ReportGeneration.tsx와 동일하게)
type UnitsBySemester = {
  [semester: string]: string[];
};

type FetchedUnitsType = {
  [subject: string]: UnitsBySemester;
};

type SelectedUnitsType = {
  [subject: string]: UnitsBySemester;
};

type GenerationStepConditionFormProps = {
//   icon: React.ReactElement;
//   label: string;
  generationMethod: string;
  handleGenerationMethodChange: (
    event: React.ChangeEvent<HTMLInputElement>
  ) => void;
  reportLines: number;
  handleReportLinesChange: (event: SelectChangeEvent<number>) => void;
  selectedSubjects: string[];
  selectedSemesters: string[];
  fetchedUnits: FetchedUnitsType;
  selectedUnits: SelectedUnitsType;
  handleUnitChange: (
    subject: string,
    semester: string,
    event: SelectChangeEvent<string[]>
  ) => void;
  grade: number | null;
  isGeneratingUnits: boolean; // Renamed from isGenerating for clarity
};

const GenerationStepConditionForm: React.FC<
  GenerationStepConditionFormProps
> = ({
  //   icon,
//   label,
  generationMethod,
  handleGenerationMethodChange,
  reportLines,
  handleReportLinesChange,
  selectedSubjects,
  selectedSemesters,
  fetchedUnits,
  selectedUnits,
  handleUnitChange,
  grade,
  isGeneratingUnits,
}) => {
  const sortedSemesters = [...selectedSemesters].sort((a, b) => {
    // "1학기", "2학기" 순서로 정렬
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  });

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Typography
        variant="h6"
        gutterBottom
        sx={{ mb: 2, display: "flex", alignItems: "center" }}
      >
        {/* <ListItemIcon sx={{ minWidth: 32, color: "primary.main" }}>
          {icon}
        </ListItemIcon> */}
        {/* {label} */}
      </Typography>
      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
          <Typography
            variant="subtitle1"
            gutterBottom
            sx={{ mb: 1, fontWeight: 500 }}
          >
            생성 방식
          </Typography>
          <FormControl component="fieldset">
            <RadioGroup
              row
              value={generationMethod}
              onChange={handleGenerationMethodChange}
            >
              <Box sx={{ display: "flex", flexDirection: "column", mr: 2 }}>
                <FormControlLabel
                  value="line_based"
                  control={<Radio size="small" />}
                  label={
                    <Typography variant="body2">줄 개수만 선택</Typography>
                  }
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ pl: 3.8, maxWidth: 300 }}
                >
                  설정한 줄 수만큼 임의 단원으로 평어를 생성합니다.
                  <br></br>퀴즈 결과가 있으면 반영합니다.
                </Typography>
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <FormControlLabel
                  value="unit_based"
                  control={<Radio size="small" />}
                  label={
                    <Typography variant="body2">단원을 직접 선택</Typography>
                  }
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ pl: 3.8, maxWidth: 300 }}
                >
                  직접 선택한 단원 기반으로 평어를 생성합니다.
                  <br></br>퀴즈 결과가 있으면 반영합니다.
                </Typography>
              </Box>
            </RadioGroup>
          </FormControl>
        </Paper>

        <Divider sx={{ fontWeight: "bold" }}>세부 조건</Divider>

        {generationMethod === "line_based" ? (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{ mb: 1.5, fontWeight: 500 }}
            >
              평어 분량 선택
            </Typography>
            <FormControl fullWidth>
              <InputLabel>평어 라인 수</InputLabel>
              <Select
                value={reportLines}
                onChange={handleReportLinesChange}
                label="평어 라인 수"
                size="small"
              >
                {[1, 2, 3, 4, 5].map((lines) => (
                  <MenuItem key={lines} value={lines}>
                    {lines} 줄
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        ) : (
          <Box>
            <Typography
              variant="subtitle1"
              gutterBottom
              sx={{ mb: 1, fontWeight: 500 }}
            >
              과목별 단원 선택 (학기 구분)
            </Typography>
            {selectedSubjects.length > 0 && selectedSemesters.length > 0 ? (
              <Grid container spacing={2}>
                {selectedSubjects.map((subject, subjectIndex) => (
                  <Grid item xs={12} sm={6} md={4} key={subject}>
                    <Accordion
                      defaultExpanded={subjectIndex === 0}
                      variant="outlined"
                      sx={{
                        borderRadius: 1.5,
                        "&:before": { display: "none" },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={`panel-${subject}-content`}
                        id={`panel-${subject}-header`}
                        sx={{
                          backgroundColor: "action.hover",
                          borderRadius: "6px 6px 0 0",
                          minHeight: "48px",
                          "&.Mui-expanded": { minHeight: "48px" },
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: "medium" }}
                        >
                          {subject}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails
                        sx={{ pt: 1.5, pb: 1, px: 1.5, flexGrow: 1 }}
                      >
                        <Stack spacing={1.5}>
                          {sortedSemesters.map(
                            (semester) =>
                              fetchedUnits[subject]?.[semester] ? (
                                <Box key={semester}>
                                  <Typography
                                    variant="caption"
                                    display="block"
                                    gutterBottom
                                    sx={{ ml: 0.5, fontWeight: "bold" }}
                                  >
                                    {semester}
                                  </Typography>
                                  <UnitSelect
                                    subject={`${semester} ${subject}`}
                                    units={
                                      fetchedUnits[subject]?.[semester] || []
                                    }
                                    selectedUnits={
                                      selectedUnits[subject]?.[semester] || []
                                    }
                                    handleUnitChange={(e) =>
                                      handleUnitChange(subject, semester, e)
                                    }
                                  />
                                  <Typography
                                    variant="caption"
                                    display="block"
                                    sx={{ mt: 0.5, textAlign: "right" }}
                                  >
                                    선택된 단원:{" "}
                                    {selectedUnits[subject]?.[semester]
                                      ?.length || 0}
                                    개
                                  </Typography>
                                </Box>
                              ) : null // 단원이 로드되지 않았거나 없는 경우 아무것도 표시하지 않음
                          )}
                          {sortedSemesters.every(
                            (sem) => !fetchedUnits[subject]?.[sem]?.length
                          ) &&
                            Object.keys(fetchedUnits).length > 0 &&
                            !isGeneratingUnits && ( // Check if specific subject's units for all semesters are empty
                              <Alert severity="info">
                                {`${subject} 과목의 선택된 학기에 대한 단원 정보가 없습니다.`}
                              </Alert>
                            )}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>
                ))}
                {isGeneratingUnits && (
                  <Grid
                    item
                    xs={12}
                    sx={{ display: "flex", justifyContent: "center", my: 2 }}
                  >
                    <CircularProgress />
                    <Typography sx={{ ml: 1 }}>단원 정보 로딩 중...</Typography>
                  </Grid>
                )}
                {!isGeneratingUnits &&
                  Object.keys(fetchedUnits).length === 0 &&
                  selectedSubjects.length > 0 &&
                  selectedSemesters.length > 0 && (
                    <Grid item xs={12}>
                      <Alert severity="warning" sx={{ mt: 1 }}>
                        {grade
                          ? "단원 정보를 가져오는 중이거나, 선택된 조건에 해당하는 단원이 없습니다."
                          : "학년 정보가 없어 단원을 가져올 수 없습니다."}
                      </Alert>
                    </Grid>
                  )}
              </Grid>
            ) : (
              <Alert severity="info" icon={<MenuBookIcon fontSize="inherit" />}>
                이전 단계에서 과목과 학기를 먼저 선택해주세요.
              </Alert>
            )}
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default GenerationStepConditionForm;
