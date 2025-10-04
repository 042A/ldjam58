// -----------------------------
// Debug Utilities
// -----------------------------

export class DebugManager {
  private isDebugMode = false;
  private debugBtn: HTMLButtonElement;
  private onDebugToggle: ((enabled: boolean) => void)[] = [];
  private onMoneyBoost: (() => void) | null = null;

  constructor() {
    this.debugBtn = document.getElementById("debugBtn") as HTMLButtonElement;
    if (!this.debugBtn) {
      throw new Error("Missing debug button #debugBtn");
    }

    this.debugBtn.addEventListener("click", () => this.toggleDebugMode());
    this.updateButtonStyle();
  }

  private toggleDebugMode(): void {
    this.isDebugMode = !this.isDebugMode;
    this.updateButtonStyle();

    // Notify all listeners
    this.onDebugToggle.forEach(callback => callback(this.isDebugMode));

    // Give huge money boost when enabling debug mode
    if (this.isDebugMode && this.onMoneyBoost) {
      this.onMoneyBoost();
    }

    console.log(`Debug mode: ${this.isDebugMode ? "ON" : "OFF"}`);
    if (this.isDebugMode) {
      console.log("💰 Debug money granted!");
    }
  }

  private updateButtonStyle(): void {
    if (this.isDebugMode) {
      this.debugBtn.textContent = "Debug: ON";
      this.debugBtn.style.backgroundColor = "#4caf50";
      this.debugBtn.style.color = "white";
      this.debugBtn.style.fontWeight = "bold";
    } else {
      this.debugBtn.textContent = "Debug Mode";
      this.debugBtn.style.backgroundColor = "";
      this.debugBtn.style.color = "";
      this.debugBtn.style.fontWeight = "";
    }
  }

  public isEnabled(): boolean {
    return this.isDebugMode;
  }

  public onToggle(callback: (enabled: boolean) => void): void {
    this.onDebugToggle.push(callback);
  }

  public onBoostMoney(callback: () => void): void {
    this.onMoneyBoost = callback;
  }

  // Helper to manually unlock modules
  public unlockModule(moduleId: string): void {
    const module = document.getElementById(moduleId);
    if (module) {
      module.style.display = "";
      console.log(`[DEBUG] Unlocked module: ${moduleId}`);
    }
  }

  // Helper to set overhead value (for testing)
  public setOverhead(value: number): void {
    console.log(`[DEBUG] Setting overhead to: ${value}`);
    // This will be implemented once we refactor state management
  }
}
