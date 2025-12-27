// Game configuration
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const MIN_PLAYER_Y = CANVAS_HEIGHT / 2;

// Game state
let ws;
let clientId;
let playerX = CANVAS_WIDTH / 2;
let playerY = CANVAS_HEIGHT - 80;
let aimX = CANVAS_WIDTH / 2;
let aimY = CANVAS_HEIGHT / 2;
let enemies = [];
let bullets = [];
let score = 0;
let lives = 3;
let gameOver = false;
let keys = {};
let particles = [];

// Parallax layers
let parallaxOffset1 = 0;
let parallaxOffset2 = 0;
let parallaxOffset3 = 0;

// Connect to WebSocket server
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;
  
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('Connected to server');
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'init':
        clientId = data.clientId;
        score = data.score;
        lives = data.lives;
        updateUI();
        break;
        
      case 'update':
        enemies = data.enemies;
        score = data.score;
        lives = data.lives;
        updateUI();
        
        // Check for enemies that reached bottom
        enemies.forEach(enemy => {
          if (enemy.y > CANVAS_HEIGHT - 20) {
            ws.send(JSON.stringify({
              type: 'enemyReached',
              enemyId: enemy.id,
            }));
          }
        });
        break;
        
      case 'shootResult':
        if (data.hit) {
          score = data.score;
          updateUI();
        }
        break;
        
      case 'gameOver':
        gameOver = true;
        score = data.score;
        showGameOver();
        break;
    }
  };

  ws.onclose = () => {
    console.log('Disconnected from server');
    setTimeout(connectWebSocket, 2000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

// Update UI elements
function updateUI() {
  document.getElementById('scoreValue').textContent = score;
  document.getElementById('livesValue').textContent = lives;
}

// Show game over screen
function showGameOver() {
  document.getElementById('finalScore').textContent = score;
  document.getElementById('gameOver').classList.remove('hidden');
}

// Hide game over screen
function hideGameOver() {
  document.getElementById('gameOver').classList.add('hidden');
}

// Input handling
document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  
  if (e.key === ' ') {
    e.preventDefault();
    if (gameOver) {
      restartGame();
    } else {
      shoot();
    }
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// Restart button
document.getElementById('restartBtn').addEventListener('click', restartGame);

function restartGame() {
  gameOver = false;
  hideGameOver();
  bullets = [];
  particles = [];
  ws.send(JSON.stringify({ type: 'restart' }));
}

// Player movement
function updatePlayer() {
  const speed = 5;
  
  if (keys['ArrowLeft']) {
    playerX = Math.max(20, playerX - speed);
  }
  if (keys['ArrowRight']) {
    playerX = Math.min(CANVAS_WIDTH - 20, playerX + speed);
  }
  if (keys['ArrowUp']) {
    playerY = Math.max(MIN_PLAYER_Y, playerY - speed);
  }
  if (keys['ArrowDown']) {
    playerY = Math.min(CANVAS_HEIGHT - 60, playerY + speed);
  }
}

// Shooting
function shoot() {
  if (gameOver) return;
  
  const bullet = {
    x: playerX,
    y: playerY - 20,
    speed: 10,
    active: true,
  };
  bullets.push(bullet);
  
  // Send to server immediately to check for hits
  ws.send(JSON.stringify({
    type: 'shoot',
    x: bullet.x,
    y: bullet.y,
  }));
}

// Update bullets
function updateBullets() {
  bullets.forEach(bullet => {
    bullet.y -= bullet.speed;
    
    if (bullet.y < 0) {
      bullet.active = false;
    }
  });
  
  bullets = bullets.filter(b => b.active);
}

// Particle system for effects
function createParticles(x, y, count = 10) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 30,
      maxLife: 30,
    });
  }
}

function updateParticles() {
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  });
  
  particles = particles.filter(p => p.life > 0);
}

// Drawing functions
function drawParallaxBackground() {
  // Update parallax offsets
  parallaxOffset1 += 0.2;
  parallaxOffset2 += 0.5;
  parallaxOffset3 += 0.8;
  
  if (parallaxOffset1 > CANVAS_HEIGHT) parallaxOffset1 = 0;
  if (parallaxOffset2 > CANVAS_HEIGHT) parallaxOffset2 = 0;
  if (parallaxOffset3 > CANVAS_HEIGHT) parallaxOffset3 = 0;
  
  // Layer 1 - Far background (darkest)
  ctx.fillStyle = '#001a00';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Layer 2 - Mid forest (dark green)
  ctx.fillStyle = '#003300';
  for (let i = 0; i < 8; i++) {
    const x = (i * 100) + (parallaxOffset1 % 100);
    drawTree(x, parallaxOffset1 % CANVAS_HEIGHT, 0.3, '#003300');
  }
  
  // Layer 3 - Mid-close forest (medium green)
  ctx.fillStyle = '#004d00';
  for (let i = 0; i < 6; i++) {
    const x = (i * 140) + (parallaxOffset2 % 140);
    drawTree(x, parallaxOffset2 % CANVAS_HEIGHT, 0.5, '#004d00');
  }
  
  // Layer 4 - Close forest (lighter green)
  ctx.fillStyle = '#006600';
  for (let i = 0; i < 5; i++) {
    const x = (i * 180) + (parallaxOffset3 % 180);
    drawTree(x, parallaxOffset3 % CANVAS_HEIGHT, 0.8, '#006600');
  }
}

