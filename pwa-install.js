/**
 * HSAAS On-Call Roster PWA Helper Script
 * Dynamically handles service worker registration, custom install prompts,
 * iOS install instruction bottom sheets, and theme-responsive styling.
 */

(function () {
  // --- Configuration ---
  const DISMISS_DURATION_DAYS = 14;
  const DISMISS_KEY = 'pwa-install-dismissed';
  
  // --- State Variables ---
  let deferredPrompt = null;
  const isIOS = /Macintosh|iPad|iPhone|iPod/.test(navigator.userAgent) && 'ontouchend' in document;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  // --- 1. Service Worker Registration ---
  if (window.location.hostname !== 'localhost' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then((reg) => console.log('[PWA] Service Worker registered scope:', reg.scope))
        .catch((err) => console.error('[PWA] Service Worker registration failed:', err));
    });
  }

  // --- 2. CSS Injector ---
  const styles = `
    /* Header Install Icon styling */
    .header-install-btn {
      all: unset;
      background: var(--bg-card);
      border: 1px solid var(--border);
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--text-main);
      box-shadow: var(--shadow-premium);
      transition: var(--transition);
      box-sizing: border-box;
      margin-right: 8px;
    }
    .header-install-btn:hover {
      border-color: var(--primary);
      color: var(--primary);
      transform: translateY(-1px);
    }
    .header-install-btn:active {
      transform: scale(0.9);
    }
    
    /* Floating Install Banner */
    .pwa-banner {
      position: fixed;
      bottom: 104px; /* Rests above bottom nav bar (24px offset + 64px height + gap) */
      left: 50%;
      transform: translateX(-50%) translateY(150px);
      width: min(90%, 460px);
      background: var(--glass);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius);
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 14px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1), var(--shadow-premium);
      z-index: 1500;
      opacity: 0;
      pointer-events: none;
      transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
      box-sizing: border-box;
    }
    .pwa-banner.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
      pointer-events: auto;
    }
    .pwa-banner-icon {
      width: 46px;
      height: 46px;
      border-radius: 10px;
      border: 1.5px solid var(--border);
      background: white;
      object-fit: cover;
      flex-shrink: 0;
    }
    .pwa-banner-content {
      flex: 1;
      min-width: 0;
    }
    .pwa-banner-title {
      font-size: 0.88rem;
      font-weight: 800;
      color: var(--text-main);
      margin-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .pwa-banner-desc {
      font-size: 0.72rem;
      color: var(--text-muted);
      line-height: 1.25;
    }
    .pwa-banner-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .pwa-btn-install {
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 8px 16px;
      font-size: 0.72rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
      transition: var(--transition);
      white-space: nowrap;
    }
    .pwa-btn-install:active {
      transform: scale(0.95);
    }
    .pwa-btn-close {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: var(--transition);
    }
    .pwa-btn-close:hover {
      background: var(--primary-glow);
      color: var(--primary);
    }
    .pwa-btn-close svg {
      width: 16px;
      height: 16px;
    }

    /* iOS Modal Drawer */
    .pwa-ios-overlay {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.4);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 2500;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.35s ease;
    }
    .pwa-ios-overlay.show {
      opacity: 1;
      pointer-events: auto;
    }
    .pwa-ios-sheet {
      position: fixed;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%) translateY(100%);
      width: 100%;
      max-width: 480px;
      background: var(--bg-card);
      border-top-left-radius: 28px;
      border-top-right-radius: 28px;
      border-top: 1px solid var(--border);
      padding: 24px 22px 34px;
      box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);
      z-index: 2501;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      box-sizing: border-box;
    }
    .pwa-ios-overlay.show .pwa-ios-sheet {
      transform: translateX(-50%) translateY(0);
    }
    .pwa-ios-handle {
      width: 36px;
      height: 4px;
      background: var(--border);
      border-radius: 2px;
      margin: 0 auto 20px;
    }
    .pwa-ios-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 22px;
    }
    .pwa-ios-logo {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      border: 1px solid var(--border);
      object-fit: cover;
    }
    .pwa-ios-title-wrap {
      flex: 1;
    }
    .pwa-ios-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--text-main);
      letter-spacing: 0.2px;
    }
    .pwa-ios-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 1px;
    }
    .pwa-ios-steps {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 26px;
    }
    .pwa-ios-step {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .pwa-ios-step-num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--primary-glow);
      color: var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 800;
      flex-shrink: 0;
    }
    .pwa-ios-step-text {
      font-size: 0.84rem;
      color: var(--text-main);
      line-height: 1.45;
      margin-top: 1px;
    }
    .pwa-ios-icon-inline {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--border);
      border-radius: 6px;
      padding: 4px;
      vertical-align: middle;
      margin: 0 4px;
      color: var(--text-main);
    }
    .pwa-ios-icon-inline svg {
      width: 14px;
      height: 14px;
    }
    .pwa-ios-btn-gotit {
      width: 100%;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 14px;
      padding: 12px;
      font-size: 0.88rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
      transition: var(--transition);
      letter-spacing: 0.5px;
    }
    .pwa-ios-btn-gotit:active {
      transform: scale(0.97);
    }
  `;

  // --- 3. Inject CSS Block ---
  function injectStyles() {
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
  }

  // --- 4. Inject PWA DOM Elements ---
  function injectDOMElements() {
    // A. Inject floating install banner (only if not standalone)
    if (!isStandalone && !document.querySelector('.pwa-banner')) {
      const banner = document.createElement('div');
      banner.className = 'pwa-banner';
      banner.innerHTML = `
        <img src="hsaas-logo.png" alt="HSAAS Logo" class="pwa-banner-icon">
        <div class="pwa-banner-content">
          <div class="pwa-banner-title">HSAAS Roster</div>
          <div class="pwa-banner-desc">Install app to get offline access and seamless updates</div>
        </div>
        <div class="pwa-banner-actions">
          <button class="pwa-btn-install" id="pwa-banner-install-btn">Install</button>
          <button class="pwa-btn-close" id="pwa-banner-close-btn" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;
      document.body.appendChild(banner);

      // Event listeners for banner
      document.getElementById('pwa-banner-install-btn').addEventListener('click', triggerInstallFlow);
      document.getElementById('pwa-banner-close-btn').addEventListener('click', dismissBanner);
    }

    // B. Inject iOS modal bottom sheet (only if not standalone)
    if (!isStandalone && !document.querySelector('.pwa-ios-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'pwa-ios-overlay';
      overlay.id = 'pwa-ios-instructions';
      overlay.innerHTML = `
        <div class="pwa-ios-sheet">
          <div class="pwa-ios-handle"></div>
          <div class="pwa-ios-header">
            <img src="hsaas-logo.png" alt="HSAAS Logo" class="pwa-ios-logo">
            <div class="pwa-ios-title-wrap">
              <div class="pwa-ios-title">Install HSAAS Roster</div>
              <div class="pwa-ios-subtitle">Add this app to your iPhone Home Screen</div>
            </div>
          </div>
          <div class="pwa-ios-steps">
            <div class="pwa-ios-step">
              <div class="pwa-ios-step-num">1</div>
              <div class="pwa-ios-step-text">
                Tap the <strong>Share</strong> button
                <span class="pwa-ios-icon-inline">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                    <polyline points="16 6 12 2 8 6"></polyline>
                    <line x1="12" y1="2" x2="12" y2="15"></line>
                  </svg>
                </span>
                in Safari's navigation bar.
              </div>
            </div>
            <div class="pwa-ios-step">
              <div class="pwa-ios-step-num">2</div>
              <div class="pwa-ios-step-text">
                Scroll down and select <strong>Add to Home Screen</strong>
                <span class="pwa-ios-icon-inline">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                </span>.
              </div>
            </div>
          </div>
          <button class="pwa-ios-btn-gotit" id="pwa-ios-gotit-btn">Got It</button>
        </div>
      `;
      document.body.appendChild(overlay);

      // Event listeners for iOS sheet
      document.getElementById('pwa-ios-gotit-btn').addEventListener('click', hideIosInstructions);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) hideIosInstructions();
      });
    }

    // C. Inject header install button next to theme toggle (if header brand exists)
    const headerBrand = document.querySelector('.header-brand');
    if (headerBrand && !document.getElementById('pwa-install-btn')) {
      const installBtn = document.createElement('button');
      installBtn.id = 'pwa-install-btn';
      installBtn.className = 'header-install-btn is-hidden'; // Hidden by default
      installBtn.setAttribute('aria-label', 'Install App');
      installBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      `;
      
      // Insert right before the theme toggle button (which is the last child or we find it)
      const themeToggle = headerBrand.querySelector('.theme-toggle');
      if (themeToggle) {
        headerBrand.insertBefore(installBtn, themeToggle);
      } else {
        headerBrand.appendChild(installBtn);
      }

      installBtn.addEventListener('click', triggerInstallFlow);
    }
  }

  // --- 5. Logic & Handlers ---
  function showBanner() {
    if (isStandalone) return;
    
    // Check if dismissed recently
    const dismissedTime = localStorage.getItem(DISMISS_KEY);
    if (dismissedTime) {
      const daysSinceDismiss = (Date.now() - parseInt(dismissedTime, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismiss < DISMISS_DURATION_DAYS) {
        console.log(`[PWA] Install banner was dismissed ${daysSinceDismiss.toFixed(1)} days ago. Keeping it hidden.`);
        return;
      }
    }

    const banner = document.querySelector('.pwa-banner');
    if (banner) {
      // Small timeout to let elements settle
      setTimeout(() => banner.classList.add('show'), 1500);
    }
  }

  function dismissBanner() {
    const banner = document.querySelector('.pwa-banner');
    if (banner) {
      banner.classList.remove('show');
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
      console.log(`[PWA] Banner dismissed by user. Muted for ${DISMISS_DURATION_DAYS} days.`);
    }
  }

  function triggerInstallFlow() {
    // Hide the floating banner if visible
    const banner = document.querySelector('.pwa-banner');
    if (banner) banner.classList.remove('show');

    if (deferredPrompt) {
      // Trigger native browser install prompt (Android / Chrome / Edge)
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA] User accepted the install prompt.');
          hideHeaderButton();
        } else {
          console.log('[PWA] User dismissed the install prompt.');
        }
        deferredPrompt = null;
      });
    } else if (isIOS) {
      // Show iOS step-by-step sheet
      showIosInstructions();
    } else {
      console.log('[PWA] Install prompt not available for this platform/browser.');
    }
  }

  function showIosInstructions() {
    const overlay = document.getElementById('pwa-ios-instructions');
    if (overlay) {
      overlay.classList.add('show');
      if (window.navigator?.vibrate) window.navigator.vibrate(10);
    }
  }

  function hideIosInstructions() {
    const overlay = document.getElementById('pwa-ios-instructions');
    if (overlay) {
      overlay.classList.remove('show');
    }
  }

  function showHeaderButton() {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.classList.remove('is-hidden');
  }

  function hideHeaderButton() {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) btn.classList.add('is-hidden');
  }

  // --- 6. Event Initializers ---
  
  // Listen for beforeinstallprompt (Android / Chrome / Desktop)
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser prompt banner
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    console.log('[PWA] beforeinstallprompt event fired.');
    
    // Setup and show our custom UI
    showHeaderButton();
    showBanner();
  });

  // Check on load if the user is on iOS and not standalone
  window.addEventListener('DOMContentLoaded', () => {
    injectStyles();
    injectDOMElements();

    // On iOS, beforeinstallprompt never fires. 
    // We show the header install button and banner if iOS + not standalone.
    if (isIOS && !isStandalone) {
      console.log('[PWA] Running on iOS Safari. Showing custom prompt.');
      showHeaderButton();
      showBanner();
    }
  });

  // Listen for successful install event (fired when installation completes)
  window.addEventListener('appinstalled', (evt) => {
    console.log('[PWA] App successfully installed!');
    hideHeaderButton();
    const banner = document.querySelector('.pwa-banner');
    if (banner) banner.classList.remove('show');
  });

})();
