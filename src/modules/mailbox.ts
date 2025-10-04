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
  private autoMailPurchased = false;
  private instantSyncPurchased = false;
  private autoMailRunning = false;
  private fasterAutoMailPurchased = false;
  private doubleMailboxCount = 0;
  private totalOverhead = 0; // Track total overhead directly instead of retroactive calculation
  private increaseMailboxPurchased = false;

  // OPM tracking
  private lastOpmUpdate = Date.now();
  private lastPrimaryValue = 0;
  private currentOpm = 0;

  // UI Elements
  private mailboxContainer: HTMLDivElement;
  private mailSelectAllActionBtn: HTMLButtonElement;
  private mailSelectBtn: HTMLButtonElement;
  private mailReplyBtn: HTMLButtonElement;
  private mailSyncBtn: HTMLButtonElement;

  // Callbacks
  private onMoneyChange: ((amount: number) => void) | null = null;

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
    const multiplier = CONFIG.MAIL_HANDLED_MULTIPLIER * Math.pow(2, this.doubleMailboxCount);

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
      name: "Mailbox",
      primaryValue: this.totalOverhead,
      label: `Mails handled: ${this.mailHandled}`,
      opm: this.currentOpm,
      multiplier: multiplier,
    };
  }

  // ----- Mailbox Logic -----

  private getMailCheckboxes(): NodeListOf<HTMLInputElement> {
    return this.mailboxContainer.querySelectorAll('.mail-checkbox') as NodeListOf<HTMLInputElement>;
  }

  private updateMailUI(): void {
    const checkboxes = this.getMailCheckboxes();
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    const mailTotal = this.increaseMailboxPurchased ? CONFIG.MAIL_TOTAL_UPGRADED : CONFIG.MAIL_TOTAL;
    const remaining = mailTotal - checkedCount;

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
      // Still selecting - show countdown button
      this.mailSelectBtn.textContent = `Select ${remaining}...`;
      this.mailSelectBtn.disabled = true;
      this.mailSelectBtn.style.display = 'block';
      this.mailSelectAllActionBtn.style.display = 'none';
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

    // Add overhead based on current multiplier
    const multiplier = CONFIG.MAIL_HANDLED_MULTIPLIER * Math.pow(2, this.doubleMailboxCount);
    this.totalOverhead += multiplier;

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

    const delay = this.fasterAutoMailPurchased
      ? CONFIG.AUTO_MAIL_CHECK_DELAY_MS / 2
      : CONFIG.AUTO_MAIL_CHECK_DELAY_MS;

    // Check each checkbox one by one with delay
    for (let i = 0; i < checkboxes.length; i++) {
      await new Promise(resolve => setTimeout(resolve, delay));
      checkboxes[i].checked = true;
      this.updateMailUI();
    }

    // After all are checked, wait a bit and click Reply All
    await new Promise(resolve => setTimeout(resolve, delay));
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
    const mailTotal = this.increaseMailboxPurchased ? CONFIG.MAIL_TOTAL_UPGRADED : CONFIG.MAIL_TOTAL;
    const selectedMails = this.getRandomMails(mailTotal);

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

  public purchaseAutoMail(money: number): boolean {
    if (money >= CONFIG.UPGRADE_AUTO_MAIL_COST && !this.autoMailPurchased) {
      this.autoMailPurchased = true;
      if (this.onMoneyChange) {
        this.onMoneyChange(-CONFIG.UPGRADE_AUTO_MAIL_COST);
      }
      // Start auto-mail immediately if mailbox is ready
      if (!this.mailSyncing && !this.autoMailRunning) {
        this.autoCheckMails();
      }
      return true;
    }
    return false;
  }

  public purchaseInstantSync(money: number): boolean {
    if (money >= CONFIG.UPGRADE_INSTANT_SYNC_COST && !this.instantSyncPurchased) {
      this.instantSyncPurchased = true;
      if (this.onMoneyChange) {
        this.onMoneyChange(-CONFIG.UPGRADE_INSTANT_SYNC_COST);
      }
      return true;
    }
    return false;
  }

  public purchaseFasterAutoMail(money: number): boolean {
    if (money >= CONFIG.UPGRADE_FASTER_AUTO_MAIL_COST && !this.fasterAutoMailPurchased) {
      this.fasterAutoMailPurchased = true;
      if (this.onMoneyChange) {
        this.onMoneyChange(-CONFIG.UPGRADE_FASTER_AUTO_MAIL_COST);
      }
      return true;
    }
    return false;
  }

  public purchaseDoubleMailbox(money: number): boolean {
    const cost = CONFIG.UPGRADE_DOUBLE_MAILBOX_BASE_COST * Math.pow(2, this.doubleMailboxCount);

    if (money >= cost) {
      this.doubleMailboxCount++;
      if (this.onMoneyChange) {
        this.onMoneyChange(-cost);
      }
      return true;
    }
    return false;
  }

  public purchaseIncreaseMailbox(money: number): boolean {
    if (money >= CONFIG.UPGRADE_INCREASE_MAILBOX_COST && !this.increaseMailboxPurchased) {
      this.increaseMailboxPurchased = true;
      if (this.onMoneyChange) {
        this.onMoneyChange(-CONFIG.UPGRADE_INCREASE_MAILBOX_COST);
      }
      // Re-render mailbox with new mail count
      this.renderMailbox();
      this.updateMailUI();
      return true;
    }
    return false;
  }

  // ----- Getters -----

  public getMailHandled(): number {
    return this.mailHandled;
  }

  public isAutoMailPurchased(): boolean {
    return this.autoMailPurchased;
  }

  public isInstantSyncPurchased(): boolean {
    return this.instantSyncPurchased;
  }

  public isFasterAutoMailPurchased(): boolean {
    return this.fasterAutoMailPurchased;
  }

  public getDoubleMailboxCount(): number {
    return this.doubleMailboxCount;
  }

  public getDoubleMailboxCost(): number {
    return CONFIG.UPGRADE_DOUBLE_MAILBOX_BASE_COST * Math.pow(2, this.doubleMailboxCount);
  }

  public isIncreaseMailboxPurchased(): boolean {
    return this.increaseMailboxPurchased;
  }

  public setOnMoneyChange(callback: (amount: number) => void): void {
    this.onMoneyChange = callback;
  }

  public addOverhead(amount: number): void {
    this.totalOverhead += amount;
  }
}
