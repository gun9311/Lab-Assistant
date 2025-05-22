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

type QueryStepSummaryProps = {
  // icon: React.ReactElement;
//   label: string;
  selectedSemesters: string[];
  selectedSubjects: string[];
  selectedStudentsCount: number;
};

const QueryStepSummary: React.FC<QueryStepSummaryProps> = ({
  // icon,
//   label,
  selectedSemesters,
  selectedSubjects,
  selectedStudentsCount,
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
        </List>
      </Paper>
      <Alert severity="info" sx={{ mt: 2.5 }}>
        위 내용을 확인 후 '조회하기' 버튼을 눌러주세요.
      </Alert>
    </Box>
  );
};

export default QueryStepSummary;
