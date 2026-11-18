// SOLMAR HEAT — shots: the four screenshot scenes. Each one stages the real
// game (real world, real systems, a short autopilot drive) and then paints
// it, so every screenshot is a frame the game itself produced.
import { STEP } from './config.js';

function driveForward(game, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    game.debugDrive({ forward: true, steer: 0 });
    game.step(STEP);
  }
}

function walkForward(game, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    game.debugWalk({ forward: true });
    game.step(STEP);
  }
}

// Stage `name` (chase | walk | mission | start) on a fresh game and return
// the screen the HUD should show over it.
export function stageShot(name, game) {
  game.resetWorld();
  if (name === 'chase') {
    game.debugPlaceCar(0, 60, 0);
    game.debugSetWanted(3);
    game.debugCamera('chase');
    driveForward(game, 2.2);
    // Police close in from ahead only after the drive, so they are in frame.
    game.debugSpawnPolice(2);
    driveForward(game, 0.6);
    return 'play';
  }
  if (name === 'walk') {
    game.debugPlacePlayer(12, 24);
    game.debugGatherPeds(12, 24, 12);
    game.debugCamera('walk');
    walkForward(game, 1.2);
    return 'play';
  }
  if (name === 'mission') {
    game.debugStartMission(0);
    // On the beachfront road, heading for the docks beacon straight ahead.
    game.debugPlaceCar(-120, 140, 0);
    game.debugCamera('chase');
    driveForward(game, 1.4);
    return 'play';
  }
  // start: an aerial view of the plaza at sunset, title screen on top.
  game.debugCamera('aerial');
  game.step(STEP);
  return 'start';
}
