# Base Runner - Endless Crypto Game

An endless runner game inspired by Chrome's offline dinosaur game, featuring Base-themed elements, crypto obstacles, and token collection.

## Features

- **Endless Runner Gameplay**: Continuous running with jump/fly mechanics
- **Crypto-Themed Obstacles**: 
  - Crypto bugs (small, fast)
  - Glitches (medium, irregular patterns)
  - Rug pulls (large, slow-moving)
  - Broken blocks (ground obstacles)
- **Base Token Collection**: Collect tokens to increase your score
- **Progressive Difficulty**: Game speed and obstacle density increase over time
- **Minimal Design**: Fast-loading, lightweight, optimized for performance
- **Responsive**: Works on desktop and mobile devices
- **Touch & Keyboard Support**: Play with spacebar, arrow keys, or touch

## How to Play

1. Open `index.html` in a web browser
2. Click "Start Game" or press any key
3. Press **SPACE**, **Arrow Up**, **W**, or **tap/click** to jump and avoid obstacles
4. Collect Base tokens (blue circular tokens with "B") to increase your score
5. Avoid all obstacles - collision ends the game
6. Try to achieve the highest score possible!

## Controls

- **Desktop**: 
  - `SPACE` - Jump
  - `Arrow Up` - Jump
  - `W` - Jump
  - `Mouse Click` - Jump
- **Mobile**: 
  - Tap anywhere on screen to jump

## Game Mechanics

- **Score System**: 
  - Collect Base tokens for 10 points each
  - Survival bonus: score increases over time
- **Difficulty**: 
  - Game speed increases gradually
  - Obstacle spawn rate increases with score
  - Maximum speed cap prevents unplayable difficulty
- **Physics**: 
  - Gravity-based jumping
  - Smooth animations at 60 FPS
  - Collision detection using AABB (Axis-Aligned Bounding Box)

## Technical Details

- **Technology**: Vanilla JavaScript, HTML5 Canvas
- **No Dependencies**: Pure JavaScript for fast loading
- **Performance Optimizations**:
  - Object pooling for obstacles and tokens
  - Efficient collision detection
  - Minimal DOM manipulation
  - Canvas optimization

## File Structure

```
base mini game/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # Styling
├── js/
│   ├── game.js         # Main game engine
│   ├── player.js       # Player character
│   ├── obstacle.js     # Obstacle system
│   ├── token.js        # Token collectibles
│   ├── input.js        # Input handling
│   └── utils.js        # Utility functions
└── README.md           # This file
```

## Future Enhancements

- Base blockchain wallet integration
- On-chain leaderboard
- Token rewards for top players
- Sound effects and music
- Particle effects
- Multiple character skins
- Power-ups and special abilities

## Browser Compatibility

Works in all modern browsers that support:
- HTML5 Canvas
- ES6 JavaScript
- requestAnimationFrame API

## License

Free to use and modify.
