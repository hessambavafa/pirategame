import { CARGO_TYPES } from '../constants.js';
import { toGroupedParts } from '../helpers/formatters.js';
import { clamp, pick, randomInt, shuffle } from '../helpers/random.js';

export const CHALLENGE_TEMPLATE_IDS = [
  'choose_total_from_visual_groups',
  'choose_larger_or_smaller_ship',
  'split_treasure_evenly',
  'count_equal_barrels_or_crates',
  'hit_marker_matching_grouped_objects',
  'find_remaining_after_storm',
];

const MAX_VISUAL_ANSWER_TOTAL = 9;
const MAX_VISUAL_COMPARE_TOTAL = 8;
const MAX_VISUAL_SHARE_TOTAL = 12;
const MAX_VISUAL_GROUP_SIZE = 4;
const MAX_PROMPT_TOTAL = 18;
const MAX_REMAINING_TOTAL = 18;
const MAX_SHARE_TOTAL = 12;

const TIER_QUALITY_RULES = {
  1: {
    totalMax: 10,
    compareMax: 10,
    compareGapMin: 2,
    remainingMax: 10,
    takeAwayMax: 3,
    markerTotalMax: 10,
    maxAddends: 2,
    allowMakeTen: false,
    allowOneMoreLess: false,
    allowEqualGroups: false,
    allowFairShare: false,
  },
  2: {
    totalMax: 16,
    compareMax: 16,
    compareGapMin: 2,
    remainingMax: 14,
    takeAwayMax: 4,
    markerTotalMax: 14,
    maxAddends: 3,
    allowMakeTen: true,
    allowOneMoreLess: false,
    allowEqualGroups: false,
    allowFairShare: false,
  },
  3: {
    totalMax: 20,
    compareMax: 18,
    compareGapMin: 2,
    remainingMax: 16,
    takeAwayMax: 5,
    markerTotalMax: 18,
    maxAddends: 3,
    allowMakeTen: true,
    allowOneMoreLess: true,
    allowEqualGroups: false,
    allowFairShare: false,
  },
  4: {
    totalMax: 24,
    compareMax: 24,
    compareGapMin: 3,
    remainingMax: 18,
    takeAwayMax: 6,
    markerTotalMax: 22,
    maxAddends: 3,
    allowMakeTen: true,
    allowOneMoreLess: true,
    allowEqualGroups: true,
    allowFairShare: true,
  },
};

