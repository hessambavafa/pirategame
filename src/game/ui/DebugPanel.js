import Phaser from 'phaser';

export class DebugPanel extends Phaser.GameObjects.Container {
  constructor(scene, x, y, onAdjust) {
    super(scene, x, y);
    this.scene = scene;
    this.onAdjust = onAdjust;
    this.visibleState = false;

    this.background = scene.add.graphics();
    this.title = scene.add.text(0, -88, 'Debug Tuning', {
      fontFamily: 'Fredoka',
      fontSize: '20px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0.5);
    this.metrics = scene.add.text(-102, -56, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#dff6ff',
      align: 'left',
      lineSpacing: 4,
    }).setOrigin(0, 0);

    this.speedRow = this.createAdjustRow('Speed', -18, 'speedBias');
    this.numberRow = this.createAdjustRow('Numbers', 24, 'numberBias');
    this.hintRow = this.createAdjustRow('Hints', 66, 'hintBias');

    this.add([this.background, this.title, this.metrics, this.speedRow, this.numberRow, this.hintRow]);
    this.draw();
    this.setVisible(false);
    scene.add.existing(this);
  }

  createAdjustRow(label, y, key) {
    const row = this.scene.add.container(0, y);
    const name = this.scene.add.text(-94, 0, label, {
      fontFamily: 'Fredoka',
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0, 0.5);
    const minus = this.createMiniButton('-', -8, 0, () => this.onAdjust(key, -1));
    const plus = this.createMiniButton('+', 74, 0, () => this.onAdjust(key, 1));
    const value = this.scene.add.text(34, 0, '0', {
      fontFamily: 'Fredoka',
      fontSize: '18px',
      color: '#fff7d7',
    }).setOrigin(0.5);

    row.add([name, minus, plus, value]);
    row.valueText = value;
    row.key = key;
    return row;
  }

  createMiniButton(label, x, y, callback) {
    const button = this.scene.add.container(x, y);
    const bg = this.scene.add.rectangle(0, 0, 28, 28, 0xffd460).setStrokeStyle(3, 0xff9f43, 1);
    const text = this.scene.add.text(0, -1, label, {
      fontFamily: 'Fredoka',
      fontSize: '18px',
      fontStyle: '700',
      color: '#214767',
    }).setOrigin(0.5);

    button.add([bg, text]);
    button.setSize(28, 28);
    button.setInteractive(new Phaser.Geom.Rectangle(-14, -14, 28, 28), Phaser.Geom.Rectangle.Contains);
    button.on('pointerdown', callback);
    return button;
  }

  draw() {
    this.background.clear();
    this.background.fillStyle(0x173d63, 0.88);
    this.background.lineStyle(4, 0x8dd9ff, 0.9);
    this.background.fillRoundedRect(-120, -110, 240, 194, 18);
    this.background.strokeRoundedRect(-120, -110, 240, 194, 18);
  }

  setSnapshot(snapshot, tuning) {
    this.metrics.setText([
      `tier:    ${snapshot.tier}`,
      `speed:   ${snapshot.shipSpeed.toFixed(1)}`,
      `max:     ${snapshot.numberMax}`,
      `choices: ${snapshot.choiceCount}`,
      `hint:    ${snapshot.hintStrength.toFixed(2)}`,
      `support: ${snapshot.supportLevel.toFixed(2)}`,
      `acc:     ${(snapshot.metrics.accuracy * 100).toFixed(0)}%`,
    ].join('\n'));

    [this.speedRow, this.numberRow, this.hintRow].forEach((row) => {
      row.valueText.setText(String(tuning[row.key] ?? 0));
    });
  }

  toggle(force) {
    this.visibleState = typeof force === 'boolean' ? force : !this.visibleState;
    this.setVisible(this.visibleState);
  }
}
