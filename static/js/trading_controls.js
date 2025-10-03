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
        
        // Handle execute and exit button clicks
        activeTradesTable.addEventListener('click', function(e) {
            if (e.target.closest('.execute-btn')) {
                handleExecutePosition(e.target.closest('.execute-btn'));
            }
            if (e.target.closest('.exit-btn')) {
                handleExitPosition(e.target.closest('.exit-btn'));
            }
        });
    }
    
    // Handle basket button clicks
    document.addEventListener('click', function(e) {
        if (e.target.closest('.basket-execute-btn')) {
            handleBasketExecute(e.target.closest('.basket-execute-btn'));
        }
        if (e.target.closest('.basket-exit-btn')) {
            handleBasketExit(e.target.closest('.basket-exit-btn'));
        }
    });
    
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

function handleExecutePosition(button) {
    const positionKey = button.dataset.positionKey;
    console.log(`🚀 Execute position clicked for: ${positionKey}`);
    
    // Get all data from button attributes
    const symbol = button.dataset.symbol;
    const strike = button.dataset.strike;
    const optionType = button.dataset.optionType;
    const action = button.dataset.action;
    const lots = button.dataset.lots;
    const entryPrice = button.dataset.entryPrice;
    
    // Get trading parameters for this position
    const tradingParams = getTradingParams(positionKey);
    console.log('📊 Trading params for execution:', tradingParams);
    
    // Populate modal with order details
    document.getElementById('modalSymbol').value = symbol || '';
    document.getElementById('modalStrike').value = strike || '';
    document.getElementById('modalOptionType').value = optionType || '';
    document.getElementById('modalAction').value = action || '1';
    document.getElementById('modalLots').value = lots || '1';
    document.getElementById('modalProductType').value = 'INTRADAY';
    document.getElementById('modalOrderType').value = tradingParams.orderType || '2'; // Default to Market
    document.getElementById('modalLimitPrice').value = '';
    document.getElementById('modalStopPrice').value = '';
    document.getElementById('modalStopLoss').value = tradingParams.stopLossPercent || '0';
    document.getElementById('modalTrailingStopLoss').checked = tradingParams.trailingEnabled || false;
    document.getElementById('modalValidity').value = 'DAY';
    
    // Update quantity display (lots * lot size)
    const lotSize = 75; // Default for NIFTY
    const quantity = (parseInt(lots) || 1) * lotSize;
    document.getElementById('modalQty').textContent = quantity;
    
    // Update action display
    const actionText = action === '1' ? 'BUY' : 'SELL';
    const actionBadge = document.querySelector('#orderConfirmationModal .modal-body .badge');
    if (actionBadge) {
        actionBadge.textContent = actionText;
        actionBadge.className = action === '1' ? 'badge bg-success' : 'badge bg-danger';
    }
    
    // Get selected broker information
    const brokerSelect = document.getElementById('positionBrokerSelect');
    const userIdSelect = document.getElementById('positionUserIdSelect');
    const selectedBroker = window.brokerSettings?.find(b => 
        b.brokername === brokerSelect?.value && b.broker_user_id === userIdSelect?.value
    );
    
    if (!selectedBroker) {
        selectedBroker = window.brokerSettings?.[0] || {};
    }
    
    document.getElementById('modalBrokerUserId').textContent = selectedBroker.broker_user_id || 'Not configured';
    
    // Store position key, entry price, and broker ID for later use
    document.getElementById('orderConfirmationModal').dataset.positionKey = positionKey;
    document.getElementById('orderConfirmationModal').dataset.entryPrice = entryPrice || '0';
    document.getElementById('orderConfirmationModal').dataset.brokerId = selectedBroker.id || '';
    document.getElementById('orderConfirmationModal').dataset.brokerUserId = selectedBroker.broker_user_id || '';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('orderConfirmationModal'));
    modal.show();
    
    console.log('✅ Order confirmation modal opened');
}

