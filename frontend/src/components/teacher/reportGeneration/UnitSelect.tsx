import React from "react";
import { FormControl, InputLabel, Select, MenuItem, Checkbox, ListItemText } from "@mui/material";
import { SelectChangeEvent } from '@mui/material/Select';

type UnitSelectProps = {
  subject: string; 
  units: string[];
  selectedUnits: string[];
  handleUnitChange: (event: SelectChangeEvent<string[]>) => void;
  sx?: object; 
};

const UnitSelect: React.FC<UnitSelectProps> = ({
  subject,
  units,
  selectedUnits,
  handleUnitChange,
  sx, // 추가된 부분: sx를 props로 받음
}) => {
  return (
    <FormControl fullWidth sx={{ ...sx, marginBottom: 2 }}>
      <InputLabel>{subject} 단원 선택</InputLabel>
      <Select
        multiple
        value={selectedUnits}
        onChange={handleUnitChange}
        renderValue={(selected) => selected.join(", ")}
      >
        {units.map((unit) => (
          <MenuItem key={unit} value={unit}>
            <Checkbox checked={selectedUnits.includes(unit)} />
            <ListItemText primary={unit} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default UnitSelect;
