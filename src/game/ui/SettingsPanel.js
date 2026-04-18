import Phaser from 'phaser';
import { BigButton } from './Button.js';
import { getSafeBounds, getViewportMetrics } from '../helpers/layout.js';

export class SettingsPanel extends Phaser.GameObjects.Container {
  constructor(scene, onClose) {
    super(scene, scene.scale.width / 2, scene.scale.height / 2);
    this.scene = scene;
    this.onClose = onClose;

    this.scrim = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x0f2742, 0.45).setOrigin(0.5);
    this.panel = scene.add.graphics();

    this.title = scene.add.text(0, -122, 'Settings', {
      fontFamily: 'Baloo 2',
      fontSize: '54px',
      fontStyle: '800',
      color: '#2c5f83',
      stroke: '#ffffff',
      strokeThickness: 10,
    }).setOrigin(0.5);

    this.soundButton = new BigButton(scene, {
      x: 0,
      y: -10,
      width: 250,
      height: 78,
      label: scene.game.services.save.state.settings.muted ? 'Sound Off' : 'Sound On',
      onPress: () => {
        const muted = scene.game.services.save.toggleMute();
        scene.game.services.audio.applyMuteState?.();
        this.soundButton.setLabel(muted ? 'Sound Off' : 'Sound On');
      },
    });

    this.debugButton = new BigButton(scene, {
      x: 0,
      y: 88,
      width: 250,
      height: 78,
      label: scene.game.services.save.state.settings.debugPanel ? 'Debug On' : 'Debug Off',
      fill: 0x7fe1be,
      stroke: 0x2eaf88,
      onPress: () => {
        const debugPanel = scene.game.services.save.toggleDebugPanel();
        this.debugButton.setLabel(debugPanel ? 'Debug On' : 'Debug Off');
      },
    });

    this.closeButton = new BigButton(scene, {
      x: 0,
      y: 186,
      width: 210,
      height: 68,
      label: 'Back',
      fill: 0xffffff,
      stroke: 0xb7d9f4,
      textColor: '#2a587e',
      onPress: () => this.close(),
    });

    this.add([this.scrim, this.panel, this.title, this.soundButton, this.debugButton, this.closeButton]);
    scene.add.existing(this);
    this.relayout();
  }

  relayout() {
    const metrics = getViewportMetrics(this.scene);
    const safe = getSafeBounds(this.scene, metrics.scenePadding);
    const panelWidth = Math.min(metrics.isPhone ? safe.width - 10 : 440, safe.width - (metrics.isPhoneLandscape ? 36 : 24));
    const panelHeight = Math.min(metrics.isPhoneLandscape ? safe.height - 18 : 360, safe.height - 18);
    const titleFontSize = metrics.isPhoneLandscape ? 34 : metrics.isPhonePortrait ? 42 : 54;
    const buttonWidth = Math.min(panelWidth - 48, metrics.isPhone ? 250 : 280);
    const buttonHeight = metrics.isPhoneLandscape ? 54 : metrics.isPhone ? 62 : 78;
    const buttonFont = metrics.isPhoneLandscape ? 20 : metrics.isPhone ? 24 : 30;
    const startY = metrics.isPhoneLandscape ? -10 : 6;
    const gap = metrics.isPhoneLandscape ? 74 : 98;

    this.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
    this.scrim.setSize(this.scene.scale.width, this.scene.scale.height);

    this.panel.clear();
    this.panel.fillStyle(0xfff7df, 0.98);
    this.panel.lineStyle(8, 0xffc96a, 1);
    this.panel.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 32);
    this.panel.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 32);

    this.title.setStyle({
      fontSize: `${titleFontSize}px`,
      strokeThickness: metrics.isPhone ? 8 : 10,
    });
    this.title.setY(-panelHeight / 2 + (metrics.isPhoneLandscape ? 42 : 54));

    this.soundButton.setButtonLayout({ width: buttonWidth, height: buttonHeight, fontSize: buttonFont });
    this.debugButton.setButtonLayout({ width: buttonWidth, height: buttonHeight, fontSize: buttonFont });
    this.closeButton.setButtonLayout({
      width: Math.min(buttonWidth, metrics.isPhoneLandscape ? 210 : 230),
      height: metrics.isPhoneLandscape ? 52 : 60,
      fontSize: metrics.isPhoneLandscape ? 22 : 26,
    });

    this.soundButton.setPosition(0, startY);
    this.debugButton.setPosition(0, startY + gap);
    this.closeButton.setPosition(0, panelHeight / 2 - (metrics.isPhoneLandscape ? 38 : 46));
  }

  close() {
    this.destroy();
    this.onClose?.();
  }
}
