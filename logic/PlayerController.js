import resourceManager from './ResourceManager.js';
import { BUILDINGS } from './Buildings.js';
import { BuildingController, StorageBuildingController, UnitFactoryController, ResearchLabController } from './BuildingController.js';

export default class PlayerController {
  constructor(scene) {
    this.scene = scene;
    
    // Состояние игрока
    this.state = {
      buildings: [],        // Список построек игрока
      units: [],           // Список юнитов игрока
      resources: {},       // Текущие ресурсы
      buildQueue: [],      // Очередь строительства
      missionGoals: [],    // Цели миссии
      missionFailed: false, // Флаг провала миссии
      missionComplete: false, // Флаг выполнения миссии
      research: new Set(),  // Исследованные улучшения
      unitLimit: 10,       // Базовый лимит юнитов
      resourceLimits: {    // Базовые лимиты ресурсов
        wood: 1000,
        stone: 1000,
        gold: 1000,
        food: 1000
      }
    };
    
    // Инициализация начальных ресурсов
    this.initResources();
  }

  // --- Управление ресурсами ---
  initResources() {
    this.state.resources = {
      wood: 400,
      stone: 300,
      gold: 200,
      food: 500
    };
    this.updateResourceDisplay();
  }

  getResources() {
    return this.state.resources;
  }

  hasResources(cost) {
    for (const res in cost) {
      if (this.state.resources[res] < cost[res]) return false;
    }
    return true;
  }

  spendResources(cost) {
    if (!this.hasResources(cost)) return false;
    for (const res in cost) {
      this.state.resources[res] -= cost[res];
    }
    this.updateResourceDisplay();
    return true;
  }

  addResources(resources) {
    for (const res in resources) {
      this.state.resources[res] = (this.state.resources[res] || 0) + resources[res];
    }
    this.updateResourceDisplay();
  }

  updateResourceDisplay() {
    if (this.scene.resText) {
      this.scene.resText.setText(this.getResourceString());
    }
  }

  getResourceString() {
    return Object.entries(this.state.resources)
      .map(([k, v]) => `${k}: ${v}`)
      .join('   ');
  }

  // --- Управление постройками ---
  createBuilding(buildingType, x, y) {
    const buildingData = BUILDINGS.find(b => b.id === buildingType);
    if (!buildingData) return null;

    // Проверяем ресурсы
    if (!this.hasResources(buildingData.cost)) return null;

    // Создаем соответствующий контроллер
    let building;
    switch (buildingData.type) {
      case 'storage':
        building = new StorageBuildingController(this.scene, x, y, buildingData);
        break;
      case 'unitFactory':
        building = new UnitFactoryController(this.scene, x, y, buildingData);
        break;
      case 'research':
        building = new ResearchLabController(this.scene, x, y, buildingData);
        break;
      default:
        building = new BuildingController(this.scene, x, y, buildingData);
    }

    // Списываем ресурсы
    this.spendResources(buildingData.cost);

    // Добавляем здание
    this.addBuilding(building);

    // Обновляем лимиты
    this.updateLimits();

    return building;
  }

  addBuilding(building) {
    this.state.buildings.push(building);
    this.updateLimits();
    this.checkMissionGoals();
  }

  removeBuilding(building) {
    const index = this.state.buildings.indexOf(building);
    if (index !== -1) {
      this.state.buildings.splice(index, 1);
      this.updateLimits();
      this.checkMissionGoals();
    }
  }

  getBuildingsByType(type) {
    return this.state.buildings.filter(b => b.type.id === type);
  }

  updateLimits() {
    // Сбрасываем к базовым значениям
    this.state.unitLimit = 10;
    this.state.resourceLimits = {
      wood: 1000,
      stone: 1000,
      gold: 1000,
      food: 1000
    };

    // Учитываем бонусы от зданий
    for (const building of this.state.buildings) {
      if (building.state === 'destroyed') continue;

      // Бонус к лимиту юнитов от фабрик
      if (building instanceof UnitFactoryController) {
        this.state.unitLimit += building.unitLimitBonus;
      }

      // Бонус к лимиту ресурсов от складов
      if (building instanceof StorageBuildingController) {
        const limits = building.getResourceLimits();
        for (const res in limits) {
          this.state.resourceLimits[res] += limits[res];
        }
      }
    }
  }

