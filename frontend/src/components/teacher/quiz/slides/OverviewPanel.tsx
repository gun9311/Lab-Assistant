import React from "react";
import { Box, Typography, TextField, MenuItem, IconButton, Button } from "@mui/material";
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
    <Box sx={{ padding: "1rem", backgroundColor: "#fafafa", borderRadius: "12px", boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.05)" }}>
      <Typography variant="h6" sx={{ color: "#333", fontWeight: "bold", textAlign: "center", mb: 2 }}>
        📝 퀴즈 개요
      </Typography>

      {/* 퀴즈 제목 입력 */}
      <TextField
        fullWidth
        label="퀴즈 제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="퀴즈 제목 입력"
        sx={{
          marginBottom: "1.5rem",
          "& .MuiInputBase-root": {
            borderRadius: "8px",
            backgroundColor: "#fff",
          },
        }}
      />

      {/* 학년 */}
      <TextField
        select
        label="학년"
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
        fullWidth
        sx={{
          marginBottom: "1.5rem",
          "& .MuiInputBase-root": { borderRadius: "8px", backgroundColor: "#fff" },
        }}
      >
        <MenuItem value="5">5</MenuItem>
        <MenuItem value="6">6</MenuItem>
      </TextField>

      {/* 학기 */}
      <TextField
        select
        label="학기"
        value={semester}
        onChange={(e) => setSemester(e.target.value)}
        fullWidth
        sx={{
          marginBottom: "1.5rem",
          "& .MuiInputBase-root": { borderRadius: "8px", backgroundColor: "#fff" },
        }}
      >
        <MenuItem value="1학기">1학기</MenuItem>
        <MenuItem value="2학기">2학기</MenuItem>
      </TextField>

      {/* 과목 */}
      <TextField
        select
        label="과목"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        fullWidth
        sx={{
          marginBottom: "1.5rem",
          "& .MuiInputBase-root": { borderRadius: "8px", backgroundColor: "#fff" },
        }}
      >
        <MenuItem value="수학">수학</MenuItem>
        <MenuItem value="과학">과학</MenuItem>
      </TextField>

      {/* 단원 */}
      <TextField
        select
        label="단원"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        fullWidth
        sx={{
          marginBottom: "1.5rem",
          "& .MuiInputBase-root": { borderRadius: "8px", backgroundColor: "#fff" },
        }}
      >
        <MenuItem value="">단원 선택</MenuItem>
        {units.map((unit, index) => (
          <MenuItem key={index} value={unit}>{unit}</MenuItem>
        ))}
      </TextField>

      {/* 퀴즈 이미지 업로드 */}
      <Box textAlign="center">
        <IconButton
          onClick={() => setImageDialogOpen(true)}
          sx={{
            backgroundColor: "#ffcc00",
            color: "#000",
            borderRadius: "8px",
            width: "180px",     // 버튼 너비 줄임
            height: "36px",     // 버튼 높이 줄임
            fontSize: "0.9rem", // 글자 크기 줄임
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            "&:hover": { backgroundColor: "#ffaa00" },
          }}
        >
          <Image sx={{ mr: 0.5, fontSize: "1.2rem" }} /> 이미지 업로드
        </IconButton>
      </Box>

      {/* 이미지 미리보기 및 삭제 */}
      {(quizImage || quizImageUrl) && (
        <Box mt={2} textAlign="center">
          <Box
            component="img"
            src={quizImage ? URL.createObjectURL(quizImage) : quizImageUrl}
            alt="퀴즈 이미지"
            sx={{
              maxWidth: "100%",
              height: "auto",
              borderRadius: "8px",
              boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
              mt: 2,
            }}
          />
          <Button
            startIcon={<Delete />}
            onClick={() => { setQuizImage(null); setQuizImageUrl(""); }}
            sx={{ marginTop: "0.5rem", color: "#ff6f61" }}
          >
            이미지 삭제
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default OverviewPanel;
