import Phaser from 'phaser';

export function createPromptCard(scene, x, y, challenge, layoutOptions = {}) {
  const container = scene.add.container(x, y);
  const width = layoutOptions.width ?? 700;
  const height = layoutOptions.height ?? 236;
  const radius = layoutOptions.radius ?? 38;
  const edgePad = layoutOptions.edgePad ?? Math.round(width * 0.08);
  const titleAreaHeight = layoutOptions.titleAreaHeight ?? Math.round(height * 0.38);
  const visualHeight = layoutOptions.visualHeight ?? Math.round(height * 0.44);
  const visualWidth = layoutOptions.visualWidth ?? (width - edgePad * 2);
  const titleY = layoutOptions.titleY ?? (-height / 2 + edgePad + titleAreaHeight * 0.34);
  const supportY = layoutOptions.supportY ?? (titleY + Math.min(44, titleAreaHeight * 0.4));
  const visualY = layoutOptions.visualY ?? (height / 2 - edgePad - visualHeight / 2);
  const accent = challenge.accentColor ?? 0xffcb6f;
  const supportText = challenge.supportMode === 'strong' && challenge.promptVisual?.helperTag
    ? challenge.promptVisual.helperTag
    : challenge.subInstruction ?? '';
  const titleFontSize = layoutOptions.titleFontSize ?? (challenge.instruction.length > 28 ? 34 : 38);
  const supportFontSize = layoutOptions.supportFontSize ?? 18;
  const showSparkles = layoutOptions.showSparkles ?? true;
  const visualMaxWidth = layoutOptions.visualMaxWidth ?? Math.max(160, visualWidth - 44);
  const visualMaxHeight = layoutOptions.visualMaxHeight ?? Math.max(42, visualHeight - 28);

  const shadow = scene.add.graphics();
  const panel = scene.add.graphics();
  const headerBand = scene.add.graphics();
  const accentBar = scene.add.graphics();
  const divider = scene.add.graphics();
  const visualWell = scene.add.graphics();
  const sparkleLeft = scene.add.image(-width / 2 + edgePad * 0.8, -height / 2 + edgePad * 0.78, 'spark').setScale(Math.max(0.22, width / 2060)).setAlpha(showSparkles ? 0.56 : 0);
  const sparkleRight = scene.add.image(width / 2 - edgePad * 0.8, -height / 2 + edgePad * 0.78, 'spark').setScale(Math.max(0.28, width / 1660)).setAlpha(showSparkles ? 0.72 : 0);

  shadow.fillStyle(0x0b425f, 0.18);
  shadow.fillRoundedRect(-width / 2, -height / 2 + Math.max(8, height * 0.04), width, height, radius);

  panel.fillStyle(0xfff8e7, 0.98);
  panel.lineStyle(8, 0xffc86d, 1);
  panel.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
  panel.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);

  headerBand.fillStyle(0xffffff, 0.72);
  headerBand.fillRoundedRect(-width / 2 + edgePad, -height / 2 + edgePad * 0.7, width - edgePad * 2, titleAreaHeight, Math.max(18, radius - 10));
  headerBand.fillStyle(accent, 0.16);
  headerBand.fillRoundedRect(-width / 2 + edgePad, -height / 2 + edgePad * 0.7, width - edgePad * 2, titleAreaHeight, Math.max(18, radius - 10));
  headerBand.fillStyle(0xffffff, 0.2);
  headerBand.fillRoundedRect(-Math.min(144, width * 0.23), -height / 2 + edgePad * 0.7, Math.min(288, width * 0.46), Math.max(18, titleAreaHeight * 0.3), 14);

  accentBar.fillStyle(accent, 0.94);
  accentBar.fillRoundedRect(-width / 2 + edgePad + 2, -height / 2 + edgePad * 0.56, Math.max(56, width * 0.15), Math.max(8, height * 0.04), 5);
  accentBar.fillRoundedRect(width / 2 - edgePad - Math.max(56, width * 0.15) - 2, -height / 2 + edgePad * 0.56, Math.max(56, width * 0.15), Math.max(8, height * 0.04), 5);

  divider.lineStyle(3, 0xffffff, 0.92);
  divider.beginPath();
  divider.moveTo(-visualWidth / 2 + 18, visualY - visualHeight / 2 - 12);
  divider.lineTo(visualWidth / 2 - 18, visualY - visualHeight / 2 - 12);
  divider.strokePath();

  visualWell.fillStyle(0xffffff, 0.96);
  visualWell.lineStyle(4, 0xd7edf7, 1);
  visualWell.fillRoundedRect(-visualWidth / 2, visualY - visualHeight / 2, visualWidth, visualHeight, Math.max(18, radius - 10));
  visualWell.strokeRoundedRect(-visualWidth / 2, visualY - visualHeight / 2, visualWidth, visualHeight, Math.max(18, radius - 10));
  visualWell.fillStyle(accent, 0.07);
  visualWell.fillRoundedRect(-visualWidth / 2 + 12, visualY - visualHeight / 2 + 12, visualWidth - 24, visualHeight - 24, Math.max(14, radius - 16));

  const titleText = scene.add.text(0, titleY, challenge.instruction, {
    fontFamily: 'Fredoka',
    fontSize: `${titleFontSize}px`,
    fontStyle: '700',
    color: '#163b58',
    stroke: '#ffffff',
    strokeThickness: 10,
    align: 'center',
    wordWrap: { width: width - edgePad * 2 - 42 },
  }).setOrigin(0.5);

  const supportLine = scene.add.text(0, supportY, supportText, {
    fontFamily: 'Fredoka',
    fontSize: `${supportFontSize}px`,
    fontStyle: '600',
    color: '#58758a',
    align: 'center',
    wordWrap: { width: width - edgePad * 2 - 28 },
  }).setOrigin(0.5);
  supportLine.setVisible(Boolean(supportText));

  const dividerY = visualY - visualHeight / 2 - 12;
  const desiredSupportY = Math.min(titleText.y + titleText.height / 2 + 6, dividerY - 16);
  supportLine.setY(desiredSupportY);
  if (desiredSupportY <= titleText.y + titleText.height / 2 + 2 || dividerY - desiredSupportY < 12) {
    supportLine.setVisible(false);
  }

  container.add([
    shadow,
    panel,
    headerBand,
    accentBar,
    divider,
    visualWell,
    sparkleLeft,
    sparkleRight,
    titleText,
    supportLine,
  ]);

  const visualHolder = scene.add.container(0, visualY);
  container.add(visualHolder);
  const visual = renderVisualDescriptor(scene, visualHolder, 0, 0, challenge.promptVisual, {
    mode: 'prompt',
    showPads: true,
    accentColor: accent,
  });
  fitVisualToBox(visual, visualMaxWidth, visualMaxHeight);

  if (showSparkles) {
    scene.tweens.add({
      targets: [sparkleLeft, sparkleRight],
      alpha: { from: 0.36, to: 0.84 },
      scale: { from: Math.max(0.18, sparkleLeft.scaleX * 0.76), to: sparkleRight.scaleX * 1.14 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });
  }

  return container;
}

