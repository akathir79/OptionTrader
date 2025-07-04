/*
 * WebSocket handler for live option chain data
 * Manages real-time updates for spot price and option chain LTP data
 */

class WebSocketHandler {
    constructor() {
        this.isConnected = false;
        this.currentSymbol = null;
        this.currentExpiry = null;
        this.strikeCount = 10;
        this.updateInterval = null;
        this.spotPriceElement = null;
        this.atmElement = null;
        this.optionChainTable = null;
        this.microchartManager = null;
        
        this.init();
    }
    
    init() {
        // Get DOM elements
        this.spotPriceElement = document.querySelector('.spot-price-value');
        this.atmElement = document.getElementById('atmDisplay');
        this.optionChainTable = document.getElementById('optionChainTable');
        
        // Listen for symbol/expiry changes
        this.setupEventListeners();
        
        // Initialize microchart manager
        this.microchartManager = new MicroChartManager();
        
        console.log('WebSocket handler initialized');
    }
    
    setupEventListeners() {
        // Listen for strike count changes
        const strikeCountSelect = document.getElementById('strikeCountSelect');
        if (strikeCountSelect) {
            strikeCountSelect.addEventListener('change', (e) => {
                this.strikeCount = e.target.value;
                console.log(`Strike count changed to: ${this.strikeCount}`);
                
                // Refresh option chain with new strike count if we have symbol and expiry
                if (this.currentSymbol && this.currentExpiry) {
                    this.refreshOptionChain();
                }
            });
        }
        
        // Note: Expiry button click handling is done by symbol_selector_fixed.js
        // to avoid duplicate event handlers that can cause race conditions
    }
    
    async startLiveData(symbol, expiry = null) {
        try {
            // Store the new values first
            this.currentSymbol = symbol;
            this.currentExpiry = expiry;
            
            console.log(`Starting live data for ${symbol}, expiry: ${expiry}`);
            
            // Stop existing subscriptions (but preserve the symbol/expiry values)
            if (this.updateInterval) {
                clearInterval(this.updateInterval);
                this.updateInterval = null;
            }
            
            // Start spot price updates
            this.startSpotPriceUpdates();
            
            // Start option chain updates if expiry is provided
            if (expiry) {
                console.log(`About to start option chain with symbol: ${this.currentSymbol}, expiry: ${this.currentExpiry}`);
                await this.startOptionChainUpdates();
            }
            
            this.isConnected = true;
            
        } catch (error) {
            console.error('Error starting live data:', error);
            this.showError('Failed to start live data updates');
        }
    }
    
