// Wallet connection and leaderboard management

class WalletManager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.isConnected = false;
        this.leaderboard = this.loadLeaderboard();
    }

    async connect() {
        try {
            // Check if ethers.js is loaded
            if (typeof ethers === 'undefined') {
                console.warn('ethers.js not loaded yet, wallet functionality disabled');
                alert('Wallet functionality is temporarily unavailable. The game will work without wallet connection.');
                return false;
            }
            
            if (typeof window.ethereum === 'undefined') {
                alert('Please install MetaMask or another Web3 wallet!');
                return false;
            }

            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                alert('Please connect your wallet!');
                return false;
            }

            this.address = accounts[0];
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();
            this.isConnected = true;

            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.address = accounts[0];
                    this.updateUI();
                }
            });

            this.updateUI();
            return true;
        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Failed to connect wallet: ' + error.message);
            return false;
        }
    }

    disconnect() {
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.isConnected = false;
        this.updateUI();
    }

    getShortAddress() {
        if (!this.address) return '';
        return `${this.address.slice(0, 6)}...${this.address.slice(-4)}`;
    }

    submitScore(score) {
        if (!this.isConnected || !this.address) {
            return false;
        }

        const entry = {
            address: this.address,
            score: Math.floor(score),
            timestamp: Date.now(),
            shortAddress: this.getShortAddress()
        };

        // Check if this address already has a score
        const existingIndex = this.leaderboard.findIndex(
            entry => entry.address.toLowerCase() === this.address.toLowerCase()
        );

        if (existingIndex !== -1) {
            // Update if new score is higher
            if (entry.score > this.leaderboard[existingIndex].score) {
                this.leaderboard[existingIndex] = entry;
            }
        } else {
            // Add new entry
            this.leaderboard.push(entry);
        }

        // Sort by score (descending)
        this.leaderboard.sort((a, b) => b.score - a.score);

        // Keep only top 100
        if (this.leaderboard.length > 100) {
            this.leaderboard = this.leaderboard.slice(0, 100);
        }

        this.saveLeaderboard();
        return true;
    }

    getLeaderboard(limit = 10) {
        return this.leaderboard.slice(0, limit);
    }

    getUserRank() {
        if (!this.isConnected || !this.address) return null;
        
        const index = this.leaderboard.findIndex(
            entry => entry.address.toLowerCase() === this.address.toLowerCase()
        );
        
        return index !== -1 ? index + 1 : null;
    }

    getUserScore() {
        if (!this.isConnected || !this.address) return null;
        
        const entry = this.leaderboard.find(
            entry => entry.address.toLowerCase() === this.address.toLowerCase()
        );
        
        return entry ? entry.score : null;
    }

    loadLeaderboard() {
        try {
            const stored = localStorage.getItem('baseRunnerLeaderboard');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            return [];
        }
    }

    saveLeaderboard() {
        try {
            localStorage.setItem('baseRunnerLeaderboard', JSON.stringify(this.leaderboard));
        } catch (error) {
            console.error('Error saving leaderboard:', error);
        }
    }

    updateUI() {
        // Top-right wallet UI
        const connectBtn = document.getElementById('wallet-connect-btn');
        const walletInfo = document.getElementById('wallet-info');
        const disconnectBtn = document.getElementById('wallet-disconnect-btn');

        // Menu wallet UI
        const connectMenuBtn = document.getElementById('wallet-connect-menu-btn');
        const walletInfoMenu = document.getElementById('wallet-info-menu');
        const walletAddressMenu = document.getElementById('wallet-address-menu');
        const disconnectMenuBtn = document.getElementById('wallet-disconnect-menu-btn');

        if (this.isConnected && this.address) {
            // Top-right UI
            if (connectBtn) connectBtn.style.display = 'none';
            if (walletInfo) {
                walletInfo.style.display = 'block';
                const addressSpan = walletInfo.querySelector('#wallet-address');
                if (addressSpan) {
                    addressSpan.textContent = this.getShortAddress();
                }
            }
            if (disconnectBtn) disconnectBtn.style.display = 'block';
            
            // Menu UI
            if (connectMenuBtn) connectMenuBtn.style.display = 'none';
            if (walletInfoMenu) {
                walletInfoMenu.style.display = 'flex';
                walletInfoMenu.style.flexDirection = 'column';
                walletInfoMenu.style.alignItems = 'center';
                walletInfoMenu.style.gap = '12px';
            }
            if (walletAddressMenu) {
                walletAddressMenu.textContent = this.getShortAddress();
            }
            if (disconnectMenuBtn) disconnectMenuBtn.style.display = 'block';
        } else {
            // Top-right UI
            if (connectBtn) connectBtn.style.display = 'block';
            if (walletInfo) walletInfo.style.display = 'none';
            if (disconnectBtn) disconnectBtn.style.display = 'none';
            
            // Menu UI
            if (connectMenuBtn) connectMenuBtn.style.display = 'block';
            if (walletInfoMenu) walletInfoMenu.style.display = 'none';
            if (disconnectMenuBtn) disconnectMenuBtn.style.display = 'none';
        }
    }
}
