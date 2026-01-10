// Main game class with game loop, state management, and rendering

class Game {
    constructor(canvasId, walletManager = null) {
        console.log('Game constructor called with canvasId:', canvasId);
        
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas element not found:', canvasId);
            throw new Error('Canvas element not found: ' + canvasId);
        }
        console.log('Canvas found:', this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Could not get 2d context from canvas');
            throw new Error('Canvas 2D context not supported on this device');
        }
        console.log('Canvas context obtained');
        
        this.input = new InputHandler();
        this.walletManager = walletManager;
        
        // Game state
        this.state = 'menu'; // 'menu', 'playing', 'gameover'
        this.score = 0;
        // Safe localStorage access with fallback for private browsing
        try {
            const stored = localStorage.getItem('baseRunnerHighScore');
            this.highScore = stored ? Math.floor(parseFloat(stored) || 0) : 0;
        } catch (e) {
            console.warn('localStorage not available, using default high score');
            this.highScore = 0;
        }
        this.gameSpeed = 1.10; // Fixed medium speed + 10% faster (no increase over time)
        this.baseSpeed = 8.8; // Medium speed + 10% faster (8 * 1.10)
        this.speedIncreaseRate = 0; // NO speed increase - keep constant
        this.maxSpeed = 1.10; // Fixed speed - same as initial (no increase)
        
        // Rocket power-up
        this.coinCount = 0;
        this.coinsNeededForRocket = 5;
        this.rocketModeActive = false;
        this.rocketModeDuration = 2500;
        this.rocketModeStartTime = 0;
        
        // Share functionality
        this.finalScore = 0;
        this.isNewHighScore = false;
        this.shareImageBlob = null;
        this.shareImageUrl = null;
        
        // Game objects (will be initialized in init())
        this.player = null;
        this.obstacleManager = null;
        this.tokenManager = null;
        this.particles = new ParticleSystem();
        this.floatingTexts = new FloatingTextManager();
        
        // Background
        this.bgOffset = 0;
        
        // Timing
        this.lastFrameTime = 0;
        this.gameStartTime = 0;
        this.currentTime = 0;
        this.gameLoopRunning = false;
        this.gameLoopId = null;
        
        // Canvas dimensions
        this.canvasWidth = 1000;
        this.canvasHeight = 600;
        this.groundY = this.canvasHeight - 50;
        
        // Setup canvas
        this.setupCanvas();
        console.log('Canvas setup complete');
        
        // UI elements
        this.scoreDisplay = document.getElementById('score-display');
        this.highScoreDisplay = document.getElementById('high-score-display');
        this.menuScreen = document.getElementById('menu-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.leaderboardScreen = document.getElementById('leaderboard-screen');
        this.finalScoreDisplay = document.getElementById('final-score');
        this.highScoreBadge = document.getElementById('high-score-badge');
        this.startButton = document.getElementById('start-button');
        this.restartButton = document.getElementById('restart-button');
        this.shareXButton = document.getElementById('share-x-button');
        this.shareTwitterButton = document.getElementById('share-twitter-button');
        this.shareButton = document.getElementById('share-button');
        
        console.log('UI elements found:', {
            menuScreen: !!this.menuScreen,
            startButton: !!this.startButton,
            restartButton: !!this.restartButton
        });
        
        // Ensure menu screen is visible on startup
        if (this.menuScreen) {
            this.menuScreen.classList.remove('hidden');
            this.menuScreen.style.display = 'flex';
            this.menuScreen.style.pointerEvents = 'auto';
            console.log('Menu screen made visible');
        }
        
        if (this.gameOverScreen) {
            this.gameOverScreen.classList.add('hidden');
        }
        if (this.leaderboardScreen) {
            this.leaderboardScreen.classList.add('hidden');
        }
        
        // Hide wallet select modal initially
        const walletModal = document.getElementById('wallet-select-modal');
        if (walletModal) {
            walletModal.classList.add('hidden');
            walletModal.style.display = 'none';
        }
        
        // Setup UI listeners IMMEDIATELY - don't wait
        this.setupUIListeners();
        console.log('Game constructor complete');
    }

    setupCanvas() {
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        this.handleResize();
    }

    handleResize() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth || window.innerWidth;
        const containerHeight = container.clientHeight || window.innerHeight;
        
