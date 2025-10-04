// -----------------------------
// Game Configuration
// -----------------------------

export const CONFIG = {
  // Counter system
  COUNTER_TICK_MS: 10,
  COUNTER_FLUCTUATION_PCT: 0.2, // ±20%
  COUNTER_BASE_STEP: 1,
  COUNTER_COST: 100,

  // UI updates
  UI_UPDATE_MS: 100,
  CHART_INTERVAL_MS: 600,
  CHART_MAX_POINTS: 30,

  // Visual effects
  OVERLAY_MS: 4000,
  BLINK_MS: 3000,

  // Economy
  STARTING_RESOURCES: 10_000,

  // Mailbox (Module 1)
  MAIL_TOTAL: 5,
  MAIL_SYNC_SECONDS: 10,
  AUTO_MAIL_CHECK_DELAY_MS: 100,

  // Upgrades - Module 1
  UPGRADE_SELECT_ALL_COST: 750,
  UPGRADE_AUTO_MAIL_COST: 1000,
  UPGRADE_INSTANT_SYNC_COST: 2000,

  // Upgrades - Module 2 (Corporation)
  ADD_STAKEHOLDER_COST: 5000,
  UPGRADE_COMM_OFFICER_BASE_COST: 500,

  // Upgrades - Global
  UPGRADE_STEP_COST: 500,

  // Corporation document (Module 2)
  DOCUMENT_SIGNATURE_DELAY_MS: 400,
  SCOPE_CREEP_INCREMENT: 5,
  SCOPE_CREEP_MAX: 100,

  // Module unlock thresholds
  MODULE_2_THRESHOLD: 200_000, // Corporation unlocks at 200k overhead
  MODULE_3_THRESHOLD: 2_000_000, // World unlocks at 2M overhead
  WIN_THRESHOLD: 10_000_000_000_000, // Win at 10 trillion

  // Counter multipliers (for overhead calculation)
  MAIL_HANDLED_MULTIPLIER: 10,
  TOTAL_EMAILS_MULTIPLIER: 5,

  // Legacy (will be removed)
  MAX_TOTAL: 100_000,
} as const;
