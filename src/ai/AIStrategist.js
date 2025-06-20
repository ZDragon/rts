import AIBaseBuildingController from './AIBaseBuildingController.js';
import AIUnitsController from './AIUnitsController.js';
import { BUILDINGS } from '../entities/buildings/Buildings.js';
import { UNITS } from '../entities/units/Units.js';
import { DEFAULT_AI_STARTING_RESOURCES } from '../entities/resources/ResourceTypes.js';

export default class AIStrategist {
  constructor(scene, ai, startResources = DEFAULT_AI_STARTING_RESOURCES) {
    this.scene = scene;
    this.ai = ai;
    this.buildings = new AIBaseBuildingController(scene, this);
    this.units = new AIUnitsController(scene, this);
    // Здесь можно хранить память, цели, флаги, таймеры и т.д.
    this.lastBuildCheck = 0;
    this.status = 'Анализ...';
    this.priority = 'development'; // development | defense
    this.statusLabel = null;
    // --- Память о видимых объектах ---
    this.memory = {
      resources: new Map(), // key: `${x},${y}`
      enemyBases: new Map(),
      enemyUnits: new Map(),
    };
    this.playerContact = false;
    this.resources = { ...startResources };
  }

  update(dt, time) {
    // Главный цикл принятия решений ИИ
    // 1. Анализ ситуации (ресурсы, враги, карта)
    // 2. Решение: что строить, каких юнитов создавать, куда отправлять
    // 3. Делегирование задач buildings и units
    this.buildings.update(dt);
    this.units.update(dt);

    // Проверяем необходимость строительства раз в 1.5 сек
    this.lastBuildCheck = this.lastBuildCheck || 0;
    this.lastBuildCheck += dt;
    if (this.lastBuildCheck < 1.5) return;
    this.lastBuildCheck = 0;

    this.analyzeSituation();
    this.makeBuildDecision();
    this.makeUnitDecision();
    this.updateStatusLabel();
    this.updateMemory();
    this.assignWorkerTasks();
    this.assignScoutTasks();
    this.assignCombatTasks();
  }

  // --- Анализ ситуации и смена приоритета ---
  analyzeSituation() {
    // Считаем свои войска и постройки
    const units = this.getAllUnits();
    const buildings = this.getAllBuildings();
    const queue = this.buildings.buildQueue || [];
    const countUnits = id => units.filter(u => u.type.id === id).length;
    const countBuildings = id => buildings.filter(b => b.type?.id === id || b.type === id).length + queue.filter(b => b.type === id || b.type?.id === id).length;
    const countWorkers = countUnits('worker');
    // Оцениваем угрозу: если рядом с базой есть вражеские юниты или мало защитных построек/юнитов
    let threat = false;
    let enemyNear = false;
    if (this.scene && this.scene.playerController) {
      const enemyUnits = this.scene.playerController.state.units;
      const hqs = buildings.filter(b => b.type?.id === 'hq' || b.type === 'hq');
      for (const hq of hqs) {
        for (const eu of enemyUnits) {
          const dist = Math.hypot(eu.x/32 - hq.x, eu.y/32 - hq.y);
          if (dist < 8) enemyNear = true;
        }
      }
    }
    // Если мало солдат/танков/башен или враг рядом — приоритет защита
    const soldiers = countUnits('soldier');
    const tanks = countUnits('tank');
    const towers = countBuildings('tower');
    if (countWorkers > 1 && (enemyNear || (soldiers + tanks < 3 && towers < 1))) {
      this.priority = 'defense';
      this.status = enemyNear ? 'Враг у базы! Защита!' : 'Укрепление обороны';
    } else {
      this.priority = 'development';
      this.status = 'Развитие экономики и построек';
    }
  }

