/**
 * Контроллер для управления частицами в RTS игре
 * Управляет визуальными эффектами: взрывы, дым, огонь, магические эффекты и т.д.
 */

// Типы частиц
export const PARTICLE_TYPES = {
  EXPLOSION: {
    id: 'explosion',
    name: 'Взрыв',
    duration: 1000, // мс
    particleCount: 20,
    color: 0xff4444,
    size: { min: 2, max: 8 },
    speed: { min: 50, max: 150 },
    gravity: 100
  },
  SMOKE: {
    id: 'smoke',
    name: 'Дым',
    duration: 3000,
    particleCount: 15,
    color: 0x666666,
    size: { min: 3, max: 12 },
    speed: { min: 10, max: 30 },
    gravity: -20 // отрицательная гравитация (дым поднимается)
  },
  FIRE: {
    id: 'fire',
    name: 'Огонь',
    duration: 2000,
    particleCount: 25,
    color: 0xff6600,
    size: { min: 2, max: 6 },
    speed: { min: 20, max: 60 },
    gravity: -30
  },
  SPARKS: {
    id: 'sparks',
    name: 'Искры',
    duration: 800,
    particleCount: 30,
    color: 0xffff00,
    size: { min: 1, max: 3 },
    speed: { min: 80, max: 200 },
    gravity: 150
  },
  DUST: {
    id: 'dust',
    name: 'Пыль',
    duration: 1500,
    particleCount: 10,
    color: 0xccaa88,
    size: { min: 2, max: 5 },
    speed: { min: 5, max: 25 },
    gravity: 50
  },
  MAGIC: {
    id: 'magic',
    name: 'Магия',
    duration: 2500,
    particleCount: 20,
    color: 0x8844ff,
    size: { min: 3, max: 7 },
    speed: { min: 30, max: 80 },
    gravity: 0 // магические частицы не подвержены гравитации
  },
  BLOOD: {
    id: 'blood',
    name: 'Кровь',
    duration: 1200,
    particleCount: 15,
    color: 0x880000,
    size: { min: 2, max: 4 },
    speed: { min: 40, max: 100 },
    gravity: 120
  },
  HEALING: {
    id: 'healing',
    name: 'Исцеление',
    duration: 2000,
    particleCount: 12,
    color: 0x00ff88,
    size: { min: 2, max: 5 },
    speed: { min: 10, max: 40 },
    gravity: -40
  }
};

export default class ParticleController {
  constructor(scene) {
    if (!scene) {
      throw new Error('ParticleController требует валидную сцену');
    }
    
    this.scene = scene;
    this.particleSystems = [];
    this.activeEmitters = new Map();
    
    // Настройки производительности
    this.maxParticles = 1000;
    this.currentParticleCount = 0;
    
    this.init();
  }

  init() {
    this.scene.load.image('particle', 'assets/images/particle.png');
    // Создаем группу для всех частиц
    this.particleGroup = this.scene.add.group();
    
    // Настраиваем очистку неактивных систем
    this.scene.time.addEvent({
      delay: 1000, // каждую секунду
      callback: this.cleanupInactiveSystems,
      callbackScope: this,
      loop: true
    });
  }

  /**
   * Создает эффект частиц в указанной позиции
   * @param {string} type - тип частиц из PARTICLE_TYPES
   * @param {number} x - координата x
   * @param {number} y - координата y
   * @param {Object} options - дополнительные параметры
   */
  createEffect(type, x, y, options = {}) {
    const particleType = PARTICLE_TYPES[type.toUpperCase()];
    if (!particleType) {
      console.warn(`Неизвестный тип частиц: ${type}`);
      return null;
    }

    // Проверяем лимит частиц
    if (this.currentParticleCount >= this.maxParticles) {
      console.warn('Достигнут лимит частиц');
      return null;
    }

    const config = this.createParticleConfig(particleType, options);
    const emitter = this.scene.add.particles(x, y, 'particle', config);
    
    if (emitter) {
      this.particleGroup.add(emitter);
      this.particleSystems.push({
        emitter,
        type: particleType,
        startTime: this.scene.time.now,
        duration: particleType.duration
      });
      
      this.currentParticleCount += particleType.particleCount;
    }
    
    return emitter;
  }

  /**
   * Создает конфигурацию для частиц
   */
  createParticleConfig(particleType, options) {
    const config = {
      speed: {
        min: options.speedMin || particleType.speed.min,
        max: options.speedMax || particleType.speed.max
      },
      scale: {
        start: options.scaleStart || (particleType.size.max / 100),
        end: options.scaleEnd || (particleType.size.min / 100)
      },
      lifespan: options.lifespan || particleType.duration,
      quantity: options.quantity || particleType.particleCount,
      tint: options.color || particleType.color,
      gravityY: options.gravity !== undefined ? options.gravity : particleType.gravity,
      alpha: {
        start: options.alphaStart || 1,
        end: options.alphaEnd || 0
      },
      blendMode: options.blendMode || 'NORMAL'
    };

    // Специальные настройки для разных типов
    if (particleType.id === 'explosion') {
      config.speed.min *= 2;
      config.speed.max *= 2;
      config.blendMode = 'ADD';
    } else if (particleType.id === 'magic') {
      config.blendMode = 'ADD';
      config.alpha.start = 0.8;
    } else if (particleType.id === 'fire') {
      config.blendMode = 'ADD';
      config.tint = [0xff0000, 0xff6600, 0xffff00]; // градиент огня
    }

    return config;
  }

