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
} from "@mui/material";
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'; // 비어있는 하트 아이콘
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { useNavigate } from "react-router-dom";
import api from "../../../../utils/api";
import { getUserId } from "../../../../utils/auth";

type Quiz = {
  _id: string;
  title: string;
  unit: string;
  questionsCount: number;
  likeCount: number;
  grade: number;
  semester: string;
  subject: string;
  imageUrl?: string;
  userLiked: boolean; // 백엔드에서 받아온 사용자 좋아요 여부
  createdBy: string;  // 퀴즈 작성자의 ID
};

interface QuizCardProps {
  quiz: Quiz;
  onStartQuiz: (quizId: string) => void;
  onDelete: (quizId: string) => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, onDelete, onStartQuiz }) => {
  const navigate = useNavigate();
  const userId = getUserId();

  // 좋아요 상태 및 좋아요 수 상태를 관리
  const [isLiking, setIsLiking] = useState<boolean>(false);
  const [liked, setLiked] = useState<boolean>(quiz.userLiked); // 초기 좋아요 상태를 서버로부터 받은 값으로 설정
  const [likeCount, setLikeCount] = useState<number>(quiz.likeCount); // 좋아요 수

  const handleLikeToggle = async () => {
    if (isLiking) return; // 중복 클릭 방지
    setIsLiking(true);

    try {
      // 서버에 좋아요/좋아요 취소 요청을 보냅니다
      const response = await api.post(`/kahoot-quiz/${quiz._id}/like`);

      // 좋아요 상태를 반전시킵니다
      setLiked((prevLiked) => !prevLiked);

      // 좋아요 수 업데이트 (좋아요 눌렀으면 증가, 취소했으면 감소)
      setLikeCount((prevLikeCount) =>
        liked ? prevLikeCount - 1 : prevLikeCount + 1
      );
    } catch (error) {
      console.error("좋아요 처리 중 오류가 발생했습니다.", error);
    } finally {
      setIsLiking(false);
    }
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
      {/* 이미지가 있을 경우, 없을 경우에는 기본 배경을 제공 */}
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
        {/* 퀴즈 제목과 주요 정보 */}
        <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
          {quiz.title}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          단원: {quiz.unit} | 문제 수: {quiz.questionsCount}
        </Typography>

        {/* 학년, 학기, 과목 정보 */}
        <Box display="flex" justifyContent="space-between" mt={2}>
          <Chip label={`${quiz.grade}학년`} color="primary" size="small" />
          <Chip label={quiz.semester} color="secondary" size="small" />
          <Chip label={quiz.subject} size="small" />
        </Box>
      </CardContent>

      {/* 카드 하단 액션: 퀴즈 시작, 수정, 삭제, 좋아요 */}
      <CardActions disableSpacing sx={{ justifyContent: "space-between" }}>
        <Box display="flex" alignItems="center">
          {/* 퀴즈 시작 버튼 */}
          <Tooltip title="퀴즈 시작">
            <IconButton
              color="primary"
              onClick={() => onStartQuiz(quiz._id)}
              sx={{
                backgroundColor: "#ffcc00",
                color: "#000",
                borderRadius: "8px",
                marginRight: "8px",
              }}
            >
              <PlayArrowIcon />
            </IconButton>
          </Tooltip>

          {/* 수정 버튼, 삭제 버튼은 작성자에게만 보여줍니다 */}
          {quiz.createdBy === userId && (
            <>
              <Tooltip title="퀴즈 수정">
                <IconButton
                  color="secondary"
                  onClick={() => navigate(`/edit-quiz/${quiz._id}`)}
                  sx={{
                    backgroundColor: "#ff9800",
                    color: "#fff",
                    borderRadius: "8px",
                    marginRight: "8px",
                  }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="퀴즈 삭제">
                <IconButton
                  color="error"
                  onClick={() => onDelete(quiz._id)}
                  sx={{
                    backgroundColor: "#f44336",
                    color: "#fff",
                    borderRadius: "8px",
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>

        {/* 좋아요 버튼 및 수 */}
        <Box display="flex" alignItems="center">
          <IconButton onClick={handleLikeToggle} disabled={isLiking}>
            <Badge badgeContent={likeCount} color="error">
              {liked ? (
                <FavoriteIcon color="error" /> // 좋아요가 눌려있을 때 (색칠된 하트)
              ) : (
                <FavoriteBorderIcon /> // 좋아요가 안 눌려있을 때 (비어있는 하트)
              )}
            </Badge>
          </IconButton>
        </Box>
      </CardActions>
    </Card>
  );
};

export default QuizCard;
