// -----------------------------
// Chart System - Overhead Tracking
// -----------------------------

import { CONFIG } from '../config';
import { hhmm } from '../utils/helpers';

export class ChartSystem {
  private chart: Chart;
  private lastTotal = 0;

  constructor(canvasEl: HTMLCanvasElement) {
    this.chart = new Chart(canvasEl, {
      type: "line",
      data: {
        labels: [] as string[],
        datasets: [
          {
            label: "Delta per interval",
            data: [] as number[],
            borderColor: "blue",
            fill: false,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        scales: {
          x: { title: { display: true, text: "Time (hh:mm)" } },
          y: { title: { display: true, text: "Delta" } },
        },
      },
    });
  }

  public updateDelta(currentTotal: number): void {
    const delta = currentTotal - this.lastTotal;
    this.lastTotal = currentTotal;

    const labels = this.chart.data.labels!;
    const data = this.chart.data.datasets[0].data as number[];

    labels.push(hhmm());
    data.push(delta);

    if (labels.length > CONFIG.CHART_MAX_POINTS) {
      labels.shift();
      data.shift();
    }

    this.chart.update();
  }

  public getLastTotal(): number {
    return this.lastTotal;
  }

  public setLastTotal(value: number): void {
    this.lastTotal = value;
  }
}
