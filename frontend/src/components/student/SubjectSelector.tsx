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
  Grid,
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
      if (grade && semester && subject && mainSubjects.includes(subject)) {
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
          setUnit("");
        } catch (error) {
          console.error("Failed to fetch units:", error);
          setUnits([]);
          setUnit("");
        }
      } else {
        setUnits([]);
        setUnit("");
      }
    };

    fetchUnits();
  }, [grade, semester, subject]);

  useEffect(() => {
    const unitValue = mainSubjects.includes(subject) ? unit : "";
    onSelectionChange({
      grade,
      semester,
      subject,
      unit: unitValue,
      topic: topic || "",
    });
  }, [grade, semester, subject, unit, topic, onSelectionChange]);

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        학습 내용 선택
      </Typography>
      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6}>
          <TextField
            label="학년"
            value={grade ? `${grade}학년` : ""}
            variant="outlined"
            fullWidth
            disabled
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>학기</InputLabel>
            <Select
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                setUnit("");
                setTopic("");
                setUnits([]);
              }}
              label="학기"
              disabled={disabled}
            >
              <MenuItem value="" disabled>
                <em>학기 선택</em>
              </MenuItem>
              <MenuItem value="1학기">1학기</MenuItem>
              <MenuItem value="2학기">2학기</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth variant="outlined">
            <InputLabel>과목</InputLabel>
            <Select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setUnit("");
                setTopic("");
                setUnits([]);
              }}
              label="과목"
              disabled={disabled}
            >
              <MenuItem value="" disabled>
                <em>과목 선택</em>
              </MenuItem>
              <ListSubheader>주요 과목</ListSubheader>
              {mainSubjects.map((sub, index) => (
                <MenuItem key={`main-${index}`} value={sub}>
                  {sub}
                </MenuItem>
              ))}
              <ListSubheader>기타 과목</ListSubheader>
              {otherSubjects.map((sub, index) => (
                <MenuItem key={`other-${index}`} value={sub}>
                  {sub}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        {mainSubjects.includes(subject) && units.length > 0 && (
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth variant="outlined">
              <InputLabel>단원</InputLabel>
              <Select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                label="단원"
                disabled={disabled || !subject || !semester}
              >
                <MenuItem value="" disabled>
                  <em>단원 선택</em>
                </MenuItem>
                {units.map((u, index) => (
                  <MenuItem key={index} value={u}>
                    {u}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
        {subject && showTopic && (
          <Grid item xs={12}>
            <TextField
              fullWidth
              variant="outlined"
              label="주제"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="구체적인 학습 주제를 입력하세요 (예: 시의 특징)"
              disabled={disabled || !subject}
              required={
                !mainSubjects.includes(subject) ||
                (mainSubjects.includes(subject) && !!unit)
              }
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default SubjectSelector;
