// -----------------------------
// Imports
// -----------------------------
import mailsData from './mails.json';

// -----------------------------
// Types
// -----------------------------
interface Mail {
  subject: string;
  sender: string;
}

interface ConsultantDocument {
  title: string;
  version: string;
  signatories: string[];
  currentSignatureIndex: number;
  totalRevisions: number;
  scopeCreep: number; // 0-100 meter
}

// -----------------------------
// Config
// -----------------------------
const CONFIG = {
  MAX_TOTAL: 100_000,
  COUNTER_TICK_MS: 10,
  UI_UPDATE_MS: 100,
  CHART_INTERVAL_MS: 600,
  CHART_MAX_POINTS: 30,
  OVERLAY_MS: 4000,
  BLINK_MS: 3000,
  COUNTER_FLUCTUATION_PCT: 0.2, // ±20%
  COUNTER_BASE_STEP: 1,
  STARTING_RESOURCES: 10_000,
  COUNTER_COST: 100,
  MAIL_TOTAL: 5,
  MAIL_SYNC_SECONDS: 10,
  UPGRADE_STEP_COST: 500,
  UPGRADE_AUTO_MAIL_COST: 1000,
  AUTO_MAIL_CHECK_DELAY_MS: 100,
  UPGRADE_INSTANT_SYNC_COST: 2000,
  UPGRADE_SELECT_ALL_COST: 750,
  // Consultant document config
  DOCUMENT_SIGNATURE_DELAY_MS: 400, // Fast signatures
  ADD_STAKEHOLDER_COST: 50, // Lower cost to encourage adding
  SCOPE_CREEP_INCREMENT: 5, // How much scope creep increases per cycle
  SCOPE_CREEP_MAX: 100, // Max scope creep before something happens
  UPGRADE_COMM_OFFICER_BASE_COST: 500, // Starting cost for communication officer
};

// -----------------------------
// DOM Helpers & Refs
// -----------------------------
function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: #${id}`);
  return el as T;
}

const UI = {
    moduleEl: document.getElementById("counterModule") as HTMLDivElement,
    ctx: document.getElementById("counterChart") as HTMLCanvasElement,
    totalEl: document.getElementById("total") as HTMLHeadingElement,
    buyBtn: document.getElementById("addBtn") as HTMLButtonElement,
    countersContainer: document.getElementById("counters") as HTMLDivElement,
    progressBar: document.getElementById("progressBar") as HTMLDivElement,
    progressText: document.getElementById("progressText") as HTMLParagraphElement,
    // Mailbox elements
    mailboxContainer: document.getElementById("mailboxContainer") as HTMLDivElement,
    mailSelectAllActionBtn: document.getElementById("mailSelectAllActionBtn") as HTMLButtonElement,
    mailSelectBtn: document.getElementById("mailSelectBtn") as HTMLButtonElement,
    mailReplyBtn: document.getElementById("mailReplyBtn") as HTMLButtonElement,
    mailSyncBtn: document.getElementById("mailSyncBtn") as HTMLButtonElement,
    // Upgrade elements
    upgradeStepBtn: document.getElementById("upgradeStepBtn") as HTMLButtonElement,
    upgradeSelectAllBtn: document.getElementById("upgradeSelectAllBtn") as HTMLButtonElement,
    upgradeAutoMailBtn: document.getElementById("upgradeAutoMailBtn") as HTMLButtonElement,
    upgradeInstantSyncBtn: document.getElementById("upgradeInstantSyncBtn") as HTMLButtonElement,
    upgradeCommOfficerBtn: document.getElementById("upgradeCommOfficerBtn") as HTMLButtonElement,
    // Overhead Manager elements
    documentTitle: document.getElementById("documentTitle") as HTMLParagraphElement,
    signatureProgress: document.getElementById("signatureProgress") as HTMLDivElement,
    documentInfo: document.getElementById("documentInfo") as HTMLParagraphElement,
    addStakeholderBtn: document.getElementById("addStakeholderBtn") as HTMLButtonElement,
    scopeCreepMeter: document.getElementById("scopeCreepMeter") as HTMLDivElement,
    scopeCreepValue: document.getElementById("scopeCreepValue") as HTMLSpanElement,
    scopeCreepBar: document.getElementById("scopeCreepBar") as HTMLDivElement,
    hoursWasted: document.getElementById("hoursWasted") as HTMLParagraphElement,
};

