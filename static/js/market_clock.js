/**
 * World Market Clock Component
 * Manages world market times, notifications, and sound alerts
 */

class MarketClock {
    constructor() {
        this.markets = [];
        this.notificationInterval = null;
        this.audioContext = null;
        this.initialized = false;
        
        // Initialize audio context for notifications
        this.initAudio();
    }

    init() {
        if (this.initialized) return;
        
        // Create modal HTML if it doesn't exist
        if (!document.getElementById('marketClockModal')) {
            this.createModalHTML();
        }
        
        this.setupEventListeners();
        this.loadMarkets();
        this.startNotificationLoop();
        this.initializeToggleStates();
        this.initialized = true;
        
        console.log('Market Clock initialized');
    }

    initializeToggleStates() {
        // Initialize notification toggle
        const notificationToggle = document.getElementById('globalNotifications');
        if (notificationToggle) {
            const notificationsEnabled = this.isGlobalNotificationsEnabled();
            notificationToggle.checked = notificationsEnabled;
            
            const notificationIcon = document.querySelector('#globalNotifications + label i');
            if (notificationIcon) {
                notificationIcon.className = notificationsEnabled ? 'fas fa-bell me-1' : 'fas fa-bell-slash me-1';
            }
        }
        
        // Initialize sound toggle
        const soundToggle = document.getElementById('globalSound');
        if (soundToggle) {
            const soundEnabled = this.isGlobalSoundEnabled();
            soundToggle.checked = soundEnabled;
            
            const soundIcon = document.querySelector('#globalSound + label i');
            if (soundIcon) {
                soundIcon.className = soundEnabled ? 'fas fa-volume-up me-1' : 'fas fa-volume-mute me-1';
            }
        }
        
        // Update Markets button status
        this.updateMarketsButtonStatus();
    }

