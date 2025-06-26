import React from "react";
import {
  Box,
  Typography,
  Grid,
  ListItemIcon,
  SelectChangeEvent,
} from "@mui/material";
import SemesterSelect from "./SemesterSelect";
import SubjectSelect from "./SubjectSelect";
import StudentSelect from "./StudentSelect";

// Student 타입 (ReportGeneration.tsx와 동일하게 정의)
type Student = {
  _id: number;
  name: string;
  studentId: string;
};

type StepTargetFormProps = {
  //   icon: React.ReactElement;
  //   label: string;
  selectedSemesters: string[];
  handleSemesterChange: (event: SelectChangeEvent<string[]>) => void;
  handleSelectAllSemesters: () => void;
  handleDeselectAllSemesters: () => void;
  isSingleSelect?: boolean;
  onSingleSemesterChange?: (semester: string) => void;
  availableSubjects: string[];
  selectedSubjects: string[];
  handleSubjectChange: (event: SelectChangeEvent<string[]>) => void;
  handleSelectAllSubjects: () => void;
  handleDeselectAllSubjects: () => void;
  students: Student[];
  selectedStudents: number[];
  handleStudentChange: (studentId: number) => void;
  handleSelectAllStudents: () => void;
  handleDeselectAllStudents: () => void;
};

const StepTargetForm: React.FC<StepTargetFormProps> = ({
  //   icon,
  //   label,
  selectedSemesters,
  handleSemesterChange,
  handleSelectAllSemesters,
  handleDeselectAllSemesters,
  isSingleSelect = false,
  onSingleSemesterChange,
  availableSubjects,
  selectedSubjects,
  handleSubjectChange,
  handleSelectAllSubjects,
  handleDeselectAllSubjects,
  students,
  selectedStudents,
  handleStudentChange,
  handleSelectAllStudents,
  handleDeselectAllStudents,
}) => {
  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Typography
        variant="h6"
        gutterBottom
        sx={{ mb: 2.5, display: "flex", alignItems: "center" }}
      >
        {/* <ListItemIcon sx={{ minWidth: 32 }}>{icon}</ListItemIcon> */}
        {/* {label} */}
      </Typography>
      <Grid container spacing={2.5}>
        <Grid item xs={12} md={6}>
          <SemesterSelect
            selectedSemesters={selectedSemesters}
            handleSemesterChange={handleSemesterChange}
            handleSelectAllSemesters={handleSelectAllSemesters}
            handleDeselectAllSemesters={handleDeselectAllSemesters}
            isSingleSelect={isSingleSelect}
            onSingleSemesterChange={onSingleSemesterChange}
            sx={{ height: "100%" }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <SubjectSelect
            allSubjectItemsFromProps={availableSubjects}
            selectedSubjects={selectedSubjects}
            handleSubjectChange={handleSubjectChange}
            handleSelectAllSubjects={handleSelectAllSubjects}
            handleDeselectAllSubjects={handleDeselectAllSubjects}
            sx={{ height: "100%" }}
          />
        </Grid>
        <Grid item xs={12}>
          <StudentSelect
            students={students}
            selectedStudents={selectedStudents}
            handleStudentChange={handleStudentChange}
            handleSelectAllStudents={handleSelectAllStudents}
            handleDeselectAllStudents={handleDeselectAllStudents}
            sx={{ width: "100%" }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default StepTargetForm;
