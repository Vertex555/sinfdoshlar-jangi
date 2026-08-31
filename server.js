const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

const MAP_SIZE = 80;
const MAX_HEALTH = 100;
const RESPAWN_TIME = 3000;
const ROUND_TIME = 180;
const MIN_PLAYERS = 2;

const WEAPONS = [
  { id: 'banan', name: '🍌 Banan Qurol', damage: 15, range: 4, cooldown: 500, type: 'melee' },
  { id: 'bosqich', name: '🪜 Bosqich', damage: 25, range: 5, cooldown: 800, type: 'melee' },
  { id: 'tovuq', name: '🐔 Tovuq Otish', damage: 20, range: 15, cooldown: 600, type: 'ranged' },
  { id: 'pishloq', name: '🧀 Pishloq Granata', damage: 35, range: 8, cooldown: 1200, type: 'thrown' },
  { id: 'pingvin', name: '🐧 Pingvin Raketa', damage: 45, range: 20, cooldown: 2000, type: 'ranged' },
  { id: 'klaviatura', name: '⌨️ Klaviatura Uchquni', damage: 30, range: 12, cooldown: 700, type: 'ranged' },
  { id: 'gumbaz', name: '🪧 Gumbaz Yomi', damage: 50, range: 6, cooldown: 1500, type: 'melee' },
  { id: 'kofe', name: '☕ Issiq Kofe', damage: 10, range: 3, cooldown: 300, type: 'melee' },
];

let gameState = {
  players: {},
  projectiles: [],
  pickups: [],
  roundTimer: ROUND_TIME,
  roundActive: false,
  roundNumber: 0,
  killFeed: [],
  lastUpdate: Date.now(),
};

function spawnPickups() {
  gameState.pickups = [];
  for (let i = 0; i < 15; i++) {
    const weapon = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
    gameState.pickups.push({
      id: 'pickup_' + i,
      weapon: weapon,
      x: (Math.random() - 0.5) * MAP_SIZE * 0.8,
      y: 1,
      z: (Math.random() - 0.5) * MAP_SIZE * 0.8,
      active: true,
    });
  }
}

function startRound() {
  gameState.roundNumber++;
  gameState.roundActive = true;
  gameState.roundTimer = ROUND_TIME;
  gameState.killFeed = [];
  spawnPickups();
  io.emit('round_start', {
    round: gameState.roundNumber,
    timer: ROUND_TIME,
    pickups: gameState.pickups,
  });
  console.log(`Raund #${gameState.roundNumber} boshlandi!`);
}

function endRound() {
  gameState.roundActive = false;
  const sorted = Object.values(gameState.players).sort((a, b) => b.kills - a.kills);
  const winner = sorted[0] || null;

  io.emit('round_end', {
    rankings: sorted.map((p, i) => ({
      rank: i + 1,
      name: p.name,
      kills: p.kills,
      deaths: p.deaths,
    })),
    winner: winner ? winner.name : null,
  });

  Object.values(gameState.players).forEach(p => {
    p.kills = 0;
    p.deaths = 0;
    p.health = MAX_HEALTH;
    p.x = (Math.random() - 0.5) * MAP_SIZE * 0.5;
    p.z = (Math.random() - 0.5) * MAP_SIZE * 0.5;
  });
}

function getSpawnPos() {
  return {
    x: (Math.random() - 0.5) * MAP_SIZE * 0.5,
    y: 0.5,
    z: (Math.random() - 0.5) * MAP_SIZE * 0.5,
  };
}

setInterval(() => {
  const now = Date.now();
  const dt = (now - gameState.lastUpdate) / 1000;
  gameState.lastUpdate = now;

  if (gameState.roundActive) {
    gameState.roundTimer -= dt;
    if (gameState.roundTimer <= 0) {
      endRound();
      setTimeout(() => {
        if (Object.keys(gameState.players).length >= MIN_PLAYERS) {
          startRound();
        }
      }, 10000);
    }
  } else {
    if (Object.keys(gameState.players).length >= MIN_PLAYERS) {
      startRound();
    }
  }

  io.emit('game_state', {
    players: gameState.players,
    timer: Math.max(0, Math.ceil(gameState.roundTimer)),
    roundActive: gameState.roundActive,
    roundNumber: gameState.roundNumber,
    killFeed: gameState.killFeed.slice(-5),
  });
}, 50);

