// Particle system for visual effects

class Particle {
    constructor(x, y, type = 'collect') {
        this.x = x;
        this.y = y;
        this.type = type; // 'collect', 'jump', 'explosion'
        this.life = 1.0;
        this.decay = 0.02;
        
        if (type === 'collect') {
            this.vx = random(-2, 2);
            this.vy = random(-3, -1);
            this.size = random(3, 6);
            this.color = '#0052FF';
        } else if (type === 'jump') {
            this.vx = random(-1, 1);
            this.vy = random(-2, 0);
            this.size = random(2, 4);
            this.color = '#3D7FFF';
        } else if (type === 'rocket') {
            this.vx = random(-4, 4);
            this.vy = random(-5, -2);
            this.size = random(4, 8);
            this.color = random(0, 1) > 0.5 ? '#FF6B00' : '#FFD700';
            this.decay = 0.015;
        } else {
            this.vx = random(-3, 3);
            this.vy = random(-3, 3);
            this.size = random(4, 8);
            this.color = '#FF4444';
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2; // Gravity
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
    }

    emit(x, y, type, count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, type));
        }
    }

    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update();
            if (particle.isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(particle => {
            particle.draw(ctx);
        });
    }

    clear() {
        this.particles = [];
    }
}
