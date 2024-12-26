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
    rank?: number; // 현재 순위
    prevRank?: number; // 이전 순위
  }[];
};

const TopRankers: React.FC<TopRankersProps> = ({ topRankers }) => {
  const [positions, setPositions] = useState<{
    [id: string]: { top: string; left: string };
  }>({});

  useEffect(() => {
    const updatedPositions: { [id: string]: { top: string; left: string } } =
      {};
    topRankers.forEach((student, index) => {
      if (index < 3) {
        // 1~3등 위치 설정
        updatedPositions[student.id] = {
          top: index === 0 ? "5%" : index === 1 ? "37%" : "40%",
          left: index === 0 ? "49%" : index === 1 ? "35%" : "63%",
        };
      } else {
        // 4~10등 위치 설정
        const leftPosition = 30 + (index - 3) * 5; // 4등부터 10등까지 간격 설정
        updatedPositions[student.id] = {
          top: "70%", // 아래쪽 단상 위치
          left: `${leftPosition}%`,
        };
      }
    });
    setPositions(updatedPositions);
  }, [topRankers]);

  return (
    <>
      {topRankers.map((student, index) => {
        const characterIndex =
          parseInt(student.character.replace("character", "")) - 1;
        const imageSize = index < 3 ? (index === 0 ? "55%" : "55%") : "30%"; // 4등부터는 크기 조정
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
            }}
          >
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
                fontSize: "100%",
              }}
            >
              {student.name}
            </Typography>
            <img
              src={characterImages[characterIndex]}
              alt={`${student.name}'s character`}
              style={{
                width: imageSize,
                height: "auto",
              }}
            />
          </Box>
        );
      })}
    </>
  );
};

export default TopRankers;
