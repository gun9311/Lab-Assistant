import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  Alert,
  Tooltip,
  Snackbar,
  Chip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

type Rating = {
  level: "상" | "중" | "하";
  comments: string[];
};

type PreviewData = {
  subjectName: string;
  semester: string;
  unitName: string;
  ratings: Rating[];
};

type UnitRatingsPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  previewData: PreviewData | null;
};

const UnitRatingsPreviewModal: React.FC<UnitRatingsPreviewModalProps> = ({
  open,
  onClose,
  previewData,
}) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // 상/중/하 DB 값과 화면에 표시될 라벨을 매핑
  const levelLabels: { [key in "상" | "중" | "하"]: string } = {
    상: "심화·응용",
    중: "성장·과정",
    하: "태도·잠재력",
  };

  useEffect(() => {
    if (open) {
      setTabIndex(0); // 모달이 열릴 때 항상 첫 번째 탭으로 초기화
    }
  }, [open]);

  if (!previewData) return null;

  const { subjectName, semester, unitName, ratings } = previewData;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSnackbarOpen(true);
  };

  const levels: ("상" | "중" | "하")[] = ["상", "중", "하"];
  const currentLevel = levels[tabIndex];
  const commentsForLevel =
    ratings.find((r) => r.level === currentLevel)?.comments || [];

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Paper
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: 600 },
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 3,
            borderRadius: 2,
            outline: "none",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 2,
            }}
          >
            <Box>
              <Typography
                variant="h6"
                component="h2"
                sx={{ fontWeight: "bold" }}
              >
                {unitName}
              </Typography>
              <Chip
                label={`${subjectName} / ${semester}`}
                size="small"
                sx={{ mt: 0.5 }}
              />
            </Box>
            <IconButton
              onClick={onClose}
              aria-label="close"
              sx={{ p: 0.5, ml: 1 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          <Tabs value={tabIndex} onChange={handleTabChange} variant="fullWidth">
            {levels.map((level) => (
              <Tab key={level} label={levelLabels[level]} />
            ))}
          </Tabs>
          <Box sx={{ flexGrow: 1, overflowY: "auto", mt: 2, pr: 1 }}>
            {commentsForLevel.length > 0 ? (
              <List dense>
                {commentsForLevel.map((comment, index) => (
                  <ListItem
                    key={index}
                    divider
                    sx={{
                      py: 1.5,
                      "&:hover": { backgroundColor: "action.hover" },
                    }}
                  >
                    <ListItemText
                      primary={comment}
                      primaryTypographyProps={{
                        style: {
                          whiteSpace: "pre-wrap",
                          userSelect: "none",
                        },
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                '{levelLabels[currentLevel]}' 유형으로 등록된 평어가 없습니다.
              </Alert>
            )}
          </Box>
        </Paper>
      </Modal>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message="클립보드에 복사되었습니다."
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </>
  );
};

export default UnitRatingsPreviewModal;
