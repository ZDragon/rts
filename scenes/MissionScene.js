import Phaser from 'phaser';
import resourceManager from '../logic/ResourceManager.js';
import { BUILDINGS } from '../logic/Buildings.js';
import { UNITS } from '../logic/Units.js';

const TILE_SIZE = 32;
const MAP_SIZE = 300;
const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 720;
const SCROLL_SPEED = 16;
const EDGE_SCROLL_ZONE = 32;

const TILE_TYPES = [
  { name: 'трава', color: 0x4caf50 },
  { name: 'вода', color: 0x2196f3 },
  { name: 'камень', color: 0x888888 },
  { name: 'песок', color: 0xffeb3b },
];

function randomTileType() {
  return Math.floor(Math.random() * TILE_TYPES.length);
}

export default class MissionScene extends Phaser.Scene {
  constructor() {
    super('MissionScene');
  }

  init(data) {
    this.missionNumber = data.mission || 1;
  }

  create() {
    // --- RTS UI ---
    // Верхняя панель
    this.add.rectangle(640, 24, 1280, 48, 0x222222).setDepth(100).setScrollFactor(0);
    this.resText = this.add.text(40, 24, this.getResString(), {
      fontSize: '22px', color: '#fff', fontFamily: 'sans-serif', depth: 101
    }).setDepth(101).setOrigin(0, 0.5).setScrollFactor(0);
    this.missionText = this.add.text(640, 24, `Миссия ${this.missionNumber}`, {
      fontSize: '24px', color: '#fff', fontFamily: 'sans-serif', depth: 101
    }).setDepth(101).setOrigin(0.5).setScrollFactor(0);
    const menuBtn = this.add.text(1240, 24, 'Меню', {
      fontSize: '20px', color: '#fff', backgroundColor: '#444', padding: { left: 12, right: 12, top: 6, bottom: 6 }, fontFamily: 'sans-serif', depth: 101
    }).setDepth(101).setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0);
    menuBtn.on('pointerdown', () => { 
      this.scene.stop('MissionScene');
      this.scene.start('MainMenuScene'); 
    });

