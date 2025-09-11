/**
 * ========== COLOR-CODED RISK VISUALIZATION SYSTEM ==========
 * Comprehensive risk assessment and visualization for trading positions
 */

class RiskVisualization {
    constructor() {
        this.enabled = true;
        this.throttleTimeout = null;
        this.lastUpdate = 0;
        this.updateInterval = 250; // ms
        
        console.log('🎨 Risk Visualization System Initialized');
        
        // Bind methods to preserve context
        this.applyToOptionChain = this.applyToOptionChain.bind(this);
        this.applyToPositionCards = this.applyToPositionCards.bind(this);
        this.applyToActiveTrades = this.applyToActiveTrades.bind(this);
        this.throttledUpdate = this.throttledUpdate.bind(this);
        
        // Initialize after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    initialize() {
        console.log('🎨 Initializing Risk Visualization System...');
        
        // Enable risk visualization by default
        this.enableRiskVisualization();
        
        // Create risk legend/toggle
        this.createRiskControls();
        
        // Hook into existing WebSocket updates
        this.hookIntoUpdates();
        
        // Initial application
        setTimeout(() => {
            this.updateAll();
        }, 1000);
    }
    
    enableRiskVisualization() {
        const container = document.body;
        if (container) {
            container.classList.add('risk-enabled');
            console.log('✅ Risk visualization enabled');
        }
    }
    
    disableRiskVisualization() {
        const container = document.body;
        if (container) {
            container.classList.remove('risk-enabled');
            console.log('❌ Risk visualization disabled');
        }
    }
    
    toggleRiskVisualization() {
        if (document.body.classList.contains('risk-enabled')) {
            this.disableRiskVisualization();
            this.enabled = false;
        } else {
            this.enableRiskVisualization();
            this.enabled = true;
            this.updateAll();
        }
    }
    
    // ===== RISK CLASSIFICATION FUNCTIONS =====
    
    classifyPnL(pnl, premium = null) {
        if (!pnl || pnl === 0) return 'neutral';
        
        let classification = pnl > 0 ? 'profit' : 'loss';
        
        // High profit/loss classification based on percentage or absolute value
        if (premium && Math.abs(premium) > 0) {
            const percentage = (pnl / Math.abs(premium)) * 100;
            if (Math.abs(percentage) > 20) {
                classification += '-high';
            }
        } else if (Math.abs(pnl) > 5000) { // Absolute threshold for high P&L
            classification += '-high';
        }
        
        return classification;
    }
    
    classifyExpiry(expiryDate) {
        if (!expiryDate) return 'safe';
        
        const today = new Date();
        const expiry = new Date(expiryDate);
        const daysToExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        
        if (daysToExpiry <= 0) return 'urgent'; // Already expired
        if (daysToExpiry <= 7) return 'urgent';
        if (daysToExpiry <= 30) return 'moderate';
        return 'safe';
    }
    
    classifySize(lots, thresholds = { small: 1, medium: 5 }) {
        if (!lots) return 's';
        
        const numLots = Math.abs(parseInt(lots));
        
        if (numLots >= 10) return 'l'; // large
        if (numLots >= thresholds.medium) return 'm'; // medium
        return 's'; // small
    }
    
    classifyMoneyness(optionType, strike, spotPrice, bandPercent = 1) {
        if (!strike || !spotPrice || !optionType) return 'unknown';
        
        const strikeDiff = Math.abs(strike - spotPrice);
        const atmBand = spotPrice * (bandPercent / 100);
        
        // ATM classification
        if (strikeDiff <= atmBand) return 'atm';
        
        const deepThreshold = spotPrice * 0.05; // 5% for deep classifications
        
        if (optionType === 'CE') {
            if (spotPrice > strike) {
                return strikeDiff > deepThreshold ? 'deep-itm' : 'itm';
            } else {
                return strikeDiff > deepThreshold ? 'deep-otm' : 'otm';
            }
        } else { // PE
            if (spotPrice < strike) {
                return strikeDiff > deepThreshold ? 'deep-itm' : 'itm';
            } else {
                return strikeDiff > deepThreshold ? 'deep-otm' : 'otm';
            }
        }
    }
    
