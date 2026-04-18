import Phaser from 'phaser';
import { SCENES } from '../constants.js';
import { createBackdrop } from '../effects/BackdropFactory.js';
import { getSafeBounds, getViewportMetrics } from '../helpers/layout.js';
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
    const metrics = getViewportMetrics(this);
    const safe = getSafeBounds(this, metrics.scenePadding);
    const compact = metrics.isPhonePortrait;
    const phoneLandscape = metrics.isPhoneLandscape;
    const tabletPortrait = metrics.isTabletPortrait;

    this.kicker.setStyle({
      fontSize: compact ? '16px' : phoneLandscape ? '14px' : '20px',
      strokeThickness: compact || phoneLandscape ? 6 : 8,
    });
    this.titleTop.setStyle({
      fontSize: compact ? '44px' : phoneLandscape ? '34px' : tabletPortrait ? '58px' : '66px',
      strokeThickness: compact ? 10 : phoneLandscape ? 8 : 12,
    });
    this.titleBottom.setStyle({
      fontSize: compact ? '64px' : phoneLandscape ? '48px' : tabletPortrait ? '82px' : '96px',
      strokeThickness: compact ? 11 : phoneLandscape ? 9 : 14,
    });
    this.subtitle.setStyle({
      fontSize: compact ? '15px' : phoneLandscape ? '14px' : '24px',
      strokeThickness: compact || phoneLandscape ? 5 : 8,
      wordWrap: { width: compact ? safe.width - 24 : phoneLandscape ? width * 0.38 : 760 },
    });
    this.statusText.setStyle({
      fontSize: compact ? '17px' : phoneLandscape ? '14px' : '22px',
      strokeThickness: compact || phoneLandscape ? 5 : 6,
    });
    this.bestText.setStyle({
      fontSize: compact ? '17px' : phoneLandscape ? '14px' : '22px',
      strokeThickness: compact || phoneLandscape ? 5 : 6,
    });

    if (compact || phoneLandscape) {
      const wallet = this.game.services.save.state.wallet;
      const cleared = Object.keys(this.game.services.save.state.story.completedLevels).length;
      this.statusText.setText(phoneLandscape ? `Treasure ${wallet.gold} gold  |  ${wallet.gems} gems` : `Treasure ${wallet.gold} gold\n${wallet.gems} gems`);
      this.bestText.setText(phoneLandscape ? `Best quick ${this.game.services.save.state.quickPlay.bestScore}  |  Story ${cleared}/18` : `Best quick ${this.game.services.save.state.quickPlay.bestScore}\nStory ${cleared}/18`);
    } else {
      this.refreshStats();
    }

    this.storyButton.setButtonLayout({
      width: compact ? safe.width - 42 : phoneLandscape ? 220 : 320,
      height: compact ? 82 : phoneLandscape ? 72 : 92,
      fontSize: compact ? 30 : phoneLandscape ? 26 : 34,
    });
    this.quickButton.setButtonLayout({
      width: compact ? safe.width - 42 : phoneLandscape ? 220 : 320,
      height: compact ? 82 : phoneLandscape ? 72 : 92,
      fontSize: compact ? 30 : phoneLandscape ? 26 : 34,
    });
    this.settingsButton.setButtonLayout({
      width: compact ? Math.min(240, safe.width - 88) : phoneLandscape ? 190 : 188,
      height: compact ? 60 : phoneLandscape ? 54 : 62,
      fontSize: compact ? 22 : phoneLandscape ? 20 : 24,
    });

    this.headerPlate.clear();
    this.subtitlePlate.clear();
    this.statsPlate.clear();

    if (phoneLandscape) {
      const leftWidth = width * 0.48;
      const headerWidth = Math.min(leftWidth - 12, 352);
      const headerHeight = 140;
      const headerX = safe.left + headerWidth / 2 + 10;
      const headerY = safe.top + 18;
      const buttonX = width * 0.76;

      this.headerPlate.fillStyle(0x135274, 0.34);
      this.headerPlate.fillRoundedRect(headerX - headerWidth / 2, headerY, headerWidth, headerHeight, 34);
      this.headerPlate.fillStyle(0xffffff, 0.12);
      this.headerPlate.fillRoundedRect(headerX - headerWidth / 2 + 22, headerY + 18, headerWidth - 44, 24, 12);

      this.subtitlePlate.fillStyle(0x135274, 0.24);
      this.subtitlePlate.fillRoundedRect(headerX - headerWidth / 2, headerY + headerHeight + 8, headerWidth, 58, 22);

      this.statsPlate.fillStyle(0x135274, 0.36);
      this.statsPlate.fillRoundedRect(safe.left, height - metrics.scenePadding.bottom - 58, safe.width, 54, 24);

      this.heroShip.setPosition(safe.left + 74, height - 118).setScale(0.7);
      this.heroCannon.setPosition(headerX + 132, headerY + headerHeight + 30).setScale(0.58);
      this.heroSpark.setPosition(buttonX - 26, safe.top + 34).setScale(0.42);
      this.headerSparkLeft.setPosition(headerX - 126, headerY + 38);
      this.headerSparkRight.setPosition(headerX + 128, headerY + 78);

      this.kicker.setPosition(headerX, headerY + 30);
      this.titleTop.setPosition(headerX, headerY + 62);
      this.titleBottom.setPosition(headerX, headerY + 102);
      this.subtitle.setPosition(headerX, headerY + headerHeight + 36);

      this.storyButton.setPosition(buttonX, safe.top + 72);
      this.quickButton.setPosition(buttonX, safe.top + 154);
      this.settingsButton.setPosition(buttonX, safe.top + 222);
      this.statusText.setPosition(width / 2, height - 46);
      this.bestText.setPosition(width / 2, height - 24);
    } else {
      const headerWidth = compact ? safe.width : Math.min(660, safe.width - 24);
      const headerHeight = compact ? 152 : tabletPortrait ? 196 : 208;
      const headerTop = safe.top + (compact ? 14 : 18);
      const centerX = width / 2;
      const subtitleWidth = compact ? safe.width : Math.min(700, safe.width - 10);
      const statsWidth = compact ? safe.width : Math.min(600, safe.width - 40);
      const statsHeight = compact ? 114 : 98;

      this.headerPlate.fillStyle(0x135274, 0.34);
      this.headerPlate.fillRoundedRect(centerX - headerWidth / 2, headerTop, headerWidth, headerHeight, compact ? 34 : 46);
      this.headerPlate.fillStyle(0xffffff, 0.12);
      this.headerPlate.fillRoundedRect(centerX - headerWidth / 2 + 26, headerTop + 18, headerWidth - 52, compact ? 24 : 40, compact ? 12 : 20);
      this.headerPlate.fillStyle(0xffd678, 0.9);
      this.headerPlate.fillRoundedRect(centerX - headerWidth / 2 + 24, headerTop + 8, compact ? 74 : 116, 10, 5);
      this.headerPlate.fillRoundedRect(centerX + headerWidth / 2 - (compact ? 98 : 140), headerTop + 8, compact ? 74 : 116, 10, 5);

      this.subtitlePlate.fillStyle(0x135274, 0.24);
      this.subtitlePlate.fillRoundedRect(centerX - subtitleWidth / 2, compact ? height * 0.3 : height * (tabletPortrait ? 0.31 : 0.33), subtitleWidth, compact ? 62 : 70, compact ? 22 : 28);
      this.subtitlePlate.fillStyle(0xffffff, 0.08);
      this.subtitlePlate.fillRoundedRect(centerX - subtitleWidth / 2 + 14, compact ? height * 0.314 : height * (tabletPortrait ? 0.326 : 0.345), subtitleWidth - 28, compact ? 18 : 24, 12);

      this.statsPlate.fillStyle(0x135274, 0.36);
      this.statsPlate.fillRoundedRect(centerX - statsWidth / 2, height - statsHeight - metrics.scenePadding.bottom - 10, statsWidth, statsHeight, compact ? 26 : 30);

      this.heroShip.setPosition(width * (compact ? 0.18 : 0.17), height * (compact ? 0.355 : tabletPortrait ? 0.325 : 0.34)).setScale(compact ? 0.88 : tabletPortrait ? 1.06 : 1.18);
      this.heroCannon.setPosition(width * (compact ? 0.82 : 0.83), height * (compact ? 0.37 : 0.37)).setScale(compact ? 0.74 : tabletPortrait ? 0.94 : 1.04);
      this.heroSpark.setPosition(width * (compact ? 0.74 : 0.77), height * (compact ? 0.24 : 0.25)).setScale(compact ? 0.56 : 0.76);
      this.headerSparkLeft.setPosition(width / 2 - (compact ? 128 : 260), height * (compact ? 0.145 : 0.18));
      this.headerSparkRight.setPosition(width / 2 + (compact ? 126 : 254), height * (compact ? 0.2 : 0.24));

      this.kicker.setPosition(width / 2, headerTop + (compact ? 30 : 42));
      this.titleTop.setPosition(width / 2, headerTop + (compact ? 72 : 110));
      this.titleBottom.setPosition(width / 2, headerTop + (compact ? 116 : 164));
      this.subtitle.setPosition(width / 2, compact ? height * 0.33 : tabletPortrait ? height * 0.365 : height * 0.38);
      this.storyButton.setPosition(width / 2, compact ? height * 0.53 : tabletPortrait ? height * 0.515 : height * 0.54);
      this.quickButton.setPosition(width / 2, compact ? height * 0.665 : tabletPortrait ? height * 0.645 : height * 0.685);
      this.settingsButton.setPosition(width / 2, compact ? height * 0.79 : tabletPortrait ? height * 0.765 : height * 0.81);
      this.statusText.setPosition(width / 2, height - (compact ? 60 : 56));
      this.bestText.setPosition(width / 2, height - (compact ? 28 : 22));
    }

    this.settingsPanel?.relayout();
  }
}
