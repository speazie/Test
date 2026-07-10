(function () {
  'use strict';

  var SAVE_KEY = 'pieClickerSave';
  var TICK_MS = 100;
  var AUTOSAVE_MS = 10000;
  var TOAST_MS = 1500;
  var CLICK_ANIM_MS = 180;
  var FLOAT_GAIN_MS = 800;

  var BUILDINGS = window.PIE_BUILDINGS || [];
  var UPGRADES = window.PIE_UPGRADES || [];
  var ACHIEVEMENTS = window.PIE_ACHIEVEMENTS || [];

  var state = null;
  var lastTickTime = 0;
  var lastAutosaveTime = 0;
  var toastTimeoutId = null;

  var els = {};

  function freshState() {
    var buildings = {};
    for (var i = 0; i < BUILDINGS.length; i++) {
      buildings[BUILDINGS[i].id] = 0;
    }
    return {
      pies: 0,
      totalPiesBaked: 0,
      clickPower: 1,
      buildings: buildings,
      upgradesBought: [],
      achievementsUnlocked: [],
      lastSaveTime: Date.now()
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return freshState();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return freshState();

      var s = freshState();
      if (typeof parsed.pies === 'number' && isFinite(parsed.pies)) s.pies = parsed.pies;
      if (typeof parsed.totalPiesBaked === 'number' && isFinite(parsed.totalPiesBaked)) {
        s.totalPiesBaked = parsed.totalPiesBaked;
      }
      if (typeof parsed.clickPower === 'number' && isFinite(parsed.clickPower)) {
        s.clickPower = parsed.clickPower;
      }
      if (parsed.buildings && typeof parsed.buildings === 'object') {
        for (var id in s.buildings) {
          if (typeof parsed.buildings[id] === 'number' && isFinite(parsed.buildings[id])) {
            s.buildings[id] = Math.max(0, Math.floor(parsed.buildings[id]));
          }
        }
      }
      if (Array.isArray(parsed.upgradesBought)) {
        s.upgradesBought = parsed.upgradesBought.filter(function (id) {
          return typeof id === 'string';
        });
      }
      if (Array.isArray(parsed.achievementsUnlocked)) {
        s.achievementsUnlocked = parsed.achievementsUnlocked.filter(function (id) {
          return typeof id === 'string';
        });
      }
      if (typeof parsed.lastSaveTime === 'number' && isFinite(parsed.lastSaveTime)) {
        s.lastSaveTime = parsed.lastSaveTime;
      }
      return s;
    } catch (e) {
      return freshState();
    }
  }

  function saveState() {
    try {
      state.lastSaveTime = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      /* localStorage unavailable or quota exceeded; ignore */
    }
  }

  function formatNumber(num) {
    if (num == null || isNaN(num)) return '0';
    var sign = num < 0 ? '-' : '';
    num = Math.abs(num);
    if (num < 1000) {
      return sign + (Number.isInteger(num) ? String(num) : num.toFixed(num < 10 ? 2 : 1));
    }
    var suffixes = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
    var tier = Math.floor(Math.log10(num) / 3);
    if (tier >= suffixes.length) tier = suffixes.length - 1;
    var scaled = num / Math.pow(1000, tier);
    var decimals = scaled < 10 ? 2 : (scaled < 100 ? 1 : 0);
    return sign + scaled.toFixed(decimals) + suffixes[tier];
  }

  function buildingById(id) {
    for (var i = 0; i < BUILDINGS.length; i++) {
      if (BUILDINGS[i].id === id) return BUILDINGS[i];
    }
    return null;
  }

  function buildingCost(building) {
    var owned = state.buildings[building.id] || 0;
    return building.baseCost * Math.pow(1.15, owned);
  }

  function isUpgradeUnlocked(upg) {
    if (!upg.requires) return true;
    var owned = state.buildings[upg.requires.buildingId] || 0;
    return owned >= upg.requires.count;
  }

  function isUpgradeBought(upg) {
    return state.upgradesBought.indexOf(upg.id) !== -1;
  }

  function activeUpgrades() {
    var active = [];
    for (var i = 0; i < UPGRADES.length; i++) {
      if (isUpgradeBought(UPGRADES[i])) active.push(UPGRADES[i]);
    }
    return active;
  }

  function buildingMultiplierFor(buildingId, active) {
    var mult = 1;
    for (var i = 0; i < active.length; i++) {
      var eff = active[i].effect;
      if (!eff) continue;
      if (eff.type === 'buildingMultiplier' && eff.target === buildingId) {
        mult *= eff.multiplier;
      } else if (eff.type === 'globalCpsMultiplier') {
        mult *= eff.multiplier;
      }
    }
    return mult;
  }

  function clickMultiplier(active) {
    var mult = 1;
    for (var i = 0; i < active.length; i++) {
      var eff = active[i].effect;
      if (eff && eff.type === 'clickMultiplier') {
        mult *= eff.multiplier;
      }
    }
    return mult;
  }

  function computeCps() {
    var active = activeUpgrades();
    var total = 0;
    for (var i = 0; i < BUILDINGS.length; i++) {
      var b = BUILDINGS[i];
      var owned = state.buildings[b.id] || 0;
      if (owned <= 0) continue;
      total += owned * b.baseCps * buildingMultiplierFor(b.id, active);
    }
    return total;
  }

  function computeClickPower() {
    var active = activeUpgrades();
    return state.clickPower * clickMultiplier(active);
  }

  function cacheDom() {
    els.pieCount = document.getElementById('pie-count');
    els.pps = document.getElementById('pps');
    els.clickPower = document.getElementById('click-power');
    els.bigPie = document.getElementById('big-pie');
    els.buildingsList = document.getElementById('buildings-list');
    els.upgradesList = document.getElementById('upgrades-list');
    els.achievementsList = document.getElementById('achievements-list');
    els.resetBtn = document.getElementById('reset-btn');
    els.saveToast = document.getElementById('save-toast');
    els.clickFxLayer = document.getElementById('click-fx-layer');
  }

  function renderStats() {
    if (els.pieCount) els.pieCount.textContent = formatNumber(state.pies);
    if (els.pps) els.pps.textContent = formatNumber(computeCps());
    if (els.clickPower) els.clickPower.textContent = formatNumber(computeClickPower());
  }

  function renderBuildings() {
    if (!els.buildingsList) return;
    els.buildingsList.innerHTML = '';
    for (var i = 0; i < BUILDINGS.length; i++) {
      var b = BUILDINGS[i];
      var owned = state.buildings[b.id] || 0;
      var cost = buildingCost(b);
      var affordable = state.pies >= cost;

      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'shop-item ' + (affordable ? 'affordable' : 'unaffordable');
      item.setAttribute('data-id', b.id);
      item.setAttribute('data-kind', 'building');
      if (!affordable) item.disabled = true;

      var nameEl = document.createElement('span');
      nameEl.className = 'shop-item-name';
      nameEl.textContent = b.name + ' (' + owned + ')';

      var costEl = document.createElement('span');
      costEl.className = 'shop-item-cost';
      costEl.textContent = formatNumber(cost);

      var descEl = document.createElement('span');
      descEl.className = 'shop-item-desc';
      descEl.textContent = b.desc || '';

      item.appendChild(nameEl);
      item.appendChild(costEl);
      item.appendChild(descEl);
      item.addEventListener('click', (function (buildingId) {
        return function () { buyBuilding(buildingId); };
      })(b.id));

      els.buildingsList.appendChild(item);
    }
  }

  function renderUpgrades() {
    if (!els.upgradesList) return;
    els.upgradesList.innerHTML = '';
    for (var i = 0; i < UPGRADES.length; i++) {
      var u = UPGRADES[i];
      if (isUpgradeBought(u)) continue;
      if (!isUpgradeUnlocked(u)) continue;

      var affordable = state.pies >= u.cost;

      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'shop-item ' + (affordable ? 'affordable' : 'unaffordable');
      item.setAttribute('data-id', u.id);
      item.setAttribute('data-kind', 'upgrade');
      if (!affordable) item.disabled = true;

      var nameEl = document.createElement('span');
      nameEl.className = 'shop-item-name';
      nameEl.textContent = u.name;

      var costEl = document.createElement('span');
      costEl.className = 'shop-item-cost';
      costEl.textContent = formatNumber(u.cost);

      var descEl = document.createElement('span');
      descEl.className = 'shop-item-desc';
      descEl.textContent = u.desc || '';

      item.appendChild(nameEl);
      item.appendChild(costEl);
      item.appendChild(descEl);
      item.addEventListener('click', (function (upgradeId) {
        return function () { buyUpgrade(upgradeId); };
      })(u.id));

      els.upgradesList.appendChild(item);
    }
  }

  function renderAchievements() {
    if (!els.achievementsList) return;
    els.achievementsList.innerHTML = '';
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var a = ACHIEVEMENTS[i];
      var unlocked = state.achievementsUnlocked.indexOf(a.id) !== -1;

      var badge = document.createElement('div');
      badge.className = 'achievement ' + (unlocked ? 'unlocked' : 'locked');
      badge.setAttribute('data-id', a.id);

      var nameEl = document.createElement('span');
      nameEl.className = 'achievement-name';
      nameEl.textContent = a.name;

      var descEl = document.createElement('span');
      descEl.className = 'achievement-desc';
      descEl.textContent = a.desc || '';

      badge.appendChild(nameEl);
      badge.appendChild(descEl);
      els.achievementsList.appendChild(badge);
    }
  }

  function renderAll() {
    renderStats();
    renderBuildings();
    renderUpgrades();
    renderAchievements();
  }

  function buyBuilding(id) {
    var b = buildingById(id);
    if (!b) return;
    var cost = buildingCost(b);
    if (state.pies < cost) return;
    state.pies -= cost;
    state.buildings[id] = (state.buildings[id] || 0) + 1;
    renderAll();
    saveState();
    showSaveToast();
  }

  function buyUpgrade(id) {
    var upg = null;
    for (var i = 0; i < UPGRADES.length; i++) {
      if (UPGRADES[i].id === id) { upg = UPGRADES[i]; break; }
    }
    if (!upg) return;
    if (isUpgradeBought(upg)) return;
    if (!isUpgradeUnlocked(upg)) return;
    if (state.pies < upg.cost) return;
    state.pies -= upg.cost;
    state.upgradesBought.push(upg.id);
    renderAll();
    saveState();
    showSaveToast();
  }

  function spawnFloatGain(amount) {
    if (!els.clickFxLayer) return;
    var el = document.createElement('div');
    el.className = 'float-gain';
    el.textContent = '+' + formatNumber(amount);
    var jitter = (Math.random() * 40) - 20;
    el.style.left = 'calc(50% + ' + jitter + 'px)';
    el.style.top = '30%';
    els.clickFxLayer.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, FLOAT_GAIN_MS);
  }

  function handlePieClick() {
    var gain = computeClickPower();
    state.pies += gain;
    state.totalPiesBaked += gain;

    spawnFloatGain(gain);

    if (els.bigPie) {
      els.bigPie.classList.add('pie-clicked');
      setTimeout(function () {
        els.bigPie.classList.remove('pie-clicked');
      }, CLICK_ANIM_MS);
    }

    renderStats();
    renderBuildings();
    renderUpgrades();
  }

  function checkAchievements() {
    var changed = false;
    var effectiveState = Object.assign({}, state, { clickPower: computeClickPower() });
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var a = ACHIEVEMENTS[i];
      if (state.achievementsUnlocked.indexOf(a.id) !== -1) continue;
      var met = false;
      try {
        met = !!a.condition(effectiveState);
      } catch (e) {
        met = false;
      }
      if (met) {
        state.achievementsUnlocked.push(a.id);
        changed = true;
      }
    }
    if (changed) {
      renderAchievements();
    }
  }

  function showSaveToast() {
    if (!els.saveToast) return;
    els.saveToast.classList.add('show');
    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    toastTimeoutId = setTimeout(function () {
      els.saveToast.classList.remove('show');
    }, TOAST_MS);
  }

  function tick() {
    var now = performance.now();
    var deltaSeconds = (now - lastTickTime) / 1000;
    lastTickTime = now;
    if (deltaSeconds > 0 && deltaSeconds < 60) {
      var gain = computeCps() * deltaSeconds;
      if (gain > 0) {
        state.pies += gain;
        state.totalPiesBaked += gain;
      }
    }

    checkAchievements();
    renderStats();
    renderBuildings();
    renderUpgrades();

    var nowMs = Date.now();
    if (nowMs - lastAutosaveTime >= AUTOSAVE_MS) {
      lastAutosaveTime = nowMs;
      saveState();
      showSaveToast();
    }
  }

  function resetGame() {
    var ok = window.confirm('Reset your Pie Clicker save? This cannot be undone.');
    if (!ok) return;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      /* ignore */
    }
    state = freshState();
    lastTickTime = performance.now();
    lastAutosaveTime = Date.now();
    renderAll();
  }

  function bindEvents() {
    if (els.bigPie) {
      els.bigPie.addEventListener('click', handlePieClick);
    }
    if (els.resetBtn) {
      els.resetBtn.addEventListener('click', resetGame);
    }
  }

  function init() {
    cacheDom();
    state = loadState();
    lastTickTime = performance.now();
    lastAutosaveTime = Date.now();
    bindEvents();
    renderAll();
    setInterval(tick, TICK_MS);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