// -----------------------------
// Utilities
// -----------------------------
function hhmm(date = new Date()): string {
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// -----------------------------
// Chart (delta per interval)
// -----------------------------
const counterChart = new Chart(UI.ctx, {
  type: "line",
  data: {
    labels: [] as string[],
    datasets: [
      {
        label: "Delta per interval",
        data: [] as number[],
        borderColor: "blue",
        fill: false,
      },
    ],
  },
  options: {
    animation: false,
    responsive: true,
    scales: {
      x: { title: { display: true, text: "Time (hh:mm)" } },
      y: { title: { display: true, text: "Delta" } },
    },
  },
});

// -----------------------------
// Counter
// -----------------------------
class Counter {
  private value = 0;
  private intervalId: number | null = null;

  constructor(
    private container: HTMLElement,
    private step = CONFIG.COUNTER_BASE_STEP,
    private fluctuationPct = CONFIG.COUNTER_FLUCTUATION_PCT,
    private tickMs = CONFIG.COUNTER_TICK_MS
  ) {
    this.scoreEl = document.createElement("p");
    this.scoreEl.textContent = "0";
    this.container.appendChild(this.scoreEl);
    this.start();
  }

  private scoreEl: HTMLParagraphElement;

  private increment() {
    // multiplier in [1 - p, 1 + p]
    const p = this.fluctuationPct;
    const mult = 1 + (Math.random() * 2 * p - p);
    this.value += this.step * mult;
    this.scoreEl.textContent = Math.round(this.value).toString();
  }

  private start() {
    if (this.intervalId === null) {
      this.intervalId = window.setInterval(() => this.increment(), this.tickMs);
    }
  }

  public getValue(): number {
    return this.value;
  }

  public updateStep(newStep: number): void {
    this.step = newStep;
  }
}

// -----------------------------
// State
// -----------------------------
const State = {
  counters: [] as Counter[],
  outputValue: 0,        // Total production value (from counters)
  resources: CONFIG.STARTING_RESOURCES,  // Separate resource pool for buying
  lastChartTotal: 0,
  mailHandled: 0,        // Track number of mails handled
  mailSyncing: false,    // Track if mailbox is syncing
  stepMultiplier: 1,     // Multiplier for counter step (doubles with upgrades)
  autoMailPurchased: false,  // Has auto-mail upgrade been purchased
  autoMailRunning: false,    // Is auto-mail currently running
  instantSyncPurchased: false, // Has instant-sync upgrade been purchased
  selectAllPurchased: false,   // Has select-all upgrade been purchased
  // Consultant document state
  currentDocument: null as ConsultantDocument | null,
  documentInProgress: false,
  documentsCompleted: 0,
  permanentStakeholders: ["CEO", "CFO", "Legal"] as string[], // Stakeholders that persist across documents
  commOfficerCount: 0,   // Number of communication officers hired
  documentSpeedMultiplier: 1, // Speed multiplier for document processing
};

// -----------------------------
// Progress + Total Rendering
// -----------------------------
function updateProgress(total: number) {
  const percent = clamp((total / CONFIG.MAX_TOTAL) * 100, 0, 100);
  UI.progressBar.style.width = percent + "%";
  UI.progressText.textContent = percent.toFixed(2) + "%";
}

function computeOutputValue(): number {
  return State.counters.reduce((s, c) => s + c.getValue(), 0);
}

function renderUI() {
  const outputValue = computeOutputValue();
  State.outputValue = outputValue;

  UI.totalEl.textContent = `Overhead: ${Math.floor(outputValue)}h | Your budget: $${Math.floor(State.resources)}`;
  updateProgress(outputValue);

  // Update button text with cost
  UI.buyBtn.textContent = `Buy Counter (${CONFIG.COUNTER_COST} resources)`;
  UI.buyBtn.disabled = State.resources < CONFIG.COUNTER_COST;

  // Update upgrade button
  UI.upgradeStepBtn.textContent = `Double Counter Speed (${CONFIG.UPGRADE_STEP_COST} resources) [x${State.stepMultiplier}]`;
  UI.upgradeStepBtn.disabled = State.resources < CONFIG.UPGRADE_STEP_COST;

  // Update select-all upgrade button
  if (State.selectAllPurchased) {
    UI.upgradeSelectAllBtn.textContent = "Select All: Active";
    UI.upgradeSelectAllBtn.disabled = true;
  } else {
    UI.upgradeSelectAllBtn.textContent = `Select All Tool (${CONFIG.UPGRADE_SELECT_ALL_COST} resources)`;
    UI.upgradeSelectAllBtn.disabled = State.resources < CONFIG.UPGRADE_SELECT_ALL_COST;
  }

  // Update auto-mail upgrade button
  if (State.autoMailPurchased) {
    UI.upgradeAutoMailBtn.textContent = "Auto-Mail: Active";
    UI.upgradeAutoMailBtn.disabled = true;
  } else {
    UI.upgradeAutoMailBtn.textContent = `Auto-Mail System (${CONFIG.UPGRADE_AUTO_MAIL_COST} resources)`;
    UI.upgradeAutoMailBtn.disabled = State.resources < CONFIG.UPGRADE_AUTO_MAIL_COST;
  }

  // Update instant-sync upgrade button
  if (State.instantSyncPurchased) {
    UI.upgradeInstantSyncBtn.textContent = "Instant Sync: Active";
    UI.upgradeInstantSyncBtn.disabled = true;
  } else {
    UI.upgradeInstantSyncBtn.textContent = `Instant Sync (${CONFIG.UPGRADE_INSTANT_SYNC_COST} resources)`;
    UI.upgradeInstantSyncBtn.disabled = State.resources < CONFIG.UPGRADE_INSTANT_SYNC_COST;
  }

  // Update communication officer upgrade button
  const commOfficerCost = CONFIG.UPGRADE_COMM_OFFICER_BASE_COST * Math.pow(2, State.commOfficerCount);
  UI.upgradeCommOfficerBtn.textContent = `Hire Comm Officer ($${commOfficerCost}) [${State.commOfficerCount}x, ${State.documentSpeedMultiplier}x speed]`;
  UI.upgradeCommOfficerBtn.disabled = State.resources < commOfficerCost;

  return outputValue;
}


// -----------------------------
// Chart Update (delta)
// -----------------------------
function updateChartDelta(currentTotal: number) {
  const delta = currentTotal - State.lastChartTotal;
  State.lastChartTotal = currentTotal;

  const labels = counterChart.data.labels!;
  const data = counterChart.data.datasets[0].data as number[];

  labels.push(hhmm());
  data.push(delta);

  if (labels.length > CONFIG.CHART_MAX_POINTS) {
    labels.shift();
    data.shift();
  }

  counterChart.update();
}

// -----------------------------
// Module “show” effect
// -----------------------------
function showModule() {
  UI.moduleEl.classList.add("blink", "show-overlay");

  setTimeout(() => {
    UI.moduleEl.classList.remove("show-overlay");
  }, CONFIG.OVERLAY_MS);

  setTimeout(() => {
    UI.moduleEl.classList.remove("blink");
  }, CONFIG.BLINK_MS);
}

// -----------------------------
// Mailbox Logic
// -----------------------------
function getMailCheckboxes(): NodeListOf<HTMLInputElement> {
  return UI.mailboxContainer.querySelectorAll('.mail-checkbox') as NodeListOf<HTMLInputElement>;
}

function updateMailUI() {
  const checkboxes = getMailCheckboxes();
  const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
  const remaining = CONFIG.MAIL_TOTAL - checkedCount;

  if (State.mailSyncing) {
    // During sync, hide everything except sync button
    UI.mailSelectAllActionBtn.style.display = 'none';
    UI.mailSelectBtn.style.display = 'none';
    UI.mailReplyBtn.style.display = 'none';
    UI.mailSyncBtn.style.display = 'block';
  } else if (remaining === 0) {
    // All selected - show Reply All button
    UI.mailSelectAllActionBtn.style.display = 'none';
    UI.mailSelectBtn.style.display = 'none';
    UI.mailReplyBtn.style.display = 'block';
    UI.mailSyncBtn.style.display = 'none';
  } else {
    // Still selecting
    if (State.selectAllPurchased) {
      // Show "Select All" action button
      UI.mailSelectAllActionBtn.style.display = 'block';
      UI.mailSelectBtn.style.display = 'none';
    } else {
      // Show countdown button
      UI.mailSelectBtn.textContent = `Select ${remaining}...`;
      UI.mailSelectBtn.disabled = true;
      UI.mailSelectBtn.style.display = 'block';
      UI.mailSelectAllActionBtn.style.display = 'none';
    }
    UI.mailReplyBtn.style.display = 'none';
    UI.mailSyncBtn.style.display = 'none';
  }
}

function handleMailCheckboxChange() {
  updateMailUI();
}

function handleSelectAllAction() {
  const checkboxes = getMailCheckboxes();
  checkboxes.forEach(cb => cb.checked = true);
  updateMailUI();
}

function handleReplyAll() {
  State.mailHandled += 1;

  // If instant sync is purchased, skip the countdown
  if (State.instantSyncPurchased) {
    resetMailbox();
    return;
  }

  // Normal sync process
  State.mailSyncing = true;

  // Hide all mail items
  const mailItems = UI.mailboxContainer.querySelectorAll('.mail-item') as NodeListOf<HTMLElement>;
  mailItems.forEach(item => item.style.display = 'none');

  // Start countdown
  let countdown = CONFIG.MAIL_SYNC_SECONDS;
  UI.mailSyncBtn.textContent = `Outlook synchronizing. ${countdown}...`;
  UI.mailSyncBtn.style.display = 'block';
  UI.mailReplyBtn.style.display = 'none';
  UI.mailSelectBtn.style.display = 'none';

  const syncInterval = setInterval(() => {
    countdown--;
    UI.mailSyncBtn.textContent = `Outlook synchronizing. ${countdown}...`;

    if (countdown <= 0) {
      clearInterval(syncInterval);
      resetMailbox();
    }
  }, 1000);
}

function resetMailbox() {
  State.mailSyncing = false;

  // Re-render mailbox with new random mails
  renderMailbox();

  // Reset UI
  updateMailUI();

  // If auto-mail is purchased and not already running, trigger it
  if (State.autoMailPurchased && !State.autoMailRunning) {
    setTimeout(() => autoCheckMails(), 500); // Small delay before starting
  }
}

async function autoCheckMails() {
  if (State.mailSyncing || State.autoMailRunning) return;

  State.autoMailRunning = true;
  const checkboxes = getMailCheckboxes();

  if (State.selectAllPurchased) {
    // Select all at once
    await new Promise(resolve => setTimeout(resolve, CONFIG.AUTO_MAIL_CHECK_DELAY_MS));
    checkboxes.forEach(cb => cb.checked = true);
    updateMailUI();
  } else {
    // Check each checkbox one by one with delay
    for (let i = 0; i < checkboxes.length; i++) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.AUTO_MAIL_CHECK_DELAY_MS));
      checkboxes[i].checked = true;
      updateMailUI();
    }
  }

  // After all are checked, wait a bit and click Reply All
  await new Promise(resolve => setTimeout(resolve, CONFIG.AUTO_MAIL_CHECK_DELAY_MS));
  State.autoMailRunning = false;
  handleReplyAll();
}

