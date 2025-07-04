import Phaser from 'phaser';
import { BUILDINGS } from '../entities/buildings/Buildings.js';
import { UNITS } from '../entities/units/Units.js';
import { MAPS } from '../maps/Maps.js';
import ResourceGathering from '../entities/resources/ResourceGathering.js';
import AIEnemy from '../ai/AI.js';
import ResourceDeposit from '../entities/resources/ResourceDeposit.js';
import MinimapController from '../controllers/MinimapController.js';
import PlayerController from '../controllers/PlayerController.js';
import ParticleController from '../controllers/ParticleController.js';
import ParticleControllerDemo from '../controllers/ParticleControllerDemo.js';

const TILE_SIZE = 32;
const MAP_SIZE = 100;
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

export default class MissionScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MissionScene' });
  }

  init(data) {
    this.missionNumber = data.mission || 1;
  }

  create() {
    // Инициализация контроллера игрока
    this.playerController = new PlayerController(this);
    
    // Инициализация контроллера частиц
    this.particleController = new ParticleController(this);
    
    // Инициализация демо контроллера для тестирования эффектов
    // this.particleDemo = new ParticleControllerDemo(this);
    
    // Устанавливаем цели миссии
    this.playerController.setMissionGoals([
      // Пример целей по умолчанию
      {
        type: 'BUILD_COUNT',
        buildingType: 'barracks',
        count: 1,
        failOnLess: false
      },
      {
        type: 'UNIT_COUNT',
        unitType: 'worker',
        count: 5,
        failOnLess: false
      },
      {
        type: 'DESTROY_ENEMY'
      }
    ]);

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

    // --- Интерфейс очереди строительства ---
    this.add.rectangle(80, 520, 160, 100, 0x222222).setDepth(150).setScrollFactor(0);
    this.queueTitle = this.add.text(80, 480, 'Строится:', {
      fontSize: '18px', color: '#fff', fontFamily: 'sans-serif'
    }).setOrigin(0.5).setDepth(151).setScrollFactor(0);
    this.queueUI = [];

    // --- Генерация карты ---
    const mapIndex = (this.missionNumber - 1) % MAPS.length;
    const map = MAPS[mapIndex];
    
    // Если в карте есть цели миссии, устанавливаем их
    if (map.goals) {
      this.playerController.setMissionGoals(map.goals);
    }

    this.tileData = map.tileData.map(row => [...row]);
    this.tileLayer = this.add.layer();
    this.renderTiles();

    // Инициализация миникарты
    this.minimap = new MinimapController(this);
    this.minimap.renderTerrain();

    // --- Размещение стартовых баз игрока ---
    this.playerBases = [];
    for (const base of map.playerBases) {
      const px = base.x * TILE_SIZE + TILE_SIZE;
      const py = base.y * TILE_SIZE + TILE_SIZE;
      const rect = this.add.rectangle(px, py, TILE_SIZE * 2, TILE_SIZE * 2, 0x1976d2).setDepth(50);
      const label = this.add.text(px, py, 'База игрока', { fontSize: '14px', color: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(51);
      this.playerBases.push({x: base.x, y: base.y, rect, label});
      this.playerController.base = { x: base.x, y: base.y };
    }
    // --- Размещение баз врага ---
    this.enemyBases = [];
    for (const base of map.enemyBases) {
      const px = base.x * TILE_SIZE + TILE_SIZE;
      const py = base.y * TILE_SIZE + TILE_SIZE;
      const rect = this.add.rectangle(px, py, TILE_SIZE * 2, TILE_SIZE * 2, 0x8B2222).setDepth(50);
      const label = this.add.text(px, py, 'База ИИ', { fontSize: '14px', color: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(51);
      this.enemyBases.push({x: base.x, y: base.y, rect, label});
    }
    // --- Инициализация ИИ ---
    this.aiEnemies = this.enemyBases.map(base => new AIEnemy(this, base));
    // --- Размещение ресурсов ---
    this.resourceDeposits = [];
    for (const res of map.resources) {
      const deposit = new ResourceDeposit({
        scene: this,
        x: res.x,
        y: res.y,
        type: res.type,
        amount: res.amount
      });
      this.resourceDeposits.push(deposit);
    }
    this.updateResourceLabels = () => {
      for (const res of this.resourceDeposits) {
        res.amountLabel.setText(res.amount.toString());
      }
    };

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
    this.buildPreview = null;
    this.selectedBuildingInstance = null;
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
          // Получаем юнитов из PlayerController
          const allUnits = this.playerController.state.units || [];
          const unit = allUnits.find(u => Phaser.Math.Distance.Between(worldPoint.x, worldPoint.y, u.x, u.y) < 18);
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

    // Обработчик ПКМ для управления юнитами
    this.input.on('pointerdown', (pointer) => {
      if (pointer.rightButtonDown() && this.selectedUnits.length > 0) {
        const worldPoint = pointer.positionToCamera(this.cameras.main);
        // Вся логика обработки правого клика теперь в контроллере игрока
        this.playerController.handleRightClick(worldPoint, this.selectedUnits);
      }
    });

    this.resourceGathering = new ResourceGathering(this);
  }

  preload() {
    // Создаем текстуру для частиц
    const pixelTexture = this.textures.createCanvas('particle', 4, 4);
    const context = pixelTexture.getContext();
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 4, 4);
    pixelTexture.refresh();
  }

  update(time, delta) {
    // Обновляем контроллер игрока
    this.playerController.update(time, delta);

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

    // Обновление миникарты
    this.minimap.update();

    // Превью здания под мышью
    this.updateBuildPreview();
    this.updateBuildQueueUI();

    // Снятие выделения по клику на пустое место
    if (this.input.activePointer.leftButtonDown() && !this.isSelecting && !this.selectedBuilding && !this.isDragging) {
      this.deselectAllUnits();
    }

    this.resourceGathering.update(delta / 1000);

    // --- Логика ИИ ---
    if (this.aiEnemies) {
      for (const ai of this.aiEnemies) {
        ai.update(delta / 1000, time / 1000);
      }
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
    return this.playerController.getResourceString();
  }

  updateResText() {
    this.playerController.updateResourceDisplay();
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
    // Проверяем границы карты
    if (tileX < 0 || tileY < 0 || 
        tileX + building.size > MAP_SIZE || 
        tileY + building.size > MAP_SIZE) {
      return false;
    }

    // Проверяем тип тайла (можно строить только на траве)
    for (let y = tileY; y < tileY + building.size; y++) {
      for (let x = tileX; x < tileX + building.size; x++) {
        if (this.tileData[y][x] !== 0) return false;
      }
    }

    // Проверяем пересечения с другими зданиями
    const buildingRect = {
      x: tileX * TILE_SIZE,
      y: tileY * TILE_SIZE,
      w: building.size * TILE_SIZE,
      h: building.size * TILE_SIZE
    };

    for (const existingBuilding of this.playerController.state.buildings) {
      if (existingBuilding.state === 'destroyed') continue;
      
      const existing = {
        x: existingBuilding.x * TILE_SIZE,
        y: existingBuilding.y * TILE_SIZE,
        w: existingBuilding.type.size * TILE_SIZE,
        h: existingBuilding.type.size * TILE_SIZE
      };

      if (this.rectsOverlap(
        buildingRect.x, buildingRect.y, buildingRect.w, buildingRect.h,
        existing.x, existing.y, existing.w, existing.h
      )) {
        return false;
      }
    }

    return true;
  }
  rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
    return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1);
  }
  payBuildingCost(building) {
    return this.playerController.spendResources(building.cost);
  }
  queueBuilding(tileX, tileY, building) {
    // Только запрос в контроллер игрока
    this.playerController.queueBuildingConstruction(tileX, tileY, building.id);
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
    // UI очереди: просто отображаем названия и прогресс по данным из контроллера
    this.queueUI.forEach(e => { e.name.destroy(); e.barBg.destroy(); e.barFg.destroy(); });
    this.queueUI = [];
    const startY = 500;
    const queue = this.playerController.getBuildQueue();
    queue.forEach((construction, i) => {
      const y = startY + i * 28;
      const name = this.add.text(1120, y, construction.type.name, {
        fontSize: '16px', color: '#fff', fontFamily: 'sans-serif'
      }).setOrigin(0, 0.5).setDepth(151).setScrollFactor(0);
      const barBg = this.add.rectangle(1270, y, 60, 12, 0x444444)
        .setOrigin(0, 0.5)
        .setDepth(151)
        .setScrollFactor(0);
      const progress = 1 - construction.timeLeft / construction.type.buildTime;
      const barFg = this.add.rectangle(1270, y, 60 * progress, 12, 0x00ff00)
        .setOrigin(0, 0.5)
        .setDepth(152)
        .setScrollFactor(0);
      this.queueUI.push({ name, barBg, barFg });
    });
  }

  // --- Выбор здания ---
  pointerDownOnMap(worldX, worldY) {
    if (this.selectedBuilding) {
      const tileX = Math.floor(worldX / TILE_SIZE);
      const tileY = Math.floor(worldY / TILE_SIZE);

      if (this.canBuildHere(tileX, tileY, this.selectedBuilding)) {
        // Создаем здание через контроллер игрока
        const building = this.playerController.createBuilding(
          this.selectedBuilding.id,
          tileX,
          tileY
        );

        if (building) {
          this.showMessage(`Строится: ${this.selectedBuilding.name}`);
          
          // Добавляем эффект частиц при начале строительства
          const buildX = tileX * TILE_SIZE + (this.selectedBuilding.size * TILE_SIZE) / 2;
          const buildY = tileY * TILE_SIZE + (this.selectedBuilding.size * TILE_SIZE) / 2;
          this.particleController.createEffect('dust', buildX, buildY, {
            quantity: 10,
            speedMin: 20,
            speedMax: 50
          });
          
          this.selectedBuilding = null;
          if (this.buildPreview) {
            this.buildPreview.destroy();
            this.buildPreview = null;
          }
        }
      } else {
        this.showMessage('Здесь нельзя строить');
      }
      return;
    }

    // Проверяем клик по существующему зданию
    const clickedBuilding = this.playerController.state.buildings.find(building => {
      const buildingX = building.x * TILE_SIZE;
      const buildingY = building.y * TILE_SIZE;
      const buildingSize = building.type.size * TILE_SIZE;
      return worldX >= buildingX && 
             worldX < buildingX + buildingSize && 
             worldY >= buildingY && 
             worldY < buildingY + buildingSize;
    });

    if (clickedBuilding) {
      // Восстанавливаем прототип перед выбором
      this.selectBuildingInstance(clickedBuilding);
    } else {
      this.deselectBuildingInstance();
    }
  }

  selectBuildingInstance(building) {
    console.log('Выбрано здание:', building);
    console.log('Тип здания:', building.getBuildingType());
    
    this.selectedBuildingInstance = building;
    this.deselectAllUnits();

    // Обновляем информационную панель
    let info = `${building.type.name} (HP: ${building.hp}/${building.maxHP})`;
    
    // Добавляем специфичную информацию в зависимости от типа здания
    if (building.isUnitFactory()) {
      console.log('Это фабрика юнитов');
      console.log('Доступные типы юнитов:', building.type.unitTypes);
      
      info += `\nВ очереди: ${building.productionQueue ? building.productionQueue.length : 0}/${building.type.maxQueueSize || 5}`;
      
      // Удаляем старые кнопки, если они есть
      if (this.unitButtons) {
        this.unitButtons.forEach(btn => btn.destroy());
      }
      this.unitButtons = [];
      
      // Создаем кнопки для производства юнитов
      const availableUnits = building.type.unitTypes || [];
      availableUnits.forEach((unitType, i) => {
        const unitData = UNITS.find(u => u.id === unitType);
        if (!unitData) return;
        
        const btn = this.add.text(200 + i * 160, 680, unitData.name, {
          fontSize: '18px',
          backgroundColor: '#444',
          padding: { x: 10, y: 5 },
          color: '#fff'
        }).setScrollFactor(0).setDepth(101).setInteractive();
        
        // Добавляем подсказку со стоимостью
        const costText = Object.entries(unitData.cost || {})
          .map(([res, amount]) => `${res}: ${amount}`)
          .join(', ');
        
        const tooltip = this.add.text(btn.x, btn.y - 30, costText, {
          fontSize: '14px',
          backgroundColor: '#000',
          padding: { x: 5, y: 3 },
          color: '#fff'
        }).setScrollFactor(0).setDepth(102).setVisible(false);
        
        btn.on('pointerover', () => tooltip.setVisible(true));
        btn.on('pointerout', () => tooltip.setVisible(false));
        
        btn.on('pointerdown', () => {
          if (building.canQueueUnit && building.queueUnit) {
            if (building.canQueueUnit(unitData)) {
              building.queueUnit(unitData);
              this.showMessage(`Добавлен в очередь: ${unitData.name}`);
            } else {
              this.showMessage('Невозможно создать юнита: нет ресурсов или очередь полна');
            }
          }
        });
        
        this.unitButtons.push(btn);
        this.unitButtons.push(tooltip);
      });
    } else if (building.isResearchLab()) {
      info += `\nИсследований в очереди: ${building.researchQueue.length}/${building.maxQueueSize}`;
      
      // Создаем кнопки для исследований
      if (this.researchButtons) {
        this.researchButtons.forEach(btn => btn.destroy());
      }
      this.researchButtons = [];
      
      building.availableUpgrades.forEach((upgrade, i) => {
        if (!this.playerController.hasResearch(upgrade.id)) {
          const btn = this.add.text(200 + i * 160, 680, upgrade.name, {
            fontSize: '16px',
            backgroundColor: '#444',
            padding: { x: 10, y: 5 },
            color: '#fff'
          }).setScrollFactor(0).setDepth(101).setInteractive();
          
          btn.on('pointerdown', () => {
            if (building.canResearch(upgrade.id)) {
              building.queueResearch(upgrade.id);
            } else {
              this.showMessage('Невозможно начать исследование: нет ресурсов или очередь полна');
            }
          });
          
          this.researchButtons.push(btn);
        }
      });
    } else if (building.isStorage()) {
      const limits = building.getResourceLimits();
      info += '\nБонус к лимитам:';
      for (const [res, limit] of Object.entries(limits)) {
        info += ` ${res}: +${limit}`;
      }
    }
    
    this.infoText.setText(info);
  }

  deselectBuildingInstance() {
    this.selectedBuildingInstance = null;
    this.infoText.setText('');
    
    // Удаляем кнопки производства юнитов
    if (this.unitButtons) {
      this.unitButtons.forEach(btn => btn.destroy());
      this.unitButtons = [];
    }
    
    // Удаляем кнопки исследований
    if (this.researchButtons) {
      this.researchButtons.forEach(btn => btn.destroy());
      this.researchButtons = [];
    }
  }

  // Проверка свободной позиции для создания юнита
  isPositionFree(x, y) {
    // Проверяем границы карты
    if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) {
      return false;
    }

    // Проверяем тип тайла
    if (this.tileData[y][x] !== 0) {
      return false;
    }

    // Проверяем пересечения с другими объектами
    const pos = { x: x * TILE_SIZE, y: y * TILE_SIZE };
    
    // Проверяем здания
    for (const building of this.playerController.state.buildings) {
      if (building.state === 'destroyed') continue;
      
      const buildingRect = {
        x: building.x * TILE_SIZE,
        y: building.y * TILE_SIZE,
        w: building.type.size * TILE_SIZE,
        h: building.type.size * TILE_SIZE
      };

      if (this.rectsOverlap(
        pos.x, pos.y, TILE_SIZE, TILE_SIZE,
        buildingRect.x, buildingRect.y, buildingRect.w, buildingRect.h
      )) {
        return false;
      }
    }

    // Проверяем юнитов
    for (const unit of this.playerController.state.units) {
      const unitPos = {
        x: unit.x - TILE_SIZE/2,
        y: unit.y - TILE_SIZE/2
      };

      if (this.rectsOverlap(
        pos.x, pos.y, TILE_SIZE, TILE_SIZE,
        unitPos.x, unitPos.y, TILE_SIZE, TILE_SIZE
      )) {
        return false;
      }
    }

    return true;
  }

  // Создание юнита
  createUnit(unitType, x, y) {
    // TODO: Реализовать создание юнита с использованием PlayerUnitsController
    return null;
  }

  selectSingleUnit(unit) {
    this.selectedUnits.forEach(u => u.sprite.setStrokeStyle());
    this.selectedUnits = [unit];
    unit.sprite.setStrokeStyle(3, 0xffff00);
    this.infoText.setText(`Выбран: ${unit.type.name}`);
  }
  
  selectUnitsInBox(x, y, w, h) {
    this.selectedUnits.forEach(u => u.sprite.setStrokeStyle());
    
    // Получаем юнитов из PlayerController, а не из this.units
    const allUnits = this.playerController.state.units || [];
    this.selectedUnits = allUnits.filter(u =>
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

  getAllUnits() {
    const allUnits = this.playerController.state.units.filter(u => u.state !== 'destroyed');
    this.aiEnemies.forEach(enemy => {
      allUnits.push(...enemy.strategist.getAllUnits());
    });
    return allUnits;
  }

  worldToTile(x, y) {
    return {
      x: Math.floor(x / TILE_SIZE),
      y: Math.floor(y / TILE_SIZE)
    };
  }
} 