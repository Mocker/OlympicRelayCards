import * as Phaser from 'phaser';
import { CARD_DATABASE, RUNNER_TEMPLATES, calculateRunnerStats, CARD_FRAME_MAP } from './cardsConfig';
import { enableLayoutDebugger, getRelativePos } from './uiHelper';

export class DeckBuilder extends Phaser.Scene {
    constructor() {
        super({ key: 'DeckBuilder' });
    }

    init() {
        // Initialize global game data if not already present
        if (!this.registry.has('round')) {
            this.registry.set('round', 1);
            this.registry.set('qualificationTarget', 4); // Start needing 4th place or better
            this.registry.set('runners', RUNNER_TEMPLATES.map(t => ({
                id: t.id,
                name: t.name,
                role: t.role,
                baseStats: { ...t.baseStats },
                equippedCards: [null, null, null, null], // 4 slots
                finalStats: { ...t.baseStats }
            })));
            this.registry.set('needsDiscardDraft', false);
        }

        this.round = this.registry.get('round');
        this.runners = this.registry.get('runners');
        this.qualificationTarget = this.registry.get('qualificationTarget');
        this.needsDiscardDraft = this.registry.get('needsDiscardDraft');

        this.cardPool = [];
        this.selectedPoolCardIndex = null;
        this.hasRedrawn = false;
        this.redrawSelections = new Set(); // Stores indices of cards marked for redraw

        // Discard phase setup (Rules mechanic #5)
        this.isDiscardPhase = this.needsDiscardDraft;
        this.discardedRunners = new Set(); // Track runner indices that had a card removed
    }

    create() {
        // Background
        this.add.rectangle(0, 0, this.sys.game.scale.width, this.sys.game.scale.height, 0x1e272c).setOrigin(0);

        // Header Title
        const titleStr = this.isDiscardPhase
            ? `ROUND ${this.round}: REMOVE CARDS`
            : `ROUND ${this.round}: DECK ASSEMBLY`;

        this.headerText = this.add.text(this.sys.game.scale.width / 2, 25, titleStr, {
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#00d2d3',
            fontFamily: 'monospace'
        }).setOrigin(0.5);

        const subtitle = this.isDiscardPhase
            ? "Click exactly 1 card on 1 to 4 runners to discard it, then click 'Confirm Discards'."
            : `Qualifying Placement Needed: ${this.getPlacementString(this.qualificationTarget)} or better`;

        this.subtitleText = this.add.text(this.sys.game.scale.width / 2, 55, subtitle, {
            fontSize: '14px',
            color: '#ff9f43',
            fontFamily: 'monospace'
        }).setOrigin(0.5);

        // Draw Runners Layout
        this.runnerContainers = [];
        this.drawRunners();

        // Draw Card Pool (Skip generating if we are in discard phase, generate once confirmed)
        this.cardPoolGameObjects = [];
        if (!this.isDiscardPhase) {
            this.generateCardPool();
            this.drawCardPool();
        }

        // Add Controls (Buttons)
        this.createControls();

    }

    getPlacementString(placement) {
        if (placement === 1) return "1st";
        if (placement === 2) return "2nd";
        if (placement === 3) return "3rd";
        return `${placement}th`;
    }

