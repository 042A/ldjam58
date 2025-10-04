// -----------------------------
// Module 1: Mailbox
// -----------------------------

import { BaseModule } from './base-module';
import { ModuleMetrics, Mail } from '../types';
import { CONFIG } from '../config';
import { $ } from '../utils/helpers';
import mailsData from '../mails.json';

export class MailboxModule extends BaseModule {
  // State
  private mailHandled = 0;
  private mailSyncing = false;
  private selectAllPurchased = false;
  private autoMailPurchased = false;
  private instantSyncPurchased = false;
  private autoMailRunning = false;

  // UI Elements
  private mailboxContainer: HTMLDivElement;
  private mailSelectAllActionBtn: HTMLButtonElement;
  private mailSelectBtn: HTMLButtonElement;
  private mailReplyBtn: HTMLButtonElement;
  private mailSyncBtn: HTMLButtonElement;

  // Callbacks
  private onResourceChange: ((amount: number) => void) | null = null;

  constructor() {
    super("mailbox", true); // Always unlocked

    // Get UI elements
    this.mailboxContainer = $<HTMLDivElement>("mailboxContainer");
    this.mailSelectAllActionBtn = $<HTMLButtonElement>("mailSelectAllActionBtn");
    this.mailSelectBtn = $<HTMLButtonElement>("mailSelectBtn");
    this.mailReplyBtn = $<HTMLButtonElement>("mailReplyBtn");
    this.mailSyncBtn = $<HTMLButtonElement>("mailSyncBtn");
  }

  public init(): void {
    // Render initial mailbox
    this.renderMailbox();
    this.updateMailUI();

    // Event listeners
    this.mailSelectAllActionBtn.addEventListener("click", () => this.handleSelectAllAction());
    this.mailReplyBtn.addEventListener("click", () => this.handleReplyAll());
  }

  public update(deltaTime: number): void {
    // Mailbox doesn't need frame updates
  }

  public getMetrics(): ModuleMetrics {
    return {
      name: "Mailbox",
      primaryValue: this.mailHandled * CONFIG.MAIL_HANDLED_MULTIPLIER,
      label: `Mails handled: ${this.mailHandled}`,
    };
  }

  // ----- Mailbox Logic -----

  private getMailCheckboxes(): NodeListOf<HTMLInputElement> {
    return this.mailboxContainer.querySelectorAll('.mail-checkbox') as NodeListOf<HTMLInputElement>;
  }

  private updateMailUI(): void {
    const checkboxes = this.getMailCheckboxes();
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const remaining = CONFIG.MAIL_TOTAL - checkedCount;

    if (this.mailSyncing) {
      // During sync, hide everything except sync button
      this.mailSelectAllActionBtn.style.display = 'none';
      this.mailSelectBtn.style.display = 'none';
      this.mailReplyBtn.style.display = 'none';
      this.mailSyncBtn.style.display = 'block';
    } else if (remaining === 0) {
      // All selected - show Reply All button
      this.mailSelectAllActionBtn.style.display = 'none';
      this.mailSelectBtn.style.display = 'none';
      this.mailReplyBtn.style.display = 'block';
      this.mailSyncBtn.style.display = 'none';
    } else {
      // Still selecting
      if (this.selectAllPurchased) {
        // Show "Select All" action button
        this.mailSelectAllActionBtn.style.display = 'block';
        this.mailSelectBtn.style.display = 'none';
      } else {
        // Show countdown button
        this.mailSelectBtn.textContent = `Select ${remaining}...`;
        this.mailSelectBtn.disabled = true;
        this.mailSelectBtn.style.display = 'block';
        this.mailSelectAllActionBtn.style.display = 'none';
      }
      this.mailReplyBtn.style.display = 'none';
      this.mailSyncBtn.style.display = 'none';
    }
  }

  private handleMailCheckboxChange(): void {
    this.updateMailUI();
  }

  private handleSelectAllAction(): void {
    const checkboxes = this.getMailCheckboxes();
    checkboxes.forEach(cb => cb.checked = true);
    this.updateMailUI();
  }

