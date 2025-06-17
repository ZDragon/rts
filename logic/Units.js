export const UNITS = [
  {
    id: 'worker',
    name: 'Рабочий',
    color: 0xffeb3b,
    cost: { золото: 20, дерево: 10, камень: 0, металл: 0 },
    buildTime: 2,
    building: 'hq', // создаётся в штабе
  },
  {
    id: 'soldier',
    name: 'Солдат',
    color: 0x388e3c,
    cost: { золото: 30, дерево: 0, камень: 0, металл: 5 },
    buildTime: 3,
    building: 'barracks', // создаётся в казармах
  },
  {
    id: 'tank',
    name: 'Танк',
    color: 0x1976d2,
    cost: { золото: 60, дерево: 0, камень: 10, металл: 20 },
    buildTime: 5,
    building: 'factory', // создаётся на заводе
  },
]; 