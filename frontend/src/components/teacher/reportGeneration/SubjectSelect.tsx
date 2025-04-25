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
import SubjectIcon from "@mui/icons-material/MenuBook";
import { SelectChangeEvent } from "@mui/material/Select";

type SubjectSelectProps = {
  selectedSubjects: string[];
  handleSubjectChange: (event: SelectChangeEvent<string[]>) => void;
  handleSelectAllSubjects: () => void;
  handleDeselectAllSubjects: () => void;
  sx?: object; // sx 속성을 추가하여 스타일 조정 가능하게 함
};

const ITEM_HEIGHT = 48; // 각 메뉴 아이템의 높이
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP, // 4.5개 아이템만큼의 높이 (스크롤 생성)
      width: "auto",
    },
  },
};

const SubjectSelect: React.FC<SubjectSelectProps> = ({
  selectedSubjects,
  handleSubjectChange,
  handleSelectAllSubjects,
  handleDeselectAllSubjects,
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
        <Button onClick={handleSelectAllSubjects} startIcon={<SubjectIcon />}>
          과목 전체 선택
        </Button>
        <Button onClick={handleDeselectAllSubjects}>과목 전체 해제</Button>
      </Box>
      <FormControl fullWidth sx={{ ...sx, marginBottom: 2 }}>
        <InputLabel>과목 선택</InputLabel>
        <Select
          multiple
          value={selectedSubjects}
          onChange={handleSubjectChange}
          renderValue={(selected) => {
            // 메뉴에 정의된 순서대로 과목들을 정렬
            const orderedSubjects = [
              "국어",
              "도덕",
              "수학",
              "과학",
              "사회",
              "영어",
              "음악",
              "미술",
              "체육",
              "실과",
            ].filter((sub) => selected.includes(sub));
            return orderedSubjects.join(", ");
          }}
          MenuProps={MenuProps}
        >
          {[
            "국어",
            "도덕",
            "수학",
            "과학",
            "사회",
            "영어",
            "음악",
            "미술",
            "체육",
            "실과",
          ].map((subject) => (
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
