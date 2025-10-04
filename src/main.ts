// -----------------------------
// Reply All - The Game
// Main Entry Point (Refactored)
// -----------------------------

import { CONFIG } from './config';
import { $ } from './utils/helpers';
import { clamp } from './utils/helpers';
import { DebugManager } from './utils/debug';
import { Counter } from './systems/counter-system';
import { ChartSystem } from './systems/chart-system';
import { MailboxModule } from './modules/mailbox';
import { CorporationModule } from './modules/corporation';
import { WorldModule } from './world';
import { gameState } from './state';

// -----------------------------
// UI Element References
// -----------------------------
const UI = {
  totalEl: $<HTMLHeadingElement>("total"),
  buyBtn: $<HTMLButtonElement>("addBtn"),
  countersContainer: $<HTMLDivElement>("counters"),
  progressBar: $<HTMLDivElement>("progressBar"),
  progressText: $<HTMLParagraphElement>("progressText"),
  upgradeStepBtn: $<HTMLButtonElement>("upgradeStepBtn"),
  upgradeSelectAllBtn: $<HTMLButtonElement>("upgradeSelectAllBtn"),
  upgradeAutoMailBtn: $<HTMLButtonElement>("upgradeAutoMailBtn"),
  upgradeInstantSyncBtn: $<HTMLButtonElement>("upgradeInstantSyncBtn"),
  upgradeCommOfficerBtn: $<HTMLButtonElement>("upgradeCommOfficerBtn"),
  ctx: $<HTMLCanvasElement>("counterChart"),
};

// -----------------------------
// Game Modules
// -----------------------------
const mailboxModule = new MailboxModule();
const corporationModule = new CorporationModule();
const worldModule = new WorldModule();

// -----------------------------
// Systems
// -----------------------------
const chartSystem = new ChartSystem(UI.ctx);
const debugManager = new DebugManager();

// -----------------------------
// Module Unlock System
// -----------------------------
function checkModuleUnlocks(overhead: number): void {
  // Unlock Module 2 (Corporation)
  if (!gameState.isModule2Unlocked() && overhead >= CONFIG.MODULE_2_THRESHOLD) {
    gameState.setModule2Unlocked(true);
    corporationModule.unlock();
  }

  // Unlock Module 3 (World)
  if (!gameState.isModule3Unlocked() && overhead >= CONFIG.MODULE_3_THRESHOLD) {
    gameState.setModule3Unlocked(true);
    worldModule.unlock();
  }

  // Show win module
  if (!gameState.isWinModuleShown() && overhead >= CONFIG.WIN_THRESHOLD) {
    gameState.setWinModuleShown(true);
    const winModule = document.getElementById("module-win");
    if (winModule) {
      winModule.classList.remove("locked");
      console.log("You win!");
    }
  }
}

// -----------------------------
// Progress Bar (Multi-level)
// -----------------------------
function updateProgress(total: number): void {
  let percent = 0;
  let levelText = "";

  if (total < CONFIG.MODULE_2_THRESHOLD) {
    // Level 1: 0 -> 200k
    percent = (total / CONFIG.MODULE_2_THRESHOLD) * 100;
    levelText = `Level 1: ${Math.floor(total).toLocaleString()} / 200k`;
  } else if (total < CONFIG.MODULE_3_THRESHOLD) {
    // Level 2: 200k -> 2M
    const rangeSize = CONFIG.MODULE_3_THRESHOLD - CONFIG.MODULE_2_THRESHOLD;
    const progress = total - CONFIG.MODULE_2_THRESHOLD;
    percent = (progress / rangeSize) * 100;
    levelText = `Level 2: ${Math.floor(total).toLocaleString()} / 2M`;
  } else {
    // Level 3: 2M -> 10T
    const rangeSize = CONFIG.WIN_THRESHOLD - CONFIG.MODULE_3_THRESHOLD;
    const progress = total - CONFIG.MODULE_3_THRESHOLD;
    percent = (progress / rangeSize) * 100;
    levelText = `Level 3: ${Math.floor(total).toLocaleString()} / 10T`;
  }

  percent = clamp(percent, 0, 100);
  UI.progressBar.style.width = percent + "%";
  UI.progressText.textContent = `${percent.toFixed(2)}% - ${levelText}`;
}

