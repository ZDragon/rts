// logic/PlayerUnits.js
// Контроллер управления юнитами игрока

const TILE_SIZE = 32;

export default class PlayerUnitsController {
  constructor(scene) {
    this.scene = scene;
    this.units = scene.units; // ссылка на массив юнитов игрока
    this.aiEnemies = () => scene.aiEnemies; // функция для доступа к врагам
  }

  update(dt) {
    for (const u of this.units) {
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
        if (dist > 28) {
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
              // Обновить HP-бар
              if (u.attackTarget.hpBar) {
                u.attackTarget.hpBar.width = (u.attackTarget.hp / u.attackTarget.maxHP) * u.attackTarget.hpBarBg.width;
                u.attackTarget.hpBar.x = u.attackTarget.hpBarBg.x - u.attackTarget.hpBarBg.width / 2 + u.attackTarget.hpBar.width / 2;
              }
              // Анимация разрушения и удаление цели
              if (u.attackTarget.hp <= 0) {
                if (u.attackTarget.sprite) {
                  const boom = this.scene.add.circle(u.attackTarget.x, u.attackTarget.y, 22, 0xffe066).setAlpha(0.7).setDepth(300);
                  this.scene.tweens.add({ targets: boom, alpha: 0, scale: 2, duration: 350, onComplete: () => boom.destroy() });
                  u.attackTarget.sprite.destroy();
                  u.attackTarget.label.destroy();
                  if (u.attackTarget.hpBar) u.attackTarget.hpBar.destroy();
                  if (u.attackTarget.hpBarBg) u.attackTarget.hpBarBg.destroy();
                  // Удаляем из массива юнитов ИИ
                  for (const ai of this.aiEnemies()) {
                    const idx = ai.units.indexOf(u.attackTarget);
                    if (idx !== -1) ai.units.splice(idx, 1);
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
    const n = units.length;
    const angleStep = (2 * Math.PI) / Math.max(1, n);
    const radius = 30 + 10 * n;
    units.forEach((u, i) => {
      const angle = i * angleStep;
      u.target = {
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius
      };
    });
  }
} 