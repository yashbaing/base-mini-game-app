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
            
            // Check if we're on mobile
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
                // Mobile wallet connection
                return await this.connectMobileWallet();
            } else {
                // Desktop wallet connection
                return await this.connectDesktopWallet();
            }
        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Failed to connect wallet: ' + error.message);
            return false;
        }
    }

    async connectDesktopWallet() {
        if (typeof window.ethereum === 'undefined') {
            const installChoice = confirm(
                'No Web3 wallet detected!\n\n' +
                'Would you like to:\n' +
                'OK - Install MetaMask\n' +
                'Cancel - Download other wallets'
            );
            
            if (installChoice) {
                window.open('https://metamask.io/download/', '_blank');
            } else {
                window.open('https://ethereum.org/en/wallets/find-wallet/', '_blank');
            }
            return false;
        }

        try {
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
            if (error.code === 4001) {
                alert('Please approve the connection request in your wallet.');
            } else {
                alert('Failed to connect wallet: ' + error.message);
            }
            return false;
        }
    }

    async connectMobileWallet() {
        // Check for injected ethereum provider (MetaMask Mobile, Trust Wallet, etc.)
        if (typeof window.ethereum !== 'undefined') {
            try {
                // Try to connect to injected provider
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });

                if (accounts.length > 0) {
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
                    alert('Wallet connected! Address: ' + this.getShortAddress());
                    return true;
                }
            } catch (error) {
                console.log('Injected provider error:', error);
                if (error.code === 4001) {
                    alert('Please approve the connection request in your wallet.');
                    return false;
                } else {
                    alert('Wallet connection error: ' + (error.message || 'Unknown error'));
                    return false;
                }
            }
        }

        // If no injected provider, show wallet chooser modal
        this.showMobileWalletChooser();
        return false;
    }

    showMobileWalletChooser() {
        // Show wallet selection modal UI
        const modal = document.getElementById('wallet-select-modal');
        if (!modal) {
            // Fallback to simple alert if modal doesn't exist
            this.showMobileWalletChooserFallback();
            return;
        }
        
        // Show modal
        modal.classList.remove('hidden');
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '30', 'important');
        modal.style.setProperty('visibility', 'visible', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        
        // Set up wallet option buttons - simple direct handlers
        const walletButtons = modal.querySelectorAll('.wallet-option-btn');
        walletButtons.forEach(btn => {
            // Make button interactive
            btn.style.pointerEvents = 'auto';
            btn.style.touchAction = 'manipulation';
            btn.style.cursor = 'pointer';
            btn.style.minHeight = '48px';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            
            // Get wallet type
            const walletType = btn.getAttribute('data-wallet');
            
            // Simple direct onclick handler
            btn.onclick = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                console.log('Wallet button clicked:', walletType);
                this.handleWalletSelection(walletType);
                return false;
            };
            
            // Also add touch handler for mobile
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Wallet button touched:', walletType);
                this.handleWalletSelection(walletType);
            }, { passive: false });
        });
        
        // Set up download options button
        const downloadBtn = document.getElementById('show-download-options');
        if (downloadBtn) {
            downloadBtn.style.pointerEvents = 'auto';
            downloadBtn.style.touchAction = 'manipulation';
            downloadBtn.style.minHeight = '48px';
            
            downloadBtn.onclick = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                this.showWalletDownloads();
                this.hideWalletModal();
                return false;
            };
            
            downloadBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showWalletDownloads();
                this.hideWalletModal();
            }, { passive: false });
        }
        
        // Set up cancel button
        const cancelBtn = document.getElementById('cancel-wallet-select');
        if (cancelBtn) {
            cancelBtn.style.pointerEvents = 'auto';
            cancelBtn.style.touchAction = 'manipulation';
            cancelBtn.style.minHeight = '48px';
            
            cancelBtn.onclick = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                this.hideWalletModal();
                return false;
            };
            
            cancelBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.hideWalletModal();
            }, { passive: false });
        }
    }

    hideWalletModal() {
        const modal = document.getElementById('wallet-select-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.setProperty('display', 'none', 'important');
            modal.style.setProperty('visibility', 'hidden', 'important');
            modal.style.setProperty('opacity', '0', 'important');
            modal.style.setProperty('z-index', '-1', 'important');
        }
    }

    async handleWalletSelection(walletType) {
        this.hideWalletModal();
        
        if (walletType === 'metamask') {
            await this.connectMetaMaskMobile();
        } else if (walletType === 'trust') {
            await this.connectTrustWallet();
        } else if (walletType === 'coinbase') {
            await this.connectCoinbaseWallet();
        } else if (walletType === 'browser') {
            await this.connectDesktopWallet();
        }
    }

    async connectMetaMaskMobile() {
        // First, try to detect if MetaMask is already installed
        if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
            try {
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });
                if (accounts.length > 0) {
                    this.address = accounts[0];
                    this.provider = new ethers.providers.Web3Provider(window.ethereum);
                    this.signer = this.provider.getSigner();
                    this.isConnected = true;
                    this.updateUI();
                    alert('Wallet connected! Address: ' + this.getShortAddress());
                    return true;
                }
            } catch (error) {
                console.log('MetaMask connection error:', error);
                if (error.code === 4001) {
                    alert('Please approve the connection request in MetaMask.');
                    return false;
                }
            }
        }
        
        // If MetaMask not detected, try deep link to open MetaMask Mobile app
        const dappUrl = encodeURIComponent(window.location.href);
        
        // Try MetaMask Universal Link (works if app is installed)
        const metamaskUrl = `https://metamask.app.link/dapp/${dappUrl}`;
        
        // Open download page in new tab first
        window.open('https://metamask.io/download/', '_blank');
        
        // Then try to open MetaMask app (will redirect to download if not installed)
        setTimeout(() => {
            window.location.href = metamaskUrl;
            
            // Fallback: try direct scheme
            setTimeout(() => {
                window.location.href = 'metamask://';
            }, 1000);
        }, 500);
        
        alert('Opening MetaMask...\n\nIf the app doesn\'t open, download MetaMask from the tab that just opened.');
        return false;
    }

    async connectTrustWallet() {
        // Check if Trust Wallet is injected
        if (typeof window.ethereum !== 'undefined' && window.ethereum.isTrust) {
            try {
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });
                if (accounts.length > 0) {
                    this.address = accounts[0];
                    this.provider = new ethers.providers.Web3Provider(window.ethereum);
                    this.signer = this.provider.getSigner();
                    this.isConnected = true;
                    this.updateUI();
                    alert('Wallet connected! Address: ' + this.getShortAddress());
                    return true;
                }
            } catch (error) {
                console.log('Trust Wallet connection error:', error);
                if (error.code === 4001) {
                    alert('Please approve the connection request in Trust Wallet.');
                    return false;
                }
            }
        }
        
        // Open download page and try deep link
        window.open('https://trustwallet.com/download', '_blank');
        
        setTimeout(() => {
            window.location.href = 'trust://';
        }, 500);
        
        alert('Opening Trust Wallet...\n\nIf the app doesn\'t open, download Trust Wallet from the tab that just opened.');
        return false;
    }

    async connectCoinbaseWallet() {
        // Check if Coinbase Wallet is injected
        if (typeof window.ethereum !== 'undefined' && window.ethereum.isCoinbaseWallet) {
            try {
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts'
                });
                if (accounts.length > 0) {
                    this.address = accounts[0];
                    this.provider = new ethers.providers.Web3Provider(window.ethereum);
                    this.signer = this.provider.getSigner();
                    this.isConnected = true;
                    this.updateUI();
                    alert('Wallet connected! Address: ' + this.getShortAddress());
                    return true;
                }
            } catch (error) {
                console.log('Coinbase Wallet connection error:', error);
                if (error.code === 4001) {
                    alert('Please approve the connection request in Coinbase Wallet.');
                    return false;
                }
            }
        }
        
        // Open download page and try deep link
        window.open('https://www.coinbase.com/wallet', '_blank');
        
        setTimeout(() => {
            window.location.href = 'cbwallet://';
        }, 500);
        
        alert('Opening Coinbase Wallet...\n\nIf the app doesn\'t open, download Coinbase Wallet from the tab that just opened.');
        return false;
    }

    showMobileWalletChooserFallback() {
        // Fallback for when modal doesn't exist - show options
        const message = 
            'Choose your wallet:\n\n' +
            '1 = MetaMask\n' +
            '2 = Trust Wallet\n' +
            '3 = Coinbase Wallet\n' +
            '4 = Browser Wallet\n' +
            '5 = Download Options\n\n' +
            'Enter 1-5:';
        
        const choice = prompt(message);
        
        if (choice === '1') {
            this.connectMetaMaskMobile();
        } else if (choice === '2') {
            this.connectTrustWallet();
        } else if (choice === '3') {
            this.connectCoinbaseWallet();
        } else if (choice === '4') {
            this.connectDesktopWallet();
        } else if (choice === '5') {
            this.showWalletDownloads();
        }
    }

    showWalletDownloads() {
        // Show wallet download options
        const message = 
            'Download a mobile wallet:\n\n' +
            'Choose your wallet:\n' +
            '1. MetaMask Mobile\n' +
            '2. Trust Wallet\n' +
            '3. Coinbase Wallet\n' +
            '4. See All Wallets\n\n' +
            'Enter 1-4:';
        
        const choice = prompt(message);
        
        if (choice === '1') {
            window.open('https://metamask.io/download/', '_blank');
        } else if (choice === '2') {
            window.open('https://trustwallet.com/download', '_blank');
        } else if (choice === '3') {
            window.open('https://www.coinbase.com/wallet', '_blank');
        } else if (choice === '4') {
            window.open('https://ethereum.org/en/wallets/find-wallet/', '_blank');
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
            if (typeof localStorage === 'undefined' || !localStorage) {
                return [];
            }
            const stored = localStorage.getItem('baseRunnerLeaderboard');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading leaderboard:', error);
            return [];
        }
    }

    saveLeaderboard() {
        try {
            if (typeof localStorage === 'undefined' || !localStorage) {
                console.warn('localStorage not available, leaderboard not saved');
                return;
            }
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
