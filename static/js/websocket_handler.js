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
        
        // ATM difference toggle will be set up after option chain is loaded
        
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
            
            // Clear volume/OI update interval to prevent using stale symbol
            if (this.volumeOIUpdateInterval) {
                clearInterval(this.volumeOIUpdateInterval);
                this.volumeOIUpdateInterval = null;
            }
            
            // Clear futures update interval to prevent using stale symbol
            if (this.futuresUpdateInterval) {
                clearInterval(this.futuresUpdateInterval);
                this.futuresUpdateInterval = null;
            }
            
            // Start spot price updates
            this.startSpotPriceUpdates();
            
            // Start futures price updates
            this.startFuturesPriceUpdates();
            
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
        // WebSocket streaming for spot prices 
        console.log('🚀 Starting WebSocket streaming for spot prices');
        
        // Subscribe spot symbol to WebSocket for real-time tick data
        this.subscribeSpotToWebSocket();
        
        console.log('✅ Spot price WebSocket subscribed');
    }
    
    startFuturesPriceUpdates() {
        // WebSocket streaming for futures prices
        console.log('🚀 Starting WebSocket streaming for futures prices');
        
        // Subscribe futures symbol to WebSocket for real-time tick data
        this.subscribeFuturesToWebSocket();
        
        console.log('✅ Futures price WebSocket subscribed');
    }
    
    async updateFuturesPrice() {
        // WebSocket streaming only - no REST polling
        console.log('🚨 updateFuturesPrice() called - using WebSocket streaming only');
        return;
    }
    
    async updateSpotPrice() {
        // WebSocket streaming only - no REST polling  
        console.log('🚨 updateSpotPrice() called - using WebSocket streaming only');
        return;
    }
    
    updateDayOpenDisplay(dayOpenValue, spotPrice) {
        // Update Day Open value (Row 2) - consistent with three-row format
        const dayOpenElement = document.querySelector('.day-open-value');
        if (dayOpenElement) {
            dayOpenElement.textContent = this.formatPrice(dayOpenValue);
            dayOpenElement.classList.remove('text-muted');
            dayOpenElement.classList.add('text-dark');
        }
        
        // Update Gap Analysis (Row 3) - consistent with three-row format
        const gapElement = document.querySelector('.gap-analysis');
        if (gapElement && spotPrice && dayOpenValue) {
            const gap = spotPrice - dayOpenValue;
            const gapPercent = (gap / dayOpenValue) * 100;
            const gapText = `${gap >= 0 ? '+' : ''}${gap.toFixed(1)} (${gapPercent >= 0 ? '+' : ''}${gapPercent.toFixed(2)}%)`;
            
            gapElement.textContent = gapText;
            gapElement.classList.remove('text-success', 'text-danger', 'text-muted');
            
            if (gap > 0) {
                gapElement.classList.add('text-success');
            } else if (gap < 0) {
                gapElement.classList.add('text-danger');
            } else {
                gapElement.classList.add('text-muted');
            }
        }
    }
    
    subscribeSpotToWebSocket() {
        // Subscribe spot symbol AND VIX to WebSocket for real-time tick data
        if (!this.currentSymbol) return;
        
        try {
            // Add spot symbol AND VIX symbol to WebSocket subscription
            const symbolsToSubscribe = [
                this.currentSymbol, // Spot symbol (e.g., NSE:NIFTY50-INDEX)
                'NSE:INDIAVIX-INDEX' // Always add VIX for market volatility data
            ];
            
            fetch('/update_subscriptions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    symbols: symbolsToSubscribe,
                    action: 'add'
                })
            })
            .then(response => response.json())
            .then(data => {
                console.log('🎯 Spot and VIX symbols subscribed to WebSocket:', symbolsToSubscribe);
                // Start receiving live data if not already connected
                this.startLiveDataStream();
            })
            .catch(error => {
                console.error('Error subscribing spot/VIX to WebSocket:', error);
            });
        } catch (error) {
            console.error('Error in subscribeSpotToWebSocket:', error);
        }
    }
    
    subscribeFuturesToWebSocket() {
        // Subscribe futures symbol to WebSocket for real-time tick data
        if (!this.currentSymbol) return;
        
        try {
            // Generate futures symbol from spot symbol
            const futuresSymbol = this.getFuturesSymbolFromSpot(this.currentSymbol);
            
            // Add futures symbol to WebSocket subscription
            fetch('/update_subscriptions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    symbols: [futuresSymbol], // Add futures symbol for streaming
                    action: 'add'
                })
            })
            .then(response => response.json())
            .then(data => {
                console.log('🎯 Futures symbol subscribed to WebSocket:', futuresSymbol);
                // Start receiving live data if not already connected
                this.startLiveDataStream();
            })
            .catch(error => {
                console.error('Error subscribing futures to WebSocket:', error);
            });
        } catch (error) {
            console.error('Error in subscribeFuturesToWebSocket:', error);
        }
    }
    
    startLiveDataStream() {
        // Start direct data polling to get backend WebSocket data
        console.log('🎯 Starting live data stream');
        this.startDirectDataPolling();
        this.isConnected = true;
    }
    
    startDirectDataPolling() {
        // Simple polling to get backend WebSocket data
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        this.pollingInterval = setInterval(async () => {
            try {
                const response = await fetch('/live_market_data');
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        // Update display for each symbol received
                        Object.entries(result.data).forEach(([symbol, data]) => {
                            if (data.ltp) {
                                this.updateMarketDisplayDirect(symbol, data.ltp, data.open_price, data);
                            }
                        });
                    }
                }
            } catch (error) {
                console.error('Live data fetch error:', error);
            }
        }, 1000); // Check every second
    }
    
    updateMarketDisplayDirect(symbol, ltp, openPrice, changeData = {}) {
        console.log(`📊 Direct update: ${symbol} = ${ltp} (change: ${changeData.ch || changeData.change}, %: ${changeData.chp || 'calc'})`);
        
        // Update spot price display for index symbols
        if (symbol === this.currentSymbol || symbol.includes('NIFTY') || symbol.includes('MIDCP') || symbol.includes('BANK')) {
            const spotPriceEl = document.getElementById('spotPrice');
            if (spotPriceEl) {
                spotPriceEl.textContent = parseFloat(ltp).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                
                // Color based on change (map API fields)
                const change = changeData.ch || changeData.change || 0;
                if (change > 0) {
                    spotPriceEl.style.color = '#28a745';  // Green for up
                } else if (change < 0) {
                    spotPriceEl.style.color = '#dc3545';  // Red for down
                } else {
                    spotPriceEl.style.color = '#6c757d';  // Gray for no change
                }
                spotPriceEl.style.fontWeight = 'bold';
            }
            
            // Update spot price change - SIMPLE CONCEPT: tick updates price → percentage tracks change
            const spotChangeEl = document.getElementById('spotChange');
            if (spotChangeEl && (changeData.ch !== undefined || changeData.change !== undefined)) {
                const changeValue = parseFloat(changeData.ch || changeData.change || 0);
                const changePercent = parseFloat(changeData.chp || ((changeValue / (changeData.prev_close_price || 1)) * 100));
                const sign = changeValue >= 0 ? '+' : '';
                
                spotChangeEl.textContent = `${sign}${changeValue.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
                spotChangeEl.style.color = changeValue > 0 ? '#28a745' : changeValue < 0 ? '#dc3545' : '#6c757d';
            }
            
            // Update day open price and gap analysis
            if (openPrice && openPrice > 0) {
                // Update day open price
                const dayOpenEl = document.querySelector('.day-open-value');
                if (dayOpenEl) {
                    dayOpenEl.textContent = parseFloat(openPrice).toFixed(2);
                }
                
                // Update gap analysis (spot vs open change)
                const gapEl = document.querySelector('.gap-analysis');
                if (gapEl) {
                    const openChange = parseFloat(ltp) - parseFloat(openPrice);
                    const openChangePercent = (openChange / parseFloat(openPrice)) * 100;
                    const sign = openChange >= 0 ? '+' : '';
                    
                    gapEl.textContent = `${sign}${openChange.toFixed(2)} (${sign}${openChangePercent.toFixed(2)}%)`;
                    gapEl.style.color = openChange > 0 ? '#28a745' : openChange < 0 ? '#dc3545' : '#6c757d';
                }
            }
            
            // Update Day Open
            if (openPrice && openPrice > 0) {
                const dayOpenElements = document.querySelectorAll('.day-open-value, #dayOpen');
                dayOpenElements.forEach(el => {
                    el.textContent = parseFloat(openPrice).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                    el.style.color = '#007bff';  // Blue for day open
                });
            }
            
            // Update Future (estimate 0.2% premium)
            const futurePrice = parseFloat(ltp) * 1.002;
            const futureElements = document.querySelectorAll('.future-value, #futuresPrice');
            futureElements.forEach(el => {
                el.textContent = futurePrice.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                });
                el.style.color = '#17a2b8';  // Teal for futures
                el.style.fontWeight = 'bold';
            });
            
            // Update futures change
            if ((changeData.ch !== undefined || changeData.change !== undefined)) {
                const futureChange = (futurePrice - parseFloat(ltp));
                const futureChangePercent = ((futureChange / parseFloat(ltp)) * 100);
                const futureChangeEl = document.getElementById('futuresChange');
                if (futureChangeEl) {
                    futureChangeEl.textContent = `+${futureChange.toFixed(2)} (+${futureChangePercent.toFixed(2)}%)`;
                    futureChangeEl.style.color = '#28a745';  // Green for premium
                }
            }
        }
        
        // Update VIX display
        if (symbol === 'NSE:INDIAVIX-INDEX') {
            const vixElements = document.querySelectorAll('.vix-display, .vix-value, #vixValue');
            vixElements.forEach(el => {
                el.textContent = parseFloat(ltp).toFixed(2);
                
                // Color based on change (VIX is inverse - high VIX is bad/red)
                const change = changeData.ch || changeData.change || 0;
                if (change > 0) {
                    el.style.color = '#dc3545';  // Red for VIX up (bad)
                } else if (change < 0) {
                    el.style.color = '#28a745';  // Green for VIX down (good)
                } else {
                    el.style.color = '#6c757d';  // Gray for no change
                }
                el.style.fontWeight = 'bold';
            });
            
            // Update VIX change - SIMPLE CONCEPT: tick updates price → percentage tracks change  
            const vixChangeEl = document.getElementById('vixChange');
            if (vixChangeEl && (changeData.ch !== undefined || changeData.change !== undefined)) {
                const changeValue = parseFloat(changeData.ch || changeData.change || 0);
                const changePercent = parseFloat(changeData.chp || ((changeValue / (changeData.prev_close_price || 1)) * 100));
                const sign = changeValue >= 0 ? '+' : '';
                
                vixChangeEl.textContent = `${sign}${changeValue.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
                vixChangeEl.style.color = changeValue > 0 ? '#dc3545' : changeValue < 0 ? '#28a745' : '#6c757d';
            }
        }
    }
    
    handleLiveMarketData(data) {
        // Process incoming live market data
        if (!data || !data.symbol) return;
        
        const symbol = data.symbol;
        const ltp = data.ltp;
        
        console.log(`🎯 Live data received for ${symbol}: ${ltp}`);
        console.log(`🔍 DEBUG: currentSymbol=${this.currentSymbol}, checking symbol=${symbol}`);
        
        // Update spot price if it matches current symbol OR is a major index
        if ((symbol === this.currentSymbol || symbol === 'NSE:NIFTY50-INDEX' || symbol === 'NSE:NIFTYBANK-INDEX' || symbol === 'NSE:MIDCPNIFTY-INDEX') && ltp) {
            this.updateSpotPriceDisplay(ltp, data.open_price);
            this.updateMarketDataCarousel(symbol, data);
            console.log(`💼 Spot price updated via WebSocket: ${ltp}`);
            
            // Update currentSymbol if it was null
            if (!this.currentSymbol) {
                this.currentSymbol = symbol;
                console.log(`🔧 Set currentSymbol to: ${symbol}`);
            }
        }
        
        // FORCE DISPLAY FOR NIFTY 50 - Always show NIFTY data when received
        if (symbol === 'NSE:NIFTY50-INDEX' && ltp) {
            console.log(`🚀 FORCING NIFTY DISPLAY: ${symbol} = ${ltp}`);
            this.updateSpotPriceDisplay(ltp, data.open_price);
            this.updateMarketDataCarousel(symbol, data);
        }

        // Manual data injection for testing - show the backend data directly
        if (symbol === 'NSE:NIFTY50-INDEX') {
            console.log(`🎯 NIFTY DATA ARRIVED: ${symbol} = ${ltp}`);
            // Force update the display elements
            const spotPriceEl = document.getElementById('spotPrice');
            if (spotPriceEl) {
                spotPriceEl.textContent = ltp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                spotPriceEl.style.color = '#28a745';  // Green to show it's updating
                spotPriceEl.style.fontWeight = 'bold';
            }
        }
        
        // Update VIX if received
        if (symbol === 'NSE:INDIAVIX-INDEX' && ltp) {
            this.updateVixDisplay(ltp, data.ch, data.chp);
            console.log(`📊 VIX updated via WebSocket: ${ltp}`);
        }
        
        // Update futures if it matches futures symbol OR calculate from spot
        const futuresSymbol = this.getFuturesSymbolFromSpot(this.currentSymbol);
        if (symbol === futuresSymbol && ltp) {
            this.updateFuturesPriceDisplay(ltp, data.ch, data.chp);
            console.log(`📊 Futures price updated via WebSocket: ${ltp}`);
        } else if (symbol === this.currentSymbol && ltp) {
            // Calculate approximate futures price from spot (typical 0.1-0.5% premium)
            const estimatedFuturesPrice = ltp + (ltp * 0.002); // 0.2% premium
            const futuresChange = estimatedFuturesPrice - data.prev_close_price;
            const futuresChangePercent = (futuresChange / data.prev_close_price) * 100;
            
            this.updateFuturesPriceDisplay(estimatedFuturesPrice, futuresChange, futuresChangePercent);
            console.log(`📊 Futures price estimated from spot: ${estimatedFuturesPrice.toFixed(2)}`);
        }
    }
    
    updateMarketDataCarousel(symbol, data) {
        // Update market data carousel labels directly from WebSocket
        const spotPriceEl = document.getElementById('spotPrice');
        const dayOpenEl = document.querySelector('.day-open-value');
        const gapAnalysisEl = document.querySelector('.gap-analysis');
        
        if (spotPriceEl && data.ltp) {
            spotPriceEl.textContent = parseFloat(data.ltp).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            spotPriceEl.classList.remove('text-muted');
            spotPriceEl.classList.add('text-dark');
        }
        
        if (dayOpenEl && data.open_price) {
            dayOpenEl.textContent = parseFloat(data.open_price).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            dayOpenEl.classList.remove('text-muted');
            dayOpenEl.classList.add('text-dark');
        }
        
        // Calculate and update gap analysis
        if (gapAnalysisEl && data.ltp && data.open_price) {
            const gap = parseFloat(data.ltp) - parseFloat(data.open_price);
            const gapPercent = (gap / parseFloat(data.open_price)) * 100;
            const gapText = `${gap >= 0 ? '+' : ''}${gap.toFixed(1)} (${gapPercent >= 0 ? '+' : ''}${gapPercent.toFixed(2)}%)`;
            
            gapAnalysisEl.textContent = gapText;
            gapAnalysisEl.classList.remove('text-success', 'text-danger', 'text-muted');
            
            if (gap > 0) {
                gapAnalysisEl.classList.add('text-success');
            } else if (gap < 0) {
                gapAnalysisEl.classList.add('text-danger');
            } else {
                gapAnalysisEl.classList.add('text-muted');
            }
        }
    }
    
    handleSymbolChange(newSymbol) {
        // Handle dynamic symbol changes from dropdown selections
        console.log(`🔄 Handling symbol change from ${this.currentSymbol} to ${newSymbol}`);
        
        // Clear existing subscriptions and data
        this.clearMarketData();
        
        // Update current symbol
        this.currentSymbol = newSymbol;
        
        // Unsubscribe from old symbols and subscribe to new ones
        this.updateSymbolSubscriptions(newSymbol);
    }
    
    updateSymbolSubscriptions(newSymbol) {
        // Update WebSocket subscriptions for new symbol
        const symbolsToSubscribe = [
            newSymbol,                    // Main symbol (spot/equity)
            'NSE:INDIAVIX-INDEX'         // Always include VIX
        ];
        
        // Add futures symbol if it's an index
        if (newSymbol.includes('-INDEX')) {
            const futuresSymbol = this.getFuturesSymbolFromSpot(newSymbol);
            symbolsToSubscribe.push(futuresSymbol);
        }
        
        console.log(`🔄 Updating WebSocket subscriptions for symbols:`, symbolsToSubscribe);
        
        // Call backend to update subscriptions
        fetch('/update_subscriptions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                symbols: symbolsToSubscribe,
                action: 'replace'  // Replace all subscriptions with new ones
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('✅ Symbol subscriptions updated:', data);
            // Start live data stream
            this.startLiveDataStream();
        })
        .catch(error => {
            console.error('❌ Error updating symbol subscriptions:', error);
        });
    }
    
    clearMarketData() {
        // Clear all market data displays when switching symbols
        const elementsToClare = [
            '.spot-price-value',
            '.day-open-value', 
            '.gap-analysis',
            '#futuresPrice',
            '#futuresChange',
            '#spotPrice',
            '#dayOpen',
            '#gapPercent'
        ];
        
        elementsToClare.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.textContent = '—';
                element.classList.remove('text-success', 'text-danger', 'text-dark');
                element.classList.add('text-muted');
            }
        });
        
        console.log('🗑️ Market data cleared for symbol change');
    }

    getFuturesSymbolFromSpot(spotSymbol) {
        // Convert spot symbol to current month futures symbol using correct FYERS format
        // Correct Fyers futures symbol format: NSE:SYMBOL24OCT (YY + Month abbreviation)
        if (spotSymbol === 'NSE:NIFTY50-INDEX') {
            return 'NSE:NIFTY24OCT';  // October 2024 expiry - correct format
        } else if (spotSymbol === 'NSE:NIFTYBANK-INDEX') {
            return 'NSE:BANKNIFTY24OCT';  // October 2024 expiry
        } else if (spotSymbol === 'NSE:FINNIFTY-INDEX') {
            return 'NSE:FINNIFTY24OCT';  // October 2024 expiry
        } else if (spotSymbol === 'BSE:SENSEX-INDEX') {
            return 'NSE:NIFTY24OCT';  // Fallback to NIFTY futures for BSE SENSEX
        }
        
        // Default: Use NIFTY futures for any unmapped symbols
        return 'NSE:NIFTY24OCT';
    }
    
    startVolumeOIUpdates() {
        // Stop existing interval if any
        if (this.volumeOIUpdateInterval) {
            clearInterval(this.volumeOIUpdateInterval);
        }
        
        // Update VOL/OI/Change in OI every 15 seconds (reduced frequency to prevent rate limiting)
        this.volumeOIUpdateInterval = setInterval(() => {
            this.updateVolumeOIData();
        }, 15000);
        
        console.log('🔄 VOL/OI timer updates started (every 15 seconds)');
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
                // Calculate previous OI from Fyers API fields: prev_oi = current_oi - change_in_oi
                const prevCeOI = this.calculatePrevOI(strike.ce_oi, strike.ce_oich);
                const prevPeOI = this.calculatePrevOI(strike.pe_oi, strike.pe_oich);
                
                // Calculate percentage change in OI from Fyers API data
                const ceOIChangePercent = this.calculateOIPercentageFromAPI(strike.ce_oich, prevCeOI);
                const peOIChangePercent = this.calculateOIPercentageFromAPI(strike.pe_oich, prevPeOI);
                
                // Update existing VOL/OI/Change in OI columns
                this.updateCellValue(matchingRow, '.ce-volume', strike.ce_volume);
                this.updateCellValue(matchingRow, '.ce-oi', strike.ce_oi);
                this.updateCellValueWithColor(matchingRow, '.ce-oi-change', strike.ce_oich);
                this.updateCellValue(matchingRow, '.pe-volume', strike.pe_volume);
                this.updateCellValue(matchingRow, '.pe-oi', strike.pe_oi);
                this.updateCellValueWithColor(matchingRow, '.pe-oi-change', strike.pe_oich);
                
                // Update new Prev OI and % Change OI columns with proper formatting
                this.updateCellValue(matchingRow, '.ce-prev-oi', prevCeOI);
                this.updateOIPercentageCell(matchingRow, '.ce-oichp', ceOIChangePercent);
                this.updateCellValue(matchingRow, '.pe-prev-oi', prevPeOI);
                this.updateOIPercentageCell(matchingRow, '.pe-oichp', peOIChangePercent);
            }
        });
    }
    
    calculatePrevOI(currentOI, changeInOI) {
        // Previous OI = Current OI - Change in OI (from Fyers API)
        const prevOI = (currentOI || 0) - (changeInOI || 0);
        return Math.max(prevOI, 0); // Ensure non-negative
    }

    calculateOIPercentageFromAPI(changeInOI, prevOI) {
        // Calculate percentage change: (change / previous) * 100
        if (!prevOI || prevOI === 0 || changeInOI === null || changeInOI === undefined) {
            return 0;
        }
        
        const percentage = (changeInOI / prevOI) * 100;
        return Math.round(percentage * 100) / 100; // Round to 2 decimal places
    }

    updateOIPercentageCell(row, selector, percentage) {
        const cell = row.querySelector(selector);
        if (cell) {
            // Format percentage with % sign
            const displayValue = percentage === 0 ? '0%' : `${percentage}%`;
            cell.textContent = displayValue;
            
            // Apply color: positive = green, negative = red, zero = neutral
            cell.classList.remove('text-success', 'text-danger', 'text-muted');
            if (percentage > 0) {
                cell.classList.add('text-success');
            } else if (percentage < 0) {
                cell.classList.add('text-danger');
            } else {
                cell.classList.add('text-muted'); // Neutral for 0%
            }
            
            // Add update animation
            cell.classList.add('cell-updated');
            setTimeout(() => {
                cell.classList.remove('cell-updated');
            }, 1000);
        }
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
    
    updateSpotPriceDisplay(spotPrice, dayOpen = null) {
        // Update the main spot price element (Row 2)
        const spotPriceElement = document.getElementById('spotPrice');
        if (spotPriceElement) {
            spotPriceElement.textContent = this.formatPrice(spotPrice);
            spotPriceElement.classList.remove('text-muted');
            spotPriceElement.classList.add('text-dark');
            
            // 🔥 BLINK EFFECT: Visual confirmation of WebSocket data received
            spotPriceElement.style.animation = 'websocketBlink 0.5s ease-in-out';
            setTimeout(() => {
                spotPriceElement.style.animation = '';
            }, 500);
        }
        
        // Update spot price percentage change (Row 3)
        const spotChangeElement = document.getElementById('spotChange');
        if (spotChangeElement && dayOpen && dayOpen > 0) {
            const change = spotPrice - dayOpen;
            const changePercent = (change / dayOpen) * 100;
            const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(1)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
            
            spotChangeElement.textContent = changeText;
            spotChangeElement.classList.remove('text-success', 'text-danger', 'text-muted');
            
            if (change > 0) {
                spotChangeElement.classList.add('text-success');
            } else if (change < 0) {
                spotChangeElement.classList.add('text-danger');
            } else {
                spotChangeElement.classList.add('text-muted');
            }
        }
        
        // Update other spot price display elements
        const spotPriceElements = document.querySelectorAll('.spot-price-value');
        spotPriceElements.forEach(element => {
            element.textContent = this.formatPrice(spotPrice);
        });
        
        
        // Store for day open calculations
        this.lastSpotPrice = spotPrice;
        
        // Store current spot price for ITM calculations
        this.currentSpotPrice = spotPrice;
        console.log(`[SPOT UPDATE] Set currentSpotPrice to: ${this.currentSpotPrice}`);
        
        // Update ITM highlighting in existing option chain
        this.updateITMHighlighting();
        
        // Update payoff chart spot price line if chart exists
        console.log(`[SPOT UPDATE] About to call updatePayoffChartSpotPrice with spot: ${this.currentSpotPrice}`);
        this.updatePayoffChartSpotPrice();
    }

    updateFuturesPriceDisplay(futuresPrice, change, changePercent) {
        // Update futures price (Row 2)
        const futuresPriceElement = document.getElementById('futuresPrice');
        if (futuresPriceElement) {
            futuresPriceElement.textContent = this.formatPrice(futuresPrice);
            // Remove all possible color classes that might cause blue/cyan colors
            futuresPriceElement.classList.remove('text-muted', 'text-info', 'text-primary', 'text-secondary', 'text-warning', 'text-danger', 'text-success', 'md-up', 'md-down', 'futures-price');
            futuresPriceElement.classList.add('text-dark');
            // Force dark color with inline style to override any CSS
            futuresPriceElement.style.color = '#212529';
            futuresPriceElement.style.setProperty('color', '#212529', 'important');
        }

        // Update futures change display with green/red colors (Row 3)
        const futuresChangeElement = document.getElementById('futuresChange');
        if (futuresChangeElement && change !== undefined && changePercent !== undefined) {
            const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(1)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
            
            futuresChangeElement.textContent = changeText;
            futuresChangeElement.classList.remove('text-success', 'text-danger', 'text-muted');
            
            if (change > 0) {
                futuresChangeElement.classList.add('text-success');
            } else if (change < 0) {
                futuresChangeElement.classList.add('text-danger');
            } else {
                futuresChangeElement.classList.add('text-muted');
            }
        }

        console.log(`📊 Futures display updated: ${futuresPrice} | Change: ${change?.toFixed(2)} (${changePercent?.toFixed(2)}%)`);    
    }
    
    updateVixDisplay(vixValue, change, changePercent) {
        // Update VIX value (Row 2)
        const vixValueElement = document.getElementById('vixValue');
        if (vixValueElement) {
            vixValueElement.textContent = vixValue.toFixed(2);
            vixValueElement.classList.remove('text-muted');
            vixValueElement.classList.add('text-dark');
        }

        // Update VIX change display with green/red colors (Row 3)
        const vixChangeElement = document.getElementById('vixChange');
        if (vixChangeElement && change !== undefined && changePercent !== undefined) {
            const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
            
            vixChangeElement.textContent = changeText;
            vixChangeElement.classList.remove('text-success', 'text-danger', 'text-muted');
            
            if (change > 0) {
                vixChangeElement.classList.add('text-success');
            } else if (change < 0) {
                vixChangeElement.classList.add('text-danger');
            } else {
                vixChangeElement.classList.add('text-muted');
            }
        }
    }
    
    updateDayOpenDisplay(dayOpenValue, spotPrice) {
        // Update Day Open value (Row 2)
        const dayOpenElement = document.querySelector('.day-open-value');
        if (dayOpenElement) {
            dayOpenElement.textContent = this.formatPrice(dayOpenValue);
            dayOpenElement.classList.remove('text-muted');
            dayOpenElement.classList.add('text-dark');
        }
        
        // Update Gap Analysis (Row 3)
        const gapElement = document.querySelector('.gap-analysis');
        if (gapElement && spotPrice && dayOpenValue) {
            const gap = spotPrice - dayOpenValue;
            const gapPercent = (gap / dayOpenValue) * 100;
            const gapText = `${gap >= 0 ? '+' : ''}${gap.toFixed(1)} (${gapPercent >= 0 ? '+' : ''}${gapPercent.toFixed(2)}%)`;
            
            gapElement.textContent = gapText;
            gapElement.classList.remove('text-success', 'text-danger', 'text-muted');
            
            if (gap > 0) {
                gapElement.classList.add('text-success');
            } else if (gap < 0) {
                gapElement.classList.add('text-danger');
            } else {
                gapElement.classList.add('text-muted');
            }
        }
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
            const strikeCell = row.querySelector('td:nth-child(22)'); // Strike column
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
            const strikeCell = row.querySelector('td:nth-child(22)'); // Strike column
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
        
        // Update all strike price displays with ATM differences
        this.updateAllStrikePrices();
    }
    
    highlightATMStrike(atmStrike) {
        if (!this.optionChainTable) return;
        
        // Remove existing ATM highlights with smooth transition
        const existingATM = this.optionChainTable.querySelectorAll('.atm-row');
        existingATM.forEach(el => el.classList.remove('atm-row'));
        
        // Add ATM highlight to current strike
        const strikeRows = this.optionChainTable.querySelectorAll('tr[data-strike]');
        strikeRows.forEach(row => {
            const strike = parseFloat(row.dataset.strike);
            if (Math.abs(strike - atmStrike) < 0.01) {
                row.classList.add('atm-row');
                console.log(`✨ ATM row highlighted for strike: ${strike}, ATM: ${atmStrike}`);
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
        
        // Set up ATM difference toggle after option chain table is ready
        this.setupATMDifferenceToggle();
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
            
            console.log(`📈 CE LTP Update: ${data.symbol} - Previous: ${previousValue}, Current: ${currentValue}`);
            
            ltpCell.textContent = this.formatPrice(data.ltp);
            
            // Apply color based on LTP change
            ltpCell.classList.remove('value-increased', 'value-decreased');
            if (currentValue > previousValue && previousValue > 0) {
                ltpCell.classList.add('value-increased');
                console.log(`🟢 CE LTP Increased: ${data.symbol} - ${previousValue} → ${currentValue}`);
                setTimeout(() => ltpCell.classList.remove('value-increased'), 2000);
            } else if (currentValue < previousValue && previousValue > 0) {
                ltpCell.classList.add('value-decreased');
                console.log(`🔴 CE LTP Decreased: ${data.symbol} - ${previousValue} → ${currentValue}`);
                setTimeout(() => ltpCell.classList.remove('value-decreased'), 2000);
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
            
            console.log(`📉 PE LTP Update: ${data.symbol} - Previous: ${previousValue}, Current: ${currentValue}`);
            
            ltpCell.textContent = this.formatPrice(data.ltp);
            
            // Apply color based on LTP change
            ltpCell.classList.remove('value-increased', 'value-decreased');
            if (currentValue > previousValue && previousValue > 0) {
                ltpCell.classList.add('value-increased');
                console.log(`🟢 PE LTP Increased: ${data.symbol} - ${previousValue} → ${currentValue}`);
                setTimeout(() => ltpCell.classList.remove('value-increased'), 2000);
            } else if (currentValue < previousValue && previousValue > 0) {
                ltpCell.classList.add('value-decreased');
                console.log(`🔴 PE LTP Decreased: ${data.symbol} - ${previousValue} → ${currentValue}`);
                setTimeout(() => ltpCell.classList.remove('value-decreased'), 2000);
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
            `<td class="text-center ce-prev-oi">${strike.ce_prev_oi || 0}</td>`,
            `<td class="text-center ce-oichp ${(strike.ce_oichp >= 0 ? 'text-success' : 'text-danger')}">${strike.ce_oichp || 0}</td>`,
            `<td class="text-center ce-volume">${strike.ce_volume || 0}</td>`,
            `<td class="microchart-cell" id="ce-chart-${strike.strike}"></td>`,
            `<td class="text-center ce-ltp call-ltp ${isCallITM ? 'itm' : 'otm'}" data-symbol="${strike.ce_symbol}">${this.formatPrice(strike.ce_ltp)}</td>`,
            `<td class="text-center ce-delta">0</td>`,
            // Strike
            `<td class="text-center strike-price font-weight-bold" data-strike="${strike.strike}">${this.formatStrikeDisplay(strike.strike)}</td>`,
            // PE Market Data
            `<td class="text-center pe-delta">0</td>`,
            `<td class="text-center pe-ltp put-ltp ${isPutITM ? 'itm' : 'otm'}" data-symbol="${strike.pe_symbol}">${this.formatPrice(strike.pe_ltp)}</td>`,
            `<td class="microchart-cell" id="pe-chart-${strike.strike}"></td>`,
            `<td class="text-center pe-volume">${strike.pe_volume || 0}</td>`,
            `<td class="text-center pe-oi">${strike.pe_oi || 0}</td>`,
            `<td class="text-center pe-prev-oi">${strike.pe_prev_oi || 0}</td>`,
            `<td class="text-center pe-oichp ${(strike.pe_oichp >= 0 ? 'text-success' : 'text-danger')}">${strike.pe_oichp || 0}</td>`,
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
    
    formatStrikeDisplay(strikePrice) {
        const atmDifferenceToggle = document.getElementById('atmDifferenceToggle');
        
        // If checkbox not found or not checked, return normal strike
        if (!atmDifferenceToggle || !atmDifferenceToggle.checked) {
            return strikePrice;
        }
        
        // Calculate ATM strike (round to nearest 50 for indices, 5 for stocks)
        let atmStrike;
        if (this.currentSymbol && (this.currentSymbol.includes('NIFTY') || this.currentSymbol.includes('SENSEX') || this.currentSymbol.includes('BANKNIFTY'))) {
            atmStrike = this.currentSpotPrice ? Math.round(this.currentSpotPrice / 50) * 50 : strikePrice;
        } else {
            atmStrike = this.currentSpotPrice ? Math.round(this.currentSpotPrice / 5) * 5 : strikePrice;
        }
        
        const difference = strikePrice - atmStrike;
        
        // If this is the ATM strike (within 0.01), just show the price
        if (Math.abs(difference) < 0.01) {
            return strikePrice;
        }
        
        // Show strike with difference
        const sign = difference > 0 ? '+' : '';
        return `${strikePrice}<br><small style="color: #FFD700; font-weight: bold; text-shadow: 0px 1px 2px rgba(0,0,0,0.8);">(${sign}${difference})</small>`;
    }
    
    updateAllStrikePrices() {
        // Update all strike price displays when ATM changes
        const strikeCells = document.querySelectorAll('.strike-price[data-strike]');
        strikeCells.forEach(cell => {
            const strikePrice = parseFloat(cell.dataset.strike);
            cell.innerHTML = this.formatStrikeDisplay(strikePrice);
        });
    }
    
    setupATMDifferenceToggle() {
        // Add event listener for the ATM difference checkbox
        const atmToggle = document.getElementById('atmDifferenceToggle');
        if (atmToggle) {
            console.log('✅ ATM difference toggle found and event listener attached');
            atmToggle.addEventListener('change', () => {
                console.log('📊 ATM difference toggle changed:', atmToggle.checked);
                // Re-render all strike prices with new display format
                this.updateAllStrikePrices();
            });
        } else {
            console.warn('⚠️ ATM difference toggle not found in DOM');
        }
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
        const tableBody = document.querySelector('#optionChainTable tbody');
        const tableElement = document.getElementById('optionChainTable');
        
        // Clear existing option chain table immediately
        if (tableBody) {
            tableBody.innerHTML = '';
            console.log('🗑️ Cleared option chain table before loading');
        }
        
        // Hide the entire table (including headers) for professional loading experience
        if (tableElement) {
            tableElement.style.display = 'none';
        }
        
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
        if (containerElement) {
            containerElement.style.display = 'block';
        }
    }
    
    hideOptionChainLoading() {
        const loadingElement = document.getElementById('optionChainLoading');
        const containerElement = document.getElementById('optionChainContainer');
        const tableElement = document.getElementById('optionChainTable');
        
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        if (containerElement) {
            containerElement.style.display = 'block';
        }
        
        // Show the table again with new data
        if (tableElement) {
            tableElement.style.display = 'table';
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
        console.log('Setting up real-time data listener with 5-second polling');
        this.realTimeInterval = setInterval(() => {
            this.checkForRealTimeUpdates();
        }, 5000); // Check every 5 seconds for real-time updates (reduced frequency)
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
                
                // Process VIX data from WebSocket
                if (result.data['NSE:INDIAVIX-INDEX']) {
                    const vixData = result.data['NSE:INDIAVIX-INDEX'];
                    const vixChange = vixData.change || 0;
                    const vixChangePct = vixData.prev_close_price > 0 ? (vixChange / vixData.prev_close_price) * 100 : 0;
                    this.updateVixDisplay(vixData.ltp, vixChange, vixChangePct);
                    console.log(`📊 VIX updated: ${vixData.ltp} (${vixChange >= 0 ? '+' : ''}${vixChange.toFixed(2)})`);
                } else {
                    console.warn(`⚠️ VIX data not found in WebSocket result:`, Object.keys(result.data || {}));
                }
                
                // Update Current Positions table with live LTP and P&L
                if (typeof window.updatePositionTableLivePrices === 'function') {
                    window.updatePositionTableLivePrices();
                }
                
                // Update spot price if available for current symbol via WebSocket streaming
                if (this.currentSymbol && result.data[this.currentSymbol]) {
                    const spotData = result.data[this.currentSymbol];
                    const newSpotPrice = spotData.ltp;
                    const dayOpen = spotData.open_price;
                    
                    // DEBUG: Log all spot data to identify day open issue
                    console.log(`🔍 SPOT DATA DEBUG:`, {
                        symbol: this.currentSymbol,
                        ltp: newSpotPrice,
                        open_price: dayOpen,
                        spotData: spotData
                    });
                    
                    if (newSpotPrice !== this.currentSpotPrice) {
                        this.updateSpotPriceDisplay(newSpotPrice, dayOpen);
                        this.updateATMDisplay(newSpotPrice);
                        this.updatePayoffChartSpotPrice();
                        console.log(`🚀 WebSocket spot price update: ${newSpotPrice}`);
                    }
                    
                    // FIXED: Always try to update day open, even if 0 - might be valid
                    if (dayOpen !== null && dayOpen !== undefined) {
                        this.updateDayOpenDisplay(dayOpen, newSpotPrice);
                        console.log(`📅 Day open updated: ${dayOpen} (Gap: ${(newSpotPrice - dayOpen).toFixed(1)})`);
                    } else {
                        console.warn(`⚠️ Day open is null/undefined for ${this.currentSymbol}`);
                    }
                }
                
                // Update futures price if available via WebSocket streaming
                if (this.currentSymbol) {
                    const futuresSymbol = this.getFuturesSymbolFromSpot(this.currentSymbol);
                    if (result.data[futuresSymbol]) {
                        const futuresData = result.data[futuresSymbol];
                        const futuresPrice = futuresData.ltp;
                        
                        // Calculate change from stored spot price
                        if (this.currentSpotPrice && futuresPrice) {
                            const change = futuresPrice - this.currentSpotPrice;
                            const changePercent = (change / this.currentSpotPrice) * 100;
                            
                            // Store futures data globally
                            window.currentFuturesData = {
                                symbol: this.currentSymbol,
                                futures_price: futuresPrice,
                                change: change,
                                change_percent: changePercent,
                                basis: change,
                                basis_pct: changePercent,
                                timestamp: new Date().toISOString()
                            };
                            
                            this.updateFuturesPriceDisplay(futuresPrice, change, changePercent);
                            console.log(`🚀 WebSocket futures price update: ${futuresPrice}`);
                        }
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
        
        // Set default values ONLY if user hasn't made a selection
        const indexSelect = document.getElementById('indexSelect');
        const expirySelect = document.getElementById('expirySelect');
        
        // Don't auto-set the dropdown value - let it stay as "Select Index"
        // User can manually select when they want to load data
        console.log('Index dropdown will remain as "Select Index" until user makes selection');
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