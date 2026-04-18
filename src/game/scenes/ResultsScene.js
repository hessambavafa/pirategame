import Phaser from 'phaser';
import { SCENES } from '../constants.js';
import { STORY_LEVELS } from '../content/levels.js';
import { formatReward } from '../helpers/formatters.js';
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
    this.rewardPanel = this.add.graphics();
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
    this.rewardText.setText(`Treasure haul\n${rewardLine}`);

    if (this.result.newUnlocks?.length) {
      this.unlockText.setText(`New unlocks\n${this.result.newUnlocks.map((unlock) => unlock.label).join('  |  ')}`);
    } else if (this.result.mode === 'quick') {
      this.unlockText.setText('Fast hits and long streaks bring home bigger treasure.');
    } else {
      this.unlockText.setText('Clean shots, combos, and full hearts earn richer rewards.');
    }
  }

  layout() {
    const { width, height } = this.scale;
    const panelWidth = Math.min(580, width * 0.86);
    const panelHeight = Math.min(560, height * 0.72);
    const centerX = width / 2;
    const centerY = height / 2 - 8;

    this.panel.clear();
    this.panel.fillStyle(0xfff7df, 0.96);
    this.panel.lineStyle(8, 0xffc96a, 1);
    this.panel.fillRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 34);
    this.panel.strokeRoundedRect(centerX - panelWidth / 2, centerY - panelHeight / 2, panelWidth, panelHeight, 34);

    this.titleBand.clear();
    this.titleBand.fillStyle(0xffffff, 0.72);
    this.titleBand.fillRoundedRect(centerX - 220, centerY - panelHeight / 2 + 26, 440, 92, 30);
    this.titleBand.fillStyle(this.result.success ? 0x86efc3 : 0xffd0cc, 0.18);
    this.titleBand.fillRoundedRect(centerX - 220, centerY - panelHeight / 2 + 26, 440, 92, 30);

    this.rewardPanel.clear();
    this.rewardPanel.fillStyle(0xffffff, 0.68);
    this.rewardPanel.lineStyle(4, 0xffffff, 0.75);
    this.rewardPanel.fillRoundedRect(centerX - 170, centerY - 16, 340, 96, 22);
    this.rewardPanel.strokeRoundedRect(centerX - 170, centerY - 16, 340, 96, 22);

    this.titleSpark.setPosition(centerX + 188, centerY - panelHeight / 2 + 74);
    this.title.setPosition(centerX, centerY - panelHeight / 2 + 74);
    this.stats.setPosition(centerX, centerY - 94);
    this.rewardText.setPosition(centerX, centerY + 32);
    this.unlockText.setPosition(centerX, centerY + 130);
    this.primaryButton.setPosition(centerX, centerY + panelHeight / 2 - 112);
    this.secondaryButton.setPosition(centerX, centerY + panelHeight / 2 - 28);
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
