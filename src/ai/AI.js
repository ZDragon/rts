// logic/AI.js
// Модуль логики ИИ противника для RTS
import PathfindingController from '../controllers/PathfindingController.js';
import AIStrategist from './AIStrategist.js';
import { DEFAULT_AI_STARTING_RESOURCES } from '../entities/resources/ResourceTypes.js';

export default class AIEnemy {
  constructor(scene, base) {
    this.scene = scene; // ссылка на MissionScene
    this.base = base;   // {x, y, rect, label}
    this.pathfinder = new PathfindingController();
    // Передаём стартовые ресурсы в стратегa
    this.strategist = new AIStrategist(scene, this, DEFAULT_AI_STARTING_RESOURCES);
    this.typeWorker = [{id: 'worker', upperLimit: 5, limit: 3, buildTime: 5, factory: 'factory'}];
    this.typeCombat = [
      {id: 'warrior', upperLimit: 10, limit: 2, buildTime: 5, factory: 'barracks'}, 
      {id: 'archer', upperLimit: 7, limit: 2, buildTime: 5, factory: 'barracks'}, 
      {id: 'siege', upperLimit: 5, limit: 1, buildTime: 15, factory: 'factory'}];
    this.typeBuildings = [
      {id: 'factory', upperLimit: 10, limit: 1, buildTime: 10},
      {id: 'barracks', upperLimit: 10, limit: 1, buildTime: 10},
      {id: 'hq', upperLimit: 10, limit: 1, buildTime: 10},
      {id: 'warehouse', upperLimit: 10, limit: 2, buildTime: 10},
      {id: 'lab', upperLimit: 10, limit: 1, buildTime: 10},
      {id: 'tower', upperLimit: 10, limit: 5, buildTime: 10},
    ];
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