    startSpotPriceUpdates() {
        // Update spot price every 2 seconds
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            this.updateSpotPrice();
        }, 2000);
        
        // Initial update
        this.updateSpotPrice();
    }
    
    async updateSpotPrice() {
        if (!this.currentSymbol) return;
        
        try {
            // Use symbol as-is since it should already be in correct format from symbol lookup
            const response = await fetch(`/get_spot_price?symbol=${encodeURIComponent(this.currentSymbol)}`);
            const data = await response.json();
            
            if (data.success) {
                this.updateSpotPriceDisplay(data.spot_price);
                this.updateATMDisplay(data.spot_price);
                console.log(`Spot price updated: ${data.spot_price} for ${this.currentSymbol}`);
            } else {
                console.error('Spot price update failed:', data.error);
            }
        } catch (error) {
            console.error('Error updating spot price:', error);
        }
    }
    
    convertToFyersSymbol(symbol) {
        // Map common index symbols to FYERS format
        const symbolMap = {
            'NIFTY': 'NSE:NIFTY50-INDEX',
            'NIFTY 50': 'NSE:NIFTY50-INDEX',
            'BANK NIFTY': 'NSE:NIFTYBANK-INDEX',
            'BANKNIFTY': 'NSE:NIFTYBANK-INDEX',
            'SENSEX': 'BSE:SENSEX-INDEX',
            'BANKEX': 'BSE:BANKEX-INDEX'
        };
        
        // If symbol is already in proper format (contains :), return as is
        if (symbol.includes(':')) {
            return symbol;
        }
        
        // Check if it's a mapped symbol
        if (symbolMap[symbol.toUpperCase()]) {
            return symbolMap[symbol.toUpperCase()];
        }
        
        // Default to NSE format for individual stocks
        return `NSE:${symbol}-EQ`;
    }
    
    updateSpotPriceDisplay(spotPrice) {
        // Update spot price in the market data carousel
        const spotPriceElements = document.querySelectorAll('.spot-price-value');
        spotPriceElements.forEach(element => {
            element.textContent = this.formatPrice(spotPrice);
        });
        
        // Update the specific spot price element with ID "spotPrice"
        const spotPriceElement = document.getElementById('spotPrice');
        if (spotPriceElement) {
            spotPriceElement.textContent = this.formatPrice(spotPrice);
            spotPriceElement.classList.remove('text-muted');
            spotPriceElement.classList.add('text-primary');
            spotPriceElement.classList.add('spot-price-updated');
            setTimeout(() => {
                spotPriceElement.classList.remove('spot-price-updated');
            }, 500);
        }
        
        // Update any element containing "Spot Price:"
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
            if (element.textContent && element.textContent.includes('Spot Price:')) {
                const textNodes = this.getTextNodes(element);
                textNodes.forEach(node => {
                    if (node.textContent.includes('Spot Price:')) {
                        node.textContent = node.textContent.replace(/Spot Price:\s*[\d,]+/, `Spot Price: ${this.formatPrice(spotPrice)}`);
                    }
                });
            }
        });
    }
    
    updateATMDisplay(spotPrice) {
        // Calculate ATM strike (round to nearest 50 for indices, 5 for stocks)
        let atmStrike;
        if (this.currentSymbol.includes('NIFTY') || this.currentSymbol.includes('SENSEX') || this.currentSymbol.includes('BANKNIFTY')) {
            atmStrike = Math.round(spotPrice / 50) * 50;
        } else {
            atmStrike = Math.round(spotPrice / 5) * 5;
        }
        
        // Update ATM display and make it visible
        const atmElement = document.getElementById('atmDisplay');
        if (atmElement) {
            atmElement.textContent = atmStrike;
            atmElement.style.display = 'inline-block';
        }
        
        // Update ATM highlighting in option chain table
        this.highlightATMStrike(atmStrike);
    }
    
    highlightATMStrike(atmStrike) {
        if (!this.optionChainTable) return;
        
        // Remove existing ATM highlights
        const existingATM = this.optionChainTable.querySelectorAll('.atm-strike');
        existingATM.forEach(el => el.classList.remove('atm-strike'));
        
        // Add ATM highlight to current strike
        const strikeRows = this.optionChainTable.querySelectorAll('tr[data-strike]');
        strikeRows.forEach(row => {
            const strike = parseFloat(row.dataset.strike);
            if (strike === atmStrike) {
                row.classList.add('atm-strike');
            }
        });
    }
    
    async startOptionChainUpdates() {
        console.log(`Starting option chain updates - Symbol: ${this.currentSymbol}, Expiry: ${this.currentExpiry}`);
        console.log(`DEBUG: this.currentSymbol type: ${typeof this.currentSymbol}, value: "${this.currentSymbol}"`);
        console.log(`DEBUG: this.currentExpiry type: ${typeof this.currentExpiry}, value: "${this.currentExpiry}"`);
        console.log(`DEBUG: Boolean check - Symbol: ${!!this.currentSymbol}, Expiry: ${!!this.currentExpiry}`);
        
        if (!this.currentSymbol || !this.currentExpiry) {
            console.error('Missing symbol and/or expiry:', this.currentSymbol, this.currentExpiry);
            return;
        }
        
        // Show loading indicator
        this.showOptionChainLoading();
        
        try {
            const url = `/ws_get_option_chain?symbol=${encodeURIComponent(this.currentSymbol)}&expiry_timestamp=${encodeURIComponent(this.currentExpiry)}&strike_count=${this.strikeCount}`;
            console.log(`Making API call to: ${url}`);
            console.log(`Just before fetch - Symbol: "${this.currentSymbol}", Expiry: "${this.currentExpiry}"`);
            
            const response = await fetch(url);
            console.log(`API response status: ${response.status}`);
            const data = await response.json();
            console.log(`API response data:`, data);
            
            if (data.success) {
                this.updateOptionChainTable(data.strikes);
                this.updateATMDisplay(data.spot_price);
                this.hideOptionChainLoading();
                console.log(`Option chain loaded: ${data.strikes.length} strikes for ${this.currentSymbol}`);
            } else {
                console.error('Option chain update failed:', data.error);
                this.hideOptionChainLoading();
                this.showError(data.error);
            }
        } catch (error) {
            console.error('Error updating option chain:', error);
            this.hideOptionChainLoading();
            this.showError('Failed to load option chain data');
        }
    }
    
    updateOptionChainTable(strikes) {
        const tableBody = document.querySelector('#optionChainTable tbody');
        if (!tableBody) return;
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        strikes.forEach(strike => {
            const row = this.createOptionChainRow(strike);
            tableBody.appendChild(row);
        });
        
        // Load microcharts for all option symbols
        this.loadMicroCharts(strikes);
    }
    
    createOptionChainRow(strike) {
        const row = document.createElement('tr');
        row.dataset.strike = strike.strike;
        
        // Add ATM class if this is the ATM strike
        if (strike.is_atm) {
            row.classList.add('atm-strike');
        }
        
        // Determine ITM/OTM classes
        const isCallITM = strike.strike <= strike.strike; // Simplified for now
        const isPutITM = strike.strike >= strike.strike; // Simplified for now
        
        // Create cells using column-specific approach
        const cells = [
            // CE B/S
            `<td class="text-center buy_sell_cell"><span class="option_button buy_button">B</span><span class="option_button sell_button">S</span></td>`,
            // CE Greeks
            `<td class="text-center ce-veta">0</td>`,
            `<td class="text-center ce-volga">0</td>`,
            `<td class="text-center ce-charm">0</td>`,
            `<td class="text-center ce-vanna">0</td>`,
            `<td class="text-center ce-vega">0</td>`,
            `<td class="text-center ce-theta">0</td>`,
            `<td class="text-center ce-gamma">0</td>`,
            // CE Market Data
            `<td class="text-center ce-change ${strike.ce_ltpch >= 0 ? 'text-success' : 'text-danger'}">${strike.ce_ltpch || 0}</td>`,
            `<td class="text-center ce-bid-qty">${strike.ce_bid_qty || 0}</td>`,
            `<td class="text-center ce-bid">${this.formatPrice(strike.ce_bid)}</td>`,
            `<td class="text-center ce-ask">${this.formatPrice(strike.ce_ask)}</td>`,
            `<td class="text-center ce-ask-qty">${strike.ce_ask_qty || 0}</td>`,
            `<td class="text-center ce-oi-change ${strike.ce_oich >= 0 ? 'text-success' : 'text-danger'}">${strike.ce_oich || 0}</td>`,
            `<td class="text-center ce-oi">${strike.ce_oi || 0}</td>`,
            `<td class="text-center ce-volume">${strike.ce_volume || 0}</td>`,
            `<td class="microchart-cell" id="ce-chart-${strike.strike}"></td>`,
            `<td class="text-center ce-ltp call-ltp ${isCallITM ? 'itm' : 'otm'}" data-symbol="${strike.ce_symbol}">${this.formatPrice(strike.ce_ltp)}</td>`,
            `<td class="text-center ce-delta">0</td>`,
            // Strike
            `<td class="text-center strike-price font-weight-bold">${strike.strike}</td>`,
            // PE Market Data
            `<td class="text-center pe-delta">0</td>`,
            `<td class="text-center pe-ltp put-ltp ${isPutITM ? 'itm' : 'otm'}" data-symbol="${strike.pe_symbol}">${this.formatPrice(strike.pe_ltp)}</td>`,
            `<td class="microchart-cell" id="pe-chart-${strike.strike}"></td>`,
            `<td class="text-center pe-volume">${strike.pe_volume || 0}</td>`,
            `<td class="text-center pe-oi">${strike.pe_oi || 0}</td>`,
            `<td class="text-center pe-oi-change ${strike.pe_oich >= 0 ? 'text-success' : 'text-danger'}">${strike.pe_oich || 0}</td>`,
            `<td class="text-center pe-ask-qty">${strike.pe_ask_qty || 0}</td>`,
            `<td class="text-center pe-ask">${this.formatPrice(strike.pe_ask)}</td>`,
            `<td class="text-center pe-bid">${this.formatPrice(strike.pe_bid)}</td>`,
            `<td class="text-center pe-bid-qty">${strike.pe_bid_qty || 0}</td>`,
            `<td class="text-center pe-change ${strike.pe_ltpch >= 0 ? 'text-success' : 'text-danger'}">${strike.pe_ltpch || 0}</td>`,
            // PE Greeks
            `<td class="text-center pe-gamma">0</td>`,
            `<td class="text-center pe-theta">0</td>`,
            `<td class="text-center pe-vega">0</td>`,
            `<td class="text-center pe-vanna">0</td>`,
            `<td class="text-center pe-charm">0</td>`,
            `<td class="text-center pe-volga">0</td>`,
            `<td class="text-center pe-veta">0</td>`,
            // PE B/S
            `<td class="text-center buy_sell_cell pe-buy-sell-cell"><span class="option_button buy_button">B</span><span class="option_button sell_button">S</span></td>`
        ];
        
        row.innerHTML = cells.join('');
        return row;
    }


    
    async loadMicroCharts(strikes) {
        console.log('Loading microcharts for strikes:', strikes);
        
        // Clear existing charts
        if (this.microchartManager) {
            this.microchartManager.clearAllCharts();
        }
        
        // Load charts for each strike using dedicated chart columns
        strikes.forEach(strike => {
            // Load Call chart in dedicated CE chart column
            if (strike.ce_symbol) {
                const ceContainerId = `ce-chart-${strike.strike}`;
                this.microchartManager.addChart(strike.ce_symbol, ceContainerId);
            }
            
            // Load Put chart in dedicated PE chart column
            if (strike.pe_symbol) {
                const peContainerId = `pe-chart-${strike.strike}`;
                this.microchartManager.addChart(strike.pe_symbol, peContainerId);
            }
        });
        
        // Load all charts
        await this.microchartManager.loadAllCharts();
    }
    
    async refreshOptionChain() {
        if (this.currentSymbol && this.currentExpiry) {
            await this.startOptionChainUpdates();
        }
    }
    
    formatPrice(price) {
        const numPrice = parseFloat(price);
        if (numPrice >= 1000) {
            return numPrice.toLocaleString('en-IN');
        }
        return numPrice.toFixed(2);
    }
    
    getTextNodes(element) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        return textNodes;
    }
    
    showError(message) {
        console.error(message);
        // Could implement toast notification here
    }
    
    showOptionChainLoading() {
        const loadingElement = document.getElementById('optionChainLoading');
        const containerElement = document.getElementById('optionChainContainer');
        
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
        if (containerElement) {
            containerElement.style.display = 'none';
        }
    }
    
    hideOptionChainLoading() {
        const loadingElement = document.getElementById('optionChainLoading');
        const containerElement = document.getElementById('optionChainContainer');
        
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        if (containerElement) {
            containerElement.style.display = 'block';
        }
    }
    
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Stop WebSocket connection
        fetch('/stop_websocket', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                console.log('WebSocket stopped:', data.message);
            })
            .catch(error => {
                console.error('Error stopping WebSocket:', error);
            });
        
        this.isConnected = false;
        // Don't clear currentSymbol and currentExpiry here as they're needed for the next request
    }
    
    getStatus() {
        return {
            connected: this.isConnected,
            symbol: this.currentSymbol,
            expiry: this.currentExpiry,
            strikeCount: this.strikeCount
        };
    }
}

// Initialize WebSocket handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.webSocketHandler = new WebSocketHandler();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.webSocketHandler) {
        window.webSocketHandler.stop();
    }
});