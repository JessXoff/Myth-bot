import { readFile, writeFile } from "node:fs/promises";

const STATE_PATH = new URL("../state.json", import.meta.url);

export async function loadState() {
  const raw = await readFile(STATE_PATH, "utf8");
  return JSON.parse(raw);
}

export async function saveState(state) {
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf8");
}

/**
 * Returns true if enough real time has passed since the last post to post again.
 * Using elapsed time (not a raw cron day-of-month pattern) so the 3-day cadence
 * doesn't drift or double up around month boundaries.
 */
export function isDueToPost(state, { intervalDays = 3, minHoursGrace = 6 } = {}) {
  if (!state.lastPostedAt) return true;
  const last = new Date(state.lastPostedAt).getTime();
  const now = Date.now();
  const elapsedHours = (now - last) / (1000 * 60 * 60);
  const thresholdHours = intervalDays * 24 - minHoursGrace;
  return elapsedHours >= thresholdHours;
}

/**
 * Given the myth list and current state, return the myth + part to post next,
 * along with whether this is the myth's first part / last part.
 */
export function getCurrentTarget(myths, state) {
  const myth = myths[state.mythIndex % myths.length];
  const part = myth.parts[state.partIndex % myth.parts.length];
  return {
    myth,
    part,
    partNumber: state.partIndex + 1,
    totalParts: myth.parts.length,
    isFirstPart: state.partIndex === 0,
    isLastPart: state.partIndex === myth.parts.length - 1,
  };
}

/** Advance state to the next part (or next myth, wrapping around the whole list). */
export function advance(myths, state) {
  const myth = myths[state.mythIndex % myths.length];
  const next = { ...state };
  if (state.partIndex + 1 < myth.parts.length) {
    next.partIndex = state.partIndex + 1;
  } else {
    next.partIndex = 0;
    next.mythIndex = state.mythIndex + 1;
    if (next.mythIndex >= myths.length) {
      next.mythIndex = 0;
      next.cycleCount = (state.cycleCount || 0) + 1;
    }
  }
  next.lastPostedAt = new Date().toISOString();
  return next;
}
