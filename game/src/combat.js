// SOLMAR HEAT — combat: Rico's fists, and what they cost him. A punch is
// short range with a cooldown, it knocks a pedestrian sprawling, and it
// is always a crime — the street sees it, and the wanted level answers.
// Car rams live with the police and vehicle code instead, not here.
import { PLAYER } from './config.js';
import { resolveCollisions } from './city.js';

function forwardOf(heading) {
  return { x: Math.sin(heading), z: Math.cos(heading) };
}

export function resolvePunch(player, traffic, police, audio, onCrime, city) {
  if (!player.punch()) return;
  audio.punch();
  const facing = forwardOf(player.heading);
  const fistX = player.pos.x + facing.x * 1.4;
  const fistZ = player.pos.z + facing.z * 1.4;
  const victim = traffic.nearestPed(fistX, fistZ, PLAYER.punchRange);
  if (victim) {
    // Shove the pedestrian down the street, then bounce them out of any
    // wall the shove would have put them through.
    victim.pos.x += facing.x * PLAYER.punchKnockback;
    victim.pos.z += facing.z * PLAYER.punchKnockback;
    if (city) resolveCollisions(city.colliders, city.half, victim.pos, 0.55);
    victim.panic = 3;
    onCrime('assault');
    return;
  }
  const { car, dist } = police.nearestCar(player.pos);
  if (!car || dist >= PLAYER.punchRange + 1.5) return;
  car.health -= PLAYER.punchDamage;
  onCrime('assault');
  if (car.health > 0) return;
  const slot = police.cars.indexOf(car);
  if (slot >= 0) police.cars.splice(slot, 1);
  car.remove();
}

// Hurt Rico by `amount`; true when his health is gone and he is busted.
export function damagePlayer(player, amount) {
  player.health = Math.max(0, player.health - amount);
  return player.health <= 0;
}
