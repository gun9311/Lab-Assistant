import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";

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

// 이미지 디렉토리에서 모든 이미지를 가져와 배열로 관리
const images = require.context("../../../../assets/character", false, /\.png$/);

// 파일 이름을 기준으로 정렬하여 배열 생성
const characterImages = images
  .keys()
  .sort((a: string, b: string) => {
    const numA = parseInt(a.match(/\d+/)![0], 10);
    const numB = parseInt(b.match(/\d+/)![0], 10);
    return numA - numB;
  })
  .map((key: string) => images(key));

type TopRankersProps = {
  topRankers: {
    id: string;
    name: string;
    character: string;
    rank?: number;
    prevRank?: number;
  }[];
  isLastQuestion: boolean;
};

const TopRankers: React.FC<TopRankersProps> = ({
  topRankers,
  isLastQuestion,
}) => {
  const [positions, setPositions] = useState<{
    [id: string]: { top: string; left: string };
  }>({});
  const [visibleRanks, setVisibleRanks] = useState<number[]>([]);
  const [imagesLoaded, setImagesLoaded] = useState<{ [id: string]: boolean }>(
    {}
  );

  useEffect(() => {
    const updatedPositions: { [id: string]: { top: string; left: string } } =
      {};
    topRankers.forEach((student, index) => {
      if (index < 3) {
        updatedPositions[student.id] = {
          top: index === 0 ? "5%" : index === 1 ? "36%" : "37%",
          left: index === 0 ? "49%" : index === 1 ? "35%" : "62%",
        };
      } else {
        const leftPosition = 28.6 + (index - 3) * 6.3;
        updatedPositions[student.id] = {
          top: "80%",
          left: `${leftPosition}%`,
        };
      }
    });
    setPositions(updatedPositions);

    // 모든 문제에서 순차적으로 등수를 공개
    const revealRanks = async () => {
      for (let i = 9; i > 2; i--) {
        setVisibleRanks((prev) => [...prev, i]);
        await new Promise((resolve) =>
          setTimeout(resolve, isLastQuestion ? 1000 : 300)
        ); // 마지막 문제는 1초, 중간 문제는 0.3초 대기
      }
      await new Promise((resolve) =>
        setTimeout(resolve, isLastQuestion ? 1000 : 300)
      ); // 3등 대기
      setVisibleRanks((prev) => [...prev, 2]);
      await new Promise((resolve) =>
        setTimeout(resolve, isLastQuestion ? 1500 : 500)
      ); // 2등 대기
      setVisibleRanks((prev) => [...prev, 1]);
      await new Promise((resolve) =>
        setTimeout(resolve, isLastQuestion ? 2000 : 700)
      ); // 1등 대기
      setVisibleRanks((prev) => [...prev, 0]);
    };

    revealRanks();
  }, [topRankers, isLastQuestion]);

  return (
    <>
      {topRankers.map((student, index) => {
        if (!visibleRanks.includes(index)) return null;

        const characterIndex =
          parseInt(student.character.replace("character", "")) - 1;
        const imageSize = index < 3 ? (index === 0 ? "55%" : "55%") : "30%";

        return (
          <Box
            key={student.id}
            sx={{
              position: "absolute",
              top: positions[student.id]?.top || "0%",
              left: positions[student.id]?.left || "0%",
              transform: "translate(-50%, -100%)",
              textAlign: "center",
              width: "20%",
              height: "auto",
              animation: "fadeIn 1s ease-in-out",
              visibility: imagesLoaded[student.id] ? "visible" : "hidden", // 이미지 로드 상태에 따라 표시
            }}
          >
            {(index < 3 || isLastQuestion) && (
              <Typography
                sx={{
                  position: "absolute",
                  top: "-30px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  color: "#fff",
                  borderRadius: "4px",
                  padding: "0.2rem 0.5rem",
                  fontWeight: "bold",
                  fontSize: index < 3 ? "2vw" : "1.3vw",
                }}
              >
                {student.name}
              </Typography>
            )}
            <img
              src={characterImages[characterIndex]}
              alt={`${student.name}'s character`}
              style={{
                width: imageSize,
                height: "auto",
              }}
              onLoad={() =>
                setImagesLoaded((prev) => ({ ...prev, [student.id]: true }))
              }
            />
          </Box>
        );
      })}
    </>
  );
};

export default TopRankers;
