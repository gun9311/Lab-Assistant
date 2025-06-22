import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Typography,
  Box,
  Chip,
  Tooltip,
  IconButton,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import VisibilityIcon from "@mui/icons-material/Visibility";

type UnitSelectProps = {
  subject: string;
  units: string[];
  selectedUnits: string[];
  handleUnitChange: (event: SelectChangeEvent<string[]>) => void;
  onPreview: (unitName: string) => void;
  sx?: object;
};

const UnitSelect: React.FC<UnitSelectProps> = ({
  subject,
  units,
  selectedUnits,
  handleUnitChange,
  onPreview,
  sx,
}) => {
  return (
    <Box sx={{ width: "100%", ...sx }}>
      <FormControl fullWidth size="small">
        <InputLabel id={`unit-select-label-${subject.replace(/\s+/g, "-")}`}>
          {`${subject} 단원 선택 (다중 가능)`}
        </InputLabel>
        <Select
          labelId={`unit-select-label-${subject.replace(/\s+/g, "-")}`}
          multiple
          value={selectedUnits}
          onChange={handleUnitChange}
          label={`${subject} 단원 선택 (다중 가능)`}
          renderValue={(selected) => (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {selected.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{
                    color: "text.secondary",
                    fontStyle: "italic",
                    fontSize: "0.875rem",
                  }}
                >
                  선택 안 함
                </Typography>
              ) : selected.length > 2 ? (
                <Chip label={`${selected.length}개 단원`} size="small" />
              ) : (
                (selected as string[]).map((value) => (
                  <Tooltip title={value} key={value}>
                    <Chip
                      label={value}
                      size="small"
                      sx={{ maxWidth: "100px" }}
                      onDelete={
                        units.length > 1 && selected.length === 1
                          ? undefined
                          : () => {}
                      }
                    />
                  </Tooltip>
                ))
              )}
            </Box>
          )}
          MenuProps={{ PaperProps: { sx: { maxHeight: 220, width: 280 } } }}
          disabled={units.length === 0}
        >
          {units.length > 0 ? (
            units.map((unit) => (
              <MenuItem
                key={unit}
                value={unit}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderRadius: 1,
                  mx: 1,
                  my: 0.5,
                  "&.Mui-selected": {
                    fontWeight: "fontWeightBold",
                    backgroundColor: "action.selected",
                  },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Checkbox
                    checked={selectedUnits.includes(unit)}
                    size="small"
                  />
                  <ListItemText
                    primary={unit}
                    primaryTypographyProps={{
                      variant: "body2",
                      noWrap: true,
                      title: unit,
                    }}
                  />
                </Box>
                <Tooltip title="평어 내용 미리보기">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation(); // 메뉴가 닫히는 것을 방지
                      onPreview(unit);
                    }}
                    sx={{ ml: 1 }}
                  >
                    <VisibilityIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </MenuItem>
            ))
          ) : (
            <MenuItem disabled>
              <ListItemText primary="선택 가능한 단원이 없습니다." />
            </MenuItem>
          )}
        </Select>
      </FormControl>
    </Box>
  );
};

export default UnitSelect;
