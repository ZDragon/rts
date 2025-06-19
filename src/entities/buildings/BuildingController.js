import { BaseUnit, WorkerUnit, CombatUnit } from '../units/BaseUnit.js';

// Состояния здания
export const BUILDING_STATES = {
  CONSTRUCTION: 'construction',
  IDLE: 'idle',
  PRODUCING: 'producing',
  DESTROYED: 'destroyed'
};

// Иконки для типов зданий
const BUILDING_ICONS = {
  storage: '🏠',
  unitFactory: '⚔️',
  research: '📚'
};

// Базовый класс для всех зданий
export class BuildingController {
  constructor(scene, x, y, buildingType) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.type = buildingType;
    
    // Базовые параметры
    this.maxHP = buildingType.maxHP || 300;
    this.hp = this.maxHP;
    this.state = BUILDING_STATES.CONSTRUCTION;
    this.constructionTime = buildingType.buildTime || 10;
    this.constructionProgress = 0;
    
    // Визуальные элементы
    this.createVisuals();
    
    // Анимация строительства
    this.startConstructionAnimation();
  }

  createVisuals() {
    const size = this.type.size * 32;
    const centerX = this.x * 32 + size/2;
    const centerY = this.y * 32 + size/2;

    // Создаем группу для всех визуальных элементов
    this.container = this.scene.add.container(0, 0);
    
    // Тень здания
    this.shadow = this.scene.add.rectangle(
      centerX + 4,
      centerY + 4,
      size - 4,
      size - 4,
      0x000000,
      0.3
    ).setDepth(19);
    this.container.add(this.shadow);

    // Основное тело здания
    this.sprite = this.scene.add.rectangle(
      centerX,
      centerY,
      size,
      size,
      this.type.color
    ).setDepth(20);
    this.container.add(this.sprite);

    // Рамка здания
    this.border = this.scene.add.rectangle(
      centerX,
      centerY,
      size,
      size,
      0xffffff,
      0
    ).setStrokeStyle(2, 0xffffff, 0.5).setDepth(21);
    this.container.add(this.border);

    // Иконка типа здания
    this.icon = this.scene.add.text(
      centerX,
      centerY - 10,
      BUILDING_ICONS[this.type.type] || '🏢',
      { fontSize: '24px', fontFamily: 'sans-serif' }
    ).setOrigin(0.5).setDepth(24);
    this.container.add(this.icon);

    // Название здания
    this.label = this.scene.add.text(
      centerX,
      centerY + 15,
      this.type.name,
      { 
        fontSize: '14px',
        color: '#fff',
        fontFamily: 'sans-serif',
        backgroundColor: '#00000088',
        padding: { x: 4, y: 2 }
      }
    ).setOrigin(0.5).setDepth(24);
    this.container.add(this.label);

    // Группа для полосок HP и прогресса
    this.bars = this.scene.add.container(0, 0).setDepth(22);
    this.container.add(this.bars);

    // Полоска HP
    this.hpBarBg = this.scene.add.rectangle(
      centerX,
      centerY - size/2 - 8,
      size - 8,
      6,
      0x000000,
      0.8
    );
    this.bars.add(this.hpBarBg);
    
    this.hpBar = this.scene.add.rectangle(
      centerX - (size-8)/2,
      centerY - size/2 - 8,
      size - 8,
      6,
      0x00ff00
    ).setOrigin(0, 0.5);
    this.bars.add(this.hpBar);

    // Индикатор прогресса
    this.progressBarBg = this.scene.add.rectangle(
      centerX,
      centerY + size/2 + 8,
      size - 8,
      6,
      0x000000,
      0.8
    );
    this.bars.add(this.progressBarBg);
    
    this.progressBar = this.scene.add.rectangle(
      centerX - (size-8)/2,
      centerY + size/2 + 8,
      0,
      6,
      0xffff00
    ).setOrigin(0, 0.5);
    this.bars.add(this.progressBar);

    // Скрываем прогресс-бар изначально
    this.progressBar.setVisible(false);
    this.progressBarBg.setVisible(false);

    // Частицы для эффектов
    this.particles = this.scene.add.particles(0, 0, 'pixel', {
      lifespan: 1000,
      gravityY: 100,
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [this.type.color, 0xffffff],
      emitting: false
    }).setDepth(25);
    
    // Начальное состояние для строительства
    if (this.state === BUILDING_STATES.CONSTRUCTION) {
      this.container.setAlpha(0.7);
      this.border.setStrokeStyle(2, 0xffff00, 1);
    }
  }

  startConstructionAnimation() {
    // Анимация появления здания
    this.scene.tweens.add({
      targets: this.container,
      scaleY: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.easeOut'
    });

    // Частицы строительства
    this.constructionEmitter = this.particles.createEmitter({
      x: this.x * 32 + this.type.size * 16,
      y: this.y * 32 + this.type.size * 32,
      speed: { min: -50, max: 50 },
      angle: { min: 240, max: 300 },
      frequency: 100,
      lifespan: 1000,
      quantity: 2,
      scale: { start: 1, end: 0 },
      tint: 0xffff00
    });
  }

  update(time, delta) {
    // Обновление строительства
    if (this.state === BUILDING_STATES.CONSTRUCTION) {
      this.constructionProgress += delta / 1000;
      const progress = this.constructionProgress / this.constructionTime;
      this.progressBar.width = (this.type.size * 32 - 8) * progress;
      
      if (this.constructionProgress >= this.constructionTime) {
        this.completeConstruction();
      }
    }
    
    // Обновление HP бара
    const hpRatio = this.hp / this.maxHP;
    this.hpBar.width = (this.type.size * 32 - 8) * hpRatio;
    this.hpBar.fillColor = hpRatio > 0.6 ? 0x00ff00 : hpRatio > 0.3 ? 0xffff00 : 0xff0000;

    // Пульсация при производстве
    if (this.state === BUILDING_STATES.PRODUCING) {
      this.border.setStrokeStyle(2, 0xffffff, 
        0.3 + 0.2 * Math.sin(time / 200)
      );
    }
  }

  completeConstruction() {
    this.state = BUILDING_STATES.IDLE;
    this.progressBar.setVisible(false);
    this.progressBarBg.setVisible(false);
    this.container.setAlpha(1);
    this.border.setStrokeStyle(2, 0xffffff, 0.5);
    
    // Останавливаем частицы строительства
    if (this.constructionEmitter) {
      this.constructionEmitter.stop();
    }

    // Эффект завершения строительства
    this.scene.tweens.add({
      targets: this.container,
      scaleX: { from: 1, to: 1.1 },
      scaleY: { from: 1, to: 1.1 },
      duration: 200,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    // Вспышка частиц
    this.particles.createEmitter({
      x: this.x * 32 + this.type.size * 16,
      y: this.y * 32 + this.type.size * 16,
      speed: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 800,
      quantity: 20,
      tint: 0xffff00,
      emitting: false,
      explode: true
    });
  }

  takeDamage(amount) {
    const oldHp = this.hp;
    this.hp = Math.max(0, this.hp - amount);
    
    // Визуальный эффект получения урона
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 1, to: 0.3 },
      duration: 100,
      yoyo: true
    });

    // Частицы повреждения
    this.particles.createEmitter({
      x: this.x * 32 + this.type.size * 16,
      y: this.y * 32 + this.type.size * 16,
      speed: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 500,
      quantity: Math.ceil(amount / 10),
      tint: 0xff0000,
      emitting: false,
      explode: true
    });

    if (this.hp === 0 && oldHp > 0) {
      this.destroy();
    }
  }

  destroy() {
    this.state = BUILDING_STATES.DESTROYED;
    
    // Большой взрыв
    this.particles.createEmitter({
      x: this.x * 32 + this.type.size * 16,
      y: this.y * 32 + this.type.size * 16,
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 2, end: 0 },
      lifespan: 1000,
      quantity: 50,
      tint: [0xff0000, 0xff8800, 0xffff00],
      emitting: false,
      explode: true
    });

    // Анимация разрушения
    this.scene.tweens.add({
      targets: this.container,
      scaleY: 0,
      angle: 15,
      alpha: 0,
      duration: 800,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.container.destroy();
        this.particles.destroy();
        this.scene.playerController.removeBuilding(this);
      }
    });
  }

  startProduction() {
    this.state = BUILDING_STATES.PRODUCING;
    this.progressBar.setVisible(true);
    this.progressBarBg.setVisible(true);
    
    // Эффект начала производства
    this.productionEmitter = this.particles.createEmitter({
      x: this.x * 32 + this.type.size * 16,
      y: this.y * 32 + this.type.size * 16,
      speed: { min: 20, max: 40 },
      angle: { min: 0, max: 360 },
      frequency: 500,
      scale: { start: 0.5, end: 0 },
      tint: 0x00ffff
    });
  }

  stopProduction() {
    if (this.productionEmitter) {
      this.productionEmitter.stop();
    }
    this.state = BUILDING_STATES.IDLE;
    this.progressBar.setVisible(false);
    this.progressBarBg.setVisible(false);
    this.border.setStrokeStyle(2, 0xffffff, 0.5);
  }
}

