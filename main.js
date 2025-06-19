import Phaser from 'phaser';
import SplashScene from './src/scenes/SplashScene.js';
import MainMenuScene from './src/scenes/MainMenuScene.js';
import HubScene from './src/scenes/HubScene.js';
import WorldMapScene from './src/scenes/WorldMapScene.js';
import MissionScene from './src/scenes/MissionScene.js';

const config = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: 'game',
  scene: [
    SplashScene,
    MainMenuScene,
    HubScene,
    WorldMapScene,
    MissionScene
  ],
  backgroundColor: '#222',
};

const game = new Phaser.Game(config); 