    // Левая панель
    this.add.rectangle(80, 360, 160, 720, 0x222222).setDepth(100).setScrollFactor(0);
    BUILDINGS.forEach((b, i) => {
      const btn = this.add.text(20, 80 + i * 48, b.name, {
        fontSize: '22px', color: '#fff', backgroundColor: Phaser.Display.Color.IntegerToColor(b.color).rgba, padding: { left: 12, right: 12, top: 6, bottom: 6 }, fontFamily: 'sans-serif', borderRadius: 6, depth: 101
      }).setDepth(101).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0);
      btn.on('pointerdown', () => {
        this.selectedBuilding = b;
        this.showMessage(`Выбрано: ${b.name}`);
      });
    });

    // Нижняя панель
    this.add.rectangle(640, 700, 1280, 40, 0x222222).setDepth(100).setScrollFactor(0);
    this.infoText = this.add.text(640, 700, 'Информация о выбранном объекте', {
      fontSize: '20px', color: '#fff', fontFamily: 'sans-serif', depth: 101
    }).setDepth(101).setOrigin(0.5).setScrollFactor(0);

    // Миникарта (заглушка)
    this.add.rectangle(1200, 650, 160, 120, 0x111111).setDepth(100).setScrollFactor(0);
    this.add.text(1200, 650, 'Миникарта', { fontSize: '16px', color: '#fff', fontFamily: 'sans-serif', depth: 101 }).setDepth(101).setOrigin(0.5).setScrollFactor(0);

    // --- Интерфейс очереди строительства ---
    this.add.rectangle(1200, 520, 160, 100, 0x222222).setDepth(150).setScrollFactor(0);
    this.queueTitle = this.add.text(1200, 480, 'Строится:', {
      fontSize: '18px', color: '#fff', fontFamily: 'sans-serif'
    }).setOrigin(0.5).setDepth(151).setScrollFactor(0);
    this.queueUI = [];

    // --- Генерация карты ---
    this.tileData = [];
    for (let y = 0; y < MAP_SIZE; y++) {
      this.tileData[y] = [];
      for (let x = 0; x < MAP_SIZE; x++) {
        this.tileData[y][x] = randomTileType();
      }
    }

    this.tileLayer = this.add.layer();
    this.renderTiles();

    // --- Камера ---
    this.cameras.main.setBounds(0, 0, MAP_SIZE * TILE_SIZE, MAP_SIZE * TILE_SIZE);
    this.input.keyboard.on('keydown', this.handleArrowKeys, this);
    this.input.keyboard.on('keyup', this.stopArrowKeys, this);
    this.arrowScroll = { left: false, right: false, up: false, down: false };

    // Drag & drop
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown()) {
        this.isDragging = true;
        this.dragStart.x = pointer.x;
        this.dragStart.y = pointer.y;
        this.cameraStart = { x: this.cameras.main.scrollX, y: this.cameras.main.scrollY };
      }
    });
    this.input.on('pointerup', () => {
      this.isDragging = false;
    });
    this.input.on('pointermove', (pointer) => {
      if (this.isDragging) {
        const dx = pointer.x - this.dragStart.x;
        const dy = pointer.y - this.dragStart.y;
        this.cameras.main.scrollX = Phaser.Math.Clamp(this.cameraStart.x - dx, 0, MAP_SIZE * TILE_SIZE - VIEWPORT_WIDTH);
        this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameraStart.y - dy, 0, MAP_SIZE * TILE_SIZE - VIEWPORT_HEIGHT);
      }
    });

    // Автоскролл мышью у края экрана
    this.input.on('pointermove', (pointer) => {
      this.edgeScroll = {
        left: pointer.x < EDGE_SCROLL_ZONE,
        right: pointer.x > VIEWPORT_WIDTH - EDGE_SCROLL_ZONE,
        up: pointer.y < EDGE_SCROLL_ZONE,
        down: pointer.y > VIEWPORT_HEIGHT - EDGE_SCROLL_ZONE,
      };
    });
    this.edgeScroll = { left: false, right: false, up: false, down: false };

    // --- Система построек ---
    this.selectedBuilding = null;
    this.buildingsOnMap = [];
    this.buildQueue = [];
    this.buildPreview = null;
    this.units = [];
    this.selectedBuildingInstance = null;
    this.unitCreateBtn = null;
    this.selectedUnit = null;
    this.selectedUnits = [];
    this.selectBox = null;
    this.isSelecting = false;
    this.selectStart = { x: 0, y: 0 };

    // Отмена выбора (ESC)
    this.input.keyboard.on('keydown-ESC', () => {
      this.selectedBuilding = null;
      if (this.buildPreview) { this.buildPreview.destroy(); this.buildPreview = null; }
      this.showMessage('Выбор здания отменён');
    });

    // Клик по карте для строительства
    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown() && this.selectedBuilding && !this.isDragging) {
        const worldPoint = pointer.positionToCamera(this.cameras.main);
        const tileX = Math.floor(worldPoint.x / TILE_SIZE);
        const tileY = Math.floor(worldPoint.y / TILE_SIZE);
        if (this.canBuildHere(tileX, tileY, this.selectedBuilding)) {
          if (this.payBuildingCost(this.selectedBuilding)) {
            this.queueBuilding(tileX, tileY, this.selectedBuilding);
            this.selectedBuilding = null;
            if (this.buildPreview) { this.buildPreview.destroy(); this.buildPreview = null; }
          } else {
            this.showMessage('Недостаточно ресурсов!');
          }
        } else {
          this.showMessage('Нельзя строить здесь!');
        }
        return;
      }
      // Проверка клика по зданию
      const worldPoint = pointer.positionToCamera(this.cameras.main);
      this.pointerDownOnMap(worldPoint.x, worldPoint.y);
    });

    // --- Групповой и одиночный выбор юнитов ---
    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonDown() && !this.selectedBuilding && !this.isDragging) {
        const worldPoint = pointer.positionToCamera(this.cameras.main);
        this.selectStart = { x: worldPoint.x, y: worldPoint.y };
        this.isSelecting = true;
        if (this.selectBox) this.selectBox.destroy();
        this.selectBox = this.add.rectangle(worldPoint.x, worldPoint.y, 1, 1, 0x00ff00, 0.15).setOrigin(0).setDepth(300);
      }
    });
    this.input.on('pointermove', (pointer) => {
      if (this.isSelecting && this.selectBox) {
        const worldPoint = pointer.positionToCamera(this.cameras.main);
        const x = Math.min(this.selectStart.x, worldPoint.x);
        const y = Math.min(this.selectStart.y, worldPoint.y);
        const w = Math.abs(this.selectStart.x - worldPoint.x);
        const h = Math.abs(this.selectStart.y - worldPoint.y);
        this.selectBox.setPosition(x, y);
        this.selectBox.setSize(w, h);
      }
    });
    this.input.on('pointerup', (pointer) => {
      if (this.isSelecting && !this.selectedBuilding && !this.isDragging) {
        const worldPoint = pointer.positionToCamera(this.cameras.main);
        const dx = Math.abs(this.selectStart.x - worldPoint.x);
        const dy = Math.abs(this.selectStart.y - worldPoint.y);
        const dragThreshold = 5;
        if (dx < dragThreshold && dy < dragThreshold) {
          // Это клик — выделяем юнита под курсором
          const unit = this.units.find(u => Phaser.Math.Distance.Between(worldPoint.x, worldPoint.y, u.x, u.y) < 18);
          if (unit) {
            this.selectSingleUnit(unit);
          } else {
            this.deselectAllUnits();
          }
        } else {
          // Это drag — выделяем рамкой
          const x = Math.min(this.selectStart.x, worldPoint.x);
          const y = Math.min(this.selectStart.y, worldPoint.y);
          const w = Math.abs(this.selectStart.x - worldPoint.x);
          const h = Math.abs(this.selectStart.y - worldPoint.y);
          this.selectUnitsInBox(x, y, w, h);
        }
        if (this.selectBox) { this.selectBox.destroy(); this.selectBox = null; }
        this.isSelecting = false;
      }
    });

    // Групповое перемещение ПКМ
    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown() && this.selectedUnits.length > 0) {
        const worldPoint = pointer.positionToCamera(this.cameras.main);
        this.moveGroupTo(worldPoint.x, worldPoint.y);
      }
    });
  }

  update(time, delta) {
    // Стрелки
    let dx = 0, dy = 0;
    if (this.arrowScroll.left) dx -= SCROLL_SPEED;
    if (this.arrowScroll.right) dx += SCROLL_SPEED;
    if (this.arrowScroll.up) dy -= SCROLL_SPEED;
    if (this.arrowScroll.down) dy += SCROLL_SPEED;
    // Автоскролл мышью
    if (this.edgeScroll.left) dx -= SCROLL_SPEED;
    if (this.edgeScroll.right) dx += SCROLL_SPEED;
    if (this.edgeScroll.up) dy -= SCROLL_SPEED;
    if (this.edgeScroll.down) dy += SCROLL_SPEED;
    if (dx !== 0 || dy !== 0) {
      this.cameras.main.scrollX = Phaser.Math.Clamp(this.cameras.main.scrollX + dx, 0, MAP_SIZE * TILE_SIZE - VIEWPORT_WIDTH);
      this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY + dy, 0, MAP_SIZE * TILE_SIZE - VIEWPORT_HEIGHT);
    }

    // Обновление очереди строительства
    this.updateBuildQueue(delta / 1000);
    // Превью здания под мышью
    this.updateBuildPreview();
    this.updateBuildQueueUI();

    // Перемещение юнитов
    this.updateUnits(delta / 1000);

    // Снятие выделения по клику на пустое место
    if (this.input.activePointer.leftButtonDown() && !this.isSelecting && !this.selectedBuilding && !this.isDragging) {
      this.deselectAllUnits();
    }
  }

  handleArrowKeys(event) {
    switch (event.code) {
      case 'ArrowLeft': this.arrowScroll.left = true; break;
      case 'ArrowRight': this.arrowScroll.right = true; break;
      case 'ArrowUp': this.arrowScroll.up = true; break;
      case 'ArrowDown': this.arrowScroll.down = true; break;
    }
  }
  stopArrowKeys(event) {
    switch (event.code) {
      case 'ArrowLeft': this.arrowScroll.left = false; break;
      case 'ArrowRight': this.arrowScroll.right = false; break;
      case 'ArrowUp': this.arrowScroll.up = false; break;
      case 'ArrowDown': this.arrowScroll.down = false; break;
    }
  }

  renderTiles() {
    this.tileLayer.removeAll(true);
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const type = this.tileData[y][x];
        const color = TILE_TYPES[type].color;
        const rect = this.add.rectangle(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2, TILE_SIZE, TILE_SIZE, color).setOrigin(0.5);
        this.tileLayer.add(rect);
      }
    }
  }

  getResString() {
    const res = resourceManager.getAll();
    return Object.entries(res).map(([k, v]) => `${k}: ${v}`).join('   ');
  }

  updateResText() {
    this.resText.setText(this.getResString());
  }

  showMessage(text) {
    const msg = this.add.text(640, 620, text, {
      fontSize: '24px',
      color: '#ff0',
      fontFamily: 'sans-serif',
      backgroundColor: '#222',
      padding: { left: 20, right: 20, top: 10, bottom: 10 },
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0);
    this.time.delayedCall(1200, () => msg.destroy());
  }

  // --- Постройки ---
  canBuildHere(tileX, tileY, building) {
    // Проверка границ
    if (tileX < 0 || tileY < 0 || tileX + building.size > MAP_SIZE || tileY + building.size > MAP_SIZE) return false;
    // Проверка тайлов (только трава или песок)
    for (let y = 0; y < building.size; y++) {
      for (let x = 0; x < building.size; x++) {
        const t = this.tileData[tileY + y][tileX + x];
        if (!(TILE_TYPES[t].name === 'трава' || TILE_TYPES[t].name === 'песок')) return false;
      }
    }
    // Проверка перекрытия других зданий
    for (const b of this.buildingsOnMap) {
      if (this.rectsOverlap(tileX, tileY, building.size, building.size, b.x, b.y, b.size, b.size)) return false;
    }
    // Проверка очереди строительства
    for (const b of this.buildQueue) {
      if (this.rectsOverlap(tileX, tileY, building.size, building.size, b.x, b.y, b.size, b.size)) return false;
    }
    return true;
  }
  rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
  }
  payBuildingCost(building) {
    const cost = building.cost;
    for (const res in cost) {
      if (resourceManager.get(res) < cost[res]) return false;
    }
    for (const res in cost) {
      resourceManager.spend(res, cost[res]);
    }
    this.updateResText();
    return true;
  }
  queueBuilding(tileX, tileY, building) {
    // Создаём контейнер для визуализации
    const group = this.add.container(0, 0).setDepth(20);
    // Фон здания
    const size = building.size * TILE_SIZE;
    const rect = this.add.rectangle(
      tileX * TILE_SIZE + size / 2,
      tileY * TILE_SIZE + size / 2,
      size, size,
      building.color
    ).setAlpha(0.5);
    // Рамка
    const border = this.add.rectangle(
      tileX * TILE_SIZE + size / 2,
      tileY * TILE_SIZE + size / 2,
      size, size
    ).setStrokeStyle(4, 0xffff00).setAlpha(0.7);
    // Надпись
    const label = this.add.text(
      tileX * TILE_SIZE + size / 2,
      tileY * TILE_SIZE + size / 2,
      building.name,
      { fontSize: '16px', color: '#fff', fontFamily: 'sans-serif', align: 'center' }
    ).setOrigin(0.5).setAlpha(0.7);
    // Прогресс-бар
    const barBg = this.add.rectangle(
      tileX * TILE_SIZE + size / 2,
      tileY * TILE_SIZE + size - 10,
      size - 8, 10, 0x444444
    ).setAlpha(0.7);
    const barFg = this.add.rectangle(
      tileX * TILE_SIZE + size / 2,
      tileY * TILE_SIZE + size - 10,
      0, 10, 0x00ff00
    ).setAlpha(0.9);
    // Надпись "Строится"
    const buildText = this.add.text(
      tileX * TILE_SIZE + size / 2,
      tileY * TILE_SIZE + size / 2 + 16,
      'Строится...',
      { fontSize: '14px', color: '#ff0', fontFamily: 'sans-serif' }
    ).setOrigin(0.5).setAlpha(0.8);
    group.add([rect, border, label, barBg, barFg, buildText]);
    this.buildQueue.push({
      x: tileX,
      y: tileY,
      type: building,
      timeLeft: building.buildTime,
      size: building.size,
      status: 'building',
      group, rect, border, label, barBg, barFg, buildText
    });
  }
  updateBuildQueue(dt) {
    for (const b of this.buildQueue) {
      b.timeLeft -= dt;
      // Обновляем прогресс-бар и надписи
      const progress = 1 - b.timeLeft / b.type.buildTime;
      b.barFg.width = (b.type.size * TILE_SIZE - 8) * progress;
      b.barFg.x = b.x * TILE_SIZE + b.type.size * TILE_SIZE / 2 - (b.type.size * TILE_SIZE - 8) / 2 + b.barFg.width / 2;
      if (b.timeLeft <= 0 && b.status === 'building') {
        b.status = 'done';
        // Визуально меняем здание на завершённое
        b.rect.setAlpha(1);
        b.border.setStrokeStyle(4, 0x00ff00).setAlpha(1);
        b.label.setAlpha(1);
        b.barBg.setVisible(false);
        b.barFg.setVisible(false);
        b.buildText.setVisible(false);
        b.label.setText(b.type.name);
        // Переносим в массив построенных зданий
        this.buildingsOnMap.push(b);
      }
    }
    // Оставляем в очереди только строящиеся здания
    this.buildQueue = this.buildQueue.filter(b => b.status === 'building');
  }
  updateBuildPreview() {
    if (!this.selectedBuilding) {
      if (this.buildPreview) { this.buildPreview.destroy(); this.buildPreview = null; }
      return;
    }
    const pointer = this.input.activePointer;
    const worldPoint = pointer.positionToCamera(this.cameras.main);
    const tileX = Math.floor(worldPoint.x / TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / TILE_SIZE);
    if (this.buildPreview) this.buildPreview.destroy();
    if (this.canBuildHere(tileX, tileY, this.selectedBuilding)) {
      this.buildPreview = this.add.rectangle(
        tileX * TILE_SIZE + this.selectedBuilding.size * TILE_SIZE / 2,
        tileY * TILE_SIZE + this.selectedBuilding.size * TILE_SIZE / 2,
        this.selectedBuilding.size * TILE_SIZE,
        this.selectedBuilding.size * TILE_SIZE,
        this.selectedBuilding.color
      ).setAlpha(0.3).setDepth(20);
    } else {
      this.buildPreview = this.add.rectangle(
        tileX * TILE_SIZE + this.selectedBuilding.size * TILE_SIZE / 2,
        tileY * TILE_SIZE + this.selectedBuilding.size * TILE_SIZE / 2,
        this.selectedBuilding.size * TILE_SIZE,
        this.selectedBuilding.size * TILE_SIZE,
        0xff0000
      ).setAlpha(0.3).setDepth(20);
    }
  }

  updateBuildQueueUI() {
    // Очищаем старые элементы
    this.queueUI.forEach(e => { e.name.destroy(); e.barBg.destroy(); e.barFg.destroy(); });
    this.queueUI = [];
    const startY = 500;
    this.buildQueue.forEach((b, i) => {
      const y = startY + i * 28;
      // Название здания
      const name = this.add.text(1120, y, b.type.name, {
        fontSize: '16px', color: '#fff', fontFamily: 'sans-serif'
      }).setOrigin(0, 0.5).setDepth(151).setScrollFactor(0);
      // Прогресс-бар
      const barBg = this.add.rectangle(1270, y, 60, 12, 0x444444).setOrigin(0, 0.5).setDepth(151).setScrollFactor(0);
      const progress = 1 - b.timeLeft / b.type.buildTime;
      const barFg = this.add.rectangle(1270, y, 60 * progress, 12, 0x00ff00).setOrigin(0, 0.5).setDepth(152).setScrollFactor(0);
      this.queueUI.push({ name, barBg, barFg });
    });
  }

  // --- Выбор здания ---
  // Добавить обработку клика по построенному зданию
  pointerDownOnMap(worldX, worldY) {
    // Проверяем, кликнули ли по зданию
    const building = this.buildingsOnMap.find(b =>
      worldX >= b.x * TILE_SIZE && worldX < (b.x + b.size) * TILE_SIZE &&
      worldY >= b.y * TILE_SIZE && worldY < (b.y + b.size) * TILE_SIZE
    );
    if (building) {
      this.selectBuildingInstance(building);
      return true;
    }
    this.deselectBuildingInstance();
    return false;
  }

  selectBuildingInstance(building) {
    this.selectedBuildingInstance = building;
    this.infoText.setText(`Выбрано: ${building.type.name}`);
    // Если здание может создавать юнитов — показать кнопку
    const unitType = UNITS.find(u => u.building === building.type.id);
    if (unitType) {
      if (this.unitCreateBtn) this.unitCreateBtn.destroy();
      this.unitCreateBtn = this.add.text(640, 660, `Создать: ${unitType.name}`, {
        fontSize: '20px', color: '#fff', backgroundColor: '#388e3c', padding: { left: 16, right: 16, top: 8, bottom: 8 }, fontFamily: 'sans-serif'
      }).setOrigin(0.5).setDepth(201).setScrollFactor(0).setInteractive({ useHandCursor: true });
      this.unitCreateBtn.on('pointerdown', () => {
        if (this.payUnitCost(unitType)) {
          this.createUnitNearBuilding(unitType, building);
          this.showMessage(`${unitType.name} создан!`);
        } else {
          this.showMessage('Недостаточно ресурсов!');
        }
      });
    } else {
      if (this.unitCreateBtn) { this.unitCreateBtn.destroy(); this.unitCreateBtn = null; }
    }
  }

  deselectBuildingInstance() {
    this.selectedBuildingInstance = null;
    this.infoText.setText('Информация о выбранном объекте');
    if (this.unitCreateBtn) { this.unitCreateBtn.destroy(); this.unitCreateBtn = null; }
  }

  payUnitCost(unitType) {
    for (const res in unitType.cost) {
      if (resourceManager.get(res) < unitType.cost[res]) return false;
    }
    for (const res in unitType.cost) {
      resourceManager.spend(res, unitType.cost[res]);
    }
    this.updateResText();
    return true;
  }

  createUnitNearBuilding(unitType, building) {
    // Радиус юнита
    const unitRadius = 16;
    // Кандидаты для появления (по кругу вокруг здания)
    const candidates = [];
    const bx = building.x * TILE_SIZE;
    const by = building.y * TILE_SIZE;
    const bsize = building.size * TILE_SIZE;
    // 8 направлений вокруг здания, потом дальше по кругу
    for (let r = 1; r <= 3; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // только по периметру
          const px = bx + bsize / 2 + dx * (unitRadius * 2 + 4);
          const py = by + bsize / 2 + dy * (unitRadius * 2 + 4);
          candidates.push({ px, py });
        }
      }
    }
    // Проверка на пересечение с другими юнитами и зданиями
    let found = null;
    for (const pos of candidates) {
      if (!this.isPositionBlocked(pos.px, pos.py, unitRadius)) {
        found = pos;
        break;
      }
    }
    if (!found) {
      this.showMessage('Нет места для юнита!');
      return;
    }
    const sprite = this.add.circle(found.px, found.py, unitRadius, unitType.color).setDepth(30);
    const label = this.add.text(found.px, found.py, unitType.name, { fontSize: '12px', color: '#222', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(31);
    this.units.push({ x: found.px, y: found.py, type: unitType, sprite, label, selected: false });
  }

  isPositionBlocked(px, py, radius) {
    // Проверка на пересечение с юнитами
    for (const u of this.units) {
      const dist = Phaser.Math.Distance.Between(px, py, u.x, u.y);
      if (dist < radius * 2) return true;
    }
    // Проверка на пересечение со зданиями
    for (const b of this.buildingsOnMap) {
      const left = b.x * TILE_SIZE;
      const right = (b.x + b.size) * TILE_SIZE;
      const top = b.y * TILE_SIZE;
      const bottom = (b.y + b.size) * TILE_SIZE;
      if (px + radius > left && px - radius < right && py + radius > top && py - radius < bottom) return true;
    }
    return false;
  }

  selectSingleUnit(unit) {
    this.selectedUnits.forEach(u => u.sprite.setStrokeStyle());
    this.selectedUnits = [unit];
    unit.sprite.setStrokeStyle(3, 0xffff00);
    this.infoText.setText(`Выбран: ${unit.type.name}`);
  }
  selectUnitsInBox(x, y, w, h) {
    this.selectedUnits.forEach(u => u.sprite.setStrokeStyle());
    this.selectedUnits = this.units.filter(u =>
      u.x > x && u.x < x + w && u.y > y && u.y < y + h
    );
    this.selectedUnits.forEach(u => u.sprite.setStrokeStyle(3, 0xffff00));
    if (this.selectedUnits.length === 1) {
      this.infoText.setText(`Выбран: ${this.selectedUnits[0].type.name}`);
    } else if (this.selectedUnits.length > 1) {
      this.infoText.setText(`Выбрано юнитов: ${this.selectedUnits.length}`);
    } else {
      this.infoText.setText('Информация о выбранном объекте');
    }
  }
  deselectAllUnits() {
    this.selectedUnits.forEach(u => u.sprite.setStrokeStyle());
    this.selectedUnits = [];
    this.infoText.setText('Информация о выбранном объекте');
  }

  updateUnits(dt) {
    for (const u of this.units) {
      if (u.target) {
        const dx = u.target.x - u.x;
        const dy = u.target.y - u.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 80; // пикселей в секунду
        if (dist > 2) {
          const move = Math.min(speed * dt, dist);
          u.x += (dx / dist) * move;
          u.y += (dy / dist) * move;
          u.sprite.x = u.x;
          u.sprite.y = u.y;
          u.label.x = u.x;
          u.label.y = u.y;
        } else {
          u.x = u.target.x;
          u.y = u.target.y;
          u.sprite.x = u.x;
          u.sprite.y = u.y;
          u.label.x = u.x;
          u.label.y = u.y;
          delete u.target;
        }
      }
    }
  }

  moveGroupTo(x, y) {
    // Расставляем цели с разлётом для группы
    const n = this.selectedUnits.length;
    const angleStep = (2 * Math.PI) / Math.max(1, n);
    const radius = 30 + 10 * n;
    this.selectedUnits.forEach((u, i) => {
      const angle = i * angleStep;
      u.target = {
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius
      };
    });
  }
} 