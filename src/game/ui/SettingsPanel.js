import Phaser from 'phaser';
import { BigButton } from './Button.js';

export class SettingsPanel extends Phaser.GameObjects.Container {
  constructor(scene, onClose) {
    super(scene, scene.scale.width / 2, scene.scale.height / 2);
    this.scene = scene;
    this.onClose = onClose;

    this.scrim = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x0f2742, 0.45).setOrigin(0.5);
    const panel = scene.add.graphics();
    panel.fillStyle(0xfff7df, 0.98);
    panel.lineStyle(8, 0xffc96a, 1);
    panel.fillRoundedRect(-220, -180, 440, 360, 32);
    panel.strokeRoundedRect(-220, -180, 440, 360, 32);

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

    this.add([this.scrim, panel, this.title, this.soundButton, this.debugButton, this.closeButton]);
    scene.add.existing(this);
  }

  relayout() {
    this.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
    this.scrim.setSize(this.scene.scale.width, this.scene.scale.height);
  }

  close() {
    this.destroy();
    this.onClose?.();
  }
}
