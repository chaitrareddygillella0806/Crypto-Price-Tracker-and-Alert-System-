/**
 * Market Data Manager: Live Binance WebSocket feed for Crypto & Dynamic Stock Ticker
 */

class MarketDataManager {
  constructor() {
    this.cryptoList = [
      { symbol: 'BTC', name: 'Bitcoin', binanceSymbol: 'BTCUSDT', icon: '₿', type: 'crypto', basePrice: 84500 },
      { symbol: 'ETH', name: 'Ethereum', binanceSymbol: 'ETHUSDT', icon: 'Ξ', type: 'crypto', basePrice: 3150 },
      { symbol: 'SOL', name: 'Solana', binanceSymbol: 'SOLUSDT', icon: '◎', type: 'crypto', basePrice: 195 },
      { symbol: 'BNB', name: 'BNB', binanceSymbol: 'BNBUSDT', icon: '🔶', type: 'crypto', basePrice: 620 },
      { symbol: 'XRP', name: 'XRP', binanceSymbol: 'XRPUSDT', icon: '✕', type: 'crypto', basePrice: 0.58 },
      { symbol: 'DOGE', name: 'Dogecoin', binanceSymbol: 'DOGEUSDT', icon: 'Ð', type: 'crypto', basePrice: 0.14 },
      { symbol: 'ADA', name: 'Cardano', binanceSymbol: 'ADAUSDT', icon: '₳', type: 'crypto', basePrice: 0.36 },
      { symbol: 'AVAX', name: 'Avalanche', binanceSymbol: 'AVAXUSDT', icon: '🔺', type: 'crypto', basePrice: 28.5 },
      { symbol: 'LINK', name: 'Chainlink', binanceSymbol: 'LINKUSDT', icon: '⬡', type: 'crypto', basePrice: 11.8 },
      { symbol: 'SUI', name: 'Sui Network', binanceSymbol: 'SUIUSDT', icon: '💧', type: 'crypto', basePrice: 1.85 },
      { symbol: 'NEAR', name: 'NEAR Protocol', binanceSymbol: 'NEARUSDT', icon: 'Ⓝ', type: 'crypto', basePrice: 4.8 },
      { symbol: 'PEPE', name: 'Pepe', binanceSymbol: 'PEPEUSDT', icon: '🐸', type: 'crypto', basePrice: 0.0000095 }
    ];

    this.stockList = [
      { symbol: 'NVDA', name: 'NVIDIA Corp', icon: '⚡', type: 'stock', basePrice: 132.80, change24h: 3.25 },
      { symbol: 'MSTR', name: 'MicroStrategy', icon: '₿', type: 'stock', basePrice: 174.50, change24h: 5.12 },
      { symbol: 'COIN', name: 'Coinbase Global', icon: '🪙', type: 'stock', basePrice: 216.40, change24h: -1.45 },
      { symbol: 'TSLA', name: 'Tesla Inc', icon: '🚗', type: 'stock', basePrice: 254.20, change24h: 2.10 },
      { symbol: 'AAPL', name: 'Apple Inc', icon: '🍎', type: 'stock', basePrice: 228.60, change24h: 0.85 },
      { symbol: 'MARA', name: 'MARA Holdings', icon: '⛏️', type: 'stock', basePrice: 18.75, change24h: 4.60 },
      { symbol: 'RIOT', name: 'Riot Platforms', icon: '⚡', type: 'stock', basePrice: 9.95, change24h: 3.80 },
      { symbol: 'AMD', name: 'Advanced Micro Devices', icon: '💻', type: 'stock', basePrice: 156.80, change24h: -0.65 }
    ];

    // Master state of assets: keyed by symbol
    this.assets = {};
    this.ws = null;
    this.wsConnected = false;
    this.reconnectTimer = null;
    this.stockTimer = null;
    this.restFallbackTimer = null;

    this.tickCallbacks = [];
    this.connectionCallbacks = [];

    this.init();
  }

  init() {
    // Populate initial state
    [...this.cryptoList, ...this.stockList].forEach(item => {
      const history = this.generateSyntheticHistory(item.basePrice);
      this.assets[item.symbol] = {
        symbol: item.symbol,
        name: item.name,
        type: item.type,
        icon: item.icon,
        binanceSymbol: item.binanceSymbol || null,
        price: item.basePrice,
        prevPrice: item.basePrice,
        priceDirection: 'neutral', // 'up' | 'down' | 'neutral'
        change24h: item.change24h || 0,
        high24h: item.basePrice * 1.04,
        low24h: item.basePrice * 0.96,
        volume: item.type === 'crypto' ? '1.42B' : '45.8M',
        lastUpdated: Date.now(),
        history: history // Array of { time, price }
      };
    });

    // Start Crypto WebSocket
    this.connectCryptoWebSocket();

    // Start Stock Simulator & Poller
    this.startStockSimulation();

    // Also fetch initial crypto snapshot via REST to avoid waiting
    this.fetchCryptoRestSnapshot();
  }

  generateSyntheticHistory(basePrice, points = 40) {
    const list = [];
    let current = basePrice * 0.97;
    const now = Date.now();
    const interval = 5 * 60 * 1000; // 5 min interval

    for (let i = points; i >= 0; i--) {
      const time = now - (i * interval);
      const deltaPercent = (Math.random() - 0.48) * 0.008;
      current = current * (1 + deltaPercent);
      list.push({ time, price: current });
    }
    // Set the last point close to basePrice
    list[list.length - 1].price = basePrice;
    return list;
  }

