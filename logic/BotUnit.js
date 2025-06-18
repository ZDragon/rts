import PathfindingController from './PathfindingController.js';

export default class BotUnit {
  constructor({ x, y, type, scene, owner }) {
    this.x = x;
    this.y = y;
    this.type = type; // объект типа юнита (id, name, speed, maxHP и т.д.)
    this.owner = owner;
    this.scene = scene;
    this.hp = type.maxHP;
    this.maxHP = type.maxHP;
    this.state = 'idle'; // idle, move, attack, gather, patrol, retreat и т.д.
    this.target = null; // {x, y} или объект
    this.path = null;
    this.pathStep = 0;
    this.pathfinder = new PathfindingController();
    // Визуализация (может быть null)
    this.sprite = null;
    this.label = null;
    this.hpBar = null;
    this.hpBarBg = null;
    this.statusLabel = null;
    this.stateData = {};
    this.createVisuals();
  }

  createVisuals() {
    if (!this.scene || !this.scene.add) return;
    const TILE_SIZE = 32;
    const color = this.type.color || 0xff0000;
    const radius = this.type.id === 'scout' ? 12 : 16;
    this.sprite = this.scene.add.circle(this.x, this.y, radius, color).setDepth(30);
    this.label = this.scene.add.text(this.x, this.y, this.type.name, { fontSize: '12px', color: '#222', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(31);
    this.hpBarBg = this.scene.add.rectangle(this.x, this.y - 22, 32, 6, 0x444444).setDepth(32);
    this.hpBar = this.scene.add.rectangle(this.x, this.y - 22, 32, 6, 0x00ff00).setDepth(33);
  }

  setState(state, data = {}) {
    this.state = state;
    this.stateData = data;
  }

  setTarget(target) {
    this.target = target;
  }

  setPath(path) {
    this.path = path;
    this.pathStep = 0;
  }

  // Универсальный update для FSM
  update(dt) {
    this.handleState(dt);
    this.updateVisuals();
  }

  // Базовая обработка состояний (расширяется в наследниках)
  handleState(dt) {
    switch (this.state) {
      case 'idle':
        // Можно добавить логику ожидания
        break;
      case 'move':
        this.moveByPath(dt);
        break;
      // Остальные состояния реализуются в наследниках
    }
  }

  moveToTile(tileX, tileY, allowedTiles = new Set([0,3])) {
    // tileX, tileY — координаты в тайлах
    const map = this.scene.tileData;
    // Собираем препятствия (юниты, здания, ресурсы)
    const obstacles = new Set();
    if (this.scene.aiEnemies) {
      for (const ai of this.scene.aiEnemies) {
        for (const u of ai.strategist.getAllUnits()) {
          const tx = Math.floor(u.x / 32), ty = Math.floor(u.y / 32);
          obstacles.add(`${tx},${ty}`);
        }
        for (const b of ai.strategist.getAllBuildings()) {
          for (let dx = 0; dx < b.size; dx++) for (let dy = 0; dy < b.size; dy++) {
            obstacles.add(`${b.x + dx},${b.y + dy}`);
          }
        }
      }
    }
    if (this.scene.resourceObjects) {
      for (const r of this.scene.resourceObjects) {
        obstacles.add(`${r.x},${r.y}`);
      }
    }
    const from = { x: Math.floor(this.x / 32), y: Math.floor(this.y / 32) };
    const to = { x: tileX, y: tileY };
    const path = this.pathfinder.findPath(this, from, to, map, obstacles, allowedTiles);
    if (path) {
      this.setPath(path);
      this.setState('move');
      return true;
    }
    return false;
  }

  moveByPath(dt) {
    if (!this.path || this.pathStep >= this.path.length) {
      this.setState('idle');
      return false;
    }
    const next = this.path[this.pathStep];
    const tx = next.x * 32 + 16;
    const ty = next.y * 32 + 16;
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const speed = this.type.speed || 70;
    if (dist > 2) {
      const move = Math.min(speed * dt, dist);
      this.x += (dx / dist) * move;
      this.y += (dy / dist) * move;
    } else {
      this.x = tx; this.y = ty;
      this.pathStep++;
    }
    if (this.pathStep >= this.path.length) {
      this.setState('idle');
    }
    return true;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hpBar && this.hpBarBg) {
      this.hpBar.width = (this.hp / this.maxHP) * this.hpBarBg.width;
      this.hpBar.x = this.hpBarBg.x - this.hpBarBg.width / 2 + this.hpBar.width / 2;
    }
    if (this.hp <= 0 && this.state !== 'dead') {
      this.setState('dead');
      this.handleDeath();
    }
  }

  handleDeath() {
    // Анимация уничтожения
    if (this.sprite && this.scene && this.scene.add) {
      const boom = this.scene.add.circle(this.x, this.y, 22, 0xffe066).setAlpha(0.7).setDepth(300);
      this.scene.tweens.add({
        targets: boom,
        alpha: 0,
        scale: 2,
        duration: 350,
        onComplete: () => boom.destroy()
      });
    }
    // Удаление визуальных элементов
    if (this.sprite) this.sprite.destroy();
    if (this.label) this.label.destroy();
    if (this.hpBar) this.hpBar.destroy();
    if (this.hpBarBg) this.hpBarBg.destroy();
    if (this.statusLabel) this.statusLabel.destroy();
    // Удаление из массива контроллера
    if (this.scene && this.scene.aiEnemies) {
      for (const ai of this.scene.aiEnemies) {
        const idx = ai.unitsController && ai.unitsController.units ? ai.unitsController.units.indexOf(this) : -1;
        if (idx !== -1) ai.unitsController.units.splice(idx, 1);
      }
    }
  }

  isAlive() {
    return this.hp > 0;
  }

  updateVisuals() {
    if (this.sprite) { this.sprite.x = this.x; this.sprite.y = this.y; }
    if (this.label) { this.label.x = this.x; this.label.y = this.y; }
    if (this.hpBar && this.hpBarBg) {
      let offset = -22;
      if (this.type.id === 'scout') offset = -18;
      this.hpBar.x = this.x;
      this.hpBar.y = this.y + offset;
      this.hpBarBg.x = this.x;
      this.hpBarBg.y = this.y + offset;
      this.hpBar.width = 32 * (this.hp / this.maxHP);
      this.hpBar.x = this.hpBarBg.x - 16 + (this.hp / this.maxHP) * 16;
    }
    if (this.statusLabel) {
      this.statusLabel.x = this.x;
      this.statusLabel.y = this.y - 28;
    }
  }
}

// --- Класс разведчика ---
export class BotScout extends BotUnit {
  constructor(opts) {
    super(opts);
    this.setState('scout_idle');
  }
  createVisuals() {
    if (!this.scene || !this.scene.add) return;
    const color = 0x00bcd4; // голубой
    const radius = 12;
    this.sprite = this.scene.add.star(this.x, this.y, 5, 8, radius, color).setDepth(30); // звезда
    this.label = this.scene.add.text(this.x, this.y, 'Разведчик', { fontSize: '12px', color: '#00bcd4', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(31);
    this.hpBarBg = this.scene.add.rectangle(this.x, this.y - 18, 28, 5, 0x444444).setDepth(32);
    this.hpBar = this.scene.add.rectangle(this.x, this.y - 18, 28, 5, 0x00ff00).setDepth(33);
  }
  handleState(dt) {
    switch (this.state) {
      case 'scout_idle':
        // Переход в разведку
        this.setState('scouting');
        break;
      case 'scouting':
        // Пример: двигаться к случайной точке на карте
        if (!this.path || this.pathStep >= this.path.length) {
          const tx = Math.floor(Math.random() * this.scene.tileData[0].length);
          const ty = Math.floor(Math.random() * this.scene.tileData.length);
          this.moveToTile(tx, ty, new Set([0,3]));
        } else {
          this.moveByPath(dt);
        }
        break;
      default:
        super.handleState(dt);
    }
  }
}

// --- Класс рабочего ---
export class BotWorker extends BotUnit {
  constructor(opts) {
    super(opts);
    this.setState('worker_idle');
    this.gatherState = null; // to_resource, gathering, to_base
    this.gatherTarget = null;
    this.gatherCarried = 0;
    this.gatherTimer = 0;
    this.gatherBase = null;
  }
  createVisuals() {
    if (!this.scene || !this.scene.add) return;
    const color = 0xffeb3b; // жёлтый
    const radius = 14;
    this.sprite = this.scene.add.circle(this.x, this.y, radius, color).setDepth(30);
    this.label = this.scene.add.text(this.x, this.y, 'Рабочий', { fontSize: '12px', color: '#bfa600', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(31);
    this.hpBarBg = this.scene.add.rectangle(this.x, this.y - 22, 32, 6, 0x444444).setDepth(32);
    this.hpBar = this.scene.add.rectangle(this.x, this.y - 22, 32, 6, 0x00ff00).setDepth(33);
  }
  handleState(dt) {
    switch (this.state) {
      case 'worker_idle':
        // Ожидание задачи на сбор ресурсов
        break;
      case 'gather': {
        // FSM: to_resource -> gathering -> to_base -> to_resource
        if (!this.gatherState) {
          this.gatherState = 'to_resource';
          this.gatherTarget = this.stateData.resourceObj;
          this.gatherCarried = 0;
          this.gatherBase = null;
        }
        if (!this.gatherTarget || this.gatherTarget.amount <= 0) {
          this.setState('worker_idle');
          this.gatherState = null;
          break;
        }
        if (this.gatherState === 'to_resource') {
          const freeTile = this.findFreeAdjacentTile(this.gatherTarget.x, this.gatherTarget.y);
          // Движение к ресурсу
          const tx = freeTile.x * 32 + 16;
          const ty = freeTile.y * 32 + 16;
          const dist = Math.hypot(this.x - tx, this.y - ty);
          if (dist > 24) {
            if (!this.path || this.pathStep >= this.path.length) {
              this.moveToTile(freeTile.x, freeTile.y, new Set([0,3]));
            } else {
              this.moveByPath(dt);
            }
          } else {
            this.gatherState = 'gathering';
            this.gatherTimer = 0;
          }
        } else if (this.gatherState === 'gathering') {
          this.gatherTimer += dt;
          if (this.gatherTimer > 1.5) {
            this.gatherTimer = 0;
            const gathered = this.gatherTarget.gather(1);
            this.gatherCarried += gathered;
            if (this.gatherCarried >= 10 || this.gatherTarget.amount <= 0) {
              // Найти свою базу ИИ
              const base = this.owner.ai.base;
              if (base) {
                this.gatherBase = base;
                this.gatherState = 'to_base';
              } else {
                this.setState('worker_idle');
                this.gatherState = null;
              }
            }
          }
        } else if (this.gatherState === 'to_base') {
          // Движение к базе
          const bx = (this.gatherBase.x + (this.gatherBase.size || this.gatherBase.type?.size || 2) / 2) * 32;
          const by = (this.gatherBase.y + (this.gatherBase.size || this.gatherBase.type?.size || 2) / 2) * 32;
          const dist = Math.hypot(this.x - bx, this.y - by);
          if (dist > 32) {
            if (!this.path || this.pathStep >= this.path.length) {
              this.moveToTile(Math.floor(bx/32), Math.floor(by/32), new Set([0,3]));
            } else {
              this.moveByPath(dt);
            }
          } else {
            // Пополняем ресурсы ИИ через стратегa
            if (this.owner && typeof this.owner.addResource === 'function') {
              this.owner.addResource(this.gatherTarget.type, this.gatherCarried);
            }
            this.gatherCarried = 0;
            if (this.gatherTarget.amount > 0) {
              this.gatherState = 'to_resource';
            } else {
              this.setState('worker_idle');
              this.gatherState = null;
            }
          }
        }
        break;
      }
      default:
        super.handleState(dt);
    }
  }
  findFreeAdjacentTile(targetX, targetY) {
    // Возвращает координаты свободной соседней клетки вокруг (targetX, targetY)
    const dirs = [
      [0, -1], [1, 0], [0, 1], [-1, 0],
      [1, -1], [1, 1], [-1, 1], [-1, -1]
    ];
    for (const [dx, dy] of dirs) {
      const nx = targetX + dx;
      const ny = targetY + dy;
      // Проверка границ карты
      if (nx < 0 || ny < 0 || nx >= this.scene.tileData[0].length || ny >= this.scene.tileData.length) continue;
      // Проверка проходимости (трава или песок)
      const t = this.scene.tileData[ny][nx];
      if (t === 0 || t === 3) {
        // Проверка, нет ли других юнитов на клетке
        let blocked = false;
        for (const u of this.scene.getAllUnits()) {
          if (u !== this && Math.floor(u.x / 32) === nx && Math.floor(u.y / 32) === ny) {
            blocked = true;
            break;
          }
        }
        if (!blocked) return { x: nx, y: ny };
      }
    }
    return null;
  }
}

// --- Класс солдата ---
export class BotSoldier extends BotUnit {
  constructor(opts) {
    super(opts);
    this.setState('soldier_idle');
    this.attackRadius = 28;
    this.attackCooldown = 0;
    this.attackDamage = 15;
    this.attackDelay = 0.7;
  }
  createVisuals() {
    if (!this.scene || !this.scene.add) return;
    const color = 0xe53935; // красный
    const radius = 16;
    this.sprite = this.scene.add.rectangle(this.x, this.y, radius * 2, radius * 2, color).setDepth(30); // квадрат
    this.label = this.scene.add.text(this.x, this.y, 'Солдат', { fontSize: '12px', color: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(31);
    this.hpBarBg = this.scene.add.rectangle(this.x, this.y - 22, 32, 6, 0x444444).setDepth(32);
    this.hpBar = this.scene.add.rectangle(this.x, this.y - 22, 32, 6, 0x00ff00).setDepth(33);
  }
  handleState(dt) {
    switch (this.state) {
      case 'soldier_idle':
        break;
      case 'patrol': {
        const pt = this.stateData.point;
        if (!pt) { this.setState('soldier_idle'); break; }
        const dist = Math.hypot(this.x - pt.x, this.y - pt.y);
        if (dist > 16) {
          if (!this.path || this.pathStep >= this.path.length) {
            this.moveToTile(Math.floor(pt.x/32), Math.floor(pt.y/32), new Set([0,3]));
          } else {
            this.moveByPath(dt);
          }
        } else {
          // Ожидание на точке, затем можно выбрать новую точку (или стратег назначит новую)
          if (!this.stateData.wait) this.stateData.wait = 0;
          this.stateData.wait += dt;
          if (this.stateData.wait > 2) {
            this.setState('soldier_idle'); // стратег назначит новую patrol
          }
        }
        break;
      }
      case 'attack':
        if (this.stateData.target && this.stateData.target.isAlive && this.stateData.target.isAlive()) {
          const tgt = this.stateData.target;
          const tx = tgt.x, ty = tgt.y;
          const dist = Math.hypot(this.x - tx, this.y - ty);
          if (dist > this.attackRadius) {
            if (!this.path || this.pathStep >= this.path.length) {
              this.moveToTile(Math.floor(tx/32), Math.floor(ty/32), new Set([0,3]));
            } else {
              this.moveByPath(dt);
            }
          } else {
            // Атака
            this.attackCooldown -= dt;
            if (this.attackCooldown <= 0) {
              this.attackCooldown = this.attackDelay;
              this.dealDamageToTarget(tgt);
            }
          }
        } else if (this.stateData.target && this.stateData.target.hp !== undefined) {
          // Здание
          const tgt = this.stateData.target;
          const tx = tgt.x * 32 + (tgt.size ? tgt.size * 16 : 16);
          const ty = tgt.y * 32 + (tgt.size ? tgt.size * 16 : 16);
          const dist = Math.hypot(this.x - tx, this.y - ty);
          if (dist > this.attackRadius) {
            if (!this.path || this.pathStep >= this.path.length) {
              this.moveToTile(tgt.x, tgt.y, new Set([0,3]));
            } else {
              this.moveByPath(dt);
            }
          } else {
            this.attackCooldown -= dt;
            if (this.attackCooldown <= 0) {
              this.attackCooldown = this.attackDelay;
              this.dealDamageToTarget(tgt);
            }
          }
        }
        break;
      default:
        super.handleState(dt);
    }
  }
  dealDamageToTarget(target) {
    if (typeof target.takeDamage === 'function') {
      target.takeDamage(this.attackDamage);
    } else if (target.hp !== undefined) {
      // Здание
      if (!target.maxHP) target.maxHP = 300;
      target.hp = (target.hp ?? target.maxHP) - this.attackDamage;
      if (target.hp < 0) target.hp = 0;
      if (target.hpBar && target.hpBarBg) {
        target.hpBar.width = (target.hp / target.maxHP) * target.hpBarBg.width;
        target.hpBar.x = target.hpBarBg.x - target.hpBarBg.width / 2 + target.hpBar.width / 2;
      }
      // Визуализация урона (можно доработать)
      if (this.scene && this.scene.add) {
        const line = this.scene.add.line(0, 0, this.x, this.y, target.x * 32 + 16, target.y * 32 + 16, 0xff4444).setLineWidth(2).setDepth(200);
        this.scene.time.delayedCall(200, () => { line.destroy(); });
      }
      // Удаление здания если разрушено (можно доработать)
      if (target.hp <= 0 && target.rect) {
        if (target.rect) target.rect.destroy();
        if (target.border) target.border.destroy();
        if (target.label) target.label.destroy();
        if (target.hpBar) target.hpBar.destroy();
        if (target.hpBarBg) target.hpBarBg.destroy();
        if (target.statusLabel) target.statusLabel.destroy();
      }
    }
  }
}

// --- Класс танка ---
export class BotTank extends BotUnit {
  constructor(opts) {
    super(opts);
    this.setState('tank_idle');
    this.attackRadius = 40;
    this.attackCooldown = 0;
    this.attackDamage = 30;
    this.attackDelay = 1.2;
  }
  createVisuals() {
    if (!this.scene || !this.scene.add) return;
    const color = 0x607d8b; // серо-синий
    const radius = 18;
    this.sprite = this.scene.add.ellipse(this.x, this.y, radius * 2.4, radius * 1.3, color).setDepth(30); // эллипс
    this.label = this.scene.add.text(this.x, this.y, 'Танк', { fontSize: '12px', color: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(31);
    this.hpBarBg = this.scene.add.rectangle(this.x, this.y - 24, 38, 7, 0x444444).setDepth(32);
    this.hpBar = this.scene.add.rectangle(this.x, this.y - 24, 38, 7, 0x00ff00).setDepth(33);
  }
  handleState(dt) {
    switch (this.state) {
      case 'tank_idle':
        break;
      case 'patrol': {
        const pt = this.stateData.point;
        if (!pt) { this.setState('tank_idle'); break; }
        const dist = Math.hypot(this.x - pt.x, this.y - pt.y);
        if (dist > 16) {
          if (!this.path || this.pathStep >= this.path.length) {
            this.moveToTile(Math.floor(pt.x/32), Math.floor(pt.y/32), new Set([0,3,2]));
          } else {
            this.moveByPath(dt);
          }
        } else {
          if (!this.stateData.wait) this.stateData.wait = 0;
          this.stateData.wait += dt;
          if (this.stateData.wait > 2) {
            this.setState('tank_idle');
          }
        }
        break;
      }
      case 'attack':
        if (this.stateData.target && this.stateData.target.isAlive && this.stateData.target.isAlive()) {
          const tgt = this.stateData.target;
          const tx = tgt.x, ty = tgt.y;
          const dist = Math.hypot(this.x - tx, this.y - ty);
          if (dist > this.attackRadius) {
            if (!this.path || this.pathStep >= this.path.length) {
              this.moveToTile(Math.floor(tx/32), Math.floor(ty/32), new Set([0,3,2]));
            } else {
              this.moveByPath(dt);
            }
          } else {
            this.attackCooldown -= dt;
            if (this.attackCooldown <= 0) {
              this.attackCooldown = this.attackDelay;
              this.dealDamageToTarget(tgt);
            }
          }
        } else if (this.stateData.target && this.stateData.target.hp !== undefined) {
          // Здание
          const tgt = this.stateData.target;
          const tx = tgt.x * 32 + (tgt.size ? tgt.size * 16 : 16);
          const ty = tgt.y * 32 + (tgt.size ? tgt.size * 16 : 16);
          const dist = Math.hypot(this.x - tx, this.y - ty);
          if (dist > this.attackRadius) {
            if (!this.path || this.pathStep >= this.path.length) {
              this.moveToTile(tgt.x, tgt.y, new Set([0,3,2]));
            } else {
              this.moveByPath(dt);
            }
          } else {
            this.attackCooldown -= dt;
            if (this.attackCooldown <= 0) {
              this.attackCooldown = this.attackDelay;
              this.dealDamageToTarget(tgt);
            }
          }
        }
        break;
      default:
        super.handleState(dt);
    }
  }
  dealDamageToTarget(target) {
    if (typeof target.takeDamage === 'function') {
      target.takeDamage(this.attackDamage);
    } else if (target.hp !== undefined) {
      // Здание
      if (!target.maxHP) target.maxHP = 400;
      target.hp = (target.hp ?? target.maxHP) - this.attackDamage;
      if (target.hp < 0) target.hp = 0;
      if (target.hpBar && target.hpBarBg) {
        target.hpBar.width = (target.hp / target.maxHP) * target.hpBarBg.width;
        target.hpBar.x = target.hpBarBg.x - target.hpBarBg.width / 2 + target.hpBar.width / 2;
      }
      if (this.scene && this.scene.add) {
        const line = this.scene.add.line(0, 0, this.x, this.y, target.x * 32 + 16, target.y * 32 + 16, 0x8888ff).setLineWidth(3).setDepth(200);
        this.scene.time.delayedCall(200, () => { line.destroy(); });
      }
      if (target.hp <= 0 && target.rect) {
        if (target.rect) target.rect.destroy();
        if (target.border) target.border.destroy();
        if (target.label) target.label.destroy();
        if (target.hpBar) target.hpBar.destroy();
        if (target.hpBarBg) target.hpBarBg.destroy();
        if (target.statusLabel) target.statusLabel.destroy();
      }
    }
  }
} 