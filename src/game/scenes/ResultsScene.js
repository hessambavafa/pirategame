import Phaser from 'phaser';
import { SCENES } from '../constants.js';
import { STORY_LEVELS } from '../content/levels.js';
import { formatReward } from '../helpers/formatters.js';
import { getSafeBounds, getViewportMetrics } from '../helpers/layout.js';
import { createBackdrop } from '../effects/BackdropFactory.js';
import { BigButton } from '../ui/Button.js';

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super(SCENES.RESULTS);
  }

  init(data) {
    this.result = data;
  }

  create() {
    this.backdrop = createBackdrop(this, { withPalms: true, livelyWater: true });
    this.game.services.audio.playMenuLoop(this);

    if (this.result.success) {
      this.game.services.audio.playCelebration?.();
      this.spawnConfetti(this.scale.width / 2, this.scale.height * 0.18, 30);
    }

    this.panel = this.add.graphics();
    this.titleBand = this.add.graphics();
    this.statsPanel = this.add.graphics();
    this.rewardPanel = this.add.graphics();
    this.infoPanel = this.add.graphics();
    this.titleSpark = this.add.image(0, 0, 'spark').setScale(0.9);
    this.title = this.add.text(0, 0, this.getTitle(), {
      fontFamily: 'Fredoka',
      fontSize: '56px',
      fontStyle: '700',
      color: this.result.success ? '#2f8d67' : '#e36d63',
      stroke: '#ffffff',
      strokeThickness: 10,
      align: 'center',
    }).setOrigin(0.5);

    this.stats = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka',
      fontSize: '26px',
      color: '#26496a',
      align: 'center',
      lineSpacing: 10,
    }).setOrigin(0.5);
    this.statPrimary = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka',
      fontSize: '24px',
      fontStyle: '700',
      color: '#26496a',
      align: 'center',
    }).setOrigin(0.5);
    this.statSecondary = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka',
      fontSize: '18px',
      fontStyle: '600',
      color: '#355f80',
      align: 'center',
    }).setOrigin(0.5);
    this.statTertiary = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka',
      fontSize: '18px',
      fontStyle: '600',
      color: '#355f80',
      align: 'center',
    }).setOrigin(0.5);

    this.unlockText = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka',
      fontSize: '20px',
      color: '#355f80',
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: 420 },
    }).setOrigin(0.5);

    this.rewardText = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka',
      fontSize: '24px',
      fontStyle: '700',
      color: '#2a587e',
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: 320 },
    }).setOrigin(0.5);

    this.primaryButton = new BigButton(this, {
      x: 0,
      y: 0,
      width: 240,
      height: 78,
      label: this.result.success && this.result.mode === 'story' && this.result.nextLevelId <= STORY_LEVELS.length ? 'Next Level' : 'Play Again',
      onPress: () => {
        if (this.result.success && this.result.mode === 'story' && this.result.nextLevelId <= STORY_LEVELS.length) {
          this.scene.start(SCENES.LEVEL, { mode: 'story', levelId: this.result.nextLevelId });
          return;
        }

        this.scene.start(SCENES.LEVEL, { mode: this.result.mode, levelId: this.result.levelId });
      },
    });

    this.secondaryButton = new BigButton(this, {
      x: 0,
      y: 0,
      width: 220,
      height: 68,
      label: this.result.mode === 'quick' ? 'Menu' : 'World Map',
      fontSize: 28,
      fill: 0xffffff,
      stroke: 0xb7d9f4,
      textColor: '#2a587e',
      onPress: () => this.scene.start(this.result.mode === 'quick' ? SCENES.MENU : SCENES.MAP),
    });

    this.tweens.add({ targets: this.titleSpark, alpha: { from: 0.25, to: 0.9 }, scale: { from: 0.45, to: 0.94 }, duration: 1100, yoyo: true, repeat: -1 });

    this.scale.on('resize', this.layout, this);
    this.layout();
    this.refresh();
  }

  getTitle() {
    if (this.result.mode === 'quick') {
      return this.result.waveReached >= 8 ? 'Treasure Rush!' : 'Quick Play';
    }

    return this.result.success ? 'Cove Safe!' : 'Try Again!';
  }

  refresh() {
    const rewardLine = formatReward(this.result.goldAwarded ?? 0, this.result.gemsAwarded ?? 0);
    const coreLines = [
      `Score ${this.result.score}`,
      this.result.mode === 'quick' ? `Wave reached ${this.result.waveReached}` : `Hearts left ${Math.max(0, this.result.heartsLeft)}`,
      this.result.mode === 'story' ? `Stars ${this.result.stars}` : `Best quick ${this.game.services.save.state.quickPlay.bestScore}`,
    ];

    this.stats.setText(coreLines.join('\n'));
    this.statPrimary.setText(coreLines[0]);
    this.statSecondary.setText(coreLines[1]);
    this.statTertiary.setText(coreLines[2]);
    this.rewardText.setText(`Treasure haul\n${rewardLine}`);

    if (this.result.newUnlocks?.length) {
      const unlockLabels = this.result.newUnlocks.map((unlock) => unlock.label);
      const compactUnlocks = unlockLabels.length > 2
        ? `${unlockLabels.slice(0, 2).join('  |  ')}  |  +${unlockLabels.length - 2} more`
        : unlockLabels.join('  |  ');
      this.unlockText.setText(`New unlocks\n${compactUnlocks}`);
    } else if (this.result.mode === 'quick') {
      this.unlockText.setText('Fast streaks bring bigger treasure.');
    } else {
      this.unlockText.setText('Clean shots and hearts earn richer rewards.');
    }
  }

  layout() {
    const { width, height } = this.scale;
    const metrics = getViewportMetrics(this);
    const safe = getSafeBounds(this, metrics.scenePadding);
    const centerX = width / 2;
    const centerY = height / 2 - (metrics.isPhoneLandscape ? 2 : 8);
    const panelWidth = Math.min(metrics.isPhone ? safe.width - 6 : 580, safe.width - 10);
    const panelHeight = Math.min(metrics.isPhoneLandscape ? safe.height - 12 : metrics.isPhonePortrait ? safe.height - 18 : 560, safe.height - 14);
    const titleBandWidth = Math.min(panelWidth - 24, metrics.isPhoneLandscape ? 292 : 440);
    const rewardWidth = Math.min(panelWidth - 30, metrics.isPhoneLandscape ? panelWidth - 48 : 340);
    const titleFontSize = metrics.isPhoneLandscape ? '38px' : metrics.isPhonePortrait ? '50px' : '56px';
    const statFontSize = metrics.isPhoneLandscape ? '18px' : metrics.isPhonePortrait ? '22px' : '26px';
    const unlockFontSize = metrics.isPhoneLandscape ? '15px' : metrics.isPhonePortrait ? '18px' : '20px';
    const rewardFontSize = metrics.isPhoneLandscape ? '18px' : metrics.isPhonePortrait ? '22px' : '24px';

    this.title.setStyle({
      fontSize: titleFontSize,
      strokeThickness: metrics.isPhone ? 8 : 10,
    });
    this.stats.setStyle({
      fontSize: statFontSize,
      lineSpacing: metrics.isPhoneLandscape ? 6 : 10,
    });
    this.unlockText.setStyle({
      fontSize: unlockFontSize,
      lineSpacing: metrics.isPhoneLandscape ? 4 : 8,
      wordWrap: { width: rewardWidth },
    });
    this.rewardText.setStyle({
      fontSize: rewardFontSize,
      lineSpacing: metrics.isPhoneLandscape ? 6 : 8,
      wordWrap: { width: rewardWidth - 18 },
    });
    this.statPrimary.setStyle({
      fontSize: metrics.isPhoneLandscape ? '22px' : '24px',
      strokeThickness: metrics.isPhoneLandscape ? 6 : 8,
    });
    this.statSecondary.setStyle({
      fontSize: metrics.isPhoneLandscape ? '17px' : '18px',
      strokeThickness: metrics.isPhoneLandscape ? 5 : 6,
    });
    this.statTertiary.setStyle({
      fontSize: metrics.isPhoneLandscape ? '17px' : '18px',
      strokeThickness: metrics.isPhoneLandscape ? 5 : 6,
    });

    this.primaryButton.setButtonLayout({
      width: metrics.isPhoneLandscape ? 178 : metrics.isPhonePortrait ? panelWidth - 76 : 240,
      height: metrics.isPhoneLandscape ? 56 : metrics.isPhonePortrait ? 72 : 78,
      fontSize: metrics.isPhoneLandscape ? 24 : metrics.isPhonePortrait ? 30 : 34,
    });
    this.secondaryButton.setButtonLayout({
      width: metrics.isPhoneLandscape ? 160 : metrics.isPhonePortrait ? panelWidth - 96 : 220,
      height: metrics.isPhoneLandscape ? 50 : metrics.isPhonePortrait ? 60 : 68,
      fontSize: metrics.isPhoneLandscape ? 22 : metrics.isPhonePortrait ? 26 : 28,
    });

    this.panel.clear();
    this.panel.fillStyle(0xfff7df, 0.96);
    this.panel.lineStyle(8, 0xffc96a, 1);
    this.panel.fillRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 34);
    this.panel.strokeRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 34);

    this.titleBand.clear();
    this.titleBand.fillStyle(0xffffff, 0.72);
    this.titleBand.fillRoundedRect(centerX - titleBandWidth / 2, centerY - panelHeight / 2 + 22, titleBandWidth, metrics.isPhoneLandscape ? 68 : 92, 30);
    this.titleBand.fillStyle(this.result.success ? 0x86efc3 : 0xffd0cc, 0.18);
    this.titleBand.fillRoundedRect(centerX - titleBandWidth / 2, centerY - panelHeight / 2 + 22, titleBandWidth, metrics.isPhoneLandscape ? 68 : 92, 30);

    this.rewardPanel.clear();
    this.rewardPanel.fillStyle(0xffffff, 0.68);
    this.rewardPanel.lineStyle(4, 0xffffff, 0.75);
    this.rewardPanel.fillRoundedRect(centerX - rewardWidth / 2, centerY - (metrics.isPhoneLandscape ? 2 : 16), rewardWidth, metrics.isPhoneLandscape ? 80 : 96, 22);
    this.rewardPanel.strokeRoundedRect(centerX - rewardWidth / 2, centerY - (metrics.isPhoneLandscape ? 2 : 16), rewardWidth, metrics.isPhoneLandscape ? 80 : 96, 22);

    if (metrics.isPhoneLandscape) {
      const panelLeft = centerX - panelWidth / 2;
      const panelTop = centerY - panelHeight / 2;
      const titleTop = panelTop + 18;
      const titleHeight = 56;
      const statsTop = panelTop + 88;
      const statsHeight = 96;
      const rewardTop = panelTop + 190;
      const rewardHeight = 68;
      const infoTop = panelTop + 266;
      const infoHeight = 34;
      const buttonY = panelTop + panelHeight - 28;

      this.stats.setVisible(false);
      this.statPrimary.setVisible(true);
      this.statSecondary.setVisible(true);
      this.statTertiary.setVisible(true);

      this.statsPanel.clear();
      this.statsPanel.fillStyle(0xffffff, 0.7);
      this.statsPanel.lineStyle(4, 0xffffff, 0.75);
      this.statsPanel.fillRoundedRect(panelLeft + 24, statsTop, panelWidth - 48, statsHeight, 24);
      this.statsPanel.strokeRoundedRect(panelLeft + 24, statsTop, panelWidth - 48, statsHeight, 24);

      this.rewardPanel.clear();
      this.rewardPanel.fillStyle(0xffffff, 0.72);
      this.rewardPanel.lineStyle(4, 0xffffff, 0.78);
      this.rewardPanel.fillRoundedRect(panelLeft + 24, rewardTop, panelWidth - 48, rewardHeight, 22);
      this.rewardPanel.strokeRoundedRect(panelLeft + 24, rewardTop, panelWidth - 48, rewardHeight, 22);

      this.infoPanel.clear();
      this.infoPanel.fillStyle(0xffffff, 0.64);
      this.infoPanel.lineStyle(4, 0xd7edf7, 0.9);
      this.infoPanel.fillRoundedRect(panelLeft + 32, infoTop, panelWidth - 64, infoHeight, 20);
      this.infoPanel.strokeRoundedRect(panelLeft + 32, infoTop, panelWidth - 64, infoHeight, 20);

      this.titleSpark.setPosition(centerX + titleBandWidth / 2 - 26, titleTop + titleHeight / 2);
      this.title.setPosition(centerX, titleTop + titleHeight / 2 + 1);
      this.statPrimary.setPosition(centerX, statsTop + 20);
      this.statSecondary.setPosition(centerX, statsTop + 52);
      this.statTertiary.setPosition(centerX, statsTop + 80);
      this.rewardText.setPosition(centerX, rewardTop + rewardHeight / 2);
      this.unlockText.setPosition(centerX, infoTop + 16).setWordWrapWidth(panelWidth - 92);
      this.fitTextHeight(this.title, titleHeight - 10, 28);
      this.fitTextHeight(this.rewardText, rewardHeight - 14, 16);
      this.fitTextHeight(this.unlockText, infoHeight - 10, 11);
      this.primaryButton.setPosition(centerX - 96, buttonY);
      this.secondaryButton.setPosition(centerX + 96, buttonY);
      return;
    }

    this.stats.setVisible(true);
    this.statPrimary.setVisible(false);
    this.statSecondary.setVisible(false);
    this.statTertiary.setVisible(false);
    this.statsPanel.clear();
    this.infoPanel.clear();

    this.titleSpark.setPosition(centerX + Math.min(188, titleBandWidth / 2 - 28), centerY - panelHeight / 2 + (metrics.isPhonePortrait ? 66 : 74));
    this.title.setPosition(centerX, centerY - panelHeight / 2 + (metrics.isPhonePortrait ? 70 : 74));
    this.stats.setPosition(centerX, centerY - (metrics.isPhonePortrait ? 88 : 94));
    this.rewardText.setPosition(centerX, centerY + 32);
    this.unlockText.setPosition(centerX, centerY + (metrics.isPhonePortrait ? 122 : 130));
    this.primaryButton.setPosition(centerX, centerY + panelHeight / 2 - (metrics.isPhonePortrait ? 108 : 112));
    this.secondaryButton.setPosition(centerX, centerY + panelHeight / 2 - (metrics.isPhonePortrait ? 30 : 28));
  }

  fitTextHeight(textObject, maxHeight, minFontSize) {
    const baseSize = Number.parseInt(String(textObject.style.fontSize), 10);
    if (!Number.isFinite(baseSize)) {
      return;
    }

    let nextSize = baseSize;
    while (textObject.height > maxHeight && nextSize > minFontSize) {
      nextSize -= 1;
      textObject.setStyle({ fontSize: `${nextSize}px` });
    }
  }

  spawnConfetti(x, y, count) {
    for (let index = 0; index < count; index += 1) {
      const spark = this.add.image(x, y, 'spark').setScale(0.45 + Math.random() * 0.25);
      spark.setTint(Phaser.Display.Color.RandomRGB().color);
      this.tweens.add({
        targets: spark,
        x: x + Phaser.Math.Between(-220, 220),
        y: y + Phaser.Math.Between(40, 220),
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: 900 + Math.random() * 280,
        ease: 'Cubic.Out',
        onComplete: () => spark.destroy(),
      });
    }
  }
}
