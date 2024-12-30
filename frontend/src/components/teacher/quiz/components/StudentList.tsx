import React, { useEffect, useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import podiumImage from "../../../../assets/classic-podium.png";
import TopRankers from "./TopRankers";
import BottomRankers from "./BottomRankers";
import WaitingPlayers from "./WaitingPlayers"; // 대기 화면 컴포넌트 추가

type Student = {
  id: string;
  name: string;
  isReady: boolean;
  character: string;
  hasSubmitted?: boolean;
  isCorrect?: boolean;
  rank?: number;
  prevRank?: number;
};

interface StudentListComponentProps {
  students: Student[];
  allStudentsReady: boolean;
  handleStartQuiz: () => void;
  quizStarted: boolean;
  isShowingFeedback: boolean;
  isLastQuestion: boolean;
  handleNextQuestion: () => void;
  handleEndQuiz: () => void;
  handleViewResults: () => void;
}

const StudentListComponent: React.FC<StudentListComponentProps> = ({
  students,
  allStudentsReady,
  handleStartQuiz,
  quizStarted,
  isShowingFeedback,
  isLastQuestion,
  handleNextQuestion,
  handleEndQuiz,
  handleViewResults,
}) => {
  const sortedStudents = [...students].sort(
    (a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity)
  );
  const topRankers = sortedStudents.slice(0, 10);
  const bottomRankers = sortedStudents.slice(3);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        position: "absolute",
        top: "20vh",
        left: "50%",
        transform: "translateX(-50%)",
        textAlign: "center",
        maxWidth: "100%",
        width: "80vw",
        // padding: '0', // 패딩 제거
      }}
    >
      {!quizStarted && (
        <>
          <Typography
            variant="h4"
            sx={{ marginBottom: "1rem", fontWeight: "bold" }}
          >
            플레이어 대기 중<span style={{ position: "absolute" }}>{dots}</span>
          </Typography>
          <WaitingPlayers students={students} />{" "}
          {/* 대기 화면에 학생 목록 추가 */}
        </>
      )}

      {quizStarted && isShowingFeedback && (
        <Box sx={{ textAlign: "center", maxWidth: "100%", padding: "2rem" }}>
          <Box
            sx={{
              position: "relative",
              width: "100%",
              maxWidth: "100%",
              margin: "0 auto",
              marginTop: { xs: "2vh", md: "1vh" },
            }}
          >
            <img
              src={podiumImage}
              alt="Podium"
              style={{
                width: "50%",
                height: "auto",
                display: "block",
                margin: "0 auto", // 이미지 자체도 중앙 정렬
              }}
            />
            <TopRankers topRankers={topRankers} />
          </Box>
          {/* <BottomRankers bottomRankers={bottomRankers} /> */}
          <Box
            sx={{
              marginTop: "4.5vw",
              display: "flex",
              justifyContent: "center",
              gap: "1rem",
            }}
          >
            {!isLastQuestion && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleNextQuestion}
                sx={{
                  fontSize: "1.5vw",
                  padding: "1vh 2vw",
                }}
              >
                다음 문제
              </Button>
            )}
            {isLastQuestion && (
              <>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleEndQuiz}
                  sx={{
                    fontSize: "1.5vw",
                    padding: "1vh 2vw",
                  }}
                >
                  결과 저장 및 종료
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleViewResults}
                  sx={{
                    fontSize: "1.5vw",
                    padding: "1vh 2vw",
                  }}
                >
                  결과 자세히 보기
                </Button>
              </>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default StudentListComponent;