  // --- Crypto WebSocket Connection ---
  connectCryptoWebSocket() {
    try {
      const streams = this.cryptoList
        .filter(c => c.binanceSymbol)
        .map(c => `${c.binanceSymbol.toLowerCase()}@ticker`)
        .join('/');

      const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;
      
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.wsConnected = true;
        this.notifyConnection(true);
        if (this.restFallbackTimer) {
          clearInterval(this.restFallbackTimer);
          this.restFallbackTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message && message.data) {
            this.handleBinanceTicker(message.data);
          }
        } catch (e) {
          console.error('WS Parse Error:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Binance WS Error, falling back to REST:', err);
      };

      this.ws.onclose = () => {
        this.wsConnected = false;
        this.notifyConnection(false);
        this.scheduleReconnect();
        this.startRestFallback();
      };

    } catch (e) {
      console.warn('WebSocket init error:', e);
      this.startRestFallback();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectCryptoWebSocket();
    }, 4000);
  }

  handleBinanceTicker(data) {
    // data.s: symbol (e.g. 'BTCUSDT')
    // data.c: last price
    // data.P: price change percent
    // data.h: high price
    // data.l: low price
    // data.q: total traded quote volume
    const item = this.cryptoList.find(c => c.binanceSymbol === data.s);
    if (!item) return;

    const currentPrice = parseFloat(data.c);
    const change24h = parseFloat(data.P);
    const high24h = parseFloat(data.h);
    const low24h = parseFloat(data.l);
    const volNum = parseFloat(data.q);
    const volumeFormatted = this.formatVolume(volNum);

    this.updateAsset(item.symbol, {
      price: currentPrice,
      change24h,
      high24h,
      low24h,
      volume: volumeFormatted
    });
  }

  async fetchCryptoRestSnapshot() {
    try {
      const symbols = this.cryptoList.map(c => `"${c.binanceSymbol}"`).join(',');
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbols}]`);
      if (res.ok) {
        const data = await res.json();
        data.forEach(t => {
          const item = this.cryptoList.find(c => c.binanceSymbol === t.symbol);
          if (item) {
            this.updateAsset(item.symbol, {
              price: parseFloat(t.lastPrice),
              change24h: parseFloat(t.priceChangePercent),
              high24h: parseFloat(t.highPrice),
              low24h: parseFloat(t.lowPrice),
              volume: this.formatVolume(parseFloat(t.quoteVolume))
            });
          }
        });
      }
    } catch (e) {
      console.warn('Crypto REST snapshot fallback error:', e);
    }
  }

  startRestFallback() {
    if (this.restFallbackTimer) return;
    this.restFallbackTimer = setInterval(() => {
      this.fetchCryptoRestSnapshot();
    }, 5000);
  }

  // --- Dynamic Stock Data Simulation ---
  startStockSimulation() {
    if (this.stockTimer) return;
    // Every 2.5 seconds, update 1-3 random stocks with realistic market micro-ticks
    this.stockTimer = setInterval(() => {
      const count = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < count; i++) {
        const stockItem = this.stockList[Math.floor(Math.random() * this.stockList.length)];
        const asset = this.assets[stockItem.symbol];
        if (!asset) continue;

        // Micro fluctuation between -0.3% and +0.3%
        const pct = (Math.random() - 0.495) * 0.006;
        const newPrice = Math.max(0.01, asset.price * (1 + pct));
        const newChange = asset.change24h + (pct * 25);
        const newHigh = Math.max(asset.high24h, newPrice);
        const newLow = Math.min(asset.low24h, newPrice);

        this.updateAsset(stockItem.symbol, {
          price: parseFloat(newPrice.toFixed(2)),
          change24h: parseFloat(newChange.toFixed(2)),
          high24h: parseFloat(newHigh.toFixed(2)),
          low24h: parseFloat(newLow.toFixed(2))
        });
      }
    }, 2200);
  }

  // --- Core State Update ---
  updateAsset(symbol, updates) {
    const asset = this.assets[symbol];
    if (!asset) return;

    const oldPrice = asset.price;
    const newPrice = updates.price;

    let dir = 'neutral';
    if (newPrice > oldPrice) dir = 'up';
    else if (newPrice < oldPrice) dir = 'down';

    asset.prevPrice = oldPrice;
    asset.price = newPrice;
    asset.priceDirection = dir;
    if (updates.change24h !== undefined) asset.change24h = updates.change24h;
    if (updates.high24h !== undefined) asset.high24h = updates.high24h;
    if (updates.low24h !== undefined) asset.low24h = updates.low24h;
    if (updates.volume !== undefined) asset.volume = updates.volume;
    asset.lastUpdated = Date.now();

    // Append to rolling history
    if (!asset.history) asset.history = [];
    asset.history.push({ time: Date.now(), price: newPrice });
    if (asset.history.length > 80) {
      asset.history.shift();
    }

    // Trigger alert evaluation engine
    if (window.AlertEngine) {
      window.AlertEngine.evaluate(symbol, newPrice, asset.change24h);
    }

    // Notify UI tick listeners
    this.notifyTick(symbol, asset);
  }

  formatVolume(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  }

  onTick(callback) {
    this.tickCallbacks.push(callback);
  }

  notifyTick(symbol, asset) {
    this.tickCallbacks.forEach(cb => {
      try { cb(symbol, asset); } catch (e) { console.error(e); }
    });
  }

  onConnectionChange(callback) {
    this.connectionCallbacks.push(callback);
  }

  notifyConnection(isConnected) {
    this.connectionCallbacks.forEach(cb => {
      try { cb(isConnected); } catch (e) { console.error(e); }
    });
  }

  getAllAssets() {
    return Object.values(this.assets);
  }

  getAsset(symbol) {
    return this.assets[symbol.toUpperCase()];
  }
}

window.MarketDataManager = new MarketDataManager();
