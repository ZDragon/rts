// logic/AI.js
// Модуль логики ИИ противника для RTS
import { BUILDINGS } from './Buildings.js';
import { UNITS } from './Units.js';

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
      this.units.push({ x: px, y: py, type: workerType, sprite, label });
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
        this.units.push({ x: px, y: py, type: combatType, sprite, label });
        combatCount++;
      }
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
              this.moveUnitTo(unit, unit.task.resourceObj.circ.x, unit.task.resourceObj.circ.y, dt);
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
              this.moveUnitTo(unit, this.base.rect.x, this.base.rect.y, dt);
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

  moveUnitTo(unit, tx, ty, dt) {
    const dx = tx - unit.x;
    const dy = ty - unit.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 70;
    if (dist > 1) {
      const move = Math.min(speed * dt, dist);
      unit.x += (dx / dist) * move;
      unit.y += (dy / dist) * move;
      unit.sprite.x = unit.x;
      unit.sprite.y = unit.y;
      unit.label.x = unit.x;
      unit.label.y = unit.y;
    }
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

  // --- Боевые юниты: патруль и обнаружение ---
  updateCombatUnits(dt) {
    // Патрульные точки: база + только те залежи, с которых рабочие ИИ реально добывают ресурсы
    const activeResources = new Set();
    for (const unit of this.units) {
      if (unit.type.id === 'worker' && unit.task && unit.task.resourceObj) {
        activeResources.add(unit.task.resourceObj);
      }
    }
    // Формируем массив патрульных зон: база и активные залежи
    const patrolZones = [{ x: this.base.rect.x, y: this.base.rect.y, type: 'base' }];
    for (const res of activeResources) {
      patrolZones.push({ x: res.circ.x, y: res.circ.y, type: 'resource', res });
    }

    for (const unit of this.units) {
      if (unit.type.id !== 'soldier' && unit.type.id !== 'tank') continue;
      // --- Патрулирование до первого контакта ---
      if (!this.alerted) {
        // Если нет патрульной зоны или зона устарела — назначить новую
        if (!unit.patrolZone || (unit.patrolZone.type === 'resource' && !activeResources.has(unit.patrolZone.res))) {
          unit.patrolZone = patrolZones[Math.floor(Math.random() * patrolZones.length)];
          unit.patrolAngle = Math.random() * Math.PI * 2;
        }
        // Движение по окружности вокруг патрульной зоны
        const R = 56;
        unit.patrolAngle += 0.5 * dt; // скорость обхода
        const tx = unit.patrolZone.x + Math.cos(unit.patrolAngle) * R;
        const ty = unit.patrolZone.y + Math.sin(unit.patrolAngle) * R;
        this.moveUnitTo(unit, tx, ty, dt);
      }
      // --- Обнаружение врага ---
      const radius = 96;
      for (const playerUnit of this.scene.units) {
        if (Phaser.Math.Distance.Between(unit.x, unit.y, playerUnit.x, playerUnit.y) < radius) {
          this.triggerAlert();
          break;
        }
      }
      if (!this.alerted) continue;
      // --- Атака после первого контакта ---
      if (!unit.attackTarget || unit.attackTarget._destroyed) {
        // Выбор новой цели: сначала здания игрока, потом юниты
        let target = null;
        // 1. Здания игрока
        if (this.scene.buildingsOnMap && this.scene.buildingsOnMap.length > 0) {
          // Ищем ближайшее здание
          let minDist = Infinity;
          for (const b of this.scene.buildingsOnMap) {
            const cx = b.x * 32 + b.size * 32 / 2;
            const cy = b.y * 32 + b.size * 32 / 2;
            const d = Phaser.Math.Distance.Between(unit.x, unit.y, cx, cy);
            if (d < minDist) { minDist = d; target = b; }
          }
        }
        // 2. Если нет зданий — атакуем ближайшего юнита игрока
        if (!target && this.scene.units.length > 0) {
          let minDist = Infinity;
          for (const u of this.scene.units) {
            const d = Phaser.Math.Distance.Between(unit.x, unit.y, u.x, u.y);
            if (d < minDist) { minDist = d; target = u; }
          }
        }
        if (target) {
          unit.attackTarget = target;
        } else {
          unit.attackTarget = null;
        }
      }
      // Движение к цели и атака
      if (unit.attackTarget) {
        let tx, ty;
        if (unit.attackTarget.sprite) {
          tx = unit.attackTarget.x;
          ty = unit.attackTarget.y;
        } else {
          // Здание: вычисляем центр
          tx = unit.attackTarget.x * 32 + unit.attackTarget.size * 32 / 2;
          ty = unit.attackTarget.y * 32 + unit.attackTarget.size * 32 / 2;
        }
        const dist = Phaser.Math.Distance.Between(unit.x, unit.y, tx, ty);
        if (dist > 28) {
          this.moveUnitTo(unit, tx, ty, dt);
        } else {
          // Атака: наносим урон
          if (!unit.attackCooldown) unit.attackCooldown = 0;
          unit.attackCooldown -= dt;
          if (unit.attackCooldown <= 0) {
            unit.attackCooldown = unit.type.id === 'tank' ? 1.2 : 0.7;
            // Визуализация атаки — красная линия
            if (this.scene && this.scene.add) {
              const line = this.scene.add.line(0, 0, unit.x, unit.y, tx, ty, 0xff2222).setLineWidth(3).setDepth(200);
              this.scene.time.delayedCall(200, () => { line.destroy(); });
            }
            // Урон по цели
            if (unit.attackTarget.hp !== undefined) {
              unit.attackTarget.hp -= unit.type.id === 'tank' ? 30 : 15;
              // Визуально обновить HP-бар
              if (unit.attackTarget.hpBar) {
                unit.attackTarget.hpBar.width = 32 * (unit.attackTarget.hp / unit.attackTarget.maxHP);
                unit.attackTarget.hpBar.x = unit.attackTarget.x - 16 + (unit.attackTarget.hp / unit.attackTarget.maxHP) * 16;
              }
              // Уничтожение цели
              if (unit.attackTarget.hp <= 0) {
                if (unit.attackTarget.sprite) {
                  // --- Анимация разрушения юнита ---
                  const boom = this.scene.add.circle(unit.attackTarget.x, unit.attackTarget.y, 22, 0xffe066).setAlpha(0.7).setDepth(300);
                  this.scene.tweens.add({
                    targets: boom,
                    alpha: 0,
                    scale: 2,
                    duration: 350,
                    onComplete: () => boom.destroy()
                  });
                  unit.attackTarget.sprite.destroy();
                  unit.attackTarget.label.destroy();
                  if (unit.attackTarget.hpBar) unit.attackTarget.hpBar.destroy();
                  if (unit.attackTarget.hpBarBg) unit.attackTarget.hpBarBg.destroy();
                  // Удаляем из массива юнитов игрока
                  const idx = this.scene.units.indexOf(unit.attackTarget);
                  if (idx !== -1) this.scene.units.splice(idx, 1);
                } else {
                  // --- Анимация разрушения здания ---
                  const b = unit.attackTarget;
                  const size = b.type.size * 32;
                  const boom = this.scene.add.rectangle(b.x * 32 + size / 2, b.y * 32 + size / 2, size, size, 0xffa000).setAlpha(0.6).setDepth(300);
                  this.scene.tweens.add({
                    targets: boom,
                    alpha: 0,
                    scaleX: 1.7,
                    scaleY: 1.7,
                    duration: 450,
                    onComplete: () => boom.destroy()
                  });
                  // Здание: удаляем визуальные объекты и из массива построек
                  b.group && b.group.destroy && b.group.destroy();
                  if (b.rect) b.rect.destroy();
                  if (b.border) b.border.destroy();
                  if (b.label) b.label.destroy();
                  if (b.hpBar) b.hpBar.destroy();
                  if (b.hpBarBg) b.hpBarBg.destroy();
                  const idx = this.scene.buildingsOnMap.indexOf(b);
                  if (idx !== -1) this.scene.buildingsOnMap.splice(idx, 1);
                }
                unit.attackTarget = null;
              }
            }
          }
        }
      }
    }
  }

  triggerAlert() {
    if (!this.alerted) {
      this.alerted = true;
      // Можно добавить визуальное сообщение или эффект
    }
  }
} 