// Input handling for keyboard and touch events

class InputHandler {
    constructor() {
        this.keys = {};
        this.jumpPressed = false;
        this.jumpJustPressed = false;
        
        // Bind event listeners
        this.setupKeyboardListeners();
        this.setupTouchListeners();
    }

    setupKeyboardListeners() {
        // Key down events
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            // Prevent default for game controls
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault();
                if (!this.jumpPressed) {
                    this.jumpJustPressed = true;
                    this.jumpPressed = true;
                }
            }
        });

        // Key up events
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault();
                this.jumpPressed = false;
            }
        });
    }

    setupTouchListeners() {
        // Prevent default touch behaviors that interfere with gameplay
        const preventDefaults = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
        
        // Touch start
        window.addEventListener('touchstart', (e) => {
            preventDefaults(e);
            if (!this.jumpPressed) {
                this.jumpJustPressed = true;
                this.jumpPressed = true;
            }
        }, { passive: false });

        // Touch end
        window.addEventListener('touchend', (e) => {
            preventDefaults(e);
            this.jumpPressed = false;
        }, { passive: false });
        
        // Touch move - prevent scrolling
        window.addEventListener('touchmove', (e) => {
            // Only prevent if touching the game canvas area
            if (e.target.closest('#game-canvas') || e.target.closest('#game-container')) {
                preventDefaults(e);
            }
        }, { passive: false });

        // Mouse click (for desktop testing)
        window.addEventListener('mousedown', (e) => {
            if (!this.jumpPressed) {
                this.jumpJustPressed = true;
                this.jumpPressed = true;
            }
        });

        window.addEventListener('mouseup', (e) => {
            this.jumpPressed = false;
        });
        
        // Prevent context menu on long press (mobile)
        window.addEventListener('contextmenu', (e) => {
            if (e.target.closest('#game-canvas') || e.target.closest('#game-container')) {
                e.preventDefault();
            }
        });
    }

    /**
     * Check if jump was just pressed (for single jump detection)
     * @returns {boolean} True if jump was just pressed this frame
     */
    isJumpJustPressed() {
        if (this.jumpJustPressed) {
            this.jumpJustPressed = false;
            return true;
        }
        return false;
    }

    /**
     * Check if jump is currently held
     * @returns {boolean} True if jump is held
     */
    isJumpHeld() {
        return this.jumpPressed;
    }
    
    /**
     * Check if jump is currently pressed (alias for isJumpHeld for clarity)
     * @returns {boolean} True if jump is pressed
     */
    isJumpPressed() {
        return this.jumpPressed;
    }

    /**
     * Check if a specific key is pressed
     * @param {string} keyCode - Key code to check
     * @returns {boolean} True if key is pressed
     */
    isKeyPressed(keyCode) {
        return this.keys[keyCode] || false;
    }

    /**
     * Reset input state (useful for game restarts)
     */
    reset() {
        this.keys = {};
        this.jumpPressed = false;
        this.jumpJustPressed = false;
    }
}