  // --- Управление исследованиями ---
  hasResearch(researchId) {
    return this.state.research.has(researchId);
  }

  addResearch(research) {
    this.state.research.add(research.id);
    
    // Применяем бонусы исследования
    if (research.bonus) {
      // TODO: Применить бонусы к соответствующим параметрам
      // Например, увеличить скорость сбора ресурсов
    }
  }

  // --- Управление юнитами ---
  canCreateUnit(unitType) {
    return this.state.units.length < this.state.unitLimit;
  }

  createUnitNearBuilding(unitType, building) {
    if (!this.canCreateUnit(unitType)) return null;

    // Находим свободную позицию рядом со зданием
    const pos = this.findFreePositionNearBuilding(building);
    if (!pos) return null;

    // Создаем юнита
    const unit = this.scene.createUnit(unitType, pos.x, pos.y);
    if (unit) {
      this.addUnit(unit);
    }
    return unit;
  }

  findFreePositionNearBuilding(building) {
    const positions = [
      { x: building.x - 1, y: building.y },
      { x: building.x + building.type.size, y: building.y },
      { x: building.x, y: building.y - 1 },
      { x: building.x, y: building.y + building.type.size }
    ];

    // Проверяем каждую позицию
    for (const pos of positions) {
      if (this.scene.isPositionFree(pos.x, pos.y)) {
        return pos;
      }
    }
    return null;
  }

  addUnit(unit) {
    this.state.units.push(unit);
    this.checkMissionGoals();
  }

  removeUnit(unit) {
    const index = this.state.units.indexOf(unit);
    if (index !== -1) {
      this.state.units.splice(index, 1);
      this.checkMissionGoals();
    }
  }

  getUnitsByType(type) {
    return this.state.units.filter(u => u.type.id === type);
  }

  // --- Управление целями миссии ---
  setMissionGoals(goals) {
    this.state.missionGoals = goals.map(goal => ({
      ...goal,
      completed: false,
      failed: false
    }));
  }

  checkMissionGoals() {
    let allCompleted = true;
    let anyFailed = false;

    for (const goal of this.state.missionGoals) {
      switch (goal.type) {
        case 'BUILD_COUNT':
          goal.completed = this.getBuildingsByType(goal.buildingType).length >= goal.count;
          goal.failed = goal.failOnLess && this.getBuildingsByType(goal.buildingType).length < goal.count;
          break;
          
        case 'UNIT_COUNT':
          goal.completed = this.getUnitsByType(goal.unitType).length >= goal.count;
          goal.failed = goal.failOnLess && this.getUnitsByType(goal.unitType).length < goal.count;
          break;
          
        case 'RESOURCE_AMOUNT':
          goal.completed = this.state.resources[goal.resource] >= goal.amount;
          goal.failed = goal.failOnLess && this.state.resources[goal.resource] < goal.amount;
          break;
          
        case 'SURVIVE_TIME':
          goal.completed = this.scene.time.now >= goal.time;
          break;
          
        case 'DESTROY_ENEMY':
          goal.completed = this.scene.aiEnemies.every(ai => 
            ai.strategist.getAllUnits().length === 0 && 
            ai.strategist.getAllBuildings().length === 0
          );
          break;
      }

      if (!goal.completed) allCompleted = false;
      if (goal.failed) anyFailed = true;
    }

    // Проверяем условия победы/поражения
    if (allCompleted && !this.state.missionComplete) {
      this.missionComplete();
    }
    if (anyFailed && !this.state.missionFailed) {
      this.missionFailed();
    }
  }

  missionComplete() {
    this.state.missionComplete = true;
    this.scene.showMessage('Миссия выполнена!');
    // Можно добавить дополнительную логику победы
  }

  missionFailed() {
    this.state.missionFailed = true;
    this.scene.showMessage('Миссия провалена!');
    // Можно добавить дополнительную логику поражения
  }

  // --- Обновление состояния ---
  update(time, delta) {
    // Обновляем состояние целей, зависящих от времени
    this.checkMissionGoals();
    
    // Обновляем состояние построек
    for (const building of this.state.buildings) {
      if (building.update) building.update(time, delta);
    }
    
    // Обновляем состояние юнитов
    for (const unit of this.state.units) {
      if (unit.update) unit.update(time, delta);
    }
  }
} 