import { Math as PhaserMath } from 'phaser';

// Состояния юнита
const UNIT_STATES = {
  IDLE: 'idle',           // Простой
  MOVING: 'moving',       // Движется
  DEAD: 'dead',          // Мертв
  GATHERING: 'gathering', // Добывает ресурсы (для рабочих)
  ATTACKING: 'attacking', // Атакует (для боевых юнитов)
  RETREATING: 'retreating' // Отступает (для боевых юнитов)
};

// Базовый класс юнита
export class BaseUnit {
  constructor(scene, x, y, unitType) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.type = unitType;
    
    // Базовые параметры
    this.maxHP = unitType.maxHP;
    this.hp = this.maxHP;
    this.speed = unitType.speed;
    this.vision = unitType.vision;
    
    // Состояние
    this.state = UNIT_STATES.IDLE;
    this.selected = false;
    this.target = null;
    
    // Создаем визуальное представление
    this.createVisuals();
  }

  createVisuals() {
    // Спрайт юнита
    this.sprite = this.scene.add.circle(
      this.x,
      this.y,
      12,
      this.type.color
    ).setDepth(50);

    // Название
    this.label = this.scene.add.text(
      this.x,
      this.y,
      this.type.name,
      { 
        fontSize: '12px',
        color: '#fff',
        fontFamily: 'sans-serif',
        backgroundColor: '#00000088',
        padding: { x: 3, y: 1 }
      }
    ).setOrigin(0.5).setDepth(51);

    // HP бар
    this.hpBarBg = this.scene.add.rectangle(
      this.x,
      this.y - 22,
      32,
      4,
      0x000000,
      0.8
    ).setDepth(51);

    this.hpBar = this.scene.add.rectangle(
      this.x,
      this.y - 22,
      32,
      4,
      0x00ff00
    ).setDepth(52);

    // Статус
    this.statusLabel = this.scene.add.text(
      this.x,
      this.y - 28,
      '',
      { fontSize: '11px', color: '#ffb', fontFamily: 'sans-serif' }
    ).setOrigin(0.5).setDepth(52);

    // Частицы для эффектов
    const particleTexture = this.scene.textures.exists('pixel') ? 'pixel' : 'particle';
    if (!this.scene.textures.exists(particleTexture)) {
      // Создаем простую текстуру для частиц если нет ни одной подходящей
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xffffff);
      graphics.fillRect(0, 0, 2, 2);
      graphics.generateTexture('particle', 2, 2);
      graphics.destroy();
    }

    this.particles = this.scene.add.particles(0, 0, particleTexture, {
      lifespan: 1000,
      gravityY: 100,
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [this.type.color, 0xffffff],
      emitting: false
    }).setDepth(49);
  }

  update(time, delta) {
    if (this.state === UNIT_STATES.DEAD) return;

    // Обновление движения
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 2) {
        this.state = UNIT_STATES.MOVING;
        const move = Math.min(this.speed * delta / 1000, dist);
        this.x += (dx / dist) * move;
        this.y += (dy / dist) * move;
      } else {
        this.x = this.target.x;
        this.y = this.target.y;
        this.target = null;
        this.state = UNIT_STATES.IDLE;
      }
    }

    // Обновление визуальных элементов
    this.updateVisuals();
  }

  updateVisuals() {
    // Обновляем позиции всех элементов
    this.sprite.setPosition(this.x, this.y);
    this.label.setPosition(this.x, this.y);
    this.hpBarBg.setPosition(this.x, this.y - 22);
    this.hpBar.setPosition(this.x - 16 + (this.hp / this.maxHP) * 16, this.y - 22);
    this.statusLabel.setPosition(this.x, this.y - 28);
    
    // Обновляем HP бар
    this.hpBar.width = 32 * (this.hp / this.maxHP);
    this.hpBar.fillColor = this.hp > this.maxHP * 0.6 ? 0x00ff00 : 
                          this.hp > this.maxHP * 0.3 ? 0xffff00 : 
                          0xff0000;

    // Обновляем статус
    this.statusLabel.setText(this.getStatusText());
  }

  getStatusText() {
    switch (this.state) {
      case UNIT_STATES.IDLE: return 'Ожидание';
      case UNIT_STATES.MOVING: return 'Движение';
      case UNIT_STATES.DEAD: return '';
      default: return '';
    }
  }

  takeDamage(amount) {
    if (this.state === UNIT_STATES.DEAD) return;

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
      x: this.x,
      y: this.y,
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
      this.die();
    }
  }

  die() {
    this.state = UNIT_STATES.DEAD;

    // Большой взрыв
    this.particles.createEmitter({
      x: this.x,
      y: this.y,
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 2, end: 0 },
      lifespan: 1000,
      quantity: 30,
      tint: [0xff0000, 0xff8800, 0xffff00],
      emitting: false,
      explode: true
    });

    // Анимация смерти
    this.scene.tweens.add({
      targets: [this.sprite, this.label, this.hpBar, this.hpBarBg, this.statusLabel],
      alpha: 0,
      scale: 0.5,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        this.destroy();
      }
    });
  }

  destroy() {
    this.sprite?.destroy();
    this.label?.destroy();
    this.hpBar?.destroy();
    this.hpBarBg?.destroy();
    this.statusLabel?.destroy();
    this.particles?.destroy();
  }

  setSelected(selected) {
    this.selected = selected;
    if (selected) {
      this.sprite.setStrokeStyle(2, 0xffff00);
    } else {
      this.sprite.setStrokeStyle();
    }
  }

  moveTo(x, y) {
    this.target = { x, y };
    this.state = UNIT_STATES.MOVING;
  }
}

