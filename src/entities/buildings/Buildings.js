export const BUILDINGS = [
  {
    id: 'hq',
    name: 'Штаб',
    type: 'storage',
    color: 0x1976d2,
    cost: { gold: 100, wood: 50, stone: 30 },
    buildTime: 5, // секунд
    size: 2, // 2x2 тайла
    maxHP: 1000,
    resourceLimits: {
      wood: 300,
      stone: 300,
      gold: 300,
      food: 300
    }
  },
  {
    id: 'barracks',
    name: 'Казармы',
    type: 'unitFactory',
    color: 0x388e3c,
    cost: { gold: 60, wood: 40, stone: 20 },
    buildTime: 4,
    size: 2,
    maxHP: 600,
    unitTypes: ['warrior', 'archer'],
    maxQueueSize: 5,
    unitLimitBonus: 5
  },
  {
    id: 'warehouse',
    name: 'Склад',
    type: 'storage',
    color: 0xfbc02d,
    cost: { gold: 40, wood: 80, stone: 20 },
    buildTime: 3,
    size: 2,
    maxHP: 400,
    resourceLimits: {
      wood: 200,
      stone: 200,
      gold: 200,
      food: 200
    }
  },
  {
    id: 'factory',
    name: 'Завод',
    type: 'unitFactory',
    color: 0x8d6e63,
    cost: { gold: 80, wood: 30, stone: 40 },
    buildTime: 6,
    size: 3,
    maxHP: 800,
    unitTypes: ['worker', 'siege'],
    maxQueueSize: 3,
    unitLimitBonus: 5
  },
  {
    id: 'tower',
    name: 'Башня',
    color: 0x7b1fa2,
    cost: { золото: 50, дерево: 20, камень: 40, металл: 15 },
    buildTime: 3,
    size: 1,
  },
  {
    id: 'lab',
    name: 'Лаборатория',
    type: 'research',
    color: 0x7b1fa2,
    cost: { gold: 120, wood: 40, stone: 60 },
    buildTime: 8,
    size: 2,
    maxHP: 500,
    maxQueueSize: 3
  }
]; 