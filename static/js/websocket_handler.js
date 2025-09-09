/*
 * WebSocket handler for live option chain data - v2.0
 * Manages real-time updates for spot price and option chain LTP data
 * CACHE BUSTER: Updated live streaming implementation
 */

class WebSocketHandler {
    constructor() {
        this.isConnected = false;
        this.currentSymbol = null;
        this.currentExpiry = null;
        this.strikeCount = 10;
        this.updateInterval = null;
        this.volumeOIUpdateInterval = null;
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
        
        // Don't start real-time data immediately - wait for table to be populated
        this.realTimeDataStarted = false;
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
    
    startVolumeOIUpdates() {
        // Stop existing interval if any
        if (this.volumeOIUpdateInterval) {
            clearInterval(this.volumeOIUpdateInterval);
        }
        
        // Update VOL/OI/Change in OI every 3 seconds using option chain API
        this.volumeOIUpdateInterval = setInterval(() => {
            this.updateVolumeOIData();
        }, 3000);
        
        console.log('🔄 VOL/OI timer updates started (every 3 seconds)');
    }
    
    async updateVolumeOIData() {
        if (!this.currentSymbol || !this.currentExpiry) return;
        
        try {
            const strikeCountSelect = document.getElementById('strikeCountSelect');
            const strikeCount = strikeCountSelect ? strikeCountSelect.value : '15';
            
            const url = `/ws_get_option_chain?symbol=${encodeURIComponent(this.currentSymbol)}&expiry_timestamp=${encodeURIComponent(this.currentExpiry)}&strike_count=${strikeCount}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success && data.strikes) {
                this.updateVolumeOIColumns(data.strikes);
                console.log('📊 VOL/OI data updated via timer');
            }
        } catch (error) {
            console.error('Error updating VOL/OI data:', error);
        }
    }
    
    updateVolumeOIColumns(strikes) {
        const tableBody = document.querySelector('#optionChainTable tbody');
        if (!tableBody) return;
        
        const rows = tableBody.querySelectorAll('tr');
        
        strikes.forEach(strike => {
            // Find the row for this strike price
            const matchingRow = Array.from(rows).find(row => {
                return row.dataset.strike && parseFloat(row.dataset.strike) === strike.strike;
            });
            
            if (matchingRow) {
                // Update only VOL/OI/Change in OI columns (not LTP)
                this.updateCellValue(matchingRow, '.ce-volume', strike.ce_volume);
                this.updateCellValue(matchingRow, '.ce-oi', strike.ce_oi);
                this.updateCellValueWithColor(matchingRow, '.ce-oi-change', strike.ce_oich);
                this.updateCellValue(matchingRow, '.pe-volume', strike.pe_volume);
                this.updateCellValue(matchingRow, '.pe-oi', strike.pe_oi);
                this.updateCellValueWithColor(matchingRow, '.pe-oi-change', strike.pe_oich);
            }
        });
    }
    
    updateCellValueWithColor(row, selector, value) {
        const cell = row.querySelector(selector);
        if (cell) {
            cell.textContent = value || 0;
            
            // Apply color based on value (positive = green, negative = red)
            cell.classList.remove('text-success', 'text-danger');
            if (value >= 0) {
                cell.classList.add('text-success');
            } else {
                cell.classList.add('text-danger');
            }
            
            cell.classList.add('cell-updated');
            setTimeout(() => {
                cell.classList.remove('cell-updated');
            }, 1000);
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
        
        // Show chart icon when symbol is selected
        const chartIcon = document.getElementById('chartIcon');
        if (chartIcon && this.currentSymbol) {
            chartIcon.style.display = 'inline';
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
        
        // Store current spot price for ITM calculations
        this.currentSpotPrice = spotPrice;
        console.log(`[SPOT UPDATE] Set currentSpotPrice to: ${this.currentSpotPrice}`);
        
        // Update ITM highlighting in existing option chain
        this.updateITMHighlighting();
        
        // Update payoff chart spot price line if chart exists
        console.log(`[SPOT UPDATE] About to call updatePayoffChartSpotPrice with spot: ${this.currentSpotPrice}`);
        this.updatePayoffChartSpotPrice();
    }

    getCurrentSpotPrice() {
        return this.currentSpotPrice || 0;
    }

    findATMStrike() {
        if (!this.optionChainTable || !this.currentSpotPrice) return null;
        
        const rows = this.optionChainTable.querySelectorAll('tbody tr');
        let closestStrike = null;
        let minDifference = Infinity;
        
        rows.forEach(row => {
            const strikeCell = row.querySelector('td:nth-child(20)'); // Strike column
            if (strikeCell) {
                const strike = parseFloat(strikeCell.textContent);
                if (!isNaN(strike)) {
                    const difference = Math.abs(strike - this.currentSpotPrice);
                    if (difference < minDifference) {
                        minDifference = difference;
                        closestStrike = strike;
                    }
                }
            }
        });
        
        return closestStrike;
    }

    updateITMHighlighting() {
        if (!this.optionChainTable || !this.currentSpotPrice) return;
        
        const rows = this.optionChainTable.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const strikeCell = row.querySelector('td:nth-child(20)'); // Strike column
            if (strikeCell) {
                const strike = parseFloat(strikeCell.textContent);
                if (!isNaN(strike)) {
                    // Remove existing ITM and ATM classes
                    row.classList.remove('itm-call', 'otm-call', 'itm-put', 'otm-put', 'itm-call-row', 'itm-put-row', 'atm-row');
                    
                    // Find ATM strike (closest to current spot price)
                    const atmStrike = this.findATMStrike();
                    
                    if (Math.abs(strike - atmStrike) < 0.01) {
                        // This is the ATM strike - highlight in red
                        row.classList.add('atm-row');
                    } else if (this.currentSpotPrice > strike) {
                        // Call ITM when spot > strike
                        row.classList.add('itm-call-row');
                    } else if (this.currentSpotPrice < strike) {
                        // Put ITM when spot < strike
                        row.classList.add('itm-put-row');
                    }
                }
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
        // ATM highlighting disabled for clean professional appearance
        return;
        
        // if (!this.optionChainTable) return;
        // 
        // // Remove existing ATM highlights
        // const existingATM = this.optionChainTable.querySelectorAll('.atm-strike');
        // existingATM.forEach(el => el.classList.remove('atm-strike'));
        // 
        // // Add ATM highlight to current strike
        // const strikeRows = this.optionChainTable.querySelectorAll('tr[data-strike]');
        // strikeRows.forEach(row => {
        //     const strike = parseFloat(row.dataset.strike);
        //     if (strike === atmStrike) {
        //         row.classList.add('atm-strike');
        //     }
        // });
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
            // Get strike count from dropdown or default to 15
            const strikeCountSelect = document.getElementById('strikeCountSelect');
            const strikeCount = strikeCountSelect ? strikeCountSelect.value : '15';
            
            const url = `/ws_get_option_chain?symbol=${encodeURIComponent(this.currentSymbol)}&expiry_timestamp=${encodeURIComponent(this.currentExpiry)}&strike_count=${strikeCount}`;
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
        
        // Restore button states from global positions after table is rebuilt
        setTimeout(() => {
            if (typeof window.restoreButtonStatesFromGlobalPositions === 'function') {
                window.restoreButtonStatesFromGlobalPositions();
            }
        }, 100);
        
        // Start real-time data listener NOW that table is populated
        if (!this.realTimeDataStarted) {
            this.setupRealTimeDataListener();
            this.realTimeDataStarted = true;
            console.log('🚀 Real-time data listener started after table population');
        }
        
        // Start timer-based VOL/OI updates
        this.startVolumeOIUpdates();
    }
    
    updateLiveTableData(message) {
        // Update option chain table with live WebSocket data
        const symbol = message.symbol;
        if (!symbol) return;
        
        // Find the table row for this symbol
        const tableBody = document.querySelector('#optionChainTable tbody');
        if (!tableBody) return;
        
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            // Check if this row contains the symbol for call option
            const callSymbolInput = row.querySelector('input[data-symbol-call]');
            const putSymbolInput = row.querySelector('input[data-symbol-put]');
            
            if (callSymbolInput && callSymbolInput.dataset.symbolCall === symbol) {
                // Update call option data
                this.updateCallOptionData(row, message);
            }
            
            if (putSymbolInput && putSymbolInput.dataset.symbolPut === symbol) {
                // Update put option data  
                this.updatePutOptionData(row, message);
            }
        });
    }
    
    updateCallOptionData(row, data) {
        // Update ONLY call option LTP with live WebSocket data
        // Skip volume, OI, change - preserve original values from option chain load
        const ltpCell = row.querySelector('.ce-ltp');
        
        // Only update LTP - preserve all VOL/OI/Change values from timer updates
        if (ltpCell && data.ltp) {
            // Get previous value for comparison
            const previousText = ltpCell.textContent.replace(/,/g, '');
            const previousValue = parseFloat(previousText) || 0;
            const currentValue = parseFloat(data.ltp) || 0;
            
            ltpCell.textContent = this.formatPrice(data.ltp);
            
            // Apply color based on LTP change
            ltpCell.classList.remove('value-increased', 'value-decreased');
            if (currentValue > previousValue) {
                ltpCell.classList.add('value-increased');
                setTimeout(() => ltpCell.classList.remove('value-increased'), 1000);
            } else if (currentValue < previousValue) {
                ltpCell.classList.add('value-decreased');
                setTimeout(() => ltpCell.classList.remove('value-decreased'), 1000);
            }
        }
    }
    
    updatePutOptionData(row, data) {
        // Update ONLY put option LTP with live WebSocket data
        // Skip volume, OI, change - preserve original values from option chain load
        const ltpCell = row.querySelector('.pe-ltp');
        
        // Only update LTP - preserve all VOL/OI/Change values from timer updates
        if (ltpCell && data.ltp) {
            // Get previous value for comparison
            const previousText = ltpCell.textContent.replace(/,/g, '');
            const previousValue = parseFloat(previousText) || 0;
            const currentValue = parseFloat(data.ltp) || 0;
            
            ltpCell.textContent = this.formatPrice(data.ltp);
            
            // Apply color based on LTP change
            ltpCell.classList.remove('value-increased', 'value-decreased');
            if (currentValue > previousValue) {
                ltpCell.classList.add('value-increased');
                setTimeout(() => ltpCell.classList.remove('value-increased'), 1000);
            } else if (currentValue < previousValue) {
                ltpCell.classList.add('value-decreased');
                setTimeout(() => ltpCell.classList.remove('value-decreased'), 1000);
            }
        }
    }
    
    createOptionChainRow(strike) {
        const row = document.createElement('tr');
        row.dataset.strike = strike.strike;
        
        // Get row index for button tracking
        const tableBody = document.querySelector('#optionChainTable tbody');
        const rowIndex = tableBody ? tableBody.children.length : 0;
        
        // Remove ATM highlighting for clean professional appearance
        // if (strike.is_atm) {
        //     row.classList.add('atm-strike');
        // }
        
        // Determine ITM/OTM classes based on current spot price
        const currentSpot = this.getCurrentSpotPrice();
        const isCallITM = currentSpot > strike.strike; // Call is ITM when spot > strike
        const isPutITM = currentSpot < strike.strike;   // Put is ITM when spot < strike
        
        // Apply ITM highlighting to the row
        // For calls: ITM when current price > strike price
        // For puts: ITM when current price < strike price
        // Find ATM strike (closest to current spot price)
        const atmStrike = this.findATMStrike();
        
        if (Math.abs(strike.strike - atmStrike) < 0.01) {
            // This is the ATM strike - highlight in red
            row.classList.add('atm-row');
            console.log(`Adding atm-row to strike ${strike.strike}, spot: ${currentSpot}`);
        } else if (currentSpot > strike.strike) {
            // Call options are ITM, Put options are OTM
            row.classList.add('itm-call-row');
            console.log(`Adding itm-call-row to strike ${strike.strike}, spot: ${currentSpot}`);
        } else if (currentSpot < strike.strike) {
            // Put options are ITM, Call options are OTM  
            row.classList.add('itm-put-row');
            console.log(`Adding itm-put-row to strike ${strike.strike}, spot: ${currentSpot}`);
        }
        // If currentSpot == strike.strike, no ITM highlighting (ATM)
        
        // Initialize counters for this row - FIXED: Ensure proper initialization
        if (!window.counters) window.counters = [];
        if (!window.firstClickFlags) window.firstClickFlags = [];
        
        // Always initialize for each row to ensure consistency
        window.counters[rowIndex] = { ceBuy: 0, ceSell: 0, peBuy: 0, peSell: 0 };
        window.firstClickFlags[rowIndex] = { ceBuy: true, ceSell: true, peBuy: true, peSell: true };
        
        console.log(`[ROW INIT] Initialized counters and flags for row ${rowIndex}`);
        
        // Create cells using column-specific approach
        const cells = [
            // CE B/S - Create cell and append buttons after
            `<td class="text-center buy_sell_cell" id="ce-bs-${rowIndex}"></td>`,
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
            // PE B/S - Create cell and append buttons after
            `<td class="text-center buy_sell_cell pe-buy-sell-cell" id="pe-bs-${rowIndex}"></td>`
        ];
        
        row.innerHTML = cells.join('');
        
        // After creating the row, append the Buy/Sell buttons using attached code approach
        setTimeout(() => {
            const ceBsCell = document.getElementById(`ce-bs-${rowIndex}`);
            const peBsCell = document.getElementById(`pe-bs-${rowIndex}`);
            
            if (ceBsCell && window.createOptionButton) {
                const ceBuyBtn = window.createOptionButton(rowIndex, 'ceBuy', 'B', 'buy_button');
                const ceSellBtn = window.createOptionButton(rowIndex, 'ceSell', 'S', 'sell_button');
                ceBsCell.appendChild(ceBuyBtn);
                ceBsCell.appendChild(ceSellBtn);
            }
            
            if (peBsCell && window.createOptionButton) {
                const peBuyBtn = window.createOptionButton(rowIndex, 'peBuy', 'B', 'buy_button');
                const peSellBtn = window.createOptionButton(rowIndex, 'peSell', 'S', 'sell_button');
                peBsCell.appendChild(peBuyBtn);
                peBsCell.appendChild(peSellBtn);
            }
        }, 10);
        
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
        
        if (this.volumeOIUpdateInterval) {
            clearInterval(this.volumeOIUpdateInterval);
            this.volumeOIUpdateInterval = null;
        }
        
        if (this.realTimeInterval) {
            clearInterval(this.realTimeInterval);
            this.realTimeInterval = null;
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
    
    setupRealTimeDataListener() {
        // Setup periodic polling for real-time data (Server-sent events alternative)
        console.log('Setting up real-time data listener with 1-second polling');
        this.realTimeInterval = setInterval(() => {
            this.checkForRealTimeUpdates();
        }, 1000); // Check every second for real-time updates
    }
    
    async checkForRealTimeUpdates() {
        // Allow updates regardless of current symbol
        
        try {
            // Get all live market data from WebSocket bridge
            const response = await fetch('/live_market_data');
            const result = await response.json();
            
            if (result.success && result.data) {
                console.log('Live data received:', Object.keys(result.data).length, 'symbols');
                
                // Update option chain table with live data
                this.updateTableWithLiveData(result.data);
                
                // Update Current Positions table with live LTP and P&L
                if (typeof window.updatePositionTableLivePrices === 'function') {
                    window.updatePositionTableLivePrices();
                }
                
                // Update spot price if available
                if (result.data['NSE:NIFTY50-INDEX']) {
                    const newSpotPrice = result.data['NSE:NIFTY50-INDEX'].ltp;
                    if (newSpotPrice !== this.currentSpotPrice) {
                        this.updateSpotPriceDisplay(newSpotPrice);
                        this.updateATMDisplay(newSpotPrice);
                        this.updatePayoffChartSpotPrice();
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching live data:', error);
        }
    }

    updateTableWithLiveData(liveData) {
        // Update option chain table with live streaming data
        const table = document.getElementById('optionChainTable');
        if (!table) {
            console.log('Table not found - will auto-load default option chain');
            this.autoLoadDefaultOptionChain();
            return;
        }
        
        console.log('Table found! Processing live updates for', Object.keys(liveData).length, 'symbols');
        
        // Try multiple selectors to find rows
        let rows = table.querySelectorAll('tbody tr');
        if (rows.length === 0) {
            console.log('⚠️ No rows found with tbody tr, trying alternative selectors...');
            rows = table.querySelectorAll('tr[data-strike]');
            console.log('Found', rows.length, 'rows with data-strike attribute');
        }
        if (rows.length === 0) {
            console.log('⚠️ Still no rows found, trying all tr in table...');
            rows = table.querySelectorAll('tr');
            console.log('Found', rows.length, 'total rows in table');
            // Filter out header rows
            rows = Array.from(rows).filter(row => !row.closest('thead'));
            console.log('Found', rows.length, 'non-header rows');
        }
        
        console.log('📊 Final row count:', rows.length);
        if (rows.length === 0) {
            console.log('❌ No table rows found for live data updates');
            return;
        }
        
        let updatesCount = 0;
        rows.forEach((row, index) => {
            const ceSymbol = row.querySelector('.ce-ltp')?.getAttribute('data-symbol');
            const peSymbol = row.querySelector('.pe-ltp')?.getAttribute('data-symbol');
            
            // Update CE (Call) data - ONLY LTP (preserve VOL/OI from initial load)
            if (ceSymbol && liveData[ceSymbol]) {
                const ceData = liveData[ceSymbol];
                this.updateCellValue(row, '.ce-ltp', ceData.ltp);
                // Skip volume, OI, change - preserve original values from option chain load
                // Only update bid/ask if they have meaningful values
                if (ceData.bid && ceData.bid > 0) {
                    this.updateCellValue(row, '.ce-bid', ceData.bid);
                }
                if (ceData.ask && ceData.ask > 0) {
                    this.updateCellValue(row, '.ce-ask', ceData.ask);
                }
                updatesCount++;
            }
            
            // Update PE (Put) data - ONLY LTP (preserve VOL/OI from initial load)  
            if (peSymbol && liveData[peSymbol]) {
                const peData = liveData[peSymbol];
                this.updateCellValue(row, '.pe-ltp', peData.ltp);
                // Skip volume, OI, change - preserve original values from option chain load
                // Only update bid/ask if they have meaningful values
                if (peData.bid && peData.bid > 0) {
                    this.updateCellValue(row, '.pe-bid', peData.bid);
                }
                if (peData.ask && peData.ask > 0) {
                    this.updateCellValue(row, '.pe-ask', peData.ask);
                }
                updatesCount++;
            }
            
            if (index === 0) {
                console.log('Row 0 symbols - CE:', ceSymbol, 'PE:', peSymbol);
                console.log('Live data available for CE:', !!liveData[ceSymbol], 'PE:', !!liveData[peSymbol]);
            }
        });
        
        console.log('Updated', updatesCount, 'symbols in table');
        
        // Reapply column visibility after table update to ensure proper alignment
        if (window.columnVisibilityController && typeof window.columnVisibilityController.refreshVisibility === 'function') {
            window.columnVisibilityController.refreshVisibility();
        }
    }

    autoLoadDefaultOptionChain() {
        // Auto-load NIFTY option chain to enable live updates
        if (this.autoLoadAttempted) return; // Prevent multiple attempts
        this.autoLoadAttempted = true;
        
        console.log('Auto-loading NIFTY option chain for live updates...');
        
        // Set default values
        const indexSelect = document.getElementById('indexSelect');
        const expirySelect = document.getElementById('expirySelect');
        
        if (indexSelect) {
            indexSelect.value = 'NIFTY 50';
            indexSelect.dispatchEvent(new Event('change'));
            
            // Wait for expiry to load, then select first option
            setTimeout(() => {
                if (expirySelect && expirySelect.options.length > 1) {
                    expirySelect.selectedIndex = 1; // Select first actual expiry (not placeholder)
                    expirySelect.dispatchEvent(new Event('change'));
                    
                    console.log('Default option chain loaded for live updates');
                }
            }, 1000);
        }
    }

    updateCellValue(row, selector, value) {
        const cell = row.querySelector(selector);
        if (cell && value !== undefined) {
            const formattedValue = typeof value === 'number' ? this.formatPrice(value) : value;
            
            // Get previous value for comparison
            const previousText = cell.textContent.replace(/,/g, ''); // Remove commas for comparison
            const previousValue = parseFloat(previousText) || 0;
            const currentValue = typeof value === 'number' ? value : parseFloat(value) || 0;
            
            // Debug logging for specific columns we're interested in
            if (selector.includes('volume') || selector.includes('oi')) {
                console.log(`📊 Updating ${selector}: ${previousValue} → ${currentValue}`);
            }
            
            cell.textContent = formattedValue;
            
            // Apply color based on value change
            cell.classList.remove('value-increased', 'value-decreased');
            if (currentValue > previousValue) {
                cell.classList.add('value-increased');
                setTimeout(() => cell.classList.remove('value-increased'), 1000);
            } else if (currentValue < previousValue) {
                cell.classList.add('value-decreased');
                setTimeout(() => cell.classList.remove('value-decreased'), 1000);
            }
        } else if (!cell) {
            console.log(`⚠️ Cell not found for selector: ${selector}`);
        }
    }
    
    updatePayoffChartSpotPrice() {
        // Check if payoff chart exists (global variable from live_trade.html)
        console.log(`[PAYOFF UPDATE] Checking payoff chart update - payoffChart exists: ${typeof payoffChart !== 'undefined' && payoffChart}, currentSpotPrice: ${this.currentSpotPrice}`);
        
        if (typeof payoffChart !== 'undefined' && payoffChart && this.currentSpotPrice) {
            console.log(`[PAYOFF UPDATE] Updating spot price line from ${payoffChart.xAxis[0].plotLinesAndBands.length > 0 ? 'existing' : 'new'} to ${this.currentSpotPrice}`);
            
            // Remove existing spot price line
            payoffChart.xAxis[0].removePlotLine('currentSpot');
            
            // Add updated spot price line
            payoffChart.xAxis[0].addPlotLine({
                id: 'currentSpot',
                value: this.currentSpotPrice,
                color: '#007BFF',
                width: 2,
                zIndex: 7,
                label: {
                    text: 'Spot: ₹' + this.currentSpotPrice.toFixed(0),
                    align: 'center',
                    rotation: 0,
                    verticalAlign: 'bottom',
                    y: -5,
                    x: 0,
                    useHTML: true,
                    style: {
                        color: '#007BFF',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        fontFamily: 'Arial, sans-serif',
                        zIndex: 1000
                    }
                }
            });
            
            // Update breakeven lines dynamically
            this.updateBreakevenLines();
            
            console.log(`[PAYOFF UPDATE] Successfully updated payoff chart spot price to: ${this.currentSpotPrice}`);
        } else {
            console.log(`[PAYOFF UPDATE] Cannot update - Missing requirements: payoffChart=${typeof payoffChart !== 'undefined' && payoffChart}, currentSpotPrice=${this.currentSpotPrice}`);
            
            // Try fallback global function
            if (typeof window.forcePayoffChartUpdate === 'function' && this.currentSpotPrice) {
                console.log(`[PAYOFF UPDATE] Attempting fallback via global forcePayoffChartUpdate`);
                window.forcePayoffChartUpdate(this.currentSpotPrice);
            }
        }
    }
    
    updateBreakevenLines() {
        // Calculate and update breakeven lines based on current positions
        if (typeof payoffChart !== 'undefined' && payoffChart && typeof window.calculateBreakevens === 'function') {
            const breakevens = window.calculateBreakevens();
            
            // Remove existing breakeven lines
            payoffChart.xAxis[0].removePlotLine('breakeven1');
            payoffChart.xAxis[0].removePlotLine('breakeven2');
            
            // Add new breakeven lines
            breakevens.forEach((breakeven, index) => {
                if (breakeven && !isNaN(breakeven) && breakeven > 0) {
                    payoffChart.xAxis[0].addPlotLine({
                        id: `breakeven${index + 1}`,
                        value: breakeven,
                        color: '#FF6B6B',
                        width: 2,
                        dashStyle: 'dash',
                        zIndex: 6,
                        label: {
                            text: 'BE: ₹' + breakeven.toFixed(0),
                            align: 'center',
                            rotation: 0,
                            verticalAlign: 'top',
                            y: 15,
                            x: 0,
                            useHTML: true,
                            style: {
                                color: '#FF6B6B',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                fontFamily: 'Arial, sans-serif',
                                zIndex: 1000
                            }
                        }
                    });
                }
            });
        }
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