// logic/AI.js
// Модуль логики ИИ противника для RTS
import { BUILDINGS } from './Buildings.js';
import { UNITS } from './Units.js';
import PathfindingController from './PathfindingController.js';

export default class AIEnemy {
  constructor(scene, base) {
    this.scene = scene; // ссылка на MissionScene
    this.base = base;   // {x, y, rect, label}
    this.resources = { золото: 500, дерево: 300, камень: 200, металл: 100 };
    this.buildings = [];
    this.units = [];
    this.buildQueue = [];
    this.unitQueue = [];
    this.lastActionTime = 0;
    this.alerted = false; // первый контакт
    this.patrolPoints = [];
    // --- Память ИИ ---
    this.knownPlayerBuildings = [];
    this.knownPlayerUnits = [];
    this.knownPlayerBuildingsTimestamps = new Map(); // b -> lastSeenTimestamp
    this.knownPlayerUnitsTimestamps = new Map(); // u -> lastSeenTimestamp
    this.globalPatrolPoints = [];
    this.pathfinder = new PathfindingController();
  }

  update(dt, time) {
    // Простейший цикл: строим здания, создаём юнитов, атакуем
    if (time - this.lastActionTime > 2) {
      this.lastActionTime = time;
      this.tryBuild();
      this.tryCreateUnits();
      this.tryAttack();
    }
    // Добыча ресурсов рабочими
    this.updateWorkers(dt);
    this.updateCombatUnits(dt);
    this.updateMemory();
  }

  tryBuild() {
    // Пример: если мало зданий — строим новое
    if (this.buildings.length < 2 && this.canAfford(BUILDINGS[0])) {
      this.buildBuilding(BUILDINGS[0]);
    }
    // Можно добавить логику выбора типа здания
  }

