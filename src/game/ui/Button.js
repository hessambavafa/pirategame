import Phaser from 'phaser';

export class BigButton extends Phaser.GameObjects.Container {
  constructor(scene, config) {
    super(scene, config.x, config.y);

    this.scene = scene;
    this.widthValue = config.width ?? 280;
    this.heightValue = config.height ?? 84;
    this.onPress = config.onPress ?? (() => {});
    this.fill = config.fill ?? 0xffd45f;
    this.stroke = config.stroke ?? 0xff8d38;
    this.textColor = config.textColor ?? '#1f3958';
    this.enabled = true;

    this.shadow = scene.add.graphics();
    this.background = scene.add.graphics();
    this.gloss = scene.add.graphics();
    this.label = scene.add.text(0, -2, config.label ?? 'Play', {
      fontFamily: 'Fredoka',
      fontSize: `${config.fontSize ?? 34}px`,
      fontStyle: '700',
      color: this.textColor,
      stroke: '#ffffff',
      strokeThickness: 8,
      align: 'center',
    }).setOrigin(0.5);

    this.add([this.shadow, this.background, this.gloss, this.label]);
    this.setSize(this.widthValue, this.heightValue);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-this.widthValue / 2, -this.heightValue / 2, this.widthValue, this.heightValue),
      Phaser.Geom.Rectangle.Contains,
    );

    this.on('pointerover', () => {
      if (!this.enabled) {
        return;
      }

      this.scene.game.services.audio.playHover?.();
      this.scene.tweens.add({ targets: this, scaleX: 1.03, scaleY: 1.03, duration: 120, ease: 'Back.Out' });
    });

    this.on('pointerout', () => {
      if (!this.enabled) {
        return;
      }

      this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 120, ease: 'Back.Out' });
    });

    this.on('pointerdown', () => {
      if (!this.enabled) {
        return;
      }

      this.scene.tweens.add({ targets: this, scaleX: 0.97, scaleY: 0.97, duration: 80, ease: 'Quad.Out' });
    });

    this.on('pointerup', () => {
      if (!this.enabled) {
        return;
      }

      this.scene.game.services.audio.playButton?.();
      this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.Out' });
      this.onPress();
    });

    this.refresh();
    scene.add.existing(this);
  }

  refresh() {
    this.shadow.clear();
    this.background.clear();
    this.gloss.clear();

    this.shadow.fillStyle(0x21476d, 0.18);
    this.shadow.fillRoundedRect(-this.widthValue / 2, -this.heightValue / 2 + 10, this.widthValue, this.heightValue, 28);

    this.background.fillStyle(this.fill, this.enabled ? 1 : 0.45);
    this.background.lineStyle(6, this.stroke, this.enabled ? 1 : 0.45);
    this.background.fillRoundedRect(-this.widthValue / 2, -this.heightValue / 2, this.widthValue, this.heightValue, 28);
    this.background.strokeRoundedRect(-this.widthValue / 2, -this.heightValue / 2, this.widthValue, this.heightValue, 28);

    this.gloss.fillStyle(0xffffff, this.enabled ? 0.22 : 0.12);
    this.gloss.fillRoundedRect(-this.widthValue / 2 + 12, -this.heightValue / 2 + 10, this.widthValue - 24, this.heightValue * 0.34, 18);
  }

  setLabel(text) {
    this.label.setText(text);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.refresh();
    this.disableInteractive();

    if (enabled) {
      this.setInteractive(
        new Phaser.Geom.Rectangle(-this.widthValue / 2, -this.heightValue / 2, this.widthValue, this.heightValue),
        Phaser.Geom.Rectangle.Contains,
      );
    }
  }
}
