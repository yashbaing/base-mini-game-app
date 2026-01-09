// Floating text for points display

class FloatingText {
    constructor(x, y, text, color = '#0052FF') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.decay = 0.02;
        this.velocityY = -2;
        this.scale = 1.0;
    }

    update() {
        this.y += this.velocityY;
        this.velocityY *= 0.95; // Slow down
        this.life -= this.decay;
        this.scale = 1 + (1 - this.life) * 0.5; // Scale up as it fades
    }

    draw(ctx) {
        if (this.life <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        
        // Text with glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, 0, 0);
        
        // Outline for better visibility
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeText(this.text, 0, 0);
        
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

class FloatingTextManager {
    constructor() {
        this.texts = [];
    }

    add(x, y, text, color = '#0052FF') {
        this.texts.push(new FloatingText(x, y, text, color));
    }

    update() {
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const text = this.texts[i];
            text.update();
            if (text.isDead()) {
                this.texts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.texts.forEach(text => {
            text.draw(ctx);
        });
    }

    clear() {
        this.texts = [];
    }
}
