// Asteroids Arcade - Vanilla Canvas Version für Anfänger
// Läuft direkt in CodePen (HTML/CSS/JS Panels) ohne externe Libraries.

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Eingabe-Status für kontinuierliche Steuerung
const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  Space: false,
};

// Konfigurationswerte zentral an einer Stelle
const CONFIG = {
  ship: {
    radius: 14,
    turnSpeed: 3.8, // rad/s
    thrust: 230,
    friction: 0.992,
    fireCooldown: 0.18,
    invulnerableTime: 2,
  },
  laser: {
    speed: 500,
    radius: 2,
    life: 0.8,
  },
  asteroid: {
    baseSpeed: 40,
    speedVariance: 60,
    verticesMin: 8,
    verticesMax: 14,
    jaggedness: 0.42,
  },
  game: {
    initialLives: 3,
    initialAsteroids: 4,
    starCount: 180,
  },
};

let width = 800;
let height = 600;
let stars = [];

// Game-State
let ship;
let lasers = [];
let asteroids = [];
let score = 0;
let lives = CONFIG.game.initialLives;
let gameOver = false;
let fireTimer = 0;
let lastTime = 0;

function resizeCanvas() {
  // Fullscreen mit sicherem Fallback (mind. 800x600)
  width = Math.max(window.innerWidth, 800);
  height = Math.max(window.innerHeight, 600);
  canvas.width = width;
  canvas.height = height;

  createStars();
}

function createStars() {
  stars = [];
  for (let i = 0; i < CONFIG.game.starCount; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.3,
      a: Math.random() * 0.8 + 0.2,
    });
  }
}

function createShip() {
  return {
    x: width / 2,
    y: height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2, // zeigt nach oben
    radius: CONFIG.ship.radius,
    invulnerable: CONFIG.ship.invulnerableTime,
  };
}

function randomEdgeSpawn(radius) {
  const side = Math.floor(Math.random() * 4);
  switch (side) {
    case 0:
      return { x: Math.random() * width, y: -radius };
    case 1:
      return { x: width + radius, y: Math.random() * height };
    case 2:
      return { x: Math.random() * width, y: height + radius };
    default:
      return { x: -radius, y: Math.random() * height };
  }
}

function createAsteroid(size, x = null, y = null) {
  // Größenstufen: 3=groß, 2=mittel, 1=klein
  const radius = size === 3 ? 48 : size === 2 ? 28 : 16;
  const spawn = x === null || y === null ? randomEdgeSpawn(radius) : { x, y };
  const angle = Math.random() * Math.PI * 2;
  const speed = CONFIG.asteroid.baseSpeed + Math.random() * CONFIG.asteroid.speedVariance;
  const vertices =
    CONFIG.asteroid.verticesMin +
    Math.floor(Math.random() * (CONFIG.asteroid.verticesMax - CONFIG.asteroid.verticesMin + 1));

  const offsets = [];
  for (let i = 0; i < vertices; i++) {
    offsets.push(1 - Math.random() * CONFIG.asteroid.jaggedness);
  }

  return {
    x: spawn.x,
    y: spawn.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size,
    radius,
    vertices,
    offsets,
  };
}

function spawnWave(count) {
  for (let i = 0; i < count; i++) {
    asteroids.push(createAsteroid(3));
  }
}

function wrap(obj, radius = 0) {
  if (obj.x < -radius) obj.x = width + radius;
  if (obj.x > width + radius) obj.x = -radius;
  if (obj.y < -radius) obj.y = height + radius;
  if (obj.y > height + radius) obj.y = -radius;
}

function shootLaser() {
  const nx = Math.cos(ship.angle);
  const ny = Math.sin(ship.angle);

  lasers.push({
    x: ship.x + nx * (ship.radius + 4),
    y: ship.y + ny * (ship.radius + 4),
    vx: nx * CONFIG.laser.speed + ship.vx,
    vy: ny * CONFIG.laser.speed + ship.vy,
    life: CONFIG.laser.life,
  });
}

function distanceSq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function handleAsteroidHit(index) {
  const asteroid = asteroids[index];
  score += asteroid.size === 3 ? 20 : asteroid.size === 2 ? 50 : 100;

  if (asteroid.size > 1) {
    // Split in zwei kleinere Asteroiden
    asteroids.push(createAsteroid(asteroid.size - 1, asteroid.x, asteroid.y));
    asteroids.push(createAsteroid(asteroid.size - 1, asteroid.x, asteroid.y));
  }

  asteroids.splice(index, 1);
}

function loseLife() {
  lives -= 1;
  if (lives <= 0) {
    gameOver = true;
    return;
  }

  // Schiff in die Mitte zurücksetzen mit kurzer Unverwundbarkeit
  ship = createShip();
}

function resetGame() {
  ship = createShip();
  lasers = [];
  asteroids = [];
  score = 0;
  lives = CONFIG.game.initialLives;
  gameOver = false;
  fireTimer = 0;
  spawnWave(CONFIG.game.initialAsteroids);
}

