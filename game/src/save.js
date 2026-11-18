// SOLMAR HEAT — save: cash, mission progress and best score in localStorage.
// Everything is guarded: private windows and disabled storage just lose the save.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return { cash: 150, missionIndex: 0, completed: [], busted: 0 };
    const data = JSON.parse(raw);
    return {
      cash: Number(data.cash) || 0,
      missionIndex: Number(data.missionIndex) || 0,
      completed: Array.isArray(data.completed) ? data.completed : [],
      busted: Number(data.busted) || 0,
    };
  } catch {
    return { cash: 150, missionIndex: 0, completed: [], busted: 0 };
  }
}

export function storeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage unavailable: the session still plays, it just does not persist.
  }
}
