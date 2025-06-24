# ParticleController - Контроллер частиц для RTS игры

ParticleController предоставляет мощную и гибкую систему управления визуальными эффектами частиц в RTS игре.

## Возможности

- 8 различных типов частиц (взрывы, дым, огонь, искры, пыль, магия, кровь, исцеление)
- Продолжительные эффекты для длительных процессов
- Специализированные эффекты для игровых событий
- Автоматическая очистка неактивных систем
- Контроль производительности с лимитами частиц
- Простая интеграция с игровыми объектами

## Быстрый старт

### Инициализация

```javascript
import ParticleController from './controllers/ParticleController.js';

// В сцене Phaser
create() {
  this.particleController = new ParticleController(this);
}
```

### Базовое использование

```javascript
// Создание простого эффекта
this.particleController.createEffect('explosion', x, y);

// Создание эффекта с настройками
this.particleController.createEffect('fire', x, y, {
  quantity: 20,
  speedMin: 30,
  speedMax: 80,
  color: 0xff6600
});
```

## Типы частиц

### EXPLOSION - Взрыв
- Мощный взрывной эффект
- Цвет: красно-оранжевый
- Использование: разрушение зданий, взрывы снарядов

### SMOKE - Дым
- Поднимающийся дым
- Цвет: серый
- Использование: пожары, разрушенные здания

### FIRE - Огонь  
- Пламя с градиентом цветов
- Цвет: от красного к желтому
- Использование: горящие объекты, атаки огнем

### SPARKS - Искры
- Быстрые яркие частицы
- Цвет: желтый
- Использование: металлические столкновения, завершение строительства

### DUST - Пыль
- Мелкие частицы пыли
- Цвет: коричневый
- Использование: строительство, движение по земле

### MAGIC - Магия
- Магические эффекты без гравитации
- Цвет: фиолетовый
- Использование: заклинания, производство в зданиях

### BLOOD - Кровь
- Эффект крови
- Цвет: темно-красный
- Использование: смерть органических юнитов

### HEALING - Исцеление
- Восстанавливающие частицы
- Цвет: зеленый
- Использование: лечение, бонусы

## Основные методы

### createEffect(type, x, y, options)
Создает одноразовый эффект частиц.

```javascript
// Основные параметры
this.particleController.createEffect('explosion', 100, 200, {
  quantity: 25,        // Количество частиц
  speedMin: 50,        // Минимальная скорость
  speedMax: 150,       // Максимальная скорость  
  color: 0xff0000,     // Цвет (hex)
  lifespan: 1000,      // Время жизни в мс
  gravity: 100,        // Гравитация
  blendMode: 'ADD',    // Режим смешивания
  scaleStart: 0.1,     // Начальный размер
  scaleEnd: 0.02,      // Конечный размер
  alphaStart: 1,       // Начальная прозрачность
  alphaEnd: 0          // Конечная прозрачность
});
```

### createContinuousEffect(type, x, y, duration, id)
Создает продолжительный эффект с уникальным ID.

```javascript
// Бесконечный эффект горения
this.particleController.createContinuousEffect(
  'fire', 
  buildingX, 
  buildingY, 
  0, // 0 = бесконечно
  'building_fire_123'
);

// Остановка эффекта
this.particleController.stopContinuousEffect('building_fire_123');
```

### Специализированные эффекты

#### createExplosion(x, y, size)
Комплексный эффект взрыва с несколькими фазами.

```javascript
// Размеры: 'small', 'normal', 'large', 'huge'
this.particleController.createExplosion(x, y, 'large');
```

#### createBuildingDestruction(x, y, width, height)
Эффект разрушения здания с пылью и взрывом.

```javascript
this.particleController.createBuildingDestruction(
  building.x, 
  building.y, 
  building.width, 
  building.height
);
```

#### createUnitDeath(x, y, unitType)
Эффект смерти юнита в зависимости от типа.

```javascript
// Для органических юнитов - кровь
this.particleController.createUnitDeath(x, y, 'normal');

// Для механических - искры и дым  
this.particleController.createUnitDeath(x, y, 'mechanical');
```

#### createHealingEffect(x, y)
Эффект исцеления.

```javascript
this.particleController.createHealingEffect(playerX, playerY);
```

#### createMagicEffect(x, y, color)
Магический эффект с опциональным цветом.

```javascript
this.particleController.createMagicEffect(mageX, mageY, 0x0088ff);
```

## Интеграция с игровыми объектами

