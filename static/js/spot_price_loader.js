/**
 * Simple spot price loader for symbol selection
 */
class SpotPriceLoader {
    constructor() {
        this.currentSymbol = null;
        this.isLoading = false;
    }

    /**
     * Load spot price for selected symbol
     */
    async loadSpotPrice(symbol) {
        if (!symbol || this.isLoading) {
            return;
        }

        this.isLoading = true;
        this.currentSymbol = symbol;

        try {
            // Show loading indicator
            this.showLoadingIndicator();

            // Make API call to get spot price
            const response = await fetch(`/api/get_spot_price?symbol=${encodeURIComponent(symbol)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Update spot price display
            this.updateSpotPriceDisplay(data.spot_price);
            
            console.log(`Loaded spot price for ${symbol}: ${data.spot_price}`);

        } catch (error) {
            console.error('Error loading spot price:', error);
            this.showError(error.message);
        } finally {
            this.isLoading = false;
            this.hideLoadingIndicator();
        }
    }

    /**
     * Update spot price display in UI
     */
    updateSpotPriceDisplay(spotPrice) {
        // Update main spot price display
        const spotPriceElement = document.getElementById('spot-price');
        if (spotPriceElement) {
            spotPriceElement.textContent = spotPrice.toFixed(2);
        }

        // Update any other spot price displays
        const spotPriceElements = document.querySelectorAll('.spot-price-display');
        spotPriceElements.forEach(element => {
            element.textContent = spotPrice.toFixed(2);
        });

        // Update header if exists
        const headerSpotPrice = document.querySelector('.header-spot-price');
        if (headerSpotPrice) {
            headerSpotPrice.textContent = `₹${spotPrice.toFixed(2)}`;
        }
    }

    /**
     * Show loading indicator
     */
    showLoadingIndicator() {
        const spotPriceElement = document.getElementById('spot-price');
        if (spotPriceElement) {
            spotPriceElement.textContent = 'Loading...';
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoadingIndicator() {
        // Loading indicator is replaced by actual price or error
    }

    /**
     * Show error message
     */
    showError(message) {
        const spotPriceElement = document.getElementById('spot-price');
        if (spotPriceElement) {
            spotPriceElement.textContent = 'Error';
            spotPriceElement.style.color = 'red';
        }
        
        // Show toast notification if available
        if (typeof showToast === 'function') {
            showToast(message, 'bg-danger');
        }
    }

    /**
     * Initialize spot price loader
     */
    init() {
        // Listen for symbol selection changes
        document.addEventListener('symbolSelected', (event) => {
            if (event.detail && event.detail.symbol) {
                this.loadSpotPrice(event.detail.symbol);
            }
        });

        // Also listen for expiry selection
        document.addEventListener('expirySelected', (event) => {
            if (this.currentSymbol) {
                this.loadSpotPrice(this.currentSymbol);
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.spotPriceLoader = new SpotPriceLoader();
    window.spotPriceLoader.init();
});

// Helper function to trigger spot price loading from other scripts
function loadSpotPriceForSymbol(symbol) {
    if (window.spotPriceLoader) {
        window.spotPriceLoader.loadSpotPrice(symbol);
    }
}