// -----------------------------
// Overhead Calculation
// -----------------------------
function computeOutputValue(): number {
  // Get metrics from all modules
  const mailboxMetrics = mailboxModule.getMetrics();
  const corporationMetrics = corporationModule.getMetrics();
  const worldMetrics = worldModule.getMetrics();

  // Old counter system (will be phased out)
  const oldCounters = gameState.getCounters().reduce((s, c) => s + c.getValue(), 0);

  return mailboxMetrics.primaryValue + corporationMetrics.primaryValue + worldMetrics.primaryValue + oldCounters;
}

// -----------------------------
// UI Rendering
// -----------------------------
function renderUI(): number {
  const outputValue = computeOutputValue();
  gameState.setOutputValue(outputValue);

  UI.totalEl.textContent = `Overhead: ${Math.floor(outputValue)}h | Your budget: $${Math.floor(gameState.getResources())}`;
  updateProgress(outputValue);

  // Check for module unlocks
  checkModuleUnlocks(outputValue);

  // Update button text with cost
  UI.buyBtn.textContent = `Buy Counter (${CONFIG.COUNTER_COST} resources)`;
  UI.buyBtn.disabled = gameState.getResources() < CONFIG.COUNTER_COST;

  // Update upgrade button
  UI.upgradeStepBtn.textContent = `Double Counter Speed (${CONFIG.UPGRADE_STEP_COST} resources) [x${gameState.getStepMultiplier()}]`;
  UI.upgradeStepBtn.disabled = gameState.getResources() < CONFIG.UPGRADE_STEP_COST;

  // Update select-all upgrade button
  if (mailboxModule.isSelectAllPurchased()) {
    UI.upgradeSelectAllBtn.textContent = "Select All: Active";
    UI.upgradeSelectAllBtn.disabled = true;
  } else {
    UI.upgradeSelectAllBtn.textContent = `Select All Tool (${CONFIG.UPGRADE_SELECT_ALL_COST} resources)`;
    UI.upgradeSelectAllBtn.disabled = gameState.getResources() < CONFIG.UPGRADE_SELECT_ALL_COST;
  }

  // Update auto-mail upgrade button
  if (mailboxModule.isAutoMailPurchased()) {
    UI.upgradeAutoMailBtn.textContent = "Auto-Mail: Active";
    UI.upgradeAutoMailBtn.disabled = true;
  } else {
    UI.upgradeAutoMailBtn.textContent = `Auto-Mail System (${CONFIG.UPGRADE_AUTO_MAIL_COST} resources)`;
    UI.upgradeAutoMailBtn.disabled = gameState.getResources() < CONFIG.UPGRADE_AUTO_MAIL_COST;
  }

  // Update instant-sync upgrade button
  if (mailboxModule.isInstantSyncPurchased()) {
    UI.upgradeInstantSyncBtn.textContent = "Instant Sync: Active";
    UI.upgradeInstantSyncBtn.disabled = true;
  } else {
    UI.upgradeInstantSyncBtn.textContent = `Instant Sync (${CONFIG.UPGRADE_INSTANT_SYNC_COST} resources)`;
    UI.upgradeInstantSyncBtn.disabled = gameState.getResources() < CONFIG.UPGRADE_INSTANT_SYNC_COST;
  }

  // Update communication officer upgrade button
  const commOfficerCost = corporationModule.getCommOfficerCost();
  UI.upgradeCommOfficerBtn.textContent = `Hire Comm Officer ($${commOfficerCost}) [${corporationModule.getCommOfficerCount()}x, ${corporationModule.getDocumentSpeedMultiplier()}x speed]`;
  UI.upgradeCommOfficerBtn.disabled = gameState.getResources() < commOfficerCost;

  return outputValue;
}

// -----------------------------
// Upgrade Actions
// -----------------------------
function tryBuyCounter(): void {
  if (gameState.spendResources(CONFIG.COUNTER_COST)) {
    const currentStep = CONFIG.COUNTER_BASE_STEP * gameState.getStepMultiplier();
    gameState.addCounter(new Counter(UI.countersContainer, currentStep));
    renderUI();
  } else {
    alert("Not enough resources!");
  }
}

