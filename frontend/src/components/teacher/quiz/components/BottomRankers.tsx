import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

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
        flexWrap: 'wrap', // 줄바꿈 가능하도록 설정
        justifyContent: 'center',
        gap: '0.5rem', // 간격을 좁게 설정
        padding: '1rem',
        backgroundColor: '#e0e0e0',
        borderRadius: '10px',
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        height: 'auto', // 높이를 자동으로 설정
      }}
    >
      {bottomRankers.map((student) => (
        <Box
          key={student.id}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '80px', // 캐릭터 크기를 키우기 위해 넓이 설정
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
              whiteSpace: 'nowrap', // 줄바꿈 방지
            }}
          >
            {student.name}
          </Typography>
          <img
            src={`/assets/character/${student.character}.png`}
            alt={`${student.name}'s character`}
            style={{
              width: '90px', // 캐릭터 크기를 키움
              height: '70px',
              borderRadius: '50%',
            }}
          />
        </Box>
      ))}
    </Box>
  );
};

export default BottomRankers;