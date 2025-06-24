// Состояния зданий ИИ
export const AI_BUILDING_STATES = {
  CONSTRUCTION: 'construction',
  IDLE: 'idle',
  PRODUCING: 'producing',
  ATTACKING: 'attacking',
  DAMAGED: 'damaged',
  DESTROYED: 'destroyed'
};

export default class AIBuilding {
  constructor(scene, strategist, buildingType, x, y) {
    this.scene = scene;
    this.strategist = strategist;
    this.type = buildingType;
    this.x = x;
    this.y = y;
    
    // Основные параметры
    this.hp = buildingType.maxHP || 300;
    this.maxHP = buildingType.maxHP || 300;
    this.buildTime = buildingType.buildTime || 5;
    this.constructionProgress = 0;
    
    // Состояние и логика
    this.state = AI_BUILDING_STATES.CONSTRUCTION;
    this.stateTimer = 0;
    this.lastStateChange = 0;
    
    // Производство (для фабрик юнитов)
    this.productionQueue = [];
    this.currentProduction = null;
    this.productionProgress = 0;
    
    // Боевые параметры (для оборонительных зданий)
    this.attackRange = buildingType.attackRange || 0;
    this.attackDamage = buildingType.attackDamage || 0;
    this.attackCooldown = 0;
    this.attackTarget = null;
    
    // Визуальные элементы
    this.rect = null;
    this.border = null;
    this.label = null;
    this.hpBarBg = null;
    this.hpBar = null;
    this.progressBarBg = null;
    this.progressBar = null;
    this.statusText = null;
    
    // Создаем визуализацию
    this.createVisuals();
    
    // Запускаем анимацию строительства
    this.startConstructionAnimation();
    
    console.log(`AIBuilding создано: ${this.type.name} в (${x}, ${y})`);
  }

  createVisuals() {
    const TILE_SIZE = 32;
    const size = this.type.size * TILE_SIZE;
    const centerX = this.x * TILE_SIZE + size / 2;
    const centerY = this.y * TILE_SIZE + size / 2;

    // Основное тело здания
    this.rect = this.scene.add.rectangle(
      centerX, 
      centerY, 
      size, 
      size, 
      this.type.color
    ).setDepth(50);

    // Рамка здания
    this.border = this.scene.add.rectangle(
      centerX, 
      centerY, 
      size, 
      size
    ).setStrokeStyle(3, 0xff4444).setDepth(51);

    // Название здания
    this.label = this.scene.add.text(
      centerX, 
      centerY, 
      this.type.name, 
      { 
        fontSize: '12px', 
        color: '#fff', 
        fontFamily: 'sans-serif',
        backgroundColor: '#00000088',
        padding: { x: 4, y: 2 }
      }
    ).setOrigin(0.5).setDepth(52);

    // Полоска HP (фон)
    this.hpBarBg = this.scene.add.rectangle(
      centerX, 
      centerY - size/2 - 10, 
      size - 8, 
      6, 
      0x444444
    ).setDepth(53);

    // Полоска HP
    this.hpBar = this.scene.add.rectangle(
      centerX - (size-8)/2, 
      centerY - size/2 - 10, 
      size - 8, 
      6, 
      0x00ff00
    ).setOrigin(0, 0.5).setDepth(54);

    // Полоска прогресса (фон)
    this.progressBarBg = this.scene.add.rectangle(
      centerX, 
      centerY + size/2 + 10, 
      size - 8, 
      6, 
      0x444444
    ).setDepth(53);

    // Полоска прогресса
    this.progressBar = this.scene.add.rectangle(
      centerX - (size-8)/2, 
      centerY + size/2 + 10, 
      0, 
      6, 
      0xffff00
    ).setOrigin(0, 0.5).setDepth(54);

    // Текст состояния
    this.statusText = this.scene.add.text(
      centerX, 
      centerY + size/2 + 25, 
      'Строительство...', 
      { 
        fontSize: '10px', 
        color: '#ffff00', 
        fontFamily: 'sans-serif',
        backgroundColor: '#00000088',
        padding: { x: 2, y: 1 }
      }
    ).setOrigin(0.5).setDepth(52);

    // Изначально скрываем прогресс-бар
    this.updateProgressBarVisibility();
  }

