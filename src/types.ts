// -----------------------------
// TypeScript Type Definitions
// -----------------------------

export interface Mail {
  subject: string;
  sender: string;
}

export interface ConsultantDocument {
  title: string;
  version: string;
  signatories: string[];
  currentSignatureIndex: number;
  totalRevisions: number;
  scopeCreep: number; // 0-100 meter
}

export interface ModuleMetrics {
  name: string;
  primaryValue: number;
  label: string;
  opm?: number; // Overhead per minute
  multiplier?: number; // Current multiplier
}

export interface GameState {
  // Legacy counter system (to be removed)
  counters: any[];
  outputValue: number;
  money: number;
  lastChartTotal: number;
  stepMultiplier: number;

  // Module 1: Mailbox
  mailHandled: number;
  mailSyncing: boolean;
  autoMailPurchased: boolean;
  autoMailRunning: boolean;
  instantSyncPurchased: boolean;
  selectAllPurchased: boolean;

  // Module 2: Corporation
  currentDocument: ConsultantDocument | null;
  documentInProgress: boolean;
  documentsCompleted: number;
  permanentStakeholders: string[];
  commOfficerCount: number;
  documentSpeedMultiplier: number;
  hoursWastedTotal: number;

  // Module unlock state
  module2Unlocked: boolean;
  module3Unlocked: boolean;
  winModuleShown: boolean;
}
