import { RESOURCE_TYPES } from '../resources/ResourceTypes.js';

export const BUILDINGS = [
  {
    id: 'hq',
    name: 'Штаб',
    type: 'storage',
    color: 0x1976d2,
    cost: {
      [RESOURCE_TYPES.GOLD]: 100,
      [RESOURCE_TYPES.WOOD]: 50,
      [RESOURCE_TYPES.STONE]: 30
    },
    buildTime: 5, // секунд
    size: 2, // 2x2 тайла
    maxHP: 1000,
    resourceLimits: {
      [RESOURCE_TYPES.GOLD]: 300,
      [RESOURCE_TYPES.WOOD]: 300,
      [RESOURCE_TYPES.STONE]: 300,
      [RESOURCE_TYPES.METAL]: 300
    }
  },
  {
    id: 'barracks',
    name: 'Казармы',
    type: 'unitFactory',
    color: 0x388e3c,
    cost: {
      [RESOURCE_TYPES.GOLD]: 60,
      [RESOURCE_TYPES.WOOD]: 40,
      [RESOURCE_TYPES.STONE]: 20
    },
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
    cost: {
      [RESOURCE_TYPES.GOLD]: 40,
      [RESOURCE_TYPES.WOOD]: 80,
      [RESOURCE_TYPES.STONE]: 20
    },
    buildTime: 3,
    size: 2,
    maxHP: 400,
    resourceLimits: {
      [RESOURCE_TYPES.GOLD]: 200,
      [RESOURCE_TYPES.WOOD]: 200,
      [RESOURCE_TYPES.STONE]: 200,
      [RESOURCE_TYPES.METAL]: 200
    }
  },
  {
    id: 'factory',
    name: 'Завод',
    type: 'unitFactory',
    color: 0x8d6e63,
    cost: {
      [RESOURCE_TYPES.GOLD]: 80,
      [RESOURCE_TYPES.WOOD]: 30,
      [RESOURCE_TYPES.STONE]: 40
    },
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
    cost: {
      [RESOURCE_TYPES.GOLD]: 50,
      [RESOURCE_TYPES.WOOD]: 20,
      [RESOURCE_TYPES.STONE]: 40,
      [RESOURCE_TYPES.METAL]: 15
    },
    buildTime: 3,
    size: 1,
  },
  {
    id: 'lab',
    name: 'Лаборатория',
    type: 'research',
    color: 0x7b1fa2,
    cost: {
      [RESOURCE_TYPES.GOLD]: 120,
      [RESOURCE_TYPES.WOOD]: 40,
      [RESOURCE_TYPES.STONE]: 60
    },
    buildTime: 8,
    size: 2,
    maxHP: 500,
    maxQueueSize: 3
  }
]; 