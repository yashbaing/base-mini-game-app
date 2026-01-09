// Main game class with game loop, state management, and rendering

class Game {
    constructor(canvasId, walletManager = null) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.input = new InputHandler();
        this.walletManager = walletManager;
        
        // Game state
        this.state = 'menu'; // 'menu', 'playing', 'gameover'
        this.score = 0;
        this.highScore = Math.floor(parseFloat(localStorage.getItem('baseRunnerHighScore')) || 0);
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
        
        // Event listeners
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
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Scale to fit container while maintaining aspect ratio
        const aspectRatio = this.canvasWidth / this.canvasHeight;
        let scale = Math.min(containerWidth / this.canvasWidth, containerHeight / this.canvasHeight);
        
        // Limit scale to prevent it from being too small
        scale = Math.max(scale, 0.5);
        
        const newWidth = this.canvasWidth * scale;
        const newHeight = this.canvasHeight * scale;
        
        this.canvas.style.width = newWidth + 'px';
        this.canvas.style.height = newHeight + 'px';
    }

    setupUIListeners() {
        this.startButton.addEventListener('click', () => {
            this.startGame();
        });
        
        this.restartButton.addEventListener('click', () => {
            this.startGame();
        });
        
        // Share button listeners
        if (this.shareXButton) {
            this.shareXButton.addEventListener('click', () => {
                this.shareOnX();
            });
        }
        
        if (this.shareTwitterButton) {
            this.shareTwitterButton.addEventListener('click', () => {
                this.shareOnTwitter();
            });
        }
        
        if (this.shareButton) {
            this.shareButton.addEventListener('click', () => {
                this.shareGeneric();
            });
        }
    }

    init() {
        // Initialize game objects
        this.player = new Player(100, this.groundY - 60, 45, 60);
        this.obstacleManager = new ObstacleManager(
            this.canvasWidth,
            this.canvasHeight,
            this.groundY
        );
        this.tokenManager = new TokenManager(
            this.canvasWidth,
            this.canvasHeight,
            this.groundY
        );
        
        // Update high score display
        this.updateHighScore();
        
        // Start game loop
        this.gameLoop(0);
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
        
        // Update high score
        const finalScore = Math.floor(this.score);
        this.finalScore = finalScore;
        const isNewHighScore = finalScore > this.highScore;
        if (isNewHighScore) {
            this.highScore = finalScore;
            localStorage.setItem('baseRunnerHighScore', this.highScore);
        }
        this.isNewHighScore = isNewHighScore;
        
        // Submit score to leaderboard if wallet is connected
        if (this.walletManager && this.walletManager.isConnected) {
            this.walletManager.submitScore(finalScore);
        }
        
        // Generate shareable image
        this.generateShareImage();
        
        // Show game over screen
        this.finalScoreDisplay.textContent = `Final Score: ${finalScore}`;
        if (isNewHighScore) {
            this.highScoreBadge.classList.remove('hidden');
        } else {
            this.highScoreBadge.classList.add('hidden');
        }
        this.gameOverScreen.classList.remove('hidden');
        this.updateHighScore();
    }

    update(deltaTime) {
        if (this.state !== 'playing') return;
        
        this.currentTime = performance.now() - this.gameStartTime;
        
        // Increase game speed over time
        this.gameSpeed = Math.min(
            this.maxSpeed,
            1 + (this.currentTime * this.speedIncreaseRate)
        );
        
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
                token.collect();
                points += token.value;
                this.coinCount++;
                
                // Emit collection particles
                const tokenCenterX = token.x + token.width / 2;
                const tokenCenterY = token.y + token.height / 2;
                this.particles.emit(tokenCenterX, tokenCenterY, 'collect', 15);
                // Add floating text for points
                this.floatingTexts.add(tokenCenterX, tokenCenterY, `+${token.value}`, '#0052FF');
                
                // Check if we have enough coins for rocket mode
                if (this.coinCount >= this.coinsNeededForRocket && !this.rocketModeActive) {
                    this.activateRocketMode();
                    this.coinCount = 0; // Reset counter
                }
            }
        });
        
        if (points > 0) {
            this.score += points;
            this.updateScore();
        }
        
        // Update rocket mode
        if (this.rocketModeActive) {
            const rocketElapsed = this.currentTime - this.rocketModeStartTime;
            if (rocketElapsed >= this.rocketModeDuration) {
                this.deactivateRocketMode();
            }
        }
        
        // Check collisions with obstacles (skip if in rocket mode - player can fly over)
        if (!this.rocketModeActive) {
            const obstacles = this.obstacleManager.getObstacles();
            
            for (const obstacle of obstacles) {
                if (checkCollision(playerBounds, obstacle.getBounds(this.groundY))) {
                    this.gameOver();
                    return;
                }
            }
        }
        
        // Increment score over time (survival bonus)
        this.score += 0.1;
        this.updateScore();
    }

    updateScore() {
        this.scoreDisplay.textContent = `Score: ${Math.floor(this.score)}`;
    }

    updateHighScore() {
        this.highScoreDisplay.textContent = `High Score: ${this.highScore}`;
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#0f0f1e';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        if (this.state === 'playing') {
            // Draw background
            this.drawBackground();
            
            // Draw ground
            this.drawGround();
            
            // Draw game objects
            this.tokenManager.draw(this.ctx);
            this.obstacleManager.draw(this.ctx);
            this.particles.draw(this.ctx);
            this.player.draw(this.ctx);
            this.floatingTexts.draw(this.ctx);
            
            // Draw speed indicator
            this.drawSpeedIndicator();
            
            // Draw rocket mode indicator
            if (this.rocketModeActive) {
                this.drawRocketModeIndicator();
            }
            
            // Draw coin counter
            this.drawCoinCounter();
        } else if (this.state === 'menu' || this.state === 'gameover') {
            // Draw background for menu/game over
            this.drawBackground();
            this.drawGround();
        }
    }

    drawBackground() {
        // Starfield effect
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        
        // Stars
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let i = 0; i < 50; i++) {
            const x = (i * 37) % this.canvasWidth;
            const y = (i * 23) % (this.groundY - 20);
            const size = (i % 3) + 1;
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Gradient overlay
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
        gradient.addColorStop(0, 'rgba(0, 82, 255, 0.05)');
        gradient.addColorStop(1, 'rgba(123, 63, 228, 0.1)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    drawGround() {
        // Ground fill with gradient
        const groundGradient = this.ctx.createLinearGradient(0, this.groundY, 0, this.canvasHeight);
        groundGradient.addColorStop(0, '#1a1a3e');
        groundGradient.addColorStop(1, '#0f0f1e');
        this.ctx.fillStyle = groundGradient;
        this.ctx.fillRect(0, this.groundY, this.canvasWidth, this.canvasHeight - this.groundY);
        
        // Ground line with glow
        this.ctx.strokeStyle = '#0052FF';
        this.ctx.lineWidth = 3;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#0052FF';
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.groundY);
        this.ctx.lineTo(this.canvasWidth, this.groundY);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
        
        // Ground pattern (animated grid)
        this.ctx.strokeStyle = 'rgba(0, 82, 255, 0.2)';
        this.ctx.lineWidth = 1;
        for (let x = -this.bgOffset; x < this.canvasWidth; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.groundY);
            this.ctx.lineTo(x, this.canvasHeight);
            this.ctx.stroke();
        }
    }

    drawSpeedIndicator() {
        // Enhanced speed bar centered at top of screen
        const barWidth = 150;
        const barHeight = 14;
        // Center horizontally
        const x = (this.canvasWidth - barWidth) / 2;
        const y = 24; // Top of screen
        const radius = 7;
        
        const speedPercent = Math.min(1, (this.gameSpeed - 1) / (this.maxSpeed - 1));
        
        // Background with better visibility
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, barWidth, barHeight, radius);
        this.ctx.fill();
        
        // Speed fill with gradient
        const fillGradient = this.ctx.createLinearGradient(x, y, x + barWidth * speedPercent, y);
        fillGradient.addColorStop(0, '#0052FF');
        fillGradient.addColorStop(1, '#7B3FE4');
        this.ctx.fillStyle = fillGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, barWidth * speedPercent, barHeight, radius);
        this.ctx.fill();
        
        // Glow effect
        this.ctx.shadowBlur = 12;
        this.ctx.shadowColor = '#0052FF';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        
        // Border
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, barWidth, barHeight, radius);
        this.ctx.stroke();
        
        // Label centered above the bar
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.font = 'bold 11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText('SPEED', x + barWidth / 2, y - 4);
    }
    
    activateRocketMode() {
        this.rocketModeActive = true;
        this.rocketModeStartTime = this.currentTime;
        
        // Emit rocket activation particles
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        this.particles.emit(playerCenterX, playerCenterY, 'rocket', 30);
        
        // Add floating text
        this.floatingTexts.add(playerCenterX, playerCenterY, '🚀 ROCKET MODE!', '#FF6B00');
    }
    
    deactivateRocketMode() {
        this.rocketModeActive = false;
        this.rocketModeStartTime = 0;
        
        // Reset player to normal state - place on ground
        this.player.y = this.groundY - this.player.height;
        this.player.velocityY = 0;
        this.player.isOnGround = true;
        this.player.isJumping = false;
        this.player.rocketMode = false;
        
        // Emit deactivation particles
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        this.particles.emit(playerCenterX, playerCenterY, 'explosion', 15);
    }
    
    drawRocketModeIndicator() {
        const x = this.canvasWidth - 180;
        const y = 24;
        const width = 160;
        const height = 30;
        const radius = 8;
        
        // Background
        const bgGradient = this.ctx.createLinearGradient(x, y, x, y + height);
        bgGradient.addColorStop(0, 'rgba(255, 107, 0, 0.3)');
        bgGradient.addColorStop(1, 'rgba(255, 215, 0, 0.3)');
        this.ctx.fillStyle = bgGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, radius);
        this.ctx.fill();
        
        // Border with glow
        this.ctx.strokeStyle = '#FF6B00';
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#FF6B00';
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, width, height, radius);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
        
        // Text
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowBlur = 5;
        this.ctx.shadowColor = '#FF6B00';
        this.ctx.fillText('🚀 ROCKET MODE', x + width / 2, y + height / 2);
        this.ctx.shadowBlur = 0;
        
        // Time remaining
        const remaining = Math.ceil((this.rocketModeDuration - (this.currentTime - this.rocketModeStartTime)) / 1000);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '11px Arial';
        this.ctx.fillText(`${remaining}s`, x + width / 2, y + height + 12);
    }
    
    drawCoinCounter() {
        const x = 24;
        const y = 90;
        const containerWidth = 220;
        const containerHeight = 50;
        const progress = this.coinCount / this.coinsNeededForRocket;
        
        // Container background with better styling
        const containerGradient = this.ctx.createLinearGradient(x, y, x, y + containerHeight);
        containerGradient.addColorStop(0, 'rgba(0, 82, 255, 0.15)');
        containerGradient.addColorStop(1, 'rgba(123, 63, 228, 0.15)');
        this.ctx.fillStyle = containerGradient;
        this.ctx.beginPath();
        this.ctx.roundRect(x - 8, y - 8, containerWidth, containerHeight, 10);
        this.ctx.fill();
        
        // Container border
        this.ctx.strokeStyle = 'rgba(0, 82, 255, 0.4)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(x - 8, y - 8, containerWidth, containerHeight, 10);
        this.ctx.stroke();
        
        // Text with better styling
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 13px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.shadowBlur = 3;
        this.ctx.shadowColor = 'rgba(0, 82, 255, 0.8)';
        this.ctx.fillText(`Coins: ${this.coinCount}/${this.coinsNeededForRocket}`, x, y + 5);
        this.ctx.shadowBlur = 0;
        
        // Progress bar with better styling
        const barWidth = 200;
        const barHeight = 8;
        const barX = x;
        const barY = y + 18;
        const radius = 4;
        
        // Background bar with glow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        this.ctx.beginPath();
        this.ctx.roundRect(barX, barY, barWidth, barHeight, radius);
        this.ctx.fill();
        
        // Progress fill with enhanced gradient
        if (progress > 0) {
            const progressGradient = this.ctx.createLinearGradient(barX, barY, barX + barWidth * progress, barY);
            progressGradient.addColorStop(0, '#0052FF');
            progressGradient.addColorStop(0.5, '#3D7FFF');
            progressGradient.addColorStop(1, '#7B3FE4');
            this.ctx.fillStyle = progressGradient;
            this.ctx.beginPath();
            this.ctx.roundRect(barX, barY, barWidth * progress, barHeight, radius);
            this.ctx.fill();
            
            // Glow effect on progress
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = '#0052FF';
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
        
        // Border on progress bar
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(barX, barY, barWidth, barHeight, radius);
        this.ctx.stroke();
        
        // Sparkle effect when full
        if (progress >= 1) {
            const sparkleTime = Date.now() * 0.005;
            for (let i = 0; i < 3; i++) {
                const sparkleX = barX + barWidth * 0.2 + (i * barWidth * 0.3);
                const sparkleY = barY + barHeight / 2;
                const sparkleSize = Math.sin(sparkleTime + i) * 2 + 3;
                this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(Math.sin(sparkleTime + i))})`;
                this.ctx.beginPath();
                this.ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    generateShareImage() {
        // Create a temporary canvas for the shareable image
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
        
        // Add Base logo pattern in background
        shareCtx.fillStyle = 'rgba(0, 82, 255, 0.1)';
        for (let i = 0; i < 100; i++) {
            const x = (i * 37) % shareCanvas.width;
            const y = (i * 23) % shareCanvas.height;
            shareCtx.beginPath();
            shareCtx.arc(x, y, 2, 0, Math.PI * 2);
            shareCtx.fill();
        }
        
        // Main content
        const centerX = shareCanvas.width / 2;
        const centerY = shareCanvas.height / 2;
        
        // Game Over title
        shareCtx.fillStyle = '#FFFFFF';
        shareCtx.font = 'bold 72px Arial';
        shareCtx.textAlign = 'center';
        shareCtx.textBaseline = 'middle';
        shareCtx.shadowBlur = 20;
        shareCtx.shadowColor = 'rgba(255, 107, 157, 0.6)';
        shareCtx.fillText('Game Over', centerX, centerY - 120);
        shareCtx.shadowBlur = 0;
        
        // Final Score with gradient
        const scoreGradient = shareCtx.createLinearGradient(centerX - 200, centerY - 40, centerX + 200, centerY + 40);
        scoreGradient.addColorStop(0, '#0052FF');
        scoreGradient.addColorStop(0.5, '#7B3FE4');
        scoreGradient.addColorStop(1, '#FF6B9D');
        shareCtx.fillStyle = scoreGradient;
        shareCtx.font = 'bold 96px Arial';
        shareCtx.shadowBlur = 30;
        shareCtx.shadowColor = 'rgba(0, 82, 255, 0.8)';
        shareCtx.fillText(`Final Score: ${this.finalScore}`, centerX, centerY);
        shareCtx.shadowBlur = 0;
        
        // High Score badge if applicable
        if (this.isNewHighScore) {
            shareCtx.fillStyle = 'linear-gradient(135deg, #FFD700, #FFA500)';
            const badgeGradient = shareCtx.createLinearGradient(centerX - 150, centerY + 60, centerX + 150, centerY + 120);
            badgeGradient.addColorStop(0, '#FFD700');
            badgeGradient.addColorStop(1, '#FFA500');
            shareCtx.fillStyle = badgeGradient;
            shareCtx.fillRect(centerX - 150, centerY + 60, 300, 50);
            shareCtx.strokeStyle = '#FFFFFF';
            shareCtx.lineWidth = 3;
            shareCtx.strokeRect(centerX - 150, centerY + 60, 300, 50);
            
            shareCtx.fillStyle = '#000000';
            shareCtx.font = 'bold 32px Arial';
            shareCtx.fillText('🏆 New High Score! 🏆', centerX, centerY + 90);
        }
        
        // Base Runner branding
        shareCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        shareCtx.font = '36px Arial';
        shareCtx.fillText('Base Runner', centerX, shareCanvas.height - 80);
        
        // Base logo/powered by text
        shareCtx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        shareCtx.font = '24px Arial';
        shareCtx.fillText('Built on Base 🚀', centerX, shareCanvas.height - 40);
        
        // Convert to blob and store
        shareCanvas.toBlob((blob) => {
            this.shareImageBlob = blob;
            this.shareImageUrl = URL.createObjectURL(blob);
        }, 'image/png');
    }
    
    shareOnX() {
        const finalScore = this.finalScore || 0;
        const isNewHigh = this.isNewHighScore ? ' 🏆 New High Score! 🏆' : '';
        const text = `Just scored ${finalScore} points in Base Runner!${isNewHigh}\n\nKeep running, keep collecting, keep building on Base! 🚀`;
        const url = window.location.href;
        const shareText = encodeURIComponent(text);
        const shareUrl = encodeURIComponent(url);
        
        // Open X (Twitter) share dialog
        window.open(`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`, '_blank', 'width=600,height=400');
        
        // Also download the image if available
        if (this.shareImageUrl && this.shareImageBlob) {
            this.downloadShareImage();
        }
    }
    
    shareOnTwitter() {
        // Same as X (Twitter was renamed to X)
        this.shareOnX();
    }
    
    shareGeneric() {
        const finalScore = this.finalScore || 0;
        const isNewHigh = this.isNewHighScore ? ' 🏆 New High Score! 🏆' : '';
        const text = `Just scored ${finalScore} points in Base Runner!${isNewHigh}\n\nKeep running, keep collecting, keep building on Base! 🚀\n\nPlay now: ${window.location.href}`;
        
        // Try Web Share API first
        if (navigator.share) {
            const shareData = {
                title: `Base Runner - Score: ${finalScore}`,
                text: text,
                url: window.location.href
            };
            
            navigator.share(shareData).catch(err => {
                console.log('Error sharing:', err);
                // Fallback: copy to clipboard
                this.copyShareText(text);
            });
        } else {
            // Fallback: copy to clipboard
            this.copyShareText(text);
        }
    }
    
    downloadShareImage() {
        if (this.shareImageUrl && this.shareImageBlob) {
            const link = document.createElement('a');
            link.href = this.shareImageUrl;
            link.download = `base-runner-score-${this.finalScore || 0}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    
    copyShareText(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                alert('Share text copied to clipboard!');
            }).catch(err => {
                console.log('Error copying to clipboard:', err);
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
            alert('Share text copied to clipboard!');
        } catch (err) {
            console.log('Error copying:', err);
            alert('Unable to copy. Please copy manually:\n\n' + text);
        }
        document.body.removeChild(textArea);
    }

    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        
        // Update game
        this.update(deltaTime);
        
        // Draw game
        this.draw();
        
        // Continue loop
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    showLeaderboard() {
        if (!this.leaderboardScreen) return;
        
        this.leaderboardScreen.classList.remove('hidden');
        this.updateLeaderboard();
    }

    hideLeaderboard() {
        if (!this.leaderboardScreen) return;
        
        this.leaderboardScreen.classList.add('hidden');
    }

    updateLeaderboard() {
        if (!this.walletManager) return;
        
        const leaderboardList = document.getElementById('leaderboard-list');
        if (!leaderboardList) return;
        
        const entries = this.walletManager.getLeaderboard(20);
        
        if (entries.length === 0) {
            leaderboardList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.6); padding: 40px;">No scores yet. Be the first!</p>';
            return;
        }
        
        leaderboardList.innerHTML = '';
        
        entries.forEach((entry, index) => {
            const isTop = index < 3;
            const entryDiv = document.createElement('div');
            entryDiv.className = `leaderboard-entry ${isTop ? 'top' : ''}`;
            
            const rank = document.createElement('div');
            rank.className = `leaderboard-rank ${isTop ? 'top' : ''}`;
            rank.textContent = `#${index + 1}`;
            
            const address = document.createElement('div');
            address.className = 'leaderboard-address';
            address.textContent = entry.shortAddress || entry.address.slice(0, 6) + '...' + entry.address.slice(-4);
            
            const score = document.createElement('div');
            score.className = `leaderboard-score ${isTop ? 'top' : ''}`;
            score.textContent = entry.score.toLocaleString();
            
            entryDiv.appendChild(rank);
            entryDiv.appendChild(address);
            entryDiv.appendChild(score);
            
            leaderboardList.appendChild(entryDiv);
        });
    }
}

// Add roundRect polyfill for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}
