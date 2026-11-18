// SOLMAR HEAT — save: Rico's cash, job progress and bust count, kept in
// localStorage between sessions. A save file is untrusted input by the
// time it is read back — a player can edit it, a browser can corrupt it,
// a private window can refuse storage outright — so every field is
// re-validated here and the game always falls back to a fresh start
// instead of crashing the boot.
import { MISSIONS, SAVE_KEY } from './config.js';

function freshSave() {
  return { cash: 150, missionIndex: 0, completed: [], busted: 0 };
}

function clampIndex(raw) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(MISSIONS.length - 1, Math.floor(parsed)));
}

function cleanCompleted(raw) {
  if (!Array.isArray(raw)) return [];
  const kept = [];
  for (const entry of raw) {
    const id = Number(entry);
    if (Number.isInteger(id) && id >= 1 && id <= MISSIONS.length && !kept.includes(id)) {
      kept.push(id);
    }
  }
  return kept;
}

function cleanAmount(raw) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

export function loadSave() {
  let raw = null;
  try {
    raw = window.localStorage.getItem(SAVE_KEY);
  } catch {
    return freshSave();
  }
  if (!raw) return freshSave();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return freshSave();
  }
  if (!parsed || typeof parsed !== 'object') return freshSave();
  return {
    cash: cleanAmount(parsed.cash),
    missionIndex: clampIndex(parsed.missionIndex),
    completed: cleanCompleted(parsed.completed),
    busted: cleanAmount(parsed.busted),
  };
}

export function storeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage refused (private mode, quota, disabled): the run still
    // plays to the end, it simply will not remember it tomorrow.
  }
}
