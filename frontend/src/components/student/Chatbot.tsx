import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  IconButton,
  Avatar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Mic, MicOff, Send, StopCircle } from "@mui/icons-material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import FaceIcon from "@mui/icons-material/Face";
import { SxProps } from "@mui/system";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMessage = {
  id: number;
  sender: string;
  content: string;
};

type ChatbotProps = {
  grade: string;
  semester: string;
  subject: string;
  unit: string;
  topic: string;
  onChatbotEnd: () => void;
  onAlertOpen: () => void;
  sx?: SxProps;
};

const Chatbot: React.FC<ChatbotProps> = ({
  grade,
  semester,
  subject,
  unit,
  topic,
  onChatbotEnd,
  onAlertOpen,
  sx,
}) => {
  const [message, setMessage] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(
    null
  );
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [errorAlertOpen, setErrorAlertOpen] = useState(false);
  const [isResponding, setIsResponding] = useState<boolean>(false);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentBotMessageIdRef = useRef<number | null>(null);
  const targetBotContentRef = useRef<string>("");

  const messageIdCounter = useRef<number>(0);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const typeCharacter = useCallback(() => {
    if (currentBotMessageIdRef.current === null) {
      return;
    }

    setChatHistory((prevChatHistory) => {
      const currentBotMsgIndex = prevChatHistory.findIndex(
        (msg) => msg.id === currentBotMessageIdRef.current
      );
      if (currentBotMsgIndex === -1) return prevChatHistory;

      const currentMsg = prevChatHistory[currentBotMsgIndex];
      const currentLength = currentMsg.content.length;
      const targetLength = targetBotContentRef.current.length;

      if (currentLength < targetLength) {
        const nextChar = targetBotContentRef.current[currentLength];
        const updatedMsg = {
          ...currentMsg,
          content: currentMsg.content + nextChar,
        };

        typingTimeoutRef.current = setTimeout(typeCharacter, 30);

        return [
          ...prevChatHistory.slice(0, currentBotMsgIndex),
          updatedMsg,
          ...prevChatHistory.slice(currentBotMsgIndex + 1),
        ];
      } else {
        currentBotMessageIdRef.current = null;
        targetBotContentRef.current = "";
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        return prevChatHistory;
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;
    if (!wsUrl || !token) {
      console.error("WebSocket URL or token is missing.");
      setErrorAlertOpen(true);
      return;
    }
    const encodedSubject = encodeURIComponent(subject);

    if (ws) {
      ws.close();
    }

    const newWs = new WebSocket(
      `${wsUrl}/?token=${token}&subject=${encodedSubject}`
    );

    newWs.onopen = () => {
      console.log("WebSocket connection established");
      // setIsResponding(true);
      newWs.send(
        JSON.stringify({
          grade,
          semester,
          subject,
          unit,
          topic,
          userMessage: "",
        })
      );
    };

    newWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          console.error("WebSocket message error:", data.error);
          setErrorAlertOpen(true);
          setIsResponding(false);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
          currentBotMessageIdRef.current = null;
          targetBotContentRef.current = "";
          return;
        }

        const { bot, isFinal } = data;

        if (isFinal) {
          setIsResponding(false);
          const messageIdToFinalize = currentBotMessageIdRef.current;
          const finalContent = targetBotContentRef.current;

          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }

          currentBotMessageIdRef.current = null;
          targetBotContentRef.current = "";

          if (messageIdToFinalize !== null) {
            setChatHistory((prev) =>
              prev.map((msg) =>
                msg.id === messageIdToFinalize && msg.content !== finalContent
                  ? { ...msg, content: finalContent }
                  : msg
              )
            );
          } else if (
            bot !== undefined &&
            bot !== null &&
            typeof bot === "string" &&
            bot.trim()
          ) {
            const newMsgId = messageIdCounter.current++;
            const newBotMessage: ChatMessage = {
              id: newMsgId,
              sender: "챗봇",
              content: bot,
            };
            setChatHistory((prev) => [...prev, newBotMessage]);
          }
        } else if (
          bot !== undefined &&
          bot !== null &&
          typeof bot === "string"
        ) {
          setChatHistory((prevChatHistory) => {
            const lastMessage = prevChatHistory[prevChatHistory.length - 1];

            if (
              lastMessage?.sender === "챗봇" &&
              lastMessage.id === currentBotMessageIdRef.current
            ) {
              targetBotContentRef.current += bot;
              if (!typingTimeoutRef.current) {
                const randomDelay = Math.floor(Math.random() * 21) + 40;
                typingTimeoutRef.current = setTimeout(
                  typeCharacter,
                  randomDelay
                );
              }
            } else {
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
              }

              const newMsgId = messageIdCounter.current++;
              const newBotMessage: ChatMessage = {
                id: newMsgId,
                sender: "챗봇",
                content: "",
              };
              currentBotMessageIdRef.current = newMsgId;
              targetBotContentRef.current = bot;

              const randomDelay = Math.floor(Math.random() * 21) + 40;
              typingTimeoutRef.current = setTimeout(typeCharacter, randomDelay);

              return [...prevChatHistory, newBotMessage];
            }
            return prevChatHistory;
          });
          setIsResponding(true);
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
        setIsResponding(false);
        setErrorAlertOpen(true);
      }
    };

    newWs.onerror = (error) => {
      console.error("[Chatbot] WebSocket error:", error);
      setErrorAlertOpen(true);
      setIsResponding(false);
    };

    newWs.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
      if (!event.wasClean) {
        setErrorAlertOpen(true);
        setIsResponding(false);
      }
    };

    setWs(newWs);

    return () => {
      if (
        newWs &&
        (newWs.readyState === WebSocket.OPEN ||
          newWs.readyState === WebSocket.CONNECTING)
      ) {
        newWs.close();
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [grade, semester, subject, unit, topic]);

  useEffect(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognitionInstance = new SpeechRecognitionAPI();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "ko-KR";

      recognitionInstance.onstart = () => setIsListening(true);
      recognitionInstance.onend = () => setIsListening(false);
      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== "no-speech") {
          setErrorAlertOpen(true);
        }
      };

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setMessage((prev) => prev + finalTranscript + " ");
        }
      };

      setRecognition(recognitionInstance);
    } else {
      console.warn("Speech Recognition API not supported in this browser");
    }
  }, []);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setAlertOpen(true);
      return;
    }

    if (ws && ws.readyState === WebSocket.OPEN && !isResponding) {
      const newMsgId = messageIdCounter.current++;
      const userMessageToSend: ChatMessage = {
        id: newMsgId,
        sender: "사용자",
        content: trimmedMessage,
      };

      setChatHistory((prevChatHistory) => [
        ...prevChatHistory,
        userMessageToSend,
      ]);

      ws.send(
        JSON.stringify({
          grade,
          semester,
          subject,
          unit,
          topic,
          userMessage: trimmedMessage,
        })
      );
      setMessage("");
      setIsResponding(true);

      if (recognition && isListening) {
        recognition.stop();
      }
    } else if (ws?.readyState !== WebSocket.OPEN) {
      console.error("WebSocket is not open. ReadyState:", ws?.readyState);
      setErrorAlertOpen(true);
    }
  }, [
    message,
    ws,
    isResponding,
    recognition,
    isListening,
    grade,
    semester,
    subject,
    unit,
    topic,
  ]);

  const handleSaveChatSummary = useCallback(async () => {
    try {
      setChatHistory([]);
      onChatbotEnd();
      onAlertOpen();
    } catch (error: any) {
      console.error("Error ending chat:", error);
      onChatbotEnd();
    } finally {
      if (
        ws &&
        (ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING)
      ) {
        ws.close();
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  }, [ws, onChatbotEnd, onAlertOpen]);

  const handleStartListening = () => {
    if (recognition && !isListening && !isResponding) {
      setMessage("");
      try {
        recognition.start();
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setErrorAlertOpen(true);
      }
    }
  };

  const handleStopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
    }
  };

  const handleDialogOpen = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = (confirmed: boolean) => {
    setDialogOpen(false);
    if (confirmed) {
      handleSaveChatSummary();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isResponding && message.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Paper
      elevation={2}
      sx={{
        padding: 0,
        mt: 2,
        fontFamily: "inherit",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "#f9f9f9",
        borderRadius: "16px",
        overflow: "hidden",
        ...sx,
      }}
    >
      <Box
        ref={chatBoxRef}
        className="chatbot-response"
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          p: { xs: 1.5, sm: 2 },
          "&::-webkit-scrollbar": { width: "6px" },
          "&::-webkit-scrollbar-track": {
            bgcolor: "transparent",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "grey.300",
            borderRadius: "3px",
          },
          "&::-webkit-scrollbar-thumb:hover": { bgcolor: "grey.400" },
        }}
      >
        {chatHistory.map((chat) => (
          <Box
            key={chat.id}
            sx={{
              display: "flex",
              flexDirection: chat.sender === "사용자" ? "row-reverse" : "row",
              alignItems: "flex-end",
              mb: 1.5,
              maxWidth: "90%",
              ml: chat.sender === "사용자" ? "auto" : 0,
              mr: chat.sender === "챗봇" ? "auto" : 0,
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor:
                  chat.sender === "사용자"
                    ? theme.palette.primary.light
                    : theme.palette.grey[200],
                color:
                  chat.sender === "사용자"
                    ? theme.palette.primary.contrastText
                    : theme.palette.text.primary,
                boxShadow: 1,
                order: chat.sender === "사용자" ? 2 : 1,
                ml: chat.sender === "사용자" ? 1 : 0,
                mr: chat.sender === "챗봇" ? 1 : 0,
              }}
            >
              {chat.sender === "챗봇" ? (
                <SmartToyIcon fontSize="small" />
              ) : (
                <FaceIcon fontSize="small" />
              )}
            </Avatar>
            <Paper
              elevation={0}
              variant="outlined"
              sx={{
                p: { xs: 1.2, sm: 1.5 },
                borderRadius:
                  chat.sender === "사용자"
                    ? "12px 12px 0 12px"
                    : "12px 12px 12px 0",
                bgcolor:
                  chat.sender === "사용자"
                    ? theme.palette.primary.main
                    : theme.palette.background.default,
                color:
                  chat.sender === "사용자"
                    ? theme.palette.primary.contrastText
                    : theme.palette.text.primary,
                maxWidth: "fit-content",
                wordBreak: "break-word",
                fontSize: { xs: "0.9rem", sm: "1rem" },
                lineHeight: 1.6,
                order: chat.sender === "사용자" ? 1 : 2,
                "& p": { my: 0.5 },
                "& ul, & ol": { pl: 2.5, my: 0.5 },
                "& li": { mb: 0.2 },
                "& strong": { fontWeight: 600 },
                "& a": { color: "inherit", textDecoration: "underline" },
                "& pre": {
                  bgcolor: theme.palette.grey[100],
                  p: 1,
                  borderRadius: 1,
                  overflowX: "auto",
                  fontSize: "0.85em",
                },
                "& code": {
                  bgcolor: theme.palette.grey[100],
                  px: 0.5,
                  borderRadius: 0.5,
                  fontSize: "0.85em",
                },
              }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                children={chat.content || ""}
              />
            </Paper>
          </Box>
        ))}
        {isResponding && currentBotMessageIdRef.current === null && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              p: 1,
              ml: 1,
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: theme.palette.grey[200],
                mr: 1,
              }}
            >
              <SmartToyIcon fontSize="small" />
            </Avatar>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              답변을 준비하고 있어요...
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        sx={{
          p: { xs: 1, sm: 1.5 },
          bgcolor: theme.palette.grey[50],
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <TextField
          fullWidth
          multiline
          minRows={isMobile ? 2 : 3}
          maxRows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="챗봇에게 질문하거나 이야기해 보세요!"
          variant="outlined"
          sx={{
            mb: 1.5,
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              fontSize: "1rem",
              bgcolor: "white",
              "& fieldset": {
                borderColor: theme.palette.grey[300],
              },
              "&:hover fieldset": {
                borderColor: theme.palette.primary.main,
              },
              "&.Mui-focused fieldset": {
                borderColor: theme.palette.primary.main,
                borderWidth: "1px",
              },
            },
            "& .MuiInputBase-input::placeholder": {
              color: theme.palette.grey[500],
              opacity: 1,
            },
          }}
          disabled={isResponding}
          onKeyDown={handleKeyDown}
        />
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <IconButton
              onClick={handleStartListening}
              disabled={!recognition || isListening || isResponding}
              color={isListening ? "secondary" : "primary"}
              size={isMobile ? "medium" : "large"}
              sx={{ mr: 0.5 }}
              aria-label="음성 입력 시작"
            >
              <Mic fontSize="inherit" />
            </IconButton>
            <IconButton
              onClick={handleStopListening}
              disabled={!recognition || !isListening}
              color="default"
              size={isMobile ? "medium" : "large"}
              aria-label="음성 입력 중지"
            >
              <MicOff fontSize="inherit" />
            </IconButton>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {isMobile ? (
              <IconButton
                type="submit"
                color="primary"
                size="medium"
                disabled={isResponding || !message.trim()}
                aria-label="전송"
                sx={{
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                <Send fontSize="inherit" />
              </IconButton>
            ) : (
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                endIcon={<Send />}
                sx={{ borderRadius: "8px", fontWeight: "bold" }}
                disabled={isResponding || !message.trim()}
              >
                전송
              </Button>
            )}

            {isMobile ? (
              <IconButton
                color="secondary"
                size="medium"
                onClick={handleDialogOpen}
                aria-label="종료"
                sx={{
                  border: `1px solid ${theme.palette.secondary.main}`,
                  color: "secondary.main",
                }}
              >
                <StopCircle fontSize="inherit" />
              </IconButton>
            ) : (
              <Button
                variant="outlined"
                color="secondary"
                size="large"
                startIcon={<StopCircle />}
                onClick={handleDialogOpen}
                sx={{ borderRadius: "8px" }}
              >
                종료
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={() => handleDialogClose(false)}
        aria-labelledby="end-chat-dialog-title"
        aria-describedby="end-chat-dialog-description"
      >
        <DialogTitle id="end-chat-dialog-title">대화 종료</DialogTitle>
        <DialogContent>
          <DialogContentText id="end-chat-dialog-description">
            정말로 대화를 종료하시겠습니까? <br />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleDialogClose(false)} color="primary">
            취소
          </Button>
          <Button
            onClick={() => handleDialogClose(true)}
            color="secondary"
            autoFocus
          >
            종료
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={alertOpen}
        autoHideDuration={2000}
        onClose={() => setAlertOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setAlertOpen(false)}
          severity="warning"
          sx={{ width: "100%" }}
          variant="filled"
        >
          메시지를 입력해주세요.
        </Alert>
      </Snackbar>

      <Snackbar
        open={errorAlertOpen}
        autoHideDuration={3000}
        onClose={() => setErrorAlertOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setErrorAlertOpen(false)}
          severity="error"
          sx={{ width: "100%" }}
          variant="filled"
        >
          오류가 발생했습니다. 잠시 후 다시 시도해주세요.
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default Chatbot;