// -----------------------------
// Actions
// -----------------------------
function tryBuyCounter() {
  if (State.resources >= CONFIG.COUNTER_COST) {
    State.resources -= CONFIG.COUNTER_COST;
    const currentStep = CONFIG.COUNTER_BASE_STEP * State.stepMultiplier;
    State.counters.push(new Counter(UI.countersContainer, currentStep));
    renderUI();
  } else {
    alert("Not enough resources!");
  }
}

function tryUpgradeStep() {
  if (State.resources >= CONFIG.UPGRADE_STEP_COST) {
    State.resources -= CONFIG.UPGRADE_STEP_COST;
    State.stepMultiplier *= 2;

    // Update all existing counters to the new step
    State.counters.forEach(counter => {
      counter.updateStep(CONFIG.COUNTER_BASE_STEP * State.stepMultiplier);
    });

    renderUI();
  } else {
    alert("Not enough resources!");
  }
}

function tryUpgradeAutoMail() {
  if (State.resources >= CONFIG.UPGRADE_AUTO_MAIL_COST) {
    State.resources -= CONFIG.UPGRADE_AUTO_MAIL_COST;
    State.autoMailPurchased = true;
    renderUI();
    // Start auto-mail immediately if mailbox is ready
    if (!State.mailSyncing && !State.autoMailRunning) {
      autoCheckMails();
    }
  } else {
    alert("Not enough resources!");
  }
}

