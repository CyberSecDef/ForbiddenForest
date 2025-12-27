const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

// Create HTTP server to serve static files
const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Game state management
class GameState {
  constructor() {
    this.enemies = [];
    this.nextEnemyId = 0;
    this.spawnInterval = 2000; // Spawn enemy every 2 seconds
    this.lastSpawnTime = Date.now();
    this.difficulty = 1;
  }

  spawnEnemy() {
    const enemy = {
      id: this.nextEnemyId++,
      x: Math.random() * 800, // Random x position
      y: -50, // Start above screen
      z: Math.random() * 0.5 + 0.5, // Depth (0.5-1.0, closer = larger)
      speed: (Math.random() * 50 + 50) * this.difficulty, // Pixels per second
      health: 1,
      type: Math.random() > 0.7 ? 'fast' : 'normal', // 30% fast enemies
    };
    
    // Fast enemies are faster and smaller
    if (enemy.type === 'fast') {
      enemy.speed *= 1.5;
      enemy.z *= 0.7;
    }
    
    this.enemies.push(enemy);
    return enemy;
  }

  update(deltaTime) {
    const now = Date.now();
    
    // Spawn new enemies
    if (now - this.lastSpawnTime > this.spawnInterval) {
      this.spawnEnemy();
      this.lastSpawnTime = now;
    }

    // Update enemy positions
    this.enemies.forEach(enemy => {
      enemy.y += enemy.speed * (deltaTime / 1000) * enemy.z;
    });

    // Remove enemies that are off screen (y > 650)
    this.enemies = this.enemies.filter(enemy => enemy.y < 650);
  }

  removeEnemy(enemyId) {
    this.enemies = this.enemies.filter(e => e.id !== enemyId);
  }

  increaseDifficulty() {
    this.difficulty = Math.min(this.difficulty + 0.1, 3);
    this.spawnInterval = Math.max(this.spawnInterval - 100, 800);
  }
}

// Client connections
const clients = new Map();

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  const clientId = Math.random().toString(36).substr(2, 9);
  const gameState = new GameState();
  
  clients.set(clientId, {
    ws,
    gameState,
    score: 0,
    lives: 3,
    lastUpdate: Date.now(),
  });

  // Send initial state
  ws.send(JSON.stringify({
    type: 'init',
    clientId,
    lives: 3,
    score: 0,
  }));

  // Start game loop for this client
  const gameLoop = setInterval(() => {
    const client = clients.get(clientId);
    if (!client) {
      clearInterval(gameLoop);
      return;
    }

    const now = Date.now();
    const deltaTime = now - client.lastUpdate;
    client.lastUpdate = now;

    client.gameState.update(deltaTime);

    // Send game state update
    ws.send(JSON.stringify({
      type: 'update',
      enemies: client.gameState.enemies,
      score: client.score,
      lives: client.lives,
    }));
  }, 1000 / 30); // 30 FPS updates

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const client = clients.get(clientId);
      
      if (!client) return;

      switch (data.type) {
        case 'shoot':
          // Check if bullet hit any enemy
          const { x, y } = data;
          let hit = false;
          
          for (let i = client.gameState.enemies.length - 1; i >= 0; i--) {
            const enemy = client.gameState.enemies[i];
            const enemySize = 40 * enemy.z;
            const distance = Math.sqrt(
              Math.pow(x - enemy.x, 2) + Math.pow(y - enemy.y, 2)
            );
            
            if (distance < enemySize / 2) {
              client.gameState.removeEnemy(enemy.id);
              client.score += Math.floor(10 * enemy.z);
              hit = true;
              
              // Increase difficulty every 100 points
              if (client.score % 100 < 10) {
                client.gameState.increaseDifficulty();
              }
              break;
            }
          }
          
          ws.send(JSON.stringify({
            type: 'shootResult',
            hit,
            score: client.score,
          }));
          break;

        case 'enemyReached':
          // Enemy reached bottom - player loses a life
          client.gameState.removeEnemy(data.enemyId);
          client.lives = Math.max(0, client.lives - 1);
          
          if (client.lives === 0) {
            ws.send(JSON.stringify({
              type: 'gameOver',
              score: client.score,
            }));
          }
          break;

        case 'restart':
          // Reset game state
          client.gameState = new GameState();
          client.score = 0;
          client.lives = 3;
          ws.send(JSON.stringify({
            type: 'init',
            clientId,
            lives: 3,
            score: 0,
          }));
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clearInterval(gameLoop);
    clients.delete(clientId);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
