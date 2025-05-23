import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import TimerIcon from "@mui/icons-material/Timer";
import "./WaitingScreen.css";

interface WaitingScreenComponentProps {
  isReady: boolean;
  isQuizStarting: boolean;
  isWaitingForQuizStart: boolean;
  isPreparingNextQuestion: boolean;
  isLastQuestion: boolean;
  selectedCharacter: number | string | null;
  characterImages: string[];
}

const WaitingScreenComponent: React.FC<WaitingScreenComponentProps> = ({
  isReady,
  isQuizStarting,
  isWaitingForQuizStart,
  isPreparingNextQuestion,
  isLastQuestion,
  selectedCharacter,
  characterImages,
}) => {
  const [dots, setDots] = useState("");

  // Prop 값 확인
  console.log(
    `WaitingScreenComponent received selectedCharacter prop: ${selectedCharacter}`
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box textAlign="center" sx={{ padding: 3 }}>
      {selectedCharacter !== null && (
        <Box sx={{ mb: 2 }}>
          <img
            src={characterImages[Number(selectedCharacter)]}
            alt={`선택된 캐릭터`}
            style={{ width: 100, height: 100, objectFit: "contain" }}
          />
        </Box>
      )}
      {/* 퀴즈 시작 대기 중 상태 */}
      {isWaitingForQuizStart && (
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: "bold",
              color: "#007B3E",
              fontSize: "5vw",
              width: "270px",
              margin: "0 auto",
              textAlign: "center",
              fontFamily: `'Montserrat', sans-serif`,
              padding: "10px",
              borderRadius: "8px",
              animation: "fadeIn 1s ease-in-out",
              textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
            }}
          >
            플레이어 대기 중<span style={{ position: "absolute" }}>{dots}</span>
          </Typography>
        </Box>
      )}
      {/* 퀴즈가 곧 시작될 때 */}
      {isQuizStarting && (
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              fontSize: "9vw",
              color: "#E74C3C",
              fontFamily: "'Poppins', sans-serif",
              textShadow: "2px 2px 6px #000000",
            }}
          >
            START!
          </Typography>
        </Box>
      )}
      {/* 다음 문제를 준비 중일 때 */}
      {isPreparingNextQuestion && (
        <Box>
          <CircularProgress sx={{ color: "#00bcd4", mb: 2 }} />
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: "#00bcd4",
              fontSize: "5vw",
              fontFamily: "'Poppins', sans-serif",
              textShadow: "2px 2px 6px #000000",
            }}
          >
            {isLastQuestion
              ? "마지막 문제입니다..."
              : "다음 문제가 곧 출제됩니다..."}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default WaitingScreenComponent;
