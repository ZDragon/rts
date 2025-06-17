export const BUILDINGS = [
  {
    id: 'hq',
    name: 'Штаб',
    color: 0x1976d2,
    cost: { золото: 100, дерево: 50, камень: 30, металл: 20 },
    buildTime: 5, // секунд
    size: 2, // 2x2 тайла
  },
  {
    id: 'barracks',
    name: 'Казармы',
    color: 0x388e3c,
    cost: { золото: 60, дерево: 40, камень: 20, металл: 10 },
    buildTime: 4,
    size: 2,
  },
  {
    id: 'warehouse',
    name: 'Склад',
    color: 0xfbc02d,
    cost: { золото: 40, дерево: 80, камень: 20, металл: 5 },
    buildTime: 3,
    size: 2,
  },
  {
    id: 'factory',
    name: 'Завод',
    color: 0x8d6e63,
    cost: { золото: 80, дерево: 30, камень: 40, металл: 30 },
    buildTime: 6,
    size: 3,
  },
  {
    id: 'tower',
    name: 'Башня',
    color: 0x7b1fa2,
    cost: { золото: 50, дерево: 20, камень: 40, металл: 15 },
    buildTime: 3,
    size: 1,
  },
]; 