export class ChallengeFactory {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.recentTemplates = [];
    this.recentFamilies = [];
    this.recentQuestionKeys = [];
    this.lastThemeId = null;
  }

  pickTemplate(allowedTemplates, previousTemplateId = null) {
    const recentBlockCount = Math.min(2, Math.max(0, allowedTemplates.length - 1));
    const blocked = new Set(this.recentTemplates.slice(-recentBlockCount));
    if (previousTemplateId) {
      blocked.add(previousTemplateId);
    }

    let filtered = allowedTemplates.filter((templateId) => !blocked.has(templateId));
    if (!filtered.length) {
      filtered = allowedTemplates.filter((templateId) => templateId !== previousTemplateId);
    }

    const chosen = pick(filtered.length ? filtered : allowedTemplates, this.rng);
    this.recentTemplates.push(chosen);
    if (this.recentTemplates.length > 4) {
      this.recentTemplates.shift();
    }
    return chosen;
  }

  createChallenge({ templateId, profile, tier }) {
    const builder = TEMPLATE_BUILDERS[templateId] ?? TEMPLATE_BUILDERS.choose_total_from_visual_groups;
    let acceptedChallenge = null;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const theme = this.pickTheme(templateId);
      const challenge = builder({ rng: this.rng, tier, profile, theme });

      if (!this.validateChallengeQuality(challenge, { tier, profile })) {
        continue;
      }

      acceptedChallenge = { ...challenge, theme };
      break;
    }

    if (!acceptedChallenge) {
      const theme = this.pickTheme(templateId);
      acceptedChallenge = { ...builder({ rng: this.rng, tier, profile, theme }), theme };
    }

    this.rememberChallenge(acceptedChallenge);

    return {
      ...acceptedChallenge,
      templateId,
      tier,
      supportLevel: profile.supportLevel,
      supportMode: profile.supportMode,
      candidateAssist: profile.candidateAssist,
      hintStrength: profile.hintStrength,
      choiceCount: profile.choiceCount,
      shipSpeed: profile.shipSpeed,
      movementAmount: profile.movementAmount,
      showChoiceLabels: profile.showChoiceLabels,
      showGroupPads: profile.showGroupPads,
      showHelperTags: profile.showHelperTags,
    };
  }

  pickTheme(templateId) {
    if (templateId === 'split_treasure_evenly') {
      return { id: 'coin', label: 'coins' };
    }

    const themePool = CARGO_TYPES.filter((candidate) => candidate.id !== this.lastThemeId);
    const theme = pick(themePool.length ? themePool : CARGO_TYPES, this.rng);
    this.lastThemeId = theme.id;
    return theme;
  }

  rememberChallenge(challenge) {
    if (challenge.familyId) {
      this.recentFamilies.push(challenge.familyId);
      if (this.recentFamilies.length > 6) {
        this.recentFamilies.shift();
      }
    }

    if (challenge.qualityKey) {
      this.recentQuestionKeys.push(challenge.qualityKey);
      if (this.recentQuestionKeys.length > 8) {
        this.recentQuestionKeys.shift();
      }
    }
  }

  validateChallengeQuality(challenge, { tier }) {
    if (!challenge?.options?.length) {
      return false;
    }

    const correctCount = challenge.options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
      return false;
    }

    const optionKeys = challenge.options.map(optionSignature);
    if (new Set(optionKeys).size !== optionKeys.length) {
      return false;
    }

    if ((challenge.instruction ?? '').length > 54) {
      return false;
    }

    if ((challenge.subInstruction ?? '').length > 28) {
      return false;
    }

    if (challenge.qualityKey && this.recentQuestionKeys.slice(-4).includes(challenge.qualityKey)) {
      return false;
    }

    const recentFamilies = this.recentFamilies.slice(-2);
    if (challenge.familyId && recentFamilies.length >= 2 && recentFamilies.every((family) => family === challenge.familyId)) {
      return false;
    }

    const rules = TIER_QUALITY_RULES[tier] ?? TIER_QUALITY_RULES[1];
    const meta = challenge.qualityMeta ?? {};

    switch (challenge.familyId) {
      case 'count-total':
      case 'make-ten-total':
        if (meta.total > rules.totalMax) {
          return false;
        }
        if (!Array.isArray(meta.addends) || meta.addends.length < 2 || meta.addends.length > rules.maxAddends) {
          return false;
        }
        if (meta.addends.every((value) => value === meta.addends[0])) {
          return false;
        }
        break;
      case 'compare-more':
      case 'compare-less':
        if (Math.max(...meta.values) > rules.compareMax) {
          return false;
        }
        if (minimumGap(meta.values) < rules.compareGapMin) {
          return false;
        }
        break;
      case 'take-away-left':
        if (meta.startTotal > rules.remainingMax || meta.remaining < 1 || meta.lost > rules.takeAwayMax) {
          return false;
        }
        break;
      case 'count-total-to-number':
        if (meta.total > rules.markerTotalMax || !Array.isArray(meta.groups) || meta.groups.length > rules.maxAddends) {
          return false;
        }
        break;
      case 'make-ten':
        if (!rules.allowMakeTen || meta.target !== 10 || meta.needed < 1 || meta.needed > 9) {
          return false;
        }
        break;
      case 'one-more-less':
        if (!rules.allowOneMoreLess || Math.abs(meta.delta) !== 1 || meta.base < 2) {
          return false;
        }
        break;
      case 'equal-groups':
        if (!rules.allowEqualGroups || meta.groupCount > 3 || meta.each > 4 || meta.total > 12) {
          return false;
        }
        break;
      case 'fair-share':
        if (!rules.allowFairShare || meta.receivers > 3 || meta.share > 4 || meta.total > MAX_SHARE_TOTAL) {
          return false;
        }
        break;
      default:
        break;
    }

    return true;
  }
}

function phrase(options, rng) {
  return pick(options, rng);
}

function makeNumberVisual(number, itemId, extras = {}) {
  return {
    kind: 'number',
    itemId,
    number,
    label: extras.label ?? null,
    helperTag: extras.helperTag ?? null,
    badgeText: extras.badgeText ?? null,
  };
}

