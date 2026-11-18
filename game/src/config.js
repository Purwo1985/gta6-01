// SOLMAR HEAT — tuning: every number the game balances on, in one place.
// City geometry, Rico on foot, the cars, the crowds, the police and the
// five jobs. Nothing else in the game hard-codes a speed, a price or a
// distance — change it here and the whole city feels it.
export const CITY = {
  blocks: 7,
  blockSize: 46,
  roadWidth: 14,
  groundY: 0,
  // Half the width of the drivable grid, from the block count.
  get half() {
    return (this.blocks * (this.blockSize + this.roadWidth)) / 2;
  },
};

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 11,
  radius: 0.55,
  height: 1.8,
  maxHealth: 100,
  punchRange: 2.2,
  punchDamage: 34,
  punchCooldown: 0.45,
  // How far a punch sends a pedestrian sliding down the street.
  punchKnockback: 4,
};

export const CAR = {
  accel: 26,
  brake: 42,
  reverseAccel: 14,
  maxSpeed: 38,
  maxReverse: 10,
  turnRate: 2.1,
  drag: 0.55,
  grip: 6.5,
  maxHealth: 100,
};

export const TRAFFIC = {
  carCount: 14,
  pedCount: 26,
  carSpeed: 9,
  pedSpeed: 1.6,
  // Chance each second that a traffic car turns at an intersection.
  turnChance: 0.25,
};

export const POLICE = {
  maxCars: 5,
  chaseSpeed: 34,
  ramDamage: 9,
  bustRange: 2.4,
  // A fresh patrol car appears about this far from Rico, on a road.
  spawnDistance: 55,
  // Seconds out of sight before one star quietly fades away.
  decaySeconds: 14,
};

export const MISSIONS = [
  {
    id: 1,
    title: 'The Package',
    giver: 'MARA',
    brief: 'Mara needs a parcel picked up from the docks. Get to the yellow marker.',
    lines: [
      'MARA: Late again, Rico. The docks. The parcel. No detours.',
      'MARA: Harbour rats ask questions. You do not answer them.',
      'RICO: Relax. I was born late — it is my whole brand.',
    ],
    reward: 250,
    kind: 'goto',
  },
  {
    id: 2,
    title: 'Hot Wheels',
    giver: 'MARA',
    brief: 'A patrol camera caught your face. Stay out of sight until the stars fade.',
    lines: [
      'MARA: The cameras have you, Rico. Go dark until they forget.',
      'RICO: Me? Forgettable? Mara, I am the whole show.',
    ],
    reward: 400,
    kind: 'escape',
    wanted: 2,
  },
  {
    id: 3,
    title: 'Fare Game',
    giver: 'TIO BENNY',
    brief: 'Tio Benny needs a cab, fast. Steal any car and drop him at the Palms Hotel.',
    lines: [
      'TIO BENNY: Rico! These knees were not built for waiting!',
      'RICO: Get in, Tio. Solmar traffic waits for no one — especially us.',
    ],
    reward: 350,
    kind: 'taxi',
  },
  {
    id: 4,
    title: 'The Getaway',
    giver: 'MARA',
    brief: 'The crew hit the marina vault. Drive the getaway car to the safehouse — cops on your tail.',
    lines: [
      'MARA: Vault is open. Drive like the whole city is watching you.',
      'RICO: It is watching. That is the best part.',
    ],
    reward: 900,
    kind: 'getaway',
    wanted: 3,
  },
  {
    id: 5,
    title: 'The Big Score',
    giver: 'MARA',
    brief: 'One last job: lift the cash van at the bank, then vanish. Finish this and Solmar is yours.',
    lines: [
      'MARA: The cash van parks at the bank at sunset. Take it.',
      'RICO: After this, no more running. Solmar is ours.',
    ],
    reward: 2500,
    kind: 'heist',
    wanted: 4,
  },
];

export const SAVE_KEY = 'solmar-heat-save-v1';
export const STEP = 1 / 60;
export const WORLD_SEED = 20261118;
