import { RESOURCE_TYPES } from '../entities/resources/ResourceTypes.js';

// 0 — трава, 1 — вода, 2 — камень, 3 — песок
export const MAPS = [
  // Миссия 1: большая поляна, по краям лес, озеро внизу, песок справа
  {
    tileData: Array.from({length: 100}, (_, y) => Array.from({length: 100}, (_, x) =>
      (x > 30 && x < 70 && y > 30 && y < 70) ? 0 : // поляна
      (y > 85 && x > 10 && x < 90) ? 1 : // озеро внизу
      (x < 15 || x > 85 || y < 15 || y > 85) ? 2 : // лес-камень по краям
      (x > 75 && y > 20 && y < 80) ? 3 : // песчаная зона справа
      0
    )),
    playerBases: [{x: 20, y: 20}],
    enemyBases: [{x: 80, y: 80}],
    resources: [
      {type: RESOURCE_TYPES.GOLD, x: 25, y: 25, amount: 500},
      {type: RESOURCE_TYPES.WOOD, x: 22, y: 28, amount: 400},
      {type: RESOURCE_TYPES.STONE, x: 35, y: 22, amount: 300},
      {type: RESOURCE_TYPES.METAL, x: 28, y: 35, amount: 200},
      {type: RESOURCE_TYPES.GOLD, x: 75, y: 75, amount: 500},
      {type: RESOURCE_TYPES.WOOD, x: 78, y: 72, amount: 400},
      {type: RESOURCE_TYPES.STONE, x: 65, y: 82, amount: 300},
      {type: RESOURCE_TYPES.METAL, x: 72, y: 65, amount: 200},
    ],
  },
  // Миссия 2: горная местность с озерами
  {
    tileData: Array.from({length: 100}, (_, y) => Array.from({length: 100}, (_, x) =>
      Math.random() < 0.1 ? 1 : // случайные озера
      Math.random() < 0.3 ? 2 : // много камня
      Math.random() < 0.1 ? 3 : // немного песка
      0 // в основном трава
    )),
    playerBases: [{x: 20, y: 80}],
    enemyBases: [{x: 80, y: 20}],
    resources: [
      {type: RESOURCE_TYPES.GOLD, x: 30, y: 70, amount: 500},
      {type: RESOURCE_TYPES.WOOD, x: 25, y: 75, amount: 400},
      {type: RESOURCE_TYPES.STONE, x: 35, y: 65, amount: 300},
      {type: RESOURCE_TYPES.METAL, x: 28, y: 72, amount: 200},
      {type: RESOURCE_TYPES.GOLD, x: 70, y: 30, amount: 500},
      {type: RESOURCE_TYPES.WOOD, x: 75, y: 25, amount: 400},
      {type: RESOURCE_TYPES.STONE, x: 65, y: 35, amount: 300},
      {type: RESOURCE_TYPES.METAL, x: 72, y: 28, amount: 200},
    ],
  },
  // Миссия 3: озеро по центру, стартовые зоны по углам, песчаные пляжи вокруг озера
  {
    tileData: Array.from({length: 100}, (_, y) => Array.from({length: 100}, (_, x) =>
      ((x-50)**2 + (y-50)**2 < 400) ? 1 : // озеро
      ((x-50)**2 + (y-50)**2 < 625) ? 3 : // пляж
      ((x < 15 && y < 15) || (x > 85 && y > 85)) ? 0 : // стартовые поляны
      (x < 8 || y < 8 || x > 92 || y > 92) ? 2 : // камень по краям
      0
    )),
    playerBases: [{x: 10, y: 10}],
    enemyBases: [{x: 90, y: 90}, {x: 10, y: 90}, {x: 90, y: 10}],
    resources: [
      {type: RESOURCE_TYPES.GOLD, x: 20, y: 20, amount: 500},
      {type: RESOURCE_TYPES.WOOD, x: 15, y: 25, amount: 400},
      {type: RESOURCE_TYPES.STONE, x: 25, y: 15, amount: 300},
      {type: RESOURCE_TYPES.METAL, x: 18, y: 28, amount: 200},
      {type: RESOURCE_TYPES.GOLD, x: 80, y: 80, amount: 500},
      {type: RESOURCE_TYPES.WOOD, x: 85, y: 75, amount: 400},
      {type: RESOURCE_TYPES.STONE, x: 75, y: 85, amount: 300},
      {type: RESOURCE_TYPES.METAL, x: 82, y: 78, amount: 200},
    ],
  },
  // Миссия 4: лабиринт из камня, поляны с песком, вода в центре
  {
    tileData: Array.from({length: 100}, (_, y) => Array.from({length: 100}, (_, x) =>
      (x % 10 === 0 || y % 10 === 0) ? 2 : // лабиринт
      (x > 40 && x < 60 && y > 40 && y < 60) ? 1 : // вода в центре
      ((x-20)**2 + (y-80)**2 < 36 || (x-80)**2 + (y-20)**2 < 36) ? 3 : // песчаные поляны
      0
    )),
    playerBases: [{x: 15, y: 85}],
    enemyBases: [{x: 85, y: 15}, {x: 85, y: 85}],
    resources: [
      {type: RESOURCE_TYPES.GOLD, x: 20, y: 80, amount: 500},
      {type: RESOURCE_TYPES.WOOD, x: 18, y: 75, amount: 400},
      {type: RESOURCE_TYPES.STONE, x: 25, y: 85, amount: 300},
      {type: RESOURCE_TYPES.METAL, x: 28, y: 78, amount: 200},
      {type: RESOURCE_TYPES.GOLD, x: 80, y: 20, amount: 500},
      {type: RESOURCE_TYPES.WOOD, x: 82, y: 25, amount: 400},
      {type: RESOURCE_TYPES.STONE, x: 75, y: 15, amount: 300},
      {type: RESOURCE_TYPES.METAL, x: 78, y: 28, amount: 200},
    ],
  },
  // Миссия 5: архипелаг — острова из травы и песка, между ними вода, камень по краям
  {
    tileData: Array.from({length: 100}, (_, y) => Array.from({length: 100}, (_, x) =>
      ((x-25)**2 + (y-25)**2 < 100 || (x-75)**2 + (y-75)**2 < 100) ? 0 : // травяные острова
      ((x-25)**2 + (y-75)**2 < 64 || (x-75)**2 + (y-25)**2 < 64) ? 3 : // песчаные острова
      (x < 8 || y < 8 || x > 92 || y > 92) ? 2 : // камень по краям
      1 // вода
    )),
    playerBases: [{x: 25, y: 25}],
    enemyBases: [{x: 75, y: 75}, {x: 25, y: 75}, {x: 75, y: 25}],
    resources: [
      {type: RESOURCE_TYPES.GOLD, x: 30, y: 30, amount: 500},
      {type: RESOURCE_TYPES.WOOD, x: 28, y: 32, amount: 400},
      {type: RESOURCE_TYPES.STONE, x: 32, y: 28, amount: 300},
      {type: RESOURCE_TYPES.METAL, x: 35, y: 35, amount: 200},
      {type: RESOURCE_TYPES.GOLD, x: 70, y: 70, amount: 500},
      {type: RESOURCE_TYPES.WOOD, x: 72, y: 68, amount: 400},
      {type: RESOURCE_TYPES.STONE, x: 68, y: 72, amount: 300},
      {type: RESOURCE_TYPES.METAL, x: 65, y: 65, amount: 200},
    ],
  },
]; 