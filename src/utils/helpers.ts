// -----------------------------
// Utility Helper Functions
// -----------------------------

/**
 * Get element by ID with type checking
 */
export function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: #${id}`);
  return el as T;
}

/**
 * Format time as HH:MM
 */
export function hhmm(date = new Date()): string {
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * Clamp a number between min and max
 */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
