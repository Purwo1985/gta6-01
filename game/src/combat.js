// SOLMAR HEAT — combat: the punch. Short range, a cooldown, knockback, and
// the crime it causes: hitting a pedestrian or a cop raises the wanted level.
// Car rams are handled by the police and vehicle code, not here.
import { PLAYER, POLICE } from './config.js';

export function resolvePunch(player, traffic, police, audio, onCrime) {
  if (!player.punch()) return;
  audio.punch();
  const fx = Math.sin(player.heading);
  const fz = Math.cos(player.heading);
  const hx = player.pos.x + fx * 1.4;
  const hz = player.pos.z + fz * 1.4;
  const ped = traffic.nearestPed(hx, hz, PLAYER.punchRange);
  if (ped) {
    // Knock the pedestrian down the street and remove them from the crowd.
    ped.pos.x += fx * 4;
    ped.pos.z += fz * 4;
    ped.panic = 3;
    onCrime('assault');
    return;
  }
  const { car, dist } = police.nearestCar(player.pos);
  if (car && dist < PLAYER.punchRange + 1.5) {
    car.health -= PLAYER.punchDamage;
    onCrime('assault');
    if (car.health <= 0) {
      const idx = police.cars.indexOf(car);
      if (idx >= 0) police.cars.splice(idx, 1);
      car.remove();
    }
  }
}

// Damage the player; returns true when the player is busted (health gone).
export function damagePlayer(player, amount) {
  player.health = Math.max(0, player.health - amount);
  return player.health <= 0;
}

export function ramDamage() { return POLICE.ramDamage; }
