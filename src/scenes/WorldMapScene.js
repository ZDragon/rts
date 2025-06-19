import Phaser from 'phaser';
import resourceManager from '../controllers/ResourceManager.js';

export default class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMapScene');
  }

  create() {
    this.add.text(640, 80, 'Карта мира', {
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

    // Заглушка: 5 миссий, открываются по порядку
    const missions = [
      { label: 'Миссия 1', unlocked: true },
      { label: 'Миссия 2', unlocked: false },
      { label: 'Миссия 3', unlocked: false },
      { label: 'Миссия 4', unlocked: false },
      { label: 'Миссия 5', unlocked: false },
    ];

    missions.forEach((mission, i) => {
      const btn = this.add.text(400 + i * 150, 300, mission.label, {
        fontSize: '28px',
        color: mission.unlocked ? '#fff' : '#888',
        backgroundColor: mission.unlocked ? '#228B22' : '#444',
        padding: { left: 16, right: 16, top: 8, bottom: 8 },
        fontFamily: 'sans-serif',
      }).setOrigin(0.5);
      if (mission.unlocked) {
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerdown', () => {
          this.scene.start('MissionScene', { mission: i + 1 });
        });
      }
    });

    const btn = this.add.text(640, 600, 'В хаб', {
      fontSize: '32px',
      color: '#fff',
      backgroundColor: '#444',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
      fontFamily: 'sans-serif',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerdown', () => {
      this.scene.start('HubScene');
    });
  }

  getResString() {
    const res = resourceManager.getAll();
    return Object.entries(res).map(([k, v]) => `${k}: ${v}`).join('   ');
  }
} 