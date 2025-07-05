/**
 * Three Card Synchronization Controller
 * Manages communication and data flow between Symbol Selection, Option Chain, and Payoff Chart cards
 */

class ThreeCardSynchronization {
  constructor() {
    this.currentSymbol = null;
    this.currentExpiry = null;
    this.currentSpotPrice = null;
    this.currentPositions = [];
    this.isInitialized = false;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupDataSyncHandlers();
    this.isInitialized = true;
    console.log('Three-card synchronization initialized');
  }

  setupEventListeners() {
    // Listen for symbol changes from Symbol Selection card
    document.addEventListener('symbolChanged', (event) => {
      this.handleSymbolChange(event.detail);
    });

    // Listen for expiry changes from Symbol Selection card
    document.addEventListener('expiryChanged', (event) => {
      this.handleExpiryChange(event.detail);
    });

    // Listen for option chain data updates
    document.addEventListener('optionChainUpdated', (event) => {
      this.handleOptionChainUpdate(event.detail);
    });

    // Listen for spot price updates
    document.addEventListener('spotPriceUpdated', (event) => {
      this.handleSpotPriceUpdate(event.detail);
    });

    // Listen for position changes from Option Chain card
    document.addEventListener('optionBuySell', (event) => {
      this.handlePositionChange(event.detail);
    });

    // Listen for position updates from Payoff Chart card
    document.addEventListener('positionUpdated', (event) => {
      this.handlePositionUpdate(event.detail);
    });
  }

  setupDataSyncHandlers() {
    // Set up periodic synchronization checks
    setInterval(() => {
      this.syncAllCards();
    }, 2000);
  }

  handleSymbolChange(symbolData) {
    console.log('Sync: Symbol changed to', symbolData.symbol);
    this.currentSymbol = symbolData.symbol;

    // Notify all cards about symbol change
    this.notifySymbolSelectionCard({ symbol: symbolData.symbol });
    this.notifyOptionChainCard({ action: 'symbolChanged', symbol: symbolData.symbol });
    this.notifyPayoffChartCard({ action: 'symbolChanged', symbol: symbolData.symbol });

    // Update market data tracking
    if (window.marketCallSpot) {
      window.marketCallSpot.setCurrentSymbol(symbolData.symbol);
    }
  }

  handleExpiryChange(expiryData) {
    console.log('Sync: Expiry changed to', expiryData.expiry);
    this.currentExpiry = expiryData.expiry;

    // Notify cards about expiry change
    this.notifyOptionChainCard({ action: 'expiryChanged', expiry: expiryData.expiry });
    this.notifyPayoffChartCard({ action: 'expiryChanged', expiry: expiryData.expiry });
  }

  handleOptionChainUpdate(optionChainData) {
    console.log('Sync: Option chain updated');
    
    // Update payoff chart with new option data
    this.notifyPayoffChartCard({ 
      action: 'optionChainUpdated', 
      optionChain: optionChainData.optionChain,
      symbols: optionChainData.symbols
    });
  }

  handleSpotPriceUpdate(spotPriceData) {
    this.currentSpotPrice = spotPriceData.spotPrice;

    // Sync spot price across all cards
    this.notifyOptionChainCard({ action: 'spotPriceUpdated', spotPrice: spotPriceData.spotPrice });
    this.notifyPayoffChartCard({ action: 'spotPriceUpdated', spotPrice: spotPriceData.spotPrice });
    
    // Update chart vertical line
    if (window.payoffChart) {
      this.updatePayoffChartSpotLine(spotPriceData.spotPrice);
    }
  }

  handlePositionChange(positionData) {
    console.log('Sync: Position change', positionData);
    
    // Update internal position tracking
    this.updatePositionTracking(positionData);
    
    // Notify payoff chart to recalculate
    this.notifyPayoffChartCard({ 
      action: 'positionChanged', 
      position: positionData,
      allPositions: this.currentPositions
    });
  }

  handlePositionUpdate(positionUpdateData) {
    console.log('Sync: Position updated', positionUpdateData);
    
    // Update position tracking
    this.updatePositionTracking(positionUpdateData);
    
    // Sync with option chain badges
    this.notifyOptionChainCard({ action: 'positionUpdated', positions: this.currentPositions });
  }