    drawRunners() {
        // Clear old containers if drawing again
        this.runnerContainers.forEach(c => c.destroy());
        this.runnerContainers = [];

        // Dynamic horizontal layout based on screen width
        const screenWidth = this.sys.game.scale.width;
        const cardWidth = 150;
        const totalCardsWidth = cardWidth * 4;
        const remainingSpace = screenWidth - totalCardsWidth;
        const spacingX = cardWidth + (remainingSpace / 5);
        const startX = remainingSpace / 5;
        const startY = 90;

        this.runners.forEach((runner, index) => {
            const container = this.add.container(startX + index * spacingX, startY);
            this.runnerContainers.push(container);

            // Card body background using spr_bg_9slice_1
            const bg = this.add.nineslice(0, 0, 'bg-9slice', null, 150, 240, 16, 16, 16, 16)
                .setOrigin(0);
            if (index === 0) {
                bg.setTint(0xf1c40f); // Tint the starter leg gold/yellow!
            }
            container.add(bg);

            // Runner role / name
            const label = index === 0 ? "Leg 1 (Start)" : index === 3 ? "Leg 4 (Anchor)" : `Leg ${index + 1}`;
            container.add(this.add.text(75, 12, label, { fontSize: '11px', color: '#f1c40f', fontStyle: 'bold' }).setOrigin(0.5));
            container.add(this.add.text(75, 28, runner.name, { fontSize: '16px', color: '#ecf0f1', fontStyle: 'bold' }).setOrigin(0.5));

            // Discard state overlay or message
            if (this.isDiscardPhase && this.discardedRunners.has(index)) {
                container.add(this.add.text(75, 45, "DISCARDED 1 CARD", { fontSize: '10px', color: '#e74c3c', fontStyle: 'bold' }).setOrigin(0.5));
            }

            // Stats
            const stats = runner.finalStats;
            const statLines = [
                `SPD: ${stats.speed}`,
                `ACC: ${stats.acceleration}`,
                `STM: ${stats.stamina}`,
                `END: ${stats.endurance}`
            ];

            statLines.forEach((text, i) => {
                const statText = this.add.text(12, 60 + i * 16, text, {
                    fontSize: '12px',
                    color: '#bdc3c7',
                    fontFamily: 'monospace'
                });
                container.add(statText);
            });

            // Card Slots (4 slots for cards)
            container.add(this.add.text(75, 135, "EQUIPPED CARDS", { fontSize: '10px', color: '#95a5a6' }).setOrigin(0.5));

            const slotWidth = 28;
            const slotHeight = 40;
            const slotStartY = 150;
            const slotSpacingX = 33;

            runner.equippedCards.forEach((equippedCard, slotIndex) => {
                const slotX = 12 + slotIndex * slotSpacingX;
                const slotBg = this.add.rectangle(slotX, slotStartY, slotWidth, slotHeight, 0x34495e)
                    .setOrigin(0)
                    .setStrokeStyle(1, 0x7f8c8d)
                    .setInteractive();

                container.add(slotBg);

                if (equippedCard) {
                    // Fill slot with card backdrop spritesheet frame
                    const frameIndex = CARD_FRAME_MAP[equippedCard.type] ?? 0;
                    const filled = this.add.sprite(slotX, slotStartY, 'card-backdrops', frameIndex)
                        .setOrigin(0)
                        .setDisplaySize(slotWidth, slotHeight)
                        .setInteractive();

                    // Short code e.g. "Sp" for Sprint
                    const cardCode = equippedCard.name.substring(0, 2).toUpperCase();
                    const codeText = this.add.text(slotX + slotWidth / 2, slotStartY + slotHeight / 2, cardCode, {
                        fontSize: '10px',
                        fontStyle: 'bold',
                        color: '#ffffff',
                        stroke: '#000000',
                        strokeThickness: 2
                    }).setOrigin(0.5);

                    container.add(filled);
                    container.add(codeText);

                    // Add tooltip hover to see card info
                    filled.on('pointerover', () => {
                        const worldX = container.x + slotX;
                        const worldY = container.y + slotStartY;
                        this.showTooltip(equippedCard, worldX, worldY);
                    });
                    filled.on('pointerout', () => {
                        this.hideTooltip();
                    });

                    // Click to handle card interactions
                    filled.on('pointerdown', (pointer, localX, localY, event) => {
                        event.stopPropagation();

                        if (this.isDiscardPhase) {
                            this.discardCardFromRunner(index, slotIndex);
                        } else {
                            this.unequipCard(index, slotIndex);
                        }
                    });
                } else {
                    // Click empty slot to equip selected card
                    slotBg.on('pointerdown', () => {
                        if (!this.isDiscardPhase && this.selectedPoolCardIndex !== null) {
                            this.equipCard(index, slotIndex);
                        }
                    });
                }
            });

            // Reorder buttons (Move Left / Move Right) - Disabled in Discard Phase
            if (!this.isDiscardPhase) {
                if (index > 0) {
                    const btnLeft = this.add.text(25, 222, "◀", { fontSize: '14px', color: '#e74c3c' })
                        .setOrigin(0.5)
                        .setInteractive()
                        .on('pointerdown', () => this.swapRunners(index, index - 1));
                    container.add(btnLeft);
                }
                if (index < 3) {
                    const btnRight = this.add.text(125, 222, "▶", { fontSize: '14px', color: '#e74c3c' })
                        .setOrigin(0.5)
                        .setInteractive()
                        .on('pointerdown', () => this.swapRunners(index, index + 1));
                    container.add(btnRight);
                }
            }
        });
    }

