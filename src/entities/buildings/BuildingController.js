import { BaseUnit, WorkerUnit, CombatUnit } from '../units/BaseUnit.js';

// Состояния здания
export const BUILDING_STATES = {
  CONSTRUCTION: 'construction',
  IDLE: 'idle',
  PRODUCING: 'producing',
  DESTROYED: 'destroyed'
};

// Типы зданий
export const BUILDING_TYPES = {
  STORAGE: 'storage',
  UNIT_FACTORY: 'unitFactory',
  RESEARCH: 'research',
  DEFENSE: 'defense'
};

// Иконки для типов зданий
const BUILDING_ICONS = {
  [BUILDING_TYPES.STORAGE]: '🏠',
  [BUILDING_TYPES.UNIT_FACTORY]: '⚔️',
  [BUILDING_TYPES.RESEARCH]: '📚',
  [BUILDING_TYPES.DEFENSE]: '🛡️'
};

// Базовый класс для всех зданий
export class BuildingController {
  constructor(scene, x, y, buildingType) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.type = buildingType;
    
    // Создаем систему частиц
    this.particles = scene.add.particles('particle');
    
    // Инициализация состояния
    this.state = BUILDING_STATES.CONSTRUCTION;
    this.constructionProgress = 0;
    this.constructionTime = buildingType.buildTime || 5;
    this.hp = this.maxHP = buildingType.hp || 100;
    
    // Создаем визуальные элементы
    this.createVisuals();
    
