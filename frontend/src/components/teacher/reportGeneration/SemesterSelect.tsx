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
  Radio,
  RadioGroup,
  FormControlLabel,
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
  isSingleSelect?: boolean;
  onSingleSemesterChange?: (semester: string) => void;
};

const semesterItems = ["1학기", "2학기"];

const SemesterSelect: React.FC<SemesterSelectProps> = ({
  selectedSemesters,
  handleSemesterChange,
  handleSelectAllSemesters,
  handleDeselectAllSemesters,
  sx,
  isSingleSelect = false,
  onSingleSemesterChange,
}) => {
  const allSelected = selectedSemesters.length === semesterItems.length;

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedSemester = event.target.value;
    if (onSingleSemesterChange) {
      onSingleSemesterChange(selectedSemester);
    }
  };

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
          학기 선택 {isSingleSelect ? "(단일 선택)" : "(다중 가능)"}
        </Typography>
        {!isSingleSelect && (
          <Button
            onClick={
              allSelected
                ? handleDeselectAllSemesters
                : handleSelectAllSemesters
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
        )}
      </Box>
      <Divider sx={{ mb: 2.5 }} />

      {isSingleSelect ? (
        <RadioGroup
          value={selectedSemesters[0] || ""}
          onChange={handleRadioChange}
          sx={{ flexDirection: "row", gap: 3 }}
        >
          {semesterItems.map((semester) => (
            <FormControlLabel
              key={semester}
              value={semester}
              control={<Radio />}
              label={semester}
              sx={{
                "& .MuiFormControlLabel-label": {
                  fontWeight: selectedSemesters.includes(semester) ? 600 : 400,
                  color: selectedSemesters.includes(semester)
                    ? "primary.main"
                    : "text.primary",
                },
              }}
            />
          ))}
        </RadioGroup>
      ) : (
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
      )}

      {isSingleSelect && selectedSemesters.length === 0 && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: "block" }}
        >
          평어 생성할 학기를 선택해주세요
        </Typography>
      )}
    </Paper>
  );
};

export default SemesterSelect;
