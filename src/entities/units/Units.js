export const UNITS = [
  {
    id: 'worker',
    name: 'Рабочий',
    color: 0xcccccc,
    cost: { золото: 30, дерево: 10 },
    building: 'hq',
    vision: 80,
    speed: 80,
    maxHP: 40,
    canAttack: false
  },
  {
    id: 'soldier',
    name: 'Солдат',
    color: 0xff4444,
    cost: { золото: 60, металл: 20 },
    building: 'barracks',
    vision: 120,
    speed: 80,
    maxHP: 80,
    canAttack: true
  },
  {
    id: 'tank',
    name: 'Танк',
    color: 0x8888ff,
    cost: { золото: 120, металл: 60 },
    building: 'factory',
    vision: 140,
    speed: 60,
    maxHP: 120,
    canAttack: true
  },
  {
    id: 'scout',
    name: 'Разведчик',
    color: 0x00e6e6,
    cost: { золото: 40, металл: 10 },
    building: 'barracks',
    vision: 220,
    speed: 140,
    maxHP: 30,
    canAttack: false
  }
]; 