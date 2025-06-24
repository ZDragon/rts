import AIBuilding from './AIBuilding.js';

export default class AIBaseBuildingController {
  constructor(scene, strategist) {
    this.scene = scene;
    this.strategist = strategist;
    this.buildings = [];
    this.buildQueue = [];
  }

  addBuilding(building) {
    this.buildings.push(building);
  }

  removeBuilding(building) {
    const idx = this.buildings.indexOf(building);
    if (idx !== -1) this.buildings.splice(idx, 1);
  }

  queueBuilding(buildingType, x, y) {
    console.log(`AIBaseBuildingController: Добавление в очередь строительства ${buildingType.name} в (${x}, ${y})`);
    
    // Создаем экземпляр AIBuilding сразу
    const aiBuilding = new AIBuilding(this.scene, this.strategist, buildingType, x, y);
    
    // Добавляем в список зданий
    this.addBuilding(aiBuilding);
    
    return aiBuilding;
  }

  update(dt) {
    // Обновляем все здания
    this.buildings.forEach(building => {
      if (building.update) {
        building.update(dt);
      }
    });
    
    // Удаляем уничтоженные здания
    this.buildings = this.buildings.filter(building => 
      building.state !== 'destroyed' || 
      (Date.now() - building.lastStateChange) < 2000 // Даем время на анимацию разрушения
    );
  }

  getAllBuildings() {
    return this.buildings;
  }

  getBuildingsByType(type) {
    return this.buildings.filter(building => building.isBuildingType(type));
  }

  getCompletedBuildings() {
    return this.buildings.filter(building => 
      building.state !== 'construction' && 
      building.state !== 'destroyed'
    );
  }

  getBuildingCount() {
    return this.buildings.length;
  }

  getCompletedBuildingCount() {
    return this.getCompletedBuildings().length;
  }

  // Метод для уведомления об уничтожении здания
  onBuildingDestroyed(building) {
    console.log(`AIBaseBuildingController: Здание ${building.type.name} уничтожено`);
    // Здание само удалится из массива при следующем update
  }

  // Метод для получения ближайшего здания определенного типа
  getNearestBuildingOfType(x, y, type) {
    const buildings = this.getBuildingsByType(type)
      .filter(building => building.state !== 'construction' && building.state !== 'destroyed');
    
    if (buildings.length === 0) return null;
    
    let nearest = buildings[0];
    let minDistance = this.getDistance(x, y, nearest.x, nearest.y);
    
    for (let i = 1; i < buildings.length; i++) {
      const distance = this.getDistance(x, y, buildings[i].x, buildings[i].y);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = buildings[i];
      }
    }
    
    return nearest;
  }

  getDistance(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Метод для поиска свободного места для строительства
  findBuildingSpot(buildingType, preferredX, preferredY, searchRadius = 5) {
    const size = buildingType.size;
    
    // Сначала проверяем предпочитаемое место
    if (this.canBuildAt(preferredX, preferredY, size)) {
      return { x: preferredX, y: preferredY };
    }
    
    // Ищем в радиусе
    for (let radius = 1; radius <= searchRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
            const x = preferredX + dx;
            const y = preferredY + dy;
            
            if (this.canBuildAt(x, y, size)) {
              return { x, y };
            }
          }
        }
      }
    }
    
    return null; // Место не найдено
  }

  canBuildAt(x, y, size) {
    // Проверяем, не занято ли место другими зданиями
    for (const building of this.buildings) {
      if (building.state === 'destroyed') continue;
      
      const bx = building.x;
      const by = building.y;
      const bsize = building.type.size;
      
      // Проверяем пересечение
      if (x < bx + bsize && x + size > bx && 
          y < by + bsize && y + size > by) {
        return false;
      }
    }
    
    // Проверяем границы карты (предполагаем карту 50x50)
    if (x < 0 || y < 0 || x + size > 50 || y + size > 50) {
      return false;
    }
    
    return true;
  }
} 