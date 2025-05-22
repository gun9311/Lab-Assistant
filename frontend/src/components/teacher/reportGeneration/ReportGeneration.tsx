import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Tabs,
  Tab,
  Fade,
  Alert as MuiAlert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Snackbar,
  Radio,
  RadioGroup,
  FormControlLabel,
  Paper,
  Typography,
  Stack,
  Button,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  useTheme,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import FilterListIcon from "@mui/icons-material/FilterList";
import PeopleIcon from "@mui/icons-material/People";
import TuneIcon from "@mui/icons-material/Tune";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import Filter1Icon from "@mui/icons-material/Filter1";
import Filter2Icon from "@mui/icons-material/Filter2";
import Filter3Icon from "@mui/icons-material/Filter3";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import EditNoteIcon from "@mui/icons-material/EditNote";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import { Avatar } from "@mui/material";
import SemesterSelect from "./SemesterSelect";
import SubjectSelect from "./SubjectSelect";
import StudentSelect from "./StudentSelect";
import UnitSelect from "./UnitSelect";
import api, { getSubjects } from "../../../utils/api";
import ReportComponent from "./ReportComponent";

// 새로운 하위 컴포넌트 임포트
import StepTargetForm from "./StepTargetForm";
import GenerationStepConditionForm from "./GenerationStepConditionForm";
import GenerationStepSummary from "./GenerationStepSummary";
import QueryStepSummary from "./QueryStepSummary";

type Student = {
  _id: number;
  name: string;
  studentId: string;
};

type ReportGenerationProps = {
  school: string | null;
  grade: number | null;
  classNumber: string;
  students: Student[];
};

// 타입 정의 추가: 학기별 단원 목록
type UnitsBySemester = {
  [semester: string]: string[];
};

// 타입 정의 추가: 과목별, 학기별 단원 목록
type FetchedUnitsType = {
  [subject: string]: UnitsBySemester;
};

// 타입 정의 추가: 과목별, 학기별 선택된 단원
type SelectedUnitsType = {
  [subject: string]: UnitsBySemester;
};

const generationSteps_new = [
  { label: "대상 범위 설정" },
  { label: "생성 방식 선택" },
  { label: "검토 및 생성" },
];

const querySteps_new = [{ label: "대상 범위 선택" }, { label: "검토 및 조회" }];

const CustomStepIcon = ({ active, completed, icon }: any) => {
  const theme = useTheme();

  const backgroundColor = active
    ? "#fb8c00"
    : completed
    ? theme.palette.success.light
    : theme.palette.grey[200];

  const borderColor = active
    ? "#ef6c00"
    : completed
    ? theme.palette.success.main
    : theme.palette.grey[400];

  const textColor =
    active || completed ? "white" : theme.palette.text.secondary;

  return (
    <Avatar
      sx={{
        bgcolor: backgroundColor,
        color: textColor,
        width: 36,
        height: 36,
        fontSize: "1rem",
        fontWeight: 600,
        border: "2px solid",
        borderColor: borderColor,
        boxShadow: active
          ? "0 0 0 4px rgba(251, 140, 0, 0.25)"
          : completed
          ? "0 0 0 2px rgba(76, 175, 80, 0.2)"
          : "none",
        transition: "all 0.3s ease",
      }}
    >
      {icon}
    </Avatar>
  );
};

