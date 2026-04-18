import Phaser from 'phaser';
import { DEPTHS, HEARTS, QUICK_PLAY_HEARTS, SCENES } from '../constants.js';
import { QUICK_PLAY_CONFIG, getLevelById } from '../content/levels.js';
import { getCatalogItem } from '../content/unlocks.js';
import { createBackdrop } from '../effects/BackdropFactory.js';
import { getSafeBounds, getViewportMetrics } from '../helpers/layout.js';
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
    this.promptLayoutKey = '';
    this.targetLayoutKey = '';
    this.phonePortraitLocked = false;

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
    this.buildRotatePromptOverlay();
    this.applyCosmetics();
  }

  buildRotatePromptOverlay() {
    this.rotateOverlay = this.add.container(0, 0).setDepth(DEPTHS.MODAL + 4).setVisible(false);
    this.rotateOverlayDim = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0a334c, 0.46).setOrigin(0);
    this.rotateOverlayCard = this.add.graphics();
    this.rotateOverlayPhone = this.add.graphics();
    this.rotateOverlayArrow = this.add.graphics();
    this.rotateOverlaySparkA = this.add.image(0, 0, 'spark').setScale(0.54).setAlpha(0.72);
    this.rotateOverlaySparkB = this.add.image(0, 0, 'spark').setScale(0.38).setAlpha(0.52);
    this.rotateOverlayTitle = this.add.text(0, 0, 'Rotate to Play', {
      fontFamily: 'Fredoka',
      fontSize: '36px',
      fontStyle: '700',
      color: '#fff9de',
      stroke: '#1b5f8c',
      strokeThickness: 10,
      align: 'center',
    }).setOrigin(0.5);
    this.rotateOverlayBody = this.add.text(0, 0, 'Pirate battles fit best in landscape on iPhone.', {
      fontFamily: 'Fredoka',
      fontSize: '20px',
      fontStyle: '600',
      color: '#eaf8ff',
      stroke: '#1b5f8c',
      strokeThickness: 6,
      align: 'center',
      wordWrap: { width: 280 },
    }).setOrigin(0.5);
    this.rotateOverlayHint = this.add.text(0, 0, 'Turn your phone sideways for roomy targets and a clear question card.', {
      fontFamily: 'Fredoka',
      fontSize: '16px',
      color: '#5e7f94',
      stroke: '#ffffff',
      strokeThickness: 6,
      align: 'center',
      wordWrap: { width: 280 },
    }).setOrigin(0.5);

    this.rotateOverlay.add([
      this.rotateOverlayDim,
      this.rotateOverlayCard,
      this.rotateOverlayPhone,
      this.rotateOverlayArrow,
      this.rotateOverlaySparkA,
      this.rotateOverlaySparkB,
      this.rotateOverlayTitle,
      this.rotateOverlayBody,
      this.rotateOverlayHint,
    ]);

    this.tweens.add({
      targets: [this.rotateOverlaySparkA, this.rotateOverlaySparkB],
      alpha: { from: 0.28, to: 0.88 },
      scale: { from: 0.26, to: 0.66 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });
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

  getResponsiveLayout() {
    const metrics = getViewportMetrics(this);
    const safe = getSafeBounds(this, metrics.scenePadding);

    let mode = 'desktop';
    if (metrics.isPhonePortrait) {
      mode = 'phone-portrait';
    } else if (metrics.isPhoneLandscape) {
      mode = 'phone-landscape';
    } else if (metrics.isTabletPortrait) {
      mode = 'tablet-portrait';
    } else if (metrics.isTabletLandscape) {
      mode = 'tablet-landscape';
    }

    const prompt = mode === 'phone-portrait'
      ? {
          x: this.scale.width * 0.5,
          y: safe.top + 208,
          width: Math.min(safe.width - 10, 336),
          height: 168,
        }
      : mode === 'phone-landscape'
        ? {
            x: this.scale.width * 0.53,
            y: safe.top + 92,
            width: Math.min(safe.width - 220, 430),
            height: 96,
          }
        : mode === 'tablet-portrait'
          ? {
              x: this.scale.width * 0.5,
              y: safe.top + 224,
              width: Math.min(safe.width - 24, 620),
              height: 204,
            }
          : {
              x: this.scale.width * 0.5,
              y: Phaser.Math.Clamp(this.scale.height * 0.235, 154, 198),
              width: 700,
              height: 236,
            };

    const promptLayout = mode === 'phone-portrait'
      ? {
          width: prompt.width,
          height: prompt.height,
          radius: 28,
          edgePad: 16,
          titleAreaHeight: 62,
          visualWidth: prompt.width - 24,
          visualHeight: 68,
          titleY: -36,
          supportY: -8,
          visualY: 42,
          titleFontSize: 22,
          supportFontSize: 14,
          visualMaxWidth: prompt.width - 74,
          visualMaxHeight: 48,
          showSparkles: false,
        }
      : mode === 'phone-landscape'
        ? {
            width: prompt.width,
            height: prompt.height,
            radius: 22,
            edgePad: 10,
            titleAreaHeight: 38,
            visualWidth: prompt.width - 20,
            visualHeight: 28,
            titleY: -15,
            supportY: 1,
            visualY: 20,
            titleFontSize: 18,
            supportFontSize: 12,
            visualMaxWidth: prompt.width - 88,
            visualMaxHeight: 24,
            showSparkles: false,
          }
        : mode === 'tablet-portrait'
          ? {
              width: prompt.width,
              height: prompt.height,
              radius: 34,
              edgePad: 24,
              titleAreaHeight: 74,
              visualWidth: prompt.width - 28,
              visualHeight: 84,
              titleY: -52,
              supportY: -18,
              visualY: 54,
              titleFontSize: 36,
              supportFontSize: 18,
              visualMaxWidth: prompt.width - 88,
              visualMaxHeight: 62,
            }
          : {
              width: prompt.width,
              height: prompt.height,
            };

    const gameplayBand = mode === 'phone-landscape'
      ? {
          top: Math.max(safe.top + 160, prompt.y + prompt.height / 2 + 16),
          bottom: safe.bottom - 10,
          left: safe.left + 112,
          right: safe.right - 10,
        }
      : mode === 'tablet-portrait'
        ? {
            top: Math.max(safe.top + 360, prompt.y + prompt.height / 2 + 48),
            bottom: safe.bottom - 26,
            left: safe.left + 110,
            right: safe.right - 28,
          }
        : mode === 'desktop' || mode === 'tablet-landscape'
          ? {
              top: Math.max(safe.top + 236, prompt.y + prompt.height / 2 + 44),
              bottom: safe.bottom - 26,
              left: safe.left + 140,
              right: safe.right - 24,
            }
          : {
              top: Math.max(safe.top + 244, prompt.y + prompt.height / 2 + 30),
              bottom: safe.bottom - 16,
              left: safe.left + 64,
              right: safe.right - 16,
            };

    return {
      metrics,
      safe,
      mode,
      prompt,
      promptLayout,
      gameplayBand,
    };
  }

  refreshPromptCard(preserveAlpha = true) {
    if (!this.currentChallenge) {
      return;
    }

    const layout = this.layoutProfile ?? this.getResponsiveLayout();
    const layoutKey = `${layout.mode}-${Math.round(layout.prompt.width)}-${Math.round(layout.prompt.height)}`;
    const alpha = preserveAlpha ? (this.prompt?.alpha ?? 1) : 1;

    this.prompt?.destroy(true);
    this.prompt = createPromptCard(this, layout.prompt.x, layout.prompt.y, this.currentChallenge, layout.promptLayout).setDepth(DEPTHS.UI);
    this.prompt.setAlpha(alpha);
    this.promptLayoutKey = layoutKey;
  }

  setGameplayUiVisible(visible) {
    [
      this.island,
      this.palm,
      this.coveGlow,
      this.cannonGlow,
      this.cannonShadow,
      this.cannon,
      this.levelText,
      this.scoreText,
      this.waveText,
      this.comboText,
      this.hudLeftPanel,
      this.hudCenterPanel,
      this.hudRightPanel,
      this.mapButton,
      this.settingsButton,
      this.restartButton,
      this.prompt,
      this.debugPanel,
    ].forEach((item) => item?.setVisible(visible));

    this.hearts.forEach((heart) => heart.setVisible(visible && heart.alpha > 0.01));
    this.activeTargets.forEach((target) => target.container.setVisible(visible));
  }

  clearHudPanels() {
    this.hudLeftPanel.clear().setVisible(false);
    this.hudCenterPanel.clear().setVisible(false);
    this.hudRightPanel.clear().setVisible(false);
  }

  layoutRotateOverlay(layout) {
    const { width, height } = this.scale;
    const { safe } = layout;
    const cardWidth = Math.min(safe.width - 20, 330);
    const cardHeight = 316;
    const cardX = width * 0.5;
    const cardY = height * 0.5;
    const cardLeft = cardX - cardWidth / 2;
    const cardTop = cardY - cardHeight / 2;

    this.rotateOverlayDim.setDisplaySize(width, height);
    this.rotateOverlayCard.clear();
    this.rotateOverlayCard.fillStyle(0x0e4e71, 0.32);
    this.rotateOverlayCard.fillRoundedRect(cardLeft, cardTop + 10, cardWidth, cardHeight, 34);
    this.rotateOverlayCard.fillStyle(0xfff8e7, 0.98);
    this.rotateOverlayCard.lineStyle(8, 0xffc86d, 1);
    this.rotateOverlayCard.fillRoundedRect(cardLeft, cardTop, cardWidth, cardHeight, 34);
    this.rotateOverlayCard.strokeRoundedRect(cardLeft, cardTop, cardWidth, cardHeight, 34);
    this.rotateOverlayCard.fillStyle(0xffffff, 0.66);
    this.rotateOverlayCard.fillRoundedRect(cardLeft + 18, cardTop + 20, cardWidth - 36, 64, 24);
    this.rotateOverlayCard.fillStyle(0xffd56f, 0.16);
    this.rotateOverlayCard.fillRoundedRect(cardLeft + 18, cardTop + 20, cardWidth - 36, 64, 24);

    const phoneX = cardX;
    const phoneY = cardTop + 156;
    this.rotateOverlayPhone.clear();
    this.rotateOverlayPhone.fillStyle(0x1a5678, 1);
    this.rotateOverlayPhone.fillRoundedRect(phoneX - 26, phoneY - 56, 52, 90, 16);
    this.rotateOverlayPhone.fillStyle(0xb9efff, 1);
    this.rotateOverlayPhone.fillRoundedRect(phoneX - 18, phoneY - 44, 36, 60, 12);
    this.rotateOverlayPhone.fillStyle(0xffd56f, 1);
    this.rotateOverlayPhone.fillCircle(phoneX, phoneY + 22, 4);
    this.rotateOverlayPhone.fillStyle(0x1a5678, 0.14);
    this.rotateOverlayPhone.fillRoundedRect(phoneX + 48, phoneY - 28, 90, 52, 14);
    this.rotateOverlayPhone.fillStyle(0xb9efff, 1);
    this.rotateOverlayPhone.fillRoundedRect(phoneX + 56, phoneY - 20, 74, 36, 10);

    this.rotateOverlayArrow.clear();
    this.rotateOverlayArrow.lineStyle(8, 0xffaa47, 1);
    this.rotateOverlayArrow.beginPath();
    this.rotateOverlayArrow.arc(phoneX + 24, phoneY - 2, 46, Phaser.Math.DegToRad(-118), Phaser.Math.DegToRad(48), false);
    this.rotateOverlayArrow.strokePath();
    this.rotateOverlayArrow.fillStyle(0xffaa47, 1);
    this.rotateOverlayArrow.fillPoints([
      new Phaser.Geom.Point(phoneX + 76, phoneY - 10),
      new Phaser.Geom.Point(phoneX + 98, phoneY - 4),
      new Phaser.Geom.Point(phoneX + 82, phoneY + 14),
    ], true);

    this.rotateOverlayTitle.setPosition(cardX, cardTop + 54);
    this.rotateOverlayBody.setPosition(cardX, cardTop + 232).setWordWrapWidth(cardWidth - 48);
    this.rotateOverlayHint.setPosition(cardX, cardTop + 280).setWordWrapWidth(cardWidth - 56);
    this.rotateOverlaySparkA.setPosition(cardX - cardWidth / 2 + 34, cardTop + 42);
    this.rotateOverlaySparkB.setPosition(cardX + cardWidth / 2 - 36, cardTop + 268);
  }

  updatePhonePortraitLock(isLocked, layout) {
    this.phonePortraitLocked = isLocked;

    if (isLocked) {
      this.clearHudPanels();
      this.setGameplayUiVisible(false);
      this.layoutRotateOverlay(layout);
      this.rotateOverlay.setVisible(true);
      this.setHoveredTarget(null);
      return;
    }

    this.rotateOverlay.setVisible(false);
    this.setGameplayUiVisible(true);
    this.hudLeftPanel.setVisible(true);
    this.hudCenterPanel.setVisible(true);
    this.hudRightPanel.setVisible(true);
  }

  getTargetLayoutKey(total) {
    const layout = this.layoutProfile ?? this.getResponsiveLayout();
    return `${layout.mode}-${Math.round(layout.gameplayBand.left)}-${Math.round(layout.gameplayBand.right)}-${Math.round(layout.gameplayBand.top)}-${Math.round(layout.gameplayBand.bottom)}-${total}`;
  }

  relayoutActiveTargets(force = false) {
    if (!this.currentChallenge || !this.activeTargets.length || this.resolvingWave) {
      return;
    }

    const nextKey = this.getTargetLayoutKey(this.activeTargets.length);
    if (!force && nextKey === this.targetLayoutKey) {
      return;
    }

    const options = this.activeTargets.map((target) => target.option);
    this.setHoveredTarget(null);
    this.activeTargets.forEach((target) => target.container.destroy(true));
    this.activeTargets = [];
    this.currentTargetSlots = this.buildTargetSlots(options.length);
    options.forEach((option, index) => this.spawnTarget(option, index, options.length));
    this.targetLayoutKey = nextKey;
  }

  layout() {
    const { width, height } = this.scale;
    const layout = this.getResponsiveLayout();
    const { metrics, safe } = layout;
    this.layoutProfile = layout;

    const portraitLock = layout.mode === 'phone-portrait';
    this.updatePhonePortraitLock(portraitLock, layout);
    if (portraitLock) {
      this.debugPanel.toggle(false);
      this.settingsPanel?.relayout();
      return;
    }

    this.debugPanel.toggle(this.save.state.settings.debugPanel && !metrics.isPhone);
    this.drawHudPanels(layout);

    if (layout.mode === 'phone-portrait') {
      this.island.setPosition(width * 0.12, height * 0.82).setScale(0.62);
      this.palm.setPosition(width * 0.06, height * 0.6).setScale(0.48);
      this.coveGlow.setPosition(width * 0.18, height * 0.76);
      this.cannonGlow.setPosition(width * 0.18, height * 0.76);
      this.cannonShadow.setPosition(width * 0.18, height * 0.87).setScale(0.78, 0.78);
      this.cannon.setPosition(width * 0.18, height * 0.79).setScale(0.78);

      this.levelText.setStyle({ fontSize: '18px', strokeThickness: 5 });
      this.scoreText.setStyle({ fontSize: '20px', strokeThickness: 5 });
      this.waveText.setStyle({ fontSize: '17px', strokeThickness: 5 });
      this.comboText.setStyle({ fontSize: '15px', strokeThickness: 4 });

      this.levelText.setPosition(safe.left + 14, safe.top + 10);
      this.scoreText.setPosition(width * 0.5 - this.scoreText.width / 2, safe.top + 56);
      this.waveText.setPosition(width * 0.5 - this.waveText.width / 2, safe.top + 78);
      this.comboText.setPosition(width * 0.5 - this.comboText.width / 2, layout.prompt.y + layout.prompt.height / 2 + 8);

      const buttonY = safe.top + 26;
      this.mapButton.setLabel(this.mode === 'quick' ? 'Menu' : 'Map');
      this.settingsButton.setLabel('Gear');
      this.restartButton.setLabel('Again');
      this.mapButton.setButtonLayout({ width: 64, height: 42, fontSize: 16 });
      this.settingsButton.setButtonLayout({ width: 72, height: 42, fontSize: 16 });
      this.restartButton.setButtonLayout({ width: 76, height: 42, fontSize: 16 });
      this.restartButton.setPosition(width - metrics.scenePadding.right - this.restartButton.widthValue / 2, buttonY);
      this.settingsButton.setPosition(this.restartButton.x - this.restartButton.widthValue / 2 - 8 - this.settingsButton.widthValue / 2, buttonY);
      this.mapButton.setPosition(this.settingsButton.x - this.settingsButton.widthValue / 2 - 8 - this.mapButton.widthValue / 2, buttonY);

      this.hearts.forEach((heart, index) => {
        heart.setPosition(safe.left + 30 + index * 24, safe.top + 52).setScale(0.74);
      });
    } else if (layout.mode === 'phone-landscape') {
      const gameplayTop = layout.gameplayBand.top;
      const gameplayBottom = layout.gameplayBand.bottom;
      this.island.setPosition(width * 0.1, gameplayBottom - 22).setScale(0.5);
      this.palm.setPosition(safe.left + 26, gameplayTop + 36).setScale(0.36);
      this.coveGlow.setPosition(width * 0.17, gameplayBottom - 38).setScale(0.92, 0.92);
      this.cannonGlow.setPosition(width * 0.17, gameplayBottom - 30);
      this.cannonShadow.setPosition(width * 0.17, gameplayBottom + 30).setScale(0.62, 0.62);
      this.cannon.setPosition(width * 0.17, gameplayBottom - 26).setScale(0.58);

      this.levelText.setStyle({ fontSize: '15px', strokeThickness: 5 });
      this.scoreText.setStyle({ fontSize: '15px', strokeThickness: 5 });
      this.waveText.setStyle({ fontSize: '13px', strokeThickness: 4 });
      this.comboText.setStyle({ fontSize: '13px', strokeThickness: 4 });

      this.levelText.setPosition(safe.left + 12, safe.top + 7);
      this.scoreText.setPosition(safe.left + 12, safe.top + 51);
      this.waveText.setPosition(safe.left + 12, safe.top + 69);
      this.comboText.setPosition(width * 0.5 - this.comboText.width / 2, layout.prompt.y + layout.prompt.height / 2 + 10);

      const buttonY = safe.top + 20;
      this.mapButton.setLabel(this.mode === 'quick' ? 'Menu' : 'Map');
      this.settingsButton.setLabel('Gear');
      this.restartButton.setLabel('Again');
      this.mapButton.setButtonLayout({ width: 60, height: 38, fontSize: 14 });
      this.settingsButton.setButtonLayout({ width: 68, height: 38, fontSize: 14 });
      this.restartButton.setButtonLayout({ width: 74, height: 38, fontSize: 14 });
      this.restartButton.setPosition(width - metrics.scenePadding.right - this.restartButton.widthValue / 2, buttonY);
      this.settingsButton.setPosition(this.restartButton.x - this.restartButton.widthValue / 2 - 8 - this.settingsButton.widthValue / 2, buttonY);
      this.mapButton.setPosition(this.settingsButton.x - this.settingsButton.widthValue / 2 - 8 - this.mapButton.widthValue / 2, buttonY);

      this.hearts.forEach((heart, index) => {
        heart.setPosition(safe.left + 20 + index * 22, safe.top + 30).setScale(0.68);
      });
    } else {
      const tabletPortrait = layout.mode === 'tablet-portrait';
      this.island.setPosition(width * (tabletPortrait ? 0.11 : 0.12), height * 0.81).setScale(tabletPortrait ? 1.08 : Math.min(1.32, width / 950));
      this.palm.setPosition(width * 0.05, height * (tabletPortrait ? 0.57 : 0.61)).setScale(tabletPortrait ? 0.88 : Math.min(1.02, width / 1220));
      this.coveGlow.setPosition(width * 0.19, height * 0.73);
      this.cannonGlow.setPosition(width * (tabletPortrait ? 0.14 : 0.15), height * (tabletPortrait ? 0.75 : 0.72));
      this.cannonShadow.setPosition(width * (tabletPortrait ? 0.14 : 0.15), height * 0.82).setScale(1, 1);
      this.cannon.setPosition(width * (tabletPortrait ? 0.14 : 0.16), height * (tabletPortrait ? 0.79 : 0.74)).setScale(tabletPortrait ? 0.92 : 1);

      this.levelText.setStyle({ fontSize: tabletPortrait ? '22px' : '26px', strokeThickness: tabletPortrait ? 6 : 8 });
      this.scoreText.setStyle({ fontSize: tabletPortrait ? '24px' : '28px', strokeThickness: tabletPortrait ? 7 : 8 });
      this.waveText.setStyle({ fontSize: tabletPortrait ? '22px' : '24px', strokeThickness: tabletPortrait ? 6 : 8 });
      this.comboText.setStyle({ fontSize: tabletPortrait ? '18px' : '20px', strokeThickness: tabletPortrait ? 5 : 6 });

      this.levelText.setPosition(safe.left + 14, safe.top + 10);
      this.scoreText.setPosition(width * 0.5 - this.scoreText.width / 2, safe.top + (tabletPortrait ? 58 : 10));
      this.waveText.setPosition(width * 0.5 - this.waveText.width / 2, safe.top + (tabletPortrait ? 86 : 40));
      this.comboText.setPosition(width * 0.5 - this.comboText.width / 2, safe.top + (tabletPortrait ? 114 : 68));

      this.mapButton.setLabel(this.mode === 'quick' ? 'Menu' : 'Map');
      this.settingsButton.setLabel('Settings');
      this.restartButton.setLabel('Restart');
      this.mapButton.setButtonLayout({ width: tabletPortrait ? 116 : 140, height: tabletPortrait ? 50 : 58, fontSize: tabletPortrait ? 20 : 22 });
      this.settingsButton.setButtonLayout({ width: tabletPortrait ? 126 : 150, height: tabletPortrait ? 50 : 58, fontSize: tabletPortrait ? 20 : 22 });
      this.restartButton.setButtonLayout({ width: tabletPortrait ? 126 : 150, height: tabletPortrait ? 50 : 58, fontSize: tabletPortrait ? 20 : 22 });
      this.restartButton.setPosition(width - metrics.scenePadding.right - this.restartButton.widthValue / 2, safe.top + 34);
      this.settingsButton.setPosition(this.restartButton.x - this.restartButton.widthValue / 2 - 12 - this.settingsButton.widthValue / 2, safe.top + 34);
      this.mapButton.setPosition(this.settingsButton.x - this.settingsButton.widthValue / 2 - 12 - this.mapButton.widthValue / 2, safe.top + 34);

      this.hearts.forEach((heart, index) => {
        heart.setPosition(safe.left + 38 + index * (tabletPortrait ? 34 : 40), safe.top + 78).setScale(tabletPortrait ? 0.92 : 1);
      });
    }

    if (this.prompt && this.currentChallenge) {
      const layoutKey = `${layout.mode}-${Math.round(layout.prompt.width)}-${Math.round(layout.prompt.height)}`;
      if (this.promptLayoutKey !== layoutKey) {
        this.refreshPromptCard();
      } else {
        this.prompt.setPosition(layout.prompt.x, layout.prompt.y);
      }
    }

    this.relayoutActiveTargets();

    this.debugPanel.setPosition(safe.left + 116, safe.top + (metrics.isPhoneLandscape ? 132 : 170));
    this.settingsPanel?.relayout();
  }

  drawHudPanels(layout) {
    const { width, height } = this.scale;
    const { mode, safe } = layout;
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

    if (mode === 'phone-portrait') {
      drawPanel(this.hudLeftPanel, safe.left, safe.top, 124, 70, 0x175879);
      drawPanel(this.hudCenterPanel, width * 0.5 - 92, safe.top + 50, 184, 52, 0x175879);
      drawPanel(this.hudRightPanel, safe.right - 220, safe.top, 220, 54, 0x175879);
      return;
    }

    if (mode === 'phone-landscape') {
      drawPanel(this.hudLeftPanel, safe.left, safe.top, 142, 46, 0x175879);
      drawPanel(this.hudCenterPanel, safe.left + 2, safe.top + 48, 136, 40, 0x175879);
      drawPanel(this.hudRightPanel, safe.right - 220, safe.top, 220, 44, 0x175879);
      return;
    }

    if (mode === 'tablet-portrait') {
      drawPanel(this.hudLeftPanel, safe.left, safe.top, 190, 92, 0x175879);
      drawPanel(this.hudCenterPanel, width * 0.5 - 132, safe.top + 54, 264, 64, 0x175879);
      drawPanel(this.hudRightPanel, safe.right - 360, safe.top, 360, 60, 0x175879);
      return;
    }

    drawPanel(this.hudLeftPanel, safe.left, safe.top, 212, 108, 0x175879);
    drawPanel(this.hudCenterPanel, width * 0.5 - 150, safe.top - 2, 300, 86, 0x175879);
    drawPanel(this.hudRightPanel, safe.right - 398, safe.top, 398, 68, 0x175879);
  }

  updateHud() {
    const metrics = this.layoutProfile?.metrics ?? getViewportMetrics(this);
    const mode = this.layoutProfile?.mode;
    const safe = this.layoutProfile?.safe;
    const title = this.mode === 'quick'
      ? metrics.isPhone ? 'Quick' : 'Quick Play'
      : metrics.isPhone || metrics.isTabletPortrait
        ? `Level ${this.levelId}`
        : this.level.title;
    this.levelText.setText(title);
    this.scoreText.setText(`Score ${this.state.score}`);
    this.waveText.setText(
      this.mode === 'quick'
        ? `Wave ${Math.max(1, this.state.wave)}`
        : `Wave ${Math.max(1, Math.min(this.state.wave, this.level.waves))} / ${this.level.waves}`,
    );
    this.comboText.setText(this.state.streak >= 2 ? `Combo x${this.state.streak}` : '');

    if (mode === 'phone-landscape' && safe) {
      this.scoreText.setPosition(safe.left + 12, safe.top + 51);
      this.waveText.setPosition(safe.left + 12, safe.top + 69);
      this.comboText.setX(this.scale.width * 0.5 - this.comboText.width / 2);
    } else {
      this.scoreText.setX(this.scale.width * 0.5 - this.scoreText.width / 2);
      this.waveText.setX(this.scale.width * 0.5 - this.waveText.width / 2);
      this.comboText.setX(this.scale.width * 0.5 - this.comboText.width / 2);
    }

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
    this.targetLayoutKey = this.getTargetLayoutKey(this.currentChallenge.options.length);
    this.waveStartedAt = this.time.now + 160;

    this.refreshPromptCard(false);
    this.layout();
    this.prompt.setAlpha(0).setScale(0.98);
    this.tweens.add({
      targets: this.prompt,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 180,
      ease: 'Back.Out',
    });

    this.currentChallenge.options.forEach((option, index) => this.spawnTarget(option, index, this.currentChallenge.options.length));
    if (this.phonePortraitLocked) {
      this.setGameplayUiVisible(false);
    }
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
    const layout = this.layoutProfile ?? this.getResponsiveLayout();
    const { width, height } = this.scale;

    if (layout.mode === 'phone-portrait') {
      const top = height * 0.55;
      const bottom = height * 0.9;
      const gap = total <= 1 ? 0 : Math.min(124, (bottom - top) / Math.max(1, total - 1));
      const xs = total >= 4 ? [width * 0.72, width * 0.8, width * 0.72, width * 0.8] : total === 3 ? [width * 0.74, width * 0.79, width * 0.74] : total === 2 ? [width * 0.74, width * 0.8] : [width * 0.78];
      const sizeScale = total >= 4 ? 0.48 : total === 3 ? 0.54 : 0.6;
      return Array.from({ length: total }, (_, index) => ({
        x: xs[index] ?? width * 0.78,
        y: top + index * gap,
        sizeScale,
      }));
    }

    if (layout.mode === 'phone-landscape') {
      const band = layout.gameplayBand;
      const bandWidth = band.right - band.left;
      const topRowY = band.top + 32;
      const midRowY = band.top + Math.min(88, (band.bottom - band.top) * 0.46);
      const bottomRowY = band.bottom - 34;
      const leftColumnX = Phaser.Math.Clamp(band.left + bandWidth * 0.37, band.left + 150, band.right - 250);
      const centerColumnX = Phaser.Math.Clamp(band.left + bandWidth * 0.56, band.left + 215, band.right - 170);
      const rightColumnX = Phaser.Math.Clamp(band.left + bandWidth * 0.8, band.left + 300, band.right - 72);

      if (total === 4) {
        return [
          { x: leftColumnX, y: topRowY, sizeScale: 0.4 },
          { x: rightColumnX, y: topRowY, sizeScale: 0.4 },
          { x: leftColumnX, y: bottomRowY, sizeScale: 0.4 },
          { x: rightColumnX, y: bottomRowY, sizeScale: 0.4 },
        ];
      }

      if (total === 3) {
        return [
          { x: centerColumnX, y: topRowY, sizeScale: 0.42 },
          { x: leftColumnX, y: bottomRowY, sizeScale: 0.42 },
          { x: rightColumnX, y: bottomRowY, sizeScale: 0.42 },
        ];
      }

      if (total === 2) {
        return [
          { x: centerColumnX + 28, y: midRowY - 12, sizeScale: 0.46 },
          { x: rightColumnX, y: bottomRowY, sizeScale: 0.46 },
        ];
      }

      return [{ x: centerColumnX, y: midRowY, sizeScale: 0.5 }];
    }

    if (layout.mode === 'tablet-portrait') {
      const xA = width * 0.71;
      const xB = width * 0.84;
      const top = height * 0.56;
      const mid = height * 0.73;
      const bottom = height * 0.89;
      if (total === 4) {
        return [
          { x: xA, y: top, sizeScale: 0.66 },
          { x: xB, y: top + 36, sizeScale: 0.66 },
          { x: xA, y: mid + 12, sizeScale: 0.66 },
          { x: xB, y: bottom, sizeScale: 0.66 },
        ];
      }

      if (total === 3) {
        return [
          { x: xA, y: top, sizeScale: 0.72 },
          { x: xB, y: mid, sizeScale: 0.72 },
          { x: xA, y: bottom, sizeScale: 0.72 },
        ];
      }

      if (total === 2) {
        return [
          { x: xA, y: top + 34, sizeScale: 0.78 },
          { x: xB, y: bottom - 24, sizeScale: 0.78 },
        ];
      }

      return [{ x: xB, y: mid, sizeScale: 0.82 }];
    }

    const layoutTop = height * 0.48;
    const layoutBottom = height * 0.86;
    const centerY = (layoutTop + layoutBottom) / 2;
    const gap = total <= 1 ? 0 : (layoutBottom - layoutTop) / (total - 1);
    const closeX = width * 0.81;
    const farX = width * 0.9;
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
    if (this.finished || this.settingsPanel || this.resolvingWave || this.phonePortraitLocked) {
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
    if (this.finished || this.settingsPanel || !this.activeTargets.length || this.phonePortraitLocked) {
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
    const cannonScale = this.cannon.scaleX || 1;

    this.spawnSparkleBurst(this.cannon.x + 88 * cannonScale, this.cannon.y - 26 * cannonScale, 5);
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
    this.spawnSmokeBurst(this.cannon.x + 74 * cannonScale, this.cannon.y - 28 * cannonScale, 9);

    const start = new Phaser.Math.Vector2(this.cannon.x + 82 * cannonScale, this.cannon.y - 22 * cannonScale);
    const end = new Phaser.Math.Vector2(target.container.x - (target.option.targetStyle === 'marker' ? 0 : 20), target.container.y - 6);
    const control = new Phaser.Math.Vector2((start.x + end.x) / 2, Math.min(start.y, end.y) - 150 * Math.max(0.72, cannonScale));
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
    const safe = this.layoutProfile?.safe ?? getSafeBounds(this);
    const clampedX = Phaser.Math.Clamp(x, safe.left + 56, safe.right - 56);
    const clampedY = Phaser.Math.Clamp(y, safe.top + 60, safe.bottom - 48);
    const label = this.add.text(x, y, text, {
      fontFamily: 'Fredoka',
      fontSize: `${size}px`,
      fontStyle: '700',
      color,
      stroke: '#1b5f8c',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(DEPTHS.FX);
    label.setPosition(clampedX, clampedY);

    this.tweens.add({
      targets: label,
      y: clampedY - 44,
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
    this.targetLayoutKey = '';
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
    if (this.finished || this.phonePortraitLocked) {
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
