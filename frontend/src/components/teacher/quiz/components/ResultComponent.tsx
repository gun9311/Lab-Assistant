// frontend/src/components/teacher/quiz/components/ResultComponent.tsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Tabs,
  Tab,
  Grid,
  CircularProgress,
  Chip,
  Avatar, // Avatar for character
  List, // For ranking list
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider, // Divider for visual separation
  Tooltip as MuiTooltip, // Material-UI의 Tooltip과 이름 충돌 방지
  ListItemButton, // Tooltip for additional info
  LinearProgress, // LinearProgress 추가
  IconButton,
  Dialog, // 추가
} from "@mui/material";
import {
  DetailedResultsPayload,
  QuestionDetail,
  OverallRankingStudent,
  QuizSummary,
  QuizMetadata,
} from "../QuizSession"; // QuizSession.tsx에서 정의한 타입 import (경로 수정 필요할 수 있음)
import LeaderboardIcon from "@mui/icons-material/Leaderboard"; // 전체 순위
import QuestionAnswerIcon from "@mui/icons-material/QuestionAnswer"; // 문제별 분석
import SummarizeIcon from "@mui/icons-material/Summarize"; // 종합 요약
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"; // 정답
import DangerousOutlinedIcon from "@mui/icons-material/DangerousOutlined"; // 오답, 어려운 문제
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents"; // 1등 아이콘
import TrendingUpIcon from "@mui/icons-material/TrendingUp"; // 쉬운 문제
import StarIcon from "@mui/icons-material/Star"; // Podium 강조용
import ZoomIn from "@mui/icons-material/ZoomIn"; // 추가
import CloseIcon from "@mui/icons-material/Close"; // 추가

// Recharts import
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip, // Recharts의 Tooltip
  ResponsiveContainer,
  Cell, // 개별 막대 색상 지정을 위해 Cell import
  LabelList, // 막대 내부에 값 표시
} from "recharts";

// QuestionComponent import 추가
import QuestionComponent from "./Question";

// --- BEGIN: 캐릭터 이미지 로딩 (WaitingPlayers.tsx 참고) ---
declare const require: {
  context: (
    path: string,
    deep?: boolean,
    filter?: RegExp
  ) => {
    keys: () => string[];
    (key: string): string;
  };
};

const characterImageContext = require.context(
  "../../../../assets/character", // 경로 수정: ResultComponent.tsx 기준
  false,
  /\.png$/
);

const characterImages = characterImageContext
  .keys()
  .sort((a: string, b: string) => {
    const numA = parseInt(a.match(/\d+/)![0], 10);
    const numB = parseInt(b.match(/\d+/)![0], 10);
    return numA - numB;
  })
  .map((key: string) => characterImageContext(key));
// --- END: 캐릭터 이미지 로딩 ---

interface ResultComponentProps {
  quizResults: DetailedResultsPayload;
  handleEndQuiz: () => void;
  isProcessingEndQuiz: boolean;
}

const DifficultyChip: React.FC<{ rate: number }> = ({ rate }) => {
  if (rate < 0.3)
    return (
      <Chip
        icon={<DangerousOutlinedIcon />}
        label="매우 어려움"
        color="error"
        size="small"
        variant="outlined"
      />
    );
  if (rate < 0.6)
    return (
      <Chip label="어려움" color="warning" size="small" variant="outlined" />
    );
  if (rate > 0.9)
    return (
      <Chip
        icon={<TrendingUpIcon />}
        label="매우 쉬움"
        color="success"
        size="small"
        variant="outlined"
      />
    );
  if (rate > 0.7)
    return <Chip label="쉬움" color="info" size="small" variant="outlined" />;
  return <Chip label="보통" color="default" size="small" variant="outlined" />;
};

// Recharts Tooltip 커스텀
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Paper
        elevation={3}
        sx={{ p: 1, backgroundColor: "rgba(255,255,255,0.9)" }}
      >
        <Typography
          variant="caption"
          display="block"
          gutterBottom
        >{`선택지: ${label}`}</Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: "bold" }}
        >{`응답 수: ${payload[0].value}명`}</Typography>
        <Typography variant="caption">{`비율: ${payload[0].payload.percentage.toFixed(
          1
        )}%`}</Typography>
      </Paper>
    );
  }
  return null;
};

