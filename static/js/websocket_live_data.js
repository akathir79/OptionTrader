/**
 * WebSocket Live Data Handler for Option Chain
 * Handles real-time market data updates for spot prices and option chain LTP
 */

class LiveDataManager {
  constructor() {
    this.isConnected = false;
    this.subscribedSymbols = new Set();
    this.liveData = {};
    this.spotPrices = {};
    this.updateInterval = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  /**
   * Initialize WebSocket connection
   */
  async startWebSocket() {
    try {
      console.log('Starting WebSocket connection...');
      
      const response = await fetch('/api/websocket/start_websocket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (response.ok) {
        this.isConnected = true;
        this.retryCount = 0;
        console.log('WebSocket started successfully:', result.message);
        
        // Start polling for live data updates
        this.startDataPolling();
        
        this.showStatus('WebSocket Connected', 'success');
        return true;
      } else {
        console.error('Failed to start WebSocket:', result.error);
        this.showStatus('WebSocket Connection Failed', 'error');
        return false;
      }
    } catch (error) {
      console.error('WebSocket start error:', error);
      this.showStatus('WebSocket Error', 'error');
      return false;
    }
  }

  /**
   * Subscribe to symbols for live data
   */
  async subscribeToSymbols(symbols) {
    try {
      if (!Array.isArray(symbols)) {
        symbols = [symbols];
      }

      const response = await fetch('/api/websocket/subscribe_symbols', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbols: symbols })
      });

      const result = await response.json();
      
      if (response.ok) {
        result.new_symbols.forEach(symbol => this.subscribedSymbols.add(symbol));
        console.log(`Subscribed to ${result.new_symbols.length} new symbols:`, result.new_symbols);
        return true;
      } else {
        console.error('Failed to subscribe:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      return false;
    }
  }

  /**
   * Get live option chain data with WebSocket subscription
   */
  async getOptionChainLive(symbol, expiry, strikeCount = 10) {
    try {
      console.log(`Getting live option chain for ${symbol}, expiry: ${expiry}`);
      
      const response = await fetch('/api/websocket/get_option_chain_live', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: symbol,
          expiry: expiry,
          strike_count: strikeCount
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('Option chain loaded successfully:', result);
        
        // Update option chain table
        this.updateOptionChainTable(result);
        
        // Update spot price display
        this.updateSpotPriceDisplay(symbol, result.spot_price);
        
        return result;
      } else {
        console.error('Failed to get option chain:', result.error);
        this.showStatus('Option Chain Load Failed', 'error');
        return null;
      }
    } catch (error) {
      console.error('Option chain error:', error);
      this.showStatus('Option Chain Error', 'error');
      return null;
    }
  }

  /**
   * Start polling for live data updates
   */
  startDataPolling() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/websocket/get_live_data');
        const result = await response.json();
        
