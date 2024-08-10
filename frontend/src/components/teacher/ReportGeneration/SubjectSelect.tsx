import React from "react";
import { FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, Box, Button } from "@mui/material";
import SubjectIcon from '@mui/icons-material/MenuBook';

type SubjectSelectProps = {
  selectedSubjects: string[];
  handleSubjectChange: (event: any) => void;
  handleSelectAllSubjects: () => void;
  handleDeselectAllSubjects: () => void;
};

const SubjectSelect: React.FC<SubjectSelectProps> = ({
  selectedSubjects,
  handleSubjectChange,
  handleSelectAllSubjects,
  handleDeselectAllSubjects,
}) => {
  return (
    <>
      <Box sx={{ display: "flex", justifyContent: { xs: "center", sm: "flex-end" }, marginBottom: 1 }}>
        <Button onClick={handleSelectAllSubjects} startIcon={<SubjectIcon />}>과목 전체 선택</Button>
        <Button onClick={handleDeselectAllSubjects}>과목 전체 해제</Button>
      </Box>
      <FormControl fullWidth sx={{ marginBottom: 2 }}>
        <InputLabel>과목 선택</InputLabel>
        <Select
          multiple
          value={selectedSubjects}
          onChange={handleSubjectChange}
          renderValue={(selected) => selected.join(", ")}
        >
          {["국어", "수학", "사회", "과학", "영어"].map((subject) => (
            <MenuItem key={subject} value={subject}>
              <Checkbox checked={selectedSubjects.includes(subject)} />
              <ListItemText primary={subject} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  );
};

export default SubjectSelect;