function tryUpgradeInstantSync() {
  if (State.resources >= CONFIG.UPGRADE_INSTANT_SYNC_COST) {
    State.resources -= CONFIG.UPGRADE_INSTANT_SYNC_COST;
    State.instantSyncPurchased = true;
    renderUI();
  } else {
    alert("Not enough resources!");
  }
}

function tryUpgradeSelectAll() {
  if (State.resources >= CONFIG.UPGRADE_SELECT_ALL_COST) {
    State.resources -= CONFIG.UPGRADE_SELECT_ALL_COST;
    State.selectAllPurchased = true;
    renderUI();
  } else {
    alert("Not enough resources!");
  }
}

function tryUpgradeCommOfficer() {
  const cost = CONFIG.UPGRADE_COMM_OFFICER_BASE_COST * Math.pow(2, State.commOfficerCount);

  if (State.resources >= cost) {
    State.resources -= cost;
    State.commOfficerCount++;
    State.documentSpeedMultiplier *= 2;
    renderUI();
  } else {
    alert("Not enough resources!");
  }
}

// -----------------------------
// Events
// -----------------------------
UI.buyBtn.addEventListener("click", tryBuyCounter);
UI.mailSelectAllActionBtn.addEventListener("click", handleSelectAllAction);
UI.mailReplyBtn.addEventListener("click", handleReplyAll);
UI.upgradeStepBtn.addEventListener("click", tryUpgradeStep);
UI.upgradeSelectAllBtn.addEventListener("click", tryUpgradeSelectAll);
UI.upgradeAutoMailBtn.addEventListener("click", tryUpgradeAutoMail);
UI.upgradeInstantSyncBtn.addEventListener("click", tryUpgradeInstantSync);
UI.upgradeCommOfficerBtn.addEventListener("click", tryUpgradeCommOfficer);
UI.addStakeholderBtn.addEventListener("click", addStakeholder);