    generateCardPool() {
        // If round is 1, generate 16 random cards. If subsequent round, draw 4 replacements.
        const targetCount = this.round === 1 ? 16 : 4;

        for (let i = 0; i < targetCount; i++) {
            const randomCard = Phaser.Utils.Array.GetRandom(CARD_DATABASE);
            this.cardPool.push({ ...randomCard, isEquipped: false });
        }
    }

    drawCardPool() {
        this.cardPoolGameObjects.forEach(go => go.destroy());
        this.cardPoolGameObjects = [];

        const startX = 40;
        const spacingX = 85;
        const startY = 360;
        const rowHeight = 110;

        this.cardPool.forEach((card, index) => {
            if (card.isEquipped) return;

            const col = index % 8;
            const row = Math.floor(index / 8);
            const x = startX + col * spacingX;
            const y = startY + row * rowHeight;

            const container = this.add.container(x, y);
            this.cardPoolGameObjects.push(container);

            const typeColor = this.getCardColor(card.type);

            // Highlight border behind card if selected, or if marked for redraw
            if (index === this.selectedPoolCardIndex || this.redrawSelections.has(index)) {
                const border = this.add.rectangle(-3, -3, 81, 106, index === this.selectedPoolCardIndex ? 0xf1c40f : 0xe74c3c)
                    .setOrigin(0);
                container.add(border);
            }

            // Card background using spritesheet frame
            const frameIndex = CARD_FRAME_MAP[card.type] ?? 0;
            const bg = this.add.sprite(0, 0, 'card-backdrops', frameIndex)
                .setOrigin(0)
                .setDisplaySize(75, 100)
                .setInteractive();
            container.add(bg);

            // Title
            const cardTitle = this.add.text(37, 12, card.name, {
                fontSize: '9px',
                fontStyle: 'bold',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            container.add(cardTitle);

            // Description / Stats brief
            const typeText = this.add.text(37, 30, card.type.toUpperCase(), {
                fontSize: '8px',
                color: '#ecf0f1',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            container.add(typeText);

            // Details/Desc
            let descSnippet = card.description;
            if (descSnippet.length > 25) descSnippet = descSnippet.substring(0, 22) + "...";
            const descText = this.add.text(37, 60, descSnippet, {
                fontSize: '7px',
                color: '#ffffff',
                align: 'center',
                wordWrap: { width: 68 },
                stroke: '#000000',
                strokeThickness: 1.5
            }).setOrigin(0.5);
            container.add(descText);

            // Interact events
            bg.on('pointerover', () => {
                container.setScale(1.25);
                container.setDepth(100);
                this.showTooltip(card, x, y);
            });
            bg.on('pointerout', () => {
                container.setScale(1);
                container.setDepth(1);
                this.hideTooltip();
            });

            bg.on('pointerdown', () => {
                if (!this.hasRedrawn) {
                    // Poker-style redraw select/deselect
                    if (this.redrawSelections.has(index)) {
                        this.redrawSelections.delete(index);
                    } else {
                        this.redrawSelections.add(index);
                    }
                    this.drawCardPool();
                } else {
                    // Select card to equip
                    if (this.selectedPoolCardIndex === index) {
                        this.selectedPoolCardIndex = null;
                    } else {
                        this.selectedPoolCardIndex = index;
                    }
                    this.drawCardPool();
                }
            });
        });
    }

    getCardColor(type) {
        switch (type) {
            case 'safe': return 0x2ecc71; // Green
            case 'risky': return 0xe67e22; // Orange
            case 'dangerous': return 0xe74c3c; // Red
            case 'active': return 0x3498db; // Blue
            default: return 0x7f8c8d;
        }
    }

    showTooltip(card, cardX, cardY) {
        if (this.tooltip) this.tooltip.destroy();

        // Position above the card, bounding it to stay on screen
        const tx = Math.max(10, Math.min(this.sys.game.scale.width - 190, cardX - 52));
        const ty = Math.max(10, cardY - 65);

        this.tooltip = this.add.container(tx, ty).setDepth(300);

        // Nineslice text frame background
        const bg = this.add.nineslice(0, 0, 'textframe-9slice', null, 180, 60, 16, 16, 16, 16)
            .setOrigin(0);

        const name = this.add.text(12, 10, `${card.name}`, {
            fontSize: '11px',
            fontStyle: 'bold',
            color: '#ff9f43',
            fontFamily: 'monospace'
        });
        const desc = this.add.text(12, 26, card.description, {
            fontSize: '9px',
            color: '#ffffff',
            wordWrap: { width: 156 },
            fontFamily: 'monospace'
        });

        this.tooltip.add([bg, name, desc]);
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.destroy();
            this.tooltip = null;
        }
    }

    discardCardFromRunner(runnerIndex, slotIndex) {
        if (this.discardedRunners.has(runnerIndex)) {
            // Can only discard at most 1 card per runner
            return;
        }

        const runner = this.runners[runnerIndex];
        const card = runner.equippedCards[slotIndex];

        if (card) {
            runner.equippedCards[slotIndex] = null;
            runner.finalStats = calculateRunnerStats(runner.baseStats, runner.equippedCards.filter(Boolean));
            this.discardedRunners.add(runnerIndex);

            this.sound.play("sfx_card_select");
            this.drawRunners();
            this.updateDiscardButton();
        }
    }

    equipCard(runnerIndex, slotIndex) {
        const cardIndex = this.selectedPoolCardIndex;
        if (cardIndex === null) return;

        const card = this.cardPool[cardIndex];
        const runner = this.runners[runnerIndex];

        // Place card in slot, recalculate stats
        runner.equippedCards[slotIndex] = card;
        card.isEquipped = true;
        runner.finalStats = calculateRunnerStats(runner.baseStats, runner.equippedCards.filter(Boolean));

        this.selectedPoolCardIndex = null;
        this.sound.play("sfx_card_place");

        this.drawRunners();
        this.drawCardPool();
        this.updateStartButton();
    }

    unequipCard(runnerIndex, slotIndex) {
        const runner = this.runners[runnerIndex];
        const card = runner.equippedCards[slotIndex];

        if (card) {
            // Find card in pool and unequip
            const poolCard = this.cardPool.find(c => c.id === card.id && c.isEquipped);
            if (poolCard) {
                poolCard.isEquipped = false;
            }
            runner.equippedCards[slotIndex] = null;
            runner.finalStats = calculateRunnerStats(runner.baseStats, runner.equippedCards.filter(Boolean));

            this.sound.play("sfx_card_place");
            this.drawRunners();
            this.drawCardPool();
            this.updateStartButton();
        }
    }

    swapRunners(idx1, idx2) {
        const temp = this.runners[idx1];
        this.runners[idx1] = this.runners[idx2];
        this.runners[idx2] = temp;

        this.drawRunners();
    }

    createControls() {
        if (this.isDiscardPhase) {
            // Confirm Discards Button using spr_button_9slice
            this.confirmDiscardBtn = this.add.container(this.sys.game.scale.width / 2 - 90, 557);
            const dBg = this.add.nineslice(0, 0, 'button-9slice', null, 180, 40, 16, 16, 16, 16)
                .setOrigin(0)
                .setInteractive()
                .setTint(0xc0392b);
            this.confirmDiscardTxt = this.add.text(90, 20, "Confirm Discards", { fontSize: '13px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
            this.confirmDiscardBtn.add([dBg, this.confirmDiscardTxt]);

            dBg.on('pointerdown', () => this.confirmDiscards());
            this.updateDiscardButton();

            // Enable layout debugging
            enableLayoutDebugger(this, this.confirmDiscardBtn, 'ConfirmDiscardBtn');
        } else {
            // Redraw Button using spr_button_9slice
            this.redrawBtn = this.add.container(553, 557);
            const rBg = this.add.nineslice(0, 0, 'button-9slice', null, 130, 35, 16, 16, 16, 16)
                .setOrigin(0)
                .setInteractive()
                .setTint(0x8e44ad);
            const rTxt = this.add.text(65, 17.5, "Redraw", { fontSize: '12px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
            this.redrawBtn.add([rBg, rTxt]);

            rBg.on('pointerdown', () => this.executeRedraw());
            rBg.on('pointerover', () => rBg.setTint(0x9b59b6));
            rBg.on('pointerout', () => rBg.setTint(0x8e44ad));

            // Start Relay Button using spr_button_9slice
            this.startBtn = this.add.container(553, 557);
            const sBg = this.add.nineslice(0, 0, 'button-9slice', null, 130, 35, 16, 16, 16, 16)
                .setOrigin(0)
                .setInteractive()
                .setTint(0x27ae60);
            this.startTxt = this.add.text(65, 17.5, "Begin Relay", { fontSize: '12px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
            this.startBtn.add([sBg, this.startTxt]);

            sBg.on('pointerdown', () => this.startRace());

            this.updateStartButton();

            // Enable layout debugging
            enableLayoutDebugger(this, this.redrawBtn, 'RedrawBtn');
            enableLayoutDebugger(this, this.startBtn, 'StartBtn');
        }
    }

    updateDiscardButton() {
        const count = this.discardedRunners.size;
        const bg = this.confirmDiscardBtn.getAt(0);

        if (count >= 1 && count <= 4) {
            bg.setTint(0xd35400);
            bg.setInteractive();
            this.confirmDiscardBtn.setAlpha(1.0);
            this.confirmDiscardTxt.setText(`Discard ${count} Cards`);
        } else {
            bg.setTint(0x7f8c8d);
            bg.disableInteractive();
            this.confirmDiscardBtn.setAlpha(0.5);
            this.confirmDiscardTxt.setText("Select 1-4 Cards");
        }
    }

    confirmDiscards() {
        // Discard phase is complete! Let's generate the card pool of 4 new cards
        this.isDiscardPhase = false;
        this.registry.set('needsDiscardDraft', false);

        // Transition back to assembly mode
        this.headerText.setText(`ROUND ${this.round}: DECK ASSEMBLY`);
        this.subtitleText.setText(`Qualifying Placement Needed: ${this.getPlacementString(this.qualificationTarget)} or better`);

        // Destroy discard controls
        this.confirmDiscardBtn.destroy();

        // Draw new card pool (4 cards)
        this.generateCardPool();
        this.drawCardPool();

        // Recreate the Redraw and Start buttons
        this.createControls();
        this.sound.play("sfx_card_draw");
    }

    executeRedraw() {
        if (this.hasRedrawn) return;

        // Perform redraw on marked pool index positions
        this.redrawSelections.forEach(index => {
            const randomCard = Phaser.Utils.Array.GetRandom(CARD_DATABASE);
            this.cardPool[index] = { ...randomCard, isEquipped: false };
        });

        this.hasRedrawn = true;
        this.redrawSelections.clear();

        // Disable redraw button visual
        this.redrawBtn.setAlpha(0.3);
        this.redrawBtn.getAt(0).disableInteractive();

        this.sound.play("sfx_card_draw");
        this.drawCardPool();
    }

    updateStartButton() {
        // Count how many cards are fully equipped across all runners. Need 16 cards (4 per runner).
        let totalEquipped = 0;
        this.runners.forEach(r => {
            totalEquipped += r.equippedCards.filter(Boolean).length;
        });

        const bg = this.startBtn.getAt(0);

        if (totalEquipped === 16) {
            bg.setTint(0x27ae60);
            bg.setInteractive();
            this.startBtn.setAlpha(1.0);
            this.startTxt.setText("Begin Relay");
        } else {
            bg.setTint(0x7f8c8d);
            bg.disableInteractive();
            this.startBtn.setAlpha(0.5);
            this.startTxt.setText(`${totalEquipped}/16 Equipped`);
        }
    }

    startRace() {
        this.sound.play("sfx_card_select");

        // Commit runners config to the global registry
        this.registry.set('runners', this.runners);
        this.scene.start('Race');
    }
}
