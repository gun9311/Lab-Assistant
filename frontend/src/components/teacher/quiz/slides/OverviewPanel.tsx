import React from "react";
import { Box, Typography, TextField, MenuItem, IconButton, Grid, Button } from "@mui/material";
import { Image, Delete } from "@mui/icons-material";
import backgroundDefault from "../../../../assets/background-default.webp"
// import { PlayCircleFilled, Edit } from "@mui/icons-material"; // 아이콘 추가
import { PlayArrow, Edit } from "@mui/icons-material"; // 간결한 아이콘 추가

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
  isReadOnly?: boolean;
  onStartQuiz?: () => void;
  onEditQuiz?: () => void;
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
  isReadOnly = false,
  onStartQuiz,
  onEditQuiz,
}) => {
  const backgroundImageUrl = quizImage
    ? URL.createObjectURL(quizImage)
    : quizImageUrl || backgroundDefault;

  return (
    <Box
      sx={{
        position: "relative",
        padding: "1.5rem",
        backgroundColor: isReadOnly ? "#f4f4f4" : "#fafafa",
        borderRadius: "12px",
        boxShadow: isReadOnly ? "0px 2px 8px rgba(0, 0, 0, 0.1)" : "0px 4px 12px rgba(0, 0, 0, 0.05)",
        border: isReadOnly ? "1px solid #ddd" : "none",
        ...(isReadOnly && backgroundImageUrl
          ? {
              backgroundImage: `url(${backgroundImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
    >
      {isReadOnly && backgroundImageUrl && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.2)", // 배경 오버레이 추가
            borderRadius: "12px",
            zIndex: 1,
          }}
        />
      )}

      {/* 텍스트와 컨트롤 */}
      <Box sx={{ position: "relative", zIndex: 2 }}>
        <Grid container spacing={1} alignItems="center" sx={{ marginBottom: "1rem" }}>
          {/* 제목 */}
          <Grid item xs={9}>
            {isReadOnly ? (
              <Typography
  variant="h6"
  sx={{
    fontWeight: 600,
    fontSize: "1.5rem",
    fontFamily: '"Roboto", "Noto Sans", sans-serif',
    color: "#fff",
    paddingBottom: "0.3rem",
    borderBottom: "1px solid rgba(255, 255, 255, 0.7)",
    marginBottom: "0.5rem",
    textShadow: "1px 1px 3px rgba(0, 0, 0, 0.7)",
  }}
>
  {title || "제목 없음"}
</Typography>
            ) : (
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
            )}
          </Grid>

          {/* 이미지 업로드 버튼 및 미리보기 */}
          <Grid item xs={3} textAlign="center">
            <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
              {!isReadOnly && (
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
              )}

              {/* 이미지 미리보기 및 삭제 */}
              {(quizImage || quizImageUrl) && !isReadOnly && (
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
        <Grid container spacing={isReadOnly ? 1 : 2} sx={{ marginTop: "1rem" }}>
          <Grid item xs={2}>
            {isReadOnly ? (
              <Typography   sx={{
                fontSize: "1.1rem", // 기존보다 큰 글씨 크기
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.9)",
                textShadow: "1px 1px 3px rgba(0, 0, 0, 0.7)",
                whiteSpace: "nowrap", // 텍스트 줄바꿈 방지
                overflow: "hidden", // 패널을 벗어나지 않도록
                textOverflow: "ellipsis", // 길 경우 생략 표시
                maxWidth: "100px", // 패널 내 공간 안에서 크기 제한
              }}>
                {grade ? `${grade}학년` : "학년 없음"}
              </Typography>
            ) : (
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
            )}
          </Grid>
          
          {/* 학기, 과목, 단원에도 동일한 스타일 적용 */}
          <Grid item xs={2}>
            {isReadOnly ? (
              <Typography   sx={{
                fontSize: "1.1rem", // 기존보다 큰 글씨 크기
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.9)",
                textShadow: "1px 1px 3px rgba(0, 0, 0, 0.7)",
                whiteSpace: "nowrap", // 텍스트 줄바꿈 방지
                overflow: "hidden", // 패널을 벗어나지 않도록
                textOverflow: "ellipsis", // 길 경우 생략 표시
                maxWidth: "100px", // 패널 내 공간 안에서 크기 제한
              }}>
                {semester || "학기 없음"}
              </Typography>
            ) : (
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
            )}
          </Grid>

          <Grid item xs={2}>
            {isReadOnly ? (
              <Typography   sx={{
                fontSize: "1.1rem", // 기존보다 큰 글씨 크기
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.9)",
                textShadow: "1px 1px 3px rgba(0, 0, 0, 0.7)",
                whiteSpace: "nowrap", // 텍스트 줄바꿈 방지
                overflow: "hidden", // 패널을 벗어나지 않도록
                textOverflow: "ellipsis", // 길 경우 생략 표시
                maxWidth: "100px", // 패널 내 공간 안에서 크기 제한
              }}>
                {subject || "과목 없음"}
              </Typography>
            ) : (
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
            )}
          </Grid>

          <Grid item xs={6}>
            {isReadOnly ? (
              <Typography   sx={{
                fontSize: "1.1rem", // 기존보다 큰 글씨 크기
                fontWeight: 500,
                color: "rgba(255, 255, 255, 0.9)",
                textShadow: "1px 1px 3px rgba(0, 0, 0, 0.7)",
                whiteSpace: "nowrap", // 텍스트 줄바꿈 방지
                overflow: "hidden", // 패널을 벗어나지 않도록
                textOverflow: "ellipsis", // 길 경우 생략 표시
                maxWidth: "200px", // 패널 내 공간 안에서 크기 제한
              }}>
                {unit || "단원 없음"}
              </Typography>
            ) : (
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
            )}
          </Grid>
        </Grid>


        {isReadOnly && (
  <Box display="flex" justifyContent="flex-end" gap={2} mt={1}> 
    <IconButton
      onClick={onStartQuiz}
      sx={{
        background: "linear-gradient(145deg, #ff9800, #ffc107)", // 밝은 그라데이션 색상
        color: "#ffffff",
        borderRadius: "50%", // 원형 버튼
        boxShadow: "0 6px 12px rgba(0, 0, 0, 0.2)", // 더 강한 그림자
        "&:hover": {
          background: "linear-gradient(145deg, #fb8c00, #ff9800)", // 호버 시 더 진한 그라데이션
          boxShadow: "0 8px 14px rgba(0, 0, 0, 0.3)",
        },
        padding: "0.7rem",
        transition: "all 0.3s ease",
      }}
    >
      <PlayArrow sx={{ fontSize: "2rem" }} /> {/* 퀴즈 시작 아이콘 */}
    </IconButton>
    <IconButton
      onClick={onEditQuiz}
      sx={{
        background: "linear-gradient(145deg, #607d8b, #78909c)", // 밝은 회색-블루 그라데이션
        color: "#ffffff",
        borderRadius: "50%", // 원형 버튼
        boxShadow: "0 6px 12px rgba(0, 0, 0, 0.2)",
        "&:hover": {
          background: "linear-gradient(145deg, #546e7a, #607d8b)", // 호버 시 더 진한 색상
          boxShadow: "0 8px 14px rgba(0, 0, 0, 0.3)",
        },
        padding: "0.7rem",
        transition: "all 0.3s ease",
      }}
    >
      <Edit sx={{ fontSize: "1.8rem" }} /> {/* 수정 아이콘 */}
    </IconButton>
  </Box>
)}
      </Box>
    </Box>
  );
};

export default OverviewPanel;