// Event listeners for mail checkboxes are now added during initialization

// -----------------------------
// Consultant Document Logic
// -----------------------------
const stakeholderPool = [
  "CEO", "CFO", "CTO", "Legal", "HR", "Marketing", "Sales",
  "External Auditor", "Board Member", "Compliance Officer",
  "Regional Manager", "Department Head", "Project Lead"
];

function createNewDocument(): ConsultantDocument {
  return {
    title: "Best Practices Framework for Best Practices",
    version: "v1.2.3",
    signatories: [...State.permanentStakeholders], // Use permanent stakeholders
    currentSignatureIndex: 0,
    totalRevisions: 0,
    scopeCreep: 0
  };
}

function updateDocumentUI() {
  if (!State.currentDocument) {
    return;
  }

  const doc = State.currentDocument;
  UI.documentTitle.textContent = `${doc.title} ${doc.version}`;

  // Create progress bar with signatories
  UI.signatureProgress.innerHTML = doc.signatories.map((name, idx) => {
    const signed = idx < doc.currentSignatureIndex;
    const current = idx === doc.currentSignatureIndex;
    const symbol = signed ? "●" : (current ? "○" : "○");
    const style = signed ? "color: green;" : (current ? "color: orange;" : "color: gray;");
    return `<span style="${style}">${symbol} ${name}</span>`;
  }).join(" → ");

  UI.documentInfo.textContent = `Signatures: ${doc.currentSignatureIndex}/${doc.signatories.length} | Revisions: ${doc.totalRevisions}`;

  // Always show add stakeholder button
  UI.addStakeholderBtn.disabled = State.resources < CONFIG.ADD_STAKEHOLDER_COST;
  UI.addStakeholderBtn.textContent = `Add Stakeholder ($${CONFIG.ADD_STAKEHOLDER_COST})`;

  // Update scope creep meter
  UI.scopeCreepValue.textContent = Math.floor(doc.scopeCreep).toString();
  UI.scopeCreepBar.style.width = `${doc.scopeCreep}%`;
}

