# Olympic Card Battler - Relay Edition
## Game Design Document (GDD)

### Overview
*   **Genre:** Strategy, Arcade, Sports
*   **Sub-genres:** Deck-builder, Olympics
*   **Playtime:** Less than an hour / Endless
*   **Size:** Small
*   **Theme:** Summer Slow Jams 2026 - Luck

---

### Basic Rules
Assemble your team’s decks for them to participate in the **4x100m Relay**. Have your team complete the relay and qualify in order to move to the next race.
*   **Win Condition:** Endless, rank-based gameplay.
*   **Lose Condition:** The player fails to qualify for the next relay (i.e. fails to hit the minimum required placement).

---

### Visual & Audio Style
*   **Visual Style:** 16-bit pixel art OR simplified low-res (similar to *Pizza Tower*).
*   **Audio Design:** 
    *   *Music:* 8-bit or FM synth chiptune OR MIDI tracking OR a blend of the two styles.
    *   *SFX:* 8-bit or FM synth chiptune OR free sound assets.

---

### Gameplay Loop
1.  **Initial Deck Building:** The player starts with four runners. Each runner's deck holds **four cards**. The player is dealt **sixteen cards** initially and allocates them across the four runners.
2.  **Redraw Phase:** If the player gets cards they don't want, they can select any number of cards to discard and redraw new ones (poker-style redraw).
3.  **Start Relay:** When the player is done with deck building/reordering, they click **"Begin Relay"** to start the race. A minimum placement (e.g. 5th to 1st) is displayed as the qualification target.
4.  **The Race:** The running and baton passing are automatic. The player can actively click/trigger **Active Cards** for the currently running racer to give them an advantage or disrupt opponents.
5.  **Qualifying & Progression:** If the player qualifies, they move to the next round. The minimum qualification placement increases as they advance (especially if they finish 1st quickly), up to requiring 1st place.
6.  **Inter-round Drafting:** At the start of each subsequent round, the player chooses 1 to 4 runners to discard one card. The player is then dealt **four cards** to distribute, with the option to discard and redraw them poker-style.
7.  **Loop:** Repeat steps 3–6 until the player fails to qualify.

---

### Mechanics

#### Runners
*   **Team Composition:** 4 runners.
*   **Reordering:** Runners can be reordered in the deck assembly UI. The first runner starts, and the fourth runner finishes.
*   **Stats:** Range from 1 to 256. They start around the middle (~128) with a 25% margin of error:
    *   **Speed:** The maximum speed a runner can reach when stamina is above zero (does not limit temporary card speed buffs).
    *   **Acceleration:** How quickly the runner gains speed when starting or when speed buffs are applied.
    *   **Stamina:** The amount of time until the runner starts slowing down to their endurance speed.
    *   **Endurance:** The runner's max speed when stamina is empty (usually 0% to 33% lower than their base Speed stat).
*   **Physics/Movement Loop:**
    *   Runner accelerates to `Speed` using the `Acceleration` stat.
    *   `Stamina` decays over time.
    *   When `Stamina` hits 0, max speed drops to `Endurance`, and the runner decelerates to it.

---

### Cards
Cards are categorized into four color-coded/bordered types:

| Type | Color/Border | Description | Example |
| :--- | :--- | :--- | :--- |
| **Safe** | *Green* | Small, clean buffs with no downside. | +10 base Stamina or +5 Speed. |
| **Risky** | *Orange* | Good buffs or abilities but with a minor/delayed penalty. | +40% speed boost for 2 seconds at the start, followed by a -10% speed penalty. |
| **Dangerous** | *Red* | Massive buffs or powerful abilities but with severe drawbacks. | Massive speed bonus at the cost of very low acceleration and stamina; or a "second wind" that gives a speed boost and pauses stamina drain for $X$ seconds but severely slows the runner afterwards. |
| **Active** | *Blue/Special* | Cards triggered manually by the player during the race. | Slow down nearby opponents or activate a quick sprint. |

---

### 4x100m Relay Execution
*   **Track Layout:** 4 lanes or visual representation of 4 runners positioned at 100m intervals (0m, 100m, 200m, 300m).
*   **Controls:** The current runner runs automatically. The active cards assigned to the current runner are shown on the bottom of the screen. Clicking them triggers their effects.
*   **Baton Pass:** When a runner hits their 100m mark, they automatically hand the baton to the next runner. The active card selection on the HUD swaps to the next runner's active cards.
*   **AI Opponents:** Run in parallel lanes with randomized stats and decks.
