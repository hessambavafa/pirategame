export const GAME_TITLE = 'Pirate Cannon Cove';
export const STORAGE_KEY = 'pirate-cannon-cove-save-v1';
export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 720;

export const SCENES = {
  BOOT: 'boot',
  MENU: 'main-menu',
  MAP: 'world-map',
  LEVEL: 'level',
  RESULTS: 'results',
};

export const DEPTHS = {
  SKY: 0,
  WATER: 10,
  GAMEPLAY: 40,
  FX: 70,
  UI: 100,
  MODAL: 140,
  DEBUG: 160,
};

export const HEARTS = 3;
export const QUICK_PLAY_HEARTS = 3;

export const CARGO_TYPES = [
  { id: 'coin', label: 'coins' },
  { id: 'crate', label: 'crates' },
  { id: 'barrel', label: 'barrels' },
  { id: 'cannonball', label: 'cannonballs' },
];

export const TIER_SETTINGS = {
  1: {
    name: 'Sunny Warm-Up',
    minNumber: 1,
    maxNumber: 10,
    speed: [34, 48],
    choiceRange: [2, 3],
    support: 0.95,
    hint: 0.9,
  },
  2: {
    name: 'Treasure Tides',
    minNumber: 3,
    maxNumber: 16,
    speed: [42, 58],
    choiceRange: [3, 4],
    support: 0.72,
    hint: 0.62,
  },
  3: {
    name: 'Crew Counting',
    minNumber: 4,
    maxNumber: 20,
    speed: [50, 66],
    choiceRange: [3, 4],
    support: 0.46,
    hint: 0.38,
  },
  4: {
    name: 'Captain Clever',
    minNumber: 6,
    maxNumber: 24,
    speed: [58, 76],
    choiceRange: [4, 4],
    support: 0.28,
    hint: 0.22,
  },
};
