import Phaser from 'phaser';

export default class SplashScene extends Phaser.Scene {
  constructor() {
    super('SplashScene');
  }

  create() {
    this.add.text(640, 360, 'RTS Игра', {
      fontSize: '64px',
      color: '#fff',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    this.time.delayedCall(2000, () => {
      this.scene.start('MainMenuScene');
    });
  }
} 