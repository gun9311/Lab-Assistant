import React from 'react';
import { Box, Typography } from '@mui/material';

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
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(3, 1fr)',
          sm: 'repeat(5, 1fr)',
          md: 'repeat(8, 1fr)',
        },
        gap: '1rem',
        padding: '1rem',
      }}
    >
      {students.map((student) => (
        <Box key={student.id} sx={{ textAlign: 'center' }}>
          <img
            src={`/assets/character/${student.character}.png`}
            alt={`${student.name}'s character`}
            style={{
              width: '80px',
              height: '80px',
              objectFit: 'cover',
              borderRadius: '50%',
              border: student.isReady ? '3px solid green' : '3px solid red',
            }}
          />
          <Typography variant="subtitle1" sx={{ marginTop: '0.5rem' }}>
            {student.name}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default WaitingPlayers;