export function renderOptionVisual(scene, parent, x, y, cargo, options = {}) {
  const display = renderVisualDescriptor(scene, parent, x, y, cargo, {
    mode: 'target',
    showPads: options.showPads ?? false,
    accentColor: options.accentColor,
  });
  fitVisualToBox(display, options.maxWidth ?? 122, options.maxHeight ?? 82);
  return display;
}

export function renderVisualDescriptor(scene, parent, x, y, visual, options = {}) {
  const container = scene.add.container(x, y);
  const mode = options.mode ?? 'target';

  switch (visual.kind) {
    case 'split':
      renderSplitVisual(scene, container, visual, mode, options);
      break;
    case 'share':
      renderGroupVisual(scene, container, visual, mode, true, options);
      break;
    case 'comparison':
      renderComparisonCue(scene, container, visual, options);
      break;
    case 'equal-groups':
      renderEqualGroupsCue(scene, container, visual.groupCount, visual.itemId, visual.each ?? 2, options);
      break;
    case 'number':
      renderNumberVisual(scene, container, visual, mode, options);
      break;
    case 'groups':
    default:
      renderGroupVisual(scene, container, visual, mode, false, options);
      break;
  }

  parent.add(container);
  return container;
}

function renderGroupVisual(scene, container, visual, mode, forcePads, options = {}) {
  const groups = visual.groups ?? [visual.number ?? 0];
  const promptMode = mode === 'prompt';
  const accent = options.accentColor ?? 0xffcb6f;
  const spacingX = promptMode ? Math.max(78, 98 - Math.max(0, groups.length - 3) * 10) : groups.length >= 4 ? 38 : 44;
  const cardWidth = promptMode ? 72 : 40;
  const cardHeight = promptMode ? 86 : 58;
  const itemScale = promptMode ? 0.94 : 0.66;
  const rowGap = promptMode ? 18 : 14;
  const colGap = promptMode ? 18 : 13;
  const originX = -((groups.length - 1) * spacingX) / 2;
  const showPads = forcePads || promptMode || options.showPads || visual.emphasizeEqual;

  groups.forEach((count, groupIndex) => {
    const groupX = originX + groupIndex * spacingX;
    const group = scene.add.container(groupX, 0);

    if (showPads) {
      const tray = scene.add.graphics();
      const trayFill = visual.emphasizeEqual ? 0xfff3c6 : 0xffffff;
      const trayAlpha = visual.emphasizeEqual ? 0.9 : promptMode ? 0.84 : 0.4;
      tray.fillStyle(trayFill, trayAlpha);
      tray.lineStyle(promptMode ? 4 : 3, promptMode ? accent : 0xffffff, promptMode ? 0.9 : 0.55);
      tray.fillRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, promptMode ? 24 : 16);
      tray.strokeRoundedRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, promptMode ? 24 : 16);
      group.add(tray);
    }

    const rowWidth = count >= 7 ? 3 : count >= 4 ? 2 : 1;
    const rows = Math.ceil(count / rowWidth);

    for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
      const row = Math.floor(itemIndex / rowWidth);
      const column = itemIndex % rowWidth;
      const itemX = column * colGap - ((rowWidth - 1) * colGap) / 2;
      const itemY = row * rowGap - ((rows - 1) * rowGap) / 2;
      const item = scene.add.image(itemX, itemY, visual.itemId)
        .setScale(itemScale)
        .setRotation((itemIndex % 3) * 0.08 - 0.08);
      group.add(item);
    }

    container.add(group);

    if (promptMode && groups.length > 1 && groupIndex < groups.length - 1 && !visual.emphasizeEqual && !visual.removed) {
      const plus = scene.add.text(groupX + spacingX / 2, 0, '+', {
        fontFamily: 'Fredoka',
        fontSize: '28px',
        fontStyle: '700',
        color: '#6a8ba0',
        stroke: '#ffffff',
        strokeThickness: 6,
      }).setOrigin(0.5);
      container.add(plus);
    }
  });

  if (visual.removed) {
    const slash = scene.add.graphics();
    slash.lineStyle(promptMode ? 6 : 4, 0xe56c60, 0.88);
    slash.beginPath();
    slash.moveTo(-82, -34);
    slash.lineTo(82, 34);
    slash.strokePath();
    container.add(slash);

    const removed = scene.add.text(84, -32, `-${visual.removed}`, {
      fontFamily: 'Fredoka',
      fontSize: promptMode ? '20px' : '18px',
      fontStyle: '700',
      color: '#ffffff',
      stroke: '#e56c60',
      strokeThickness: 8,
    }).setOrigin(0.5);
    container.add(removed);
  }

  if (visual.showNumber) {
    const bubbleY = promptMode ? 58 : 46;
    const bubble = scene.add.circle(0, bubbleY, promptMode ? 24 : 18, 0xfff3bf, 1).setStrokeStyle(4, accent, 1);
    const number = scene.add.text(0, bubbleY, String(visual.number), {
      fontFamily: 'Fredoka',
      fontSize: promptMode ? '24px' : '18px',
      fontStyle: '700',
      color: '#1f4768',
    }).setOrigin(0.5);
    container.add([bubble, number]);
  }

  if (visual.label && !promptMode) {
    const label = scene.add.text(0, 48, visual.label, {
      fontFamily: 'Fredoka',
      fontSize: '15px',
      fontStyle: '700',
      color: '#2d5875',
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5);
    container.add(label);
  }
}

