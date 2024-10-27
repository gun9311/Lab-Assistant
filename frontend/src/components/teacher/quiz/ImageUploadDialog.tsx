import React, { useState, useEffect } from "react";
import { Dialog, DialogActions, DialogContent, DialogTitle, Button, TextField, Typography, Box } from "@mui/material";

type Props = {
  open: boolean;
  onClose: () => void;
  onImageChange: (file: File | null) => void;
  onImageUrlChange: (url: string) => void;
  imageUrl: string;
  imageFile: File | null;
};

export const ImageUploadDialog: React.FC<Props> = ({ open, onClose, onImageChange, onImageUrlChange, imageUrl, imageFile }) => {
  const [tempImageUrl, setTempImageUrl] = useState(imageUrl);
  const [tempImageFile, setTempImageFile] = useState<File | null>(imageFile);

  // 다이얼로그가 열릴 때마다 상태 초기화
  useEffect(() => {
    if (open) {
      setTempImageUrl(imageUrl);
      setTempImageFile(imageFile);
    }
  }, [open, imageUrl, imageFile]);

  useEffect(() => {
    if (tempImageUrl) setTempImageFile(null);
    if (tempImageFile) setTempImageUrl("");
  }, [tempImageUrl, tempImageFile]);

  const handleConfirm = () => {
    if (tempImageFile) {
      // 파일이 선택된 경우
      onImageChange(tempImageFile);
    } else if (tempImageUrl) {
      // URL이 입력된 경우
      onImageUrlChange(tempImageUrl);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>이미지 첨부</DialogTitle>
      <DialogContent>
        {/* 파일 업로드 버튼 */}
        <Button
          variant="contained"
          component="label"
          fullWidth
          disabled={!!tempImageUrl} // URL이 입력되면 비활성화
        >
          파일 업로드
          <input
            type="file"
            hidden
            onChange={(e) => {
              if (e.target.files) setTempImageFile(e.target.files[0]);
            }}
          />
        </Button>

        {/* URL 입력 필드 */}
        <TextField
          label="이미지 URL"
          fullWidth
          margin="normal"
          value={tempImageUrl}
          onChange={(e) => setTempImageUrl(e.target.value)}
          disabled={!!tempImageFile} // 파일이 선택되면 비활성화
        />

        {/* 미리보기 섹션 */}
        {tempImageFile && (
          <Box mt={2}>
            <Typography>선택된 파일 미리보기:</Typography>
            <img
              src={URL.createObjectURL(tempImageFile)}
              alt="미리보기"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </Box>
        )}
        {tempImageUrl && (
          <Box mt={2}>
            <Typography>입력된 URL 미리보기:</Typography>
            <img src={tempImageUrl} alt="미리보기" style={{ maxWidth: "100%", height: "auto" }} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {/* 확인 및 취소 버튼 */}
        <Button onClick={onClose}>취소</Button>
        <Button onClick={handleConfirm} disabled={!tempImageUrl && !tempImageFile}>
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
};
