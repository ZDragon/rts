export default class ResourceDeposit {
  constructor({ scene, x, y, type, amount }) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.type = type; // 'золото', 'дерево', 'камень', 'металл'
    this.amount = amount;
    this.maxAmount = amount;
    this.visuals = {};
    this.createVisuals();
  }

  createVisuals() {
    // Цвет по типу ресурса
    let color = 0xffd700;
    if (this.type === 'дерево') color = 0x388e3c;
    if (this.type === 'камень') color = 0x888888;
    if (this.type === 'металл') color = 0x1976d2;
    const px = this.x * 32 + 16;
    const py = this.y * 32 + 16;
    this.visuals.circ = this.scene.add.circle(px, py, 22, color).setDepth(40);
    this.visuals.label = this.scene.add.text(px, py, this.type, { fontSize: '12px', color: '#222', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(41);
    this.visuals.amountLabel = this.scene.add.text(px, py - 18, this.amount.toString(), { fontSize: '12px', color: '#fff', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(42);
  }

  updateVisuals() {
    if (this.visuals.amountLabel) {
      this.visuals.amountLabel.setText(this.amount.toString());
    }
    // Можно добавить визуальное уменьшение размера/цвета при истощении
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