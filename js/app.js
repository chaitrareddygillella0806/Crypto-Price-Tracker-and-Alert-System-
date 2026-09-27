/**
 * Main Application Controller & UI Orchestration
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Components
  const alertEngine = window.AlertEngine;
  const marketManager = window.MarketDataManager;
  const chartController = window.PriceChartController;

  // DOM Elements
  const tabButtons = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const marketGrid = document.getElementById('marketGrid');
  const tickerTrack = document.getElementById('tickerTrack');
  const activeAlertsTableBody = document.getElementById('activeAlertsTableBody');
  const alertHistoryTableBody = document.getElementById('alertHistoryTableBody');
  const wsStatusEl = document.getElementById('wsStatus');
  const wsDotEl = document.getElementById('wsDot');
  const toastContainer = document.getElementById('toast-container');
  const searchInput = document.getElementById('searchAssetInput');
  const filterButtons = document.querySelectorAll('.filter-btn');

  // Stats Counters
  const statActiveAlerts = document.getElementById('statActiveAlerts');
  const statTriggeredCount = document.getElementById('statTriggeredCount');
  const statAssetsCount = document.getElementById('statAssetsCount');
  const badgeActiveAlerts = document.getElementById('badgeActiveAlerts');
  const badgeHistory = document.getElementById('badgeHistory');

  // Modal Elements
  const alertModal = document.getElementById('alertModal');
  const alertModalTitle = document.getElementById('alertModalTitle');
  const alertModalForm = document.getElementById('alertModalForm');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalCancelBtn = document.getElementById('modalCancelBtn');
  const btnOpenAlertModal = document.getElementById('btnOpenAlertModal');
  const alertAssetSelect = document.getElementById('alertAssetSelect');
  const alertConditionSelect = document.getElementById('alertConditionSelect');
  const alertTargetInput = document.getElementById('alertTargetInput');
  const alertSoundSelect = document.getElementById('alertSoundSelect');
  const alertDesktopToggle = document.getElementById('alertDesktopToggle');
  const alertSoundToggle = document.getElementById('alertSoundToggle');
  const alertOnceToggle = document.getElementById('alertOnceToggle');
  const alertNoteInput = document.getElementById('alertNoteInput');
  const currentPricePreview = document.getElementById('currentPricePreview');

  // Filter State
  let currentFilter = 'all'; // 'all' | 'crypto' | 'stock'
  let searchQuery = '';

  // Theme Management
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateThemeIcon(next);
      if (chartController.initialized) {
        chartController.renderChart();
      }
    });
  }

  function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    themeToggleBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
  }

  // --- Tab Navigation ---
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(`tab-${targetTab}`);
      if (pane) pane.classList.add('active');

      if (targetTab === 'chart' && !chartController.initialized) {
        chartController.init();
      } else if (targetTab === 'chart') {
        chartController.renderChart();
      }
    });
  });

  // --- Populate Modal Assets Dropdown ---
  function populateModalAssetDropdown() {
    if (!alertAssetSelect) return;
    alertAssetSelect.innerHTML = '';
    const assets = marketManager.getAllAssets();

    const groupCrypto = document.createElement('optgroup');
    groupCrypto.label = 'Cryptocurrencies';
    const groupStock = document.createElement('optgroup');
    groupStock.label = 'Stocks & Equities';

    assets.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.symbol;
      opt.textContent = `${a.symbol} - ${a.name} (${formatCurrency(a.price)})`;
      if (a.type === 'crypto') groupCrypto.appendChild(opt);
      else groupStock.appendChild(opt);
    });

    alertAssetSelect.appendChild(groupCrypto);
    alertAssetSelect.appendChild(groupStock);

    alertAssetSelect.addEventListener('change', updatePricePreview);
    updatePricePreview();
  }

  function updatePricePreview() {
    if (!alertAssetSelect || !currentPricePreview) return;
    const asset = marketManager.getAsset(alertAssetSelect.value);
    if (asset) {
      currentPricePreview.textContent = `Current Price: ${formatCurrency(asset.price)} (24h Change: ${asset.change24h > 0 ? '+' : ''}${asset.change24h.toFixed(2)}%)`;
      if (!alertTargetInput.value) {
        alertTargetInput.value = asset.price;
      }
    }
  }

  // --- Modal Open/Close ---
  function openCreateAlertModal(preselectedSymbol = null) {
    if (preselectedSymbol) {
      alertAssetSelect.value = preselectedSymbol.toUpperCase();
      const asset = marketManager.getAsset(preselectedSymbol);
      if (asset) {
        alertTargetInput.value = (asset.price * 1.05).toFixed(2); // Default 5% above
      }
    }
    updatePricePreview();
    alertModal.classList.add('active');
  }

  function closeAlertModal() {
    alertModal.classList.remove('active');
  }

  if (btnOpenAlertModal) btnOpenAlertModal.addEventListener('click', () => openCreateAlertModal());
  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeAlertModal);
  if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeAlertModal);
  alertModal.addEventListener('click', (e) => {
    if (e.target === alertModal) closeAlertModal();
  });

  // Modal Form Submission
  if (alertModalForm) {
    alertModalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const sym = alertAssetSelect.value;
      const asset = marketManager.getAsset(sym);
      const targetVal = parseFloat(alertTargetInput.value);

      if (isNaN(targetVal) || targetVal <= 0) {
        alert('Please enter a valid target price or percentage.');
        return;
      }

      alertEngine.createAlert({
        assetSymbol: sym,
        assetType: asset ? asset.type : 'crypto',
        condition: alertConditionSelect.value,
        targetValue: targetVal,
        soundEnabled: alertSoundToggle.checked,
        soundPreset: alertSoundSelect.value,
        desktopNotif: alertDesktopToggle.checked,
        onceOnly: alertOnceToggle.checked,
        note: alertNoteInput.value.trim()
      });

      closeAlertModal();
      showToast('Alert Created', `Target set for ${sym} at ${alertConditionSelect.value.replace('_', ' ')} ${formatCurrency(targetVal)}`, 'success');
      renderAlertsTable();
      renderStats();
    });
  }

  // --- Formatters ---
  function formatCurrency(val) {
    if (val === undefined || val === null) return '$0.00';
    if (val < 0.0001) return '$' + Number(val).toFixed(7);
    if (val < 0.01) return '$' + Number(val).toFixed(5);
    if (val < 1) return '$' + Number(val).toFixed(4);
    return '$' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // --- Render Top Scrolling Ticker Bar ---
  function renderTickerBar() {
    if (!tickerTrack) return;
    const assets = marketManager.getAllAssets();
    // Duplicate list for infinite smooth CSS loop
    const combined = [...assets, ...assets];

    tickerTrack.innerHTML = combined.map(a => {
      const isPos = a.change24h >= 0;
      return `
        <div class="ticker-item" data-symbol="${a.symbol}">
          <span class="ticker-symbol">${a.symbol}</span>
          <span class="ticker-price">${formatCurrency(a.price)}</span>
          <span class="ticker-change ${isPos ? 'text-green' : 'text-red'}">
            ${isPos ? '▲' : '▼'} ${Math.abs(a.change24h).toFixed(2)}%
          </span>
        </div>
      `;
    }).join('');

    // Clicking ticker item selects it in chart
    tickerTrack.querySelectorAll('.ticker-item').forEach(item => {
      item.addEventListener('click', () => {
        const sym = item.dataset.symbol;
        switchToChart(sym);
      });
    });
  }

  // --- Render Market Watch Cards Grid ---
  function renderMarketGrid() {
    if (!marketGrid) return;

    let assets = marketManager.getAllAssets();

    // Filter
    if (currentFilter !== 'all') {
      assets = assets.filter(a => a.type === currentFilter);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      assets = assets.filter(a => a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
    }

    if (assets.length === 0) {
      marketGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🔍</div>
          <p>No assets found matching "${searchQuery}"</p>
        </div>
      `;
      return;
    }

    marketGrid.innerHTML = assets.map(a => {
      const isPos = a.change24h >= 0;
      const activeAlertsForAsset = alertEngine.alerts.filter(al => al.enabled && al.assetSymbol === a.symbol);
      
      // Calculate 24h range fill %
      const rangeSpan = Math.max(0.0001, a.high24h - a.low24h);
      const progressPct = Math.min(100, Math.max(0, ((a.price - a.low24h) / rangeSpan) * 100));

      return `
        <div class="asset-card" id="card-${a.symbol}">
          <div class="card-header">
            <div class="asset-identity">
              <div class="asset-icon">${a.icon}</div>
              <div class="asset-info">
                <div class="asset-name-row">
                  <span class="asset-symbol">${a.symbol}</span>
                  <span class="type-pill ${a.type}">${a.type}</span>
                </div>
                <span class="asset-fullname">${a.name}</span>
              </div>
            </div>
            ${activeAlertsForAsset.length > 0 ? 
              `<span class="tab-badge badge-alert" title="${activeAlertsForAsset.length} active alert(s)">🔔 ${activeAlertsForAsset.length}</span>` : ''}
          </div>

          <div class="card-body">
            <div class="current-price" id="card-price-${a.symbol}">${formatCurrency(a.price)}</div>
            <div class="change-badge ${isPos ? 'positive' : 'negative'}" id="card-change-${a.symbol}">
              ${isPos ? '▲ +' : '▼ '}${a.change24h.toFixed(2)}%
            </div>
          </div>

          <div class="card-range-wrap">
            <div class="range-labels">
              <span>L: ${formatCurrency(a.low24h)}</span>
              <span>24h Range</span>
              <span>H: ${formatCurrency(a.high24h)}</span>
            </div>
            <div class="range-bar-track">
              <div class="range-bar-fill" id="card-range-${a.symbol}" style="width: ${progressPct.toFixed(1)}%;"></div>
            </div>
          </div>

          <div class="card-footer">
            <span class="asset-volume">Vol: $${a.volume || '0'}</span>
            <div style="display: flex; gap: 0.4rem;">
              <button class="card-action-btn btn-quick-chart" data-symbol="${a.symbol}">📊 Chart</button>
              <button class="card-action-btn btn-quick-alert" data-symbol="${a.symbol}">+ Alert</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach button listeners
    marketGrid.querySelectorAll('.btn-quick-alert').forEach(btn => {
      btn.addEventListener('click', () => {
        openCreateAlertModal(btn.dataset.symbol);
      });
    });

    marketGrid.querySelectorAll('.btn-quick-chart').forEach(btn => {
      btn.addEventListener('click', () => {
        switchToChart(btn.dataset.symbol);
      });
    });
  }

  function switchToChart(symbol) {
    const chartTabBtn = document.querySelector('.nav-tab[data-tab="chart"]');
    if (chartTabBtn) chartTabBtn.click();
    if (chartController) {
      if (!chartController.initialized) chartController.init();
      chartController.setAsset(symbol);
    }
  }

  // --- Real-time Tick Update on Market Grid ---
  marketManager.onTick((symbol, asset) => {
    // Update individual card DOM elements without full grid rebuild
    const cardEl = document.getElementById(`card-${symbol}`);
    const priceEl = document.getElementById(`card-price-${symbol}`);
    const changeEl = document.getElementById(`card-change-${symbol}`);
    const rangeEl = document.getElementById(`card-range-${symbol}`);

    if (priceEl) priceEl.textContent = formatCurrency(asset.price);
    if (changeEl) {
      const isPos = asset.change24h >= 0;
      changeEl.className = `change-badge ${isPos ? 'positive' : 'negative'}`;
      changeEl.textContent = `${isPos ? '▲ +' : '▼ '}${asset.change24h.toFixed(2)}%`;
    }

    if (rangeEl) {
      const rangeSpan = Math.max(0.0001, asset.high24h - asset.low24h);
      const progressPct = Math.min(100, Math.max(0, ((asset.price - asset.low24h) / rangeSpan) * 100));
      rangeEl.style.width = `${progressPct.toFixed(1)}%`;
    }

    // Flash card border / background
    if (cardEl && asset.priceDirection !== 'neutral') {
      cardEl.classList.remove('flash-up', 'flash-down');
      void cardEl.offsetWidth; // Force reflow
      cardEl.classList.add(asset.priceDirection === 'up' ? 'flash-up' : 'flash-down');
    }

    // Also update distance in Active Alerts Table if rendered
    updateDistancesInAlertTable(symbol, asset.price);
  });

  // --- Active Alerts Table ---
  function renderAlertsTable() {
    if (!activeAlertsTableBody) return;
    const alerts = alertEngine.alerts;

    if (alerts.length === 0) {
      activeAlertsTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <div class="empty-state-icon">🔔</div>
            <p>No alerts configured yet. Click <strong>+ Create Alert</strong> to set your first price threshold!</p>
          </td>
        </tr>
      `;
      return;
    }

    activeAlertsTableBody.innerHTML = alerts.map(al => {
      const asset = marketManager.getAsset(al.assetSymbol);
      const currentPrice = asset ? asset.price : 0;
      const { distText, distClass } = calculateDistance(al, currentPrice);

      let condBadgeClass = 'above';
      let condText = `Above ${formatCurrency(al.targetValue)}`;
      if (al.condition === 'below') {
        condBadgeClass = 'below';
        condText = `Below ${formatCurrency(al.targetValue)}`;
      } else if (al.condition === 'pct_above') {
        condBadgeClass = 'pct';
        condText = `24h Gain > +${al.targetValue}%`;
      } else if (al.condition === 'pct_below') {
        condBadgeClass = 'pct';
        condText = `24h Drop > ${al.targetValue}%`;
      }

      return `
        <tr data-alert-id="${al.id}" class="${!al.enabled ? 'opacity-50' : ''}">
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <strong>${al.assetSymbol}</strong>
              <span class="type-pill ${al.assetType}">${al.assetType}</span>
            </div>
            ${al.note ? `<div style="font-size: 0.72rem; color: var(--text-sub);">${al.note}</div>` : ''}
          </td>
          <td>
            <span class="condition-pill ${condBadgeClass}">${condText}</span>
          </td>
          <td>
            <span class="current-price-cell" id="table-cur-price-${al.id}">${formatCurrency(currentPrice)}</span>
          </td>
          <td>
            <span id="table-dist-${al.id}" class="${distClass}">${distText}</span>
          </td>
          <td>
            <span style="font-size: 0.8rem;">
              ${al.soundEnabled ? '🔊 ' + al.soundPreset : '🔇'}
              ${al.desktopNotif ? ' • 🖥️ Push' : ''}
              ${al.onceOnly ? ' • 1-Shot' : ' • Loop'}
            </span>
          </td>
          <td>
            <label class="switch">
              <input type="checkbox" class="toggle-alert-btn" data-id="${al.id}" ${al.enabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-secondary btn-sm test-trigger-btn" data-id="${al.id}" title="Simulate trigger test">⚡ Test</button>
              <button class="btn btn-outline-danger btn-sm delete-alert-btn" data-id="${al.id}" title="Delete alert">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach Table Handlers
    activeAlertsTableBody.querySelectorAll('.toggle-alert-btn').forEach(sw => {
      sw.addEventListener('change', (e) => {
        alertEngine.toggleAlert(e.target.dataset.id, e.target.checked);
        renderStats();
      });
    });

    activeAlertsTableBody.querySelectorAll('.delete-alert-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (confirm('Delete this alert?')) {
          alertEngine.deleteAlert(btn.dataset.id);
          renderAlertsTable();
          renderStats();
          if (chartController.initialized) chartController.renderChart();
        }
      });
    });

    activeAlertsTableBody.querySelectorAll('.test-trigger-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        alertEngine.testTrigger(id);
      });
    });
  }

  function calculateDistance(alert, currentPrice) {
    if (!currentPrice || currentPrice <= 0) return { distText: '—', distClass: '' };

    if (alert.condition === 'above') {
      const diff = alert.targetValue - currentPrice;
      const pct = (diff / currentPrice) * 100;
      if (diff <= 0) return { distText: 'Trigger Ready (Over Target)', distClass: 'text-green' };
      return { distText: `${formatCurrency(diff)} away (+${pct.toFixed(2)}%)`, distClass: 'text-sub' };
    } else if (alert.condition === 'below') {
      const diff = currentPrice - alert.targetValue;
      const pct = (diff / currentPrice) * 100;
      if (diff <= 0) return { distText: 'Trigger Ready (Under Target)', distClass: 'text-red' };
      return { distText: `${formatCurrency(diff)} away (-${pct.toFixed(2)}%)`, distClass: 'text-sub' };
    }
    return { distText: `Target: ${alert.targetValue}%`, distClass: 'text-sub' };
  }

  function updateDistancesInAlertTable(symbol, currentPrice) {
    alertEngine.alerts.forEach(al => {
      if (al.assetSymbol === symbol) {
        const curEl = document.getElementById(`table-cur-price-${al.id}`);
        const distEl = document.getElementById(`table-dist-${al.id}`);
        if (curEl) curEl.textContent = formatCurrency(currentPrice);
        if (distEl) {
          const { distText, distClass } = calculateDistance(al, currentPrice);
          distEl.textContent = distText;
          distEl.className = distClass;
        }
      }
    });
  }

  // --- Alert History Table ---
  function renderHistoryTable() {
    if (!alertHistoryTableBody) return;
    const history = alertEngine.history;

    if (history.length === 0) {
      alertHistoryTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">
            <div class="empty-state-icon">📋</div>
            <p>No alert triggers recorded yet. Triggers will be logged here when prices cross your targets.</p>
          </td>
        </tr>
      `;
      return;
    }

    alertHistoryTableBody.innerHTML = history.map(item => {
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = date.toLocaleDateString();

      return `
        <tr>
          <td>
            <div style="font-weight: 700;">${item.assetSymbol}</div>
            <div style="font-size: 0.7rem; color: var(--text-sub);">${item.assetType}</div>
          </td>
          <td>
            <span class="condition-pill ${item.condition.includes('above') ? 'above' : 'below'}">
              ${item.condition.replace('_', ' ').toUpperCase()}
            </span>
          </td>
          <td style="font-family: var(--font-mono);">${formatCurrency(item.targetValue)}</td>
          <td style="font-family: var(--font-mono); font-weight: 700;">${formatCurrency(item.triggeredPrice)}</td>
          <td>
            <div>${timeStr}</div>
            <div style="font-size: 0.72rem; color: var(--text-sub);">${dateStr}</div>
          </td>
          <td>
            ${item.isTest ? '<span class="tab-badge">Test</span>' : '<span class="status-dot connected"></span> Live'}
          </td>
        </tr>
      `;
    }).join('');
  }

  // Clear history button
  const btnClearHistory = document.getElementById('btnClearHistory');
  if (btnClearHistory) {
    btnClearHistory.addEventListener('click', () => {
      if (confirm('Clear all alert history records?')) {
        alertEngine.clearHistory();
        renderHistoryTable();
        renderStats();
      }
    });
  }

  // --- Stats Rendering ---
  function renderStats() {
    const active = alertEngine.alerts.filter(a => a.enabled).length;
    const totalAssets = marketManager.getAllAssets().length;
    const historyCount = alertEngine.history.length;

    if (statActiveAlerts) statActiveAlerts.textContent = active;
    if (statAssetsCount) statAssetsCount.textContent = totalAssets;
    if (statTriggeredCount) statTriggeredCount.textContent = historyCount;
    if (badgeActiveAlerts) badgeActiveAlerts.textContent = active;
    if (badgeHistory) badgeHistory.textContent = historyCount;
  }

  // --- Toaster Alert System ---
  function showToast(title, message, type = 'info') {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'alert' ? 'toast-alert-fired' : ''}`;
    toast.innerHTML = `
      <div class="toast-icon">${type === 'alert' ? '🚨' : type === 'success' ? '✅' : '🔔'}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    toastContainer.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
      }
    }, 6000);
  }

  // Listen for real-time triggered price alerts
  window.addEventListener('price-alert-triggered', (e) => {
    const detail = e.detail;
    showToast(detail.title, detail.body, 'alert');
    renderAlertsTable();
    renderHistoryTable();
    renderStats();
  });

  // --- Search & Filter Events ---
  filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderMarketGrid();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderMarketGrid();
    });
  }

  // --- WebSocket Status Updates ---
  marketManager.onConnectionChange((isConnected) => {
    if (wsStatusEl && wsDotEl) {
      if (isConnected) {
        wsStatusEl.textContent = 'Live Feed Connected';
        wsDotEl.className = 'status-dot connected';
      } else {
        wsStatusEl.textContent = 'Reconnecting...';
        wsDotEl.className = 'status-dot disconnected';
      }
    }
  });

  // --- Audio Lab & Settings Controls ---
  const settingsSoundToggle = document.getElementById('settingsSoundToggle');
  const settingsVolumeSlider = document.getElementById('settingsVolumeSlider');
  const settingsSoundPreset = document.getElementById('settingsSoundPreset');
  const btnTestSound = document.getElementById('btnTestSound');
  const btnRequestPerm = document.getElementById('btnRequestPerm');
  const notifPermStatus = document.getElementById('notifPermStatus');

  if (settingsSoundToggle) {
    settingsSoundToggle.checked = alertEngine.settings.soundEnabled;
    settingsSoundToggle.addEventListener('change', (e) => {
      alertEngine.settings.soundEnabled = e.target.checked;
      alertEngine.saveSettings();
    });
  }

  if (settingsVolumeSlider) {
    settingsVolumeSlider.value = alertEngine.settings.soundVolume * 100;
    settingsVolumeSlider.addEventListener('input', (e) => {
      alertEngine.settings.soundVolume = e.target.value / 100;
      alertEngine.saveSettings();
    });
  }

  if (settingsSoundPreset) {
    settingsSoundPreset.value = alertEngine.settings.soundPreset;
    settingsSoundPreset.addEventListener('change', (e) => {
      alertEngine.settings.soundPreset = e.target.value;
      alertEngine.saveSettings();
    });
  }

  if (btnTestSound) {
    btnTestSound.addEventListener('click', () => {
      alertEngine.playSound(settingsSoundPreset ? settingsSoundPreset.value : null);
      showToast('Sound Test', 'Audio synthesizer chime played successfully!', 'success');
    });
  }

  function updatePermStatus() {
    if (!notifPermStatus) return;
    if (!('Notification' in window)) {
      notifPermStatus.textContent = 'Unsupported in this browser';
      notifPermStatus.className = 'tab-badge';
      return;
    }
    const perm = Notification.permission;
    notifPermStatus.textContent = perm.toUpperCase();
    if (perm === 'granted') notifPermStatus.className = 'tab-badge' + ' badge-alert' ? 'tab-badge' : '';
    else notifPermStatus.className = 'tab-badge badge-alert';
  }

  if (btnRequestPerm) {
    btnRequestPerm.addEventListener('click', async () => {
      const res = await alertEngine.requestNotificationPermission();
      updatePermStatus();
      if (res === 'granted') {
        alertEngine.showDesktopNotification('Crypto Stock Alert Tracker', 'Desktop notifications are active and ready!');
      }
    });
  }

  // --- Initial Render Invocations ---
  populateModalAssetDropdown();
  renderTickerBar();
  renderMarketGrid();
  renderAlertsTable();
  renderHistoryTable();
  renderStats();
  updatePermStatus();
});
