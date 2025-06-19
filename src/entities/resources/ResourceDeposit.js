import { RESOURCE_TYPES, RESOURCE_PROPERTIES } from './ResourceTypes.js';

export default class ResourceDeposit {
  constructor({ scene, x, y, type, amount }) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.type = type;
    this.amount = amount;
    this.maxAmount = amount;
    this.visuals = {};
    this.createVisuals();
  }

  createVisuals() {
    const resourceProps = RESOURCE_PROPERTIES[this.type];
    const px = this.x * 32 + 16;
    const py = this.y * 32 + 16;
    this.visuals.circ = this.scene.add.circle(px, py, 22, resourceProps.color).setDepth(40);
    this.visuals.label = this.scene.add.text(px, py, resourceProps.displayName, { 
      fontSize: '12px', 
      color: '#222', 
      fontFamily: 'sans-serif' 
    }).setOrigin(0.5).setDepth(41);
    this.visuals.amountLabel = this.scene.add.text(px, py - 18, this.amount.toString(), { 
      fontSize: '12px', 
      color: '#fff', 
      fontFamily: 'sans-serif' 
    }).setOrigin(0.5).setDepth(42);
  }

  updateVisuals() {
    if (this.visuals.amountLabel) {
      this.visuals.amountLabel.setText(this.amount.toString());
    }
    if (this.visuals.circ) {
      const scale = Math.max(0.4, this.amount / this.maxAmount);
      this.visuals.circ.setScale(scale, scale);
    }
  }

  gather(amount = 1) {
    if (this.amount <= 0) return 0;
    const taken = Math.min(this.amount, amount);
    this.amount -= taken;
    this.updateVisuals();
    return taken;
  }
} 