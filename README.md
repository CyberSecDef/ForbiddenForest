# Forbidden Forest

A single-player, browser-based action-horror game inspired by 1980s game aesthetics and the classic game Forbidden Forest.

## Features

- **Retro 1980s Aesthetic**: Green monochrome display with 8-bit style sprites
- **HTML5 Canvas Rendering**: Smooth, responsive gameplay with parallax scrolling forest backgrounds
- **WebSocket Architecture**: Clean client/server separation with server-controlled game logic
- **Real-time Gameplay**: Enemy spawning, collision detection, scoring, and lives managed by the server
- **Dynamic Difficulty**: Game increases in difficulty as you score more points
- **Responsive Design**: Canvas scales to fit different screen sizes

## Controls

- **Arrow Keys**: Move your character around the screen
- **Space Bar**: Shoot projectiles at enemies
- **Space Bar** (on game over): Restart the game

## Installation

1. Clone the repository:
```bash
git clone https://github.com/CyberSecDef/ForbiddenForest.git
cd ForbiddenForest
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:8080
```

## Game Mechanics

- **Enemies**: Spawn from the top of the screen and approach at different speeds and depths
- **Fast Enemies**: Red bat-like creatures that move faster (30% spawn rate)
- **Normal Enemies**: White skeleton enemies that move at standard speed
- **Lives**: You have 3 lives; lose one each time an enemy reaches the bottom
- **Scoring**: Earn points by shooting enemies; closer enemies are worth more points
- **Difficulty**: Enemy spawn rate increases and difficulty scales up every 100 points

## Technical Details

- **Server**: Node.js with WebSocket (ws) for real-time communication
- **Client**: Vanilla JavaScript with HTML5 Canvas API
- **Game Loop**: 30 FPS server updates, 60 FPS client rendering
- **Parallax Layers**: 3 scrolling forest layers for depth perception
- **Collision Detection**: Server-side hit detection for accurate gameplay

## Project Structure

```
ForbiddenForest/
├── server.js          # WebSocket server with game logic
├── game.js            # Client-side game rendering and input
├── index.html         # Game HTML structure
├── style.css          # 1980s-inspired styling
└── package.json       # Project dependencies
```

## License

MIT