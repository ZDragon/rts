/**
 * Демо для ParticleController - показывает как использовать различные эффекты
 */

import ParticleController from './ParticleController.js';

export default class ParticleControllerDemo {
  constructor(scene) {
    this.scene = scene;
    this.particleController = new ParticleController(scene);
    
    this.setupDemoControls();
  }

  setupDemoControls() {
    // Создаем UI кнопки для демонстрации эффектов
    const buttonY = 100;
    const buttonSpacing = 40;
    
    const effects = [
      { name: 'Взрыв', type: 'explosion' },
      { name: 'Огонь', type: 'fire' },
      { name: 'Дым', type: 'smoke' },
      { name: 'Искры', type: 'sparks' },
      { name: 'Пыль', type: 'dust' },
      { name: 'Магия', type: 'magic' },
      { name: 'Исцеление', type: 'healing' }
    ];

    effects.forEach((effect, index) => {
      const button = this.scene.add.text(
        1180, 
        buttonY + index * buttonSpacing, 
        effect.name, 
        {
          fontSize: '16px',
          color: '#fff',
          backgroundColor: '#444',
          padding: { x: 8, y: 4 }
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(200);

      button.on('pointerdown', () => {
        this.createRandomEffect(effect.type);
      });

      button.on('pointerover', () => {
        button.setStyle({ backgroundColor: '#666' });
      });

      button.on('pointerout', () => {
        button.setStyle({ backgroundColor: '#444' });
      });
    });

    // Добавляем заголовок
    this.scene.add.text(1180, 70, 'Эффекты частиц:', {
      fontSize: '18px',
      color: '#fff',
      fontWeight: 'bold'
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(200);

    // Добавляем специальные кнопки
    const specialButton1 = this.scene.add.text(1180, 420, 'Разрушение здания', {
      fontSize: '14px',
      color: '#fff',
      backgroundColor: '#800',
      padding: { x: 8, y: 4 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .setScrollFactor(0)
    .setDepth(200);

    specialButton1.on('pointerdown', () => {
      this.createBuildingDestructionDemo();
    });

    const specialButton2 = this.scene.add.text(1180, 460, 'Смерть юнита', {
      fontSize: '14px',
      color: '#fff',
      backgroundColor: '#600',
      padding: { x: 8, y: 4 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .setScrollFactor(0)
    .setDepth(200);

    specialButton2.on('pointerdown', () => {
      this.createUnitDeathDemo();
    });

    // Добавляем информацию
    this.scene.add.text(1180, 500, 'Клик по карте для\nслучайного эффекта', {
      fontSize: '12px',
      color: '#aaa',
      align: 'center'
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(200);

    // Обработчик клика по карте
    this.scene.input.on('pointerdown', (pointer) => {
      if (pointer.x < 1100) { // Только в области карты
        const worldPoint = pointer.positionToCamera(this.scene.cameras.main);
        this.createRandomEffectAtPosition(worldPoint.x, worldPoint.y);
      }
    });
  }

  createRandomEffect(type) {
    // Создаем эффект в случайной позиции на экране
    const camera = this.scene.cameras.main;
    const x = camera.scrollX + Math.random() * 800;
    const y = camera.scrollY + Math.random() * 600;
    
    this.particleController.createEffect(type, x, y);
  }

  createRandomEffectAtPosition(x, y) {
    const effects = ['explosion', 'fire', 'smoke', 'sparks', 'dust', 'magic', 'healing'];
    const randomEffect = effects[Math.floor(Math.random() * effects.length)];
    
    this.particleController.createEffect(randomEffect, x, y);
  }

  createBuildingDestructionDemo() {
    const camera = this.scene.cameras.main;
    const x = camera.scrollX + Math.random() * 600;
    const y = camera.scrollY + Math.random() * 400;
    
    this.particleController.createBuildingDestruction(x, y, 64, 64);
  }

  createUnitDeathDemo() {
    const camera = this.scene.cameras.main;
    const x = camera.scrollX + Math.random() * 600;
    const y = camera.scrollY + Math.random() * 400;
    
    const unitTypes = ['normal', 'mechanical'];
    const randomType = unitTypes[Math.floor(Math.random() * unitTypes.length)];
    
    this.particleController.createUnitDeath(x, y, randomType);
  }

  // Методы для интеграции с игровой логикой
  onBuildingConstructionStart(x, y) {
    this.particleController.createEffect('dust', x, y, {
      quantity: 8,
      speedMin: 20,
      speedMax: 50
    });
  }

  onBuildingConstructionComplete(x, y) {
    this.particleController.createEffect('sparks', x, y, {
      quantity: 15,
      speedMin: 50,
      speedMax: 100
    });
  }

  onUnitSpawn(x, y) {
    this.particleController.createEffect('magic', x, y, {
      quantity: 10,
      speedMin: 30,
      speedMax: 60,
      blendMode: 'ADD'
    });
  }

  onResourceDeposit(x, y, resourceType) {
    const colors = {
      wood: 0x8b4513,
      stone: 0x808080,
      gold: 0xffd700,
      food: 0x90ee90
    };
    
    this.particleController.createEffect('sparks', x, y, {
      quantity: 5,
      color: colors[resourceType] || 0xffffff,
      speedMin: 30,
      speedMax: 60
    });
  }

  onCombatAttack(x, y) {
    this.particleController.createEffect('sparks', x, y, {
      quantity: 8,
      speedMin: 60,
      speedMax: 120,
      color: 0xff4444
    });
  }

  // Статистика для отладки
  getParticleStats() {
    return {
      currentParticles: this.particleController.getCurrentParticleCount(),
      maxParticles: this.particleController.maxParticles,
      activeSystems: this.particleController.particleSystems.length,
      continuousEffects: this.particleController.activeEmitters.size
    };
  }

  // Очистка
  destroy() {
    this.particleController.destroy();
  }
} 