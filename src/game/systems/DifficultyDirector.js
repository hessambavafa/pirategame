import { TIER_SETTINGS } from '../constants.js';
import { clamp, lerp } from '../helpers/random.js';

export class DifficultyDirector {
  constructor(tuning = {}) {
    this.syncTuning(tuning);
    this.reset('story');
  }

  syncTuning(tuning = {}) {
    this.tuning = {
      speedBias: tuning.speedBias ?? 0,
      numberBias: tuning.numberBias ?? 0,
      hintBias: tuning.hintBias ?? 0,
    };
  }

  reset(mode = 'story') {
    this.mode = mode;
    this.recentResults = [];
    this.streak = 0;
    this.templateStruggles = {};
    this.lastProfile = null;
  }

  recordWaveResult({ templateId, correct, responseMs, mistakes = 0 }) {
    if (correct) {
      this.streak += 1;
      this.templateStruggles[templateId] = Math.max(0, (this.templateStruggles[templateId] ?? 0) - 1);
    } else {
      this.streak = 0;
      this.templateStruggles[templateId] = (this.templateStruggles[templateId] ?? 0) + 1;
    }

    this.recentResults.push({ templateId, correct, responseMs, mistakes });

    if (this.recentResults.length > 10) {
      this.recentResults.shift();
    }
  }

  getMetrics(templateId = null) {
    const recent = this.recentResults.slice(-8);
    const accuracy = recent.length ? recent.filter((result) => result.correct).length / recent.length : 0.72;
    const averageResponse = recent.length
      ? recent.reduce((sum, result) => sum + result.responseMs, 0) / recent.length
      : 3400;
    const struggle = templateId ? this.templateStruggles[templateId] ?? 0 : 0;

    return {
      accuracy,
      averageResponse,
      streak: this.streak,
      struggle,
    };
  }

  buildProfile({
    tier,
    waveIndex = 0,
    quickPlayWave = 0,
    templateId = null,
    levelIndex = 0,
    storyProgress = 0,
  }) {
    const tierBase = TIER_SETTINGS[tier];
    const metrics = this.getMetrics(templateId);
    const responseSkill = clamp((4800 - metrics.averageResponse) / 2800, 0, 1);
    const streakSkill = clamp(metrics.streak / 5, 0, 1);
    const strugglePenalty = clamp(metrics.struggle * 0.12, 0, 0.34);
    const rawSkill = clamp(
      metrics.accuracy * 0.5 + responseSkill * 0.32 + streakSkill * 0.18 - strugglePenalty,
      0,
      1,
    );

    const progressFade = this.mode === 'quick'
      ? clamp(quickPlayWave / 16, 0, 1)
      : clamp(levelIndex / 17 * 0.7 + storyProgress * 0.3, 0, 1);

    const paceBoost = this.mode === 'quick' ? quickPlayWave * 1.9 : waveIndex * 0.8;
    const speedBias = this.tuning.speedBias * 4;
    const numberBias = this.tuning.numberBias * 2;
    const hintBias = this.tuning.hintBias * 0.12;

    const shipSpeed =
      lerp(tierBase.speed[0], tierBase.speed[1], rawSkill) +
      paceBoost +
      speedBias -
      strugglePenalty * 10;
    const numberMax = clamp(
      Math.round(lerp(tierBase.minNumber + 3, tierBase.maxNumber, 0.45 + rawSkill * 0.55)) + numberBias,
      tierBase.minNumber,
      tierBase.maxNumber,
    );
    const choiceCount = clamp(
      tierBase.choiceRange[0] + (rawSkill > 0.45 ? 1 : 0) + (rawSkill > 0.82 ? 1 : 0),
      tierBase.choiceRange[0],
      tierBase.choiceRange[1],
    );
    const supportLevel = clamp(
      tierBase.support - rawSkill * 0.34 - progressFade * 0.28 + strugglePenalty * 0.56 + hintBias,
      0.05,
      1,
    );
    const hintStrength = clamp(
      tierBase.hint - rawSkill * 0.36 - progressFade * 0.18 + strugglePenalty * 0.52 + hintBias,
      0.03,
      1,
    );
    const movementAmount = clamp(0.18 + rawSkill * 0.55 + tier * 0.08, 0.18, 1);
    const supportMode = supportLevel >= 0.78 ? 'strong' : supportLevel >= 0.46 ? 'medium' : 'light';
    const candidateAssist = supportLevel >= 0.82;
    const showChoiceLabels = supportLevel >= 0.62 || tier === 1;
    const showGroupPads = supportLevel >= 0.22;
    const showHelperTags = supportLevel >= 0.52;

    this.lastProfile = {
      tier,
      choiceCount,
      numberMax,
      shipSpeed,
      supportLevel,
      supportMode,
      candidateAssist,
      showChoiceLabels,
      showGroupPads,
      showHelperTags,
      hintStrength,
      movementAmount,
      rawSkill,
      progressFade,
      metrics,
    };

    return this.lastProfile;
  }

  getDebugSnapshot() {
    return this.lastProfile ?? {
      tier: 1,
      choiceCount: 2,
      numberMax: 10,
      shipSpeed: 40,
      supportLevel: 1,
      supportMode: 'strong',
      candidateAssist: true,
      showChoiceLabels: true,
      showGroupPads: true,
      showHelperTags: true,
      hintStrength: 1,
      movementAmount: 0.2,
      rawSkill: 0.4,
      progressFade: 0,
      metrics: this.getMetrics(),
    };
  }
}
