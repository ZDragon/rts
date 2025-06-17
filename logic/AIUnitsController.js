import BotUnit, { BotScout, BotWorker, BotSoldier, BotTank } from './BotUnit.js';

export default class AIUnitsController {
  constructor(scene) {
    this.scene = scene;
    this.units = [];
  }

  addUnit(unit) {
    this.units.push(unit);
  }

  removeUnit(unit) {
    const idx = this.units.indexOf(unit);
    if (idx !== -1) this.units.splice(idx, 1);
  }

  createUnit(type, x, y) {
    let unit;
    switch (type.id) {
      case 'scout':
        unit = new BotScout({ x, y, type, scene: this.scene });
        break;
      case 'worker':
        unit = new BotWorker({ x, y, type, scene: this.scene });
        break;
      case 'soldier':
        unit = new BotSoldier({ x, y, type, scene: this.scene });
        break;
      case 'tank':
        unit = new BotTank({ x, y, type, scene: this.scene });
        break;
      default:
        unit = new BotUnit({ x, y, type, scene: this.scene });
    }
    this.addUnit(unit);
    return unit;
  }

  update(dt) {
    for (const unit of this.units) {
      unit.update(dt);
    }
  }

  getAllUnits() {
    return this.units;
  }
} 