        if (response.ok) {
          this.liveData = result.live_data || {};
          this.spotPrices = result.spot_prices || {};
          
          // Update UI with live data
          this.updateLiveDataInTable();
          this.updateSpotPricesInHeader();
          
        } else {
          console.error('Failed to get live data:', result.error);
        }
      } catch (error) {
        console.error('Live data polling error:', error);
        this.handleConnectionError();
      }
    }, 1000); // Update every second
  }

  /**
   * Update option chain table with live data
   */
  updateOptionChainTable(optionData) {
    try {
      const tableBody = document.querySelector('#optionChainTable tbody');
      if (!tableBody) {
        console.warn('Option chain table not found');
        return;
      }

      // Clear existing table
      tableBody.innerHTML = '';

      // Add strikes to table
      optionData.strikes.forEach(strike => {
        const row = document.createElement('tr');
        
        // Add ATM highlighting
        if (strike.is_atm) {
          row.classList.add('table-warning', 'atm-strike');
        }
        
        // Determine ITM/OTM status
        const isCallITM = strike.strike < optionData.spot_price;
        const isPutITM = strike.strike > optionData.spot_price;
        
        row.innerHTML = `
          <td class="${isCallITM ? 'itm-option' : 'otm-option'}" data-symbol="${strike.ce_symbol}">
            <span class="ltp-value">${strike.ce_ltp.toFixed(2)}</span>
          </td>
          <td class="${isCallITM ? 'itm-option' : 'otm-option'}">
            <span class="oi-value">${strike.ce_oi}</span>
          </td>
          <td class="${isCallITM ? 'itm-option' : 'otm-option'}">
            <span class="iv-value">${(strike.ce_iv * 100).toFixed(2)}%</span>
          </td>
          <td class="strike-price ${strike.is_atm ? 'atm-strike-price' : ''}">${strike.strike}</td>
          <td class="${isPutITM ? 'itm-option' : 'otm-option'}">
            <span class="iv-value">${(strike.pe_iv * 100).toFixed(2)}%</span>
          </td>
          <td class="${isPutITM ? 'itm-option' : 'otm-option'}">
            <span class="oi-value">${strike.pe_oi}</span>
          </td>
          <td class="${isPutITM ? 'itm-option' : 'otm-option'}" data-symbol="${strike.pe_symbol}">
            <span class="ltp-value">${strike.pe_ltp.toFixed(2)}</span>
          </td>
        `;
        
        tableBody.appendChild(row);
      });

      console.log(`Option chain table updated with ${optionData.strikes.length} strikes`);
    } catch (error) {
      console.error('Error updating option chain table:', error);
    }
  }

  /**
   * Update live data in the table cells
   */
  updateLiveDataInTable() {
    try {
      document.querySelectorAll('[data-symbol]').forEach(cell => {
        const symbol = cell.getAttribute('data-symbol');
        const liveData = this.liveData[symbol];
        
        if (liveData && liveData.ltp) {
          const ltpElement = cell.querySelector('.ltp-value');
          if (ltpElement) {
            const oldValue = parseFloat(ltpElement.textContent);
            const newValue = parseFloat(liveData.ltp);
            
            ltpElement.textContent = newValue.toFixed(2);
            
            // Add price change animation
            if (oldValue !== newValue) {
              cell.classList.remove('price-up', 'price-down');
              if (newValue > oldValue) {
                cell.classList.add('price-up');
              } else if (newValue < oldValue) {
                cell.classList.add('price-down');
              }
              
              setTimeout(() => {
                cell.classList.remove('price-up', 'price-down');
              }, 1000);
            }
          }
          
          // Update OI if available
          const oiElement = cell.parentElement?.querySelector('.oi-value');
          if (oiElement && liveData.oi) {
            oiElement.textContent = liveData.oi;
          }
        }
      });
    } catch (error) {
      console.error('Error updating live data in table:', error);
    }
  }

  /**
   * Update spot prices in header
   */
  updateSpotPricesInHeader() {
    try {
      for (const [symbol, price] of Object.entries(this.spotPrices)) {
        const spotElement = document.querySelector(`[data-spot-symbol="${symbol}"]`);
        if (spotElement) {
          const oldPrice = parseFloat(spotElement.textContent);
          const newPrice = parseFloat(price);
          
          spotElement.textContent = newPrice.toFixed(2);
          
          // Add price change indication
          if (oldPrice !== newPrice) {
            spotElement.classList.remove('spot-up', 'spot-down');
            if (newPrice > oldPrice) {
              spotElement.classList.add('spot-up');
            } else if (newPrice < oldPrice) {
              spotElement.classList.add('spot-down');
            }
            
            setTimeout(() => {
              spotElement.classList.remove('spot-up', 'spot-down');
            }, 1000);
          }
        }
      }
    } catch (error) {
      console.error('Error updating spot prices:', error);
    }
  }

  /**
   * Update spot price display
   */
  updateSpotPriceDisplay(symbol, spotPrice) {
    try {
      // Update in market data carousel
      const marketDataElement = document.querySelector('.market-data-spot-price');
      if (marketDataElement) {
        marketDataElement.textContent = `Spot: ${spotPrice.toFixed(2)}`;
        marketDataElement.setAttribute('data-spot-symbol', symbol);
      }
      
      // Update any other spot price displays
      const spotElements = document.querySelectorAll('.spot-price-display');
      spotElements.forEach(element => {
        element.textContent = spotPrice.toFixed(2);
        element.setAttribute('data-spot-symbol', symbol);
      });
      
      console.log(`Spot price updated: ${symbol} = ${spotPrice}`);
    } catch (error) {
      console.error('Error updating spot price display:', error);
    }
  }

  /**
   * Handle connection errors and retry
   */
  handleConnectionError() {
    this.isConnected = false;
    
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`Retrying WebSocket connection (${this.retryCount}/${this.maxRetries})...`);
      
      setTimeout(() => {
        this.startWebSocket();
      }, 5000); // Retry after 5 seconds
    } else {
      console.error('Max retry attempts reached. Please check connection.');
      this.showStatus('Connection Lost', 'error');
      this.stopDataPolling();
    }
  }

  /**
   * Stop data polling
   */
  stopDataPolling() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Stop WebSocket connection
   */
  async stopWebSocket() {
    try {
      this.stopDataPolling();
      
      const response = await fetch('/api/websocket/stop_websocket', {
        method: 'POST'
      });

      const result = await response.json();
      
      if (response.ok) {
        this.isConnected = false;
        this.subscribedSymbols.clear();
        this.liveData = {};
        this.spotPrices = {};
        
        console.log('WebSocket stopped:', result.message);
        this.showStatus('WebSocket Disconnected', 'info');
        return true;
      } else {
        console.error('Failed to stop WebSocket:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Stop WebSocket error:', error);
      return false;
    }
  }

  /**
   * Get WebSocket status
   */
  async getStatus() {
    try {
      const response = await fetch('/api/websocket/websocket_status');
      const result = await response.json();
      
      if (response.ok) {
        this.isConnected = result.connected;
        return result;
      } else {
        console.error('Failed to get status:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Status check error:', error);
      return null;
    }
  }

  /**
   * Show status message
   */
  showStatus(message, type = 'info') {
    // Show toast notification if available
    if (typeof showAlert === 'function') {
      showAlert(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }
}

// Global instance
const liveDataManager = new LiveDataManager();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('LiveDataManager initialized');
  
  // Auto-start WebSocket on page load
  liveDataManager.startWebSocket();
});

// Export for global use
window.liveDataManager = liveDataManager;