// Player character with running, jumping, and physics

class Player {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        
        // Physics properties
        this.velocityY = 0;
        this.gravity = 0.8;
        this.jumpForce = -15;
        this.groundY = y; // Initial ground position
        
        // Animation
        this.animationFrame = 0;
        this.animationSpeed = 0.2;
        this.blinkFrame = 0;
        this.blinkSpeed = 0.04; // Much slower blink speed
        
        // State
        this.isJumping = false;
        this.isOnGround = true;
        this.rocketMode = false;
        this.rocketThrust = 0;
    }

    /**
     * Update player physics and position
     * @param {number} groundY - Current ground Y position
     * @param {boolean} rocketMode - Whether rocket mode is active
     */
    update(groundY, rocketMode = false) {
        this.groundY = groundY;
        this.rocketMode = rocketMode;
        
        if (this.rocketMode) {
            // Rocket mode: player flies upward automatically
            // Strong upward thrust
            this.rocketThrust = -12; // Strong upward force
            this.velocityY += this.rocketThrust;
            // Minimal gravity in rocket mode
            this.velocityY += this.gravity * 0.1;
            
            // Keep player in sky area (not too high, not too low)
            const minY = 50; // Minimum Y (top of screen area)
            const maxY = groundY - this.height - 20; // Maximum Y (above ground)
            
            // Ensure player flies upward
            if (this.velocityY > -5) {
                this.velocityY = -8; // Maintain upward velocity
            }
            
            if (this.y < minY) {
                this.y = minY;
                this.velocityY = 0;
            } else if (this.y > maxY) {
                this.y = maxY;
                this.velocityY = -8; // Keep flying up
            }
            
            this.isOnGround = false;
        } else {
            // Normal mode: standard physics
            // Apply gravity
            this.velocityY += this.gravity;
            
            // Update position
            this.y += this.velocityY;
            
            // Ground collision
            if (this.y >= this.groundY - this.height) {
                this.y = this.groundY - this.height;
                this.velocityY = 0;
                this.isOnGround = true;
                this.isJumping = false;
            } else {
                this.isOnGround = false;
            }
        }
        
        // Update animation
        if (this.isOnGround && !this.rocketMode) {
            this.animationFrame += this.animationSpeed;
        } else if (this.rocketMode) {
            // Faster animation in rocket mode
            this.animationFrame += this.animationSpeed * 1.5;
        }
        
        // Update blink animation (continuous)
        this.blinkFrame += this.blinkSpeed;
    }

    /**
     * Make the player jump
     */
    jump() {
        if (this.isOnGround && !this.isJumping) {
            this.velocityY = this.jumpForce;
            this.isJumping = true;
            this.isOnGround = false;
        }
    }

    /**
     * Draw the player on the canvas
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     */
    draw(ctx) {
        ctx.save();
        
        // Player body (Base-themed character - enhanced design)
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // Enhanced shadow/glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#0052FF';
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Main body with enhanced gradient
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, '#5D9FFF');
        gradient.addColorStop(0.3, '#3D7FFF');
        gradient.addColorStop(0.6, '#0052FF');
        gradient.addColorStop(1, '#0038B3');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 8);
        ctx.fill();
        
        // Reset shadow
        ctx.shadowBlur = 0;
        
        // Enhanced top highlight with gradient
        const highlightGradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height / 2);
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
        ctx.fillStyle = highlightGradient;
        ctx.beginPath();
        ctx.roundRect(this.x + 2, this.y + 2, this.width - 4, this.height / 2.5, 4);
        ctx.fill();
        
        // Side highlights for 3D effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(this.x + 2, this.y + 2, 4, this.height - 4);
        ctx.fillRect(this.x + this.width - 6, this.y + 2, 4, this.height - 4);
        
        // Sequential blinking white square dots (4 in a line + 1 above first)
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#FFFFFF';
        
        const eyeY = centerY - 1;
        const dotSize = 4; // Smaller dot size
        const dotGap = 2.5; // Gap between dots
        const upperDotGap = 2; // Gap for upper dot
        const totalWidth = (dotSize * 4) + (dotGap * 3); // Total width of 4 dots with gaps
        const startX = centerX - totalWidth / 2; // Center the dots horizontally
        const cornerRadius = 0.8; // Slightly rounded corners
        
        // Sequential blinking: smooth linked wave from first to last
        const numDots = 5; // Total dots: 1 upper + 4 horizontal
        const cycleDuration = numDots * 3.5; // Much slower cycle duration
        const blinkPhase = (this.blinkFrame % cycleDuration) / cycleDuration; // 0 to 1
        const darkOpacity = 0.15; // Darker when not in wave
        const maxOpacity = 1.0;
        const waveWidth = 2.0; // Wider wave for smoother linking
        
        // Calculate opacity for each dot based on wave position
        const getDotOpacity = (dotIndex) => {
            // Calculate where the wave peak is in the sequence (0 to numDots + waveWidth for continuity)
            const wavePosition = blinkPhase * (numDots + waveWidth);
            // Distance from wave peak to this dot (wrapping for continuous loop)
            let distanceFromWave = Math.abs(wavePosition - dotIndex);
            // Also check if wave wraps around (for smooth continuous effect)
            const wrappedDistance1 = Math.abs(wavePosition - (dotIndex + numDots));
            const wrappedDistance2 = Math.abs((wavePosition + numDots) - dotIndex);
            distanceFromWave = Math.min(distanceFromWave, wrappedDistance1, wrappedDistance2);
            
            if (distanceFromWave < waveWidth) {
                // Inside the wave: smooth fade from center
                const fadeFactor = Math.cos((distanceFromWave / waveWidth) * Math.PI / 2); // Smooth cosine fade
                return darkOpacity + (maxOpacity - darkOpacity) * fadeFactor;
            } else {
                // Outside the wave: dark
                return darkOpacity;
            }
        };
        
        // Draw upper dot above first dot (dot 0)
        const firstDotX = startX;
        const upperDotY = eyeY - dotSize / 2 - dotSize - upperDotGap;
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = getDotOpacity(0);
        ctx.beginPath();
        ctx.roundRect(firstDotX, upperDotY, dotSize, dotSize, cornerRadius);
        ctx.fill();
        
        // Draw 4 dots in a single horizontal line (dots 1-4)
        for (let i = 0; i < 4; i++) {
            const dotX = startX + (dotSize + dotGap) * i;
            ctx.globalAlpha = getDotOpacity(i + 1); // dot 1, 2, 3, 4
            ctx.beginPath();
            ctx.roundRect(dotX, eyeY - dotSize / 2, dotSize, dotSize, cornerRadius);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1.0; // Reset alpha
        ctx.shadowBlur = 0;
        
        // Enhanced legs animation (when running)
        if (this.isOnGround) {
            const legOffset = Math.sin(this.animationFrame) * 5;
            const legWidth = 5;
            const legHeight = 8;
            
            // Left leg with gradient
            const legGradient = ctx.createLinearGradient(
                this.x + 3, this.y + this.height - 2,
                this.x + 3, this.y + this.height - 2 + legHeight + legOffset
            );
            legGradient.addColorStop(0, '#0038B3');
            legGradient.addColorStop(1, '#002080');
            ctx.fillStyle = legGradient;
            ctx.fillRect(this.x + 3, this.y + this.height - 2, legWidth, legHeight + legOffset);
            
            // Right leg with gradient
            ctx.fillStyle = legGradient;
            ctx.fillRect(this.x + this.width - 8, this.y + this.height - 2, legWidth, legHeight - legOffset);
        }
        
        // Enhanced jump trail effect
        if (this.isJumping && this.velocityY < 0) {
            const trailGradient = ctx.createRadialGradient(
                centerX, this.groundY,
                0,
                centerX, this.groundY,
                this.width * 0.5
            );
            trailGradient.addColorStop(0, 'rgba(0, 82, 255, 0.4)');
            trailGradient.addColorStop(1, 'rgba(0, 82, 255, 0)');
            ctx.fillStyle = trailGradient;
            ctx.beginPath();
            ctx.ellipse(centerX, this.groundY, this.width * 0.9, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Running particles effect
        if (this.isOnGround && Math.sin(this.animationFrame) > 0.5 && !this.rocketMode) {
            ctx.fillStyle = 'rgba(0, 82, 255, 0.6)';
            ctx.beginPath();
            ctx.arc(this.x - 5, this.groundY - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Rocket mode visual effects - enhanced
        if (this.rocketMode) {
            const rocketX = centerX;
            const rocketY = this.y + this.height;
            
            // Animated flame intensity based on animation frame
            const flamePulse = Math.sin(this.animationFrame * 0.5) * 0.3 + 0.7;
            const flameLength = 28 + Math.sin(this.animationFrame * 0.8) * 5;
            const flameWidth = 10 + Math.sin(this.animationFrame * 0.6) * 3;
            
            // Outer glow for flames
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#FF6B00';
            
            // Main central flame with multiple layers for depth
            const mainFlameGradient = ctx.createLinearGradient(rocketX, rocketY, rocketX, rocketY + flameLength);
            mainFlameGradient.addColorStop(0, `rgba(255, 107, 0, ${0.9 * flamePulse})`);
            mainFlameGradient.addColorStop(0.3, `rgba(255, 215, 0, ${0.8 * flamePulse})`);
            mainFlameGradient.addColorStop(0.6, `rgba(255, 255, 100, ${0.6 * flamePulse})`);
            mainFlameGradient.addColorStop(1, 'rgba(255, 107, 0, 0)');
            
            ctx.fillStyle = mainFlameGradient;
            ctx.beginPath();
            ctx.ellipse(rocketX, rocketY + flameLength / 2, flameWidth, flameLength, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Bright white core
            const coreGradient = ctx.createLinearGradient(rocketX, rocketY, rocketX, rocketY + flameLength * 0.7);
            coreGradient.addColorStop(0, `rgba(255, 255, 255, ${0.7 * flamePulse})`);
            coreGradient.addColorStop(0.5, `rgba(255, 255, 200, ${0.4 * flamePulse})`);
            coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = coreGradient;
            ctx.beginPath();
            ctx.ellipse(rocketX, rocketY + flameLength * 0.35, flameWidth * 0.4, flameLength * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Left side flame with animation
            const leftFlameSize = 5 + Math.sin(this.animationFrame * 0.7 + 1) * 2;
            const leftFlameGradient = ctx.createLinearGradient(rocketX - 8, rocketY, rocketX - 8, rocketY + 18);
            leftFlameGradient.addColorStop(0, `rgba(255, 215, 0, ${0.8 * flamePulse})`);
            leftFlameGradient.addColorStop(0.5, `rgba(255, 200, 0, ${0.6 * flamePulse})`);
            leftFlameGradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
            
            ctx.fillStyle = leftFlameGradient;
            ctx.beginPath();
            ctx.ellipse(rocketX - 8, rocketY + 12, leftFlameSize, 18, -0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Right side flame with animation
            const rightFlameSize = 5 + Math.sin(this.animationFrame * 0.7 + 2) * 2;
            const rightFlameGradient = ctx.createLinearGradient(rocketX + 8, rocketY, rocketX + 8, rocketY + 18);
            rightFlameGradient.addColorStop(0, `rgba(255, 215, 0, ${0.8 * flamePulse})`);
            rightFlameGradient.addColorStop(0.5, `rgba(255, 200, 0, ${0.6 * flamePulse})`);
            rightFlameGradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
            
            ctx.fillStyle = rightFlameGradient;
            ctx.beginPath();
            ctx.ellipse(rocketX + 8, rocketY + 12, rightFlameSize, 18, 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Particles/sparks flying out from flames
            for (let i = 0; i < 8; i++) {
                const particleAngle = (this.animationFrame * 0.2 + i * Math.PI / 4) % (Math.PI * 2);
                const particleDist = 15 + Math.sin(this.animationFrame * 0.3 + i) * 5;
                const particleX = rocketX + Math.cos(particleAngle) * particleDist;
                const particleY = rocketY + 15 + Math.sin(particleAngle) * particleDist;
                const particleSize = 2 + Math.sin(this.animationFrame * 0.5 + i) * 1;
                
                ctx.fillStyle = `rgba(255, ${200 + Math.sin(this.animationFrame + i) * 55}, 0, ${0.7 * flamePulse})`;
                ctx.beginPath();
                ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.shadowBlur = 0;
            
            // Enhanced rocket glow around player - pulsing effect
            const glowIntensity = 0.4 + Math.sin(this.animationFrame * 0.4) * 0.2;
            ctx.shadowBlur = 40;
            ctx.shadowColor = '#FF6B00';
            ctx.strokeStyle = `rgba(255, 107, 0, ${glowIntensity})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.roundRect(this.x - 4, this.y - 4, this.width + 8, this.height + 8, 10);
            ctx.stroke();
            
            // Inner glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#FFD700';
            ctx.strokeStyle = `rgba(255, 215, 0, ${glowIntensity * 0.6})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4, 8);
            ctx.stroke();
            
            ctx.shadowBlur = 0;
        }
        
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
     * Reset player to initial state
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     */
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.velocityY = 0;
        this.isJumping = false;
        this.isOnGround = true;
        this.animationFrame = 0;
        this.rocketMode = false;
        this.rocketThrust = 0;
    }
}
