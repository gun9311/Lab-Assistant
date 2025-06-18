import React from "react";
import { Paper, Box, IconButton, Button, Tooltip } from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Save as SaveIcon,
  Visibility as VisibilityIcon,
  PlayArrow,
  Edit,
  ArrowBack,
} from "@mui/icons-material";

export const FIXED_ACTION_BAR_HEIGHT = "72px";

export interface ActionBarProps {
  isReadOnly?: boolean;
  isEdit?: boolean;
  canNavigateBack: boolean;
  canNavigateForward: boolean;
  onNavigate: (direction: "prev" | "next") => void;
  onPreview: () => void;
  onSave?: () => void;
  onStart?: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  variant?: "fixed" | "dialog";
}

const ActionBar: React.FC<ActionBarProps> = ({
  isReadOnly,
  isEdit,
  canNavigateBack,
  canNavigateForward,
  onNavigate,
  onPreview,
  onSave,
  onStart,
  onEdit,
  onCancel,
  variant = "fixed",
}) => {
  const baseSx = {
    px: 3,
    py: 1.5,
    backgroundColor: "#fafbfd",
    zIndex: 1200,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 2,
    height: FIXED_ACTION_BAR_HEIGHT,
  };

  const variantSx =
    variant === "fixed"
      ? {
          position: "fixed" as "fixed",
          bottom: 0,
          width: "100%",
          left: 0,
          borderRadius: 0,
          boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.05)",
        }
      : {
          flexShrink: 0,
          borderTop: "1px solid rgba(0, 0, 0, 0.12)",
        };

  return (
    <Paper elevation={0} sx={{ ...baseSx, ...variantSx }}>
      <Box sx={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
        {!isReadOnly && onCancel && (
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBack />}
            onClick={onCancel}
            sx={{
              borderRadius: "8px",
              fontWeight: "medium",
              borderColor: "#b0b0b0",
              color: "#666",
              "&:hover": { backgroundColor: "#f0f0f0" },
            }}
          >
            목록으로
          </Button>
        )}
      </Box>

      <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
        <Tooltip title="이전 문제 (←)">
          <span>
            <IconButton
              onClick={() => onNavigate("prev")}
              disabled={!canNavigateBack}
              aria-label="이전 문제"
            >
              <ChevronLeft sx={{ fontSize: "1.8rem" }} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="다음 문제 (→)">
          <span>
            <IconButton
              onClick={() => onNavigate("next")}
              disabled={!canNavigateForward}
              aria-label="다음 문제"
            >
              <ChevronRight sx={{ fontSize: "1.8rem" }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box
        sx={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: 2 }}
      >
        {isReadOnly ? (
          <>
            <Button
              variant="outlined"
              color="info"
              startIcon={<VisibilityIcon />}
              onClick={onPreview}
              sx={{ borderRadius: "8px", fontWeight: "medium" }}
            >
              미리보기
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<Edit />}
              onClick={onEdit}
              sx={{ borderRadius: "8px", fontWeight: "bold" }}
            >
              편집하기
            </Button>
            <Button
              variant="contained"
              color="warning"
              startIcon={<PlayArrow />}
              onClick={onStart}
              sx={{ borderRadius: "8px", fontWeight: "bold" }}
            >
              퀴즈 시작
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outlined"
              color="info"
              startIcon={<VisibilityIcon />}
              onClick={onPreview}
              sx={{ borderRadius: "8px", fontWeight: "medium" }}
            >
              미리보기
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              onClick={onSave}
              sx={{ borderRadius: "8px", fontWeight: "bold" }}
            >
              {isEdit ? "퀴즈 수정 완료" : "퀴즈 저장"}
            </Button>
          </>
        )}
      </Box>
    </Paper>
  );
};

export default ActionBar;