  buildBuilding(buildingType) {
    // Простейшее размещение рядом с базой
    const tileX = this.base.x + 2 + Math.floor(Math.random() * 3);
    const tileY = this.base.y + 2 + Math.floor(Math.random() * 3);
    // TODO: проверка на занятость клетки и тип тайла
    this.resourcesSpend(buildingType.cost);
    // Визуализация здания ИИ
    const size = buildingType.size * 32;
    const px = tileX * 32 + size / 2;
    const py = tileY * 32 + size / 2;
    const rect = this.scene.add.rectangle(px, py, size, size, 0x8B2222).setAlpha(0.7).setDepth(25);
    const border = this.scene.add.rectangle(px, py, size, size).setStrokeStyle(3, 0xff4444).setAlpha(0.7).setDepth(26);
    const label = this.scene.add.text(px, py, buildingType.name, { fontSize: '14px', color: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(27);
    // --- Добавляем HP и полоску HP ---
    const maxHP = buildingType.maxHP || 300;
    const hpBarBg = this.scene.add.rectangle(px, py - size / 2 + 12, size - 8, 8, 0x444444).setDepth(28);
    const hpBar = this.scene.add.rectangle(px, py - size / 2 + 12, size - 8, 8, 0x00ff00).setDepth(29);
    const building = { x: tileX, y: tileY, type: buildingType, rect, border, label, size: buildingType.size, maxHP, hp: maxHP, hpBar, hpBarBg };
    this.buildings.push(building);
  }

  tryCreateUnits() {
    // Считаем боевых юнитов
    const combatTypes = ['soldier', 'tank'];
    let combatCount = this.units.filter(u => combatTypes.includes(u.type.id)).length;
    // До первого контакта — максимум 3 боевых юнита
    if (!this.alerted && combatCount >= 3) return;
    // После первого контакта — можно строить сколько угодно
    // Строим рабочих, если мало
    const workerType = UNITS.find(u => u.id === 'worker');
    const workerCount = this.units.filter(u => u.type.id === 'worker').length;
    if (workerCount < 3 && this.buildings.length > 0 && this.canAfford(workerType)) {
      this.resourcesSpend(workerType.cost);
      const px = this.base.x * 32 + 64 + Math.random() * 16 - 8;
      const py = this.base.y * 32 + 64 + Math.random() * 16 - 8;
      const color = 0xcccccc;
      const sprite = this.scene.add.circle(px, py, 16, color).setDepth(35);
      const label = this.scene.add.text(px, py, workerType.name, { fontSize: '12px', color: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(36);
      const maxHP = workerType.maxHP || 40;
      const hp = maxHP;
      const hpBarBg = this.scene.add.rectangle(px, py - 22, 32, 6, 0x444444).setDepth(37);
      const hpBar = this.scene.add.rectangle(px, py - 22, 32, 6, 0x00ff00).setDepth(38);
      this.units.push({ x: px, y: py, type: workerType, sprite, label, maxHP, hp, hpBar, hpBarBg });
    }
    // Строим боевых юнитов
    for (const combatId of combatTypes) {
      const combatType = UNITS.find(u => u.id === combatId);
      if (this.buildings.length > 0 && this.canAfford(combatType)) {
        if (!this.alerted && combatCount >= 3) break;
        this.resourcesSpend(combatType.cost);
        const px = this.base.x * 32 + 64 + Math.random() * 16 - 8;
        const py = this.base.y * 32 + 64 + Math.random() * 16 - 8;
        const color = combatType.id === 'soldier' ? 0xff4444 : 0x8888ff;
        const sprite = this.scene.add.circle(px, py, 16, color).setDepth(35);
        const label = this.scene.add.text(px, py, combatType.name, { fontSize: '12px', color: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(36);
        const maxHP = combatType.maxHP || 80;
        const hp = maxHP;
        const hpBarBg = this.scene.add.rectangle(px, py - 22, 32, 6, 0x444444).setDepth(37);
        const hpBar = this.scene.add.rectangle(px, py - 22, 32, 6, 0x00ff00).setDepth(38);
        this.units.push({ x: px, y: py, type: combatType, sprite, label, maxHP, hp, hpBar, hpBarBg });
        combatCount++;
      }
    }
    // --- Разведчики ---
    const scoutType = UNITS.find(u => u.id === 'scout');
    const scoutCount = this.units.filter(u => u.type.id === 'scout').length;
    if (scoutCount < 2 && this.buildings.length > 0 && this.canAfford(scoutType)) {
      this.resourcesSpend(scoutType.cost);
      const px = this.base.x * 32 + 64 + Math.random() * 16 - 8;
      const py = this.base.y * 32 + 64 + Math.random() * 16 - 8;
      const color = scoutType.color;
      const sprite = this.scene.add.circle(px, py, 14, color).setDepth(35);
      const label = this.scene.add.text(px, py, scoutType.name, { fontSize: '12px', color: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(36);
      const maxHP = scoutType.maxHP || 30;
      const hp = maxHP;
      const hpBarBg = this.scene.add.rectangle(px, py - 18, 28, 5, 0x444444).setDepth(37);
      const hpBar = this.scene.add.rectangle(px, py - 18, 28, 5, 0x00ff00).setDepth(38);
      this.units.push({ x: px, y: py, type: scoutType, sprite, label, maxHP, hp, hpBar, hpBarBg });
    }
  }

  tryAttack() {
    // Пример: если есть боевые юниты — отправляем в атаку
    // TODO: реализовать атаку
  }

  canAfford(obj) {
    for (const res in obj.cost) {
      if ((this.resources[res] || 0) < obj.cost[res]) return false;
    }
    return true;
  }

  resourcesSpend(cost) {
    for (const res in cost) {
      this.resources[res] = (this.resources[res] || 0) - cost[res];
    }
  }

  updateWorkers(dt) {
    for (const unit of this.units) {
      if (unit.type.id !== 'worker') continue;
      if (!unit.task) {
        // Назначаем задачу: найти ближайший ресурс
        const resObj = this.findNearestResource(unit);
        if (resObj && resObj.amount > 0) {
          unit.task = {
            state: 'to_resource',
            resourceObj: resObj,
            carried: 0,
            gatherTimer: 0
          };
          unit.target = { x: resObj.circ.x, y: resObj.circ.y };
        }
      }
      if (unit.task) {
        // Визуализация статуса
        if (!unit.statusLabel) {
          unit.statusLabel = this.scene.add.text(unit.x, unit.y - 28, '', { fontSize: '12px', color: '#ffb', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(60);
        }
        unit.statusLabel.x = unit.x;
        unit.statusLabel.y = unit.y - 28;
        let stateText = '';
        if (unit.task.state === 'to_resource') stateText = 'Идёт к ресурсу';
        else if (unit.task.state === 'gathering') stateText = `Добыча: ${unit.task.carried}/10`;
        else if (unit.task.state === 'to_base') stateText = `Несёт: ${unit.task.carried}`;
        unit.statusLabel.setText(stateText);
        unit.statusLabel.setVisible(true);
        // Логика задачи
        switch (unit.task.state) {
          case 'to_resource': {
            const dist = Phaser.Math.Distance.Between(unit.x, unit.y, unit.task.resourceObj.circ.x, unit.task.resourceObj.circ.y);
            if (dist > 2) {
              this.moveUnitByPath(unit, dt);
            } else {
              unit.task.state = 'gathering';
              unit.task.gatherTimer = 0;
              unit.target = null;
            }
            break;
          }
          case 'gathering': {
            unit.task.gatherTimer += dt;
            if (unit.task.gatherTimer > 1.5) {
              unit.task.gatherTimer = 0;
              unit.task.resourceObj.amount--;
              unit.task.carried++;
              // Визуально уменьшаем ресурс
              unit.task.resourceObj.circ.scale = Math.max(0.3, unit.task.resourceObj.amount / 500);
              if (unit.task.resourceObj.amount < 0) unit.task.resourceObj.amount = 0;
              if (this.scene.updateResourceLabels) this.scene.updateResourceLabels();
              if (unit.task.carried >= 10 || unit.task.resourceObj.amount <= 0) {
                // Идём к базе
                unit.task.state = 'to_base';
                unit.target = { x: this.base.rect.x, y: this.base.rect.y };
              }
            }
            break;
          }
          case 'to_base': {
            const dist = Phaser.Math.Distance.Between(unit.x, unit.y, this.base.rect.x, this.base.rect.y);
            if (dist > 2) {
              this.moveUnitByPath(unit, dt);
            } else {
              // Пополняем ресурсы ИИ
              this.resources[unit.task.resourceObj.type] = (this.resources[unit.task.resourceObj.type] || 0) + unit.task.carried;
              unit.task.carried = 0;
              // Возвращаемся к ресурсу, если он ещё есть
              if (unit.task.resourceObj.amount > 0) {
                unit.task.state = 'to_resource';
                unit.target = { x: unit.task.resourceObj.circ.x, y: unit.task.resourceObj.circ.y };
              } else {
                unit.statusLabel.setVisible(false);
                unit.task = null;
              }
            }
            break;
          }
        }
      }
    }
  }

  moveUnitByPath(unit, dt) {
    if (unit.path && unit.pathStep < unit.path.length) {
      const next = unit.path[unit.pathStep];
      const tx = next.x * 32 + 16;
      const ty = next.y * 32 + 16;
      const dx = tx - unit.x, dy = ty - unit.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const speed = unit.type.speed || 70;
      if (dist > 2) {
        const move = Math.min(speed * dt, dist);
        unit.x += (dx / dist) * move;
        unit.y += (dy / dist) * move;
        unit.sprite.x = unit.x;
        unit.sprite.y = unit.y;
        unit.label.x = unit.x;
        unit.label.y = unit.y;
        if (unit.hpBar && unit.hpBarBg) {
          let offset = -22;
          if (unit.type.id === 'scout') offset = -18;
          unit.hpBar.x = unit.x;
          unit.hpBar.y = unit.y + offset;
          unit.hpBarBg.x = unit.x;
          unit.hpBarBg.y = unit.y + offset;
        }
        if (unit.statusLabel) {
          unit.statusLabel.x = unit.x;
          unit.statusLabel.y = unit.y - 28;
        }
      } else {
        unit.x = tx; unit.y = ty;
      }
      unit.pathStep++;
      return true;
    }
    return false;
  }

  findNearestResource(unit) {
    let minDist = Infinity, found = null;
    for (const res of this.scene.resourceObjects) {
      if (res.amount > 0) {
        const d = Phaser.Math.Distance.Between(unit.x, unit.y, res.circ.x, res.circ.y);
        if (d < minDist) { minDist = d; found = res; }
      }
    }
    return found;
  }

  // --- Обновление памяти ИИ ---
  updateMemory() {
    // Для каждого боевого юнита: если видит здание/юнита игрока — добавить в память
    const now = Date.now();
    for (const unit of this.units) {
      if (unit.type.id !== 'soldier' && unit.type.id !== 'tank') continue;
      const vision = unit.type.vision || 100;
      // Здания игрока
      for (const b of this.scene.buildingsOnMap) {
        const cx = b.x * 32 + b.size * 32 / 2;
        const cy = b.y * 32 + b.size * 32 / 2;
        if (Phaser.Math.Distance.Between(unit.x, unit.y, cx, cy) < vision) {
          if (!this.knownPlayerBuildings.includes(b)) this.knownPlayerBuildings.push(b);
          this.knownPlayerBuildingsTimestamps.set(b, now);
        }
      }
      // Юниты игрока
      for (const u of this.scene.units) {
        if (Phaser.Math.Distance.Between(unit.x, unit.y, u.x, u.y) < vision) {
          if (!this.knownPlayerUnits.includes(u)) this.knownPlayerUnits.push(u);
          this.knownPlayerUnitsTimestamps.set(u, now);
        }
      }
    }
    // Удалять уничтоженные объекты из памяти
    this.knownPlayerBuildings = this.knownPlayerBuildings.filter(b => this.scene.buildingsOnMap.includes(b));
    this.knownPlayerUnits = this.knownPlayerUnits.filter(u => this.scene.units.includes(u));
    // Забывание целей: если не виден более 20 секунд — забыть
    const forgetTime = 20000;
    this.knownPlayerBuildings = this.knownPlayerBuildings.filter(b => {
      const t = this.knownPlayerBuildingsTimestamps.get(b) || 0;
      if (now - t < forgetTime) return true;
      this.knownPlayerBuildingsTimestamps.delete(b);
      return false;
    });
    this.knownPlayerUnits = this.knownPlayerUnits.filter(u => {
      const t = this.knownPlayerUnitsTimestamps.get(u) || 0;
      if (now - t < forgetTime) return true;
      this.knownPlayerUnitsTimestamps.delete(u);
      return false;
    });
  }

  // --- Боевые юниты: патруль и обнаружение ---
  updateCombatUnits(dt) {
    const activeResources = new Set();
    for (const unit of this.units) {
      if (unit.type.id === 'worker' && unit.task && unit.task.resourceObj) {
        activeResources.add(unit.task.resourceObj);
      }
    }
    // --- Патрульные точки ---
    let patrolZones = [];
    if (!this.alerted) {
      // До первого контакта: база и активные залежи
      patrolZones = [{ x: this.base.rect.x, y: this.base.rect.y, type: 'base' }];
      for (const res of activeResources) {
        patrolZones.push({ x: res.circ.x, y: res.circ.y, type: 'resource', res });
      }
    } else {
      // После первого контакта: патрулируем по всей карте (по точкам)
      if (this.globalPatrolPoints.length === 0) {
        // Сгенерировать точки по сетке (например, 8x8)
        const step = 4;
        for (let y = 2; y < 100; y += step) {
          for (let x = 2; x < 100; x += step) {
            this.globalPatrolPoints.push({ x: x * 32, y: y * 32, type: 'global' });
          }
        }
      }
      patrolZones = this.globalPatrolPoints;
    }

    for (const unit of this.units) {
      if (unit.type.id !== 'soldier' && unit.type.id !== 'tank') continue;
      // --- Патрулирование до первого контакта ---
      if (!this.alerted) {
        // Если нет патрульной зоны или зона устарела — назначить новую
        if (!unit.patrolZone || (unit.patrolZone.type === 'resource' && !activeResources.has(unit.patrolZone.res))) {
          unit.patrolZone = patrolZones[Math.floor(Math.random() * patrolZones.length)];
          unit.patrolAngle = Math.random() * Math.PI * 2;
          const R = 56;
          const tx = unit.patrolZone.x + Math.cos(unit.patrolAngle) * R;
          const ty = unit.patrolZone.y + Math.sin(unit.patrolAngle) * R;
          this.buildPathForUnit(unit, tx, ty);
        }
        this.moveUnitByPath(unit, dt);
      } else {
        // --- Патрулирование по всей карте после первого контакта ---
        if (!unit.patrolZone || unit.patrolZone.type !== 'global') {
          unit.patrolZone = patrolZones[Math.floor(Math.random() * patrolZones.length)];
          unit.patrolAngle = Math.random() * Math.PI * 2;
          const R = 56;
          const tx = unit.patrolZone.x + Math.cos(unit.patrolAngle) * R;
          const ty = unit.patrolZone.y + Math.sin(unit.patrolAngle) * R;
          this.buildPathForUnit(unit, tx, ty);
        }
        this.moveUnitByPath(unit, dt);
      }
      // --- Обнаружение врага ---
      const radius = unit.type.vision || 96;
      for (const playerUnit of this.scene.units) {
        if (Phaser.Math.Distance.Between(unit.x, unit.y, playerUnit.x, playerUnit.y) < radius) {
          this.triggerAlert();
          break;
        }
      }
      if (!this.alerted) continue;
      // --- Атака после первого контакта ---
      if (!unit.attackTarget || unit.attackTarget._destroyed) {
        // --- Приоритет: сначала ближайший вражеский юнит в радиусе 96, потом здания ---
        let target = null;
        // 1. Ближайший юнит игрока в радиусе 96 ИЗ ПАМЯТИ
        let minDist = Infinity;
        for (const u of this.knownPlayerUnits) {
          const d = Phaser.Math.Distance.Between(unit.x, unit.y, u.x, u.y);
          if (d < 96 && d < minDist) { minDist = d; target = u; }
        }
        // 2. Если нет юнитов в радиусе — атакуем ближайшее известное здание
        if (!target && this.knownPlayerBuildings.length > 0) {
          minDist = Infinity;
          for (const b of this.knownPlayerBuildings) {
            const cx = b.x * 32 + b.size * 32 / 2;
            const cy = b.y * 32 + b.size * 32 / 2;
            const d = Phaser.Math.Distance.Between(unit.x, unit.y, cx, cy);
            if (d < minDist) { minDist = d; target = b; }
          }
        }
        // 3. Если нет зданий — атакуем любого ближайшего известного юнита игрока (вне радиуса)
        if (!target && this.knownPlayerUnits.length > 0) {
          minDist = Infinity;
          for (const u of this.knownPlayerUnits) {
            const d = Phaser.Math.Distance.Between(unit.x, unit.y, u.x, u.y);
            if (d < minDist) { minDist = d; target = u; }
          }
        }
        // --- Групповая атака ---
        if (target) {
          let tx, ty;
          if (target.sprite) {
            tx = target.x;
            ty = target.y;
          } else {
            tx = target.x * 32 + target.size * 32 / 2;
            ty = target.y * 32 + target.size * 32 / 2;
          }
          // Считаем боевых юнитов ИИ в радиусе 100px от точки сбора (рядом с целью)
          let aiCount = 0;
          for (const u of this.units) {
            if (u.type.id === 'soldier' || u.type.id === 'tank') {
              if (Phaser.Math.Distance.Between(u.x, u.y, tx, ty) < 100) aiCount++;
            }
          }
          // Если своих меньше 3 — собираемся в точке сбора, не атакуем
          if (aiCount < 3) {
            unit.attackTarget = null;
            // Двигаемся к точке сбора (рядом с целью, но не вплотную)
            if (!unit.gatheringForAttack || Phaser.Math.Distance.Between(unit.x, unit.y, tx, ty) > 40) {
              unit.gatheringForAttack = true;
              unit.target = { x: tx + Math.random() * 40 - 20, y: ty + Math.random() * 40 - 20 };
            }
            return;
          }
          // --- Оценка сил перед атакой ---
          let playerCount = 0;
          for (const u of this.scene.units) {
            if (u.type.id === 'soldier' || u.type.id === 'tank') {
              if (Phaser.Math.Distance.Between(u.x, u.y, tx, ty) < 100) playerCount++;
            }
          }
          // Если своих меньше или равно — не атакуем, патрулируем
          if (aiCount <= playerCount) {
            unit.attackTarget = null;
            if (this.alerted && unit.patrolZone && unit.patrolZone.type === 'global') {
              unit.patrolZone = this.globalPatrolPoints[Math.floor(Math.random() * this.globalPatrolPoints.length)];
              unit.patrolAngle = Math.random() * Math.PI * 2;
            }
            return;
          }
          unit.attackTarget = target;
          unit.gatheringForAttack = false;
        } else {
          unit.attackTarget = null;
          unit.gatheringForAttack = false;
        }
      }
      // --- Реакция на атаку: защита зданий и рабочих ---
      if (unit.defendTarget && (!unit.defendTarget.hp || unit.defendTarget.hp <= 0)) {
        unit.defendTarget = null; // цель уничтожена
      }
      if (unit.defendTarget) {
        let tx, ty;
        if (unit.defendTarget.sprite) {
          tx = unit.defendTarget.x;
          ty = unit.defendTarget.y;
        } else {
          tx = unit.defendTarget.x * 32 + unit.defendTarget.size * 32 / 2;
          ty = unit.defendTarget.y * 32 + unit.defendTarget.size * 32 / 2;
        }
        // Если рядом есть вражеский юнит — атакуем его
        let closestEnemy = null, minDist = Infinity;
        for (const u of this.scene.units) {
          const d = Phaser.Math.Distance.Between(u.x, u.y, tx, ty);
          if (d < 80 && d < minDist) { minDist = d; closestEnemy = u; }
        }
        if (closestEnemy) {
          unit.attackTarget = closestEnemy;
        } else {
          // Просто держимся рядом с целью защиты
          unit.attackTarget = null;
          if (!unit.target || Phaser.Math.Distance.Between(unit.x, unit.y, tx, ty) > 32) {
            unit.target = { x: tx + Math.random() * 24 - 12, y: ty + Math.random() * 24 - 12 };
          }
        }
        this.moveUnitByPath(unit, dt);
        continue;
      }
      if (unit.target && !unit.attackTarget && !unit.defendTarget) {
        this.moveUnitByPath(unit, dt);
      }
      if (unit.type.id === 'soldier' || unit.type.id === 'tank' || unit.type.id === 'scout') {
        if (!unit.statusLabel) {
          unit.statusLabel = this.scene.add.text(unit.x, unit.y - 28, '', { fontSize: '12px', color: '#ffb', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(60);
        }
        unit.statusLabel.x = unit.x;
        unit.statusLabel.y = unit.y - 28;
        let statusText = '';
        if (unit.type.id === 'scout') {
          if (unit.scoutTarget && (!unit.target || (unit.target && unit.target === unit.scoutTarget))) {
            statusText = 'Разведка';
          } else if (unit.target && (!unit.scoutTarget || unit.target !== unit.scoutTarget)) {
            statusText = 'Убегает';
          } else {
            statusText = 'Ожидание';
          }
        } else if (unit.attackTarget) {
          statusText = 'Атака';
        } else if (unit.defendTarget) {
          statusText = 'Охрана';
        } else if (unit.target) {
          statusText = 'Отступление';
        } else if (unit.patrolZone) {
          statusText = 'Патруль';
        } else {
          statusText = 'Ожидание';
        }
        unit.statusLabel.setText(statusText);
        unit.statusLabel.setVisible(true);
      }
    }
    // --- Поведение разведчиков ---
    for (const unit of this.units) {
      if (unit.type.id !== 'scout') continue;
      // Двигается по точкам разведки (глобальные патрульные точки)
      if (!this.globalPatrolPoints || this.globalPatrolPoints.length === 0) continue;
      if (!unit.scoutTarget || Phaser.Math.Distance.Between(unit.x, unit.y, unit.scoutTarget.x, unit.scoutTarget.y) < 16) {
        unit.scoutTarget = this.globalPatrolPoints[Math.floor(Math.random() * this.globalPatrolPoints.length)];
      }
      const dx = unit.scoutTarget.x - unit.x;
      const dy = unit.scoutTarget.y - unit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = unit.type.speed || 120;
      if (dist > 2) {
        const move = Math.min(speed * dt, dist);
        unit.x += (dx / dist) * move;
        unit.y += (dy / dist) * move;
      }
      unit.sprite.x = unit.x;
      unit.sprite.y = unit.y;
      unit.label.x = unit.x;
      unit.label.y = unit.y;
      // --- Обновление полосок HP ---
      if (unit.hpBar && unit.hpBarBg) {
        let offset = -18;
        unit.hpBar.x = unit.x;
        unit.hpBar.y = unit.y + offset;
        unit.hpBarBg.x = unit.x;
        unit.hpBarBg.y = unit.y + offset;
      }
      // --- Обновление statusLabel ---
      if (unit.statusLabel) {
        unit.statusLabel.x = unit.x;
        unit.statusLabel.y = unit.y - 28;
      }
    }
    // --- Глобальное обновление полосок HP для всех юнитов ---
    for (const unit of this.units) {
      if (unit.hpBar && unit.hpBarBg) {
        let offset = -22;
        if (unit.type.id === 'scout') offset = -18;
        unit.hpBar.x = unit.x;
        unit.hpBar.y = unit.y + offset;
        unit.hpBarBg.x = unit.x;
        unit.hpBarBg.y = unit.y + offset;
      }
    }
  }

  triggerAlert() {
    if (!this.alerted) {
      this.alerted = true;
      // Можно добавить визуальное сообщение или эффект
    }
  }

  /**
   * Метод для реакции юнита ИИ на получение урона
   * @param {object} unit - юнит ИИ
   * @param {object} attacker - атакующий юнит (игрока)
   */
  onUnitDamaged(unit, attacker) {
    // Разведчик: всегда убегает в случайную точку, подальше от атакующего
    if (unit.type.id === 'scout') {
      const angle = Math.atan2(unit.y - attacker.y, unit.x - attacker.x) + (Math.random() - 0.5);
      const dist = 200 + Math.random() * 100;
      const tx = unit.x + Math.cos(angle) * dist;
      const ty = unit.y + Math.sin(angle) * dist;
      unit.target = { x: Phaser.Math.Clamp(tx, 0, 3200), y: Phaser.Math.Clamp(ty, 0, 3200) };
      unit.scoutTarget = unit.target;
      return;
    }
    // Рабочий: убегает к базе
    if (unit.type.id === 'worker') {
      unit.target = { x: this.base.rect.x, y: this.base.rect.y };
      return;
    }
    // Боевой юнит: всегда даёт отпор и зовёт подмогу
    if ((unit.type.id === 'soldier' || unit.type.id === 'tank')) {
      unit.attackTarget = attacker;
      unit.target = null;
      unit.defendTarget = null;
      // Призыв подмоги: все союзные боевые юниты в радиусе 100 тоже атакуют attacker
      for (const ally of this.units) {
        if ((ally.type.id === 'soldier' || ally.type.id === 'tank') && ally !== unit) {
          if (Phaser.Math.Distance.Between(ally.x, ally.y, unit.x, unit.y) < 100) {
            ally.attackTarget = attacker;
            ally.target = null;
            ally.defendTarget = null;
          }
        }
      }
    }
  }

  // Вспомогательная функция для построения пути
  buildPathForUnit(unit, tx, ty) {
    const map = this.scene.tileData;
    // Собираем препятствия (юниты, здания, ресурсы)
    const obstacles = new Set();
    for (const u of this.units) {
      if (u !== unit) {
        const ux = Math.floor(u.x / 32), uy = Math.floor(u.y / 32);
        obstacles.add(`${ux},${uy}`);
      }
    }
    for (const b of this.buildings) {
      for (let dx = 0; dx < b.size; dx++) for (let dy = 0; dy < b.size; dy++) {
        obstacles.add(`${b.x + dx},${b.y + dy}`);
      }
    }
    for (const res of this.scene.resourceObjects) {
      obstacles.add(`${res.x},${res.y}`);
    }
    let allowedTiles = new Set([0,3]);
    if (unit.type.id === 'tank') allowedTiles = new Set([0,3,2]);
    const from = { x: Math.floor(unit.x / 32), y: Math.floor(unit.y / 32) };
    const to = { x: Math.floor(tx / 32), y: Math.floor(ty / 32) };
    const path = this.pathfinder.findPath(unit, from, to, map, obstacles, allowedTiles);
    if (path) {
      unit.path = path;
      unit.pathStep = 0;
      return true;
    } else {
      unit.path = null;
      unit.pathStep = 0;
      return false;
    }
  }

  // Вспомогательная функция для визуализации всех маршрутов
  getAllUnitPaths() {
    return this.units
      .filter(u => u.path && u.path.length > 0)
      .map(u => u.path.map(p => ({ x: p.x * 32 + 16, y: p.y * 32 + 16 })));
  }
} 