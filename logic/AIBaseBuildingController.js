export default class AIBaseBuildingController {
  constructor(scene) {
    this.scene = scene;
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

  queueBuilding(type, x, y) {
    this.buildQueue.push({ type, x, y, status: 'queued', size: type.size });
  }

  update(dt) {
    // Логика постройки зданий, обработка очереди, проверка состояния
    // (заполнить при интеграции с AIStrategist)
  }

  getAllBuildings() {
    return this.buildings;
  }
} 