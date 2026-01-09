// Obstacle system with different crypto-themed obstacle types

class Obstacle {
    constructor(x, y, type, speed) {
        this.x = x;
        this.y = y;
        this.type = type; // 'bug', 'glitch', 'rugpull', 'block'
        this.speed = speed;
        this.active = true;
        
        // Set dimensions and properties based on type
        this.setupByType();
    }

    setupByType() {
        switch (this.type) {
            case 'bug':
                // Small, fast crypto bugs
                this.width = 35;
                this.height = 35;
                this.color = '#FF4444';
                this.secondaryColor = '#FF8888';
                break;
                
            case 'glitch':
                // Medium, irregular glitches
                this.width = 45;
                this.height = 50;
                this.color = '#FF00FF';
                this.secondaryColor = '#FF88FF';
                this.glitchOffset = 0;
                break;
                
            case 'rugpull':
                // Large, slow-moving rug pulls
                this.width = 70;
                this.height = 60;
                this.color = '#FF6600';
                this.secondaryColor = '#FFAA44';
                break;
                
            case 'block':
                // Ground broken blocks
                this.width = 60;
                this.height = 45;
                this.color = '#666666';
                this.secondaryColor = '#999999';
                this.isGroundObstacle = true;
                break;
                
            default:
                this.width = 30;
                this.height = 30;
                this.color = '#FF0000';
                this.secondaryColor = '#FF6666';
        }
    }

    /**
     * Update obstacle position
     * @param {number} gameSpeed - Current game speed multiplier
     */
    update(gameSpeed) {
        this.x -= this.speed * gameSpeed;
        
        // Update glitch effect
        if (this.type === 'glitch') {
            this.glitchOffset = Math.sin(Date.now() * 0.01) * 2;
        }
    }

    /**
     * Draw the obstacle on the canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} groundY - Ground Y position
     */
    draw(ctx, groundY) {
        if (!this.active) return;
        
        ctx.save();
        
        const drawX = this.x + (this.type === 'glitch' ? this.glitchOffset : 0);
        const drawY = this.isGroundObstacle ? groundY - this.height : this.y;
        
        switch (this.type) {
            case 'bug':
                this.drawBug(ctx, drawX, drawY);
                break;
            case 'glitch':
                this.drawGlitch(ctx, drawX, drawY);
                break;
            case 'rugpull':
                this.drawRugPull(ctx, drawX, drawY);
                break;
            case 'block':
                this.drawBlock(ctx, drawX, drawY);
                break;
        }
        
        ctx.restore();
    }

