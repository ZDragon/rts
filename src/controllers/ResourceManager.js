import { DEFAULT_STARTING_RESOURCES } from '../entities/resources/ResourceTypes.js';

class ResourceManager {
  constructor() {
    this.defaultResources = DEFAULT_STARTING_RESOURCES;
    this.reset();
  }

  getAll() {
    return { ...this.resources };
  }

  get(name) {
    return this.resources[name] || 0;
  }

  set(name, value) {
    if (this.resources.hasOwnProperty(name)) {
      this.resources[name] = value;
    }
  }

  add(name, value) {
    if (this.resources.hasOwnProperty(name)) {
      this.resources[name] += value;
    }
  }

  spend(name, value) {
    if (this.resources.hasOwnProperty(name) && this.resources[name] >= value) {
      this.resources[name] -= value;
      return true;
    }
    return false;
  }

  reset() {
    this.resources = { ...this.defaultResources };
  }
}

export default new ResourceManager(); 