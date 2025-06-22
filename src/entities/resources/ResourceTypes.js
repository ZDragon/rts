// Определение типов ресурсов
export const RESOURCE_TYPES = {
  GOLD: 'золото',
  WOOD: 'дерево',
  STONE: 'камень',
  METAL: 'металл'
};

// Характеристики ресурсов
export const RESOURCE_PROPERTIES = {
  [RESOURCE_TYPES.GOLD]: {
    color: 0xffd700,
    displayName: 'Золото',
    baseGatherRate: 2,
    baseCarryCapacity: 10
  },
  [RESOURCE_TYPES.WOOD]: {
    color: 0x388e3c,
    displayName: 'Дерево',
    baseGatherRate: 3,
    baseCarryCapacity: 8
  },
  [RESOURCE_TYPES.STONE]: {
    color: 0x888888,
    displayName: 'Камень',
    baseGatherRate: 1,
    baseCarryCapacity: 5
  },
  [RESOURCE_TYPES.METAL]: {
    color: 0x1976d2,
    displayName: 'Металл',
    baseGatherRate: 1,
    baseCarryCapacity: 4
  }
};

// Стандартные начальные ресурсы
export const DEFAULT_STARTING_RESOURCES = {
  [RESOURCE_TYPES.GOLD]: 2000,
  [RESOURCE_TYPES.WOOD]: 1000,
  [RESOURCE_TYPES.STONE]: 500,
  [RESOURCE_TYPES.METAL]: 300
};

// Стандартные начальные ресурсы для ИИ
export const DEFAULT_AI_STARTING_RESOURCES = {
    [RESOURCE_TYPES.GOLD]: 2000,
    [RESOURCE_TYPES.WOOD]: 1000,
    [RESOURCE_TYPES.STONE]: 500,
    [RESOURCE_TYPES.METAL]: 300
  };

// Стандартные лимиты ресурсов
export const DEFAULT_RESOURCE_LIMITS = {
  [RESOURCE_TYPES.GOLD]: 1000,
  [RESOURCE_TYPES.WOOD]: 500,
  [RESOURCE_TYPES.STONE]: 300,
  [RESOURCE_TYPES.METAL]: 200
}; 