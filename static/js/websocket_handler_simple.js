/**
 * Simplified WebSocket Handler for Live Option Chain Data
 * Works with 7-column table: CE B/S, LTP, Δ, Strike, Δ, LTP, PE B/S
 */

class WebSocketHandler {
    constructor() {
        this.spotPrice = null;
        this.currentSymbol = null;
        this.currentExpiry = null;
        this.updateInterval = null;
        this.isActive = false;
    }

    init() {
        console.log('WebSocket handler initialized');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for manual refresh requests
        document.addEventListener('refreshOptionChain', () => {
            if (this.isActive) {
                this.refreshOptionChain();
            }
        });
    }

    async startLiveData(symbol, expiry = null) {
        console.log(`Starting live data for ${symbol}`, expiry ? `with expiry ${expiry}` : '');
        
        this.currentSymbol = symbol;
        this.currentExpiry = expiry;
        this.isActive = true;
        
        // Start spot price updates
        this.startSpotPriceUpdates();
        
        // Start option chain updates
        await this.startOptionChainUpdates();
        
        // Set up periodic updates
        this.updateInterval = setInterval(() => {
            this.refreshOptionChain();
        }, 2000); // Update every 2 seconds
    }

    startSpotPriceUpdates() {
        const updateSpotPrice = async () => {
            if (!this.isActive || !this.currentSymbol) return;
            
            try {
                await this.updateSpotPrice();
            } catch (error) {
                console.error('Error updating spot price:', error);
            }
            
            // Schedule next update
            if (this.isActive) {
                setTimeout(updateSpotPrice, 1000); // Update every second
            }
        };
        
        updateSpotPrice();
    }

    async updateSpotPrice() {
        const fyersSymbol = this.convertToFyersSymbol(this.currentSymbol);
        
        try {
            const response = await fetch(`/api/spot-price?symbol=${encodeURIComponent(fyersSymbol)}`);
            const data = await response.json();
            
            if (data.success && data.spot_price) {
                this.spotPrice = data.spot_price;
                this.updateSpotPriceDisplay(data.spot_price);
                this.updateATMDisplay(data.spot_price);
                console.log(`Spot price updated: ${data.spot_price} for ${fyersSymbol}`);
            }
        } catch (error) {
            console.error('Error fetching spot price:', error);
        }
    }

    convertToFyersSymbol(symbol) {
        const symbolMap = {
            'NIFTY 50': 'NSE:NIFTY50-INDEX',
            'BANK NIFTY': 'NSE:BANKNIFTY-INDEX',
            'NIFTY MIDCAP 50': 'NSE:NIFTYMIDCAP50-INDEX',
            'NIFTY SMALLCAP 50': 'NSE:NIFTYSMALLCAP50-INDEX',
            'NIFTY FINANCIAL SERVICES': 'NSE:NIFTYFINSERVICE-INDEX',
            'NIFTY IT': 'NSE:NIFTYIT-INDEX',
            'NIFTY FMCG': 'NSE:NIFTYFMCG-INDEX',
            'NIFTY PHARMA': 'NSE:NIFTYPHARMA-INDEX',
            'NIFTY REALTY': 'NSE:NIFTYREALTY-INDEX',
            'NIFTY METAL': 'NSE:NIFTYMETAL-INDEX',
            'NIFTY ENERGY': 'NSE:NIFTYENERGY-INDEX',
            'NIFTY AUTO': 'NSE:NIFTYAUTO-INDEX',
            'NIFTY MEDIA': 'NSE:NIFTYMEDIA-INDEX',
            'NIFTY PSU BANK': 'NSE:NIFTYPSUBANK-INDEX',
            'NIFTY PRIVATE BANK': 'NSE:NIFTYPVTBANK-INDEX'
        };
        
        return symbolMap[symbol] || symbol;
    }

