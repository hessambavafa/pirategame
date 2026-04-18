import { DEPTHS } from '../constants.js';

export function createBackdrop(scene, options = {}) {
  const root = scene.add.container(0, 0).setDepth(DEPTHS.SKY);
  const sky = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, 0x8adfff).setOrigin(0);
  const skyWarm = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height * 0.52, 0xffd9a8, 0.34).setOrigin(0);
  const horizonHaze = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height * 0.22, 0xfff1cf, 0.26).setOrigin(0);
  const sunGlow = scene.add.circle(0, 0, 102, 0xfff1c5, 0.26);
  const sun = scene.add.circle(0, 0, 52, 0xfff2a4, 1);
  const sunRing = scene.add.circle(0, 0, 72, 0xffffff, 0.06).setStrokeStyle(8, 0xfff7dc, 0.22);
  const lagoonA = scene.add.ellipse(0, 0, scene.scale.width * 1.1, 180, 0x64d6ff, 0.52).setOrigin(0.5, 0.5);
  const lagoonB = scene.add.ellipse(0, 0, scene.scale.width * 1.15, 220, 0x2ab1ea, 0.68).setOrigin(0.5, 0.5);
  const lagoonC = scene.add.ellipse(0, 0, scene.scale.width * 1.2, 280, 0x187fbf, 0.88).setOrigin(0.5, 0.5);
  const surf = Array.from({ length: 6 }, (_, index) => scene.add.rectangle(0, 0, scene.scale.width, 10 + index * 2, index % 2 === 0 ? 0xffffff : 0xa9f1ff, 0.12 + index * 0.03).setOrigin(0));
  const islands = [
    scene.add.image(0, 0, 'island').setAlpha(0.4).setScale(0.54),
    scene.add.image(0, 0, 'island').setAlpha(0.68).setScale(0.78),
    scene.add.image(0, 0, 'island').setAlpha(0.9).setScale(1.06),
  ];
  const clouds = [
    scene.add.image(0, 0, 'cloud').setAlpha(0.94).setScale(0.96),
    scene.add.image(0, 0, 'cloud').setAlpha(0.82).setScale(0.82),
    scene.add.image(0, 0, 'cloud').setAlpha(0.74).setScale(0.68),
    scene.add.image(0, 0, 'cloud').setAlpha(0.62).setScale(0.58),
  ];
  const sparkles = Array.from({ length: 18 }, () => scene.add.circle(0, 0, 3, 0xffffff, 0.2));
  const palms = options.withPalms
    ? [scene.add.image(0, 0, 'palm').setScale(1.02), scene.add.image(0, 0, 'palm').setScale(0.8)]
    : [];

  root.add([
    sky,
    skyWarm,
    horizonHaze,
    sunGlow,
    sunRing,
    sun,
    lagoonA,
    lagoonB,
    lagoonC,
    ...surf,
    ...islands,
    ...sparkles,
    ...clouds,
    ...palms,
  ]);

  scene.tweens.add({ targets: sunGlow, scaleX: 1.08, scaleY: 1.08, alpha: 0.34, yoyo: true, duration: 2600, repeat: -1 });
  scene.tweens.add({ targets: sunRing, scaleX: 1.04, scaleY: 1.04, alpha: 0.18, yoyo: true, duration: 2400, repeat: -1 });
  scene.tweens.add({ targets: skyWarm, alpha: 0.28, yoyo: true, duration: 3000, repeat: -1 });
  scene.tweens.add({ targets: horizonHaze, alpha: 0.2, yoyo: true, duration: 3400, repeat: -1 });
  scene.tweens.add({ targets: lagoonA, y: '+=8', alpha: 0.58, yoyo: true, duration: 1800, repeat: -1, ease: 'Sine.InOut' });
  scene.tweens.add({ targets: lagoonB, y: '+=10', alpha: 0.74, yoyo: true, duration: 2200, repeat: -1, ease: 'Sine.InOut' });
  scene.tweens.add({ targets: lagoonC, y: '+=12', alpha: 0.92, yoyo: true, duration: 2600, repeat: -1, ease: 'Sine.InOut' });

  surf.forEach((band, index) => {
    scene.tweens.add({
      targets: band,
      alpha: 0.16 + index * 0.04,
      yoyo: true,
      duration: 1100 + index * 220,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  });

  clouds.forEach((cloud, index) => {
    scene.tweens.add({
      targets: cloud,
      x: `+=${90 + index * 30}`,
      y: `+=${index % 2 === 0 ? -10 : 10}`,
      duration: 10000 + index * 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  });

  sparkles.forEach((sparkle, index) => {
    scene.tweens.add({
      targets: sparkle,
      alpha: { from: 0.05, to: 0.28 },
      scale: { from: 0.8, to: 1.4 },
      duration: 900 + index * 60,
      yoyo: true,
      repeat: -1,
      delay: index * 40,
    });
  });

  function layout() {
    const { width, height } = scene.scale;

    sky.setSize(width, height);
    skyWarm.setPosition(0, 0).setSize(width, height * 0.54);
    horizonHaze.setPosition(0, height * 0.34).setSize(width, height * 0.18);
    sun.setPosition(width * 0.18, height * 0.16);
    sunGlow.setPosition(width * 0.18, height * 0.16);
    sunRing.setPosition(width * 0.18, height * 0.16);

    lagoonA.setPosition(width * 0.54, height * 0.58).setSize(width * 1.08, height * 0.22);
    lagoonB.setPosition(width * 0.52, height * 0.7).setSize(width * 1.14, height * 0.24);
    lagoonC.setPosition(width * 0.5, height * 0.84).setSize(width * 1.2, height * 0.34);

    surf[0].setPosition(0, height * 0.54).setSize(width, 8);
    surf[1].setPosition(0, height * 0.61).setSize(width, 10);
    surf[2].setPosition(0, height * 0.69).setSize(width, 12);
    surf[3].setPosition(0, height * 0.77).setSize(width, 10);
    surf[4].setPosition(0, height * 0.85).setSize(width, 12);
    surf[5].setPosition(0, height * 0.92).setSize(width, 14);

    islands[0].setPosition(width * 0.26, height * 0.46).setScale(Math.min(0.62, width / 1900));
    islands[1].setPosition(width * 0.56, height * 0.45).setScale(Math.min(0.9, width / 1450));
    islands[2].setPosition(width * 0.82, height * 0.43).setScale(Math.min(1.12, width / 1160));

    clouds[0].setPosition(width * 0.16, height * 0.19);
    clouds[1].setPosition(width * 0.74, height * 0.14);
    clouds[2].setPosition(width * 0.58, height * 0.26);
    clouds[3].setPosition(width * 0.36, height * 0.11);

    sparkles.forEach((sparkle, index) => {
      const row = Math.floor(index / 6);
      const col = index % 6;
      sparkle.setPosition(width * 0.12 + col * width * 0.13, height * (0.55 + row * 0.11));
    });

    if (palms[0]) {
      palms[0].setPosition(width * 0.05, height * 0.54);
      palms[1].setPosition(width * 0.93, height * 0.5).setFlipX(true);
    }
  }

  layout();
  scene.scale.on('resize', layout);

  return {
    root,
    layout,
    destroy() {
      scene.scale.off('resize', layout);
      root.destroy(true);
    },
  };
}