async function processDocument() {
  if (!State.currentDocument || !State.documentInProgress) return;

  const doc = State.currentDocument;

  // Calculate delay based on communication officers
  const delay = CONFIG.DOCUMENT_SIGNATURE_DELAY_MS / State.documentSpeedMultiplier;

  // Process each signature quickly
  while (doc.currentSignatureIndex < doc.signatories.length) {
    await new Promise(resolve => setTimeout(resolve, delay));
    doc.currentSignatureIndex++;
    updateDocumentUI();
  }

  // All signatures collected - increase scope creep and reset
  doc.scopeCreep = Math.min(doc.scopeCreep + CONFIG.SCOPE_CREEP_INCREMENT, CONFIG.SCOPE_CREEP_MAX);
  doc.totalRevisions++;
  doc.currentSignatureIndex = 0;

  // Update version number
  const versionParts = doc.version.match(/v(\d+)\.(\d+)\.(\d+)/);
  if (versionParts) {
    const patch = parseInt(versionParts[3]) + 1;
    doc.version = `v${versionParts[1]}.${versionParts[2]}.${patch}`;
  }

  updateDocumentUI();

  // Check if scope creep maxed out
  if (doc.scopeCreep >= CONFIG.SCOPE_CREEP_MAX) {
    // Calculate hours wasted based on stakeholders
    const hoursWasted = doc.signatories.length * 40; // 40 hours per stakeholder

    // Show blinking hours wasted message
    UI.hoursWasted.textContent = `⚠️ ${hoursWasted} hours wasted! ⚠️`;
    UI.hoursWasted.style.display = 'block';
    UI.hoursWasted.style.animation = 'blink 1s infinite';

    // Wait a bit before resetting
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Give reward and start new document
    State.resources += 1000;
    State.documentsCompleted++;
    State.outputValue += hoursWasted; // Add to overhead counter

    // Hide message and start new document
    UI.hoursWasted.style.display = 'none';

    State.currentDocument = createNewDocument();
    State.documentInProgress = true;
    updateDocumentUI();
    processDocument();
  } else {
    // Continue processing
    processDocument();
  }
}

function startDocument() {
  if (State.documentInProgress) return;

  State.currentDocument = createNewDocument();
  State.documentInProgress = true;
  updateDocumentUI();
  processDocument();
}

function addStakeholder() {
  if (!State.currentDocument || !State.documentInProgress) return;
  if (State.resources < CONFIG.ADD_STAKEHOLDER_COST) return;

  State.resources -= CONFIG.ADD_STAKEHOLDER_COST;

  const doc = State.currentDocument;
  const availableStakeholders = stakeholderPool.filter(s => !State.permanentStakeholders.includes(s));

  if (availableStakeholders.length > 0) {
    const newStakeholder = availableStakeholders[Math.floor(Math.random() * availableStakeholders.length)];

    // Add to permanent stakeholders (persists across documents)
    State.permanentStakeholders.push(newStakeholder);

    // Also add to current document
    doc.signatories.push(newStakeholder);

    // Adding stakeholders increases scope creep significantly
    doc.scopeCreep = Math.min(doc.scopeCreep + 10, CONFIG.SCOPE_CREEP_MAX);

    updateDocumentUI();
  }
}

// -----------------------------
// Mail Initialization
// -----------------------------
function getRandomMails(count: number): Mail[] {
  const shuffled = [...mailsData].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function renderMailbox() {
  // Clear existing mails
  UI.mailboxContainer.innerHTML = '';

  // Get random selection of mails
  const selectedMails = getRandomMails(CONFIG.MAIL_TOTAL);

  selectedMails.forEach((mail: Mail) => {
    const mailItem = document.createElement('div');
    mailItem.className = 'mail-item';

    const label = document.createElement('label');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'mail-checkbox';
    checkbox.addEventListener('change', handleMailCheckboxChange);

    const subject = document.createElement('span');
    subject.className = 'mail-subject';
    subject.textContent = mail.subject;

    const sender = document.createElement('span');
    sender.className = 'mail-person';
    sender.textContent = mail.sender;

    label.appendChild(checkbox);
    label.appendChild(subject);
    label.appendChild(sender);
    mailItem.appendChild(label);

    UI.mailboxContainer.appendChild(mailItem);
  });
}

// -----------------------------
// Startup
// -----------------------------
function start() {
  showModule();

  // Initialize mailbox from JSON
  renderMailbox();

  // Initialize mailbox UI
  updateMailUI();

  // Start document automatically
  State.currentDocument = createNewDocument();
  State.documentInProgress = true;
  updateDocumentUI();
  processDocument();

  // initialize with one counter (optional)
  // State.counters.push(new Counter(UI.countersContainer));

  // keep UI fresh
  setInterval(renderUI, CONFIG.UI_UPDATE_MS);

  // chart delta updater
  setInterval(() => {
    const total = renderUI();
    updateChartDelta(total);
  }, CONFIG.CHART_INTERVAL_MS);
}

start();
