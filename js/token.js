// Base token collectibles

class Token {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.active = true;
        this.collected = false;
        this.rotation = 0;
        this.pulsePhase = 0;
        this.value = 10; // Points value
    }

    /**
     * Update token animation
     * @param {number} gameSpeed - Current game speed multiplier
     */
    update(gameSpeed) {
        this.x -= 5 * gameSpeed; // Move with game speed
        this.rotation += 0.1;
        this.pulsePhase += 0.15;
    }

    /**
     * Draw the token on the canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        if (!this.active || this.collected) return;
        
        ctx.save();
        
        // Pulse effect
        const pulse = Math.sin(this.pulsePhase) * 0.15 + 1;
        const size = this.width * pulse;
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // Translate to center for rotation
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation);
        
        // Outer glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#0052FF';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Base token design with enhanced gradient
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size / 2);
        gradient.addColorStop(0, '#7B3FE4');
        gradient.addColorStop(0.3, '#0052FF');
        gradient.addColorStop(0.7, '#3D7FFF');
        gradient.addColorStop(1, '#7B3FE4');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Outer ring with glow
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Inner highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(-size / 6, -size / 6, size / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // "B" symbol for Base with glow
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${size * 0.65}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#FFFFFF';
        ctx.fillText('B', 0, 0);
        ctx.shadowBlur = 0;
        
        // Sparkle effect
        const sparkle = Math.sin(this.pulsePhase * 2) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${sparkle})`;
        ctx.beginPath();
        ctx.arc(size / 3, -size / 3, 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    /**
     * Get bounding box for collision detection
     * @returns {Object} Bounding box with x, y, width, height
     */
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Check if token is off screen
     * @returns {boolean} True if off screen
     */
    isOffScreen() {
        return this.x + this.width < 0;
    }

    /**
     * Mark token as collected
     */
    collect() {
        this.collected = true;
        this.active = false;
    }
}

// Token manager and spawner
class TokenManager {
    constructor(canvasWidth, canvasHeight, groundY) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.groundY = groundY;
        this.tokens = [];
        this.pool = [];
        this.lastSpawnTime = 0;
        this.spawnInterval = 1500; // Spawn tokens more frequently than obstacles
        this.collectedCount = 0;
    }

    /**
     * Update all tokens and spawn new ones
     * @param {number} gameSpeed - Current game speed multiplier
     * @param {number} currentTime - Current game time
     */
    update(gameSpeed, currentTime) {
        // Spawn new tokens
        if (currentTime - this.lastSpawnTime > this.spawnInterval) {
            this.spawnToken();
            this.lastSpawnTime = currentTime;
        }
        
        // Update existing tokens
        for (let i = this.tokens.length - 1; i >= 0; i--) {
            const token = this.tokens[i];
            token.update(gameSpeed);
            
            if (token.isOffScreen() || token.collected) {
                this.tokens.splice(i, 1);
                if (!token.collected) {
                    this.pool.push(token);
                }
            }
        }
    }

    /**
     * Spawn a new token
     */
    spawnToken() {
        // Get token from pool or create new
        let token = this.pool.pop();
        
        // Random Y position (usually at jump height or ground level)
        const rand = Math.random();
        let y;
        if (rand < 0.6) {
            // 60% chance at jump height (collectible while jumping)
            y = this.groundY - randomInt(50, 70);
        } else {
            // 40% chance on ground
            y = this.groundY - 25;
        }
        
        if (token) {
            // Reuse from pool
            token.x = this.canvasWidth;
            token.y = y;
            token.active = true;
            token.collected = false;
            token.rotation = 0;
            token.pulsePhase = 0;
        } else {
            // Create new token
            token = new Token(this.canvasWidth, y);
        }
        
        this.tokens.push(token);
    }

    /**
     * Get all active tokens (for collision checking)
     * @returns {Array} Array of active tokens
     */
    getActiveTokens() {
        return this.tokens.filter(token => token.active && !token.collected);
    }

    /**
     * Draw all tokens
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        this.tokens.forEach(token => {
            token.draw(ctx);
        });
    }


    /**
     * Reset token manager
     */
    reset() {
        // Return all tokens to pool
        this.tokens.forEach(token => {
            if (!token.collected) {
                this.pool.push(token);
            }
        });
        this.tokens = [];
        this.lastSpawnTime = 0;
        this.collectedCount = 0;
    }
}
