// -----------------------------
// Module 2: Corporation Communications
// -----------------------------

import { BaseModule } from './base-module';
import { ModuleMetrics, ConsultantDocument } from '../types';
import { CONFIG } from '../config';
import { $ } from '../utils/helpers';

const STAKEHOLDER_POOL = [
  "CEO", "CFO", "CTO", "Legal", "HR", "Marketing", "Sales",
  "External Auditor", "Board Member", "Compliance Officer",
  "Regional Manager", "Department Head", "Project Lead"
];

export class CorporationModule extends BaseModule {
  // State
  private currentDocument: ConsultantDocument | null = null;
  private documentInProgress = false;
  private documentsCompleted = 0;
  private permanentStakeholders: string[] = ["CEO", "CFO", "Legal"];
  private commOfficerCount = 0;
  private documentSpeedMultiplier = 1;
  private hoursWastedTotal = 0;

  // UI Elements
  private documentTitle: HTMLParagraphElement;
  private signatureProgress: HTMLDivElement;
  private documentInfo: HTMLParagraphElement;
  private addStakeholderBtn: HTMLButtonElement;
  private scopeCreepValue: HTMLSpanElement;
  private scopeCreepBar: HTMLDivElement;
  private hoursWasted: HTMLParagraphElement;

  // Callbacks
  private onResourceChange: ((amount: number) => void) | null = null;

  constructor() {
    super("overheadManager", false); // Locked initially

    // Get UI elements
    this.documentTitle = $<HTMLParagraphElement>("documentTitle");
    this.signatureProgress = $<HTMLDivElement>("signatureProgress");
    this.documentInfo = $<HTMLParagraphElement>("documentInfo");
    this.addStakeholderBtn = $<HTMLButtonElement>("addStakeholderBtn");
    this.scopeCreepValue = $<HTMLSpanElement>("scopeCreepValue");
    this.scopeCreepBar = $<HTMLDivElement>("scopeCreepBar");
    this.hoursWasted = $<HTMLParagraphElement>("hoursWasted");
  }

  public init(): void {
    // Event listeners
    this.addStakeholderBtn.addEventListener("click", () => this.addStakeholder());

    // Start first document automatically
    this.currentDocument = this.createNewDocument();
    this.documentInProgress = true;
    this.updateDocumentUI();
    this.processDocument();
  }

  public update(deltaTime: number): void {
    // Corporation uses async processing, not frame updates
  }

  public getMetrics(): ModuleMetrics {
    return {
      name: "Corporation",
      primaryValue: this.hoursWastedTotal,
      label: `Hours wasted: ${this.hoursWastedTotal}`,
    };
  }

  // ----- Document Logic -----

  private createNewDocument(): ConsultantDocument {
    return {
      title: "Best Practices Framework for Best Practices",
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
      const hoursWasted = doc.signatories.length * 40; // 40 hours per stakeholder

      // Show blinking hours wasted message
      this.hoursWasted.textContent = `⚠️ ${hoursWasted} hours wasted! ⚠️`;
      this.hoursWasted.style.display = 'block';
      this.hoursWasted.style.animation = 'blink 1s infinite';

      // Wait a bit before resetting
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Give reward and start new document
      if (this.onResourceChange) {
        this.onResourceChange(1000);
      }
      this.documentsCompleted++;
      this.hoursWastedTotal += hoursWasted; // Track total hours wasted for counter calculation

      // Hide message and start new document
      this.hoursWasted.style.display = 'none';

      this.currentDocument = this.createNewDocument();
      this.documentInProgress = true;
      this.updateDocumentUI();
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

      // Deduct resources
      if (this.onResourceChange) {
        this.onResourceChange(-CONFIG.ADD_STAKEHOLDER_COST);
      }

      this.updateDocumentUI();
    }
  }

  // ----- Public Methods for Upgrades -----

  public purchaseCommOfficer(resources: number): boolean {
    const cost = CONFIG.UPGRADE_COMM_OFFICER_BASE_COST * Math.pow(2, this.commOfficerCount);

    if (resources >= cost) {
      this.commOfficerCount++;
      this.documentSpeedMultiplier *= 2;
      if (this.onResourceChange) {
        this.onResourceChange(-cost);
      }
      return true;
    }
    return false;
  }

  public canPurchaseStakeholder(resources: number): boolean {
    return resources >= CONFIG.ADD_STAKEHOLDER_COST;
  }

  public getCommOfficerCost(): number {
    return CONFIG.UPGRADE_COMM_OFFICER_BASE_COST * Math.pow(2, this.commOfficerCount);
  }

  // ----- Getters -----

  public getHoursWastedTotal(): number {
    return this.hoursWastedTotal;
  }

  public getCommOfficerCount(): number {
    return this.commOfficerCount;
  }

  public getDocumentSpeedMultiplier(): number {
    return this.documentSpeedMultiplier;
  }

  public setOnResourceChange(callback: (amount: number) => void): void {
    this.onResourceChange = callback;
  }
}
