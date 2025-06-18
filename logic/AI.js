// logic/AI.js
// Модуль логики ИИ противника для RTS
import PathfindingController from './PathfindingController.js';
import AIStrategist from './AIStrategist.js';

export default class AIEnemy {
  constructor(scene, base) {
    this.scene = scene; // ссылка на MissionScene
    this.base = base;   // {x, y, rect, label}
    this.pathfinder = new PathfindingController();
    // Передаём стартовые ресурсы в стратегa
    this.strategist = new AIStrategist(scene, this, { золото: 500, дерево: 300, камень: 200, металл: 100 });
  }

  update(dt, time) {
    this.strategist.update(dt, time);
  }
  // Вспомогательная функция для визуализации всех маршрутов
  getAllUnitPaths() {
    return this.strategist.units
      .filter(u => u.path && u.path.length > 0)
      .map(u => u.path.map(p => ({ x: p.x * 32 + 16, y: p.y * 32 + 16 })));
  }
} 