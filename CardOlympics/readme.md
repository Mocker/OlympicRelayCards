# Olympic Relay Card Game

Run an olympic relay by equipping your runners with cards and playing them during the race. So how far you can qualify.

Made during PIGSGUAD - Summer Slow Jams '26 - Luck

Created by [pencil-ascii](https://github.com/pencil-ascii) & [mocker](https://github.com/mocker)

## Instructions

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev`.
4. If you want to build the project, run `npm run build`.

## Features

*   **Deck Drafting & Redrawing:** Start with 16 random cards, choose which ones to redraw poker-style, and equip 4 cards per runner.
*   **Dynamic Stats System:** Card combinations modify your runners' Speed, Acceleration, Stamina, and Endurance.
*   **Horizontal 4-Lane Relay Simulation:** Race against USA, JAM, and GBR with automatic runner acceleration and baton hand-offs at 100m zones.
*   **Active Card HUD:** Manually click equipped Active cards during the race to trigger speed bursts, stamina recovery, or sabotaging opponents.
*   **Velocity-Sensitive Footsteps:** Runner footstep frequencies scale dynamically with their velocity on the track.
*   **Discard Drafting Loop:** Qualify to move to the next round, discard 1 card from 1–4 runners, and draft replacements to fill the empty slots.
*   **9-Slice Theme UI:** Clean, retro styling utilizing 9-slice backdrops and buttons with custom hover highlights.
*   **Layout Debugger:** Drag-and-drop debugging utility for UI layout testing.

## Code Architecture

*   [main.js](file:///g:/Dev/10_Projects/SlowJams2026-Luck/CardOlympics/src/main.js) - Sets up Phaser configuration, scaling, and initializes scenes.
*   [Preloader.js](file:///g:/Dev/10_Projects/SlowJams2026-Luck/CardOlympics/src/Preloader.js) - Preloads audio (`sfx_`) assets and sprite sheets.
*   [cardsConfig.js](file:///g:/Dev/10_Projects/SlowJams2026-Luck/CardOlympics/src/cardsConfig.js) - Configuration file storing stats for all Safe, Risky, Dangerous, and Active cards, runner templates, and the stat-recalculation formulas.
*   [DeckBuilder.js](file:///g:/Dev/10_Projects/SlowJams2026-Luck/CardOlympics/src/DeckBuilder.js) - Manages the drafting phase, card equipping grid, runner reordering, and inter-round discard drafting.
*   [Race.js](file:///g:/Dev/10_Projects/SlowJams2026-Luck/CardOlympics/src/Race.js) - Simulates the relay physics, handles hand-offs, triggers Active card click listeners, playing speed-synced footstep audio, and tracks progression.
*   [uiHelper.js](file:///g:/Dev/10_Projects/SlowJams2026-Luck/CardOlympics/src/uiHelper.js) - Layout utility exposing horizontal alignment, relative screen placement, and the interactive runtime layout position finder.
