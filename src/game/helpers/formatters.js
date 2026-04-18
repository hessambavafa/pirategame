export function titleCase(value) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

export function toGroupedParts(total, preferredGroupSize = 4) {
  const groups = [];
  let remaining = total;

  while (remaining > 0) {
    const nextSize = Math.min(preferredGroupSize, remaining);
    groups.push(nextSize);
    remaining -= nextSize;
  }

  return groups;
}

export function formatReward(gold, gems) {
  return gems > 0 ? `${gold} gold + ${gems} gems` : `${gold} gold`;
}
