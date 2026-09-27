/**
 * Alerts Engine: Audio Synthesizer, Desktop Notifications & Alert Rules Manager
 */

class AlertEngine {
  constructor() {
    this.storageKey = 'crypto_stock_alerts_v1';
    this.historyKey = 'crypto_stock_alert_history_v1';
    this.settingsKey = 'crypto_stock_settings_v1';
    
    // Audio Context (created lazily on user interaction)
    this.audioCtx = null;
    
    // Default Settings
    this.settings = {
      soundEnabled: true,
      soundVolume: 0.8,
      soundPreset: 'chime',
      desktopNotifEnabled: true,
      throttleSeconds: 30
    };
    
    this.alerts = [];
    this.history = [];
    this.listeners = [];
    
    this.init();
  }

  init() {
    this.loadSettings();
    this.loadAlerts();
    this.loadHistory();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem(this.settingsKey);
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }

  saveSettings() {
    localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
  }

  loadAlerts() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.alerts = JSON.parse(saved);
      } else {
        // Pre-populate with realistic starter alerts
        this.alerts = [
          {
            id: 'alert_btc_85k',
            assetSymbol: 'BTC',
            assetType: 'crypto',
            condition: 'above',
            targetValue: 85000,
            soundEnabled: true,
            soundPreset: 'chime',
            desktopNotif: true,
            onceOnly: false,
            enabled: true,
            createdAt: Date.now() - 3600000,
            lastTriggeredAt: null,
            triggeredCount: 0,
            note: 'BTC Breakthrough'
          },
          {
            id: 'alert_eth_3000',
            assetSymbol: 'ETH',
            assetType: 'crypto',
            condition: 'below',
            targetValue: 3000,
            soundEnabled: true,
            soundPreset: 'urgent',
            desktopNotif: true,
            onceOnly: true,
            enabled: true,
            createdAt: Date.now() - 7200000,
            lastTriggeredAt: null,
            triggeredCount: 0,
            note: 'ETH Dip Opportunity'
          },
          {
            id: 'alert_nvda_135',
            assetSymbol: 'NVDA',
            assetType: 'stock',
            condition: 'above',
            targetValue: 135,
            soundEnabled: true,
            soundPreset: 'sonar',
            desktopNotif: true,
            onceOnly: false,
            enabled: true,
            createdAt: Date.now() - 10800000,
            lastTriggeredAt: null,
            triggeredCount: 0,
            note: 'NVDA Bullish Target'
          }
        ];
        this.saveAlerts();
      }
    } catch (e) {
      console.warn('Failed to load alerts:', e);
      this.alerts = [];
    }
  }

  saveAlerts() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.alerts));
    this.notifyChange();
  }

  loadHistory() {
    try {
      const saved = localStorage.getItem(this.historyKey);
      if (saved) {
        this.history = JSON.parse(saved);
      } else {
        this.history = [];
      }
    } catch (e) {
      console.warn('Failed to load alert history:', e);
      this.history = [];
    }
  }

  saveHistory() {
    localStorage.setItem(this.historyKey, JSON.stringify(this.history));
    this.notifyChange();
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notifyChange() {
    this.listeners.forEach(cb => {
      try { cb(); } catch (e) { console.error(e); }
    });
  }

  // --- Web Audio Synthesizer ---
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playSound(presetName = null) {
    if (!this.settings.soundEnabled) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const preset = presetName || this.settings.soundPreset || 'chime';
      const masterVol = Math.max(0, Math.min(1, this.settings.soundVolume || 0.8));

      const now = ctx.currentTime;

      if (preset === 'chime') {
        // Dual harmonic pleasant chime
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(880, now); // A5
        osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.15); // E6

        osc2.frequency.setValueAtTime(1174.66, now + 0.08); // D6
        osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.35); // A6

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(masterVol * 0.4, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.08);
        osc1.stop(now + 0.8);
        osc2.stop(now + 0.8);

      } else if (preset === 'urgent') {
        // High urgency 3-pulse beep
        for (let i = 0; i < 3; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + (i * 0.16);

          osc.type = 'square';
          osc.frequency.setValueAtTime(1200, start);
          osc.frequency.setValueAtTime(950, start + 0.08);

          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(masterVol * 0.25, start + 0.02);
          gain.gain.linearRampToValueAtTime(0, start + 0.12);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.14);
        }

      } else if (preset === 'sonar') {
        // Submarine sonar echo ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1750, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.7);

        gain.gain.setValueAtTime(masterVol * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.9);

      } else if (preset === 'cash') {
        // Cash register 'ka-ching' bell
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(987.77, now); // B5
        osc2.frequency.setValueAtTime(1975.53, now + 0.08); // B6

        gain.gain.setValueAtTime(masterVol * 0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.08);
        osc1.stop(now + 0.7);
        osc2.stop(now + 0.7);
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  // --- Browser Desktop Notification ---
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('Notification permission request error:', e);
      return 'denied';
    }
  }

  showDesktopNotification(title, body) {
    if (!this.settings.desktopNotifEnabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      new Notification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/2592/2592231.png',
        tag: 'price-alert-' + Date.now()
      });
    } catch (e) {
      console.warn('Failed to send desktop notification:', e);
    }
  }

  // --- Alert Operations ---
  createAlert(data) {
    const alert = {
      id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      assetSymbol: data.assetSymbol.toUpperCase(),
      assetType: data.assetType || 'crypto',
      condition: data.condition, // 'above', 'below', 'pct_above', 'pct_below'
      targetValue: parseFloat(data.targetValue),
      soundEnabled: data.soundEnabled !== undefined ? data.soundEnabled : true,
      soundPreset: data.soundPreset || this.settings.soundPreset || 'chime',
      desktopNotif: data.desktopNotif !== undefined ? data.desktopNotif : true,
      onceOnly: data.onceOnly !== undefined ? data.onceOnly : false,
      enabled: true,
      createdAt: Date.now(),
      lastTriggeredAt: null,
      triggeredCount: 0,
      note: data.note || ''
    };

    this.alerts.push(alert);
    this.saveAlerts();
    return alert;
  }

  deleteAlert(id) {
    this.alerts = this.alerts.filter(a => a.id !== id);
    this.saveAlerts();
  }

  toggleAlert(id, isEnabled) {
    const alert = this.alerts.find(a => a.id === id);
    if (alert) {
      alert.enabled = isEnabled !== undefined ? isEnabled : !alert.enabled;
      this.saveAlerts();
    }
  }

  clearHistory() {
    this.history = [];
    this.saveHistory();
  }

  // Test triggering an alert on demand
  testTrigger(alertId, currentPrice = null) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return;
    const testPrice = currentPrice || alert.targetValue;
    this.triggerAlert(alert, testPrice, 0, true);
  }

  // --- Real-time Evaluation Engine ---
  evaluate(symbol, currentPrice, change24h) {
    if (!symbol || currentPrice === undefined || currentPrice === null) return;

    const sym = symbol.toUpperCase();
    const now = Date.now();
    const throttleMs = (this.settings.throttleSeconds || 30) * 1000;

    for (const alert of this.alerts) {
      if (!alert.enabled || alert.assetSymbol !== sym) continue;

      // Throttle check
      if (alert.lastTriggeredAt && (now - alert.lastTriggeredAt < throttleMs)) {
        continue;
      }

      let isTriggered = false;

      if (alert.condition === 'above') {
        if (currentPrice >= alert.targetValue) isTriggered = true;
      } else if (alert.condition === 'below') {
        if (currentPrice <= alert.targetValue) isTriggered = true;
      } else if (alert.condition === 'pct_above') {
        if (change24h !== undefined && change24h >= alert.targetValue) isTriggered = true;
      } else if (alert.condition === 'pct_below') {
        if (change24h !== undefined && change24h <= alert.targetValue) isTriggered = true;
      }

      if (isTriggered) {
        this.triggerAlert(alert, currentPrice, change24h);
      }
    }
  }

  triggerAlert(alert, currentPrice, change24h = 0, isTest = false) {
    const now = Date.now();
    alert.lastTriggeredAt = now;
    alert.triggeredCount = (alert.triggeredCount || 0) + 1;

    if (alert.onceOnly && !isTest) {
      alert.enabled = false;
    }

    // Play Sound
    if (alert.soundEnabled && this.settings.soundEnabled) {
      this.playSound(alert.soundPreset);
    }

    // Format Alert Message
    let conditionText = '';
    let targetFormatted = '';
    if (alert.condition === 'above') {
      conditionText = 'surpassed target of';
      targetFormatted = `$${alert.targetValue.toLocaleString()}`;
    } else if (alert.condition === 'below') {
      conditionText = 'dropped below target of';
      targetFormatted = `$${alert.targetValue.toLocaleString()}`;
    } else if (alert.condition === 'pct_above') {
      conditionText = 'is up more than';
      targetFormatted = `+${alert.targetValue}% (24h)`;
    } else if (alert.condition === 'pct_below') {
      conditionText = 'is down more than';
      targetFormatted = `${alert.targetValue}% (24h)`;
    }

    const title = `${isTest ? '[TEST ALERT] ' : '🚨 PRICE ALERT: '}${alert.assetSymbol}`;
    const priceFormatted = `$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
    const body = `${alert.assetSymbol} ${conditionText} ${targetFormatted}. Current price: ${priceFormatted}. ${alert.note ? `Note: ${alert.note}` : ''}`;

    // Desktop Notification
    if (alert.desktopNotif && this.settings.desktopNotifEnabled) {
      this.showDesktopNotification(title, body);
    }

    // Dispatch Custom DOM Event for In-App Toaster
    const event = new CustomEvent('price-alert-triggered', {
      detail: {
        alert,
        currentPrice,
        change24h,
        title,
        body,
        isTest,
        timestamp: now
      }
    });
    window.dispatchEvent(event);

    // Save to History Log
    this.history.unshift({
      id: 'hist_' + now + '_' + Math.random().toString(36).substr(2, 4),
      alertId: alert.id,
      assetSymbol: alert.assetSymbol,
      assetType: alert.assetType,
      condition: alert.condition,
      targetValue: alert.targetValue,
      triggeredPrice: currentPrice,
      change24h,
      timestamp: now,
      note: alert.note || '',
      isTest
    });

    // Limit history length to 100 entries
    if (this.history.length > 100) {
      this.history = this.history.slice(0, 100);
    }

    this.saveAlerts();
    this.saveHistory();
  }
}

window.AlertEngine = new AlertEngine();
