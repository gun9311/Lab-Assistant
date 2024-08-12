import React, { useState } from "react";
import { Box, Tabs, Tab, Fade, Alert, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from "@mui/material";
import SemesterSelect from "./SemesterSelect";
import SubjectSelect from "./SubjectSelect";
import StudentSelect from "./StudentSelect";
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
  const [reportLines, setReportLines] = useState<number>(3);
  const [reportResults, setReportResults] = useState<any[]>([]);
  const [showReportComponent, setShowReportComponent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState<number>(0);

  const handleReportGeneration = async () => {
    if (selectedSemesters.length === 0 || selectedSubjects.length === 0 || selectedStudents.length === 0) {
      setErrorMessage("학기, 과목, 학생을 모두 선택해야 합니다.");
      return;
    }
    try {
      const response = await api.post("/report/generate", {
        selectedSemesters,
        selectedSubjects,
        selectedStudents,
        reportLines,
      });
      setErrorMessage(null);
      alert("보고서가 성공적으로 생성되었습니다.");
    } catch (error) {
      setErrorMessage("보고서 생성 요청에 실패했습니다.");
    }
  };

  const handleReportQuery = async () => {
    if (selectedSemesters.length === 0 || selectedSubjects.length === 0 || selectedStudents.length === 0) {
      setErrorMessage("학기, 과목, 학생을 모두 선택해야 합니다.");
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
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage("보고서 조회 요청에 실패했습니다.");
    }
  };

  const handleBackToGeneration = () => {
    setShowReportComponent(false);
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
          <Tab label="평가 생성" />
          <Tab label="평가 조회" />
        </Tabs>

        <SemesterSelect
          selectedSemesters={selectedSemesters}
          handleSemesterChange={(e: SelectChangeEvent<string[]>) => setSelectedSemesters(e.target.value as string[])}
          handleSelectAllSemesters={() => setSelectedSemesters(["1학기", "2학기"])}
          handleDeselectAllSemesters={() => setSelectedSemesters([])}
        />

        <SubjectSelect
          selectedSubjects={selectedSubjects}
          handleSubjectChange={(e: SelectChangeEvent<string[]>) => setSelectedSubjects(e.target.value as string[])}
          handleSelectAllSubjects={() => setSelectedSubjects(["국어", "수학", "사회", "과학", "영어"])}
          handleDeselectAllSubjects={() => setSelectedSubjects([])}
        />

        <StudentSelect
          students={students}
          selectedStudents={selectedStudents}
          handleStudentChange={(id: number) => setSelectedStudents((prev: number[]) => prev.includes(id) ? prev.filter((sid: number) => sid !== id) : [...prev, id])}
          handleSelectAllStudents={() => setSelectedStudents(students.map((s: Student) => s._id))}
          handleDeselectAllStudents={() => setSelectedStudents([])}
        />

        {tabValue === 0 && (
          <FormControl fullWidth sx={{ marginBottom: 2 }}>
            <InputLabel>평가 라인 수(최대)</InputLabel>
            <Select value={reportLines} onChange={(e: SelectChangeEvent<number>) => setReportLines(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map((lines) => (
                <MenuItem key={lines} value={lines}>
                  {lines} 줄
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        <ActionButtons
          tabValue={tabValue}
          onBack={onBack}
          onGenerate={handleReportGeneration}
          onQuery={handleReportQuery}
        />
      </Box>
    </Fade>
  );
};

export default ReportGeneration;