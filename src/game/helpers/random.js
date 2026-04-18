export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function randomInt(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pick(items, rng = Math.random) {
  return items[Math.floor(rng() * items.length)];
}

export function shuffle(items, rng = Math.random) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[otherIndex]] = [copy[otherIndex], copy[index]];
  }

  return copy;
}

export function uniqueNumberChoices(correctValue, count, min, max, rng = Math.random) {
  const values = new Set([correctValue]);

  while (values.size < count) {
    const spread = Math.max(2, Math.ceil(count * 1.75));
    const candidate = clamp(correctValue + randomInt(-spread, spread, rng), min, max);
    values.add(candidate);
  }

  return shuffle([...values], rng);
}

export function sampleDistinct(min, max, count, rng = Math.random) {
  const values = [];

  while (values.length < count) {
    const candidate = randomInt(min, max, rng);

    if (!values.includes(candidate)) {
      values.push(candidate);
    }
  }

  return values;
}
