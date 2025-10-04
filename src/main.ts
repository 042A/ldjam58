// -----------------------------
// Reply All - The Game
// Main Entry Point (Refactored)
// -----------------------------

import { CONFIG } from './config';
import { $ } from './utils/helpers';
import { clamp } from './utils/helpers';
import { DebugManager } from './utils/debug';
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
  progressBar: $<HTMLDivElement>("progressBar"),
  progressText: $<HTMLParagraphElement>("progressText"),
  upgradeAutoMailBtn: $<HTMLButtonElement>("upgradeAutoMailBtn"),
  upgradeFasterAutoMailBtn: $<HTMLButtonElement>("upgradeFasterAutoMailBtn"),
  upgradeInstantSyncBtn: $<HTMLButtonElement>("upgradeInstantSyncBtn"),
  upgradeIncreaseMailboxBtn: $<HTMLButtonElement>("upgradeIncreaseMailboxBtn"),
  upgradeDoubleMailboxBtn: $<HTMLButtonElement>("upgradeDoubleMailboxBtn"),
  upgradeStakeholderBtn: $<HTMLButtonElement>("upgradeStakeholderBtn"),
  upgradeDoubleCorporationBtn: $<HTMLButtonElement>("upgradeDoubleCorporationBtn"),
  upgradeCommOfficerBtn: $<HTMLButtonElement>("upgradeCommOfficerBtn"),
  upgradeWorldMailBtn: $<HTMLButtonElement>("upgradeWorldMailBtn"),
  upgradeWorldContactBtn: $<HTMLButtonElement>("upgradeWorldContactBtn"),
  ctx: $<HTMLCanvasElement>("counterChart"),
  moduleStatsBody: $<HTMLTableSectionElement>("moduleStatsBody"),
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

  // Show win module and hide all other modules
  if (!gameState.isWinModuleShown() && overhead >= CONFIG.WIN_THRESHOLD) {
    gameState.setWinModuleShown(true);
    const winModule = document.getElementById("module-win");
    if (winModule) {
      winModule.classList.remove("locked");
      console.log("You win!");

      // Hide all modules and top bar
      const mailbox = document.getElementById("mailbox");
      const corporation = document.getElementById("overheadManager");
      const world = document.getElementById("world");
      const counterModule = document.getElementById("counterModule");
      const upgrades = document.getElementById("upgrades");
      const progressModule = document.getElementById("progressModule");
      const topBar = document.querySelector(".top-bar") as HTMLElement;

      if (mailbox) mailbox.style.display = 'none';
      if (corporation) corporation.style.display = 'none';
      if (world) world.style.display = 'none';
      if (counterModule) counterModule.style.display = 'none';
      if (upgrades) upgrades.style.display = 'none';
      if (progressModule) progressModule.style.display = 'none';
      if (topBar) topBar.style.display = 'none';
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
    // Level 3: 2M -> 100B
    const rangeSize = CONFIG.WIN_THRESHOLD - CONFIG.MODULE_3_THRESHOLD;
    const progress = total - CONFIG.MODULE_3_THRESHOLD;
    percent = (progress / rangeSize) * 100;
    levelText = `Level 3: ${Math.floor(total).toLocaleString()} / 100B`;
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

  return mailboxMetrics.primaryValue + corporationMetrics.primaryValue + worldMetrics.primaryValue;
}

// -----------------------------
// Module Stats Table Rendering
// -----------------------------
function renderModuleStats(): void {
  const mailboxMetrics = mailboxModule.getMetrics();
  const corporationMetrics = corporationModule.getMetrics();
  const worldMetrics = worldModule.getMetrics();

  const allMetrics = [mailboxMetrics, corporationMetrics, worldMetrics];

  UI.moduleStatsBody.innerHTML = allMetrics.map(metrics => {
    const opm = metrics.opm !== undefined ? Math.floor(metrics.opm).toLocaleString() : '0';
    const mult = metrics.multiplier !== undefined ? `${metrics.multiplier}x` : '1x';
    const totalHours = Math.floor(metrics.primaryValue).toLocaleString();

    return `
      <tr style="border-bottom: 1px solid #444;">
        <td style="padding: 8px;">${metrics.name}</td>
        <td style="text-align: right; padding: 8px;">${totalHours}</td>
        <td style="text-align: right; padding: 8px;">${opm}</td>
        <td style="text-align: right; padding: 8px;">${mult}</td>
      </tr>
    `;
  }).join('');
}

// -----------------------------
// UI Rendering
// -----------------------------
function renderUI(): number {
  const outputValue = computeOutputValue();
  gameState.setOutputValue(outputValue);

  UI.totalEl.textContent = `Total overhead: ${Math.floor(outputValue)}h | Money: $${Math.floor(gameState.getMoney())}`;
  updateProgress(outputValue);
  renderModuleStats();

  // Check for module unlocks
  checkModuleUnlocks(outputValue);

  // Show/hide modules based on overhead thresholds (only if game not won)
  if (!gameState.isWinModuleShown()) {
    const upgradesModule = document.getElementById("upgrades");
    const progressModule = document.getElementById("progressModule");
    const counterModule = document.getElementById("counterModule");

    if (upgradesModule && outputValue >= CONFIG.UPGRADES_MODULE_THRESHOLD) {
      upgradesModule.style.display = '';
    }
    if (progressModule && outputValue >= CONFIG.PROGRESS_MODULE_THRESHOLD) {
      progressModule.style.display = '';
    }
    if (counterModule && outputValue >= CONFIG.COUNTER_MODULE_THRESHOLD) {
      counterModule.style.display = '';
    }
  }

  // Show/hide upgrades based on overhead thresholds
  const autoMailRow = document.getElementById("upgradeAutoMailRow");
  const fasterAutoMailRow = document.getElementById("upgradeFasterAutoMailRow");
  const instantSyncRow = document.getElementById("upgradeInstantSyncRow");
  const doubleMailboxRow = document.getElementById("upgradeDoubleMailboxRow");
  const increaseMailboxRow = document.getElementById("upgradeIncreaseMailboxRow");

  if (autoMailRow) {
    autoMailRow.style.display = outputValue >= CONFIG.UPGRADE_AUTO_MAIL_THRESHOLD ? '' : 'none';
  }
  if (fasterAutoMailRow) {
    fasterAutoMailRow.style.display = outputValue >= CONFIG.UPGRADE_FASTER_AUTO_MAIL_THRESHOLD ? '' : 'none';
  }
  if (instantSyncRow) {
    instantSyncRow.style.display = outputValue >= CONFIG.UPGRADE_INSTANT_SYNC_THRESHOLD ? '' : 'none';
  }
  if (doubleMailboxRow) {
    doubleMailboxRow.style.display = outputValue >= CONFIG.UPGRADE_DOUBLE_MAILBOX_THRESHOLD ? '' : 'none';
  }
  if (increaseMailboxRow) {
    increaseMailboxRow.style.display = outputValue >= CONFIG.UPGRADE_INCREASE_MAILBOX_THRESHOLD ? '' : 'none';
  }

  // Update auto-mail upgrade button
  if (mailboxModule.isAutoMailPurchased()) {
    UI.upgradeAutoMailBtn.textContent = "Intern: Active";
    UI.upgradeAutoMailBtn.disabled = true;
  } else {
    UI.upgradeAutoMailBtn.textContent = `Intern ad ($${CONFIG.UPGRADE_AUTO_MAIL_COST})`;
    UI.upgradeAutoMailBtn.disabled = gameState.getMoney() < CONFIG.UPGRADE_AUTO_MAIL_COST;
  }

  // Update faster auto-mail upgrade button
  if (mailboxModule.isFasterAutoMailPurchased()) {
    UI.upgradeFasterAutoMailBtn.textContent = "No breaks: Active";
    UI.upgradeFasterAutoMailBtn.disabled = true;
  } else {
    UI.upgradeFasterAutoMailBtn.textContent = `No breaks for intern ($${CONFIG.UPGRADE_FASTER_AUTO_MAIL_COST})`;
    UI.upgradeFasterAutoMailBtn.disabled = gameState.getMoney() < CONFIG.UPGRADE_FASTER_AUTO_MAIL_COST;
  }

  // Update instant-sync upgrade button
  if (mailboxModule.isInstantSyncPurchased()) {
    UI.upgradeInstantSyncBtn.textContent = "Instant Sync: Active";
    UI.upgradeInstantSyncBtn.disabled = true;
  } else {
    UI.upgradeInstantSyncBtn.textContent = `Instant Sync ($${CONFIG.UPGRADE_INSTANT_SYNC_COST})`;
    UI.upgradeInstantSyncBtn.disabled = gameState.getMoney() < CONFIG.UPGRADE_INSTANT_SYNC_COST;
  }

  // Update increase mailbox upgrade button
  if (mailboxModule.isIncreaseMailboxPurchased()) {
    UI.upgradeIncreaseMailboxBtn.textContent = "Mailbox Size: 10 Emails";
    UI.upgradeIncreaseMailboxBtn.disabled = true;
  } else {
    UI.upgradeIncreaseMailboxBtn.textContent = `Increase Mailbox to 10 Emails ($${CONFIG.UPGRADE_INCREASE_MAILBOX_COST})`;
    UI.upgradeIncreaseMailboxBtn.disabled = gameState.getMoney() < CONFIG.UPGRADE_INCREASE_MAILBOX_COST;
  }

  // Update double mailbox upgrade button
  const doubleMailboxCost = mailboxModule.getDoubleMailboxCost();
  const doubleMailboxCount = mailboxModule.getDoubleMailboxCount();
  UI.upgradeDoubleMailboxBtn.textContent = `Double Mailbox Output ($${doubleMailboxCost}) [${doubleMailboxCount}x]`;
  UI.upgradeDoubleMailboxBtn.disabled = gameState.getMoney() < doubleMailboxCost;

  // Update stakeholder upgrade button
  UI.upgradeStakeholderBtn.textContent = `Add Stakeholder ($${CONFIG.ADD_STAKEHOLDER_COST})`;
  UI.upgradeStakeholderBtn.disabled = gameState.getMoney() < CONFIG.ADD_STAKEHOLDER_COST;

  // Update double corporation upgrade button
  const doubleCorporationCost = corporationModule.getDoubleCorporationCost();
  const doubleCorporationCount = corporationModule.getDoubleCorporationCount();
  UI.upgradeDoubleCorporationBtn.textContent = `Double Corporation Output ($${doubleCorporationCost}) [${doubleCorporationCount}x]`;
  UI.upgradeDoubleCorporationBtn.disabled = gameState.getMoney() < doubleCorporationCost;

  // Update communication officer upgrade button
  const commOfficerCost = corporationModule.getCommOfficerCost();
  UI.upgradeCommOfficerBtn.textContent = `Hire Comm Officer ($${commOfficerCost}) [${corporationModule.getCommOfficerCount()}x, ${corporationModule.getDocumentSpeedMultiplier()}x speed]`;
  UI.upgradeCommOfficerBtn.disabled = gameState.getMoney() < commOfficerCost;

  // Update world upgrades
  const worldMailCost = worldModule.getWorldMailCost();
  const worldContactCost = worldModule.getWorldContactCost();
  UI.upgradeWorldMailBtn.textContent = `+1 Mail/sec ($${worldMailCost.toLocaleString()}) [${worldModule.getWorldMailCount()}]`;
  UI.upgradeWorldMailBtn.disabled = gameState.getMoney() < worldMailCost;
  UI.upgradeWorldContactBtn.textContent = `+1 Contact/person ($${worldContactCost.toLocaleString()}) [${worldModule.getWorldContactCount()}]`;
  UI.upgradeWorldContactBtn.disabled = gameState.getMoney() < worldContactCost;

  return outputValue;
}

// -----------------------------
// Upgrade Actions
// -----------------------------
function tryUpgradeAutoMail(): void {
  if (mailboxModule.purchaseAutoMail(gameState.getMoney())) {
    renderUI();
  } else {
    alert("Not enough money!");
  }
}

function tryUpgradeFasterAutoMail(): void {
  if (mailboxModule.purchaseFasterAutoMail(gameState.getMoney())) {
    renderUI();
  } else {
    alert("Not enough money!");
  }
}

function tryUpgradeInstantSync(): void {
  if (mailboxModule.purchaseInstantSync(gameState.getMoney())) {
    renderUI();
  } else {
    alert("Not enough money!");
  }
}

function tryUpgradeIncreaseMailbox(): void {
  if (mailboxModule.purchaseIncreaseMailbox(gameState.getMoney())) {
    renderUI();
  } else {
    alert("Not enough money!");
  }
}

function tryUpgradeDoubleMailbox(): void {
  if (mailboxModule.purchaseDoubleMailbox(gameState.getMoney())) {
    renderUI();
  } else {
    alert("Not enough money!");
  }
}

function tryUpgradeStakeholder(): void {
  if (corporationModule.purchaseStakeholder(gameState.getMoney())) {
    renderUI();
  } else {
    alert("Not enough money!");
  }
}

function tryUpgradeDoubleCorporation(): void {
  if (corporationModule.purchaseDoubleCorporation(gameState.getMoney())) {
    renderUI();
  } else {
    alert("Not enough money!");
  }
}

function tryUpgradeCommOfficer(): void {
  if (corporationModule.purchaseCommOfficer(gameState.getMoney())) {
    renderUI();
  } else {
    alert("Not enough money!");
  }
}

function tryUpgradeWorldMail(): void {
  if (worldModule.purchaseWorldMail(gameState.getMoney())) {
    renderUI();
  } else {
    alert("Not enough money!");
  }
}

function tryUpgradeWorldContact(): void {
  if (worldModule.purchaseWorldContact(gameState.getMoney())) {
    renderUI();
  } else {
    alert("Not enough money!");
  }
}

// -----------------------------
// Debug System Setup
// -----------------------------
debugManager.onBoostMoney(() => {
  gameState.addMoney(9_999_999_999_999);
  renderUI();
});

debugManager.onToggle((enabled) => {
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

// -----------------------------
// Add Overhead Button
// -----------------------------
const addOverheadBtn = document.getElementById("addOverheadBtn");
if (addOverheadBtn) {
  addOverheadBtn.addEventListener("click", () => {
    mailboxModule.addOverhead(20000000000);
    renderUI();
  });
}

// -----------------------------
// Event Listeners
// -----------------------------
UI.upgradeAutoMailBtn.addEventListener("click", tryUpgradeAutoMail);
UI.upgradeFasterAutoMailBtn.addEventListener("click", tryUpgradeFasterAutoMail);
UI.upgradeInstantSyncBtn.addEventListener("click", tryUpgradeInstantSync);
UI.upgradeIncreaseMailboxBtn.addEventListener("click", tryUpgradeIncreaseMailbox);
UI.upgradeDoubleMailboxBtn.addEventListener("click", tryUpgradeDoubleMailbox);
UI.upgradeStakeholderBtn.addEventListener("click", tryUpgradeStakeholder);
UI.upgradeDoubleCorporationBtn.addEventListener("click", tryUpgradeDoubleCorporation);
UI.upgradeCommOfficerBtn.addEventListener("click", tryUpgradeCommOfficer);
UI.upgradeWorldMailBtn.addEventListener("click", tryUpgradeWorldMail);
UI.upgradeWorldContactBtn.addEventListener("click", tryUpgradeWorldContact);

// Wire up module money callbacks
mailboxModule.setOnMoneyChange((amount) => gameState.addMoney(amount));
corporationModule.setOnMoneyChange((amount) => gameState.addMoney(amount));
worldModule.setOnMoneyChange((amount) => gameState.addMoney(amount));

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