  /**
   * Создает продолжительный эффект (например, для горящих зданий)
   * @param {string} type - тип частиц
   * @param {number} x - координата x
   * @param {number} y - координата y
   * @param {number} duration - продолжительность в мс (0 = бесконечно)
   * @param {string} id - уникальный идентификатор эмиттера
   */
  createContinuousEffect(type, x, y, duration = 0, id = null) {
    const emitter = this.createEffect(type, x, y, { 
      quantity: 1, // меньше частиц для продолжительных эффектов
      lifespan: 1000 
    });
    
    if (emitter && id) {
      this.activeEmitters.set(id, {
        emitter,
        type,
        startTime: this.scene.time.now,
        duration
      });
    }
    
    return emitter;
  }

  /**
   * Останавливает продолжительный эффект
   */
  stopContinuousEffect(id) {
    const effect = this.activeEmitters.get(id);
    if (effect) {
      effect.emitter.stop();
      this.activeEmitters.delete(id);
    }
  }

  /**
   * Создает эффект взрыва
   */
  createExplosion(x, y, size = 'normal') {
    const sizeMultipliers = {
      small: 0.5,
      normal: 1,
      large: 1.5,
      huge: 2.5
    };
    
    const multiplier = sizeMultipliers[size] || 1;
    
    // Основной взрыв
    this.createEffect('explosion', x, y, {
      quantity: Math.floor(20 * multiplier),
      speedMin: 50 * multiplier,
      speedMax: 150 * multiplier,
      scaleStart: 0.1 * multiplier,
      scaleEnd: 0.02 * multiplier
    });

    // Искры
    this.createEffect('sparks', x, y, {
      quantity: Math.floor(15 * multiplier),
      speedMin: 80 * multiplier,
      speedMax: 200 * multiplier
    });

    // Дым (с задержкой)
    this.scene.time.delayedCall(200, () => {
      this.createEffect('smoke', x, y, {
        quantity: Math.floor(10 * multiplier),
        lifespan: 3000
      });
    });
  }

  /**
   * Создает эффект разрушения здания
   */
  createBuildingDestruction(x, y, width, height) {
    // Пыль и обломки
    for (let i = 0; i < 3; i++) {
      const offsetX = x + (Math.random() * width);
      const offsetY = y + (Math.random() * height);
      
      this.createEffect('dust', offsetX, offsetY, {
        quantity: 8,
        speedMin: 20,
        speedMax: 60
      });
    }
    
    // Основной взрыв в центре
    this.createExplosion(x + width/2, y + height/2, 'large');
  }

  /**
   * Создает эффект смерти юнита
   */
  createUnitDeath(x, y, unitType = 'normal') {
    if (unitType === 'robot' || unitType === 'mechanical') {
      // Искры для механических юнитов
      this.createEffect('sparks', x, y);
      this.createEffect('smoke', x, y, { quantity: 5 });
    } else {
      // Кровь для органических юнитов
      this.createEffect('blood', x, y);
    }
  }

  /**
   * Создает эффект исцеления
   */
  createHealingEffect(x, y) {
    this.createEffect('healing', x, y, {
      quantity: 8,
      lifespan: 1500,
      blendMode: 'ADD'
    });
  }

  /**
   * Создает магический эффект
   */
  createMagicEffect(x, y, color = null) {
    this.createEffect('magic', x, y, {
      color: color,
      blendMode: 'ADD',
      quantity: 15
    });
  }

  /**
   * Очищает неактивные системы частиц
   */
  cleanupInactiveSystems() {
    const currentTime = this.scene.time.now;
    
    // Очищаем завершенные системы
    this.particleSystems = this.particleSystems.filter(system => {
      if (currentTime - system.startTime > system.duration) {
        if (system.emitter && !system.emitter.destroyed) {
          this.currentParticleCount -= system.type.particleCount;
          system.emitter.destroy();
        }
        return false;
      }
      return true;
    });

    // Очищаем завершенные продолжительные эффекты
    for (const [id, effect] of this.activeEmitters.entries()) {
      if (effect.duration > 0 && currentTime - effect.startTime > effect.duration) {
        this.stopContinuousEffect(id);
      }
    }
  }

  /**
   * Устанавливает максимальное количество частиц
   */
  setMaxParticles(max) {
    this.maxParticles = max;
  }

  /**
   * Получает текущее количество активных частиц
   */
  getCurrentParticleCount() {
    return this.currentParticleCount;
  }

  /**
   * Очищает все частицы
   */
  clearAllParticles() {
    // Уничтожаем все системы частиц
    this.particleSystems.forEach(system => {
      if (system.emitter && !system.emitter.destroyed) {
        system.emitter.destroy();
      }
    });
    
    // Очищаем продолжительные эффекты
    this.activeEmitters.forEach(effect => {
      if (effect.emitter && !effect.emitter.destroyed) {
        effect.emitter.destroy();
      }
    });

    this.particleSystems = [];
    this.activeEmitters.clear();
    this.currentParticleCount = 0;
  }

  /**
   * Приостанавливает все эффекты частиц
   */
  pause() {
    this.particleSystems.forEach(system => {
      if (system.emitter) {
        system.emitter.pause();
      }
    });
  }

  /**
   * Возобновляет все эффекты частиц
   */
  resume() {
    this.particleSystems.forEach(system => {
      if (system.emitter) {
        system.emitter.resume();
      }
    });
  }

  /**
   * Уничтожает контроллер
   */
  destroy() {
    this.clearAllParticles();
    if (this.particleGroup) {
      this.particleGroup.destroy();
    }
  }
} 