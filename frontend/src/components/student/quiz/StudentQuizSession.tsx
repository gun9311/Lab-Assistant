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
import { keyframes } from "@mui/system";
// import { useAuth } from "../../../context/AuthContext";
// import FeedbackComponent from "./components/FeedbackComponent";

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

const zoomInAndFadeOut = keyframes`
  0% { transform: scale(0.5) translateX(-50%); opacity: 0; }
  20% { transform: scale(1.1) translateX(-50%); opacity: 1; }
  40% { transform: scale(1) translateX(-50%); opacity: 1; }
  80% { transform: scale(1) translateX(-50%); opacity: 1; }
  100% { transform: scale(1) translateX(-50%); opacity: 0; }
`;

interface Feedback {
  correct: boolean;
  score: number;
  teamScore: number;
  totalQuestions: number;
}

const StudentQuizSessionPage: React.FC = () => {
  const location = useLocation(); // useLocation을 통해 state로 전달된 데이터 받기
  const navigate = useNavigate();
  const { pin, sessionId } = location.state; // state에서 전달된 pin과 sessionId 받기
  const userToken = getToken(); // 사용자 토큰 가져오기
  // const { user } = useAuth();

  const [webSocket, setWebSocket] = useState<WebSocket | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(
    null
  );
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
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
  const [isProcessingCharacterSelection, setIsProcessingCharacterSelection] =
    useState<boolean>(false); // 로딩 상태 추가
  const isCharacterFinalizedByServer = useRef(false); // 새로운 ref 추가
  const [isQuestionVisible, setIsQuestionVisible] = useState(false);
  const [timeLeftNotification, setTimeLeftNotification] = useState<
    string | null
  >(null);

  // 🎭 새로운 상태: 이 세션에서 사용 가능한 캐릭터 인덱스 배열
  const [availableCharacters, setAvailableCharacters] = useState<number[]>([]);
  const [availableCharacterImages, setAvailableCharacterImages] = useState<
    string[]
  >([]);

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
    const socket = new WebSocket(`${wsUrl}/?token=${userToken}&pin=${pin}`);

    socket.onopen = () => {
      console.log("웹소켓 연결 성공");
      // getTakenCharacters는 더 이상 필요 없음 - 서버가 자동으로 availableCharacters를 보내줌
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

      console.log("Received message from server:", parsedData);
      setIsProcessingCharacterSelection(false);

      // 🎭 새로운 메시지 타입: 캐릭터 데이터 (available + taken)
      if (parsedData.type === "characterData") {
        console.log("Character data received:", parsedData);

        // availableCharacters 설정
        setAvailableCharacters(parsedData.availableCharacters);

        // 사용 가능한 캐릭터 이미지만 필터링
        const filteredImages = parsedData.availableCharacters.map(
          (index: number) => characterImages[index]
        );
        setAvailableCharacterImages(filteredImages);

        // takenCharacters 설정 (타입 명시)
        const takenSet = new Set<number>(
          parsedData.takenCharacters as number[]
        );
        setTakenCharacters(takenSet);

        console.log(
          `Session has ${
            parsedData.availableCharacters.length
          } available characters: [${parsedData.availableCharacters.join(
            ", "
          )}]`
        );
        console.log(
          `Already taken characters: [${parsedData.takenCharacters.join(", ")}]`
        );
      } else if (parsedData.type === "availableCharacters") {
        // 이전 방식 호환성을 위해 유지 (제거 예정)
        console.log("Available characters received:", parsedData.characters);
        setAvailableCharacters(parsedData.characters);

        const filteredImages = parsedData.characters.map(
          (index: number) => characterImages[index]
        );
        setAvailableCharacterImages(filteredImages);

        console.log(
          `Session has ${
            parsedData.characters.length
          } available characters: [${parsedData.characters.join(", ")}]`
        );
      } else if (parsedData.type === "takenCharacters") {
        // 이전 방식 호환성을 위해 유지하되, 더 안전하게 처리
        console.log(
          "[takenCharacters] Received taken characters:",
          parsedData.takenCharacters
        );

        setTakenCharacters((prev) => {
          const updatedSet = new Set(prev);
          parsedData.takenCharacters.forEach((index: number) => {
            updatedSet.add(index);
          });
          return updatedSet;
        });
      } else if (parsedData.type === "characterSelected") {
        const characterIndex =
          parseInt(parsedData.character.replace("character", "")) - 1;

        // ✅ availableCharacters 체크 제거 - 서버에서 보낸 것은 신뢰
        setTakenCharacters((prev) => new Set(prev).add(characterIndex));

        console.log(
          `[characterSelected broadcast] Char ${characterIndex} taken and UI updated.`
        );
      } else if (parsedData.type === "characterAcknowledged") {
        console.log("Character selection acknowledged by server:", parsedData);
        setIsProcessingCharacterSelection(false);
        setIsCharacterConfirmed(true);
        isCharacterFinalizedByServer.current = true; // 이 시점부터 내 캐릭터는 서버가 확정한 것.
        setIsWaitingForQuizStart(true);

        if (parsedData.character) {
          const characterIdentifier = parsedData.character;
          const match = characterIdentifier.match(/\d+/);
          if (match) {
            const characterNumber = parseInt(match[0], 10);
            const characterIndex = characterNumber - 1;
            if (
              !isNaN(characterIndex) &&
              characterIndex >= 0 &&
              characterIndex < characterImages.length
            ) {
              setSelectedCharacter(characterIndex); // 서버가 확정한 값으로 설정
              console.log(
                `Set selectedCharacter to index ${characterIndex} from server value ${characterIdentifier}`
              );
            } else {
              // 이 경우는 selectedCharacter를 변경하지 않거나, 에러 처리가 필요할 수 있음
              console.warn(
                `Could not parse valid character index from server: ${characterIdentifier}. Local selection: ${selectedCharacterRef.current}`
              );
              // 만약 selectedCharacterRef.current에 유효한 값이 있다면 그것을 유지하거나,
              // 아니면 서버 에러로 간주하고 캐릭터 선택 화면으로 돌려보내는 등의 처리가 필요.
              // 여기서는 일단 로컬 선택을 믿어본다.
              if (
                selectedCharacterRef.current !== null &&
                typeof selectedCharacterRef.current === "number"
              ) {
                setSelectedCharacter(selectedCharacterRef.current);
              }
            }
          } else {
            console.warn(
              `Character string from server does not contain a number: ${characterIdentifier}. Local selection: ${selectedCharacterRef.current}`
            );
            if (
              selectedCharacterRef.current !== null &&
              typeof selectedCharacterRef.current === "number"
            ) {
              setSelectedCharacter(selectedCharacterRef.current);
            }
          }
        } else {
          // characterAcknowledged 메시지에 character 필드가 없는 경우
          // 이것은 서버가 학생의 현재 선택을 "그대로 인정한다"는 의미일 수도 있고,
          // 아니면 오류일 수도 있다. 여기서는 학생이 UI에서 선택한 값을 유지하도록 한다.
          if (
            selectedCharacterRef.current !== null &&
            typeof selectedCharacterRef.current === "number"
          ) {
            setSelectedCharacter(selectedCharacterRef.current);
            console.warn(
              `characterAcknowledged received without character. Using locally selected: ${selectedCharacterRef.current}`
            );
          } else {
            // 이 경우는 심각한 오류일 수 있으므로, 사용자에게 알리거나 캐릭터 선택을 다시 유도해야 할 수 있다.
            console.error(
              "characterAcknowledged received without character, and no local selection to fallback. Character might not be set."
            );
            // 필요하다면 여기서 캐릭터 선택 UI로 돌려보내는 로직 추가
            // setIsCharacterConfirmed(false);
            // isCharacterFinalizedByServer.current = false;
          }
        }
      } else if (parsedData.type === "quizStartingSoon") {
        setIsQuizStarting(true);
        setIsWaitingForQuizStart(false);
      } else if (parsedData.type === "preparingNextQuestion") {
        setIsWaitingForQuizStart(false);
        setIsPreparingNextQuestion(true);
        setIsLastQuestion(parsedData.isLastQuestion);
        setIsFeedbackReceived(false);
        setCurrentQuestion(null);
      } else if (parsedData.type === "newQuestionOptions") {
        setIsWaitingForQuizStart(false);
        setIsQuizStarting(false);
        setIsPreparingNextQuestion(false);
        setCurrentQuestion(parsedData);
        setSelectedAnswer(null);
        setIsAnswerSubmitted(false);
        setWaitingForFeedback(false);
        setIsFeedbackReceived(false);
        setIsQuestionVisible(true);
        setTimeLeftNotification(null); // 새 질문 시작 시 알림 초기화
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
        setTimeLeftNotification(null); // 피드백 표시 시 알림 초기화
      } else if (parsedData.error === "Character already taken") {
        alert("이미 선택된 캐릭터입니다. 다른 캐릭터를 선택하세요.");
        setSelectedCharacter(null);
        setIsCharacterConfirmed(false); // UI를 다시 캐릭터 선택으로
        isCharacterFinalizedByServer.current = false; // 서버 확정 취소
        setIsWaitingForQuizStart(false);
      } else if (parsedData.type === "quizCompleted") {
        navigate(`/quiz-result/${pin}`);
      } else if (parsedData.type === "sessionEnded") {
        navigate("/my-quizzes");
      } else if (parsedData.error) {
        alert(`오류: ${parsedData.error}`);
        setIsCharacterConfirmed(false);
        setIsWaitingForQuizStart(false);
      } else if (parsedData.type === "timeLeft") {
        setTimeLeftNotification("마감 임박!");
        // 3초 후에 자동으로 알림을 숨깁니다.
        setTimeout(() => {
          setTimeLeftNotification(null);
        }, 3000);
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
  }, [pin, userToken, navigate]); // availableCharacters 제거!

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

  const handleCharacterSelect = (index: number) => {
    setSelectedCharacter(index);
  };

  const confirmCharacterSelection = () => {
    if (
      webSocket &&
      webSocket.readyState === WebSocket.OPEN &&
      selectedCharacter !== null &&
      !isProcessingCharacterSelection // 처리 중이 아닐 때만 요청
    ) {
      setIsProcessingCharacterSelection(true); // 요청 시작 시 로딩 상태 true
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
    }
  };

  const handleAnswerSelect = (index: number) => {
    if (selectedAnswer || isAnswerSubmitted) return;
    setIsAnswerSubmitted(true);

    // console.log(index);
    setSelectedAnswer(index);

    if (webSocket && currentQuestion) {
      // const responseTime = Date.now() - startTime; // 더 이상 responseTime을 클라이언트에서 계산하지 않음

      webSocket.send(
        JSON.stringify({
          type: "submitAnswer",
          answerIndex: index,
          questionId: currentQuestion.questionId,
          // responseTime: responseTime,
        })
      );
      setWaitingForFeedback(true);
      setIsAnswerSubmitted(true);
      // if (timeLeft === 0) {
      //   setTimeLeft(null);
      // }
    }
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        width: "100vw",
        backgroundImage: `url(${classroom})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: { xs: 1, sm: 2 },
        boxSizing: "border-box",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 2,
          borderRadius: "16px",
          backgroundColor: "rgba(255, 255, 255, 0.5)",
          transition: "all 0.4s ease-in-out",
          width: { xs: "95vw", sm: isQuestionVisible ? "70vw" : "auto" },
          maxWidth: isQuestionVisible ? "800px" : "500px",
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
              {availableCharacterImages.length > 0 ? (
                availableCharacterImages.map(
                  (characterImage: string, displayIndex: number) => {
                    const actualIndex = availableCharacters[displayIndex]; // 실제 캐릭터 인덱스
                    return (
                      <Tooltip
                        key={actualIndex}
                        title={
                          takenCharacters.has(actualIndex)
                            ? "이미 선택된 캐릭터입니다"
                            : ""
                        }
                        arrow
                      >
                        <Button
                          onClick={() => handleCharacterSelect(actualIndex)}
                          sx={{
                            width: 80,
                            height: 80,
                            p: 0,
                            filter: takenCharacters.has(actualIndex)
                              ? "grayscale(100%)"
                              : "none",
                            opacity: takenCharacters.has(actualIndex) ? 0.5 : 1,
                            cursor: takenCharacters.has(actualIndex)
                              ? "not-allowed"
                              : "pointer",
                            border:
                              selectedCharacter === actualIndex
                                ? "2px solid #4caf50"
                                : "none",
                            transition: "transform 0.2s",
                            "&:hover": { transform: "scale(1.05)" },
                          }}
                          disabled={takenCharacters.has(actualIndex)}
                        >
                          <img
                            src={characterImage}
                            alt={`캐릭터 ${actualIndex + 1}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "contain",
                            }}
                          />
                        </Button>
                      </Tooltip>
                    );
                  }
                )
              ) : (
                <Typography variant="body2" color="text.secondary">
                  사용 가능한 캐릭터를 불러오는 중...
                </Typography>
              )}
            </Box>
            {selectedCharacter !== null && (
              <Button
                variant="contained"
                color="primary"
                onClick={confirmCharacterSelection}
                disabled={isProcessingCharacterSelection}
                sx={{ mt: 2 }}
              >
                {isProcessingCharacterSelection ? "처리 중..." : "ready!"}
              </Button>
            )}
          </Box>
        ) : (
          <>
            <WaitingScreenComponent
              isReady={isCharacterConfirmed}
              isQuizStarting={isQuizStarting}
              isWaitingForQuizStart={isWaitingForQuizStart}
              isPreparingNextQuestion={isPreparingNextQuestion}
              isLastQuestion={isLastQuestion}
              selectedCharacter={selectedCharacter}
              characterImages={characterImages}
              isQuestionVisible={isQuestionVisible}
            />

            {currentQuestion && !isFeedbackReceived && (
              <QuizQuestionComponent
                currentQuestion={currentQuestion}
                selectedAnswer={selectedAnswer}
                handleAnswerSelect={handleAnswerSelect}
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
                <Typography variant="body1">
                  다른 플레이어를 기다리는 중입니다...
                </Typography>
              </Box>
            )}

            {timeLeftNotification && (
              <Box
                sx={{
                  position: "fixed",
                  top: "30%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 1500,
                  padding: "16px 24px",
                  backgroundColor: "rgba(231, 76, 60, 0.85)", // 붉은색 배경
                  color: "white",
                  borderRadius: "16px",
                  boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
                  animation: `${zoomInAndFadeOut} 3s forwards`,
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="h4"
                  sx={{ fontWeight: "bold", textShadow: "2px 2px 4px #000000" }}
                >
                  {timeLeftNotification}
                </Typography>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default StudentQuizSessionPage;
