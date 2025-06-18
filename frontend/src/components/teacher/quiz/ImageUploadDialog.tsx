import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  Tabs,
  Tab,
} from "@mui/material";
import { Image, Delete, Link } from "@mui/icons-material";
import imageCompression from "browser-image-compression";

type ImageUploadDialogProps = {
  open: boolean;
  onClose: () => void;
  onImageChange: (file: File | null) => void;
  onImageUrlChange: (url: string) => void;
  imageUrl: string;
  imageFile: File | null;
};

const ImageUploadDialog: React.FC<ImageUploadDialogProps> = ({
  open,
  onClose,
  onImageChange,
  onImageUrlChange,
  imageUrl,
  imageFile,
}) => {
  const [tempImageUrl, setTempImageUrl] = useState(imageUrl);
  const [tempImageFile, setTempImageFile] = useState<File | null>(imageFile);
  const [tabValue, setTabValue] = useState(0);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
      onImageChange(tempImageFile);
    } else if (tempImageUrl) {
      onImageUrlChange(tempImageUrl);
    }
    onClose();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setTempImageUrl("");
    setTempImageFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // 파일 크기 체크
      if (file.size > MAX_FILE_SIZE) {
        alert(
          `파일 크기가 너무 큽니다. ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB 이하의 파일을 선택해주세요.`
        );
        return;
      }

      setTempImageFile(file);
    }
  };

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1, // 최대 1MB로 압축
      maxWidthOrHeight: 1920, // 최대 너비/높이
      useWebWorker: true,
    };

    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error("이미지 압축 실패:", error);
      return file; // 압축 실패 시 원본 반환
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ textAlign: "center", fontWeight: "bold" }}>
        이미지 첨부
      </DialogTitle>

      {/* Tabs for File Upload and URL */}
      <Tabs value={tabValue} onChange={handleTabChange} centered>
        <Tab label="파일 업로드" icon={<Image />} iconPosition="start" />
        <Tab label="URL 입력" icon={<Link />} iconPosition="start" />
      </Tabs>

      <DialogContent>
        {/* 파일 업로드 탭 */}
        {tabValue === 0 && (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            sx={{ mt: 2 }}
          >
            <Button
              variant="contained"
              component="label"
              fullWidth
              sx={{
                backgroundColor: "#ffcc00",
                "&:hover": { backgroundColor: "#ffaa00" },
                color: "#000",
                borderRadius: "8px",
                marginBottom: "1.5rem",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Image sx={{ marginRight: "0.5rem" }} />
              파일 업로드
              <input
                type="file"
                hidden
                accept="image/*"
                onChange={handleFileChange}
              />
            </Button>

            {/* 파일 미리보기 */}
            {tempImageFile && (
              <Box
                mt={2}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  borderRadius: "8px",
                  backgroundColor: "#f7f7f7",
                  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
                  position: "relative",
                  width: "150px",
                  height: "150px",
                  overflow: "hidden",
                }}
              >
                <img
                  src={URL.createObjectURL(tempImageFile)}
                  alt="미리보기"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: "8px",
                  }}
                />
                <IconButton
                  onClick={() => setTempImageFile(null)}
                  sx={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    color: "#ff6f61",
                    backgroundColor: "#fff",
                    "&:hover": { backgroundColor: "#ffe5e5" },
                  }}
                  size="small"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>
        )}

        {/* URL 입력 탭 */}
        {tabValue === 1 && (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            sx={{ mt: 2 }}
          >
            <TextField
              label="이미지 URL"
              fullWidth
              margin="normal"
              value={tempImageUrl}
              onChange={(e) => setTempImageUrl(e.target.value)}
              sx={{
                "& .MuiInputBase-root": {
                  borderRadius: "8px",
                  backgroundColor: "#f9f9f9",
                },
              }}
            />

            {/* URL 미리보기 */}
            {tempImageUrl && (
              <Box
                mt={2}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  borderRadius: "8px",
                  backgroundColor: "#f7f7f7",
                  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.1)",
                  position: "relative",
                  width: "150px",
                  height: "150px",
                  overflow: "hidden",
                }}
              >
                <img
                  src={tempImageUrl}
                  alt="미리보기"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    borderRadius: "8px",
                  }}
                />
                <IconButton
                  onClick={() => setTempImageUrl("")}
                  sx={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    color: "#ff6f61",
                    backgroundColor: "#fff",
                    "&:hover": { backgroundColor: "#ffe5e5" },
                  }}
                  size="small"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      {/* Dialog 액션 버튼 */}
      <DialogActions sx={{ justifyContent: "center", gap: 1.5 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            borderColor: "#b0b0b0",
            color: "#666",
            borderRadius: "8px",
            "&:hover": { backgroundColor: "#f0f0f0" },
          }}
        >
          취소
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!tempImageUrl && !tempImageFile}
          sx={{
            backgroundColor: "#ff6f61",
            color: "#fff",
            borderRadius: "8px",
            "&:hover": { backgroundColor: "#ff5a4d" },
          }}
        >
          확인
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageUploadDialog;