io.on('connection', (socket) => {
  console.log(`Ulandi: ${socket.id}`);

  socket.on('join_game', (userData) => {
    const spawn = getSpawnPos();
    const startWeapon = WEAPONS[0];
    gameState.players[socket.id] = {
      id: socket.id,
      name: userData.name || 'Sinfdosh',
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
      rotY: 0,
      health: MAX_HEALTH,
      maxHealth: MAX_HEALTH,
      kills: 0,
      deaths: 0,
      weapon: startWeapon,
      color: userData.color || '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
      lastAttack: 0,
      alive: true,
      level: 1,
      totalKills: userData.totalKills || 0,
      tgId: userData.tgId || null,
    };
    console.log(`${userData.name} o'yinga qo'shildi!`);
    socket.emit('joined', {
      id: socket.id,
      weapon: startWeapon,
      pickups: gameState.pickups,
    });
  });

  socket.on('player_move', (data) => {
    const p = gameState.players[socket.id];
    if (p && p.alive) {
      p.x = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2, data.x));
      p.y = data.y || 0.5;
      p.z = Math.max(-MAP_SIZE / 2, Math.min(MAP_SIZE / 2, data.z));
      p.rotY = data.rotY || 0;
    }
  });

  socket.on('attack', (data) => {
    const attacker = gameState.players[socket.id];
    if (!attacker || !attacker.alive || !gameState.roundActive) return;

    const now = Date.now();
    if (now - attacker.lastAttack < attacker.weapon.cooldown) return;
    attacker.lastAttack = now;

    const targetId = data.targetId;
    const target = gameState.players[targetId];
    if (!target || !target.alive || targetId === socket.id) return;

    const dx = attacker.x - target.x;
    const dz = attacker.z - target.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= attacker.weapon.range) {
      let dmg = attacker.weapon.damage;
      const levelBonus = Math.floor(attacker.totalKills / 3);
      dmg += levelBonus * 2;

      target.health -= dmg;
      if (target.health <= 0) {
        target.health = 0;
        target.alive = false;
        target.deaths++;
        attacker.kills++;
        attacker.totalKills++;

        const killerLevel = Math.floor(attacker.totalKills / 3) + 1;
        attacker.level = killerLevel;

        gameState.killFeed.push({
          killer: attacker.name,
          victim: target.name,
          weapon: attacker.weapon.name,
          time: Date.now(),
        });

        io.emit('player_killed', {
          killer: attacker.name,
          victim: target.name,
          weapon: attacker.weapon.name,
          killerLevel: killerLevel,
        });

        setTimeout(() => {
          if (gameState.players[targetId]) {
            const spawn = getSpawnPos();
            target.x = spawn.x;
            target.y = spawn.y;
            target.z = spawn.z;
            target.health = MAX_HEALTH;
            target.alive = true;
            target.weapon = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
            io.emit('player_respawned', { id: targetId, weapon: target.weapon });
          }
        }, RESPAWN_TIME);
      }

      io.emit('damage', {
        targetId: targetId,
        health: target.health,
        damage: dmg,
        attackerId: socket.id,
      });
    }
  });

  socket.on('pickup_weapon', (data) => {
    const p = gameState.players[socket.id];
    if (!p || !p.alive) return;

    const pickup = gameState.pickups.find(pk => pk.id === data.pickupId && pk.active);
    if (!pickup) return;

    const dx = p.x - pickup.x;
    const dz = p.z - pickup.z;
    if (Math.sqrt(dx * dx + dz * dz) < 3) {
      pickup.active = false;
      p.weapon = pickup.weapon;
      socket.emit('weapon_pickup', { weapon: pickup.weapon });
    }
  });

  socket.on('special_attack', (data) => {
    const attacker = gameState.players[socket.id];
    if (!attacker || !attacker.alive || !gameState.roundActive) return;
    if (attacker.level < 3) return;

    const now = Date.now();
    if (now - attacker.lastAttack < 3000) return;
    attacker.lastAttack = now;

    Object.values(gameState.players).forEach(target => {
      if (target.id === socket.id || !target.alive) return;
      const dx = attacker.x - target.x;
      const dz = attacker.z - target.z;
      if (Math.sqrt(dx * dx + dz * dz) < 10) {
        target.health -= 20;
        if (target.health <= 0) {
          target.health = 0;
          target.alive = false;
          target.deaths++;
          attacker.kills++;
          attacker.totalKills++;

          io.emit('player_killed', {
            killer: attacker.name,
            victim: target.name,
            weapon: '🌪️ Maxsus Hujum',
            killerLevel: attacker.level,
          });

          setTimeout(() => {
            if (gameState.players[target.id]) {
              const spawn = getSpawnPos();
              target.x = spawn.x;
              target.y = spawn.y;
              target.z = spawn.z;
              target.health = MAX_HEALTH;
              target.alive = true;
            }
          }, RESPAWN_TIME);
        }
        io.emit('damage', {
          targetId: target.id,
          health: target.health,
          damage: 20,
          attackerId: socket.id,
        });
      }
    });
  });

  socket.on('respawn', () => {
    const p = gameState.players[socket.id];
    if (p) {
      const spawn = getSpawnPos();
      p.x = spawn.x;
      p.y = spawn.y;
      p.z = spawn.z;
      p.health = MAX_HEALTH;
      p.alive = true;
      p.weapon = WEAPONS[Math.floor(Math.random() * WEAPONS.length)];
      socket.emit('weapon_pickup', { weapon: p.weapon });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Uzildi: ${socket.id}`);
    const p = gameState.players[socket.id];
    if (p) {
      io.emit('player_left', { name: p.name, id: socket.id });
    }
    delete gameState.players[socket.id];

    if (gameState.roundActive && Object.keys(gameState.players).length < MIN_PLAYERS) {
      gameState.roundActive = false;
      io.emit('round_cancelled', { reason: 'Yetarli o\'yinchi yo\'q' });
    }
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    players: Object.values(gameState.players).map(p => ({
      name: p.name,
      kills: p.kills,
      deaths: p.deaths,
      health: p.health,
      level: p.level,
    })),
    round: gameState.roundNumber,
    timer: Math.ceil(gameState.roundTimer),
    active: gameState.roundActive,
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server ishga tushdi: http://localhost:${PORT}`);
});
