import { Howl } from "howler";

// ===== 사운드 파일 import =====
import waiting1 from "../assets/sounds/waiting1.mp3";
import waiting2 from "../assets/sounds/waiting2.mp3";

import playing1 from "../assets/sounds/playing1.mp3";
import playing2 from "../assets/sounds/playing2.mp3";
import playing3 from "../assets/sounds/playing3.mp3";
import playing4 from "../assets/sounds/playing4.mp3";
import playing5 from "../assets/sounds/playing5.mp3";

import next1 from "../assets/sounds/next1.mp3";
import next2 from "../assets/sounds/next2.mp3";

import participating from "../assets/sounds/participating.mp3";
import answer1 from "../assets/sounds/answer1.mp3";
import answer2 from "../assets/sounds/answer2.mp3";
import ticking from "../assets/sounds/ticking.mp3";
import winner1 from "../assets/sounds/winner1.mp3";
import drumroll1 from "../assets/sounds/drumroll1.mp3";
import drumroll2 from "../assets/sounds/drumroll2.mp3";
import rankReveal from "../assets/sounds/rank-reveal.mp3";
import swoosh from "../assets/sounds/swoosh.mp3";
import slideIn from "../assets/sounds/slide-in.mp3";
import boardFlip from "../assets/sounds/board-flip.mp3";

// ===== 볼륨 · 음소거 전역 =====
// localStorage에서 값 로드, 없으면 기본값 사용
let masterMute = localStorage.getItem("kahootMasterMute") === "true";
let bgmVol = Number(localStorage.getItem("kahootBgmVol") ?? 0.5);
let seVol = Number(localStorage.getItem("kahootSeVol") ?? 1.0);
let isBgmDucked = false; // BGM 음량 감소 상태 추적
let activeDrumroll: Howl | null = null; // 드럼롤 인스턴스 추적

// --- 추가: 한 세션 내에서 랜덤 사운드를 고정하기 위한 캐시 ---
const latchedSounds: { [key: string]: string } = {};

const pickAndLatch = (type: string, sounds: string[]): string => {
  if (latchedSounds[type]) {
    return latchedSounds[type];
  }
  const sound = sounds[Math.floor(Math.random() * sounds.length)];
  latchedSounds[type] = sound;
  return sound;
};

export const getInitialVolumes = () => ({
  bgm: bgmVol,
  se: seVol,
  mute: masterMute,
});

export const setBgmVolume = (v: number) => {
  bgmVol = Math.max(0, Math.min(1, v));
  localStorage.setItem("kahootBgmVol", bgmVol.toString());
  if (bgmRef.howl && !masterMute) {
    // Ducking 상태를 고려하여 최종 볼륨 설정
    const targetVol = isBgmDucked ? bgmVol * 0.3 : bgmVol;
    bgmRef.howl.volume(targetVol);
  }
};

export const setSeVolume = (v: number) => {
  seVol = Math.max(0, Math.min(1, v));
  localStorage.setItem("kahootSeVol", seVol.toString());
  if (tickingSound) {
    tickingSound.volume(seVol);
  }
};

export const toggleMute = () => {
  masterMute = !masterMute;
  localStorage.setItem("kahootMasterMute", masterMute.toString());
  // mute() 메서드를 사용하여 음소거 상태만 토글
  if (bgmRef.howl) bgmRef.howl.mute(masterMute);
  if (tickingSound) tickingSound.mute(masterMute);
  return masterMute;
};

// BGM 을 한 번에 하나만 유지
const bgmRef: { howl: Howl | null; src: string | null } = {
  howl: null,
  src: null,
};

// ===== Fade-out 전용 =====
export const fadeOutBgm = (ms = 600) => {
  if (!bgmRef.howl) return;
  const h = bgmRef.howl;
  h.fade(h.volume(), 0, ms);
  setTimeout(() => {
    if (h === bgmRef.howl) {
      h.stop();
      h.unload();
      bgmRef.howl = null;
      bgmRef.src = null;
    }
  }, ms);
};

// ===== Ticking SE (Stateful, Loop) =====
let tickingSound: Howl | null = null;

export const startTickingLoop = () => {
  if (tickingSound?.playing()) {
    return;
  }
  if (tickingSound) {
    tickingSound.unload();
  }
  tickingSound = new Howl({
    src: [ticking],
    loop: true,
    volume: seVol, // Volume은 항상 seVol 값으로 설정
    mute: masterMute, // 음소거 상태는 mute 속성으로 제어
  });
  tickingSound.play();
};

export const stopTickingLoop = () => {
  if (tickingSound) {
    tickingSound.fade(tickingSound.volume(), 0, 200);
    tickingSound.once("fade", () => {
      if (tickingSound) {
        tickingSound.stop();
        tickingSound.unload();
        tickingSound = null;
      }
    });
  }
};

// ===== 내부 헬퍼 =====
const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

