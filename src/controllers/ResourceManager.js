class ResourceManager {
  constructor() {
    this.defaultResources = {
      золото: 10000,
      дерево: 500,
      камень: 300,
      металл: 100,
    };
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

const resourceManager = new ResourceManager();
export default resourceManager; 