function tryUpgradeStep(): void {
  if (gameState.spendResources(CONFIG.UPGRADE_STEP_COST)) {
    gameState.doubleStepMultiplier();

    // Update all existing counters to the new step
    gameState.getCounters().forEach(counter => {
      counter.updateStep(CONFIG.COUNTER_BASE_STEP * gameState.getStepMultiplier());
    });

    renderUI();
  } else {
    alert("Not enough resources!");
  }
}

function tryUpgradeSelectAll(): void {
  if (mailboxModule.purchaseSelectAll(gameState.getResources())) {
    renderUI();
  } else {
    alert("Not enough resources!");
  }
}

function tryUpgradeAutoMail(): void {
  if (mailboxModule.purchaseAutoMail(gameState.getResources())) {
    renderUI();
  } else {
    alert("Not enough resources!");
  }
}

function tryUpgradeInstantSync(): void {
  if (mailboxModule.purchaseInstantSync(gameState.getResources())) {
    renderUI();
  } else {
    alert("Not enough resources!");
  }
}

function tryUpgradeCommOfficer(): void {
  if (corporationModule.purchaseCommOfficer(gameState.getResources())) {
    renderUI();
  } else {
    alert("Not enough resources!");
  }
}

// -----------------------------
// Debug System Setup
// -----------------------------
debugManager.onBoostResources(() => {
  gameState.addResources(9_999_999_999_999);
  renderUI();
});

debugManager.onToggle((enabled) => {
  const counterModule = document.getElementById("counterModule");
  if (counterModule) {
    counterModule.style.display = enabled ? "block" : "none";
  }

  if (enabled) {
    console.log("Debug commands available:");
    console.log("- Click Module 2 header to unlock Corporation");
    console.log("- Click Module 3 header to unlock World");

    // Add manual unlock for module 2
    const module2Header = document.querySelector("#overheadManager h4");
    if (module2Header) {
      module2Header.addEventListener("click", () => {
        debugManager.unlockModule("overheadManager");
        gameState.setModule2Unlocked(true);
        corporationModule.unlock();
      });
    }

    // Add manual unlock for module 3
    const module3Header = document.querySelector("#world h4");
    if (module3Header) {
      module3Header.addEventListener("click", () => {
        debugManager.unlockModule("world");
        gameState.setModule3Unlocked(true);
        worldModule.unlock();
      });
    }
  }
});

// Hide counter module by default (only show in debug mode)
const counterModule = document.getElementById("counterModule");
if (counterModule) {
  counterModule.style.display = "none";
}

// -----------------------------
// Event Listeners
// -----------------------------
UI.buyBtn.addEventListener("click", tryBuyCounter);
UI.upgradeStepBtn.addEventListener("click", tryUpgradeStep);
UI.upgradeSelectAllBtn.addEventListener("click", tryUpgradeSelectAll);
UI.upgradeAutoMailBtn.addEventListener("click", tryUpgradeAutoMail);
UI.upgradeInstantSyncBtn.addEventListener("click", tryUpgradeInstantSync);
UI.upgradeCommOfficerBtn.addEventListener("click", tryUpgradeCommOfficer);

// Wire up module resource callbacks
mailboxModule.setOnResourceChange((amount) => gameState.addResources(amount));
corporationModule.setOnResourceChange((amount) => gameState.addResources(amount));

// -----------------------------
// Game Start
// -----------------------------
function start(): void {
  // Initialize all modules
  mailboxModule.init();
  corporationModule.init();
  worldModule.init();

  // Start UI update loop
  setInterval(renderUI, CONFIG.UI_UPDATE_MS);

  // Start chart update loop
  setInterval(() => {
    const total = renderUI();
    chartSystem.updateDelta(total);
  }, CONFIG.CHART_INTERVAL_MS);

  console.log("Reply All - The Game started!");
  console.log("Modules loaded: Mailbox, Corporation (locked), World (locked)");
}

start();
