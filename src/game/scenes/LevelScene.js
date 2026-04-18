import Phaser from 'phaser';
import { DEPTHS, HEARTS, QUICK_PLAY_HEARTS, SCENES } from '../constants.js';
import { QUICK_PLAY_CONFIG, getLevelById } from '../content/levels.js';
import { getCatalogItem } from '../content/unlocks.js';
import { createBackdrop } from '../effects/BackdropFactory.js';
import { ChallengeFactory } from '../systems/ChallengeFactory.js';
import { DifficultyDirector } from '../systems/DifficultyDirector.js';
import { createPromptCard, renderOptionVisual } from '../ui/ChallengeVisuals.js';
import { DebugPanel } from '../ui/DebugPanel.js';
import { SettingsPanel } from '../ui/SettingsPanel.js';
import { BigButton } from '../ui/Button.js';

export class LevelScene extends Phaser.Scene {
  constructor() {
    super(SCENES.LEVEL);
  }

  init(data) {
    this.mode = data.mode ?? 'story';
    this.levelId = data.levelId ?? 1;
    this.level = getLevelById(this.levelId);
    this.totalWaves = this.mode === 'quick' ? Number.POSITIVE_INFINITY : this.level.waves;
  }

  create() {
    this.save = this.game.services.save;
    this.audio = this.game.services.audio;
    this.audio.playBattleLoop(this);

    this.challengeFactory = new ChallengeFactory();
    this.difficulty = new DifficultyDirector(this.save.state.tuning);
    this.difficulty.reset(this.mode);

    this.backdrop = createBackdrop(this, { withPalms: false, livelyWater: true });
    this.activeTargets = [];
    this.currentTargetSlots = [];
    this.finished = false;
    this.canShoot = false;
    this.resolvingWave = false;
    this.previousTemplateId = null;
    this.hintTimer = null;
    this.supportTimer = null;
    this.currentWaveRecorded = false;
    this.hoveredTarget = null;
    this.waveMistakes = 0;

    const startingHearts = this.mode === 'quick' ? QUICK_PLAY_HEARTS : this.level.tier === 1 ? 4 : HEARTS;

    this.state = {
      wave: 0,
      hearts: startingHearts,
      score: 0,
      gold: 0,
      gems: 0,
      streak: 0,
      mistakes: 0,
      correctAnswers: 0,
      wavesResolved: 0,
      perfectWaves: 0,
    };

    this.buildPlayfield();
    this.buildHud();
    this.buildDebugPanel();

    this.scale.on('resize', this.layout, this);
    this.input.on('pointerdown', this.handleGameplayPointerDown, this);
    this.input.on('pointermove', this.handleGameplayPointerMove, this);
    this.input.on('gameout', this.handlePointerOut, this);
    this.input.keyboard?.on('keydown-D', () => {
      const visible = this.save.toggleDebugPanel();
      this.debugPanel.toggle(visible);
      this.refreshDebug();
    });
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.input.off('pointerdown', this.handleGameplayPointerDown, this);
      this.input.off('pointermove', this.handleGameplayPointerMove, this);
      this.input.off('gameout', this.handlePointerOut, this);
    });

    this.layout();
    this.time.delayedCall(320, () => this.startNextWave());
  }

  buildPlayfield() {
    this.island = this.add.image(0, 0, 'island').setDepth(DEPTHS.GAMEPLAY).setScale(1.28);
    this.palm = this.add.image(0, 0, 'palm').setDepth(DEPTHS.GAMEPLAY + 1).setScale(0.96);
    this.coveGlow = this.add.circle(0, 0, 122, 0xffffff, 0.08).setDepth(DEPTHS.WATER + 1);
    this.cannonGlow = this.add.circle(0, 0, 62, 0xffd46d, 0.16).setDepth(DEPTHS.GAMEPLAY + 1);
    this.cannonShadow = this.add.ellipse(0, 0, 170, 28, 0x093d5a, 0.22).setDepth(DEPTHS.GAMEPLAY + 1);

    this.cannon = this.add.container(0, 0).setDepth(DEPTHS.GAMEPLAY + 2);
    this.cannonBase = this.add.image(0, 24, 'cannon-base');
    this.cannonBarrel = this.add.image(40, -8, 'cannon-barrel').setOrigin(0.25, 0.5).setRotation(-0.4);
    this.cannonBarrelRestX = 40;
    this.cannonLabel = this.add.text(6, -70, 'Zap!', {
      fontFamily: 'Fredoka',
      fontSize: '24px',
      fontStyle: '700',
      color: '#fff8d8',
      stroke: '#1b5d88',
      strokeThickness: 8,
    }).setOrigin(0.5);
    this.cannonFlagPole = this.add.rectangle(-48, -36, 4, 40, 0x7f4f2f).setOrigin(0.5, 1);
    this.cannonFlag = this.add.triangle(-32, -58, 0, 0, 0, 24, 30, 12, 0xff5b5b).setOrigin(0.5);
    this.petHint = this.add.text(-4, 56, '', {
      fontFamily: 'Fredoka',
      fontSize: '18px',
      color: '#fff8d8',
      stroke: '#1b5d88',
      strokeThickness: 6,
    }).setOrigin(0.5);
    this.cannon.add([this.cannonBase, this.cannonBarrel, this.cannonFlagPole, this.cannonFlag, this.cannonLabel, this.petHint]);

    this.tweens.add({
      targets: this.cannonFlag,
      angle: { from: -4, to: 6 },
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.fxLayer = this.add.container(0, 0).setDepth(DEPTHS.FX);
    this.prompt = null;
    this.waveIntro = null;
    this.applyCosmetics();
  }

  buildHud() {
    this.hudLeftPanel = this.add.graphics().setDepth(DEPTHS.UI - 1);
    this.hudCenterPanel = this.add.graphics().setDepth(DEPTHS.UI - 1);
    this.hudRightPanel = this.add.graphics().setDepth(DEPTHS.UI - 1);

    this.levelText = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka',
      fontSize: '26px',
      fontStyle: '700',
      color: '#ffffff',
      stroke: '#1b5f8c',
      strokeThickness: 8,
    }).setDepth(DEPTHS.UI);

    this.scoreText = this.add.text(0, 0, 'Score 0', {
      fontFamily: 'Fredoka',
      fontSize: '28px',
      fontStyle: '700',
      color: '#fff8d8',
      stroke: '#1b5f8c',
      strokeThickness: 8,
    }).setDepth(DEPTHS.UI);

    this.waveText = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka',
      fontSize: '24px',
      fontStyle: '700',
      color: '#ffffff',
      stroke: '#1b5f8c',
      strokeThickness: 8,
    }).setDepth(DEPTHS.UI);

    this.comboText = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka',
      fontSize: '20px',
      fontStyle: '700',
      color: '#ffefaa',
      stroke: '#1b5f8c',
      strokeThickness: 6,
    }).setDepth(DEPTHS.UI);

    this.hearts = Array.from({ length: 4 }, () => this.add.image(0, 0, 'heart').setDepth(DEPTHS.UI));

    this.mapButton = new BigButton(this, {
      x: 0,
      y: 0,
      width: 140,
      height: 58,
      label: this.mode === 'quick' ? 'Menu' : 'Map',
      fontSize: 22,
      fill: 0xffffff,
      stroke: 0xb7d9f4,
      textColor: '#2a587e',
      onPress: () => this.scene.start(this.mode === 'quick' ? SCENES.MENU : SCENES.MAP),
    });

    this.settingsButton = new BigButton(this, {
      x: 0,
      y: 0,
      width: 150,
      height: 58,
      label: 'Settings',
      fontSize: 22,
      fill: 0xffffff,
      stroke: 0xb7d9f4,
      textColor: '#2a587e',
      onPress: () => this.openSettings(),
    });

    this.restartButton = new BigButton(this, {
      x: 0,
      y: 0,
      width: 150,
      height: 58,
      label: 'Restart',
      fontSize: 22,
      fill: 0xffffff,
      stroke: 0xb7d9f4,
      textColor: '#2a587e',
      onPress: () => this.scene.restart({ mode: this.mode, levelId: this.levelId }),
    });

    this.updateHud();
  }

  buildDebugPanel() {
    this.debugPanel = new DebugPanel(this, 150, 190, (key, delta) => {
      this.save.adjustTuning(key, delta);
      this.difficulty.syncTuning(this.save.state.tuning);
      this.refreshDebug();
    }).setDepth(DEPTHS.DEBUG);
    this.debugPanel.toggle(this.save.state.settings.debugPanel);
    this.refreshDebug();
  }

  applyCosmetics() {
    const selected = this.save.getSelectedCosmetics();
    const skin = getCatalogItem('skins', selected.skin);
    const flag = getCatalogItem('flags', selected.flag);
    const pet = getCatalogItem('pets', selected.pet);

    this.cannonBase.setTint(skin?.palette.band ?? 0xfff1b1);
    this.cannonBarrel.setTint(skin?.palette.base ?? 0xf2ad4e);
    this.cannonGlow.setFillStyle(skin?.palette.glow ?? 0xffd46d, 0.18);
    this.cannonFlag.setFillStyle(flag?.color ?? 0xff5b5b, 1);
    this.petHint.setText(pet?.label ?? 'Mr. Sussy');
  }

  layout() {
    const { width, height } = this.scale;
    const compactHud = width < 720;

    const tinyHud = width < 520;

    this.drawHudPanels(width, height, compactHud, tinyHud);
    this.island.setPosition(width * (compactHud ? 0.14 : 0.12), height * 0.81).setScale(Math.min(1.32, width / 950));
    this.palm.setPosition(width * 0.05, height * 0.61).setScale(Math.min(1.02, width / 1220));
    this.coveGlow.setPosition(width * 0.19, height * 0.73);
    this.cannonGlow.setPosition(width * 0.15, height * 0.72);
    this.cannonShadow.setPosition(width * 0.15, height * 0.82);
    this.cannon.setPosition(width * (compactHud ? 0.2 : 0.16), height * 0.74);

    this.levelText.setStyle({ fontSize: tinyHud ? '18px' : compactHud ? '22px' : '26px', strokeThickness: tinyHud ? 5 : compactHud ? 6 : 8 });
    this.scoreText.setStyle({ fontSize: tinyHud ? '20px' : compactHud ? '22px' : '28px', strokeThickness: tinyHud ? 5 : compactHud ? 6 : 8 });
    this.waveText.setStyle({ fontSize: tinyHud ? '17px' : compactHud ? '20px' : '24px', strokeThickness: tinyHud ? 5 : compactHud ? 6 : 8 });
    this.comboText.setStyle({ fontSize: tinyHud ? '15px' : compactHud ? '18px' : '20px', strokeThickness: tinyHud ? 4 : compactHud ? 5 : 6 });

    this.levelText.setPosition(compactHud ? 18 : 32, tinyHud ? 14 : compactHud ? 18 : 20);
    this.scoreText.setPosition(width * 0.5 - this.scoreText.width / 2, tinyHud ? 12 : compactHud ? 16 : 18);
    this.waveText.setPosition(width * 0.5 - this.waveText.width / 2, tinyHud ? 34 : compactHud ? 42 : 50);
    this.comboText.setPosition(width * 0.5 - this.comboText.width / 2, tinyHud ? 54 : compactHud ? 66 : 80);

    if (compactHud) {
      const buttonScale = tinyHud ? 0.48 : 0.56;
      this.mapButton.setScale(buttonScale).setPosition(width - (tinyHud ? 46 : 54), tinyHud ? 28 : 34);
      this.settingsButton.setScale(buttonScale).setPosition(width - (tinyHud ? 46 : 54), tinyHud ? 68 : 82);
      this.restartButton.setScale(buttonScale).setPosition(width - (tinyHud ? 46 : 54), tinyHud ? 108 : 130);
      this.hearts.forEach((heart, index) => {
        heart.setPosition((tinyHud ? 30 : 42) + index * (tinyHud ? 24 : 30), tinyHud ? 54 : 64).setScale(tinyHud ? 0.72 : 0.86);
      });
    } else {
      this.mapButton.setScale(1).setPosition(width - 410, 48);
      this.settingsButton.setScale(1).setPosition(width - 250, 48);
      this.restartButton.setScale(1).setPosition(width - 92, 48);
      this.hearts.forEach((heart, index) => {
        heart.setPosition(56 + index * 40, 92).setScale(1);
      });
    }

    if (this.prompt) {
      const promptY = compactHud
        ? Phaser.Math.Clamp(height * 0.24, 182, 228)
        : Phaser.Math.Clamp(height * 0.235, 152, 198);
      const promptScale = Math.min(
        0.92,
        compactHud ? width / 1160 : width / 980,
        height / (compactHud ? 920 : 760) + 0.02,
      );
      this.prompt.setPosition(width * 0.5, promptY).setScale(promptScale);
      this.prompt.baseScale = promptScale;
    }

    this.debugPanel.setPosition(148, 182);
    this.settingsPanel?.relayout();
  }

  drawHudPanels(width, height, compactHud = false, tinyHud = false) {
    const drawPanel = (graphics, x, y, panelWidth, panelHeight, fill = 0x135274) => {
      graphics.clear();
      if (panelWidth <= 0 || panelHeight <= 0) {
        return;
      }
      graphics.fillStyle(0x0b3e5d, 0.18);
      graphics.fillRoundedRect(x, y + 8, panelWidth, panelHeight, 24);
      graphics.fillStyle(fill, 0.48);
      graphics.lineStyle(4, 0xffffff, 0.28);
      graphics.fillRoundedRect(x, y, panelWidth, panelHeight, 24);
      graphics.strokeRoundedRect(x, y, panelWidth, panelHeight, 24);
    };

    if (compactHud) {
      if (tinyHud) {
        drawPanel(this.hudLeftPanel, 8, 10, 124, 72, 0x175879);
        drawPanel(this.hudCenterPanel, width * 0.5 - 72, 8, 144, 60, 0x175879);
        drawPanel(this.hudRightPanel, width - 86, 10, 78, 124, 0x175879);
        return;
      }

      drawPanel(this.hudLeftPanel, 12, 12, 172, 82, 0x175879);
      drawPanel(this.hudCenterPanel, width * 0.5 - 86, 10, 172, 70, 0x175879);
      drawPanel(this.hudRightPanel, width - 104, 12, 92, 150, 0x175879);
      return;
    }

    drawPanel(this.hudLeftPanel, 18, 14, 212, 108, 0x175879);
    drawPanel(this.hudCenterPanel, width * 0.5 - 150, 12, 300, 86, 0x175879);
    drawPanel(this.hudRightPanel, width - 430, 14, 398, 68, 0x175879);
  }

  updateHud() {
    const title = this.mode === 'quick' ? (this.scale.width < 520 ? 'Quick' : 'Quick Play') : this.scale.width < 520 ? `Level ${this.levelId}` : this.level.title;
    this.levelText.setText(title);
    this.scoreText.setText(`Score ${this.state.score}`);
    this.waveText.setText(
      this.mode === 'quick'
        ? `Wave ${Math.max(1, this.state.wave)}`
        : `Wave ${Math.max(1, Math.min(this.state.wave, this.level.waves))} / ${this.level.waves}`,
    );
    this.comboText.setText(this.state.streak >= 2 ? `Combo x${this.state.streak}` : '');
    this.scoreText.setX(this.scale.width * 0.5 - this.scoreText.width / 2);
    this.waveText.setX(this.scale.width * 0.5 - this.waveText.width / 2);
    this.comboText.setX(this.scale.width * 0.5 - this.comboText.width / 2);

    this.hearts.forEach((heart, index) => {
      heart.setVisible(index < (this.mode === 'quick' ? QUICK_PLAY_HEARTS : this.level.tier === 1 ? 4 : HEARTS));
      heart.setAlpha(index < this.state.hearts ? 1 : 0.24);
      heart.setScale(index < this.state.hearts ? 1 : 0.9);
    });
  }

  refreshDebug() {
    this.debugPanel.setSnapshot(this.difficulty.getDebugSnapshot(), this.save.state.tuning);
  }

  openSettings() {
    this.settingsPanel?.destroy();
    this.settingsPanel = new SettingsPanel(this, () => {
      this.settingsPanel = null;
      this.debugPanel.toggle(this.save.state.settings.debugPanel);
      this.refreshDebug();
    }).setDepth(DEPTHS.MODAL);
    this.settingsPanel.relayout();
  }

  startNextWave() {
    if (this.finished) {
      return;
    }

    this.clearWave();

    if (this.mode === 'story' && this.state.wave >= this.level.waves) {
      this.finishRun(true);
      return;
    }

    this.state.wave += 1;
    this.waveMistakes = 0;
    this.currentWaveRecorded = false;
    this.resolvingWave = false;
    this.canShoot = false;

    const tier = this.mode === 'quick'
      ? Math.min(4, QUICK_PLAY_CONFIG.startingTier + Math.floor((this.state.wave - 1) / QUICK_PLAY_CONFIG.tierStepEvery))
      : this.level.tier;
    const allowedTemplates = this.mode === 'quick' ? templatesForTier(tier) : this.level.allowedTemplates;
    const templateId = this.challengeFactory.pickTemplate(allowedTemplates, this.previousTemplateId);
    const completedCount = Object.keys(this.save.state.story.completedLevels).length;
    const profile = this.difficulty.buildProfile({
      tier,
      waveIndex: this.state.wave - 1,
      quickPlayWave: this.state.wave - 1,
      templateId,
      levelIndex: Math.max(0, this.levelId - 1),
      storyProgress: Phaser.Math.Clamp(completedCount / 18, 0, 1),
    });

    this.currentProfile = profile;
    this.currentChallenge = this.challengeFactory.createChallenge({ templateId, profile, tier });
    this.previousTemplateId = templateId;
    this.currentTargetSlots = this.buildTargetSlots(this.currentChallenge.options.length);
    this.waveStartedAt = this.time.now + 160;

    this.prompt = createPromptCard(this, this.scale.width * 0.5, this.scale.height * 0.22, this.currentChallenge).setDepth(DEPTHS.UI);
    this.layout();
    const promptBaseScale = this.prompt.baseScale ?? this.prompt.scaleX;
    this.prompt.setAlpha(0).setScale(promptBaseScale * 0.96);
    this.tweens.add({
      targets: this.prompt,
      alpha: 1,
      scaleX: promptBaseScale,
      scaleY: promptBaseScale,
      duration: 180,
      ease: 'Back.Out',
    });

    this.currentChallenge.options.forEach((option, index) => this.spawnTarget(option, index, this.currentChallenge.options.length));
    this.applyWaveSupport();
    this.scheduleHint();
    this.updateHud();
    this.refreshDebug();

    this.time.delayedCall(160, () => {
      this.canShoot = true;
    });
  }

  showWaveIntro() {}

  applyWaveSupport() {
    this.supportTimer?.remove(false);

    if (this.currentChallenge.supportMode === 'strong' && this.currentChallenge.candidateAssist) {
      this.supportTimer = this.time.delayedCall(850, () => {
        if (!this.finished && !this.resolvingWave && this.canShoot) {
          this.guideTarget(this.currentChallenge.correctTarget, 'strong');
        }
      });
      return;
    }

    if (this.currentChallenge.supportMode === 'medium') {
      this.supportTimer = this.time.delayedCall(640, () => this.pulsePrompt());
    }
  }

  pulsePrompt() {
    if (!this.prompt) {
      return;
    }

    const baseScale = this.prompt.baseScale ?? this.prompt.scaleX;
    this.tweens.add({
      targets: this.prompt,
      scaleX: baseScale * 1.03,
      scaleY: baseScale * 1.03,
      duration: 120,
      yoyo: true,
      ease: 'Sine.Out',
      onComplete: () => this.prompt?.setScale(baseScale),
    });
  }

  scheduleHint() {
    this.hintTimer?.remove(false);

    if (this.currentChallenge.hintStrength <= 0.18) {
      return;
    }

    const delay = Math.max(1500, this.currentChallenge.responseGoalMs * (0.8 - this.currentChallenge.hintStrength * 0.32));
    this.hintTimer = this.time.delayedCall(delay, () => this.showHint());
  }

  showHint() {
    const target = this.currentChallenge?.correctTarget;

    if (!target || this.resolvingWave || this.finished) {
      return;
    }

    this.pulsePrompt();
    if (this.currentChallenge.supportMode === 'strong') {
      this.guideTarget(target, 'strong');
    } else if (this.currentChallenge.supportMode === 'medium') {
      this.guideTarget(target, 'medium');
    } else {
      this.spawnSparkleBurst(target.container.x, target.container.y - 12, 4);
    }

  }

  buildTargetSlots(total) {
    const width = this.scale.width;
    const height = this.scale.height;
    const layoutTop = height * (width < 720 ? 0.5 : 0.48);
    const layoutBottom = height * (width < 720 ? 0.84 : 0.86);
    const centerY = (layoutTop + layoutBottom) / 2;
    const gap = total <= 1 ? 0 : (layoutBottom - layoutTop) / (total - 1);
    const closeX = width * (width < 720 ? 0.76 : 0.81);
    const farX = width * (width < 720 ? 0.88 : 0.9);
    const midX = width * 0.85;
    const patterns = total >= 4
      ? [
          [closeX, farX, closeX, farX],
          [farX, closeX, farX, closeX],
        ]
      : total === 3
        ? [
            [closeX, farX, closeX],
            [farX, closeX, farX],
          ]
        : total === 2
          ? [
              [closeX, farX],
              [farX, closeX],
            ]
          : [[midX]];
    const pattern = patterns[Phaser.Math.Between(0, patterns.length - 1)];
    const sizeScale = total >= 4 ? 0.82 : total === 3 ? 0.92 : 1;

    return Array.from({ length: total }, (_, index) => ({
      x: pattern[index] ?? midX,
      y: centerY + (index - (total - 1) / 2) * gap,
      sizeScale,
    }));
  }

  spawnTarget(option, index, total) {
    const isMarker = option.targetStyle === 'marker';
    const isRaft = option.targetStyle === 'raft';
    const slot = this.currentTargetSlots?.[index] ?? {
      x: this.scale.width * 0.84,
      y: this.scale.height * 0.72,
      sizeScale: 1,
    };
    const sizeScale = slot.sizeScale ?? 1;
    const visualIsNumber = option.cargo?.kind === 'number';
    const x = slot.x;
    const y = slot.y;
    const container = this.add.container(x, y).setDepth(DEPTHS.GAMEPLAY);
    const shadow = this.add.ellipse(
      0,
      isMarker ? 40 * sizeScale : 88 * sizeScale,
      (isMarker ? 88 : isRaft ? 128 : 142) * sizeScale,
      (isMarker ? 18 : 24) * sizeScale,
      0x0b4f73,
      0.22,
    );
    const wakeScale = (isMarker ? 0.58 : isRaft ? 1.02 : 1.08) * (sizeScale < 1 ? sizeScale + 0.04 : 1);
    const wake = this.add.image(0, isMarker ? 26 * sizeScale : 96 * sizeScale, 'splash').setScale(wakeScale).setAlpha(isMarker ? 0.18 : 0.28);
    const choicePlate = this.add.graphics();
    const plateWidth = (isMarker ? 132 : isRaft ? 184 : 196) * sizeScale;
    const plateHeight = (isMarker ? 136 : 170) * sizeScale;
    const plateTop = isMarker ? -56 * sizeScale : -82 * sizeScale;
    choicePlate.fillStyle(0xffffff, 0.16);
    choicePlate.lineStyle(4, 0xa9e7ff, 0.46);
    choicePlate.fillRoundedRect(-plateWidth / 2, plateTop, plateWidth, plateHeight, 30 * sizeScale);
    choicePlate.strokeRoundedRect(-plateWidth / 2, plateTop, plateWidth, plateHeight, 30 * sizeScale);
    choicePlate.fillStyle(this.currentChallenge.accentColor, 0.1);
    choicePlate.fillRoundedRect(-plateWidth / 2 + 10 * sizeScale, plateTop + 10 * sizeScale, plateWidth - 20 * sizeScale, plateHeight - 20 * sizeScale, 24 * sizeScale);
    choicePlate.setAlpha(0.8);
    const supportGlow = this.add.circle(0, isMarker ? 4 * sizeScale : 4 * sizeScale, (isMarker ? 70 : 92) * sizeScale, 0xffefac, 0).setStrokeStyle(10 * sizeScale, 0xffffff, 0);
    const hoverGlow = this.add.circle(0, isMarker ? 4 * sizeScale : 2 * sizeScale, (isMarker ? 62 : 84) * sizeScale, 0xfff2b8, 0).setStrokeStyle(8 * sizeScale, 0xffffff, 0);
    const flash = this.add.circle(0, isMarker ? 4 * sizeScale : 6 * sizeScale, (isMarker ? 58 : 78) * sizeScale, 0xffffff, 0).setStrokeStyle(10 * sizeScale, 0xffffff, 0);
    const hullKey = isMarker ? 'marker' : isRaft ? 'raft' : 'ship';
    const hullScale = (isMarker ? 1.04 : isRaft ? 1.02 : 1.08) * sizeScale;
    const hull = this.add.image(0, isMarker ? 2 : 68 * sizeScale, hullKey).setScale(hullScale);

    const parts = [shadow, wake, choicePlate, supportGlow, hoverGlow, flash];
    let cargoTray = null;

    if (!isMarker) {
      cargoTray = this.add.graphics();
      const trayWidth = (isRaft ? 132 : 140) * sizeScale;
      cargoTray.fillStyle(0xffffff, 0.94);
      cargoTray.lineStyle(4, this.currentChallenge.accentColor, 0.52);
      cargoTray.fillRoundedRect(-trayWidth / 2, -66 * sizeScale, trayWidth, 92 * sizeScale, 24 * sizeScale);
      cargoTray.strokeRoundedRect(-trayWidth / 2, -66 * sizeScale, trayWidth, 92 * sizeScale, 24 * sizeScale);
      cargoTray.fillStyle(this.currentChallenge.accentColor, 0.08);
      cargoTray.fillRoundedRect(-trayWidth / 2 + 8 * sizeScale, -58 * sizeScale, trayWidth - 16 * sizeScale, 76 * sizeScale, 18 * sizeScale);
      parts.push(cargoTray);
    }

    parts.push(hull);
    container.add(parts);
    renderOptionVisual(this, container, 0, isMarker ? -8 * sizeScale : visualIsNumber ? -22 * sizeScale : -20 * sizeScale, option.cargo, {
      showPads: this.currentChallenge.showGroupPads,
      showHelperTags: this.currentChallenge.showHelperTags,
      accentColor: this.currentChallenge.accentColor,
      maxWidth: (isMarker ? 112 : isRaft ? (visualIsNumber ? 112 : 124) : (visualIsNumber ? 106 : 128)) * sizeScale,
      maxHeight: (isMarker ? 82 : visualIsNumber ? 72 : 84) * sizeScale,
    });

    if (option.label) {
      const bubbleY = isMarker ? 48 * sizeScale : -62 * sizeScale;
      const bubbleX = isMarker ? 0 : 68 * sizeScale;
      const bubble = this.add.circle(bubbleX, bubbleY, 24 * sizeScale, 0xfff6d7, 1).setStrokeStyle(6 * sizeScale, 0xffc96a, 1);
      const label = this.add.text(bubbleX, bubbleY, String(option.label), {
        fontFamily: 'Fredoka',
        fontSize: `${Math.round(24 * sizeScale)}px`,
        fontStyle: '700',
        color: '#1f4768',
      }).setOrigin(0.5);
      container.add([bubble, label]);
    }

    const target = {
      option,
      container,
      hull,
      choicePlate,
      cargoTray,
      flash,
      supportGlow,
      hoverGlow,
      shadow,
      wake,
      baseWakeScale: wakeScale,
      baseY: y,
      speed: this.currentChallenge.shipSpeed + index * 2,
      bobAmp: (8 + this.currentChallenge.movementAmount * 5) * (sizeScale < 1 ? 0.94 : 1),
      bobRate: 0.0021 + index * 0.00016,
      phase: Math.random() * Math.PI * 2,
      sunk: false,
      baseHullScale: hullScale,
      sizeScale,
      pickZones: this.getPickZonesForOption(option, sizeScale),
    };

    if (option.isCorrect) {
      this.currentChallenge.correctTarget = target;
    }

    this.activeTargets.push(target);
  }


  guideTarget(target, strength = 'strong') {
    if (!target || target.sunk) {
      return;
    }

    const alpha = strength === 'strong' ? 0.32 : 0.18;
    const stroke = strength === 'strong' ? 0.82 : 0.5;
    target.supportGlow.setFillStyle(0xffefac, alpha);
    target.supportGlow.setStrokeStyle(10, 0xffffff, stroke);
    this.tweens.killTweensOf(target.supportGlow);
    this.tweens.add({
      targets: target.supportGlow,
      alpha: strength === 'strong' ? 0.95 : 0.55,
      scaleX: strength === 'strong' ? 1.12 : 1.06,
      scaleY: strength === 'strong' ? 1.12 : 1.06,
      duration: 280,
      yoyo: true,
      repeat: strength === 'strong' ? 2 : 1,
      ease: 'Sine.Out',
      onComplete: () => {
        if (!target.sunk) {
          target.supportGlow.setAlpha(strength === 'strong' ? 0.26 : 0);
          target.supportGlow.setScale(1);
        }
      },
    });
    this.spawnSparkleBurst(target.container.x, target.container.y - 16, strength === 'strong' ? 5 : 3);
  }

  async handleGameplayPointerDown(pointer) {
    if (this.finished || this.settingsPanel || this.resolvingWave) {
      return;
    }

    if (pointer.y < this.scale.height * 0.36) {
      return;
    }

    const target = this.pickBestTarget(pointer.x, pointer.y);

    if (!target) {
      this.setHoveredTarget(null);
      return;
    }

    this.setHoveredTarget(target);
    await this.audio.unlock();
    this.fireAtTarget(target);
  }

  handleGameplayPointerMove(pointer) {
    if (this.finished || this.settingsPanel || !this.activeTargets.length) {
      return;
    }

    this.setHoveredTarget(this.pickBestTarget(pointer.x, pointer.y));
  }

  handlePointerOut() {
    this.setHoveredTarget(null);
  }

  pickBestTarget(worldX, worldY) {
    let bestTarget = null;
    let bestScore = 0;

    this.activeTargets.forEach((target) => {
      if (target.sunk || target.container.alpha < 0.2) {
        return;
      }

      const local = this.toLocalTargetPoint(target, worldX, worldY);
      const score = this.getPickScore(target, local.x, local.y);

      if (score > bestScore) {
        bestScore = score;
        bestTarget = target;
      }
    });

    return bestTarget;
  }

  getPickZonesForOption(option, scale = 1) {
    if (option.targetStyle === 'marker') {
      return [
        { kind: 'circle', x: 0, y: 4 * scale, r: 54 * scale, weight: 1.3 },
        { kind: 'circle', x: 0, y: 46 * scale, r: 24 * scale, weight: 0.62 },
      ];
    }

    if (option.targetStyle === 'raft') {
      return [
        { kind: 'ellipse', x: 0, y: -18 * scale, rx: 70 * scale, ry: 42 * scale, weight: 1.36 },
        { kind: 'ellipse', x: 0, y: 68 * scale, rx: 74 * scale, ry: 28 * scale, weight: 1.08 },
        ...(option.label ? [{ kind: 'circle', x: 68 * scale, y: -62 * scale, r: 24 * scale, weight: 0.7 }] : []),
      ];
    }

    return [
      { kind: 'ellipse', x: 0, y: -16 * scale, rx: 74 * scale, ry: 44 * scale, weight: 1.42 },
      { kind: 'ellipse', x: 0, y: 70 * scale, rx: 82 * scale, ry: 30 * scale, weight: 1.12 },
      ...(option.label ? [{ kind: 'circle', x: 68 * scale, y: -62 * scale, r: 24 * scale, weight: 0.7 }] : []),
    ];
  }


  toLocalTargetPoint(target, worldX, worldY) {
    const dx = worldX - target.container.x;
    const dy = worldY - target.container.y;
    const cos = Math.cos(-target.container.rotation);
    const sin = Math.sin(-target.container.rotation);

    return {
      x: dx * cos - dy * sin,
      y: dx * sin + dy * cos,
    };
  }

  getPickScore(target, x, y) {
    let best = 0;

    target.pickZones.forEach((zone) => {
      let normalized = 99;

      if (zone.kind === 'circle') {
        normalized = Phaser.Math.Distance.Between(x, y, zone.x, zone.y) / zone.r;
      } else if (zone.kind === 'ellipse') {
        normalized = Math.sqrt((((x - zone.x) ** 2) / (zone.rx ** 2)) + (((y - zone.y) ** 2) / (zone.ry ** 2)));
      }

      if (normalized <= 1.18) {
        best = Math.max(best, (1.18 - normalized) * 100 * zone.weight);
      }
    });

    return best;
  }

  setHoveredTarget(target) {
    const nextTarget = target?.sunk ? null : target;

    if (this.hoveredTarget === nextTarget) {
      return;
    }

    if (this.hoveredTarget) {
      this.setTargetHoverState(this.hoveredTarget, false);
    }

    this.hoveredTarget = nextTarget;

    if (this.hoveredTarget) {
      this.setTargetHoverState(this.hoveredTarget, true);
    }
  }

  setTargetHoverState(target, isHovered) {
    this.tweens.killTweensOf([target.hull, target.choicePlate, target.hoverGlow, target.shadow, target.wake]);

    this.tweens.add({
      targets: target.choicePlate,
      alpha: isHovered ? 0.96 : 0.72,
      scaleX: isHovered ? 1.03 : 1,
      scaleY: isHovered ? 1.03 : 1,
      duration: 130,
      ease: 'Sine.Out',
    });
    this.tweens.add({
      targets: target.hull,
      scaleX: target.baseHullScale * (isHovered ? 1.04 : 1),
      scaleY: target.baseHullScale * (isHovered ? 1.04 : 1),
      duration: isHovered ? 120 : 140,
      ease: 'Sine.Out',
    });
    this.tweens.add({
      targets: target.hoverGlow,
      alpha: isHovered ? 0.68 : 0,
      duration: isHovered ? 110 : 140,
      ease: 'Sine.Out',
    });
    this.tweens.add({
      targets: target.shadow,
      alpha: isHovered ? 0.3 : 0.22,
      scaleX: isHovered ? 1.06 : 1,
      duration: 140,
      ease: 'Sine.Out',
    });
    this.tweens.add({
      targets: target.wake,
      alpha: isHovered ? (target.option.targetStyle === 'marker' ? 0.28 : 0.38) : target.option.targetStyle === 'marker' ? 0.18 : 0.28,
      scaleX: target.baseWakeScale * (isHovered ? 1.08 : 1),
      duration: 120,
      ease: 'Sine.Out',
    });
  }

  fireAtTarget(target) {
    if (!this.canShoot || this.resolvingWave || target.sunk || this.finished || this.settingsPanel) {
      return;
    }

    this.canShoot = false;
    this.audio.playCannon?.();

    this.spawnSparkleBurst(this.cannon.x + 88, this.cannon.y - 26, 5);
    this.tweens.add({
      targets: [this.cannonBarrel, this.cannonBase, this.cannonLabel],
      x: '-=14',
      duration: 90,
      yoyo: true,
      ease: 'Quad.Out',
      onComplete: () => {
        this.cannonBarrel.setX(this.cannonBarrelRestX);
        this.cannonBase.setX(0);
        this.cannonLabel.setX(6);
      },
    });

    this.cameras.main.shake(90, 0.0032);
    this.spawnSmokeBurst(this.cannon.x + 74, this.cannon.y - 28, 9);

    const start = new Phaser.Math.Vector2(this.cannon.x + 82, this.cannon.y - 22);
    const end = new Phaser.Math.Vector2(target.container.x - (target.option.targetStyle === 'marker' ? 0 : 20), target.container.y - 6);
    const control = new Phaser.Math.Vector2((start.x + end.x) / 2, Math.min(start.y, end.y) - 150);
    const path = new Phaser.Curves.QuadraticBezier(start, control, end);
    const cannonball = this.add.image(start.x, start.y, 'cannonball').setDepth(DEPTHS.FX).setScale(0.9);

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 340,
      ease: 'Sine.InOut',
      onUpdate: (tween) => {
        const point = path.getPoint(tween.getValue());
        cannonball.setPosition(point.x, point.y);
        cannonball.rotation += 0.28;
      },
      onComplete: () => {
        cannonball.destroy();
        this.resolveShot(target);
      },
    });
  }

  resolveShot(target) {
    if (target.option.isCorrect) {
      this.handleCorrectTarget(target);
      return;
    }

    this.handleWrongTarget(target);
  }

  recordWaveOutcome(correct) {
    if (this.currentWaveRecorded) {
      return;
    }

    this.currentWaveRecorded = true;
    this.state.wavesResolved += 1;
    this.difficulty.recordWaveResult({
      templateId: this.currentChallenge.templateId,
      correct,
      responseMs: this.time.now - this.waveStartedAt,
      mistakes: this.waveMistakes,
    });
    this.refreshDebug();
  }

  handleCorrectTarget(target) {
    this.resolvingWave = true;
    target.sunk = true;
    this.setHoveredTarget(null);
    this.hintTimer?.remove(false);
    this.supportTimer?.remove(false);
    this.recordWaveOutcome(true);

    const responseMs = this.time.now - this.waveStartedAt;
    const responseBonus = Math.max(20, this.currentChallenge.responseGoalMs - responseMs) / 20;
    const nextStreak = this.state.streak + 1;
    const comboBonus = nextStreak > 1 ? Math.min(60, (nextStreak - 1) * 12) : 0;
    const scoreGain = Math.round(110 + responseBonus + comboBonus);
    const goldGain = 5 + this.currentChallenge.tier + Math.min(4, nextStreak);

    this.state.streak = nextStreak;
    this.state.score += scoreGain;
    this.state.gold += goldGain;
    this.state.correctAnswers += 1;

    if (this.waveMistakes === 0) {
      this.state.perfectWaves += 1;
    }

    this.updateHud();
    this.flashTarget(target, 0x7ff0b4);
    this.audio.playExplosion?.();
    this.audio.playSuccess?.();
    this.audio.playReward?.();
    this.spawnImpactBurst(target.container.x, target.container.y + (target.option.targetStyle === 'marker' ? 4 : 18), target.option.targetStyle === 'marker');
    this.spawnSplash(target.container.x, target.container.y + (target.option.targetStyle === 'marker' ? 30 : 44));
    this.spawnCoinBurst(target.container.x, target.container.y - 12, Math.min(14, 6 + goldGain));
    this.spawnFloatingText(target.container.x, target.container.y - 90, nextStreak > 1 ? `Combo x${nextStreak}!` : 'Great shot!', '#fff8d8', 28);
    this.spawnRewardCallouts(target.container.x, target.container.y - 72, { scoreGain, goldGain, streak: nextStreak });
    this.spawnSparkleBurst(target.container.x, target.container.y - 24, 7);
    this.cameras.main.shake(120, 0.0036);

    this.tweens.add({
      targets: target.choicePlate,
      alpha: 1,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 120,
      yoyo: true,
      ease: 'Sine.Out',
    });
    this.tweens.add({
      targets: target.hull,
      scaleX: target.baseHullScale * 1.08,
      scaleY: target.baseHullScale * 1.08,
      duration: 120,
      yoyo: true,
      ease: 'Sine.Out',
    });

    if (nextStreak > 0 && nextStreak % 3 === 0) {
      this.spawnConfetti(target.container.x, target.container.y - 24, 12);
    }

    this.tweens.add({
      targets: target.container,
      y: target.container.y + 90,
      angle: 26,
      alpha: 0,
      duration: 420,
      ease: 'Quad.In',
    });

    this.activeTargets
      .filter((other) => other !== target)
      .forEach((other) => {
        other.sunk = true;
        this.tweens.add({
          targets: other.container,
          x: other.container.x + 120,
          alpha: 0,
          duration: 280,
        });
      });

    this.time.delayedCall(860, () => this.startNextWave());
  }


  handleWrongTarget(target) {
    const isSoftEarly = this.mode === 'story' && this.level.tier === 1 && this.state.wave <= 2 && this.waveMistakes === 0;
    const scoreLoss = isSoftEarly ? 15 : 0;
    const heartsLoss = isSoftEarly ? 0 : 1;

    this.state.streak = 0;
    this.state.mistakes += 1;
    this.waveMistakes += 1;

    if (heartsLoss > 0) {
      this.state.hearts -= heartsLoss;
    } else {
      this.state.score = Math.max(0, this.state.score - scoreLoss);
    }

    this.updateHud();
    this.audio.playImpact?.();
    this.audio.playMistake?.();
    this.audio.playPenalty?.();
    this.flashTarget(target, 0xff7b7b);
    this.spawnPenaltyCallouts(target.container.x, target.container.y - 54, {
      scoreLoss,
      heartsLoss,
      label: heartsLoss > 0 ? 'Missed shot!' : 'Try again!',
    });

    this.tweens.add({
      targets: [target.container, target.hull],
      x: '-=16',
      yoyo: true,
      repeat: 2,
      duration: 50,
    });

    if (this.state.hearts <= 0) {
      this.recordWaveOutcome(false);
      this.time.delayedCall(450, () => this.finishRun(false));
      return;
    }

    this.time.delayedCall(220, () => this.showHint());
    this.time.delayedCall(260, () => {
      this.canShoot = true;
    });
  }


  flashTarget(target, color) {
    target.flash.setFillStyle(color, 0.28);
    target.flash.setStrokeStyle(10, color, 0.86);
    this.tweens.add({
      targets: target.flash,
      alpha: 1,
      scaleX: 1.14,
      scaleY: 1.14,
      duration: 140,
      yoyo: true,
    });
  }

  spawnRewardCallouts(x, y, { scoreGain, goldGain, streak }) {
    this.spawnFloatingText(x + 8, y - 44, `+${scoreGain} score`, '#fff8d8', 24);
    this.time.delayedCall(70, () => {
      this.spawnFloatingText(x - 12, y - 6, `+${goldGain} coins`, '#ffe07a', 22);
    });

    if (streak > 1) {
      this.time.delayedCall(140, () => {
        this.spawnFloatingText(x + 20, y - 82, `Streak x${streak}`, '#ffcf7b', 21);
      });
    }
  }

  spawnPenaltyCallouts(x, y, { scoreLoss = 0, heartsLoss = 0, label = 'Whoops!' }) {
    const primaryText = heartsLoss > 0
      ? `-${heartsLoss} heart${heartsLoss > 1 ? 's' : ''}`
      : scoreLoss > 0
        ? `-${scoreLoss} score`
        : label;
    const primaryColor = heartsLoss > 0 ? '#ffd6d6' : scoreLoss > 0 ? '#ffe3c2' : '#ffffff';

    this.spawnFloatingText(x, y - 48, primaryText, primaryColor, 24);
    this.time.delayedCall(80, () => {
      this.spawnFloatingText(x + 10, y - 8, label, '#ffffff', 21);
    });
  }

  spawnImpactBurst(x, y, small = false) {
    const shock = this.add.circle(x, y, small ? 28 : 40, 0xffd67f, 0.28).setDepth(DEPTHS.FX);
    shock.setStrokeStyle(6, 0xffffff, 0.8);
    this.tweens.add({
      targets: shock,
      scaleX: small ? 1.6 : 2,
      scaleY: small ? 1.6 : 2,
      alpha: 0,
      duration: 260,
      ease: 'Cubic.Out',
      onComplete: () => shock.destroy(),
    });

    this.spawnSmokeBurst(x, y - 8, small ? 5 : 8);
    this.spawnSparkleBurst(x, y - 6, small ? 6 : 10);
  }

  spawnFloatingText(x, y, text, color, size = 28) {
    const label = this.add.text(x, y, text, {
      fontFamily: 'Fredoka',
      fontSize: `${size}px`,
      fontStyle: '700',
      color,
      stroke: '#1b5f8c',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(DEPTHS.FX);

    this.tweens.add({
      targets: label,
      y: y - 44,
      alpha: 0,
      scale: 1.12,
      duration: 700,
      ease: 'Sine.Out',
      onComplete: () => label.destroy(),
    });
  }

  spawnSmokeBurst(x, y, count) {
    for (let index = 0; index < count; index += 1) {
      const puff = this.add.image(x, y, 'smoke').setDepth(DEPTHS.FX).setScale(0.55 + Math.random() * 0.28);
      this.tweens.add({
        targets: puff,
        x: x + Phaser.Math.Between(-26, 26),
        y: y - Phaser.Math.Between(16, 46),
        alpha: 0,
        scale: puff.scale * 1.6,
        duration: 420 + Math.random() * 160,
        onComplete: () => puff.destroy(),
      });
    }
  }

  spawnSplash(x, y) {
    this.audio.playSplash?.();
    for (let index = 0; index < 5; index += 1) {
      const splash = this.add.image(x + Phaser.Math.Between(-16, 16), y, 'splash').setDepth(DEPTHS.FX).setScale(0.66 + index * 0.08);
      this.tweens.add({
        targets: splash,
        y: y - 26 - index * 4,
        alpha: 0,
        scale: splash.scale * 1.18,
        duration: 380,
        onComplete: () => splash.destroy(),
      });
    }
  }

  spawnCoinBurst(x, y, count) {
    for (let index = 0; index < count; index += 1) {
      const coin = this.add.image(x, y, 'coin').setDepth(DEPTHS.FX).setScale(0.64);
      this.tweens.add({
        targets: coin,
        x: x + Phaser.Math.Between(-70, 70),
        y: y + Phaser.Math.Between(-90, -12),
        alpha: 0,
        angle: Phaser.Math.Between(-90, 90),
        duration: 600 + Math.random() * 180,
        ease: 'Cubic.Out',
        onComplete: () => coin.destroy(),
      });
    }
  }

  spawnSparkleBurst(x, y, count) {
    for (let index = 0; index < count; index += 1) {
      const spark = this.add.image(x, y, 'spark').setDepth(DEPTHS.FX).setScale(0.4 + Math.random() * 0.22);
      this.tweens.add({
        targets: spark,
        x: x + Phaser.Math.Between(-48, 48),
        y: y + Phaser.Math.Between(-48, 30),
        alpha: 0,
        scale: spark.scale * 1.3,
        angle: Phaser.Math.Between(-120, 120),
        duration: 520 + Math.random() * 160,
        onComplete: () => spark.destroy(),
      });
    }
  }

  spawnConfetti(x, y, count) {
    for (let index = 0; index < count; index += 1) {
      const spark = this.add.image(x, y, 'spark').setDepth(DEPTHS.FX).setScale(0.32 + Math.random() * 0.18);
      spark.setTint(Phaser.Display.Color.RandomRGB().color);
      this.tweens.add({
        targets: spark,
        x: x + Phaser.Math.Between(-120, 120),
        y: y + Phaser.Math.Between(50, 170),
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: 820 + Math.random() * 220,
        ease: 'Cubic.Out',
        onComplete: () => spark.destroy(),
      });
    }
  }

  clearWave() {
    this.prompt?.destroy(true);
    this.prompt = null;
    this.waveIntro?.destroy();
    this.waveIntro = null;
    this.hintTimer?.remove(false);
    this.supportTimer?.remove(false);
    this.hintTimer = null;
    this.supportTimer = null;
    this.setHoveredTarget(null);
    this.activeTargets.forEach((target) => target.container.destroy(true));
    this.activeTargets = [];
    this.currentTargetSlots = [];
  }

  finishRun(success) {
    if (this.finished) {
      return;
    }

    this.finished = true;
    this.clearWave();

    const accuracy = this.state.correctAnswers / Math.max(1, this.state.wavesResolved);

    if (this.mode === 'story') {
      if (success) {
        const rewardSummary = this.save.completeLevel(this.level, {
          heartsLeft: this.state.hearts,
          mistakes: this.state.mistakes,
          score: this.state.score,
          goldBonus: Math.floor(this.state.score / 180),
          accuracy,
          perfectWaves: this.state.perfectWaves,
        });

        this.scene.start(SCENES.RESULTS, {
          mode: this.mode,
          levelId: this.levelId,
          levelTitle: this.level.title,
          success,
          score: this.state.score,
          heartsLeft: this.state.hearts,
          goldAwarded: rewardSummary.goldAwarded,
          gemsAwarded: rewardSummary.gemsAwarded,
          stars: rewardSummary.stars,
          newUnlocks: rewardSummary.newUnlocks,
          nextLevelId: this.levelId + 1,
        });
        return;
      }

      this.scene.start(SCENES.RESULTS, {
        mode: this.mode,
        levelId: this.levelId,
        levelTitle: this.level.title,
        success,
        score: this.state.score,
        heartsLeft: this.state.hearts,
        goldAwarded: Math.floor(this.state.score / 260),
        gemsAwarded: 0,
        stars: 0,
        newUnlocks: [],
        nextLevelId: this.levelId,
      });
      return;
    }

    const goldAwarded = Math.max(8, Math.floor(this.state.score * QUICK_PLAY_CONFIG.rewardRate / 10));
    const gemsAwarded = Math.floor(this.state.wave / 10);
    this.save.recordQuickPlay({
      score: this.state.score,
      wave: this.state.wave,
      goldAwarded,
      gemsAwarded,
    });

    this.scene.start(SCENES.RESULTS, {
      mode: this.mode,
      levelId: this.levelId,
      levelTitle: this.level.title,
      success: false,
      score: this.state.score,
      heartsLeft: this.state.hearts,
      goldAwarded,
      gemsAwarded,
      stars: 0,
      newUnlocks: [],
      waveReached: this.state.wave,
      nextLevelId: this.levelId,
    });
  }

  update(time, delta) {
    if (this.finished) {
      return;
    }

    if (this.hoveredTarget?.sunk) {
      this.setHoveredTarget(null);
    }

    this.activeTargets.forEach((target) => {
      if (target.sunk) {
        return;
      }

      target.container.x -= target.speed * (delta / 1000);
      target.container.y = target.baseY + Math.sin(time * target.bobRate + target.phase) * target.bobAmp;
      target.container.rotation = Math.sin(time * (target.bobRate + 0.0004) + target.phase) * 0.03;
      target.shadow.scaleY = 1 + Math.sin(time * (target.bobRate + 0.0002) + target.phase) * 0.04;
      target.wake.scaleX = target.baseWakeScale + Math.sin(time * (target.bobRate + 0.0003) + target.phase) * 0.04;

      if (!this.resolvingWave && target.container.x < this.scale.width * 0.24) {
        this.resolvingWave = true;
        this.state.hearts -= 1;
        this.state.streak = 0;
        this.state.mistakes += 1;
        this.recordWaveOutcome(false);
        this.updateHud();
        this.audio.playPenalty?.();
        this.spawnSplash(target.container.x, target.container.y + 34);
        this.spawnPenaltyCallouts(target.container.x, target.container.y - 54, { heartsLoss: 1, label: 'Too close!' });

        if (this.state.hearts <= 0) {
          this.time.delayedCall(480, () => this.finishRun(false));
        } else {
          this.time.delayedCall(620, () => this.startNextWave());
        }
      }
    });
  }
}

function templatesForTier(tier) {
  if (tier === 1) {
    return [
      'choose_total_from_visual_groups',
      'choose_larger_or_smaller_ship',
      'hit_marker_matching_grouped_objects',
    ];
  }

  if (tier === 2) {
    return [
      'choose_total_from_visual_groups',
      'choose_larger_or_smaller_ship',
      'find_remaining_after_storm',
      'split_treasure_evenly',
      'hit_marker_matching_grouped_objects',
    ];
  }

  if (tier === 3) {
    return [
      'choose_total_from_visual_groups',
      'choose_larger_or_smaller_ship',
      'find_remaining_after_storm',
      'split_treasure_evenly',
      'count_equal_barrels_or_crates',
      'hit_marker_matching_grouped_objects',
    ];
  }

  return [
    'choose_total_from_visual_groups',
    'choose_larger_or_smaller_ship',
    'find_remaining_after_storm',
    'split_treasure_evenly',
    'count_equal_barrels_or_crates',
    'hit_marker_matching_grouped_objects',
  ];
}