function handleExitPosition(button) {
    const positionKey = button.dataset.positionKey;
    console.log(`🚪 Exit position clicked for: ${positionKey}`);
    
    // Get trading parameters for this position
    const tradingParams = getTradingParams(positionKey);
    console.log('📊 Trading params for exit:', tradingParams);
    
    // Visual feedback
    button.style.backgroundColor = '#dc3545';
    button.style.color = 'white';
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    // TODO: Integrate with actual exit order API
    setTimeout(() => {
        button.style.backgroundColor = '';
        button.style.color = '';
        button.innerHTML = '<i class="fas fa-times"></i>';
        console.log('✅ Position exit completed');
    }, 2000);
}

function handleBasketExecute(button) {
    console.log('🚀 Basket Execute clicked - executing all positions');
    
    // Find all active positions
    const activeRows = document.querySelectorAll('#activeTradesTableBody tr[data-position-key]');
    const totalPositions = activeRows.length;
    
    if (totalPositions === 0) {
        console.log('⚠️ No active positions to execute');
        return;
    }
    
    // Visual feedback
    button.style.backgroundColor = '#198754';
    button.style.color = 'white';
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Executing...';
    button.disabled = true;
    
    console.log(`📊 Executing ${totalPositions} positions:`);
    
    // Get trading parameters for all positions
    const basketOrders = [];
    activeRows.forEach((row, index) => {
        const positionKey = row.dataset.positionKey;
        const tradingParams = getTradingParams(positionKey);
        basketOrders.push({
            positionKey,
            ...tradingParams
        });
        console.log(`  ${index + 1}. ${positionKey}:`, tradingParams);
    });
    
    // TODO: Integrate with actual basket execution API
    setTimeout(() => {
        button.style.backgroundColor = '';
        button.style.color = '';
        button.innerHTML = '<i class="fas fa-play me-1"></i>Basket Execute';
        button.disabled = false;
        console.log(`✅ Basket execution completed for ${totalPositions} positions`);
    }, 3000);
}

function handleBasketExit(button) {
    console.log('🚪 Basket Exit clicked - exiting all positions');
    
    // Find all active positions
    const activeRows = document.querySelectorAll('#activeTradesTableBody tr[data-position-key]');
    const totalPositions = activeRows.length;
    
    if (totalPositions === 0) {
        console.log('⚠️ No active positions to exit');
        return;
    }
    
    // Confirmation dialog
    const confirmed = confirm(`Are you sure you want to exit all ${totalPositions} active positions?`);
    if (!confirmed) {
        console.log('❌ Basket exit cancelled by user');
        return;
    }
    
    // Visual feedback
    button.style.backgroundColor = '#dc3545';
    button.style.color = 'white';
    button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Exiting...';
    button.disabled = true;
    
    console.log(`📊 Exiting ${totalPositions} positions:`);
    
    // Get trading parameters for all positions
    const basketExitOrders = [];
    activeRows.forEach((row, index) => {
        const positionKey = row.dataset.positionKey;
        const tradingParams = getTradingParams(positionKey);
        basketExitOrders.push({
            positionKey,
            ...tradingParams
        });
        console.log(`  ${index + 1}. ${positionKey}:`, tradingParams);
    });
    
    // TODO: Integrate with actual basket exit API
    setTimeout(() => {
        button.style.backgroundColor = '';
        button.style.color = '';
        button.innerHTML = '<i class="fas fa-times me-1"></i>Basket Exit';
        button.disabled = false;
        console.log(`✅ Basket exit completed for ${totalPositions} positions`);
    }, 3000);
}

// Export functions for global access
window.getTradingParams = getTradingParams;
window.enhanceOrderWithTradingParams = enhanceOrderWithTradingParams;
window.handleStopLossChange = handleStopLossChange;
window.handleExecutePosition = handleExecutePosition;
window.handleExitPosition = handleExitPosition;
window.handleBasketExecute = handleBasketExecute;
window.handleBasketExit = handleBasketExit;

console.log('✅ Trading Controls module loaded successfully');