function makeShareVisual(receivers, share, itemId, extras = {}) {
  return {
    kind: 'share',
    itemId,
    groups: Array(receivers).fill(share),
    showNumber: extras.showNumber ?? false,
    number: share,
    receivers,
    emphasizeEqual: true,
    label: extras.label ?? null,
    helperTag: extras.helperTag ?? null,
  };
}

function groupTotal(groups) {
  return groups.reduce((sum, amount) => sum + amount, 0);
}

function groupsSignature(groups) {
  return groups.join('-');
}

function optionSignature(option) {
  if (option.cargo?.kind === 'groups' || option.cargo?.kind === 'share') {
    return `${option.targetStyle}:${option.cargo.kind}:${groupsSignature(option.cargo.groups ?? [])}`;
  }

  return `${option.targetStyle}:${option.cargo?.kind ?? 'unknown'}:${option.value}`;
}

function canUseVisualAnswer(groups, mode = 'total') {
  const total = groupTotal(groups);
  const maxGroup = Math.max(...groups);
  const limits = mode === 'compare'
    ? { total: MAX_VISUAL_COMPARE_TOTAL, groups: 4, size: MAX_VISUAL_GROUP_SIZE }
    : mode === 'share'
      ? { total: MAX_VISUAL_SHARE_TOTAL, groups: 4, size: MAX_VISUAL_GROUP_SIZE }
      : { total: MAX_VISUAL_ANSWER_TOTAL, groups: 4, size: MAX_VISUAL_GROUP_SIZE };

  return total <= limits.total && groups.length <= limits.groups && maxGroup <= limits.size;
}

function makeAnswerCargo({ value, itemId, preferredGroupSize = 4, groups = null, mode = 'total', badgeText = null }) {
  const actualGroups = groups ?? toGroupedParts(value, preferredGroupSize);

  if (!canUseVisualAnswer(actualGroups, mode)) {
    return makeNumberVisual(value, itemId, { badgeText: badgeText ?? (mode === 'share' ? 'each' : null) });
  }

  if (mode === 'share') {
    return makeShareVisual(actualGroups.length, actualGroups[0] ?? value, itemId);
  }

  return {
    kind: 'groups',
    itemId,
    groups: actualGroups,
    showNumber: false,
    emphasizeEqual: false,
    number: value,
  };
}

function buildAnswerOptions(values, correctValue, itemId, config = {}) {
  return values.map((value) => {
    const cargo = makeAnswerCargo({
      value,
      itemId,
      preferredGroupSize: config.visualGroupSize ?? 4,
      groups: config.groupsForValue ? config.groupsForValue(value) : null,
      mode: config.mode ?? 'total',
      badgeText: config.badgeText ?? null,
    });

    return {
      value,
      targetStyle: config.targetStyle ?? 'ship',
      label: config.showChoiceLabels && cargo.kind !== 'number' ? String(value) : null,
      cargo,
      isCorrect: value === correctValue,
    };
  });
}

function capChoiceCount(profileChoiceCount, tier, minChoices = 2, maxChoices = 4) {
  const tierCap = tier === 1 ? 3 : tier === 2 ? 3 : maxChoices;
  return clamp(profileChoiceCount, minChoices, Math.min(maxChoices, tierCap));
}

function minimumGap(values = []) {
  if (values.length < 2) {
    return 99;
  }

  const ordered = [...values].sort((a, b) => a - b);
  let gap = Number.POSITIVE_INFINITY;

  for (let index = 1; index < ordered.length; index += 1) {
    gap = Math.min(gap, ordered[index] - ordered[index - 1]);
  }

  return gap;
}

function createMeaningfulChoices(correctValue, count, min, max, rng, minGap = 1) {
  const values = new Set([correctValue]);
  const offsets = shuffle([
    -4, -3, -2, -1, 1, 2, 3, 4, -5, 5, -6, 6,
  ], rng);

  offsets.forEach((offset) => {
    if (values.size >= count) {
      return;
    }
    const candidate = correctValue + offset;
    if (candidate >= min && candidate <= max && Math.abs(candidate - correctValue) >= minGap) {
      values.add(candidate);
    }
  });

  while (values.size < count) {
    const candidate = clamp(correctValue + randomInt(-6, 6, rng), min, max);
    if (Math.abs(candidate - correctValue) >= minGap || candidate === correctValue) {
      values.add(candidate);
    }
  }

  return shuffle([...values], rng);
}

