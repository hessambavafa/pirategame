import Phaser from 'phaser';
import { SCENES } from '../constants.js';
import { STORY_LEVELS } from '../content/levels.js';
import { getCatalogItem } from '../content/unlocks.js';
import { createBackdrop } from '../effects/BackdropFactory.js';
import { getSafeBounds, getViewportMetrics } from '../helpers/layout.js';
import { SettingsPanel } from '../ui/SettingsPanel.js';
import { BigButton } from '../ui/Button.js';

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MAP);
  }

  create() {
    this.backdrop = createBackdrop(this, { withPalms: true, livelyWater: true });
    this.game.services.audio.playMenuLoop(this);
    this.title = this.add.text(0, 0, 'Story Cove', {
      fontFamily: 'Baloo 2',
      fontSize: '62px',
      fontStyle: '800',
      color: '#fff8d8',
      stroke: '#1b6798',
      strokeThickness: 12,
    }).setOrigin(0.5);

    this.sub = this.add.text(0, 0, 'Sail across the islands and unlock brighter gear', {
      fontFamily: 'Fredoka',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#1b6798',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.pathGraphics = this.add.graphics();
    this.panel = this.add.graphics();
    this.mapFrame = this.add.graphics();
    this.nodes = STORY_LEVELS.map((level) => this.createNode(level));
    this.walletText = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka',
      fontSize: '20px',
      color: '#fff8d8',
      stroke: '#1c5c88',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.loadoutTitle = this.add.text(0, 0, 'Cove Goodies', {
      fontFamily: 'Fredoka',
      fontSize: '24px',
      fontStyle: '700',
      color: '#2a587e',
    }).setOrigin(0.5);
    this.loadoutRows = [
      this.createLoadoutRow('Cannon', 'skins'),
      this.createLoadoutRow('Flag', 'flags'),
      this.createLoadoutRow('Pet', 'pets'),
      this.createLoadoutRow('Decor', 'decorations'),
    ];

    this.previewCannon = this.add.image(0, 0, 'cannon-barrel').setOrigin(0.25, 0.5);
    this.previewSpark = this.add.image(0, 0, 'spark').setScale(0.7);
    this.previewText = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka',
      fontSize: '18px',
      color: '#2a587e',
      align: 'center',
    }).setOrigin(0.5);

    this.menuButton = new BigButton(this, {
      x: 0,
      y: 0,
      width: 150,
      height: 62,
      label: 'Menu',
      fontSize: 24,
      fill: 0xffffff,
      stroke: 0xb7d9f4,
      textColor: '#2a587e',
      onPress: () => this.scene.start(SCENES.MENU),
    });

    this.quickButton = new BigButton(this, {
      x: 0,
      y: 0,
      width: 220,
      height: 70,
      label: 'Quick Play',
      fontSize: 28,
      fill: 0x7fe1be,
      stroke: 0x2eaf88,
      onPress: () => this.scene.start(SCENES.LEVEL, { mode: 'quick', levelId: 1 }),
    });

    this.settingsButton = new BigButton(this, {
      x: 0,
      y: 0,
      width: 170,
      height: 62,
      label: 'Settings',
      fontSize: 24,
      fill: 0xffffff,
      stroke: 0xb7d9f4,
      textColor: '#2a587e',
      onPress: () => this.openSettings(),
    });

    this.tweens.add({ targets: this.previewSpark, alpha: { from: 0.25, to: 0.82 }, scale: { from: 0.4, to: 0.84 }, duration: 1100, yoyo: true, repeat: -1 });

    this.scale.on('resize', this.layout, this);
    this.layout();
    this.refreshHud();
  }

  createNode(level) {
    const unlocked = this.game.services.save.isLevelUnlocked(level.id);
    const record = this.game.services.save.getLevelRecord(level.id);
    const completed = Boolean(record);
    const container = this.add.container(0, 0);
    const halo = this.add.circle(0, 0, 30, unlocked ? 0xffffff : 0x6aa2c5, unlocked ? 0.18 : 0.08);
    const island = this.add.image(0, 4, 'island').setScale(0.26);
    const bubble = this.add.circle(0, -4, 18, unlocked ? 0xffe082 : 0x9fc7df, 1).setStrokeStyle(5, unlocked ? 0xffa73b : 0x6da2be, 1);
    const label = this.add.text(0, -5, String(level.id), {
      fontFamily: 'Fredoka',
      fontSize: '22px',
      fontStyle: '700',
      color: unlocked ? '#214767' : '#658aa5',
    }).setOrigin(0.5);

    container.add([halo, island, bubble, label]);

    if (completed) {
      const stars = Math.max(1, record.stars ?? 1);
      for (let index = 0; index < stars; index += 1) {
        container.add(this.add.image((index - (stars - 1) / 2) * 16, 34, 'star').setScale(0.38));
      }
    }

    if (unlocked) {
      this.tweens.add({ targets: halo, alpha: { from: 0.12, to: 0.28 }, scale: { from: 0.94, to: 1.08 }, duration: 1500 + level.id * 40, yoyo: true, repeat: -1 });
    }

    container.setSize(70, 88);
    container.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains);
    container.on('pointerdown', async () => {
      if (!unlocked) {
        return;
      }

      await this.game.services.audio.unlock();
      this.scene.start(SCENES.LEVEL, { mode: 'story', levelId: level.id });
    });

    return { level, container, halo };
  }

  createLoadoutRow(title, category) {
    const row = this.add.container(0, 0);
    const label = this.add.text(0, 0, title, {
      fontFamily: 'Fredoka',
      fontSize: '18px',
      fontStyle: '700',
      color: '#2a587e',
    }).setOrigin(0, 0.5);
    const left = this.createArrowButton('<', () => this.cycle(category, -1));
    const right = this.createArrowButton('>', () => this.cycle(category, 1));
    const value = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka',
      fontSize: '18px',
      color: '#355f80',
    }).setOrigin(0.5);

    row.add([label, left, right, value]);
    row.label = label;
    row.value = value;
    row.left = left;
    row.right = right;
    row.category = category;
    row.fullTitle = title;
    return row;
  }

  createArrowButton(text, onPress) {
    const button = this.add.container(0, 0);
    const bg = this.add.circle(0, 0, 16, 0xffd460).setStrokeStyle(3, 0xff9f43, 1);
    const label = this.add.text(0, -1, text, {
      fontFamily: 'Fredoka',
      fontSize: '18px',
      fontStyle: '700',
      color: '#214767',
    }).setOrigin(0.5);

    button.add([bg, label]);
    button.setSize(32, 32);
    button.setInteractive(new Phaser.Geom.Circle(0, 0, 16), Phaser.Geom.Circle.Contains);
    button.on('pointerdown', onPress);
    return button;
  }

  cycle(category, direction) {
    this.game.services.save.cycleSelection(category, direction);
    this.refreshHud();
  }

  refreshHud() {
    const save = this.game.services.save;
    const state = save.state;
    const metrics = getViewportMetrics(this);
    const selections = save.getSelectedCosmetics();
    const skin = getCatalogItem('skins', selections.skin);
    const flag = getCatalogItem('flags', selections.flag);

    this.walletText.setText(
      metrics.isPhonePortrait
        ? `Treasure ${state.wallet.gold} gold | ${state.wallet.gems} gems\nBest quick ${state.quickPlay.bestScore}`
        : metrics.isPhoneLandscape
          ? `Treasure ${state.wallet.gold} gold | ${state.wallet.gems} gems | Best quick ${state.quickPlay.bestScore}`
          : `Treasure ${state.wallet.gold} gold   |   ${state.wallet.gems} gems   |   Best quick ${state.quickPlay.bestScore}`,
    );
    this.previewCannon.setTint(skin?.palette.base ?? 0xf2ad4e);
    this.previewText.setText(`Skin ${skin?.label ?? 'Sunburst'}\nFlag ${flag?.label ?? 'Classic Flag'}`);

    this.loadoutRows.forEach((row) => {
      const selected = getCatalogItem(row.category, save.state.cosmetics[{
        skins: 'selectedSkin',
        flags: 'selectedFlag',
        pets: 'selectedPet',
        decorations: 'selectedDecoration',
      }[row.category]]);
      row.value.setText(selected?.label ?? 'None');
    });
  }

  openSettings() {
    this.settingsPanel?.destroy();
    this.settingsPanel = new SettingsPanel(this, () => {
      this.settingsPanel = null;
      this.refreshHud();
    }).setDepth(140);
    this.settingsPanel.relayout();
  }

  layout() {
    const { width, height } = this.scale;
    const metrics = getViewportMetrics(this);
    const safe = getSafeBounds(this, metrics.scenePadding);
    const phonePortrait = metrics.isPhonePortrait;
    const phoneLandscape = metrics.isPhoneLandscape;
    const tabletPortrait = metrics.isTabletPortrait;

    this.sub.setVisible(!phonePortrait);

    this.title.setStyle({
      fontSize: phonePortrait ? '34px' : phoneLandscape ? '34px' : '62px',
      strokeThickness: phonePortrait || phoneLandscape ? 9 : 12,
    });
    this.sub.setStyle({
      fontSize: phonePortrait ? '16px' : phoneLandscape ? '14px' : '22px',
      strokeThickness: phonePortrait || phoneLandscape ? 6 : 8,
      wordWrap: { width: phoneLandscape ? width * 0.42 : safe.width - 20 },
    });
    this.walletText.setStyle({
      fontSize: phonePortrait ? '15px' : phoneLandscape ? '14px' : '20px',
      strokeThickness: phonePortrait || phoneLandscape ? 5 : 6,
      wordWrap: { width: phonePortrait ? safe.width - 24 : width * 0.7 },
      align: 'center',
    });
    this.loadoutTitle.setStyle({
      fontSize: phonePortrait ? '20px' : phoneLandscape ? '18px' : '24px',
    });
    this.previewText.setStyle({
      fontSize: phonePortrait ? '15px' : phoneLandscape ? '14px' : '18px',
    });

    this.menuButton.setButtonLayout({
      width: phonePortrait ? 96 : phoneLandscape ? 86 : 150,
      height: phonePortrait ? 52 : phoneLandscape ? 46 : 62,
      fontSize: phonePortrait ? 20 : phoneLandscape ? 18 : 24,
    });
    this.settingsButton.setButtonLayout({
      width: phonePortrait ? 114 : phoneLandscape ? 96 : 170,
      height: phonePortrait ? 52 : phoneLandscape ? 46 : 62,
      fontSize: phonePortrait ? 20 : phoneLandscape ? 18 : 24,
    });
    this.quickButton.setButtonLayout({
      width: phonePortrait ? safe.width - 26 : phoneLandscape ? 170 : 220,
      height: phonePortrait ? 68 : phoneLandscape ? 56 : 70,
      fontSize: phonePortrait ? 26 : phoneLandscape ? 22 : 28,
    });

    this.loadoutRows.forEach((row) => {
      row.label.setText((phonePortrait || phoneLandscape)
        ? ({
            skins: 'Skin',
            flags: 'Flag',
            pets: 'Pet',
            decorations: 'Decor',
          }[row.category])
        : row.fullTitle);
      row.label.setStyle({ fontSize: phonePortrait ? '16px' : phoneLandscape ? '15px' : '18px' });
      row.value.setStyle({
        fontSize: phonePortrait ? '16px' : phoneLandscape ? '15px' : '18px',
        wordWrap: { width: phoneLandscape ? 110 : phonePortrait ? 92 : 140 },
        align: 'center',
      });
      row.left.setScale(phoneLandscape ? 0.9 : phonePortrait ? 1 : 1);
      row.right.setScale(phoneLandscape ? 0.9 : phonePortrait ? 1 : 1);
    });

    if (phoneLandscape) {
      this.title.setPosition(width * 0.34, safe.top + 22);
      this.sub.setPosition(width * 0.34, safe.top + 58);
      this.menuButton.setPosition(safe.left + 46, safe.top + 24);
      this.settingsButton.setPosition(width - metrics.scenePadding.right - this.settingsButton.widthValue / 2, safe.top + 24);
      this.walletText.setPosition(width * 0.33, height - metrics.scenePadding.bottom - 18);
      this.quickButton.setPosition(width - metrics.scenePadding.right - this.quickButton.widthValue / 2, height - metrics.scenePadding.bottom - 26);
    } else {
      this.title.setPosition(width / 2, phonePortrait ? safe.top + 64 : height * 0.09);
      this.sub.setPosition(width / 2, phonePortrait ? safe.top + 56 : height * 0.15);
      this.menuButton.setPosition(safe.left + this.menuButton.widthValue / 2, safe.top + 22);
      this.settingsButton.setPosition(width - metrics.scenePadding.right - this.settingsButton.widthValue / 2, safe.top + 22);
      this.quickButton.setPosition(phonePortrait ? width / 2 : width - metrics.scenePadding.right - this.quickButton.widthValue / 2, height - metrics.scenePadding.bottom - (phonePortrait ? 42 : 56));
      this.walletText.setPosition(width / 2, phonePortrait ? safe.top + 108 : height - 30);
    }

    const mapTop = phonePortrait
      ? safe.top + 116
      : phoneLandscape
        ? safe.top + 86
        : height * 0.22;
    const mapHeight = phonePortrait
      ? height * 0.42
      : phoneLandscape
        ? height * 0.46
        : tabletPortrait
          ? height * 0.34
          : height * 0.38;
    const cols = phonePortrait ? 3 : 6;
    const usableWidth = phonePortrait
      ? width * 0.54
      : phoneLandscape
        ? width * 0.56
        : width * 0.74;
    const left = phonePortrait
      ? width * 0.23
      : phoneLandscape
        ? width * 0.07
        : width * 0.13;
    const rows = Math.ceil(STORY_LEVELS.length / cols);
    const rowGap = rows > 1 ? mapHeight / (rows - 1) : 0;
    const colGap = cols > 1 ? usableWidth / (cols - 1) : 0;
    const points = STORY_LEVELS.map((_, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const zigzagCol = row % 2 === 0 ? col : cols - 1 - col;
      return {
        x: left + zigzagCol * colGap,
        y: mapTop + row * rowGap + Math.sin((index % Math.max(2, cols - 1)) / Math.max(1, cols - 1) * Math.PI) * (phonePortrait ? 10 : 18),
      };
    });

    this.mapFrame.clear();
    this.mapFrame.fillStyle(0x135274, 0.26);
    this.mapFrame.fillRoundedRect(
      phonePortrait ? width * 0.08 : phoneLandscape ? width * 0.04 : width * 0.08,
      mapTop - (phonePortrait ? 24 : 18),
      phonePortrait ? width * 0.84 : phoneLandscape ? width * 0.62 : width * 0.84,
      mapHeight + (phonePortrait ? 42 : 36),
      phonePortrait ? 28 : 36,
    );

    this.pathGraphics.clear();
    this.pathGraphics.lineStyle(phonePortrait ? 6 : 8, 0xfff5d8, 0.58);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => this.pathGraphics.lineTo(point.x, point.y));
    this.pathGraphics.strokePath();

    points.forEach((point) => {
      this.pathGraphics.fillStyle(0xffffff, 0.22);
      this.pathGraphics.fillCircle(point.x, point.y, 6);
    });

    this.nodes.forEach((node, index) => {
      node.container.setPosition(points[index].x, points[index].y);
      node.container.setScale(phonePortrait ? 0.86 : phoneLandscape ? 0.76 : 1);
    });

    const panelX = phoneLandscape ? width * 0.81 : width / 2;
    const panelY = phonePortrait ? height * 0.77 : phoneLandscape ? height * 0.58 : height * 0.79;
    const panelWidth = phonePortrait
      ? Math.min(360, safe.width)
      : phoneLandscape
        ? Math.min(260, width * 0.3)
        : Math.min(660, width * 0.82);
    const panelHeight = phonePortrait
      ? Math.min(214, height * 0.25)
      : phoneLandscape
        ? Math.min(204, height * 0.62)
        : Math.min(200, height * 0.26);

    this.panel.clear();
    this.panel.fillStyle(0xfff7df, 0.95);
    this.panel.lineStyle(6, 0xffc96a, 1);
    this.panel.fillRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 28);
    this.panel.strokeRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 28);

    this.loadoutTitle.setPosition(panelX, panelY - panelHeight / 2 + (phonePortrait ? 24 : 28));
    this.previewCannon.setPosition(panelX - panelWidth / 2 + (phonePortrait ? 74 : phoneLandscape ? 58 : 102), panelY + (phonePortrait ? -6 : 0)).setScale(phonePortrait ? 0.54 : phoneLandscape ? 0.48 : 0.74);
    this.previewSpark.setPosition(this.previewCannon.x + (phonePortrait ? 34 : 42), this.previewCannon.y - 28);
    this.previewText.setPosition(this.previewCannon.x + (phonePortrait ? 14 : 8), panelY + (phonePortrait ? 46 : 52));
    this.previewText.setVisible(!(phonePortrait || phoneLandscape));

    const activeRows = this.loadoutRows.filter((row) => !((phonePortrait || phoneLandscape) && row.category === 'decorations'));
    this.loadoutRows.forEach((row) => row.setVisible(activeRows.includes(row)));

    activeRows.forEach((row, index) => {
      const baseY = panelY - panelHeight / 2 + (phonePortrait ? 62 : phoneLandscape ? 54 : 74) + index * (phonePortrait ? 30 : phoneLandscape ? 32 : 36);
      if (phonePortrait) {
        row.label.setPosition(panelX - 8, baseY);
        row.left.setPosition(panelX + 72, baseY);
        row.value.setPosition(panelX + 114, baseY);
        row.right.setPosition(panelX + 154, baseY);
      } else if (phoneLandscape) {
        row.label.setPosition(panelX - 46, baseY);
        row.left.setPosition(panelX + 38, baseY);
        row.value.setPosition(panelX + 82, baseY);
        row.right.setPosition(panelX + 122, baseY);
      } else {
        row.label.setPosition(panelX - 120, baseY);
        row.left.setPosition(panelX + 62, baseY);
        row.value.setPosition(panelX + 124, baseY);
        row.right.setPosition(panelX + 188, baseY);
      }
    });

    this.settingsPanel?.relayout();
  }
}
