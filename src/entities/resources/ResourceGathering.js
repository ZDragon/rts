// ResourceGathering.js
// Управляет логикой добычи ресурсов рабочими

import resourceManager from '../../controllers/ResourceManager.js';
import ResourceDeposit from './ResourceDeposit.js';

export default class ResourceGathering {
  constructor(scene) {
    this.scene = scene;
    this.gatherTasks = new Map(); // unitId -> {resourceObj, state, carried, targetBase}
  }

  assignGatherTask(unit, resourceObj) {
    if (!unit || !resourceObj) return;
    // Создаём/обновляем надпись над юнитом
    if (!unit.gatherLabel) {
      unit.gatherLabel = this.scene.add.text(unit.x, unit.y - 28, '', { fontSize: '12px', color: '#ff0', fontFamily: 'sans-serif' }).setOrigin(0.5).setDepth(60);
    }
    this.gatherTasks.set(unit, {
      resourceObj,
      state: 'to_resource',
      carried: 0,
      targetBase: null,
      gatherTimer: 0
    });
    unit.target = { x: resourceObj.circ.x, y: resourceObj.circ.y };
  }

  update(dt) {
    for (const [unit, task] of this.gatherTasks.entries()) {
      if (!this.scene.units.includes(unit) || task.resourceObj.amount <= 0) {
        if (unit.gatherLabel) unit.gatherLabel.setVisible(false);
        this.gatherTasks.delete(unit);
        continue;
      }
      // Обновляем позицию и текст надписи
      if (unit.gatherLabel) {
        unit.gatherLabel.x = unit.x;
        unit.gatherLabel.y = unit.y - 28;
        let stateText = '';
        if (task.state === 'to_resource') stateText = 'Идёт к ресурсу';
        else if (task.state === 'gathering') stateText = `Добыча: ${task.carried}/10`;
        else if (task.state === 'to_base') stateText = `Несёт: ${task.carried}`;
        unit.gatherLabel.setText(stateText);
        unit.gatherLabel.setVisible(true);
      }
      switch (task.state) {
        case 'to_resource': {
          const dist = Phaser.Math.Distance.Between(unit.x, unit.y, task.resourceObj.circ.x, task.resourceObj.circ.y);
          if (dist < 24) {
            task.state = 'gathering';
            task.gatherTimer = 0;
            unit.target = null;
          }
          break;
        }
        case 'gathering': {
          task.gatherTimer += dt;
          if (task.gatherTimer > 1.5) {
            task.gatherTimer = 0;
            task.resourceObj.amount--;
            task.carried++;
            // Визуально уменьшаем ресурс
            task.resourceObj.circ.scale = Math.max(0.3, task.resourceObj.amount / 500);
            if (task.resourceObj.amount < 0) task.resourceObj.amount = 0;
            if (this.scene.updateResourceLabels) this.scene.updateResourceLabels();
            if (task.carried >= 10 || task.resourceObj.amount <= 0) {
              // Ищем ближайшую базу игрока
              let minDist = Infinity, base = null;
              for (const b of this.scene.playerBases) {
                const d = Phaser.Math.Distance.Between(unit.x, unit.y, b.rect.x, b.rect.y);
                if (d < minDist) { minDist = d; base = b; }
              }
              if (base) {
                task.targetBase = base;
                unit.target = { x: base.rect.x, y: base.rect.y };
                task.state = 'to_base';
              }
            }
          }
          break;
        }
        case 'to_base': {
          const dist = Phaser.Math.Distance.Between(unit.x, unit.y, task.targetBase.rect.x, task.targetBase.rect.y);
          if (dist < 32) {
            // Пополняем ресурсы игрока
            resourceManager.add(task.resourceObj.type, task.carried);
            if (this.scene.updateResText) this.scene.updateResText();
            task.carried = 0;
            // Возвращаемся к ресурсу, если он ещё есть
            if (task.resourceObj.amount > 0) {
              unit.target = { x: task.resourceObj.circ.x, y: task.resourceObj.circ.y };
              task.state = 'to_resource';
            } else {
              if (unit.gatherLabel) unit.gatherLabel.setVisible(false);
              this.gatherTasks.delete(unit);
            }
          }
          break;
        }
      }
    }
  }
}