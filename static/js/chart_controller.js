/* ======================  ChartController  ======================= */
/*  Controls:                                                     */
/*   – Show/Hide payoff chart                                     */
/*   – Fullscreen Pay-off chart                                   */
/*   – Fullscreen Option-chain card                               */
/*   – Esc key exits any fullscreen                               */
/* =============================================================== */

class ChartController {
  constructor() {
    this.isPayoffFullscreen = false;
    this.isOptionChainFullscreen = false;
    this.originalPayoffParent = null;
    this.originalOptionChainParent = null;
    this.payoffCard = null;
    this.optionChainCard = null;
    this.init();
  }

  /* -----------------------  INIT  ----------------------- */
  init() {
    this.payoffCard = document.querySelector('.card.shadow-sm:has(#payoff-tab)');
    this.optionChainCard = document.querySelector('.card.shadow-sm:has(#refreshBtn)');
    this.setupEventListeners();
    console.log('Chart Controller initialized');
  }

  /* ------------------  EVENT LISTENERS  ----------------- */
  setupEventListeners() {
    /* Hide / Show payoff */
    document.getElementById('togglePayoffView')?.addEventListener('click', () =>
      this.togglePayoffVisibility()
    );

    /* Full-screen buttons */
    document.getElementById('fullscreenPayoff')?.addEventListener('click', () =>
      this.togglePayoffFullscreen()
    );
    document.getElementById('fullscreenOptionChain')?.addEventListener('click', () =>
      this.toggleOptionChainFullscreen()
    );

    /* ESC exits any fullscreen */
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.isPayoffFullscreen && this.exitPayoffFullscreen();
        this.isOptionChainFullscreen && this.exitOptionChainFullscreen();
      }
    });
  }

  /* ============  PAYOFF HIDE / SHOW  ============ */
  togglePayoffVisibility() {
    const payoffContent = document.getElementById('payoffChartContent');
    const toggleBtn     = document.getElementById('togglePayoffView');
    if (!payoffContent || !toggleBtn) return;

    const hidden = payoffContent.style.display === 'none';
    payoffContent.style.display = hidden ? '' : 'none';
    toggleBtn.innerHTML = hidden
      ? '<i class="fas fa-chevron-up"></i>'
      : '<i class="fas fa-chevron-down"></i>';
    toggleBtn.title    = hidden ? 'Hide Payoff Chart' : 'Show Payoff Chart';
  }

  /* ============  PAYOFF FULLSCREEN  ============ */
  togglePayoffFullscreen() {
    this.isPayoffFullscreen ? this.exitPayoffFullscreen() : this.enterPayoffFullscreen();
  }

  enterPayoffFullscreen() {
    if (!this.payoffCard) return;
    this.originalPayoffParent = this.payoffCard.parentNode;

    /* overlay */
    const overlay = document.createElement('div');
    overlay.className = 'payoff-fullscreen-overlay';
    overlay.id = 'payoffOverlay';
    document.body.appendChild(overlay);

    /* exit button */
    const exitBtn = document.createElement('button');
    exitBtn.className = 'fullscreen-exit-btn';
    exitBtn.innerHTML = '<i class="fas fa-times me-1"></i>Exit Fullscreen';
    exitBtn.onclick = () => this.exitPayoffFullscreen();

    this.payoffCard.classList.add('payoff-fullscreen');
    this.payoffCard.appendChild(exitBtn);
    document.body.appendChild(this.payoffCard);

    const fsBtn = document.getElementById('fullscreenPayoff');
    fsBtn && (fsBtn.innerHTML = '<i class="fas fa-compress"></i>', fsBtn.title = 'Exit Fullscreen');

    /* Highcharts reflow */
    setTimeout(() => tradingState?.payoffChart?.reflow(), 100);

    this.isPayoffFullscreen = true;
  }

  exitPayoffFullscreen() {
    if (!this.isPayoffFullscreen || !this.payoffCard) return;

    this.payoffCard.classList.remove('payoff-fullscreen');
    this.payoffCard.querySelector('.fullscreen-exit-btn')?.remove();
    this.originalPayoffParent?.appendChild(this.payoffCard);
    document.getElementById('payoffOverlay')?.remove();

    const fsBtn = document.getElementById('fullscreenPayoff');
    fsBtn && (fsBtn.innerHTML = '<i class="fas fa-expand"></i>', fsBtn.title = 'Fullscreen View');

    setTimeout(() => tradingState?.payoffChart?.reflow(), 100);
    this.isPayoffFullscreen = false;
  }

  /* ============  OPTION-CHAIN FULLSCREEN  ============ */
  toggleOptionChainFullscreen() {
    this.isOptionChainFullscreen ? this.exitOptionChainFullscreen() : this.enterOptionChainFullscreen();
  }

  enterOptionChainFullscreen() {
    if (!this.optionChainCard) return;
    this.originalOptionChainParent = this.optionChainCard.parentNode;

    const overlay = document.createElement('div');
    overlay.className = 'payoff-fullscreen-overlay';
    overlay.id = 'optionChainOverlay';
    document.body.appendChild(overlay);

    const exitBtn = document.createElement('button');
    exitBtn.className = 'fullscreen-exit-btn';
    exitBtn.innerHTML = '<i class="fas fa-times me-1"></i>Exit Fullscreen';
    exitBtn.onclick = () => this.exitOptionChainFullscreen();

    this.optionChainCard.classList.add('option-chain-fullscreen');
    this.optionChainCard.appendChild(exitBtn);
    document.body.appendChild(this.optionChainCard);

    const fsBtn = document.getElementById('fullscreenOptionChain');
    fsBtn && (fsBtn.innerHTML = '<i class="fas fa-compress"></i>', fsBtn.title = 'Exit Fullscreen');

    this.isOptionChainFullscreen = true;
  }

  exitOptionChainFullscreen() {
    if (!this.isOptionChainFullscreen || !this.optionChainCard) return;

    this.optionChainCard.classList.remove('option-chain-fullscreen');
    this.optionChainCard.querySelector('.fullscreen-exit-btn')?.remove();
    this.originalOptionChainParent?.appendChild(this.optionChainCard);
    document.getElementById('optionChainOverlay')?.remove();

    const fsBtn = document.getElementById('fullscreenOptionChain');
    fsBtn && (fsBtn.innerHTML = '<i class="fas fa-expand"></i>', fsBtn.title = 'Fullscreen View');

    this.isOptionChainFullscreen = false;
  }

  /* Optional cleanup if you ever re-initialise */
  destroy() {
    this.exitPayoffFullscreen();
    this.exitOptionChainFullscreen();
  }
}

/* Instantiate once DOM is ready */
document.addEventListener('DOMContentLoaded', () => new ChartController());
