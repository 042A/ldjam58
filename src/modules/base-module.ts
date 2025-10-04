// -----------------------------
// Base Module - Abstract class for game modules
// -----------------------------

import { ModuleMetrics } from '../types';

export abstract class BaseModule {
  protected moduleId: string;
  protected isUnlocked: boolean;

  constructor(moduleId: string, isUnlocked: boolean = true) {
    this.moduleId = moduleId;
    this.isUnlocked = isUnlocked;
  }

  /**
   * Get module metrics for overhead calculation
   */
  abstract getMetrics(): ModuleMetrics;

  /**
   * Update module state (called every frame/tick)
   */
  abstract update(deltaTime: number): void;

  /**
   * Initialize the module
   */
  abstract init(): void;

  /**
   * Unlock the module (show it)
   */
  public unlock(): void {
    if (this.isUnlocked) return;

    this.isUnlocked = true;
    const moduleEl = document.getElementById(this.moduleId);
    if (moduleEl) {
      moduleEl.classList.remove("locked");
      console.log(`Module unlocked: ${this.moduleId}`);
    }
  }

  /**
   * Check if module is unlocked
   */
  public getIsUnlocked(): boolean {
    return this.isUnlocked;
  }
}
