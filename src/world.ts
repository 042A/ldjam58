// -----------------------------
// Module 3: World Overhead Task Force
// -----------------------------

import { BaseModule } from './modules/base-module';
import { ModuleMetrics } from './types';
import { CONFIG } from './config';

interface AnimatedDot {
  progress: number; // 0-1 along the path
  pathIndex: number; // Which path this dot is on
  hasSpawnedChildren: boolean; // Track if we've already spawned child dots
}

interface PathInfo {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  depth: number; // Track which level this path is on
}

export class WorldModule extends BaseModule {
  private isActive = false;

  // Core values
  private mailsPerSecond = 0;
  private avgContactsPerPerson = 1;
  private totalEmailsSent = 0;

  // Upgrade counts for cost calculation
  private worldMailCount = 0;
  private worldContactCount = 0;

  // OPM tracking
  private lastOpmUpdate = Date.now();
  private lastPrimaryValue = 0;
  private currentOpm = 0;

  // UI elements
  private mailsEl: HTMLElement;
  private contactsEl: HTMLElement;
  private totalEl: HTMLElement;
  private treeEl: HTMLElement;
  private startBtn: HTMLButtonElement;
  private worldContent: HTMLElement;

  // Callbacks
  private onMoneyChange: ((amount: number) => void) | null = null;

  // Animation
  private animationFrame: number | null = null;
  private dots: AnimatedDot[] = [];
  private paths: PathInfo[] = [];
  private lastUpdateTime = 0;

  constructor() {
    super("world", false); // Locked initially

    this.mailsEl = document.getElementById("worldMails") as HTMLElement;
    this.contactsEl = document.getElementById("worldContacts") as HTMLElement;
    this.totalEl = document.getElementById("worldTotal") as HTMLElement;
    this.treeEl = document.getElementById("worldTree") as HTMLElement;
    this.startBtn = document.getElementById("worldBtn") as HTMLButtonElement;
    this.worldContent = document.getElementById("worldContent") as HTMLElement;

    if (!this.mailsEl || !this.contactsEl || !this.totalEl || !this.treeEl || !this.startBtn || !this.worldContent) {
      throw new Error("Missing world module elements");
    }
  }

  public init(): void {
    this.startBtn.addEventListener("click", () => this.startModule());
    this.updateDisplay();
  }

  public update(deltaTime: number): void {
    // World module uses requestAnimationFrame, not update loop
  }

  public getMetrics(): ModuleMetrics {
    const primaryValue = Math.floor(this.totalEmailsSent * CONFIG.TOTAL_EMAILS_MULTIPLIER);

    // Calculate OPM
    const now = Date.now();
    const deltaMinutes = (now - this.lastOpmUpdate) / 60000;
    if (deltaMinutes >= 0.1) { // Update every 6 seconds
      const deltaValue = primaryValue - this.lastPrimaryValue;
      this.currentOpm = deltaValue / deltaMinutes;
      this.lastOpmUpdate = now;
      this.lastPrimaryValue = primaryValue;
    }

    return {
      name: "World",
      primaryValue,
      label: `Total emails sent: ${Math.floor(this.totalEmailsSent).toLocaleString()}`,
      opm: this.currentOpm,
      multiplier: CONFIG.TOTAL_EMAILS_MULTIPLIER,
    };
  }

  private startModule(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.startBtn.style.display = 'none';
    this.worldContent.style.display = 'block';

    // Show world upgrades
    const worldMailRow = document.getElementById('upgradeWorldMailRow');
    const worldContactRow = document.getElementById('upgradeWorldContactRow');
    if (worldMailRow) worldMailRow.style.display = 'table-row';
    if (worldContactRow) worldContactRow.style.display = 'table-row';

    this.animate();
  }

  public purchaseWorldMail(money: number): boolean {
    const cost = this.getWorldMailCost();
    if (money >= cost) {
      this.worldMailCount++;
      this.mailsPerSecond++;
      if (this.onMoneyChange) {
        this.onMoneyChange(-cost);
      }
      this.updateDisplay();
      return true;
    }
    return false;
  }

  public purchaseWorldContact(money: number): boolean {
    const cost = this.getWorldContactCost();
    if (money >= cost) {
      this.worldContactCount++;
      this.avgContactsPerPerson++;
      if (this.onMoneyChange) {
        this.onMoneyChange(-cost);
      }
      this.updateDisplay();
      return true;
    }
    return false;
  }

