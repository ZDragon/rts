import BotUnit, { BotScout, BotWorker, BotSoldier, BotTank } from '../entities/units/BotUnit.js';

export default class AIUnitsController {
  constructor(scene, strategist) {
    this.scene = scene;
    this.strategist = strategist;
    this.units = [];
  }

  addUnit(unit) {
    this.units.push(unit);
  }

  removeUnit(unit) {
    const idx = this.units.indexOf(unit);
    if (idx !== -1) this.units.splice(idx, 1);
  }

  createUnit(type, x, y, requestType) {
    let unit;
    switch (type.id) {
      case 'archer':
        unit = new BotScout({ x, y, type, scene: this.scene, owner: this.strategist, requestType });
        break;
      case 'worker':
        unit = new BotWorker({ x, y, type, scene: this.scene, owner: this.strategist, requestType });
        break;
      case 'warrior':
        unit = new BotSoldier({ x, y, type, scene: this.scene, owner: this.strategist, requestType });
        break;
      case 'siege':
        unit = new BotTank({ x, y, type, scene: this.scene, owner: this.strategist, requestType });
        break;
      default:
        unit = new BotUnit({ x, y, type, scene: this.scene, owner: this.strategist, requestType });
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

  getAvailableUnits() {
    return this.units.filter(u => u.state !== 'building');
  }
} 