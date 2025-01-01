import React, { useEffect, useRef, useState } from "react";
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { getToken } from "../../../utils/auth";
import QuizQuestionComponent from "./components/QuizQuestion";
import QuizFeedbackComponent from "./components/QuizFeedback";
import WaitingScreenComponent from "./components/WaitingScreen";
import classroom from "../../../../src/assets/calssroom.png";

// 타입 정의 추가
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

const images = require.context("../../../assets/character", false, /\.png$/);
// 파일 이름을 기준으로 정렬하여 배열 생성
const characterImages = images
  .keys()
  .sort((a, b) => {
    const numA = parseInt(a.match(/\d+/)![0], 10);
    const numB = parseInt(b.match(/\d+/)![0], 10);
    return numA - numB;
  })
  .map((key) => images(key));

interface Option {
  text: string;
  imageUrl?: string;
}

interface QuizQuestion {
  questionId: string;
  questionText: string;
  options: Option[]; // 옵션을 객체 배열로 정의
  timeLimit: number;
}

const StudentQuizSessionPage: React.FC = () => {
  const location = useLocation(); // useLocation을 통해 state로 전달된 데이터 받기
  const navigate = useNavigate();
  const { pin, sessionId } = location.state; // state에서 전달된 pin과 sessionId 받기
  const userToken = getToken(); // 사용자 토큰 가져오기

  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(
    null
  );
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null); // 문제 시작 시간 저장
  const [isQuizStarting, setIsQuizStarting] = useState<boolean>(false); // 퀴즈 시작 준비 화면 상태 추가
  const [isPreparingNextQuestion, setIsPreparingNextQuestion] =
    useState<boolean>(false); // 다음 문제 준비 화면 상태 추가
  const [isLastQuestion, setIsLastQuestion] = useState(false); // 마지막 문제 여부
  const [isWaitingForQuizStart, setIsWaitingForQuizStart] =
    useState<boolean>(false); // 교사가 퀴즈 시작을 누르기 전 상태 추가
  const [isReady, setIsReady] = useState<boolean>(false); // 학생 준비 완료 상태 추가
  const [score, setScore] = useState<number>(0);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null); // 피드백 메시지 저장
  const [error, setError] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState<boolean>(false); // 정답 제출 상태 관리
  const [waitingForFeedback, setWaitingForFeedback] = useState<boolean>(false); // 피드백 대기 상태
  const [isFeedbackReceived, setIsFeedbackReceived] = useState<boolean>(false); // 피드백 상태 추가
  const [endTime, setEndTime] = useState<number | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<
    number | string | null
  >(null); // 캐릭터 선택 상태
  const [takenCharacters, setTakenCharacters] = useState<Set<number>>(
    new Set()
  );
  const [isCharacterConfirmed, setIsCharacterConfirmed] =
    useState<boolean>(false); // 캐릭터 선택 완료 상태 추가
  const selectedCharacterRef = useRef<number | string | null>(
    selectedCharacter
  );

  useEffect(() => {
    selectedCharacterRef.current = selectedCharacter;
  }, [selectedCharacter]);

  // 웹소켓 연결 설정
  useEffect(() => {
    if (!pin || !userToken) {
      setError("PIN 또는 사용자 토큰이 누락되었습니다.");
      return;
    }

    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;
    const socket = new WebSocket(`${wsUrl}?token=${userToken}&pin=${pin}`);

    socket.onopen = () => {
      console.log("웹소켓 연결 성공");
      const message = JSON.stringify({ type: "getTakenCharacters" });
      console.log("메시지 준비 완료:", message);

      try {
        socket.send(message);
        console.log(`메시지 전송: ${message}`);
      } catch (error) {
        console.error("메시지 전송 중 오류 발생:", error);
      }
    };

    socket.onmessage = async (message) => {
      let parsedData;

      if (typeof message.data === "string") {
        parsedData = JSON.parse(message.data);
      } else if (message.data instanceof ArrayBuffer) {
        const text = await arrayBufferToString(message.data);
        parsedData = JSON.parse(text);
      } else if (message.data instanceof Blob) {
        const text = await blobToString(message.data);
        parsedData = JSON.parse(text);
      } else {
        console.error("지원되지 않는 메시지 형식입니다.");
        return;
      }

      if (parsedData.type === "takenCharacters") {
        // 서버로부터 받은 선택된 캐릭터 목록을 기존 목록에 추가
        setTakenCharacters((prev) => {
          const updatedSet = new Set(prev);
          parsedData.takenCharacters.forEach((index: number) => {
            updatedSet.add(index);
          });
          return updatedSet;
        });

        // 현재 선택된 캐릭터가 이미 선택된 상태라면 초기화
        if (
          selectedCharacterRef.current !== null &&
          parsedData.takenCharacters.includes(selectedCharacterRef.current)
        ) {
          setSelectedCharacter(null);
        }
      }
      if (parsedData.type === "quizStartingSoon") {
        setIsQuizStarting(true);
        setIsWaitingForQuizStart(false);
      } else if (parsedData.type === "preparingNextQuestion") {
        setIsPreparingNextQuestion(true);
        setIsLastQuestion(parsedData.isLastQuestion);
        setIsFeedbackReceived(false);
        setCurrentQuestion(null);
      } else if (parsedData.type === "newQuestionOptions") {
        setIsQuizStarting(false);
        setIsPreparingNextQuestion(false);
        setCurrentQuestion(parsedData);
        // setTimeLeft(parsedData.timeLimit);
        setEndTime(parsedData.endTime);
        setSelectedAnswer(null);
        setStartTime(Date.now());
        setIsAnswerSubmitted(false);
        setWaitingForFeedback(false);
        setIsFeedbackReceived(false);
      } else if (parsedData.type === "feedback") {
        const feedback = parsedData.correct ? "정답입니다!" : "오답입니다.";
        setScore(parsedData.score);
        if (isLastQuestion) {
          setFeedbackMessage(`${feedback} 최종 점수: ${parsedData.score}`);
        } else {
          setFeedbackMessage(`${feedback} 현재 점수: ${parsedData.score}`);
        }
        setWaitingForFeedback(false);
        setIsFeedbackReceived(true);
      } else if (parsedData.error === "Character already taken") {
        alert("이미 선택된 캐릭터입니다. 다른 캐릭터를 선택하세요.");
      } else if (parsedData.type === "characterSelected") {
        const characterIndex =
          parseInt(parsedData.character.replace("character", "")) - 1;
        setTakenCharacters((prev) => new Set(prev).add(characterIndex));
        // 현재 선택된 캐릭터가 비활성화된 캐릭터라면 선택 해제
        console.log(selectedCharacterRef.current, characterIndex);
        if (selectedCharacterRef.current === characterIndex) {
          console.log("selectedCharacter same");
          setSelectedCharacter(null);
        }
      } else if (parsedData.type === "quizCompleted") {
        navigate(`/quiz-result/${pin}`);
      } else if (parsedData.type === "sessionEnded") {
        navigate("/my-quizzes");
      }
    };

    socket.onerror = (error) => {
      console.error("웹소켓 오류:", error);
      setError("서버와의 연결에 문제가 발생했습니다.");
    };

    socket.onclose = () => {
      console.log("웹소켓 연결 종료");
      navigate("/my-quizzes");
      // setError("서버와의 연결이 종료되었습니다.");
    };

    setWebSocket(socket);

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [pin, userToken, navigate]);

  const arrayBufferToString = (buffer: ArrayBuffer): Promise<string> => {
    return new Promise((resolve) => {
      const decoder = new TextDecoder("utf-8");
      resolve(decoder.decode(buffer));
    });
  };

  const blobToString = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blob);
    });
  };

  useEffect(() => {
    if (!endTime || isAnswerSubmitted) return; // 답변이 제출되면 타이머 중지

    const interval = setInterval(() => {
      const now = Date.now();
      const timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(timeLeft);

      if (timeLeft <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, isAnswerSubmitted]); // isAnswerSubmitted 추가

  useEffect(() => {
    if (
      timeLeft === 0 &&
      webSocket &&
      currentQuestion &&
      startTime &&
      !isAnswerSubmitted
    ) {
      const responseTime = Date.now() - startTime;
      const selectedOptionIndex = selectedAnswer ? selectedAnswer : -1;

      webSocket.send(
        JSON.stringify({
          type: "submitAnswer",
          answerIndex: selectedOptionIndex,
          questionId: currentQuestion.questionId,
          responseTime: responseTime,
        })
      );
      setIsAnswerSubmitted(true);
      setWaitingForFeedback(true);
      setTimeLeft(null);
    }
  }, [
    timeLeft,
    selectedAnswer,
    currentQuestion,
    startTime,
    webSocket,
    isAnswerSubmitted,
  ]);

  const handleCharacterSelect = (index: number) => {
    setSelectedCharacter(index);
  };

  const confirmCharacterSelection = () => {
    if (
      webSocket &&
      webSocket.readyState === WebSocket.OPEN &&
      selectedCharacter !== null
    ) {
      const characterIndex =
        typeof selectedCharacter === "number"
          ? selectedCharacter
          : parseInt(selectedCharacter);
      const message = JSON.stringify({
        type: "characterSelected",
        character: `character${characterIndex + 1}`,
      });
      webSocket.send(message);
      console.log(`캐릭터 선택 메시지 전송: ${message}`);
      setIsCharacterConfirmed(true); // 캐릭터 선택 완료 상태 설정
      setIsReady(true); // 준비 완료 상태 설정
      setIsWaitingForQuizStart(true); // 퀴즈 시작 대기 상태 설정
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer || isAnswerSubmitted) return;
    setIsAnswerSubmitted(true);

    // console.log(index);
    setSelectedAnswer(index);

    if (webSocket && currentQuestion && startTime) {
      const responseTime = Date.now() - startTime;

      webSocket.send(
        JSON.stringify({
          type: "submitAnswer",
          answerIndex: index,
          questionId: currentQuestion.questionId,
          responseTime: responseTime,
        })
      );
      setWaitingForFeedback(true);
      setIsAnswerSubmitted(true);
      if (timeLeft === 0) {
        setTimeLeft(null);
      }
    }
  };

  return (
    <Container
      component="main"
      maxWidth="md"
      sx={{
        mt: 4,
        backgroundImage: `url(${classroom})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "85vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 2,
          borderRadius: "16px",
          backgroundColor: "rgba(255, 255, 255, 0.5)",
        }}
      >
        {!isCharacterConfirmed ? (
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="h6"
              sx={{ fontWeight: "bold", color: "#3f51b5" }}
            >
              캐릭터 선택
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                mt: 2,
                gap: 2,
              }}
            >
              {characterImages.map((characterImage: string, index: number) => (
                <Tooltip
                  key={index}
                  title={
                    takenCharacters.has(index) ? "이미 선택된 캐릭터입니다" : ""
                  }
                  arrow
                >
                  <Button
                    onClick={() => handleCharacterSelect(index)}
                    sx={{
                      width: 80,
                      height: 80,
                      p: 0,
                      filter: takenCharacters.has(index)
                        ? "grayscale(100%)"
                        : "none",
                      opacity: takenCharacters.has(index) ? 0.5 : 1,
                      cursor: takenCharacters.has(index)
                        ? "not-allowed"
                        : "pointer",
                      border:
                        selectedCharacter === index
                          ? "2px solid #4caf50"
                          : "none",
                      transition: "transform 0.2s",
                      "&:hover": { transform: "scale(1.05)" },
                    }}
                    disabled={takenCharacters.has(index)}
                  >
                    <img
                      src={characterImage}
                      alt={`캐릭터 ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </Button>
                </Tooltip>
              ))}
            </Box>
            <Button
              variant="contained"
              color="primary"
              onClick={confirmCharacterSelection}
              sx={{
                mt: 2,
                fontWeight: "bold",
                background: "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)",
                boxShadow: "0 3px 5px 2px rgba(255, 105, 135, .3)",
                "&:hover": {
                  background:
                    "linear-gradient(45deg, #FF8E53 30%, #FE6B8B 90%)",
                },
              }}
              disabled={selectedCharacter === null}
            >
              Ready
            </Button>
          </Box>
        ) : (
          <>
            <WaitingScreenComponent
              isReady={isReady}
              isQuizStarting={isQuizStarting}
              isWaitingForQuizStart={isWaitingForQuizStart}
              isPreparingNextQuestion={isPreparingNextQuestion}
              isLastQuestion={isLastQuestion}
              selectedCharacter={selectedCharacter}
              characterImages={characterImages}
            />

            {currentQuestion && !isFeedbackReceived && (
              <QuizQuestionComponent
                currentQuestion={currentQuestion}
                selectedAnswer={selectedAnswer}
                handleAnswerSelect={handleAnswerSelect}
                timeLeft={timeLeft}
                isAnswerSubmitted={isAnswerSubmitted}
              />
            )}

            {isFeedbackReceived && (
              <QuizFeedbackComponent
                feedbackMessage={feedbackMessage}
                isLastQuestion={isLastQuestion}
                score={score}
              />
            )}

            {waitingForFeedback && (
              <Box sx={{ textAlign: "center", mt: 4 }}>
                <CircularProgress />
                <Typography variant="body1">
                  다른 플레이어를 기다리는 중입니다...
                </Typography>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Container>
  );
};

export default StudentQuizSessionPage;