  public getWorldMailCost(): number {
    return CONFIG.UPGRADE_WORLD_MAIL_BASE_COST * Math.pow(2, this.worldMailCount);
  }

  public getWorldContactCost(): number {
    return CONFIG.UPGRADE_WORLD_CONTACT_BASE_COST * Math.pow(2, this.worldContactCount);
  }

  public getWorldMailCount(): number {
    return this.worldMailCount;
  }

  public getWorldContactCount(): number {
    return this.worldContactCount;
  }

  public setOnMoneyChange(callback: (amount: number) => void): void {
    this.onMoneyChange = callback;
  }

  private updateDisplay(): void {
    this.mailsEl.textContent = this.mailsPerSecond.toString();
    this.contactsEl.textContent = this.avgContactsPerPerson.toString();
    this.totalEl.textContent = Math.floor(this.totalEmailsSent).toLocaleString();

    // Animate number change
    this.mailsEl.style.animation = 'none';
    this.contactsEl.style.animation = 'none';
    this.totalEl.style.animation = 'none';
    setTimeout(() => {
      this.mailsEl.style.animation = 'pulse 0.3s ease';
      this.contactsEl.style.animation = 'pulse 0.3s ease';
      this.totalEl.style.animation = 'pulse 0.3s ease';
    }, 10);

    this.renderTree();
  }

  private renderTree(): void {
    const width = this.treeEl.offsetWidth || 400;
    const height = 250; // Fixed height

    // Create or get SVG
    let svg = this.treeEl.querySelector('svg');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.width = '100%';
      svg.style.height = '250px';
      svg.style.display = 'block';
      this.treeEl.appendChild(svg);
    }

    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Remove old elements except dots
    const dots = Array.from(svg.querySelectorAll('.mail-dot'));
    svg.innerHTML = '';
    dots.forEach(d => svg.appendChild(d));

    // Reset paths
    this.paths = [];

    // Start from top center
    const rootX = width / 2;
    const rootY = 30;

    const branches = Math.max(this.avgContactsPerPerson, 1);

