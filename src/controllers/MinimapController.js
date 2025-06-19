import { BUILDING_STATES } from '../entities/buildings/BuildingController.js';

export default class MinimapController {
  constructor(scene) {
    this.scene = scene;
    
    // Размеры миникарты
    this.width = 160;
    this.height = 120;
    
    // Позиция миникарты (с отступами 30px от правого и нижнего края)
    this.x = 1280 - 50 - this.width/2;  // 1280 - ширина экрана
    this.y = 720 - 50 - this.height/2;   // 720 - высота экрана
    
    // Создаем графические элементы миникарты
    this.createMinimapElements();
    
    // Добавляем обработчики кликов
    this.setupInteraction();
  }

  createMinimapElements() {
    // Создаем группу для элементов миникарты
    this.container = this.scene.add.container(0, 0).setDepth(100).setScrollFactor(0);
    
    // Фон миникарты
    this.background = this.scene.add.rectangle(
      this.x,
      this.y,
      this.width,
      this.height,
      0x111111
    ).setScrollFactor(0);
    
    // Устанавливаем интерактивную область
    const hitArea = new Phaser.Geom.Rectangle(
        0,
        0,
        this.width,
        this.height
      );
    this.background.setInteractive({
        hitArea: hitArea,
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        draggable: false,
        dropZone: false,
        useHandCursor: true,
        pixelPerfect: false,
        alphaTolerance: 0.5,
    });
    this.container.add(this.background);
    
    // Создаем графический объект для отрисовки тайлов карты
    this.mapGraphics = this.scene.add.graphics();
    this.mapGraphics.setPosition(this.x - this.width/2, this.y - this.height/2);
    this.container.add(this.mapGraphics);
    
    // Слой для юнитов и зданий (обновляется динамически)
    this.unitsLayer = this.scene.add.graphics();
    this.unitsLayer.setPosition(this.x - this.width/2, this.y - this.height/2);
    this.container.add(this.unitsLayer);
    
    // Рамка области просмотра
    this.viewportRect = this.scene.add.rectangle(
      this.x,
      this.y,
      0,
      0,
      0xffffff,
      0
    ).setStrokeStyle(1, 0xffffff, 0.5).setScrollFactor(0);
    this.container.add(this.viewportRect);
  }

  setupInteraction() {
    // Обработка клика по миникарте
    this.background.on('pointerdown', (pointer) => {
      // Получаем локальные координаты относительно центра миникарты
      const localX = pointer.x - this.x + this.width/2;
      const localY = pointer.y - this.y + this.height/2;
      
      // Проверяем, что клик был внутри миникарты
      if (localX >= 0 && localX <= this.width && localY >= 0 && localY <= this.height) {
        // Переводим координаты миникарты в игровые координаты
        const worldX = (localX / this.width) * (this.scene.tileData[0].length * 32);
        const worldY = (localY / this.height) * (this.scene.tileData.length * 32);
        
        // Центрируем камеру, учитывая размер viewport'а
        const camera = this.scene.cameras.main;
        const targetX = worldX - camera.width / 2;
        const targetY = worldY - camera.height / 2;
        
        // Ограничиваем координаты камеры границами карты
        const maxX = (this.scene.tileData[0].length * 32) - camera.width;
        const maxY = (this.scene.tileData.length * 32) - camera.height;
        
        camera.scrollX = Phaser.Math.Clamp(targetX, 0, maxX);
        camera.scrollY = Phaser.Math.Clamp(targetY, 0, maxY);
      }
    });
  }

  renderTerrain() {
    // Проверяем наличие данных карты
    if (!this.scene.tileData || !this.scene.tileData[0]) return;
    
    // Вычисляем масштаб на основе размеров карты
    this.scaleX = this.width / (this.scene.tileData[0].length * 32);
    this.scaleY = this.height / (this.scene.tileData.length * 32);
    
    // Очищаем графику
    this.mapGraphics.clear();
    
    // Отрисовываем тайлы карты
    const tileData = this.scene.tileData;
    const tileWidth = this.width / tileData[0].length;
    const tileHeight = this.height / tileData.length;
    
    for (let y = 0; y < tileData.length; y++) {
      for (let x = 0; x < tileData[y].length; x++) {
        const tileType = tileData[y][x];
        const color = this.getTileColor(tileType);
        
        this.mapGraphics.fillStyle(color);
        this.mapGraphics.fillRect(
          x * tileWidth,
          y * tileHeight,
          tileWidth + 0.5,
          tileHeight + 0.5
        );
      }
    }
  }

  getTileColor(tileType) {
    // Цвета для разных типов тайлов
    const colors = [
      0x4caf50, // трава
      0x2196f3, // вода
      0x888888, // камень
      0xffeb3b, // песок
    ];
    return colors[tileType];
  }

