/**
 * Option Chain Column Visibility Controller
 * Manages show/hide functionality for option chain table columns
 */

class ColumnVisibilityController {
    constructor() {
        this.columnNames = [
            'CE B/S', 'Veta', 'Volga', 'Charm', 'Vanna', 'Vega', 'Theta', 'Gamma', 'Chng', 'Bid Qty',
            'Bid', 'Ask', 'Ask Qty', 'Chng in OI', 'OI', 'Vol', 'Chart', 'LTP', 'Δ', 'Strike',
            'Δ', 'LTP', 'Chart', 'Vol', 'OI', 'Chng in OI', 'Ask Qty', 'Ask', 'Bid', 'Bid Qty',
            'Chng', 'Gamma', 'Theta', 'Vega', 'Vanna', 'Charm', 'Volga', 'Veta', 'PE B/S', 'Columns'
        ];
        this.columnStates = this.getDefaultColumnStates();
        this.init();
    }

    init() {
        this.loadSavedState();
        this.createColumnCheckboxes();
        this.setupEventListeners();
        this.applyColumnVisibility();
    }

    getDefaultColumnStates() {
        // Default visible columns for essential trading data
        const defaults = {};
        // Make essential columns visible by default
        // Default visible columns: Core Trading + Volume/OI + Order Book (as requested)
        const essentialColumns = [
            0, 17, 18, 19, 20, 21, 38, // Core Trading: CE B/S, LTP, Δ, Strike, Δ, LTP, PE B/S
            8, 13, 14, 15, 22, 23, // Volume & OI: CE Chng in OI, CE OI, CE Vol, PE Vol, PE OI, PE Chng in OI
            1, 2, 3, 4, 5, 24, 25, 26, 27, 28 // Order Book: CE Chng, CE Bid Qty, CE Bid, CE Ask, CE Ask Qty, PE Chng, PE Bid Qty, PE Bid, PE Ask, PE Ask Qty
        ];
        
        for (let i = 0; i < 40; i++) {
            defaults[i] = essentialColumns.includes(i);
        }
        
        // Hide the Columns dropdown column (index 39) by always making it invisible
        defaults[39] = false;
        
        return defaults;
    }

    createColumnCheckboxes() {
        const container = document.getElementById('columnCheckboxes');
        if (!container) return;
        
        // Clear container completely
        container.innerHTML = '';
        
        // Define column groups with proper HTML structure
        const groupsHTML = `
            <div class="column-group mb-3">
                <div class="fw-bold text-primary mb-2" style="font-size: 12px; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">Core Trading Columns</div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_0" data-column="0" ${this.columnStates[0] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_0" style="font-size: 11px;">CE B/S</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_17" data-column="17" ${this.columnStates[17] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_17" style="font-size: 11px;">LTP</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_18" data-column="18" ${this.columnStates[18] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_18" style="font-size: 11px;">Δ</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_19" data-column="19" ${this.columnStates[19] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_19" style="font-size: 11px;">Strike</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_20" data-column="20" ${this.columnStates[20] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_20" style="font-size: 11px;">Δ</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_21" data-column="21" ${this.columnStates[21] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_21" style="font-size: 11px;">LTP</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_38" data-column="38" ${this.columnStates[38] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_38" style="font-size: 11px;">PE B/S</label>
                </div>
            </div>
            
            <div class="column-group mb-3">
                <div class="fw-bold text-primary mb-2" style="font-size: 12px; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">Volume & Open Interest</div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_1" data-column="1" ${this.columnStates[1] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_1" style="font-size: 11px;">CE Chng</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_8" data-column="8" ${this.columnStates[8] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_8" style="font-size: 11px;">CE Chng in OI</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_13" data-column="13" ${this.columnStates[13] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_13" style="font-size: 11px;">CE OI</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_14" data-column="14" ${this.columnStates[14] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_14" style="font-size: 11px;">CE Vol</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_15" data-column="15" ${this.columnStates[15] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_15" style="font-size: 11px;">PE Vol</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_22" data-column="22" ${this.columnStates[22] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_22" style="font-size: 11px;">PE OI</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_23" data-column="23" ${this.columnStates[23] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_23" style="font-size: 11px;">PE Chng in OI</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_24" data-column="24" ${this.columnStates[24] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_24" style="font-size: 11px;">PE Chng</label>
                </div>
            </div>
            
            <div class="column-group mb-3">
                <div class="fw-bold text-primary mb-2" style="font-size: 12px; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">Order Book</div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_2" data-column="2" ${this.columnStates[2] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_2" style="font-size: 11px;">CE Bid Qty</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_3" data-column="3" ${this.columnStates[3] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_3" style="font-size: 11px;">CE Bid</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_4" data-column="4" ${this.columnStates[4] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_4" style="font-size: 11px;">CE Ask</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_5" data-column="5" ${this.columnStates[5] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_5" style="font-size: 11px;">CE Ask Qty</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_25" data-column="25" ${this.columnStates[25] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_25" style="font-size: 11px;">PE Bid Qty</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_26" data-column="26" ${this.columnStates[26] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_26" style="font-size: 11px;">PE Bid</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_27" data-column="27" ${this.columnStates[27] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_27" style="font-size: 11px;">PE Ask</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_28" data-column="28" ${this.columnStates[28] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_28" style="font-size: 11px;">PE Ask Qty</label>
                </div>
            </div>
            
            <div class="column-group mb-3">
                <div class="fw-bold text-primary mb-2" style="font-size: 12px; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">Greeks</div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_6" data-column="6" ${this.columnStates[6] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_6" style="font-size: 11px;">CE Gamma</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_7" data-column="7" ${this.columnStates[7] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_7" style="font-size: 11px;">CE Theta</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_9" data-column="9" ${this.columnStates[9] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_9" style="font-size: 11px;">CE Vega</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_10" data-column="10" ${this.columnStates[10] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_10" style="font-size: 11px;">CE Vanna</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_11" data-column="11" ${this.columnStates[11] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_11" style="font-size: 11px;">CE Charm</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_12" data-column="12" ${this.columnStates[12] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_12" style="font-size: 11px;">CE Volga</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_29" data-column="29" ${this.columnStates[29] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_29" style="font-size: 11px;">PE Gamma</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_30" data-column="30" ${this.columnStates[30] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_30" style="font-size: 11px;">PE Theta</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_31" data-column="31" ${this.columnStates[31] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_31" style="font-size: 11px;">PE Vega</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_32" data-column="32" ${this.columnStates[32] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_32" style="font-size: 11px;">PE Vanna</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_33" data-column="33" ${this.columnStates[33] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_33" style="font-size: 11px;">PE Charm</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_34" data-column="34" ${this.columnStates[34] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_34" style="font-size: 11px;">PE Volga</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_35" data-column="35" ${this.columnStates[35] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_35" style="font-size: 11px;">PE Veta</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_36" data-column="36" ${this.columnStates[36] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_36" style="font-size: 11px;">CE Veta</label>
                </div>
            </div>
            
            <div class="column-group mb-3">
                <div class="fw-bold text-primary mb-2" style="font-size: 12px; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">Charts</div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_16" data-column="16" ${this.columnStates[16] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_16" style="font-size: 11px;">CE Chart</label>
                </div>
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" id="col_37" data-column="37" ${this.columnStates[37] ? 'checked' : ''}>
                    <label class="form-check-label" for="col_37" style="font-size: 11px;">PE Chart</label>
                </div>
            </div>
        `;
        
        container.innerHTML = groupsHTML;
    }

