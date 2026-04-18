import Phaser from 'phaser';
import { DESIGN_WIDTH, DESIGN_HEIGHT, SCENES } from './constants.js';
import { AudioSystem } from './audio/AudioSystem.js';
import { BootScene } from './scenes/BootScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { WorldMapScene } from './scenes/WorldMapScene.js';
import { LevelScene } from './scenes/LevelScene.js';
import { ResultsScene } from './scenes/ResultsScene.js';
import { SaveSystem } from './systems/SaveSystem.js';

export function createGameConfig() {
  const save = new SaveSystem();
  const audio = new AudioSystem();

  return {
    type: Phaser.AUTO,
    parent: 'app',
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    backgroundColor: '#87dcff',
    scene: [BootScene, MainMenuScene, WorldMapScene, LevelScene, ResultsScene],
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: DESIGN_WIDTH,
      height: DESIGN_HEIGHT,
      expandParent: true,
    },
    disableContextMenu: true,
    input: {
      activePointers: 3,
      touch: {
        capture: true,
      },
    },
    fps: {
      target: 60,
      forceSetTimeOut: true,
    },
    callbacks: {
      preBoot: (game) => {
        game.services = { save, audio };
        save.attach(game);
        audio.attach(game);
        game.scene.keys = game.scene.keys || {};
      },
    },
  };
}
