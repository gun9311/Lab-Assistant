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
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select"; // SelectChangeEvent 타입을 가져옴
import SemesterIcon from "@mui/icons-material/CalendarToday";

type SemesterSelectProps = {
  selectedSemesters: string[];
  handleSemesterChange: (event: SelectChangeEvent<string[]>) => void;
  handleSelectAllSemesters: () => void;
  handleDeselectAllSemesters: () => void;
  sx?: object; // sx 속성을 추가하여 스타일 조정 가능하게 함
};

const SemesterSelect: React.FC<SemesterSelectProps> = ({
  selectedSemesters,
  handleSemesterChange,
  handleSelectAllSemesters,
  handleDeselectAllSemesters,
  sx, // 추가된 부분: sx를 props로 받음
}) => {
  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: { xs: "center", sm: "flex-end" },
          marginBottom: 1,
        }}
      >
        <Button onClick={handleSelectAllSemesters} startIcon={<SemesterIcon />}>
          학기 전체 선택
        </Button>
        <Button onClick={handleDeselectAllSemesters}>학기 전체 해제</Button>
      </Box>
      <FormControl fullWidth sx={{ ...sx, marginBottom: 2 }}>
        <InputLabel>학기 선택</InputLabel>
        <Select
          multiple
          value={selectedSemesters}
          onChange={handleSemesterChange}
          renderValue={(selected) => {
            // 선택된 학기들을 정해진 순서로 정렬
            const orderedSemesters = ["1학기", "2학기"].filter((sem) =>
              selected.includes(sem)
            );
            return orderedSemesters.join(", ");
          }}
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
