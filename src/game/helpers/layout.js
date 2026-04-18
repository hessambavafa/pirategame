import Phaser from 'phaser';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from '../constants.js';

export function getViewportMetrics(scene) {
  const { width, height } = scene.scale;
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  const isLandscape = width > height;
  const isPhone = shortSide <= 430;
  const isTablet = shortSide >= 700;
  const isPhonePortrait = isPhone && !isLandscape;
  const isPhoneLandscape = isPhone && isLandscape;
  const isTabletPortrait = isTablet && !isLandscape;
  const isTabletLandscape = isTablet && isLandscape;
  const isCompact = isPhone || height < 520;
  const safePadX = Phaser.Math.Clamp(Math.round(width * (isPhonePortrait ? 0.04 : 0.03)), isPhone ? 10 : 18, isTablet ? 34 : 28);
  const safePadY = Phaser.Math.Clamp(Math.round(height * (isPhoneLandscape ? 0.035 : 0.03)), isPhoneLandscape ? 8 : 12, isTablet ? 34 : 28);
  const scenePadding = {
    left: safePadX,
    right: safePadX,
    top: safePadY,
    bottom: safePadY,
  };

  return {
    width,
    height,
    shortSide,
    longSide,
    isLandscape,
    isPhone,
    isTablet,
    isCompact,
    isPhonePortrait,
    isPhoneLandscape,
    isTabletPortrait,
    isTabletLandscape,
    isTallPhone: !isLandscape && height > width * 1.2,
    uiScale: Phaser.Math.Clamp(shortSide / 720, 0.78, 1.18),
    scenePadding,
    designWidth: DESIGN_WIDTH,
    designHeight: DESIGN_HEIGHT,
  };
}

export function getSafeBounds(scene, padding = 24) {
  const metrics = getViewportMetrics(scene);
  const { width, height } = metrics;
  const resolvedPadding = typeof padding === 'number'
    ? {
        left: padding,
        right: padding,
        top: padding,
        bottom: padding,
      }
    : {
        left: padding.left ?? metrics.scenePadding.left,
        right: padding.right ?? metrics.scenePadding.right,
        top: padding.top ?? metrics.scenePadding.top,
        bottom: padding.bottom ?? metrics.scenePadding.bottom,
      };

  return {
    left: resolvedPadding.left,
    right: width - resolvedPadding.right,
    top: resolvedPadding.top,
    bottom: height - resolvedPadding.bottom,
    width: width - resolvedPadding.left - resolvedPadding.right,
    height: height - resolvedPadding.top - resolvedPadding.bottom,
    designWidth: DESIGN_WIDTH,
    designHeight: DESIGN_HEIGHT,
  };
}