    updateSpotPriceDisplay(spotPrice) {
        const spotPriceElement = document.getElementById('spotPrice');
        if (spotPriceElement) {
            spotPriceElement.textContent = spotPrice.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
    }

    updateATMDisplay(spotPrice) {
        // Calculate ATM strike (round to nearest 50 for NIFTY, 100 for BANK NIFTY)
        let roundTo = 50;
        if (this.currentSymbol === 'BANK NIFTY') {
            roundTo = 100;
        }
        
        const atmStrike = Math.round(spotPrice / roundTo) * roundTo;
        
        const atmDisplay = document.getElementById('atmDisplay');
        if (atmDisplay) {
            atmDisplay.textContent = `ATM: ${atmStrike}`;
        }
        
        // Highlight ATM strike in table
        this.highlightATMStrike(atmStrike);
    }

    highlightATMStrike(atmStrike) {
        // Remove existing ATM highlighting
        document.querySelectorAll('.atm-strike').forEach(row => {
            row.classList.remove('atm-strike');
        });
        
        // Add ATM highlighting to the appropriate row
        const rows = document.querySelectorAll('#optionChainBody tr');
        rows.forEach(row => {
            const strikeCell = row.querySelector('td:nth-child(4)'); // Strike column
            if (strikeCell && parseInt(strikeCell.textContent) === atmStrike) {
                row.classList.add('atm-strike');
            }
        });
    }

    async startOptionChainUpdates() {
        try {
            const fyersSymbol = this.convertToFyersSymbol(this.currentSymbol);
            
            const params = new URLSearchParams({
                symbol: fyersSymbol
            });
            
            if (this.currentExpiry) {
                params.append('expiry', this.currentExpiry);
            }
            
            const response = await fetch(`/api/option-chain?${params}`);
            const data = await response.json();
            
            if (data.success && data.strikes) {
                this.updateOptionChainTable(data.strikes);
                console.log(`Option chain loaded: ${data.strikes.length} strikes for ${fyersSymbol}`);
            } else {
                this.showError('Failed to load option chain data');
            }
        } catch (error) {
            console.error('Error loading option chain:', error);
            this.showError('Error loading option chain');
        }
    }

    updateOptionChainTable(strikes) {
        const tableBody = document.getElementById('optionChainBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        strikes.forEach(strike => {
            const row = this.createOptionChainRow(strike);
            tableBody.appendChild(row);
        });
        
        // Update ATM highlighting if we have spot price
        if (this.spotPrice) {
            this.updateATMDisplay(this.spotPrice);
        }
    }

    createOptionChainRow(strike) {
        const row = document.createElement('tr');
        const atmClass = strike.is_atm ? 'atm-strike' : '';
        const itmClassCE = strike.ce_ltp && strike.strike < this.spotPrice ? 'table-success' : '';
        const itmClassPE = strike.pe_ltp && strike.strike > this.spotPrice ? 'table-success' : '';
        
        row.className = atmClass;
        row.innerHTML = `
            <!-- CE B/S -->
            <td class="text-center ${itmClassCE}">
                <button class="btn btn-sm btn-success me-1" style="font-size: 9px; padding: 2px 6px;">B</button>
                <button class="btn btn-sm btn-danger" style="font-size: 9px; padding: 2px 6px;">S</button>
            </td>
            
            <!-- CE LTP -->
            <td class="text-center fw-bold ${itmClassCE}">${this.formatPrice(strike.ce_ltp)}</td>
            
            <!-- CE Delta -->
            <td class="text-center">${this.formatPrice(strike.ce_delta)}</td>
            
            <!-- Strike -->
            <td class="text-center fw-bold bg-dark text-white">${strike.strike}</td>
            
            <!-- PE Delta -->
            <td class="text-center">${this.formatPrice(strike.pe_delta)}</td>
            
            <!-- PE LTP -->
            <td class="text-center fw-bold ${itmClassPE}">${this.formatPrice(strike.pe_ltp)}</td>
            
            <!-- PE B/S -->
            <td class="text-center ${itmClassPE}">
                <button class="btn btn-sm btn-success me-1" style="font-size: 9px; padding: 2px 6px;">B</button>
                <button class="btn btn-sm btn-danger" style="font-size: 9px; padding: 2px 6px;">S</button>
            </td>
        `;
        
        return row;
    }

    async refreshOptionChain() {
        if (!this.isActive || !this.currentSymbol) return;
        
        try {
            await this.startOptionChainUpdates();
        } catch (error) {
            console.error('Error refreshing option chain:', error);
        }
    }

    formatPrice(price) {
        if (price === null || price === undefined || price === '') {
            return '-';
        }
        
        const numPrice = parseFloat(price);
        if (isNaN(numPrice)) {
            return '-';
        }
        
        return numPrice.toFixed(2);
    }

    showError(message) {
        const tableBody = document.getElementById('optionChainBody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${message}</td></tr>`;
        }
        console.error(message);
    }

    stop() {
        console.log('Stopping WebSocket handler');
        this.isActive = false;
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.currentSymbol = null;
        this.currentExpiry = null;
        this.spotPrice = null;
        
        // Clear the table
        const tableBody = document.getElementById('optionChainBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Live data stopped</td></tr>';
        }
    }

    getStatus() {
        return {
            isActive: this.isActive,
            currentSymbol: this.currentSymbol,
            currentExpiry: this.currentExpiry,
            spotPrice: this.spotPrice
        };
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebSocketHandler;
}