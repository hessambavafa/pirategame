import Phaser from 'phaser';
import { SCENES } from '../constants.js';
import { createBackdrop } from '../effects/BackdropFactory.js';
import { SettingsPanel } from '../ui/SettingsPanel.js';
import { BigButton } from '../ui/Button.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SCENES.MENU);
  }

  create() {
    this.backdrop = createBackdrop(this, { withPalms: true, livelyWater: true });
    this.game.services.audio.playMenuLoop(this);

    this.headerPlate = this.add.graphics();
    this.subtitlePlate = this.add.graphics();
    this.statsPlate = this.add.graphics();
    this.heroShip = this.add.image(0, 0, 'ship').setScale(1.18).setAngle(-6);
    this.heroCannon = this.add.image(0, 0, 'cannon-barrel').setScale(1.04).setAngle(-12);
    this.heroSpark = this.add.image(0, 0, 'spark').setScale(0.76).setAlpha(0.82);
    this.headerSparkLeft = this.add.image(0, 0, 'spark').setScale(0.38).setAlpha(0.58);
    this.headerSparkRight = this.add.image(0, 0, 'spark').setScale(0.48).setAlpha(0.74);

    this.kicker = this.add.text(0, 0, 'Treasure Arcade', {
      fontFamily: 'Fredoka',
      fontSize: '20px',
      fontStyle: '700',
      color: '#2f7aa8',
      stroke: '#ffffff',
      strokeThickness: 8,
      align: 'center',
    }).setOrigin(0.5);

    this.titleTop = this.add.text(0, 0, 'Pirate Cannon', {
      fontFamily: 'Fredoka',
      fontSize: '66px',
      fontStyle: '700',
      color: '#fff7d5',
      stroke: '#155f93',
      strokeThickness: 12,
      align: 'center',
    }).setOrigin(0.5);

    this.titleBottom = this.add.text(0, 0, 'Cove', {
      fontFamily: 'Fredoka',
      fontSize: '96px',
      fontStyle: '700',
      color: '#fff0a6',
      stroke: '#155f93',
      strokeThickness: 14,
      align: 'center',
    }).setOrigin(0.5);

    this.subtitle = this.add.text(0, 0, 'Toy-box pirate battles with treasure thinking hidden inside', {
      fontFamily: 'Fredoka',
      fontSize: '24px',
      fontStyle: '600',
      color: '#ffffff',
      stroke: '#1b5b84',
      strokeThickness: 8,
      align: 'center',
      wordWrap: { width: 760 },
    }).setOrigin(0.5);

    this.storyButton = new BigButton(this, {
      x: 0,
      y: 0,
      width: 320,
      height: 92,
      label: 'Story Cove',
      onPress: async () => {
        await this.game.services.audio.unlock();
        this.scene.start(SCENES.MAP);
      },
    });

    this.quickButton = new BigButton(this, {
      x: 0,
      y: 0,
      width: 320,
      height: 92,
      label: 'Quick Play',
      fill: 0x7fe1be,
      stroke: 0x2eaf88,
      onPress: async () => {
        await this.game.services.audio.unlock();
        this.scene.start(SCENES.LEVEL, { mode: 'quick', levelId: 1 });
      },
    });

    this.settingsButton = new BigButton(this, {
      x: 0,
      y: 0,
      width: 188,
      height: 62,
      label: 'Settings',
      fontSize: 24,
      fill: 0xffffff,
      stroke: 0xb7d9f4,
      textColor: '#2a587e',
      onPress: () => this.openSettings(),
    });

    this.statusText = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#1c5c88',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5);

    this.bestText = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka',
      fontSize: '22px',
      color: '#fff8d8',
      stroke: '#1c5c88',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5);

    this.tweens.add({ targets: this.heroShip, y: '+=10', angle: { from: -8, to: -3 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: this.heroCannon, y: '+=8', angle: { from: -14, to: -8 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: this.heroSpark, alpha: { from: 0.25, to: 0.84 }, scale: { from: 0.44, to: 0.88 }, duration: 1100, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: [this.headerSparkLeft, this.headerSparkRight], alpha: { from: 0.26, to: 0.84 }, scale: { from: 0.28, to: 0.56 }, duration: 1300, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.titleBottom, scale: { from: 0.98, to: 1.02 }, duration: 1800, yoyo: true, repeat: -1 });

    this.scale.on('resize', this.layout, this);
    this.layout();
    this.refreshStats();
  }

  refreshStats() {
    const save = this.game.services.save.state;
    this.statusText.setText(`Treasure ${save.wallet.gold} gold   |   ${save.wallet.gems} gems`);
    this.bestText.setText(`Best quick score ${save.quickPlay.bestScore}   |   Story cleared ${Object.keys(save.story.completedLevels).length}/18`);
  }

  openSettings() {
    this.settingsPanel?.destroy();
    this.settingsPanel = new SettingsPanel(this, () => {
      this.settingsPanel = null;
      this.refreshStats();
    }).setDepth(140);
    this.settingsPanel.relayout();
  }

  layout() {
    const { width, height } = this.scale;
    const compact = width < 520;

    this.kicker.setStyle({
      fontSize: compact ? '16px' : '20px',
      strokeThickness: compact ? 6 : 8,
    });
    this.titleTop.setStyle({
      fontSize: compact ? '44px' : '66px',
      strokeThickness: compact ? 10 : 12,
    });
    this.titleBottom.setStyle({
      fontSize: compact ? '64px' : '96px',
      strokeThickness: compact ? 11 : 14,
    });
    this.subtitle.setStyle({
      fontSize: compact ? '15px' : '24px',
      strokeThickness: compact ? 6 : 8,
      wordWrap: { width: compact ? 320 : 760 },
    });
    this.statusText.setStyle({
      fontSize: compact ? '17px' : '22px',
      strokeThickness: compact ? 5 : 6,
    });
    this.bestText.setStyle({
      fontSize: compact ? '17px' : '22px',
      strokeThickness: compact ? 5 : 6,
    });

    if (compact) {
      const wallet = this.game.services.save.state.wallet;
      const cleared = Object.keys(this.game.services.save.state.story.completedLevels).length;
      this.statusText.setText(`Treasure ${wallet.gold} gold\n${wallet.gems} gems`);
      this.bestText.setText(`Best quick ${this.game.services.save.state.quickPlay.bestScore}\nStory ${cleared}/18`);
      this.storyButton.setScale(0.82);
      this.quickButton.setScale(0.82);
      this.settingsButton.setScale(0.9);
    } else {
      this.storyButton.setScale(1);
      this.quickButton.setScale(1);
      this.settingsButton.setScale(1);
      this.refreshStats();
    }

    this.headerPlate.clear();
    this.headerPlate.fillStyle(0x135274, 0.34);
    this.headerPlate.fillRoundedRect(width / 2 - (compact ? 170 : 330), height * (compact ? 0.075 : 0.1), compact ? 340 : 660, compact ? 152 : 208, compact ? 34 : 46);
    this.headerPlate.fillStyle(0xffffff, 0.12);
    this.headerPlate.fillRoundedRect(width / 2 - (compact ? 144 : 284), height * (compact ? 0.088 : 0.12), compact ? 288 : 568, compact ? 26 : 40, compact ? 14 : 20);
    this.headerPlate.fillStyle(0xffd678, 0.9);
    this.headerPlate.fillRoundedRect(width / 2 - (compact ? 146 : 290), height * (compact ? 0.081 : 0.108), compact ? 74 : 116, 10, 5);
    this.headerPlate.fillRoundedRect(width / 2 + (compact ? 72 : 174), height * (compact ? 0.081 : 0.108), compact ? 74 : 116, 10, 5);

    this.subtitlePlate.clear();
    this.subtitlePlate.fillStyle(0x135274, 0.24);
    this.subtitlePlate.fillRoundedRect(width / 2 - (compact ? 170 : 350), height * (compact ? 0.3 : 0.33), compact ? 340 : 700, compact ? 62 : 70, compact ? 22 : 28);
    this.subtitlePlate.fillStyle(0xffffff, 0.08);
    this.subtitlePlate.fillRoundedRect(width / 2 - (compact ? 156 : 332), height * (compact ? 0.314 : 0.345), compact ? 312 : 664, compact ? 18 : 24, 12);

    this.statsPlate.clear();
    this.statsPlate.fillStyle(0x135274, 0.36);
    this.statsPlate.fillRoundedRect(width / 2 - (compact ? 164 : 300), height * (compact ? 0.865 : 0.84), compact ? 328 : 600, compact ? 116 : 98, compact ? 26 : 30);

    this.heroShip.setPosition(width * (compact ? 0.18 : 0.17), height * (compact ? 0.355 : 0.34)).setScale(compact ? 0.9 : 1.18);
    this.heroCannon.setPosition(width * (compact ? 0.82 : 0.83), height * (compact ? 0.37 : 0.37)).setScale(compact ? 0.78 : 1.04);
    this.heroSpark.setPosition(width * (compact ? 0.74 : 0.77), height * (compact ? 0.24 : 0.25)).setScale(compact ? 0.56 : 0.76);
    this.headerSparkLeft.setPosition(width / 2 - (compact ? 128 : 260), height * (compact ? 0.145 : 0.18));
    this.headerSparkRight.setPosition(width / 2 + (compact ? 126 : 254), height * (compact ? 0.2 : 0.24));

    this.kicker.setPosition(width / 2, height * (compact ? 0.13 : 0.153));
    this.titleTop.setPosition(width / 2, height * (compact ? 0.18 : 0.205));
    this.titleBottom.setPosition(width / 2, height * (compact ? 0.245 : 0.28));
    this.subtitle.setPosition(width / 2, height * (compact ? 0.33 : 0.38));
    this.storyButton.setPosition(width / 2, height * (compact ? 0.53 : 0.54));
    this.quickButton.setPosition(width / 2, height * (compact ? 0.665 : 0.685));
    this.settingsButton.setPosition(width / 2, height * (compact ? 0.79 : 0.81));
    this.statusText.setPosition(width / 2, height * (compact ? 0.9 : 0.885));
    this.bestText.setPosition(width / 2, height * (compact ? 0.952 : 0.93));
    this.settingsPanel?.relayout();
  }
}
