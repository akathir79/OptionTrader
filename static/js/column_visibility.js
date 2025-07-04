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
        this.createColumnCheckboxes();
        this.setupEventListeners();
        this.loadSavedState();
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
        if (!container) {
            console.error('Column checkboxes container not found');
            return;
        }
        
        container.innerHTML = '';
        console.log('Creating grouped column checkboxes...');
        
        // Define column groups
        const columnGroups = [
            {
                title: 'Core Trading Columns',
                columns: [0, 17, 18, 19, 20, 21, 38] // CE B/S, LTP, Δ, Strike, Δ, LTP, PE B/S
            },
            {
                title: 'Volume & Open Interest',
                columns: [1, 8, 13, 14, 15, 22, 23, 24] // CE Chng, CE Chng in OI, CE OI, CE Vol, PE Vol, PE OI, PE Chng in OI, PE Chng
            },
            {
                title: 'Order Book',
                columns: [2, 3, 4, 5, 25, 26, 27, 28] // CE Bid Qty, CE Bid, CE Ask, CE Ask Qty, PE Bid Qty, PE Bid, PE Ask, PE Ask Qty
            },
            {
                title: 'Greeks',
                columns: [6, 7, 9, 10, 11, 12, 29, 30, 31, 32, 33, 34, 35, 36] // CE Greeks and PE Greeks
            },
            {
                title: 'Charts',
                columns: [16, 37] // CE Chart, PE Chart
            }
        ];
        
        // Create grouped checkboxes
        columnGroups.forEach((group, groupIndex) => {
            console.log(`Creating group ${groupIndex + 1}: ${group.title}`);
            
            // Group header
            const groupHeader = document.createElement('div');
            groupHeader.className = 'fw-bold text-primary mb-2 mt-3';
            groupHeader.style.fontSize = '11px';
            groupHeader.textContent = group.title;
            container.appendChild(groupHeader);
            
            // Group checkboxes
            group.columns.forEach(index => {
                if (index < this.columnNames.length) {
                    const isChecked = this.columnStates[index] ? 'checked' : '';
                    const checkboxDiv = document.createElement('div');
                    checkboxDiv.className = 'form-check mb-1';
                    checkboxDiv.innerHTML = `
                        <input class="form-check-input" type="checkbox" id="col_${index}" data-column="${index}" ${isChecked}>
                        <label class="form-check-label" for="col_${index}" style="font-size: 11px;">
                            ${this.columnNames[index]}
                        </label>
                    `;
                    container.appendChild(checkboxDiv);
                }
            });
        });
        
        console.log('Finished creating grouped checkboxes');
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