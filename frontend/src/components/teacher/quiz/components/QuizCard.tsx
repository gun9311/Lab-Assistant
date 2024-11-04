// QuizCard.tsx
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  CardMedia,
  IconButton,
  Badge,
  Chip,
  Box,
  Tooltip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility"; // 확인 아이콘
import { useNavigate } from "react-router-dom";
import api from "../../../../utils/api";
import { getUserId } from "../../../../utils/auth";
import { Quiz } from "../types"; // 공통 Quiz 타입 import

interface QuizCardProps {
  quiz: Quiz;
  onDelete: (quizId: string) => void;
  onOpenModal: (quiz: Quiz) => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, onDelete, onOpenModal }) => {
  const userId = getUserId();

  const [isLiking, setIsLiking] = useState<boolean>(false);
  const [liked, setLiked] = useState<boolean>(quiz.userLiked);
  const [likeCount, setLikeCount] = useState<number>(quiz.likeCount);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // 좋아요 토글 핸들러
  const handleLikeToggle = async () => {
    if (isLiking) return;
    setIsLiking(true);

    try {
      await api.post(`/kahoot-quiz/${quiz._id}/like`);
      setLiked((prevLiked) => !prevLiked);
      setLikeCount((prevLikeCount) => (liked ? prevLikeCount - 1 : prevLikeCount + 1));
    } catch (error) {
      console.error("좋아요 처리 중 오류가 발생했습니다.", error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDeleteClick = () => {
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleConfirmDelete = () => {
    onDelete(quiz._id);
    handleCloseDeleteDialog();
  };

  const handleOpenModal = () => {
    onOpenModal(quiz);
  };

  return (
    <Card
      sx={{
        maxWidth: 345,
        borderRadius: "16px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "scale(1.05)",
          boxShadow: "0 12px 32px rgba(0, 0, 0, 0.2)",
        },
        backgroundColor: "#fff7f0",
      }}
    >
      {quiz.imageUrl ? (
        <CardMedia
          component="img"
          height="140"
          image={quiz.imageUrl}
          alt={`${quiz.title} 이미지`}
          sx={{ borderTopLeftRadius: "16px", borderTopRightRadius: "16px" }}
        />
      ) : (
        <Box
          sx={{
            height: 140,
            backgroundColor: "#f0f0f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
          }}
        >
          <Typography variant="h5" color="textSecondary">
            이미지 없음
          </Typography>
        </Box>
      )}

      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
          {quiz.title}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          단원: {quiz.unit} | 문제 수: {quiz.questionsCount}
        </Typography>
        <Box display="flex" justifyContent="space-between" mt={2}>
          <Chip label={`${quiz.grade}학년`} color="primary" size="small" />
          <Chip label={quiz.semester} color="secondary" size="small" />
          <Chip label={quiz.subject} size="small" />
        </Box>
      </CardContent>

      <CardActions disableSpacing sx={{ justifyContent: "space-between" }}>
        <Box display="flex" alignItems="center">
          {/* 확인 버튼 */}
          <Tooltip title="퀴즈 확인">
            <IconButton color="primary" onClick={handleOpenModal}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>

          {/* 삭제 버튼 (생성자인 경우에만 표시) */}
          {quiz.createdBy === userId && (
            <Tooltip title="퀴즈 삭제">
              <IconButton
                color="error"
                onClick={handleDeleteClick}
                sx={{
                  backgroundColor: "#f44336",
                  color: "#fff",
                  borderRadius: "8px",
                  marginLeft: "8px",
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* 좋아요 버튼 */}
        <Box display="flex" alignItems="center">
          <IconButton onClick={handleLikeToggle} disabled={isLiking}>
            <Badge badgeContent={likeCount} color="error">
              {liked ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
            </Badge>
          </IconButton>
        </Box>
      </CardActions>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-dialog-title"
      >
        <DialogTitle id="delete-dialog-title">퀴즈 삭제</DialogTitle>
        <DialogContent>
          <DialogContentText>
            정말로 이 퀴즈를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            취소
          </Button>
          <Button onClick={handleConfirmDelete} color="error">
            삭제
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default QuizCard;
