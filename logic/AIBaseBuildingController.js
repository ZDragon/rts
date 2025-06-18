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

  queueBuilding(type, x, y) {
    this.buildQueue.push({
      type,
      x,
      y,
      size: type.size,
      status: 'building',
      buildTime: type.buildTime,
      progress: 0
    });
  }

  update(dt) {
    if (!this.buildQueue.length) return;
    const current = this.buildQueue[0];
    if (current.status === 'building') {
      current.progress += dt;
      if (current.progress >= current.buildTime) {
        current.status = 'done';
        // --- Визуализация ---
        const TILE_SIZE = 32;
        const sizePx = current.size * TILE_SIZE;
        const centerX = current.x * TILE_SIZE + sizePx / 2;
        const centerY = current.y * TILE_SIZE + sizePx / 2;
        // Прямоугольник здания
        const rect = this.scene.add.rectangle(centerX, centerY, sizePx, sizePx, current.type.color).setDepth(50);
        // Рамка
        const border = this.scene.add.rectangle(centerX, centerY, sizePx, sizePx).setStrokeStyle(4, 0xffff00).setDepth(51);
        // Подпись
        const label = this.scene.add.text(centerX, centerY, current.type.name, { fontSize: '14px', color: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(52);
        // Полоска HP
        const hpBarBg = this.scene.add.rectangle(centerX, centerY - sizePx / 2 + 8, sizePx - 8, 8, 0x444444).setDepth(53);
        const hpBar = this.scene.add.rectangle(centerX, centerY - sizePx / 2 + 8, sizePx - 8, 8, 0x00ff00).setDepth(54);

        // Добавляем в массив построенных зданий с визуальными ссылками
        this.addBuilding({
          type: current.type,
          x: current.x,
          y: current.y,
          size: current.size,
          hp: current.type.maxHP || 300,
          maxHP: current.type.maxHP || 300,
          buildTime: current.buildTime,
          rect,
          border,
          label,
          hpBar,
          hpBarBg
        });
        this.buildQueue.shift();
      }
    }
  }

  getAllBuildings() {
    return this.buildings;
  }
} 