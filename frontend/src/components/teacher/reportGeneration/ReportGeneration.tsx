import React, { useState, useEffect } from "react";
import {
  Box,
  Tabs,
  Tab,
  Fade,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Snackbar,
  Radio,
  RadioGroup,
  FormControlLabel
} from "@mui/material";
import SemesterSelect from "./SemesterSelect";
import SubjectSelect from "./SubjectSelect";
import StudentSelect from "./StudentSelect";
import UnitSelect from "./UnitSelect";
import ActionButtons from "./ActionButtons";
import api from '../../../utils/api';
import ReportComponent from './ReportComponent';

type Student = {
  _id: number;
  name: string;
  studentId: string;
};

type ReportGenerationProps = {
  onBack: () => void;
  school: string | null;
  grade: number | null;
  classNumber: string;
  students: Student[];
};

const ReportGeneration: React.FC<ReportGenerationProps> = ({
  onBack,
  school,
  grade,
  classNumber,
  students,
}) => {
  const [selectedSemesters, setSelectedSemesters] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<{ [key: string]: string[] }>({});
  const [reportLines, setReportLines] = useState<number>(3);
  const [reportResults, setReportResults] = useState<any[]>([]);
  const [showReportComponent, setShowReportComponent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState<number>(0);
  const [generationMethod, setGenerationMethod] = useState<string>("line_based");
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");
  const [fetchedUnits, setFetchedUnits] = useState<{ [key: string]: string[] }>({});

  useEffect(() => {
    if (selectedSubjects.length > 0 && generationMethod === 'unit_based' && tabValue === 0) {
      fetchUnits();
    }
  }, [selectedSubjects, selectedSemesters, generationMethod, tabValue]);

  const fetchUnits = async () => {
    if (selectedSubjects.length === 0 || selectedSemesters.length === 0) return;
    try {
      const response = await api.get('/subjects/units', {
        params: {
          grade,
          subjects: selectedSubjects.join(','),
          semesters: selectedSemesters.join(','),
        }
      });
  
      console.log("Fetched units data:", response.data);
  
      if (typeof response.data.units === 'object' && !Array.isArray(response.data.units)) {
        setFetchedUnits(response.data.units);
      } else {
        const unitsBySubject: { [key: string]: string[] } = {};
        selectedSubjects.forEach((subject) => {
          unitsBySubject[subject] = response.data.units;
        });
        setFetchedUnits(unitsBySubject);
      }
    } catch (error) {
      console.error("Failed to fetch units", error);
    }
  };

  const handleReportGeneration = async () => {
    if (selectedSemesters.length === 0 || selectedSubjects.length === 0 || selectedStudents.length === 0 || (generationMethod === 'unit_based' && Object.keys(selectedUnits).length === 0)) {
      setSnackbarMessage("모든 필수 항목을 선택해야 합니다.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    try {
      const payload: any = {
        grade,
        selectedSemesters,
        selectedSubjects,
        selectedStudents,
        reportLines,
        generationMethod,
        selectedUnits
      };

      await api.post("/report/generate", payload);

      setSnackbarMessage("보고서 생성 요청이 성공적으로 접수되었습니다. 생성이 완료되면 알림을 받게 됩니다.");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setErrorMessage(null);
    } catch (error) {
      setSnackbarMessage("보고서 생성 요청에 실패했습니다.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleReportQuery = async () => {
    if (selectedSemesters.length === 0 || selectedSubjects.length === 0 || selectedStudents.length === 0) {
      setSnackbarMessage("학기, 과목, 학생을 모두 선택해야 합니다.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    try {
      const response = await api.post("/report/query", {
        selectedSemesters,
        selectedSubjects,
        selectedStudents,
      });
      setReportResults(response.data);
      setShowReportComponent(true);
      setSnackbarMessage("");
      setSnackbarSeverity("success");
      setSnackbarOpen(false);
    } catch (error) {
      setSnackbarMessage("보고서 조회 요청에 실패했습니다.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleBackToGeneration = () => {
    setShowReportComponent(false);
    setSnackbarOpen(false);
  };

  const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTabValue(newValue);
  };

  if (showReportComponent) {
    return <ReportComponent reports={reportResults} onBack={handleBackToGeneration} />;
  }

  return (
    <Fade in={true} timeout={500}>
      <Box sx={{ padding: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          centered
          sx={{ marginBottom: 2 }}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="평어 생성" />
          <Tab label="평어 조회" />
        </Tabs>

        {tabValue === 0 && (
          <FormControl component="fieldset" sx={{ marginBottom: 2 }}>
            <RadioGroup row value={generationMethod} onChange={(e) => setGenerationMethod(e.target.value)}>
              <FormControlLabel value="line_based" control={<Radio />} label="줄 개수만 선택" />
              <FormControlLabel value="unit_based" control={<Radio />} label="단원을 직접 선택" />
            </RadioGroup>
          </FormControl>
        )}

        <SemesterSelect 
          selectedSemesters={selectedSemesters}
          handleSemesterChange={(e: SelectChangeEvent<string[]>) => setSelectedSemesters(e.target.value as string[])}
          handleSelectAllSemesters={() => setSelectedSemesters(["1학기", "2학기"])}
          handleDeselectAllSemesters={() => setSelectedSemesters([])}
          sx={{ marginBottom: 2 }} // 여백 추가
        />

        <SubjectSelect 
          selectedSubjects={selectedSubjects}
          handleSubjectChange={(e: SelectChangeEvent<string[]>) => setSelectedSubjects(e.target.value as string[])}
          handleSelectAllSubjects={() => setSelectedSubjects(["국어", "도덕", "수학", "과학", "사회", "영어", "음악", "미술", "체육", "실과"])}
          handleDeselectAllSubjects={() => setSelectedSubjects([])}
          sx={{ marginBottom: 2 }} // 여백 추가
        />

        {tabValue === 0 && generationMethod === 'unit_based' && (
          selectedSubjects.map((subject) => (
            <UnitSelect
              key={subject}
              subject={subject}
              units={fetchedUnits[subject] || []}
              selectedUnits={selectedUnits[subject] || []}
              handleUnitChange={(e) => setSelectedUnits((prev) => ({
                ...prev,
                [subject]: e.target.value as string[],
              }))}
            />
          ))
        )}

        <StudentSelect 
          students={students}
          selectedStudents={selectedStudents}
          handleStudentChange={(id: number) => setSelectedStudents((prev: number[]) => prev.includes(id) ? prev.filter((sid: number) => sid !== id) : [...prev, id])}
          handleSelectAllStudents={() => setSelectedStudents(students.map((s: Student) => s._id))}
          handleDeselectAllStudents={() => setSelectedStudents([])}
          sx={{ marginBottom: 2 }} // 여백 추가
        />

        {/* 학생 선택과 버튼 사이의 여백 추가 */}
        <Box sx={{ mb: 2 }}></Box>

        {tabValue === 0 && generationMethod === 'line_based' && (
          <FormControl fullWidth sx={{ marginTop: 2, marginBottom: 2 }}>
            <InputLabel>평어 라인 수</InputLabel>
            <Select value={reportLines} onChange={(e: SelectChangeEvent<number>) => setReportLines(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((lines) => (
                <MenuItem key={lines} value={lines}>
                  {lines} 줄
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <ActionButtons
          tabValue={tabValue}
          onBack={onBack}
          onGenerate={handleReportGeneration}
          onQuery={handleReportQuery}
        />

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={2000} 
          onClose={() => setSnackbarOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
            {snackbarMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Fade>
  );
};

export default ReportGeneration;