    createModalHTML() {
        const modalHtml = `
<!-- Market Clock Popup Modal -->
<div id="marketClockModal" class="modal fade" tabindex="-1" aria-labelledby="marketClockModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-xl">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="marketClockModalLabel">
          <i class="fas fa-globe me-2"></i>World Market Times & Notifications
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <!-- Market Status Dashboard -->
        <div class="row mb-4">
          <div class="col-12">
            <div class="card">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0"><i class="fas fa-chart-bar me-2"></i>Current Market Status</h6>
                <div class="d-flex gap-2 align-items-center">
                  <!-- Global Notification Controls -->
                  <div class="form-check form-switch me-3">
                    <input class="form-check-input" type="checkbox" id="globalNotifications" checked>
                    <label class="form-check-label" for="globalNotifications">
                      <i class="fas fa-bell me-1"></i>Notifications
                    </label>
                  </div>
                  <div class="form-check form-switch me-3">
                    <input class="form-check-input" type="checkbox" id="globalSound" checked>
                    <label class="form-check-label" for="globalSound">
                      <i class="fas fa-volume-up me-1"></i>Sound
                    </label>
                  </div>
                  <div class="vr me-2"></div>
                  <button id="refreshMarketStatus" class="btn btn-outline-primary btn-sm">
                    <i class="fas fa-sync-alt me-1"></i>Refresh
                  </button>
                  <button id="addNewMarket" class="btn btn-primary btn-sm">
                    <i class="fas fa-plus me-1"></i>Add Market
                  </button>
                  <button id="initDefaultMarkets" class="btn btn-success btn-sm">
                    <i class="fas fa-download me-1"></i>Load Defaults
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div id="marketStatusGrid" class="row">
                  <!-- Market status cards will be populated here -->
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Market Management Table -->
        <div class="row">
          <div class="col-12">
            <div class="card">
              <div class="card-header d-flex justify-content-between align-items-center">
                <h6 class="mb-0"><i class="fas fa-cog me-2"></i>Manage Market Times</h6>
                <div class="btn-group btn-group-sm">
                  <button id="selectAllNotifications" class="btn btn-outline-success btn-sm">
                    <i class="fas fa-check-double me-1"></i>All Notifications
                  </button>
                  <button id="selectAllSounds" class="btn btn-outline-info btn-sm">
                    <i class="fas fa-volume-up me-1"></i>All Sounds
                  </button>
                  <button id="deselectAll" class="btn btn-outline-secondary btn-sm">
                    <i class="fas fa-times me-1"></i>Disable All
                  </button>
                </div>
              </div>
              <div class="card-body">
                <div class="table-responsive">
                  <table id="marketTimesTable" class="table table-striped table-sm">
                    <thead>
                      <tr>
                        <th>Market</th>
                        <th>Country</th>
                        <th>Trading Hours</th>
                        <th>Status</th>
                        <th style="min-width: 200px;">Individual Controls</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <!-- Market data will be populated here -->
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Add/Edit Market Form -->
        <div id="marketFormContainer" class="row mt-4" style="display: none;">
          <div class="col-12">
            <div class="card border-primary">
              <div class="card-header bg-primary text-white">
                <h6 class="mb-0"><i class="fas fa-edit me-2"></i><span id="formTitle">Add New Market</span></h6>
              </div>
              <div class="card-body">
                <form id="marketForm">
                  <input type="hidden" id="marketId" value="">
                  <div class="row">
                    <div class="col-md-6">
                      <div class="mb-3">
                        <label for="marketName" class="form-label">Market Name</label>
                        <input type="text" class="form-control" id="marketName" required>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="mb-3">
                        <label for="country" class="form-label">Country</label>
                        <input type="text" class="form-control" id="country" required>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="mb-3">
                        <label for="exchangeCode" class="form-label">Exchange Code</label>
                        <input type="text" class="form-control" id="exchangeCode" required>
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-md-3">
                      <div class="mb-3">
                        <label for="openTime" class="form-label">Open Time</label>
                        <input type="time" class="form-control" id="openTime" required>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="mb-3">
                        <label for="closeTime" class="form-label">Close Time</label>
                        <input type="time" class="form-control" id="closeTime" required>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="mb-3">
                        <label for="timezone" class="form-label">Timezone</label>
                        <select class="form-select" id="timezone" required>
                          <option value="">Select Timezone</option>
                          <option value="America/New_York">America/New_York (EST/EDT)</option>
                          <option value="Europe/London">Europe/London (GMT/BST)</option>
                          <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                          <option value="Asia/Hong_Kong">Asia/Hong_Kong (HKT)</option>
                          <option value="Asia/Shanghai">Asia/Shanghai (CST)</option>
                          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                          <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-md-4">
                      <div class="mb-3">
                        <label class="form-label">Notification Settings</label>
                        <div class="form-check">
                          <input class="form-check-input" type="checkbox" id="notifyOpen" checked>
                          <label class="form-check-label" for="notifyOpen">Opening Notification</label>
                        </div>
                        <div class="form-check">
                          <input class="form-check-input" type="checkbox" id="notifyClose" checked>
                          <label class="form-check-label" for="notifyClose">Closing Notification</label>
                        </div>
                        <div class="form-check">
                          <input class="form-check-input" type="checkbox" id="soundEnabled" checked>
                          <label class="form-check-label" for="soundEnabled">Sound Alerts</label>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <div class="mb-3">
                        <label class="form-label">Extended Hours (Optional)</label>
                        <div class="row">
                          <div class="col-6">
                            <label for="premarketStart" class="form-label small">Pre-market</label>
                            <input type="time" class="form-control form-control-sm" id="premarketStart">
                          </div>
                          <div class="col-6">
                            <label for="afterhoursEnd" class="form-label small">After-hours</label>
                            <input type="time" class="form-control form-control-sm" id="afterhoursEnd">
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-4">
                      <div class="mb-3">
                        <label class="form-label">Lunch Break (Optional)</label>
                        <div class="row">
                          <div class="col-6">
                            <label for="lunchStart" class="form-label small">Start</label>
                            <input type="time" class="form-control form-control-sm" id="lunchStart">
                          </div>
                          <div class="col-6">
                            <label for="lunchEnd" class="form-label small">End</label>
                            <input type="time" class="form-control form-control-sm" id="lunchEnd">
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="d-flex gap-2">
                    <button type="submit" class="btn btn-primary">
                      <i class="fas fa-save me-1"></i>Save Market
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="window.marketClock.hideForm()">
                      <i class="fas fa-times me-1"></i>Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Notification Toast Container -->
<div id="notificationContainer" class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1055;">
  <!-- Toast notifications will appear here -->
</div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    setupEventListeners() {
        // Global notification controls
        document.getElementById('globalNotifications')?.addEventListener('change', (e) => {
            this.toggleGlobalNotifications(e.target.checked);
        });

        document.getElementById('globalSound')?.addEventListener('change', (e) => {
            this.toggleGlobalSound(e.target.checked);
        });

        // Refresh button
        document.getElementById('refreshMarketStatus')?.addEventListener('click', () => {
            this.refreshStatus();
        });

        // Add new market button
        document.getElementById('addNewMarket')?.addEventListener('click', () => {
            this.showForm();
        });

        // Initialize default markets button
        document.getElementById('initDefaultMarkets')?.addEventListener('click', () => {
            this.initializeDefaultMarkets();
        });

        // Market form submission
        document.getElementById('marketForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMarket();
        });

        // Bulk control buttons
        document.getElementById('selectAllNotifications')?.addEventListener('click', () => {
            this.bulkToggleNotifications(true);
        });

        document.getElementById('selectAllSounds')?.addEventListener('click', () => {
            this.bulkToggleSounds(true);
        });

        document.getElementById('deselectAll')?.addEventListener('click', () => {
            this.bulkDisableAll();
        });
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Audio context not supported:', error);
        }
    }

    toggleGlobalNotifications(enabled) {
        localStorage.setItem('marketClock_globalNotifications', enabled);
        console.log(`Global notifications ${enabled ? 'enabled' : 'disabled'}`);
        
        // Update the visual state
        const icon = document.querySelector('#globalNotifications + label i');
        if (icon) {
            icon.className = enabled ? 'fas fa-bell me-1' : 'fas fa-bell-slash me-1';
        }
        
        // Update the Markets button indicator
        this.updateMarketsButtonStatus();
        
        // Show status message
        this.showNotification(
            `Market notifications ${enabled ? 'enabled' : 'disabled'}`,
            enabled ? 'success' : 'warning'
        );
    }

    toggleGlobalSound(enabled) {
        localStorage.setItem('marketClock_globalSound', enabled);
        console.log(`Global sound ${enabled ? 'enabled' : 'disabled'}`);
        
        // Update the visual state
        const icon = document.querySelector('#globalSound + label i');
        if (icon) {
            icon.className = enabled ? 'fas fa-volume-up me-1' : 'fas fa-volume-mute me-1';
        }
        
        // Update the Markets button indicator
        this.updateMarketsButtonStatus();
        
        // Show status message
        this.showNotification(
            `Market sound alerts ${enabled ? 'enabled' : 'disabled'}`,
            enabled ? 'success' : 'warning'
        );
        
        // Play a test sound if enabling
        if (enabled) {
            setTimeout(() => this.playNotificationSound(), 500);
        }
    }

    updateMarketsButtonStatus() {
        const marketsButton = document.querySelector('.btn-warning[onclick="window.marketClock.showPopup()"]');
        if (!marketsButton) return;
        
        const notificationsEnabled = this.isGlobalNotificationsEnabled();
        const soundEnabled = this.isGlobalSoundEnabled();
        
        let statusText = 'Markets';
        let statusIcon = 'fas fa-globe';
        
        if (!notificationsEnabled && !soundEnabled) {
            statusText = 'Markets (Silent)';
            statusIcon = 'fas fa-globe text-muted';
        } else if (!notificationsEnabled) {
            statusText = 'Markets (No Alerts)';
            statusIcon = 'fas fa-globe';
        } else if (!soundEnabled) {
            statusText = 'Markets (Muted)';
            statusIcon = 'fas fa-globe';
        }
        
        // Update button text and icon
        marketsButton.innerHTML = `<i class="${statusIcon} me-1"></i>${statusText}`;
        
        // Update button color based on status
        if (!notificationsEnabled && !soundEnabled) {
            marketsButton.className = marketsButton.className.replace('btn-warning', 'btn-secondary');
        } else {
            marketsButton.className = marketsButton.className.replace('btn-secondary', 'btn-warning');
        }
    }

    isGlobalNotificationsEnabled() {
        return localStorage.getItem('marketClock_globalNotifications') !== 'false';
    }

    isGlobalSoundEnabled() {
        return localStorage.getItem('marketClock_globalSound') !== 'false';
    }

    async toggleMarketNotification(marketId, type, enabled) {
        try {
            const market = this.markets.find(m => m.id === marketId);
            if (!market) return;

            const updateData = {};
            if (type === 'open') {
                updateData.notify_open = enabled;
            } else if (type === 'close') {
                updateData.notify_close = enabled;
            }

            const response = await fetch(`/api/market-times/${marketId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                // Update local market data
                if (type === 'open') {
                    market.notify_open = enabled;
                } else if (type === 'close') {
                    market.notify_close = enabled;
                }

                this.showNotification(
                    `${market.market_name} ${type} notifications ${enabled ? 'enabled' : 'disabled'}`,
                    enabled ? 'success' : 'warning'
                );
                
                console.log(`Market ${marketId} ${type} notifications ${enabled ? 'enabled' : 'disabled'}`);
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error updating notification setting', 'danger');
                
                // Revert the checkbox
                const checkbox = document.getElementById(`notify${type.charAt(0).toUpperCase() + type.slice(1)}_${marketId}`);
                if (checkbox) checkbox.checked = !enabled;
            }
        } catch (error) {
            console.error('Error toggling market notification:', error);
            this.showNotification('Error updating notification setting', 'danger');
            
            // Revert the checkbox
            const checkbox = document.getElementById(`notify${type.charAt(0).toUpperCase() + type.slice(1)}_${marketId}`);
            if (checkbox) checkbox.checked = !enabled;
        }
    }

    async toggleMarketSound(marketId, enabled) {
        try {
            const market = this.markets.find(m => m.id === marketId);
            if (!market) return;

            const response = await fetch(`/api/market-times/${marketId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sound_enabled: enabled })
            });

            if (response.ok) {
                // Update local market data
                market.sound_enabled = enabled;

                this.showNotification(
                    `${market.market_name} sound alerts ${enabled ? 'enabled' : 'disabled'}`,
                    enabled ? 'success' : 'warning'
                );
                
                // Play test sound if enabling
                if (enabled && this.isGlobalSoundEnabled()) {
                    setTimeout(() => this.playNotificationSound(), 300);
                }
                
                console.log(`Market ${marketId} sound ${enabled ? 'enabled' : 'disabled'}`);
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error updating sound setting', 'danger');
                
                // Revert the checkbox
                const checkbox = document.getElementById(`soundEnabled_${marketId}`);
                if (checkbox) checkbox.checked = !enabled;
            }
        } catch (error) {
            console.error('Error toggling market sound:', error);
            this.showNotification('Error updating sound setting', 'danger');
            
            // Revert the checkbox
            const checkbox = document.getElementById(`soundEnabled_${marketId}`);
            if (checkbox) checkbox.checked = !enabled;
        }
    }

    async bulkToggleNotifications(enabled) {
        this.showNotification('Updating all notification settings...', 'info');
        
        for (const market of this.markets) {
            try {
                const response = await fetch(`/api/market-times/${market.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        notify_open: enabled,
                        notify_close: enabled 
                    })
                });

                if (response.ok) {
                    market.notify_open = enabled;
                    market.notify_close = enabled;
                }
            } catch (error) {
                console.error(`Error updating notifications for ${market.market_name}:`, error);
            }
        }
        
        this.renderMarketTable();
        this.showNotification(
            `All market notifications ${enabled ? 'enabled' : 'disabled'}`,
            enabled ? 'success' : 'warning'
        );
    }

    async bulkToggleSounds(enabled) {
        this.showNotification('Updating all sound settings...', 'info');
        
        for (const market of this.markets) {
            try {
                const response = await fetch(`/api/market-times/${market.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ sound_enabled: enabled })
                });

                if (response.ok) {
                    market.sound_enabled = enabled;
                }
            } catch (error) {
                console.error(`Error updating sound for ${market.market_name}:`, error);
            }
        }
        
        this.renderMarketTable();
        this.showNotification(
            `All market sounds ${enabled ? 'enabled' : 'disabled'}`,
            enabled ? 'success' : 'warning'
        );

        // Play test sound if enabling
        if (enabled && this.isGlobalSoundEnabled()) {
            setTimeout(() => this.playNotificationSound(), 500);
        }
    }

    async bulkDisableAll() {
        this.showNotification('Disabling all notifications and sounds...', 'info');
        
        for (const market of this.markets) {
            try {
                const response = await fetch(`/api/market-times/${market.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        notify_open: false,
                        notify_close: false,
                        sound_enabled: false 
                    })
                });

                if (response.ok) {
                    market.notify_open = false;
                    market.notify_close = false;
                    market.sound_enabled = false;
                }
            } catch (error) {
                console.error(`Error updating settings for ${market.market_name}:`, error);
            }
        }
        
        this.renderMarketTable();
        this.showNotification('All market notifications and sounds disabled', 'warning');
    }

    playNotificationSound() {
        if (!this.audioContext || !this.isGlobalSoundEnabled()) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
        } catch (error) {
            console.warn('Error playing notification sound:', error);
        }
    }

    showPopup() {
        this.init();
        const modal = new bootstrap.Modal(document.getElementById('marketClockModal'));
        modal.show();
        this.refreshStatus();
    }

    showForm(market = null) {
        const container = document.getElementById('marketFormContainer');
        const title = document.getElementById('formTitle');
        const form = document.getElementById('marketForm');
        
        container.style.display = 'block';
        
        if (market) {
            title.textContent = 'Edit Market';
            this.populateForm(market);
        } else {
            title.textContent = 'Add New Market';
            form.reset();
            document.getElementById('marketId').value = '';
        }
        
        container.scrollIntoView({ behavior: 'smooth' });
    }

    hideForm() {
        document.getElementById('marketFormContainer').style.display = 'none';
    }

    populateForm(market) {
        document.getElementById('marketId').value = market.id;
        document.getElementById('marketName').value = market.market_name;
        document.getElementById('country').value = market.country;
        document.getElementById('exchangeCode').value = market.exchange_code;
        document.getElementById('openTime').value = market.local_open_time;
        document.getElementById('closeTime').value = market.local_close_time;
        document.getElementById('timezone').value = market.timezone;
        document.getElementById('notifyOpen').checked = market.notify_open;
        document.getElementById('notifyClose').checked = market.notify_close;
        document.getElementById('soundEnabled').checked = market.sound_enabled;
        document.getElementById('premarketStart').value = market.premarket_start || '';
        document.getElementById('afterhoursEnd').value = market.afterhours_end || '';
        document.getElementById('lunchStart').value = market.lunch_start || '';
        document.getElementById('lunchEnd').value = market.lunch_end || '';
    }

    async loadMarkets() {
        try {
            const response = await fetch('/api/market-times');
            if (response.ok) {
                this.markets = await response.json();
                this.renderMarketTable();
            }
        } catch (error) {
            console.error('Error loading markets:', error);
            this.showNotification('Error loading market data', 'danger');
        }
    }

    async refreshStatus() {
        try {
            const response = await fetch('/api/market-times/status');
            if (response.ok) {
                const marketStatus = await response.json();
                this.renderMarketStatus(marketStatus);
            }
        } catch (error) {
            console.error('Error refreshing status:', error);
            this.showNotification('Error refreshing market status', 'danger');
        }
    }

    async saveMarket() {
        const form = document.getElementById('marketForm');
        const formData = new FormData(form);
        const marketId = document.getElementById('marketId').value;
        
        const data = {
            market_name: formData.get('marketName') || document.getElementById('marketName').value,
            country: formData.get('country') || document.getElementById('country').value,
            exchange_code: formData.get('exchangeCode') || document.getElementById('exchangeCode').value,
            local_open_time: formData.get('openTime') || document.getElementById('openTime').value,
            local_close_time: formData.get('closeTime') || document.getElementById('closeTime').value,
            timezone: formData.get('timezone') || document.getElementById('timezone').value,
            notify_open: document.getElementById('notifyOpen').checked,
            notify_close: document.getElementById('notifyClose').checked,
            sound_enabled: document.getElementById('soundEnabled').checked,
            premarket_start: document.getElementById('premarketStart').value || null,
            afterhours_end: document.getElementById('afterhoursEnd').value || null,
            lunch_start: document.getElementById('lunchStart').value || null,
            lunch_end: document.getElementById('lunchEnd').value || null
        };

        try {
            const url = marketId ? `/api/market-times/${marketId}` : '/api/market-times';
            const method = marketId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showNotification(`Market ${marketId ? 'updated' : 'created'} successfully`, 'success');
                this.hideForm();
                this.loadMarkets();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error saving market', 'danger');
            }
        } catch (error) {
            console.error('Error saving market:', error);
            this.showNotification('Error saving market', 'danger');
        }
    }

    async deleteMarket(marketId) {
        if (!confirm('Are you sure you want to delete this market?')) return;

        try {
            const response = await fetch(`/api/market-times/${marketId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('Market deleted successfully', 'success');
                this.loadMarkets();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error deleting market', 'danger');
            }
        } catch (error) {
            console.error('Error deleting market:', error);
            this.showNotification('Error deleting market', 'danger');
        }
    }

    async initializeDefaultMarkets() {
        try {
            const response = await fetch('/api/market-times/initialize', {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                this.showNotification(result.message, 'success');
                this.loadMarkets();
            } else {
                const error = await response.json();
                this.showNotification(error.error || 'Error initializing markets', 'danger');
            }
        } catch (error) {
            console.error('Error initializing markets:', error);
            this.showNotification('Error initializing markets', 'danger');
        }
    }

    renderMarketStatus(marketStatus) {
        const grid = document.getElementById('marketStatusGrid');
        if (!grid) return;

        grid.innerHTML = marketStatus.map(market => {
            const statusColor = this.getStatusColor(market.status);
            const statusIcon = this.getStatusIcon(market.status);
            
            return `
                <div class="col-md-4 col-lg-3 mb-3">
                    <div class="card border-${statusColor}">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="card-title mb-1">${market.market_name}</h6>
                                    <small class="text-muted">${market.country}</small>
                                </div>
                                <span class="badge bg-${statusColor}">
                                    <i class="fas ${statusIcon} me-1"></i>${market.status.replace('_', ' ')}
                                </span>
                            </div>
                            <div class="mt-2">
                                <div class="d-flex justify-content-between">
                                    <small>Local Time:</small>
                                    <small class="fw-bold">${market.local_time}</small>
                                </div>
                                <div class="d-flex justify-content-between">
                                    <small>Next:</small>
                                    <small class="text-${statusColor}">${market.next_event.replace('_', ' ')}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderMarketTable() {
        const tbody = document.querySelector('#marketTimesTable tbody');
        if (!tbody) return;

        tbody.innerHTML = this.markets.map(market => `
            <tr>
                <td>
                    <strong>${market.market_name}</strong>
                    <br><small class="text-muted">${market.exchange_code}</small>
                </td>
                <td>${market.country}</td>
                <td>
                    ${market.local_open_time} - ${market.local_close_time}
                    <br><small class="text-muted">${market.timezone}</small>
                </td>
                <td>
                    <span class="badge bg-${market.is_active ? 'success' : 'secondary'}">
                        ${market.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="d-flex flex-column gap-1">
                        <!-- Individual Notification Controls -->
                        <div class="d-flex gap-2 align-items-center">
                            <div class="form-check form-switch form-check-inline">
                                <input class="form-check-input" type="checkbox" id="notifyOpen_${market.id}" 
                                       ${market.notify_open ? 'checked' : ''} 
                                       onchange="window.marketClock.toggleMarketNotification(${market.id}, 'open', this.checked)">
                                <label class="form-check-label" for="notifyOpen_${market.id}">
                                    <i class="fas fa-bell-o me-1"></i>Open
                                </label>
                            </div>
                            <div class="form-check form-switch form-check-inline">
                                <input class="form-check-input" type="checkbox" id="notifyClose_${market.id}" 
                                       ${market.notify_close ? 'checked' : ''} 
                                       onchange="window.marketClock.toggleMarketNotification(${market.id}, 'close', this.checked)">
                                <label class="form-check-label" for="notifyClose_${market.id}">
                                    <i class="fas fa-bell me-1"></i>Close
                                </label>
                            </div>
                        </div>
                        <div class="d-flex gap-2 align-items-center">
                            <div class="form-check form-switch form-check-inline">
                                <input class="form-check-input" type="checkbox" id="soundEnabled_${market.id}" 
                                       ${market.sound_enabled ? 'checked' : ''} 
                                       onchange="window.marketClock.toggleMarketSound(${market.id}, this.checked)">
                                <label class="form-check-label" for="soundEnabled_${market.id}">
                                    <i class="fas fa-volume-up me-1"></i>Sound
                                </label>
                            </div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="window.marketClock.showForm(${JSON.stringify(market).replace(/"/g, '&quot;')})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="window.marketClock.deleteMarket(${market.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getStatusColor(status) {
        switch (status) {
            case 'open': return 'success';
            case 'pre_market': return 'info';
            case 'lunch_break': return 'warning';
            case 'closed': return 'secondary';
            default: return 'secondary';
        }
    }

    getStatusIcon(status) {
        switch (status) {
            case 'open': return 'fa-circle';
            case 'pre_market': return 'fa-clock';
            case 'lunch_break': return 'fa-pause';
            case 'closed': return 'fa-times-circle';
            default: return 'fa-question-circle';
        }
    }

    startNotificationLoop() {
        // Check for notifications every minute
        this.notificationInterval = setInterval(() => {
            this.checkNotifications();
        }, 60000);
    }

    async checkNotifications() {
        // Skip if global notifications are disabled
        if (!this.isGlobalNotificationsEnabled()) {
            return;
        }
        
        try {
            const response = await fetch('/api/market-times/status');
            if (response.ok) {
                const marketStatus = await response.json();
                
                marketStatus.forEach(market => {
                    if (market.notify_open || market.notify_close) {
                        this.checkMarketNotification(market);
                    }
                });
            }
        } catch (error) {
            console.error('Error checking notifications:', error);
        }
    }

    checkMarketNotification(market) {
        const now = new Date();
        const currentTime = now.toTimeString().substr(0, 5); // HH:MM format
        
        // Check if market is opening
        if (market.notify_open && currentTime === market.local_open_time && market.is_trading_day) {
            this.showMarketNotification(market, 'opening');
            if (market.sound_enabled) {
                this.playNotificationSound();
            }
        }
        
        // Check if market is closing
        if (market.notify_close && currentTime === market.local_close_time && market.is_trading_day) {
            this.showMarketNotification(market, 'closing');
            if (market.sound_enabled) {
                this.playNotificationSound();
            }
        }
    }

    showMarketNotification(market, event) {
        const title = `${market.market_name} ${event}`;
        const message = `${market.market_name} (${market.country}) is ${event} now at ${market.local_time}`;
        
        this.showNotification(message, event === 'opening' ? 'success' : 'warning', title);
        
        // Also show browser notification if permission granted
        if (Notification.permission === 'granted') {
            new Notification(title, {
                body: message,
                icon: '/static/icons/market-clock.ico'
            });
        }
    }

    showNotification(message, type = 'info', title = null) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;

        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <i class="fas fa-clock text-${type} me-2"></i>
                    <strong class="me-auto">${title || 'Market Notification'}</strong>
                    <small class="text-muted">${new Date().toLocaleTimeString()}</small>
                    <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', toastHtml);
        
        const toast = new bootstrap.Toast(document.getElementById(toastId));
        toast.show();

        // Auto-remove after shown
        document.getElementById(toastId).addEventListener('hidden.bs.toast', () => {
            document.getElementById(toastId).remove();
        });
    }

    // Request notification permission on first use
    async requestNotificationPermission() {
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }

    destroy() {
        if (this.notificationInterval) {
            clearInterval(this.notificationInterval);
            this.notificationInterval = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}

// Initialize global market clock instance
window.marketClock = new MarketClock();

// Auto-initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    // Request notification permission
    window.marketClock.requestNotificationPermission();
    
    // Initialize button status after a short delay to ensure DOM is ready
    setTimeout(() => {
        window.marketClock.updateMarketsButtonStatus();
    }, 100);
    
    console.log('Market Clock component loaded');
});