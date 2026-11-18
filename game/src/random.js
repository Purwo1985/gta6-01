// SOLMAR HEAT — dice: every roll in Porto Solmar comes from one seeded
// stream, so a fixed seed rebuilds the same streets, towers and traffic
// every run, screenshots included. The core recurrence is mulberry32,
// kept bit-for-bit on purpose: WORLD_SEED must still lay out the city
// the four screenshots show. Everything around the core — the helpers,
// the extra draws, the shape of the factory — is written fresh here.
function mulberry32(seedWord) {
  let acc = (seedWord >>> 0) || 1;
  return function draw() {
    acc |= 0;
    acc = (acc + 0x6d2b79f5) | 0;
    let mixed = Math.imul(acc ^ (acc >>> 15), 1 | acc);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandom(seed) {
  const draw = mulberry32(seed);
  const bag = {
    next: draw,
    range(lo, hi) {
      return lo + draw() * (hi - lo);
    },
    int(lo, hi) {
      return Math.floor(lo + draw() * (hi - lo + 1));
    },
    pick(entries) {
      return entries[Math.floor(draw() * entries.length)];
    },
    chance(probability) {
      return draw() < probability;
    },
    // A new draw: shuffle a copy of the list in place and hand it back.
    shuffle(entries) {
      const deck = entries.slice();
      for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(draw() * (i + 1));
        const held = deck[i];
        deck[i] = deck[j];
        deck[j] = held;
      }
      return deck;
    },
    // A new draw: pick with weights, so rare things stay rare.
    weighted(pairs) {
      let total = 0;
      for (const [, weight] of pairs) total += weight;
      let roll = draw() * total;
      for (const [value, weight] of pairs) {
        roll -= weight;
        if (roll <= 0) return value;
      }
      return pairs[pairs.length - 1][0];
    },
  };
  return bag;
}
