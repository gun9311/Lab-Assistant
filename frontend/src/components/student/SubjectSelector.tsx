import React, { useState, useEffect } from "react";
import api, { getSubjects } from "../../utils/api";
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
  Chip,
} from "@mui/material";
import { Today, CalendarMonth } from "@mui/icons-material";
import { getGradeStatus } from "../../utils/auth";
import { ChatUsageData } from "../../utils/api";

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
  chatUsage: ChatUsageData | null;
  usageError: string | null;
};

// Helper function to determine chip color based on usage percentage
const getUsageColor = (
  remaining: number,
  limit: number
): "success" | "warning" | "error" => {
  if (limit === 0) return "error"; // Handle division by zero or no limit
  const percentage = (remaining / limit) * 100;
  if (percentage < 20) {
    return "error";
  } else if (percentage <= 50) {
    return "warning";
  } else {
    return "success";
  }
};

const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  onSelectionChange,
  showTopic,
  disabled = false,
  chatUsage,
  usageError,
}) => {
  const [grade, setGrade] = useState(getGradeStatus() || "");
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [unit, setUnit] = useState("");
  const [topic, setTopic] = useState("");
  const [units, setUnits] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [mainSubjects] = useState([
    "국어",
    "도덕",
    "수학",
    "과학",
    "사회",
    "통합교과",
  ]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (grade && semester) {
        try {
          const response = await getSubjects(parseInt(grade), [semester]);
          setSubjects(response.data);
        } catch (error) {
          console.error("Failed to fetch subjects:", error);
          setSubjects([]);
        }
      } else {
        setSubjects([]);
      }
    };

    fetchSubjects();
  }, [grade, semester]);

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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
          학습 내용 선택
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {chatUsage && !usageError && (
            <>
              <Chip
                icon={<Today fontSize="small" />}
                label={`오늘 ${chatUsage.dailyRemaining}/${chatUsage.dailyLimit}`}
                variant="outlined"
                color={getUsageColor(
                  chatUsage.dailyRemaining,
                  chatUsage.dailyLimit
                )}
                size="small"
              />
              <Chip
                icon={<CalendarMonth fontSize="small" />}
                label={`월 ${chatUsage.monthlyRemaining}/${chatUsage.monthlyLimit}`}
                variant="outlined"
                color={getUsageColor(
                  chatUsage.monthlyRemaining,
                  chatUsage.monthlyLimit
                )}
                size="small"
              />
            </>
          )}
          {usageError && (
            <Chip
              label={usageError}
              variant="outlined"
              color="error"
              size="small"
            />
          )}
        </Box>
      </Box>
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
          <FormControl fullWidth variant="outlined" disabled={disabled}>
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
          <FormControl fullWidth variant="outlined" disabled={disabled}>
            <InputLabel>과목</InputLabel>
            <Select
              value={subject}
              onChange={(e) => {
                const newSubject = e.target.value;
                setSubject(newSubject);
                setUnit("");
                setTopic("");
                if (!mainSubjects.includes(newSubject)) {
                  setUnits([]);
                }
              }}
              label="과목"
            >
              <MenuItem value="" disabled>
                <em>과목 선택</em>
              </MenuItem>
              {subjects.map((sub, index) => (
                <MenuItem key={`subject-${index}`} value={sub}>
                  {sub}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        {mainSubjects.includes(subject) && (
          <Grid item xs={12} sm={6}>
            <FormControl
              fullWidth
              variant="outlined"
              disabled={disabled || !semester || units.length === 0}
            >
              <InputLabel>단원</InputLabel>
              <Select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                label="단원"
              >
                <MenuItem value="" disabled>
                  <em>단원 선택</em>
                </MenuItem>
                {units.map((u, index) => (
                  <MenuItem key={`unit-${index}`} value={u}>
                    {u}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}
        {!mainSubjects.includes(subject) && subject && (
          <Grid item xs={12} sm={6}>
            <TextField
              label="단원"
              value="선택 불필요"
              variant="outlined"
              fullWidth
              disabled
              InputProps={{ readOnly: true }}
              sx={{
                "& .MuiInputBase-input.Mui-disabled": {
                  WebkitTextFillColor: "rgba(0, 0, 0, 0.6)",
                  cursor: "default",
                },
                "& .MuiFormLabel-root.Mui-disabled": {
                  color: "rgba(0, 0, 0, 0.6)",
                },
              }}
            />
          </Grid>
        )}
        {showTopic && (
          <Grid item xs={12}>
            <TextField
              fullWidth
              variant="outlined"
              label="주제"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="학습 주제를 입력하세요"
              disabled={disabled || !subject}
              required
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default SubjectSelector;
