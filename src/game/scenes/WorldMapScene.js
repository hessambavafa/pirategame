import Phaser from 'phaser';
import { SCENES } from '../constants.js';
import { STORY_LEVELS } from '../content/levels.js';
import { getCatalogItem } from '../content/unlocks.js';
import { createBackdrop } from '../effects/BackdropFactory.js';
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
    const selections = save.getSelectedCosmetics();
    const skin = getCatalogItem('skins', selections.skin);
    const flag = getCatalogItem('flags', selections.flag);

    this.walletText.setText(`Treasure ${state.wallet.gold} gold   |   ${state.wallet.gems} gems   |   Best quick ${state.quickPlay.bestScore}`);
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
    this.title.setPosition(width / 2, height * 0.09);
    this.sub.setPosition(width / 2, height * 0.15);
    this.menuButton.setPosition(92, 48);
    this.settingsButton.setPosition(width - 102, 48);
    this.quickButton.setPosition(width - 136, height - 56);
    this.walletText.setPosition(width / 2, height - 30);

    const mapTop = height * 0.22;
    const mapHeight = height * 0.38;
    const cols = 6;
    const usableWidth = width * 0.74;
    const left = width * 0.13;
    const rowGap = mapHeight / 2;
    const colGap = usableWidth / (cols - 1);
    const points = STORY_LEVELS.map((_, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const zigzagCol = row % 2 === 0 ? col : cols - 1 - col;
      return {
        x: left + zigzagCol * colGap,
        y: mapTop + row * rowGap + Math.sin((index % cols) / (cols - 1) * Math.PI) * 18,
      };
    });

    this.mapFrame.clear();
    this.mapFrame.fillStyle(0x135274, 0.26);
    this.mapFrame.fillRoundedRect(width * 0.08, height * 0.2, width * 0.84, height * 0.42, 36);

    this.pathGraphics.clear();
    this.pathGraphics.lineStyle(8, 0xfff5d8, 0.58);
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
    });

    const panelX = width / 2;
    const panelY = height * 0.79;
    const panelWidth = Math.min(660, width * 0.82);
    const panelHeight = Math.min(200, height * 0.26);

    this.panel.clear();
    this.panel.fillStyle(0xfff7df, 0.95);
    this.panel.lineStyle(6, 0xffc96a, 1);
    this.panel.fillRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 28);
    this.panel.strokeRoundedRect(panelX - panelWidth / 2, panelY - panelHeight / 2, panelWidth, panelHeight, 28);

    this.loadoutTitle.setPosition(panelX, panelY - 72);
    this.previewCannon.setPosition(panelX - panelWidth / 2 + 102, panelY + 0).setScale(0.74);
    this.previewSpark.setPosition(panelX - panelWidth / 2 + 144, panelY - 34);
    this.previewText.setPosition(panelX - panelWidth / 2 + 110, panelY + 52);

    this.loadoutRows.forEach((row, index) => {
      const baseY = panelY - 26 + index * 36;
      row.label.setPosition(panelX - 120, baseY);
      row.left.setPosition(panelX + 62, baseY);
      row.value.setPosition(panelX + 124, baseY);
      row.right.setPosition(panelX + 188, baseY);
    });

    this.settingsPanel?.relayout();
  }
}
