const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 4000;

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

// Simple io-style grid
const GRID_SIZE = 80;
const TICK_MS = 120;

function createEmptyState() {
  return {
    started: false,
    snakes: {}, // socketId -> snake
  };
}

// In-memory rooms: roomCode -> state
const rooms = new Map();

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('create_room', (cb) => {
    const roomCode = makeRoomCode();
    rooms.set(roomCode, createEmptyState());
    currentRoom = roomCode;
    socket.join(roomCode);
    if (typeof cb === 'function') cb({ ok: true, roomCode });
  });

  socket.on('join_room', ({ roomCode }, cb) => {
    const state = rooms.get(roomCode);
    if (!state) {
      if (typeof cb === 'function') cb({ ok: false, error: 'ROOM_NOT_FOUND' });
      return;
    }
    currentRoom = roomCode;
    socket.join(roomCode);
    if (typeof cb === 'function') cb({ ok: true });
  });

  socket.on('set_name', (name) => {
    if (!currentRoom) return;
    const state = rooms.get(currentRoom);
    if (!state) return;
    const snake = state.snakes[socket.id];
    if (snake) {
      snake.name = name || 'Player';
    }
  });

  socket.on('input', (dir) => {
    if (!currentRoom) return;
    const state = rooms.get(currentRoom);
    if (!state) return;
    const snake = state.snakes[socket.id];
    if (!snake || !snake.alive) return;
    const dx = Number(dir.dx) || 0;
    const dy = Number(dir.dy) || 0;
    // Prevent 0,0 and direct reversal
    if ((dx === 0 && dy === 0) || (dx === -snake.dx && dy === -snake.dy)) return;
    snake.nextDx = dx;
    snake.nextDy = dy;
  });

  socket.on('start_game', () => {
    if (!currentRoom) return;
    const state = rooms.get(currentRoom);
    if (!state || state.started) return;
    state.started = true;

    const room = io.sockets.adapter.rooms.get(currentRoom);
    const sockets = room ? Array.from(room) : [];

    // Spawn snakes roughly in the four quadrants
    const centers = [
      { x: 10, y: 10 },
      { x: GRID_SIZE - 11, y: GRID_SIZE - 11 },
      { x: 10, y: GRID_SIZE - 11 },
      { x: GRID_SIZE - 11, y: 10 },
    ];

    sockets.forEach((sid, i) => {
      const c = centers[i % centers.length];
      state.snakes[sid] = {
        id: sid,
        name: 'Player',
        body: [{ x: c.x, y: c.y }],
        length: 5,
        dx: 1,
        dy: 0,
        nextDx: 1,
        nextDy: 0,
        alive: true,
      };
    });
  });

  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const state = rooms.get(currentRoom);
    if (!state) return;
    delete state.snakes[socket.id];
  });
});

// Server-authoritative game loop: simple movement + collisions
setInterval(() => {
  for (const [roomCode, state] of rooms.entries()) {
    if (!state.started) continue;
    const snakes = Object.values(state.snakes);
    if (snakes.length === 0) continue;

    // Apply latest desired directions
    snakes.forEach((s) => {
      if (!s.alive) return;
      if (typeof s.nextDx === 'number' && typeof s.nextDy === 'number') {
        s.dx = s.nextDx;
        s.dy = s.nextDy;
      }
    });

    // Move snakes
    snakes.forEach((s) => {
      if (!s.alive) return;
      const head = s.body[0];
      const newHead = {
        x: head.x + s.dx,
        y: head.y + s.dy,
      };
      // Wall collision = death
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

    // Head-to-head collisions
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

    // Head into any body segment
    snakes.forEach((s) => {
      if (!s.alive) return;
      const head = s.body[0];
      snakes.forEach((other) => {
        if (!other.alive) return;
        other.body.forEach((seg, idx) => {
          if (other.id === s.id && idx === 0) return;
          if (seg.x === head.x && seg.y === head.y) {
            s.alive = false;
          }
        });
      });
    });

    io.to(roomCode).emit('state', {
      gridSize: GRID_SIZE,
      snakes: snakes.map((s) => ({
        id: s.id,
        name: s.name,
        body: s.body,
        length: s.length,
        alive: s.alive,
      })),
    });
  }
}, TICK_MS);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log('Snake PvP server listening on port', PORT);
});

