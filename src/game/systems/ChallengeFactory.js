import { CARGO_TYPES } from '../constants.js';
import { toGroupedParts } from '../helpers/formatters.js';
import { clamp, pick, randomInt, sampleDistinct, shuffle, uniqueNumberChoices } from '../helpers/random.js';

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
const MAX_PROMPT_TOTAL = 16;
const MAX_REMAINING_TOTAL = 14;
const MAX_SHARE_TOTAL = 15;

export class ChallengeFactory {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.recentTemplates = [];
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
    const themePool = CARGO_TYPES.filter((candidate) => candidate.id !== this.lastThemeId);
    const theme = pick(themePool.length ? themePool : CARGO_TYPES, this.rng);
    this.lastThemeId = theme.id;

    const builder = TEMPLATE_BUILDERS[templateId] ?? TEMPLATE_BUILDERS.choose_total_from_visual_groups;
    const challenge = builder({ rng: this.rng, tier, profile, theme });

    return {
      ...challenge,
      templateId,
      theme,
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
}

function phrase(options, rng) {
  return pick(options, rng);
}

function makeVisual(total, itemId, preferredGroupSize = 4, extras = {}) {
  return {
    kind: 'groups',
    itemId,
    groups: extras.groups ?? toGroupedParts(total, preferredGroupSize),
    showNumber: extras.showNumber ?? false,
    number: total,
    removed: extras.removed ?? 0,
    emphasizeEqual: extras.emphasizeEqual ?? false,
    label: extras.label ?? null,
    helperTag: extras.helperTag ?? null,
  };
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
    return makeShareVisual(actualGroups.length, actualGroups[0] ?? value, itemId, {
      label: null,
      helperTag: null,
    });
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

function makeEqualOption(groupCount, itemId, value, rng, correct = false) {
  const groups = correct ? Array(groupCount).fill(value) : makeUnevenGroups(groupCount, value, rng);

  return {
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
    isCorrect: correct,
  };
}

function makeUnevenGroups(groupCount, baseValue, rng) {
  const groups = Array(groupCount).fill(baseValue);
  const from = randomInt(0, groupCount - 1, rng);
  let to = randomInt(0, groupCount - 1, rng);

  while (to === from) {
    to = randomInt(0, groupCount - 1, rng);
  }

  const delta = baseValue > 2 ? 2 : 1;
  groups[from] = Math.max(1, groups[from] - delta);
  groups[to] += delta;

  return shuffle(groups, rng);
}

function makeMarkerDistractor(correctGroups, each, rng) {
  const altered = [...correctGroups];
  const mode = rng();

  if (mode < 0.34 && altered.length > 2) {
    altered.pop();
    altered.push(Math.max(1, each - 1));
  } else if (mode < 0.67) {
    const index = randomInt(0, altered.length - 1, rng);
    altered[index] = clamp(altered[index] + (rng() > 0.5 ? 1 : -1), 1, each + 2);
  } else {
    const index = randomInt(0, altered.length - 1, rng);
    altered[index] = Math.max(1, altered[index] + 2);
  }

  if (altered.length === correctGroups.length && altered.every((value, index) => value === correctGroups[index])) {
    altered[0] = Math.max(1, altered[0] - 1);
  }

  return altered;
}

const TEMPLATE_BUILDERS = {
  choose_total_from_visual_groups({ rng, profile, tier, theme }) {
    const groupCount = randomInt(2, tier >= 3 ? 4 : 3, rng);
    const eachCap = tier >= 4 ? 5 : 4;
    const maxEach = Math.max(2, Math.min(eachCap, Math.floor(MAX_PROMPT_TOTAL / groupCount), Math.floor(profile.numberMax / groupCount)));
    const each = randomInt(1, maxEach, rng);
    const total = groupCount * each;
    const choices = uniqueNumberChoices(total, profile.choiceCount, 1, profile.numberMax, rng);

    return {
      accentColor: 0xffc961,
      instruction: phrase([
        `Tap the ship with ${total} ${theme.label}`,
        `Find ${total} ${theme.label}`,
        `Tap the ship carrying ${total} ${theme.label}`,
      ], rng),
      subInstruction: phrase(['Count them all', 'Add the stacks'], rng),
      promptVisual: {
        kind: 'groups',
        itemId: theme.id,
        groups: Array(groupCount).fill(each),
        showNumber: false,
        number: total,
        helperTag: profile.showHelperTags ? `${groupCount} groups of ${each}` : null,
      },
      options: buildAnswerOptions(choices, total, theme.id, {
        targetStyle: 'ship',
        visualGroupSize: each,
        showChoiceLabels: profile.showChoiceLabels,
        mode: 'total',
      }),
      targetMode: 'single-correct',
      responseGoalMs: 4500 - tier * 350,
      learningTag: tier >= 3 ? 'repeated addition' : 'counting and totals',
    };
  },

  choose_larger_or_smaller_ship({ rng, profile, tier, theme }) {
    const choiceCount = clamp(profile.choiceCount, 2, 4);
    const values = sampleDistinct(3, Math.max(6, profile.numberMax), choiceCount, rng).sort((a, b) => a - b);
    const goal = rng() > 0.5 ? 'larger' : 'smaller';
    const correctValue = goal === 'larger' ? Math.max(...values) : Math.min(...values);

    return {
      accentColor: goal === 'larger' ? 0x57d6a8 : 0x78beff,
      instruction: goal === 'larger'
        ? phrase([
          `Tap the ship with MORE ${theme.label}`,
          `Find the ship with MORE ${theme.label}`,
        ], rng)
        : phrase([
          `Tap the ship with LESS ${theme.label}`,
          `Find the ship with LESS ${theme.label}`,
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
      learningTag: 'more and less',
    };
  },

  split_treasure_evenly({ rng, profile, tier }) {
    const receivers = randomInt(2, tier >= 4 ? 4 : 3, rng);
    const maxShare = Math.max(2, Math.min(6, Math.floor(MAX_SHARE_TOTAL / receivers), Math.floor(profile.numberMax / receivers)));
    const share = randomInt(2, maxShare, rng);
    const total = receivers * share;
    const choices = uniqueNumberChoices(share, profile.choiceCount, 1, Math.max(share + 4, maxShare + 2), rng);

    return {
      accentColor: 0x6fe3cb,
      instruction: phrase([
        `Split ${total} coins into ${receivers} chests`,
        `Share ${total} coins into ${receivers} chests`,
      ], rng),
      subInstruction: 'Same coins in each chest',
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
      responseGoalMs: 4800 - tier * 220,
      learningTag: 'fair sharing and early division',
    };
  },

  count_equal_barrels_or_crates({ rng, profile, tier }) {
    const itemId = rng() > 0.5 ? 'barrel' : 'crate';
    const groupCount = randomInt(3, tier >= 4 ? 4 : 3, rng);
    const maxEach = Math.max(2, Math.min(4, Math.floor(MAX_PROMPT_TOTAL / groupCount), Math.floor(profile.numberMax / groupCount)));
    const each = randomInt(2, maxEach, rng);
    const choiceCount = clamp(profile.choiceCount, 3, 4);
    const correctOption = makeEqualOption(groupCount, itemId, each, rng, true);
    const options = [correctOption];
    const seen = new Set([groupsSignature(correctOption.groups)]);
    let attempts = 0;

    while (options.length < choiceCount && attempts < 40) {
      attempts += 1;
      const option = makeEqualOption(groupCount, itemId, each, rng, false);
      const signature = groupsSignature(option.groups);
      if (seen.has(signature)) {
        continue;
      }
      seen.add(signature);
      options.push(option);
    }

    return {
      accentColor: 0xffdb74,
      instruction: phrase([
        'Tap the ship with matching stacks',
        'Find the ship with matching stacks',
      ], rng),
      subInstruction: 'Every stack is the same',
      promptVisual: {
        kind: 'equal-groups',
        itemId,
        groupCount,
        each,
        helperTag: profile.showHelperTags ? `${groupCount} matching stacks` : null,
      },
      options: shuffle(options, rng),
      targetMode: 'single-correct',
      responseGoalMs: 4300 - tier * 140,
      learningTag: 'equal groups',
    };
  },

  hit_marker_matching_grouped_objects({ rng, profile, tier, theme }) {
    const groupCount = randomInt(2, tier >= 3 ? 4 : 3, rng);
    const maxEach = Math.max(2, Math.min(4, Math.floor(MAX_PROMPT_TOTAL / groupCount), Math.floor(profile.numberMax / groupCount)));
    const each = randomInt(1, maxEach, rng);
    const correctGroups = Array(groupCount).fill(each);
    const choiceCount = clamp(profile.choiceCount, 3, 4);
    const itemId = theme.id;
    const options = [
      {
        value: groupTotal(correctGroups),
        targetStyle: 'marker',
        label: null,
        cargo: {
          kind: 'groups',
          itemId,
          groups: correctGroups,
          showNumber: false,
          emphasizeEqual: false,
          number: groupTotal(correctGroups),
        },
        isCorrect: true,
      },
    ];
    const seen = new Set([groupsSignature(correctGroups)]);
    let attempts = 0;

    while (options.length < choiceCount && attempts < 40) {
      attempts += 1;
      const altered = makeMarkerDistractor(correctGroups, each, rng);
      const signature = groupsSignature(altered);
      if (seen.has(signature)) {
        continue;
      }
      seen.add(signature);
      options.push({
        value: groupTotal(altered),
        targetStyle: 'marker',
        label: null,
        cargo: {
          kind: 'groups',
          itemId,
          groups: altered,
          showNumber: false,
          emphasizeEqual: false,
          number: groupTotal(altered),
        },
        isCorrect: false,
      });
    }

    return {
      accentColor: 0xffac6a,
      instruction: phrase([
        `Which marker has ${groupCount} groups of ${each}?`,
        `Tap the marker with ${groupCount} groups of ${each}`,
      ], rng),
      subInstruction: 'Match the same groups',
      promptVisual: {
        kind: 'groups',
        itemId,
        groups: correctGroups,
        showNumber: false,
        number: groupTotal(correctGroups),
        helperTag: profile.showHelperTags ? `${groupCount} groups of ${each}` : null,
      },
      options: shuffle(options, rng),
      targetMode: 'single-correct',
      responseGoalMs: 3600 - tier * 120,
      learningTag: 'matching grouped visuals',
    };
  },

  find_remaining_after_storm({ rng, profile, tier, theme }) {
    const startTotal = randomInt(5, Math.max(6, Math.min(MAX_REMAINING_TOTAL, profile.numberMax)), rng);
    const lost = randomInt(1, Math.max(1, Math.min(5, startTotal - 1)), rng);
    const remaining = startTotal - lost;
    const choices = uniqueNumberChoices(remaining, profile.choiceCount, 1, profile.numberMax, rng);
    const groupSize = clamp(Math.ceil(startTotal / 3), 2, 4);

    return {
      accentColor: 0xff8f88,
      instruction: phrase([
        `Tap the ship with ${remaining} left`,
        `Find the ship with ${remaining} left`,
      ], rng),
      subInstruction: `${lost} went overboard`,
      promptVisual: {
        kind: 'groups',
        itemId: theme.id,
        groups: toGroupedParts(startTotal, groupSize),
        showNumber: false,
        number: remaining,
        removed: lost,
        helperTag: profile.showHelperTags ? `Start with ${startTotal}, lose ${lost}` : null,
      },
      options: buildAnswerOptions(choices, remaining, theme.id, {
        targetStyle: 'ship',
        visualGroupSize: groupSize,
        showChoiceLabels: profile.showChoiceLabels,
        mode: 'total',
      }),
      targetMode: 'single-correct',
      responseGoalMs: 4200 - tier * 160,
      learningTag: 'subtraction through visuals',
    };
  },
};
