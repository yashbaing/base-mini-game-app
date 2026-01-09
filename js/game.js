// Main game class with game loop, state management, and rendering

class Game {
    constructor(canvasId, walletManager = null) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas element not found:', canvasId);
            throw new Error('Canvas element not found: ' + canvasId);
        }
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Could not get 2d context from canvas');
            // Try to get experimental webgl context as fallback
            try {
                this.ctx = this.canvas.getContext('experimental-webgl') || 
                          this.canvas.getContext('webgl');
            } catch (e) {
                throw new Error('Canvas 2D context not supported on this device');
            }
        }
        
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
        this.gameSpeed = 1;
        this.baseSpeed = 12; // Increased to 12 for faster gameplay
        this.speedIncreaseRate = 0.00015; // Increased speed progression rate
        this.maxSpeed = 4; // Increased max speed
        
        // Rocket power-up
        this.coinCount = 0;
        this.coinsNeededForRocket = 5;
        this.rocketModeActive = false;
        this.rocketModeDuration = 2500; // 2.5 seconds
        this.rocketModeStartTime = 0;
        
        // Share functionality
        this.finalScore = 0;
        this.isNewHighScore = false;
        this.shareImageBlob = null;
        this.shareImageUrl = null;
        
        // Game objects
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
        
        // Canvas dimensions - larger to fit everything
        this.canvasWidth = 1000;
        this.canvasHeight = 600;
        this.groundY = this.canvasHeight - 50;
        
        // Setup canvas
        this.setupCanvas();
        
        // UI elements - verify all elements exist
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
        
        // Ensure menu screen is visible on startup
        if (this.menuScreen) {
            this.menuScreen.classList.remove('hidden');
            this.menuScreen.style.display = 'flex';
            this.menuScreen.style.pointerEvents = 'auto';
            console.log('Menu screen initialized and made visible');
        } else {
            console.error('Menu screen element not found!');
        }
        
        if (this.gameOverScreen) {
            this.gameOverScreen.classList.add('hidden');
        }
        if (this.leaderboardScreen) {
            this.leaderboardScreen.classList.add('hidden');
        }
        
        // Verify buttons exist
        if (!this.startButton) {
            console.error('CRITICAL: Start button not found in DOM!');
        } else {
            console.log('Start button found:', this.startButton.id);
        }
        
        // Setup UI listeners
        this.setupUIListeners();
    }

    setupCanvas() {
        // Set canvas size
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        this.handleResize();
    }

    handleResize() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth || window.innerWidth;
        const containerHeight = container.clientHeight || window.innerHeight;
        
        // Scale to fit container while maintaining aspect ratio
        const aspectRatio = this.canvasWidth / this.canvasHeight;
        let scale = Math.min(containerWidth / this.canvasWidth, containerHeight / this.canvasHeight);
        
        // For mobile devices, optimize scale for better performance
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            // Ensure minimum scale for readability but optimize for performance
            scale = Math.max(scale, 0.3);
            scale = Math.min(scale, 0.98);
        } else {
            // Limit scale to prevent it from being too small on desktop
            scale = Math.max(scale, 0.5);
        }
        
        const newWidth = this.canvasWidth * scale;
        const newHeight = this.canvasHeight * scale;
        
        this.canvas.style.width = newWidth + 'px';
        this.canvas.style.height = newHeight + 'px';
        
        // Prevent text size adjustment on mobile for consistency
        if (isMobile) {
            document.documentElement.style.fontSize = '16px';
        }
    }

    setupUIListeners() {
        console.log('=== Setting up UI listeners ===');
        
        // Helper function to add both click and touch events (for mobile compatibility)
        const addButtonListener = (element, handler, buttonName) => {
            if (!element) {
                console.error('Button element not found:', buttonName);
                return false;
            }
            
            console.log('Setting up listener for:', buttonName, element);
            
            // Ensure button is interactive and visible
            element.style.pointerEvents = 'auto';
            element.style.cursor = 'pointer';
            element.style.touchAction = 'manipulation';
            element.style.webkitTapHighlightColor = 'rgba(0,0,0,0)';
            element.style.position = 'relative';
            element.style.zIndex = '1000';
            element.style.display = 'flex';
            element.style.minHeight = '44px'; // Minimum touch target size
            
            // Handler function - works for both click and touch
            let touchStartTime = 0;
            let touchStarted = false;
            
            const clickHandler = (e) => {
                console.log('CLICK event on:', buttonName);
                if (e.cancelable) {
                    e.preventDefault();
                }
                e.stopPropagation();
                try {
                    handler();
                } catch (err) {
                    console.error('Error in button handler for', buttonName, ':', err);
                }
            };
            
            const touchStartHandler = (e) => {
                touchStarted = true;
                touchStartTime = Date.now();
                console.log('TOUCH START on:', buttonName);
                // Don't prevent default on touchstart - let browser handle it naturally
                e.stopPropagation();
            };
            
            const touchEndHandler = (e) => {
                if (!touchStarted) return;
                
                const touchDuration = Date.now() - touchStartTime;
                console.log('TOUCH END on:', buttonName, 'Duration:', touchDuration);
                
                // Only trigger if it was a quick tap (not a swipe)
                if (touchDuration < 500) {
                    if (e.cancelable) {
                        e.preventDefault();
                    }
                    e.stopPropagation();
                    try {
                        handler();
                    } catch (err) {
                        console.error('Error in touch handler for', buttonName, ':', err);
                    }
                }
                touchStarted = false;
            };
            
            const touchCancelHandler = (e) => {
                touchStarted = false;
                console.log('TOUCH CANCEL on:', buttonName);
            };
            
            // Add all event listeners directly to the element (no cloning)
            element.addEventListener('click', clickHandler, { passive: false, capture: false });
            element.addEventListener('touchend', touchEndHandler, { passive: false, capture: false });
            element.addEventListener('touchstart', touchStartHandler, { passive: true, capture: false });
            element.addEventListener('touchcancel', touchCancelHandler, { passive: true, capture: false });
            
            // Pointer events for modern browsers
            if ('PointerEvent' in window) {
                element.addEventListener('pointerup', clickHandler, { passive: false });
            }
            
            console.log('Successfully set up listener for:', buttonName);
            return true;
        };
        
        // Start button - MOST CRITICAL!
        let startButtonSet = false;
        if (this.startButton) {
            console.log('Start button found, setting up listener...');
            startButtonSet = addButtonListener(this.startButton, () => {
                console.log('=== START GAME CALLED FROM BUTTON ===');
                try {
                    this.startGame();
                } catch (err) {
                    console.error('Error starting game:', err);
                    alert('Error starting game: ' + err.message);
                }
            }, 'start-button');
            
            if (!startButtonSet) {
                console.error('Failed to set up start button listener!');
            }
        } else {
            console.error('CRITICAL ERROR: Start button element not found!');
            // Emergency retry after delay
            setTimeout(() => {
                const btn = document.getElementById('start-button');
                if (btn) {
                    console.log('Found start button on emergency retry');
                    this.startButton = btn;
                    addButtonListener(btn, () => this.startGame(), 'start-button');
                } else {
                    console.error('Start button still not found after emergency retry');
                }
            }, 1000);
        }
        
        // Restart button
        if (this.restartButton) {
            addButtonListener(this.restartButton, () => {
                console.log('=== RESTART GAME CALLED FROM BUTTON ===');
                try {
                    this.startGame();
                } catch (err) {
                    console.error('Error restarting game:', err);
                }
            }, 'restart-button');
        }
        
        // Share button listeners
        if (this.shareXButton) {
            addButtonListener(this.shareXButton, () => {
                this.shareOnX();
            }, 'share-x-button');
        }
        
        if (this.shareTwitterButton) {
            addButtonListener(this.shareTwitterButton, () => {
                this.shareOnTwitter();
            }, 'share-twitter-button');
        }
        
        if (this.shareButton) {
            addButtonListener(this.shareButton, () => {
                this.shareGeneric();
            }, 'share-button');
        }
        
        console.log('=== UI listeners setup complete ===');
        return startButtonSet;
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
            
            console.log('Starting game loop...');
            // Start game loop
            this.gameLoop(0);
        } catch (error) {
            console.error('Error in game init:', error);
            throw error;
        }
    }

    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.gameSpeed = 1.2; // Start slightly faster
        this.gameStartTime = performance.now();
        this.currentTime = 0;
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
        this.player.reset(100, this.groundY - 60);
        this.obstacleManager.reset();
        this.tokenManager.reset();
        this.particles.clear();
        this.floatingTexts.clear();
        this.input.reset();
        
        // Hide/show screens
        this.menuScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.highScoreBadge.classList.add('hidden');
        
        // Update score display
        this.updateScore();
        this.updateHighScore();
    }

    gameOver() {
        this.state = 'gameover';
        
        // Emit explosion particles
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        this.particles.emit(playerCenterX, playerCenterY, 'explosion', 20);
        
        // Calculate final score
        const finalScore = Math.floor(this.score);
        this.finalScore = finalScore;
        const isNewHighScore = finalScore > this.highScore;
        if (isNewHighScore) {
            this.highScore = finalScore;
            // Safe localStorage access
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
        
        // Show game over screen
        this.gameOverScreen.classList.remove('hidden');
        this.menuScreen.classList.add('hidden');
        
        // Generate share image
        this.generateShareImage();
    }

    update(deltaTime) {
        if (this.state !== 'playing') return;
        
        this.currentTime = performance.now() - this.gameStartTime;
        
        // Increase game speed over time
        this.gameSpeed = Math.min(
            this.maxSpeed,
            1 + (this.currentTime * this.speedIncreaseRate)
        );
        
        // Handle rocket mode
        if (this.rocketModeActive) {
            const elapsed = this.currentTime - this.rocketModeStartTime;
            if (elapsed >= this.rocketModeDuration) {
                this.deactivateRocketMode();
            }
        }
        
        // Handle input
        if (this.rocketModeActive) {
            // In rocket mode, player flies upward automatically
            // No input needed - just automatic upward flight
        } else {
            // Normal jump mode
            if (this.input.isJumpJustPressed()) {
                this.player.jump();
                // Emit jump particles
                const playerCenterX = this.player.x + this.player.width / 2;
                this.particles.emit(playerCenterX, this.groundY, 'jump', 5);
            }
        }
        
        // Update background offset
        this.bgOffset += this.baseSpeed * this.gameSpeed * 0.5;
        if (this.bgOffset > 40) this.bgOffset = 0;
        
        // Update game objects
        this.player.update(this.groundY, this.rocketModeActive);
        this.obstacleManager.update(this.gameSpeed, this.currentTime, this.score);
        this.tokenManager.update(this.gameSpeed, this.currentTime);
        this.particles.update();
        this.floatingTexts.update();
        
        // Check token collection
        const tokens = this.tokenManager.getActiveTokens();
        const playerBounds = this.player.getBounds();
        let points = 0;
        
        tokens.forEach(token => {
            if (checkCollision(playerBounds, token.getBounds())) {
                points += token.collect();
                this.coinCount++;
                
                // Emit particles at token location
                const tokenX = token.x + token.size / 2;
                const tokenY = token.y + token.size / 2;
                this.particles.emit(tokenX, tokenY, 'collect', 8);
                
                // Show floating text
                this.floatingTexts.add(tokenX, tokenY, `+10`, '#FFD700');
                
                // Check if rocket mode should be activated
                if (this.coinCount >= this.coinsNeededForRocket && !this.rocketModeActive) {
                    this.activateRocketMode();
                }
            }
        });
        
        // Update score
        if (points > 0) {
            this.score += points;
            this.updateScore();
        }
        
        // Check collisions with obstacles (only if not in rocket mode)
        if (!this.rocketModeActive) {
            const obstacles = this.obstacleManager.getActiveObstacles();
            obstacles.forEach(obstacle => {
                if (checkCollision(playerBounds, obstacle.getBounds())) {
                    this.gameOver();
                }
            });
        }
        
        // Update score continuously during gameplay
        this.score += this.gameSpeed * 0.1;
        this.updateScore();
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Draw background
        this.drawBackground();
        
        // Draw ground
        this.drawGround();
        
        // Draw game objects only when playing
        if (this.state === 'playing') {
            // Draw obstacles
            const obstacles = this.obstacleManager.getActiveObstacles();
            obstacles.forEach(obstacle => obstacle.draw(this.ctx));
            
            // Draw tokens
            const tokens = this.tokenManager.getActiveTokens();
            tokens.forEach(token => token.draw(this.ctx));
            
            // Draw player
            this.player.draw(this.ctx);
            
            // Draw particles
            this.particles.draw(this.ctx);
            
            // Draw floating texts
            this.floatingTexts.draw(this.ctx);
            
            // Draw UI overlays
            this.drawSpeedIndicator();
            this.drawCoinCounter();
            if (this.rocketModeActive) {
                this.drawRocketModeIndicator();
            }
        }
    }

    drawBackground() {
        // Dark background
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
        
        // Moving star pattern
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

    drawSpeedIndicator() {
        const barWidth = 200;
        const barHeight = 8;
        const x = (this.canvasWidth - barWidth) / 2;
        const y = 24;
        const progress = Math.min(this.gameSpeed / this.maxSpeed, 1);
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, barWidth, barHeight);
        
        // Progress bar
        const progressGradient = this.ctx.createLinearGradient(x, y, x + barWidth * progress, y);
        progressGradient.addColorStop(0, '#0052FF');
        progressGradient.addColorStop(1, '#FF6B9D');
        this.ctx.fillStyle = progressGradient;
        this.ctx.fillRect(x, y, barWidth * progress, barHeight);
        
        // Label
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('SPEED', this.canvasWidth / 2, y - 4);
    }

    drawCoinCounter() {
        const x = this.canvasWidth - 180;
        const y = 100;
        const width = 150;
        const height = 30;
        const progress = Math.min(this.coinCount / this.coinsNeededForRocket, 1);
        
        // Container with gradient
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
        
        // Progress fill
        const progressGradient = this.ctx.createLinearGradient(x, y, x + width * progress, y + height);
        progressGradient.addColorStop(0, '#0052FF');
        progressGradient.addColorStop(0.5, '#7B3FE4');
        progressGradient.addColorStop(1, '#FFD700');
        this.ctx.fillStyle = progressGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(x + 2, y + 2, (width - 4) * progress, height - 4, 6);
        this.ctx.fill();
        
        // Glow effect when full
        if (progress >= 1) {
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#FFD700';
            this.ctx.beginPath();
            this.ctx.roundRect(x + 2, y + 2, width - 4, height - 4, 6);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
        
        // Text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 4;
        this.ctx.fillText(`Coins: ${this.coinCount}/${this.coinsNeededForRocket}`, x + width / 2, y + height / 2);
        this.ctx.shadowBlur = 0;
        
        // Sparkle effect when full
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
        
        // Background
        this.ctx.fillStyle = 'rgba(255, 107, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.roundRect(x - 100, y - 15, 200, 30, 8);
        this.ctx.fill();
        
        // Text
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
        this.coinCount = 0; // Reset coin count
        
        // Emit rocket particles
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        this.particles.emit(playerCenterX, playerCenterY, 'rocket', 15);
    }

    deactivateRocketMode() {
        console.log('Rocket mode deactivated');
        this.rocketModeActive = false;
        this.rocketModeStartTime = 0;
        
        // Emit explosion particles
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        this.particles.emit(playerCenterX, playerCenterY, 'explosion', 20);
        
        // Reset player position to ground
        this.player.y = this.groundY - this.player.height;
        this.player.velocityY = 0;
        this.player.isOnGround = true;
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
            // Create a temporary canvas for the share image
            const shareCanvas = document.createElement('canvas');
            shareCanvas.width = 1200;
            shareCanvas.height = 630; // Optimal size for social media (1.91:1 aspect ratio)
            const shareCtx = shareCanvas.getContext('2d');
            
            // Background gradient
            const bgGradient = shareCtx.createLinearGradient(0, 0, shareCanvas.width, shareCanvas.height);
            bgGradient.addColorStop(0, '#0a0a1a');
            bgGradient.addColorStop(0.5, '#1a1a2e');
            bgGradient.addColorStop(1, '#0a0a1a');
            shareCtx.fillStyle = bgGradient;
            shareCtx.fillRect(0, 0, shareCanvas.width, shareCanvas.height);
            
            // Stars
            for (let i = 0; i < 150; i++) {
                const x = (i * 37) % shareCanvas.width;
                const y = (i * 23) % shareCanvas.height;
                shareCtx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.4})`;
                shareCtx.fillRect(x, y, 2, 2);
            }
            
            const centerX = shareCanvas.width / 2;
            const centerY = shareCanvas.height / 2;
            
            // Title
            shareCtx.fillStyle = '#fff';
            shareCtx.font = 'bold 72px Arial';
            shareCtx.textAlign = 'center';
            shareCtx.textBaseline = 'middle';
            shareCtx.shadowBlur = 20;
            shareCtx.shadowColor = '#0052FF';
            shareCtx.fillText('Base Runner', centerX, centerY - 150);
            shareCtx.shadowBlur = 0;
            
            // Score
            const gradient = shareCtx.createLinearGradient(centerX - 200, centerY - 50, centerX + 200, centerY + 50);
            gradient.addColorStop(0, '#0052FF');
            gradient.addColorStop(0.5, '#7B3FE4');
            gradient.addColorStop(1, '#FF6B9D');
            shareCtx.fillStyle = gradient;
            shareCtx.font = 'bold 96px Arial';
            shareCtx.textAlign = 'center';
            shareCtx.fillText(`Score: ${this.finalScore}`, centerX, centerY);
            
            // High score badge
            if (this.isNewHighScore) {
                shareCtx.fillStyle = '#FFD700';
                shareCtx.font = 'bold 48px Arial';
                shareCtx.fillText('🏆 New High Score! 🏆', centerX, centerY + 100);
            }
            
            // Branding
            shareCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            shareCtx.font = '36px Arial';
            shareCtx.fillText('Built on Base 🚀', centerX, shareCanvas.height - 80);
            shareCtx.fillText('base.org', centerX, shareCanvas.height - 40);
            
            // Convert to blob
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
            // Fallback to X/Twitter intent URL
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
            window.open(twitterUrl, '_blank');
        }
    }

    shareOnTwitter() {
        this.shareOnX(); // Same as X now
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
                // Fallback to clipboard
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
            if (!this.lastFrameTime) {
                this.lastFrameTime = timestamp;
            }
            
            // Calculate delta time
            const deltaTime = timestamp - this.lastFrameTime;
            this.lastFrameTime = timestamp;
            
            // Update game
            this.update(deltaTime);
            
            // Draw game
            this.draw();
            
            // Continue loop
            requestAnimationFrame((ts) => this.gameLoop(ts));
        } catch (error) {
            console.error('Error in game loop:', error);
            console.error('Stack trace:', error.stack);
            // Continue game loop even if there's an error to prevent complete crash
            requestAnimationFrame((ts) => this.gameLoop(ts));
        }
    }
}
