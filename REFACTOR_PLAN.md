# Reply All - The Game: Refactor Plan

## Current State Analysis

### File Structure (Current)
```
/jsgame
├── index.html          (HTML structure with all modules)
├── style.css           (All styles)
└── src/
    ├── main.ts         (~742 lines - everything mixed together)
    ├── world.ts        (WorldModule class - already separated!)
    └── mails.json      (Mail data)
```

### Problems Identified
1. **Monolithic main.ts**: Contains all logic for counters, mailbox, corporation, upgrades, UI, state management
2. **No module visibility control**: All modules visible from start (should unlock progressively)
3. **Tight coupling**: State, UI, and game logic all intertwined
4. **Placeholder "Counters" module**: Should display aggregated values from the 3 main modules
5. **No debug tools**: Hard to test module unlocking

## Target State

### New File Structure
```
/jsgame
├── index.html
├── style.css
└── src/
    ├── main.ts                 (Entry point, initialization, game loop)
    ├── config.ts               (All CONFIG constants)
    ├── types.ts                (TypeScript interfaces)
    ├── state.ts                (Centralized game state)
    ├── ui-manager.ts           (UI element references and rendering)
    ├── modules/
    │   ├── base-module.ts      (Abstract base class for modules)
    │   ├── mailbox.ts          (Module 1: Your Mailbox)
    │   ├── corporation.ts      (Module 2: Corporation Communications)
    │   └── world.ts            (Module 3: World Overhead - already exists!)
    ├── systems/
    │   ├── counter-system.ts   (Counter logic)
    │   ├── upgrade-system.ts   (Upgrade logic)
    │   ├── chart-system.ts     (Chart rendering)
    │   └── progress-tracker.ts (Progress bar, module unlocking)
    ├── utils/
    │   ├── helpers.ts          (Utility functions: hhmm, clamp, $)
    │   └── debug.ts            (Debug tools)
    └── mails.json
```

### Module Unlock Thresholds & Progress Levels
- **Level 1 - Module 1 (Mailbox)**: 0 → 200,000 overhead hours (always visible)
- **Level 2 - Module 2 (Corporation)**: Unlocks at 200,000, progress to 2,000,000
- **Level 3 - Module 3 (World)**: Unlocks at 2,000,000, progress to 10,000,000,000,000
- **Win Module**: Shows at 10,000,000,000,000 overhead hours (10 trillion)

### Module System Architecture

Each module will:
1. Extend `BaseModule` abstract class
2. Have its own state management
3. Provide a `getMetrics()` method returning key values
4. Handle its own UI updates
5. Be independently testable

## Refactor Steps

### Phase 1: Extract Configuration & Types
**Files to create:**
- `src/config.ts` - All CONFIG constants
- `src/types.ts` - All TypeScript interfaces

**Benefits:** Centralized configuration, easier to tune game balance

### Phase 2: Create State Management
**Files to create:**
- `src/state.ts` - Centralized game state with getters/setters

**Benefits:** Single source of truth, easier debugging

### Phase 3: Extract Utility Systems
**Files to create:**
- `src/utils/helpers.ts` - Move: `$()`, `hhmm()`, `clamp()`
- `src/utils/debug.ts` - Debug button, module unlock override
- `src/systems/chart-system.ts` - Chart logic
- `src/systems/progress-tracker.ts` - Progress bar + module unlock logic

### Phase 4: Modularize Game Modules
**Files to create:**
- `src/modules/base-module.ts` - Abstract base class
- `src/modules/mailbox.ts` - Extract mailbox logic from main.ts
- `src/modules/corporation.ts` - Extract corporation/document logic from main.ts
- Refactor `src/modules/world.ts` - Make it extend BaseModule

**Each module provides:**
```typescript
interface ModuleMetrics {
  name: string;
  primaryValue: number;
  label: string;
}

abstract class BaseModule {
  abstract getMetrics(): ModuleMetrics;
  abstract update(deltaTime: number): void;
  abstract render(): void;
}
```

### Phase 5: Extract Systems
**Files to create:**
- `src/systems/counter-system.ts` - Counter class + management
- `src/systems/upgrade-system.ts` - All upgrade logic

### Phase 6: Create UI Manager
**Files to create:**
- `src/ui-manager.ts` - All UI element references and update logic

### Phase 7: Refactor Main Entry Point
**Update:**
- `src/main.ts` - Clean entry point that orchestrates everything

### Phase 8: Fix Counter Module Display
**Update:**
- Keep existing Counter module (visible when debug mode is on)
- Replace placeholder counters with real calculated values:
  - **Counter 1**: Mails handled (from Module 1) × 10
  - **Counter 2**: Hours wasted (from Module 2)
  - **Counter 3**: Total emails sent (from Module 3) × 5
- These contribute to the main "Overhead Hours" value

## Implementation Priority

### Priority 1 (Core Refactor)
1. Create config.ts, types.ts, helpers.ts
2. Extract module unlock system + debug tools
3. Hide modules 2 & 3 initially
4. Add debug button to top bar

### Priority 2 (Module Separation)
1. Create BaseModule class
2. Extract Mailbox module
3. Extract Corporation module
4. Refactor World module to use BaseModule

### Priority 3 (Systems)
1. Extract counter system
2. Extract upgrade system
3. Extract chart system
4. Create UI manager

### Priority 4 (Polish)
1. Fix counter module to show real metrics
2. Clean up main.ts
3. Test all functionality
4. Remove dead code

## Answers from User

✅ **Counter module display**:
- Counter 1 = Mails handled × 10
- Counter 2 = Hours wasted
- Counter 3 = Total emails sent × 5
- Module visible when debug mode is on

✅ **Tracker module** (with chart):
- Shows **combined overhead from all sources** (all counters + modules)
- Progress bar changes based on current "level":
  - **Level 1** (Module 1 active): 0 → 200,000 overhead hours
  - **Level 2** (Module 2 unlocked): 200,000 → 2,000,000 overhead hours
  - **Level 3** (Module 3 unlocked): 2,000,000 → 10,000,000,000,000 (10 trillion)
- Chart tracks overhead growth over time

✅ **Upgrades** - Three types:

**1. Module-Specific Upgrades:**
- **Module 1 (Mailbox)**:
  - Select All Tool ($750)
  - Auto-Mail System ($1000)
  - Instant Sync ($2000)
- **Module 2 (Corporation)**:
  - Add Stakeholder ($5000)
  - Hire Communications Officer ($500, doubles each purchase)
- **Module 3 (World)**:
  - +1 Mail/second
  - +1 Contact/person

**2. Per-Module Counter Doubler:**
- Each module has a "Double Output" upgrade
- Doubles that module's counter contribution
- Price increases with each purchase (per module)

**3. Global Upgrade:**
- "Double Overhead Per Hour Globally"
- Affects all modules simultaneously
- Single global multiplier

✅ **Win condition**: 10 trillion overhead hours

## Benefits of This Refactor

1. **Maintainability**: Easy to find and modify specific features
2. **Testability**: Each module/system can be tested independently
3. **Scalability**: Easy to add new modules (Module 4, 5, etc.)
4. **Readability**: Clear separation of concerns
5. **Debug-friendly**: Debug tools make testing easier
6. **Reusability**: BaseModule pattern allows quick module creation

## Estimated Impact

- **Files created**: ~15 new files
- **main.ts reduction**: From ~742 lines to ~50-100 lines
- **Average file size**: 50-150 lines (manageable chunks)
- **Breaking changes**: Minimal (internal refactor only)
- **User-facing changes**:
  - Modules 2 & 3 hidden initially
  - Debug button in top bar
  - Counter module shows real values
