// Wallet connection and leaderboard management

class WalletManager {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.address = null;
        this.isConnected = false;
        this.leaderboard = this.loadLeaderboard();
        
        // Payment configuration
        // USDC on Base network: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        // Payment amount: 0.00001 USDC (10 units with 6 decimals)
        // Note: paymentAmount is initialized lazily when needed (after ethers.js loads)
        this._paymentAmount = null; // Will be calculated when needed
        this.usdcContractAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base network
        // IMPORTANT: Set your payment recipient address here (your wallet address to receive payments)
        // Replace '0x0000000000000000000000000000000000000000' with your actual wallet address
        this.paymentRecipient = '0x0000000000000000000000000000000000000000'; // TODO: Set your payment recipient address
        this.baseNetworkChainId = 8453; // Base network chain ID (Base mainnet)
    }
    
    // Get payment amount (lazy initialization)
    getPaymentAmount() {
        if (this._paymentAmount === null) {
            if (typeof ethers === 'undefined' || !ethers.utils) {
                console.error('ethers.js not loaded yet! Cannot calculate payment amount.');
                return null;
            }
            this._paymentAmount = ethers.utils.parseUnits('0.00001', 6); // 0.00001 USDC (6 decimals)
        }
        return this._paymentAmount;
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

    // Check if user has paid the entry fee
    async hasPaidEntryFee() {
        if (!this.isConnected || !this.address) {
            return false;
        }

        // Check localStorage first (faster)
        try {
            const paymentKey = `baseRunnerPayment_${this.address.toLowerCase()}`;
            const storedPayment = localStorage.getItem(paymentKey);
            if (storedPayment) {
                const paymentData = JSON.parse(storedPayment);
                // Check if payment is recent (within last 24 hours) or if it's a confirmed transaction
                if (paymentData.txHash && paymentData.timestamp) {
                    const hoursSincePayment = (Date.now() - paymentData.timestamp) / (1000 * 60 * 60);
                    if (hoursSincePayment < 24) {
                        // Verify on-chain if possible
                        try {
                            const isValid = await this.verifyPaymentOnChain(paymentData.txHash);
                            if (isValid) {
                                return true;
                            }
                        } catch (e) {
                            console.log('Could not verify payment on-chain, using cached result');
                            // If verification fails, still trust the cached payment for now
                            return true;
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Error checking cached payment:', e);
        }

        // Check on-chain (slower but more reliable)
        try {
            return await this.verifyPaymentOnChain();
        } catch (e) {
            console.error('Error verifying payment on-chain:', e);
            return false;
        }
    }

    // Verify payment transaction on-chain
    async verifyPaymentOnChain(txHash = null) {
        if (!this.provider || !this.address) {
            return false;
        }

        try {
            // Check USDC balance for payment recipient (if we have access to that address)
            // Or check transaction history for this address
            
            // Simple approach: Check if user has approved or sent USDC
            // For now, we'll check for recent transactions to the payment recipient
            
            if (txHash) {
                // Verify specific transaction
                try {
                    const tx = await this.provider.getTransactionReceipt(txHash);
                    if (tx && tx.status === 1) {
                        // Transaction confirmed
                        return true;
                    }
                } catch (e) {
                    console.error('Error checking transaction:', e);
                }
            }

            // Check current USDC balance (if user sent, recipient should have it)
            // For now, we'll rely on the payment transaction itself
            return false;
        } catch (e) {
            console.error('Error verifying payment on-chain:', e);
            return false;
        }
    }

    // Process payment transaction
    async payEntryFee() {
        if (!this.isConnected || !this.signer) {
            alert('Please connect your wallet first!');
            return { success: false, error: 'Wallet not connected' };
        }

        if (!this.provider) {
            alert('Wallet provider not available. Please reconnect your wallet.');
            return { success: false, error: 'Provider not available' };
        }
        
        // Check if ethers.js is loaded
        if (typeof ethers === 'undefined') {
            alert('ethers.js not loaded! Please refresh the page.');
            return { success: false, error: 'ethers.js not loaded' };
        }
        
        // Get payment amount (will initialize if needed)
        const paymentAmount = this.getPaymentAmount();
        if (!paymentAmount) {
            alert('Payment system error: Cannot calculate payment amount. Please refresh the page.');
            return { success: false, error: 'Payment amount calculation failed' };
        }

        try {
            // Check if user is on Base network
            const network = await this.provider.getNetwork();
            if (network.chainId !== this.baseNetworkChainId) {
                const switchNetwork = confirm(
                    'You are not on Base network!\n\n' +
                    'Current network: ' + network.name + ' (Chain ID: ' + network.chainId + ')\n' +
                    'Required: Base (Chain ID: ' + this.baseNetworkChainId + ')\n\n' +
                    'Would you like to switch to Base network?\n\n' +
                    'OK - Switch to Base network\n' +
                    'Cancel - Cancel payment'
                );

                if (switchNetwork) {
                    try {
                        // Try to switch network
                        await this.switchToBaseNetwork();
                        // Re-check network after switch
                        const newNetwork = await this.provider.getNetwork();
                        if (newNetwork.chainId !== this.baseNetworkChainId) {
                            alert('Failed to switch to Base network. Please switch manually in your wallet.');
                            return { success: false, error: 'Network switch failed' };
                        }
                    } catch (switchError) {
                        console.error('Network switch error:', switchError);
                        alert('Failed to switch network. Please switch to Base network manually in your wallet and try again.');
                        return { success: false, error: 'Network switch failed' };
                    }
                } else {
                    return { success: false, error: 'User cancelled network switch' };
                }
            }

            // Check USDC balance
            const usdcContract = new ethers.Contract(
                this.usdcContractAddress,
                [
                    'function balanceOf(address account) view returns (uint256)',
                    'function transfer(address to, uint256 amount) returns (bool)',
                    'function decimals() view returns (uint8)'
                ],
                this.signer
            );

            const balance = await usdcContract.balanceOf(this.address);
            const paymentAmount = this.getPaymentAmount();
            if (!paymentAmount) {
                alert('Payment system error: ethers.js not loaded. Please refresh the page.');
                return { success: false, error: 'ethers.js not loaded' };
            }
            
            if (balance.lt(paymentAmount)) {
                alert('Insufficient USDC balance!\n\n' +
                      'Required: 0.00001 USDC\n' +
                      'Your balance: ' + ethers.utils.formatUnits(balance, 6) + ' USDC\n\n' +
                      'Please add USDC to your wallet and try again.');
                return { success: false, error: 'Insufficient balance' };
            }

            // Check if payment recipient is set
            if (!this.paymentRecipient || this.paymentRecipient === '0x0000000000000000000000000000000000000000') {
                alert('Payment recipient not configured! Please contact game administrator.');
                return { success: false, error: 'Payment recipient not set' };
            }

            // Show payment confirmation
            const confirmPayment = confirm(
                'Pay Entry Fee\n\n' +
                'Amount: 0.00001 USDC\n' +
                'Network: Base\n\n' +
                'This will initiate a blockchain transaction.\n' +
                'Gas fees may apply.\n\n' +
                'OK - Proceed with payment\n' +
                'Cancel - Cancel'
            );

            if (!confirmPayment) {
                return { success: false, error: 'User cancelled payment' };
            }

            // Update payment UI
            this.updatePaymentUI('processing');

            // Execute USDC transfer
            console.log('Initiating USDC transfer...');
            console.log('Payment details:', {
                recipient: this.paymentRecipient,
                amount: paymentAmount.toString(),
                amountFormatted: ethers.utils.formatUnits(paymentAmount, 6) + ' USDC',
                from: this.address,
                contract: this.usdcContractAddress
            });
            
            // Check if signer is properly configured
            if (!this.signer) {
                throw new Error('Signer not available. Please reconnect your wallet.');
            }
            
            // Verify signer address matches connected address
            const signerAddress = await this.signer.getAddress();
            console.log('Signer address:', signerAddress);
            console.log('Connected address:', this.address);
            
            if (signerAddress.toLowerCase() !== this.address.toLowerCase()) {
                throw new Error('Signer address mismatch. Please reconnect your wallet.');
            }
            
            // Create and send transaction - this should trigger wallet prompt
            console.log('Preparing USDC transfer transaction...');
            console.log('This should trigger your wallet to sign the transaction...');
            
            // Declare txResponse and receipt in outer scope
            let txResponse;
            let receipt;
            
            try {
                // Method 1: Use populateTransaction and sendTransaction (explicit method - should definitely prompt)
                console.log('Preparing transaction data...');
                
                try {
                    // First, populate the transaction to see what it will look like
                    const populatedTx = await usdcContract.populateTransaction.transfer(
                        this.paymentRecipient, 
                        paymentAmount
                    );
                    console.log('Populated transaction:', populatedTx);
                    console.log('Transaction data:', {
                        to: populatedTx.to,
                        data: populatedTx.data,
                        gasLimit: populatedTx.gasLimit?.toString(),
                        value: populatedTx.value?.toString()
                    });
                    
                    // Send using signer's sendTransaction - this should definitely prompt wallet
                    console.log('Sending transaction via signer (wallet should prompt now)...');
                    console.log('⚠️ CHECK YOUR WALLET NOW - A TRANSACTION SIGNATURE REQUEST SHOULD APPEAR!');
                    txResponse = await this.signer.sendTransaction(populatedTx);
                    
                    console.log('Transaction sent via signer, response:', txResponse);
                } catch (populateError) {
                    console.log('Populate/sendTransaction method failed, trying direct contract call...', populateError);
                    console.error('Populate error:', populateError);
                    
                    // Fallback: Use direct contract call (should also prompt)
                    console.log('Trying direct contract transfer call...');
                    console.log('⚠️ CHECK YOUR WALLET NOW - A TRANSACTION SIGNATURE REQUEST SHOULD APPEAR!');
                    txResponse = await usdcContract.transfer(this.paymentRecipient, paymentAmount);
                    console.log('Direct contract call successful, response:', txResponse);
                }
                
                // Log transaction details
                console.log('Transaction object:', {
                    hash: txResponse.hash,
                    from: txResponse.from,
                    to: txResponse.to,
                    value: txResponse.value?.toString(),
                    gasLimit: txResponse.gasLimit?.toString(),
                    gasPrice: txResponse.gasPrice?.toString(),
                    nonce: txResponse.nonce,
                    data: txResponse.data
                });
                
                // Check if we got a hash (transaction was sent)
                if (!txResponse.hash) {
                    console.error('No transaction hash received! Wallet may not have prompted.');
                    throw new Error('Transaction failed to generate hash. Wallet may not have prompted for signature. Please check your wallet.');
                }
                
                console.log('Transaction sent successfully, hash:', txResponse.hash);
                this.updatePaymentUI('confirming', txResponse.hash);

                // Wait for transaction confirmation
                console.log('Waiting for transaction confirmation (this may take a moment)...');
                receipt = await txResponse.wait();
                console.log('Transaction confirmed!', receipt);
                
            } catch (txError) {
                console.error('Transaction error:', txError);
                console.error('Error code:', txError.code);
                console.error('Error message:', txError.message);
                console.error('Error reason:', txError.reason);
                console.error('Error data:', txError.data);
                console.error('Full error object:', txError);
                
                // If error is 4001, user rejected the transaction
                if (txError.code === 4001 || 
                    txError.code === 'ACTION_REJECTED' ||
                    txError.message?.includes('User rejected') || 
                    txError.message?.includes('user rejected') ||
                    txError.message?.includes('rejected') ||
                    txError.message?.includes('denied')) {
                    throw new Error('Transaction rejected by user');
                }
                
                // Check if it's a network/connection error
                if (txError.code === 'NETWORK_ERROR' || txError.message?.includes('network')) {
                    throw new Error('Network error. Please check your connection and try again.');
                }
                
                // Re-throw to be caught by outer catch
                throw txError;
            }

            if (receipt && receipt.status === 1) {
                // Payment successful
                // Store payment in localStorage
                const paymentKey = `baseRunnerPayment_${this.address.toLowerCase()}`;
                const paymentData = {
                    txHash: txResponse.hash,
                    timestamp: Date.now(),
                    amount: paymentAmount.toString(),
                    recipient: this.paymentRecipient
                };
                localStorage.setItem(paymentKey, JSON.stringify(paymentData));

                this.updatePaymentUI('success', txResponse.hash);
                return { success: true, txHash: txResponse.hash, receipt: receipt };
            } else {
                this.updatePaymentUI('error');
                alert('Transaction failed! Please try again.');
                return { success: false, error: 'Transaction failed' };
            }

        } catch (error) {
            console.error('Payment error:', error);
            this.updatePaymentUI('error');
            
            let errorMessage = 'Payment failed: ';
            if (error.code === 4001) {
                errorMessage = 'Transaction rejected by user.';
            } else if (error.message) {
                errorMessage += error.message;
            } else {
                errorMessage += 'Unknown error occurred.';
            }
            
            alert(errorMessage);
            return { success: false, error: errorMessage };
        }
    }

    // Switch to Base network
    async switchToBaseNetwork() {
        if (!window.ethereum) {
            throw new Error('No wallet provider found');
        }

        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: `0x${this.baseNetworkChainId.toString(16)}` }],
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: `0x${this.baseNetworkChainId.toString(16)}`,
                            chainName: 'Base',
                            nativeCurrency: {
                                name: 'ETH',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            rpcUrls: ['https://mainnet.base.org'],
                            blockExplorerUrls: ['https://basescan.org']
                        }],
                    });
                } catch (addError) {
                    throw new Error('Failed to add Base network to wallet');
                }
            } else {
                throw switchError;
            }
        }
    }

    // Update payment UI status
    updatePaymentUI(status, txHash = null) {
        const paymentModal = document.getElementById('payment-modal');
        const paymentStatus = document.getElementById('payment-status');
        const paymentButton = document.getElementById('payment-button');
        const paymentTxHash = document.getElementById('payment-tx-hash');

        if (!paymentModal) return;

        if (status === 'ready') {
            if (paymentStatus) paymentStatus.textContent = 'Ready to pay';
            if (paymentButton) {
                paymentButton.disabled = false;
                paymentButton.textContent = 'Pay 0.00001 USDC';
            }
            if (paymentTxHash) {
                paymentTxHash.style.display = 'none';
                paymentTxHash.textContent = '';
            }
        } else if (status === 'processing') {
            if (paymentStatus) paymentStatus.textContent = 'Processing payment...';
            if (paymentButton) paymentButton.disabled = true;
            if (paymentButton) paymentButton.textContent = 'Processing...';
        } else if (status === 'confirming') {
            if (paymentStatus) paymentStatus.textContent = 'Confirming transaction...';
            if (paymentButton) paymentButton.disabled = true;
            if (paymentButton) paymentButton.textContent = 'Confirming...';
            if (paymentTxHash && txHash) {
                paymentTxHash.textContent = 'TX: ' + txHash.substring(0, 10) + '...';
                paymentTxHash.style.display = 'block';
            }
        } else if (status === 'success') {
            if (paymentStatus) paymentStatus.textContent = 'Payment successful! Starting game...';
            if (paymentButton) {
                paymentButton.disabled = false;
                paymentButton.textContent = 'Starting Game...';
            }
            if (paymentTxHash && txHash) {
                paymentTxHash.innerHTML = 'TX: <a href="https://basescan.org/tx/' + txHash + '" target="_blank" style="color: #4CAF50; text-decoration: underline;">' + txHash.substring(0, 10) + '...' + '</a>';
                paymentTxHash.style.display = 'block';
            }
        } else if (status === 'error') {
            if (paymentStatus) paymentStatus.textContent = 'Payment failed. Please try again.';
            if (paymentButton) {
                paymentButton.disabled = false;
                paymentButton.textContent = 'Try Again';
            }
            if (paymentTxHash) {
                paymentTxHash.style.display = 'none';
                paymentTxHash.textContent = '';
            }
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
