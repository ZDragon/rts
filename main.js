import Phaser from 'phaser';
import SplashScene from './scenes/SplashScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import HubScene from './scenes/HubScene.js';
import WorldMapScene from './scenes/WorldMapScene.js';
import MissionScene from './scenes/MissionScene.js';

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