/**
 * Professional Market Data UI Utility
 * Provides centralized styling for price movements with crisp green/red colors
 */

class MarketDataUI {
  constructor() {
    // Use WeakMap to prevent memory leaks and ensure proper cleanup
    this.lastValues = new WeakMap();
    
    // Counter for generating stable element IDs
    this.elementIdCounter = 0;
    
    // Throttle updates to prevent excessive DOM manipulation
    this.updateQueue = new Map();
    this.isUpdating = false;
  }

  /**
   * Get or create a stable identifier for an element
   */
  getElementKey(element) {
    if (!element.hasAttribute('data-price-id')) {
      element.setAttribute('data-price-id', `md-${++this.elementIdCounter}`);
    }
    return element;
  }

  /**
   * Apply professional price update styling
   * @param {HTMLElement} element - Target element
   * @param {number} newValue - New price value
   * @param {number|null} prevValue - Previous value (optional)
   * @param {Object} options - Styling options
   */
  applyPriceUpdate(element, newValue, prevValue = null, options = {}) {
    if (!element) return;

    // Use element as WeakMap key for memory efficiency
    const elementKey = this.getElementKey(element);
    const storedValue = this.lastValues.get(elementKey);
    
    // Use stored value if no prevValue provided
    const oldValue = prevValue !== null ? prevValue : storedValue;
    
    // Format the value
    const formattedValue = this.formatValue(newValue, options);
    
    // Update text content
    element.textContent = formattedValue;
    
    // Apply movement styling if we have a previous value
    if (oldValue !== undefined && oldValue !== newValue) {
      this.applyMovementStyling(element, newValue, oldValue, options);
    }
    
    // Store the new value using WeakMap
    this.lastValues.set(elementKey, newValue);
  }

  /**
   * Apply movement styling (green for up, red for down)
   */
  applyMovementStyling(element, newValue, oldValue, options = {}) {
    // Remove existing movement classes
    element.classList.remove('md-up', 'md-down', 'flash-up', 'flash-down');
    
    // Determine movement direction
    const isUp = newValue > oldValue;
    const isDown = newValue < oldValue;
    
    if (isUp) {
      element.classList.add('md-up');
      this.triggerFlash(element, 'flash-up');
    } else if (isDown) {
      element.classList.add('md-down');
      this.triggerFlash(element, 'flash-down');
    }
  }

  /**
   * Trigger a professional flash animation
   */
  triggerFlash(element, flashClass) {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    element.classList.add(flashClass);
    
    // Remove flash class after animation
    setTimeout(() => {
      element.classList.remove(flashClass);
    }, 200);
  }

  /**
   * Format value based on options
   */
  formatValue(value, options = {}) {
    const {
      decimals = 2,
      addCommas = true,
      prefix = '',
      suffix = ''
    } = options;

    let formatted = typeof value === 'number' ? value.toFixed(decimals) : value;
    
    if (addCommas && typeof value === 'number') {
      formatted = this.addCommas(formatted);
    }
    
    return `${prefix}${formatted}${suffix}`;
  }

  /**
   * Add commas to number string
   */
  addCommas(str) {
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  /**
   * Clear all market data labels except preserved ones
   */
  clearMarketDataLabels(options = {}) {
    const { preserve = ['vix'] } = options;
    
    // Find all elements with market data classes
    const marketElements = document.querySelectorAll('[data-market-data], .price-display, .market-value');
    
    marketElements.forEach(element => {
      // Check multiple preservation criteria for robustness
      const elementId = element.id?.toLowerCase() || '';
      const dataMarketData = element.getAttribute('data-market-data')?.toLowerCase() || '';
      const classNames = element.className?.toLowerCase() || '';
      
      const shouldPreserve = preserve.some(term => {
        const termLower = term.toLowerCase();
        return elementId.includes(termLower) || 
               dataMarketData.includes(termLower) || 
               classNames.includes(`${termLower}-display`) ||
               classNames.includes(`${termLower}-value`);
      });
      
      if (!shouldPreserve) {
        element.textContent = '—';
        element.classList.remove('md-up', 'md-down', 'flash-up', 'flash-down');
        
        // Clear stored values using WeakMap
        if (this.lastValues.has(element)) {
          this.lastValues.delete(element);
        }
      }
    });
  }

  /**
   * Throttled batch update for multiple elements
   */
  batchUpdate(updates) {
    updates.forEach(({ element, value, prevValue, options }) => {
      this.applyPriceUpdate(element, value, prevValue, options);
    });
  }
}

// Create global instance
window.marketDataUI = new MarketDataUI();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MarketDataUI;
}