  updatePositionTracking(positionData) {
    // Find existing position or create new one
    const existingIndex = this.currentPositions.findIndex(pos => 
      pos.strike === positionData.strikePrice && 
      pos.type === positionData.optionType &&
      pos.expiry === this.currentExpiry
    );

    if (existingIndex >= 0) {
      // Update existing position
      this.currentPositions[existingIndex] = {
        ...this.currentPositions[existingIndex],
        lots: positionData.lots || this.currentPositions[existingIndex].lots,
        currentPrice: positionData.currentPrice || this.currentPositions[existingIndex].currentPrice
      };
    } else {
      // Add new position
      this.currentPositions.push({
        strike: positionData.strikePrice,
        type: positionData.optionType,
        expiry: this.currentExpiry,
        symbol: positionData.symbol,
        lots: positionData.lots || 1,
        currentPrice: positionData.currentPrice || 0,
        entryPrice: positionData.currentPrice || 0
      });
    }
  }

  notifySymbolSelectionCard(data) {
    // Update symbol selection display if needed
    const event = new CustomEvent('syncSymbolSelection', { detail: data });
    document.dispatchEvent(event);
  }

  notifyOptionChainCard(data) {
    // Update option chain based on sync data
    const event = new CustomEvent('syncOptionChain', { detail: data });
    document.dispatchEvent(event);
  }

  notifyPayoffChartCard(data) {
    // Update payoff chart based on sync data
    const event = new CustomEvent('syncPayoffChart', { detail: data });
    document.dispatchEvent(event);
    
    // Also call direct update if function exists
    if (window.updatePayoffChart) {
      window.updatePayoffChart();
    }
  }

  updatePayoffChartSpotLine(spotPrice) {
    if (!window.payoffChart || !spotPrice) return;

    // Remove existing spot price line
    const plotLines = window.payoffChart.xAxis[0].plotLinesAndBands;
    if (plotLines) {
      plotLines.forEach(line => {
        if (line.id === 'sync-spot-price-line') {
          window.payoffChart.xAxis[0].removePlotLine(line.id);
        }
      });
    }

    // Add new spot price line
    window.payoffChart.xAxis[0].addPlotLine({
      id: 'sync-spot-price-line',
      color: '#FF6B6B',
      width: 3,
      value: spotPrice,
      dashStyle: 'Solid',
      label: {
        text: `Spot: ₹${spotPrice.toFixed(1)}`,
        align: 'center',
        rotation: 0,
        style: {
          color: '#000000',
          fontWeight: 'normal',
          fontSize: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '4px',
          borderRadius: '4px'
        }
      },
      zIndex: 5
    });
  }

  syncAllCards() {
    // Periodic sync to ensure all cards are in sync
    if (!this.isInitialized) return;

    // Get current spot price
    if (window.marketCallSpot) {
      const currentPrice = window.marketCallSpot.getCurrentSpotPrice();
      if (currentPrice && currentPrice !== this.currentSpotPrice) {
        this.handleSpotPriceUpdate({ spotPrice: currentPrice });
      }
    }

    // Sync positions with live prices
    this.syncPositionsWithLivePrices();
  }

  syncPositionsWithLivePrices() {
    if (!window.optionChainLoader) return;

    const liveData = window.optionChainLoader.getCurrentLiveData();
    if (!liveData) return;

    // Update position prices with live data
    this.currentPositions.forEach(position => {
      if (position.symbol && liveData[position.symbol]) {
        const newPrice = liveData[position.symbol].ltp;
        if (newPrice && newPrice !== position.currentPrice) {
          position.currentPrice = newPrice;
          
          // Notify payoff chart of price update
          this.notifyPayoffChartCard({ 
            action: 'priceUpdated', 
            position: position 
          });
        }
      }
    });
  }

  // Public methods for external access
  getCurrentState() {
    return {
      symbol: this.currentSymbol,
      expiry: this.currentExpiry,
      spotPrice: this.currentSpotPrice,
      positions: this.currentPositions
    };
  }

  clearAllPositions() {
    this.currentPositions = [];
    this.notifyPayoffChartCard({ action: 'clearAllPositions' });
    this.notifyOptionChainCard({ action: 'clearAllPositions' });
  }

  exportPositions() {
    return JSON.stringify(this.currentPositions, null, 2);
  }

  importPositions(positionsJson) {
    try {
      this.currentPositions = JSON.parse(positionsJson);
      this.notifyPayoffChartCard({ action: 'importPositions', positions: this.currentPositions });
      this.notifyOptionChainCard({ action: 'importPositions', positions: this.currentPositions });
      return true;
    } catch (error) {
      console.error('Error importing positions:', error);
      return false;
    }
  }

  destroy() {
    this.isInitialized = false;
    // Clean up event listeners if needed
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.threeCardSync = new ThreeCardSynchronization();
});

// Export for other modules
window.ThreeCardSynchronization = ThreeCardSynchronization;