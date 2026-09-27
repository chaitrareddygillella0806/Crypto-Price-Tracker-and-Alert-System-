/**
 * Interactive Price Chart with Alert Threshold Overlays
 */

class PriceChartController {
  constructor() {
    this.chartInstance = null;
    this.selectedSymbol = 'BTC';
    this.timeframe = '24H';
    this.canvasId = 'assetChartCanvas';
    this.initialized = false;
  }

  init() {
    this.populateAssetDropdown();
    this.setupEventListeners();
    this.renderChart();
    this.initialized = true;

    // Listen to real-time market updates
    if (window.MarketDataManager) {
      window.MarketDataManager.onTick((symbol, asset) => {
        if (symbol === this.selectedSymbol && this.chartInstance) {
          this.updateLivePoint(asset.price);
        }
      });
    }

    // Listen to alert changes so we re-render alert lines
    if (window.AlertEngine) {
      window.AlertEngine.onChange(() => {
        this.renderChart();
      });
    }
  }

  populateAssetDropdown() {
    const select = document.getElementById('chartAssetSelect');
    if (!select || !window.MarketDataManager) return;

    select.innerHTML = '';
    const assets = window.MarketDataManager.getAllAssets();

    const optGroupCrypto = document.createElement('optgroup');
    optGroupCrypto.label = 'Cryptocurrencies';

    const optGroupStock = document.createElement('optgroup');
    optGroupStock.label = 'Stocks & Equities';

    assets.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.symbol;
      opt.textContent = `${a.symbol} - ${a.name}`;
      if (a.symbol === this.selectedSymbol) opt.selected = true;

      if (a.type === 'crypto') optGroupCrypto.appendChild(opt);
      else optGroupStock.appendChild(opt);
    });

    select.appendChild(optGroupCrypto);
    select.appendChild(optGroupStock);
  }

  setupEventListeners() {
    const select = document.getElementById('chartAssetSelect');
    if (select) {
      select.addEventListener('change', (e) => {
        this.selectedSymbol = e.target.value;
        this.renderChart();
      });
    }

    const tfButtons = document.querySelectorAll('.tf-btn');
    tfButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tfButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.timeframe = e.target.dataset.tf || '24H';
        this.renderChart();
      });
    });
  }

  setAsset(symbol) {
    this.selectedSymbol = symbol.toUpperCase();
    const select = document.getElementById('chartAssetSelect');
    if (select) select.value = this.selectedSymbol;
    this.renderChart();
  }

  formatPrice(val) {
    if (val === undefined || val === null) return '$0.00';
    if (val < 0.01) return '$' + val.toFixed(6);
    if (val < 1) return '$' + val.toFixed(4);
    return '$' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  renderChart() {
    const canvas = document.getElementById(this.canvasId);
    if (!canvas || !window.Chart) return;

    const asset = window.MarketDataManager ? window.MarketDataManager.getAsset(this.selectedSymbol) : null;
    if (!asset) return;

    // Update Chart Asset Info Header
    const titleEl = document.getElementById('chartAssetTitle');
    const priceEl = document.getElementById('chartAssetPrice');
    const changeEl = document.getElementById('chartAssetChange');

    if (titleEl) titleEl.textContent = `${asset.name} (${asset.symbol})`;
    if (priceEl) priceEl.textContent = this.formatPrice(asset.price);
    if (changeEl) {
      const isPos = asset.change24h >= 0;
      changeEl.textContent = `${isPos ? '+' : ''}${asset.change24h.toFixed(2)}% (24h)`;
      changeEl.className = `change-badge ${isPos ? 'positive' : 'negative'}`;
    }

    // Prepare data points from asset history
    const history = asset.history || [];
    const labels = history.map(h => {
      const d = new Date(h.time);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    });
    const prices = history.map(h => h.price);

    const isPositive = asset.change24h >= 0;
    const strokeColor = isPositive ? '#10b981' : '#ef4444';
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, isPositive ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)');
    gradient.addColorStop(1, 'rgba(17, 23, 38, 0)');

    // Look for active alerts for this asset
    const activeAlerts = window.AlertEngine ? 
      window.AlertEngine.alerts.filter(a => a.enabled && a.assetSymbol === this.selectedSymbol && (a.condition === 'above' || a.condition === 'below')) : [];

    // Create threshold datasets for alert targets
    const alertDatasets = activeAlerts.map(alert => {
      const isAbove = alert.condition === 'above';
      return {
        label: `🚨 Target: ${this.formatPrice(alert.targetValue)} (${isAbove ? 'Above' : 'Below'})`,
        data: new Array(prices.length).fill(alert.targetValue),
        borderColor: isAbove ? '#10b981' : '#ef4444',
        borderWidth: 2,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
        tension: 0
      };
    });

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: `${asset.symbol} Price`,
            data: prices,
            borderColor: strokeColor,
            borderWidth: 2.5,
            backgroundColor: gradient,
            fill: true,
            tension: 0.25,
            pointRadius: 2,
            pointHoverRadius: 6,
            pointBackgroundColor: strokeColor,
            pointBorderColor: '#fff',
            pointBorderWidth: 1.5
          },
          ...alertDatasets
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        animation: {
          duration: 350
        },
        plugins: {
          legend: {
            display: alertDatasets.length > 0,
            labels: {
              color: '#9ca3af',
              font: { family: 'Inter', size: 12 }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            titleColor: '#fff',
            bodyColor: '#e5e7eb',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${this.formatPrice(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.04)'
            },
            ticks: {
              color: '#6b7280',
              maxTicksLimit: 8,
              font: { size: 11 }
            }
          },
          y: {
            grid: {
              color: 'rgba(255, 255, 255, 0.05)'
            },
            ticks: {
              color: '#9ca3af',
              font: { family: 'JetBrains Mono', size: 11 },
              callback: (value) => this.formatPrice(value)
            }
          }
        }
      }
    });
  }

  updateLivePoint(newPrice) {
    if (!this.chartInstance) return;

    const data = this.chartInstance.data;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    data.labels.push(now);
    data.datasets[0].data.push(newPrice);

    // Keep alert datasets length in sync
    for (let i = 1; i < data.datasets.length; i++) {
      const val = data.datasets[i].data[0];
      data.datasets[i].data.push(val);
    }

    if (data.labels.length > 60) {
      data.labels.shift();
      data.datasets.forEach(ds => ds.data.shift());
    }

    // Update Header
    const priceEl = document.getElementById('chartAssetPrice');
    if (priceEl) priceEl.textContent = this.formatPrice(newPrice);

    this.chartInstance.update('none'); // Update without full rerender animation for smooth live streaming
  }
}

window.PriceChartController = new PriceChartController();
