import React from "react";
import { FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText, Box, Button } from "@mui/material";
import { SelectChangeEvent } from '@mui/material/Select'; // SelectChangeEvent 타입을 가져옴
import SemesterIcon from '@mui/icons-material/CalendarToday';

type SemesterSelectProps = {
  selectedSemesters: string[];
  handleSemesterChange: (event: SelectChangeEvent<string[]>) => void;
  handleSelectAllSemesters: () => void;
  handleDeselectAllSemesters: () => void;
};

const SemesterSelect: React.FC<SemesterSelectProps> = ({
  selectedSemesters,
  handleSemesterChange,
  handleSelectAllSemesters,
  handleDeselectAllSemesters,
}) => {
  return (
    <>
      <Box sx={{ display: "flex", justifyContent: { xs: "center", sm: "flex-end" }, marginBottom: 1 }}>
        <Button onClick={handleSelectAllSemesters} startIcon={<SemesterIcon />}>학기 전체 선택</Button>
        <Button onClick={handleDeselectAllSemesters}>학기 전체 해제</Button>
      </Box>
      <FormControl fullWidth sx={{ marginBottom: 2 }}>
        <InputLabel>학기 선택</InputLabel>
        <Select
          multiple
          value={selectedSemesters}
          onChange={handleSemesterChange}
          renderValue={(selected) => selected.join(", ")}
        >
          <MenuItem value="1학기">
            <Checkbox checked={selectedSemesters.includes("1학기")} />
            <ListItemText primary="1학기" />
          </MenuItem>
          <MenuItem value="2학기">
            <Checkbox checked={selectedSemesters.includes("2학기")} />
            <ListItemText primary="2학기" />
          </MenuItem>
        </Select>
      </FormControl>
    </>
  );
};

export default SemesterSelect;
