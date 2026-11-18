// SOLMAR HEAT — shots: the four screenshot scenes. Each one stages the
// real game — the real world, the real systems, a short autopilot drive —
// and then paints it, so every screenshot is a frame the game itself
// produced, never a mock-up. ?shot=chase|walk|mission|start picks one.
import { STEP } from './config.js';

function autopilotDrive(game, seconds) {
  const ticks = Math.floor(seconds / STEP);
  for (let i = 0; i < ticks; i += 1) {
    game.debugDrive({ forward: true, steer: 0 });
    game.step(STEP);
  }
}

function autopilotWalk(game, seconds) {
  const ticks = Math.floor(seconds / STEP);
  for (let i = 0; i < ticks; i += 1) {
    game.debugWalk({ forward: true });
    game.step(STEP);
  }
}

const STAGES = {
  chase(game) {
    game.debugPlaceCar(0, 60, 0);
    game.debugSetWanted(3);
    game.debugCamera('chase');
    autopilotDrive(game, 2.2);
    // Patrol cars close in from ahead only after the drive, so the
    // chase is already in frame when the picture is taken.
    game.debugSpawnPolice(2);
    autopilotDrive(game, 0.6);
    return 'play';
  },
  walk(game) {
    game.debugPlacePlayer(12, 24);
    game.debugGatherPeds(12, 24, 12);
    game.debugCamera('walk');
    autopilotWalk(game, 1.2);
    return 'play';
  },
  mission(game) {
    game.debugStartMission(0);
    // On the beachfront road, driving for the docks beacon dead ahead.
    game.debugPlaceCar(-120, 140, 0);
    game.debugCamera('chase');
    autopilotDrive(game, 1.4);
    return 'play';
  },
  start(game) {
    // An aerial look at the plaza at sunset, title screen on top.
    game.debugCamera('aerial');
    game.step(STEP);
    return 'start';
  },
};

// Stage `name` (chase | walk | mission | start) on a fresh game and hand
// back the screen the HUD should show over the finished frame.
export function stageShot(name, game) {
  game.resetWorld();
  const stage = STAGES[name] ?? STAGES.start;
  return stage(game);
}
