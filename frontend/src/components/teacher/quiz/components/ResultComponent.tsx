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
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>결과를 불러오는 중입니다...</Typography>
      </Box>
    );
  }

  const { overallRanking, questionDetails, quizSummary, quizMetadata } =
    quizResults;

  const handleQuestionSelect = (question: QuestionDetail | null) => {
    setSelectedQuestion(question);
    if (question && currentTab !== 2) {
      // 문제 클릭 시 문제별 분석 탭으로 자동 이동
      setCurrentTab(2);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return "#FFD700"; // Gold
    if (rank === 2) return "#C0C0C0"; // Silver
    if (rank === 3) return "#CD7F32"; // Bronze
    return "inherit";
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
          ? "#4caf50"
          : "#2196f3", // 정답 초록, 오답 파랑
      imageUrl: opt.imageUrl, // 이미지 URL도 데이터에 포함
    }));
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "1200px", // 최대 너비 설정
        margin: "0 auto", // 중앙 정렬
        p: { xs: 1, sm: 2, md: 3 }, // 반응형 패딩
        boxSizing: "border-box",
        backgroundColor: "#f0f2f5",
        minHeight: "100vh",
      }}
    >
      <Paper
        elevation={3}
        sx={{ borderRadius: "16px", overflow: "hidden", mb: 3 }}
      >
        <Box
          sx={{
            p: { xs: 2, md: 3 },
            backgroundColor: "primary.main",
            color: "white",
          }}
        >
          <Typography
            variant="h4"
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
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="subtitle1"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: { xs: "center", md: "flex-start" },
                }}
              >
                <SummarizeIcon sx={{ mr: 1, opacity: 0.8 }} /> 총 문항수:{" "}
                {quizMetadata.totalQuestions}개
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="subtitle1"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: { xs: "center", md: "flex-start" },
                }}
              >
                <LeaderboardIcon sx={{ mr: 1, opacity: 0.8 }} /> 참여 인원:{" "}
                {quizSummary.totalParticipants}명
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography
                variant="subtitle1"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: { xs: "center", md: "flex-start" },
                }}
              >
                <QuestionAnswerIcon sx={{ mr: 1, opacity: 0.8 }} /> 평균 점수:{" "}
                {quizSummary.averageScore.toFixed(1)}점
              </Typography>
            </Grid>
            {quizMetadata.grade && (
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle1">
                  학년: {quizMetadata.grade}
                </Typography>
              </Grid>
            )}
            {quizMetadata.subject && (
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle1">
                  과목: {quizMetadata.subject}
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>

        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          centered
          variant="fullWidth"
          indicatorColor="secondary"
          textColor="secondary"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab icon={<SummarizeIcon />} label="종합 요약" />
          <Tab icon={<LeaderboardIcon />} label="전체 순위" />
          <Tab icon={<QuestionAnswerIcon />} label="문제별 분석" />
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {currentTab === 0 && (
            <Box>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ fontWeight: "medium", mb: 2, textAlign: "center" }}
              >
                퀴즈 요약
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 2,
                      borderRadius: "12px",
                      "&:hover": { boxShadow: 5 },
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ display: "flex", alignItems: "center", mb: 1.5 }}
                    >
                      <DangerousOutlinedIcon color="error" sx={{ mr: 1 }} />{" "}
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
                            borderRadius: "8px",
                            mb: 1,
                            backgroundColor: "rgba(255, 235, 239, 0.5)",
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography
                                variant="body1"
                                component="span"
                                sx={{ fontWeight: "medium" }}
                              >
                                {q.questionText}
                              </Typography>
                            }
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
                      p: 2,
                      borderRadius: "12px",
                      "&:hover": { boxShadow: 5 },
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ display: "flex", alignItems: "center", mb: 1.5 }}
                    >
                      <TrendingUpIcon color="success" sx={{ mr: 1 }} /> 가장
                      쉬웠던 문제 Top 3
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
                            borderRadius: "8px",
                            mb: 1,
                            backgroundColor: "rgba(232, 245, 233, 0.5)",
                          }}
                        >
                          <ListItemText
                            primary={
                              <Typography
                                variant="body1"
                                component="span"
                                sx={{ fontWeight: "medium" }}
                              >
                                {q.questionText}
                              </Typography>
                            }
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
            <Box>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ fontWeight: "medium", mb: 2, textAlign: "center" }}
              >
                🏆 전체 순위 🏆
              </Typography>
              <List>
                {overallRanking.map(
                  (student: OverallRankingStudent, index: number) => (
                    <React.Fragment key={student.studentId}>
                      <ListItem
                        sx={{
                          backgroundColor:
                            index < 3
                              ? `rgba(${parseInt(
                                  getRankColor(student.rank).substring(1, 3),
                                  16
                                )}, ${parseInt(
                                  getRankColor(student.rank).substring(3, 5),
                                  16
                                )}, ${parseInt(
                                  getRankColor(student.rank).substring(5, 7),
                                  16
                                )}, 0.1)`
                              : "background.paper",
                          borderRadius: "8px",
                          mb: 1,
                          boxShadow: index < 3 ? 3 : 1,
                          transition: "transform 0.2s",
                          "&:hover": { transform: "scale(1.02)" },
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor: getRankColor(student.rank),
                              width: 48,
                              height: 48,
                              mr: 1.5,
                            }}
                          >
                            {student.rank === 1 && (
                              <EmojiEventsIcon sx={{ color: "white" }} />
                            )}
                            {student.rank !== 1 && (
                              <Typography
                                sx={{ color: "white", fontWeight: "bold" }}
                              >
                                {student.rank}
                              </Typography>
                            )}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography
                              variant="h6"
                              component="span"
                              sx={{ fontWeight: "medium" }}
                            >
                              {student.name}
                            </Typography>
                          }
                          secondary={
                            student.character
                              ? `캐릭터: ${student.character}`
                              : ""
                          }
                        />
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: "bold",
                            color: getRankColor(student.rank),
                          }}
                        >
                          {student.score}점
                        </Typography>
                      </ListItem>
                      {index < overallRanking.length - 1 && (
                        <Divider
                          variant="inset"
                          component="li"
                          sx={{ mb: 1 }}
                        />
                      )}
                    </React.Fragment>
                  )
                )}
              </List>
            </Box>
          )}

          {currentTab === 2 && (
            <Box>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ fontWeight: "medium", mb: 2, textAlign: "center" }}
              >
                문제별 상세 분석
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="h6" gutterBottom sx={{ mb: 1.5 }}>
                    문제 목록
                  </Typography>
                  <Paper
                    elevation={1}
                    sx={{
                      maxHeight: "60vh",
                      overflowY: "auto",
                      p: 1,
                      borderRadius: "12px",
                    }}
                  >
                    {questionDetails.map((q: QuestionDetail, index: number) => (
                      <ListItemButton
                        key={q.questionId}
                        selected={selectedQuestion?.questionId === q.questionId}
                        onClick={() => handleQuestionSelect(q)}
                        sx={{
                          mb: 1,
                          borderRadius: "8px",
                          border: 1,
                          borderColor:
                            selectedQuestion?.questionId === q.questionId
                              ? "secondary.main"
                              : "divider",
                          backgroundColor:
                            selectedQuestion?.questionId === q.questionId
                              ? "secondary.A100"
                              : "transparent", // A100은 매우 연한 색상, 테마에 따라 조정
                          "&:hover": { backgroundColor: "action.hover" },
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
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: "medium" }}
                          >
                            문제 {index + 1}
                          </Typography>
                          <DifficultyChip rate={q.correctAnswerRate} />
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            // whiteSpace: "nowrap", // 두 줄 이상 표시 위해 주석 처리
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2, // 최대 두 줄
                            WebkitBoxOrient: "vertical",
                            color: "text.secondary",
                            lineHeight: 1.3,
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
                        p: { xs: 2, md: 3 },
                        borderRadius: "12px",
                        height: "100%",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        <Typography variant="h6" sx={{ fontWeight: "medium" }}>
                          Q
                          {questionDetails.findIndex(
                            (q) => q.questionId === selectedQuestion.questionId
                          ) + 1}
                          . {selectedQuestion.questionText}
                        </Typography>
                        <DifficultyChip
                          rate={selectedQuestion.correctAnswerRate}
                        />
                      </Box>

                      {selectedQuestion.imageUrl && (
                        <Box sx={{ my: 2, textAlign: "center" }}>
                          <img
                            src={selectedQuestion.imageUrl}
                            alt="Question Illustration"
                            style={{
                              maxWidth: "100%",
                              maxHeight: "250px",
                              borderRadius: "8px",
                              objectFit: "contain",
                            }}
                          />
                        </Box>
                      )}
                      <Typography
                        variant="body1"
                        sx={{ color: "text.secondary", mb: 2 }}
                      >
                        정답률:{" "}
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: "bold",
                            color:
                              selectedQuestion.correctAnswerRate > 0.7
                                ? "success.main"
                                : selectedQuestion.correctAnswerRate < 0.3
                                ? "error.main"
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
                      <Divider sx={{ my: 2 }} />
                      <Typography
                        variant="subtitle1"
                        sx={{ mt: 2, mb: 1.5, fontWeight: "medium" }}
                      >
                        선택지별 응답 분포
                      </Typography>
                      {/* Recharts 막대 차트로 교체 */}
                      <Box sx={{ height: 300, width: "100%", mb: 2 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={generateChartData(selectedQuestion)}
                            margin={{
                              top: 5,
                              right: 30,
                              left: 20,
                              bottom: 5,
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              type="number"
                              domain={[0, "dataMax + 5"]}
                              allowDecimals={false}
                            />
                            <YAxis
                              dataKey="name"
                              type="category"
                              width={100}
                              tick={{ fontSize: 12 }}
                            />
                            <RechartsTooltip
                              content={<CustomTooltip />}
                              cursor={{ fill: "rgba(200,200,200,0.1)" }}
                            />
                            {/* <Legend /> // 범례는 필요 없을 수 있음 */}
                            <Bar
                              dataKey="응답수"
                              barSize={30}
                              radius={[0, 5, 5, 0]}
                            >
                              {generateChartData(selectedQuestion).map(
                                (entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.fill}
                                  />
                                )
                              )}
                              <LabelList
                                dataKey="응답수"
                                position="right"
                                style={{ fill: "#666", fontSize: 12 }}
                                formatter={(value: number) => `${value}명`}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                      {/* 선택지 텍스트 및 이미지 (차트 아래 또는 옆에 추가 정보로 표시) */}
                      {selectedQuestion.optionDistribution.map((opt) => (
                        <Box
                          key={opt.optionIndex}
                          sx={{ mb: 1, display: "flex", alignItems: "center" }}
                        >
                          {selectedQuestion.options[opt.optionIndex] &&
                            selectedQuestion.correctAnswer.toString() ===
                              opt.optionIndex.toString() && (
                              <CheckCircleOutlineIcon
                                color="success"
                                sx={{ fontSize: "1.1rem", mr: 0.5 }}
                              />
                            )}
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight:
                                selectedQuestion.options[opt.optionIndex] &&
                                selectedQuestion.correctAnswer.toString() ===
                                  opt.optionIndex.toString()
                                  ? "bold"
                                  : "normal",
                              color:
                                selectedQuestion.options[opt.optionIndex] &&
                                selectedQuestion.correctAnswer.toString() ===
                                  opt.optionIndex.toString()
                                  ? "success.dark"
                                  : "text.primary",
                            }}
                          >
                            {opt.text || `옵션 ${opt.optionIndex + 1}`}
                          </Typography>
                          {opt.imageUrl && (
                            <MuiTooltip title="선택지 이미지">
                              <img
                                src={opt.imageUrl}
                                alt={`Option ${opt.optionIndex + 1}`}
                                style={{
                                  width: "30px",
                                  height: "30px",
                                  objectFit: "contain",
                                  marginLeft: "8px",
                                  borderRadius: "4px",
                                  border: "1px solid #eee",
                                }}
                              />
                            </MuiTooltip>
                          )}
                        </Box>
                      ))}
                    </Paper>
                  ) : (
                    <Paper
                      sx={{
                        p: 3,
                        textAlign: "center",
                        borderRadius: "12px",
                        backgroundColor: "grey.100",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <QuestionAnswerIcon
                        sx={{ fontSize: 48, color: "grey.400", mb: 1 }}
                      />
                      <Typography variant="h6" color="textSecondary">
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
            borderTop: "1px solid divider", // 테마의 divider 색상 사용
            backgroundColor: "background.paper", // Paper 컴포넌트의 기본 배경색과 유사하게
          }}
        >
          <Button
            variant="contained"
            color="secondary" // 혹은 "error" 등 상황에 맞게
            onClick={handleEndQuiz}
            disabled={isProcessingEndQuiz}
            sx={{ fontWeight: "bold", px: 3, py: 1.2 }}
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
    </Box>
  );
};

export default ResultComponent;
