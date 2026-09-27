# 📈 CryptoStock Pulse — Real-Time Price & Alert Tracker

A modern, high-performance web application designed to track live cryptocurrency and stock prices, configure customizable price alerts, synthesize audio chimes, and trigger desktop push notifications.

---

## 🌟 Key Features

1. **Real-Time Market Feeds**:
   - **Cryptocurrency Feed**: Directly connected to **Binance Combined WebSockets** (`wss://stream.binance.com:9443`) for sub-second live streaming price ticks, 24h highs/lows, percentage changes, and volumes.
   - **Automated Fallback**: Seamless automatic fallback to Binance REST 24h ticker polling if WebSocket is blocked or disconnected.
   - **Stocks & Equities**: Real-time tick updates for top crypto-adjacent & mega stocks (NVDA, MSTR, COIN, TSLA, AAPL, MARA, RIOT, AMD).
   - **Live Visual Tick Indicators**: Watchlist cards dynamically flash green on upward ticks and red on downward ticks.

2. **Full-Featured Price Alert Engine**:
   - **Multi-Condition Rules**:
     - Price crosses above target ($\ge X$)
     - Price drops below target ($\le X$)
     - 24-hour gain exceeds $+Y\%$
     - 24-hour drop exceeds $-Y\%$
   - **Synthesized Web Audio Tones**:
     - Built using the browser's native **Web Audio API** (requires zero external MP3s/audio files).
     - 4 selectable tone presets: *Harmonic Chime*, *Urgent Siren*, *Sonar Ping*, and *Cash Register*.
     - Full volume control and sound test button.
   - **Native Desktop Push Notifications**:
     - Triggers system alerts even when the browser tab is minimized or in the background.
   - **In-App Toast Banners**:
     - Slide-in high-priority alert cards with shake animation.
   - **Rule Management**:
     - Toggle rules on/off with switches.
     - One-shot vs. recurring mode.
     - Live distance calculation (e.g. `$1,200 away (+1.8%)`).
     - Instant rule test button (`⚡ Test`) to verify sound and alerts without waiting for market volatility.

3. **Audit Log & History Tracker**:
   - Every triggered alert is recorded with timestamp, target level, execution price, and event source.
   - Clear history button and persistent storage in `localStorage`.

4. **Interactive Price Analytics & Overlay**:
   - Dynamic charts with custom timeframes (`1H`, `24H`, `7D`, `30D`).
   - Active price alert targets are rendered directly as dashed horizontal benchmark lines across the chart.

5. **Design & Usability**:
   - Cyberpunk fintech dark mode with neon accents & clean light mode toggle.
   - Marquee live scrolling ticker bar.
   - Search & filter by asset type (Crypto vs. Stocks).

---

## 🚀 How to Run

### Option 1: Double Click (Simplest)
Simply double-click `index.html` in Windows Explorer to open it in Chrome, Edge, Brave, or Firefox.

### Option 2: Run with Local Python Server
Open a terminal in the folder and execute:
```bash
python server.py
```
This starts a local development server at `http://localhost:8080` and automatically opens your default web browser.

---

## 🛠️ Project Structure

```
Crypto/
├── index.html         # Semantic HTML5 layout with ambient lighting & tabs
├── server.py          # Python server launcher with automatic browser open
├── README.md          # Project documentation
├── css/
│   └── style.css      # Responsive styles, glassmorphism, tick animations
└── js/
    ├── alerts.js      # Web Audio synthesizer, desktop notifications, alert engine
    ├── market.js      # Binance WebSocket client, stock simulation, tick dispatcher
    ├── chart.js       # Chart.js analytics & alert threshold lines
    └── app.js         # App orchestration, DOM binding, toaster, and theme toggle
```