    drawBug(ctx, x, y) {
        const centerX = x + this.width / 2;
        const centerY = y + this.height / 2;
        
        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        
        // Bug body with gradient
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, this.width / 2);
        gradient.addColorStop(0, this.secondaryColor);
        gradient.addColorStop(1, this.color);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Antennae with glow
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.moveTo(centerX, y);
        ctx.lineTo(centerX - 3, y - 5);
        ctx.moveTo(centerX, y);
        ctx.lineTo(centerX + 3, y - 5);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Eyes
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(centerX - 3, centerY - 2, 2, 0, Math.PI * 2);
        ctx.arc(centerX + 3, centerY - 2, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawGlitch(ctx, x, y) {
        // Glitchy, distorted shape with glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        
        const gradient = ctx.createLinearGradient(x, y, x, y + this.height);
        gradient.addColorStop(0, this.secondaryColor);
        gradient.addColorStop(0.5, this.color);
        gradient.addColorStop(1, '#AA00FF');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(x, y + this.height);
        ctx.lineTo(x + 5, y);
        ctx.lineTo(x + this.width - 5, y);
        ctx.lineTo(x + this.width, y + this.height);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Glitch lines with animation
        ctx.strokeStyle = this.secondaryColor;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.secondaryColor;
        for (let i = 0; i < 3; i++) {
            const offset = Math.sin(Date.now() * 0.01 + i) * 1;
            ctx.beginPath();
            ctx.moveTo(x + i * 10 + offset, y);
            ctx.lineTo(x + i * 10 + 3 + offset, y + this.height);
            ctx.stroke();
        }
        ctx.shadowBlur = 0;
    }

    drawRugPull(ctx, x, y) {
        const centerX = x + this.width / 2;
        const centerY = y + this.height / 2;
        
        // Large warning shape with glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        
        const gradient = ctx.createLinearGradient(centerX, y, centerX, y + this.height);
        gradient.addColorStop(0, this.secondaryColor);
        gradient.addColorStop(1, this.color);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(centerX, y);
        ctx.lineTo(x, y + this.height);
        ctx.lineTo(x + this.width, y + this.height);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0;
        
        // Warning symbol with glow
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FFFFFF';
        ctx.fillText('⚠', centerX, centerY);
        ctx.shadowBlur = 0;
        
        // Pulsing border
        const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        ctx.strokeStyle = `rgba(255, 102, 0, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, y);
        ctx.lineTo(x, y + this.height);
        ctx.lineTo(x + this.width, y + this.height);
        ctx.closePath();
        ctx.stroke();
    }

    drawBlock(ctx, x, y) {
        // Broken block on ground with gradient
        const gradient = ctx.createLinearGradient(x, y, x, y + this.height);
        gradient.addColorStop(0, this.secondaryColor);
        gradient.addColorStop(1, this.color);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, this.width, this.height);
        
        // Shadow/outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, this.width, this.height);
        
        // Cracks with glow
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#FF0000';
        ctx.beginPath();
        ctx.moveTo(x + 10, y);
        ctx.lineTo(x + 15, y + this.height);
        ctx.moveTo(x + 25, y);
        ctx.lineTo(x + 20, y + this.height);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(x + 2, y + 2, this.width - 4, 6);
    }

    /**
     * Get bounding box for collision detection
     * @param {number} groundY - Ground Y position
     * @returns {Object} Bounding box with x, y, width, height
     */
    getBounds(groundY) {
        return {
            x: this.x,
            y: this.isGroundObstacle ? groundY - this.height : this.y,
            width: this.width,
            height: this.height
        };
    }

    /**
     * Check if obstacle is off screen
     * @returns {boolean} True if off screen
     */
    isOffScreen() {
        return this.x + this.width < 0;
    }
}

// Obstacle pool and spawner
class ObstacleManager {
    constructor(canvasWidth, canvasHeight, groundY) {
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.groundY = groundY;
        this.obstacles = [];
        this.pool = [];
        this.lastSpawnTime = 0;
        this.spawnInterval = 2000; // Initial spawn interval in ms
        this.minSpawnInterval = 800; // Minimum spawn interval
        this.baseSpeed = 5;
    }

    /**
     * Update all obstacles and spawn new ones
     * @param {number} gameSpeed - Current game speed multiplier
     * @param {number} currentTime - Current game time
     * @param {number} score - Current score (affects spawn rate)
     */
    update(gameSpeed, currentTime, score) {
        // Update spawn interval based on score
        this.spawnInterval = Math.max(
            this.minSpawnInterval,
            2000 - (score * 0.5)
        );
        
        // Spawn new obstacles
        if (currentTime - this.lastSpawnTime > this.spawnInterval) {
            this.spawnObstacle(gameSpeed);
            this.lastSpawnTime = currentTime;
        }
        
        // Update existing obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.update(gameSpeed);
            
            if (obstacle.isOffScreen()) {
                this.obstacles.splice(i, 1);
                this.pool.push(obstacle);
            }
        }
    }

    /**
     * Spawn a new obstacle
     * @param {number} gameSpeed - Current game speed multiplier
     */
    spawnObstacle(gameSpeed) {
        // Get obstacle from pool or create new
        let obstacle = this.pool.pop();
        
        // Determine obstacle type (weighted random)
        const rand = Math.random();
        let type;
        if (rand < 0.4) {
            type = 'bug'; // 40% chance
        } else if (rand < 0.65) {
            type = 'glitch'; // 25% chance
        } else if (rand < 0.85) {
            type = 'block'; // 20% chance
        } else {
            type = 'rugpull'; // 15% chance
        }
        
        // Determine Y position (ground obstacles stay on ground)
        let y;
        if (type === 'block') {
            y = this.groundY;
        } else {
            // Air obstacles can be at different heights
            y = this.groundY - randomInt(40, 80);
        }
        
        if (obstacle) {
            // Reuse from pool
            obstacle.x = this.canvasWidth;
            obstacle.y = y;
            obstacle.type = type;
            obstacle.speed = this.baseSpeed * gameSpeed;
            obstacle.active = true;
            obstacle.setupByType();
        } else {
            // Create new obstacle
            obstacle = new Obstacle(
                this.canvasWidth,
                y,
                type,
                this.baseSpeed * gameSpeed
            );
        }
        
        this.obstacles.push(obstacle);
    }

    /**
     * Draw all obstacles
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        this.obstacles.forEach(obstacle => {
            obstacle.draw(ctx, this.groundY);
        });
    }

    /**
     * Get all active obstacles
     * @returns {Array} Array of active obstacles
     */
    getObstacles() {
        return this.obstacles.filter(obs => obs.active);
    }

    /**
     * Reset obstacle manager
     */
    reset() {
        // Return all obstacles to pool
        this.obstacles.forEach(obs => this.pool.push(obs));
        this.obstacles = [];
        this.lastSpawnTime = 0;
    }
}
