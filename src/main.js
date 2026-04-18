import Phaser from 'phaser';
import './style.css';
import { createGameConfig } from './game/config.js';

function syncViewportHeight() {
  const visualHeight = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${Math.round(visualHeight)}px`);
}

window.addEventListener('resize', syncViewportHeight);
window.visualViewport?.addEventListener('resize', syncViewportHeight);
window.visualViewport?.addEventListener('scroll', syncViewportHeight);
syncViewportHeight();

window.addEventListener('load', () => {
  syncViewportHeight();
  window.__PCC_GAME__ = new Phaser.Game(createGameConfig());
});