  // --- Решение о создании юнитов ---
  makeUnitDecision() {
    const units = this.getAllUnits();
    const buildings = this.getAllBuildings();
    const queue = this.buildings.buildQueue || [];
    // Считаем по типам
    const countUnits = id => units.filter(u => u.type.id === id).length;
    const countBuildings = id => buildings.filter(b => b.type?.id === id || b.type === id).length + queue.filter(b => b.type === id || b.type?.id === id).length;
    
    this.ai.typeWorker.forEach(type => {
      const hqCount = countBuildings(type.factory);
      const workerCount = countUnits(type.id);
      if (hqCount > 0 && workerCount < hqCount * type.limit) {
        if (this.priority === 'development' || workerCount < type.limit) {
          const hqs = buildings.filter(b => b.type?.id === 'hq' || b.type === 'hq');
          for (const hq of hqs) {
            if (units.filter(u => u.type.id === 'worker' && this.isNear(u, hq, 2)).length < 3) {
              this.tryCreateUnit('worker', hq);
            }
          }
        }
      }
    });

    this.ai.typeCombat.forEach(type => {
      const barracksCount = countBuildings(type.factory);
      const soldierCount = countUnits(type.id);
      if (barracksCount > 0 && soldierCount < barracksCount * type.limit) {
        if (this.priority === 'defense' || soldierCount < type.limit) {
          const barracks = buildings.filter(b => b.type?.id === 'barracks' || b.type === 'barracks');
          for (const bar of barracks) {
            if (units.filter(u => u.type.id === type.id && this.isNear(u, bar, 2)).length < type.limit) {
              this.tryCreateUnit(type.id, bar);
            }
          }
        }
      }
    });
  }

  // --- Попытка создать юнита у здания ---
  tryCreateUnit(unitId, building) {
    const unitType = UNITS.find(u => u.id === unitId);
    if (!unitType) return;
    for (const res in unitType.cost) {
      if (this.getResource(res) < unitType.cost[res]) return;
    }
    const spot = this.findFreeSpotNearBuilding(building, 2);
    if (!spot) return;
    for (const res in unitType.cost) {
      this.spendResource(res, unitType.cost[res], `создание юнита ${unitType.name}`);
    }
    this.createUnit(unitType, spot.x * 32 + 16, spot.y * 32 + 16);
  }

  // --- Поиск свободной клетки рядом с зданием ---
  findFreeSpotNearBuilding(building, radius = 2) {
    const map = this.scene.tileData;
    const size = building.size || building.type?.size || 2;
    const bx = building.x, by = building.y;
    // Собираем занятые клетки (юниты, здания, ресурсы)
    const obstacles = new Set();
    for (const b of this.getAllBuildings()) {
      for (let dx = 0; dx < b.size; dx++) for (let dy = 0; dy < b.size; dy++) {
        obstacles.add(`${b.x + dx},${b.y + dy}`);
      }
    }
    for (const u of this.getAllUnits()) {
      const tx = Math.floor(u.x / 32), ty = Math.floor(u.y / 32);
      obstacles.add(`${tx},${ty}`);
    }
    if (this.scene.resourceDeposits) {
      for (const r of this.scene.resourceDeposits) {
        obstacles.add(`${r.x},${r.y}`);
      }
    }
    // Перебираем клетки по кругу вокруг здания
    for (let r = 1; r <= radius; r++) {
      for (let dx = -r; dx <= size + r - 1; dx++) {
        for (let dy = -r; dy <= size + r - 1; dy++) {
          // Только по периметру
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = bx + dx, y = by + dy;
          if (x < 0 || y < 0 || x >= map[0].length || y >= map.length) continue;
          const t = map[y][x];
          if (!(t === 0 || t === 3)) continue;
          if (obstacles.has(`${x},${y}`)) continue;
          return { x, y };
        }
      }
    }
    return null;
  }

  // --- Проверка близости юнита к зданию ---
  isNear(unit, building, dist) {
    const tx = Math.floor(unit.x / 32), ty = Math.floor(unit.y / 32);
    const bx = building.x, by = building.y, sz = building.size || building.type?.size || 2;
    return tx >= bx - dist && tx < bx + sz + dist && ty >= by - dist && ty < by + sz + dist;
  }

