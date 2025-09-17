/*  static/js/symbol_selector_fixed.js  – v2
 *  ------------------------------------------------------------------
 *  ✔  Index   → expiry list          (/get_expiry_dates)
 *  ✔  Exchange → symbol list         (/get_*_symbols)
 *  ✔  Exchange+Symbol → expiry list  (/othersymbolexpiry)
 *  ✔  Robust normalisation of exchange values
 *  ✔  Displays selected combination in #selectedDetailsDisplay
 *  ------------------------------------------------------------------
 */

console.log("🚨 SYMBOL_SELECTOR_FIXED.JS LOADING - TIMESTAMP: " + Date.now());

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚨 DOMContentLoaded fired in symbol_selector_fixed.js");

  /* ---------- DOM refs & helpers ---------- */
  const loaderHTML   = document.getElementById("loaderTemplate")?.innerHTML
                     || '<div class="text-center"><small>Loading…</small></div>';

  const indexSelect  = document.getElementById("indexSelect");
  const exchangeSel  = document.getElementById("exchangeSelect");
  const extraSelect  = document.getElementById("extraSelect");
  const expiryView   = document.getElementById("expiryViewerCarousel");

  let expiryCtrl = null, symbolCtrl = null;

  /* =================================================================
     HELPER: Show/Hide Collapsible Sections
     ================================================================= */
  function updateSectionVisibility() {
    const hasIndex = indexSelect?.value !== "";
    const hasExchangeAndSymbol = exchangeSel?.value !== "" && extraSelect?.value !== "";
    const shouldShow = hasIndex || hasExchangeAndSymbol;
    
    const expirySection = document.getElementById("expiryDateSection");
    const marketDataCard = document.getElementById("marketDataCard");
    
    if (shouldShow) {
      expirySection.style.display = "block";
      marketDataCard.style.display = "block";
    } else {
      expirySection.style.display = "none";
      marketDataCard.style.display = "none";
    }
  }

  /* =================================================================
     SYMBOL CHANGE EVENT HANDLING
     ================================================================= */
  function emitSymbolChanging() {
    // Emit custom event to signal symbol is changing
    window.dispatchEvent(new CustomEvent('symbol:changing', {
      detail: { timestamp: Date.now() }
    }));
  }

  // Set up listener to clear market data when symbol changes
  window.addEventListener('symbol:changing', () => {
    if (window.marketDataUI) {
      window.marketDataUI.clearMarketDataLabels({ preserve: ['vix'] });
    } else {
      // Defensive fallback if marketDataUI isn't loaded yet
      console.log('🔄 MarketDataUI not yet loaded, performing basic symbol clearing');
      const marketElements = document.querySelectorAll('[data-market-data], .price-display, .market-value');
      marketElements.forEach(element => {
        // Check if it's a VIX element (preserve VIX)
        const elementId = element.id?.toLowerCase() || '';
        const dataMarketData = element.getAttribute('data-market-data')?.toLowerCase() || '';
        const classNames = element.className?.toLowerCase() || '';
        
        const isVix = elementId.includes('vix') || 
                     dataMarketData.includes('vix') || 
                     classNames.includes('vix-display') ||
                     classNames.includes('vix-value');
        
        if (!isVix) {
          element.textContent = '—';
          element.classList.remove('md-up', 'md-down', 'flash-up', 'flash-down', 'text-success', 'text-danger');
        }
      });
    }
  });

  /* =================================================================
     EVENTS
     ================================================================= */
  console.log(`🔍 DEBUG: indexSelect element found: ${!!indexSelect}`, indexSelect);
  console.log(`🔍 DEBUG: indexSelect ID: ${indexSelect?.id}`, `Value: ${indexSelect?.value}`);
  
  // Reset indexSelect to default "NIFTY" and trigger change
  if (indexSelect && indexSelect.value !== "NIFTY") {
    console.log("Reset indexSelect to default: NIFTY 50");
    indexSelect.value = "NIFTY";
    // Trigger change event to update WebSocket subscriptions
    setTimeout(() => {
      indexSelect.dispatchEvent(new Event('change'));
    }, 1000); // Delay to ensure WebSocket handler is loaded
  }
  
  indexSelect?.addEventListener("change", () => {
    console.log(`🔍 INDEX CHANGE DETECTED: ${indexSelect.value}`);
    
    if (!indexSelect.value) {
      clearExpiry();
      updateSectionVisibility();
      return;
    }
    // Clear market data before changing symbol
    emitSymbolChanging();
    
    exchangeSel.value = "";
    extraSelect.innerHTML = '<option value="">Select Symbol</option>';
    fetchExpiryForIndex(indexSelect.value);
    // Lookup symbol and lot size for index
    lookupSymbolAndLotSize('index', indexSelect.value, '');
    
    // WebSocket-only symbol change handling
    console.log(`🔍 WebSocketHandler exists: ${!!window.webSocketHandler}`);
    if (window.webSocketHandler) {
      const indexMapping = {
        'NIFTY': 'NSE:NIFTY50-INDEX',
        'NIFTY 50': 'NSE:NIFTY50-INDEX', 
        'BANKNIFTY': 'NSE:NIFTYBANK-INDEX',
        'BANK NIFTY': 'NSE:NIFTYBANK-INDEX',
        'FINNIFTY': 'NSE:FINNIFTY-INDEX',
        'MIDCPNIFTY': 'NSE:MIDCPNIFTY-INDEX',
        'SENSEX': 'BSE:SENSEX-INDEX',
        'BANKEX': 'BSE:BANKEX-INDEX'
      };
      const fyersSymbol = indexMapping[indexSelect.value] || `NSE:${indexSelect.value}-INDEX`;
      console.log(`📊 Index changed to ${indexSelect.value}, handling symbol change for ${fyersSymbol}`);
      
      // Use enhanced WebSocket symbol change handler
      window.webSocketHandler.handleSymbolChange(fyersSymbol);
    } else {
      console.error(`❌ WebSocketHandler not found when index changed to ${indexSelect.value}`);
    }
    
    // Spot price updates will be started automatically after symbol lookup completes
    updateSectionVisibility();
  });

  exchangeSel?.addEventListener("change", () => {
    indexSelect.value = "";
    clearExpiry();
    if (!exchangeSel.value) {
      extraSelect.innerHTML = '<option value="">Select Symbol</option>';
      updateSectionVisibility();
      return;
    }
    // Clear market data before changing symbol
    emitSymbolChanging();
    
    loadExtraSymbols(exchangeSel.value);
    updateSectionVisibility();
  });

  extraSelect?.addEventListener("change", () => {
    // Clear market data before changing symbol
    emitSymbolChanging();
    
    indexSelect.value = "";
    clearExpiry();
    if (exchangeSel.value && extraSelect.value) {
      fetchExpiryForSymbol(exchangeSel.value, extraSelect.value);
      // Lookup symbol and lot size for exchange+symbol
      lookupSymbolAndLotSize('exchange', extraSelect.value, exchangeSel.value);
      
      // Handle WebSocket symbol change for exchange+symbol selection
      if (window.webSocketHandler) {
        const exchange = exchangeSel.value;
        const symbol = extraSelect.value;
        const fyersSymbol = exchange === 'MCX' ? `${exchange}:${symbol}` : `${exchange}:${symbol}-EQ`;
        console.log(`📊 Exchange+Symbol changed to ${fyersSymbol}`);
        
        // Use enhanced WebSocket symbol change handler
        window.webSocketHandler.handleSymbolChange(fyersSymbol);
      }
    }
    updateSectionVisibility();
  });

  // Strike Count Dropdown Event Listener
  const strikeCountSelect = document.getElementById("strikeCountSelect");
  strikeCountSelect?.addEventListener("change", () => {
    const selectedCount = strikeCountSelect.value;
    console.log("Strike count changed to:", selectedCount);
    // Update WebSocket handler strike count
    if (window.webSocketHandler) {
      window.webSocketHandler.strikeCount = selectedCount;
      window.webSocketHandler.refreshOptionChain();
    }
  });

  /* =================================================================
     FETCH: expiry for index / symbol
     ================================================================= */
  function fetchExpiryForIndex(symbol) {
    abort(expiryCtrl);
    expiryCtrl = new AbortController();
    expiryView.innerHTML = loaderHTML; resetScroll();

    fetch(`/get_expiry_dates?symbol=${encodeURIComponent(symbol)}`,
           { signal: expiryCtrl.signal })
      .then(okJSON).then(d => renderOrEmpty(d.expiry_list))
      .catch(err => handleErr(err, "expiry dates"));
  }

  function fetchExpiryForSymbol(exchange, symbol) {
    abort(expiryCtrl);
    expiryCtrl = new AbortController();
    expiryView.innerHTML = loaderHTML; resetScroll();

    fetch(`/othersymbolexpiry?exchange=${encodeURIComponent(exchange)}&symbol=${encodeURIComponent(symbol)}`,
          { signal: expiryCtrl.signal })
      .then(okJSON).then(d => renderOrEmpty(d.expiry_list))
      .catch(err => handleErr(err, "symbol expiries"));
  }

  /* =================================================================
     FETCH: symbols for an exchange
     ================================================================= */
  function loadExtraSymbols(exchangeRaw) {
    abort(symbolCtrl);
    symbolCtrl = new AbortController();

    const key = exchangeRaw
      .toUpperCase()
      .replace(/\s+/g, "")
      .replace(/-/g, "–");

    const ep =
          key === "NSE"            ? "/get_nse_symbols"  :
          key === "BSE"            ? "/get_bse_symbols"  :
          key === "MCX"            ? "/get_mcx_symbols"  :
          key === "CRYPTO"         ? "/get_crypto_symbols" :
          key === "NSE–COMMODITY"  ? "/get_NSE_Commodity_symbols" :
          null;

    if (!ep) {
      extraSelect.innerHTML = '<option value="">Unsupported exchange</option>';
      console.warn("Unrecognised exchange value:", exchangeRaw);
      return;
    }

    extraSelect.innerHTML = '<option value="">Loading symbols…</option>';
    extraSelect.disabled  = true;

    fetch(ep, { signal: symbolCtrl.signal })
      .then(okJSON)
      .then(({ symbols = [] }) => {
        console.log(`Fetched ${symbols.length} symbols for ${exchangeRaw}`);
        extraSelect.innerHTML = '<option value="">Select Symbol</option>' +
          symbols.map(s => `<option value="${s}">${s}</option>`).join("");
        if (!symbols.length)
          extraSelect.innerHTML = '<option value="">No symbols found</option>';
      })
      .catch(err => handleErr(err, "symbols"))
      .finally(() => { extraSelect.disabled = false; });
  }

  /* =================================================================
     RENDER EXPIRIES
     ================================================================= */
  function renderOrEmpty(arr) {
    if (Array.isArray(arr) && arr.length) renderCarousel(arr);
    else expiryView.innerHTML = '<p class="text-muted small">No Expiries Found</p>';
  }

  function renderCarousel(expiries) {
    expiryView.innerHTML = "";
    expiries.forEach(exp => {
      const dte = dteStr(parseDate(exp));
      expiryView.insertAdjacentHTML("beforeend", `
        <div class="expiry_button flex-shrink-0" style="min-width:85px;">
          <button class="expiry-btn btn btn-outline-primary btn-sm w-100"
                  value="${exp}" style="font-size:10px;">${exp}</button>
          <small class="text-muted d-block text-center" style="font-size:8px;">
            ${dte}
          </small>
        </div>
      `);
    });
    initNav();
  }

  /* =================================================================
     EXPIRY HELPERS
     ================================================================= */
  const monthNum = {JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11};
  function parseDate(ddMMMYY) {
    const [dd, mon, yy] = ddMMMYY.split("-");
    return new Date(2000 + +yy, monthNum[mon.toUpperCase()], +dd);
  }
  function dteStr(d) {
    if (!(d instanceof Date) || isNaN(d)) return "(???)";
    const diff = Math.ceil((d - Date.now()) / 864e5);
    if (diff <= 0) return "(Expired)";
    if (diff === 1) return "(1 day)";
    if (diff < 30)  return `(${diff} days)`;
    const m = Math.floor(diff / 30), d2 = diff % 30;
    return d2 ? `(${m}m ${d2}d)` : `(${m} month${m>1?"s":""})`;
  }

  /* =================================================================
     CAROUSEL NAVIGATION
     ================================================================= */
  let scrollPos = 0; const step = 300;
  function initNav() {
    const prev = document.getElementById("expiryPrevBtn");
    const next = document.getElementById("expiryNextBtn");
    prev.onclick = () => scroll("prev"); next.onclick = () => scroll("next");
    updateBtns();
  }
  function scroll(dir) {
    const cont = expiryView.parentElement;
    const max  = expiryView.scrollWidth - cont.clientWidth;
    scrollPos  = Math.max(0, Math.min(max, scrollPos + (dir==="next"?step:-step)));
    expiryView.style.transform = `translateX(-${scrollPos}px)`; updateBtns();
  }
  function updateBtns() {
    const prev = document.getElementById("expiryPrevBtn");
    const next = document.getElementById("expiryNextBtn");
    const cont = expiryView.parentElement;
    const max  = expiryView.scrollWidth - cont.clientWidth;
    prev.disabled = scrollPos <= 0;   next.disabled = scrollPos >= max;
    prev.style.opacity = prev.disabled ? ".5" : "1";
    next.style.opacity = next.disabled ? ".5" : "1";
  }
  function resetScroll() { scrollPos = 0; expiryView.style.transform = "translateX(0)"; }

  /* =================================================================
     INITIALISE DEFAULT INDEX (if any)
     ================================================================= */
  // Force reset indexSelect to default "Select Index" value
  if (indexSelect) {
    indexSelect.value = "";
    console.log('Reset indexSelect to default: Select Index');
  }
  
  // Don't auto-initialize if value is empty (Select Index)
  if (indexSelect?.value && indexSelect.value.trim() !== '') {
    fetchExpiryForIndex(indexSelect.value);
  }

  /* =================================================================
     EXPIRY SELECTION (delegation + display update)
     ================================================================= */
  expiryView?.addEventListener("click", e => {
    if (!e.target.classList.contains("expiry-btn")) return;

    document.querySelectorAll(".expiry-btn").forEach(b =>
      b.classList.replace("btn-primary", "btn-outline-primary"));
    e.target.classList.replace("btn-outline-primary", "btn-primary");

    window.tradingState = window.tradingState || {};
    window.tradingState.selectedExpiry = e.target.value;

    document.getElementById("optionChainHeaders")?.style.setProperty("display", "");
    document.getElementById("noExpiryMessage")?.style.setProperty("display", "none");

    if (typeof showAlert === "function")
      showAlert(`Expiry ${e.target.value} selected`, "success");

    // Store expiry in trading state and start option chain updates
    if (window.tradingState) {
      window.tradingState.currentExpiry = e.target.value;
      
      // Start WebSocket for option chain updates if we have both symbol and expiry
      if (window.webSocketHandler && window.webSocketHandler.currentSymbol) {
        console.log(`Starting WebSocket for symbol: ${window.webSocketHandler.currentSymbol}, expiry: ${e.target.value}`);
        window.webSocketHandler.startLiveData(window.webSocketHandler.currentSymbol, e.target.value);
      }
    }

    // === ✅ Update display dynamically ===
    const selectedIndex   = indexSelect.value;
    const selectedExch    = exchangeSel.value;
    const selectedSymbol  = extraSelect.value;
    const selectedExpiry  = e.target.value;

    let displayText = "";

    if (selectedIndex) {
  const bseIndices = ["SENSEX", "BANKEX"];
  const exchangeLabel = bseIndices.includes(selectedIndex) ? "BSE" : "NSE";
  displayText = `${exchangeLabel} | ${selectedIndex} | ${selectedExpiry}`;
}
 else if (selectedExch && selectedSymbol) {
      displayText = `${selectedExch} | ${selectedSymbol} | ${selectedExpiry}`;
    } else {
      displayText = `Select Expiry`;
    }

    // Update the symbol display with the selected expiry
    updateSymbolDisplayWithExpiry(selectedExpiry);

    // Commented out to remove the details display in option chain header
    // const displayDiv = document.getElementById("selectedDetailsDisplay");
    // if (displayDiv) displayDiv.innerText = displayText;
  });

  /* =================================================================
     SYMBOL AND LOT SIZE LOOKUP
     ================================================================= */
  function lookupSymbolAndLotSize(type, symbol, exchange) {
    if (!symbol) return;
    
    let url = `/lookup_symbol_and_lot_size?type=${encodeURIComponent(type)}&symbol=${encodeURIComponent(symbol)}`;
    if (exchange) {
      url += `&exchange=${encodeURIComponent(exchange)}`;
    }
    
    fetch(url)
      .then(okJSON)
      .then(data => {
        if (data.found) {
          // Update option chain header with symbol code and lot size
          updateOptionChainHeader(data.symbol_code, data.lot_size);
          // Update current position card with lot size
          updateCurrentPositionLotSize(data.lot_size);
          
          // Store in global state for other components
          window.tradingState = window.tradingState || {};
          window.tradingState.currentSymbol = data.symbol_code;
          window.tradingState.currentLotSize = data.lot_size;
          
          console.log(`Symbol lookup: ${data.symbol_code}, Lot Size: ${data.lot_size}`);
          
          // Clear existing option chain table when symbol changes
          const tableBody = document.querySelector('#optionChainTable tbody');
          if (tableBody) {
            tableBody.innerHTML = '';
            console.log('🗑️ Cleared option chain table for new symbol');
          }
          
          // Start spot price updates immediately after symbol lookup
          if (window.webSocketHandler) {
            window.webSocketHandler.startLiveData(data.symbol_code);
            
            // If there's already an expiry selected, refresh the option chain with new symbol
            if (window.tradingState && window.tradingState.currentExpiry) {
              console.log(`🔄 Refreshing option chain for new symbol: ${data.symbol_code} with existing expiry: ${window.tradingState.currentExpiry}`);
              window.webSocketHandler.startLiveData(data.symbol_code, window.tradingState.currentExpiry);
            }
          }
        } else {
          console.warn("Symbol lookup failed:", data.error);
        }
      })
      .catch(err => {
        console.error("Error looking up symbol:", err);
      });
  }
  
  function updateOptionChainHeader(symbolCode, lotSize, expiry = null) {
    // Update the existing fyersSymbolText element
    const fyersSymbolText = document.getElementById('fyersSymbolText');
    if (fyersSymbolText) {
      // Include expiry in the display format if available
      if (expiry) {
        fyersSymbolText.textContent = `${symbolCode} | ${expiry} | Lot: ${lotSize}`;
      } else {
        fyersSymbolText.textContent = `${symbolCode} | Lot: ${lotSize}`;
      }
      console.log('Updated fyersSymbolText:', fyersSymbolText.textContent);
    } else {
      console.warn('fyersSymbolText element not found');
    }
    
    // Update the existing fyersSymbolDisplay element styling
    const fyersSymbolDisplay = document.getElementById('fyersSymbolDisplay');
    if (fyersSymbolDisplay) {
      // Force all styling properties
      fyersSymbolDisplay.style.setProperty('display', 'inline-block', 'important');
      fyersSymbolDisplay.style.setProperty('visibility', 'visible', 'important');
      fyersSymbolDisplay.style.setProperty('color', '#ffffff', 'important');
      fyersSymbolDisplay.style.setProperty('font-size', '10px', 'important');
      fyersSymbolDisplay.style.setProperty('font-weight', '700', 'important');
      fyersSymbolDisplay.style.setProperty('background', 'rgba(0, 123, 255, 0.9)', 'important');
      fyersSymbolDisplay.style.setProperty('padding', '6px 12px', 'important');
      fyersSymbolDisplay.style.setProperty('border-radius', '5px', 'important');
      fyersSymbolDisplay.style.setProperty('margin-left', '15px', 'important');
      fyersSymbolDisplay.style.setProperty('border', '2px solid rgba(0, 123, 255, 1)', 'important');
      fyersSymbolDisplay.style.setProperty('box-shadow', '0 3px 6px rgba(0,0,0,0.4)', 'important');
      fyersSymbolDisplay.style.setProperty('opacity', '1', 'important');
      fyersSymbolDisplay.style.setProperty('z-index', '1000', 'important');
      
      console.log('Applied enhanced styling with !important to fyersSymbolDisplay');
      console.log('Element display:', fyersSymbolDisplay.style.display);
      console.log('Element visibility:', fyersSymbolDisplay.style.visibility);
      console.log('Element text content:', fyersSymbolDisplay.textContent);
    } else {
      console.warn('fyersSymbolDisplay element not found');
    }
  }
  
  function updateCurrentPositionLotSize(lotSize) {
    // Update the current position card with actual lot size
    const lotSizeElements = document.querySelectorAll('.lot-size-display');
    if (lotSizeElements.length > 0) {
      lotSizeElements.forEach(element => {
        element.textContent = lotSize;
        console.log('Updated lot size display element:', element.textContent);
      });
    } else {
      console.warn('No lot-size-display elements found');
    }
    
    // Direct search for lot size elements anywhere in the document
    const allLotSizeTexts = document.querySelectorAll('.lot-size-text');
    if (allLotSizeTexts.length > 0) {
      allLotSizeTexts.forEach(element => {
        element.innerHTML = `Lot Size: <span class="lot-size-display">${lotSize}</span>`;
        console.log('Updated lot size text element:', element.innerHTML);
      });
    } else {
      console.warn('No .lot-size-text elements found, searching for any text containing "Lot Size"');
      // Search all text nodes for "Lot Size:"
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.includes('Lot Size:')) {
          const oldText = node.textContent;
          node.textContent = node.textContent.replace(/Lot Size:\s*\d+/, `Lot Size: ${lotSize}`);
          console.log('Updated text node from:', oldText, 'to:', node.textContent);
        }
      }
    }
    
    // Also update any hardcoded "Lot Size: 75" text
    const currentPosCard = document.body; // Search entire document
    
    if (currentPosCard) {
      const lotSizeText = currentPosCard.querySelector('.lot-size-text');
      if (lotSizeText) {
        lotSizeText.textContent = `Lot Size: ${lotSize}`;
        console.log('Updated lot size text:', lotSizeText.textContent);
      } else {
        // Find and replace any hardcoded lot size text
        const textNodes = getTextNodes(currentPosCard);
        textNodes.forEach(node => {
          if (node.textContent.includes('Lot Size:')) {
            const oldText = node.textContent;
            node.textContent = node.textContent.replace(/Lot Size:\s*\d+/, `Lot Size: ${lotSize}`);
            console.log('Updated text node from:', oldText, 'to:', node.textContent);
          }
        });
      }
    } else {
      console.warn('Current position card not found');
    }
  }
  
  function getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    return textNodes;
  }

  /* =================================================================
     UTILITIES
     ================================================================= */
  function okJSON(r){ if(!r.ok) throw Error(`HTTP ${r.status}`); return r.json(); }
  function handleErr(err,label){
    if(err.name==="AbortError") return;
    console.error(`Error fetching ${label}:`,err);
    expiryView.innerHTML = `<p class="text-danger small">Error loading ${label}</p>`;
  }
  function clearExpiry(){ expiryView.innerHTML = ""; }
  function abort(c){ try{c?.abort();}catch{} }

  // Function to update the symbol display with expiry when expiry is selected
  function updateSymbolDisplayWithExpiry(selectedExpiry) {
    const fyersSymbolText = document.getElementById('fyersSymbolText');
    if (fyersSymbolText && fyersSymbolText.textContent) {
      const currentText = fyersSymbolText.textContent;
      
      // Extract the symbol code and lot size from current display
      const parts = currentText.split(' | ');
      if (parts.length >= 2) {
        const symbolCode = parts[0];
        const lotPart = parts[parts.length - 1]; // Should be "Lot: XX"
        
        // Create new display format with expiry
        const newText = `${symbolCode} | ${selectedExpiry} | ${lotPart}`;
        fyersSymbolText.textContent = newText;
        console.log('Updated symbol display with expiry:', newText);
      }
    }
  }

  // Function to update WebSocket subscriptions with new symbols
  async function updateWebSocketSubscriptions(optionChainData) {
    if (!optionChainData || !optionChainData.data) {
      console.log('No option chain data available for subscription update');
      return;
    }

    try {
      // Extract all symbols from option chain data
      const symbols = [];
      
      // Add spot symbol
      if (optionChainData.data.underlying) {
        symbols.push(optionChainData.data.underlying.symbol);
      }
      
      // Add all option symbols
      optionChainData.data.optionsChain.forEach(strike => {
        if (strike.call_options && strike.call_options.symbol) {
          symbols.push(strike.call_options.symbol);
        }
        if (strike.put_options && strike.put_options.symbol) {
          symbols.push(strike.put_options.symbol);
        }
      });

      console.log(`Updating WebSocket subscriptions for ${symbols.length} symbols`);
      
      // Call backend to update subscriptions
      const response = await fetch('/websocket/update_subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbols: symbols })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✓ Subscription update successful:`, result.message);
      } else {
        const error = await response.json();
        console.error('Subscription update failed:', error.error);
      }
    } catch (error) {
      console.error('Error updating subscriptions:', error);
    }
  }

  // Export for global access
  window.updateWebSocketSubscriptions = updateWebSocketSubscriptions;

  // Initialize section visibility on page load
  updateSectionVisibility();

});