    this.drawBranch(svg, rootX, rootY, 0, branches, width, height);
  }

  private drawBranch(
    svg: SVGElement,
    x: number,
    y: number,
    depth: number,
    branches: number,
    width: number,
    height: number
  ): void {
    // Draw node
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x.toString());
    circle.setAttribute('cy', y.toString());
    circle.setAttribute('r', depth === 0 ? '6' : '4'); // Root node is bigger
    circle.setAttribute('fill', `hsl(${depth * 80}, 70%, 60%)`);
    circle.setAttribute('data-depth', depth.toString()); // Mark root for animation
    svg.appendChild(circle);

    if (depth >= 2) return; // Max 2 levels deep

    // Calculate spacing for child branches
    const levelHeight = 100;
    const nextY = y + levelHeight;

    // First level: max 10 branches, second level: max 3
    const maxVisibleBranches = depth === 0 ? 10 : 3;
    const branchesToDraw = Math.min(branches, maxVisibleBranches);
    const hiddenBranches = Math.max(0, branches - maxVisibleBranches);

    const spread = Math.min(width / (branchesToDraw + 1), 80);

    // Draw visible branches
    for (let i = 0; i < branchesToDraw; i++) {
      const offset = (i - (branchesToDraw - 1) / 2) * spread;
      const childX = x + offset;

      // Clamp to bounds
      const clampedX = Math.max(20, Math.min(width - 20, childX));

      // Draw line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x.toString());
      line.setAttribute('y1', y.toString());
      line.setAttribute('x2', clampedX.toString());
      line.setAttribute('y2', nextY.toString());
      line.setAttribute('stroke', '#4ecdc4');
      line.setAttribute('stroke-opacity', '0.6');
      line.setAttribute('stroke-width', '1');
      svg.appendChild(line);

      // Store path for animation with depth info
      this.paths.push({x1: x, y1: y, x2: clampedX, y2: nextY, depth: depth});

      // Recursive draw
      this.drawBranch(svg, clampedX, nextY, depth + 1, branches, width, height);
    }

    // Show aggregate number if there are hidden branches
    if (hiddenBranches > 0) {
      // Position text to the right of the last visible branch
      const lastBranchX = x + ((branchesToDraw - 1) / 2) * spread;
      const textX = Math.min(lastBranchX + 30, width - 40);

      const aggregateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      aggregateText.setAttribute('x', textX.toString());
      aggregateText.setAttribute('y', (nextY + 4).toString());
      aggregateText.setAttribute('text-anchor', 'middle');
      aggregateText.setAttribute('fill', '#ff9800');
      aggregateText.setAttribute('font-size', '11');
      aggregateText.setAttribute('font-weight', 'bold');
      aggregateText.textContent = `+${hiddenBranches}`;
      svg.appendChild(aggregateText);
    }
  }

  private animate(): void {
    if (!this.isActive) return;

    const now = performance.now();
    const deltaTime = this.lastUpdateTime ? (now - this.lastUpdateTime) / 1000 : 0;
    this.lastUpdateTime = now;

    // Calculate total emails sent per original mail
    // Each mail cascades: 1 mail -> contacts people get it -> each sends to contacts more
    // Total = contacts + contacts^2 (for 2 levels)
    const contacts = Math.max(this.avgContactsPerPerson, 1);
    const emailsPerOriginalMail = contacts + (contacts * contacts);

    // Increment total emails based on mails per second * cascade multiplier
    if (deltaTime > 0 && deltaTime < 1) { // Sanity check
      this.totalEmailsSent += this.mailsPerSecond * emailsPerOriginalMail * deltaTime;
      this.totalEl.textContent = Math.floor(this.totalEmailsSent).toLocaleString();
    }

    // Update dots based on mailsPerSecond
    const speed = 0.008; // Fixed speed for smooth animation

    // Add new cascade - when mail starts, it creates dots on ALL first-level paths
    // Map mailsPerSecond (0+) to animation rate (0.1 to 5 mails/sec)
    const animationMailRate = Math.min(0.1 + this.mailsPerSecond * 0.1, 5);
    const cascadeProbability = animationMailRate * 0.015;
    if (this.paths.length > 0 && Math.random() < cascadeProbability) {
      // Find all depth-0 paths (from root to first level)
      const firstLevelPaths = this.paths
        .map((path, idx) => ({path, idx}))
        .filter(({path}) => path.depth === 0);

      // Add dot to each first-level path (mail going to all contacts)
      firstLevelPaths.forEach(({idx}) => {
        this.dots.push({
          progress: 0,
          pathIndex: idx,
          hasSpawnedChildren: false
        });
      });
    }

    // Update existing dots and create secondary cascades
    const newDots: AnimatedDot[] = [];
    this.dots = this.dots.filter(dot => {
      dot.progress += speed;

      // When dot reaches 50% progress, spawn dots on child paths
      if (dot.progress >= 0.5 && !dot.hasSpawnedChildren) {
        dot.hasSpawnedChildren = true;

        // Find child paths that start from this path's endpoint
        const currentPath = this.paths[dot.pathIndex];
        if (currentPath) {
          this.paths.forEach((path, idx) => {
            // Check if this path starts near where current path ends (child path)
            const distX = Math.abs(path.x1 - currentPath.x2);
            const distY = Math.abs(path.y1 - currentPath.y2);
            if (distX < 5 && distY < 5 && idx !== dot.pathIndex) {
              newDots.push({
                progress: 0,
                pathIndex: idx,
                hasSpawnedChildren: false
              });
            }
          });
        }
      }

      return dot.progress < 1; // Remove completed dots
    });

    // Add new cascade dots
    this.dots.push(...newDots);

    // Render dots
    const svg = this.treeEl.querySelector('svg');
    if (svg) {
      // Remove old dot elements
      const oldDots = svg.querySelectorAll('.mail-dot');
      oldDots.forEach(d => d.remove());

      // Draw new dots
      this.dots.forEach(dot => {
        if (dot.pathIndex < this.paths.length) {
          const path = this.paths[dot.pathIndex];
          const x = path.x1 + (path.x2 - path.x1) * dot.progress;
          const y = path.y1 + (path.y2 - path.y1) * dot.progress;

          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.classList.add('mail-dot');
          circle.setAttribute('cx', x.toString());
          circle.setAttribute('cy', y.toString());
          circle.setAttribute('r', '3');
          circle.setAttribute('fill', '#ff6b6b');
          svg.appendChild(circle);
        }
      });
    }

    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  public isRunning(): boolean {
    return this.isActive;
  }

  public getTotalEmailsSent(): number {
    return this.totalEmailsSent;
  }
}