function update(dt) {
  if (gameOver) return;

  // Rotation
  if (keys.ArrowLeft) ship.angle -= CONFIG.ship.turnSpeed * dt;
  if (keys.ArrowRight) ship.angle += CONFIG.ship.turnSpeed * dt;

  // Schub
  if (keys.ArrowUp) {
    ship.vx += Math.cos(ship.angle) * CONFIG.ship.thrust * dt;
    ship.vy += Math.sin(ship.angle) * CONFIG.ship.thrust * dt;
  }

  // Trägheit/Reibung
  ship.vx *= CONFIG.ship.friction;
  ship.vy *= CONFIG.ship.friction;

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  wrap(ship, ship.radius);

  // Unverwundbarkeit runterzählen
  if (ship.invulnerable > 0) ship.invulnerable -= dt;

  // Schuss-Logik
  fireTimer -= dt;
  if (keys.Space && fireTimer <= 0) {
    shootLaser();
    fireTimer = CONFIG.ship.fireCooldown;
  }

  // Laser aktualisieren
  for (let i = lasers.length - 1; i >= 0; i--) {
    const l = lasers[i];
    l.x += l.vx * dt;
    l.y += l.vy * dt;
    l.life -= dt;

    wrap(l, CONFIG.laser.radius);

    if (l.life <= 0) {
      lasers.splice(i, 1);
      continue;
    }

    // Laser-Asteroid-Kollision
    let hit = false;
    for (let j = asteroids.length - 1; j >= 0; j--) {
      const a = asteroids[j];
      const hitRadius = a.radius + CONFIG.laser.radius;
      if (distanceSq(l, a) <= hitRadius * hitRadius) {
        handleAsteroidHit(j);
        lasers.splice(i, 1);
        hit = true;
        break;
      }
    }
    if (hit) continue;
  }

  // Asteroiden bewegen
  for (const a of asteroids) {
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    wrap(a, a.radius);
  }

  // Schiff-Asteroid-Kollision
  if (ship.invulnerable <= 0) {
    for (const a of asteroids) {
      const hitRadius = a.radius + ship.radius * 0.8;
      if (distanceSq(ship, a) <= hitRadius * hitRadius) {
        loseLife();
        break;
      }
    }
  }

  // Neue Welle, wenn alle weg sind
  if (asteroids.length === 0) {
    spawnWave(CONFIG.game.initialAsteroids + Math.floor(score / 600));
  }
}

function drawStars() {
  ctx.fillStyle = "#02040a";
  ctx.fillRect(0, 0, width, height);

  for (const s of stars) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = "#d6e8ff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawShip() {
  // Während Unverwundbarkeit blinkt das Schiff leicht
  if (ship.invulnerable > 0) {
    const blink = Math.floor(ship.invulnerable * 10) % 2 === 0;
    if (!blink) return;
  }

  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle + Math.PI / 2);

  // Schiffsdreieck
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -ship.radius);
  ctx.lineTo(ship.radius * 0.75, ship.radius);
  ctx.lineTo(0, ship.radius * 0.4);
  ctx.lineTo(-ship.radius * 0.75, ship.radius);
  ctx.closePath();
  ctx.stroke();

  // Flamme bei Schub
  if (keys.ArrowUp && !gameOver) {
    ctx.strokeStyle = "#ff9d2e";
    ctx.beginPath();
    ctx.moveTo(-ship.radius * 0.4, ship.radius * 0.95);
    ctx.lineTo(0, ship.radius * 1.7 + Math.random() * 5);
    ctx.lineTo(ship.radius * 0.4, ship.radius * 0.95);
    ctx.stroke();
  }

  ctx.restore();
}

function drawAsteroid(a) {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.strokeStyle = "#adb5bd";
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < a.vertices; i++) {
    const angle = (i / a.vertices) * Math.PI * 2;
    const r = a.radius * a.offsets[i];
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }

  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawLasers() {
  ctx.fillStyle = "#ff4d4d";
  for (const l of lasers) {
    ctx.beginPath();
    ctx.arc(l.x, l.y, CONFIG.laser.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud() {
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 16, 34);

  ctx.textAlign = "right";
  ctx.fillText(`Lives: ${lives}`, width - 16, 34);

  if (gameOver) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff6666";
    ctx.font = "bold 52px Arial";
    ctx.fillText("GAME OVER", width / 2, height / 2 - 10);

    ctx.fillStyle = "#ffffff";
    ctx.font = "22px Arial";
    ctx.fillText("Drücke R für Neustart", width / 2, height / 2 + 34);
  }
}

function render() {
  drawStars();
  for (const a of asteroids) drawAsteroid(a);
  drawLasers();
  drawShip();
  drawHud();
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "ArrowLeft") keys.ArrowLeft = true;
  if (event.code === "ArrowRight") keys.ArrowRight = true;
  if (event.code === "ArrowUp") keys.ArrowUp = true;
  if (event.code === "Space") keys.Space = true;

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "KeyR") {
    resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft") keys.ArrowLeft = false;
  if (event.code === "ArrowRight") keys.ArrowRight = false;
  if (event.code === "ArrowUp") keys.ArrowUp = false;
  if (event.code === "Space") keys.Space = false;
});

window.addEventListener("resize", () => {
  resizeCanvas();
});

// Initialisierung
resizeCanvas();
resetGame();
requestAnimationFrame((ts) => {
  lastTime = ts;
  gameLoop(ts);
});
