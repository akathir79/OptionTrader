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
            'Chng', 'Gamma', 'Theta', 'Vega', 'Vanna', 'Charm', 'Volga', 'Veta', 'PE B/S'
        ];
        this.columnStates = this.getDefaultColumnStates();
        this.groupedControls = []; // Initialize grouped controls
        this.init();
    }

    init() {
        this.createColumnCheckboxes();
        this.setupEventListeners();
        this.loadSavedState();
        this.applyColumnVisibility();
        
        // Reapply column visibility after every WebSocket update
        this.setupWebSocketHooks();
    }

    getDefaultColumnStates() {
        // Default visible columns for essential trading data only
        const defaults = {};
        // Essential columns: CE B/S(0), Change in OI(13), OI(14), Vol(15), LTP(17), Delta(18), Strike(19), Delta(20), LTP(21), Vol(23), OI(24), Change in OI(25), PE B/S(38)
        const essentialColumns = [0, 13, 14, 15, 17, 18, 19, 20, 21, 23, 24, 25, 38];
        
        for (let i = 0; i < 39; i++) {
            defaults[i] = essentialColumns.includes(i);
        }
        
        return defaults;
    }

    createColumnCheckboxes() {
        console.log('createColumnCheckboxes called');
        let container = document.getElementById('columnCheckboxes');
        console.log('Container found:', container);
        
        // If container not found, wait a bit and try again
        if (!container) {
            console.log('Container not found, trying again after delay');
            setTimeout(() => {
                container = document.getElementById('columnCheckboxes');
                if (container) {
                    console.log('Container found on retry, creating checkboxes');
                    this.doCreateCheckboxes(container);
                } else {
                    console.log('Container still not found after retry');
                }
            }, 100);
            return;
        }
        
        this.doCreateCheckboxes(container);
    }
    
    doCreateCheckboxes(container) {
        
        container.innerHTML = '';
        
        // All column names exactly as they appear in the table header
        const columnNames = [
            'CE B/S',           // 0
            'Veta',             // 1  
            'Volga',            // 2
            'Charm',            // 3
            'Vanna',            // 4
            'Vega',             // 5
            'Theta',            // 6
            'Gamma',            // 7
            'Chng',             // 8
            'Bid Qty',          // 9
            'Bid',              // 10
            'Ask',              // 11
            'Ask Qty',          // 12
            'Chng in OI',       // 13
            'OI',               // 14
            'Vol',              // 15
            'Chart',            // 16
            'LTP',              // 17
            'Δ (CE)',           // 18
            'Strike',           // 19
            'Δ (PE)',           // 20
            'LTP',              // 21
            'Chart',            // 22
            'Vol',              // 23
            'OI',               // 24
            'Chng in OI',       // 25
            'Ask Qty',          // 26
            'Ask',              // 27
            'Bid',              // 28
            'Bid Qty',          // 29
            'Chng',             // 30
            'Gamma',            // 31
            'Theta',            // 32
            'Vega',             // 33
            'Vanna',            // 34
            'Charm',            // 35
            'Volga',            // 36
            'Veta',             // 37
            'PE B/S'            // 38
        ];
        
        // Add header with control buttons
        container.innerHTML = `
            <div style="border-bottom: 1px solid #e9ecef; padding-bottom: 10px; margin-bottom: 12px;">
                <div style="display: flex; gap: 6px; margin-bottom: 8px;">
                    <button id="selectAllColumns" class="btn btn-success btn-sm" style="font-size: 9px; padding: 3px 6px;">
                        Select All
                    </button>
                    <button id="deselectAllColumns" class="btn btn-secondary btn-sm" style="font-size: 9px; padding: 3px 6px;">
                        Clear All
                    </button>
                    <button id="resetToDefaults" class="btn btn-primary btn-sm" style="font-size: 9px; padding: 3px 6px;">
                        Defaults
                    </button>
                </div>
            </div>
        `;
        
        // Create individual checkboxes organized by Call vs Put columns
        let rowHTML = '<div class="row g-3" style="font-size: 10px;">';
        
        // CE (Call) columns - Left side (0-18) + Strike
        rowHTML += '<div class="col-6">';
        rowHTML += '<div style="font-weight: 600; color: #28a745; margin-bottom: 8px; font-size: 11px; border-bottom: 1px solid #28a745; padding-bottom: 4px;">Call (CE) Options</div>';
        
        // CE columns (0-18) + Strike (19)
        for (let i = 0; i <= 19; i++) {
            const isChecked = this.columnStates[i] ? 'checked' : '';
            const labelStyle = i === 19 ? 'font-weight: 600; color: #f39c12;' : ''; // Highlight Strike
            rowHTML += `
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" data-column="${i}" id="col${i}" ${isChecked}>
                    <label class="form-check-label" for="col${i}" style="font-size: 9px; ${labelStyle}">
                        ${columnNames[i]}
                    </label>
                </div>
            `;
        }
        rowHTML += '</div>';
        
        // PE (Put) columns - Right side (20-38)
        rowHTML += '<div class="col-6">';
        rowHTML += '<div style="font-weight: 600; color: #dc3545; margin-bottom: 8px; font-size: 11px; border-bottom: 1px solid #dc3545; padding-bottom: 4px;">Put (PE) Options</div>';
        
        // PE columns (20-38)
        for (let i = 20; i < columnNames.length; i++) {
            const isChecked = this.columnStates[i] ? 'checked' : '';
            rowHTML += `
                <div class="form-check mb-1">
                    <input class="form-check-input" type="checkbox" data-column="${i}" id="col${i}" ${isChecked}>
                    <label class="form-check-label" for="col${i}" style="font-size: 9px;">
                        ${columnNames[i]}
                    </label>
                </div>
            `;
        }
        rowHTML += '</div>';
        
        rowHTML += '</div>'; // Close row
        
        // Add the complete row to container
        container.innerHTML += rowHTML;
        
        // CRITICAL: Setup event listeners AFTER creating checkboxes  
        this.setupCheckboxEventListeners();
        console.log('✅ Column checkboxes created and event listeners attached');
    }

    setupCheckboxEventListeners() {
        console.log('🎯 Setting up checkbox event listeners...');
        
        // Find all column checkboxes and attach individual event listeners
        const checkboxes = document.querySelectorAll('#columnCheckboxes input[data-column]');
        console.log(`📋 Found ${checkboxes.length} checkboxes to attach listeners to`);
        
        checkboxes.forEach(checkbox => {
            const columnIndex = parseInt(checkbox.dataset.column);
            
            // Remove any existing listeners to avoid duplicates
            checkbox.removeEventListener('change', checkbox._columnChangeHandler);
            
            // Create the event handler
            checkbox._columnChangeHandler = (e) => {
                const isChecked = e.target.checked;
                
                console.log(`🔄 Column change detected: ${columnIndex} (${this.columnNames[columnIndex]}) = ${isChecked}`);
                
                // Toggle this specific column
                this.columnStates[columnIndex] = isChecked;
                
                console.log('📊 Updated column states:', this.columnStates);
                
                console.log('⚡ About to call applyColumnVisibility...');
                this.applyColumnVisibility();
                console.log('💾 About to call saveState...');
                this.saveState();
                console.log('🔄 About to call refreshTableData...');
                this.refreshTableData(); // Intelligent refresh when columns change
                
                // Additional verification after a short delay
                setTimeout(() => {
                    const table = document.getElementById('optionChainTable');
                    if (table) {
                        const headerCell = table.querySelector(`thead th:nth-child(${columnIndex + 1})`);
                        const bodyCell = table.querySelector(`tbody td:nth-child(${columnIndex + 1})`);
                        console.log(`🔍 Verification - Column ${columnIndex} header display:`, headerCell?.style.display);
                        console.log(`🔍 Verification - Column ${columnIndex} body display:`, bodyCell?.style.display);
                    }
                }, 150);
            };
            
            // Attach the event listener
            checkbox.addEventListener('change', checkbox._columnChangeHandler);
            console.log(`✅ Event listener attached to column ${columnIndex} checkbox`);
        });
    }

    setupEventListeners() {
        // Bulk action button handlers only (checkbox handlers are in setupCheckboxEventListeners)
        document.addEventListener('click', (e) => {
            if (e.target.id === 'selectAllColumns') {
                this.selectAllColumns();
            } else if (e.target.id === 'deselectAllColumns') {
                this.deselectAllColumns();
            } else if (e.target.id === 'resetToDefaults') {
                this.resetToDefaults();
            }
        });

    }

    applyColumnVisibility() {
        console.log('🚀 applyColumnVisibility() called');
        
        const table = document.getElementById('optionChainTable');
        if (!table) {
            console.log('❌ Table not found for column visibility');
            return;
        }

        console.log('✅ Table found, proceeding with column visibility');

        // Debug the column states before processing
        console.log('🔍 this.columnStates type:', typeof this.columnStates);
        console.log('🔍 this.columnStates length:', this.columnStates ? this.columnStates.length : 'undefined');
        console.log('🔍 this.columnStates content:', this.columnStates);

        // CRITICAL FIX: Convert object to array if needed
        console.log('🔍 Array.isArray(this.columnStates):', Array.isArray(this.columnStates));
        console.log('🔍 Has length property:', 'length' in this.columnStates);
        console.log('🔍 Constructor:', this.columnStates.constructor.name);
        
        if (this.columnStates && typeof this.columnStates === 'object' && !Array.isArray(this.columnStates)) {
            console.log('🔧 Converting columnStates object to array...');
            const arrayStates = [];
            for (let i = 0; i < 39; i++) { // 39 total columns
                arrayStates[i] = this.columnStates[i.toString()] || false;
            }
            this.columnStates = arrayStates;
            console.log('✅ Converted to array:', this.columnStates);
        } else {
            console.log('🚫 Conversion check failed - isArray:', Array.isArray(this.columnStates));
        }

        // Log current column states for debugging
        const visibleColumns = this.columnStates.map((visible, index) => visible ? index : null).filter(i => i !== null);
        console.log('🎯 Applying column visibility. Visible columns:', visibleColumns);

        // Create dynamic CSS to override existing rules
        let dynamicCSS = '';
        
        for (let i = 0; i < this.columnStates.length; i++) {
            const shouldShow = this.columnStates[i];
            const nthChild = i + 1; // CSS nth-child is 1-based
            
            if (shouldShow) {
                // Force show with maximum specificity
                dynamicCSS += `
                    #optionChainTable thead th:nth-child(${nthChild}),
                    #optionChainTable tbody td:nth-child(${nthChild}) {
                        display: table-cell !important;
                    }
                `;
                console.log(`🟢 Showing column ${i} (${this.columnNames[i]})`);
            } else {
                // Force hide
                dynamicCSS += `
                    #optionChainTable thead th:nth-child(${nthChild}),
                    #optionChainTable tbody td:nth-child(${nthChild}) {
                        display: none !important;
                    }
                `;
            }
        }
        
        // Remove existing dynamic style if exists
        const existingStyle = document.getElementById('dynamicColumnVisibility');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Add new dynamic style
        const styleElement = document.createElement('style');
        styleElement.id = 'dynamicColumnVisibility';
        styleElement.textContent = dynamicCSS;
        document.head.appendChild(styleElement);
        
        console.log(`✅ Column visibility CSS applied - ${this.columnStates.length} columns processed`);
        console.log('🔍 Dynamic CSS created with', visibleColumns.length, 'visible columns');
        console.log('📝 Generated CSS:', dynamicCSS.substring(0, 300) + '...');
        
        // Verify the style element was added
        const verifyStyle = document.getElementById('dynamicColumnVisibility');
        console.log('🎯 Style element in DOM:', !!verifyStyle);
        if (verifyStyle) {
            console.log('📄 Style element content length:', verifyStyle.textContent.length);
        }
        
        // Force immediate visual check
        setTimeout(() => {
            const table = document.getElementById('optionChainTable');
            if (table) {
                const headerRow = table.querySelector('thead tr');
                const visibleHeaders = Array.from(headerRow.children).filter(th => 
                    getComputedStyle(th).display !== 'none'
                ).length;
                console.log(`🔍 Currently visible header columns: ${visibleHeaders}`);
            }
        }, 100);
    }



    selectAllColumns() {
        for (let i = 0; i < 39; i++) {
            this.columnStates[i] = true;
        }
        this.updateCheckboxes();
        this.applyColumnVisibility();
        this.saveState();
        this.refreshTableData();
    }

    deselectAllColumns() {
        for (let i = 0; i < 39; i++) {
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
        document.querySelectorAll('[data-group]').forEach(checkbox => {
            const groupIndex = parseInt(checkbox.dataset.group);
            const group = this.groupedControls[groupIndex];
            // Check if all columns in this group are visible
            checkbox.checked = group.columns.every(col => this.columnStates[col]);
        });
    }

    saveState() {
        localStorage.setItem('optionChainColumnStates', JSON.stringify(this.columnStates));
    }

    loadSavedState() {
        // Force reset to essential-only columns - clear all old preferences
        console.log('Forcing reset to essential-only column defaults');
        localStorage.removeItem('optionChainColumnStates');
        localStorage.removeItem('optionChainColumnVersion');
        
        this.columnStates = this.getDefaultColumnStates();
        localStorage.setItem('optionChainColumnVersion', '2.2');
        this.saveState();
        this.updateCheckboxes();
    }

    // Method to refresh visibility when table content changes
    refreshVisibility() {
        this.applyColumnVisibility();
    }

    setupWebSocketHooks() {
        // Hook into WebSocket updates to reapply column visibility
        const originalWebSocketUpdate = window.webSocketHandler?.updateOptionChainTable;
        if (originalWebSocketUpdate) {
            window.webSocketHandler.updateOptionChainTable = (data) => {
                // Call original function
                originalWebSocketUpdate.call(window.webSocketHandler, data);
                // Reapply column visibility after update
                console.log('WebSocket updated table, reapplying column visibility');
                setTimeout(() => this.applyColumnVisibility(), 100);
            };
        }

        // Also set up a continuous reapplication to fight WebSocket updates
        setInterval(() => {
            if (document.getElementById('optionChainTable')) {
                this.applyColumnVisibility();
            }
        }, 2000); // Reapply every 2 seconds
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.columnVisibilityController = new ColumnVisibilityController();
});

// Also initialize when dropdown is opened (in case DOM wasn't ready)
document.addEventListener('show.bs.dropdown', (e) => {
    if (e.target.id === 'columnVisibilityDropdown') {
        console.log('Column visibility dropdown opened, ensuring checkboxes exist');
        if (window.columnVisibilityController) {
            window.columnVisibilityController.createColumnCheckboxes();
        }
    }
});