function drawTree(x, yOffset, scale, color) {
  const baseY = -100 + yOffset;
  const height = 600 * scale;
  
  for (let y = 0; y < 3; y++) {
    const treeY = baseY + y * CANVAS_HEIGHT;
    if (treeY < CANVAS_HEIGHT && treeY > -height) {
      // Simple tree representation
      ctx.fillStyle = color;
      // Trunk
      ctx.fillRect(x - 5 * scale, treeY, 10 * scale, height);
      // Foliage (triangular)
      ctx.beginPath();
      ctx.moveTo(x, treeY);
      ctx.lineTo(x - 30 * scale, treeY + 40 * scale);
      ctx.lineTo(x + 30 * scale, treeY + 40 * scale);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawPlayer() {
  // Draw 8-bit player sprite (hunter/archer)
  const size = 30;
  
  // Body (green to blend with forest theme)
  ctx.fillStyle = '#0f0';
  ctx.fillRect(playerX - size/4, playerY - size/2, size/2, size);
  
  // Head
  ctx.fillStyle = '#0ff';
  ctx.fillRect(playerX - size/3, playerY - size, size * 2/3, size/2);
  
  // Weapon (bow)
  ctx.strokeStyle = '#ff0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(playerX + size/2, playerY, size/3, -Math.PI/2, Math.PI/2);
  ctx.stroke();
  
  // Crosshair for aiming
  ctx.strokeStyle = '#f00';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(playerX - 15, playerY - 30);
  ctx.lineTo(playerX + 15, playerY - 30);
  ctx.moveTo(playerX, playerY - 45);
  ctx.lineTo(playerX, playerY - 15);
  ctx.stroke();
}

function drawEnemy(enemy) {
  const size = 40 * enemy.z;
  
  // Different appearance based on type
  if (enemy.type === 'fast') {
    // Fast enemy - red bat-like creature
    ctx.fillStyle = '#f00';
    // Body
    ctx.fillRect(enemy.x - size/4, enemy.y - size/4, size/2, size/2);
    // Wings
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(enemy.x - size/2, enemy.y - size/4);
    ctx.lineTo(enemy.x - size/3, enemy.y + size/4);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y);
    ctx.lineTo(enemy.x + size/2, enemy.y - size/4);
    ctx.lineTo(enemy.x + size/3, enemy.y + size/4);
    ctx.closePath();
    ctx.fill();
  } else {
    // Normal enemy - skull/skeleton
    ctx.fillStyle = '#fff';
    // Head
    ctx.fillRect(enemy.x - size/3, enemy.y - size/3, size * 2/3, size * 2/3);
    // Eyes
    ctx.fillStyle = '#f00';
    ctx.fillRect(enemy.x - size/6, enemy.y - size/6, size/8, size/8);
    ctx.fillRect(enemy.x + size/12, enemy.y - size/6, size/8, size/8);
    // Body
    ctx.fillStyle = '#888';
    ctx.fillRect(enemy.x - size/4, enemy.y + size/6, size/2, size/3);
  }
  
  // Glow effect for depth
  ctx.shadowBlur = 10 * enemy.z;
  ctx.shadowColor = enemy.type === 'fast' ? '#f00' : '#fff';
  ctx.shadowBlur = 0;
}

function drawBullet(bullet) {
  ctx.fillStyle = '#ff0';
  ctx.shadowBlur = 5;
  ctx.shadowColor = '#ff0';
  ctx.fillRect(bullet.x - 2, bullet.y - 8, 4, 8);
  ctx.shadowBlur = 0;
}

function drawParticles() {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
    ctx.fillRect(p.x, p.y, 3, 3);
  });
}

// Main game loop
function gameLoop() {
  // Clear canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Draw parallax background
  drawParallaxBackground();
  
  if (!gameOver) {
    // Update game state
    updatePlayer();
    updateBullets();
    updateParticles();
    
    // Draw game objects (back to front)
    enemies.forEach(drawEnemy);
    bullets.forEach(drawBullet);
    drawPlayer();
    drawParticles();
  }
  
  requestAnimationFrame(gameLoop);
}

// Initialize game
function init() {
  connectWebSocket();
  gameLoop();
}

// Start the game when page loads
window.addEventListener('load', init);