function renderSplitVisual(scene, container, visual, mode, options = {}) {
  const promptMode = mode === 'prompt';
  const accent = options.accentColor ?? 0xffcb6f;

  const pile = scene.add.container(promptMode ? -142 : 0, promptMode ? -6 : -10);
  renderGroupVisual(scene, pile, {
    kind: 'groups',
    itemId: visual.itemId,
    groups: splitForDisplay(visual.total),
    number: visual.total,
    showNumber: false,
  }, mode, true, options);
  container.add(pile);

  if (promptMode) {
    const totalBubble = scene.add.circle(-142, 40, 24, 0xfff4c3, 1).setStrokeStyle(4, accent, 1);
    const totalText = scene.add.text(-142, 40, String(visual.total), {
      fontFamily: 'Fredoka',
      fontSize: '24px',
      fontStyle: '700',
      color: '#1f4768',
    }).setOrigin(0.5);
    container.add([totalBubble, totalText]);
  }

  const arrows = scene.add.graphics();
  arrows.lineStyle(promptMode ? 5 : 3, 0x63b7d6, 0.92);
  if (promptMode) {
    arrows.beginPath();
    arrows.moveTo(-60, 4);
    arrows.lineTo(36, 4);
    arrows.lineTo(18, -12);
    arrows.moveTo(36, 4);
    arrows.lineTo(18, 20);
    arrows.strokePath();
  } else {
    arrows.beginPath();
    arrows.moveTo(0, 10);
    arrows.lineTo(0, 22);
    arrows.moveTo(-52, 14);
    arrows.lineTo(0, 22);
    arrows.lineTo(52, 14);
    arrows.strokePath();
  }
  container.add(arrows);

  const chestRow = scene.add.container(promptMode ? 116 : 0, promptMode ? 10 : 38);
  const slotGap = promptMode ? 66 : 48;
  const startX = -((visual.receivers - 1) * slotGap) / 2;

  for (let index = 0; index < visual.receivers; index += 1) {
    const slot = scene.add.graphics();
    const slotX = startX + index * slotGap;
    slot.fillStyle(0xffffff, promptMode ? 0.84 : 0.34);
    slot.lineStyle(3, promptMode ? accent : 0xd5eef7, 1);
    slot.fillRoundedRect(slotX - 26, -22, 52, 48, 16);
    slot.strokeRoundedRect(slotX - 26, -22, 52, 48, 16);
    const chest = scene.add.image(slotX, 4, 'crate').setScale(promptMode ? 0.78 : 0.72);
    chestRow.add([slot, chest]);

    if (index < visual.receivers - 1) {
      const equals = scene.add.text(slotX + slotGap / 2, 4, '=', {
        fontFamily: 'Fredoka',
        fontSize: promptMode ? '20px' : '18px',
        fontStyle: '700',
        color: '#5aa4d0',
        stroke: '#ffffff',
        strokeThickness: 4,
      }).setOrigin(0.5);
      chestRow.add(equals);
    }
  }

  container.add(chestRow);
}