        const aspectRatio = this.canvasWidth / this.canvasHeight;
        let scale = Math.min(containerWidth / this.canvasWidth, containerHeight / this.canvasHeight);
        
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            scale = Math.max(scale, 0.3);
            scale = Math.min(scale, 0.98);
        } else {
            scale = Math.max(scale, 0.5);
        }
        
        const newWidth = this.canvasWidth * scale;
        const newHeight = this.canvasHeight * scale;
        
        this.canvas.style.width = newWidth + 'px';
        this.canvas.style.height = newHeight + 'px';
        
        if (isMobile) {
            document.documentElement.style.fontSize = '16px';
        }
    }

    setupUIListeners() {
        console.log('=== Setting up UI listeners ===');
        
        // Ultra-simple button handler - no cloning, just direct setup
        const setupButton = (buttonId, handler, name) => {
            const btn = document.getElementById(buttonId);
            if (!btn) {
                console.error('Button not found:', name, buttonId);
                return false;
            }
            
            console.log('Setting up button:', name, buttonId);
            
            // Make sure button is interactive
            btn.style.pointerEvents = 'auto';
            btn.style.cursor = 'pointer';
            btn.style.touchAction = 'manipulation';
            btn.style.webkitTapHighlightColor = 'rgba(0,0,0,0)';
            btn.style.zIndex = '1000';
            btn.style.minHeight = '44px';
            
            // Simple click handler that works everywhere
            const clickHandler = (e) => {
                console.log('BUTTON CLICKED:', name, e ? e.type : 'direct');
                if (e) {
                    if (e.preventDefault) e.preventDefault();
                    if (e.stopPropagation) e.stopPropagation();
                }
                try {
                    handler();
                } catch (err) {
                    console.error('Error in button handler:', name, err);
                    alert('Error: ' + (err.message || String(err)));
                }
                return false;
            };
            
            // Clear any existing handlers first
            btn.onclick = null;
            
            // Add multiple event types for maximum compatibility
            btn.onclick = clickHandler;
            btn.addEventListener('click', clickHandler, { passive: false, capture: false });
            btn.addEventListener('touchend', clickHandler, { passive: false, capture: false });
            btn.addEventListener('touchstart', (e) => {
                if (e && e.stopPropagation) e.stopPropagation();
            }, { passive: true, capture: false });
            
            // Pointer events for modern browsers
            if (typeof window !== 'undefined' && 'PointerEvent' in window) {
                btn.addEventListener('pointerup', clickHandler, { passive: false, capture: false });
            }
            
            console.log('Button set up successfully:', name);
            return true;
        };
        
        // Start button - SKIP setupUIListeners handler, use only direct handler in index.html
        // Don't set up button here - it's done in index.html initialization
        // This prevents conflicts
        console.log('Start button will be set up in index.html initialization (skipping here to avoid conflicts)');
        
        // Restart button
        if (this.restartButton) {
            setupButton('restart-button', () => {
                console.log('=== RESTART GAME BUTTON CLICKED ===');
                this.startGame();
            }, 'restart-button');
        }
        
        // Share buttons
        if (this.shareXButton) {
            setupButton('share-x-button', () => this.shareOnX(), 'share-x-button');
        }
        if (this.shareTwitterButton) {
            setupButton('share-twitter-button', () => this.shareOnTwitter(), 'share-twitter-button');
        }
        if (this.shareButton) {
            setupButton('share-button', () => this.shareGeneric(), 'share-button');
        }
        
        console.log('=== UI listeners setup complete ===');
    }

    init() {
        try {
            console.log('Initializing game objects...');
            
            // Initialize game objects
            this.player = new Player(100, this.groundY - 60, 45, 60);
            console.log('Player created');
            
            this.obstacleManager = new ObstacleManager(
                this.canvasWidth,
                this.canvasHeight,
                this.groundY
            );
            console.log('Obstacle manager created');
            
            this.tokenManager = new TokenManager(
                this.canvasWidth,
                this.canvasHeight,
                this.groundY
            );
            console.log('Token manager created');
            
            // Update high score display
            this.updateHighScore();
            
            // Draw initial menu screen
            this.draw();
            
            // Start game loop for menu display - MUST start here
            console.log('Starting menu loop...');
            this.gameLoopRunning = true;
            
            // Start the loop immediately
            const loop = (timestamp) => {
                try {
                    this.gameLoop(timestamp);
                    if (this.gameLoopRunning) {
                        this.gameLoopId = requestAnimationFrame(loop);
                    }
                } catch (err) {
                    console.error('Error in game loop:', err);
                    // Try to continue anyway
                    if (this.gameLoopRunning) {
                        setTimeout(() => {
                            this.gameLoopId = requestAnimationFrame(loop);
                        }, 16);
                    }
                }
            };
            
            this.gameLoopId = requestAnimationFrame(loop);
            console.log('Game loop started, ID:', this.gameLoopId);
            console.log('Game initialization complete!');
        } catch (error) {
            console.error('Error in game init:', error);
            throw error;
        }
    }
    
    startGameLoop() {
        if (this.gameLoopRunning && this.gameLoopId === null) {
            console.log('Starting game loop...');
            const loop = (timestamp) => {
                this.gameLoop(timestamp);
                if (this.gameLoopRunning) {
                    this.gameLoopId = requestAnimationFrame(loop);
                }
            };
            this.gameLoopId = requestAnimationFrame(loop);
        }
    }

    startGame() {
        console.log('=== START GAME CALLED ===');
        console.log('Current state:', this.state);
        
        this.state = 'playing';
        this.score = 0;
        this.gameSpeed = 1.10; // Fixed medium speed + 10% faster - constant throughout game
        this.gameStartTime = performance.now();
        this.currentTime = 0;
        this.lastFrameTime = 0;
        this.bgOffset = 0;
        
        // Reset rocket power-up
        this.coinCount = 0;
        this.rocketModeActive = false;
        this.rocketModeStartTime = 0;
        
        // Reset share variables
        this.finalScore = 0;
        this.isNewHighScore = false;
        if (this.shareImageUrl) {
            URL.revokeObjectURL(this.shareImageUrl);
        }
        this.shareImageBlob = null;
        this.shareImageUrl = null;
        
        // Reset game objects
        if (this.player) {
            this.player.reset(100, this.groundY - 60);
        }
        if (this.obstacleManager) {
            this.obstacleManager.reset();
        }
        if (this.tokenManager) {
            this.tokenManager.reset();
        }
        if (this.particles) {
            this.particles.clear();
        }
        if (this.floatingTexts) {
            this.floatingTexts.clear();
        }
        if (this.input) {
            this.input.reset();
        }
        
        // Hide/show screens - FORCE HIDE with EVERY method possible
        if (this.menuScreen) {
            // Add hidden class
            this.menuScreen.classList.add('hidden');
            
            // Force hide with inline styles (overrides everything)
            this.menuScreen.style.setProperty('display', 'none', 'important');
            this.menuScreen.style.setProperty('visibility', 'hidden', 'important');
            this.menuScreen.style.setProperty('opacity', '0', 'important');
            this.menuScreen.style.setProperty('pointer-events', 'none', 'important');
            this.menuScreen.style.setProperty('z-index', '-1', 'important');
            this.menuScreen.style.setProperty('position', 'absolute', 'important');
            this.menuScreen.style.setProperty('left', '-9999px', 'important');
            
            console.log('Menu screen FORCE hidden - display:', this.menuScreen.style.display);
            console.log('Menu screen has hidden class:', this.menuScreen.classList.contains('hidden'));
            
            // Double-check it's actually hidden after a moment
            setTimeout(() => {
                const computedStyle = window.getComputedStyle(this.menuScreen);
                console.log('Computed menu display:', computedStyle.display);
                if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden') {
                    console.error('WARNING: Menu screen still visible! Force removing from DOM...');
                    // Remove from DOM as absolute last resort
                    this.menuScreen.style.setProperty('display', 'none', 'important');
                    this.menuScreen.style.setProperty('visibility', 'hidden', 'important');
                    // Don't actually remove from DOM, just make sure it's hidden
                }
            }, 50);
        } else {
            console.error('Menu screen element not found!');
        }
        
        if (this.gameOverScreen) {
            this.gameOverScreen.classList.add('hidden');
            this.gameOverScreen.style.display = 'none';
        }
        
        if (this.highScoreBadge) {
            this.highScoreBadge.classList.add('hidden');
            this.highScoreBadge.style.display = 'none';
        }
        
        // Force show the canvas - ensure it's visible
        if (this.canvas) {
            this.canvas.style.display = 'block';
            this.canvas.style.visibility = 'visible';
            this.canvas.style.zIndex = '1';
            console.log('Canvas made visible');
        }
        
        // Update score display
        this.updateScore();
        this.updateHighScore();
        
        // ALWAYS ensure game loop is running - restart it if needed
        console.log('Ensuring game loop is running. Current status - Running:', this.gameLoopRunning, 'ID:', this.gameLoopId);
        
        // Force restart the loop when game starts
        this.gameLoopRunning = true;
        
        // Cancel existing loop if any
        if (this.gameLoopId !== null) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        
        // Start the loop immediately
        const loop = (timestamp) => {
            try {
                this.gameLoop(timestamp);
                if (this.gameLoopRunning) {
                    this.gameLoopId = requestAnimationFrame(loop);
                }
            } catch (err) {
                console.error('Error in game loop:', err);
                // Try to continue anyway
                if (this.gameLoopRunning) {
                    setTimeout(() => {
                        this.gameLoopId = requestAnimationFrame(loop);
                    }, 16);
                }
            }
        };
        
        this.gameLoopId = requestAnimationFrame(loop);
        console.log('Game loop started with ID:', this.gameLoopId);
        
        // Force immediate redraw to show the game
        this.draw();
        console.log('Immediate draw called after game start');
        
        // Also force redraw after a short delay to ensure it renders
        setTimeout(() => {
            this.draw();
            console.log('Delayed draw called');
        }, 50);
        
        console.log('Game started successfully! State:', this.state, 'Menu hidden:', this.menuScreen ? this.menuScreen.classList.contains('hidden') : 'N/A', 'Loop running:', this.gameLoopRunning);
    }

    gameOver() {
        console.log('=== GAME OVER ===');
        this.state = 'gameover';
        
        // Emit explosion particles
        if (this.player && this.particles) {
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            this.particles.emit(playerCenterX, playerCenterY, 'explosion', 20);
        }
        
        // Calculate final score
        const finalScore = Math.floor(this.score);
        this.finalScore = finalScore;
        const isNewHighScore = finalScore > this.highScore;
        if (isNewHighScore) {
            this.highScore = finalScore;
            try {
                if (typeof localStorage !== 'undefined' && localStorage) {
                    localStorage.setItem('baseRunnerHighScore', this.highScore.toString());
                }
            } catch (e) {
                console.warn('Failed to save high score to localStorage:', e);
            }
        }
        this.isNewHighScore = isNewHighScore;
        
        // Submit score to leaderboard if wallet is connected
        if (this.walletManager && this.walletManager.isConnected) {
            this.walletManager.submitScore(finalScore);
        }
        
        // Update UI
        if (this.finalScoreDisplay) {
            this.finalScoreDisplay.textContent = `Final Score: ${finalScore}`;
        }
        if (this.isNewHighScore && this.highScoreBadge) {
            this.highScoreBadge.classList.remove('hidden');
        }
        
        // Show game over screen - FORCE SHOW with multiple methods
        if (this.gameOverScreen) {
            this.gameOverScreen.classList.remove('hidden');
            this.gameOverScreen.style.display = 'flex'; // Force show
            this.gameOverScreen.style.visibility = 'visible';
            this.gameOverScreen.style.opacity = '1';
            this.gameOverScreen.style.pointerEvents = 'auto';
            this.gameOverScreen.style.zIndex = '25'; // Higher than menu
            this.gameOverScreen.style.setProperty('display', 'flex', 'important');
            console.log('Game over screen shown - display:', this.gameOverScreen.style.display);
        } else {
            console.error('Game over screen element not found!');
        }
        
        // Hide menu screen
        if (this.menuScreen) {
            this.menuScreen.classList.add('hidden');
            this.menuScreen.style.display = 'none';
            this.menuScreen.style.visibility = 'hidden';
            this.menuScreen.style.opacity = '0';
            this.menuScreen.style.pointerEvents = 'none';
            this.menuScreen.style.setProperty('display', 'none', 'important');
        }
        
        // Hide leaderboard if visible
        if (this.leaderboardScreen) {
            this.leaderboardScreen.classList.add('hidden');
            this.leaderboardScreen.style.display = 'none';
        }
        
        // Generate share image (may take time, don't wait)
        try {
            this.generateShareImage();
        } catch (err) {
            console.warn('Failed to generate share image:', err);
        }
        
        // Force immediate redraw to show game over screen
        this.draw();
        
        // Also force show after a small delay to ensure it's visible
        setTimeout(() => {
            if (this.gameOverScreen) {
                const computedStyle = window.getComputedStyle(this.gameOverScreen);
                console.log('Game over screen visibility check:', {
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    opacity: computedStyle.opacity,
                    hasHiddenClass: this.gameOverScreen.classList.contains('hidden')
                });
                
                if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
                    console.log('Force showing game over screen again...');
                    this.gameOverScreen.classList.remove('hidden');
                    this.gameOverScreen.style.setProperty('display', 'flex', 'important');
                    this.gameOverScreen.style.setProperty('visibility', 'visible', 'important');
                    this.gameOverScreen.style.setProperty('opacity', '1', 'important');
                    this.gameOverScreen.style.setProperty('z-index', '25', 'important');
                }
            }
            this.draw(); // Redraw again
        }, 100);
        
        console.log('Game over function completed. State:', this.state);
    }

    update(deltaTime) {
        if (this.state !== 'playing') return;
        
        try {
            this.currentTime = performance.now() - this.gameStartTime;
            
            // Keep speed constant at medium + 10% (no increase over time)
            this.gameSpeed = 1.10; // Fixed medium speed + 10% faster - never changes
            
            // Handle rocket mode
            if (this.rocketModeActive) {
                const elapsed = this.currentTime - this.rocketModeStartTime;
                if (elapsed >= this.rocketModeDuration) {
                    this.deactivateRocketMode();
                }
            }
            
            // Handle input
            if (this.input && this.player) {
                if (this.rocketModeActive) {
                    // In rocket mode, player flies upward automatically
                } else {
                    // Normal jump mode
                    if (this.input.isJumpJustPressed()) {
                        this.player.jump();
                        if (this.particles) {
                            const playerCenterX = this.player.x + this.player.width / 2;
                            this.particles.emit(playerCenterX, this.groundY, 'jump', 5);
                        }
                    }
                }
            }
            
            // Update background offset
            this.bgOffset += this.baseSpeed * this.gameSpeed * 0.5;
            if (this.bgOffset > 40) this.bgOffset = 0;
            
            // Update game objects
            if (this.player) {
                this.player.update(this.groundY, this.rocketModeActive);
            }
            if (this.obstacleManager) {
                this.obstacleManager.update(this.gameSpeed, this.currentTime, this.score);
            }
            if (this.tokenManager) {
                this.tokenManager.update(this.gameSpeed, this.currentTime);
            }
            if (this.particles) {
                this.particles.update();
            }
            if (this.floatingTexts) {
                this.floatingTexts.update();
            }
            
            // Check token collection
            if (this.tokenManager && this.player) {
                const tokens = this.tokenManager.getActiveTokens();
                const playerBounds = this.player.getBounds();
                let points = 0;
                
                tokens.forEach(token => {
                    if (checkCollision(playerBounds, token.getBounds())) {
                        points += token.collect();
                        this.coinCount++;
                        
                        if (this.particles) {
                            const tokenX = token.x + token.size / 2;
                            const tokenY = token.y + token.size / 2;
                            this.particles.emit(tokenX, tokenY, 'collect', 8);
                        }
                        
                        if (this.floatingTexts) {
                            const tokenX = token.x + token.size / 2;
                            const tokenY = token.y + token.size / 2;
                            this.floatingTexts.add(tokenX, tokenY, `+10`, '#FFD700');
                        }
                        
                        if (this.coinCount >= this.coinsNeededForRocket && !this.rocketModeActive) {
                            this.activateRocketMode();
                        }
                    }
                });
                
                if (points > 0) {
                    this.score += points;
                    this.updateScore();
                }
            }
            
            // Check collisions with obstacles (only if not in rocket mode)
            if (!this.rocketModeActive && this.obstacleManager && this.player) {
                const obstacles = this.obstacleManager.getActiveObstacles();
                const playerBounds = this.player.getBounds();
                obstacles.forEach(obstacle => {
                    if (checkCollision(playerBounds, obstacle.getBounds(this.groundY))) {
                        this.gameOver();
                    }
                });
            }
            
            // Update score continuously during gameplay
            this.score += this.gameSpeed * 0.1;
            this.updateScore();
        } catch (error) {
            console.error('Error in update:', error);
        }
    }

    draw() {
        try {
            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
            
            // Draw background
            this.drawBackground();
            
            // Draw ground
            this.drawGround();
            
            // Draw game objects only when playing
            if (this.state === 'playing') {
                if (this.obstacleManager) {
                    const obstacles = this.obstacleManager.getActiveObstacles();
                    obstacles.forEach(obstacle => obstacle.draw(this.ctx, this.groundY));
                }
                
                if (this.tokenManager) {
                    const tokens = this.tokenManager.getActiveTokens();
                    tokens.forEach(token => token.draw(this.ctx));
                }
                
                if (this.player) {
                    this.player.draw(this.ctx);
                }
                
                if (this.particles) {
                    this.particles.draw(this.ctx);
                }
                
                if (this.floatingTexts) {
                    this.floatingTexts.draw(this.ctx);
                }
                
                // Draw UI overlays
                // Speed indicator removed
                this.drawCoinCounter();
                if (this.rocketModeActive) {
                    this.drawRocketModeIndicator();
                }
            }
        } catch (error) {
            console.error('Error in draw:', error);
        }
    }

    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        gradient.addColorStop(0, '#0a0a1a');
        gradient.addColorStop(1, '#1a1a2e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Stars
        for (let i = 0; i < 100; i++) {
            const x = (i * 37) % this.canvasWidth;
            const y = (i * 23) % this.canvasHeight;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.4})`;
            this.ctx.fillRect(x, y, 1, 1);
        }
        
        const bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        bgGradient.addColorStop(0, 'rgba(0, 82, 255, 0.1)');
        bgGradient.addColorStop(1, 'rgba(0, 82, 255, 0.05)');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    drawGround() {
        const groundGradient = this.ctx.createLinearGradient(0, this.groundY, 0, this.canvasHeight);
        groundGradient.addColorStop(0, '#1a1a3e');
        groundGradient.addColorStop(1, '#0a0a2a');
        this.ctx.fillStyle = groundGradient;
        this.ctx.fillRect(0, this.groundY, this.canvasWidth, this.canvasHeight - this.groundY);
        
        // Ground line
        this.ctx.strokeStyle = '#0052FF';
        this.ctx.lineWidth = 3;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#0052FF';
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.lineTo(this.canvasWidth, this.groundY);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
        
        // Grid pattern on ground
        this.ctx.strokeStyle = 'rgba(0, 82, 255, 0.3)';
        this.ctx.lineWidth = 1;
        for (let x = -this.bgOffset; x < this.canvasWidth; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.groundY);
            this.ctx.lineTo(x, this.canvasHeight);
            this.ctx.stroke();
        }
    }

    // Speed indicator removed - no longer displayed

    drawCoinCounter() {
        const x = this.canvasWidth - 180;
        const y = 100;
        const width = 150;
        const height = 30;
        const progress = Math.min(this.coinCount / this.coinsNeededForRocket, 1);
        
        const containerGradient = this.ctx.createLinearGradient(x, y, x, y + height);
        containerGradient.addColorStop(0, 'rgba(0, 82, 255, 0.2)');
        containerGradient.addColorStop(1, 'rgba(0, 82, 255, 0.1)');
        this.ctx.fillStyle = containerGradient;
        this.ctx.strokeStyle = '#0052FF';
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#0052FF';
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, 8);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
        
        const progressGradient = this.ctx.createLinearGradient(x, y, x + width * progress, y + height);
        progressGradient.addColorStop(0, '#0052FF');
        progressGradient.addColorStop(0.5, '#7B3FE4');
        progressGradient.addColorStop(1, '#FFD700');
        this.ctx.fillStyle = progressGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(x + 2, y + 2, (width - 4) * progress, height - 4, 6);
        this.ctx.fill();
        
        if (progress >= 1) {
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#FFD700';
            this.ctx.beginPath();
            this.ctx.roundRect(x + 2, y + 2, width - 4, height - 4, 6);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(`Coins: ${this.coinCount}/${this.coinsNeededForRocket}`, x + width / 2, y + height / 2);
        this.ctx.shadowBlur = 0;
        
        if (progress >= 1) {
            const sparkleX = x + width * 0.2 + Math.sin(this.currentTime * 0.01) * 10;
            const sparkleY = y + height / 2 + Math.cos(this.currentTime * 0.01) * 5;
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawRocketModeIndicator() {
        const x = this.canvasWidth / 2;
        const y = 60;
        const elapsed = this.currentTime - this.rocketModeStartTime;
        const remaining = Math.max(0, (this.rocketModeDuration - elapsed) / 1000);
        
        this.ctx.fillStyle = 'rgba(255, 107, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.roundRect(x - 100, y - 15, 200, 30, 8);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FF6B00';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#FF6B00';
        this.ctx.fillText(`🚀 ROCKET MODE: ${remaining.toFixed(1)}s 🚀`, x, y);
        this.ctx.shadowBlur = 0;
    }

    activateRocketMode() {
        console.log('ROCKET MODE ACTIVATED!');
        this.rocketModeActive = true;
        this.rocketModeStartTime = this.currentTime;
        this.coinCount = 0;
        
        if (this.particles && this.player) {
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            this.particles.emit(playerCenterX, playerCenterY, 'rocket', 15);
        }
    }

    deactivateRocketMode() {
        console.log('Rocket mode deactivated');
        this.rocketModeActive = false;
        this.rocketModeStartTime = 0;
        
        if (this.particles && this.player) {
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            this.particles.emit(playerCenterX, playerCenterY, 'explosion', 20);
        }
        
        if (this.player) {
            this.player.y = this.groundY - this.player.height;
            this.player.velocityY = 0;
            this.player.isOnGround = true;
        }
    }

    updateScore() {
        const displayScore = Math.floor(this.score);
        if (this.scoreDisplay) {
            this.scoreDisplay.textContent = `Score: ${displayScore}`;
        }
        if (this.highScoreDisplay) {
            this.highScoreDisplay.textContent = `High Score: ${this.highScore}`;
        }
    }

    updateHighScore() {
        if (this.highScoreDisplay) {
            this.highScoreDisplay.textContent = `High Score: ${this.highScore}`;
        }
    }

    showLeaderboard() {
        if (!this.leaderboardScreen) return;
        
        this.leaderboardScreen.classList.remove('hidden');
        this.menuScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;
        
        leaderboardList.innerHTML = '';
        
        const leaderboard = this.walletManager ? 
            this.walletManager.getLeaderboard(10) : [];
        
        if (leaderboard.length === 0) {
            leaderboardList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.7); padding: 20px;">No scores yet. Be the first!</p>';
            return;
        }
        
        leaderboard.forEach((entry, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'leaderboard-entry';
            entryDiv.innerHTML = `
                <span class="leaderboard-rank">${index + 1}</span>
                <span class="leaderboard-address">${entry.shortAddress || entry.address.slice(0, 6) + '...' + entry.address.slice(-4)}</span>
                <span class="leaderboard-score">${entry.score}</span>
            `;
            leaderboardList.appendChild(entryDiv);
        });
    }

    hideLeaderboard() {
        if (!this.leaderboardScreen) return;
        
        this.leaderboardScreen.classList.add('hidden');
        this.menuScreen.classList.remove('hidden');
    }

    generateShareImage() {
        try {
            const shareCanvas = document.createElement('canvas');
            shareCanvas.width = 1200;
            shareCanvas.height = 630;
            const shareCtx = shareCanvas.getContext('2d');
            
            const bgGradient = shareCtx.createLinearGradient(0, 0, shareCanvas.width, shareCanvas.height);
            bgGradient.addColorStop(0, '#0a0a1a');
            bgGradient.addColorStop(0.5, '#1a1a2e');
            bgGradient.addColorStop(1, '#0a0a1a');
            shareCtx.fillStyle = bgGradient;
            shareCtx.fillRect(0, 0, shareCanvas.width, shareCanvas.height);
            
            for (let i = 0; i < 150; i++) {
                const x = (i * 37) % shareCanvas.width;
                const y = (i * 23) % shareCanvas.height;
                shareCtx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.4})`;
                shareCtx.fillRect(x, y, 2, 2);
            }
            
            const centerX = shareCanvas.width / 2;
            const centerY = shareCanvas.height / 2;
            
            shareCtx.fillStyle = '#fff';
            shareCtx.font = 'bold 72px Arial';
            shareCtx.textAlign = 'center';
            shareCtx.textBaseline = 'middle';
            shareCtx.shadowBlur = 20;
            shareCtx.shadowColor = '#0052FF';
            shareCtx.fillText('Base Runner', centerX, centerY - 150);
            shareCtx.shadowBlur = 0;
            
            const gradient = shareCtx.createLinearGradient(centerX - 200, centerY - 50, centerX + 200, centerY + 50);
            gradient.addColorStop(0, '#0052FF');
            gradient.addColorStop(0.5, '#7B3FE4');
            gradient.addColorStop(1, '#FF6B9D');
            shareCtx.fillStyle = gradient;
            shareCtx.font = 'bold 96px Arial';
            shareCtx.textAlign = 'center';
            shareCtx.fillText(`Score: ${this.finalScore}`, centerX, centerY);
            
            if (this.isNewHighScore) {
                shareCtx.fillStyle = '#FFD700';
                shareCtx.font = 'bold 48px Arial';
                shareCtx.fillText('🏆 New High Score! 🏆', centerX, centerY + 100);
            }
            
            shareCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            shareCtx.font = '36px Arial';
            shareCtx.fillText('Built on Base 🚀', centerX, shareCanvas.height - 80);
            shareCtx.fillText('base.org', centerX, shareCanvas.height - 40);
            
            shareCanvas.toBlob((blob) => {
                if (blob) {
                    this.shareImageBlob = blob;
                    this.shareImageUrl = URL.createObjectURL(blob);
                    console.log('Share image generated successfully');
                }
            }, 'image/png');
        } catch (error) {
            console.error('Error generating share image:', error);
        }
    }

    shareOnX() {
        const text = `I scored ${this.finalScore} points in Base Runner! 🚀\n\nBuilt on Base: base.org`;
        
        if (this.shareImageBlob && navigator.share) {
            const file = new File([this.shareImageBlob], 'base-runner-score.png', { type: 'image/png' });
            navigator.share({
                title: 'Base Runner Score',
                text: text,
                files: [file]
            }).catch(err => console.error('Error sharing:', err));
        } else {
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(twitterUrl, '_blank');
        }
    }

    shareOnTwitter() {
        this.shareOnX();
    }

    shareGeneric() {
        const text = `I scored ${this.finalScore} points in Base Runner! 🚀\n\nBuilt on Base: base.org`;
        
        if (navigator.share && this.shareImageBlob) {
            const file = new File([this.shareImageBlob], 'base-runner-score.png', { type: 'image/png' });
            navigator.share({
                title: 'Base Runner Score',
                text: text,
                files: [file]
            }).catch(err => {
                console.error('Error sharing:', err);
                this.fallbackCopy(text);
            });
        } else {
            this.fallbackCopy(text);
        }
    }
    
    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            alert('Score copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
        document.body.removeChild(textArea);
    }

    gameLoop(timestamp) {
        try {
            // Initialize lastFrameTime on first call
            if (this.lastFrameTime === undefined || this.lastFrameTime === null || this.lastFrameTime === 0) {
                this.lastFrameTime = timestamp || performance.now() || 0;
            }
            
            // Calculate delta time - use timestamp or performance.now as fallback
            const currentTime = timestamp || performance.now() || Date.now();
            const deltaTime = Math.max(0, currentTime - this.lastFrameTime);
            this.lastFrameTime = currentTime;
            
            // Update game (only if playing)
            if (this.state === 'playing') {
                this.update(deltaTime);
            }
            
            // Always draw (to show menu/game over screens)
            this.draw();
            
        } catch (error) {
            console.error('Error in game loop:', error);
            console.error('Stack trace:', error.stack);
            // Don't let errors stop the loop
        }
    }
}
