import React, { useEffect, useState } from "react";
import { Box, Typography, Slide } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import { useSpring, animated } from "@react-spring/web";
import "./QuizFeedback.css";

interface QuizFeedbackComponentProps {
  feedbackMessage: string | null;
  isLastQuestion: boolean;
  score: number;
}

const QuizFeedbackComponent: React.FC<QuizFeedbackComponentProps> = ({
  feedbackMessage,
  isLastQuestion,
  score,
}) => {
  const [showFinalMessage, setShowFinalMessage] = useState(false);
  const [prevScore, setPrevScore] = useState(0);
  const isCorrect = feedbackMessage?.includes("정답");
  const feedbackColor = isCorrect ? "#4caf50" : "#f44336";
  const FeedbackIcon = isCorrect ? CheckCircleIcon : CancelIcon;

  const props = useSpring({
    number: isCorrect ? score : prevScore,
    from: { number: prevScore },
    config: { duration: 1500 },
  });

  useEffect(() => {
    setPrevScore(score);
  }, [score]);

  useEffect(() => {
    if (isLastQuestion) {
      const timer = setTimeout(() => {
        setShowFinalMessage(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isLastQuestion]);

  return (
    <Slide direction="up" in={!!feedbackMessage} mountOnEnter unmountOnExit>
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <FeedbackIcon sx={{ fontSize: 80, color: feedbackColor, mb: 2 }} />
        <animated.div>
          <Typography
            variant="h3"
            sx={{
              color: feedbackColor,
              fontWeight: "bold",
              animation: "fadeIn 1s ease",
            }}
          >
            <animated.span>
              {props.number.to((n: number) => n.toFixed(0))}
            </animated.span>
          </Typography>
        </animated.div>

        {isLastQuestion && showFinalMessage && (
          <>
            <Typography
              variant="h5"
              sx={{
                color: "#ffffff",
                mt: 3,
                backgroundColor: "#424242",
                padding: "15px 25px",
                borderRadius: "16px",
                boxShadow: "0 8px 16px rgba(0, 0, 0, 0.4)",
                textAlign: "center",
                fontWeight: "bold",
                letterSpacing: "2px",
                textTransform: "uppercase",
                animation: "pulse 2s infinite",
              }}
            >
              모든 문제가 끝났습니다!
            </Typography>
          </>
        )}
      </Box>
    </Slide>
  );
};

export default QuizFeedbackComponent;