### В зданиях (BuildingController)

```javascript
// В конструкторе здания
constructor(scene, x, y, buildingType) {
  // ...
  this.particleController = scene.particleController;
}

// При завершении строительства
completeConstruction() {
  if (this.particleController) {
    const centerX = this.x * 32 + this.type.size * 16;
    const centerY = this.y * 32 + this.type.size * 16;
    this.particleController.createEffect('sparks', centerX, centerY);
  }
}

// При разрушении
destroy() {
  if (this.particleController) {
    this.particleController.createBuildingDestruction(
      this.x * 32, this.y * 32, 
      this.type.size * 32, this.type.size * 32
    );
  }
}
```

### В юнитах (BaseUnit)

```javascript
// В конструкторе юнита
constructor(scene, x, y, unitType, owner) {
  // ...
  this.particleController = scene.particleController;
}

// При смерти
die() {
  if (this.particleController) {
    const unitType = this.type.mechanical ? 'mechanical' : 'normal';
    this.particleController.createUnitDeath(this.x, this.y, unitType);
  }
}

// При получении урона
takeDamage(amount) {
  if (this.particleController) {
    this.particleController.createEffect('sparks', this.x, this.y, {
      quantity: Math.ceil(amount / 5),
      color: 0xff0000
    });
  }
}
```

## Управление производительностью

### Лимиты частиц

```javascript
// Установка максимального количества частиц
this.particleController.setMaxParticles(500);

// Получение текущего количества
const current = this.particleController.getCurrentParticleCount();
console.log(`Активных частиц: ${current}`);
```

### Очистка и управление

```javascript
// Очистка всех частиц
this.particleController.clearAllParticles();

// Приостановка всех эффектов
this.particleController.pause();

// Возобновление
this.particleController.resume();

// Уничтожение контроллера
this.particleController.destroy();
```

## Примеры использования

### Эффекты боя

```javascript
// Атака мечом
onSwordAttack(attackerX, attackerY, targetX, targetY) {
  // Искры при ударе
  this.particleController.createEffect('sparks', targetX, targetY, {
    quantity: 8,
    color: 0xffffff
  });
}

// Магическая атака
onMagicAttack(targetX, targetY, spellType) {
  this.particleController.createMagicEffect(targetX, targetY);
  
  // Через 500мс взрыв
  this.scene.time.delayedCall(500, () => {
    this.particleController.createExplosion(targetX, targetY, 'normal');
  });
}
```

### Эффекты ресурсов

```javascript
// Добыча ресурсов
onResourceGathering(workerX, workerY, resourceType) {
  const colors = {
    wood: 0x8b4513,
    stone: 0x808080, 
    gold: 0xffd700
  };
  
  this.particleController.createEffect('dust', workerX, workerY, {
    quantity: 3,
    color: colors[resourceType]
  });
}

// Доставка ресурсов на базу
onResourceDeposit(baseX, baseY, resourceType, amount) {
  this.particleController.createEffect('sparks', baseX, baseY, {
    quantity: Math.min(amount, 10),
    color: colors[resourceType]
  });
}
```

### Атмосферные эффекты

```javascript
// Дым от костра
createCampfire(x, y) {
  // Огонь
  this.particleController.createContinuousEffect(
    'fire', x, y, 0, `campfire_${x}_${y}`
  );
  
  // Дым
  this.particleController.createContinuousEffect(
    'smoke', x, y - 20, 0, `smoke_${x}_${y}`
  );
}

// Магический портал
createPortal(x, y) {
  this.particleController.createContinuousEffect(
    'magic', x, y, 0, `portal_${x}_${y}`
  );
}
```

## Отладка

Контроллер предоставляет информацию для отладки:

```javascript
// Получение статистики
const stats = {
  currentParticles: this.particleController.getCurrentParticleCount(),
  maxParticles: this.particleController.maxParticles,
  activeSystems: this.particleController.particleSystems.length,
  continuousEffects: this.particleController.activeEmitters.size
};

console.log('Статистика частиц:', stats);
```

## Требования

- Phaser 3.x
- Загруженная текстура 'particle' в сцене
- Валидная ссылка на сцену Phaser

## Демо

Для тестирования всех возможностей используйте ParticleControllerDemo:

```javascript
// Раскомментируйте в MissionScene.js
this.particleDemo = new ParticleControllerDemo(this);
```

Это добавит панель с кнопками для тестирования всех типов эффектов. 