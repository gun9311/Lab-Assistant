import React, { useEffect, useState, useLayoutEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useSprings, animated } from "react-spring";
import { playSe, duckBgm, unduckBgm } from "../../../../utils/soundManager";
import ReactConfetti from "react-confetti";
import ReactDOM from "react-dom";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import "./TopRankers.css";

// 타입 정의 추가
declare const require: {
  context: (
    path: string,
    deep?: boolean,
    filter?: RegExp
  ) => {
    keys: () => string[];
    (key: string): string;
  };
};

// 이미지 디렉토리에서 모든 이미지를 가져와 배열로 관리
const images = require.context("../../../../assets/character", false, /\.png$/);

// 파일 이름을 기준으로 정렬하여 배열 생성
const characterImages = images
  .keys()
  .sort((a: string, b: string) => {
    const numA = parseInt(a.match(/\d+/)![0], 10);
    const numB = parseInt(b.match(/\d+/)![0], 10);
    return numA - numB;
  })
  .map((key: string) => images(key));

type TopRankersProps = {
  topRankers: {
    id: string;
    name: string;
    character: string;
    rank?: number;
    prevRank?: number;
  }[];
  isLastQuestion: boolean;
  onAnimationComplete: () => void;
};

// 화면 크기를 가져오는 헬퍼 훅
const useWindowSize = () => {
  const [size, setSize] = useState([0, 0]);
  useLayoutEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, []);
  return size;
};

// 헬퍼 함수: rank를 기반으로 화면상 위치(top, left)를 계산합니다.
const getPositionForRank = (
  rank: number | undefined
): { top: number; left: number } => {
  if (rank === undefined || rank > 10) {
    return { top: 120, left: 50 }; // % 단위
  }
  const index = rank - 1;
  if (index < 3) {
    return {
      top: index === 0 ? 4 : index === 1 ? 35 : 36,
      left: index === 0 ? 49 : index === 1 ? 33.5 : 63.5,
    };
  } else {
    return {
      top: 79,
      left: 26.5 + (index - 3) * 6.7,
    };
  }
};

const AnimatedBox = animated(Box);

// ======== NEW - reveal timing constants ========
const LIST_START_DELAY = 1000; // 포디움 등장 후 10~4위 공개 전 대기
const LIST_REVEAL_INTERVAL = 700; // 10~4위 공개 간격
const BETWEEN_TOP3_DELAY = 1200; // 3·2·1위 사이 휴지기
const TOP3_HOLD_DURATION = 1000; // 이름 공개 후 머무는 시간
const MEDAL_APPEAR_DURATION = 500; // 메달 나타난 후 대기
const MEDAL_FLIP_DURATION = 800; // 메달 뒤집히는 시간
const SILHOUETTE_HOLD_DURATION = 2500; // 실루엣 유지 시간
const SILHOUETTE_REVEAL_DURATION = 1500; // 실루엣 공개 시간
// ==============================================