// Контроллер склада
export class StorageBuildingController extends BuildingController {
  constructor(scene, x, y, buildingType) {
    super(scene, x, y, buildingType);
    this.resourceLimits = {
      wood: 200,
      stone: 200,
      gold: 200,
      food: 200
    };
  }

  getResourceLimits() {
    return this.resourceLimits;
  }
}

// Контроллер фабрики юнитов
export class UnitFactoryController extends BuildingController {
  constructor(scene, x, y, buildingType) {
    super(scene, x, y, buildingType);
    this.productionQueue = [];
    this.currentProduction = null;
    this.productionProgress = 0;
    this.unitLimit = 5; // Каждая фабрика добавляет 5 к лимиту юнитов
  }

  canQueueUnit(unitType) {
    return this.state === BUILDING_STATES.IDLE || this.state === BUILDING_STATES.PRODUCING;
  }

  queueUnit(unitType, playerController) {
    if (!this.canQueueUnit(unitType)) return false;
    
    // Проверяем лимит юнитов
    if (playerController.state.units.length >= playerController.state.unitLimit) {
      console.warn('Достигнут лимит юнитов');
      return false;
    }

    // Проверяем наличие ресурсов
    if (!playerController.hasResources(unitType.cost)) {
      console.warn('Недостаточно ресурсов для создания юнита');
      return false;
    }

    // Списываем ресурсы сразу при постановке в очередь
    playerController.spendResources(unitType.cost);

    // Добавляем в очередь
    this.productionQueue.push({
      type: unitType,
      progress: 0,
      time: unitType.buildTime || 5
    });

    // Если не производим, начинаем производство
    if (this.state !== BUILDING_STATES.PRODUCING) {
      this.startProduction();
    }

    return true;
  }

