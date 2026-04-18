import Phaser from 'phaser';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../constants.js';

export function getViewportMetrics(scene) {
  const { width, height } = scene.scale;
  const shortSide = Math.min(width, height);

  return {
    width,
    height,
    shortSide,
    isTallPhone: height > width * 1.2,
    uiScale: Phaser.Math.Clamp(shortSide / 720, 0.78, 1.18),
    designWidth: DESIGN_WIDTH,
    designHeight: DESIGN_HEIGHT,
  };
}

export function getSafeBounds(scene, padding = 24) {
  const { width, height } = scene.scale;

  return {
    left: padding,
    right: width - padding,
    top: padding,
    bottom: height - padding,
    width: width - padding * 2,
    height: height - padding * 2,
    designWidth: DESIGN_WIDTH,
    designHeight: DESIGN_HEIGHT,
  };
}