  startConstructionAnimation() {
    // Анимация мерцания во время строительства
    this.scene.tweens.add({
      targets: this.rect,
      alpha: { from: 0.3, to: 1.0 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  update(dt) {
    this.stateTimer += dt;
    this.updateState(dt);
    this.updateVisuals();
    
    // Обновляем кулдаун атаки
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }
  }

  updateState(dt) {
    switch (this.state) {
      case AI_BUILDING_STATES.CONSTRUCTION:
        this.updateConstruction(dt);
        break;
        
      case AI_BUILDING_STATES.IDLE:
        this.updateIdle(dt);
        break;
        
      case AI_BUILDING_STATES.PRODUCING:
        this.updateProduction(dt);
        break;
        
      case AI_BUILDING_STATES.ATTACKING:
        this.updateAttacking(dt);
        break;
        
      case AI_BUILDING_STATES.DAMAGED:
        this.updateDamaged(dt);
        break;
    }
  }

  updateConstruction(dt) {
    this.constructionProgress += dt;
    const progress = Math.min(this.constructionProgress / this.buildTime, 1);
    
    if (progress >= 1) {
      this.completeConstruction();
    }
    
    // Обновляем прогресс-бар
    const maxWidth = (this.type.size * 32) - 8;
    this.progressBar.width = maxWidth * progress;
  }

  updateIdle(dt) {
    // Проверяем, есть ли что-то в очереди производства
    if (this.canProduce() && this.productionQueue.length > 0) {
      this.startProduction();
    }
    
    // Проверяем, есть ли враги в радиусе атаки
    if (this.canAttack()) {
      this.searchForTargets();
    }
  }

  updateProduction(dt) {
    if (!this.currentProduction) return;
    
    this.productionProgress += dt;
    const progress = this.productionProgress / this.currentProduction.buildTime;
    
    if (progress >= 1) {
      this.completeProduction();
    }
    
    // Обновляем прогресс-бар
    const maxWidth = (this.type.size * 32) - 8;
    this.progressBar.width = maxWidth * progress;
  }

  updateAttacking(dt) {
    if (!this.attackTarget || this.isTargetDead()) {
      this.clearAttackTarget();
      return;
    }
    
    if (this.attackCooldown <= 0) {
      this.performAttack();
      this.attackCooldown = 1.5; // Кулдаун атаки
    }
  }

  updateDamaged(dt) {
    // Состояние повреждения - здание мигает красным
    if (this.stateTimer > 2) { // 2 секунды в состоянии повреждения
      this.changeState(AI_BUILDING_STATES.IDLE);
    }
  }

  completeConstruction() {
    console.log(`AIBuilding завершило строительство: ${this.type.name}`);
    
    // Останавливаем анимацию строительства
    this.scene.tweens.killTweensOf(this.rect);
    this.rect.setAlpha(1);
    
    this.changeState(AI_BUILDING_STATES.IDLE);
  }

  startProduction() {
    if (this.productionQueue.length === 0) return;
    
    this.currentProduction = this.productionQueue.shift();
    this.productionProgress = 0;
    this.changeState(AI_BUILDING_STATES.PRODUCING);
    
    console.log(`AIBuilding начало производство: ${this.currentProduction.name}`);
  }

  completeProduction() {
    if (!this.currentProduction) return;
    
    console.log(`AIBuilding завершило производство: ${this.currentProduction.name}`);
    
    // Уведомляем стратега о завершении производства
    this.strategist.onUnitProduced(this.currentProduction, this);
    
    this.currentProduction = null;
    this.productionProgress = 0;
    this.changeState(AI_BUILDING_STATES.IDLE);
  }

  searchForTargets() {
    // Ищем ближайшие вражеские цели в радиусе атаки
    const targets = this.scene.playerController.getAllUnits()
      .filter(unit => this.getDistanceTo(unit) <= this.attackRange);
      
    if (targets.length > 0) {
      this.attackTarget = targets[0]; // Берем ближайшую цель
      this.changeState(AI_BUILDING_STATES.ATTACKING);
    }
  }

  performAttack() {
    if (!this.attackTarget) return;
    
    console.log(`AIBuilding ${this.type.name} атакует цель`);
    
    // Наносим урон цели
    if (this.attackTarget.takeDamage) {
      this.attackTarget.takeDamage(this.attackDamage);
    }
    
    // Создаем визуальный эффект атаки
    this.createAttackEffect();
  }

  createAttackEffect() {
    const centerX = this.x * 32 + (this.type.size * 32) / 2;
    const centerY = this.y * 32 + (this.type.size * 32) / 2;
    const targetX = this.attackTarget.x;
    const targetY = this.attackTarget.y;
    
    // Создаем линию атаки
    const line = this.scene.add.line(0, 0, centerX, centerY, targetX, targetY, 0xff0000)
      .setDepth(100)
      .setLineWidth(3);
    
    // Убираем линию через короткое время
    this.scene.time.delayedCall(200, () => {
      line.destroy();
    });
  }

  takeDamage(amount) {
    if (this.state === AI_BUILDING_STATES.DESTROYED) return;
    
    this.hp = Math.max(0, this.hp - amount);
    console.log(`AIBuilding ${this.type.name} получило ${amount} урона. HP: ${this.hp}/${this.maxHP}`);
    
    // Визуальный эффект получения урона
    this.scene.tweens.add({
      targets: this.rect,
      tint: { from: 0xffffff, to: 0xff0000 },
      duration: 200,
      yoyo: true
    });
    
    if (this.hp <= 0) {
      this.destroy();
    } else {
      this.changeState(AI_BUILDING_STATES.DAMAGED);
    }
  }

  destroy() {
    console.log(`AIBuilding ${this.type.name} уничтожено`);
    
    this.changeState(AI_BUILDING_STATES.DESTROYED);
    
    // Создаем эффект разрушения
    this.createDestructionEffect();
    
    // Уведомляем стратега об уничтожении
    this.strategist.onBuildingDestroyed(this);
    
    // Убираем визуальные элементы через короткое время
    this.scene.time.delayedCall(1000, () => {
      this.removeVisuals();
    });
  }

  createDestructionEffect() {
    const centerX = this.x * 32 + (this.type.size * 32) / 2;
    const centerY = this.y * 32 + (this.type.size * 32) / 2;
    
    // Эффект взрыва
    this.scene.tweens.add({
      targets: this.rect,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 500
    });
    
    this.rect.setTint(0x666666);
    this.label.setText('РАЗРУШЕНО');
    this.label.setColor('#ff0000');
  }

  removeVisuals() {
    if (this.rect) this.rect.destroy();
    if (this.border) this.border.destroy();
    if (this.label) this.label.destroy();
    if (this.hpBarBg) this.hpBarBg.destroy();
    if (this.hpBar) this.hpBar.destroy();
    if (this.progressBarBg) this.progressBarBg.destroy();
    if (this.progressBar) this.progressBar.destroy();
    if (this.statusText) this.statusText.destroy();
  }

  changeState(newState) {
    if (this.state === newState) return;
    
    console.log(`AIBuilding ${this.type.name} меняет состояние: ${this.state} -> ${newState}`);
    
    this.state = newState;
    this.stateTimer = 0;
    this.lastStateChange = Date.now();
    
    this.updateProgressBarVisibility();
  }

  updateVisuals() {
    // Обновляем полоску HP
    const hpPercent = this.hp / this.maxHP;
    const maxWidth = (this.type.size * 32) - 8;
    this.hpBar.width = maxWidth * hpPercent;
    
    // Меняем цвет HP в зависимости от состояния
    if (hpPercent > 0.7) {
      this.hpBar.setFillStyle(0x00ff00);
    } else if (hpPercent > 0.3) {
      this.hpBar.setFillStyle(0xffff00);
    } else {
      this.hpBar.setFillStyle(0xff0000);
    }
    
    // Обновляем текст состояния
    this.updateStatusText();
  }

  updateStatusText() {
    let statusText = '';
    
    switch (this.state) {
      case AI_BUILDING_STATES.CONSTRUCTION:
        const constructionPercent = Math.floor((this.constructionProgress / this.buildTime) * 100);
        statusText = `Строительство ${constructionPercent}%`;
        break;
      case AI_BUILDING_STATES.IDLE:
        statusText = 'Ожидание';
        break;
      case AI_BUILDING_STATES.PRODUCING:
        if (this.currentProduction) {
          const productionPercent = Math.floor((this.productionProgress / this.currentProduction.buildTime) * 100);
          statusText = `Производство ${this.currentProduction.name} ${productionPercent}%`;
        }
        break;
      case AI_BUILDING_STATES.ATTACKING:
        statusText = 'Атака';
        break;
      case AI_BUILDING_STATES.DAMAGED:
        statusText = 'Повреждено';
        break;
      case AI_BUILDING_STATES.DESTROYED:
        statusText = 'Уничтожено';
        break;
    }
    
    this.statusText.setText(statusText);
  }

  updateProgressBarVisibility() {
    const showProgress = this.state === AI_BUILDING_STATES.CONSTRUCTION || 
                        this.state === AI_BUILDING_STATES.PRODUCING;
    
    this.progressBar.setVisible(showProgress);
    this.progressBarBg.setVisible(showProgress);
  }

  // Вспомогательные методы
  canProduce() {
    return this.type.type === 'unitFactory' && 
           this.state === AI_BUILDING_STATES.IDLE;
  }

  canAttack() {
    return this.attackRange > 0 && 
           this.attackDamage > 0 && 
           this.state === AI_BUILDING_STATES.IDLE;
  }

  isTargetDead() {
    return !this.attackTarget || 
           this.attackTarget.hp <= 0 || 
           this.attackTarget.state === 'destroyed';
  }

  clearAttackTarget() {
    this.attackTarget = null;
    if (this.state === AI_BUILDING_STATES.ATTACKING) {
      this.changeState(AI_BUILDING_STATES.IDLE);
    }
  }

  getDistanceTo(target) {
    const centerX = this.x * 32 + (this.type.size * 32) / 2;
    const centerY = this.y * 32 + (this.type.size * 32) / 2;
    const dx = centerX - target.x;
    const dy = centerY - target.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  queueUnit(unitType) {
    if (!this.canProduce()) return false;
    
    this.productionQueue.push(unitType);
    console.log(`AIBuilding ${this.type.name} добавило в очередь: ${unitType.name}`);
    return true;
  }

  // Геттеры для совместимости
  getBuildingType() {
    return this.type.type || null;
  }

  isBuildingType(type) {
    return this.getBuildingType() === type;
  }
}