  update() {
    // Если карта не инициализирована, пропускаем обновление
    if (!this.scene.tileData || !this.scene.tileData[0]) return;
    
    // Очищаем слой юнитов
    this.unitsLayer.clear();
    
    // Обновляем рамку области просмотра
    const camera = this.scene.cameras.main;
    const viewX = (camera.scrollX / (this.scene.tileData[0].length * 32)) * this.width;
    const viewY = (camera.scrollY / (this.scene.tileData.length * 32)) * this.height;
    const viewWidth = (camera.width / (this.scene.tileData[0].length * 32)) * this.width;
    const viewHeight = (camera.height / (this.scene.tileData.length * 32)) * this.height;
    
    this.viewportRect.setPosition(
      this.x - this.width/2 + viewX + viewWidth/2,
      this.y - this.height/2 + viewY + viewHeight/2
    );
    this.viewportRect.setSize(viewWidth, viewHeight);
    
    // Отрисовываем здания
    // --- Здания игрока ---
    if (this.scene.playerController) {
      const buildings = this.scene.playerController.state.buildings;
      for (const building of buildings) {
        // Пропускаем уничтоженные здания
        if (building.state === BUILDING_STATES.DESTROYED) continue;

        const color = building.state === BUILDING_STATES.CONSTRUCTION 
          ? 0xffff00  // желтый для строящихся
          : building.type.color;

        const x = (building.x * 32 / (this.scene.tileData[0].length * 32)) * this.width;
        const y = (building.y * 32 / (this.scene.tileData.length * 32)) * this.height;
        const width = (building.type.size * 32 / (this.scene.tileData[0].length * 32)) * this.width;
        const height = (building.type.size * 32 / (this.scene.tileData.length * 32)) * this.height;
        
        // Рисуем здание
        this.unitsLayer.fillStyle(color);
        this.unitsLayer.fillRect(x, y, width, height);

        // Для строящихся зданий добавляем рамку
        if (building.state === BUILDING_STATES.CONSTRUCTION) {
          this.unitsLayer.lineStyle(1, 0xffffff);
          this.unitsLayer.strokeRect(x, y, width, height);
        }
      }
    }

    // --- Здания ИИ ---
    if (this.scene.aiEnemies) {
      for (const ai of this.scene.aiEnemies) {
        if (!ai.strategist) continue;
        
        const buildings = ai.strategist.getAllBuildings();
        for (const building of buildings) {
          // Пропускаем уничтоженные здания
          //if (building.state === BUILDING_STATES.DESTROYED) continue;

          // Для зданий ИИ используем более темные оттенки их цветов
          const baseColor = building.type.color;
          
          // Затемняем цвет для зданий ИИ
          const color = Phaser.Display.Color.IntegerToColor(baseColor);
          color.red = Math.floor(color.red * 0.7);
          color.green = Math.floor(color.green * 0.7);
          color.blue = Math.floor(color.blue * 0.7);
          
          const x = (building.x * 32 / (this.scene.tileData[0].length * 32)) * this.width;
          const y = (building.y * 32 / (this.scene.tileData.length * 32)) * this.height;
          const width = (building.type.size * 32 / (this.scene.tileData[0].length * 32)) * this.width;
          const height = (building.type.size * 32 / (this.scene.tileData.length * 32)) * this.height;
          
          // Рисуем здание
          this.unitsLayer.fillStyle(color.color);
          this.unitsLayer.fillRect(x, y, width, height);
        }
      }
    }
    
    // Отрисовываем юниты
    if (this.scene.getAllUnits) {
      const units = this.scene.getAllUnits();
      for (const unit of units) {
        if (!unit.type) continue;
        const color = unit.type.color;
        const x = (unit.x / (this.scene.tileData[0].length * 32)) * this.width;
        const y = (unit.y / (this.scene.tileData.length * 32)) * this.height;
        const size = 2; // размер точки юнита на миникарте
        
        this.unitsLayer.fillStyle(color);
        this.unitsLayer.fillCircle(x, y, size);
      }
    }
    
    // Отрисовываем ресурсы
    if (this.scene.resourceDeposits) {
      for (const deposit of this.scene.resourceDeposits) {
        const x = (deposit.x * 32 / (this.scene.tileData[0].length * 32)) * this.width;
        const y = (deposit.y * 32 / (this.scene.tileData.length * 32)) * this.height;
        
        this.unitsLayer.fillStyle(0xffd700); // золотой цвет для ресурсов
        this.unitsLayer.fillCircle(x, y, 2);
      }
    }
  }
} 