function buildCompareValues(count, minValue, maxValue, minGap, rng) {
  const maxSpread = Math.max(minGap + 1, maxValue - minValue - minGap * (count - 1));
  const start = randomInt(minValue, Math.max(minValue, maxValue - minGap * (count - 1) - 1), rng);
  const values = [start];

  while (values.length < count) {
    const previous = values[values.length - 1];
    const next = Math.min(maxValue, previous + minGap + randomInt(0, Math.min(2, maxSpread), rng));
    if (next <= previous) {
      break;
    }
    values.push(next);
  }

  if (values.length === count) {
    return values;
  }

  const fallback = new Set([randomInt(minValue, maxValue - minGap * (count - 1), rng)]);
  while (fallback.size < count) {
    const ordered = [...fallback].sort((a, b) => a - b);
    const base = ordered[ordered.length - 1];
    fallback.add(Math.min(maxValue, base + minGap + 1));
  }
  return [...fallback].sort((a, b) => a - b);
}

function buildPartWholeGroups({ tier, rng, maxTotal }) {
  const maxAddends = TIER_QUALITY_RULES[tier].maxAddends;
  const addendCount = tier === 1 ? 2 : rng() > 0.65 ? Math.min(3, maxAddends) : 2;
  let groups = [];
  let attempts = 0;

  while (attempts < 40) {
    attempts += 1;
    const total = randomInt(addendCount + 1, maxTotal, rng);
    groups = partitionTotal(total, addendCount, Math.min(9, maxTotal - 1), rng);

    if (!groups.every((value) => value === groups[0])) {
      return shuffle(groups, rng);
    }
  }

  return shuffle([2, maxTotal - 2], rng);
}

function partitionTotal(total, parts, maxPart, rng) {
  const groups = [];
  let remaining = total;

  for (let index = 0; index < parts; index += 1) {
    const partsLeft = parts - index - 1;
    const minHere = 1;
    const maxHere = Math.min(maxPart, remaining - partsLeft);
    const value = index === parts - 1 ? remaining : randomInt(minHere, maxHere, rng);
    groups.push(value);
    remaining -= value;
  }

  return groups;
}

function makeMarkerNumberOptions(correctValue, choiceCount, itemId, rng, min = 0, max = 20) {
  return createMeaningfulChoices(correctValue, choiceCount, min, max, rng, 1).map((value) => ({
    value,
    targetStyle: 'marker',
    label: null,
    cargo: makeNumberVisual(value, itemId),
    isCorrect: value === correctValue,
  }));
}

function makeUnevenGroups(groupCount, baseValue, rng) {
  const groups = Array(groupCount).fill(baseValue);
  const from = randomInt(0, groupCount - 1, rng);
  let to = randomInt(0, groupCount - 1, rng);

  while (to === from) {
    to = randomInt(0, groupCount - 1, rng);
  }

  groups[from] = Math.max(1, groups[from] - 1);
  groups[to] += 1;
  return shuffle(groups, rng);
}

function buildEqualGroupOptions(groupCount, each, itemId, choiceCount, rng) {
  const total = groupCount * each;
  const correctGroups = Array(groupCount).fill(each);
  const options = [
    {
      value: total,
      groups: correctGroups,
      targetStyle: 'ship',
      label: null,
      cargo: {
        kind: 'groups',
        itemId,
        groups: correctGroups,
        showNumber: false,
        emphasizeEqual: false,
        number: total,
      },
      isCorrect: true,
    },
  ];
  const seen = new Set([groupsSignature(correctGroups)]);

  const candidateGroups = [
    Array(groupCount).fill(Math.max(1, each - 1)),
    Array(groupCount).fill(each + 1),
    makeUnevenGroups(groupCount, each, rng),
  ];

  if (groupCount === 2) {
    candidateGroups.push(Array(3).fill(Math.max(1, Math.floor(total / 3))));
  } else if (groupCount === 3) {
    candidateGroups.push([Math.max(1, each + 1), each, Math.max(1, each - 1)]);
  }

  shuffle(candidateGroups, rng).forEach((groups) => {
    if (options.length >= choiceCount) {
      return;
    }
    if (groupTotal(groups) > 12) {
      return;
    }

    const signature = groupsSignature(groups);
    if (seen.has(signature)) {
      return;
    }

    seen.add(signature);
    options.push({
      value: groupTotal(groups),
      groups,
      targetStyle: 'ship',
      label: null,
      cargo: {
        kind: 'groups',
        itemId,
        groups,
        showNumber: false,
        emphasizeEqual: false,
        number: groupTotal(groups),
      },
      isCorrect: false,
    });
  });

  return shuffle(options, rng);
}

