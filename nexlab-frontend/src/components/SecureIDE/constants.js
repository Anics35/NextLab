const AUTO_SAVE_INTERVAL = 10000;
const LEFT_MIN = 22;
const LEFT_MAX = 48;
const CENTER_MIN = 28;
const RIGHT_MIN = 18;
const RIGHT_MAX = 40;

export const formatTime = (seconds) => {
  const safe = Math.max(0, Number(seconds) || 0);
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${mm.toString().padStart(2, '0')}:${ss.toString().padStart(2, '0')}`;
};

export const getProblemId = (problem) => problem?._id || problem?.id;
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export { AUTO_SAVE_INTERVAL, LEFT_MIN, LEFT_MAX, CENTER_MIN, RIGHT_MIN, RIGHT_MAX };