const ReportGeneration: React.FC<ReportGenerationProps> = ({
  school,
  grade,
  classNumber,
  students,
}) => {
  const [selectedSemesters, setSelectedSemesters] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<SelectedUnitsType>({});
  const [reportLines, setReportLines] = useState<number>(3);
  const [reportResults, setReportResults] = useState<any[]>([]);
  const [showReportComponent, setShowReportComponent] = useState(false);
  const [tabValue, setTabValue] = useState<number>(0);
  const [generationMethod, setGenerationMethod] =
    useState<string>("line_based");
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );
  const [fetchedUnits, setFetchedUnits] = useState<FetchedUnitsType>({});
  const [activeStep, setActiveStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  const steps = tabValue === 0 ? generationSteps_new : querySteps_new;

  useEffect(() => {
    if (
      tabValue === 0 &&
      generationMethod === "unit_based" &&
      activeStep === 1 &&
      selectedSubjects.length > 0 &&
      selectedSemesters.length > 0 &&
      grade
    ) {
      fetchUnits();
    }
  }, [
    tabValue,
    activeStep,
    generationMethod,
    selectedSubjects,
    selectedSemesters,
    grade,
  ]);

  useEffect(() => {
    const fetchSubjectsForSelection = async () => {
      if (grade && selectedSemesters.length > 0) {
        try {
          console.log(
            `[ReportGeneration] Fetching subjects for grade: ${grade}, semesters: ${selectedSemesters.join(
              ","
            )}`
          );
          const response = await getSubjects(grade, selectedSemesters);
          console.log(
            "[ReportGeneration] API response for getSubjects:",
            response
          );
          console.log(
            "[ReportGeneration] Data from API (response.data):",
            response.data
          );

          if (
            Array.isArray(response.data) &&
            response.data.every((item) => typeof item === "string")
          ) {
            setAvailableSubjects(response.data);
          } else {
            console.error(
              "[ReportGeneration] Fetched subjects are not a string array:",
              response.data
            );
            setAvailableSubjects([]);
          }

          setSelectedSubjects([]);
          setSelectedUnits({});
          setFetchedUnits({});
        } catch (error) {
          console.error(
            "[ReportGeneration] Failed to fetch subjects for selection",
            error
          );
          setAvailableSubjects([]);
          setSnackbarMessage(
            "선택 가능한 과목 목록을 불러오는데 실패했습니다."
          );
          setSnackbarSeverity("error");
          setSnackbarOpen(true);
        }
      } else {
        setAvailableSubjects([]);
        setSelectedSubjects([]);
        setSelectedUnits({});
        setFetchedUnits({});
      }
    };

    if (activeStep === 0) {
      fetchSubjectsForSelection();
    }
  }, [grade, selectedSemesters, activeStep]);

  const fetchUnits = useCallback(async () => {
    if (
      selectedSubjects.length === 0 ||
      selectedSemesters.length === 0 ||
      !grade
    ) {
      setFetchedUnits({});
      return;
    }

    setIsGenerating(true);
    const newFetchedUnits: FetchedUnitsType = {};

    for (const subject of selectedSubjects) {
      newFetchedUnits[subject] = {};
      for (const semester of selectedSemesters) {
        try {
          const response = await api.get("/subjects/units", {
            params: {
              grade,
              subjects: subject,
              semesters: semester,
            },
          });
          if (
            response.data.units &&
            typeof response.data.units === "object" &&
            !Array.isArray(response.data.units) &&
            response.data.units[subject] &&
            Array.isArray(response.data.units[subject])
          ) {
            newFetchedUnits[subject][semester] = response.data.units[subject];
          } else {
            console.warn(
              `Fetched units for ${subject} - ${semester} are not in the expected format. Received:`,
              response.data.units
            );
            newFetchedUnits[subject][semester] = [];
          }
        } catch (error) {
          console.error(
            `Failed to fetch units for ${subject} - ${semester}`,
            error
          );
          newFetchedUnits[subject][semester] = [];
        }
      }
    }
    setFetchedUnits(newFetchedUnits);
    setIsGenerating(false);
  }, [grade, selectedSubjects, selectedSemesters]);

  const resetSelectionsForNewTab = () => {
    setSelectedSemesters([]);
    setSelectedSubjects([]);
    setSelectedStudents([]);
    setSelectedUnits({});
    setReportLines(3);
    setFetchedUnits({});
    setGenerationMethod("line_based");
  };

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTabValue(newValue);
    setActiveStep(0);
    setShowReportComponent(false);
    resetSelectionsForNewTab();
  };

  const validateStep0_generation = () => {
    if (
      selectedSemesters.length === 0 ||
      selectedSubjects.length === 0 ||
      selectedStudents.length === 0
    ) {
      setSnackbarMessage("학기, 과목, 학생을 모두 선택해주세요.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return false;
    }
    return true;
  };

  const validateStep1_generation = () => {
    if (generationMethod === "unit_based") {
      const hasSelectedUnits = selectedSubjects.some((subject) =>
        selectedSemesters.some(
          (semester) => selectedUnits[subject]?.[semester]?.length > 0
        )
      );

      if (
        !hasSelectedUnits &&
        selectedSubjects.length > 0 &&
        selectedSemesters.length > 0
      ) {
        setSnackbarMessage(
          "각 과목 및 학기별로 하나 이상의 단원을 선택해주세요."
        );
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return false;
      }
    }
    return true;
  };

  const validateStep0_query = () => {
    if (
      selectedSemesters.length === 0 ||
      selectedSubjects.length === 0 ||
      selectedStudents.length === 0
    ) {
      setSnackbarMessage("학기, 과목, 학생을 모두 선택해주세요.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return false;
    }
    return true;
  };

  const handleNext = () => {
    let isValid = true;
    if (tabValue === 0) {
      if (activeStep === 0) isValid = validateStep0_generation();
      if (activeStep === 1) isValid = validateStep1_generation();
    } else {
      if (activeStep === 0) isValid = validateStep0_query();
    }

    if (isValid) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    resetSelectionsForNewTab();
  };

  const handleGenerationMethodChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newMethod = event.target.value;
    setGenerationMethod(newMethod);
    if (newMethod !== generationMethod) {
      setSelectedUnits({});
      if (newMethod === "unit_based") {
        setFetchedUnits({});
      }
    }
    setReportLines(3);
  };

  const handleReportGeneration = async () => {
    if (!validateStep0_generation() || !validateStep1_generation()) return;

    setIsGenerating(true);
    try {
      const payload: any = {
        grade,
        selectedSemesters,
        selectedSubjects,
        selectedStudents,
        generationMethod,
      };
      if (generationMethod === "line_based") {
        payload.reportLines = reportLines;
      } else {
        const aggregatedSelectedUnits: { [key: string]: string[] } = {};
        for (const subject of selectedSubjects) {
          aggregatedSelectedUnits[subject] = [];
          for (const semester of selectedSemesters) {
            if (selectedUnits[subject]?.[semester]?.length > 0) {
              aggregatedSelectedUnits[subject].push(
                ...selectedUnits[subject][semester]
              );
            }
          }
          if (aggregatedSelectedUnits[subject].length === 0) {
            delete aggregatedSelectedUnits[subject];
          }
        }
        payload.selectedUnits = aggregatedSelectedUnits;
      }

      await api.post("/report/generate", payload);
      setSnackbarMessage(
        "평어 생성 요청이 성공적으로 접수되었습니다. 완료 시 알림을 받습니다."
      );
      setSnackbarSeverity("success");
      setActiveStep(0);
      resetSelectionsForNewTab();
    } catch (error) {
      setSnackbarMessage("평어 생성 요청에 실패했습니다.");
      setSnackbarSeverity("error");
    } finally {
      setIsGenerating(false);
      setSnackbarOpen(true);
    }
  };

  const handleReportQuery = async () => {
    if (!validateStep0_query()) return;

    setIsGenerating(true);
    try {
      const response = await api.post("/report/query", {
        selectedSemesters,
        selectedSubjects,
        selectedStudents,
      });
      setReportResults(response.data);
      setShowReportComponent(true);
    } catch (error) {
      setSnackbarMessage("평어 조회 요청에 실패했습니다.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBackToGenerationOrQuery = () => {
    setShowReportComponent(false);
    setActiveStep(0);
    resetSelectionsForNewTab();
  };

  const getStepContent = (step: number) => {
    if (tabValue === 0) {
      switch (step) {
        case 0:
          return (
            <StepTargetForm
              selectedSemesters={selectedSemesters}
              handleSemesterChange={(e: SelectChangeEvent<string[]>) => {
                const newSemesters = e.target.value as string[];
                setSelectedSemesters(newSemesters);
              }}
              handleSelectAllSemesters={() => {
                setSelectedSemesters(["1학기", "2학기"]);
              }}
              handleDeselectAllSemesters={() => {
                setSelectedSemesters([]);
              }}
              availableSubjects={availableSubjects}
              selectedSubjects={selectedSubjects}
              handleSubjectChange={(e: SelectChangeEvent<string[]>) => {
                setSelectedSubjects(e.target.value as string[]);
                setSelectedUnits({});
                setFetchedUnits({});
              }}
              handleSelectAllSubjects={() => {
                setSelectedSubjects(availableSubjects);
                setSelectedUnits({});
                setFetchedUnits({});
              }}
              handleDeselectAllSubjects={() => {
                setSelectedSubjects([]);
                setSelectedUnits({});
                setFetchedUnits({});
              }}
              students={students}
              selectedStudents={selectedStudents}
              handleStudentChange={(id: number) =>
                setSelectedStudents((prev) =>
                  prev.includes(id)
                    ? prev.filter((sid) => sid !== id)
                    : [...prev, id]
                )
              }
              handleSelectAllStudents={() =>
                setSelectedStudents(students.map((s) => s._id))
              }
              handleDeselectAllStudents={() => setSelectedStudents([])}
            />
          );
        case 1:
          return (
            <GenerationStepConditionForm
              generationMethod={generationMethod}
              handleGenerationMethodChange={handleGenerationMethodChange}
              reportLines={reportLines}
              handleReportLinesChange={(e: SelectChangeEvent<number>) =>
                setReportLines(Number(e.target.value))
              }
              selectedSubjects={selectedSubjects}
              selectedSemesters={selectedSemesters}
              fetchedUnits={fetchedUnits}
              selectedUnits={selectedUnits}
              handleUnitChange={(
                subject: string,
                semester: string,
                event: SelectChangeEvent<string[]>
              ) => {
                setSelectedUnits((prev) => ({
                  ...prev,
                  [subject]: {
                    ...(prev[subject] || {}),
                    [semester]: event.target.value as string[],
                  },
                }));
              }}
              grade={grade}
              isGeneratingUnits={
                isGenerating &&
                generationMethod === "unit_based" &&
                activeStep === 1
              }
            />
          );
        case 2:
          return (
            <GenerationStepSummary
              generationMethod={generationMethod}
              selectedSemesters={selectedSemesters}
              selectedSubjects={selectedSubjects}
              selectedStudentsCount={selectedStudents.length}
              reportLines={reportLines}
              selectedUnits={selectedUnits}
            />
          );
        default:
          return "알 수 없는 단계";
      }
    } else {
      switch (step) {
        case 0:
          return (
            <StepTargetForm
              selectedSemesters={selectedSemesters}
              handleSemesterChange={(e: SelectChangeEvent<string[]>) => {
                const newSemesters = e.target.value as string[];
                setSelectedSemesters(newSemesters);
              }}
              handleSelectAllSemesters={() => {
                setSelectedSemesters(["1학기", "2학기"]);
              }}
              handleDeselectAllSemesters={() => {
                setSelectedSemesters([]);
              }}
              availableSubjects={availableSubjects}
              selectedSubjects={selectedSubjects}
              handleSubjectChange={(e: SelectChangeEvent<string[]>) => {
                setSelectedSubjects(e.target.value as string[]);
                setSelectedUnits({});
                setFetchedUnits({});
              }}
              handleSelectAllSubjects={() => {
                setSelectedSubjects(availableSubjects);
              }}
              handleDeselectAllSubjects={() => {
                setSelectedSubjects([]);
                setSelectedUnits({});
                setFetchedUnits({});
              }}
              students={students}
              selectedStudents={selectedStudents}
              handleStudentChange={(id: number) =>
                setSelectedStudents((prev) =>
                  prev.includes(id)
                    ? prev.filter((sid) => sid !== id)
                    : [...prev, id]
                )
              }
              handleSelectAllStudents={() =>
                setSelectedStudents(students.map((s) => s._id))
              }
              handleDeselectAllStudents={() => setSelectedStudents([])}
            />
          );
        case 1:
          return (
            <QueryStepSummary
              selectedSemesters={selectedSemesters}
              selectedSubjects={selectedSubjects}
              selectedStudentsCount={selectedStudents.length}
            />
          );
        default:
          return "알 수 없는 단계";
      }
    }
  };

  if (showReportComponent) {
    return (
      <ReportComponent
        reports={reportResults}
        onBack={handleBackToGenerationOrQuery}
      />
    );
  }

  return (
    <Fade in={true} timeout={500}>
      <Box sx={{ padding: { xs: "0", sm: "0 16px" }, mt: 2 }}>
        <Paper
          elevation={2}
          sx={{ borderRadius: 2, overflow: "hidden", mb: 3 }}
        >
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            centered
            sx={{
              "& .MuiTabs-indicator": {
                display: "none",
              },
            }}
          >
            <Tab
              label="평어 생성"
              icon={<EditNoteIcon />}
              iconPosition="start"
              sx={{
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: tabValue === 0 ? "bold" : 500,
                color: tabValue === 0 ? "primary.main" : "text.secondary",
                borderBottom: tabValue === 0 ? 3 : 0,
                borderColor: tabValue === 0 ? "primary.main" : "transparent",
                py: 1.5,
                "&:hover": {
                  backgroundColor: "action.hover",
                },
                flexGrow: 1,
                opacity: tabValue === 0 ? 1 : 0.7,
                transition: "all 0.3s",
              }}
            />
            <Tab
              label="평어 조회"
              icon={<ManageSearchIcon />}
              iconPosition="start"
              sx={{
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: tabValue === 1 ? "bold" : 500,
                color: tabValue === 1 ? "secondary.main" : "text.secondary",
                borderBottom: tabValue === 1 ? 3 : 0,
                borderColor: tabValue === 1 ? "secondary.main" : "transparent",
                py: 1.5,
                "&:hover": {
                  backgroundColor: "action.hover",
                },
                flexGrow: 1,
                opacity: tabValue === 1 ? 1 : 0.7,
                transition: "all 0.3s",
              }}
            />
          </Tabs>
        </Paper>

        <Paper
          elevation={3}
          sx={{ padding: { xs: 1.5, sm: 3 }, mb: 3, borderRadius: 2 }}
        >
          <Stepper
            activeStep={activeStep}
            alternativeLabel
            sx={{ mb: 3, mt: 1 }}
          >
            {steps.map((stepInfo, index) => (
              <Step key={stepInfo.label} completed={activeStep > index}>
                <StepLabel StepIconComponent={CustomStepIcon}>
                  {stepInfo.label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box
            sx={{
              minHeight: { xs: "auto", sm: "350px" },
              mb: 3,
              p: { xs: 0.5, sm: 1 },
              borderRadius: 1.5,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
            }}
          >
            {getStepContent(activeStep)}
          </Box>

          <Divider sx={{ mb: 2.5, mt: 1 }} />

          <Box sx={{ display: "flex", flexDirection: "row", pt: 1 }}>
            <Button
              variant="outlined"
              color="inherit"
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              이전
            </Button>
            <Box sx={{ flex: "1 1 auto" }} />
            {activeStep === steps.length - 1 ? (
              tabValue === 0 ? (
                <Button
                  onClick={handleReportGeneration}
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={isGenerating}
                  startIcon={
                    isGenerating ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <PlaylistAddCheckIcon />
                    )
                  }
                >
                  생성 요청
                </Button>
              ) : (
                <Button
                  onClick={handleReportQuery}
                  variant="contained"
                  color="secondary"
                  size="large"
                  disabled={isGenerating}
                  startIcon={
                    isGenerating ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <PlaylistAddCheckIcon />
                    )
                  }
                >
                  조회하기
                </Button>
              )
            ) : (
              <Button onClick={handleNext} variant="contained" size="large">
                다음
              </Button>
            )}
          </Box>
          {activeStep !== 0 && (
            <Box sx={{ display: "flex", justifyContent: "flex-start", mt: 2 }}>
              <Button
                onClick={handleReset}
                color="inherit"
                size="small"
                variant="text"
              >
                처음부터 다시 선택
              </Button>
            </Box>
          )}
        </Paper>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={
            tabValue === 0 && snackbarSeverity === "success" ? 5000 : 3000
          }
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <MuiAlert
            onClose={() => setSnackbarOpen(false)}
            severity={snackbarSeverity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {snackbarMessage}
          </MuiAlert>
        </Snackbar>
      </Box>
    </Fade>
  );
};

export default ReportGeneration;