  startProduction() {
    if (this.productionQueue.length > 0) {
      this.state = BUILDING_STATES.PRODUCING;
      this.currentProduction = this.productionQueue[0];
      this.progressBar.setVisible(true);
      this.progressBarBg.setVisible(true);
      
      // Анимация производства
      this.sprite.setTint(0xffaa00);
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: { from: 0.7, to: 1 },
        duration: 500,
        yoyo: true,
        repeat: -1
      });
    }
  }

  update(time, delta) {
    super.update(time, delta);

    if (this.state === BUILDING_STATES.PRODUCING && this.currentProduction) {
      this.currentProduction.progress += delta / 1000;
      
      // Обновляем прогресс-бар
      const progress = this.currentProduction.progress / this.currentProduction.time;
      this.progressBar.width = (this.type.size * 32 - 8) * progress;

      if (this.currentProduction.progress >= this.currentProduction.time) {
        this.completeUnit(this.currentProduction);
      }
    }
  }

  completeUnit(production) {
    // Создаем юнита соответствующего типа
    const spawnX = this.x * 32 + this.type.size * 32 + 32;
    const spawnY = this.y * 32 + this.type.size * 16;

    let unit;
    if (production.type.id === 'worker') {
      unit = new WorkerUnit(this.scene, spawnX, spawnY, production.type);
    } else if (production.type.canAttack) {
      unit = new CombatUnit(this.scene, spawnX, spawnY, production.type);
    } else {
      unit = new BaseUnit(this.scene, spawnX, spawnY, production.type);
    }

    // Анимация появления
    unit.sprite.setScale(0);
    this.scene.tweens.add({
      targets: unit.sprite,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });

    // Эффект появления
    this.particles.createEmitter({
      x: spawnX,
      y: spawnY,
      speed: { min: 50, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 500,
      quantity: 10,
      tint: [0x00ff00, 0xffff00],
      emitting: false,
      explode: true
    });

    // Добавляем юнита в список игрока через параметр playerController
    const playerController = this.scene.game.playerController;
    if (playerController) {
      playerController.state.units.push(unit);
    } else {
      console.warn('PlayerController не найден при создании юнита');
    }

    // Удаляем из очереди
    this.productionQueue.shift();
    this.currentProduction = null;

    // Сбрасываем прогресс-бар
    this.progressBar.width = 0;

    // Если очередь пуста, останавливаем производство
    if (this.productionQueue.length === 0) {
      this.stopProduction();
    } else {
      // Иначе начинаем следующее производство
      this.startProduction();
    }

    return unit;
  }

  stopProduction() {
    this.state = BUILDING_STATES.IDLE;
    this.currentProduction = null;
    this.progressBar.setVisible(false);
    this.progressBarBg.setVisible(false);
    this.sprite.clearTint();
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setAlpha(1);
  }

  getQueueInfo() {
    return {
      current: this.currentProduction?.type.name,
      progress: this.currentProduction ? 
        Math.floor(this.currentProduction.progress / this.currentProduction.time * 100) : 0,
      queue: this.productionQueue.map(item => item.type.name)
    };
  }
}

