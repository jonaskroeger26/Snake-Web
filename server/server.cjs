const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 4000;

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const GRID_SIZE = 80;
const TICK_MS = 200; // slower: was 120
const NUM_FOOD = 45;
const INITIAL_LENGTH = 5;

// Single global game: everyone in the same world
const state = {
  snakes: {}, // socketId -> snake
  food: [],   // [ { x, y }, ... ]
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function getOccupiedCells() {
  const cells = new Set();
  Object.values(state.snakes).forEach((s) => {
    if (!s.body) return;
    s.body.forEach((p) => cells.add(`${Math.floor(p.x)},${Math.floor(p.y)}`));
  });
  state.food.forEach((f) => cells.add(`${Math.floor(f.x)},${Math.floor(f.y)}`));
  return cells;
}

function spawnFood() {
  const occupied = getOccupiedCells();
  for (let tries = 0; tries < 100; tries++) {
    const x = randomInt(1, GRID_SIZE - 1);
    const y = randomInt(1, GRID_SIZE - 1);
    const key = `${x},${y}`;
    if (!occupied.has(key)) {
      state.food.push({ x: x + 0.5, y: y + 0.5 });
      return;
    }
  }
}

function spawnSnake(socketId) {
  const occupied = getOccupiedCells();
  for (let tries = 0; tries < 80; tries++) {
    const x = randomInt(8, GRID_SIZE - 9);
    const y = randomInt(8, GRID_SIZE - 9);
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
  // fallback
  state.snakes[socketId] = {
    id: socketId,
    name: 'Player',
    body: [{ x: 10, y: 10 }],
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

  socket.on('set_name', (name) => {
    const snake = state.snakes[socket.id];
    if (snake) snake.name = name || 'Player';
  });

  socket.on('input', (dir) => {
    const snake = state.snakes[socket.id];
    if (!snake || !snake.alive) return;
    const dx = Number(dir.dx) || 0;
    const dy = Number(dir.dy) || 0;
    if ((dx === 0 && dy === 0) || (dx === -snake.dx && dy === -snake.dy)) return;
    snake.nextDx = dx;
    snake.nextDy = dy;
  });

  socket.on('disconnect', () => {
    delete state.snakes[socket.id];
  });
});

// Keep food count at NUM_FOOD
function maintainFood() {
  const occupied = getOccupiedCells();
  while (state.food.length < NUM_FOOD) {
    for (let t = 0; t < 50; t++) {
      const x = randomInt(1, GRID_SIZE - 1) + 0.5;
      const y = randomInt(1, GRID_SIZE - 1) + 0.5;
      const key = `${Math.floor(x)},${Math.floor(y)}`;
      if (!occupied.has(key)) {
        state.food.push({ x, y });
        occupied.add(key);
        break;
      }
    }
  }
}

// Game loop
setInterval(() => {
  const snakes = Object.values(state.snakes);
  if (snakes.length === 0) {
    maintainFood();
    io.emit('state', { gridSize: GRID_SIZE, snakes: [], food: state.food });
    return;
  }

  snakes.forEach((s) => {
    if (!s.alive) return;
    if (typeof s.nextDx === 'number' && typeof s.nextDy === 'number') {
      s.dx = s.nextDx;
      s.dy = s.nextDy;
    }
  });

  snakes.forEach((s) => {
    if (!s.alive) return;
    const head = s.body[0];
    const newHead = {
      x: head.x + s.dx,
      y: head.y + s.dy,
    };
    if (
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE
    ) {
      s.alive = false;
      return;
    }
    const newBody = [newHead, ...s.body];
    if (newBody.length > s.length) newBody.pop();
    s.body = newBody;
  });

  // Eat food: head on same cell as food
  snakes.forEach((s) => {
    if (!s.alive || !s.body[0]) return;
    const h = s.body[0];
    const hx = Math.floor(h.x);
    const hy = Math.floor(h.y);
    const idx = state.food.findIndex(
      (f) => Math.floor(f.x) === hx && Math.floor(f.y) === hy
    );
    if (idx >= 0) {
      s.length += 1;
      state.food.splice(idx, 1);
    }
  });

  maintainFood();

  // Head-to-head
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

  io.emit('state', {
    gridSize: GRID_SIZE,
    snakes: snakes.map((s) => ({
      id: s.id,
      name: s.name,
      body: s.body,
      length: s.length,
      alive: s.alive,
    })),
    food: state.food,
  });
}, TICK_MS);

server.listen(PORT, () => {
  console.log('Snake PvP server listening on port', PORT);
});