    // Анимация строительства
    this.startConstructionAnimation();
  }

  // Возвращает тип здания
  getBuildingType() {
    return this.type.type || null;
  }

  // Проверяет, является ли здание определенного типа
  isBuildingType(type) {
    return this.getBuildingType() === type;
  }

  // Возвращает правильный контроллер для этого здания
  static createController(scene, x, y, buildingType) {
    switch (buildingType.type) {
      case BUILDING_TYPES.STORAGE:
        return new StorageBuildingController(scene, x, y, buildingType);
      case BUILDING_TYPES.UNIT_FACTORY:
        return new UnitFactoryController(scene, x, y, buildingType);
      case BUILDING_TYPES.RESEARCH:
        return new ResearchLabController(scene, x, y, buildingType);
      default:
        return new BuildingController(scene, x, y, buildingType);
    }
  }

  // Проверяет, является ли здание фабрикой юнитов
  isUnitFactory() {
    return this.isBuildingType(BUILDING_TYPES.UNIT_FACTORY);
  }

  // Проверяет, является ли здание складом
  isStorage() {
    return this.isBuildingType(BUILDING_TYPES.STORAGE);
  }

  // Проверяет, является ли здание исследовательской лабораторией
  isResearchLab() {
    return this.isBuildingType(BUILDING_TYPES.RESEARCH);
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

    // Начальное состояние для строительства
    if (this.state === BUILDING_STATES.CONSTRUCTION) {
      this.container.setAlpha(0.7);
      this.border.setStrokeStyle(2, 0xffff00, 1);
    }

    // Создаем контейнер для кнопок улучшений
    this.upgradePanel = this.scene.add.container(
      (this.x + this.type.size) * 32 + 10, 
      this.y * 32
    );
    this.upgradePanel.setVisible(false);

    // Фон панели
    this.upgradePanelBg = this.scene.add.rectangle(
      0,
      0,
      120,
      32 * this.type.size,
      0x000000,
      0.7
    );
    this.upgradePanelBg.setOrigin(0, 0);
    this.upgradePanel.add(this.upgradePanelBg);

    // Создаем кнопки улучшений
    this.upgradeButtons = [];
    if (this.type.upgrades) {
      let yOffset = 10;
      for (const upgrade of this.type.upgrades) {
        const button = this.scene.add.container(10, yOffset);
        
        // Фон кнопки
        const buttonBg = this.scene.add.rectangle(0, 0, 100, 30, 0x444444);
        buttonBg.setOrigin(0, 0);
        button.add(buttonBg);
        
        // Иконка улучшения
        if (upgrade.icon) {
          const icon = this.scene.add.image(5, 15, upgrade.icon);
          icon.setScale(0.8);
          button.add(icon);
        }
        
        // Текст улучшения
        const text = this.scene.add.text(35, 8, upgrade.name, {
          fontSize: '12px',
          color: '#ffffff'
        });
        button.add(text);
        
        // Стоимость
        const cost = this.scene.add.text(35, 20, `${upgrade.cost}`, {
          fontSize: '10px',
          color: '#ffff00'
        });
        button.add(cost);
        
        // Интерактивность
        buttonBg.setInteractive();
        buttonBg.on('pointerover', () => {
          buttonBg.setFillStyle(0x666666);
        });
        buttonBg.on('pointerout', () => {
          buttonBg.setFillStyle(0x444444);
        });
        buttonBg.on('pointerdown', () => {
          if (this.scene.playerController.canAfford(upgrade.cost)) {
            this.applyUpgrade(upgrade);
            this.scene.playerController.spendResources(upgrade.cost);
          }
        });
        
        this.upgradePanel.add(button);
        this.upgradeButtons.push(button);
        yOffset += 40;
      }
    }
  }

  startConstructionAnimation() {
    // Анимация появления
    this.scene.tweens.add({
      targets: this.container,
      scaleY: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.easeOut'
    });

    // Частицы строительства
    this.constructionParticles = this.particles.emit('particle', {
      x: this.x * 32 + this.type.size * 16,
      y: this.y * 32 + this.type.size * 16,
      speed: { min: -50, max: 50 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 1000,
      quantity: 2,
      frequency: 100,
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
    if (this.constructionParticles) {
      this.constructionParticles.stop();
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
    this.particles.emit('particle', {
      x: this.x * 32 + this.type.size * 16,
      y: this.y * 32 + this.type.size * 16,
      speed: { min: 50, max: 100 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 800,
      quantity: 20,
      tint: 0xffff00
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
    this.particles.emit('particle', {
      x: this.x * 32 + this.type.size * 16,
      y: this.y * 32 + this.type.size * 16,
      speed: { min: 50, max: 100 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 500,
      quantity: Math.ceil(amount / 10),
      tint: 0xff0000
    });

    if (this.hp === 0 && oldHp > 0) {
      this.destroy();
    }
  }

  destroy() {
    this.state = BUILDING_STATES.DESTROYED;
    
    // Большой взрыв
    this.particles.emit('particle', {
      x: this.x * 32 + this.type.size * 16,
      y: this.y * 32 + this.type.size * 16,
      speed: { min: 100, max: 200 },
      scale: { start: 2, end: 0 },
      blendMode: 'ADD',
      lifespan: 1000,
      quantity: 50,
      tint: [0xff0000, 0xff8800, 0xffff00]
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
    this.productionParticles = this.particles.emit('particle', {
      x: this.x * 32 + this.type.size * 16,
      y: this.y * 32 + this.type.size * 16,
      speed: { min: 20, max: 40 },
      scale: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      frequency: 500,
      tint: 0x00ffff
    });
  }

  stopProduction() {
    if (this.productionParticles) {
      this.productionParticles.stop();
    }
    this.state = BUILDING_STATES.IDLE;
    this.progressBar.setVisible(false);
    this.progressBarBg.setVisible(false);
    this.border.setStrokeStyle(2, 0xffffff, 0.5);
  }

  select() {
    // Подсвечиваем выбранное здание
    this.border.setStrokeStyle(2, 0xffff00, 1);
    
    // Показываем панель улучшений
    if (this.type.upgrades && this.type.upgrades.length > 0) {
      this.upgradePanel.setVisible(true);
      
      // Обновляем доступность кнопок
      this.upgradeButtons.forEach((button, index) => {
        const upgrade = this.type.upgrades[index];
        const canAfford = this.scene.playerController.canAfford(upgrade.cost);
        
        // Визуально отображаем доступность улучшения
        const buttonBg = button.getAt(0);
        buttonBg.setFillStyle(canAfford ? 0x444444 : 0x222222);
        
        // Обновляем интерактивность
        if (canAfford) {
          buttonBg.setInteractive();
        } else {
          buttonBg.disableInteractive();
        }
      });
    }
  }

  deselect() {
    // Убираем подсветку
    this.border.setStrokeStyle(2, 0xffffff, 0.5);
    
    // Скрываем панель улучшений
    if (this.upgradePanel) {
      this.upgradePanel.setVisible(false);
    }
  }

  applyUpgrade(upgrade) {
    // Применяем эффекты улучшения
    if (upgrade.effects) {
      for (const [key, value] of Object.entries(upgrade.effects)) {
        if (typeof this[key] === 'number') {
          this[key] *= value;
        } else {
          this[key] = value;
        }
      }
    }

    // Визуальный эффект применения улучшения
    this.scene.tweens.add({
      targets: this.container,
      scaleX: { from: 1, to: 1.1 },
      scaleY: { from: 1, to: 1.1 },
      duration: 200,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    // Эффект частиц улучшения
    this.particles.emit('particle', {
      x: this.x * 32 + this.type.size * 16,
      y: this.y * 32 + this.type.size * 16,
      speed: { min: 50, max: 100 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 800,
      quantity: 20,
      tint: 0x00ff00
    });
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
    this.type = buildingType;
    this.maxQueueSize = buildingType.maxQueueSize || 5;
    this.unitLimitBonus = buildingType.unitLimitBonus || 0;
  }

  canQueueUnit(unitData) {
    if (!unitData) return false;
    
    // Проверяем, не превышен ли размер очереди
    if (this.productionQueue.length >= this.maxQueueSize) {
      return false;
    }
    
    // Проверяем наличие ресурсов
    return this.scene.playerController.hasResources(unitData.cost);
  }

  queueUnit(unitData) {
    if (!this.canQueueUnit(unitData)) return false;
    
    // Списываем ресурсы
    this.scene.playerController.spendResources(unitData.cost);
    
    // Добавляем в очередь
    this.productionQueue.push({
      type: unitData,
      progress: 0,
      buildTime: unitData.buildTime || 5
    });
    
    return true;
  }

  update(time, delta) {
    super.update(time, delta);
    
    if (this.state !== BUILDING_STATES.IDLE) return;
    
    // Если есть юниты в очереди
    if (this.productionQueue.length > 0) {
      const current = this.productionQueue[0];
      current.progress += delta / 1000;
      
      // Обновляем прогресс-бар
      this.progressBar.setVisible(true);
      this.progressBarBg.setVisible(true);
      const progress = current.progress / current.buildTime;
      this.progressBar.setScale(progress, 1);
      
      // Если юнит готов
      if (current.progress >= current.buildTime) {
        // Создаем юнита
        const spawnX = (this.x + this.type.size) * 32;
        const spawnY = (this.y + this.type.size/2) * 32;
        
        let unit;
        switch(current.type.class) {
          case 'worker':
            unit = new WorkerUnit(this.scene, spawnX, spawnY, current.type);
            break;
          case 'combat':
            unit = new CombatUnit(this.scene, spawnX, spawnY, current.type);
            break;
          default:
            unit = new BaseUnit(this.scene, spawnX, spawnY, current.type);
        }
        
        // Добавляем юнита в контроллер игрока
        this.scene.playerController.addUnit(unit);
        
        // Удаляем из очереди
        this.productionQueue.shift();
        
        // Если очередь пуста, скрываем прогресс-бар
        if (this.productionQueue.length === 0) {
          this.progressBar.setVisible(false);
          this.progressBarBg.setVisible(false);
        }
      }
    }
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
  BUILDING_STATES,
  BUILDING_TYPES
}; 