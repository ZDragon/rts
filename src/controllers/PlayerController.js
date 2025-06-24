import { BUILDINGS } from '../entities/buildings/Buildings.js';
import { BuildingController, BUILDING_STATES } from '../entities/buildings/BuildingController.js';
import { BaseUnit, WorkerUnit, CombatUnit, UNIT_STATES } from '../entities/units/BaseUnit.js';
import { DEFAULT_STARTING_RESOURCES, DEFAULT_RESOURCE_LIMITS } from '../entities/resources/ResourceTypes.js';

export default class PlayerController {
  constructor(scene, base) {
    if (!scene) {
      throw new Error('PlayerController requires a valid scene');
    }
    this.scene = scene;
    this.base = base;
    
    // Состояние игрока
    this.state = {
      resources: { ...DEFAULT_STARTING_RESOURCES },
      resourceLimits: { ...DEFAULT_RESOURCE_LIMITS },
      buildings: [],
      units: [],
      unitLimit: 10, // Базовый лимит юнитов
      researched: new Set(),
      selectedUnits: [],
      buildQueue: [] // Добавляем очередь строительства
    };
    
    // Инициализация
    this.initResources();
  }

  // --- Управление ресурсами ---
  initResources() {
    // Обновляем отображение текущих ресурсов
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
      const newAmount = (this.state.resources[res] || 0) + resources[res];
      this.state.resources[res] = Math.min(newAmount, this.state.resourceLimits[res]);
    }
    this.updateResourceDisplay();
  }

  updateResourceDisplay() {
    if (!this.scene || !this.scene.resText) return;
    this.scene.resText.setText(this.getResourceString());
  }

  getResourceString() {
    return Object.entries(this.state.resources)
      .map(([k, v]) => `${k}: ${v}/${this.state.resourceLimits[k]}`)
      .join('   ');
  }

  // --- Управление постройками ---
  createBuilding(buildingType, x, y) {
    const buildingData = BUILDINGS.find(b => b.id === buildingType);
    if (!buildingData) {
      console.warn('Building type not found:', buildingType);
      return null;
    }

    // Проверяем ресурсы
    if (!this.hasResources(buildingData.cost)) {
      console.warn('Недостаточно ресурсов для строительства');
      return null;
    }

    // Создаем здание через фабричный метод
    const building = BuildingController.createController(this.scene, x, y, buildingData);

    // Списываем ресурсы
    this.spendResources(buildingData.cost);

    // Добавляем здание
    this.addBuilding(building);
    
    return building;
  }

  addBuilding(building) {
    // Добавляем здание в массив
    if (!this.state.buildings) {
      this.state.buildings = [];
    }
    
    this.state.buildings.push(building);
  }

  // Переопределяем геттер для зданий
  getBuildingsByType(type) {
    return this.state.buildings
      .filter(b => b.type.id === type);
  }

  removeBuilding(building) {
    const index = this.state.buildings.indexOf(building);
    if (index !== -1) {
      this.state.buildings.splice(index, 1);
    }
  }

  updateLimits() {
    // Сбрасываем к базовым значениям
    this.state.unitLimit = 10;
    this.state.resourceLimits = { ...DEFAULT_RESOURCE_LIMITS };

    // Учитываем бонусы от зданий
    for (const building of this.state.buildings) {
      if (building.state === BUILDING_STATES.DESTROYED || building.state === BUILDING_STATES.CONSTRUCTION) continue;

      // Бонус к лимиту юнитов от фабрик
      if (building.isUnitFactory()) {
        this.state.unitLimit += building.unitLimitBonus;
      }

      // Бонус к лимиту ресурсов от складов
      if (building.isStorage()) {
        const limits = building.getResourceLimits();
        for (const res in limits) {
          this.state.resourceLimits[res] += limits[res];
        }
      }
    }
  }

  // --- Управление исследованиями ---
  hasResearch(researchId) {
    return this.state.researched.has(researchId);
  }

  addResearch(research) {
    this.state.researched.add(research.id);
    
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

    // Создаем юнита соответствующего типа
    let unit;
    if (unitType.id === 'worker') {
      unit = new WorkerUnit(this.scene, pos.x, pos.y, unitType, this);
    } else if (unitType.canAttack) {
      unit = new CombatUnit(this.scene, pos.x, pos.y, unitType, this);
    } else {
      unit = new BaseUnit(this.scene, pos.x, pos.y, unitType, this);
    }

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
    if (!this.state.units) {
      this.state.units = [];
    }
    this.state.units.push(unit);
    return unit;
  }

  removeUnit(unit) {
    const index = this.state.units.indexOf(unit);
    if (index !== -1) {
      unit.destroy();
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
    // Обновляем состояние построек
    for (const building of this.state.buildings) {
      if (building.update) building.update(time, delta);
    }
    
    // Обновляем состояние юнитов
    for (const unit of this.state.units) {
      unit.update(time, delta);
    }

    // Удаляем мертвых юнитов
    this.state.units = this.state.units.filter(unit => {
      if (unit.state === UNIT_STATES.DEAD) {
        const selectedIndex = this.state.selectedUnits.indexOf(unit);
        if (selectedIndex !== -1) {
          this.state.selectedUnits.splice(selectedIndex, 1);
        }
        return false;
      }
      return true;
    });

    // Обновляем отображение ресурсов
    this.updateResourceDisplay();
    // Обновляем лимиты после добавления здания
    this.updateLimits();
  }

  orderUnit(unitType) {
    // Находим подходящую фабрику для производства
    const factory = this.state.buildings.find(building => 
      building.isUnitFactory() && 
      building.type.id === unitType.building &&
      building.state !== BUILDING_STATES.CONSTRUCTION
    );

    if (!factory) {
      console.warn(`Нет доступной фабрики типа ${unitType.building} для создания ${unitType.name}`);
      return false;
    }

    return factory.queueUnit(unitType, this);
  }

  getUnitFactories() {
    return this.state.buildings.filter(building => building.isUnitFactory());
  }

  calculateUnitLimit() {
    // Базовый лимит + бонус от каждой фабрики
    const factoryBonus = this.getUnitFactories()
      .filter(factory => factory.state !== BUILDING_STATES.CONSTRUCTION)
      .reduce((total, factory) => total + factory.unitLimit, 0);
    
    return this.state.unitLimit + factoryBonus;
  }

  // --- Управление выбором юнитов ---
  selectUnits(units) {
    // Снимаем выделение с предыдущих юнитов
    this.state.selectedUnits.forEach(unit => unit.setSelected(false));
    
    // Выделяем новых
    units.forEach(unit => unit.setSelected(true));
    this.state.selectedUnits = units;
  }

  getSelectedUnits() {
    return this.state.selectedUnits;
  }

  // --- Управление действиями юнитов ---
  moveUnits(units, target) {
    units.forEach(unit => unit.moveTo(target.x, target.y));
  }

  orderUnitsToAttack(units, target, targetType) {
    units.forEach(unit => {
      if (unit instanceof CombatUnit) {
        unit.setAttackTarget(target, targetType);
      }
    });
  }

  orderWorkersToGather(workers, resource, deposit) {
    workers.forEach(worker => {
      if (worker instanceof WorkerUnit) {
        worker.startGathering(resource, deposit);
      }
    });
  }

  // --- Управление очередью строительства ---
  addToBuildQueue(buildingObj) {
    this.state.buildQueue.push(buildingObj);
  }

  removeFromBuildQueue(buildingObj) {
    const index = this.state.buildQueue.indexOf(buildingObj);
    if (index !== -1) {
      this.state.buildQueue.splice(index, 1);
    }
  }

  getBuildQueue() {
    return this.state.buildQueue || [];
  }

  // Проверка возможности строительства на позиции
  canBuildHere(x, y, buildingType) {
    // Проверка границ карты
    const map = this.scene.tileData;
    const MAP_SIZE = map.length;
    const size = buildingType.size;
    if (x < 0 || y < 0 || x + size > MAP_SIZE || y + size > MAP_SIZE) {
      return false;
    }
    // Проверка типа тайла (например, только на траве)
    for (let ty = y; ty < y + size; ty++) {
      for (let tx = x; tx < x + size; tx++) {
        if (map[ty][tx] !== 0) return false;
      }
    }
    // Проверка пересечений с другими зданиями
    for (const building of this.state.buildings) {
      if (building.state === 'destroyed') continue;
      const bx = building.x, by = building.y, bsize = building.type.size;
      if (
        x + size > bx && x < bx + bsize &&
        y + size > by && y < by + bsize
      ) {
        return false;
      }
    }
    return true;
  }

  // --- Управление строительством ---
  queueBuildingConstruction(x, y, buildingType) {
    const buildingData = BUILDINGS.find(b => b.id === buildingType);
    if (!buildingData) {
      console.warn('Building type not found:', buildingType);
      return null;
    }

    const building = BuildingController.createController(
      this.scene,
      x,
      y,
      buildingData
    );

    // Добавляем здание
    this.addBuilding(building);
  }

  // --- Обработка правого клика ---
  handleRightClick(worldPoint, selectedUnits) {
    if (!selectedUnits || selectedUnits.length === 0) {
      return;
    }

    // Определяем цель клика
    const target = this.analyzeClickTarget(worldPoint);
    
    // Выполняем действия в зависимости от типа цели и юнитов
    switch (target.type) {
      case 'resource':
        // Только рабочие могут добывать ресурсы
        const workers = selectedUnits.filter(unit => unit.type.id === 'worker');
        if (workers.length > 0) {
          this.orderWorkersToGather(workers, target.resourceType, target.object);
          this.scene.showMessage(`Рабочие направлены к ${target.resourceType}`);
        }
        break;
        
      case 'enemy_unit':
        // Только боевые юниты могут атаковать
        const combatUnits = selectedUnits.filter(unit => unit.type.canAttack);
        if (combatUnits.length > 0) {
          this.orderUnitsToAttack(combatUnits, target.object, 'unit');
          this.scene.showMessage(`Атакуем вражеский юнит`);
        }
        break;
        
      case 'enemy_building':
        // Только боевые юниты могут атаковать здания
        const attackers = selectedUnits.filter(unit => unit.type.canAttack);
        if (attackers.length > 0) {
          this.orderUnitsToAttack(attackers, target.object, 'building');
          this.scene.showMessage(`Атакуем вражеское здание`);
        }
        break;
        
      case 'empty':
      default:
        // Все юниты могут двигаться к точке
        this.moveUnits(selectedUnits, worldPoint);
        this.scene.showMessage(`Юниты направлены к точке`);
        break;
    }
  }

  // Анализ цели клика
  analyzeClickTarget(worldPoint) {
    const CLICK_RADIUS = 32; // Радиус для определения клика по объекту

    // Проверяем клик по ресурсам
    if (this.scene.resourceDeposits) {
      for (const resource of this.scene.resourceDeposits) {
        const resourceWorldX = resource.x * 32 + 16; // Конвертируем тайловые в мировые
        const resourceWorldY = resource.y * 32 + 16;
        const distance = Phaser.Math.Distance.Between(
          worldPoint.x, worldPoint.y,
          resourceWorldX, resourceWorldY
        );
        if (distance < CLICK_RADIUS) {
          return {
            type: 'resource',
            object: resource,
            resourceType: resource.type
          };
        }
      }
    }

    // Проверяем клик по вражеским юнитам
    if (this.scene.aiEnemies) {
      for (const ai of this.scene.aiEnemies) {
        const enemyUnits = ai.strategist.getAllUnits();
        for (const enemyUnit of enemyUnits) {
          const distance = Phaser.Math.Distance.Between(
            worldPoint.x, worldPoint.y,
            enemyUnit.x, enemyUnit.y
          );
          if (distance < CLICK_RADIUS) {
            return {
              type: 'enemy_unit',
              object: enemyUnit
            };
          }
        }
      }
    }

    // Проверяем клик по вражеским зданиям
    if (this.scene.aiEnemies) {
      for (const ai of this.scene.aiEnemies) {
        const enemyBuildings = ai.strategist.getAllBuildings();
        for (const enemyBuilding of enemyBuildings) {
          // Проверяем попадание в область здания
          const buildingX = enemyBuilding.x * 32; // TILE_SIZE
          const buildingY = enemyBuilding.y * 32;
          const buildingSize = enemyBuilding.type.size * 32;
          
          if (worldPoint.x >= buildingX && 
              worldPoint.x < buildingX + buildingSize &&
              worldPoint.y >= buildingY && 
              worldPoint.y < buildingY + buildingSize) {
            return {
              type: 'enemy_building',
              object: enemyBuilding
            };
          }
        }
      }
    }

    // Если ничего не найдено - это пустая точка
    return {
      type: 'empty',
      position: worldPoint
    };
  }
} 