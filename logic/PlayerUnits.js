// logic/PlayerUnits.js
// Контроллер управления юнитами игрока

const TILE_SIZE = 32;
import PathfindingController from './PathfindingController.js';

export default class PlayerUnitsController {
  constructor(scene) {
    this.scene = scene;
    this.units = scene.units; // ссылка на массив юнитов игрока
    this.aiEnemies = () => scene.aiEnemies; // функция для доступа к врагам
    this.pathfinder = new PathfindingController();
  }

  update(dt) {
    for (const u of this.units) {
      // --- Отображение статуса задачи ---
      if (!u.statusLabel) {
        u.statusLabel = this.scene.add.text(u.x, u.y - 28, '', { fontSize: '12px', color: '#ffb', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(60);
      }
      u.statusLabel.x = u.x;
      u.statusLabel.y = u.y - 28;
      let statusText = '';
      if (u.type.id === 'worker' && u.task) {
        if (u.task.state === 'to_resource') statusText = 'Идёт к ресурсу';
        else if (u.task.state === 'gathering') statusText = `Добыча: ${u.task.carried}/10`;
        else if (u.task.state === 'to_base') statusText = `Несёт: ${u.task.carried}`;
      } else if (u.type.id === 'worker') {
        statusText = 'Свободен';
      } else if ((u.type.id === 'soldier' || u.type.id === 'tank')) {
        if (u.attackTarget) {
          let tx, ty;
          if (u.attackTarget.sprite) {
            tx = u.attackTarget.x;
            ty = u.attackTarget.y;
          } else {
            tx = u.attackTarget.x * TILE_SIZE + u.attackTarget.size * TILE_SIZE / 2;
            ty = u.attackTarget.y * TILE_SIZE + u.attackTarget.size * TILE_SIZE / 2;
          }
          const dist = Phaser.Math.Distance.Between(u.x, u.y, tx, ty);
          const attackRadius = u.type.id === 'tank' ? 40 : 28;
          if (dist <= attackRadius) statusText = 'Атака';
          else statusText = 'Движение к цели';
        } else if (u.target) {
          statusText = 'Движение';
        } else {
          statusText = 'Ожидание';
        }
      } else if (u.type.id === 'scout') {
        statusText = 'Разведка';
      }
      u.statusLabel.setText(statusText);
      u.statusLabel.setVisible(true);
      // --- Атака цели ---
      if ((u.type.id === 'soldier' || u.type.id === 'tank') && u.attackTarget) {
        let tx, ty;
        if (u.attackTarget.sprite) {
          tx = u.attackTarget.x;
          ty = u.attackTarget.y;
        } else {
          // Здание: центр
          tx = u.attackTarget.x * TILE_SIZE + u.attackTarget.size * TILE_SIZE / 2;
          ty = u.attackTarget.y * TILE_SIZE + u.attackTarget.size * TILE_SIZE / 2;
        }
        const dist = Phaser.Math.Distance.Between(u.x, u.y, tx, ty);
        const attackRadius = u.type.id === 'tank' ? 40 : 28;
        if (dist > attackRadius) {
          // Двигаемся к цели
          const speed = 80;
          const move = Math.min(speed * dt, dist);
          u.x += ((tx - u.x) / dist) * move;
          u.y += ((ty - u.y) / dist) * move;
        } else {
          // Атака
          if (!u.attackCooldown) u.attackCooldown = 0;
          u.attackCooldown -= dt;
          if (u.attackCooldown <= 0) {
            u.attackCooldown = u.type.id === 'tank' ? 1.2 : 0.7;
            // Визуализация атаки
            const line = this.scene.add.line(0, 0, u.x, u.y, tx, ty, 0x22aaff).setLineWidth(3).setDepth(200);
            this.scene.time.delayedCall(200, () => { line.destroy(); });
            // Урон по цели
            if (u.attackTarget.hp !== undefined) {
              u.attackTarget.hp -= u.type.id === 'tank' ? 30 : 15;
              // Вызов реакции ИИ на урон (юниты и здания)
              for (const ai of this.aiEnemies()) {
                if (ai.units.includes(u.attackTarget) || ai.buildings.includes(u.attackTarget)) {
                  ai.onUnitDamaged(u.attackTarget, u);
                }
              }
              // Отладка: выводим урон по зданиям
              if (u.attackTarget.type && u.attackTarget.type.name) {
                console.log(`Урон по зданию: ${u.attackTarget.type.name}, HP: ${u.attackTarget.hp}`);
              }
              // Обновить HP-бар
              if (u.attackTarget.hpBar) {
                u.attackTarget.hpBar.width = (u.attackTarget.hp / u.attackTarget.maxHP) * u.attackTarget.hpBarBg.width;
                u.attackTarget.hpBar.x = u.attackTarget.hpBarBg.x - u.attackTarget.hpBarBg.width / 2 + u.attackTarget.hpBar.width / 2;
              }
              // Анимация разрушения и удаление цели
              if (u.attackTarget.hp <= 0) {
                if (u.attackTarget.sprite) {
                  // --- Анимация разрушения юнита ---
                  const boom = this.scene.add.circle(u.attackTarget.x, u.attackTarget.y, 22, 0xffe066).setAlpha(0.7).setDepth(300);
                  this.scene.tweens.add({
                    targets: boom,
                    alpha: 0,
                    scale: 2,
                    duration: 350,
                    onComplete: () => boom.destroy()
                  });
                  u.attackTarget.sprite.destroy();
                  u.attackTarget.label.destroy();
                  if (u.attackTarget.hpBar) u.attackTarget.hpBar.destroy();
                  if (u.attackTarget.hpBarBg) u.attackTarget.hpBarBg.destroy();
                  if (u.attackTarget.statusLabel) u.attackTarget.statusLabel.destroy();
                  // Удаляем из массива юнитов ИИ
                  const idx = this.aiEnemies().flatMap(ai => ai.units).indexOf(u.attackTarget);
                  if (idx !== -1) {
                    for (const ai of this.aiEnemies()) {
                      const i = ai.units.indexOf(u.attackTarget);
                      if (i !== -1) ai.units.splice(i, 1);
                    }
                  }
                } else {
                  // Здание ИИ
                  const b = u.attackTarget;
                  const size = b.type.size * TILE_SIZE;
                  const boom = this.scene.add.rectangle(b.x * TILE_SIZE + size / 2, b.y * TILE_SIZE + size / 2, size, size, 0xffa000).setAlpha(0.6).setDepth(300);
                  this.scene.tweens.add({ targets: boom, alpha: 0, scaleX: 1.7, scaleY: 1.7, duration: 450, onComplete: () => boom.destroy() });
                  if (b.rect) b.rect.destroy();
                  if (b.border) b.border.destroy();
                  if (b.label) b.label.destroy();
                  if (b.hpBar) b.hpBar.destroy();
                  if (b.hpBarBg) b.hpBarBg.destroy();
                  for (const ai of this.aiEnemies()) {
                    const idx = ai.buildings.indexOf(b);
                    if (idx !== -1) ai.buildings.splice(idx, 1);
                  }
                }
                u.attackTarget = null;
              }
            }
          }
        }
      }
      // --- Перемещение ---
      if (u.target) {
        const dx = u.target.x - u.x;
        const dy = u.target.y - u.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 80;
        if (dist > 2) {
          const move = Math.min(speed * dt, dist);
          u.x += (dx / dist) * move;
          u.y += (dy / dist) * move;
        } else {
          // Если у юнита есть задача добычи — не сбрасываем target, ResourceGathering сам управляет
          const hasGatherTask = this.scene.resourceGathering && this.scene.resourceGathering.gatherTasks && this.scene.resourceGathering.gatherTasks.has(u);
          if (!hasGatherTask) {
            u.x = u.target.x;
            u.y = u.target.y;
            delete u.target;
          }
        }
      }
      // --- Движение по пути ---
      if (u.path && u.pathStep < u.path.length) {
        const next = u.path[u.pathStep];
        const tx = next.x * 32 + 16;
        const ty = next.y * 32 + 16;
        const dx = tx - u.x, dy = ty - u.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const speed = u.type.speed || 70;
        if (dist > 2) {
          const move = Math.min(speed * dt, dist);
          u.x += (dx / dist) * move;
          u.y += (dy / dist) * move;
          u.sprite.x = u.x;
          u.sprite.y = u.y;
          u.label.x = u.x;
          u.label.y = u.y;
          if (u.hpBar && u.hpBarBg) {
            let offset = -22;
            if (u.type.id === 'scout') offset = -18;
            u.hpBar.x = u.x;
            u.hpBar.y = u.y + offset;
            u.hpBarBg.x = u.x;
            u.hpBarBg.y = u.y + offset;
          }
          if (u.statusLabel) {
            u.statusLabel.x = u.x;
            u.statusLabel.y = u.y - 28;
          }
        } else {
          u.x = tx; u.y = ty;
          u.pathStep++;
        }
      }
      // Обновление позиций
      u.sprite.x = u.x; u.sprite.y = u.y;
      u.label.x = u.x; u.label.y = u.y;
      u.hpBarBg.x = u.x; u.hpBarBg.y = u.y - 22;
      u.hpBar.x = u.x - 16 + (u.hp / u.maxHP) * 16;
      u.hpBar.y = u.y - 22;
      u.hpBar.width = 32 * (u.hp / u.maxHP);
    }
    // Удаление погибших
    for (let i = this.units.length - 1; i >= 0; i--) {
      if (this.units[i].hp <= 0) {
        this.units[i].sprite.destroy();
        this.units[i].label.destroy();
        this.units[i].hpBar.destroy();
        this.units[i].hpBarBg.destroy();
        this.units.splice(i, 1);
      }
    }
  }

  // Назначение атаки по ПКМ по юниту или зданию ИИ
  handleRightClick(worldPoint, selectedUnits) {
    // Клик по ресурсу — не обрабатываем здесь
    // Клик по юниту ИИ
    for (const ai of this.aiEnemies()) {
      const target = ai.units.find(u => Phaser.Math.Distance.Between(worldPoint.x, worldPoint.y, u.x, u.y) < 18);
      if (target) {
        selectedUnits.forEach(u => {
          if (u.type.id === 'soldier' || u.type.id === 'tank') {
            u.attackTarget = target;
          }
        });
        return true;
      }
    }
    // Клик по зданию ИИ
    for (const ai of this.aiEnemies()) {
      const enemyBuilding = ai.buildings.find(b => {
        const size = b.size * TILE_SIZE;
        return worldPoint.x >= b.x * TILE_SIZE && worldPoint.x < (b.x + b.size) * TILE_SIZE && worldPoint.y >= b.y * TILE_SIZE && worldPoint.y < (b.y + b.size) * TILE_SIZE;
      });
      if (enemyBuilding) {
        selectedUnits.forEach(u => {
          if (u.type.id === 'soldier' || u.type.id === 'tank') {
            u.attackTarget = enemyBuilding;
          }
        });
        return true;
      }
    }
    return false;
  }

  // Групповое перемещение
  moveGroupTo(units, x, y) {
    const map = this.scene.tileData;
    // Собираем препятствия (юниты, здания, ресурсы)
    const obstacles = new Set();
    for (const u of this.scene.units) {
      const tx = Math.floor(u.x / 32), ty = Math.floor(u.y / 32);
      obstacles.add(`${tx},${ty}`);
    }
    for (const b of this.scene.buildingsOnMap) {
      for (let dx = 0; dx < b.size; dx++) for (let dy = 0; dy < b.size; dy++) {
        obstacles.add(`${b.x + dx},${b.y + dy}`);
      }
    }
    for (const res of this.scene.resourceObjects) {
      obstacles.add(`${res.x},${res.y}`);
    }
    // Для каждого юнита строим путь
    for (const u of units) {
      // Определяем разрешённые тайлы для типа юнита
      let allowedTiles = new Set([0,3]); // по умолчанию: трава, песок
      if (u.type.id === 'tank') allowedTiles = new Set([0,3,2]); // танк может по камню
      // ... можно расширить для других типов
      const from = { x: Math.floor(u.x / 32), y: Math.floor(u.y / 32) };
      const to = { x: Math.floor(x / 32), y: Math.floor(y / 32) };
      // Не учитываем самого себя как препятствие
      const selfObstacles = new Set(obstacles);
      selfObstacles.delete(`${from.x},${from.y}`);
      const path = this.pathfinder.findPath(u, from, to, map, selfObstacles, allowedTiles);
      if (!path) {
        this.scene.showMessage('Юнит не может дойти до точки');
        u.path = null;
        continue;
      }
      u.path = path;
      u.pathStep = 0;
      u.target = null;
      u.attackTarget = null;
    }
  }
} 