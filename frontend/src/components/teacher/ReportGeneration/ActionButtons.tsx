import React from "react";
import { Box, Button } from "@mui/material";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';

type ActionButtonsProps = {
  tabValue: number;
  onBack: () => void;
  onGenerate: () => void;
  onQuery: () => void;
};

const ActionButtons: React.FC<ActionButtonsProps> = ({ tabValue, onBack, onGenerate, onQuery }) => {
  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "center", gap: 2 }}>
      <Button variant="outlined" onClick={onBack} sx={{ mb: { xs: 1, sm: 0 } }}>
        <ArrowBackIcon sx={{ mr: 1 }} />
        학생 목록
      </Button>
      {tabValue === 0 && (
        <Button variant="contained" color="primary" onClick={onGenerate}>
          <SaveIcon sx={{ mr: 1 }} />
          평어 생성
        </Button>
      )}
      {tabValue === 1 && (
        <Button variant="contained" color="secondary" onClick={onQuery}>
          <SearchIcon sx={{ mr: 1 }} />
          평어 조회
        </Button>
      )}
    </Box>
  );
};

export default ActionButtons;
