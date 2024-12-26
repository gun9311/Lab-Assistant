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

type WaitingPlayersProps = {
  students: {
    id: string;
    name: string;
    character: string;
    isReady: boolean;
  }[];
};

const WaitingPlayers: React.FC<WaitingPlayersProps> = ({ students }) => {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(8, 1fr)",
          sm: "repeat(10, 1fr)",
          md: "repeat(10, 1fr)",
          lg: "repeat(12, 1fr)",
          xl: "repeat(12, 1fr)",
        },
        gap: "1rem",
        padding: "1rem",
      }}
    >
      {students.map((student) => {
        const characterIndex =
          parseInt(student.character.replace("character", "")) - 1;
        return (
          <Box key={student.id} sx={{ textAlign: "center" }}>
            <img
              src={characterImages[characterIndex]}
              alt={`${student.name}'s character`}
              style={{
                width: "5.5vw",
                height: "5.5vw",
                objectFit: "contain",
              }}
            />
            <Typography
              variant="subtitle1"
              sx={{
                marginTop: "0rem",
                fontSize: "1.2rem",
                fontWeight: "bold",
                color: "#333",
                backgroundColor: "rgba(255, 255, 255, 0.5)",
                padding: "0.2rem 0.5rem",
                borderRadius: "4px",
              }}
            >
              {student.name}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default WaitingPlayers;
