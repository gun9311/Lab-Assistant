import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Typography,
  Button,
  Paper,
  Box,
  Snackbar,
  Alert,
  Tooltip,
  Chip,
} from "@mui/material";
import {
  Assistant,
  PlayArrow,
  StopCircle,
  AccessTime,
  InfoOutlined,
  AddAlarm,
} from "@mui/icons-material";
import Chatbot from "../../components/student/Chatbot";
import SubjectSelector from "../../components/student/SubjectSelector";
import { useChatbotContext } from "../../context/ChatbotContext";
import { getChatUsage, ChatUsageData } from "../../utils/api";

const mainSubjects = ["국어", "도덕", "수학", "과학", "사회"];

// 누락된 필드에 대한 툴팁 메시지를 생성하는 헬퍼 함수
const getMissingFieldsMessage = (
  selection: {
    grade: string;
    semester: string;
    subject: string;
    unit: string;
    topic: string;
  },
  mainSubjects: string[]
): string => {
  const missingFields: string[] = [];
  if (!selection.semester) missingFields.push("학기");
  if (!selection.subject) missingFields.push("과목");
  if (mainSubjects.includes(selection.subject) && !selection.unit) {
    missingFields.push("단원");
  }
  if (!selection.topic) missingFields.push("주제");

  if (missingFields.length > 0) {
    return `${missingFields.join(", ")} 항목을 선택해주세요.`;
  }
  return "챗봇 시작 준비 완료!"; // 모든 필드가 채워졌지만 다른 이유로 비활성화된 경우 (현재 로직상 발생 안 함)
};