  private handleReplyAll(): void {
    this.mailHandled += 1;

    // If instant sync is purchased, skip the countdown
    if (this.instantSyncPurchased) {
      this.resetMailbox();
      return;
    }

    // Normal sync process
    this.mailSyncing = true;

    // Hide all mail items
    const mailItems = this.mailboxContainer.querySelectorAll('.mail-item') as NodeListOf<HTMLElement>;
    mailItems.forEach(item => item.style.display = 'none');

    // Start countdown
    let countdown = CONFIG.MAIL_SYNC_SECONDS;
    this.mailSyncBtn.textContent = `Outlook synchronizing. ${countdown}...`;
    this.mailSyncBtn.style.display = 'block';
    this.mailReplyBtn.style.display = 'none';
    this.mailSelectBtn.style.display = 'none';

    const syncInterval = setInterval(() => {
      countdown--;
      this.mailSyncBtn.textContent = `Outlook synchronizing. ${countdown}...`;

      if (countdown <= 0) {
        clearInterval(syncInterval);
        this.resetMailbox();
      }
    }, 1000);
  }

  private resetMailbox(): void {
    this.mailSyncing = false;

    // Re-render mailbox with new random mails
    this.renderMailbox();

    // Reset UI
    this.updateMailUI();

    // If auto-mail is purchased and not already running, trigger it
    if (this.autoMailPurchased && !this.autoMailRunning) {
      setTimeout(() => this.autoCheckMails(), 500); // Small delay before starting
    }
  }

  private async autoCheckMails(): Promise<void> {
    if (this.mailSyncing || this.autoMailRunning) return;

    this.autoMailRunning = true;
    const checkboxes = this.getMailCheckboxes();

    if (this.selectAllPurchased) {
      // Select all at once
      await new Promise(resolve => setTimeout(resolve, CONFIG.AUTO_MAIL_CHECK_DELAY_MS));
      checkboxes.forEach(cb => cb.checked = true);
      this.updateMailUI();
    } else {
      // Check each checkbox one by one with delay
      for (let i = 0; i < checkboxes.length; i++) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.AUTO_MAIL_CHECK_DELAY_MS));
        checkboxes[i].checked = true;
        this.updateMailUI();
      }
    }

    // After all are checked, wait a bit and click Reply All
    await new Promise(resolve => setTimeout(resolve, CONFIG.AUTO_MAIL_CHECK_DELAY_MS));
    this.autoMailRunning = false;
    this.handleReplyAll();
  }

  private getRandomMails(count: number): Mail[] {
    const shuffled = [...mailsData].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private renderMailbox(): void {
    // Clear existing mails
    this.mailboxContainer.innerHTML = '';

    // Get random selection of mails
    const selectedMails = this.getRandomMails(CONFIG.MAIL_TOTAL);

    selectedMails.forEach((mail: Mail) => {
      const mailItem = document.createElement('div');
      mailItem.className = 'mail-item';

      const label = document.createElement('label');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'mail-checkbox';
      checkbox.addEventListener('change', () => this.handleMailCheckboxChange());

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

      this.mailboxContainer.appendChild(mailItem);
    });
  }

  // ----- Public Methods for Upgrades -----

  public purchaseSelectAll(resources: number): boolean {
    if (resources >= CONFIG.UPGRADE_SELECT_ALL_COST && !this.selectAllPurchased) {
      this.selectAllPurchased = true;
      if (this.onResourceChange) {
        this.onResourceChange(-CONFIG.UPGRADE_SELECT_ALL_COST);
      }
      this.updateMailUI();
      return true;
    }
    return false;
  }

  public purchaseAutoMail(resources: number): boolean {
    if (resources >= CONFIG.UPGRADE_AUTO_MAIL_COST && !this.autoMailPurchased) {
      this.autoMailPurchased = true;
      if (this.onResourceChange) {
        this.onResourceChange(-CONFIG.UPGRADE_AUTO_MAIL_COST);
      }
      // Start auto-mail immediately if mailbox is ready
      if (!this.mailSyncing && !this.autoMailRunning) {
        this.autoCheckMails();
      }
      return true;
    }
    return false;
  }

  public purchaseInstantSync(resources: number): boolean {
    if (resources >= CONFIG.UPGRADE_INSTANT_SYNC_COST && !this.instantSyncPurchased) {
      this.instantSyncPurchased = true;
      if (this.onResourceChange) {
        this.onResourceChange(-CONFIG.UPGRADE_INSTANT_SYNC_COST);
      }
      return true;
    }
    return false;
  }

  // ----- Getters -----

  public getMailHandled(): number {
    return this.mailHandled;
  }

  public isSelectAllPurchased(): boolean {
    return this.selectAllPurchased;
  }

  public isAutoMailPurchased(): boolean {
    return this.autoMailPurchased;
  }

  public isInstantSyncPurchased(): boolean {
    return this.instantSyncPurchased;
  }

  public setOnResourceChange(callback: (amount: number) => void): void {
    this.onResourceChange = callback;
  }
}
