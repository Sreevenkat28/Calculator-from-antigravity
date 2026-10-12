/**
 * OmniCalc - Smart Calculator & Graphing Suite
 * Complete features:
 * - Real-time live automatic evaluation
 * - Full Scientific Functions (sin, cos, tan, log, ln, x², 1/x, |x|, n!, π, e, Ans)
 * - Switchable DEG / RAD angle modes
 * - Ultra-Fast Quick History Ribbon & Searchable Drawer
 * - Interactive Cartesian X-Y Graphing Engine
 *   - Live multi-function plotting with neon curves
 *   - Parabolas, linear lines, cubics, sine waves, asymptotes
 *   - Pan and zoom (mouse drag, wheel, pinch, HUD buttons)
 *   - Dynamic grid scaling with numerical axis labels
 *   - Cursor tracing with glowing tracer dot and coordinates HUD
 *   - Preset library (Parabola, Linear, Cubic, Sine, Hyperbola, Absolute, Exponential)
 *   - Split View / Calculator / Grapher modes
 */

(() => {
  'use strict';

  // ==========================================================================
  // DOM Elements
  // ==========================================================================

  // Calculator Displays
  const expressionEl = document.getElementById('expressionDisplay');
  const expressionContainer = document.getElementById('expressionContainer');
  const resultEl = document.getElementById('resultDisplay');
  const resultSymbolEl = document.getElementById('resultSymbol');
  const toastEl = document.getElementById('calcToast');

  // Scientific & Modes
  const sciToggleBtn = document.getElementById('sciToggleBtn');
  const scientificPanel = document.getElementById('scientificPanel');
  const angleToggleBtn = document.getElementById('angleToggleBtn');
  const angleToggleText = document.getElementById('angleToggleText');
  const angleModeTag = document.getElementById('angleModeTag');

  // Quick Ribbon
  const quickRibbonItems = document.getElementById('quickRibbonItems');

  // History Drawer
  const historyDrawer = document.getElementById('historyDrawer');
  const historyListEl = document.getElementById('historyList');
  const historyToggleBtn = document.getElementById('historyToggleBtn');
  const historyCountBadge = document.getElementById('historyCountBadge');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const exportHistoryBtn = document.getElementById('exportHistoryBtn');
  const historySearchInput = document.getElementById('historySearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  // Utility Controls
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const copyResultBtn = document.getElementById('copyResultBtn');

  // Graphing DOM Elements
  const canvasWrapper = document.getElementById('canvasWrapper');
  const canvas = document.getElementById('graphCanvas');
  const ctx = canvas.getContext('2d');
  const functionsList = document.getElementById('functionsList');
  const addFunctionBtn = document.getElementById('addFunctionBtn');
  const resetGraphBtn = document.getElementById('resetGraphBtn');
  const homeViewBtn = document.getElementById('homeViewBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const coordBadge = document.getElementById('coordBadge');
  const coordBadgeText = document.getElementById('coordBadgeText');
  const xRangeText = document.getElementById('xRangeText');
  const yRangeText = document.getElementById('yRangeText');
  const statYIntercept = document.getElementById('statYIntercept');
  const viewTabs = document.querySelectorAll('.view-tab');

  // ==========================================================================
  // Application State
  // ==========================================================================

  const state = {
    expression: '0',
    lastResult: '0',
    lastCommittedResult: '0',
    isEvaluated: false,
    history: [],
    soundEnabled: true,
    sciModeOpen: false,
    angleMode: 'DEG',
    searchQuery: '',
    currentView: 'split',
    audioCtx: null
  };

  const graphState = {
    centerX: 0,
    centerY: 0,
    scaleX: 32, // pixels per unit
    scaleY: 32,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    lastCenterX: 0,
    lastCenterY: 0,
    mouseWorldX: 0,
    mouseWorldY: 0,
    isHovering: false,
    colors: ['#06b6d4', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'],
    functions: [
      { id: 1, formula: 'x^2 - 4', color: '#06b6d4', visible: true },
      { id: 2, formula: '2x - 1', color: '#ec4899', visible: true }
    ]
  };

  // ==========================================================================
  // Audio Synthesis
  // ==========================================================================

  function playClickSound(freq = 600, duration = 0.04) {
    if (!state.soundEnabled) return;
    try {
      if (!state.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) state.audioCtx = new AudioContextClass();
      }
      if (state.audioCtx && state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
      }
      if (!state.audioCtx) return;

      const osc = state.audioCtx.createOscillator();
      const gain = state.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.4, state.audioCtx.currentTime + duration);

      gain.gain.setValueAtTime(0.08, state.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(state.audioCtx.destination);

      osc.start();
      osc.stop(state.audioCtx.currentTime + duration);
    } catch {
      // Audio unsupported or autoplay prevented
    }
  }

  // ==========================================================================
  // Core Math Evaluation Engine
  // ==========================================================================

  const OPERATORS = ['+', '−', '×', '÷', '^'];

  window.__calc_fact = function (n) {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n > 170) return Infinity;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
  };

  window.__calc_sin = function (x, mode) {
    const rad = mode === 'DEG' ? (x * Math.PI) / 180 : x;
    const res = Math.sin(rad);
    return Math.abs(res) < 1e-15 ? 0 : res;
  };

  window.__calc_cos = function (x, mode) {
    const rad = mode === 'DEG' ? (x * Math.PI) / 180 : x;
    const res = Math.cos(rad);
    return Math.abs(res) < 1e-15 ? 0 : res;
  };

  window.__calc_tan = function (x, mode) {
    if (mode === 'DEG') {
      const normalized = ((x % 360) + 360) % 360;
      if (normalized === 90 || normalized === 270) return NaN;
    }
    const rad = mode === 'DEG' ? (x * Math.PI) / 180 : x;
    const res = Math.tan(rad);
    return Math.abs(res) < 1e-15 ? 0 : res;
  };

  function evaluateExpression(rawExpr) {
    if (!rawExpr || rawExpr.trim() === '' || rawExpr === '0') {
      return { success: true, value: 0, formatted: '0' };
    }

    let expr = rawExpr.trim();
    expr = expr.replace(/Ans/g, `(${state.lastCommittedResult})`);

    while (expr.length > 0 && ['+', '−', '×', '÷', '^', '.', '√', '(', 's', 'i', 'n', 'c', 'o', 't', 'a', 'l', 'g'].includes(expr.slice(-1))) {
      expr = expr.slice(0, -1).trim();
    }

    if (!expr) return { success: true, value: 0, formatted: '0' };

    let openCount = (expr.match(/\(/g) || []).length;
    let closeCount = (expr.match(/\)/g) || []).length;
    while (openCount > closeCount) {
      expr += ')';
      closeCount++;
    }

    expr = expr.replace(/π/g, `(${Math.PI})`);
    expr = expr.replace(/e(?![0-9a-zA-Z_])/g, `(${Math.E})`);

    expr = expr.replace(/(\d)(\()/g, '$1*(');
    expr = expr.replace(/(\))(\d)/g, '$1*$2');
    expr = expr.replace(/(\))(\()/g, '$1*(');
    expr = expr.replace(/(\d)(√)/g, '$1*√');

    expr = expr.replace(/√\s*(\d+(?:\.\d+)?)/g, 'Math.sqrt($1)');
    expr = expr.replace(/√\s*\(/g, 'Math.sqrt(');
    expr = expr.replace(/(\d+(?:\.\d+)?|\([^)]+\))!/g, '__calc_fact($1)');
    expr = expr.replace(/abs\(/g, 'Math.abs(');

    const modeStr = `'${state.angleMode}'`;
    expr = expr.replace(/sin\(/g, `__calc_sin(`);
    expr = expr.replace(/cos\(/g, `__calc_cos(`);
    expr = expr.replace(/tan\(/g, `__calc_tan(`);
    expr = expr.replace(/__calc_(sin|cos|tan)\(([^)]+)\)/g, `__calc_$1($2, ${modeStr})`);

    expr = expr.replace(/log\(/g, 'Math.log10(');
    expr = expr.replace(/ln\(/g, 'Math.log(');

    expr = expr.replace(/([0-9.]+)\s*([+−\-])\s*([0-9.]+)%/g, (match, base, op, pct) => {
      const standardOp = op === '−' ? '-' : op;
      return `(${base} ${standardOp} (${base} * (${pct} / 100)))`;
    });
    expr = expr.replace(/([0-9.]+)%/g, '($1/100)');

    expr = expr.replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/\^/g, '**');

    if (!/^[0-9+\-*/().\s,Math.sqrt**__calc_fact__sin__cos__tanabslog10DEG RAD'"]+$/.test(expr)) {
      return { success: false, error: 'Invalid Expression' };
    }

    try {
      const result = Function(`"use strict"; return (${expr})`)();

      if (typeof result !== 'number' || !isFinite(result)) {
        if (result === Infinity || result === -Infinity) {
          return { success: false, error: 'Cannot divide by 0' };
        }
        return { success: false, error: 'Error' };
      }

      const sanitizedNum = cleanFloatingPoint(result);
      const formatted = formatNumber(sanitizedNum);

      return { success: true, value: sanitizedNum, formatted };
    } catch {
      return { success: false, error: '...' };
    }
  }

  function cleanFloatingPoint(num) {
    if (Math.abs(num) < 1e-12 && num !== 0) return 0;
    return parseFloat(num.toPrecision(12));
  }

  function formatNumber(num) {
    if (isNaN(num)) return 'Error';
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  // ==========================================================================
  // Display & UI Updates
  // ==========================================================================

  function updateDisplay() {
    expressionEl.textContent = state.expression;
    expressionContainer.scrollLeft = expressionContainer.scrollWidth;

    const evalRes = evaluateExpression(state.expression);
    if (evalRes.success) {
      resultEl.textContent = evalRes.formatted;
      resultEl.classList.remove('error');
      resultSymbolEl.textContent = '=';
      state.lastResult = evalRes.value.toString();
    } else {
      if (evalRes.error === 'Cannot divide by 0') {
        resultEl.textContent = evalRes.error;
        resultEl.classList.add('error');
        resultSymbolEl.textContent = '!';
      } else {
        resultSymbolEl.textContent = '≈';
      }
    }
  }

  function commitCalculation() {
    const evalRes = evaluateExpression(state.expression);
    if (!evalRes.success) {
      showToast(evalRes.error || 'Invalid calculation');
      return;
    }

    const finalValue = evalRes.formatted;
    const historyItem = {
      id: Date.now(),
      expr: state.expression,
      result: finalValue,
      rawResult: evalRes.value.toString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    state.lastCommittedResult = evalRes.value.toString();
    state.history.unshift(historyItem);
    if (state.history.length > 100) state.history.pop();
    saveHistory();
    renderHistory();
    renderQuickRibbon();
    updateHistoryCountBadge();

    resultEl.classList.add('eval-pulse');
    setTimeout(() => resultEl.classList.remove('eval-pulse'), 300);

    state.expression = finalValue.replace(/,/g, '');
    state.isEvaluated = true;
    updateDisplay();
    playClickSound(880, 0.08);
  }

  // ==========================================================================
  // Input Handling
  // ==========================================================================

  function handleNumber(numStr) {
    playClickSound(520);
    if (state.isEvaluated) {
      state.expression = numStr;
      state.isEvaluated = false;
    } else {
      if (state.expression === '0') {
        state.expression = numStr;
      } else {
        state.expression += numStr;
      }
    }
    updateDisplay();
  }

  function handleDecimal() {
    playClickSound(560);
    if (state.isEvaluated) {
      state.expression = '0.';
      state.isEvaluated = false;
      updateDisplay();
      return;
    }

    const tokens = state.expression.split(/[\s+−×÷^()√abs!sincolg]+/);
    const lastToken = tokens[tokens.length - 1];

    if (!lastToken.includes('.')) {
      state.expression += '.';
      updateDisplay();
    }
  }

  function handleOperator(op) {
    playClickSound(640);
    state.isEvaluated = false;

    if (state.expression === '0' && op === '−') {
      state.expression = '−';
      updateDisplay();
      return;
    }

    const lastChar = state.expression.slice(-1);

    if (OPERATORS.includes(lastChar)) {
      state.expression = state.expression.slice(0, -1) + op;
    } else if (lastChar === '.') {
      state.expression = state.expression.slice(0, -1) + op;
    } else {
      state.expression += op;
    }
    updateDisplay();
  }

  function handleParentheses() {
    playClickSound(580);
    if (state.isEvaluated) {
      state.expression = '(';
      state.isEvaluated = false;
      updateDisplay();
      return;
    }

    const lastChar = state.expression.slice(-1);
    const openCount = (state.expression.match(/\(/g) || []).length;
    const closeCount = (state.expression.match(/\)/g) || []).length;

    if (state.expression === '0') {
      state.expression = '(';
    } else if (openCount > closeCount && !OPERATORS.includes(lastChar) && lastChar !== '(') {
      state.expression += ')';
    } else {
      if (/\d|\)|x/.test(lastChar)) {
        state.expression += '×(';
      } else {
        state.expression += '(';
      }
    }
    updateDisplay();
  }

  function handleVariable(v = 'x') {
    playClickSound(600);
    if (state.isEvaluated || state.expression === '0') {
      state.expression = v;
      state.isEvaluated = false;
    } else {
      const lastChar = state.expression.slice(-1);
      if (/\d|\)/.test(lastChar)) {
        state.expression += `×${v}`;
      } else {
        state.expression += v;
      }
    }
    updateDisplay();
  }

  function handlePercent() {
    playClickSound(600);
    const lastChar = state.expression.slice(-1);
    if (/\d|\)/.test(lastChar)) {
      state.expression += '%';
      state.isEvaluated = false;
      updateDisplay();
    }
  }

  function handleSqrt() {
    playClickSound(620);
    if (state.isEvaluated || state.expression === '0') {
      state.expression = '√(';
      state.isEvaluated = false;
    } else {
      const lastChar = state.expression.slice(-1);
      if (/\d|\)/.test(lastChar)) {
        state.expression += '×√(';
      } else {
        state.expression += '√(';
      }
    }
    updateDisplay();
  }

  function handlePower() {
    playClickSound(640);
    const lastChar = state.expression.slice(-1);
    if (/\d|\)|x/.test(lastChar)) {
      state.expression += '^';
      state.isEvaluated = false;
      updateDisplay();
    }
  }

  function handleAns() {
    playClickSound(580);
    if (state.isEvaluated || state.expression === '0') {
      state.expression = 'Ans';
      state.isEvaluated = false;
    } else {
      const lastChar = state.expression.slice(-1);
      if (/\d|\)/.test(lastChar)) {
        state.expression += '×Ans';
      } else {
        state.expression += 'Ans';
      }
    }
    updateDisplay();
  }

  function handleFunction(fnName) {
    playClickSound(600);
    if (state.isEvaluated || state.expression === '0') {
      state.expression = `${fnName}(`;
      state.isEvaluated = false;
    } else {
      const lastChar = state.expression.slice(-1);
      if (/\d|\)/.test(lastChar)) {
        state.expression += `×${fnName}(`;
      } else {
        state.expression += `${fnName}(`;
      }
    }
    updateDisplay();
  }

  function handleConstant(c) {
    playClickSound(580);
    if (state.isEvaluated || state.expression === '0') {
      state.expression = c;
      state.isEvaluated = false;
    } else {
      const lastChar = state.expression.slice(-1);
      if (/\d|\)/.test(lastChar)) {
        state.expression += `×${c}`;
      } else {
        state.expression += c;
      }
    }
    updateDisplay();
  }

  function handleSquare() {
    playClickSound(620);
    const lastChar = state.expression.slice(-1);
    if (/\d|\)|x/.test(lastChar)) {
      state.expression += '^2';
      state.isEvaluated = false;
      updateDisplay();
    }
  }

  function handleReciprocal() {
    playClickSound(620);
    if (state.isEvaluated || state.expression === '0') {
      state.expression = '1/(';
      state.isEvaluated = false;
    } else {
      state.expression = `1/(${state.expression})`;
      state.isEvaluated = false;
    }
    updateDisplay();
  }

  function handleFactorial() {
    playClickSound(640);
    const lastChar = state.expression.slice(-1);
    if (/\d|\)/.test(lastChar)) {
      state.expression += '!';
      state.isEvaluated = false;
      updateDisplay();
    }
  }

  function handleNegate() {
    playClickSound(580);
    if (state.expression === '0') return;

    const regex = /(-?\d+(?:\.\d+)?)$/;
    const match = state.expression.match(regex);

    if (match) {
      const num = match[1];
      const startIndex = match.index;
      let replacement = num.startsWith('-') ? num.slice(1) : `(-${num})`;
      state.expression = state.expression.slice(0, startIndex) + replacement;
      updateDisplay();
    } else if (state.expression.endsWith(')')) {
      state.expression = `-(${state.expression})`;
      updateDisplay();
    }
  }

  function handleBackspace() {
    playClickSound(480);
    if (state.isEvaluated) {
      state.expression = '0';
      state.isEvaluated = false;
    } else {
      if (state.expression.endsWith('Ans')) {
        state.expression = state.expression.slice(0, -3) || '0';
      } else if (state.expression.length > 1) {
        state.expression = state.expression.slice(0, -1);
      } else {
        state.expression = '0';
      }
    }
    updateDisplay();
  }

  function handleClear() {
    playClickSound(420, 0.06);
    state.expression = '0';
    state.isEvaluated = false;
    updateDisplay();
  }

  // ==========================================================================
  // Scientific & Angle Modes
  // ==========================================================================

  function toggleSciMode(force = null) {
    state.sciModeOpen = force !== null ? force : !state.sciModeOpen;
    scientificPanel.classList.toggle('open', state.sciModeOpen);
    sciToggleBtn.classList.toggle('active', state.sciModeOpen);
    localStorage.setItem('omni_calc_sci_open', state.sciModeOpen ? 'true' : 'false');
    playClickSound(650);
  }

  function toggleAngleMode() {
    state.angleMode = state.angleMode === 'DEG' ? 'RAD' : 'DEG';
    angleToggleText.textContent = state.angleMode;
    angleModeTag.textContent = state.angleMode;
    localStorage.setItem('omni_calc_angle_mode', state.angleMode);
    playClickSound(660);
    showToast(`Angle mode: ${state.angleMode}`);
    updateDisplay();
    drawGraph();
  }

  // ==========================================================================
  // Ultra-Fast History Engine
  // ==========================================================================

  function updateHistoryCountBadge() {
    const count = state.history.length;
    historyCountBadge.textContent = count > 99 ? '99+' : count;
    historyCountBadge.classList.add('pulse');
    setTimeout(() => historyCountBadge.classList.remove('pulse'), 250);
  }

  function renderQuickRibbon() {
    if (!state.history.length) {
      quickRibbonItems.innerHTML = `<span class="quick-ribbon-empty">Calculations appear here instantly</span>`;
      return;
    }

    const recent = state.history.slice(0, 3);
    quickRibbonItems.innerHTML = recent.map(item => `
      <div class="quick-chip" data-res="${escapeHtml(item.result.replace(/,/g, ''))}" title="Click to use: ${escapeHtml(item.expr)} = ${escapeHtml(item.result)}">
        <span>${escapeHtml(item.expr)}</span>
        <span class="chip-res">= ${escapeHtml(item.result)}</span>
      </div>
    `).join('');

    quickRibbonItems.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const res = chip.getAttribute('data-res');
        state.expression = res;
        state.isEvaluated = false;
        updateDisplay();
        showToast('Loaded into calculator');
        playClickSound(720);
      });
    });
  }

  function renderHistory() {
    let filtered = state.history;
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filtered = state.history.filter(item =>
        item.expr.toLowerCase().includes(q) || item.result.toLowerCase().includes(q)
      );
    }

    if (!filtered.length) {
      historyListEl.innerHTML = `
        <div class="history-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <p>${state.searchQuery ? 'No matching calculations found' : 'No calculations yet'}</p>
          <span style="font-size:0.75rem; color:var(--text-muted)">Calculations are saved automatically</span>
        </div>
      `;
      return;
    }

    historyListEl.innerHTML = filtered.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="history-item-top">
          <span class="history-item-time">${escapeHtml(item.time)}</span>
          <button class="history-item-delete" data-id="${item.id}" title="Delete this calculation">✕</button>
        </div>
        <div class="history-item-body" data-res="${escapeHtml(item.result.replace(/,/g, ''))}">
          <div class="history-item-expr">${escapeHtml(item.expr)} =</div>
          <div class="history-item-res">${escapeHtml(item.result)}</div>
        </div>
        <div class="history-item-actions">
          <button class="hist-action-btn action-use" data-res="${escapeHtml(item.result.replace(/,/g, ''))}">Use Result</button>
          <button class="hist-action-btn action-expr" data-expr="${escapeHtml(item.expr)}">Reload Expr</button>
          <button class="hist-action-btn action-copy" data-val="${escapeHtml(item.result)}">Copy</button>
        </div>
      </div>
    `).join('');

    historyListEl.querySelectorAll('.history-item-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteHistoryItem(Number(btn.getAttribute('data-id')));
      });
    });

    historyListEl.querySelectorAll('.action-use, .history-item-body').forEach(el => {
      el.addEventListener('click', () => {
        state.expression = el.getAttribute('data-res');
        state.isEvaluated = false;
        updateDisplay();
        toggleHistory(false);
        showToast('Result loaded');
      });
    });

    historyListEl.querySelectorAll('.action-expr').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.expression = btn.getAttribute('data-expr');
        state.isEvaluated = false;
        updateDisplay();
        toggleHistory(false);
        showToast('Expression reloaded');
      });
    });

    historyListEl.querySelectorAll('.action-copy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyText(btn.getAttribute('data-val'));
      });
    });
  }

  function deleteHistoryItem(id) {
    state.history = state.history.filter(item => item.id !== id);
    saveHistory();
    renderHistory();
    renderQuickRibbon();
    updateHistoryCountBadge();
    showToast('Item deleted');
  }

  function exportHistory() {
    if (!state.history.length) {
      showToast('No history to export');
      return;
    }
    const log = state.history.map(item => `[${item.time}] ${item.expr} = ${item.result}`).join('\n');
    copyText(log, 'Full calculation history copied to clipboard!');
  }

  function loadHistory() {
    try {
      const saved = localStorage.getItem('omni_calc_history');
      if (saved) {
        state.history = JSON.parse(saved);
        if (state.history.length > 0) {
          state.lastCommittedResult = state.history[0].result.replace(/,/g, '');
        }
      }
    } catch {
      state.history = [];
    }
    renderHistory();
    renderQuickRibbon();
    updateHistoryCountBadge();
  }

  function saveHistory() {
    try {
      localStorage.setItem('omni_calc_history', JSON.stringify(state.history));
    } catch {
      // Storage quota or disabled
    }
  }

  function toggleHistory(forceOpen = null) {
    const shouldOpen = forceOpen !== null ? forceOpen : !historyDrawer.classList.contains('open');
    historyDrawer.classList.toggle('open', shouldOpen);
    historyToggleBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    if (shouldOpen) {
      setTimeout(() => historySearchInput.focus(), 150);
    }
    playClickSound(640);
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ==========================================================================
  // Clipboard & Toast
  // ==========================================================================

  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, 2000);
  }

  function copyText(text, successMsg = null) {
    if (!text || text === 'Error') return;
    const msg = successMsg || `Copied ${text}!`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(msg)).catch(() => fallbackCopy(text, msg));
    } else {
      fallbackCopy(text, msg);
    }
  }

  function fallbackCopy(text, msg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(msg);
    } catch {
      showToast('Could not copy');
    }
    document.body.removeChild(ta);
  }

  // ==========================================================================
  // Interactive Cartesian Graphing Engine
  // ==========================================================================

  /**
   * Compiles mathematical formula of x into a high-speed JS function
   */
  function compileMathFunction(rawFormula) {
    if (!rawFormula || !rawFormula.trim()) return null;

    let f = rawFormula.trim();

    // Auto-balance brackets
    let openCount = (f.match(/\(/g) || []).length;
    let closeCount = (f.match(/\)/g) || []).length;
    while (openCount > closeCount) {
      f += ')';
      closeCount++;
    }

    // Implicit multiplication with x e.g. 2x -> 2*x, 3x^2 -> 3*(x**2), x(x+1) -> x*(x+1)
    f = f.replace(/(\d)\s*x/gi, '$1*x');
    f = f.replace(/x\s*(\()/gi, 'x*(');
    f = f.replace(/(\))\s*x/gi, ')*x');
    f = f.replace(/(\))\s*(\()/g, ')*(');

    // Constants
    f = f.replace(/π/g, `(${Math.PI})`);
    f = f.replace(/e(?![0-9a-zA-Z_])/g, `(${Math.E})`);

    // Functions
    f = f.replace(/√\s*x/gi, 'Math.sqrt(x)');
    f = f.replace(/√\s*(\d+(?:\.\d+)?)/g, 'Math.sqrt($1)');
    f = f.replace(/√\s*\(/g, 'Math.sqrt(');
    f = f.replace(/abs\(/gi, 'Math.abs(');

    f = f.replace(/sin\(/gi, 'Math.sin(');
    f = f.replace(/cos\(/gi, 'Math.cos(');
    f = f.replace(/tan\(/gi, 'Math.tan(');
    f = f.replace(/log\(/gi, 'Math.log10(');
    f = f.replace(/ln\(/gi, 'Math.log(');

    // Power operator x^2 -> (x)**2
    f = f.replace(/\^/g, '**');

    try {
      const fn = new Function('x', `"use strict"; try { return (${f}); } catch(e) { return NaN; }`);
      // Test compilation with test value
      const testVal = fn(1);
      return fn;
    } catch (e) {
      return null;
    }
  }

  function worldToScreen(wx, wy) {
    const sx = canvas.width / 2 + (wx - graphState.centerX) * graphState.scaleX;
    const sy = canvas.height / 2 - (wy - graphState.centerY) * graphState.scaleY;
    return { x: sx, y: sy };
  }

  function screenToWorld(sx, sy) {
    const wx = graphState.centerX + (sx - canvas.width / 2) / graphState.scaleX;
    const wy = graphState.centerY - (sy - canvas.height / 2) / graphState.scaleY;
    return { x: wx, y: wy };
  }

  function resizeCanvas() {
    const rect = canvasWrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(rect.width, 300);
    const height = Math.max(rect.height, 280);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);

    drawGraph();
  }

  function drawGraph() {
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // Clear Canvas
    const isDark = document.body.getAttribute('data-theme') !== 'light';
    ctx.fillStyle = isDark ? '#07090e' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Compute Visible World Bounds
    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(width, height);
    const minX = topLeft.x;
    const maxX = bottomRight.x;
    const minY = bottomRight.y;
    const maxY = topLeft.y;

    // Update HUD indicator ranges
    xRangeText.textContent = `[${minX.toFixed(1)}, ${maxX.toFixed(1)}]`;
    yRangeText.textContent = `[${minY.toFixed(1)}, ${maxY.toFixed(1)}]`;

    // Dynamic Grid Steps
    const pixelStep = 70;
    const approxUnitsPerStep = pixelStep / graphState.scaleX;
    const magnitude = Math.pow(10, Math.floor(Math.log10(approxUnitsPerStep)));
    const residual = approxUnitsPerStep / magnitude;

    let step = magnitude;
    if (residual >= 5) step = magnitude * 5;
    else if (residual >= 2) step = magnitude * 2;
    else step = magnitude;

    if (step <= 0 || !isFinite(step)) step = 1;

    // 1. Draw Grid Lines
    ctx.lineWidth = 1;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const originScreen = worldToScreen(0, 0);

    // Minor & Major X Grid Lines
    const startX = Math.floor(minX / step) * step;
    for (let wx = startX; wx <= maxX; wx += step) {
      if (Math.abs(wx) < 1e-9) continue; // Draw origin axis later
      const sx = worldToScreen(wx, 0).x;

      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();

      // Number labels
      ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.8)';
      const labelY = Math.min(Math.max(originScreen.y + 4, 10), height - 20);
      ctx.fillText(Number(wx.toPrecision(6)).toString(), sx, labelY);
    }

    // Minor & Major Y Grid Lines
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const startY = Math.floor(minY / step) * step;
    for (let wy = startY; wy <= maxY; wy += step) {
      if (Math.abs(wy) < 1e-9) continue;
      const sy = worldToScreen(0, wy).y;

      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(width, sy);
      ctx.stroke();

      // Number labels
      ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.8)';
      const labelX = Math.min(Math.max(originScreen.x - 6, 36), width - 8);
      ctx.fillText(Number(wy.toPrecision(6)).toString(), labelX, sy);
    }

    // 2. Draw Main Axes (X & Y Axis)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.7)' : 'rgba(2, 132, 199, 0.7)';

    // X Axis
    if (originScreen.y >= 0 && originScreen.y <= height) {
      ctx.beginPath();
      ctx.moveTo(0, originScreen.y);
      ctx.lineTo(width, originScreen.y);
      ctx.stroke();

      // X Label arrow
      ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
      ctx.fillText('X', width - 8, originScreen.y - 10);
    }

    // Y Axis
    if (originScreen.x >= 0 && originScreen.x <= width) {
      ctx.beginPath();
      ctx.moveTo(originScreen.x, 0);
      ctx.lineTo(originScreen.x, height);
      ctx.stroke();

      // Y Label arrow
      ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
      ctx.fillText('Y', originScreen.x + 14, 12);
    }

    // Origin (0,0) mark
    if (originScreen.x >= 0 && originScreen.x <= width && originScreen.y >= 0 && originScreen.y <= height) {
      ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
      ctx.beginPath();
      ctx.arc(originScreen.x, originScreen.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Draw Functions
    let primaryYIntercept = null;

    graphState.functions.forEach((fnObj, idx) => {
      if (!fnObj.visible || !fnObj.formula.trim()) return;

      const compiledFn = compileMathFunction(fnObj.formula);
      if (!compiledFn) return;

      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = fnObj.color;
      ctx.shadowColor = fnObj.color;
      ctx.shadowBlur = isDark ? 8 : 2;

      ctx.beginPath();
      let started = false;
      let prevSy = null;

      // Sample along width in subpixel increments
      const stepPx = 1;
      for (let sx = 0; sx <= width; sx += stepPx) {
        const wx = screenToWorld(sx, 0).x;
        const wy = compiledFn(wx);

        if (typeof wy !== 'number' || isNaN(wy) || !isFinite(wy)) {
          started = false;
          prevSy = null;
          continue;
        }

        const sy = worldToScreen(wx, wy).y;

        // Asymptote check: prevent vertical artifact lines
        if (prevSy !== null && Math.abs(sy - prevSy) > height * 0.7) {
          started = false;
        }

        if (!started) {
          ctx.moveTo(sx, sy);
          started = true;
        } else {
          ctx.lineTo(sx, sy);
        }
        prevSy = sy;
      }
      ctx.stroke();
      ctx.restore();

      // Inspect Y-Intercept for function 1
      if (idx === 0) {
        const y0 = compiledFn(0);
        if (typeof y0 === 'number' && isFinite(y0)) {
          primaryYIntercept = y0;
        }
      }
    });

    // Update Y-Intercept Stat
    if (primaryYIntercept !== null) {
      statYIntercept.textContent = `y-intercept: (0, ${primaryYIntercept.toFixed(2)})`;
    } else {
      statYIntercept.textContent = `y-intercept: None`;
    }

    // 4. Cursor Crosshair & Curve Tracing
    if (graphState.isHovering) {
      drawCursorTracer(width, height, isDark);
    }
  }

  function drawCursorTracer(width, height, isDark) {
    const mouseScr = worldToScreen(graphState.mouseWorldX, graphState.mouseWorldY);

    // Crosshair lines
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.25)';

    ctx.beginPath();
    ctx.moveTo(mouseScr.x, 0);
    ctx.lineTo(mouseScr.x, height);
    ctx.moveTo(0, mouseScr.y);
    ctx.lineTo(width, mouseScr.y);
    ctx.stroke();
    ctx.restore();

    // Trace Curve point on primary function
    const activeFn = graphState.functions.find(f => f.visible && f.formula.trim());
    if (activeFn) {
      const fn = compileMathFunction(activeFn.formula);
      if (fn) {
        const curveY = fn(graphState.mouseWorldX);
        if (typeof curveY === 'number' && isFinite(curveY)) {
          const ptScr = worldToScreen(graphState.mouseWorldX, curveY);

          // Tracer glowing dot
          ctx.save();
          ctx.shadowColor = activeFn.color;
          ctx.shadowBlur = 12;
          ctx.fillStyle = activeFn.color;
          ctx.beginPath();
          ctx.arc(ptScr.x, ptScr.y, 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ptScr.x, ptScr.y, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Update HUD Badge to curve point
          coordBadgeText.textContent = `x: ${graphState.mouseWorldX.toFixed(2)}, y: ${curveY.toFixed(2)}`;
          return;
        }
      }
    }

    // Default badge readout
    coordBadgeText.textContent = `x: ${graphState.mouseWorldX.toFixed(2)}, y: ${graphState.mouseWorldY.toFixed(2)}`;
  }

  // ==========================================================================
  // Graphing Interactions (Pan, Zoom, Tooltips)
  // ==========================================================================

  function setupGraphInteractions() {
    canvas.addEventListener('mousedown', (e) => {
      graphState.isDragging = true;
      graphState.dragStartX = e.clientX;
      graphState.dragStartY = e.clientY;
      graphState.lastCenterX = graphState.centerX;
      graphState.lastCenterY = graphState.centerY;
      canvasWrapper.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      const rect = canvasWrapper.getBoundingClientRect();
      const inBounds = (
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom
      );

      graphState.isHovering = inBounds;

      if (graphState.isDragging) {
        const dx = e.clientX - graphState.dragStartX;
        const dy = e.clientY - graphState.dragStartY;
        graphState.centerX = graphState.lastCenterX - dx / graphState.scaleX;
        graphState.centerY = graphState.lastCenterY + dy / graphState.scaleY;
        drawGraph();
      } else if (inBounds) {
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const world = screenToWorld(sx, sy);
        graphState.mouseWorldX = world.x;
        graphState.mouseWorldY = world.y;
        drawGraph();
      }
    });

    window.addEventListener('mouseup', () => {
      if (graphState.isDragging) {
        graphState.isDragging = false;
        canvasWrapper.style.cursor = 'crosshair';
      }
    });

    canvasWrapper.addEventListener('mouseleave', () => {
      graphState.isHovering = false;
      drawGraph();
    });

    // Touch Support for mobile pan
    let touchStartX = 0, touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        graphState.isDragging = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        graphState.lastCenterX = graphState.centerX;
        graphState.lastCenterY = graphState.centerY;
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (graphState.isDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        graphState.centerX = graphState.lastCenterX - dx / graphState.scaleX;
        graphState.centerY = graphState.lastCenterY + dy / graphState.scaleY;
        drawGraph();
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      graphState.isDragging = false;
    });

    // Mouse Wheel Zoom
    canvasWrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = canvasWrapper.getBoundingClientRect();
      const mouseSx = e.clientX - rect.left;
      const mouseSy = e.clientY - rect.top;

      const beforeWorld = screenToWorld(mouseSx, mouseSy);
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;

      const nextScale = Math.min(Math.max(graphState.scaleX * zoomFactor, 2), 600);
      graphState.scaleX = nextScale;
      graphState.scaleY = nextScale;

      // Keep mouse position locked in world space
      graphState.centerX = beforeWorld.x - (mouseSx - canvas.width / (2 * (window.devicePixelRatio || 1))) / graphState.scaleX;
      graphState.centerY = beforeWorld.y + (mouseSy - canvas.height / (2 * (window.devicePixelRatio || 1))) / graphState.scaleY;

      drawGraph();
    }, { passive: false });

    // Zoom Buttons
    zoomInBtn.addEventListener('click', () => {
      graphState.scaleX = Math.min(graphState.scaleX * 1.3, 600);
      graphState.scaleY = graphState.scaleX;
      drawGraph();
    });

    zoomOutBtn.addEventListener('click', () => {
      graphState.scaleX = Math.max(graphState.scaleX * 0.75, 3);
      graphState.scaleY = graphState.scaleX;
      drawGraph();
    });

    homeViewBtn.addEventListener('click', resetGraphView);
    resetGraphBtn.addEventListener('click', resetGraphView);

    window.addEventListener('resize', () => {
      resizeCanvas();
    });
  }

  function resetGraphView() {
    graphState.centerX = 0;
    graphState.centerY = 0;
    graphState.scaleX = 32;
    graphState.scaleY = 32;
    drawGraph();
    showToast('Graph view reset to (0,0)');
  }

  // ==========================================================================
  // Function Input List & Preset Handlers
  // ==========================================================================

  function renderFunctionInputs() {
    functionsList.innerHTML = graphState.functions.map((fn, idx) => `
      <div class="function-row" data-id="${fn.id}">
        <span class="fn-color-indicator" style="background-color: ${fn.color}"></span>
        <span class="fn-label">f${idx + 1}(x) =</span>
        <input type="text" class="fn-input" value="${escapeHtml(fn.formula)}" placeholder="e.g. x^2 - 4 or 2x + 1">
        <button class="fn-toggle-btn ${fn.visible ? 'active' : ''}" title="${fn.visible ? 'Hide curve' : 'Show curve'}">
          ${fn.visible ? '👁' : 'Ø'}
        </button>
        ${graphState.functions.length > 1 ? `<button class="fn-del-btn" title="Remove curve">✕</button>` : ''}
      </div>
    `).join('');

    functionsList.querySelectorAll('.function-row').forEach(row => {
      const id = Number(row.getAttribute('data-id'));
      const fnObj = graphState.functions.find(f => f.id === id);
      const input = row.querySelector('.fn-input');
      const toggle = row.querySelector('.fn-toggle-btn');
      const del = row.querySelector('.fn-del-btn');

      input.addEventListener('input', (e) => {
        fnObj.formula = e.target.value;
        drawGraph();
      });

      toggle.addEventListener('click', () => {
        fnObj.visible = !fnObj.visible;
        toggle.classList.toggle('active', fnObj.visible);
        toggle.textContent = fnObj.visible ? '👁' : 'Ø';
        drawGraph();
      });

      if (del) {
        del.addEventListener('click', () => {
          graphState.functions = graphState.functions.filter(f => f.id !== id);
          renderFunctionInputs();
          drawGraph();
        });
      }
    });
  }

  function addFunction(defaultFormula = '') {
    if (graphState.functions.length >= 5) {
      showToast('Maximum 5 curves plotted simultaneously');
      return;
    }
    const nextColor = graphState.colors[graphState.functions.length % graphState.colors.length];
    const newFn = {
      id: Date.now(),
      formula: defaultFormula || 'x',
      color: nextColor,
      visible: true
    };
    graphState.functions.push(newFn);
    renderFunctionInputs();
    drawGraph();
  }

  function setupPresetToolbar() {
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const fnFormula = chip.getAttribute('data-fn');
        if (graphState.functions.length > 0) {
          graphState.functions[0].formula = fnFormula;
          graphState.functions[0].visible = true;
        } else {
          addFunction(fnFormula);
        }
        renderFunctionInputs();
        resetGraphView();
        showToast(`Plotted: ${fnFormula}`);
        playClickSound(750);
      });
    });
  }

  // ==========================================================================
  // View Switcher (Calc, Graph, Split)
  // ==========================================================================

  function setView(viewName) {
    state.currentView = viewName;
    document.body.setAttribute('data-view', viewName);

    viewTabs.forEach(tab => {
      const isActive = tab.getAttribute('data-view') === viewName;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    localStorage.setItem('omni_calc_view', viewName);
    setTimeout(() => resizeCanvas(), 50);
  }

  function setupViewSwitcher() {
    viewTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const v = tab.getAttribute('data-view');
        setView(v);
        playClickSound(640);
      });
    });

    const savedView = localStorage.getItem('omni_calc_view') || 'split';
    setView(savedView);
  }

  // ==========================================================================
  // Settings & Theme
  // ==========================================================================

  function initSettings() {
    const savedTheme = localStorage.getItem('omni_calc_theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);

    const savedSound = localStorage.getItem('omni_calc_sound');
    state.soundEnabled = savedSound !== 'false';
    if (!state.soundEnabled) {
      document.body.classList.add('sound-muted');
    }

    const savedSci = localStorage.getItem('omni_calc_sci_open') === 'true';
    if (savedSci) toggleSciMode(true);

    const savedAngle = localStorage.getItem('omni_calc_angle_mode') || 'DEG';
    state.angleMode = savedAngle;
    angleToggleText.textContent = savedAngle;
    angleModeTag.textContent = savedAngle;
  }

  function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'dark';
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', nextTheme);
    localStorage.setItem('omni_calc_theme', nextTheme);
    playClickSound(680);
    drawGraph();
  }

  function toggleSound() {
    state.soundEnabled = !state.soundEnabled;
    document.body.classList.toggle('sound-muted', !state.soundEnabled);
    localStorage.setItem('omni_calc_sound', state.soundEnabled ? 'true' : 'false');
    if (state.soundEnabled) {
      playClickSound(700);
      showToast('Sound enabled');
    } else {
      showToast('Sound muted');
    }
  }

  // ==========================================================================
  // Keyboard Listeners
  // ==========================================================================

  function flashKeyElement(btnEl) {
    if (!btnEl) return;
    btnEl.classList.add('pressed');
    setTimeout(() => btnEl.classList.remove('pressed'), 120);
  }

  function setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      if (document.activeElement === historySearchInput || document.activeElement.classList.contains('fn-input')) {
        if (e.key === 'Escape') {
          document.activeElement.blur();
          toggleHistory(false);
        }
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'c' || e.key === 'C') {
          copyText(resultEl.textContent);
        }
        return;
      }

      let matchedButton = null;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleNumber(e.key);
        matchedButton = document.querySelector(`.key[data-val="${e.key}"]`);
      } else if (e.key === '.') {
        e.preventDefault();
        handleDecimal();
        matchedButton = document.getElementById('key-decimal');
      } else if (e.key === '+' || e.key === '-') {
        e.preventDefault();
        handleOperator(e.key === '-' ? '−' : '+');
        matchedButton = e.key === '+' ? document.getElementById('key-plus') : document.getElementById('key-minus');
      } else if (e.key === '*' || e.key === 'X') {
        e.preventDefault();
        handleOperator('×');
        matchedButton = document.getElementById('key-multiply');
      } else if (e.key === '/') {
        e.preventDefault();
        handleOperator('÷');
        matchedButton = document.getElementById('key-divide');
      } else if (e.key === '^') {
        e.preventDefault();
        handlePower();
        matchedButton = document.getElementById('key-power');
      } else if (e.key === '%') {
        e.preventDefault();
        handlePercent();
        matchedButton = document.getElementById('key-percent');
      } else if (e.key === '(' || e.key === ')') {
        e.preventDefault();
        handleParentheses();
        matchedButton = document.getElementById('key-parentheses');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        commitCalculation();
        matchedButton = document.getElementById('key-equals');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        matchedButton = document.getElementById('key-backspace');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (historyDrawer.classList.contains('open')) {
          toggleHistory(false);
        } else {
          handleClear();
          matchedButton = document.getElementById('key-clear');
        }
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        handleVariable('x');
        matchedButton = document.getElementById('key-var-x');
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSqrt();
        matchedButton = document.getElementById('key-sqrt');
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleAns();
        matchedButton = document.getElementById('key-ans');
      } else if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        toggleHistory();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleSciMode();
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleConstant('π');
      } else if (e.key === '!') {
        e.preventDefault();
        handleFactorial();
      }

      if (matchedButton) flashKeyElement(matchedButton);
    });
  }

  // ==========================================================================
  // Event Bindings
  // ==========================================================================

  function bindEvents() {
    document.querySelectorAll('.key').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const val = btn.dataset.val;

        flashKeyElement(btn);

        switch (action) {
          case 'number': handleNumber(val); break;
          case 'decimal': handleDecimal(); break;
          case 'operator': handleOperator(val); break;
          case 'equals': commitCalculation(); break;
          case 'clear': handleClear(); break;
          case 'backspace': handleBackspace(); break;
          case 'parentheses': handleParentheses(); break;
          case 'percent': handlePercent(); break;
          case 'sqrt': handleSqrt(); break;
          case 'power': handlePower(); break;
          case 'negate': handleNegate(); break;
          case 'ans': handleAns(); break;
          case 'variable': handleVariable(val); break;
          case 'sin':
          case 'cos':
          case 'tan':
          case 'log':
          case 'ln':
          case 'abs': handleFunction(action); break;
          case 'square': handleSquare(); break;
          case 'reciprocal': handleReciprocal(); break;
          case 'factorial': handleFactorial(); break;
          case 'constant': handleConstant(val); break;
          case 'toggle-angle': toggleAngleMode(); break;
        }
      });
    });

    // Top Header
    sciToggleBtn.addEventListener('click', () => toggleSciMode());
    themeToggleBtn.addEventListener('click', toggleTheme);
    soundToggleBtn.addEventListener('click', toggleSound);
    historyToggleBtn.addEventListener('click', () => toggleHistory());
    closeHistoryBtn.addEventListener('click', () => toggleHistory(false));
    clearHistoryBtn.addEventListener('click', () => {
      state.history = [];
      saveHistory();
      renderHistory();
      renderQuickRibbon();
      updateHistoryCountBadge();
      showToast('History cleared');
    });
    exportHistoryBtn.addEventListener('click', exportHistory);

    // History search
    historySearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
      renderHistory();
    });

    clearSearchBtn.addEventListener('click', () => {
      historySearchInput.value = '';
      state.searchQuery = '';
      clearSearchBtn.style.display = 'none';
      renderHistory();
      historySearchInput.focus();
    });

    copyResultBtn.addEventListener('click', () => copyText(resultEl.textContent));

    // Graph Add Function
    addFunctionBtn.addEventListener('click', () => addFunction());

    setupKeyboardListeners();
    setupGraphInteractions();
    setupPresetToolbar();
    setupViewSwitcher();
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  function init() {
    initSettings();
    loadHistory();
    bindEvents();
    renderFunctionInputs();
    updateDisplay();
    setTimeout(() => resizeCanvas(), 100);
  }

  init();
})();
