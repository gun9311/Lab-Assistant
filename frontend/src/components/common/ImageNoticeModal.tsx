import React, { useState } from "react";
import {
  Modal,
  Box,
  Paper,
  Checkbox,
  FormControlLabel,
  Button,
} from "@mui/material";

interface ImageNoticeModalProps {
  open: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

const ImageNoticeModal: React.FC<ImageNoticeModalProps> = ({
  open,
  onClose,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleCloseButtonClick = () => {
    onClose(dontShowAgain);
  };

  const handleBackdropClick = () => {
    // 모달 바깥 영역 클릭 시에는 '다시 보지 않기' 상태를 반영하지 않고 닫습니다.
    onClose(false);
  };

  return (
    <Modal open={open} onClose={handleBackdropClick}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <Paper
          sx={{
            p: 2,
            maxWidth: "500px",
            width: "90vw",
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          <img
            src="https://indischool.com/images/38091172?signature=01WmCbfaW7vBv830vQCuxM1KMV8I2Lwa&width=1200"
            alt="전국 교원 집회 안내"
            style={{ width: "100%", display: "block" }}
          />
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 1,
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                />
              }
              label="다시 보지 않기"
            />
            <Button onClick={handleCloseButtonClick} variant="contained">
              닫기
            </Button>
          </Box>
        </Paper>
      </Box>
    </Modal>
  );
};

export default ImageNoticeModal;