// BGM 재생 (이전 트랙은 부드럽게 페이드-아웃)
export const playRandomBgm = (
  type: "waiting" | "playing" | "winner",
  loop = true
) => {
  let src: string;
  if (type === "waiting") {
    const waitingSongs = [waiting1, waiting2];
    const availableSongs =
      bgmRef.src && waitingSongs.length > 1
        ? waitingSongs.filter((s) => s !== bgmRef.src)
        : waitingSongs;
    src = pick(availableSongs);
  } else {
    src = {
      playing: pick([playing1, playing2, playing3, playing4, playing5]),
      winner: winner1,
    }[type];
  }

  isBgmDucked = false; // 새로운 BGM이 시작되면 Ducking 상태 초기화
  fadeOutBgm(600);

  bgmRef.howl = new Howl({
    src: [src],
    loop,
    volume: bgmVol, // Volume은 항상 bgmVol 값으로 설정
    mute: masterMute, // 음소거 상태는 mute 속성으로 제어
  });
  bgmRef.src = src;
  bgmRef.howl.play();
};

// ===== 최종 승자 발표 시퀀스 (수정) =====
export const playWinnerSequence = (onDrumrollEnd?: () => void) => {
  /* 1) 현재 재생 중인 BGM을 빠르게 내린다 */
  if (bgmRef.howl) fadeOutBgm(200);
  isBgmDucked = false;

  /* 2) 드럼롤이 이미 있으면 정리 */
  if (activeDrumroll) {
    activeDrumroll.stop();
    activeDrumroll.unload();
    activeDrumroll = null;
  }

  /* 3) 드럼롤 재생 */
  const DRUMROLL_MS = 3500; // 드럼롤 길이(근사값)
  const OVERLAP_MS = 500; // 끝나기 0.5 s 전에 BGM 겹치기
  const WINNER_SRC = winner1; // 승자 BGM 파일

  activeDrumroll = new Howl({
    src: [drumroll2], // 수정: drumroll2로 고정
    volume: seVol,
    mute: masterMute,

    onplay: () => {
      /* 3-1) 드럼롤 종료 0.5 s 전에 Winner BGM을 볼륨 0으로 시작 */
      const startWinnerAt = DRUMROLL_MS - OVERLAP_MS;
      setTimeout(() => {
        const winnerHowl = new Howl({
          src: [WINNER_SRC],
          loop: true,
          volume: 0,
          mute: masterMute,
        });
        winnerHowl.play();
        winnerHowl.fade(0, bgmVol, OVERLAP_MS); // 0.5 s 동안 페이드-인

        /* bgmRef 갱신 */
        bgmRef.howl = winnerHowl;
        bgmRef.src = WINNER_SRC;
      }, startWinnerAt);
    },

    onend: () => {
      activeDrumroll = null;
      onDrumrollEnd?.(); // 포디움 등장 등 UI 트리거
    },
  });

  activeDrumroll.play();
};

// ===== BGM Ducking Controll =====
export const duckBgm = (factor = 0.5, duration = 400) => {
  if (!bgmRef.howl || isBgmDucked || masterMute) return;
  isBgmDucked = true;
  // 현재 설정된 bgmVol을 기준으로 음량을 줄임
  bgmRef.howl.fade(bgmRef.howl.volume(), bgmVol * factor, duration);
};

export const unduckBgm = (duration = 600, factor = 1.0) => {
  if (!bgmRef.howl || !isBgmDucked || masterMute) return;
  isBgmDucked = false;
  // 원래 설정된 bgmVol에 factor를 곱한 값으로 복구합니다.
  // 단, 최종 볼륨이 1.0 (100%)을 넘지 않도록 제한합니다.
  const targetVolume = Math.min(bgmVol * factor, 1.0);
  bgmRef.howl.fade(bgmRef.howl.volume(), targetVolume, duration);
};

export const stopBgm = () => {
  if (activeDrumroll) {
    activeDrumroll.stop();
    activeDrumroll.unload();
    activeDrumroll = null;
  }
  fadeOutBgm(800);
};

// ===== SE (Fire-and-forget) (수정) =====
export const playSe = (
  name:
    | "participating"
    | "next"
    | "answer"
    | "rank-reveal"
    | "swoosh"
    | "slide-in"
    | "board-flip"
    | "drumroll1",
  options?: { rate?: number }
): Howl => {
  const src = {
    participating,
    next: pickAndLatch("next", [next1, next2]),
    answer: pickAndLatch("answer", [answer1, answer2]),
    "rank-reveal": rankReveal,
    swoosh: swoosh,
    "slide-in": slideIn,
    "board-flip": boardFlip,
    drumroll1: drumroll1,
  }[name];
  const howl = new Howl({
    src: [src],
    volume: seVol,
    mute: masterMute,
    rate: options?.rate ?? 1.0,
  });
  howl.play();
  return howl;
};