    // ===== DATA EXTRACTION FUNCTIONS =====
    
    extractRowData(row) {
        try {
            const data = {};
            
            // Try to get data from attributes first
            Object.assign(data, row.dataset);
            
            // Extract from table cells if no dataset
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
                // Common table structures
                if (cells.length >= 8) { // Active trades table
                    data.action = cells[0]?.textContent?.trim();
                    data.optionType = cells[2]?.textContent?.trim();
                    data.strike = parseFloat(cells[3]?.textContent?.trim());
                    data.expiry = cells[4]?.textContent?.trim();
                    data.premium = parseFloat(cells[5]?.textContent?.replace('₹', ''));
                    data.ltp = parseFloat(cells[6]?.textContent?.replace('₹', ''));
                    
                    // Extract P&L from live-pnl span
                    const pnlSpan = cells[7]?.querySelector('.live-pnl');
                    if (pnlSpan) {
                        data.pnl = parseFloat(pnlSpan.textContent?.replace('₹', '')) || 0;
                    }
                    
                    // Extract lots from lots-count span
                    const lotsSpan = cells[8]?.querySelector('.lots-count');
                    data.lots = parseInt(lotsSpan?.textContent) || 1;
                }
            }
            
            // Get current spot price for moneyness calculation
            data.spotPrice = window.currentSpotPrice || window.websocketHandler?.getCurrentSpotPrice() || 25000;
            
            return data;
        } catch (error) {
            console.warn('Error extracting row data:', error);
            return {};
        }
    }
    
    extractCardData(card) {
        try {
            const data = Object.assign({}, card.dataset);
            
            // Extract from card content if needed
            const cardContent = card.innerHTML;
            
            // Try to parse from existing global positions
            const cardId = card.id;
            const key = cardId.replace(/Card_\\d+$/, '').replace(/^(ce|pe)/, match => match.toUpperCase());
            
            if (window.globalPositions && window.globalPositions[key]) {
                Object.assign(data, window.globalPositions[key]);
            }
            
            data.spotPrice = window.currentSpotPrice || 25000;
            
            return data;
        } catch (error) {
            console.warn('Error extracting card data:', error);
            return {};
        }
    }
    
    // ===== APPLICATION FUNCTIONS =====
    
    applyRiskClasses(element, data) {
        if (!element || !this.enabled) return;
        
        // Remove existing risk classes
        const riskClasses = Array.from(element.classList).filter(cls => cls.startsWith('risk-'));
        riskClasses.forEach(cls => element.classList.remove(cls));
        
        // Add base risk visualization class
        element.classList.add('risk-visualization');
        
        // Apply P&L classification
        if (data.pnl !== undefined) {
            const pnlClass = this.classifyPnL(data.pnl, data.premium);
            element.classList.add(`risk-pnl-${pnlClass}`);
        }
        
        // Apply expiry classification
        if (data.expiry) {
            const expiryClass = this.classifyExpiry(data.expiry);
            element.classList.add(`risk-expiry-${expiryClass}`);
        }
        
        // Apply size classification
        if (data.lots) {
            const sizeClass = this.classifySize(data.lots);
            element.classList.add(`risk-size-${sizeClass}`);
        }
        
        // Apply moneyness classification
        if (data.optionType && data.strike && data.spotPrice) {
            const moneynessClass = this.classifyMoneyness(data.optionType, data.strike, data.spotPrice);
            element.classList.add(`risk-money-${moneynessClass}`);
        }
        
        // Mark as having active position if applicable
        if (window.globalPositions) {
            const positionKey = `${data.optionType}_${data.strike}_${data.expiry}`;
            if (window.globalPositions[positionKey]) {
                element.classList.add('risk-active-position');
            }
        }
        
        // Add accessibility attributes
        this.addAccessibilityInfo(element, data);
    }
    
    addAccessibilityInfo(element, data) {
        let description = 'Position: ';
        
        if (data.pnl !== undefined) {
            const pnlStatus = data.pnl > 0 ? 'Profit' : data.pnl < 0 ? 'Loss' : 'Breakeven';
            description += `${pnlStatus} ₹${Math.abs(data.pnl || 0).toFixed(2)}. `;
        }
        
        if (data.expiry) {
            const expiryRisk = this.classifyExpiry(data.expiry);
            const riskLevel = expiryRisk === 'urgent' ? 'High Risk' : 
                             expiryRisk === 'moderate' ? 'Moderate Risk' : 'Low Risk';
            description += `Expiry: ${riskLevel}. `;
        }
        
        if (data.lots) {
            const sizeRisk = this.classifySize(data.lots);
            const sizeDesc = sizeRisk === 'l' ? 'Large' : sizeRisk === 'm' ? 'Medium' : 'Small';
            description += `Size: ${sizeDesc} (${Math.abs(data.lots)} lots).`;
        }
        
        element.setAttribute('aria-label', description);
    }
    
    // ===== UPDATE FUNCTIONS =====
    
    applyToRow(row) {
        if (!row.classList.contains('riskable')) {
            row.classList.add('riskable');
        }
        
        const data = this.extractRowData(row);
        this.applyRiskClasses(row, data);
    }
    
    applyToOptionChain() {
        const tableBody = document.querySelector('#optionChainTable tbody');
        if (!tableBody) return;
        
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            this.applyToRow(row);
        });
        
        console.log(`🎨 Applied risk visualization to ${rows.length} option chain rows`);
    }
    
    applyToActiveTrades() {
        const tableBody = document.getElementById('activeTradesTableBody');
        if (!tableBody) return;
        
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            this.applyToRow(row);
        });
        
        console.log(`🎨 Applied risk visualization to ${rows.length} active trade rows`);
    }
    
    applyToPositionCards() {
        const cards = document.querySelectorAll('.position-management-card');
        cards.forEach(card => {
            if (!card.classList.contains('riskable')) {
                card.classList.add('riskable');
            }
            
            const data = this.extractCardData(card);
            this.applyRiskClasses(card, data);
        });
        
        console.log(`🎨 Applied risk visualization to ${cards.length} position cards`);
    }
    
    applyToCurrentPositions() {
        const tableBody = document.getElementById('currentPositionsTableBody');
        if (!tableBody) return;
        
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            this.applyToRow(row);
        });
        
        console.log(`🎨 Applied risk visualization to ${rows.length} current position rows`);
    }
    
    throttledUpdate() {
        const now = Date.now();
        if (now - this.lastUpdate < this.updateInterval) return;
        
        if (this.throttleTimeout) {
            clearTimeout(this.throttleTimeout);
        }
        
        this.throttleTimeout = setTimeout(() => {
            this.updateAll();
            this.lastUpdate = Date.now();
        }, this.updateInterval);
    }
    
    updateAll() {
        if (!this.enabled) return;
        
        console.log('🎨 Updating all risk visualizations...');
        
        this.applyToOptionChain();
        this.applyToActiveTrades();
        this.applyToPositionCards();
        this.applyToCurrentPositions();
    }
    
    // ===== INTEGRATION HOOKS =====
    
    hookIntoUpdates() {
        // Hook into WebSocket updates
        if (window.websocketHandler) {
            // Override updateSpotPriceDisplay to trigger risk updates
            const originalUpdateSpotPrice = window.websocketHandler.updateSpotPriceDisplay;
            if (originalUpdateSpotPrice) {
                window.websocketHandler.updateSpotPriceDisplay = (...args) => {
                    originalUpdateSpotPrice.apply(window.websocketHandler, args);
                    this.throttledUpdate();
                };
            }
            
            // Hook into other update methods
            const originalUpdateLiveTableData = window.websocketHandler.updateLiveTableData;
            if (originalUpdateLiveTableData) {
                window.websocketHandler.updateLiveTableData = (...args) => {
                    originalUpdateLiveTableData.apply(window.websocketHandler, args);
                    this.throttledUpdate();
                };
            }
        }
        
        // Hook into position update functions
        if (window.updateActiveTradesTable) {
            const originalUpdateActiveTrades = window.updateActiveTradesTable;
            window.updateActiveTradesTable = (...args) => {
                originalUpdateActiveTrades.apply(window, args);
                setTimeout(() => this.applyToActiveTrades(), 100);
            };
        }
        
        if (window.updateCurrentPositionsTable) {
            const originalUpdateCurrentPositions = window.updateCurrentPositionsTable;
            window.updateCurrentPositions = (...args) => {
                originalUpdateCurrentPositions.apply(window, args);
                setTimeout(() => this.applyToCurrentPositions(), 100);
            };
        }
        
        console.log('✅ Risk visualization hooks installed');
    }
    
    // ===== UI CONTROLS =====
    
    createRiskControls() {
        // Create risk toggle button
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'riskToggleBtn';
        toggleBtn.className = 'btn btn-sm btn-outline-primary position-fixed';
        toggleBtn.style.cssText = 'top: 60px; right: 10px; z-index: 1001; font-size: 10px;';
        toggleBtn.innerHTML = '<i class=\"fas fa-palette\"></i>';
        toggleBtn.title = 'Toggle Risk Visualization';
        toggleBtn.onclick = () => this.toggleRiskVisualization();
        
        // Create risk legend
        const legendHtml = `
            <div id=\"riskLegend\" class=\"position-fixed\" style=\"top: 100px; right: 10px; z-index: 1000; background: rgba(255,255,255,0.95); border-radius: 8px; padding: 12px; font-size: 11px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width: 220px; display: none;\">
                <div class=\"fw-bold mb-3 text-center\" style=\"color: #007bff;\">
                    <i class=\"fas fa-palette\"></i> Risk Visualization Legend
                </div>
                
                <div class=\"mb-3\">
                    <div class=\"small fw-bold mb-1\">📊 Profit/Loss:</div>
                    <div class=\"d-flex gap-1 mb-1\">
                        <span class=\"risk-badge profit\">Profit</span>
                        <span class=\"risk-badge loss\">Loss</span>
                        <span class=\"risk-badge neutral\">Neutral</span>
                    </div>
                </div>
                
                <div class=\"mb-3\">
                    <div class=\"small fw-bold mb-1\">⏰ Expiry Risk:</div>
                    <div class=\"d-flex gap-1 mb-1\">
                        <span class=\"risk-badge urgent\">Urgent</span>
                        <span class=\"risk-badge moderate\">Moderate</span>
                        <span class=\"risk-badge safe\">Safe</span>
                    </div>
                </div>
                
                <div class=\"mb-3\">
                    <div class=\"small fw-bold mb-1\">📏 Position Size:</div>
                    <div class=\"d-flex gap-1 mb-1\">
                        <span class=\"badge bg-info\">Small</span>
                        <span class=\"badge bg-warning\">Medium</span>
                        <span class=\"badge bg-danger\">Large</span>
                    </div>
                </div>
                
                <div class=\"text-center mt-3\">
                    <small class=\"text-muted\">
                        <i class=\"fas fa-info-circle\"></i> 
                        Colors combine to show overall risk
                    </small>
                </div>
            </div>
        `;
        
        // Add controls to page
        setTimeout(() => {
            document.body.appendChild(toggleBtn);
            document.body.insertAdjacentHTML('beforeend', legendHtml);
            
            // Legend toggle functionality
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const legend = document.getElementById('riskLegend');
                const isVisible = legend.style.display !== 'none';
                legend.style.display = isVisible ? 'none' : 'block';
                
                // Update button appearance
                toggleBtn.classList.toggle('btn-outline-primary', !isVisible);
                toggleBtn.classList.toggle('btn-primary', isVisible);
            });
            
            // Close legend when clicking outside
            document.addEventListener('click', (e) => {
                const legend = document.getElementById('riskLegend');
                const toggleBtn = document.getElementById('riskToggleBtn');
                
                if (legend && toggleBtn && 
                    !legend.contains(e.target) && 
                    !toggleBtn.contains(e.target)) {
                    legend.style.display = 'none';
                    toggleBtn.classList.remove('btn-primary');
                    toggleBtn.classList.add('btn-outline-primary');
                }
            });
            
        }, 1000);
    }
}

// Initialize the risk visualization system
window.RiskVisualization = RiskVisualization;
window.riskViz = new RiskVisualization();

// Export for manual control
window.toggleRiskVisualization = () => window.riskViz.toggleRiskVisualization();
window.updateRiskVisualization = () => window.riskViz.updateAll();

console.log('🎨 Risk Visualization System Ready!');