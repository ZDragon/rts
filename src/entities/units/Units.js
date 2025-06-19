import { RESOURCE_TYPES } from '../resources/ResourceTypes.js';

export const UNITS = [
  {
    id: 'worker',
    name: 'Рабочий',
    class: 'worker',
    color: 0xcccccc,
    cost: {
      [RESOURCE_TYPES.GOLD]: 30,
      [RESOURCE_TYPES.WOOD]: 10
    },
    buildTime: 5,
    vision: 80,
    speed: 80,
    maxHP: 40,
    canAttack: false
  },
  {
    id: 'warrior',
    name: 'Воин',
    class: 'combat',
    color: 0xff4444,
    cost: {
      [RESOURCE_TYPES.GOLD]: 60,
      [RESOURCE_TYPES.METAL]: 20
    },
    buildTime: 6,
    vision: 120,
    speed: 80,
    maxHP: 80,
    canAttack: true
  },
  {
    id: 'archer',
    name: 'Лучник',
    class: 'combat',
    color: 0x8888ff,
    cost: {
      [RESOURCE_TYPES.GOLD]: 50,
      [RESOURCE_TYPES.WOOD]: 30
    },
    buildTime: 7,
    vision: 140,
    speed: 70,
    maxHP: 60,
    canAttack: true
  },
  {
    id: 'siege',
    name: 'Осадная машина',
    class: 'combat',
    color: 0x8d6e63,
    cost: {
      [RESOURCE_TYPES.GOLD]: 120,
      [RESOURCE_TYPES.METAL]: 60,
      [RESOURCE_TYPES.WOOD]: 40
    },
    buildTime: 10,
    vision: 100,
    speed: 50,
    maxHP: 160,
    canAttack: true
  }
]; 