    setupEventListeners() {
        // Column checkbox change handlers
        document.addEventListener('change', (e) => {
            if (e.target.matches('[data-column]')) {
                const columnIndex = parseInt(e.target.dataset.column);
                this.columnStates[columnIndex] = e.target.checked;
                this.applyColumnVisibility();
                this.saveState();
                this.refreshTableData(); // Intelligent refresh when columns change
            }
        });

        // Bulk action handlers
        document.addEventListener('click', (e) => {
            if (e.target.id === 'selectAllColumns') {
                this.selectAllColumns();
            } else if (e.target.id === 'deselectAllColumns') {
                this.deselectAllColumns();
            } else if (e.target.id === 'resetDefaultColumns') {
                this.resetToDefaults();
            }
        });
    }

    applyColumnVisibility() {
        const table = document.getElementById('optionChainTable');
        if (!table) return;

        // Apply to header
        const headerCells = table.querySelectorAll('thead th');
        headerCells.forEach((cell, index) => {
            cell.style.display = this.columnStates[index] ? '' : 'none';
        });

        // Apply to data rows
        const dataRows = table.querySelectorAll('tbody tr');
        dataRows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                cell.style.display = this.columnStates[index] ? '' : 'none';
            });
        });
    }



    selectAllColumns() {
        for (let i = 0; i < 40; i++) {
            // Don't show the Columns dropdown column (index 39)
            this.columnStates[i] = (i !== 39);
        }
        this.updateCheckboxes();
        this.applyColumnVisibility();
        this.saveState();
        this.refreshTableData();
    }

    deselectAllColumns() {
        for (let i = 0; i < 40; i++) {
            this.columnStates[i] = false;
        }
        this.updateCheckboxes();
        this.applyColumnVisibility();
        this.saveState();
        this.refreshTableData();
    }

    resetToDefaults() {
        this.columnStates = this.getDefaultColumnStates();
        this.updateCheckboxes();
        this.applyColumnVisibility();
        this.saveState();
        this.refreshTableData();
    }

    refreshTableData() {
        // Intelligent refresh when columns change to prevent data misalignment
        console.log('Refreshing option chain data due to column visibility change');
        
        // Refresh the data if WebSocket handler exists
        if (window.webSocketHandler && typeof window.webSocketHandler.refreshOptionChain === 'function') {
            window.webSocketHandler.refreshOptionChain();
        }
    }

    updateCheckboxes() {
        document.querySelectorAll('[data-column]').forEach(checkbox => {
            const columnIndex = parseInt(checkbox.dataset.column);
            checkbox.checked = this.columnStates[columnIndex];
        });
    }

    saveState() {
        localStorage.setItem('optionChainColumnStates', JSON.stringify(this.columnStates));
    }

    loadSavedState() {
        const saved = localStorage.getItem('optionChainColumnStates');
        if (saved) {
            try {
                this.columnStates = JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load saved column states:', e);
            }
        }
        this.updateCheckboxes();
    }

    // Method to refresh visibility when table content changes
    refreshVisibility() {
        this.applyColumnVisibility();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.columnVisibilityController = new ColumnVisibilityController();
});