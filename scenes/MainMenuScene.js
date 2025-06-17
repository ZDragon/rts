import Phaser from 'phaser';

const menuItems = [
  { label: 'Новая игра', action: 'new' },
  { label: 'Продолжить', action: 'continue' },
  { label: 'Сохранить игру', action: 'save' },
  { label: 'Загрузить игру', action: 'load' },
  { label: 'Настройки', action: 'settings' },
  { label: 'Выход', action: 'exit' },
];

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenuScene');
  }

  create() {
    this.add.text(640, 120, 'Главное меню', {
      fontSize: '48px',
      color: '#fff',
      fontFamily: 'sans-serif'
    }).setOrigin(0.5);

    menuItems.forEach((item, i) => {
      const btn = this.add.text(640, 220 + i * 60, item.label, {
        fontSize: '32px',
        color: '#fff',
        backgroundColor: '#444',
        padding: { left: 20, right: 20, top: 10, bottom: 10 },
        fontFamily: 'sans-serif',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        switch (item.action) {
          case 'new':
            this.scene.start('HubScene');
            break;
          case 'continue':
            this.scene.start('HubScene');
            break;
          case 'save':
            this.showMessage('Сохранение...');
            break;
          case 'load':
            this.showMessage('Загрузка...');
            break;
          case 'settings':
            this.showMessage('Настройки пока недоступны');
            break;
          case 'exit':
            this.showMessage('Выход из игры');
            break;
        }
      });
    });
  }

  showMessage(text) {
    const msg = this.add.text(640, 650, text, {
      fontSize: '28px',
      color: '#ff0',
      fontFamily: 'sans-serif',
      backgroundColor: '#222',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
    }).setOrigin(0.5);
    this.time.delayedCall(1200, () => msg.destroy());
  }
} 