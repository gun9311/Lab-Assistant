import React, { useState, useEffect } from "react";
import api from "../../utils/api";
import {
  Box,
  TextField,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ListSubheader,
} from "@mui/material";
import { getGradeStatus } from "../../utils/auth";

type SubjectSelectorProps = {
  onSelectionChange: (selection: {
    grade: string;
    semester: string;
    subject: string;
    unit: string;
    topic: string;
  }) => void;
  showTopic: boolean;
  disabled?: boolean;
};

const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  onSelectionChange,
  showTopic,
  disabled = false,
}) => {
  const [grade, setGrade] = useState(getGradeStatus() || "");
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState("");
  const [topic, setTopic] = useState("");
  const [units, setUnits] = useState<string[]>([]);

  const mainSubjects = ["국어", "도덕", "수학", "과학", "사회"];
  const otherSubjects = ["영어", "음악", "미술", "체육", "실과"];

  useEffect(() => {
    const fetchUnits = async () => {
      if (subject && semester && mainSubjects.includes(subject)) {
        try {
          const res = await api.get("/subjects/units", {
            params: { grade, semester, subject },
          });
          const fetchedUnits = res.data.units;
          fetchedUnits.sort((a: string, b: string) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || "0", 10);
            const numB = parseInt(b.match(/\d+/)?.[0] || "0", 10);
            return numA - numB;
          });
          setUnits(fetchedUnits);
        } catch (error) {
          console.error("Failed to fetch units:", error);
        }
      } else {
        setUnits([]);
      }
    };

    fetchUnits();
  }, [grade, semester, subject, mainSubjects]);

  const handleSelectionChange = () => {
    const unitValue = mainSubjects.includes(subject) ? unit : "";
    onSelectionChange({
      grade,
      semester,
      subject,
      unit: unitValue,
      topic: topic || "",
    });
  };

  useEffect(() => {
    handleSelectionChange();
  }, [grade, semester, subject, unit, topic]);

  return (
    <Paper elevation={3} sx={{ padding: 4, marginTop: 4 }}>
      <Typography variant="h5" gutterBottom>
        과목 선택
      </Typography>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <TextField
          value={grade + "학년"}
          variant="outlined"
          disabled={disabled}
        />
      </FormControl>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>학기</InputLabel>
        <Select
          value={semester}
          onChange={(e) => {
            setSemester(e.target.value);
            setUnit(""); // 학기 변경 시 단원 초기화 추가
          }} 
          label="학기"
          disabled={disabled}
        >
          <MenuItem value="1학기">1학기</MenuItem>
          <MenuItem value="2학기">2학기</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>과목</InputLabel>
        <Select
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setUnit(""); // 이미 있는 단원 초기화
          }} 
          label="과목"
          disabled={disabled}
        >
          <MenuItem value="" disabled>
            과목 선택
          </MenuItem>
          {/* <ListSubheader>주요 과목</ListSubheader> */}
          {mainSubjects.map((sub, index) => (
            <MenuItem key={`main-${index}`} value={sub}>
              {sub}
            </MenuItem>
          ))}
          {/* <ListSubheader>기타 과목</ListSubheader> */}
          {otherSubjects.map((sub, index) => (
            <MenuItem key={`other-${index}`} value={sub}>
              {sub}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {units.length > 0 && mainSubjects.includes(subject) && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>단원</InputLabel>
          <Select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            label="단원"
            disabled={disabled}
          >
            {units.map((unit, index) => (
              <MenuItem key={index} value={unit}>
                {unit}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      {subject && showTopic && (
        <TextField
          fullWidth
          variant="outlined"
          margin="normal"
          label="주제"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="학습 주제를 입력하세요"
          disabled={disabled}
        />
      )}
    </Paper>
  );
};

export default SubjectSelector;
