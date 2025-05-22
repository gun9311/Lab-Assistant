import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Box,
  Button,
  Typography,
  Paper,
  Divider,
  Chip,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";

type SemesterSelectProps = {
  selectedSemesters: string[];
  handleSemesterChange: (event: SelectChangeEvent<string[]>) => void;
  handleSelectAllSemesters: () => void;
  handleDeselectAllSemesters: () => void;
  sx?: object;
};

const semesterItems = ["1학기", "2학기"];

const SemesterSelect: React.FC<SemesterSelectProps> = ({
  selectedSemesters,
  handleSemesterChange,
  handleSelectAllSemesters,
  handleDeselectAllSemesters,
  sx,
}) => {
  const allSelected = selectedSemesters.length === semesterItems.length;

  // 선택된 학기를 semesterItems 순서대로 정렬하는 함수
  const getSortedSelectedSemesters = (selected: string[]) => {
    return [...selected].sort(
      (a, b) => semesterItems.indexOf(a) - semesterItems.indexOf(b)
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, ...sx }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 500, display: "flex", alignItems: "center" }}
        >
          <CalendarTodayIcon
            sx={{ mr: 1, fontSize: "1.3rem", color: "primary.main" }}
          />
          학기 선택
        </Typography>
        <Button
          onClick={
            allSelected ? handleDeselectAllSemesters : handleSelectAllSemesters
          }
          size="small"
          variant={allSelected ? "contained" : "outlined"}
          color="primary"
          startIcon={
            allSelected ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />
          }
          sx={{ textTransform: "none", borderRadius: 1.5 }}
        >
          {allSelected ? "전체 해제" : "전체 선택"}
        </Button>
      </Box>
      <Divider sx={{ mb: 2.5 }} />
      <FormControl fullWidth>
        <InputLabel id="semester-select-label">
          학기 선택 (다중 가능)
        </InputLabel>
        <Select
          labelId="semester-select-label"
          multiple
          value={selectedSemesters}
          onChange={handleSemesterChange}
          label="학기 선택 (다중 가능)"
          renderValue={(selected) => {
            const sortedSelected = getSortedSelectedSemesters(
              selected as string[]
            );
            return (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {sortedSelected.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    <em>선택 안 함</em>
                  </Typography>
                ) : (
                  sortedSelected.map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))
                )}
              </Box>
            );
          }}
          MenuProps={{ PaperProps: { sx: { maxHeight: 240 } } }}
        >
          {semesterItems.map((semester) => (
            <MenuItem
              key={semester}
              value={semester}
              sx={{
                borderRadius: 1,
                mx: 1,
                my: 0.5,
                "&.Mui-selected": {
                  fontWeight: "fontWeightBold",
                  backgroundColor: "action.selected",
                },
              }}
            >
              <Checkbox
                checked={selectedSemesters.includes(semester)}
                size="small"
              />
              <ListItemText
                primary={semester}
                primaryTypographyProps={{ variant: "body2" }}
              />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Paper>
  );
};

export default SemesterSelect;
