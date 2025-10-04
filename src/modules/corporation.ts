// -----------------------------
// Module 2: Corporation Communications
// -----------------------------

import { BaseModule } from './base-module';
import { ModuleMetrics, ConsultantDocument } from '../types';
import { CONFIG } from '../config';
import { $ } from '../utils/helpers';
import policiesData from '../policies.json';

const STAKEHOLDER_POOL = [
  "CEO", "CFO", "CTO", "Legal", "HR", "Marketing", "Sales",
  "External Auditor", "Board Member", "Compliance Officer",
  "Regional Manager", "Department Head", "Project Lead"
];

export class CorporationModule extends BaseModule {
  // State
  private isStarted = false;
  private currentDocument: ConsultantDocument | null = null;
  private documentInProgress = false;
  private documentsCompleted = 0;
  private permanentStakeholders: string[] = ["CEO", "CFO", "Legal"];
  private commOfficerCount = 0;
  private documentSpeedMultiplier = 1;
  private doubleCorporationCount = 3;
  private totalOverhead = 0; // Track total overhead directly

  // OPM tracking
  private lastOpmUpdate = Date.now();
  private lastPrimaryValue = 0;
  private currentOpm = 0;

  // UI Elements
  private documentTitle: HTMLParagraphElement;
  private signatureProgress: HTMLDivElement;
  private documentInfo: HTMLParagraphElement;
  private scopeCreepValue: HTMLSpanElement;
  private scopeCreepBar: HTMLDivElement;
  private hoursWasted: HTMLParagraphElement;
  private startCorporationBtn: HTMLButtonElement;
  private documentStatus: HTMLDivElement;

  // Callbacks
  private onMoneyChange: ((amount: number) => void) | null = null;

  constructor() {
    super("overheadManager", false); // Locked initially

    // Get UI elements
    this.documentTitle = $<HTMLParagraphElement>("documentTitle");
    this.signatureProgress = $<HTMLDivElement>("signatureProgress");
    this.documentInfo = $<HTMLParagraphElement>("documentInfo");
    this.scopeCreepValue = $<HTMLSpanElement>("scopeCreepValue");
    this.scopeCreepBar = $<HTMLDivElement>("scopeCreepBar");
    this.hoursWasted = $<HTMLParagraphElement>("hoursWasted");
    this.startCorporationBtn = $<HTMLButtonElement>("startCorporationBtn");
    this.documentStatus = $<HTMLDivElement>("documentStatus");
  }

  public init(): void {
    // Event listeners
    this.startCorporationBtn.addEventListener("click", () => this.startMinigame());
  }

  private startMinigame(): void {
    if (this.isStarted) return;

    this.isStarted = true;
    this.startCorporationBtn.style.display = 'none';
    this.documentStatus.style.display = 'block';

    // Show corporation upgrades
    const stakeholderRow = document.getElementById('upgradeStakeholderRow');
    const doubleCorporationRow = document.getElementById('upgradeDoubleCorporationRow');
    const commOfficerRow = document.getElementById('upgradeCommOfficerRow');
    if (stakeholderRow) stakeholderRow.style.display = 'table-row';
    if (doubleCorporationRow) doubleCorporationRow.style.display = 'table-row';
    if (commOfficerRow) commOfficerRow.style.display = 'table-row';

    // Start first document
    this.currentDocument = this.createNewDocument();
    this.documentInProgress = true;
    this.updateDocumentUI();
    this.processDocument();
  }

  public update(deltaTime: number): void {
    // Corporation uses async processing, not frame updates
  }

  public getMetrics(): ModuleMetrics {
    const multiplier = Math.pow(2, this.doubleCorporationCount);

    // Calculate OPM
    const now = Date.now();
    const deltaMinutes = (now - this.lastOpmUpdate) / 60000;
    if (deltaMinutes >= 0.1) { // Update every 6 seconds
      const deltaValue = this.totalOverhead - this.lastPrimaryValue;
      this.currentOpm = deltaValue / deltaMinutes;
      this.lastOpmUpdate = now;
      this.lastPrimaryValue = this.totalOverhead;
    }

    return {
      name: "Corporation",
      primaryValue: this.totalOverhead,
      label: `Documents completed: ${this.documentsCompleted}`,
      opm: this.currentOpm,
      multiplier: multiplier,
    };
  }

  // ----- Document Logic -----

  private getRandomPolicy(): string {
    const randomIndex = Math.floor(Math.random() * policiesData.length);
    return policiesData[randomIndex].title;
  }

  private createNewDocument(): ConsultantDocument {
    return {
      title: this.getRandomPolicy(),
      version: "v1.2.3",
      signatories: [...this.permanentStakeholders],
      currentSignatureIndex: 0,
      totalRevisions: 0,
      scopeCreep: 0
    };
  }

  private updateDocumentUI(): void {
    if (!this.currentDocument) {
      return;
    }

    const doc = this.currentDocument;
    this.documentTitle.textContent = `${doc.title} ${doc.version}`;

    // Create progress bar with signatories
    this.signatureProgress.innerHTML = doc.signatories.map((name, idx) => {
      const signed = idx < doc.currentSignatureIndex;
      const current = idx === doc.currentSignatureIndex;
      const symbol = signed ? "●" : (current ? "○" : "○");
      const style = signed ? "color: green;" : (current ? "color: orange;" : "color: gray;");
      return `<span style="${style}">${symbol} ${name}</span>`;
    }).join(" → ");

    this.documentInfo.textContent = `Signatures: ${doc.currentSignatureIndex}/${doc.signatories.length} | Revisions: ${doc.totalRevisions}`;

    // Update scope creep meter
    this.scopeCreepValue.textContent = Math.floor(doc.scopeCreep).toString();
    this.scopeCreepBar.style.width = `${doc.scopeCreep}%`;
  }