const TEMPLATE_BUILDERS = {
  choose_total_from_visual_groups({ rng, profile, tier, theme }) {
    const rules = TIER_QUALITY_RULES[tier];
    const maxTotal = Math.min(MAX_PROMPT_TOTAL, profile.numberMax, rules.totalMax);
    const groups = buildPartWholeGroups({ tier, rng, maxTotal });
    const total = groupTotal(groups);
    const choiceCount = capChoiceCount(profile.choiceCount, tier, 2, 4);
    const choices = createMeaningfulChoices(total, choiceCount, 1, Math.max(total + 4, rules.totalMax), rng, 1);
    const familyId = total === 10 && tier >= 2 ? 'make-ten-total' : 'count-total';

    return {
      accentColor: 0xffc961,
      instruction: phrase([
        `Tap the ship with ${total} ${theme.label} in all`,
        `Which ship has ${total} ${theme.label} in all?`,
        `Tap the ship with ${total} total ${theme.label}`,
      ], rng),
      subInstruction: familyId === 'make-ten-total'
        ? phrase(['Make 10', 'Put both piles together'], rng)
        : phrase(['Count them all', 'Put the piles together', 'How many in all?'], rng),
      promptVisual: {
        kind: 'groups',
        itemId: theme.id,
        groups,
        showNumber: false,
        number: total,
        helperTag: profile.showHelperTags ? `${groups.join(' + ')} = ${total}` : null,
      },
      options: buildAnswerOptions(choices, total, theme.id, {
        targetStyle: 'ship',
        visualGroupSize: 4,
        showChoiceLabels: profile.showChoiceLabels,
        mode: 'total',
      }),
      targetMode: 'single-correct',
      responseGoalMs: 4500 - tier * 340,
      learningTag: familyId === 'make-ten-total' ? 'make ten and number bonds' : 'counting all and part-part-whole',
      familyId,
      qualityKey: `${familyId}:${theme.id}:${groupsSignature(groups)}`,
      qualityMeta: {
        total,
        addends: groups,
      },
    };
  },

  choose_larger_or_smaller_ship({ rng, profile, tier, theme }) {
    const rules = TIER_QUALITY_RULES[tier];
    const choiceCount = capChoiceCount(profile.choiceCount, tier, 2, tier >= 4 ? 4 : 3);
    const values = buildCompareValues(choiceCount, 2, Math.min(profile.numberMax, rules.compareMax), rules.compareGapMin, rng);
    const goal = rng() > 0.5 ? 'larger' : 'smaller';
    const correctValue = goal === 'larger' ? Math.max(...values) : Math.min(...values);

    return {
      accentColor: goal === 'larger' ? 0x57d6a8 : 0x78beff,
      instruction: goal === 'larger'
        ? phrase([
          `Tap the ship with MORE ${theme.label}`,
          `Which ship has MORE ${theme.label}?`,
        ], rng)
        : phrase([
          `Tap the ship with LESS ${theme.label}`,
          `Which ship has LESS ${theme.label}?`,
        ], rng),
      subInstruction: goal === 'larger' ? 'Look for the bigger pile' : 'Look for the smaller pile',
      promptVisual: {
        kind: 'comparison',
        itemId: theme.id,
        goal,
      },
      options: values.map((value) => {
        const cargo = makeAnswerCargo({
          value,
          itemId: theme.id,
          preferredGroupSize: tier >= 2 ? 4 : 3,
          mode: 'compare',
        });

        return {
          value,
          targetStyle: 'ship',
          label: profile.showChoiceLabels && cargo.kind !== 'number' ? String(value) : null,
          cargo,
          isCorrect: value === correctValue,
        };
      }),
      targetMode: 'single-correct',
      responseGoalMs: 3800 - tier * 160,
      learningTag: 'comparison and more or less',
      familyId: goal === 'larger' ? 'compare-more' : 'compare-less',
      qualityKey: `compare:${goal}:${values.join('-')}:${theme.id}`,
      qualityMeta: {
        values,
      },
    };
  },

  split_treasure_evenly({ rng, profile, tier }) {
    const receivers = randomInt(2, 3, rng);
    const share = randomInt(2, 4, rng);
    const total = receivers * share;
    const choiceCount = capChoiceCount(profile.choiceCount, tier, 2, 3);
    const choices = createMeaningfulChoices(share, choiceCount, 1, Math.max(share + 3, 6), rng, 1);

    return {
      accentColor: 0x6fe3cb,
      instruction: phrase([
        `Split ${total} coins evenly into ${receivers} chests`,
        `Share ${total} coins into ${receivers} chests`,
      ], rng),
      subInstruction: 'Same number in each chest',
      promptVisual: {
        kind: 'split',
        itemId: 'coin',
        receivers,
        total,
        helperTag: profile.showHelperTags ? `${share} in each chest` : null,
      },
      options: choices.map((value) => {
        const groups = Array(receivers).fill(value);
        const cargo = makeAnswerCargo({
          value,
          itemId: 'coin',
          groups,
          mode: 'share',
          badgeText: 'each',
        });

        return {
          value,
          targetStyle: 'raft',
          label: profile.showChoiceLabels && cargo.kind !== 'number' ? String(value) : null,
          cargo,
          isCorrect: value === share,
        };
      }),
      targetMode: 'single-correct',
      responseGoalMs: 4700 - tier * 180,
      learningTag: 'fair sharing and equal shares',
      familyId: 'fair-share',
      qualityKey: `share:${receivers}:${share}`,
      qualityMeta: {
        receivers,
        share,
        total,
      },
    };
  },

  count_equal_barrels_or_crates({ rng, profile, tier }) {
    const itemId = pick(['barrel', 'crate', 'cannonball'], rng);
    const groupCount = randomInt(2, 3, rng);
    const each = randomInt(2, 4, rng);
    const choiceCount = capChoiceCount(profile.choiceCount, tier, 3, 4);
    const options = buildEqualGroupOptions(groupCount, each, itemId, choiceCount, rng);

    return {
      accentColor: 0xffdb74,
      instruction: phrase([
        `Which ship has ${groupCount} groups of ${each}?`,
        `Tap the ship with ${groupCount} groups of ${each}`,
      ], rng),
      subInstruction: 'Same size groups',
      promptVisual: {
        kind: 'equal-groups',
        itemId,
        groupCount,
        each,
        helperTag: profile.showHelperTags ? `${groupCount} groups of ${each}` : null,
      },
      options,
      targetMode: 'single-correct',
      responseGoalMs: 4300 - tier * 120,
      learningTag: 'equal groups and repeated addition',
      familyId: 'equal-groups',
      qualityKey: `equal:${itemId}:${groupCount}x${each}`,
      qualityMeta: {
        groupCount,
        each,
        total: groupCount * each,
      },
    };
  },

  hit_marker_matching_grouped_objects({ rng, profile, tier, theme }) {
    const rules = TIER_QUALITY_RULES[tier];
    const choiceCount = capChoiceCount(profile.choiceCount, tier, 2, 3);
    const family = pickAvailableMarkerFamily(tier, rng);

    if (family === 'make-ten') {
      const shown = randomInt(2, 9, rng);
      const needed = 10 - shown;
      return {
        accentColor: 0xffac6a,
        instruction: phrase([
          'Tap the marker that makes 10',
          'Which marker makes 10?',
        ], rng),
        subInstruction: '',
        promptVisual: makeNumberVisual(shown, theme.id, {
          badgeText: 'needs to make 10',
          helperTag: profile.showHelperTags ? `${shown} needs ${needed}` : null,
        }),
        options: makeMarkerNumberOptions(needed, choiceCount, theme.id, rng, 0, 10),
        targetMode: 'single-correct',
        responseGoalMs: 3400 - tier * 100,
        learningTag: 'number bonds and make ten',
        familyId: 'make-ten',
        qualityKey: `make-ten:${shown}`,
        qualityMeta: {
          shown,
          needed,
          target: 10,
        },
      };
    }

    if (family === 'one-more-less') {
      const base = randomInt(3, Math.min(rules.markerTotalMax - 1, 14), rng);
      const delta = rng() > 0.5 ? 1 : -1;
      const answer = base + delta;
      return {
        accentColor: delta > 0 ? 0xffc961 : 0x86b9ff,
        instruction: delta > 0
          ? `Tap the marker for 1 more than ${base}`
          : `Tap the marker for 1 less than ${base}`,
        subInstruction: '',
        promptVisual: makeNumberVisual(base, theme.id, {
          badgeText: delta > 0 ? '1 more' : '1 less',
          helperTag: profile.showHelperTags ? `${base} ${delta > 0 ? 'plus 1' : 'minus 1'}` : null,
        }),
        options: makeMarkerNumberOptions(answer, choiceCount, theme.id, rng, 1, Math.max(10, rules.markerTotalMax)),
        targetMode: 'single-correct',
        responseGoalMs: 3300 - tier * 100,
        learningTag: 'one more and one less',
        familyId: 'one-more-less',
        qualityKey: `one-step:${delta}:${base}`,
        qualityMeta: {
          base,
          delta,
        },
      };
    }

    const groups = buildPartWholeGroups({ tier: Math.min(tier, 3), rng, maxTotal: Math.min(rules.markerTotalMax, profile.numberMax) });
    const total = groupTotal(groups);

    return {
      accentColor: 0xffac6a,
      instruction: phrase([
        `How many ${theme.label}? Tap the marker`,
        `Count the ${theme.label}. Tap the marker`,
      ], rng),
      subInstruction: 'Find the total',
      promptVisual: {
        kind: 'groups',
        itemId: theme.id,
        groups,
        showNumber: false,
        number: total,
        helperTag: profile.showHelperTags ? `${groups.join(' + ')} = ${total}` : null,
      },
      options: makeMarkerNumberOptions(total, choiceCount, theme.id, rng, 1, Math.max(10, rules.markerTotalMax)),
      targetMode: 'single-correct',
      responseGoalMs: 3600 - tier * 120,
      learningTag: 'counting quantities and matching numerals',
      familyId: 'count-total-to-number',
      qualityKey: `marker-total:${theme.id}:${groupsSignature(groups)}`,
      qualityMeta: {
        groups,
        total,
      },
    };
  },

  find_remaining_after_storm({ rng, profile, tier, theme }) {
    const rules = TIER_QUALITY_RULES[tier];
    const startTotal = randomInt(5, Math.min(MAX_REMAINING_TOTAL, profile.numberMax, rules.remainingMax), rng);
    const lost = randomInt(1, Math.min(rules.takeAwayMax, Math.max(1, startTotal - 2)), rng);
    const remaining = startTotal - lost;
    const choices = createMeaningfulChoices(remaining, capChoiceCount(profile.choiceCount, tier, 2, 4), 1, Math.max(startTotal + 2, rules.remainingMax), rng, 1);
    const groupSize = clamp(Math.ceil(startTotal / 3), 2, 4);

    return {
      accentColor: 0xff8f88,
      instruction: phrase([
        `Tap the ship with ${remaining} left`,
        `Which ship has ${remaining} left?`,
      ], rng),
      subInstruction: phrase([
        `${lost} went overboard`,
        `${lost} fell out`,
      ], rng),
      promptVisual: {
        kind: 'groups',
        itemId: theme.id,
        groups: toGroupedParts(startTotal, groupSize),
        showNumber: false,
        number: remaining,
        removed: lost,
        helperTag: profile.showHelperTags ? `${startTotal} take away ${lost}` : null,
      },
      options: buildAnswerOptions(choices, remaining, theme.id, {
        targetStyle: 'ship',
        visualGroupSize: groupSize,
        showChoiceLabels: profile.showChoiceLabels,
        mode: 'total',
      }),
      targetMode: 'single-correct',
      responseGoalMs: 4100 - tier * 150,
      learningTag: 'taking from and finding what is left',
      familyId: 'take-away-left',
      qualityKey: `left:${theme.id}:${startTotal}-${lost}`,
      qualityMeta: {
        startTotal,
        lost,
        remaining,
      },
    };
  },
};

function pickAvailableMarkerFamily(tier, rng) {
  if (tier === 1) {
    return 'count-total';
  }

  if (tier === 2) {
    return rng() > 0.55 ? 'make-ten' : 'count-total';
  }

  if (tier === 3) {
    return pick(['count-total', 'make-ten', 'one-more-less'], rng);
  }

  return pick(['count-total', 'make-ten', 'one-more-less'], rng);
}