  // --- Визуализация статуса стратега над базой ---
  updateStatusLabel() {
    // Находим первую базу ИИ (enemyBase)
    const base = this.scene.enemyBases && this.scene.enemyBases[0];
    if (!base) return;
    const px = base.rect ? base.rect.x : (base.x * 32 + 32);
    const py = base.rect ? base.rect.y - 32 : (base.y * 32 - 18);
    if (!this.statusLabel) {
      this.statusLabel = this.scene.add.text(px, py, '', { fontSize: '16px', color: '#ff0', fontFamily: 'sans-serif', backgroundColor: 'rgba(0,0,0,0.5)' }).setOrigin(0.5).setDepth(200);
    }
    this.statusLabel.x = px;
    this.statusLabel.y = py;
    // --- Детализированный статус ---
    let lines = [];
    lines.push(`Стратег: ${this.priority === 'defense' ? 'Оборона' : 'Развитие'}`);
    lines.push(this.status);
    lines.push(this.playerContact ? 'Контакт с игроком: да' : 'Контакт с игроком: нет');
    lines.push(`Видимых ресурсов: ${this.memory.resources.size}`);
    lines.push(`Видимых врагов: ${this.memory.enemyUnits.size}`);
    // Добавляем информацию о ресурсах
    const res = this.getAllResources();
    lines.push(`Ресурсы: З:${res.золото} Д:${res.дерево} К:${res.камень} М:${res.металл}`);
    const workers = this.getAllUnits().filter(u => u.type.id === 'worker' && u.isAlive());
    const wGather = workers.filter(w => w.state === 'gather').length;
    lines.push(`Рабочие: ${workers.length} (добывают: ${wGather})`);
    const scouts = this.getAllUnits().filter(u => u.type.id === 'scout' && u.isAlive());
    const sRecon = scouts.filter(s => s.state === 'scouting').length;
    lines.push(`Разведчики: ${scouts.length} (разведка: ${sRecon})`);
    const soldiers = this.getAllUnits().filter(u => u.type.id === 'soldier' && u.isAlive());
    const tanks = this.getAllUnits().filter(u => u.type.id === 'tank' && u.isAlive());
    const patrols = [...soldiers, ...tanks].filter(u => u.state === 'patrol').length;
    const attacks = [...soldiers, ...tanks].filter(u => u.state === 'attack').length;
    lines.push(`Солдаты: ${soldiers.length}, Танки: ${tanks.length}`);
    lines.push(`Патруль: ${patrols}, Атака: ${attacks}`);
    this.statusLabel.setText(lines.join('\n'));
    this.statusLabel.setVisible(true);
  }