  private async processDocument(): Promise<void> {
    if (!this.currentDocument || !this.documentInProgress) return;

    const doc = this.currentDocument;

    // Calculate delay based on communication officers
    const delay = CONFIG.DOCUMENT_SIGNATURE_DELAY_MS / this.documentSpeedMultiplier;

    // Process each signature quickly
    while (doc.currentSignatureIndex < doc.signatories.length) {
      await new Promise(resolve => setTimeout(resolve, delay));
      doc.currentSignatureIndex++;
      this.updateDocumentUI();
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

    this.updateDocumentUI();

    // Check if scope creep maxed out
    if (doc.scopeCreep >= CONFIG.SCOPE_CREEP_MAX) {
      // Calculate hours wasted based on stakeholders
      const baseHoursWasted = doc.signatories.length * 100; // 40 hours per stakeholder
      const multiplier = Math.pow(2, this.doubleCorporationCount);
      const hoursWasted = baseHoursWasted * multiplier;

      // Show blinking hours wasted message
      this.hoursWasted.textContent = `⚠️ ${hoursWasted} hours wasted! ⚠️`;
      this.hoursWasted.style.display = 'block';
      this.hoursWasted.style.animation = 'blink 1s infinite';

      // Give reward and add overhead
      if (this.onMoneyChange) {
        this.onMoneyChange(1000);
      }
      this.documentsCompleted++;
      this.totalOverhead += hoursWasted;

      // Start new document immediately (don't wait)
      this.currentDocument = this.createNewDocument();
      this.documentInProgress = true;
      this.updateDocumentUI();

      // Hide message after a delay (but don't block processing)
      setTimeout(() => {
        this.hoursWasted.style.display = 'none';
      }, 2000);

      // Continue processing new document
      this.processDocument();
    } else {
      // Continue processing
      this.processDocument();
    }
  }

  private addStakeholder(): void {
    if (!this.currentDocument || !this.documentInProgress) return;

    const doc = this.currentDocument;
    const availableStakeholders = STAKEHOLDER_POOL.filter(s => !this.permanentStakeholders.includes(s));

    if (availableStakeholders.length > 0) {
      const newStakeholder = availableStakeholders[Math.floor(Math.random() * availableStakeholders.length)];

      // Add to permanent stakeholders (persists across documents)
      this.permanentStakeholders.push(newStakeholder);

      // Also add to current document
      doc.signatories.push(newStakeholder);

      // Adding stakeholders increases scope creep significantly
      doc.scopeCreep = Math.min(doc.scopeCreep + 10, CONFIG.SCOPE_CREEP_MAX);

      // Deduct money
      if (this.onMoneyChange) {
        this.onMoneyChange(-CONFIG.ADD_STAKEHOLDER_COST);
      }

      this.updateDocumentUI();
    }
  }

  // ----- Public Methods for Upgrades -----

  public purchaseStakeholder(money: number): boolean {
    if (!this.isStarted || !this.currentDocument || !this.documentInProgress) return false;

    if (money >= CONFIG.ADD_STAKEHOLDER_COST) {
      const doc = this.currentDocument;
      const availableStakeholders = STAKEHOLDER_POOL.filter(s => !this.permanentStakeholders.includes(s));

      if (availableStakeholders.length > 0) {
        const newStakeholder = availableStakeholders[Math.floor(Math.random() * availableStakeholders.length)];

        // Add to permanent stakeholders (persists across documents)
        this.permanentStakeholders.push(newStakeholder);

        // Also add to current document
        doc.signatories.push(newStakeholder);

        // Adding stakeholders increases scope creep significantly
        doc.scopeCreep = Math.min(doc.scopeCreep + 10, CONFIG.SCOPE_CREEP_MAX);

        // Deduct money
        if (this.onMoneyChange) {
          this.onMoneyChange(-CONFIG.ADD_STAKEHOLDER_COST);
        }

        this.updateDocumentUI();
        return true;
      }
    }
    return false;
  }

  public purchaseDoubleCorporation(money: number): boolean {
    const cost = CONFIG.UPGRADE_DOUBLE_CORPORATION_BASE_COST * Math.pow(2, this.doubleCorporationCount);

    if (money >= cost) {
      this.doubleCorporationCount++;
      if (this.onMoneyChange) {
        this.onMoneyChange(-cost);
      }
      return true;
    }
    return false;
  }

  public purchaseCommOfficer(money: number): boolean {
    const cost = CONFIG.UPGRADE_COMM_OFFICER_BASE_COST * Math.pow(2, this.commOfficerCount);

    if (money >= cost) {
      this.commOfficerCount++;
      this.documentSpeedMultiplier *= 2;
      if (this.onMoneyChange) {
        this.onMoneyChange(-cost);
      }
      return true;
    }
    return false;
  }

  public getCommOfficerCost(): number {
    return CONFIG.UPGRADE_COMM_OFFICER_BASE_COST * Math.pow(2, this.commOfficerCount);
  }

  public getDoubleCorporationCost(): number {
    return CONFIG.UPGRADE_DOUBLE_CORPORATION_BASE_COST * Math.pow(2, this.doubleCorporationCount);
  }

  // ----- Getters -----

  public getDoubleCorporationCount(): number {
    return this.doubleCorporationCount;
  }

  public getCommOfficerCount(): number {
    return this.commOfficerCount;
  }

  public getDocumentSpeedMultiplier(): number {
    return this.documentSpeedMultiplier;
  }

  public setOnMoneyChange(callback: (amount: number) => void): void {
    this.onMoneyChange = callback;
  }
}
