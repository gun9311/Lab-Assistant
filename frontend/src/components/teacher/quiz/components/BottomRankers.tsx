import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

// 타입 정의 추가
declare const require: {
  context: (path: string, deep?: boolean, filter?: RegExp) => {
    keys: () => string[];
    (key: string): string;
  };
};

// 이미지 디렉토리에서 모든 이미지를 가져와 배열로 관리
const images = require.context('../../../../assets/character', false, /\.png$/);

// 파일 이름을 기준으로 정렬하여 배열 생성
const characterImages = images.keys()
  .sort((a: string, b: string) => {
    const numA = parseInt(a.match(/\d+/)![0], 10);
    const numB = parseInt(b.match(/\d+/)![0], 10);
    return numA - numB;
  })
  .map((key: string) => images(key));

type BottomRankersProps = {
  bottomRankers: {
    id: string;
    name: string;
    character: string;
    rank?: number; // 현재 순위
    prevRank?: number; // 이전 순위
  }[];
};

const BottomRankers: React.FC<BottomRankersProps> = ({ bottomRankers }) => {
  const [positions, setPositions] = useState<{ [id: string]: number }>({});

  useEffect(() => {
    const updatedPositions: { [id: string]: number } = {};
    bottomRankers.forEach((student, index) => {
      updatedPositions[student.id] = index;
    });
    setPositions(updatedPositions);
  }, [bottomRankers]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0.5rem',
        padding: '1rem',
        backgroundColor: '#e0e0e0',
        borderRadius: '10px',
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        height: 'auto',
      }}
    >
      {bottomRankers.map((student) => {
        const characterIndex = parseInt(student.character.replace('character', '')) - 1;
        return (
          <Box
            key={student.id}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '80px',
              position: 'relative',
            }}
          >
            <Typography
              sx={{
                position: 'absolute',
                top: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: '#fff',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
              }}
            >
              {student.name}
            </Typography>
            <img
              src={characterImages[characterIndex]}
              alt={`${student.name}'s character`}
              style={{
                width: '90px',
                height: '70px',
                borderRadius: '50%',
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
};

export default BottomRankers;