const TopRankers: React.FC<TopRankersProps> = ({
  topRankers,
  isLastQuestion,
  onAnimationComplete,
}) => {
  const [latchedRankers, setLatchedRankers] = useState<typeof topRankers>([]);
  const [width, height] = useWindowSize();
  const [visibleIndices, setVisibleIndices] = useState<number[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [medalsToShow, setMedalsToShow] = useState<number[]>([]);
  const [isFlipping, setIsFlipping] = useState<number[]>([]);
  const [firstPlaceAnimState, setFirstPlaceAnimState] = useState<
    "hidden" | "pulsing" | "revealing" | "revealed"
  >("hidden");

  useEffect(() => {
    if (!showConfetti) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showConfetti]);

  useEffect(() => {
    if (latchedRankers.length === 0 && topRankers.length > 0) {
      setLatchedRankers(
        [...topRankers].sort((a, b) => (a.rank ?? 11) - (b.rank ?? 11))
      );
    }
  }, [topRankers, latchedRankers]);

  const springs = useSprings(
    latchedRankers.length,
    latchedRankers.map((_, idx) => {
      const visible = visibleIndices.includes(idx);
      return {
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translate(-50%, -100%) scale(1)"
          : "translate(-50%, -100%) scale(0.4)",
        config: { mass: 1, tension: 280, friction: 20 },
      };
    })
  );

  useEffect(() => {
    if (latchedRankers.length === 0) return;

    const timeouts: NodeJS.Timeout[] = [];
    const wait = (ms: number) =>
      new Promise((res) => timeouts.push(setTimeout(res, ms)));

    const revealNames = async () => {
      /* ---------- 10~4위 ---------- */
      await wait(LIST_START_DELAY);
      for (let i = latchedRankers.length - 1; i > 2; i--) {
        setVisibleIndices((prev) => [...prev, i]);
        await wait(LIST_REVEAL_INTERVAL);
      }

      /* ---------- 3위 ---------- */
      await wait(BETWEEN_TOP3_DELAY);
      setMedalsToShow((prev) => [...prev, 3]);
      await wait(MEDAL_APPEAR_DURATION);
      setIsFlipping((prev) => [...prev, 3]);
      await wait(MEDAL_FLIP_DURATION);
      setVisibleIndices((prev) => [...prev, 2]);
      await wait(TOP3_HOLD_DURATION);

      /* ---------- 2위 ---------- */
      await wait(BETWEEN_TOP3_DELAY);
      setMedalsToShow((prev) => [...prev, 2]);
      await wait(MEDAL_APPEAR_DURATION);
      setIsFlipping((prev) => [...prev, 2]);
      await wait(MEDAL_FLIP_DURATION);
      setVisibleIndices((prev) => [...prev, 1]);
      await wait(TOP3_HOLD_DURATION);

      /* ---------- 1위 ---------- */
      await wait(BETWEEN_TOP3_DELAY + 600); // 1위는 조금 더 여유
      duckBgm(0.3);
      playSe("drumroll1");
      setFirstPlaceAnimState("pulsing");
      setVisibleIndices((prev) => [...prev, 0]);
      await wait(SILHOUETTE_HOLD_DURATION);

      setFirstPlaceAnimState("revealing");
      setShowConfetti(true);
      await wait(SILHOUETTE_REVEAL_DURATION);
      setFirstPlaceAnimState("revealed");
      unduckBgm(1000, 1.2);

      await wait(TOP3_HOLD_DURATION);
      onAnimationComplete();
    };

    revealNames();
    return () => timeouts.forEach(clearTimeout);
  }, [latchedRankers, onAnimationComplete]);

  return (
    <>
      {showConfetti &&
        ReactDOM.createPortal(
          <Box
            sx={{
              position: "fixed",
              inset: 0, // top:0, right:0, bottom:0, left:0
              zIndex: 1500,
              pointerEvents: "none",
            }}
          >
            <ReactConfetti width={width} height={height} gravity={0.12} />
          </Box>,
          document.body
        )}

      {/* === 메달 컴포넌트 렌더링 === */}
      {latchedRankers.map((student, index) => {
        const rank = student.rank;
        if (!rank || (rank !== 2 && rank !== 3)) return null;

        const finalPos = getPositionForRank(rank);
        const showMedal =
          medalsToShow.includes(rank) && !visibleIndices.includes(index);

        if (!showMedal) return null;

        return (
          <Box
            key={`${student.id}-medal`}
            className={isFlipping.includes(rank) ? "medal-flipping" : ""}
            sx={{
              position: "absolute",
              top: `${finalPos.top}%`,
              left: `${finalPos.left}%`,
              transform: "translate(-50%, -100%)",
              width: "20%",
              textAlign: "center",
              zIndex: 2,
            }}
          >
            <EmojiEventsIcon
              sx={{
                fontSize: "18vw",
                color: rank === 2 ? "#C0C0C0" : "#CD7F32", // 은색, 동색
                filter: `drop-shadow(0 0 15px ${
                  rank === 2 ? "#E0E0E0" : "#A46628"
                })`,
              }}
            />
          </Box>
        );
      })}

      {springs.map((props, index) => {
        const student = latchedRankers[index];
        const isNameVisible = visibleIndices.includes(index);
        const imageSize =
          student.rank! <= 3 ? (student.rank === 1 ? "62%" : "62%") : "33%";
        const finalPos = getPositionForRank(student.rank);
        const isWinner =
          student.rank === 1 && firstPlaceAnimState === "revealed";

        const getFirstPlaceStyles = () => {
          if (student.rank !== 1) return {};

          switch (firstPlaceAnimState) {
            case "pulsing":
              return {
                animation: "pulse-glow 2s infinite ease-in-out",
                // 실루엣 즉시 적용을 위해 트랜지션 없음
                transition: "none",
              };
            case "revealing":
              return {
                // filter를 직접 제어하는 대신, 더 극적인 애니메이션 사용
                animation: `dramatic-reveal ${SILHOUETTE_REVEAL_DURATION}ms forwards ease-out`,
                // 애니메이션이 filter를 제어하므로, 기본 filter는 실루엣 상태로 유지
                filter: "brightness(0)",
                transition: "none",
              };
            default:
              return {};
          }
        };

        return (
          <AnimatedBox
            key={student.id}
            style={{
              ...props,
              top: `${finalPos.top}%`,
              left: `${finalPos.left}%`,
            }}
            sx={{
              position: "absolute",
              textAlign: "center",
              width: "20%",
              height: "auto",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                top: "-30px",
                left: "50%",
                transform: "translateX(-50%)",
                display: "flex",
                justifyContent: "center",
                width: "100%",
                zIndex: 1,
                opacity: isNameVisible ? 1 : 0,
                transition: "opacity 0.5s ease-in-out",
              }}
            >
              <Typography
                sx={{
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  color: "#fff",
                  borderRadius: "4px",
                  padding: "0.2rem 0.5rem",
                  fontWeight: "bold",
                  fontSize: student.rank! <= 3 ? "2.3vw" : "1.5vw",
                  zIndex: 1,
                }}
              >
                {student.name}
              </Typography>
            </Box>
            <animated.img
              src={
                characterImages[
                  parseInt(student.character.replace("character", "")) - 1
                ]
              }
              alt={`${student.name}'s character`}
              style={{
                width: imageSize,
                height: "auto",
                zIndex: 0,
                // 1위 금색 테두리(shine) 효과 제거
                animation: isWinner ? `winner-bounce 1s ease-in-out` : "",
                ...getFirstPlaceStyles(),
              }}
            />
          </AnimatedBox>
        );
      })}
    </>
  );
};

export default TopRankers;
