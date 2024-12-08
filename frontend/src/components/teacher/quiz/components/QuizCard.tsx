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
import PlayCircleFilled from "@mui/icons-material/PlayCircleFilled"; // 퀴즈 시작 버튼 아이콘으로 변경
import { useNavigate } from "react-router-dom";
import api from "../../../../utils/api";
import { getUserId } from "../../../../utils/auth";
import { Quiz } from "../types"; // 공통 Quiz 타입 import
import backgroundDefault from "../../../../assets/background-default.webp"

interface QuizCardProps {
  quiz: Quiz;
  onDelete: (quizId: string) => void;
  onOpenModal: (quiz: Quiz) => void;
  isMyQuizzes: boolean; // 내 퀴즈함 여부 prop 추가
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, onDelete, onOpenModal, isMyQuizzes }) => {
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
      <CardMedia
        component="img"
        height="140"
        image={quiz.imageUrl || backgroundDefault} // 기본 이미지 사용
        alt={quiz.imageUrl ? `${quiz.title} 이미지` : "기본 이미지"}
        sx={{ borderTopLeftRadius: "16px", borderTopRightRadius: "16px" }}
      />

      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
          {quiz.title}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          단원: {quiz.unit} | 문제 수: {quiz.questionsCount}
        </Typography>
        {/* <Box display="flex" justifyContent="space-between" mt={2}>
          <Chip label={`${quiz.grade}학년`} color="primary" size="small" />
          <Chip label={quiz.semester} color="secondary" size="small" />
          <Chip label={quiz.subject} size="small" />
        </Box> */}
      </CardContent>

      <CardActions disableSpacing sx={{ justifyContent: "space-between", paddingX: "1rem" }}>
        <Box display="flex" alignItems="center">
          {/* 퀴즈 시작 버튼 */}
          <Tooltip title="퀴즈 시작">
            <IconButton 
              sx={{ 
                color: "#FFC107", 
                fontSize: "2.5rem", // 크기 확대
                padding: 0, // 버튼 크기를 아이콘 크기에 맞춤
              }} 
              onClick={handleOpenModal}
            >
              <PlayCircleFilled fontSize="inherit" /> {/* 아이콘 크기를 상속 */}
            </IconButton>
          </Tooltip>
          {/* 삭제 버튼 ("내 퀴즈함"일 때만 표시) */}
          {isMyQuizzes && (
            <Tooltip title="퀴즈 삭제">
              <IconButton
                onClick={handleDeleteClick}
                sx={{
                  backgroundColor: "#f44336",
                  color: "#fff",
                  borderRadius: "8px",
                  marginLeft: "8px",
                  "&:hover": {
                    backgroundColor: "#d32f2f", // 호버 시 약간 더 어두운 색으로 변경
                  },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Box display="flex" alignItems="center">
          {/* 좋아요 버튼 */}
          <IconButton onClick={handleLikeToggle} disabled={isLiking} sx={{ color: "#FF5722" }}>
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
