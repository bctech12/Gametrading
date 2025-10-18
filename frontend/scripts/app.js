// ===== REAL-TIME PYTH FEEDS =====
const FEEDS = {
  ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  SOL: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
};

// ===== TIMEFRAME SPEED MAP =====
const TIMEFRAMES = {
  "1s": 1,
  "10s": 10,
  "30s": 30,
  "1m": 60,
  "5m": 300,
  "10m": 600,
  "30m": 1800,
  "1h": 3600,
};
class TradingGame {
  constructor() {
    this.priceUpdateInterval = null;
    this.displayUpdateInterval = null;
    this.launched = false;
    this.balance = 42.3;
    this.stake = 5;
    this.currentTimeframe = "10s";
    // store all bets across markets here
    this.allBoxes = [];
    this.currentMarket = "ETH";
    this.currentPrice = 2500.0;
    this.scaleCenterPrice = this.currentPrice;
    this.pixelsPerPrice = 2;
    this.scaleHeight = 400;
    this.tickPx = 40;
    this.playerCount = 12;
    this.animationTime = 0;
    this.midLineY = 200;
    this.gameLoopId = null;
    this.toastContainer = null;
    this.lastScaleUpdate = 0; // Debounce scale updates
    this.pendingBalanceUpdates = []; // Queue balance updates

    this.initializeElements();
    this.bindEvents();
    this.startMockUpdates();
    this.initializePlayers();
    // --- draw initial scale ticks once ---
    this.pixelsPerPrice = this.getPricePerPixel();
    this.drawTicks();
  }

  initializeElements() {
    this.launchScreen = document.getElementById("launchScreen");
    this.gameApp = document.getElementById("gameApp");
    this.launchButton = document.getElementById("launchButton");
    this.gameCanvas = document.getElementById("gameCanvas");
    this.greenBar = document.getElementById("greenBar");
    this.redBar = document.getElementById("redBar");
    this.midLine = document.getElementById("midLine");
    this.stakeInput = document.getElementById("stakeInput");
    this.balanceHud = document.getElementById("balanceHud");
    this.playerCountDisplay = document.getElementById("playerCount");
    this.leftPriceTag = document.getElementById("leftPriceTag");
    this.rightPriceTag = document.getElementById("rightPriceTag");
    this.toastContainer = document.getElementById("toastContainer");
    this.marketDropdown = document.getElementById("marketDropdown");
    this.cryptoLogo = document.getElementById("cryptoLogo");
    this.priceScaleInner = document.getElementById("priceScaleInner");
    this.centerButton = document.getElementById("centerButton");
    this.timeframeDropdown = document.getElementById("timeframeDropdown");

    // Modal elements
    this.depositModal = document.getElementById("depositModal");
    this.withdrawModal = document.getElementById("withdrawModal");
    this.depositBtn = document.getElementById("depositBtn");
    this.withdrawBtn = document.getElementById("withdrawBtn");
    this.closeDeposit = document.getElementById("closeDeposit");
    this.closeWithdraw = document.getElementById("closeWithdraw");
    this.depositAmount = document.getElementById("depositAmount");
    this.withdrawAmount = document.getElementById("withdrawAmount");
  }

  bindEvents() {
    this.launchButton.addEventListener("click", () => this.launchGame());
    this.gameCanvas.addEventListener("click", (e) => this.handleCanvasClick(e));
    this.stakeInput.addEventListener("change", (e) => this.updateStake(e));
    this.marketDropdown.addEventListener("change", (e) =>
      this.changeMarket(e.target.value)
    );
    this.centerButton.addEventListener("click", () => this.centerMidLine());
    this.timeframeDropdown.addEventListener("change", (e) => {
      this.currentTimeframe = e.target.value;
      console.log("Timeframe changed to:", this.currentTimeframe);
    });

    // Modal events
    this.depositBtn.addEventListener("click", () => this.showDepositModal());
    this.withdrawBtn.addEventListener("click", () => this.showWithdrawModal());
    this.closeDeposit.addEventListener("click", () => this.hideDepositModal());
    this.closeWithdraw.addEventListener("click", () =>
      this.hideWithdrawModal()
    );

    // Close modals on background click
    this.depositModal.addEventListener("click", (e) => {
      if (e.target === this.depositModal) this.hideDepositModal();
    });
    this.withdrawModal.addEventListener("click", (e) => {
      if (e.target === this.withdrawModal) this.hideWithdrawModal();
    });
  }
  cleanup() {
    // Cancel animation loop
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
    }

