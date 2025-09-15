/**
 * Professional Trading Controls for Active Trades Table
 * Handles Order Type, Stop Loss %, and Trailing Stop Loss functionality
 * Integrates with Fyers API v3 order management
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Trading Controls initialized');
    
    // Initialize trading controls
    initTradingControls();
});

function initTradingControls() {
    // Handle default stop loss percentage changes
    const defaultStopLossInput = document.getElementById('defaultStopLossPercent');
    if (defaultStopLossInput) {
        defaultStopLossInput.addEventListener('input', function(e) {
            const defaultPercent = parseFloat(e.target.value) || 0;
            console.log(`🎯 Default SL % changed to: ${defaultPercent}%`);
            
            // Apply to all unfilled stop loss inputs
            applyDefaultStopLoss(defaultPercent);
        });
    }
    
    // Use event delegation for dynamically created table rows
    const activeTradesTable = document.getElementById('activeTradesTableBody');
    if (activeTradesTable) {
        // Handle stop loss input changes
        activeTradesTable.addEventListener('input', function(e) {
            if (e.target.classList.contains('stop-loss-input')) {
                handleStopLossChange(e.target);
            }
        });
        
        // Handle order type changes
        activeTradesTable.addEventListener('change', function(e) {
            if (e.target.classList.contains('order-type-select')) {
                handleOrderTypeChange(e.target);
            }
        });
        
        // Handle trailing stop loss changes
        activeTradesTable.addEventListener('change', function(e) {
            if (e.target.classList.contains('trailing-sl-checkbox')) {
                handleTrailingStopLossChange(e.target);
            }
        });
    }
    
    console.log('✅ Trading controls event handlers initialized');
}

function applyDefaultStopLoss(defaultPercent) {
    const stopLossInputs = document.querySelectorAll('.stop-loss-input');
    stopLossInputs.forEach(input => {
        // Only apply to inputs that are empty or at 0
        if (!input.value || parseFloat(input.value) === 0) {
            input.value = defaultPercent;
            handleStopLossChange(input);
        }
    });
}

function handleStopLossChange(input) {
    const percent = parseFloat(input.value) || 0;
    const entryPrice = parseFloat(input.dataset.entryPrice) || 0;
    const action = input.dataset.action || '';
    const positionKey = input.dataset.positionKey;
    
    if (entryPrice === 0) {
        console.warn('⚠️ No entry price available for stop loss calculation');
        return;
    }
    
    let stopLossPrice = 0;
    
    if (percent > 0) {
        // Calculate stop loss based on action type
        if (action.toLowerCase().includes('buy')) {
            // For Buy: SL = Entry * (1 - percent/100)
            stopLossPrice = entryPrice * (1 - percent / 100);
        } else {
            // For Sell: SL = Entry * (1 + percent/100)  
            stopLossPrice = entryPrice * (1 + percent / 100);
        }
    }
    
    // Update the price display
    const priceDisplay = input.parentElement.querySelector('.sl-price-display');
    if (priceDisplay) {
        priceDisplay.textContent = stopLossPrice > 0 ? `₹${stopLossPrice.toFixed(2)}` : '₹0.00';
        priceDisplay.style.color = stopLossPrice > 0 ? '#d63384' : '#666';
    }
    
    // Store calculated values in dataset
    input.dataset.calculatedPrice = stopLossPrice.toFixed(2);
    
    console.log(`📊 SL calculated for ${positionKey}: ${percent}% = ₹${stopLossPrice.toFixed(2)}`);
}

function handleOrderTypeChange(select) {
    const orderType = select.value;
    const positionKey = select.dataset.positionKey;
    
    console.log(`📋 Order type changed for ${positionKey}: ${orderType}`);
    
    // Store order type preference
    select.dataset.selectedType = orderType;
    
    // Visual feedback based on order type
    select.style.backgroundColor = getOrderTypeColor(orderType);
}

function handleTrailingStopLossChange(checkbox) {
    const isEnabled = checkbox.checked;
    const positionKey = checkbox.dataset.positionKey;
    
    console.log(`🔄 Trailing SL ${isEnabled ? 'enabled' : 'disabled'} for ${positionKey}`);
    
    // Store trailing stop loss preference
    checkbox.dataset.trailingEnabled = isEnabled;
    
    // Visual feedback
    checkbox.parentElement.style.backgroundColor = isEnabled ? '#e8f5e8' : '';
}

function getOrderTypeColor(orderType) {
    switch (orderType) {
        case '1': return '#e3f2fd'; // Market - Light Blue
        case '2': return '#f3e5f5'; // Limit - Light Purple
        case '3': return '#fff3e0'; // SL-M - Light Orange
        case '4': return '#ffebee'; // SL-L - Light Red
        default: return '';
    }
}

// Function to collect trading parameters from a row
function getTradingParams(positionKey) {
    const row = document.querySelector(`tr[data-position-key="${positionKey}"]`);
    if (!row) return null;
    
    const orderTypeSelect = row.querySelector('.order-type-select');
    const stopLossInput = row.querySelector('.stop-loss-input');
    const trailingCheckbox = row.querySelector('.trailing-sl-checkbox');
    
    return {
        orderType: orderTypeSelect?.value || '1',
        stopLossPercent: parseFloat(stopLossInput?.value) || 0,
        stopLossPrice: parseFloat(stopLossInput?.dataset.calculatedPrice) || 0,
        trailingEnabled: trailingCheckbox?.checked || false,
        positionKey: positionKey
    };
}

// Function to integrate with existing order submission
function enhanceOrderWithTradingParams(orderData, positionKey) {
    const tradingParams = getTradingParams(positionKey);
    if (!tradingParams) return orderData;
    
    // Enhance order data with trading parameters
    const enhancedOrder = {
        ...orderData,
        orderType: tradingParams.orderType,
        stopLossPercent: tradingParams.stopLossPercent,
        stopLossPrice: tradingParams.stopLossPrice,
        trailingEnabled: tradingParams.trailingEnabled
    };
    
    console.log('🚀 Enhanced order with trading params:', enhancedOrder);
    return enhancedOrder;
}

// Export functions for global access
window.getTradingParams = getTradingParams;
window.enhanceOrderWithTradingParams = enhanceOrderWithTradingParams;
window.handleStopLossChange = handleStopLossChange;

console.log('✅ Trading Controls module loaded successfully');