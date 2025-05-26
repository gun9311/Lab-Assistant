import React from "react";
import {
  Box,
  Typography,
  ListItemIcon,
  Paper,
  List,
  ListItem,
  ListItemText,
  Alert,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PeopleIcon from "@mui/icons-material/People";

// 타입 정의 (ReportGeneration.tsx와 동일하게)
type UnitsBySemester = {
  [semester: string]: string[];
};

type SelectedUnitsType = {
  [subject: string]: UnitsBySemester;
};

type GenerationStepSummaryProps = {
  //   icon: React.ReactElement;
  //   label: string;
  generationMethod: string;
  selectedSemesters: string[];
  selectedSubjects: string[];
  selectedStudentsCount: number;
  reportLines: number;
  selectedUnits: SelectedUnitsType;
};

const GenerationStepSummary: React.FC<GenerationStepSummaryProps> = ({
  //   icon,
  //   label,
  generationMethod,
  selectedSemesters,
  selectedSubjects,
  selectedStudentsCount,
  reportLines,
  selectedUnits,
}) => {
  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Typography
        variant="h6"
        gutterBottom
        sx={{ mb: 2, display: "flex", alignItems: "center" }}
      >
        {/* <ListItemIcon sx={{ minWidth: 32 }}>{icon}</ListItemIcon> */}
        {/* {label} */}
      </Typography>
      <Paper variant="outlined" sx={{ p: 2, backgroundColor: "#f9f9f9" }}>
        <Typography
          variant="subtitle1"
          gutterBottom
          sx={{ fontWeight: "bold" }}
        >
          선택 항목 요약
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlineIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="생성 방식"
              secondary={
                generationMethod === "line_based"
                  ? "줄 개수 기반"
                  : "단원 직접 선택"
              }
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlineIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="학기"
              secondary={selectedSemesters.join(", ") || "미선택"}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleOutlineIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="과목"
              secondary={selectedSubjects.join(", ") || "미선택"}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <PeopleIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="학생"
              secondary={`${selectedStudentsCount} 명`}
            />
          </ListItem>
          {generationMethod === "line_based" && (
            <ListItem>
              <ListItemIcon>
                <CheckCircleOutlineIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="평어 줄 수"
                secondary={`${reportLines} 줄`}
              />
            </ListItem>
          )}
          {generationMethod === "unit_based" &&
            selectedSubjects.map((subject) =>
              selectedSemesters.map(
                (semester) =>
                  selectedUnits[subject]?.[semester] &&
                  selectedUnits[subject][semester].length > 0 && (
                    <ListItem key={`${subject}-${semester}`}>
                      <ListItemIcon sx={{ pl: 2 }}>
                        <CheckCircleOutlineIcon
                          fontSize="small"
                          color="disabled"
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${subject} (${semester}) 단원`}
                        secondary={selectedUnits[subject][semester].join(", ")}
                      />
                    </ListItem>
                  )
              )
            )}
        </List>
      </Paper>
      <Alert severity="info" sx={{ mt: 2.5 }}>
        위 내용을 확인 후 '생성 요청' 버튼을 눌러주세요.
      </Alert>
    </Box>
  );
};

export default GenerationStepSummary;