// Рабочий юнит
export class WorkerUnit extends BaseUnit {
  constructor(scene, x, y, unitType) {
    super(scene, x, y, unitType);
    
    // Параметры добычи ресурсов
    this.gatherAmount = 2;  // Сколько добывает за раз
    this.carryCapacity = 10; // Сколько может нести
    this.carried = 0;        // Сколько несет сейчас
    this.gatherTarget = null; // Цель добычи
    this.depositTarget = null; // Куда нести ресурсы
  }

  getStatusText() {
    switch (this.state) {
      case UNIT_STATES.GATHERING:
        return `Добыча: ${this.carried}/${this.carryCapacity}`;
      case UNIT_STATES.MOVING:
        return this.carried > 0 ? `Несёт: ${this.carried}` : 'Движение';
      case UNIT_STATES.IDLE:
        return this.carried > 0 ? `Несёт: ${this.carried}` : 'Ожидание';
      default:
        return super.getStatusText();
    }
  }

  startGathering(resource, deposit) {
    this.gatherTarget = resource;
    this.depositTarget = deposit;
    this.moveTo(resource.x, resource.y);
  }

  update(time, delta) {
    super.update(time, delta);

    if (this.state === UNIT_STATES.DEAD) return;

    // Логика добычи ресурсов
    if (this.gatherTarget && !this.target) {
      if (this.carried < this.carryCapacity) {
        this.state = UNIT_STATES.GATHERING;
        this.carried += this.gatherAmount;
        if (this.carried >= this.carryCapacity) {
          this.moveTo(this.depositTarget.x, this.depositTarget.y);
        }
      } else {
        this.moveTo(this.depositTarget.x, this.depositTarget.y);
      }
    }
  }
}

// Боевой юнит
export class CombatUnit extends BaseUnit {
  constructor(scene, x, y, unitType) {
    super(scene, x, y, unitType);
    
    // Боевые параметры
    this.attackDamage = unitType.id === 'tank' ? 30 : 15;
    this.attackRange = unitType.id === 'tank' ? 40 : 28;
    this.attackCooldown = 0;
    this.attackTarget = null;
  }

  getStatusText() {
    switch (this.state) {
      case UNIT_STATES.ATTACKING:
        return 'Атака';
      case UNIT_STATES.RETREATING:
        return 'Отступление';
      default:
        return super.getStatusText();
    }
  }

  update(time, delta) {
    super.update(time, delta);

    if (this.state === UNIT_STATES.DEAD) return;

    // Логика атаки
    if (this.attackTarget) {
      let targetPos = this.getTargetPosition();
      if (!targetPos) {
        this.attackTarget = null;
        return;
      }

      const dist = PhaserMath.Distance.Between(
        this.x, this.y,
        targetPos.x, targetPos.y
      );

      if (dist > this.attackRange) {
        // Движемся к цели
        this.state = UNIT_STATES.MOVING;
        this.moveTo(targetPos.x, targetPos.y);
      } else {
        // Атакуем
        this.state = UNIT_STATES.ATTACKING;
        this.target = null;

        if (this.attackCooldown <= 0) {
          this.attack();
          this.attackCooldown = this.type.id === 'tank' ? 1.2 : 0.7;
        }
      }

      this.attackCooldown -= delta / 1000;
    }
  }

  getTargetPosition() {
    if (!this.target) return null;

    const angle = PhaserMath.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const distance = PhaserMath.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    const attackDistance = Math.min(distance, this.attackRange);

    return {
      x: this.target.x - Math.cos(angle) * attackDistance,
      y: this.target.y - Math.sin(angle) * attackDistance
    };
  }

  attack() {
    if (!this.attackTarget) return;

    const targetPos = this.getTargetPosition();
    if (!targetPos) return;

    // Визуальный эффект атаки
    const line = this.scene.add.line(
      0, 0,
      this.x, this.y,
      targetPos.x, targetPos.y,
      0x22aaff
    ).setLineWidth(3).setDepth(200);

    this.scene.time.delayedCall(200, () => {
      line.destroy();
    });

    // Наносим урон
    if (typeof this.attackTarget.takeDamage === 'function') {
      this.attackTarget.takeDamage(this.attackDamage);
    }
  }

  retreat() {
    this.state = UNIT_STATES.RETREATING;
    this.attackTarget = null;
    // Здесь можно добавить логику отступления к ближайшему зданию
  }
}

export { UNIT_STATES }; 