// Контроллер лаборатории
export class ResearchLabController extends BuildingController {
  constructor(scene, x, y, buildingType) {
    super(scene, x, y, buildingType);
    this.researchQueue = [];
    this.maxQueueSize = 3;
    this.researching = false;
    
    // Доступные улучшения
    this.availableUpgrades = [
      {
        id: 'woodGathering',
        name: 'Улучшенная добыча дерева',
        cost: { wood: 100, gold: 50 },
        bonus: { woodGatheringSpeed: 1.2 },
        researchTime: 30,
        prerequisites: []
      },
      {
        id: 'stoneGathering',
        name: 'Улучшенная добыча камня',
        cost: { stone: 100, gold: 50 },
        bonus: { stoneGatheringSpeed: 1.2 },
        researchTime: 30,
        prerequisites: []
      },
      // Добавьте другие улучшения по необходимости
    ];
  }

  canResearch(upgradeId) {
    const upgrade = this.availableUpgrades.find(u => u.id === upgradeId);
    if (!upgrade) return false;
    
    return this.researchQueue.length < this.maxQueueSize &&
           this.scene.playerController.hasResources(upgrade.cost) &&
           upgrade.prerequisites.every(preReqId => 
             this.scene.playerController.hasResearch(preReqId)
           );
  }

  queueResearch(upgradeId) {
    if (!this.canResearch(upgradeId)) return false;
    
    const upgrade = this.availableUpgrades.find(u => u.id === upgradeId);
    
    // Списываем ресурсы
    this.scene.playerController.spendResources(upgrade.cost);
    
    // Добавляем в очередь
    this.researchQueue.push({
      upgrade,
      progress: 0
    });
    
    if (!this.researching) this.startResearch();
    return true;
  }

  startResearch() {
    if (this.researchQueue.length === 0 || this.researching) return;
    
    this.researching = true;
    this.state = BUILDING_STATES.PRODUCING;
    this.progressBar.setVisible(true);
    this.progressBarBg.setVisible(true);
  }

  update(time, delta) {
    super.update(time, delta);
    
    if (this.state !== BUILDING_STATES.PRODUCING || this.researchQueue.length === 0) return;
    
    const currentResearch = this.researchQueue[0];
    currentResearch.progress += delta / 1000;
    
    // Обновляем прогресс-бар
    const progress = currentResearch.progress / currentResearch.upgrade.researchTime;
    this.progressBar.width = (this.type.size * 32 - 8) * progress;
    
    if (currentResearch.progress >= currentResearch.upgrade.researchTime) {
      this.completeResearch(currentResearch);
    }
  }

  completeResearch(research) {
    // Применяем улучшение
    this.scene.playerController.addResearch(research.upgrade);
    
    // Удаляем из очереди
    this.researchQueue.shift();
    
    if (this.researchQueue.length > 0) {
      // Начинаем следующее исследование
      this.startResearch();
    } else {
      // Очередь пуста
      this.researching = false;
      this.state = BUILDING_STATES.IDLE;
      this.progressBar.setVisible(false);
      this.progressBarBg.setVisible(false);
    }
  }
}

export default {
  BuildingController,
  StorageBuildingController,
  UnitFactoryController,
  ResearchLabController,
  BUILDING_STATES
}; 