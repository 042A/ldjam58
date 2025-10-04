// -----------------------------
// Counter System (Legacy - will be phased out)
// -----------------------------

import { CONFIG } from '../config';

export class Counter {
  private value = 0;
  private intervalId: number | null = null;
  private scoreEl: HTMLParagraphElement;

  constructor(
    private container: HTMLElement,
    private step: number = CONFIG.COUNTER_BASE_STEP,
    private fluctuationPct: number = CONFIG.COUNTER_FLUCTUATION_PCT,
    private tickMs: number = CONFIG.COUNTER_TICK_MS
  ) {
    this.scoreEl = document.createElement("p");
    this.scoreEl.textContent = "0";
    this.container.appendChild(this.scoreEl);
    this.start();
  }

  private increment(): void {
    // multiplier in [1 - p, 1 + p]
    const p = this.fluctuationPct;
    const mult = 1 + (Math.random() * 2 * p - p);
    this.value += this.step * mult;
    this.scoreEl.textContent = Math.round(this.value).toString();
  }

  private start(): void {
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
