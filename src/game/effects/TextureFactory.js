function makeTexture(scene, key, width, height, draw) {
  const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
  draw(graphics, width, height);
  graphics.generateTexture(key, width, height);
  graphics.destroy();
}

function strokeCurve(g, points, width, color, alpha = 1) {
  g.lineStyle(width, color, alpha);
  g.beginPath();
  g.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => g.lineTo(point.x, point.y));
  g.strokePath();
}

function fillStar(g, x, y, innerRadius, outerRadius, points = 5) {
  const starPoints = [];
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = (-Math.PI / 2) + (index * Math.PI / points);
    starPoints.push({ x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius });
  }
  g.fillPoints(starPoints, true);
}
export function createGeneratedTextures(scene) {
  if (scene.textures.exists('ship')) {
    return;
  }

  makeTexture(scene, 'cloud', 240, 130, (g) => {
    g.fillStyle(0x7bcbe6, 0.16);
    g.fillEllipse(118, 92, 168, 22);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(54, 70, 30);
    g.fillCircle(92, 48, 36);
    g.fillCircle(138, 62, 34);
    g.fillCircle(184, 56, 28);
    g.fillStyle(0xfff4db, 0.42);
    g.fillEllipse(126, 74, 120, 20);
  });

  makeTexture(scene, 'island', 360, 210, (g) => {
    g.fillStyle(0x2b8dbf, 0.16);
    g.fillEllipse(180, 170, 260, 24);
    g.fillStyle(0x5ec76a, 1);
    g.fillEllipse(180, 116, 294, 112);
    g.fillStyle(0x45a95a, 1);
    g.fillCircle(118, 104, 34);
    g.fillCircle(166, 80, 44);
    g.fillCircle(220, 88, 42);
    g.fillCircle(266, 108, 28);
    g.fillStyle(0xf7e6ac, 1);
    g.fillEllipse(182, 140, 282, 56);
    g.fillStyle(0xe2c77d, 1);
    g.fillEllipse(184, 146, 212, 20);
    g.fillStyle(0x74ebff, 0.95);
    g.fillEllipse(198, 126, 88, 28);
    g.fillStyle(0xffffff, 0.3);
    g.fillEllipse(196, 120, 48, 8);
    g.fillStyle(0x845331, 1);
    g.fillRoundedRect(104, 70, 10, 44, 5);
    g.fillRoundedRect(246, 78, 10, 40, 5);
    g.fillStyle(0x32c86e, 1);
    g.fillTriangle(109, 74, 78, 90, 100, 44);
    g.fillTriangle(109, 74, 136, 48, 116, 92);
    g.fillTriangle(251, 82, 220, 102, 242, 50);
    g.fillTriangle(251, 82, 278, 56, 258, 102);
  });

  makeTexture(scene, 'palm', 140, 210, (g) => {
    g.lineStyle(14, 0x8f5a35, 1);
    g.beginPath();
    g.moveTo(72, 174);
    g.lineTo(66, 134);
    g.lineTo(72, 96);
    g.lineTo(60, 56);
    g.strokePath();
    strokeCurve(g, [{ x: 59, y: 60 }, { x: 22, y: 78 }, { x: 8, y: 52 }], 14, 0x34c96a);
    strokeCurve(g, [{ x: 61, y: 56 }, { x: 42, y: 26 }, { x: 14, y: 20 }], 14, 0x3ddc77);
    strokeCurve(g, [{ x: 61, y: 56 }, { x: 92, y: 26 }, { x: 128, y: 30 }], 14, 0x31c464);
    strokeCurve(g, [{ x: 61, y: 56 }, { x: 100, y: 60 }, { x: 132, y: 84 }], 14, 0x46d873);
    strokeCurve(g, [{ x: 61, y: 56 }, { x: 64, y: 20 }, { x: 88, y: 6 }], 12, 0x39cc67);
  });

  makeTexture(scene, 'ship', 300, 190, (g) => {
    g.fillStyle(0x106c9c, 0.18);
    g.fillEllipse(132, 148, 188, 24);
    g.fillStyle(0x5d3421, 1);
    g.fillPoints([
      { x: 34, y: 110 }, { x: 196, y: 110 }, { x: 252, y: 134 }, { x: 218, y: 154 },
      { x: 72, y: 154 }, { x: 26, y: 134 },
    ], true);
    g.fillStyle(0xb9683c, 1);
    g.fillPoints([
      { x: 42, y: 114 }, { x: 192, y: 114 }, { x: 226, y: 128 }, { x: 194, y: 140 },
      { x: 84, y: 140 }, { x: 36, y: 126 },
    ], true);
    g.fillStyle(0xffd67e, 1);
    g.fillRoundedRect(92, 88, 70, 22, 8);
    g.fillRoundedRect(64, 72, 64, 18, 8);
    g.fillStyle(0x29425c, 1);
    g.fillCircle(92, 128, 8);
    g.fillCircle(128, 126, 8);
    g.fillCircle(164, 124, 8);
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(146, 86, 146, 26, 204, 78);
    g.fillTriangle(108, 84, 108, 40, 150, 80);
    g.fillStyle(0xff6f58, 1);
    g.fillTriangle(146, 26, 186, 38, 146, 54);
    g.fillStyle(0x3d5673, 1);
    g.fillRect(144, 26, 6, 98);
    g.fillRect(106, 40, 5, 54);
    g.fillStyle(0xfff1b9, 1);
    g.fillCircle(232, 124, 10);
    g.fillStyle(0xff7c61, 1);
    fillStar(g, 232, 124, 5, 4, 8);
    g.lineStyle(5, 0xffffff, 0.26);
    g.strokeLineShape(new Phaser.Geom.Line(54, 118, 150, 118));
  });

  makeTexture(scene, 'raft', 240, 156, (g) => {
    g.fillStyle(0x0f7aa8, 0.18);
    g.fillEllipse(116, 128, 154, 18);
    g.fillStyle(0x94633c, 1);
    g.fillRoundedRect(42, 94, 138, 28, 14);
    g.fillRoundedRect(56, 78, 112, 20, 10);
    g.fillStyle(0xc78e57, 1);
    g.fillRoundedRect(66, 64, 48, 18, 8);
    g.fillStyle(0x2a8db8, 1);
    g.fillRect(136, 36, 8, 68);
    g.fillStyle(0xfff5df, 1);
    g.fillTriangle(140, 40, 206, 66, 140, 96);
    g.fillStyle(0xff8f66, 1);
    g.fillTriangle(140, 34, 176, 44, 140, 56);
    g.fillStyle(0xffdb7a, 1);
    g.fillRoundedRect(88, 74, 32, 20, 8);
    g.fillStyle(0xffffff, 0.26);
    g.fillRoundedRect(74, 102, 54, 8, 4);
  });

  makeTexture(scene, 'marker', 132, 154, (g) => {
    g.fillStyle(0x117ba9, 0.18);
    g.fillEllipse(66, 130, 78, 16);
    g.fillStyle(0x37628a, 1);
    g.fillRoundedRect(56, 28, 12, 84, 6);
    g.fillStyle(0xffcb68, 1);
    g.fillTriangle(62, 34, 106, 48, 62, 66);
    g.fillStyle(0xff8259, 1);
    g.fillRoundedRect(28, 74, 76, 52, 22);
    g.fillStyle(0xfff7df, 1);
    g.fillCircle(66, 100, 20);
    g.lineStyle(5, 0xffcb68, 1);
    g.strokeCircle(66, 100, 28);
    g.fillStyle(0x2c78b0, 1);
    g.fillCircle(66, 100, 8);
  });

  makeTexture(scene, 'coin', 42, 42, (g) => {
    g.fillStyle(0xf7c942, 1);
    g.fillCircle(21, 21, 15);
    g.fillStyle(0xffef9a, 1);
    g.fillCircle(21, 21, 11);
    g.fillStyle(0xf3bd22, 1);
    fillStar(g, 21, 21, 5, 4, 8);
    g.fillStyle(0xffffff, 0.4);
    g.fillEllipse(16, 13, 10, 6);
  });

  makeTexture(scene, 'crate', 56, 56, (g) => {
    g.fillStyle(0xd99a52, 1);
    g.fillRoundedRect(6, 6, 44, 44, 10);
    g.lineStyle(4, 0xa96a34, 1);
    g.strokeRoundedRect(6, 6, 44, 44, 10);
    g.strokeLineShape(new Phaser.Geom.Line(14, 14, 42, 42));
    g.strokeLineShape(new Phaser.Geom.Line(42, 14, 14, 42));
    g.fillStyle(0xffe3b4, 0.28);
    g.fillRoundedRect(12, 12, 26, 10, 4);
  });

  makeTexture(scene, 'barrel', 52, 62, (g) => {
    g.fillStyle(0xbf7b39, 1);
    g.fillEllipse(26, 31, 34, 52);
    g.lineStyle(4, 0x7b4726, 1);
    g.strokeEllipse(26, 31, 34, 52);
    g.strokeLineShape(new Phaser.Geom.Line(9, 18, 43, 18));
    g.strokeLineShape(new Phaser.Geom.Line(9, 44, 43, 44));
    g.fillStyle(0xffefcb, 0.2);
    g.fillEllipse(20, 19, 12, 8);
  });

  makeTexture(scene, 'cannonball', 30, 30, (g) => {
    g.fillStyle(0x25324a, 1);
    g.fillCircle(15, 15, 12);
    g.fillStyle(0xffffff, 0.18);
    g.fillCircle(11, 10, 4);
  });

  makeTexture(scene, 'smoke', 72, 72, (g) => {
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(24, 42, 18);
    g.fillCircle(42, 26, 18);
    g.fillCircle(46, 46, 14);
    g.fillStyle(0xffe5b8, 0.28);
    g.fillCircle(34, 34, 12);
  });

  makeTexture(scene, 'splash', 108, 84, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(16, 54, 7);
    g.fillCircle(34, 36, 11);
    g.fillCircle(56, 50, 9);
    g.fillCircle(78, 36, 10);
    g.fillCircle(92, 48, 6);
    g.fillStyle(0xa7eeff, 0.6);
    g.fillEllipse(56, 60, 56, 12);
  });

  makeTexture(scene, 'spark', 48, 48, (g) => {
    g.fillStyle(0xfff8bf, 1);
    g.fillTriangle(24, 2, 31, 24, 24, 46);
    g.fillTriangle(2, 24, 24, 17, 46, 24);
    g.fillCircle(24, 24, 8);
  });

  makeTexture(scene, 'heart', 42, 40, (g) => {
    g.fillStyle(0xff5d7d, 1);
    g.fillCircle(13, 13, 10);
    g.fillCircle(29, 13, 10);
    g.fillTriangle(6, 18, 36, 18, 21, 36);
    g.fillStyle(0xffffff, 0.24);
    g.fillCircle(11, 10, 4);
  });

  makeTexture(scene, 'star', 42, 42, (g) => {
    g.fillStyle(0xffd65f, 1);
    fillStar(g, 21, 21, 5, 9, 18);
    g.fillStyle(0xfff3b2, 1);
    fillStar(g, 21, 21, 5, 5, 12);
  });

  makeTexture(scene, 'cannon-base', 246, 170, (g) => {
    g.fillStyle(0x103f63, 0.14);
    g.fillEllipse(126, 132, 178, 22);
    g.fillStyle(0x7e4e30, 1);
    g.fillRoundedRect(48, 84, 140, 34, 14);
    g.fillStyle(0xd8ae57, 1);
    g.fillRoundedRect(62, 74, 112, 20, 10);
    g.fillStyle(0x8ed064, 1);
    g.fillRoundedRect(74, 58, 88, 18, 8);
    g.fillStyle(0xe0bd67, 1);
    g.fillCircle(78, 118, 28);
    g.fillCircle(162, 118, 28);
    g.fillStyle(0xffeeac, 1);
    g.fillCircle(78, 118, 15);
    g.fillCircle(162, 118, 15);
    g.fillStyle(0xff9a52, 1);
    fillStar(g, 78, 118, 5, 5, 10);
    fillStar(g, 162, 118, 5, 5, 10);
    g.fillStyle(0xffffff, 0.24);
    g.fillRoundedRect(86, 62, 44, 8, 4);
  });

  makeTexture(scene, 'cannon-barrel', 210, 96, (g) => {
    g.fillStyle(0x334b69, 1);
    g.fillRoundedRect(24, 24, 136, 38, 18);
    g.fillRoundedRect(146, 18, 38, 50, 14);
    g.fillStyle(0xf7b851, 1);
    g.fillRoundedRect(42, 20, 16, 46, 8);
    g.fillRoundedRect(94, 20, 16, 46, 8);
    g.fillStyle(0xfff0c0, 0.24);
    g.fillRoundedRect(42, 30, 84, 8, 4);
    g.fillStyle(0xffcf5f, 1);
    g.fillCircle(96, 43, 12);
    g.fillStyle(0xff7c61, 1);
    fillStar(g, 96, 43, 5, 4, 7);
    g.fillStyle(0x1f3047, 1);
    g.fillCircle(170, 43, 11);
  });
}

