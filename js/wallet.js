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
            
            // Log available providers for debugging
            console.log('Available wallet providers:', {
                ethereum: typeof window.ethereum !== 'undefined',
                okxwallet: typeof window.okxwallet !== 'undefined',
                web3: typeof window.web3 !== 'undefined',
                isMobile: isMobile
            });
            
            if (typeof window.okxwallet !== 'undefined') {
                console.log('OKX Wallet detected:', window.okxwallet);
            }
            
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
        // Check for multiple wallet providers (OKX, MetaMask, etc.)
        let walletProvider = null;
        let walletName = '';
        
        // Check for OKX Wallet first
        if (typeof window.okxwallet !== 'undefined') {
            walletProvider = window.okxwallet.ethereum || window.okxwallet;
            walletName = 'OKX Wallet';
        }
        // Check for MetaMask
        else if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
            walletProvider = window.ethereum;
            walletName = 'MetaMask';
        }
        // Check for any ethereum provider
        else if (typeof window.ethereum !== 'undefined') {
            walletProvider = window.ethereum;
            walletName = 'Wallet';
        }
        
        if (!walletProvider) {
            const installChoice = confirm(
                'No Web3 wallet detected!\n\n' +
                'Would you like to:\n' +
                'OK - Install MetaMask\n' +
                'Cancel - Download other wallets (OKX, Trust, Coinbase, etc.)'
            );
            
            if (installChoice) {
                window.open('https://metamask.io/download/', '_blank');
            } else {
                window.open('https://ethereum.org/en/wallets/find-wallet/', '_blank');
            }
            return false;
        }

        try {
            console.log('Connecting to:', walletName);
            // Request account access
            const accounts = await walletProvider.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                alert('Please connect your wallet!');
                return false;
            }

            this.address = accounts[0];
            this.provider = new ethers.providers.Web3Provider(walletProvider);
            this.signer = this.provider.getSigner();
            this.isConnected = true;

            // Listen for account changes
            if (walletProvider.on) {
                walletProvider.on('accountsChanged', (accounts) => {
                    if (accounts.length === 0) {
                        this.disconnect();
                    } else {
                        this.address = accounts[0];
                        this.updateUI();
                    }
                });
            }

            this.updateUI();
            alert(walletName + ' connected! Address: ' + this.getShortAddress());
            return true;
        } catch (error) {
            if (error.code === 4001) {
                alert('Please approve the connection request in your ' + walletName + '.');
            } else {
                alert('Failed to connect ' + walletName + ': ' + error.message);
            }
            return false;
        }
    }

    async connectMobileWallet() {
        // Check for any injected ethereum provider (OKX Wallet, MetaMask, Trust Wallet, etc.)
        // Try multiple wallet providers - check ALL possible providers first
        let walletProvider = null;
        let walletName = '';
        
        console.log('Detecting wallet providers...');
        console.log('window.okxwallet:', typeof window.okxwallet !== 'undefined' ? 'exists' : 'undefined');
        console.log('window.ethereum:', typeof window.ethereum !== 'undefined' ? 'exists' : 'undefined');
        
        // Check for window.ethereum.providers (multiple wallets installed)
        if (typeof window.ethereum !== 'undefined' && window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
            console.log('Multiple wallet providers detected:', window.ethereum.providers.length);
            // Try OKX Wallet first if available
            for (const provider of window.ethereum.providers) {
                if (provider.isOKExWallet || provider.isOkxWallet || 
                    (provider.constructor && provider.constructor.name && provider.constructor.name.toLowerCase().includes('okx'))) {
                    walletProvider = provider;
                    walletName = 'OKX Wallet';
                    console.log('Found OKX Wallet in providers array');
                    break;
                }
            }
            // If OKX not found, try any other provider
            if (!walletProvider && window.ethereum.providers.length > 0) {
                walletProvider = window.ethereum.providers[0];
                walletName = 'Wallet';
                console.log('Using first available provider from providers array');
            }
        }
        
        // Check for OKX Wallet (multiple ways it might be injected)
        if (!walletProvider && typeof window.okxwallet !== 'undefined') {
            console.log('Checking window.okxwallet...');
            if (window.okxwallet.ethereum && typeof window.okxwallet.ethereum.request === 'function') {
                walletProvider = window.okxwallet.ethereum;
                walletName = 'OKX Wallet';
                console.log('Found OKX Wallet via okxwallet.ethereum');
            } else if (window.okxwallet && typeof window.okxwallet.request === 'function') {
                walletProvider = window.okxwallet;
                walletName = 'OKX Wallet';
                console.log('Found OKX Wallet via direct okxwallet');
            }
        }
        
        // Check window.ethereum for various wallets (if not already found)
        if (!walletProvider && typeof window.ethereum !== 'undefined') {
            console.log('Checking window.ethereum...');
            walletProvider = window.ethereum;
            
            // Detect specific wallet type by checking various properties
            if (window.ethereum.isOKExWallet || window.ethereum.isOkxWallet || 
                (window.ethereum._state && window.ethereum._state.isOkx) ||
                (window.ethereum.constructor && window.ethereum.constructor.name && 
                 window.ethereum.constructor.name.toLowerCase().includes('okx'))) {
                walletName = 'OKX Wallet';
                console.log('Detected OKX Wallet via window.ethereum flags');
            } else if (window.ethereum.isTrust || (window.ethereum._state && window.ethereum._state.isTrust)) {
                walletName = 'Trust Wallet';
                console.log('Detected Trust Wallet');
            } else if (window.ethereum.isCoinbaseWallet || (window.ethereum._state && window.ethereum._state.isCoinbaseWallet)) {
                walletName = 'Coinbase Wallet';
                console.log('Detected Coinbase Wallet');
            } else if (window.ethereum.isMetaMask || (window.ethereum._state && window.ethereum._state.isMetaMask)) {
                walletName = 'MetaMask';
                console.log('Detected MetaMask');
            } else {
                // Try window.ethereum anyway - it might be OKX or another wallet
                walletName = 'Wallet'; // Generic wallet - try to connect anyway
                console.log('Using generic wallet provider');
            }
        }
        
        // If we found a provider, try to connect
        if (walletProvider) {
            try {
                console.log('Attempting to connect to:', walletName, walletProvider);
                // Try to connect to the provider
                const accounts = await walletProvider.request({
                    method: 'eth_requestAccounts'
                });

                if (accounts && accounts.length > 0) {
                    console.log('Connected! Account:', accounts[0]);
                    this.address = accounts[0];
                    this.provider = new ethers.providers.Web3Provider(walletProvider);
                    this.signer = this.provider.getSigner();
                    this.isConnected = true;

                    // Listen for account changes
                    if (walletProvider.on && typeof walletProvider.on === 'function') {
                        walletProvider.on('accountsChanged', (accounts) => {
                            if (accounts.length === 0) {
                                this.disconnect();
                            } else {
                                this.address = accounts[0];
                                this.updateUI();
                            }
                        });
                    }

                    this.updateUI();
                    alert(walletName + ' connected! Address: ' + this.getShortAddress());
                    return true;
                } else {
                    console.log('No accounts returned from wallet');
                    alert('No accounts found. Please unlock your wallet and try again.');
                }
            } catch (error) {
                console.log('Wallet provider connection error:', error);
                console.log('Error code:', error.code);
                console.log('Error message:', error.message);
                console.log('Error stack:', error.stack);
                
                if (error.code === 4001) {
                    alert('Please approve the connection request in your ' + walletName + '.');
                    return false;
                } else {
                    // Show error with more details
                    const errorMsg = error.message || 'Unknown error';
                    alert('Wallet connection error: ' + errorMsg + 
                          '\n\nError code: ' + (error.code || 'N/A') +
                          '\n\nPlease make sure your wallet is unlocked and try again.');
                    // Continue to show wallet selection modal as fallback
                }
            }
        }

        // If no provider found or connection failed, show wallet chooser modal
        console.log('No wallet provider found or connection failed, showing wallet selection modal');
        console.log('Available providers:', {
            ethereum: typeof window.ethereum !== 'undefined',
            okxwallet: typeof window.okxwallet !== 'undefined',
            web3: typeof window.web3 !== 'undefined',
            providers: window.ethereum && window.ethereum.providers ? window.ethereum.providers.length : 0
        });
        
        // Show helpful message first
        if (typeof window.ethereum === 'undefined' && typeof window.okxwallet === 'undefined') {
            alert('No wallet detected!\n\n' +
                  'To connect OKX Wallet on mobile:\n\n' +
                  '1. Open OKX Wallet app\n' +
                  '2. Use OKX Wallet\'s built-in browser (DApp browser)\n' +
                  '3. Navigate to this page in OKX Wallet browser\n' +
                  '4. Then click "Connect Wallet" again\n\n' +
                  'Opening wallet selection options...');
        }
        
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
        
        // Check if OKX Wallet app is installed (by checking user agent or other indicators)
        const okxInstructions = document.getElementById('okx-instructions');
        if (okxInstructions) {
            // Show OKX instructions if not in OKX Wallet browser
            const isInOkxBrowser = navigator.userAgent.includes('OKX') || 
                                   window.location.href.includes('okx') ||
                                   typeof window.okxwallet !== 'undefined';
            if (!isInOkxBrowser) {
                okxInstructions.style.display = 'block';
            } else {
                okxInstructions.style.display = 'none';
            }
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
        
        if (walletType === 'okx') {
            await this.connectOKXWallet();
        } else if (walletType === 'metamask') {
            await this.connectMetaMaskMobile();
        } else if (walletType === 'trust') {
            await this.connectTrustWallet();
        } else if (walletType === 'coinbase') {
            await this.connectCoinbaseWallet();
        } else if (walletType === 'browser') {
            await this.connectDesktopWallet();
        }
    }
    
    async connectOKXWallet() {
        console.log('Attempting to connect OKX Wallet...');
        console.log('window.okxwallet:', typeof window.okxwallet !== 'undefined' ? window.okxwallet : 'undefined');
        console.log('window.ethereum:', typeof window.ethereum !== 'undefined' ? window.ethereum : 'undefined');
        console.log('window.ethereum.providers:', window.ethereum && window.ethereum.providers ? window.ethereum.providers.length : 'undefined');
        
        // Check for OKX Wallet provider in ALL possible ways
        let provider = null;
        let providerName = '';
        
        // Method 1: Check window.ethereum.providers array (multiple wallets)
        if (typeof window.ethereum !== 'undefined' && window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
            for (const prov of window.ethereum.providers) {
                if (prov.isOKExWallet || prov.isOkxWallet || 
                    (prov.constructor && prov.constructor.name && prov.constructor.name.toLowerCase().includes('okx'))) {
                    provider = prov;
                    providerName = 'OKX Wallet (from providers array)';
                    console.log('Found OKX Wallet in providers array');
                    break;
                }
            }
        }
        
        // Method 2: Check window.okxwallet.ethereum
        if (!provider && typeof window.okxwallet !== 'undefined' && window.okxwallet.ethereum) {
            provider = window.okxwallet.ethereum;
            providerName = 'OKX Wallet (via okxwallet.ethereum)';
            console.log('Found OKX Wallet via okxwallet.ethereum');
        }
        // Method 3: Check window.okxwallet directly
        else if (!provider && typeof window.okxwallet !== 'undefined' && typeof window.okxwallet.request === 'function') {
            provider = window.okxwallet;
            providerName = 'OKX Wallet (direct)';
            console.log('Found OKX Wallet via direct okxwallet');
        }
        // Method 4: Check window.ethereum with OKX flags
        else if (!provider && typeof window.ethereum !== 'undefined') {
            if (window.ethereum.isOKExWallet || window.ethereum.isOkxWallet) {
                provider = window.ethereum;
                providerName = 'OKX Wallet (via ethereum flags)';
                console.log('Found OKX Wallet via ethereum flags');
            } else if (window.ethereum.constructor && window.ethereum.constructor.name && 
                      window.ethereum.constructor.name.toLowerCase().includes('okx')) {
                provider = window.ethereum;
                providerName = 'OKX Wallet (via constructor name)';
                console.log('Found OKX Wallet via constructor name');
            } else if (window.ethereum._state && window.ethereum._state.isOkx) {
                provider = window.ethereum;
                providerName = 'OKX Wallet (via state)';
                console.log('Found OKX Wallet via state');
            } else {
                // Last resort: try window.ethereum anyway (might be OKX without flags)
                provider = window.ethereum;
                providerName = 'Wallet (generic - trying anyway)';
                console.log('Trying generic window.ethereum as fallback');
            }
        }
        
        // If we found a provider, try to connect
        if (provider) {
            try {
                console.log('Found provider:', providerName, provider);
                const accounts = await provider.request({
                    method: 'eth_requestAccounts'
                });
                
                if (accounts && accounts.length > 0) {
                    console.log('Successfully connected! Account:', accounts[0]);
                    this.address = accounts[0];
                    this.provider = new ethers.providers.Web3Provider(provider);
                    this.signer = this.provider.getSigner();
                    this.isConnected = true;
                    
                    // Listen for account changes
                    if (provider.on && typeof provider.on === 'function') {
                        provider.on('accountsChanged', (accounts) => {
                            if (accounts.length === 0) {
                                this.disconnect();
                            } else {
                                this.address = accounts[0];
                                this.updateUI();
                            }
                        });
                    }
                    
                    this.updateUI();
                    alert('OKX Wallet connected! Address: ' + this.getShortAddress());
                    return true;
                } else {
                    alert('No accounts found. Please unlock your OKX Wallet and try again.');
                    return false;
                }
            } catch (error) {
                console.log('OKX Wallet connection error:', error);
                console.log('Error details:', {
                    code: error.code,
                    message: error.message,
                    name: error.name,
                    stack: error.stack
                });
                
                if (error.code === 4001) {
                    alert('Please approve the connection request in OKX Wallet.');
                    return false;
                } else {
                    alert('OKX Wallet connection error: ' + (error.message || 'Unknown error') + 
                          '\n\nPlease make sure OKX Wallet is unlocked and try again.');
                    return false;
                }
            }
        }
        
        // If OKX Wallet not detected, provide instructions
        // For OKX Wallet on mobile, users MUST open the website from within OKX Wallet app
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            const currentUrl = window.location.href;
            const message = 
                '⚠️ OKX Wallet not detected!\n\n' +
                'To connect OKX Wallet on mobile, you MUST:\n\n' +
                '1. Open OKX Wallet app on your phone\n' +
                '2. Tap on "DApp" or "Browser" in OKX Wallet\n' +
                '3. Enter or paste this URL:\n' +
                currentUrl + '\n\n' +
                '4. Then click "Connect Wallet" again\n\n' +
                '❌ OKX Wallet does NOT work in regular mobile browsers (Chrome, Safari, etc.)\n' +
                '✅ You MUST use OKX Wallet\'s built-in DApp browser\n\n' +
                'Would you like to:\n' +
                'OK - Open OKX Wallet download page\n' +
                'Cancel - Copy URL to open in OKX Wallet';
            
            const choice = confirm(message);
            if (choice) {
                window.open('https://www.okx.com/web3', '_blank');
            } else {
                // Try to copy URL to clipboard for user to paste in OKX Wallet
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(currentUrl);
                        alert('URL copied to clipboard!\n\n' +
                              'Now:\n' +
                              '1. Open OKX Wallet app\n' +
                              '2. Go to DApp browser\n' +
                              '3. Paste the URL and open it\n' +
                              '4. Click "Connect Wallet"');
                    } else {
                        alert('Please copy this URL manually:\n\n' + currentUrl + '\n\n' +
                              'Then open it in OKX Wallet\'s DApp browser.');
                    }
                } catch (e) {
                    alert('Please copy this URL manually:\n\n' + currentUrl + '\n\n' +
                          'Then open it in OKX Wallet\'s DApp browser.');
                }
            }
        } else {
            // Desktop instructions
            const message = 
                'OKX Wallet not detected!\n\n' +
                'Please install OKX Wallet extension for your browser.\n\n' +
                'Would you like to open the download page?';
            
            const choice = confirm(message);
            if (choice) {
                window.open('https://www.okx.com/web3', '_blank');
            }
        }
        
        return false;
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
            '1 = OKX Wallet\n' +
            '2 = MetaMask\n' +
            '3 = Trust Wallet\n' +
            '4 = Coinbase Wallet\n' +
            '5 = Browser Wallet\n' +
            '6 = Download Options\n\n' +
            'Enter 1-6:';
        
        const choice = prompt(message);
        
        if (choice === '1') {
            this.connectOKXWallet();
        } else if (choice === '2') {
            this.connectMetaMaskMobile();
        } else if (choice === '3') {
            this.connectTrustWallet();
        } else if (choice === '4') {
            this.connectCoinbaseWallet();
        } else if (choice === '5') {
            this.connectDesktopWallet();
        } else if (choice === '6') {
            this.showWalletDownloads();
        }
    }

    showWalletDownloads() {
        // Show wallet download options
        const message = 
            'Download a mobile wallet:\n\n' +
            'Choose your wallet:\n' +
            '1. OKX Wallet\n' +
            '2. MetaMask Mobile\n' +
            '3. Trust Wallet\n' +
            '4. Coinbase Wallet\n' +
            '5. See All Wallets\n\n' +
            'Enter 1-5:';
        
        const choice = prompt(message);
        
        if (choice === '1') {
            window.open('https://www.okx.com/web3', '_blank');
        } else if (choice === '2') {
            window.open('https://metamask.io/download/', '_blank');
        } else if (choice === '3') {
            window.open('https://trustwallet.com/download', '_blank');
        } else if (choice === '4') {
            window.open('https://www.coinbase.com/wallet', '_blank');
        } else if (choice === '5') {
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