const StudentHomePage: React.FC = () => {
  const { isChatbotActive, setIsChatbotActive } = useChatbotContext();
  const [selection, setSelection] = useState({
    grade: "",
    semester: "",
    subject: "",
    unit: "",
    topic: "",
  });
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [sessionEndedAlertOpen, setSessionEndedAlertOpen] = useState(false);
  const [chatbotEndAlertOpen, setChatbotEndAlertOpen] = useState(false);
  const [chatUsage, setChatUsage] = useState<ChatUsageData | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);

  const handleSelectionChange = (newSelection: typeof selection) => {
    setSelection(newSelection);
  };

  const handleChatbotStart = () => {
    setIsChatbotActive(true);
    setRemainingTime(900); // 15분 = 900초
  };

  const handleChatbotEnd = () => {
    setIsChatbotActive(false);
    setRemainingTime(null);
  };

  const handleExtendTime = () => {
    setRemainingTime(900); // 시간을 15분으로 연장
  };

  const fetchChatUsage = useCallback(async () => {
    try {
      const response = await getChatUsage();
      setChatUsage(response.data);
      setUsageError(null);
    } catch (error) {
      console.error("Error fetching chat usage:", error);
      setUsageError("챗봇 사용량 정보를 가져오는 데 실패했습니다.");
    }
  }, []);

  useEffect(() => {
    fetchChatUsage();
  }, [fetchChatUsage]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isChatbotActive && remainingTime !== null) {
      timer = setInterval(() => {
        setRemainingTime((prevTime) => {
          if (prevTime !== null && prevTime > 0) {
            return prevTime - 1;
          } else {
            clearInterval(timer);
            handleChatbotEnd();
            setSessionEndedAlertOpen(true);
            return null;
          }
        });
      }, 1000);
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isChatbotActive, remainingTime]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isChatbotActive) {
        event.preventDefault(); // 표준 동작 방지
        event.returnValue =
          "챗봇 세션이 진행 중입니다. 페이지를 나가시겠습니까?"; // 일부 브라우저에서 표시될 메시지
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isChatbotActive]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  // 시작 버튼 활성화 조건 수정 함수는 그대로 사용
  const canStartChatbot = () => {
    const isMainSubject = mainSubjects.includes(selection.subject);
    // 학기, 과목, 주제는 필수
    if (!selection.semester || !selection.subject || !selection.topic) {
      return false;
    }
    // 주요 과목일 경우 단원도 필수
    if (isMainSubject && !selection.unit) {
      return false;
    }
    return true;
  };

  return (
    <Container
      component="main"
      maxWidth={isChatbotActive ? "lg" : "md"}
      sx={{
        mt: { xs: 4, sm: 6, md: 8 },
        mb: { xs: 2, sm: 3, md: 4 },
        px: { xs: 2, sm: 3 },
        fontFamily: "Roboto, sans-serif",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: { xs: 2, sm: 3, md: 4 },
          borderRadius: 2,
        }}
      >
        {!isChatbotActive && (
          <Typography
            variant="h4"
            gutterBottom
            align="center"
            sx={{
              fontFamily: "Montserrat, sans-serif",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontWeight: 600,
              mb: 3,
            }}
          >
            <Assistant sx={{ mr: 1.5, fontSize: "2rem" }} />
            T-BOT
          </Typography>
        )}
        {!isChatbotActive && (
          <Box
            sx={{
              mb: 4, // 아래 시작 버튼과의 간격 유지만 필요
            }}
          >
            {/* SubjectSelector (왼쪽) */}
            <Box sx={{ flexGrow: 1 }}>
              {" "}
              {/* SubjectSelector가 가능한 공간 차지하도록 */}
              <SubjectSelector
                onSelectionChange={handleSelectionChange}
                showTopic={true}
                disabled={isChatbotActive}
                chatUsage={chatUsage}
                usageError={usageError}
              />
            </Box>
          </Box>
        )}
        {!isChatbotActive && (
          <Box textAlign="center" sx={{ mt: 2 }}>
            {/* Tooltip으로 버튼 감싸기 (비활성화 시 안내 제공) */}
            <Tooltip
              title={
                !canStartChatbot()
                  ? getMissingFieldsMessage(selection, mainSubjects)
                  : "" // 조건 충족 시 툴팁 없음
              }
              arrow // 툴팁 화살표 추가
              placement="top" // 툴팁 위치 설정
            >
              {/* 비활성화된 버튼에 Tooltip을 직접 적용하면 이벤트 문제 발생 가능성이 있어 span으로 감쌉니다. */}
              <span>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleChatbotStart}
                  startIcon={<PlayArrow />}
                  size="large"
                  // disabled 속성에 canStartChatbot() 결과의 반대를 적용
                  disabled={!canStartChatbot()}
                  sx={{ py: 1.5, px: 4, fontSize: "1.1rem" }}
                >
                  학습 챗봇 시작하기
                </Button>
              </span>
            </Tooltip>
          </Box>
        )}
        {isChatbotActive && (
          <>
            <Box
              sx={{
                mt: 2,
                mb: 3,
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: { xs: 1, sm: 2 },
                flexWrap: "wrap",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1, sm: 1.5 },
                  flexWrap: "wrap",
                }}
              >
                <Typography
                  variant="h6"
                  color={
                    remainingTime !== null && remainingTime < 60
                      ? "error"
                      : "third"
                  }
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    fontWeight: 500,
                    fontSize: { xs: "1rem", sm: "1.1rem" },
                    mr: { xs: 0, sm: 0.5 },
                  }}
                >
                  <AccessTime sx={{ mr: 0.5 }} />
                  남은 시간: {formatTime(remainingTime || 0)}
                </Typography>

                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleExtendTime}
                  size="small"
                  startIcon={<AddAlarm />}
                  sx={{}}
                >
                  시간 연장
                </Button>
              </Box>

              <Box>
                {chatUsage && !usageError && (
                  <Chip
                    icon={<InfoOutlined />}
                    label={`${chatUsage.dailyRemaining}/${chatUsage.dailyLimit} | ${chatUsage.monthlyRemaining}/${chatUsage.monthlyLimit}`}
                    variant="outlined"
                    color="info"
                    size="small"
                  />
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

            <Chatbot
              grade={selection.grade}
              semester={selection.semester}
              subject={selection.subject}
              unit={selection.unit}
              topic={selection.topic}
              onChatbotEnd={handleChatbotEnd}
              onAlertOpen={() => setChatbotEndAlertOpen(true)}
              setChatUsage={setChatUsage}
              chatUsage={chatUsage}
              sx={{
                height: { xs: "60vh", sm: "65vh" },
                mt: 2,
              }}
            />
          </>
        )}
      </Paper>
      <Snackbar
        open={sessionEndedAlertOpen}
        autoHideDuration={3000}
        onClose={() => setSessionEndedAlertOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ top: { xs: 70, sm: 80 } }}
      >
        <Alert
          onClose={() => setSessionEndedAlertOpen(false)}
          severity="warning"
          sx={{ width: "100%", fontSize: "1rem" }}
          elevation={6}
          variant="filled"
        >
          세션이 종료되었습니다. 계속 학습하려면 새로 시작하세요.
        </Alert>
      </Snackbar>

      <Snackbar
        open={chatbotEndAlertOpen}
        autoHideDuration={3000}
        onClose={() => setChatbotEndAlertOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ top: { xs: 70, sm: 80 } }}
      >
        <Alert
          onClose={() => setChatbotEndAlertOpen(false)}
          severity="success"
          sx={{ width: "100%", fontSize: "1rem" }}
          elevation={6}
          variant="filled"
        >
          대화가 종료되었습니다!
        </Alert>
      </Snackbar>
      {/* 사용량 조회 에러 스낵바 (선택 사항) */}
      <Snackbar
        open={!!usageError}
        autoHideDuration={5000}
        onClose={() => setUsageError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setUsageError(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {usageError}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StudentHomePage;
