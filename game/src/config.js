// SOLMAR HEAT — config: every tuning number for the city, the player, cars,
// traffic, police, missions and the HUD lives here so balancing is one file.
export const CITY = {
  blocks: 7, // 7 x 7 blocks of buildings
  blockSize: 46,
  roadWidth: 14,
  // Half-extent of the drivable city, derived from blocks.
  get half() { return (this.blocks * (this.blockSize + this.roadWidth)) / 2; },
  // World Y of the road surface.
  groundY: 0,
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
};

export const POLICE = {
  maxCars: 5,
  chaseSpeed: 34,
  ramDamage: 9,
  bustRange: 2.4,
  // Wanted stars decay after this many seconds with no police in sight.
  decaySeconds: 14,
};

export const MISSIONS = [
  {
    id: 1,
    title: 'The Package',
    giver: 'MARA',
    brief: 'Mara needs a parcel picked up from the docks. Get to the yellow marker.',
    lines: [
      'MARA: Rico, you are late. Again.',
      'MARA: Grab the parcel at the docks. No questions, no cops.',
      'RICO: On it. Tell the harbour rats I say hi.',
    ],
    reward: 250,
    kind: 'goto',
  },
  {
    id: 2,
    title: 'Hot Wheels',
    giver: 'MARA',
    brief: 'A patrol spotted you. Lose the heat — stay out of sight until the stars fade.',
    lines: [
      'MARA: You tripped a patrol camera. Lose them, Rico.',
      'RICO: They always pick the prettiest driver to chase.',
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
      'TIO BENNY: My knees, Rico! The hotel, and step on it!',
      'RICO: Buckle up, Tio. Solmar traffic waits for no one.',
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
      'MARA: Vault is open. Drive like the whole city is watching.',
      'RICO: It is. That is the fun part.',
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
