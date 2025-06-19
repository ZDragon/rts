// logic/PathfindingController.js
// Контроллер поиска пути (A*) для тайловой карты

export default class PathfindingController {
  constructor() {}

  // from, to: {x, y} в тайлах
  // map: tileData (2D массив)
  // obstacles: Set строк "x,y" занятых тайлов
  // allowedTiles: Set индексов тайлов, по которым может ходить юнит
  findPath(unit, from, to, map, obstacles, allowedTiles) {
    const W = map[0].length;
    const H = map.length;
    const start = { x: from.x, y: from.y };
    const goal = { x: to.x, y: to.y };
    if (!this.isWalkable(goal.x, goal.y, map, obstacles, allowedTiles)) return null;
    const key = (x, y) => `${x},${y}`;
    const open = new Set([key(start.x, start.y)]);
    const cameFrom = {};
    const gScore = {};
    const fScore = {};
    gScore[key(start.x, start.y)] = 0;
    fScore[key(start.x, start.y)] = this.heuristic(start, goal);
    while (open.size > 0) {
      // Найти узел с минимальным fScore
      let current = null, minF = Infinity;
      for (const k of open) {
        if (fScore[k] !== undefined && fScore[k] < minF) {
          minF = fScore[k];
          current = k;
        }
      }
      const [cx, cy] = current.split(',').map(Number);
      if (cx === goal.x && cy === goal.y) {
        // Восстановить путь
        const path = [];
        let cur = current;
        while (cur !== key(start.x, start.y)) {
          const [px, py] = cur.split(',').map(Number);
          path.push({ x: px, y: py });
          cur = cameFrom[cur];
        }
        path.reverse();
        return path;
      }
      open.delete(current);
      for (const [dx, dy] of [[0,1],[1,0],[0,-1],[-1,0]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (!this.isWalkable(nx, ny, map, obstacles, allowedTiles)) continue;
        const nkey = key(nx, ny);
        const tentative_g = (gScore[current] ?? Infinity) + 1;
        if (tentative_g < (gScore[nkey] ?? Infinity)) {
          cameFrom[nkey] = current;
          gScore[nkey] = tentative_g;
          fScore[nkey] = tentative_g + this.heuristic({ x: nx, y: ny }, goal);
          open.add(nkey);
        }
      }
    }
    return null; // путь не найден
  }

  heuristic(a, b) {
    // Манхэттенское расстояние
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  isWalkable(x, y, map, obstacles, allowedTiles) {
    if (x < 0 || y < 0 || y >= map.length || x >= map[0].length) return false;
    if (!allowedTiles.has(map[y][x])) return false;
    if (obstacles.has(`${x},${y}`)) return false;
    return true;
  }
} 