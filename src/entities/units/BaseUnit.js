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
  constructor(scene, x, y, unitType, owner) {
    this.owner = owner;
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

  ensureParticleTexture() {
    if (!this.scene.textures.exists('unitParticle')) {
      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(2, 2, 2);
      graphics.generateTexture('unitParticle', 4, 4);
      graphics.destroy();
    }
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

    // Создаем текстуру для частиц
    this.ensureParticleTexture();

    // Создаем эмиттер частиц с базовой конфигурацией
    this.particles = this.scene.add.particles(this.x, this.y, 'unitParticle', {
      speed: { min: 30, max: 80 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 4000,
      emitting: false
    }).setDepth(49);
    
    console.log('Created particle emitter for unit at:', this.x, this.y);
  }

  update(time, delta) {

    switch (this.state) {
      case UNIT_STATES.MOVING:
        this.updateMoving(delta);
        break;
      case UNIT_STATES.IDLE:
        this.updateIdle(delta);
        break;
      default:
        break;
    }

    // Обновление визуальных элементов
    this.updateVisuals();
  }

  updateMoving(delta) {
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 2) {
        const move = Math.min(this.speed * delta / 1000, dist);
        this.x += (dx / dist) * move;
        this.y += (dy / dist) * move;
      } else {
        this.x = this.target.x;
        this.y = this.target.y;
        this.target = null;
        this.changeState(UNIT_STATES.IDLE);
        this.onArrive();
      }
    }
  }

  onArrive() {
    // Действия при прибытии в точку
  }

  updateIdle(delta) {
    // Обновляем ожидание
  }

  changeState(state) {
    this.state = state;
  }

  updateVisuals() {
    // Обновляем позиции всех элементов
    this.sprite.setPosition(this.x, this.y);
    this.label.setPosition(this.x, this.y);
    this.hpBarBg.setPosition(this.x, this.y - 22);
    this.hpBar.setPosition(this.x - 16 + (this.hp / this.maxHP) * 16, this.y - 22);
    this.statusLabel.setPosition(this.x, this.y - 28);
    
    // Обновляем позицию эмиттера частиц
    if (this.particles) {
      this.particles.setPosition(this.x, this.y);
    }
    
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

  setStatusText(text) {
    this.statusLabel.setText(text);
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

    // Эффект получения урона
    this.emitDamageParticles(amount);

    if (this.hp === 0 && oldHp > 0) {
      this.die();
    }
  }

  die() {
    this.state = UNIT_STATES.DEAD;

    // Эффект смерти
    this.emitDeathParticles();

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

  // Методы для работы с частицами
  emitDamageParticles(damage) {
    this.particles.setConfig({
      tint: 0xff0000
    });
    this.particles.explode(Math.ceil(damage / 5), this.x, this.y);
  }

  emitDeathParticles() {
    this.particles.setConfig({
      tint: [0xff0000, 0xff8800, 0xffff00]
    });
    this.particles.explode(20, this.x, this.y);
  }

  emitGatheringParticles(resourceType) {
    console.log('Emitting gathering particles for:', resourceType, 'at position:', this.x, this.y);
    
    if (!this.particles) {
      console.warn('Particles emitter not found!');
      return;
    }
    
    // Обновляем позицию эмиттера
    this.particles.setPosition(this.x, this.y);
    
    // Временно изменяем конфигурацию для цвета
    this.particles.setConfig({
      tint: this.getResourceColor(resourceType)
    });
    
    // Взрыв частиц
    this.particles.explode(5, this.x, this.y);
  }

  emitDepositParticles(resourceType, amount) {
    this.particles.setConfig({
      tint: this.getResourceColor(resourceType)
    });
    this.particles.explode(Math.min(amount, 10), this.x, this.y);
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
    this.changeState(UNIT_STATES.MOVING);
  }
}

// Рабочий юнит
export class WorkerUnit extends BaseUnit {
  constructor(scene, x, y, unitType, owner) {
    super(scene, x, y, unitType, owner);
    
    // Параметры добычи ресурсов
    this.gatherAmount = 2;  // Сколько добывает за раз
    this.carryCapacity = 10; // Сколько может нести
    this.carried = 0;        // Сколько несет сейчас
    this.carriedType = null; // Тип ресурса который несет
    this.gatherTarget = null; // Цель добычи (ResourceDeposit)
    this.gatherTimer = 0;    // Таймер добычи
    this.gatherInterval = 1; // Интервал добычи в секундах
  }

  getStatusText() {
    switch (this.state) {
      case UNIT_STATES.GATHERING:
        return `Добыча: ${this.carried}/${this.carryCapacity}`;
      case UNIT_STATES.MOVING:
        return this.carried > 0 ? `Несёт ${this.carriedType}: ${this.carried}` : 'Движение';
      case UNIT_STATES.IDLE:
        return this.carried > 0 ? `Несёт ${this.carriedType}: ${this.carried}` : 'Ожидание';
      default:
        return super.getStatusText();
    }
  }

  IsOnBase() {
    const dx = this.owner.base.x - this.x / 32;
    const dy = this.owner.base.y - this.y / 32;
    const dist = Math.sqrt(dx * dx + dy * dy);
      
    return dist <= 2;
  }

  IsOnDeposit() {
    if (!this.gatherTarget) return false;
    const dx = this.gatherTarget.x - this.x / 32;
    const dy = this.gatherTarget.y - this.y / 32;
    const dist = Math.sqrt(dx * dx + dy * dy);
      
    return dist <= 2;
  }

  onArrive() {
    if (this.IsOnBase()) {
      if (this.carried > 0) {
        this.depositResources();
        this.setStatusText('Сдача');
      }
    } else if (this.IsOnDeposit()) {
      if (this.carried < this.carryCapacity) {
        this.changeState(UNIT_STATES.GATHERING);
        this.gatherTimer = 0;
        this.setStatusText('Добыча');
      } else {
        this.returnToBase();
      }
    } else {
      this.setStatusText('Прибытие');
    }
  }

  startGathering(resourceType, deposit) {
    this.gatherTarget = deposit;
    this.carriedType = resourceType;
    
    // Если уже что-то несем и это другой тип ресурса - сначала сдаем на базу
    if (this.carried > 0 && this.carriedType !== resourceType) {
      this.returnToBase();
      return;
    }
    
    // Идем к ресурсу
    this.moveTo(deposit.x * 32 + 16, deposit.y * 32 + 16); // Конвертируем тайловые координаты в мировые
  }

  update(time, delta) {
    super.update(time, delta);

    switch (this.state) {
      case UNIT_STATES.GATHERING:
        this.updateGathering(delta);
        break;
      default:
        break;
    }
  }

  updateGathering(delta) {
    if (!this.gatherTarget) {
      this.changeState(UNIT_STATES.IDLE);
      return;
    }

    // Проверяем, есть ли еще ресурсы в залежах
    if (this.gatherTarget.amount <= 0) {
      this.gatherTarget = null;
      this.carriedType = null;
      this.changeState(UNIT_STATES.IDLE);
      this.statusLabel.setText('Залежи истощены');
      return;
    }

    this.gatherTimer += delta / 1000;
    
    if (this.gatherTimer >= this.gatherInterval) {
      this.gatherTimer = 0;
      
      // Добываем ресурс
      const amountToGather = Math.min(
        this.gatherAmount,
        this.carryCapacity - this.carried,
        this.gatherTarget.amount
      );
      
      if (amountToGather > 0) {
        this.carried += amountToGather;
        this.gatherTarget.amount -= amountToGather;
        
        // Обновляем визуальное отображение залежей
        if (this.gatherTarget.visuals && this.gatherTarget.visuals.amountLabel) {
          this.gatherTarget.visuals.amountLabel.setText(this.gatherTarget.amount.toString());
        }
        
        // Визуальный эффект добычи
        console.log('Gathering resource:', this.carriedType, 'amount:', amountToGather);
        this.emitGatheringParticles(this.carriedType);
      }
      
      // Если инвентарь полон или ресурсы закончились - идем на базу
      if (this.carried >= this.carryCapacity || this.gatherTarget.amount <= 0) {
        this.returnToBase();
      }
    }
  }

  returnToBase() {
    if (this.owner && this.owner.base) {
      this.moveTo(this.owner.base.x * 32 + 16, this.owner.base.y * 32 + 16);
    }
  }

  depositResources() {
    if (this.carried > 0 && this.carriedType && this.owner) {
      // Добавляем ресурсы игроку
      const resourcesToAdd = {};
      resourcesToAdd[this.carriedType] = this.carried;
      this.owner.addResources(resourcesToAdd);
      
                    // Визуальный эффект сдачи ресурсов
       this.emitDepositParticles(this.carriedType, this.carried);
      
      this.carried = 0;
      
      // Если есть активная цель добычи и в ней остались ресурсы - возвращаемся
      if (this.gatherTarget && this.gatherTarget.amount > 0) {
        this.moveTo(this.gatherTarget.x * 32 + 16, this.gatherTarget.y * 32 + 16);
      } else {
        // Иначе переходим в режим ожидания
        this.gatherTarget = null;
        this.carriedType = null;
        this.changeState(UNIT_STATES.IDLE);
      }
    }
  }

  getResourceColor(resourceType) {
    switch (resourceType) {
      case 'металл': return 0x888888;
      case 'энергия': return 0x00ffff;
      case 'еда': return 0x00ff00;
      default: return 0xffffff;
    }
  }

  changeState(state) {
    this.state = state;
  }
}

// Боевой юнит
export class CombatUnit extends BaseUnit {
  constructor(scene, x, y, unitType, owner) {
    super(scene, x, y, unitType, owner);
    
    // Боевые параметры
    this.attackDamage = unitType.attackDamage;
    this.attackRange = unitType.attackRange;
    this.attackCooldown = 0;
    this.attackTarget = null;
  }

  getStatusText() {
    switch (this.state) {
      case UNIT_STATES.ATTACKING:
        return this.attackTarget ? 'Атака' : 'Ищет цель';
      case UNIT_STATES.MOVING:
        return this.attackTarget ? 'Сближение' : 'Движение';
      case UNIT_STATES.RETREATING:
        return 'Отступление';
      default:
        return super.getStatusText();
    }
  }

  update(time, delta) {
    super.update(time, delta);

    if (this.state === UNIT_STATES.DEAD) return;

    // Обновление кулдауна атаки
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta / 1000;
    }

    // Логика атаки
    if (this.attackTarget) {
      // Проверяем, жива ли цель
      if (this.isTargetDead()) {
        this.attackTarget = null;
        this.changeState(UNIT_STATES.IDLE);
        return;
      }

      const targetPos = this.getAttackTargetPosition();
      if (!targetPos) {
        this.attackTarget = null;
        this.changeState(UNIT_STATES.IDLE);
        return;
      }

      const distToTarget = PhaserMath.Distance.Between(
        this.x, this.y,
        targetPos.x, targetPos.y
      );

      if (distToTarget > this.attackRange) {
        // Цель вне радиуса - движемся к ней
        this.changeState(UNIT_STATES.MOVING);
        this.moveTo(targetPos.x, targetPos.y);
      } else {
        // Цель в радиусе - атакуем
        this.changeState(UNIT_STATES.ATTACKING);
        this.target = null; // Останавливаем движение

        if (this.attackCooldown <= 0) {
          this.attack();
          this.attackCooldown = this.type.attackCooldown;
        }
      }
    } else if (this.state === UNIT_STATES.ATTACKING) {
      // Если нет цели для атаки, переходим в режим ожидания
      this.changeState(UNIT_STATES.IDLE);
    }
  }

  // Получить позицию цели атаки
  getAttackTargetPosition() {
    if (!this.attackTarget) return null;
    
    if (this.attackTargetType === 'building') {
      return {
        x: this.attackTarget.x * 32,
        y: this.attackTarget.y * 32
      };
    }

    // Возвращаем позицию цели атаки
    return {
      x: this.attackTarget.x,
      y: this.attackTarget.y
    };
  }

  // Проверить, мертва ли цель
  isTargetDead() {
    if (!this.attackTarget) return true;
    
    // Проверяем разные типы целей
    if (this.attackTarget.state === UNIT_STATES.DEAD) return true;
    if (this.attackTarget.state === 'destroyed') return true;
    if (this.attackTarget.hp !== undefined && this.attackTarget.hp <= 0) return true;
    
    return false;
  }

  attack() {
    if (!this.attackTarget) return;

    const targetPos = this.getAttackTargetPosition();
    if (!targetPos) return;

    console.log(`${this.type.name} атакует цель на позиции:`, targetPos);

    // Визуальный эффект атаки
    const line = this.scene.add.line(
      0, 0,
      this.x, this.y,
      targetPos.x, targetPos.y,
      0x22aaff
    ).setLineWidth(3).setDepth(200);

    this.scene.time.delayedCall(200, () => {
      line?.destroy();
    });

    // Эффект выстрела
    this.emitDamageParticles(5);

    // Наносим урон цели
    this.dealDamageToTarget();
  }

  // Универсальный метод нанесения урона
  dealDamageToTarget() {
    if (!this.attackTarget) return;

    console.log(`Наносим ${this.attackDamage} урона цели типа:`, this.attackTarget.constructor.name);

    // Проверяем различные методы получения урона
    if (typeof this.attackTarget.takeDamage === 'function') {
      // Стандартный метод для юнитов
      this.attackTarget.takeDamage(this.attackDamage);
    } else if (typeof this.attackTarget.receiveDamage === 'function') {
      // Альтернативный метод для некоторых объектов ИИ
      this.attackTarget.receiveDamage(this.attackDamage);
    } else if (this.attackTarget.hp !== undefined) {
      // Прямое уменьшение HP если нет специального метода
      this.attackTarget.hp = Math.max(0, this.attackTarget.hp - this.attackDamage);
      console.log(`HP цели после атаки: ${this.attackTarget.hp}`);
    } else {
      console.warn('Не удалось нанести урон цели - нет подходящего метода');
    }
  }

  // Установить цель для атаки
  setAttackTarget(target, targetType) {
    this.attackTarget = target;
    this.attackTargetType = targetType;
    console.log(`${this.type.name} получил приказ атаковать:`, target.constructor.name);
  }

  // Очистить цель атаки
  clearAttackTarget() {
    this.attackTarget = null;
    this.attackTargetType = null;
    if (this.state === UNIT_STATES.ATTACKING) {
      this.changeState(UNIT_STATES.IDLE);
    }
  }

  retreat() {
    this.changeState(UNIT_STATES.RETREATING);
    this.attackTarget = null;
    this.attackTargetType = null;
    // Здесь можно добавить логику отступления к ближайшему зданию
  }
}

export { UNIT_STATES }; 