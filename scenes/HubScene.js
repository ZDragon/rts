import Phaser from 'phaser';
import resourceManager from '../logic/ResourceManager.js';

export default class HubScene extends Phaser.Scene {
  constructor() {
    super('HubScene');
  }

  create() {
    this.add.text(640, 80, 'Хаб', {
      fontSize: '48px',
      color: '#fff',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    // Отображение ресурсов
    this.resText = this.add.text(20, 20, this.getResString(), {
      fontSize: '24px',
      color: '#fff',
      fontFamily: 'sans-serif'
    });

    const items = [
      'Улучшения зданий',
      'Улучшения отрядов',
      'Улучшения модификаторов',
      'Достижения',
    ];

    items.forEach((label, i) => {
      this.add.text(640, 180 + i * 60, label, {
        fontSize: '32px',
        color: '#fff',
        backgroundColor: '#333',
        padding: { left: 20, right: 20, top: 10, bottom: 10 },
        fontFamily: 'sans-serif',
      }).setOrigin(0.5);
    });

    const btn = this.add.text(640, 500, 'К карте', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#444',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
      fontFamily: 'sans-serif',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.scene.start('WorldMapScene');
    });
  }

  getResString() {
    const res = resourceManager.getAll();
    return Object.entries(res).map(([k, v]) => `${k}: ${v}`).join('   ');
  }
} 