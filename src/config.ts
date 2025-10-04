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
  CHART_INTERVAL_MS: 10000,
  CHART_MAX_POINTS: 30,

  // Visual effects
  OVERLAY_MS: 4000,
  BLINK_MS: 3000,

  // Economy
  STARTING_MONEY: 0,

  // Mailbox (Module 1)
  MAIL_TOTAL: 5,
  MAIL_TOTAL_UPGRADED: 10,
  MAIL_SYNC_SECONDS: 2,
  AUTO_MAIL_CHECK_DELAY_MS: 50,

  // Upgrades - Module 1
  UPGRADE_AUTO_MAIL_COST: 1000,
  UPGRADE_INSTANT_SYNC_COST: 2000,
  UPGRADE_FASTER_AUTO_MAIL_COST: 1500,
  UPGRADE_DOUBLE_MAILBOX_BASE_COST: 500,
  UPGRADE_INCREASE_MAILBOX_COST: 1000,

  // Upgrade visibility thresholds (based on total overhead)
  UPGRADE_AUTO_MAIL_THRESHOLD: 200,
  UPGRADE_INSTANT_SYNC_THRESHOLD: 500,
  UPGRADE_FASTER_AUTO_MAIL_THRESHOLD: 1000,
  UPGRADE_DOUBLE_MAILBOX_THRESHOLD: 2000,
  UPGRADE_INCREASE_MAILBOX_THRESHOLD: 10000,

  // Upgrades - Module 2 (Corporation)
  ADD_STAKEHOLDER_COST: 5000,
  UPGRADE_COMM_OFFICER_BASE_COST: 500,
  UPGRADE_DOUBLE_CORPORATION_BASE_COST: 1000,

  // Upgrades - Global
  UPGRADE_STEP_COST: 500,

  // Corporation document (Module 2)
  DOCUMENT_SIGNATURE_DELAY_MS: 200,
  SCOPE_CREEP_INCREMENT: 5,
  SCOPE_CREEP_MAX: 100,

  // Module unlock thresholds
  MODULE_2_THRESHOLD: 200_000, // Corporation unlocks at 200k overhead
  MODULE_3_THRESHOLD: 2_000_000, // World unlocks at 2M overhead
  WIN_THRESHOLD: 10_000_000_000_000, // Win at 10 trillion

  // Counter multipliers (for overhead calculation)
  MAIL_HANDLED_MULTIPLIER: 50,
  TOTAL_EMAILS_MULTIPLIER: 1000000,

  // Legacy (will be removed)
  MAX_TOTAL: 100_000,
} as const;
