import Phaser from 'phaser';
import { SCENES } from '../constants.js';
import { createGeneratedTextures } from '../effects/TextureFactory.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  create() {
    this.cameras.main.setBackgroundColor('#8de2ff');
    createGeneratedTextures(this);

    const title = this.add.text(this.scale.width / 2, this.scale.height / 2 - 40, 'Pirate Cannon Cove', {
      fontFamily: 'Baloo 2',
      fontSize: '64px',
      fontStyle: '800',
      color: '#ffffff',
      stroke: '#1d6ea8',
      strokeThickness: 12,
    }).setOrigin(0.5);

    const loadingTrack = this.add.graphics();
    const loadingFill = this.add.graphics();
    const width = 340;
    const height = 28;

    loadingTrack.fillStyle(0xffffff, 0.22);
    loadingTrack.fillRoundedRect(this.scale.width / 2 - width / 2, this.scale.height / 2 + 38, width, height, 14);

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 480,
      onUpdate: (tween) => {
        loadingFill.clear();
        loadingFill.fillStyle(0xffd75e, 1);
        loadingFill.fillRoundedRect(
          this.scale.width / 2 - width / 2,
          this.scale.height / 2 + 38,
          width * tween.getValue(),
          height,
          14,
        );
      },
      onComplete: () => {
        title.destroy();
        loadingTrack.destroy();
        loadingFill.destroy();
        this.scene.start(SCENES.MENU);
      },
    });
  }
}
