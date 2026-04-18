import { STORAGE_KEY } from '../constants.js';
import { getCatalog, getUnlocksForLevel } from '../content/unlocks.js';
import { clamp } from '../helpers/random.js';
import { loadStorage, saveStorage } from '../helpers/storage.js';

const DEFAULT_SAVE = {
  version: 1,
  settings: {
    muted: false,
    debugPanel: false,
  },
  story: {
    unlockedLevel: 1,
    completedLevels: {},
  },
  quickPlay: {
    bestScore: 0,
    bestWave: 0,
  },
  wallet: {
    gold: 0,
    gems: 0,
  },
  cosmetics: {
    ownedSkins: ['sunburst'],
    selectedSkin: 'sunburst',
    ownedFlags: ['classic'],
    selectedFlag: 'classic',
    ownedPets: ['parrot'],
    selectedPet: 'parrot',
    ownedDecorations: ['palm'],
    selectedDecoration: 'palm',
  },
  tuning: {
    speedBias: 0,
    numberBias: 0,
    hintBias: 0,
  },
};

const CATEGORY_KEYS = {
  skins: ['ownedSkins', 'selectedSkin'],
  flags: ['ownedFlags', 'selectedFlag'],
  pets: ['ownedPets', 'selectedPet'],
  decorations: ['ownedDecorations', 'selectedDecoration'],
};

export class SaveSystem {
  constructor(storageKey = STORAGE_KEY) {
    this.storageKey = storageKey;
    this.state = this.load();
  }

  attach(game) {
    this.game = game;
  }

  load() {
    const loaded = loadStorage(this.storageKey, DEFAULT_SAVE);
    const merged = {
      ...DEFAULT_SAVE,
      ...loaded,
      settings: { ...DEFAULT_SAVE.settings, ...(loaded.settings ?? {}) },
      story: { ...DEFAULT_SAVE.story, ...(loaded.story ?? {}) },
      quickPlay: { ...DEFAULT_SAVE.quickPlay, ...(loaded.quickPlay ?? {}) },
      wallet: { ...DEFAULT_SAVE.wallet, ...(loaded.wallet ?? {}) },
      cosmetics: { ...DEFAULT_SAVE.cosmetics, ...(loaded.cosmetics ?? {}) },
      tuning: { ...DEFAULT_SAVE.tuning, ...(loaded.tuning ?? {}) },
    };

    Object.entries(CATEGORY_KEYS).forEach(([category, [ownedKey, selectedKey]]) => {
      const catalog = getCatalog(category);
      const starter = catalog[0]?.id;
      const ownedSet = new Set(merged.cosmetics[ownedKey] ?? []);

      if (starter) {
        ownedSet.add(starter);
      }

      merged.cosmetics[ownedKey] = [...ownedSet].filter((itemId) => catalog.some((item) => item.id === itemId));

      if (!merged.cosmetics[ownedKey].includes(merged.cosmetics[selectedKey])) {
        merged.cosmetics[selectedKey] = merged.cosmetics[ownedKey][0] ?? starter;
      }
    });

    return merged;
  }

  commit() {
    saveStorage(this.storageKey, this.state);
    this.game?.events?.emit('save-updated', this.state);
  }

  isLevelUnlocked(levelId) {
    return levelId <= this.state.story.unlockedLevel;
  }

  getLevelRecord(levelId) {
    return this.state.story.completedLevels[levelId] ?? null;
  }

  getSelectedCosmetics() {
    const cosmetics = this.state.cosmetics;
    return {
      skin: cosmetics.selectedSkin,
      flag: cosmetics.selectedFlag,
      pet: cosmetics.selectedPet,
      decoration: cosmetics.selectedDecoration,
    };
  }

  toggleMute() {
    this.state.settings.muted = !this.state.settings.muted;
    this.commit();
    return this.state.settings.muted;
  }

  toggleDebugPanel() {
    this.state.settings.debugPanel = !this.state.settings.debugPanel;
    this.commit();
    return this.state.settings.debugPanel;
  }

  adjustTuning(key, delta) {
    this.state.tuning[key] = clamp((this.state.tuning[key] ?? 0) + delta, -3, 3);
    this.commit();
    return this.state.tuning[key];
  }

  cycleSelection(category, direction = 1) {
    const [ownedKey, selectedKey] = CATEGORY_KEYS[category];
    const owned = this.state.cosmetics[ownedKey];

    if (!owned.length) {
      return null;
    }

    const currentIndex = Math.max(0, owned.indexOf(this.state.cosmetics[selectedKey]));
    const nextIndex = (currentIndex + direction + owned.length) % owned.length;
    this.state.cosmetics[selectedKey] = owned[nextIndex];
    this.commit();
    return this.state.cosmetics[selectedKey];
  }

  completeLevel(level, summary) {
    const currentRecord = this.state.story.completedLevels[level.id] ?? {
      stars: 0,
      bestScore: 0,
    };
    const stars = clamp(1 + (summary.heartsLeft >= 3 ? 1 : 0) + (summary.mistakes === 0 ? 1 : 0), 1, 3);
    const goldAwarded = level.reward.gold + summary.goldBonus;
    const gemsAwarded = level.reward.gems + (summary.perfectWaves >= level.waves ? 1 : 0);
    const newUnlocks = [];

    this.state.story.completedLevels[level.id] = {
      stars: Math.max(currentRecord.stars, stars),
      bestScore: Math.max(currentRecord.bestScore, summary.score),
      accuracy: Math.max(currentRecord.accuracy ?? 0, summary.accuracy),
      perfect: currentRecord.perfect || summary.mistakes === 0,
    };

    this.state.story.unlockedLevel = Math.max(this.state.story.unlockedLevel, Math.min(level.id + 1, 18));
    this.state.wallet.gold += goldAwarded;
    this.state.wallet.gems += gemsAwarded;

    getUnlocksForLevel(level.id).forEach((unlock) => {
      const [ownedKey] = CATEGORY_KEYS[unlock.category];

      if (!this.state.cosmetics[ownedKey].includes(unlock.id)) {
        this.state.cosmetics[ownedKey].push(unlock.id);
        newUnlocks.push(unlock);
      }
    });

    this.commit();

    return {
      stars,
      goldAwarded,
      gemsAwarded,
      newUnlocks,
      unlockedLevel: this.state.story.unlockedLevel,
    };
  }

  recordQuickPlay(summary) {
    this.state.quickPlay.bestScore = Math.max(this.state.quickPlay.bestScore, summary.score);
    this.state.quickPlay.bestWave = Math.max(this.state.quickPlay.bestWave, summary.wave);
    this.state.wallet.gold += summary.goldAwarded;
    this.state.wallet.gems += summary.gemsAwarded;
    this.commit();
  }
}