  // --- Поиск свободного места для здания ---
  findFreeBuildSpot(buildingType) {
    const map = this.scene.tileData;
    const size = buildingType.size;
    const base = this.scene.base || (this.scene.enemyBases && this.scene.enemyBases[0]);
    if (!base) return null;
    const cx = base.x, cy = base.y;
    // Собираем bounding box всех построек и очереди
    const allRects = [];
    // Добавляем стартовую базу как препятствие (запрет на штаб)
    if (this.scene.enemyBases) {
      for (const baseRect of this.scene.enemyBases) {
        allRects.push({ x: baseRect.x, y: baseRect.y, w: 2, h: 2, isHQ: true });
      }
    }
    for (const b of this.getAllBuildings()) {
      allRects.push({ x: b.x, y: b.y, w: b.size, h: b.size, isHQ: b.type?.id === 'hq' || b.type === 'hq' });
    }
    if (this.buildings.buildQueue) {
      for (const b of this.buildings.buildQueue) {
        const t = typeof b.type === 'string' ? BUILDINGS.find(t => t.id === b.type) : b.type;
        const sz = t ? t.size : b.size || 2;
        allRects.push({ x: b.x, y: b.y, w: sz, h: sz, isHQ: t?.id === 'hq' });
      }
    }
    // Ресурсы
    if (this.scene.resourceDeposits) {
      for (const r of this.scene.resourceDeposits) {
        allRects.push({ x: r.x, y: r.y, w: 1, h: 1, isHQ: false });
      }
    }
    // Перебираем клетки вокруг базы (спиралью)
    const radius = 12;
    for (let r = 0; r < radius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const x = cx + dx, y = cy + dy;
          if (x < 0 || y < 0 || x + size > map[0].length || y + size > map.length) continue;
          // Проверка тайлов (только трава или песок)
          let ok = true;
          for (let sx = 0; sx < size; sx++) for (let sy = 0; sy < size; sy++) {
            const t = map[y + sy][x + sx];
            if (!(t === 0 || t === 3)) ok = false;
          }
          // Проверка отступа 2 тайла до других построек и запрет на штаб
          for (const rect of allRects) {
            if (this.rectsOverlapWithGap(x, y, size, size, rect.x, rect.y, rect.w, rect.h, 2)) ok = false;
            if (rect.isHQ && this.rectsOverlapWithGap(x, y, size, size, rect.x, rect.y, rect.w, rect.h, 0)) ok = false;
          }
          if (ok) return { x, y };
        }
      }
    }
    return null;
  }

  // Проверка пересечения прямоугольников с отступом (gap)
  rectsOverlapWithGap(x1, y1, w1, h1, x2, y2, w2, h2, gap) {
    return !(
      x1 + w1 + gap <= x2 - gap ||
      x2 + w2 + gap <= x1 - gap ||
      y1 + h1 + gap <= y2 - gap ||
      y2 + h2 + gap <= y1 - gap
    );
  }

  // --- Логика принятия решения о строительстве ---
  makeBuildDecision() {
    // Получаем список построек и очереди
    const buildings = this.getAllBuildings();
    const queue = this.buildings.buildQueue || [];
    // Считаем по id
    const count = id => buildings.filter(b => b.type?.id === id || b.type === id).length + queue.filter(b => b.type === id || b.type?.id === id).length;

    this.ai.typeBuildings.forEach(type => {
      const buildingCount = count(type.id);
      const bType = BUILDINGS.find(b => b.id === type.id);
      if (buildingCount < type.limit && this.canAfford(bType)) {
        const spot = this.findFreeBuildSpot(bType);
        if (spot) this.build(bType, spot.x, spot.y);
      }
    });
  }

  canAfford(buildingType) {
    if (!buildingType) return false;
    const cost = buildingType.cost;
    for (const res in cost) {
      if (this.getResource(res) < cost[res]) return false;
    }
    return true;
  }

  // Пример: создать здание
  build(type, x, y) {
    const buildingType = typeof type === 'string' ? BUILDINGS.find(b => b.id === type) : type;
    if (!buildingType) return;
    for (const res in buildingType.cost) {
      if (!this.spendResource(res, buildingType.cost[res], `строительство ${buildingType.name}`)) return;
    }
    this.buildings.queueBuilding(buildingType, x, y);
  }

  // Пример: создать юнита
  createUnit(type, x, y) {
    return this.units.createUnit(type, x, y);
  }

  getAllUnits() {
    return this.units.getAllUnits();
  }
  getAllBuildings() {
    return this.buildings.getAllBuildings();
  }

  // --- Память о видимых объектах ---
  updateMemory() {
    // Видимость по всем своим юнитам и зданиям
    const units = this.getAllUnits();
    const vision = [];
    for (const u of units) {
      vision.push({ x: u.x, y: u.y, r: u.type.vision });
    }
    // Добавляем радиус видимости зданий
    for (const b of this.getAllBuildings()) {
      let r = 200;
      if (b.type?.id === 'hq' || b.type === 'hq') r = 700;
      else if (b.type?.id === 'tower' || b.type === 'tower') r = 100;
      // Координаты центра здания
      const cx = (b.x + (b.size || b.type?.size || 2) / 2) * 32;
      const cy = (b.y + (b.size || b.type?.size || 2) / 2) * 32;
      vision.push({ x: cx, y: cy, r });
    }
    // --- Ресурсы ---
    if (this.scene.resourceDeposits) {
      for (const res of this.scene.resourceDeposits) {
        let visible = false;
        for (const v of vision) {
          if (Phaser.Math.Distance.Between(res.x * 32 + 16, res.y * 32 + 16, v.x, v.y) < v.r) visible = true;
        }
        const key = `${res.x},${res.y}`;
        if (visible) this.memory.resources.set(key, { deposit: res, lastSeen: Date.now() });
        else if (this.memory.resources.has(key) && Date.now() - this.memory.resources.get(key).lastSeen > 10000) this.memory.resources.delete(key);
      }
    }
    // --- Вражеские базы и юниты ---
    if (this.scene.playerBases) {
      for (const base of this.scene.playerBases) {
        let visible = false;
        for (const v of vision) {
          if (Phaser.Math.Distance.Between(base.rect.x, base.rect.y, v.x, v.y) < v.r) visible = true;
        }
        const key = `${base.x},${base.y}`;
        if (visible) this.memory.enemyBases.set(key, { ...base, lastSeen: Date.now() });
        else if (this.memory.enemyBases.has(key) && Date.now() - this.memory.enemyBases.get(key).lastSeen > 10000) this.memory.enemyBases.delete(key);
        if (visible) this.playerContact = true;
      }
    }
    if (this.scene.playerUnitsController && this.scene.playerUnitsController.units) {
      for (const u of this.scene.playerUnitsController.units) {
        let visible = false;
        for (const v of vision) {
          if (Phaser.Math.Distance.Between(u.x, u.y, v.x, v.y) < v.r) visible = true;
        }
        const key = `${Math.floor(u.x)},${Math.floor(u.y)}`;
        if (visible) this.memory.enemyUnits.set(key, { ...u, lastSeen: Date.now() });
        else if (this.memory.enemyUnits.has(key) && Date.now() - this.memory.enemyUnits.get(key).lastSeen > 10000) this.memory.enemyUnits.delete(key);
        if (visible) this.playerContact = true;
      }
    }
  }

  // --- Назначение задач рабочим ---
  assignWorkerTasks() {
    const workers = this.getAllUnits().filter(u => u.type.id === 'worker' && u.isAlive());
    if (!workers.length) return;
    // Определяем приоритет ресурсов (по необходимости строительства/юнитов)
    const needed = this.getNeededResources();
    // Для каждого рабочего ищем ближайший нужный ресурс
    for (const worker of workers) {
      // Если уже есть задача и ресурс ещё есть — не переназначаем
      if (worker.state === 'gather' && worker.stateData.resourceObj && worker.stateData.resourceObj.amount > 0) continue;
      let best = null, bestDist = Infinity;
      for (const [key, res] of this.memory.resources.entries()) {
        if (!needed[res.deposit.type]) continue;
        if (res.deposit.amount <= 0) continue;
        const dist = Phaser.Math.Distance.Between(worker.x, worker.y, res.deposit.x * 32 + 16, res.deposit.y * 32 + 16);
        if (dist < bestDist) { best = res; bestDist = dist; }
      }
      if (best) {
        worker.setState('gather', { resourceObj: best.deposit });
      } else {
        worker.setState('idle');
      }
    }
  }

  // --- Определение нужных ресурсов ---
  getNeededResources() {
    // Теперь все ресурсы всегда считаются нужными
    return { золото: true, дерево: true, камень: true, металл: true };
  }

  // --- Назначение задач разведчикам ---
  assignScoutTasks() {
    const scouts = this.getAllUnits().filter(u => u.type.id === 'scout' && u.isAlive());
    if (!scouts.length) return;
    for (const scout of scouts) {
      // До контакта с игроком — разведка только вокруг базы
      if (!this.playerContact) {
        const base = this.scene.enemyBases && this.scene.enemyBases[0];
        if (base) {
          const angle = Math.random() * Math.PI * 2;
          const r = 200 + Math.random() * 100;
          const tx = base.x * 32 + 16 + Math.cos(angle) * r;
          const ty = base.y * 32 + 16 + Math.sin(angle) * r;
          scout.setState('scouting', { target: { x: tx, y: ty } });
        }
      } else {
        // После контакта — исследование случайных точек на карте
        const map = this.scene.tileData;
        const tx = Math.floor(Math.random() * map[0].length) * 32 + 16;
        const ty = Math.floor(Math.random() * map.length) * 32 + 16;
        scout.setState('scouting', { target: { x: tx, y: ty } });
      }
    }
  }

  // --- Назначение задач боевым юнитам ---
  assignCombatTasks() {
    const soldiers = this.getAllUnits().filter(u => u.type.id === 'soldier' && u.isAlive());
    const tanks = this.getAllUnits().filter(u => u.type.id === 'tank' && u.isAlive());
    // --- Патруль/защита рабочих и базы ---
    const patrolPoints = this.getPatrolPoints();
    let i = 0;
    for (const unit of [...soldiers, ...tanks]) {
      // Если есть угроза — защита/атака
      if (this.priority === 'defense' && this.memory.enemyUnits.size > 0) {
        // Ищем ближайшего врага
        let best = null, bestDist = Infinity;
        for (const [_, enemy] of this.memory.enemyUnits.entries()) {
          const dist = Phaser.Math.Distance.Between(unit.x, unit.y, enemy.x, enemy.y);
          if (dist < bestDist) { best = enemy; bestDist = dist; }
        }
        if (best) {
          unit.setState('attack', { target: best });
          continue;
        }
      }
      // Если нет угрозы — патрулируем точки интереса
      const pt = patrolPoints[i % patrolPoints.length];
      unit.setState('patrol', { point: pt });
      i++;
    }
  }

  // --- Точки патруля ---
  getPatrolPoints() {
    // Вокруг базы и вокруг рабочих
    const points = [];
    const hqs = this.getAllBuildings().filter(b => b.type?.id === 'hq' || b.type === 'hq');
    for (const hq of hqs) {
      const cx = (hq.x + (hq.size || hq.type?.size || 2) / 2) * 32;
      const cy = (hq.y + (hq.size || hq.type?.size || 2) / 2) * 32;
      points.push({ x: cx + 80, y: cy });
      points.push({ x: cx - 80, y: cy });
      points.push({ x: cx, y: cy + 80 });
      points.push({ x: cx, y: cy - 80 });
    }
    // Вокруг рабочих
    const workers = this.getAllUnits().filter(u => u.type.id === 'worker' && u.isAlive());
    for (const w of workers) {
      points.push({ x: w.x + 40, y: w.y });
      points.push({ x: w.x - 40, y: w.y });
    }
    return points.length ? points : [{ x: 500, y: 500 }];
  }

  getResource(name) {
    return this.resources[name] || 0;
  }
  addResource(name, value) {
    if (this.resources.hasOwnProperty(name)) {
      this.resources[name] += value;
    }
  }
  spendResource(name, value, purpose = '') {
    if (this.resources.hasOwnProperty(name) && this.resources[name] >= value) {
      this.resources[name] -= value;
      // Логирование трат
      console.log(`ИИ потратил ${value} ${name} на ${purpose}. Осталось: ${this.resources[name]}`);
      return true;
    }
    // Логирование неудачной попытки
    console.log(`ИИ попытался потратить ${value} ${name} на ${purpose}, но не хватило. Осталось: ${this.resources[name]}`);
    return false;
  }
  getAllResources() {
    return { ...this.resources };
  }
}