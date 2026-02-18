const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 4000;

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 25000,
  pingTimeout: 20000,
  transports: ['websocket', 'polling'],
});

const GRID_SIZE = 100; // 100x100 blocks, 1 segment per block
const TICK_MS = 180;
const NUM_FOOD = 100;
const INITIAL_LENGTH = 5;
const MAX_BODY_PAYLOAD = 80;

const state = {
  snakes: {},
  food: [],
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

// Seed food at startup so apples exist from first tick
for (let i = 0; i < NUM_FOOD; i++) {
  state.food.push({
    x: randomInt(1, GRID_SIZE - 1) + 0.5,
    y: randomInt(1, GRID_SIZE - 1) + 0.5,
  });
}

function getOccupiedCells(snakes, food) {
  const cells = new Set();
  snakes.forEach((s) => {
    if (!s.body) return;
    s.body.forEach((p) => cells.add(`${Math.floor(p.x)},${Math.floor(p.y)}`));
  });
  (food || state.food).forEach((f) => cells.add(`${Math.floor(f.x)},${Math.floor(f.y)}`));
  return cells;
}

function spawnSnake(socketId) {
  const snakes = Object.values(state.snakes);
  const occupied = getOccupiedCells(snakes, state.food);
  const margin = Math.min(80, Math.floor(GRID_SIZE / 8));
  for (let tries = 0; tries < 120; tries++) {
    const x = randomInt(margin, GRID_SIZE - margin - 1);
    const y = randomInt(margin, GRID_SIZE - margin - 1);
    const key = `${x},${y}`;
    if (!occupied.has(key)) {
      state.snakes[socketId] = {
        id: socketId,
        name: 'Player',
        body: [{ x, y }],
        length: INITIAL_LENGTH,
        dx: 1,
        dy: 0,
        nextDx: 1,
        nextDy: 0,
        alive: true,
      };
      return;
    }
  }
  const fallback = Math.floor(GRID_SIZE / 2) - 5;
  state.snakes[socketId] = {
    id: socketId,
    name: 'Player',
    body: [{ x: fallback, y: fallback }],
    length: INITIAL_LENGTH,
    dx: 1,
    dy: 0,
    nextDx: 1,
    nextDy: 0,
    alive: true,
  };
}

io.on('connection', (socket) => {
  spawnSnake(socket.id);
  const n = Object.keys(state.snakes).length;
  console.log('PvP connect', socket.id.slice(0, 8), '| players:', n);

  socket.on('set_name', (name) => {
    const snake = state.snakes[socket.id];
    if (snake) snake.name = (name && String(name).slice(0, 32)) || 'Player';
  });

  socket.on('input', (dir) => {
    const snake = state.snakes[socket.id];
    if (!snake || !snake.alive) return;
    let dx = Math.floor(Number(dir.dx)) || 0;
    let dy = Math.floor(Number(dir.dy)) || 0;
    if (dx !== 0) dx = dx > 0 ? 1 : -1;
    if (dy !== 0) dy = dy > 0 ? 1 : -1;
    if (dx === 0 && dy === 0) return;
    if (dx === -snake.dx && dy === -snake.dy) return;
    snake.nextDx = dx;
    snake.nextDy = dy;
  });

  socket.on('disconnect', () => {
    delete state.snakes[socket.id];
    console.log('PvP disconnect', socket.id.slice(0, 8), '| players:', Object.keys(state.snakes).length);
  });
});

function maintainFood(snakes, occupied) {
  for (let i = state.food.length; i < NUM_FOOD; i++) {
    let placed = false;
    for (let t = 0; t < 80; t++) {
      const x = randomInt(1, GRID_SIZE - 1) + 0.5;
      const y = randomInt(1, GRID_SIZE - 1) + 0.5;
      const key = `${Math.floor(x)},${Math.floor(y)}`;
      if (!occupied.has(key)) {
        state.food.push({ x, y });
        occupied.add(key);
        placed = true;
        break;
      }
    }
    if (!placed) break;
  }
}

function trimBodyForPayload(body) {
  if (!body || body.length <= MAX_BODY_PAYLOAD) return body;
  return body.slice(0, MAX_BODY_PAYLOAD);
}

setInterval(() => {
  // Guarantee food is never empty so clients always see apples (e.g. after deploy without startup seed)
  if (state.food.length === 0) {
    for (let i = 0; i < NUM_FOOD; i++) {
      state.food.push({
        x: randomInt(1, GRID_SIZE - 1) + 0.5,
        y: randomInt(1, GRID_SIZE - 1) + 0.5,
      });
    }
  }
  const snakes = Object.values(state.snakes);
  if (snakes.length === 0) {
    const occupied = getOccupiedCells([], state.food);
    maintainFood([], occupied);
    io.emit('state', { gridSize: GRID_SIZE, snakes: [], food: state.food });
    return;
  }

  snakes.forEach((s) => {
    if (!s.alive) return;
    const ndx = s.nextDx;
    const ndy = s.nextDy;
    if (typeof ndx === 'number' && typeof ndy === 'number' && !(ndx === 0 && ndy === 0)) {
      s.dx = ndx;
      s.dy = ndy;
    }
  });

  snakes.forEach((s) => {
    if (!s.alive || !s.body || s.body.length === 0) return;
    const head = s.body[0];
    const hx = Math.floor(Number(head.x));
    const hy = Math.floor(Number(head.y));
    const newHead = { x: hx + s.dx, y: hy + s.dy };
    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      s.alive = false;
      return;
    }
    const newBody = [newHead, ...s.body];
    if (newBody.length > s.length) newBody.pop();
    s.body = newBody;
  });

  snakes.forEach((s) => {
    if (!s.alive || !s.body[0]) return;
    const h = s.body[0];
    const hx = Math.floor(h.x);
    const hy = Math.floor(h.y);
    const idx = state.food.findIndex((f) => Math.floor(f.x) === hx && Math.floor(f.y) === hy);
    if (idx >= 0) {
      s.length += 1;
      state.food.splice(idx, 1);
    }
  });

  const occupied = getOccupiedCells(snakes, state.food);
  maintainFood(snakes, occupied);

  snakes.forEach((s) => {
    if (!s.alive) return;
    const head = s.body[0];
    snakes.forEach((other) => {
      if (!other.alive || other.id === s.id) return;
      const oh = other.body[0];
      if (head.x === oh.x && head.y === oh.y) {
        s.alive = false;
        other.alive = false;
      }
    });
  });

  snakes.forEach((s) => {
    if (!s.alive) return;
    const head = s.body[0];
    snakes.forEach((other) => {
      if (!other.alive) return;
      other.body.forEach((seg, idx) => {
        if (other.id === s.id && idx === 0) return;
        if (seg.x === head.x && seg.y === head.y) s.alive = false;
      });
    });
  });

  // Drop food from dead snakes (once per snake)
  snakes.forEach((s) => {
    if (s.alive || s.droppedFood || !s.body || s.body.length === 0) return;
    s.body.forEach((seg) => {
      const x = Math.floor(Number(seg.x)) + 0.5;
      const y = Math.floor(Number(seg.y)) + 0.5;
      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        state.food.push({ x, y });
      }
    });
    s.droppedFood = true;
  });

  io.emit('state', {
    gridSize: GRID_SIZE,
    snakes: snakes.map((s) => ({
      id: s.id,
      name: s.name,
      body: trimBodyForPayload(s.body),
      length: s.length,
      alive: s.alive,
    })),
    food: state.food,
  });
}, TICK_MS);

server.listen(PORT, () => {
  console.log('Snake PvP server on port', PORT);
});
