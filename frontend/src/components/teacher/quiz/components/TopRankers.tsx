import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

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
  const [positions, setPositions] = useState<{ [id: string]: { top: string; left: string } }>({});

  useEffect(() => {
    // 포디움의 위치를 순위에 따라 업데이트
    const updatedPositions: { [id: string]: { top: string; left: string } } = {};
    topRankers.forEach((student, index) => {
      updatedPositions[student.id] = {
        top: index === 0 ? '12%' : index === 1 ? '42%' : '45%',
        left: index === 0 ? '53%' : index === 1 ? '30%' : '76%',
      };
    });
    setPositions(updatedPositions);
  }, [topRankers]);

  return (
    <>
      {topRankers.map((student, index) => {
        const imageSize = index === 0 ? '100%' : index === 1 ? '90%' : '80%'; // 등수에 따라 이미지 크기 조정
        return (
          <Box
            key={student.id}
            sx={{
              position: 'absolute',
              top: positions[student.id]?.top || '0%',
              left: positions[student.id]?.left || '0%',
              transform: 'translate(-50%, -100%)',
              transition: 'top 0.5s ease-in-out, left 0.5s ease-in-out',
              textAlign: 'center',
              width: '250px', // 모든 div의 넓이를 동일하게 설정
              height: 'auto', // 높이는 자동으로 설정하여 비율 유지
            }}
          >
            <Typography
              sx={{
                position: 'absolute',
                top: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: '#fff',
                borderRadius: '4px',
                padding: '0.2rem 0.5rem',
                fontWeight: 'bold',
              }}
            >
              {student.name}
            </Typography>
            <img
              src={`/assets/character/${student.character}.png`}
              alt={`${student.name}'s character`}
              style={{
                width: imageSize, // 등수에 따라 이미지 크기 조정
                height: 'auto', // 비율을 유지하면서 크기 조정
              }}
            />
          </Box>
        );
      })}
    </>
  );
};

export default TopRankers;