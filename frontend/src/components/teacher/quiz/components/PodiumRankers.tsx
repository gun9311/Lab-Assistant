import React from "react";
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

type RankersProps = {
  rankers: {
    id: string;
    name: string;
    character: string;
    rank: number;
  }[];
};

const PodiumRankers: React.FC<RankersProps> = ({ rankers }) => {
  const positions = [
    { top: "10%", left: "50%" }, // 1위
    { top: "30%", left: "30%" }, // 2위
    { top: "30%", left: "70%" }, // 3위
    { top: "60%", left: "10%" }, // 4위
    { top: "60%", left: "20%" }, // 5위
    { top: "60%", left: "30%" }, // 6위
    { top: "60%", left: "40%" }, // 7위
    { top: "60%", left: "50%" }, // 8위
    { top: "60%", left: "60%" }, // 9위
    { top: "60%", left: "70%" }, // 10위
  ];

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%", zIndex: 2 }}>
      {rankers.map((student) => {
        const position = positions[student.rank - 1];
        const characterIndex =
          parseInt(student.character.replace("character", "")) - 1;
        return (
          <Box
            key={student.id}
            sx={{
              position: "absolute",
              top: position.top,
              left: position.left,
              transform: "translate(-50%, -100%)",
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                color: "#fff",
                borderRadius: "4px",
                padding: "0.2rem 0.5rem",
                fontWeight: "bold",
              }}
            >
              {student.name}
            </Typography>
            <img
              src={characterImages[characterIndex]}
              alt={`${student.name}'s character`}
              style={{ width: "9vw", height: "auto" }}
            />
          </Box>
        );
      })}
    </Box>
  );
};

export default PodiumRankers;