    // Clear intervals
    if (this.priceUpdateInterval) clearInterval(this.priceUpdateInterval);
    if (this.displayUpdateInterval) clearInterval(this.displayUpdateInterval);

    // Remove all bet boxes DOM
    this.allBoxes.forEach((box) => {
      if (box.element && box.element.parentNode) {
        box.element.remove();
      }
    });
  }

  launchGame() {
    this.launched = true;
    this.launchScreen.classList.add("hidden");
    this.gameApp.classList.remove("hidden");
    this.startAnimation();
  }

  startAnimation() {
    const animate = () => {
      this.animationTime += 1;

      // micro-sensitive price → screen Y  (160-240 px)
      // ---------- SINGLE SMOOTH CALCULATION ----------
      const centerY = 200;
      this.pixelsPerPrice = this.getPricePerPixel();

      const priceOffset = this.currentPrice - this.scaleCenterPrice;
      const pixelOffset = priceOffset * this.pixelsPerPrice;

      // Smooth interpolation to prevent jitter (0.3 = smoothness factor)
      const targetY = centerY - pixelOffset;
      const distance = Math.abs(targetY - this.midLineY);
      const smoothing = distance > 50 ? 0.5 : 0.3; // Faster for large gaps
      this.midLineY += (targetY - this.midLineY) * smoothing;
      this.midLineY = Math.max(0, Math.min(400, this.midLineY));

      // dynamic bars update
      const greenH = Math.max(0, this.midLineY);
      const redH = Math.max(0, 400 - this.midLineY);

      this.greenBar.setAttribute("y", 0);
      this.greenBar.setAttribute("height", greenH);
      this.redBar.setAttribute("y", this.midLineY);
      this.redBar.setAttribute("height", redH);
      // update white mid-line
      this.midLine.setAttribute("y1", this.midLineY);
      this.midLine.setAttribute("y2", this.midLineY);

      // keep shadows glued to the band
      document
        .getElementById("topShadow")
        .setAttribute("y1", this.midLineY - 30);
      document
        .getElementById("topShadow")
        .setAttribute("y2", this.midLineY - 30);
      // Update price tags position
      this.leftPriceTag.style.top = this.midLineY - 8 + "px";
      this.rightPriceTag.style.top = this.midLineY - 8 + "px";

      // Update box positions (for all markets so they progress even when hidden)
      this.updateBoxes();
      this.updatePriceScale();
      this.gameLoopId = requestAnimationFrame(animate);
      /* inside the animate() loop, right after you compute this.midLineY */
      document.documentElement.style.setProperty("--midY", this.midLineY);
    };

    animate();
  }

  handleCanvasClick(e) {
    if (!this.launched) return;
    const rect = this.gameCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Scale coordinates to SVG viewBox
    const scaleX = 375 / rect.width;
    const scaleY = 400 / rect.height;
    const svgX = x * scaleX;
    const svgY = y * scaleY;

    // Green area: 0 to midLineY, Red area: midLineY to 400
    const isInGreenArea = svgY < this.midLineY;
    const isInRedArea = svgY > this.midLineY;

    // Check if click is before finish line
    if (svgX >= 0 && svgX <= 315) {
      if (isInGreenArea) {
        this.placeBet(svgX, svgY, "long");
      } else if (isInRedArea) {
        this.placeBet(svgX, svgY, "short");
      }
    }
  }

  placeBet(x, y, side) {
    const timeframeInSeconds = TIMEFRAMES[this.currentTimeframe] || 60;
    const now = Date.now();
    const box = {
      id: Date.now() + Math.random(),
      x: 0,
      y: y - 10,
      stake: this.stake,
      side: side, // 'long' or 'short'
      entryPrice: this.currentPrice, // Store current price at entry
      timeframe: this.currentTimeframe,
      duration: timeframeInSeconds,
      startTime: now, // store start time (new)
      endTime: now + timeframeInSeconds * 1000, // end timestamp (new)
      settled: false,
      element: null,
      market: this.currentMarket, // important: tie bet to market
    };

    this.createBoxElement(box);
    this.allBoxes.push(box);
  }

  createBoxElement(box) {
    const boxElement = document.createElement("div");
    boxElement.className = "bet-box";
    boxElement.style.left = box.x + "px";
    boxElement.style.top = box.y + "px";

    // Show trade type
    boxElement.innerHTML = `
  <div class="bet-inner">
    <div class="top-row">
      <span class="bet-type">${box.side === "long" ? "📈" : "📉"}</span>
      <span class="bet-stake">$${box.stake.toFixed(2)}</span>
    </div>
    <div class="bet-entry">${box.entryPrice.toFixed(4)}</div>
    <div class="bet-timer" data-boxid="${box.id}">${formatRemaining(
      box.duration
    )}</div>
  </div>
`;

    // helper to format seconds -> "10s" or "01:30"
    function formatRemaining(sec) {
      if (sec >= 60) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      } else {
        return `${Math.ceil(sec)}s`;
      }
    }

    // store format helper on element for later updates
    boxElement._formatRemaining = formatRemaining;

    // Position relative to game container
    const gameContainer = document.querySelector(".game-container");
    gameContainer.appendChild(boxElement);

    box.element = boxElement;

    // hide boxes that are not for current market
    if (box.market !== this.currentMarket) {
      box.element.style.display = "none";
    } else {
      box.element.style.display = "block";
    }
  }

  updateBoxes() {
    for (let i = 0; i < this.allBoxes.length; i++) {
      const box = this.allBoxes[i];

      if (!box.settled) {
        // ✅ Dynamic movement based on timeframe
        const isMobile = window.innerWidth <= 768;
        const canvasWidth = isMobile ? 315 * 0.7 : 315; // Mobile pe 84% width
        const totalDistance = canvasWidth * 0.79;
        const timeframeInSeconds = TIMEFRAMES[box.timeframe] || 60;

        const pixelsPerSecond = totalDistance / timeframeInSeconds;
        // Use time-based speed instead of frame-based
        if (!box.startTime) box.startTime = Date.now();
        const elapsed = (Date.now() - box.startTime) / 1000;
        const distanceTraveled = elapsed * pixelsPerSecond;

        // Ease-out quad for smoother finish
        box.x = Math.min(distanceTraveled, totalDistance);

        if (box.element) {
          box.element.style.left = box.x + "px";

          // Update timer text (remaining)
          const now = Date.now();
          const remainingMs = Math.max(
            0,
            (box.endTime || box.startTime + timeframeInSeconds * 1000) - now
          );
          const remainingSec = Math.ceil(remainingMs / 1000);

          // format: mm:ss if >=60s else "XXs"
          let formatted;
          if (remainingSec >= 60) {
            const m = Math.floor(remainingSec / 60);
            const s = remainingSec % 60;
            formatted = `${String(m).padStart(2, "0")}:${String(s).padStart(
              2,
              "0"
            )}`;
          } else {
            formatted = `${remainingSec}s`;
          }

          const timerEl = box.element.querySelector(".bet-timer");
          if (timerEl) timerEl.textContent = formatted;
        }

        // Check if box reached finish line or time expired
        if (
          box.x >= totalDistance ||
          Date.now() >=
            (box.endTime || box.startTime + timeframeInSeconds * 1000)
        ) {
          box.settled = true;

          // Calculate profit/loss based on mid-line movement
          let won = false;
          if (box.side === "long") {
            won = this.currentPrice > box.entryPrice;
          } else if (box.side === "short") {
            won = this.currentPrice < box.entryPrice;
          }

          if (box.element) {
            box.element.classList.add(won ? "win" : "lose");
            // set timer to 0 / done
            const timerEl = box.element.querySelector(".bet-timer");
            if (timerEl) timerEl.textContent = "0s";
          }

          // Update balance immediately to prevent race conditions
          const stakeAmount = box.stake;
          const isWin = won;

          if (isWin) {
            this.balance += stakeAmount;
            this.showToast("CREDITED", "+" + stakeAmount.toFixed(2), true);
          } else {
            this.balance -= stakeAmount;
            this.showToast("DEBITED", "-" + stakeAmount.toFixed(2), false);
          }
          this.updateBalanceDisplay();

          // Remove box DOM after animation
          setTimeout(() => {
            if (box.element && box.element.parentNode) {
              box.element.remove();
            }
          }, 1000);

          // Remove from allBoxes
          this.allBoxes.splice(i, 1);
          i--;
        }
      } else {
        // if already settled (edge-case), ensure DOM removed
        if (box.element && box.element.parentNode) {
          box.element.remove();
        }
      }
    }
  }

  updatePriceScale() {
    const now = Date.now();
    if (now - this.lastScaleUpdate < 200) return; // Debounce 200ms

    const centerY = this.scaleHeight / 2;
    const priceOffset = this.currentPrice - this.scaleCenterPrice;
    const pixelOffset = priceOffset * this.pixelsPerPrice;

    const thresholdPx = this.scaleHeight / 2.5;
    if (Math.abs(pixelOffset) > thresholdPx) {
      this.scaleCenterPrice = this.currentPrice;
      this.drawTicks();
      this.lastScaleUpdate = now; // Update timestamp
    }
  }

  drawTicks() {
    const inner = this.priceScaleInner;
    inner.innerHTML = "";

    const stepPx = this.tickPx;
    const stepPrice = stepPx / this.pixelsPerPrice;
    const ticksEachSide = Math.ceil(this.scaleHeight / stepPx) + 2;
    const centerY = this.scaleHeight / 2;

    for (let i = -ticksEachSide; i <= ticksEachSide; i++) {
      const y = centerY - i * stepPx;
      const price = this.scaleCenterPrice + i * stepPrice;

      const line = document.createElement("div");
      line.className = `price-tick-line ${i % 2 === 0 ? "major" : ""}`;
      line.style.position = "absolute";
      line.style.left = "0";
      line.style.right = "0";
      line.style.height = "1px";
      line.style.top = `${y}px`;
      inner.appendChild(line);

      const lab = document.createElement("div");
      lab.className = `price-tick ${i % 2 === 0 ? "major" : ""}`;
      lab.style.position = "absolute";
      lab.style.left = "6px";
      lab.style.top = `${y - 8}px`;
      lab.textContent = price.toFixed(4);
      inner.appendChild(lab);
    }
  }

  getPricePerPixel() {
    // Different zoom levels for different markets
    const zooms = {
      ETH: 9,
      SOL: 9,
      BTC: 3,
    };
    return zooms[this.currentMarket] || 1;
  }

  centerMidLine() {
    const gameHeight = 400;
    const targetY = gameHeight / 2;
    const currentY = this.midLineY;
    const duration = 400;
    const startTime = Date.now();

    const glide = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      this.midLineY = currentY + (targetY - currentY) * ease;

      this.midLine.setAttribute("y1", this.midLineY);
      this.midLine.setAttribute("y2", this.midLineY);
      this.greenBar.setAttribute("height", Math.max(0, this.midLineY));
      this.redBar.setAttribute("y", this.midLineY);
      this.redBar.setAttribute("height", Math.max(0, 400 - this.midLineY));

      document
        .getElementById("topShadow")
        .setAttribute("y1", this.midLineY - 30);
      document
        .getElementById("topShadow")
        .setAttribute("y2", this.midLineY - 30);

      if (progress < 1) requestAnimationFrame(glide);
      else {
        this.scaleCenterPrice = this.currentPrice;
        this.drawTicks();
      }
    };
    glide();
  }

  updateStake(e) {
    const value = parseFloat(e.target.value) || 0.5;
    this.stake = Math.max(5, value);
    e.target.value = this.stake.toFixed(1);
  }

  updateBalanceDisplay() {
    this.balanceHud.textContent =
      "Balance: " + this.balance.toFixed(2) + " USDC";
  }

  showToast(title, amount, isWin) {
    // Limit max toasts to 3
    const existingToasts = this.toastContainer.querySelectorAll(".toast");
    if (existingToasts.length >= 3) {
      existingToasts[0].remove();
    }
    const toast = document.createElement("div");
    toast.className = `toast ${isWin ? "win" : "lose"}`;
    toast.textContent = `${title} ${amount}`;

    this.toastContainer.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
      toast.style.animation = "toastSlideUp 0.3s ease-out reverse";
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  showDepositModal() {
    this.depositAmount.textContent = this.stake.toFixed(2);
    this.depositModal.classList.remove("hidden");
  }

  hideDepositModal() {
    this.depositModal.classList.add("hidden");
  }

  showWithdrawModal() {
    this.withdrawAmount.textContent = this.stake.toFixed(2);
    this.withdrawModal.classList.remove("hidden");
  }

  hideWithdrawModal() {
    this.withdrawModal.classList.add("hidden");
  }

  async changeMarket(market) {
    this.currentMarket = market;

    // Hide/show relevant bet boxes
    this.allBoxes.forEach((box) => {
      if (box.element)
        box.element.style.display = box.market === market ? "block" : "none";
    });

    // Update logo
    if (market === "SOL") {
      this.cryptoLogo.setAttribute("viewBox", "0 0 397.7 311.7");
      this.cryptoLogo.innerHTML =
        '<defs><linearGradient id="solGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#00FFA3;stop-opacity:1" /><stop offset="100%" style="stop-color:#DC1FFF;stop-opacity:1" /></linearGradient></defs><path fill="url(#solGradient)" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/><path fill="url(#solGradient)" d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/><path fill="url(#solGradient)" d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"/>';
    } else if (market === "ETH") {
      this.cryptoLogo.setAttribute("viewBox", "0 0 32 32");
      this.cryptoLogo.innerHTML =
        '<path d="M15.927 23.959l-9.823-5.797 9.817 13.839 9.828-13.839-9.828 5.797zM16.073 0l-9.819 16.297 9.819 5.807 9.823-5.801z" fill="#8A92B2"/>';
    } else if (market === "BTC") {
      this.cryptoLogo.setAttribute("viewBox", "0 0 32 32");
      this.cryptoLogo.innerHTML =
        '<circle cx="16" cy="16" r="16" fill="#f7931a"/><path d="M21.03 13.44c.26-1.77-1.09-2.72-2.94-3.36l.6-2.42-1.47-.36-.58 2.34c-.38-.09-.77-.18-1.16-.26l.59-2.37-1.47-.36-.6 2.43c-.31-.07-.62-.15-.92-.23l.01-.03-2.03-.5-.39 1.54s1.09.25 1.06.27c.59.15.69.53.67.83l-.67 2.7c.04.01.08.02.13.03l-.13-.03-.94 3.78c-.07.17-.24.42-.63.33.01.02-1.06-.27-1.06-.27l-.73 1.68 1.92.48c.36.09.71.19 1.05.28l-.61 2.47 1.47.36.6-2.43c.4.11.8.21 1.18.31l-.6 2.42 1.47.36.61-2.46c2.5.47 4.38.28 5.17-1.98.64-1.81-.03-2.86-1.35-3.55.96-.22 1.68-.86 1.87-2.17Zm-3.36 4.74c-.45 1.81-3.48.83-4.47.59l.8-3.21c.99.25 4.14.75 3.67 2.62Zm.45-4.76c-.41 1.66-2.93.82-3.75.61l.72-2.9c.82.21 3.46.6 3.03 2.29Z" fill="white"/>';
    }

    // show loading state while fetching real price
    this.leftPriceTag.textContent = this.rightPriceTag.textContent = "…";
    this.leftPriceTag.style.opacity = this.rightPriceTag.style.opacity = "0.5";

    // get the real price before showing anything
    let price = null;
    try {
      price = await this.fetchRealPrice(market);
    } catch (e) {
      console.warn("Price fetch failed, fallback used.");
    }

    // fallback if API fails
    if (!price || isNaN(price)) {
      const basePrices = { SOL: 150, ETH: 2500, BTC: 65000 };
      price = basePrices[market];
    }

    // apply instantly once real price known
    this.currentPrice = price;
    this.scaleCenterPrice = price;
    this.pixelsPerPrice = this.getPricePerPixel();
    this.drawTicks();

    this.leftPriceTag.textContent = this.rightPriceTag.textContent =
      "$" + price.toFixed(4);
    this.leftPriceTag.style.opacity = this.rightPriceTag.style.opacity = "1";

    // restart live updates for new market
    this.startMockUpdates();
  }

  async fetchRealPrice(market) {
    try {
      const id = FEEDS[market];
      const url = `https://hermes.pyth.network/api/latest_price_feeds?ids[]=${id}`;
      const res = await fetch(url);
      const data = await res.json();
      const p = data[0].price;
      const price = Number(p.price) * Math.pow(10, Number(p.expo));
      if (this.currentMarket === market) this.currentPrice = price;
      return price;
    } catch (e) {
      console.warn("Pyth fetch failed", e);
      return this.currentPrice;
    }
  }

  startMockUpdates() {
    // stop any previous intervals
    if (this.priceUpdateInterval) clearInterval(this.priceUpdateInterval);
    if (this.displayUpdateInterval) clearInterval(this.displayUpdateInterval);

    let displayedPrice = this.currentPrice;

    this.priceUpdateInterval = setInterval(() => {
      const marketNow = this.currentMarket;
      this.fetchRealPrice(marketNow).catch(() => {});
    }, 400);

    this.displayUpdateInterval = setInterval(() => {
      const oldDisplayPrice = displayedPrice;
      const targetPrice = this.currentPrice;
      const diff = targetPrice - displayedPrice;
      displayedPrice += diff * 0.2;

      this.leftPriceTag.textContent = "$" + displayedPrice.toFixed(4);
      this.rightPriceTag.textContent = "$" + displayedPrice.toFixed(4);

      if (displayedPrice > oldDisplayPrice) {
        this.leftPriceTag.style.color = "#96FF2C";
        this.rightPriceTag.style.color = "#96FF2C";
      } else if (displayedPrice < oldDisplayPrice) {
        this.leftPriceTag.style.color = "#f948aa";
        this.rightPriceTag.style.color = "#f948aa";
      } else {
        this.leftPriceTag.style.color = "white";
        this.rightPriceTag.style.color = "white";
      }
    }, 50);

    // Mock player count updates
    setInterval(() => {
      this.playerCount = Math.max(
        1,
        this.playerCount + Math.floor(Math.random() * 3) - 1
      );
      this.playerCountDisplay.textContent =
        this.playerCount + " players online";
    }, 2000);
  }

  initializePlayers() {
    this.players = [];
    this.leaderboardContent = document.getElementById("leaderboardContent");

    // Player name templates
    const names = [
      "Crypto King",
      "Moon Walker",
      "Diamond Hands",
      "Whale Hunter",
      "Degen Trader",
      "Bull Master",
      "Bear Slayer",
      "Profit Ninja",
      "Leverage Lord",
      "Chart Wizard",
      "Pump Chaser",
      "Bag Holder",
      "HODL Hero",
      "Swing Master",
      "Day Trader",
      "Scalp God",
    ];

    // Emoji avatars with gradient backgrounds
    const avatars = [
      { emoji: "🚀", bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
      { emoji: "💎", bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
      { emoji: "🐋", bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
      { emoji: "🔥", bg: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
      { emoji: "⚡", bg: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)" },
      { emoji: "🎯", bg: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)" },
      { emoji: "👑", bg: "linear-gradient(135deg, #ffd89b 0%, #19547b 100%)" },
      { emoji: "🦅", bg: "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)" },
      { emoji: "🌟", bg: "linear-gradient(135deg, #fddb92 0%, #d1fdff 100%)" },
      { emoji: "💰", bg: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)" },
    ];

    // Generate 10 initial players
    for (let i = 0; i < 10; i++) {
      const name = names[Math.floor(Math.random() * names.length)];
      const avatar = avatars[Math.floor(Math.random() * avatars.length)];
      const winRate = Math.floor(Math.random() * 60) + 30; // 30-90%
      const joinTime = new Date(Date.now() - Math.random() * 3600000); // Random time in last hour

      this.players.push({
        id: Date.now() + i,
        name: name,
        avatar: avatar,
        winRate: winRate,
        joinTime: joinTime,
      });
    }

    // Render initial players
    this.renderPlayers();

    // Duplicate content for infinite scroll effect
    setTimeout(() => {
      const children = Array.from(this.leaderboardContent.children);
      children.forEach((child) => {
        const clone = child.cloneNode(true);
        this.leaderboardContent.appendChild(clone);
      });
    }, 100);

    // Add new players periodically
    setInterval(() => {
      this.addRandomPlayer();
    }, 8000);
  }

  renderPlayers() {
    this.leaderboardContent.innerHTML = "";

    this.players.forEach((player) => {
      const playerEl = this.createPlayerElement(player);
      this.leaderboardContent.appendChild(playerEl);
    });
  }

  createPlayerElement(player) {
    const div = document.createElement("div");
    div.className = "player-item";

    const timeDiff = Math.floor((Date.now() - player.joinTime) / 60000); // minutes ago
    const timeText = timeDiff < 1 ? "Just now" : `${timeDiff}m ago`;

    let winRateClass = "low";
    if (player.winRate >= 70) winRateClass = "high";
    else if (player.winRate >= 50) winRateClass = "medium";

    div.innerHTML = `
                        <div class="player-avatar" style="background: ${player.avatar.bg}">
                            ${player.avatar.emoji}
                        </div>
                        <div class="player-info-text">
                            <div class="player-name">${player.name}</div>
                            <div class="player-stats">
                                <span class="player-time">${timeText}</span>
                                <span class="player-winrate ${winRateClass}">${player.winRate}% W</span>
                            </div>
                        </div>
                    `;

    return div;
  }

  addRandomPlayer() {
    const names = [
      "Crypto King",
      "Moon Walker",
      "Diamond Hands",
      "Whale Hunter",
      "Degen Trader",
      "Bull Master",
      "Bear Slayer",
      "Profit Ninja",
    ];

    const avatars = [
      { emoji: "🚀", bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
      { emoji: "💎", bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
      { emoji: "🐋", bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" },
      { emoji: "🔥", bg: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
    ];

    const name = names[Math.floor(Math.random() * names.length)];
    const avatar = avatars[Math.floor(Math.random() * avatars.length)];
    const winRate = Math.floor(Math.random() * 60) + 30;

    // Remove oldest player
    if (this.players.length >= 10) {
      this.players.shift();
    }

    // Add new player
    this.players.push({
      id: Date.now(),
      name: name,
      avatar: avatar,
      winRate: winRate,
      joinTime: new Date(),
    });

    // Re-render
    this.renderPlayers();

    // Duplicate for scroll
    setTimeout(() => {
      const children = Array.from(this.leaderboardContent.children);
      children.forEach((child) => {
        const clone = child.cloneNode(true);
        this.leaderboardContent.appendChild(clone);
      });
    }, 100);
  }
}
// ===== Floating FAB Menu Logic =====
document.addEventListener("DOMContentLoaded", () => {
  const fabMain = document.getElementById("fabMain");
  const fabOptions = document.getElementById("fabOptions");
  const fabDeposit = document.getElementById("fabDeposit");
  const fabWithdraw = document.getElementById("fabWithdraw");

  fabMain.addEventListener("click", () => {
    const visible = fabOptions.style.display === "flex";
    fabOptions.style.display = visible ? "none" : "flex";
  });

  fabDeposit.addEventListener("click", () => {
    fabOptions.style.display = "none";
    document.getElementById("depositModal").classList.remove("hidden");
  });

  fabWithdraw.addEventListener("click", () => {
    fabOptions.style.display = "none";
    document.getElementById("withdrawModal").classList.remove("hidden");
  });
});

// Initialize game when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new TradingGame();
});

// Prevent scrolling and zooming on mobile
document.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);

document.addEventListener("gesturestart", (e) => {
  e.preventDefault();
});