const ResultComponent: React.FC<ResultComponentProps> = ({
  quizResults,
  handleEndQuiz,
  isProcessingEndQuiz,
}) => {
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedQuestion, setSelectedQuestion] =
    useState<QuestionDetail | null>(null);

  // 문제 크게보기 모달 상태 추가
  const [questionPreviewModal, setQuestionPreviewModal] = useState<{
    open: boolean;
    question: QuestionDetail | null;
  }>({ open: false, question: null });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    setSelectedQuestion(null);
  };

  if (!quizResults) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
        sx={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <CircularProgress color="secondary" />
        <Typography sx={{ ml: 2, color: "white" }}>
          결과를 불러오는 중입니다...
        </Typography>
      </Box>
    );
  }

  const { overallRanking, questionDetails, quizSummary, quizMetadata } =
    quizResults;

  const handleQuestionSelect = (question: QuestionDetail | null) => {
    setSelectedQuestion(question);
    if (question && currentTab !== 2) {
      setCurrentTab(2);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "gold";
    if (rank === 2) return "silver";
    if (rank === 3) return "#CD7F32"; // Bronze
    return "text.primary";
  };

  const getCharacterImage = (characterName: string | undefined) => {
    if (!characterName) return characterImages[0]; // 기본 이미지 또는 fallback
    const index = parseInt(characterName.replace("character", ""), 10) - 1;
    return characterImages[index] || characterImages[0]; // 인덱스 유효성 검사 및 fallback
  };

  // 선택지 분포 차트 데이터 생성 함수
  const generateChartData = (question: QuestionDetail | null) => {
    if (!question) return [];
    return question.optionDistribution.map((opt) => ({
      name: opt.text || `옵션 ${opt.optionIndex + 1}`, // Y축 레이블
      응답수: opt.count, // X축 값 (막대 길이)
      percentage: opt.percentage * 100,
      isCorrect:
        question.correctAnswer?.toString() === opt.optionIndex.toString(),
      fill:
        question.correctAnswer?.toString() === opt.optionIndex.toString()
          ? "rgba(76, 175, 80, 0.8)"
          : "rgba(33, 150, 243, 0.8)",
      imageUrl: opt.imageUrl,
    }));
  };

  const handleQuestionPreview = (question: QuestionDetail) => {
    setQuestionPreviewModal({ open: true, question });
  };

  const handleCloseQuestionPreview = () => {
    setQuestionPreviewModal({ open: false, question: null });
  };

  // QuestionComponent 형식으로 변환하는 함수
  const convertToQuestionFormat = (question: QuestionDetail) => {
    return {
      _id: question.questionId,
      questionText: question.questionText,
      options: question.options.map((opt) => ({
        text: opt.text,
        imageUrl: opt.imageUrl,
      })),
      correctAnswer:
        typeof question.correctAnswer === "string"
          ? parseInt(question.correctAnswer, 10)
          : question.correctAnswer,
      timeLimit: 30, // 기본값
      imageUrl: question.imageUrl,
    };
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "min(90vw, 1800px)",
        margin: "0 auto",
        boxSizing: "border-box",
        minHeight: "unset",
        height: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          borderRadius: "20px",
          overflow: "hidden",
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          width: "100%",
          backdropFilter: "blur(5px)",
        }}
      >
        <Box
          sx={{
            p: { xs: 2, md: 3 },
            backgroundColor: "rgba(25, 118, 210, 0.85)",
            color: "white",
          }}
        >
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{ fontWeight: "bold", textAlign: { xs: "center", md: "left" } }}
          >
            퀴즈 결과: {quizMetadata.title}
          </Typography>
          <Grid
            container
            spacing={2}
            sx={{ textAlign: { xs: "center", md: "left" } }}
          >
            <Grid item xs={12} sm={4}>
              <Typography
                variant="h6"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: { xs: "center", md: "flex-start" },
                }}
              >
                <SummarizeIcon
                  sx={{ mr: 1, opacity: 0.9, fontSize: "1.8rem" }}
                />{" "}
                총 문항수: {quizMetadata.totalQuestions}개
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography
                variant="h6"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: { xs: "center", md: "flex-start" },
                }}
              >
                <LeaderboardIcon
                  sx={{ mr: 1, opacity: 0.9, fontSize: "1.8rem" }}
                />{" "}
                참여 인원: {quizSummary.totalParticipants}명
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography
                variant="h6"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: { xs: "center", md: "flex-start" },
                }}
              >
                <QuestionAnswerIcon
                  sx={{ mr: 1, opacity: 0.9, fontSize: "1.8rem" }}
                />{" "}
                평균 점수: {quizSummary.averageScore.toFixed(1)}점
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          centered
          variant="fullWidth"
          indicatorColor="secondary"
          sx={{
            borderBottom: 1,
            borderColor: "rgba(0, 0, 0, 0.12)",
            "& .MuiTab-root": {
              color: "text.primary",
              opacity: 0.85,
              fontSize: "1rem",
              py: 1.5,
            },
            "& .Mui-selected": {
              color: "secondary.main",
              opacity: 1,
              fontSize: "1.05rem",
            },
          }}
        >
          <Tab icon={<SummarizeIcon />} label="종합 요약" />
          <Tab icon={<LeaderboardIcon />} label="전체 순위" />
          <Tab icon={<QuestionAnswerIcon />} label="문제별 분석" />
        </Tabs>

        <Box
          sx={{
            p: { xs: 2, md: 3 },
            minHeight: "60vh",
          }}
        >
          {currentTab === 0 && (
            <Box>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      borderRadius: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      "&:hover": {
                        boxShadow: 6,
                        backgroundColor: "rgba(255, 255, 255, 0.85)",
                      },
                      height: "100%",
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{ display: "flex", alignItems: "center", mb: 2.5 }}
                    >
                      <DangerousOutlinedIcon
                        color="error"
                        sx={{ mr: 1.5, fontSize: "2.5rem" }}
                      />{" "}
                      가장 어려웠던 문제 Top 3
                    </Typography>
                    <List disablePadding>
                      {quizSummary.mostDifficultQuestions.map((q) => (
                        <ListItemButton
                          key={q.questionId}
                          onClick={() =>
                            handleQuestionSelect(
                              questionDetails.find(
                                (qd) => qd.questionId === q.questionId
                              ) || null
                            )
                          }
                          sx={{
                            borderRadius: "10px",
                            mb: 2,
                            p: 2,
                            backgroundColor: "rgba(255, 235, 239, 0.65)",
                            "&:hover": {
                              backgroundColor: "rgba(255, 235, 239, 0.85)",
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography
                                variant="h6"
                                component="span"
                                sx={{
                                  fontWeight: "medium",
                                  display: "block",
                                  mb: 0.8,
                                  lineHeight: 1.4,
                                }}
                              >
                                {q.questionText}
                              </Typography>
                            }
                            secondaryTypographyProps={{ variant: "subtitle1" }}
                            secondary={`정답률: ${(
                              q.correctAnswerRate * 100
                            ).toFixed(1)}%`}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      borderRadius: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.8)",
                      "&:hover": {
                        boxShadow: 6,
                        backgroundColor: "rgba(255, 255, 255, 0.85)",
                      },
                      height: "100%",
                    }}
                  >
                    <Typography
                      variant="h4"
                      sx={{ display: "flex", alignItems: "center", mb: 2.5 }}
                    >
                      <TrendingUpIcon
                        color="success"
                        sx={{ mr: 1.5, fontSize: "2.5rem" }}
                      />{" "}
                      가장 쉬웠던 문제 Top 3
                    </Typography>
                    <List disablePadding>
                      {quizSummary.easiestQuestions.map((q) => (
                        <ListItemButton
                          key={q.questionId}
                          onClick={() =>
                            handleQuestionSelect(
                              questionDetails.find(
                                (qd) => qd.questionId === q.questionId
                              ) || null
                            )
                          }
                          sx={{
                            borderRadius: "10px",
                            mb: 2,
                            p: 2,
                            backgroundColor: "rgba(232, 245, 233, 0.65)",
                            "&:hover": {
                              backgroundColor: "rgba(232, 245, 233, 0.85)",
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography
                                variant="h6"
                                component="span"
                                sx={{
                                  fontWeight: "medium",
                                  display: "block",
                                  mb: 0.8,
                                  lineHeight: 1.4,
                                }}
                              >
                                {q.questionText}
                              </Typography>
                            }
                            secondaryTypographyProps={{ variant: "subtitle1" }}
                            secondary={`정답률: ${(
                              q.correctAnswerRate * 100
                            ).toFixed(1)}%`}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {currentTab === 1 && (
            <Box sx={{ textAlign: "center" }}>
              <Box sx={{ maxHeight: "60vh", overflowY: "auto", pr: 1, pt: 2 }}>
                <Grid container spacing={2.5} justifyContent="center">
                  {overallRanking.map((student) => {
                    const isTopThree = student.rank >= 1 && student.rank <= 3;
                    let cardSx: any = {
                      p: 2,
                      textAlign: "center",
                      borderRadius: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.75)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      height: "100%",
                      transition:
                        "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
                      "&:hover": {
                        transform: "scale(1.015)",
                        boxShadow: (theme: any) => theme.shadows[6],
                        zIndex: 2,
                      },
                      position: "relative",
                      border: "1px solid transparent",
                    };

                    let avatarBorder = "none";
                    let crownIcon = null;

                    if (student.rank === 1) {
                      cardSx.backgroundColor = "rgba(255, 215, 0, 0.20)";
                      cardSx.borderColor = "rgba(255, 215, 0, 0.6)";
                      avatarBorder = "3px solid gold";
                      crownIcon = "👑";
                    } else if (student.rank === 2) {
                      cardSx.backgroundColor = "rgba(192, 192, 192, 0.20)";
                      cardSx.borderColor = "rgba(192, 192, 192, 0.6)";
                      avatarBorder = "2px solid silver";
                      crownIcon = "🥈";
                    } else if (student.rank === 3) {
                      cardSx.backgroundColor = "rgba(205, 127, 50, 0.20)";
                      cardSx.borderColor = "rgba(205, 127, 50, 0.6)";
                      avatarBorder = "2px solid #CD7F32";
                      crownIcon = "🥉";
                    }

                    return (
                      <Grid
                        item
                        key={student.studentId}
                        xs={6}
                        sm={4}
                        md={3}
                        lg={3}
                      >
                        <Paper sx={cardSx}>
                          {isTopThree && crownIcon && (
                            <Typography
                              component="span"
                              sx={(theme) => ({
                                fontSize:
                                  student.rank === 1
                                    ? "2.2rem"
                                    : student.rank === 2
                                    ? "2rem"
                                    : "1.9rem",
                                position: "absolute",
                                top: theme.spacing(0.5),
                                left: theme.spacing(1),
                                zIndex: 1,
                              })}
                            >
                              {crownIcon}
                            </Typography>
                          )}
                          <Typography
                            variant="h5"
                            sx={{
                              fontWeight: "bold",
                              color: "text.secondary",
                              mt: isTopThree ? 4 : 0.8,
                              mb: 0.8,
                            }}
                          >
                            {student.rank}위
                          </Typography>
                          <Avatar
                            src={getCharacterImage(student.character)}
                            alt={student.name || "학생"}
                            sx={{
                              width: 65,
                              height: 65,
                              my: 0.8,
                              border: avatarBorder,
                            }}
                          />
                          <Typography
                            variant="h6"
                            title={student.name}
                            sx={{
                              fontWeight: "medium",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              width: "calc(100% - 16px)",
                              px: 1,
                              mb: 0.5,
                            }}
                          >
                            {student.name}
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: "bold",
                              color: "primary.main",
                              mt: "auto",
                              pb: 0.5,
                            }}
                          >
                            {student.score}점
                          </Typography>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            </Box>
          )}

          {currentTab === 2 && (
            <Box>
              <Grid container spacing={3.5}>
                <Grid item xs={12} md={4}>
                  <Paper
                    elevation={1}
                    sx={{
                      maxHeight: "calc(100vh - 280px)",
                      overflowY: "auto",
                      p: 1.5,
                      borderRadius: "12px",
                      backgroundColor: "rgba(255, 255, 255, 0.7)",
                    }}
                  >
                    {questionDetails.map((q: QuestionDetail, index: number) => (
                      <ListItemButton
                        key={q.questionId}
                        selected={selectedQuestion?.questionId === q.questionId}
                        onClick={() => handleQuestionSelect(q)}
                        sx={{
                          mb: 1.5,
                          p: 1.5,
                          borderRadius: "10px",
                          border: 1,
                          borderColor:
                            selectedQuestion?.questionId === q.questionId
                              ? "secondary.main"
                              : "rgba(0,0,0,0.1)",
                          backgroundColor:
                            selectedQuestion?.questionId === q.questionId
                              ? "rgba(103, 58, 183, 0.2)"
                              : "rgba(255,255,255,0.4)",
                          "&:hover": { backgroundColor: "rgba(0,0,0,0.08)" },
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            width: "100%",
                            alignItems: "center",
                            mb: 0.8,
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: "medium" }}
                          >
                            문제 {index + 1}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              alignItems: "center",
                            }}
                          >
                            <DifficultyChip rate={q.correctAnswerRate} />
                            {/* 크게보기 버튼 추가 */}
                            <MuiTooltip title="문제 크게보기" arrow>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuestionPreview(q);
                                }}
                                sx={{
                                  color: "primary.main",
                                  "&:hover": {
                                    backgroundColor: "primary.light",
                                    color: "white",
                                  },
                                }}
                              >
                                <ZoomIn fontSize="small" />
                              </IconButton>
                            </MuiTooltip>
                          </Box>
                        </Box>
                        <Typography
                          variant="body1"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            color: "text.secondary",
                            lineHeight: 1.4,
                          }}
                        >
                          {q.questionText}
                        </Typography>
                      </ListItemButton>
                    ))}
                  </Paper>
                </Grid>
                <Grid item xs={12} md={8}>
                  {selectedQuestion ? (
                    <Paper
                      elevation={2}
                      sx={{
                        p: { xs: 2.5, md: 3.5 },
                        borderRadius: "12px",
                        height: "100%",
                        backgroundColor: "rgba(255, 255, 255, 0.8)",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          mb: 2,
                        }}
                      >
                        <Typography
                          variant="h4"
                          sx={{ fontWeight: "bold", mr: 2.5, lineHeight: 1.3 }}
                        >
                          Q
                          {questionDetails.findIndex(
                            (q) => q.questionId === selectedQuestion.questionId
                          ) + 1}
                          . {selectedQuestion.questionText}
                        </Typography>
                        <Box
                          sx={{ display: "flex", gap: 1, alignItems: "center" }}
                        >
                          <DifficultyChip
                            rate={selectedQuestion.correctAnswerRate}
                          />
                          <MuiTooltip title="문제 크게보기" arrow>
                            <IconButton
                              onClick={() =>
                                handleQuestionPreview(selectedQuestion)
                              }
                              sx={{
                                color: "primary.main",
                                "&:hover": {
                                  backgroundColor: "primary.light",
                                  color: "white",
                                },
                              }}
                            >
                              <ZoomIn />
                            </IconButton>
                          </MuiTooltip>
                        </Box>
                      </Box>

                      {selectedQuestion.imageUrl && (
                        <Box sx={{ my: 3, textAlign: "center" }}>
                          <img
                            src={selectedQuestion.imageUrl}
                            alt="Question Illustration"
                            style={{
                              maxWidth: "100%",
                              maxHeight: "350px",
                              borderRadius: "10px",
                              objectFit: "contain",
                              backgroundColor: "rgba(255,255,255,0.5)",
                              padding: "5px",
                            }}
                          />
                        </Box>
                      )}
                      <Typography
                        variant="h6"
                        sx={{ color: "text.secondary", mb: 3 }}
                      >
                        정답률:{" "}
                        <Typography
                          component="span"
                          variant="h6"
                          sx={{
                            fontWeight: "bold",
                            color:
                              selectedQuestion.correctAnswerRate > 0.7
                                ? "success.dark"
                                : selectedQuestion.correctAnswerRate < 0.3
                                ? "error.dark"
                                : "text.primary",
                          }}
                        >
                          {(selectedQuestion.correctAnswerRate * 100).toFixed(
                            1
                          )}
                          %
                        </Typography>{" "}
                        (총 {selectedQuestion.totalAttempts}명 응답)
                      </Typography>
                      <Divider sx={{ my: 3, borderColor: "rgba(0,0,0,0.1)" }} />
                      <Grid container spacing={3}>
                        {selectedQuestion.optionDistribution
                          .sort((a, b) => a.optionIndex - b.optionIndex)
                          .map((dist) => {
                            const optionContent =
                              selectedQuestion.options[dist.optionIndex];
                            if (!optionContent) {
                              return (
                                <Grid
                                  item
                                  xs={12}
                                  sm={6}
                                  key={dist.optionIndex}
                                >
                                  <Paper
                                    sx={{
                                      p: 2.5,
                                      borderRadius: "12px",
                                      backgroundColor: "rgba(220,220,220,0.7)",
                                    }}
                                  >
                                    <Typography variant="h6">
                                      옵션 {dist.optionIndex + 1} 정보 없음
                                    </Typography>
                                    <Typography variant="body1">
                                      응답: {dist.count}명 (
                                      {(dist.percentage * 100).toFixed(1)}%)
                                    </Typography>
                                  </Paper>
                                </Grid>
                              );
                            }

                            const percentage = dist.percentage * 100;
                            const count = dist.count;
                            const isCorrect =
                              selectedQuestion.correctAnswer.toString() ===
                              dist.optionIndex.toString();

                            return (
                              <Grid item xs={12} sm={6} key={dist.optionIndex}>
                                <Paper
                                  elevation={isCorrect ? 5 : 3}
                                  sx={{
                                    p: 3,
                                    borderRadius: "14px",
                                    border: "1px solid",
                                    borderColor: isCorrect
                                      ? "success.dark"
                                      : "rgba(0,0,0,0.2)",
                                    backgroundColor: isCorrect
                                      ? "rgba(202, 239, 204, 0.7)"
                                      : "rgba(255, 255, 255, 0.9)",
                                    display: "flex",
                                    flexDirection: "column",
                                    height: "100%",
                                    transition: "all 0.2s ease-in-out",
                                    "&:hover": {
                                      borderColor: isCorrect
                                        ? "success.dark"
                                        : "primary.dark",
                                      boxShadow: (theme) =>
                                        theme.shadows[isCorrect ? 7 : 5],
                                    },
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      mb: 1.8,
                                      minHeight: "2.5em",
                                    }}
                                  >
                                    {isCorrect && (
                                      <CheckCircleOutlineIcon
                                        color="success"
                                        sx={{
                                          mr: 1.2,
                                          fontSize: "1.8rem",
                                          mt: "3px",
                                        }}
                                      />
                                    )}
                                    <Typography
                                      variant="h5"
                                      component="div"
                                      sx={{
                                        fontWeight: "medium",
                                        flexGrow: 1,
                                        lineHeight: 1.35,
                                      }}
                                    >
                                      {String.fromCharCode(
                                        65 + dist.optionIndex
                                      )}
                                      . {optionContent.text}
                                    </Typography>
                                  </Box>

                                  {optionContent.imageUrl && (
                                    <Box
                                      sx={{
                                        my: 2.5,
                                        textAlign: "center",
                                        flexShrink: 0,
                                      }}
                                    >
                                      <img
                                        src={optionContent.imageUrl}
                                        alt={`선택지 ${
                                          dist.optionIndex + 1
                                        } 이미지`}
                                        style={{
                                          maxWidth: "95%",
                                          maxHeight: "140px",
                                          borderRadius: "10px",
                                          objectFit: "contain",
                                          border: "1px solid rgba(0,0,0,0.15)",
                                          padding: "3px",
                                          backgroundColor:
                                            "rgba(250,250,250,0.6)",
                                        }}
                                      />
                                    </Box>
                                  )}

                                  <Box sx={{ mt: "auto", pt: 2 }}>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        width: "100%",
                                        mb: 1,
                                      }}
                                    >
                                      <Box sx={{ width: "100%", mr: 2 }}>
                                        <LinearProgress
                                          variant="determinate"
                                          value={percentage}
                                          color={
                                            isCorrect ? "success" : "primary"
                                          }
                                          sx={{
                                            height: 16,
                                            borderRadius: 8,
                                            backgroundColor: "rgba(0,0,0,0.15)",
                                          }}
                                        />
                                      </Box>
                                      <Typography
                                        variant="h6"
                                        sx={{
                                          whiteSpace: "nowrap",
                                          fontWeight: "medium",
                                        }}
                                      >
                                        {`${percentage.toFixed(1)}%`}
                                      </Typography>
                                    </Box>
                                    <Typography
                                      variant="subtitle1"
                                      color="text.secondary"
                                      sx={{
                                        textAlign: "right",
                                        display: "block",
                                      }}
                                    >
                                      {count}명 선택
                                    </Typography>
                                  </Box>
                                </Paper>
                              </Grid>
                            );
                          })}
                      </Grid>
                    </Paper>
                  ) : (
                    <Paper
                      sx={{
                        p: 3,
                        textAlign: "center",
                        borderRadius: "12px",
                        backgroundColor: "rgba(224, 224, 224, 0.75)",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <QuestionAnswerIcon
                        sx={{ fontSize: 48, color: "grey.500", mb: 1 }}
                      />
                      <Typography variant="h6" color="text.secondary">
                        문제 목록에서 분석할 문제를 선택하세요.
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        좌측 목록에서 문제를 클릭하면 상세 분석 내용을 볼 수
                        있습니다.
                      </Typography>
                    </Paper>
                  )}
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "flex-end",
            borderTop: "1px solid rgba(0,0,0,0.12)",
            backgroundColor: "rgba(255, 255, 255, 0.85)",
          }}
        >
          <Button
            variant="contained"
            color="secondary"
            onClick={handleEndQuiz}
            disabled={isProcessingEndQuiz}
            sx={{
              fontWeight: "bold",
              px: 3,
              py: 1.2,
              boxShadow: 3,
              "&:hover": { boxShadow: 5 },
            }}
            startIcon={
              isProcessingEndQuiz ? (
                <CircularProgress size={20} color="inherit" />
              ) : null
            }
          >
            {isProcessingEndQuiz ? "종료 중..." : "퀴즈 종료 및 결과 저장"}
          </Button>
        </Box>
      </Paper>

      {/* 문제 크게보기 모달 추가 */}
      <Dialog
        fullScreen
        open={questionPreviewModal.open}
        onClose={handleCloseQuestionPreview}
        PaperProps={{
          sx: {
            backgroundImage: `url(/assets/quiz-theme/quiz_theme${
              Math.floor(Math.random() * 15) + 1
            }.png)`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          },
        }}
      >
        {/* 상단 바 */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: { xs: "0.5rem 1rem", sm: "1rem 2rem" },
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            color: "#fff",
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: "bold",
              fontSize: { xs: "1.2rem", sm: "1.5rem" },
            }}
          >
            문제 크게보기
          </Typography>
          <IconButton
            onClick={handleCloseQuestionPreview}
            sx={{ color: "#fff" }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* 문제 내용 */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            flexGrow: 1,
            padding: "0",
          }}
        >
          {selectedQuestion && (
            <QuestionComponent
              currentQuestion={convertToQuestionFormat(selectedQuestion)}
              allSubmitted={true}
              isPreview={true}
            />
          )}
        </Box>
      </Dialog>
    </Box>
  );
};

export default ResultComponent;
