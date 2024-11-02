import React from "react";
import { Box, Typography, TextField, MenuItem, IconButton, Button, Grid } from "@mui/material";
import { Image, Delete } from "@mui/icons-material";

type OverviewPanelProps = {
  title: string;
  setTitle: (title: string) => void;
  grade: string;
  setGrade: (grade: string) => void;
  semester: string;
  setSemester: (semester: string) => void;
  subject: string;
  setSubject: (subject: string) => void;
  unit: string;
  setUnit: (unit: string) => void;
  units: string[];
  quizImage: File | null;
  quizImageUrl: string;
  setQuizImage: (image: File | null) => void;
  setQuizImageUrl: (url: string) => void;
  setImageDialogOpen: (open: boolean) => void;
};

const OverviewPanel: React.FC<OverviewPanelProps> = ({
  title,
  setTitle,
  grade,
  setGrade,
  semester,
  setSemester,
  subject,
  setSubject,
  unit,
  setUnit,
  units,
  quizImage,
  quizImageUrl,
  setQuizImage,
  setQuizImageUrl,
  setImageDialogOpen,
}) => {
  return (
    <Box sx={{ padding: "1.5rem", backgroundColor: "#fafafa", borderRadius: "12px", boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.05)" }}>
      <Grid container spacing={1} alignItems="center" sx={{ marginBottom: "1rem" }}>
  {/* 퀴즈 제목 */}
  <Grid item xs={9}>
    <TextField
      fullWidth
      label="제목"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      placeholder="퀴즈 제목 입력"
      sx={{
        "& .MuiInputBase-root": {
          borderRadius: "8px",
          backgroundColor: "#fff",
        },
      }}
    />
  </Grid>

  {/* 이미지 업로드 버튼 및 미리보기 */}
  <Grid item xs={3} textAlign="center">
    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
      <IconButton
        onClick={() => setImageDialogOpen(true)}
        sx={{
          backgroundColor: "#ffcc00",
          color: "#000",
          borderRadius: "8px",
          width: "150px",
          height: "100%",
          fontSize: "0.9rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          "&:hover": { backgroundColor: "#ffaa00" },
        }}
      >
        <Image sx={{ mr: 0.5, fontSize: "1.2rem" }} /> 대표 이미지
      </IconButton>

      {/* 이미지 미리보기 및 삭제 */}
      {(quizImage || quizImageUrl) && (
        <Box
          sx={{
            position: "relative",
            width: "100px",
            height: "100px",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
            border: "1px solid #ddd",
          }}
        >
          <Box
            component="img"
            src={quizImage ? URL.createObjectURL(quizImage) : quizImageUrl}
            alt="퀴즈 이미지"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: "8px",
            }}
          />
          <IconButton
            onClick={() => {
              setQuizImage(null);
              setQuizImageUrl("");
            }}
            sx={{
              position: "absolute",
              top: "4px",
              right: "4px",
              backgroundColor: "#ff6f61",
              color: "#fff",
              width: "24px",
              height: "24px",
              "&:hover": { backgroundColor: "#e57373" },
            }}
            size="small"
          >
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  </Grid>
</Grid>

      {/* 학년, 학기, 과목, 단원 입력 */}
      <Grid container spacing={2} sx={{ marginTop: "1rem" }}>
        <Grid item xs={2}>
          <TextField
            select
            label="학년"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            fullWidth
            sx={{
              "& .MuiInputBase-root": { borderRadius: "8px", backgroundColor: "#fff" },
            }}
          >
            <MenuItem value="5">5</MenuItem>
            <MenuItem value="6">6</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={2}>
          <TextField
            select
            label="학기"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            fullWidth
            sx={{
              "& .MuiInputBase-root": { borderRadius: "8px", backgroundColor: "#fff" },
            }}
          >
            <MenuItem value="1학기">1학기</MenuItem>
            <MenuItem value="2학기">2학기</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={2}>
          <TextField
            select
            label="과목"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth
            sx={{
              "& .MuiInputBase-root": { borderRadius: "8px", backgroundColor: "#fff" },
            }}
          >
            <MenuItem value="수학">수학</MenuItem>
            <MenuItem value="과학">과학</MenuItem>
          </TextField>
        </Grid>

        <Grid item xs={6}>
          <TextField
            select
            label="단원"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            fullWidth
            sx={{
              "& .MuiInputBase-root": { borderRadius: "8px", backgroundColor: "#fff" },
            }}
          >
            <MenuItem value="">단원 선택</MenuItem>
            {units.map((unit, index) => (
              <MenuItem key={index} value={unit}>{unit}</MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OverviewPanel;
