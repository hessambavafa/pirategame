export const CANNON_SKINS = [
  { id: 'sunburst', label: 'Sunburst', unlockAt: 0, palette: { base: 0xf2ad4e, band: 0xfff1b1, glow: 0xffd46d } },
  { id: 'coral-pop', label: 'Coral Pop', unlockAt: 3, palette: { base: 0xff7b73, band: 0xffd8b7, glow: 0xffb08f } },
  { id: 'seafoam-zap', label: 'Seafoam Zap', unlockAt: 7, palette: { base: 0x44d4c9, band: 0xe7fff8, glow: 0x8ef7ef } },
  { id: 'mango-burst', label: 'Mango Burst', unlockAt: 11, palette: { base: 0xffae3d, band: 0xffef9d, glow: 0xffc760 } },
  { id: 'moon-pearl', label: 'Moon Pearl', unlockAt: 15, palette: { base: 0xc0d3ff, band: 0xf9f4ff, glow: 0xe2f0ff } },
];

export const FLAGS = [
  { id: 'classic', label: 'Classic Flag', unlockAt: 0, color: 0xff5b5b },
  { id: 'starfish', label: 'Starfish Flag', unlockAt: 4, color: 0xffa93a },
  { id: 'lagoon', label: 'Lagoon Flag', unlockAt: 8, color: 0x37d7ff },
  { id: 'rainbow', label: 'Rainbow Flag', unlockAt: 12, color: 0x9a6bff },
  { id: 'captain-gold', label: 'Captain Gold', unlockAt: 16, color: 0xf7d256 },
];

export const PETS = [
  { id: 'parrot', label: 'Mr. Sussy', unlockAt: 0 },
  { id: 'crab', label: 'Clap Crab', unlockAt: 5 },
  { id: 'turtle', label: 'Tide Turtle', unlockAt: 9 },
  { id: 'dolphin', label: 'Spritz Dolphin', unlockAt: 13 },
  { id: 'monkey', label: 'Coco Monkey', unlockAt: 17 },
];

export const DECORATIONS = [
  { id: 'palm', label: 'Palm Arch', unlockAt: 0 },
  { id: 'lantern', label: 'Lantern Dock', unlockAt: 6 },
  { id: 'sandcastle', label: 'Sandcastle', unlockAt: 10 },
  { id: 'shell-gate', label: 'Shell Gate', unlockAt: 14 },
  { id: 'waterfall', label: 'Waterfall', unlockAt: 18 },
];

export const COSMETIC_CATALOG = {
  skins: CANNON_SKINS,
  flags: FLAGS,
  pets: PETS,
  decorations: DECORATIONS,
};

export function getUnlocksForLevel(levelId) {
  return Object.entries(COSMETIC_CATALOG).flatMap(([category, items]) =>
    items.filter((item) => item.unlockAt === levelId).map((item) => ({ ...item, category })),
  );
}

export function getCatalog(category) {
  return COSMETIC_CATALOG[category] ?? [];
}

export function getCatalogItem(category, itemId) {
  return getCatalog(category).find((item) => item.id === itemId);
}
