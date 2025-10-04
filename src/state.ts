// -----------------------------
// Centralized Game State
// -----------------------------

import { GameState } from './types';
import { CONFIG } from './config';
import { Counter } from './systems/counter-system';

class StateManager {
  private state: GameState = {
    // Legacy counter system (to be removed)
    counters: [],
    outputValue: 0,
    money: CONFIG.STARTING_MONEY,
    lastChartTotal: 0,
    stepMultiplier: 1,

    // Module 1: Mailbox
    mailHandled: 0,
    mailSyncing: false,
    autoMailPurchased: false,
    autoMailRunning: false,
    instantSyncPurchased: false,
    selectAllPurchased: false,

    // Module 2: Corporation
    currentDocument: null,
    documentInProgress: false,
    documentsCompleted: 0,
    permanentStakeholders: ["CEO", "CFO", "Legal"],
    commOfficerCount: 0,
    documentSpeedMultiplier: 1,
    hoursWastedTotal: 0,

    // Module unlock state
    module2Unlocked: false,
    module3Unlocked: false,
    winModuleShown: false,
  };

  // Getters
  public getMoney(): number {
    return this.state.money;
  }

  public getOutputValue(): number {
    return this.state.outputValue;
  }

  public getStepMultiplier(): number {
    return this.state.stepMultiplier;
  }

  public getCounters(): Counter[] {
    return this.state.counters as Counter[];
  }

  public isModule2Unlocked(): boolean {
    return this.state.module2Unlocked;
  }

  public isModule3Unlocked(): boolean {
    return this.state.module3Unlocked;
  }

  public isWinModuleShown(): boolean {
    return this.state.winModuleShown;
  }

  // Setters
  public setOutputValue(value: number): void {
    this.state.outputValue = value;
  }

  public addMoney(amount: number): void {
    this.state.money += amount;
  }

  public spendMoney(amount: number): boolean {
    if (this.state.money >= amount) {
      this.state.money -= amount;
      return true;
    }
    return false;
  }

  public setModule2Unlocked(unlocked: boolean): void {
    this.state.module2Unlocked = unlocked;
  }

  public setModule3Unlocked(unlocked: boolean): void {
    this.state.module3Unlocked = unlocked;
  }

  public setWinModuleShown(shown: boolean): void {
    this.state.winModuleShown = shown;
  }

  public addCounter(counter: Counter): void {
    this.state.counters.push(counter);
  }

  public doubleStepMultiplier(): void {
    this.state.stepMultiplier *= 2;
  }
}

// Singleton instance
export const gameState = new StateManager();
