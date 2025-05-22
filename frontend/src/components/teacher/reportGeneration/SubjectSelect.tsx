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
import MenuBookIcon from "@mui/icons-material/MenuBook";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import { SelectChangeEvent } from "@mui/material/Select";

type SubjectSelectProps = {
  allSubjectItemsFromProps: string[]; // 외부에서 과목 목록을 받음
  selectedSubjects: string[];
  handleSubjectChange: (event: SelectChangeEvent<string[]>) => void;
  handleSelectAllSubjects: () => void;
  handleDeselectAllSubjects: () => void;
  sx?: object;
};

const ITEM_HEIGHT = 44;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 6 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

// const allSubjectItems = [ // 하드코딩된 목록 제거
//   "국어",
//   "도덕",
//   "수학",
//   "과학",
//   "사회",
//   "영어",
//   "음악",
//   "미술",
//   "체육",
//   "실과",
// ];

const SubjectSelect: React.FC<SubjectSelectProps> = ({
  allSubjectItemsFromProps, // prop으로 받음
  selectedSubjects,
  handleSubjectChange,
  handleSelectAllSubjects,
  handleDeselectAllSubjects,
  sx,
}) => {
  // allSubjectItemsFromProps가 유효한 배열인지 확인, 아니면 빈 배열 사용
  const availableItems = Array.isArray(allSubjectItemsFromProps)
    ? allSubjectItemsFromProps
    : [];
  const allSelected =
    availableItems.length > 0 &&
    selectedSubjects.length === availableItems.length;

  // 선택된 과목을 availableItems 순서대로 정렬하는 함수
  const getSortedSelectedSubjects = (selected: string[]) => {
    if (availableItems.length === 0) return selected; // 정렬 기준 목록이 없으면 원본 반환
    return [...selected].sort(
      (a, b) => availableItems.indexOf(a) - availableItems.indexOf(b)
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
          <MenuBookIcon
            sx={{ mr: 1, fontSize: "1.3rem", color: "primary.main" }}
          />
          과목 선택
        </Typography>
        <Button
          onClick={
            allSelected ? handleDeselectAllSubjects : handleSelectAllSubjects
          }
          size="small"
          variant={allSelected ? "contained" : "outlined"}
          color="primary"
          startIcon={
            allSelected ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />
          }
          sx={{ textTransform: "none", borderRadius: 1.5 }}
          disabled={availableItems.length === 0} // 선택 가능한 과목이 없으면 버튼 비활성화
        >
          {allSelected ? "전체 해제" : "전체 선택"}
        </Button>
      </Box>
      <Divider sx={{ mb: 2.5 }} />
      <FormControl fullWidth disabled={availableItems.length === 0}>
        {" "}
        {/* 과목 없으면 FormControl 비활성화 */}
        <InputLabel id="subject-select-label">
          {availableItems.length === 0
            ? "선택 가능한 과목 없음"
            : "과목 선택 (다중 가능)"}
        </InputLabel>
        <Select
          labelId="subject-select-label"
          multiple
          value={selectedSubjects}
          onChange={handleSubjectChange}
          label={
            availableItems.length === 0
              ? "선택 가능한 과목 없음"
              : "과목 선택 (다중 가능)"
          }
          renderValue={(selected) => {
            const sortedSelected = getSortedSelectedSubjects(
              selected as string[]
            );
            if (sortedSelected.length === 0) {
              return (
                <Typography variant="body2" color="text.secondary">
                  <em>선택 안 함</em>
                </Typography>
              );
            }
            // availableItems가 비어있지 않을 때만 "전체 과목" 로직 적용
            if (
              availableItems.length > 0 &&
              sortedSelected.length === availableItems.length
            ) {
              return (
                <Chip
                  label="전체 과목"
                  size="small"
                  color="primary"
                  variant="filled"
                />
              );
            }
            return (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {sortedSelected.map((value) => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            );
          }}
          MenuProps={MenuProps}
        >
          {availableItems.map((subject) => (
            <MenuItem
              key={subject}
              value={subject}
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
                checked={selectedSubjects.includes(subject)}
                size="small"
              />
              <ListItemText
                primary={subject}
                primaryTypographyProps={{ variant: "body2" }}
              />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Paper>
  );
};

export default SubjectSelect;
