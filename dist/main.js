"use strict";
// -----------------------------
// Config
// -----------------------------
const CONFIG = {
    MAX_TOTAL: 100000,
    COUNTER_TICK_MS: 10,
    UI_UPDATE_MS: 100,
    CHART_INTERVAL_MS: 600,
    CHART_MAX_POINTS: 30,
    OVERLAY_MS: 4000,
    BLINK_MS: 3000,
    COUNTER_FLUCTUATION_PCT: 0.2, // ±20%
    COUNTER_BASE_STEP: 1,
};
// -----------------------------
// DOM Helpers & Refs
// -----------------------------
function $(id) {
    const el = document.getElementById(id);
    if (!el)
        throw new Error(`Missing element: #${id}`);
    return el;
}
const UI = {
    moduleEl: $("counterModule"),
    ctx: $("counterChart"),
    totalEl: $("total"),
    buyBtn: $("addBtn"),
    countersContainer: $("counters"),
    progressBar: $("progressBar"),
    progressText: $("progressText"),
};
// -----------------------------
// Utilities
// -----------------------------
function hhmm(date = new Date()) {
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
}
function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}
// -----------------------------
// Chart (delta per interval)
// -----------------------------
const counterChart = new Chart(UI.ctx, {
    type: "line",
    data: {
        labels: [],
        datasets: [
            {
                label: "Delta per interval",
                data: [],
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
// -----------------------------
// Counter
// -----------------------------
class Counter {
    constructor(container, step = CONFIG.COUNTER_BASE_STEP, fluctuationPct = CONFIG.COUNTER_FLUCTUATION_PCT, tickMs = CONFIG.COUNTER_TICK_MS) {
        this.container = container;
        this.step = step;
        this.fluctuationPct = fluctuationPct;
        this.tickMs = tickMs;
        this.value = 0;
        this.intervalId = null;
        this.scoreEl = document.createElement("p");
        this.scoreEl.textContent = "0";
        this.container.appendChild(this.scoreEl);
        this.start();
    }
    increment() {
        // multiplier in [1 - p, 1 + p]
        const p = this.fluctuationPct;
        const mult = 1 + (Math.random() * 2 * p - p);
        this.value += this.step * mult;
        this.scoreEl.textContent = Math.round(this.value).toString();
    }
    start() {
        if (this.intervalId === null) {
            this.intervalId = window.setInterval(() => this.increment(), this.tickMs);
        }
    }
    getValue() {
        return this.value;
    }
}
// -----------------------------
// State
// -----------------------------
const State = {
    counters: [],
    manualAdjust: 0,
    spent: 0,
    // tweak cost here:
    cost: 0, // cost per counter
    lastChartTotal: 0,
};
// -----------------------------
// Progress + Total Rendering
// -----------------------------
function updateProgress(total) {
    const percent = clamp((total / CONFIG.MAX_TOTAL) * 100, 0, 100);
    UI.progressBar.style.width = percent + "%";
    UI.progressText.textContent = percent.toFixed(2) + "%";
}
function computeTotal() {
    const sum = State.counters.reduce((s, c) => s + c.getValue(), 0);
    return sum + State.manualAdjust;
}
function renderTotal() {
    const total = computeTotal();
    UI.totalEl.textContent = "Total: " + Math.floor(total);
    updateProgress(total);
    return total;
}
// Optional “bank” helper if you later add a separate bank UI
// function computeBank(): number {
//   const accrual = State.counters.reduce((s, c) => s + c.getValue(), 0);
//   return accrual - State.spent;
// }
// -----------------------------
// Chart Update (delta)
// -----------------------------
function updateChartDelta(currentTotal) {
    const delta = currentTotal - State.lastChartTotal;
    State.lastChartTotal = currentTotal;
    const labels = counterChart.data.labels;
    const data = counterChart.data.datasets[0].data;
    labels.push(hhmm());
    data.push(delta);
    if (labels.length > CONFIG.CHART_MAX_POINTS) {
        labels.shift();
        data.shift();
    }
    counterChart.update();
}
// -----------------------------
// Module “show” effect
// -----------------------------
function showModule() {
    UI.moduleEl.classList.add("blink", "show-overlay");
    setTimeout(() => {
        UI.moduleEl.classList.remove("show-overlay");
    }, CONFIG.OVERLAY_MS);
    setTimeout(() => {
        UI.moduleEl.classList.remove("blink");
    }, CONFIG.BLINK_MS);
}
// -----------------------------
// Actions
// -----------------------------
function tryBuyCounter() {
    const currentTotal = computeTotal();
    if (currentTotal >= State.cost) {
        State.spent += State.cost;
        State.counters.push(new Counter(UI.countersContainer));
        // apply the cost immediately as a manual adjustment
        State.manualAdjust -= State.cost;
        renderTotal();
    }
    else {
        alert("Not enough points!");
    }
}
// -----------------------------
// Events
// -----------------------------
UI.buyBtn.addEventListener("click", tryBuyCounter);
// -----------------------------
// Startup
// -----------------------------
function start() {
    showModule();
    // initialize with one counter (optional)
    // State.counters.push(new Counter(UI.countersContainer));
    // keep UI fresh
    setInterval(renderTotal, CONFIG.UI_UPDATE_MS);
    // chart delta updater
    setInterval(() => {
        const total = renderTotal();
        updateChartDelta(total);
    }, CONFIG.CHART_INTERVAL_MS);
}
start();
//# sourceMappingURL=main.js.map