function renderNumberVisual(scene, container, visual, mode, options = {}) {
  const promptMode = mode === 'prompt';
  const accent = options.accentColor ?? 0xffcb6f;
  const width = promptMode ? 156 : 104;
  const height = promptMode ? 96 : 74;
  const frame = scene.add.graphics();
  frame.fillStyle(promptMode ? 0xfff8e7 : 0xfff4d5, 0.98);
  frame.lineStyle(promptMode ? 5 : 4, accent, 1);
  frame.fillRoundedRect(-width / 2, -height / 2, width, height, promptMode ? 28 : 22);
  frame.strokeRoundedRect(-width / 2, -height / 2, width, height, promptMode ? 28 : 22);

  const glow = scene.add.graphics();
  glow.fillStyle(accent, promptMode ? 0.12 : 0.16);
  glow.fillRoundedRect(-width / 2 + 10, -height / 2 + 10, width - 20, height - 20, promptMode ? 22 : 18);

  const iconBadge = scene.add.circle(-width / 2 + (promptMode ? 28 : 20), -height / 2 + (promptMode ? 26 : 18), promptMode ? 18 : 13, 0xfff1b7, 1)
    .setStrokeStyle(3, accent, 1);
  const icon = scene.add.image(iconBadge.x, iconBadge.y, visual.itemId).setScale(promptMode ? 0.48 : 0.38);

  const numberText = scene.add.text(0, promptMode ? 4 : 0, String(visual.number), {
    fontFamily: 'Fredoka',
    fontSize: promptMode ? '46px' : '34px',
    fontStyle: '700',
    color: '#174567',
    stroke: '#ffffff',
    strokeThickness: promptMode ? 10 : 8,
  }).setOrigin(0.5);

  container.add([frame, glow, iconBadge, icon, numberText]);

  if (visual.badgeText) {
    const caption = scene.add.text(0, promptMode ? 34 : 27, visual.badgeText, {
      fontFamily: 'Fredoka',
      fontSize: promptMode ? '18px' : '15px',
      fontStyle: '700',
      color: '#5f7892',
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5);
    container.add(caption);
  }
}

function renderComparisonCue(scene, container, visual, options = {}) {
  const accent = options.accentColor ?? 0xffcb6f;
  const leftCard = createCompareCard(scene, visual.itemId, 2, 'LESS', visual.goal === 'smaller', accent);
  const rightCard = createCompareCard(scene, visual.itemId, 5, 'MORE', visual.goal === 'larger', accent);
  leftCard.x = -116;
  rightCard.x = 116;
  const chevron = scene.add.text(0, 2, visual.goal === 'larger' ? '>' : '<', {
    fontFamily: 'Fredoka',
    fontSize: '34px',
    fontStyle: '700',
    color: '#ffb54d',
    stroke: '#ffffff',
    strokeThickness: 8,
  }).setOrigin(0.5);
  container.add([leftCard, rightCard, chevron]);
}

function createCompareCard(scene, itemId, count, label, active, accent) {
  const card = scene.add.container(0, 0);
  const frame = scene.add.graphics();
  frame.fillStyle(active ? 0xfff3bf : 0xffffff, active ? 0.94 : 0.8);
  frame.lineStyle(4, active ? accent : 0xd8eef7, 1);
  frame.fillRoundedRect(-58, -42, 116, 84, 22);
  frame.strokeRoundedRect(-58, -42, 116, 84, 22);

  const labelText = scene.add.text(0, -30, label, {
    fontFamily: 'Fredoka',
    fontSize: '16px',
    fontStyle: '700',
    color: active ? '#ee8735' : '#6188a0',
    stroke: '#ffffff',
    strokeThickness: 4,
  }).setOrigin(0.5);

  const pile = scene.add.container(0, 10);
  renderGroupVisual(scene, pile, {
    kind: 'groups',
    itemId,
    groups: [count],
    showNumber: false,
    emphasizeEqual: active,
  }, 'target', true, { accentColor: accent });

  card.add([frame, labelText, pile]);
  return card;
}

function renderEqualGroupsCue(scene, container, groupCount, itemId, each, options = {}) {
  const spacingX = groupCount >= 4 ? 82 : 96;
  const startX = -((groupCount - 1) * spacingX) / 2;

  for (let index = 0; index < groupCount; index += 1) {
    const stack = scene.add.container(startX + index * spacingX, 0);
    renderGroupVisual(scene, stack, {
      kind: 'groups',
      itemId,
      groups: [each],
      showNumber: false,
      emphasizeEqual: true,
    }, 'prompt', true, options);
    container.add(stack);

    if (index < groupCount - 1) {
      const equals = scene.add.text(startX + index * spacingX + spacingX / 2, 0, '=', {
        fontFamily: 'Fredoka',
        fontSize: '30px',
        fontStyle: '700',
        color: '#5aa4d0',
        stroke: '#ffffff',
        strokeThickness: 6,
      }).setOrigin(0.5);
      container.add(equals);
    }
  }
}

function fitVisualToBox(container, maxWidth, maxHeight) {
  const bounds = container.getBounds();
  if (!bounds.width || !bounds.height) {
    return;
  }

  const scale = Math.min(1, maxWidth / bounds.width, maxHeight / bounds.height);
  container.setScale(scale);
}

function splitForDisplay(value) {
  if (value <= 4) {
    return [value];
  }

  if (value <= 8) {
    return [Math.ceil(value / 2), Math.floor(value / 2)];
  }

  const third = Math.max(2, Math.floor(value / 3));
  return [third, third, value - third * 2];
}
